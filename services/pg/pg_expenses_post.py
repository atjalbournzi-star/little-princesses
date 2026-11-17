# services/pg/pg_expenses_post.py
# Double-entry ledger posting and payment voucher issuing for operating expenses

from .db_pool import clean_str, clean_num, generate_id, today_str
from .account_resolver import resolve_account_id, resolve_cash_account_by_currency
from .pg_audit import log_audit_event


def post_expense_to_ledger(cur, exp_data, user_id=None):
    """ترحيل القيد المزدوج المتزن وسند الصرف وتحديث الأرصدة ذرياً"""
    exp_id = exp_data['id']
    exp_no = exp_data.get('expense_no') or exp_id
    cat = clean_str(exp_data.get('category') or exp_data.get('exp_category') or 'مصروفات تشغيلية')
    subtotal = clean_num(exp_data.get('subtotal_amount') or exp_data.get('amount') or 0.0)
    discount, tax = clean_num(exp_data.get('discount_amount') or 0.0), clean_num(exp_data.get('tax_amount') or 0.0)
    net_amt = clean_num(exp_data.get('net_amount') or 0.0)
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

    exp_in = exp_data.get('account_id')
    if exp_in and any(s in str(exp_in) for s in ['101', 'صندوق', 'خزينة', 'بنك']): exp_in = cat
    acc_id = resolve_account_id(cur, exp_in or cat)
    if not acc_id:
        cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_category ILIKE 'Expenses' OR account_code LIKE '5%') ORDER BY level DESC, account_code ASC LIMIT 1;")
        r_acc = cur.fetchone()
        acc_id = r_acc['id'] if r_acc else None
    src_in = exp_data.get('source_account_id') or exp_data.get('payment_source') or exp_data.get('source_acc')
    source_acc = resolve_account_id(cur, src_in, currency=curr) or resolve_cash_account_by_currency(cur, curr)

    # 1. إصدار سند الصرف في payments
    pay_id, pay_no = f"PAY-{exp_id}", f"PV-{exp_no}"
    v_notes = f"سند صرف مصروف {exp_no}: {cat} • {cost_center}" + (f" (مرجع: {ref_no})" if ref_no else "")
    cur.execute("""
        INSERT INTO payments (id, payment_no, payment_type, amount, currency, exchange_rate,
            base_amount, payment_method, reference_no, account_id, date, status, notes, party_name, target_account_id, created_by)
        VALUES (%s, %s, 'Payment', %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET account_id = EXCLUDED.account_id, target_account_id = EXCLUDED.target_account_id,
            amount = EXCLUDED.amount, base_amount = EXCLUDED.base_amount, status = 'Confirmed';
    """, (pay_id, pay_no, amt, curr, rate, base_amt, pay_method, ref_no or exp_id, source_acc, exp_date, v_notes, beneficiary, acc_id, user_id))

    # 2. إنشاء القيد اليومي المتزن وسطور دفتر الأستاذ
    auto_jv_no = f"JV-{exp_no}"
    cur.execute("""
        INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Expense', %s, %s, %s, 'Posted', %s, %s)
        ON CONFLICT (entry_no) DO UPDATE SET amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount;
    """, (f"JV-{exp_id}", auto_jv_no, exp_date, f"قيد مصروف {exp_no}: {cat} ({beneficiary})", acc_id, source_acc, amt, amt, base_amt, exp_id, curr, rate, v_notes, user_id))

    cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
    act_jv = cur.fetchone()['id']
    cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (act_jv,))
    cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);",
                (generate_id("JVL"), act_jv, acc_id, f"مدين - مصروف {cat} ({beneficiary})", amt, base_amt))
    cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);",
                (generate_id("JVL"), act_jv, source_acc, f"دائن - سداد مصروف {exp_no} من الخزينة", amt, base_amt))

    cur.execute("UPDATE expenses SET status = 'posted', approved_at = CURRENT_TIMESTAMP WHERE id = %s;", (exp_id,))
    cur.execute("UPDATE expense_transactions SET status = 'posted', approved_at = CURRENT_TIMESTAMP WHERE id = %s;", (exp_id,))

    return {"status": "posted", "voucher_no": pay_no, "entry_no": auto_jv_no, "message": f"تم ترحيل المصروف {exp_no} وسند الصرف {pay_no} بنجاح ⚖️"}
