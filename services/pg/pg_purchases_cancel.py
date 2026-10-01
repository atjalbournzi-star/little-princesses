# services/pg/pg_purchases_cancel.py
# Purchase cancellation, reversal journal entries, stock reconciliation, and governance policy enforcement

from .db_pool import get_db_cursor, clean_str, generate_id, logger
from .pg_audit import log_audit_event


def cancel_purchase(payload):
    """إلغاء فاتورة مشتريات مع عكس حركات المخزون وترحيل قيد عكسي متوازن (حظر الحذف النهائي)"""
    data = payload.get('data') or payload
    raw_id = clean_str(data.get('id') or '')
    raw_inv = clean_str(data.get('invoice_no') or '')
    raw_bill = clean_str(data.get('bill_no') or '')
    raw_pur = clean_str(data.get('purchase_id') or '')
    created_by = clean_str(data.get('created_by') or data.get('user_id') or 'admin')

    raw_candidates = [x for x in [raw_id, raw_inv, raw_bill, raw_pur] if x]
    if not raw_candidates:
        p_id = clean_str(data.get('id') or data.get('purchase_id') or data.get('invoice_no') or data.get('bill_no'))
        raw_candidates = [p_id] if p_id else []

    candidates = list(raw_candidates)
    for c in raw_candidates:
        if '-' in c:
            parts = c.rsplit('-', 1)
            if parts[1].isdigit(): candidates.append(parts[0])

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT * FROM purchases WHERE id = ANY(%s) OR invoice_no = ANY(%s) ORDER BY created_at DESC LIMIT 1 FOR UPDATE;", (candidates, candidates))
        p_row = cur.fetchone()

        if not p_row:
            cur.execute("SELECT purchase_id FROM purchase_items WHERE id = ANY(%s) LIMIT 1;", (candidates,))
            pitm_row = cur.fetchone()
            if pitm_row and pitm_row.get('purchase_id'):
                cur.execute("SELECT * FROM purchases WHERE id = %s LIMIT 1 FOR UPDATE;", (pitm_row['purchase_id'],))
                p_row = cur.fetchone()

        if not p_row:
            cur.execute("SELECT id FROM payments WHERE invoice_id = ANY(%s) OR payment_no = ANY(%s) LIMIT 1;", (candidates, candidates))
            has_pay = cur.fetchone()
            cur.execute("SELECT id FROM journal_entries WHERE ref_id = ANY(%s) OR entry_no = ANY(%s) LIMIT 1;", (candidates, candidates))
            has_jv = cur.fetchone()
            if not has_pay and not has_jv:
                return {"success": True, "cancelled": raw_id or (candidates[0] if candidates else 'UNKNOWN'), "message": "تمت إزالة السجل بنجاح (غير مقيد في قاعدة البيانات السحابية)", "not_in_db": True}
            return {"success": False, "error": f"فاتورة المشتريات {raw_id or raw_bill or 'المحددة'} غير موجودة"}

        actual_id = p_row['id']
        actual_inv = p_row['invoice_no']
        if p_row.get('receipt_status') == 'Cancelled':
            return {"success": True, "message": f"الفاتورة {actual_inv} ملغاة مسبقاً", "id": actual_id}

        clean_ref = actual_id[4:] if str(actual_id).startswith('PUR-') else actual_id
        jv_no = f"JV-PUR-{clean_ref}"
        pay_no = f"PAY-{clean_ref}"
        auto_rev_no = f"REV-JV-PUR-{clean_ref}"

        # 1. Reverse stock quantities
        cur.execute("SELECT * FROM purchase_items WHERE purchase_id = %s;", (actual_id,))
        for itm in cur.fetchall():
            inv_id = itm.get('inventory_id')
            it_qty = float(itm.get('quantity') or 0.0)
            it_price = float(itm.get('unit_price') or 0.0)
            if inv_id and it_qty > 0:
                cur.execute("UPDATE inventory SET quantity = GREATEST(0, quantity - %s), status = CASE WHEN (quantity - %s) <= 0 THEN 'OutOfStock' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (it_qty, it_qty, inv_id))
                cur.execute("INSERT INTO inventory_transactions (id, inventory_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes) VALUES (%s, %s, 'PURCHASE_CANCEL', %s, %s, 'purchases', %s, %s);",
                            (generate_id("ITXN"), inv_id, -it_qty, it_price, actual_id, f"إلغاء توريد فاتورة {actual_inv}"))

        # 2. Reverse journal entry
        cur.execute("SELECT * FROM journal_entries WHERE entry_no = %s OR entry_no = %s OR ref_id = %s OR ref_id = %s LIMIT 1;", (jv_no, f"JV-PUR-{actual_inv}", actual_id, actual_inv))
        orig_jv = cur.fetchone()
        if orig_jv:
            orig_jv_id = orig_jv['id']
            cur.execute("SELECT * FROM journal_entry_lines WHERE entry_id = %s;", (orig_jv_id,))
            orig_lines = cur.fetchall()
            if orig_lines:
                cur.execute("""
                    INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
                    VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'Purchase_Reversal', %s, %s, %s, 'Posted', %s)
                    ON CONFLICT (entry_no) DO NOTHING;
                """, (generate_id("JV"), auto_rev_no, f"قيد عكسي لإلغاء فاتورة المشتريات {actual_inv}", orig_jv.get('credit_account_id'), orig_jv.get('debit_account_id'), orig_jv.get('amount'), orig_jv.get('total_amount'), orig_jv.get('base_amount'), actual_id, orig_jv.get('currency'), orig_jv.get('exchange_rate'), f"قيد عكسي نظامي لإلغاء فاتورة المشتريات {actual_inv}"))

                cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_rev_no,))
                rev_jv = cur.fetchone()
                if rev_jv:
                    for ol in orig_lines:
                        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);",
                                    (generate_id("JVL"), rev_jv['id'], ol.get('account_id'), f"عكس قيد - {ol.get('line_description') or ''}", float(ol.get('credit') or 0.0), float(ol.get('debit') or 0.0), float(ol.get('credit_base') or 0.0), float(ol.get('debit_base') or 0.0)))
            cur.execute("UPDATE journal_entries SET status = 'Reversed', notes = COALESCE(notes, '') || ' | [تم إنشاء قيد عكسي]' WHERE id = %s;", (orig_jv_id,))

        # 3. Cancel payment
        cur.execute("UPDATE payments SET status = 'Cancelled', notes = COALESCE(notes, '') || ' | [ملغى بحكم إلغاء الفاتورة]' WHERE invoice_id = %s OR invoice_id = %s OR payment_no = %s OR payment_no = %s;", (actual_id, actual_inv, pay_no, f"PAY-{actual_inv}"))

        # 4. Supplier ledger adjustment
        supp_id = p_row.get('supplier_id')
        net_paid = max(0.0, (float(p_row.get('original_amount') or 0) + float(p_row.get('shipping_cost') or 0) + float(p_row.get('transfer_fee') or 0)) - float(p_row.get('discount') or 0))
        if p_row.get('payment_method') == 'آجل' and supp_id and supp_id != 'SUPP-GENERAL':
            cur.execute("UPDATE suppliers SET current_balance = GREATEST(0, current_balance - %s), updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (net_paid, supp_id))

        # 5. Soft-cancel purchase (No Hard Delete)
        cur.execute("UPDATE purchases SET receipt_status = 'Cancelled', payment_status = 'Cancelled', notes = COALESCE(notes, '') || ' | [ملغاة وموثقة في سجل التدقيق]' WHERE id = %s;", (actual_id,))

        log_audit_event('purchases', actual_id, 'CANCEL', old_values=dict(p_row), new_values={'receipt_status': 'Cancelled', 'payment_status': 'Cancelled', 'reversal_jv': auto_rev_no}, user_id=created_by)
        return {"success": True, "cancelled": actual_id, "invoice_no": actual_inv, "reversal_jv": auto_rev_no, "message": f"✅ تم إلغاء الفاتورة {actual_inv} بنجاح وترحيل القيد المحاسبي العكسي وتوثيق العملية بسجل التدقيق"}


def delete_purchase(payload):
    res = cancel_purchase(payload)
    if res.get('success'):
        try:
            reconcile_inventory_governance()
        except Exception as e:
            logger.warning(f"Post-cancel inventory reconciliation warning: {e}")
    return res


def reconcile_inventory_governance(payload=None):
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id, item_code, name, quantity, unit_cost, total_value, status FROM inventory FOR UPDATE;")
        items = cur.fetchall()
        reconciled_count = 0
        details = []
        for item in items:
            inv_id = item['id']
            curr_qty = float(item.get('quantity') or 0.0)
            u_cost = float(item.get('unit_cost') or 0.0)
            curr_tot = float(item.get('total_value') or 0.0)

            cur.execute("SELECT COALESCE(SUM(quantity), 0.0) as net_qty FROM inventory_transactions WHERE inventory_id = %s;", (inv_id,))
            tx_res = cur.fetchone()
            net_tx_qty = float(tx_res.get('net_qty') or 0.0) if tx_res else 0.0
            expected_qty = max(0.0, net_tx_qty)
            expected_tot = round(expected_qty * u_cost, 2)

            if abs(curr_qty - expected_qty) > 0.0001 or abs(curr_tot - expected_tot) > 0.01:
                new_status = 'OutOfStock' if expected_qty <= 0 else ('LowStock' if expected_qty < 5.0 else 'Available')
                cur.execute("UPDATE inventory SET quantity = %s, status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (expected_qty, new_status, inv_id))
                log_audit_event('inventory', inv_id, 'RECONCILE', old_values={'quantity': curr_qty, 'total_value': curr_tot, 'status': item.get('status')}, new_values={'quantity': expected_qty, 'total_value': expected_tot, 'status': new_status, 'reason': 'مطابقة المخزون الرقابي مع صافي الحركات والفواتير'}, user_id='system_governance')
                reconciled_count += 1
                details.append({'id': inv_id, 'name': item.get('name'), 'old_qty': curr_qty, 'reconciled_qty': expected_qty, 'unit_cost': u_cost, 'total_value': expected_tot, 'status': new_status})

        return {"success": True, "reconciled_count": reconciled_count, "items": details, "message": f"تمت مطابقة وتسوية المخزون الرقابي بنجاح: {reconciled_count} أصناف تم تصحيح أرصدتها"}


def purge_purchases(payload=None):
    raise PermissionError("عملية التصفير ومسح السجلات محظورة قطيعاً بموجب ميثاق الحوكمة البرمجية والمالية (No Hard Delete Policy)")
