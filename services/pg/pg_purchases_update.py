# services/pg/pg_purchases_update.py
# Atomic update transaction for purchase invoices with strict sequence & audit governance

from .db_pool import get_db_cursor, clean_str, clean_num, today_str
from .account_resolver import (
    resolve_exchange_rate, resolve_account_id, resolve_cash_account_by_currency,
    resolve_inventory_account, resolve_payables_account
)
from .pg_audit import log_audit_event, get_active_user_context
from .pg_sequences import get_next_sequence_number


def sync_account_balance(cur, account_id):
    """مزامنة رصيد الحساب المالي آلياً مع صافي قيود اليومية المحاسبية المعتمدة"""
    if not account_id: return
    cur.execute("SELECT id, account_code, normal_balance, opening_balance FROM chart_of_accounts WHERE id = %s OR account_code = %s LIMIT 1;", (account_id, account_id))
    acc = cur.fetchone()
    if not acc: return
    aid, acode, norm = acc['id'], acc['account_code'], acc.get('normal_balance') or 'Debit'
    op_bal = float(acc.get('opening_balance') or 0.0)
    cur.execute("SELECT COALESCE(SUM(debit_base), 0.0) as tot_debit, COALESCE(SUM(credit_base), 0.0) as tot_credit FROM journal_entry_lines WHERE account_id IN (%s, %s);", (aid, acode))
    sums = cur.fetchone() or {'tot_debit': 0.0, 'tot_credit': 0.0}
    tot_d, tot_c = float(sums['tot_debit']), float(sums['tot_credit'])
    curr_bal = op_bal + (tot_c - tot_d) if norm == 'Credit' else op_bal + (tot_d - tot_c)
    cur.execute("UPDATE chart_of_accounts SET current_balance = %s WHERE id = %s;", (round(curr_bal, 4), aid))
    try:
        cur.execute("UPDATE accounts SET current_balance = %s WHERE id = %s OR account_code = %s;", (round(curr_bal, 4), aid, acode))
    except Exception: pass


def update_purchase(payload):
    data = payload.get('data') or payload
    p_id = clean_str(data.get('id') or data.get('purchase_id'))
    p_inv = clean_str(data.get('invoice_no') or data.get('bill_no'))
    if not p_id and not p_inv: raise ValueError("معرف الفاتورة (id / invoice_no) مطلوب لتنفيذ التحديث")

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
        s_name = clean_str(data.get('item_name') or data.get('item') or '')
        if s_name:
            s_qty = max(0.0001, clean_num(data.get('quantity') or data.get('qty') or 1.0))
            s_cost = max(0.0, clean_num(data.get('unit_price') or data.get('price') or 0.0))
            items.append({'item_name': s_name, 'unit': clean_str(data.get('unit') or 'متر'), 'quantity': s_qty, 'unit_price': s_cost, 'total_price': round(s_qty * s_cost, 2), 'notes': clean_str(data.get('notes') or '')})

    if not items: raise ValueError("بنود فاتورة المشتريات فارغة! يرجى إضافة صنف واحد على الأقل")

    total_qty = sum(i['quantity'] for i in items)
    items_total = sum(i['total_price'] for i in items)
    orig_amt = clean_num(data.get('original_amount') or items_total)
    header_name = items[0]['item_name'] if len(items) == 1 else " + ".join([i['item_name'] for i in items])[:245]
    header_unit = items[0]['unit'] if all(i.get('unit') == items[0].get('unit') for i in items) else 'مشكل'
    header_price = round(orig_amt / total_qty, 2) if total_qty > 0 else 0.0

    discount = clean_num(data.get('discount') or 0.0)
    shipping_cost = clean_num(data.get('shipping_cost') or data.get('freight_cost') or 0.0)
    transfer_fee = clean_num(data.get('transfer_fee') or data.get('transfer_fees') or 0.0)
    pay_method = clean_str(data.get('payment_method') or data.get('pay_type') or 'نقدي')
    pay_source_raw = clean_str(data.get('payment_account_code') or data.get('payment_source') or '')
    transfer_no = clean_str(data.get('transaction_ref') or data.get('transfer_no') or '')
    notes = clean_str(data.get('notes') or '')
    inv_date = clean_str(data.get('invoice_date') or data.get('date')) or today_str()
    receipt_url = clean_str(data.get('receipt_attachment') or data.get('receipt_url') or '')
    invoice_image_url = clean_str(data.get('invoice_attachment') or data.get('invoice_image_url') or '')

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT * FROM purchases WHERE id = %s OR invoice_no = %s LIMIT 1 FOR UPDATE;", (p_id, p_inv or p_id))
        ex_pur = cur.fetchone()
        if not ex_pur: raise ValueError(f"فاتورة المشتريات {p_inv or p_id} غير موجودة في قاعدة البيانات")

        pur_id, inv_no = ex_pur['id'], (ex_pur.get('invoice_no') or ex_pur['id'])
        curr_raw = clean_str(data.get('currency') or ex_pur.get('currency') or 'YER')
        curr = 'SAR' if 'SAR' in curr_raw.upper() else ('USD' if 'USD' in curr_raw.upper() else 'YER')
        rate = resolve_exchange_rate(cur, curr, clean_num(data.get('exchange_rate') or ex_pur.get('exchange_rate') or 1.0))

        net_paid_orig = max(0.0, (orig_amt + shipping_cost + transfer_fee) - discount)
        items_amt_yer = round(orig_amt * rate, 2)
        net_paid_yer = round(net_paid_orig * rate, 2)

        inv_acc = resolve_inventory_account(cur)
        supp_acc = resolve_payables_account(cur)
        cash_acc = resolve_account_id(cur, pay_source_raw, currency=curr) or resolve_cash_account_by_currency(cur, curr)

        wh_in = clean_str(data.get('warehouse_id') or data.get('warehouse') or '')
        cur.execute("SELECT id FROM warehouses WHERE id = %s OR code = %s OR name = %s LIMIT 1;", (wh_in, wh_in, wh_in))
        wh_row = cur.fetchone() or {'id': 'WH-MAIN'}
        warehouse_id = wh_row['id']

        supp_id = clean_str(data.get('supplier_id') or ex_pur.get('supplier_id') or '')
        supp_name = clean_str(data.get('supplier_name') or data.get('supplier') or ex_pur.get('supplier_name') or '')
        supp_phone = clean_str(data.get('supplier_phone') or ex_pur.get('supplier_phone') or '')
        resolved_user = clean_str(data.get('updated_by') or data.get('created_by')) or get_active_user_context()

        # 1. عكس أثر الكميات السابقة من warehouse_stock وتوثيقها في stock_movements
        cur.execute("SELECT inventory_id, quantity FROM purchase_items WHERE purchase_id = %s;", (pur_id,))
        for prev in cur.fetchall():
            prev_id, prev_q = prev.get('inventory_id'), float(prev.get('quantity') or 0.0)
            if prev_id and prev_q > 0:
                cur.execute("UPDATE warehouse_stock SET quantity = GREATEST(0, quantity - %s), updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = %s AND inventory_id = %s;", (prev_q, warehouse_id, prev_id))
                cur.execute("UPDATE inventory SET quantity = GREATEST(0, quantity - %s), updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (prev_q, prev_id))
                sm_rev_id = get_next_sequence_number(cur, 'SM', fallback_prefix='SM-')
                cur.execute("""
                    INSERT INTO stock_movements (id, item_id, warehouse_id, movement_type, quantity, unit_cost, total_cost, reference_id, reference_type, notes, created_at)
                    VALUES (%s, %s, %s, 'PURCHASE_ADJUST', %s, 0.0, 0.0, %s, 'purchases', %s, CURRENT_TIMESTAMP);
                """, (sm_rev_id, prev_id, warehouse_id, -prev_q, pur_id, f"عكس كمية لتعديل فاتورة {inv_no}"))

        cur.execute("DELETE FROM purchase_items WHERE purchase_id = %s;", (pur_id,))

        # 2. تحديث رأس الفاتورة في purchases (مع الحفاظ الكامل على invoice_no الأصلي)
        pay_status = 'Unpaid' if pay_method == 'آجل' else 'Paid'
        pay_acc_code = supp_acc if pay_method == 'آجل' else cash_acc
        cur.execute("""
            UPDATE purchases SET
                supplier_id = %s, supplier_name = %s, supplier_phone = %s, invoice_date = %s,
                item_name = %s, unit = %s, quantity = %s, unit_price = %s, currency = %s,
                exchange_rate = %s, original_amount = %s, discount = %s, amount_yer = %s,
                shipping_cost = %s, transfer_fee = %s, grand_total_yer = %s, payment_method = %s,
                payment_account_code = %s, transaction_ref = %s, invoice_attachment = %s,
                receipt_attachment = %s, receipt_status = 'Received', payment_status = %s,
                notes = %s
            WHERE id = %s RETURNING *;
        """, (supp_id, supp_name, supp_phone, inv_date, header_name, header_unit, total_qty, header_price, curr, rate, orig_amt, discount, items_amt_yer, shipping_cost, transfer_fee, net_paid_yer, pay_method, pay_acc_code, transfer_no, invoice_image_url, receipt_url, pay_status, notes, pur_id))
        res = dict(cur.fetchone())

        # 3. إدراج بنود purchase_items وتطبيق الكميات الجديدة على warehouse_stock
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
                ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP;
            """, (f"WS-{inv_id}-{warehouse_id}", warehouse_id, inv_id, itm['quantity']))

            sm_id = get_next_sequence_number(cur, 'SM', fallback_prefix='SM-')
            cur.execute("""
                INSERT INTO stock_movements (id, item_id, warehouse_id, movement_type, quantity, unit_cost, total_cost, reference_id, reference_type, notes, created_at)
                VALUES (%s, %s, %s, 'PURCHASE_IN', %s, %s, %s, %s, 'purchases', %s, CURRENT_TIMESTAMP);
            """, (sm_id, inv_id, warehouse_id, itm['quantity'], it_cost_yer, round(itm['quantity'] * it_cost_yer, 4), pur_id, f"توريد معدل لفاتورة {inv_no}"))

            p_item_id = f"{pur_id}-ITM-{idx + 1}"
            cur.execute("INSERT INTO purchase_items (id, purchase_id, inventory_id, item_name, unit, quantity, unit_price, total_price, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);", (p_item_id, pur_id, inv_id, itm['item_name'], itm['unit'], itm['quantity'], itm['unit_price'], itm['total_price'], itm.get('notes') or f"صنف معدل {inv_no}"))
            saved_items.append({"id": p_item_id, "item_name": itm['item_name'], "unit": itm['unit'], "quantity": itm['quantity'], "unit_price": itm['unit_price'], "total_price": itm['total_price'], "warehouse_id": warehouse_id})

        # 4. تحديث القيد المحاسبي المزدوج مع حفظ رقم القيد الأصلي بدون توليد رقم جديد
        cur.execute("SELECT id, entry_no FROM journal_entries WHERE id = %s OR (ref_id = %s AND ref_type = 'Purchase') LIMIT 1;", (f"JV-{pur_id}", pur_id))
        ex_jv = cur.fetchone()
        jv_id = ex_jv['id'] if ex_jv else f"JV-{pur_id}"
        jv_no = ex_jv['entry_no'] if ex_jv else get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
        cur.execute("""
            INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Purchase', %s, %s, %s, 'Posted', %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (entry_no) DO UPDATE SET entry_date = EXCLUDED.entry_date, debit_account_id = EXCLUDED.debit_account_id, credit_account_id = EXCLUDED.credit_account_id, amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount, currency = EXCLUDED.currency, exchange_rate = EXCLUDED.exchange_rate, notes = EXCLUDED.notes;
        """, (jv_id, jv_no, inv_date, f"فاتورة توريد مشتريات خامات {inv_no} - {supp_name}", inv_acc, supp_acc, net_paid_orig, net_paid_orig, net_paid_yer, pur_id, curr, rate, f"تعديل توريد مشتريات {inv_no}", resolved_user))
        cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (jv_id,))
        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);", (f"JVL-{pur_id}-D", jv_id, inv_acc, f"مخزون الأقمشة والخامات - فاتورة {inv_no}", net_paid_orig, net_paid_yer))
        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);", (f"JVL-{pur_id}-C", jv_id, supp_acc, f"استحقاق فاتورة {inv_no} - {supp_name}", net_paid_orig, net_paid_yer))

        # 5. تحديث سند الصرف وحفظ رقم السند الأصلي
        cur.execute("SELECT id, payment_no FROM payments WHERE invoice_id = %s OR id = %s LIMIT 1;", (pur_id, f"PAY-{pur_id}"))
        ex_pay = cur.fetchone()
        if pay_method != 'آجل' and net_paid_orig > 0:
            pay_id = ex_pay['id'] if ex_pay else f"PAY-{pur_id}"
            pay_no = ex_pay['payment_no'] if ex_pay else get_next_sequence_number(cur, 'PV', fallback_prefix='PV-')
            cur.execute("""
                INSERT INTO payments (id, payment_no, invoice_id, supplier_id, payment_type, amount, currency, exchange_rate, base_amount, payment_method, reference_no, account_id, target_account_id, party_name, date, status, notes, created_by, created_at)
                VALUES (%s, %s, %s, %s, 'Payment', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (payment_no) DO UPDATE SET amount = EXCLUDED.amount, base_amount = EXCLUDED.base_amount, account_id = EXCLUDED.account_id, target_account_id = EXCLUDED.target_account_id, party_name = EXCLUDED.party_name, date = EXCLUDED.date, status = 'Confirmed';
            """, (pay_id, pay_no, pur_id, supp_id, net_paid_orig, curr, rate, net_paid_yer, pay_method, transfer_no, cash_acc, supp_acc, supp_name, inv_date, f"سداد فاتورة مشتريات {inv_no} - {supp_name}", resolved_user))
            cur.execute("SELECT id, entry_no FROM journal_entries WHERE id = %s OR (ref_id = %s AND ref_type = 'Payment') LIMIT 1;", (f"JV-PAY-{pur_id}", pur_id))
            ex_pjv = cur.fetchone()
            pjv_id = ex_pjv['id'] if ex_pjv else f"JV-PAY-{pur_id}"
            pjv_no = ex_pjv['entry_no'] if ex_pjv else get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
            cur.execute("""
                INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Payment', %s, %s, %s, 'Posted', %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (entry_no) DO UPDATE SET entry_date = EXCLUDED.entry_date, amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount, status = 'Posted';
            """, (pjv_id, pjv_no, inv_date, f"سند صرف سداد فاتورة مشتريات {inv_no}: {supp_name}", supp_acc, cash_acc, net_paid_orig, net_paid_orig, net_paid_yer, pur_id, curr, rate, f"سداد فاتورة {inv_no}", resolved_user))
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (pjv_id,))
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);", (f"JVL-PAY-{pur_id}-D", pjv_id, supp_acc, f"مدين - سداد فاتورة {inv_no} ({supp_name})", net_paid_orig, net_paid_yer))
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);", (f"JVL-PAY-{pur_id}-C", pjv_id, cash_acc, f"دائن - سداد فاتورة {inv_no} ({supp_name})", net_paid_orig, net_paid_yer))
        elif ex_pay:
            cur.execute("UPDATE payments SET status = 'Cancelled' WHERE id = %s;", (ex_pay['id'],))
            cur.execute("UPDATE journal_entries SET status = 'Cancelled' WHERE id = %s;", (f"JV-PAY-{pur_id}",))

        # 6. مزامنة أرصدة الحسابات وميزان المراجعة آلياً في chart_of_accounts
        for a_code in [inv_acc, supp_acc, cash_acc, ex_pur.get('payment_account_code')]:
            sync_account_balance(cur, a_code)

        # 7. توثيق سجل التدقيق الرقابي بموجب ميثاق الحوكمة
        log_audit_event('purchases', pur_id, 'UPDATE', old_values=dict(ex_pur), new_values={'invoice_no': inv_no, 'supplier': supp_name, 'grand_total_yer': net_paid_yer, 'items': len(saved_items)}, user_id=resolved_user, document_no=inv_no, details=f"تعديل فاتورة مشتريات {inv_no} للمورد {supp_name}", cur=cur)

        res['invoice_no'], res['bill_no'], res['id'], res['items'] = inv_no, inv_no, pur_id, saved_items
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('invoice_date'): res['invoice_date'] = str(res['invoice_date'])
        return res
