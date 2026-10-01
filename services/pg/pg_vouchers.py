# services/pg/pg_vouchers.py
# Payment and receipt vouchers, automated balanced journal entries, and balance adjustments

from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str, execute_query
from .account_resolver import resolve_exchange_rate, resolve_account_id


def get_vouchers(params=None):
    """استرجاع سندات القبض والصرف والحسابات المالية المقترنة"""
    query = """
        SELECT p.id, p.payment_no, p.payment_no as voucher_no, p.payment_type,
               p.payment_type as voucher_type, p.amount, p.currency, p.exchange_rate,
               p.base_amount, p.payment_method, p.payment_method as pay_method,
               p.account_id, p.date as date_created, p.notes, p.status,
               p.target_account_id, p.target_account_id as target_acc,
               COALESCE(NULLIF(p.party_name, ''), c.name, s.name, 'طرف عام') as party_name
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.created_at DESC;
    """
    rows = execute_query(query, fetch_all=True) or []
    for r in rows:
        if r.get('date_created'): r['date_created'] = str(r['date_created'])
    return rows


def add_voucher(payload):
    """إصدار أو تعديل سند مالي (قبض / صرف) وترحيل القيد المحاسبي المزدوج آلياً"""
    data = payload.get('data') or payload
    pay_id = clean_str(data.get('id') or data.get('voucher_id')) or generate_id("PAY")
    pay_no = clean_str(data.get('payment_no') or data.get('voucher_no') or data.get('v_no')) or pay_id
    raw_type = clean_str(data.get('voucher_type') or data.get('payment_type') or data.get('v_type') or 'سند قبض')
    is_rcpt = ('قبض' in raw_type or raw_type.lower() in ('receipt', 'receipt_voucher', 'rv') or str(data.get('payment_no') or data.get('voucher_no') or data.get('v_no') or '').upper().startswith('RV'))
    p_type = 'Receipt' if is_rcpt else 'Payment'
    v_type = 'سند قبض' if is_rcpt else 'سند صرف'
    amt = clean_num(data.get('amount') or 0.0)
    curr = clean_str(data.get('currency') or 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    base_amt = clean_num(data.get('base_amount') or (amt * rate))
    pay_method = clean_str(data.get('payment_method') or data.get('pay_method') or 'نقد (كاش)')
    p_date = clean_str(data.get('date') or data.get('date_created')) or today_str()
    notes = clean_str(data.get('notes') or '')
    party_val = clean_str(data.get('party') or data.get('party_name') or '')
    target_acc_input = clean_str(data.get('target_acc') or data.get('target_account_id') or data.get('target_account') or '')
    cust_id = clean_str(data.get('customer_id') or '') or None
    supp_id = clean_str(data.get('supplier_id') or '') or None

    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, rate)
        if curr != 'YER' and (base_amt <= 0 or base_amt == amt):
            base_amt = amt * rate

        raw_cash = data.get('account_id') or data.get('acc_code') or data.get('source_acc')
        resolved_cash_acc = resolve_account_id(cur, raw_cash, default_id='ACC-101-1', currency=curr)
        if resolved_cash_acc in ('ACC-101', 'ACC-101-1', '101', '101.1'):
            if curr == 'SAR': resolved_cash_acc = 'ACC-101-2'
            elif curr == 'USD': resolved_cash_acc = 'ACC-101-3'
            else: resolved_cash_acc = 'ACC-101-1'
        default_target = 'ACC-104' if p_type == 'Receipt' else 'ACC-201'
        if p_type == 'Receipt' and (target_acc_input in ('202', 'ACC-202') or 'عربون' in notes or 'حجز' in notes or data.get('is_advance')):
            default_target = 'ACC-202'
        resolved_target_acc = resolve_account_id(cur, target_acc_input, default_target) if target_acc_input else default_target

        if cust_id:
            cur.execute("SELECT id FROM customers WHERE id = %s LIMIT 1;", (cust_id,))
            if not cur.fetchone(): cust_id = None
        if supp_id:
            cur.execute("SELECT id FROM suppliers WHERE id = %s LIMIT 1;", (supp_id,))
            if not cur.fetchone(): supp_id = None

        order_ref = clean_str(data.get('order_id') or data.get('order_no') or data.get('reference_no') or '')
        resolved_order_id = None
        if order_ref:
            cur.execute("SELECT id FROM orders WHERE id = %s OR order_no = %s LIMIT 1;", (order_ref, order_ref))
            o_row = cur.fetchone()
            if o_row: resolved_order_id = o_row['id']

        existing_v = None
        if pay_id or pay_no:
            cur.execute("SELECT id, amount, base_amount, account_id, target_account_id, payment_type, customer_id, supplier_id, payment_no FROM payments WHERE id = %s OR payment_no = %s LIMIT 1 FOR UPDATE;", (pay_id, pay_no))
            existing_v = cur.fetchone()

        if not existing_v and p_type == 'Receipt' and (resolved_order_id or order_ref):
            cur.execute("""
                SELECT id, amount, base_amount, account_id, target_account_id, payment_type, customer_id, supplier_id, payment_no FROM payments 
                WHERE (order_id = %s OR reference_no = %s) AND payment_type = 'Receipt'
                ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
            """, (resolved_order_id or order_ref, order_ref))
            existing_v = cur.fetchone()

        if not existing_v and p_type == 'Receipt' and cust_id and ('عربون' in notes or 'حجز' in notes):
            cur.execute("""
                SELECT id, amount, base_amount, account_id, target_account_id, payment_type, customer_id, supplier_id, payment_no FROM payments 
                WHERE customer_id = %s AND payment_type = 'Receipt' AND (notes ILIKE '%%عربون%%' OR notes ILIKE '%%حجز%%')
                ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
            """, (cust_id,))
            existing_v = cur.fetchone()

        if existing_v:
            pay_id = existing_v['id']
            pay_no = existing_v.get('payment_no') or pay_no
            old_amt = clean_num(existing_v.get('amount') or 0.0)
            if old_amt > 0:
                if existing_v.get('payment_type') == 'Receipt' and existing_v.get('customer_id'):
                    cur.execute("UPDATE customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (old_amt, existing_v['customer_id']))
                elif existing_v.get('payment_type') == 'Payment' and existing_v.get('supplier_id'):
                    cur.execute("UPDATE suppliers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (old_amt, existing_v['supplier_id']))

        query = """
            INSERT INTO payments (
                id, payment_no, customer_id, supplier_id, payment_type, amount, currency,
                exchange_rate, base_amount, payment_method, account_id, date, status, notes,
                party_name, target_account_id, order_id, reference_no
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                payment_no = EXCLUDED.payment_no, customer_id = EXCLUDED.customer_id, supplier_id = EXCLUDED.supplier_id,
                payment_type = EXCLUDED.payment_type, amount = EXCLUDED.amount, currency = EXCLUDED.currency,
                exchange_rate = EXCLUDED.exchange_rate, base_amount = EXCLUDED.base_amount, payment_method = EXCLUDED.payment_method,
                account_id = EXCLUDED.account_id, date = EXCLUDED.date, notes = EXCLUDED.notes,
                party_name = EXCLUDED.party_name, target_account_id = EXCLUDED.target_account_id,
                order_id = COALESCE(EXCLUDED.order_id, payments.order_id),
                reference_no = COALESCE(EXCLUDED.reference_no, payments.reference_no)
            RETURNING *, payment_no as voucher_no, payment_type as voucher_type;
        """
        cur.execute(query, (pay_id, pay_no, cust_id, supp_id, p_type, amt, curr, rate, base_amt, pay_method, resolved_cash_acc, p_date, notes, party_val, resolved_target_acc, resolved_order_id, order_ref or None))
        res = dict(cur.fetchone())

        if amt > 0:
            if p_type == 'Receipt' and cust_id:
                cur.execute("UPDATE customers SET current_balance = current_balance - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, cust_id))
            elif p_type == 'Payment' and supp_id:
                cur.execute("UPDATE suppliers SET current_balance = current_balance - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, supp_id))

        if amt > 0:
            auto_jv_no = f"AUTO-VCH-{pay_no}"
            deb_acc = resolved_cash_acc if p_type == 'Receipt' else resolved_target_acc
            crd_acc = resolved_target_acc if p_type == 'Receipt' else resolved_cash_acc

            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Payment', %s, %s, %s, 'Posted', %s)
                ON CONFLICT (entry_no) DO UPDATE SET
                    amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount,
                    debit_account_id = EXCLUDED.debit_account_id, credit_account_id = EXCLUDED.credit_account_id,
                    currency = EXCLUDED.currency, exchange_rate = EXCLUDED.exchange_rate, description = EXCLUDED.description, notes = EXCLUDED.notes;
            """, (f"JV-{pay_id}", auto_jv_no, p_date, f"{v_type} رقم {pay_no}: {party_val or 'طرف عام'}", deb_acc, crd_acc, amt, amt, base_amt, pay_id, curr, rate, f"سند {pay_no} - {party_val or 'طرف عام'}"))

            cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
            actual_entry_id = cur.fetchone()['id']
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (actual_entry_id,))
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);",
                        (generate_id("JVL"), actual_entry_id, deb_acc, f"مدين - {v_type} {pay_no} ({party_val or 'طرف عام'})", amt, base_amt))
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);",
                        (generate_id("JVL"), actual_entry_id, crd_acc, f"دائن - {v_type} {pay_no} ({party_val or 'طرف عام'})", amt, base_amt))

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        return res


def delete_voucher(payload):
    """حذف أو إلغاء السند المالي وعكس الأثر المحاسبي والقيود المقترنة"""
    data = payload.get('data') or payload
    v_id = clean_str(data.get('id') or data.get('voucher_no') or data.get('payment_no') or data.get('v_no'))
    if not v_id: return {"error": "Missing voucher id"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id, payment_no, amount, base_amount, payment_type, customer_id, supplier_id, account_id, target_account_id FROM payments WHERE id = %s OR payment_no = %s LIMIT 1;", (v_id, v_id))
        v_row = cur.fetchone()
        if not v_row: return {"deleted": v_id, "status": "not_found"}

        actual_id = v_row['id']
        pay_no = v_row['payment_no']
        amt = clean_num(v_row.get('amount') or 0.0)
        base_amt = clean_num(v_row.get('base_amount') or amt)
        p_type = v_row.get('payment_type')
        cust_id = v_row.get('customer_id')
        supp_id = v_row.get('supplier_id')

        if amt > 0:
            if p_type == 'Receipt' and cust_id:
                cur.execute("UPDATE customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, cust_id))
            elif p_type == 'Payment' and supp_id:
                cur.execute("UPDATE suppliers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, supp_id))

        cur.execute("""
            SELECT id FROM journal_entries
            WHERE (ref_type = 'Payment' AND ref_id = %s) OR entry_no IN (%s, %s, %s, %s);
        """, (actual_id, f"AUTO-VCH-{pay_no}", f"JV-{actual_id}", f"AUTO-VCH-{actual_id}", f"JV-{pay_no}"))
        jv_rows = cur.fetchall()
        if jv_rows:
            jv_ids = [j['id'] for j in jv_rows]
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = ANY(%s);", (jv_ids,))
            cur.execute("DELETE FROM journal_entries WHERE id = ANY(%s);", (jv_ids,))

        cur.execute("DELETE FROM payments WHERE id = %s;", (actual_id,))
        return {"deleted": actual_id, "payment_no": pay_no, "status": "success"}
