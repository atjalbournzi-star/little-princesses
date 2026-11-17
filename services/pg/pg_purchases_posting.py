# services/pg/pg_purchases_posting.py
# Double-entry posting and payments documentation for purchase invoices

from .pg_sequences import get_next_sequence_number
from .db_pool import clean_str, clean_num


def post_purchase_journal(cur, pur_id, inv_no, inv_date, supp_id, supp_name, net_paid_orig, net_paid_yer, curr, rate, inv_acc, supp_acc, user_id):
    """ترحيل قيد استحقاق فاتورة المشتريات (مدين: المخزون / دائن: ذمم الموردين)"""
    if net_paid_orig <= 0 and net_paid_yer <= 0:
        return None
    jv_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
    cur.execute("""
        INSERT INTO journal_entries (
            id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency,
            exchange_rate, status, notes, created_by, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Purchase', %s, %s, %s, 'Posted', %s, %s, CURRENT_TIMESTAMP
        ) ON CONFLICT (entry_no) DO UPDATE SET
            amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount,
            base_amount = EXCLUDED.base_amount, credit_account_id = EXCLUDED.credit_account_id;
    """, (
        f"JV-{pur_id}", jv_no, inv_date, f"فاتورة توريد مشتريات خامات {inv_no} - {supp_name}",
        inv_acc, supp_acc, net_paid_orig, net_paid_orig, net_paid_yer, pur_id, curr, rate,
        f"توريد مشتريات {inv_no}", user_id
    ))
    cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (jv_no,))
    entry_row = cur.fetchone()
    entry_id = entry_row['id'] if entry_row else f"JV-{pur_id}"
    cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (entry_id,))
    cur.execute("""
        INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
        VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
    """, (f"JVL-{pur_id}-D", entry_id, inv_acc, f"مخزون الأقمشة والخامات - فاتورة {inv_no}", net_paid_orig, net_paid_yer))
    cur.execute("""
        INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
        VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
    """, (f"JVL-{pur_id}-C", entry_id, supp_acc, f"استحقاق فاتورة {inv_no} - {supp_name}", net_paid_orig, net_paid_yer))
    return jv_no


def post_purchase_payment(cur, pur_id, inv_no, inv_date, supp_id, supp_name, net_paid_orig, net_paid_yer, curr, rate, pay_method, cash_acc, supp_acc, transfer_no, user_id):
    """توثيق سند الصرف وقيد السداد النمطي (مدين: ذمم الموردين / دائن: الصندوق/البنك)"""
    if pay_method == 'آجل' or net_paid_orig <= 0:
        return None
    pay_no = get_next_sequence_number(cur, 'PV', fallback_prefix='PV-')
    cur.execute("""
        INSERT INTO payments (
            id, payment_no, invoice_id, supplier_id, payment_type, amount, currency,
            exchange_rate, base_amount, payment_method, reference_no, account_id,
            target_account_id, party_name, date, status, notes, created_by, created_at
        ) VALUES (
            %s, %s, %s, %s, 'Payment', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, CURRENT_TIMESTAMP
        ) ON CONFLICT (payment_no) DO UPDATE SET
            amount = EXCLUDED.amount, base_amount = EXCLUDED.base_amount,
            account_id = EXCLUDED.account_id, target_account_id = EXCLUDED.target_account_id,
            party_name = EXCLUDED.party_name;
    """, (
        f"PAY-{pur_id}", pay_no, pur_id, supp_id, net_paid_orig, curr, rate, net_paid_yer,
        pay_method, transfer_no, cash_acc, supp_acc, supp_name, inv_date,
        f"سداد فاتورة مشتريات {inv_no} - {supp_name}", user_id
    ))
    pay_jv_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
    cur.execute("""
        INSERT INTO journal_entries (
            id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency,
            exchange_rate, status, notes, created_by, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Payment', %s, %s, %s, 'Posted', %s, %s, CURRENT_TIMESTAMP
        ) ON CONFLICT (entry_no) DO UPDATE SET
            amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount,
            base_amount = EXCLUDED.base_amount, credit_account_id = EXCLUDED.credit_account_id;
    """, (
        f"JV-PAY-{pur_id}", pay_jv_no, inv_date, f"سند صرف سداد فاتورة مشتريات {inv_no}: {supp_name}",
        supp_acc, cash_acc, net_paid_orig, net_paid_orig, net_paid_yer, pur_id, curr, rate,
        f"سداد فاتورة {inv_no}", user_id
    ))
    cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (pay_jv_no,))
    pay_jv_row = cur.fetchone()
    pay_entry_id = pay_jv_row['id'] if pay_jv_row else f"JV-PAY-{pur_id}"
    cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (pay_entry_id,))
    cur.execute("""
        INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
        VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
    """, (f"JVL-PAY-{pur_id}-D", pay_entry_id, supp_acc, f"مدين - سداد فاتورة {inv_no} ({supp_name})", net_paid_orig, net_paid_yer))
    cur.execute("""
        INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
        VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
    """, (f"JVL-PAY-{pur_id}-C", pay_entry_id, cash_acc, f"دائن - سداد فاتورة {inv_no} ({supp_name})", net_paid_orig, net_paid_yer))
    return pay_no
