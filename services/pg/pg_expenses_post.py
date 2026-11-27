# services/pg/pg_expenses_post.py
# Double-entry ledger posting and payment voucher issuing for operating expenses
# Architectural Standards: Strictly < 220 lines per file

from .db_pool import clean_str, clean_num, generate_id, today_str
from .account_resolver import resolve_account_id, resolve_cash_account_by_currency, resolve_exchange_rate
from .pg_audit import log_audit_event
from .pg_delivery_cogs import cascade_account_balances, refresh_chart_balances_atomic
from .journal_lines_helper import insert_sorted_journal_lines
from services.security import assert_period_open


def post_expense_to_ledger(cur, exp_data, user_id=None):
    """ترحيل القيد المزدوج المتزن وسند الصرف وتحديث الأرصدة ذرياً مع قفل الفترة"""
    exp_id = clean_str(exp_data.get('id'))
    exp_no = clean_str(exp_data.get('expense_no') or exp_id)

    # 1. انعدام الثقة بالواجهة: قفل السجل في القاعدة وجلب الأرقام الحقيقية المؤكدة
    db_exp = None
    if exp_id or exp_no:
        cur.execute("SELECT * FROM expenses WHERE id = %s OR expense_no = %s LIMIT 1 FOR UPDATE;", (exp_id or '', exp_no or ''))
        db_exp = cur.fetchone()

    source_data = dict(db_exp) if db_exp else exp_data
    exp_id = source_data.get('id') or exp_id
    exp_no = source_data.get('expense_no') or exp_no or exp_id

    cat = clean_str(source_data.get('category') or 'مصروفات تشغيلية')
    subtotal = clean_num(source_data.get('subtotal_amount') or source_data.get('amount') or 0.0)
    net_amt = clean_num(source_data.get('net_amount') or 0.0)
    amt = net_amt if net_amt > 0 else subtotal
    if amt <= 0:
        raise ValueError(f"مبلغ المصروف {exp_no} غير صالح للترحيل (المبلغ يجب أن يكون أكبر من صفر)")

    c_raw = clean_str(source_data.get('currency') or 'YER').upper()
    curr = 'SAR' if 'SAR' in c_raw else ('USD' if 'USD' in c_raw else 'YER')
    rate = resolve_exchange_rate(cur, curr, clean_num(source_data.get('exchange_rate') or 1.0))
    base_amt = clean_num(source_data.get('base_amount') or (amt * rate))
    if curr != 'YER' and (base_amt <= 0 or base_amt == amt):
        base_amt = amt * rate

    exp_date = clean_str(source_data.get('date') or source_data.get('expense_date')) or today_str()

    # 2. حارس قفل الفترة المحاسبية (Dynamic Period Lock Shield)
    assert_period_open(cur, exp_date)

    pay_method = clean_str(source_data.get('payment_method') or 'نقد (كاش)')
    beneficiary = clean_str(source_data.get('beneficiary') or source_data.get('recipient') or cat)
    cost_center = clean_str(source_data.get('cost_center') or 'مشغل التفصيل والخياطة')
    ref_no = clean_str(source_data.get('reference_no') or '')

    exp_in = source_data.get('account_id')
    if exp_in and any(s in str(exp_in) for s in ['101', 'صندوق', 'خزينة', 'بنك']):
        exp_in = cat
    acc_id = resolve_account_id(cur, exp_in or cat)
    if not acc_id:
        cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_category ILIKE 'Expenses' OR account_code LIKE '5%') ORDER BY level DESC, account_code ASC LIMIT 1;")
        r_acc = cur.fetchone()
        acc_id = r_acc['id'] if r_acc else None

    src_in = source_data.get('source_account_id') or source_data.get('payment_source') or source_data.get('source_acc')
    source_acc = resolve_account_id(cur, src_in, currency=curr) or resolve_cash_account_by_currency(cur, curr)

    # 3. إصدار سند الصرف في payments
    pay_id, pay_no = f"PAY-{exp_id}", f"PV-{exp_no}"
    v_notes = f"سند صرف مصروف {exp_no}: {cat} • {cost_center}" + (f" (مرجع: {ref_no})" if ref_no else "")
    cur.execute("""
        INSERT INTO payments (id, payment_no, payment_type, amount, currency, exchange_rate,
            base_amount, payment_method, reference_no, account_id, date, status, notes, party_name, target_account_id, created_by)
        VALUES (%s, %s, 'Payment', %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET account_id = EXCLUDED.account_id, target_account_id = EXCLUDED.target_account_id,
            amount = EXCLUDED.amount, base_amount = EXCLUDED.base_amount, status = 'Confirmed';
    """, (pay_id, pay_no, amt, curr, rate, base_amt, pay_method, ref_no or exp_id, source_acc, exp_date, v_notes, beneficiary, acc_id, user_id))

    # 4. التحقق من القيد اليومي ومنع كسر درع الحصانة (Shield 2 Immutability)
    auto_jv_no = f"JV-{exp_no}"
    cur.execute("SELECT id, status FROM journal_entries WHERE entry_no = %s OR id = %s LIMIT 1;", (auto_jv_no, f"JV-{exp_id}"))
    existing_jv = cur.fetchone()

    if not existing_jv:
        cur.execute("""
            INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Expense', %s, %s, %s, 'Posted', %s, %s);
        """, (f"JV-{exp_id}", auto_jv_no, exp_date, f"قيد مصروف {exp_no}: {cat} ({beneficiary})", acc_id, source_acc, amt, amt, base_amt, exp_id, curr, rate, v_notes, user_id))

        cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
        act_jv = cur.fetchone()['id']

        insert_sorted_journal_lines(cur, act_jv, [
            (acc_id, f"مدين - مصروف {cat} ({beneficiary})", amt, 0.0, base_amt, 0.0),
            (source_acc, f"دائن - سداد مصروف {exp_no} من الخزينة", 0.0, amt, 0.0, base_amt),
        ])

    # 5. تحديث الحالات والأرصدة التجميعية ذرياً (Cascade Balances)
    cur.execute("UPDATE expenses SET status = 'posted', approved_at = CURRENT_TIMESTAMP WHERE id = %s;", (exp_id,))
    cur.execute("UPDATE expense_transactions SET status = 'posted', approved_at = CURRENT_TIMESTAMP WHERE id = %s;", (exp_id,))

    refresh_chart_balances_atomic(cur)
    cascade_account_balances(cur)

    return {"status": "posted", "voucher_no": pay_no, "entry_no": auto_jv_no, "message": f"تم ترحيل المصروف {exp_no} وسند الصرف {pay_no} بنجاح ⚖️"}
