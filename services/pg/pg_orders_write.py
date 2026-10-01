# services/pg/pg_orders_write.py
# Order creation, item line attachment, inventory auto-deduction, payments, and double entry posting

from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str
from .pg_receipt_sync import sync_advance_receipt


def add_order(payload):
    data = payload.get('data') or payload
    order_id = clean_str(data.get('id') or data.get('order_id')) or generate_id("ORD")
    order_no = clean_str(data.get('order_no')) or order_id

    cust_id = clean_str(data.get('customer_id'))
    c_name = clean_str(data.get('customer_name'))
    with get_db_cursor(commit=False) as c_check:
        if not cust_id or cust_id == 'CUST-GENERAL':
            if c_name:
                c_check.execute("SELECT id FROM customers WHERE name = %s LIMIT 1;", (c_name,))
                c_row = c_check.fetchone()
                cust_id = c_row['id'] if c_row else 'CUST-GENERAL'
            else:
                cust_id = 'CUST-GENERAL'

    order_date = clean_str(data.get('order_date') or data.get('date')) or today_str()
    del_date = clean_str(data.get('delivery_date')) or None
    curr = clean_str(data.get('currency') or 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    tot_amt = clean_num(data.get('total_amount') or data.get('total') or 0.0)
    paid_amt = clean_num(data.get('paid_amount') or data.get('paid') or 0.0)
    base_amt = clean_num(data.get('base_amount') or (tot_amt * rate))
    subtotal = clean_num(data.get('subtotal') or tot_amt)
    discount = clean_num(data.get('discount') or 0.0)
    tax = clean_num(data.get('tax') or 0.0)
    pay_status = 'Paid' if paid_amt >= tot_amt and tot_amt > 0 else ('Partial' if paid_amt > 0 else 'Unpaid')
    prod_status = clean_str(data.get('production_status') or data.get('status') or 'Pending')
    pay_method = clean_str(data.get('payment_method') or 'نقد (كاش)')
    delivery_fee = clean_num(data.get('delivery_fee') or data.get('delivery') or 0.0)
    delivery_payment_mode = clean_str(data.get('delivery_payment_mode') or 'DIRECT_TO_COURIER')
    if delivery_payment_mode not in ('DIRECT_TO_COURIER', 'PREPAID_VIA_ATELIER'):
        delivery_payment_mode = 'DIRECT_TO_COURIER'
    notes = clean_str(data.get('notes') or '')

    ch_id = clean_str(data.get('child_id')) or None
    ch_name = clean_str(data.get('child_name'))
    prod_id = clean_str(data.get('product_id')) or None
    p_name = clean_str(data.get('product_name'))

    with get_db_cursor(commit=True) as cur:
        if not prod_id and p_name:
            cur.execute("SELECT id FROM products WHERE model_name = %s LIMIT 1;", (p_name,))
            p_row = cur.fetchone()
            if p_row: prod_id = p_row['id']

        query = """
            INSERT INTO orders (
                id, order_no, customer_id, child_id, product_id, order_date, delivery_date,
                currency, exchange_rate, subtotal, discount, tax, total_amount,
                paid_amount, base_amount, payment_status, production_status,
                payment_method, delivery_fee, delivery_payment_mode, status, notes, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Active', %s, CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                child_id = COALESCE(EXCLUDED.child_id, orders.child_id), product_id = COALESCE(EXCLUDED.product_id, orders.product_id),
                total_amount = EXCLUDED.total_amount, paid_amount = EXCLUDED.paid_amount,
                payment_status = EXCLUDED.payment_status, production_status = EXCLUDED.production_status,
                delivery_fee = EXCLUDED.delivery_fee, delivery_payment_mode = EXCLUDED.delivery_payment_mode,
                notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """
        cur.execute(query, (order_id, order_no, cust_id, ch_id, prod_id, order_date, del_date, curr, rate, subtotal, discount, tax, tot_amt, paid_amt, base_amt, pay_status, prod_status, pay_method, delivery_fee, delivery_payment_mode, notes))
        res = dict(cur.fetchone())

        # Save order items & auto-deduct inventory
        items = data.get('items') or []
        for itm in items:
            itm_id = generate_id("OITM")
            p_id = itm.get('product_id') or prod_id
            if p_id:
                qty = clean_num(itm.get('quantity') or 1.0)
                u_price = clean_num(itm.get('unit_price') or itm.get('price') or 0.0)
                t_price = clean_num(itm.get('total_price') or (qty * u_price))
                cur.execute("INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, notes) VALUES (%s, %s, %s, %s, %s, %s, %s);",
                            (itm_id, order_id, p_id, qty, u_price, t_price, clean_str(itm.get('notes') or '')))

        # Stock deduction
        deduct_candidates = [(itm.get('product_id') or prod_id, clean_str(itm.get('product_name') or itm.get('name') or p_name), clean_num(itm.get('quantity') or 1.0)) for itm in items] if items else [(prod_id, p_name, 1.0)]
        for p_id_ref, p_name_ref, q_deduct in deduct_candidates:
            if not p_id_ref and not p_name_ref: continue
            cur.execute("SELECT id, quantity, unit_cost FROM inventory WHERE id = %s OR item_code = %s OR name = %s LIMIT 1 FOR UPDATE;", (p_id_ref, p_id_ref, p_name_ref))
            inv_row = cur.fetchone()
            if inv_row:
                new_qty = max(0.0, float(inv_row['quantity']) - q_deduct)
                cur.execute("UPDATE inventory SET quantity = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_qty, inv_row['id']))
                cur.execute("INSERT INTO inventory_transactions (id, inventory_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes) VALUES (%s, %s, 'SALE_OUT', %s, %s, 'orders', %s, %s);",
                            (generate_id("ITXN"), inv_row['id'], -abs(q_deduct), inv_row['unit_cost'], order_id, f"خصم مبيعات للطلب {order_no}"))

        # Cash Account & Payment Receipt
        cash_acc = 'ACC-101-2' if 'SAR' in curr.upper() else ('ACC-101-3' if 'USD' in curr.upper() else 'ACC-101-1')
        if any(k in pay_method for k in ['كريمي', 'بنك', 'حوالة']): cash_acc = 'ACC-103'

        if paid_amt > 0:
            sync_advance_receipt(cur, {
                'id': f"PAY-{order_id}",
                'payment_no': f"REC-{order_no}",
                'order_id': order_id,
                'order_no': order_no,
                'customer_id': cust_id,
                'party_name': c_name or 'العميلة',
                'amount': paid_amt,
                'currency': curr,
                'exchange_rate': rate,
                'base_amount': (paid_amt * rate),
                'payment_method': pay_method,
                'account_id': cash_acc,
                'date': order_date,
                'notes': f"دفعة عربون طلب {order_no} ({c_name or 'العميلة'})"
            })

        # Update customer ledger balance
        rem_amt = tot_amt - paid_amt
        if rem_amt != 0 and cust_id and cust_id != 'CUST-GENERAL':
            cur.execute("UPDATE customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (rem_amt, cust_id))

        # Balanced Double-Entry Journal Entry
        if tot_amt > 0:
            auto_jv_no = f"JV-{order_no}"
            cur.execute("""
                INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
                VALUES (%s, %s, %s, %s, %s, 'ACC-401', %s, %s, %s, 'Order', %s, %s, %s, 'Posted', %s)
                ON CONFLICT (entry_no) DO UPDATE SET amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount;
            """, (f"JV-{order_id}", auto_jv_no, order_date, f"فاتورة مبيعات طلب {order_no}", cash_acc, tot_amt, tot_amt, base_amt, order_id, curr, rate, f"ترحيل محاسبي تلقائي للطلب {order_no}"))

            cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
            actual_jv_id = cur.fetchone()['id']
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (actual_jv_id,))
            if paid_amt > 0:
                cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);",
                            (generate_id("JVL"), actual_jv_id, cash_acc, f"المبلغ المستلم نقداً - طلب {order_no}", paid_amt, (paid_amt * rate)))
            if rem_amt > 0:
                cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, 'ACC-104', %s, %s, 0.0, %s, 0.0);",
                            (generate_id("JVL"), actual_jv_id, f"المبلغ الآجل على العميل - طلب {order_no}", rem_amt, (rem_amt * rate)))
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, 'ACC-401', %s, 0.0, %s, 0.0, %s);",
                        (generate_id("JVL"), actual_jv_id, f"إيراد مبيعات فساتين - طلب {order_no}", tot_amt, base_amt))

        # Factory pipeline order
        if prod_status not in ('Delivered', 'Cancelled', 'Ready'):
            cur.execute("""
                INSERT INTO production_orders (id, production_order_no, order_id, product_id, product_name, child_name, stage, start_date, due_date, progress, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, 'القص والتحضير ✂️', %s, %s, 20, 'In Progress', %s)
                ON CONFLICT (production_order_no) DO UPDATE SET stage = EXCLUDED.stage, notes = EXCLUDED.notes;
            """, (generate_id("PRD"), f"PO-{order_no}", order_id, prod_id or 'PROD-CUSTOM-001', p_name or 'فستان أميرات', ch_name or 'الأميرة', order_date, del_date, notes))

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        return res
