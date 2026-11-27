# services/pg/pg_purchases_write.py
# Purchase invoices creation, stock valuation, inventory receipt, and atomic posting

from .db_pool import get_db_cursor, clean_str, clean_num, today_str
from .account_resolver import (
    resolve_exchange_rate, resolve_account_id, resolve_cash_account_by_currency,
    resolve_inventory_account, resolve_payables_account
)
from .pg_audit import log_audit_event, get_active_user_context
from .pg_sequences import get_next_sequence_number
from .pg_purchases_posting import post_purchase_journal, post_purchase_payment
from .pg_purchases_update import update_purchase


def add_purchase(payload):
    data = payload.get('data') or payload
    p_id = clean_str(data.get('id') or data.get('purchase_id'))
    if p_id and not p_id.startswith('PUR-NEW') and not p_id.startswith('BILL-'):
        return update_purchase(payload)
    raw_items = data.get('items')
    items = []
    if isinstance(raw_items, list) and len(raw_items) > 0:
        for itm in raw_items:
            i_name = clean_str(itm.get('item_name') or itm.get('item') or itm.get('name') or '')
            if not i_name: continue
            i_qty = max(0.0001, clean_num(itm.get('qty') or itm.get('quantity') or 1.0))
            i_cost = max(0.0, clean_num(itm.get('cost') or itm.get('price') or itm.get('unit_price') or 0.0))
            items.append({
                'item_name': i_name, 'unit': clean_str(itm.get('unit') or 'متر'), 'quantity': i_qty,
                'unit_price': i_cost, 'total_price': round(i_qty * i_cost, 2), 'notes': clean_str(itm.get('notes') or '')
            })
    else:
        s_name = clean_str(data.get('item_name') or data.get('fabric_name') or data.get('item') or '')
        if s_name:
            s_qty = max(0.0001, clean_num(data.get('quantity') or data.get('qty') or 1.0))
            s_cost = max(0.0, clean_num(data.get('unit_price') or data.get('cost_per_unit') or data.get('price') or 0.0))
            s_tot = clean_num(data.get('original_amount') or (s_qty * s_cost) or data.get('total_amount') or 0.0)
            items.append({'item_name': s_name, 'unit': clean_str(data.get('unit') or 'متر'), 'quantity': s_qty, 'unit_price': s_cost, 'total_price': s_tot if s_tot > 0 else round(s_qty * s_cost, 2), 'notes': clean_str(data.get('notes') or '')})

    if not items:
        raise ValueError("بنود فاتورة المشتريات فارغة! يرجى إضافة صنف واحد على الأقل")

    total_qty = sum(i['quantity'] for i in items)
    items_total = sum(i['total_price'] for i in items)
    orig_amt = clean_num(data.get('original_amount') or items_total)
    header_name = items[0]['item_name'] if len(items) == 1 else " + ".join([i['item_name'] for i in items])[:245]
    header_unit = items[0]['unit'] if all(i.get('unit') == items[0].get('unit') for i in items) else 'مشكل'
    header_price = round(orig_amt / total_qty, 2) if total_qty > 0 else 0.0

    discount = clean_num(data.get('discount') or data.get('discount_amount') or 0.0)
    shipping_cost = clean_num(data.get('shipping_cost') or data.get('freight_cost') or 0.0)
    transfer_fee = clean_num(data.get('transfer_fee') or data.get('transfer_fees') or 0.0)
    pay_method = clean_str(data.get('payment_method') or data.get('pay_type') or 'نقدي')
    pay_source_raw = clean_str(data.get('payment_account_code') or data.get('payment_source') or data.get('account_id') or '')
    transfer_no = clean_str(data.get('transaction_ref') or data.get('transaction_id') or data.get('transfer_no') or '')
    receipt_url = clean_str(data.get('receipt_attachment') or data.get('receipt_url') or data.get('image_path') or '')
    invoice_image_url = clean_str(data.get('invoice_attachment') or data.get('invoice_image_url') or data.get('invoice_url') or data.get('bill_attachment') or '')
    notes = clean_str(data.get('notes') or '')
    inv_date = clean_str(data.get('invoice_date') or data.get('date')) or today_str()
    curr_raw = clean_str(data.get('currency') or data.get('Original_Currency') or 'YER')
    curr = 'SAR' if 'SAR' in curr_raw.upper() else ('USD' if 'USD' in curr_raw.upper() else 'YER')

    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, clean_num(data.get('exchange_rate') or 1.0))
        net_paid_orig = max(0.0, (orig_amt + shipping_cost + transfer_fee) - discount)
        items_amt_yer = orig_amt * rate
        net_paid_yer = max(0.0, ((orig_amt + shipping_cost + transfer_fee) - discount) * rate)
        grand_total_yer = net_paid_yer

        from .pg_audit import resolve_active_user_id
        resolved_user = resolve_active_user_id(cur, clean_str(data.get('user_id') or data.get('created_by')))

        wh_in = clean_str(data.get('warehouse_id') or data.get('warehouse') or data.get('location') or '')
        cur.execute("SELECT id, name, account_id FROM warehouses WHERE id = %s OR code = %s OR name = %s LIMIT 1;", (wh_in, wh_in, wh_in))
        wh_row = cur.fetchone()
        if not wh_row:
            cur.execute("SELECT id, name, account_id FROM warehouses WHERE is_active = TRUE ORDER BY id ASC LIMIT 1;")
            wh_row = cur.fetchone()
        if not wh_row:
            raise ValueError("لا يوجد أي مستودع نشط معرف في جدول المستودعات (warehouses)")
        warehouse_id = wh_row['id']
        inv_acc = wh_row.get('account_id')
        if not inv_acc:
            from .pg_warehouse_accounts import create_or_link_warehouse_account
            inv_acc = create_or_link_warehouse_account(cur, warehouse_id, wh_row['name'], user_id=resolved_user)

        supp_acc = resolve_payables_account(cur)
        cash_acc = resolve_account_id(cur, pay_source_raw, currency=curr) or resolve_cash_account_by_currency(cur, curr)
        if not inv_acc or not supp_acc:
            raise ValueError("تعذر تحديد حسابات المخزون أو الموردين من شجرة الحسابات")

        supp_id, supp_name = clean_str(data.get('supplier_id') or ''), clean_str(data.get('supplier_name') or data.get('supplier') or '')
        supp_phone = clean_str(data.get('supplier_phone') or data.get('phone') or '')
        if not supp_name and not supp_id:
            raise ValueError("اسم المورد مطلوب لإصدار فاتورة المشتريات")
        if supp_id:
            cur.execute("SELECT id, name FROM suppliers WHERE id = %s LIMIT 1;", (supp_id,))
            s_row = cur.fetchone()
            if not s_row and supp_name:
                cur.execute("SELECT id, name FROM suppliers WHERE name = %s LIMIT 1;", (supp_name,))
                s_row = cur.fetchone()
                if s_row: supp_id = s_row['id']
        elif supp_name:
            cur.execute("SELECT id, name FROM suppliers WHERE name = %s LIMIT 1;", (supp_name,))
            s_row = cur.fetchone()
            if s_row: supp_id = s_row['id']

        if not supp_id:
            supp_id = get_next_sequence_number(cur, 'SUP', fallback_prefix='SUP-')
            cur.execute("""
                INSERT INTO suppliers (id, name, phone, city, address, current_balance, is_active, created_at, updated_at, created_by)
                VALUES (%s, %s, %s, %s, %s, 0.0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, %s);
            """, (supp_id, supp_name, supp_phone, clean_str(data.get('city') or ''), clean_str(data.get('address') or ''), resolved_user))

        e_id, e_no = clean_str(data.get('id') or data.get('purchase_id')), clean_str(data.get('invoice_no') or data.get('bill_no'))
        ex_pur = None
        if e_id or (e_no and not e_no.startswith('PUR-NEW') and not e_no.startswith('BILL-')):
            cur.execute("SELECT id, invoice_no FROM purchases WHERE id = %s OR invoice_no = %s LIMIT 1 FOR UPDATE;", (e_id, e_no))
            ex_pur = cur.fetchone()

        if ex_pur:
            pur_id, inv_no = ex_pur['id'], (ex_pur.get('invoice_no') or ex_pur['id'])
        else:
            inv_no = get_next_sequence_number(cur, 'PUR', fallback_prefix='PUR-')
            pur_id = inv_no

        is_credit = ('آجل' in pay_method) or ('credit' in pay_method.lower())
        pay_status = 'Unpaid' if is_credit else 'Paid'
        pay_acc_code = supp_acc if is_credit else cash_acc

        cur.execute("""
            INSERT INTO purchases (
                id, invoice_no, supplier_id, supplier_name, supplier_phone, invoice_date, item_name, unit, quantity,
                unit_price, currency, exchange_rate, original_amount, discount, amount_yer, shipping_cost, transfer_fee,
                grand_total_yer, payment_method, payment_account_code, transaction_ref, invoice_attachment, receipt_attachment,
                receipt_status, payment_status, created_by, notes, warehouse_id, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Received', %s, %s, %s, %s, CURRENT_TIMESTAMP
            ) ON CONFLICT (id) DO UPDATE SET
                supplier_id = EXCLUDED.supplier_id, supplier_name = EXCLUDED.supplier_name, quantity = EXCLUDED.quantity,
                unit_price = EXCLUDED.unit_price, original_amount = EXCLUDED.original_amount, discount = EXCLUDED.discount,
                shipping_cost = EXCLUDED.shipping_cost, transfer_fee = EXCLUDED.transfer_fee, amount_yer = EXCLUDED.amount_yer,
                grand_total_yer = EXCLUDED.grand_total_yer, payment_method = EXCLUDED.payment_method, notes = EXCLUDED.notes,
                warehouse_id = EXCLUDED.warehouse_id
            RETURNING *;
        """, (pur_id, inv_no, supp_id, supp_name, supp_phone, inv_date, header_name, header_unit, total_qty, header_price, curr, rate, orig_amt, discount, items_amt_yer, shipping_cost, transfer_fee, grand_total_yer, pay_method, pay_acc_code, transfer_no, invoice_image_url, receipt_url, pay_status, resolved_user, notes, warehouse_id))
        res = dict(cur.fetchone())

        cur.execute("SELECT inventory_id, quantity FROM purchase_items WHERE purchase_id = %s;", (pur_id,))
        for prev in cur.fetchall():
            if prev.get('inventory_id') and float(prev.get('quantity') or 0) > 0:
                cur.execute("UPDATE inventory SET quantity = GREATEST(0, quantity - %s), updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (float(prev['quantity']), prev['inventory_id']))

        cur.execute("DELETE FROM purchase_items WHERE purchase_id = %s;", (pur_id,))
        cur.execute("DELETE FROM inventory_transactions WHERE reference_type = 'purchases' AND reference_id = %s;", (pur_id,))
        cur.execute("DELETE FROM stock_movements WHERE reference_type = 'purchases' AND reference_id = %s;", (pur_id,))

        saved_items = []
        cost_ratio = (net_paid_orig / orig_amt) if orig_amt > 0 else 1.0
        for idx, itm in enumerate(items):
            net_u_cost = round(itm['unit_price'] * cost_ratio, 4)
            it_cost_yer = round(net_u_cost * rate, 4)
            cur.execute("SELECT id, quantity, unit_cost FROM inventory WHERE name = %s OR item_code = %s LIMIT 1 FOR UPDATE;", (itm['item_name'], itm['item_name']))
            inv_row = cur.fetchone()
            if inv_row:
                inv_id = inv_row['id']
                old_q, old_c = float(inv_row['quantity'] or 0.0), float(inv_row['unit_cost'] or 0.0)
                new_q = old_q + itm['quantity']
                new_c = round(((old_q * old_c) + (itm['quantity'] * it_cost_yer)) / new_q, 4) if new_q > 0 else it_cost_yer
                cur.execute("UPDATE inventory SET quantity = %s, unit_cost = %s, location = %s, status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_q, new_c, warehouse_id, inv_id))
            else:
                inv_id = get_next_sequence_number(cur, 'MAT', fallback_prefix='MAT-')
                cur.execute("INSERT INTO inventory (id, item_code, name, type, category, unit, quantity, reserved_qty, unit_cost, currency, supplier_id, location, status) VALUES (%s, %s, %s, 'Fabric', 'أقمشة فاخرة', %s, %s, 0.0, %s, 'YER', %s, %s, 'Available');", (inv_id, inv_id, itm['item_name'], itm['unit'], itm['quantity'], it_cost_yer, supp_id, warehouse_id))

            cur.execute("""
                INSERT INTO warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at)
                VALUES (%s, %s, %s, %s, 0.0, CURRENT_TIMESTAMP)
                ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET
                    quantity = warehouse_stock.quantity + EXCLUDED.quantity,
                    updated_at = CURRENT_TIMESTAMP;
            """, (f"WS-{inv_id}-{warehouse_id}", warehouse_id, inv_id, itm['quantity']))

            sm_id = get_next_sequence_number(cur, 'SM', fallback_prefix='SM-')
            cur.execute("""
                INSERT INTO stock_movements (id, item_id, warehouse_id, movement_type, quantity, unit_cost, total_cost, reference_id, reference_type, notes, created_at)
                VALUES (%s, %s, %s, 'PURCHASE_IN', %s, %s, %s, %s, 'purchases', %s, CURRENT_TIMESTAMP);
            """, (sm_id, inv_id, warehouse_id, itm['quantity'], it_cost_yer, round(itm['quantity'] * it_cost_yer, 4), pur_id, f"توريد مشتريات {inv_no}"))

            p_item_id = f"{pur_id}-ITM-{idx + 1}"
            cur.execute("INSERT INTO purchase_items (id, purchase_id, inventory_id, item_name, unit, quantity, unit_price, total_price, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);", (p_item_id, pur_id, inv_id, itm['item_name'], itm['unit'], itm['quantity'], itm['unit_price'], itm['total_price'], itm.get('notes') or f"صنف فاتورة {inv_no}"))
            saved_items.append({"id": p_item_id, "item_name": itm['item_name'], "unit": itm['unit'], "quantity": itm['quantity'], "unit_price": itm['unit_price'], "total_price": itm['total_price'], "warehouse_id": warehouse_id})

        post_purchase_journal(cur, pur_id, inv_no, inv_date, supp_id, supp_name, net_paid_orig, net_paid_yer, curr, rate, inv_acc, supp_acc, resolved_user)

        if not is_credit:
            post_purchase_payment(cur, pur_id, inv_no, inv_date, supp_id, supp_name, net_paid_orig, net_paid_yer, curr, rate, pay_method, cash_acc, supp_acc, transfer_no, resolved_user)
        elif supp_id:
            cur.execute("UPDATE suppliers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (net_paid_orig, supp_id))

        log_audit_event('purchases', pur_id, 'UPDATE' if ex_pur else 'INSERT', old_values=dict(ex_pur) if ex_pur else None, new_values={'invoice_no': inv_no, 'supplier': supp_name, 'grand_total_yer': grand_total_yer}, user_id=resolved_user, document_no=inv_no, details=f"فاتورة مشتريات {inv_no} من {supp_name}", cur=cur)

        res['invoice_no'], res['bill_no'], res['purchase_no'], res['id'], res['items'] = inv_no, inv_no, inv_no, pur_id, saved_items
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('invoice_date'): res['invoice_date'] = str(res['invoice_date'])
        return res
