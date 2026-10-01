# services/pg/pg_purchases_write.py
# Purchase invoices creation, stock valuation (weighted average), payments, and double entry posting

from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str
from .account_resolver import resolve_exchange_rate, resolve_account_id
from .pg_audit import log_audit_event
from .pg_warehouses import normalize_warehouse_id


def add_purchase(payload):
    data = payload.get('data') or payload
    warehouse_id = normalize_warehouse_id(data.get('warehouse_id') or data.get('warehouse') or data.get('location') or 'WH-MAIN')

    pur_id = clean_str(data.get('id') or data.get('purchase_id')) or generate_id("PUR")
    inv_no = clean_str(data.get('invoice_no') or data.get('bill_no') or data.get('purchase_no')) or pur_id
    supp_id = clean_str(data.get('supplier_id') or '')
    supp_name = clean_str(data.get('supplier_name') or data.get('supplier') or 'مورد عام')
    supp_phone = clean_str(data.get('supplier_phone') or data.get('phone') or data.get('supplier_number') or '')
    inv_date = clean_str(data.get('invoice_date') or data.get('date')) or today_str()

    curr_raw = clean_str(data.get('currency') or data.get('Original_Currency') or 'YER')
    curr = 'SAR' if 'SAR' in curr_raw.upper() else ('USD' if 'USD' in curr_raw.upper() else 'YER')

    raw_items = data.get('items')
    items = []
    if isinstance(raw_items, list) and len(raw_items) > 0:
        for itm in raw_items:
            i_name = clean_str(itm.get('item_name') or itm.get('item') or itm.get('name') or 'مشتريات خامات')
            i_qty = clean_num(itm.get('qty') or itm.get('quantity') or 1.0)
            i_cost = clean_num(itm.get('cost') or itm.get('price') or itm.get('unit_price') or 0.0)
            items.append({
                'item_name': i_name, 'unit': clean_str(itm.get('unit') or 'متر'), 'quantity': i_qty,
                'unit_price': i_cost, 'total_price': round(i_qty * i_cost, 2), 'notes': clean_str(itm.get('notes') or '')
            })
    else:
        s_name = clean_str(data.get('item_name') or data.get('fabric_name') or data.get('item') or 'مشتريات خامات')
        s_qty = clean_num(data.get('quantity') or data.get('qty') or 1.0)
        s_cost = clean_num(data.get('unit_price') or data.get('cost_per_unit') or data.get('price') or 0.0)
        s_tot = clean_num(data.get('original_amount') or (s_qty * s_cost) or data.get('total_amount') or 0.0)
        items.append({'item_name': s_name, 'unit': clean_str(data.get('unit') or 'متر'), 'quantity': s_qty, 'unit_price': s_cost, 'total_price': s_tot if s_tot > 0 else round(s_qty * s_cost, 2), 'notes': clean_str(data.get('notes') or '')})

    total_qty = sum(i['quantity'] for i in items)
    items_total = sum(i['total_price'] for i in items)
    orig_amt = clean_num(data.get('original_amount') or items_total)

    if len(items) == 1:
        header_name, header_unit, header_price = items[0]['item_name'], items[0]['unit'], items[0]['unit_price']
    else:
        header_name = " + ".join([i['item_name'] for i in items if i.get('item_name')])
        if len(header_name) > 250: header_name = header_name[:247] + "..."
        header_unit = items[0]['unit'] if all(i.get('unit') == items[0].get('unit') for i in items) else 'مشكل'
        header_price = round(orig_amt / total_qty, 2) if total_qty > 0 else 0.0

    discount = clean_num(data.get('discount') or data.get('discount_amount') or 0.0)
    shipping_cost = clean_num(data.get('shipping_cost') or data.get('freight_cost') or 0.0)
    transfer_fee = clean_num(data.get('transfer_fee') or data.get('transfer_fees') or 0.0)
    pay_method = clean_str(data.get('payment_method') or data.get('pay_type') or 'نقد (كاش)')
    pay_source_raw = clean_str(data.get('payment_account_code') or data.get('payment_source') or data.get('account_id') or '')
    transfer_no = clean_str(data.get('transaction_ref') or data.get('transaction_id') or data.get('transfer_no') or '')
    receipt_url = clean_str(data.get('receipt_attachment') or data.get('receipt_url') or data.get('image_path') or '')
    invoice_image_url = clean_str(data.get('invoice_attachment') or data.get('invoice_image_url') or data.get('invoice_url') or data.get('bill_attachment') or '')
    notes = clean_str(data.get('notes') or '')

    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, clean_num(data.get('exchange_rate') or 1.0))
        items_amt_yer = orig_amt * rate
        discount_yer = discount * rate
        shipping_yer = shipping_cost * rate
        transfer_yer = transfer_fee * rate
        net_paid_orig = max(0.0, (orig_amt + shipping_cost + transfer_fee) - discount)
        net_paid_yer = max(0.0, (items_amt_yer + shipping_yer + transfer_yer) - discount_yer)
        grand_total_yer = net_paid_yer

        credit_acc = 'ACC-201' if pay_method == 'آجل' else resolve_account_id(cur, pay_source_raw, default_id='ACC-101-1', currency=curr)
        if pay_method != 'آجل' and (not pay_source_raw or credit_acc in ('ACC-101', 'ACC-101-1')):
            credit_acc = 'ACC-101-2' if curr == 'SAR' else ('ACC-101-3' if curr == 'USD' else 'ACC-101-1')

        if not supp_id and supp_name:
            cur.execute("SELECT id FROM suppliers WHERE name = %s LIMIT 1;", (supp_name,))
            s_row = cur.fetchone()
            if s_row: supp_id = s_row['id']
            else:
                supp_id = generate_id("SUPP")
                cur.execute("INSERT INTO suppliers (id, name, phone, city, address, current_balance, is_active, created_at, updated_at) VALUES (%s, %s, %s, 'صنعاء', 'توريد خامات ومشتريات', 0.0, True, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING;", (supp_id, supp_name, supp_phone or '0000000000'))

        cur.execute("SELECT id FROM purchases WHERE invoice_no = %s OR id = %s LIMIT 1;", (inv_no, pur_id))
        ex_pur = cur.fetchone()
        if ex_pur: pur_id = ex_pur['id']

        query = """
            INSERT INTO purchases (
                id, invoice_no, supplier_id, supplier_name, supplier_phone, invoice_date, item_name, unit, quantity,
                unit_price, currency, exchange_rate, original_amount, discount, amount_yer, shipping_cost, transfer_fee,
                grand_total_yer, payment_method, payment_account_code, transaction_ref, invoice_attachment, receipt_attachment,
                receipt_status, payment_status, created_by, notes
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Received', %s, %s, %s
            ) ON CONFLICT (id) DO UPDATE SET
                supplier_id = EXCLUDED.supplier_id, supplier_name = EXCLUDED.supplier_name, quantity = EXCLUDED.quantity,
                unit_price = EXCLUDED.unit_price, original_amount = EXCLUDED.original_amount, discount = EXCLUDED.discount,
                shipping_cost = EXCLUDED.shipping_cost, transfer_fee = EXCLUDED.transfer_fee, amount_yer = EXCLUDED.amount_yer,
                grand_total_yer = EXCLUDED.grand_total_yer, payment_method = EXCLUDED.payment_method, notes = EXCLUDED.notes
            RETURNING *;
        """
        pay_status = 'Unpaid' if pay_method == 'آجل' else 'Paid'
        cur.execute(query, (pur_id, inv_no, supp_id, supp_name, supp_phone, inv_date, header_name, header_unit, total_qty, header_price, curr, rate, orig_amt, discount, items_amt_yer, shipping_cost, transfer_fee, grand_total_yer, pay_method, credit_acc, transfer_no, invoice_image_url, receipt_url, pay_status, clean_str(data.get('created_by') or 'admin'), notes))
        res = dict(cur.fetchone())

        cur.execute("SELECT inventory_id, quantity FROM purchase_items WHERE purchase_id = %s;", (pur_id,))
        for prev in cur.fetchall():
            if prev.get('inventory_id') and float(prev.get('quantity') or 0) > 0:
                cur.execute("UPDATE inventory SET quantity = GREATEST(0, quantity - %s), updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (float(prev['quantity']), prev['inventory_id']))

        cur.execute("DELETE FROM purchase_items WHERE purchase_id = %s;", (pur_id,))
        cur.execute("DELETE FROM inventory_transactions WHERE reference_type = 'purchases' AND reference_id = %s;", (pur_id,))

        saved_items = []
        for itm in items:
            it_cost_yer = round(itm['unit_price'] * rate, 2)
            cur.execute("SELECT id, quantity, unit_cost FROM inventory WHERE name = %s OR item_code = %s LIMIT 1 FOR UPDATE;", (itm['item_name'], itm['item_name']))
            inv_row = cur.fetchone()
            if inv_row:
                inv_id = inv_row['id']
                old_q, old_c = float(inv_row['quantity'] or 0.0), float(inv_row['unit_cost'] or 0.0)
                new_q = old_q + itm['quantity']
                new_c = round(((old_q * old_c) + (itm['quantity'] * it_cost_yer)) / new_q, 2) if new_q > 0 else it_cost_yer
                cur.execute("UPDATE inventory SET quantity = %s, unit_cost = %s, status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_q, new_c, inv_id))
            else:
                inv_id = generate_id("MAT")
                cur.execute("INSERT INTO inventory (id, item_code, name, type, category, unit, quantity, unit_cost, currency, supplier_id, location, status) VALUES (%s, %s, %s, 'Fabric', 'أقمشة فاخرة', %s, %s, %s, 'YER', %s, %s, 'Available');", (inv_id, inv_id, itm['item_name'], itm['unit'], itm['quantity'], it_cost_yer, supp_id, warehouse_id))

            cur.execute("""
                INSERT INTO warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at)
                VALUES (%s, %s, %s, %s, 0.0, CURRENT_TIMESTAMP)
                ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP;
            """, (f"WS-{inv_id}-{warehouse_id}", warehouse_id, inv_id, itm['quantity']))

            cur.execute("INSERT INTO inventory_transactions (id, inventory_id, warehouse_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes) VALUES (%s, %s, %s, 'PURCHASE_IN', %s, %s, 'purchases', %s, %s);", (generate_id("ITXN"), inv_id, warehouse_id, itm['quantity'], it_cost_yer, pur_id, f"شراء خامات فاتورة {inv_no} إلى مستودع [{warehouse_id}]"))
            p_item_id = generate_id("PITM")
            cur.execute("INSERT INTO purchase_items (id, purchase_id, inventory_id, item_name, unit, quantity, unit_price, total_price, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);", (p_item_id, pur_id, inv_id, itm['item_name'], itm['unit'], itm['quantity'], itm['unit_price'], itm['total_price'], itm.get('notes') or f"صنف فاتورة {inv_no}"))
            saved_items.append({"id": p_item_id, "item_name": itm['item_name'], "unit": itm['unit'], "quantity": itm['quantity'], "unit_price": itm['unit_price'], "total_price": itm['total_price'], "warehouse_id": warehouse_id})

        clean_ref = pur_id[4:] if str(pur_id).startswith('PUR-') else pur_id
        if pay_method != 'آجل' and net_paid_orig > 0:
            cur.execute("""
                INSERT INTO payments (id, payment_no, invoice_id, supplier_id, payment_type, amount, currency, exchange_rate, base_amount, payment_method, account_id, date, status, notes)
                VALUES (%s, %s, %s, %s, 'Payment', %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s)
                ON CONFLICT (payment_no) DO UPDATE SET amount = EXCLUDED.amount, base_amount = EXCLUDED.base_amount, account_id = EXCLUDED.account_id;
            """, (generate_id("PAY"), f"PAY-{clean_ref}", pur_id, supp_id, net_paid_orig, curr, rate, net_paid_yer, pay_method, credit_acc, inv_date, f"سداد فاتورة مشتريات {inv_no}"))

        if orig_amt > 0 or net_paid_orig > 0:
            auto_jv_no = f"JV-PUR-{clean_ref}"
            cur.execute("""
                INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
                VALUES (%s, %s, %s, %s, 'ACC-105', %s, %s, %s, %s, 'Purchase', %s, %s, %s, 'Posted', %s)
                ON CONFLICT (entry_no) DO UPDATE SET amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount;
            """, (generate_id("JV"), auto_jv_no, inv_date, f"فاتورة مشتريات خامات {inv_no}", credit_acc, net_paid_orig, net_paid_orig, net_paid_yer, pur_id, curr, rate, f"ترحيل مشتريات {inv_no}"))
            cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
            act_jv_id = cur.fetchone()['id']
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (act_jv_id,))
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, 'ACC-105', %s, %s, 0.0, %s, 0.0);", (generate_id("JVL"), act_jv_id, f"مخزون خامات - فاتورة {inv_no}", orig_amt, items_amt_yer))
            if shipping_cost > 0:
                cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, 'ACC-507', %s, %s, 0.0, %s, 0.0);", (generate_id("JVL"), act_jv_id, f"مصاريف شحن ونقل - فاتورة {inv_no}", shipping_cost, shipping_yer))
            if transfer_fee > 0:
                cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, 'ACC-508', %s, %s, 0.0, %s, 0.0);", (generate_id("JVL"), act_jv_id, f"رسوم وعمولات تحويل - فاتورة {inv_no}", transfer_fee, transfer_yer))
            if discount > 0:
                cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, 'ACC-403', %s, 0.0, %s, 0.0, %s);", (generate_id("JVL"), act_jv_id, f"خصم وتخفيض مكتسب - فاتورة {inv_no}", discount, discount_yer))
            if net_paid_orig > 0:
                cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);", (generate_id("JVL"), act_jv_id, credit_acc, f"سداد/استحقاق فاتورة {inv_no}", net_paid_orig, net_paid_yer))

        if pay_method == 'آجل' and supp_id and supp_id != 'SUPP-GENERAL':
            cur.execute("UPDATE suppliers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (net_paid_orig, supp_id))

        log_audit_event('purchases', pur_id, 'UPDATE' if ex_pur else 'CREATE', old_values=dict(ex_pur) if ex_pur else None, new_values={'invoice_no': inv_no, 'supplier': supp_name, 'grand_total_yer': grand_total_yer, 'items_count': len(saved_items)}, user_id=clean_str(data.get('created_by') or 'system'))
        res['items'] = saved_items
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        return res
