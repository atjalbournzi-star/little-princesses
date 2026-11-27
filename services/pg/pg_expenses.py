# services/pg/pg_expenses.py
# Operating expenses, dual-state approvals (draft/posted), and atomic sequence numbering

from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str, execute_query
from .account_resolver import resolve_exchange_rate, resolve_account_id, resolve_cash_account_by_currency
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, get_active_user_context
from .pg_expenses_post import post_expense_to_ledger
from services.security import assert_period_open


def get_expenses(params=None):
    """استرجاع المصروفات التشغيلية مع حسابات الخصم والضريبة وحالة الاعتماد"""
    query = """
        SELECT id, expense_no, category, amount, currency, exchange_rate, base_amount,
               date as expense_date, payment_method, recipient, beneficiary, cost_center,
               cost_center_id, reference_no,
               CASE WHEN attachment_url LIKE 'data:%%' OR LENGTH(COALESCE(attachment_url, '')) > 500 THEN '' ELSE attachment_url END AS attachment_url,
               (LENGTH(COALESCE(attachment_url, '')) > 500 OR attachment_url LIKE 'data:%%') AS has_attachment,
               branch_id, tenant_id, account_id,
               source_account_id, status, notes, subtotal_amount, tax_amount, discount_amount,
               net_amount, approved_by, approved_at, created_by, created_at
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
        r['payment_source'] = r.get('source_account_id') or r.get('account_id') or ''
        r['attachment_name'] = r.get('attachment_name') or (r.get('attachment_url') or '').split('/')[-1] if r.get('attachment_url') else ''
    return rows


def add_expense(payload):
    """تسجيل أو تعديل سند المصروف التشغيلي مع الترقيم التلقائي والترحيل المحاسبي"""
    data = payload.get('data') or payload
    raw_uid = clean_str(data.get('created_by') or data.get('user_id') or '')
    resolved_user = raw_uid or get_active_user_context()

    exp_id = clean_str(data.get('id') or data.get('expense_id'))
    exp_no = clean_str(data.get('expense_no'))
    cat = clean_str(data.get('category') or data.get('exp_category') or 'مصروفات تشغيلية')
    subtotal = clean_num(data.get('subtotal_amount') or data.get('subtotal') or data.get('amount') or 0.0)
    discount, tax = clean_num(data.get('discount_amount') or 0.0), clean_num(data.get('tax_amount') or 0.0)
    if subtotal < 0 or discount < 0 or tax < 0 or discount > subtotal:
        raise ValueError("مبالغ المصروف غير صالحة (يجب ألا تكون سالبة ولا يتجاوز الخصم الإجمالي)")
    net_amt = max(0.0, subtotal - discount + tax)
    amt = net_amt
    c_raw = clean_str(data.get('currency') or 'YER').upper()
    curr = 'SAR' if 'SAR' in c_raw else ('USD' if 'USD' in c_raw else 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    exp_date = clean_str(data.get('date') or data.get('expense_date')) or today_str()
    pay_method = clean_str(data.get('payment_method') or data.get('pay_method') or 'نقد (كاش)')
    beneficiary = clean_str(data.get('beneficiary') or data.get('recipient') or cat)
    cost_center = clean_str(data.get('cost_center') or 'مشغل التفصيل والخياطة')
    cost_center_id = clean_str(data.get('cost_center_id') or 'CC-01')
    att_name = clean_str(data.get('attachment_name') or '')
    ref_no = clean_str(data.get('reference_no') or data.get('invoice_no') or '')
    att_url = clean_str(data.get('attachment_url') or data.get('receipt_b64') or att_name)
    branch_id, tenant_id = clean_str(data.get('branch_id') or 'BR-01'), clean_str(data.get('tenant_id') or 'TENANT-01')
    status = clean_str(data.get('status') or 'draft')
    if status not in ('draft', 'posted', 'rejected'): status = 'draft'
    try:
        from flask import request, has_request_context
        if has_request_context():
            u_role = str((getattr(request, 'active_user', None) or {}).get('role') or '').lower()
            if u_role not in ('admin', 'accountant'): status = 'draft'
    except Exception: pass
    raw_acc = data.get('account_id') or data.get('account') or data.get('exp_account') or cat
    source_acc_input = data.get('source_account_id') or data.get('payment_source') or data.get('source_acc')
    notes = clean_str(data.get('notes') or '')
    if att_name and att_name not in notes: notes = f"{notes} [المرفق: {att_name}]".strip()

    with get_db_cursor(commit=True) as cur:
        assert_period_open(cur, exp_date)
        if resolved_user:
            cur.execute("SELECT id FROM users WHERE id = %s OR username = %s LIMIT 1;", (resolved_user, resolved_user))
            u_row = cur.fetchone()
            resolved_user = u_row['id'] if u_row else None
        rate = resolve_exchange_rate(cur, curr, rate)
        base_amt = amt * rate
        acc_id = resolve_account_id(cur, raw_acc)
        if not acc_id:
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_category ILIKE 'Expenses' OR account_code LIKE '5%') ORDER BY level DESC, account_code ASC LIMIT 1;")
            r_acc = cur.fetchone()
            acc_id = r_acc['id'] if r_acc else None
        source_acc = resolve_account_id(cur, source_acc_input, currency=curr) or resolve_cash_account_by_currency(cur, curr)

        existing_e = None
        if exp_id or (exp_no and not exp_no.startswith('EXP-NEW')):
            cur.execute("SELECT id, expense_no FROM expenses WHERE id = %s OR expense_no = %s LIMIT 1 FOR UPDATE;", (exp_id or '', exp_no or ''))
            existing_e = cur.fetchone()

        if existing_e:
            exp_id = existing_e['id']
            exp_no = existing_e.get('expense_no') or exp_no
        else:
            exp_no = get_next_sequence_number(cur, 'EXP', fallback_prefix='EXP-')
            exp_id = exp_no

        query = """
            INSERT INTO expenses (id, expense_no, category, amount, currency, exchange_rate, base_amount,
                date, payment_method, recipient, beneficiary, cost_center, cost_center_id, reference_no,
                attachment_url, branch_id, tenant_id, account_id, source_account_id, status, notes,
                subtotal_amount, tax_amount, discount_amount, net_amount, approved_at, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET expense_no = EXCLUDED.expense_no, category = EXCLUDED.category, amount = EXCLUDED.amount,
                currency = EXCLUDED.currency, exchange_rate = EXCLUDED.exchange_rate, base_amount = EXCLUDED.base_amount,
                date = EXCLUDED.date, payment_method = EXCLUDED.payment_method, recipient = EXCLUDED.recipient,
                beneficiary = EXCLUDED.beneficiary, cost_center = EXCLUDED.cost_center, cost_center_id = EXCLUDED.cost_center_id,
                reference_no = EXCLUDED.reference_no, attachment_url = EXCLUDED.attachment_url, account_id = EXCLUDED.account_id,
                source_account_id = EXCLUDED.source_account_id, status = EXCLUDED.status, notes = EXCLUDED.notes,
                subtotal_amount = EXCLUDED.subtotal_amount, tax_amount = EXCLUDED.tax_amount,
                discount_amount = EXCLUDED.discount_amount, net_amount = EXCLUDED.net_amount, approved_at = EXCLUDED.approved_at,
                created_by = COALESCE(expenses.created_by, EXCLUDED.created_by)
            RETURNING *;
        """
        app_at = today_str() if status == 'posted' else None
        cur.execute(query, (exp_id, exp_no, cat, amt, curr, rate, base_amt, exp_date, pay_method, beneficiary, beneficiary, cost_center, cost_center_id, ref_no, att_url, branch_id, tenant_id, acc_id, source_acc, status, notes, subtotal, tax, discount, net_amt, app_at, resolved_user))
        res = dict(cur.fetchone())

        cur.execute("""
            INSERT INTO expense_transactions (id, expense_no, tenant_id, branch_id, cost_center_id, cost_center,
                account_id, source_account_id, category, payment_method, beneficiary, reference_no, attachment_url,
                notes, subtotal_amount, tax_amount, discount_amount, net_amount, amount, currency, exchange_rate,
                base_amount, status, approved_at, date, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, net_amount = EXCLUDED.net_amount,
                subtotal_amount = EXCLUDED.subtotal_amount, notes = EXCLUDED.notes, created_by = COALESCE(expense_transactions.created_by, EXCLUDED.created_by);
        """, (exp_id, exp_no, tenant_id, branch_id, cost_center_id, cost_center, acc_id, source_acc, cat, pay_method, beneficiary, ref_no, att_url, notes, subtotal, tax, discount, net_amt, amt, curr, rate, base_amt, status, app_at, exp_date, resolved_user))

        log_audit_event(
            entity_type='expenses',
            entity_id=exp_id,
            action='UPDATE' if existing_e else 'INSERT',
            new_values={'expense_no': exp_no, 'category': cat, 'amount': amt, 'currency': curr},
            user_id=resolved_user,
            document_no=exp_no,
            details=f"سند مصروف تشغيلي {exp_no}: {cat} بمبلغ {amt} {curr}",
            cur=cur
        )

        res['expense_no'] = exp_no
        res['id'] = exp_id
        if status == 'draft':
            res['status'], res['message'] = 'draft', 'تم حفظ المصروف كمسودة بنجاح 📝'
            return res

        post_res = post_expense_to_ledger(cur, res, user_id=resolved_user)
        res.update(post_res)
        return res


def approve_expense_atomic(payload):
    """اعتماد مسودة المصروف وترحيلها ذرياً إلى دفتر الأستاذ وسندات الصرف"""
    data = payload.get('data') or payload
    exp_id = clean_str(data.get('id') or data.get('expense_id'))
    u_id = clean_str(data.get('user_id') or get_active_user_context())
    if not exp_id: return {"success": False, "error": "Missing expense ID"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT * FROM expenses WHERE id = %s LIMIT 1 FOR UPDATE;", (exp_id,))
        row = cur.fetchone()
        if not row: return {"success": False, "error": "المصروف غير موجود"}
        if row.get('status') == 'posted': return {"success": True, "message": "المصروف معتمد ومرحل بالفعل"}
        res = post_expense_to_ledger(cur, dict(row), user_id=u_id)
        log_audit_event('expenses', exp_id, 'APPROVE', user_id=u_id, document_no=row.get('expense_no'), details=f"اعتماد وترحيل مصروف {row.get('expense_no')}", cur=cur)
        return {"success": True, **res}


def delete_expense(payload):
    """إلغاء أو حذف المصروف التشغيلي ومزامنة الحركات المحاسبية"""
    data = payload.get('data') or payload
    target_id = clean_str(data.get('id') or data.get('expense_id') or data.get('expense_no'))
    u_id = get_active_user_context()
    if not target_id: return {"deleted": False, "error": "Missing id"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id, expense_no, status, date FROM expenses WHERE id = %s OR expense_no = %s LIMIT 1 FOR UPDATE;", (target_id, target_id))
        row = cur.fetchone()
        if not row: return {"deleted": False, "status": "not_found"}
        assert_period_open(cur, row.get('date'))
        actual_id, exp_no = row['id'], row['expense_no']
        if str(row.get('status') or '').lower() in ('posted', 'paid'):
            raise ValueError("مخالفة معايير المحاسبة (IFRS): لا يمكن حذف مصروف مرحّل نهائياً؛ يرجى إجراء قيد عكسي.")
        cur.execute("UPDATE expenses SET status = 'cancelled' WHERE id = %s;", (actual_id,))
        cur.execute("UPDATE expense_transactions SET status = 'cancelled' WHERE id = %s OR expense_no = %s;", (actual_id, exp_no))
        log_audit_event('expenses', actual_id, 'CANCEL', user_id=u_id, document_no=exp_no, details=f"إلغاء مسودة مصروف {exp_no}", cur=cur)

    return {"deleted": True, "cancelled": True, "id": actual_id, "success": True}
