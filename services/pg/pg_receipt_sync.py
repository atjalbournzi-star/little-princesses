# services/pg/pg_receipt_sync.py
# Double-entry sync service for customer advance receipts (Liability Account 202)

from .db_pool import clean_str, clean_num, generate_id, today_str, logger


def sync_advance_receipt(cur, data):
    """مزامنة وترحيل قيد مزدوج لسند قبض العربون وتحديث رصيد حساب 202 والصندوق فورياً"""
    order_id = clean_str(data.get('order_id')) or None
    order_no = clean_str(data.get('order_no') or order_id or '')
    cust_id = clean_str(data.get('customer_id')) or None
    p_name = clean_str(data.get('party_name') or data.get('customer_name') or 'العميلة')
    amt = clean_num(data.get('amount') or data.get('deposit') or data.get('paid_amount') or 0.0)
    curr = clean_str(data.get('currency') or 'YER').replace('﷼', '').replace('$', '').strip() or 'YER'
    rate = clean_num(data.get('exchange_rate') or 1.0)
    base_amt = clean_num(data.get('base_amount') or (amt * rate))
    pay_m = clean_str(data.get('payment_method') or data.get('pay_method') or 'نقد (كاش)')
    p_date = clean_str(data.get('date') or data.get('order_date')) or today_str()
    notes = clean_str(data.get('notes') or f"سند قبض عربون مبيعات - العميلة {p_name}")

    cash_acc = clean_str(data.get('account_id') or data.get('cash_acc'))
    if not cash_acc:
        cash_acc = 'ACC-101-2' if 'SAR' in curr.upper() else ('ACC-101-3' if 'USD' in curr.upper() else 'ACC-101-1')
        if any(k in pay_m for k in ['كريمي', 'بنك', 'حوالة']): cash_acc = 'ACC-103'
    tgt_acc = 'ACC-202'

    custom_id = clean_str(data.get('id') or data.get('payment_id'))
    custom_no = clean_str(data.get('payment_no') or data.get('voucher_no'))

    ex_pay = None
    if custom_id or custom_no:
        cur.execute("SELECT * FROM payments WHERE (id = %s OR payment_no = %s) AND payment_type = 'Receipt' FOR UPDATE LIMIT 1;", (custom_id, custom_no))
        ex_pay = cur.fetchone()
    if not ex_pay and order_id:
        cur.execute("SELECT * FROM payments WHERE order_id = %s AND payment_type = 'Receipt' FOR UPDATE LIMIT 1;", (order_id,))
        ex_pay = cur.fetchone()
    if not ex_pay and cust_id and ('عربون' in notes or 'حجز' in notes):
        cur.execute("SELECT * FROM payments WHERE customer_id = %s AND payment_type = 'Receipt' AND (notes ILIKE '%%عربون%%' OR notes ILIKE '%%حجز%%') ORDER BY created_at DESC FOR UPDATE LIMIT 1;", (cust_id,))
        ex_pay = cur.fetchone()

    if amt <= 0:
        if ex_pay:
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE ref_id = %s);", (ex_pay['id'],))
            cur.execute("DELETE FROM journal_entries WHERE ref_id = %s;", (ex_pay['id'],))
            cur.execute("DELETE FROM payments WHERE id = %s;", (ex_pay['id'],))
        return None

    if ex_pay:
        pay_id = ex_pay['id']
        pay_no = ex_pay.get('payment_no') or custom_no or f"RV-{pay_id}"


        cur.execute("""
            UPDATE payments SET amount = %s, currency = %s, exchange_rate = %s, base_amount = %s,
                payment_method = %s, account_id = %s, target_account_id = %s, date = %s,
                notes = %s, party_name = %s, customer_id = COALESCE(%s, customer_id),
                order_id = COALESCE(%s, order_id), status = 'Confirmed'
            WHERE id = %s RETURNING *;
        """, (amt, curr, rate, base_amt, pay_m, cash_acc, tgt_acc, p_date, notes, p_name, cust_id, order_id, pay_id))
        res = dict(cur.fetchone())
    else:
        pay_id = custom_id or (f"PAY-{order_id}" if order_id else (f"PAY-{cust_id}" if cust_id else generate_id("PAY")))
        pay_no = custom_no or (f"REC-{order_no}" if order_no else (f"RV-{cust_id}" if cust_id else f"RV-{pay_id}"))
        cur.execute("""
            INSERT INTO payments (id, payment_no, customer_id, order_id, payment_type, amount, currency,
                exchange_rate, base_amount, payment_method, account_id, target_account_id, date, status, notes, party_name)
            VALUES (%s, %s, %s, %s, 'Receipt', %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s)
            ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, base_amount = EXCLUDED.base_amount, account_id = EXCLUDED.account_id,
                target_account_id = EXCLUDED.target_account_id, notes = EXCLUDED.notes, party_name = EXCLUDED.party_name
            RETURNING *;
        """, (pay_id, pay_no, cust_id, order_id, amt, curr, rate, base_amt, pay_m, cash_acc, tgt_acc, p_date, notes, p_name))
        res = dict(cur.fetchone())

    jv_no = f"AUTO-VCH-{pay_no}"
    cur.execute("""
        INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Receipt', %s, %s, %s, 'Posted', %s)
        ON CONFLICT (entry_no) DO UPDATE SET amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount,
            base_amount = EXCLUDED.base_amount, debit_account_id = EXCLUDED.debit_account_id,
            credit_account_id = EXCLUDED.credit_account_id, currency = EXCLUDED.currency, notes = EXCLUDED.notes;
    """, (f"JV-{pay_id}", jv_no, p_date, f"سند قبض عربون {pay_no}: {p_name}", cash_acc, tgt_acc, amt, amt, base_amt, pay_id, curr, rate, notes))

    cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (jv_no,))
    jv_row = cur.fetchone()
    jv_id = jv_row['id'] if jv_row else f"JV-{pay_id}"
    cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (jv_id,))
    cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);",
                (generate_id("JVL"), jv_id, cash_acc, f"مدين - عربون عميلة {p_name} ({pay_no})", amt, base_amt))
    cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);",
                (generate_id("JVL"), jv_id, tgt_acc, f"دائن - أمانات وعرابين فساتين ({p_name})", amt, base_amt))
    return res


def recalculate_advance_deposits(cur):
    """إعادة احتساب وتصحيح رصيد حساب 202 في شجرة الحسابات بناءً على كافة سندات العربون المسجلة"""
    cur.execute("""
        SELECT id, payment_no, customer_id, party_name, amount, currency, exchange_rate, base_amount,
               account_id, target_account_id, date, notes
        FROM payments
        WHERE payment_type = 'Receipt' AND status != 'reversed'
          AND (target_account_id = 'ACC-202' OR notes ILIKE '%%عربون%%' OR notes ILIKE '%%حجز%%' OR payment_no ILIKE 'RV-CUST-%%');
    """)
    rows = cur.fetchall()
    tot_adv = 0.0
    for r in rows:
        b_amt = clean_num(r.get('base_amount') or r.get('amount') or 0.0)
        tot_adv += b_amt
        cur.execute("UPDATE payments SET target_account_id = 'ACC-202' WHERE id = %s;", (r['id'],))
        jv_no = f"AUTO-VCH-{r['payment_no']}"
        cash_acc = r.get('account_id') or 'ACC-101-1'
        p_name = r.get('party_name') or 'العميلة'
        amt = clean_num(r.get('amount') or b_amt)
        curr = r.get('currency') or 'YER'
        rate = clean_num(r.get('exchange_rate') or 1.0)
        p_date = str(r.get('date') or today_str())
        notes = r.get('notes') or f"سند قبض عربون مبيعات - {p_name}"

        cur.execute("""
            INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
            VALUES (%s, %s, %s, %s, %s, 'ACC-202', %s, %s, %s, 'Receipt', %s, %s, %s, 'Posted', %s)
            ON CONFLICT (entry_no) DO UPDATE SET credit_account_id = 'ACC-202', base_amount = EXCLUDED.base_amount;
        """, (f"JV-{r['id']}", jv_no, p_date, f"سند قبض عربون {r['payment_no']}: {p_name}", cash_acc, amt, amt, b_amt, r['id'], curr, rate, notes))
        cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (jv_no,))
        j_id = cur.fetchone()['id']
        cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (j_id,))
        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);",
                    (generate_id("JVL"), j_id, cash_acc, f"مدين - عربون عميلة {p_name}", amt, b_amt))
        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, 'ACC-202', %s, 0.0, %s, 0.0, %s);",
                    (generate_id("JVL"), j_id, f"دائن - أمانات وعرابين فساتين ({p_name})", amt, b_amt))

    cur.execute("UPDATE chart_of_accounts SET current_balance = %s WHERE id = 'ACC-202' OR account_code = '202';", (tot_adv,))
    logger.info(f"✅ تم تصحيح رصيد حساب 202 في شجرة الحسابات: {tot_adv:,.2f} YER ({len(rows)} سندات)")
    return {"total_advances": tot_adv, "count": len(rows)}


def recalculate_advance_deposits_action(payload=None):
    """واجهة استدعاء إعادة احتساب عربونات العملاء عبر API أو المايسترو"""
    from .db_pool import get_db_cursor
    with get_db_cursor(commit=True) as cur:
        return recalculate_advance_deposits(cur)

