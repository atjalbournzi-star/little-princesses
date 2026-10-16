# services/pg/pg_expenses.py
# Operating expenses, dual-state approvals (draft/posted), and atomic ledger posting

from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str, execute_query
from .account_resolver import resolve_exchange_rate, resolve_account_id


def get_expenses(params=None):
    """استرجاع المصروفات التشغيلية مع حسابات الخصم والضريبة وحالة الاعتماد"""
    query = """
        SELECT id, expense_no, category, amount, currency, exchange_rate, base_amount,
               date as expense_date, payment_method, recipient, beneficiary, cost_center,
               cost_center_id, reference_no, attachment_url, branch_id, tenant_id, account_id,
               source_account_id, status, notes, subtotal_amount, tax_amount, discount_amount,
               net_amount, approved_by, approved_at, created_at
        FROM expenses ORDER BY created_at DESC;
    """
    rows = execute_query(query, fetch_all=True) or []
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        d = str(r.get('expense_date') or '')
        r['expense_date'], r['date'] = d, d
        if r.get('approved_at'): r['approved_at'] = str(r['approved_at'])
        r['subtotal_amount'] = float(r.get('subtotal_amount') or r.get('amount') or 0.0)
        r['discount_amount'] = float(r.get('discount_amount') or 0.0)
        r['tax_amount'] = float(r.get('tax_amount') or 0.0)
        r['net_amount'] = float(r.get('net_amount') or r.get('amount') or 0.0)
        r['status'] = 'posted' if r.get('status') == 'Paid' else (r.get('status') or 'draft')
        r['exp_category'] = r.get('category') or 'مصروف تشغيلي'
        r['payment_source'] = r.get('source_account_id') or r.get('account_id') or '101.1'
    return rows


def _post_expense_to_ledger(cur, exp_data, user_id=None):
    """ترحيل القيد المزدوج المتزن وسند الصرف وتحديث الأرصدة ذرياً"""
    exp_id = exp_data['id']
    exp_no = exp_data.get('expense_no') or exp_id
    cat = clean_str(exp_data.get('category') or exp_data.get('exp_category') or 'مصروفات تشغيلية')
    subtotal = clean_num(exp_data.get('subtotal_amount') or exp_data.get('amount') or 0.0)
    discount, tax = clean_num(exp_data.get('discount_amount') or 0.0), clean_num(exp_data.get('tax_amount') or 0.0)
    amt = net_amt if net_amt > 0 else subtotal
    c_raw = clean_str(exp_data.get('currency') or 'YER').upper()
    curr = 'SAR' if 'SAR' in c_raw else ('USD' if 'USD' in c_raw else 'YER')
    rate = clean_num(exp_data.get('exchange_rate') or 1.0)
    base_amt = clean_num(exp_data.get('base_amount') or (amt * rate))
    exp_date = clean_str(exp_data.get('date') or exp_data.get('expense_date')) or today_str()
    pay_method = clean_str(exp_data.get('payment_method') or 'نقد (كاش)')
    beneficiary = clean_str(exp_data.get('beneficiary') or exp_data.get('recipient') or cat)
    cost_center = clean_str(exp_data.get('cost_center') or 'مشغل التفصيل والخياطة')
    ref_no = clean_str(exp_data.get('reference_no') or '')

    # تحديد حساب المصروف وحساب الخزينة بدقة
    exp_in = exp_data.get('account_id')
    if exp_in and any(s in str(exp_in) for s in ['101', 'صندوق', 'خزينة', 'بنك']): exp_in = cat
    acc_id = resolve_account_id(cur, exp_in or cat, 'ACC-503')
    src_in = exp_data.get('source_account_id') or exp_data.get('payment_source') or exp_data.get('source_acc')
    if not src_in or any(s in str(src_in) for s in ['501', '502', '503', '504', '505', 'مصروف']): src_in = 'ACC-101-1'
    source_acc = resolve_account_id(cur, src_in, 'ACC-101-1', currency=curr)

    # 1. إصدار سند الصرف في payments
    pay_id, pay_no = f"PAY-{exp_id}", f"PV-{exp_no}"
    v_notes = f"سند صرف مصروف {exp_no}: {cat} • {cost_center}" + (f" (مرجع: {ref_no})" if ref_no else "")
    cur.execute("""
        INSERT INTO payments (id, payment_no, payment_type, amount, currency, exchange_rate,
            base_amount, payment_method, reference_no, account_id, date, status, notes, party_name, target_account_id)
        VALUES (%s, %s, 'Payment', %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET account_id = EXCLUDED.account_id, target_account_id = EXCLUDED.target_account_id,
            amount = EXCLUDED.amount, base_amount = EXCLUDED.base_amount, status = 'Confirmed';
    """, (pay_id, pay_no, amt, curr, rate, base_amt, pay_method, ref_no or exp_id, source_acc, exp_date, v_notes, beneficiary, acc_id))

    # 2. إنشاء القيد اليومي المتزن وسطور دفتر الأستاذ
    auto_jv_no = f"JV-{exp_no}"
    cur.execute("""
        INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Expense', %s, %s, %s, 'Posted', %s)
        ON CONFLICT (entry_no) DO UPDATE SET debit_account_id = EXCLUDED.debit_account_id, credit_account_id = EXCLUDED.credit_account_id,
            amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount, status = 'Posted';
    """, (f"JV-{exp_id}", auto_jv_no, exp_date, f"مصروف {cat} - {cost_center} - {beneficiary}", acc_id, source_acc, amt, amt, base_amt, exp_id, curr, rate, f"ترحيل مصروف {exp_no}"))

    cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
    act_entry_id = cur.fetchone()['id']
    cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (act_entry_id,))
    cur.execute("""
        INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
        VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0), (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
    """, (generate_id("JVL"), act_entry_id, acc_id, f"مدين: حساب المصروف ({cat}) • {cost_center}", amt, base_amt,
          generate_id("JVL"), act_entry_id, source_acc, f"دائن: سداد المصروف من {source_acc}", amt, base_amt))

    # 3. تحديث حالة المصروف إلى معتمد ومرحل (تحديث الأرصدة يتم آلياً عبر trg_journal_line_balance)

    app_at = today_str()
    uid = None
    if user_id and len(str(user_id)) >= 32:
        try:
            import uuid as _u; uid = str(_u.UUID(str(user_id).strip()))
        except Exception: uid = None
    cur.execute("UPDATE expenses SET status = 'posted', approved_at = %s, approved_by = %s, account_id = %s, source_account_id = %s WHERE id = %s;", (app_at, uid, acc_id, source_acc, exp_id))
    cur.execute("UPDATE expense_transactions SET status = 'posted', approved_at = %s, approved_by = %s, account_id = %s, source_account_id = %s WHERE id = %s;", (app_at, uid, acc_id, source_acc, exp_id))

    voucher_dict = {'id': pay_id, 'payment_no': pay_no, 'voucher_no': pay_no, 'v_no': pay_no, 'payment_type': 'Payment', 'voucher_type': 'سند صرف', 'v_type': 'سند صرف', 'amount': amt, 'currency': curr, 'exchange_rate': rate, 'base_amount': base_amt, 'payment_method': pay_method, 'pay_method': pay_method, 'account_id': source_acc, 'target_account_id': acc_id, 'target_acc': acc_id, 'party_name': beneficiary, 'party': beneficiary, 'notes': v_notes, 'date_created': exp_date, 'date': exp_date, 'status': 'Confirmed'}
    jv_dict = {'id': f"JV-{exp_id}", 'entry_no': auto_jv_no, 'entry_date': exp_date, 'date': exp_date, 'description': f"مصروف {cat} - {cost_center} - {beneficiary}", 'debit_account_id': acc_id, 'credit_account_id': source_acc, 'debit': acc_id, 'credit': source_acc, 'amount': amt, 'total_amount': amt, 'base_amount': base_amt, 'currency': curr, 'exchange_rate': rate, 'status': 'Posted', 'notes': f"ترحيل مصروف {exp_no}"}
    return {'success': True, 'expense_id': exp_id, 'expense_no': exp_no, 'voucher': voucher_dict, 'journal_entry': jv_dict, 'debit_account': acc_id, 'credit_account': source_acc, 'message': 'تم اعتماد وترحيل المصروف إلى السندات وشجرة الحسابات والدفاتر بنجاح 💸'}


def add_expense(payload):
    """تسجيل مصروف تشغيلي بحالة مسودة (draft) أو مرحل ومعتمد (posted)"""
    data = payload.get('data') or payload
    exp_id = clean_str(data.get('id') or data.get('expense_id')) or generate_id("EXP")
    exp_no = clean_str(data.get('expense_no')) or exp_id
    cat = clean_str(data.get('category') or data.get('exp_category') or 'مصروفات تشغيلية')
    subtotal = clean_num(data.get('subtotal_amount') or data.get('subtotal') or data.get('amount') or 0.0)
    discount, tax = clean_num(data.get('discount_amount') or 0.0), clean_num(data.get('tax_amount') or 0.0)
    amt = net_amt if net_amt > 0 else subtotal
    c_raw = clean_str(data.get('currency') or 'YER').upper()
    curr = 'SAR' if 'SAR' in c_raw else ('USD' if 'USD' in c_raw else 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    base_amt = clean_num(data.get('base_amount') or (amt * rate))
    exp_date = clean_str(data.get('date') or data.get('expense_date')) or today_str()
    pay_method = clean_str(data.get('payment_method') or data.get('pay_method') or 'نقد (كاش)')
    beneficiary = clean_str(data.get('beneficiary') or data.get('recipient') or cat)
    cost_center = clean_str(data.get('cost_center') or 'مشغل التفصيل والخياطة')
    cost_center_id = clean_str(data.get('cost_center_id') or 'CC-01')
    ref_no, att_url = clean_str(data.get('reference_no') or data.get('invoice_no') or ''), clean_str(data.get('attachment_url') or data.get('receipt_b64') or '')
    branch_id, tenant_id = clean_str(data.get('branch_id') or 'BR-01'), clean_str(data.get('tenant_id') or 'TENANT-01')
    status = clean_str(data.get('status') or 'posted')
    if status not in ('draft', 'posted', 'rejected'): status = 'posted'
    raw_acc = data.get('account_id') or data.get('account') or data.get('exp_account') or cat
    source_acc_input = data.get('source_account_id') or data.get('payment_source') or data.get('source_acc') or 'ACC-101-1'
    notes = clean_str(data.get('notes') or '')

    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, rate)
        if curr != 'YER' and (base_amt <= 0 or base_amt == amt): base_amt = amt * rate
        acc_id = resolve_account_id(cur, raw_acc, 'ACC-503')
        source_acc = resolve_account_id(cur, source_acc_input, 'ACC-101-1', currency=curr)

        query = """
            INSERT INTO expenses (id, expense_no, category, amount, currency, exchange_rate, base_amount,
                date, payment_method, recipient, beneficiary, cost_center, cost_center_id, reference_no,
                attachment_url, branch_id, tenant_id, account_id, source_account_id, status, notes,
                subtotal_amount, tax_amount, discount_amount, net_amount, approved_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET expense_no = EXCLUDED.expense_no, category = EXCLUDED.category, amount = EXCLUDED.amount,
                currency = EXCLUDED.currency, exchange_rate = EXCLUDED.exchange_rate, base_amount = EXCLUDED.base_amount,
                date = EXCLUDED.date, payment_method = EXCLUDED.payment_method, recipient = EXCLUDED.recipient,
                beneficiary = EXCLUDED.beneficiary, cost_center = EXCLUDED.cost_center, cost_center_id = EXCLUDED.cost_center_id,
                reference_no = EXCLUDED.reference_no, attachment_url = EXCLUDED.attachment_url, account_id = EXCLUDED.account_id,
                source_account_id = EXCLUDED.source_account_id, status = EXCLUDED.status, notes = EXCLUDED.notes,
                subtotal_amount = EXCLUDED.subtotal_amount, tax_amount = EXCLUDED.tax_amount,
                discount_amount = EXCLUDED.discount_amount, net_amount = EXCLUDED.net_amount, approved_at = EXCLUDED.approved_at
            RETURNING *;
        """
        app_at = today_str() if status == 'posted' else None
        cur.execute(query, (exp_id, exp_no, cat, amt, curr, rate, base_amt, exp_date, pay_method, beneficiary, beneficiary, cost_center, cost_center_id, ref_no, att_url, branch_id, tenant_id, acc_id, source_acc, status, notes, subtotal, tax, discount, net_amt, app_at))
        res = dict(cur.fetchone())

        cur.execute("""
            INSERT INTO expense_transactions (id, expense_no, tenant_id, branch_id, cost_center_id, cost_center,
                account_id, source_account_id, category, payment_method, beneficiary, reference_no, attachment_url,
                notes, subtotal_amount, tax_amount, discount_amount, net_amount, amount, currency, exchange_rate,
                base_amount, status, approved_at, date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, net_amount = EXCLUDED.net_amount,
                subtotal_amount = EXCLUDED.subtotal_amount, notes = EXCLUDED.notes;
        """, (exp_id, exp_no, tenant_id, branch_id, cost_center_id, cost_center, acc_id, source_acc, cat, pay_method, beneficiary, ref_no, att_url, notes, subtotal, tax, discount, net_amt, amt, curr, rate, base_amt, status, app_at, exp_date))

        if status == 'draft':
            res['status'] = 'draft'
            res['message'] = 'تم حفظ المصروف كمسودة بنجاح 📝'
            return res

        post_res = _post_expense_to_ledger(cur, res)
        res.update(post_res)
        return res


def approve_expense_atomic(payload):
    """اعتماد مسودة المصروف وترحيلها ذرياً إلى دفتر الأستاذ وسندات الصرف"""
    data = payload.get('data') or payload
    e_id = clean_str(data.get('id') or data.get('expense_id') or data.get('expense_no'))
    user_id = data.get('approved_by') or data.get('user_id') or 'Admin'
    if not e_id: return {"success": False, "message": "معرف المصروف مفقود"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT * FROM expenses WHERE id = %s OR expense_no = %s LIMIT 1;", (e_id, e_id))
        exp_row = cur.fetchone()
        if not exp_row:
            cur.execute("SELECT * FROM expense_transactions WHERE id = %s OR expense_no = %s LIMIT 1;", (e_id, e_id))
            exp_row = cur.fetchone()
        if not exp_row:
            exp_row = dict(data)
            exp_row['id'] = e_id

        if exp_row.get('status') == 'posted' and not data.get('force'):
            return {"success": True, "message": "المصروف مرحل ومعتمد بالفعل ✅", "expense_id": e_id}

        return _post_expense_to_ledger(cur, exp_row, user_id)


def delete_expense(payload):
    """حذف المصروف وإلغاء سند الصرف والقيد المحاسبي المرتبط"""
    data = payload.get('data') or payload
    e_id = clean_str(data.get('id') or data.get('expense_no') or data.get('expense_id'))
    if not e_id: return {"error": "Missing expense identifier"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id, expense_no FROM expenses WHERE id = %s OR expense_no = %s LIMIT 1;", (e_id, e_id))
        exp_row = cur.fetchone()
        if not exp_row: return {"deleted": e_id, "status": "not_found"}

        actual_id, exp_no = exp_row['id'], exp_row['expense_no']
        cur.execute("SELECT id FROM journal_entries WHERE (ref_type = 'Expense' AND ref_id = %s) OR entry_no IN (%s, %s, %s, %s);", (actual_id, f"JV-{exp_no}", f"JV-{actual_id}", f"AUTO-EXP-{exp_no}", f"AUTO-EXP-{actual_id}"))
        jv_ids = [j['id'] for j in (cur.fetchall() or [])]
        if jv_ids:
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = ANY(%s); DELETE FROM journal_entries WHERE id = ANY(%s);", (jv_ids, jv_ids))

        cur.execute("DELETE FROM payments WHERE id = %s OR reference_no = %s OR payment_no = %s;", (f"PAY-{actual_id}", actual_id, f"PV-{exp_no}"))
        cur.execute("DELETE FROM expenses WHERE id = %s; DELETE FROM expense_transactions WHERE id = %s;", (actual_id, actual_id))
        return {"deleted": actual_id, "expense_no": exp_no, "status": "success"}