# services/pg/pg_expenses.py
# Operating and general expenses, automated disbursement vouchers, and balanced journal entries

from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str, execute_query
from .account_resolver import resolve_exchange_rate, resolve_account_id


def get_expenses(params=None):
    """استرجاع المصروفات التشغيلية والعمومية وتصنيفاتها"""
    query = """
        SELECT id, expense_no, category, amount, currency, exchange_rate,
               base_amount, date as expense_date, payment_method, recipient,
               account_id, status, notes, created_at
        FROM expenses
        ORDER BY created_at DESC;
    """
    rows = execute_query(query, fetch_all=True) or []
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('expense_date'): r['expense_date'] = str(r['expense_date'])
    return rows


def add_expense(payload):
    """تسجيل مصروف تشغيلي مع سند صرف مالي وقيد محاسبي مزدوج متوازن"""
    data = payload.get('data') or payload
    exp_id = clean_str(data.get('id') or data.get('expense_id')) or generate_id("EXP")
    exp_no = clean_str(data.get('expense_no')) or exp_id
    cat = clean_str(data.get('category') or data.get('exp_category') or 'مصروفات تشغيلية')
    amt = clean_num(data.get('amount') or 0.0)
    curr = clean_str(data.get('currency') or 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    base_amt = clean_num(data.get('base_amount') or (amt * rate))
    exp_date = clean_str(data.get('date') or data.get('expense_date')) or today_str()
    pay_method = clean_str(data.get('payment_method') or data.get('pay_method') or 'نقد (كاش)')
    recipient = clean_str(data.get('recipient') or '')
    raw_acc = data.get('account_id') or data.get('account') or data.get('exp_account') or 'ACC-505'
    source_acc_input = data.get('payment_account_id') or data.get('cash_account_id') or data.get('source_account') or 'ACC-101'
    notes = clean_str(data.get('notes') or '')

    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, rate)
        if curr != 'YER' and (base_amt <= 0 or base_amt == amt):
            base_amt = amt * rate

        acc_id = resolve_account_id(cur, raw_acc, 'ACC-505')
        source_acc = resolve_account_id(cur, source_acc_input, 'ACC-101')

        query = """
            INSERT INTO expenses (
                id, expense_no, category, amount, currency, exchange_rate,
                base_amount, date, payment_method, recipient, account_id, status, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Paid', %s)
            ON CONFLICT (id) DO UPDATE SET
                expense_no = EXCLUDED.expense_no, category = EXCLUDED.category, amount = EXCLUDED.amount,
                currency = EXCLUDED.currency, exchange_rate = EXCLUDED.exchange_rate, base_amount = EXCLUDED.base_amount,
                date = EXCLUDED.date, payment_method = EXCLUDED.payment_method, recipient = EXCLUDED.recipient,
                account_id = EXCLUDED.account_id, notes = EXCLUDED.notes
            RETURNING *;
        """
        cur.execute(query, (exp_id, exp_no, cat, amt, curr, rate, base_amt, exp_date, pay_method, recipient, acc_id, notes))
        res = dict(cur.fetchone())

        pay_id, pay_no = f"PAY-{exp_id}", f"PV-{exp_no}"
        cur.execute("""
            INSERT INTO payments (
                id, payment_no, payment_type, amount, currency, exchange_rate,
                base_amount, payment_method, reference_no, account_id, date, status, notes, party_name, target_account_id
            ) VALUES (%s, %s, 'Payment', %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                payment_no = EXCLUDED.payment_no, amount = EXCLUDED.amount, currency = EXCLUDED.currency,
                exchange_rate = EXCLUDED.exchange_rate, base_amount = EXCLUDED.base_amount, payment_method = EXCLUDED.payment_method,
                account_id = EXCLUDED.account_id, date = EXCLUDED.date, notes = EXCLUDED.notes, party_name = EXCLUDED.party_name;
        """, (pay_id, pay_no, amt, curr, rate, base_amt, pay_method, exp_id, source_acc, exp_date, f"سند صرف مصروف {exp_no}: {cat}", recipient or cat, acc_id))

        if amt > 0:
            auto_jv_no = f"JV-{exp_no}"
            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Expense', %s, %s, %s, 'Posted', %s)
                ON CONFLICT (entry_no) DO UPDATE SET
                    amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount,
                    debit_account_id = EXCLUDED.debit_account_id, credit_account_id = EXCLUDED.credit_account_id,
                    currency = EXCLUDED.currency, exchange_rate = EXCLUDED.exchange_rate, description = EXCLUDED.description, notes = EXCLUDED.notes;
            """, (f"JV-{exp_id}", auto_jv_no, exp_date, f"مصروف {cat} - {recipient or exp_no}", acc_id, source_acc, amt, amt, base_amt, exp_id, curr, rate, f"ترحيل مصروف {exp_no}"))

            cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
            act_entry_id = cur.fetchone()['id']
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (act_entry_id,))
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);",
                        (generate_id("JVL"), act_entry_id, acc_id, f"مدين: حساب المصروف ({cat})", amt, base_amt))
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);",
                        (generate_id("JVL"), act_entry_id, source_acc, f"دائن: سداد المصروف من {source_acc}", amt, base_amt))

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        return res


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
        cur.execute("""
            SELECT id FROM journal_entries
            WHERE (ref_type = 'Expense' AND ref_id = %s) OR entry_no IN (%s, %s, %s, %s);
        """, (actual_id, f"JV-{exp_no}", f"JV-{actual_id}", f"AUTO-EXP-{exp_no}", f"AUTO-EXP-{actual_id}"))
        jv_rows = cur.fetchall()
        if jv_rows:
            jv_ids = [j['id'] for j in jv_rows]
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = ANY(%s);", (jv_ids,))
            cur.execute("DELETE FROM journal_entries WHERE id = ANY(%s);", (jv_ids,))

        cur.execute("DELETE FROM payments WHERE id = %s OR reference_no = %s OR payment_no = %s;", (f"PAY-{actual_id}", actual_id, f"PV-{exp_no}"))
        cur.execute("DELETE FROM expenses WHERE id = %s;", (actual_id,))
        return {"deleted": actual_id, "expense_no": exp_no, "status": "success"}
