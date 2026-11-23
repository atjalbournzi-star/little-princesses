# services/pg/pg_receipt_sync.py
# Double-entry sync service for customer advance receipts (Liability Account)

from .db_pool import clean_str, clean_num, generate_id, today_str, logger
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, get_active_user_context, resolve_active_user_id
from .pg_delivery_cogs import cascade_account_balances
from .account_resolver import resolve_receiving_account, resolve_customer_advance_account, resolve_exchange_rate


def normalize_payment_method(raw_m):
    s = clean_str(raw_m).lower()
    if not s or any(k in s for k in ['صندوق', 'نقد', 'كاش', 'cash', 'نقدي']): return 'نقد (كاش)'
    if any(k in s for k in ['بنك', 'حوالة', 'تحويل', 'bank', 'transfer']): return 'حوالة بنكية'
    if any(k in s for k in ['شبكة', 'بطاقة', 'مدى', 'pos', 'card']): return 'شبكة / بطاقة'
    return 'آجل (على الحساب)' if any(k in s for k in ['آجل', 'حساب', 'شيك']) else 'نقد (كاش)'


def sync_advance_receipt(cur, data):
    """مزامنة وترحيل قيد مزدوج متوازن لسند قبض العربون وتحديث شجرة الحسابات فورياً"""
    raw_ord = clean_str(data.get('order_id')) or clean_str(data.get('order_no'))
    cust_id = clean_str(data.get('customer_id')) or None
    p_name = clean_str(data.get('party_name') or data.get('customer_name') or 'العميل')
    if not cust_id and p_name and p_name != 'العميل':
        cur.execute("SELECT id FROM customers WHERE name = %s OR phone = %s LIMIT 1;", (p_name, p_name))
        c_row = cur.fetchone()
        if c_row: cust_id = c_row['id']
    order_id = None
    if raw_ord and not raw_ord.startswith('ORD-CUST-'):
        cur.execute("SELECT id FROM orders WHERE id = %s OR order_no = %s LIMIT 1;", (raw_ord, raw_ord))
        o_r = cur.fetchone()
        if o_r: order_id = o_r['id']
    if not order_id and cust_id:
        cur.execute("SELECT id FROM orders WHERE customer_id = %s ORDER BY created_at DESC LIMIT 1;", (cust_id,))
        o_r = cur.fetchone()
        if o_r: order_id = o_r['id']

    amt = clean_num(data.get('amount') or data.get('deposit') or data.get('paid_amount') or 0.0)
    curr = clean_str(data.get('currency') or 'YER').replace('﷼', '').replace('$', '').strip() or 'YER'
    rate = clean_num(data.get('exchange_rate')) or resolve_exchange_rate(cur, curr)
    base_amt = clean_num(data.get('base_amount') or (amt * rate))
    pay_m = normalize_payment_method(data.get('payment_method') or data.get('pay_method'))
    p_date = clean_str(data.get('date') or data.get('order_date')) or today_str()
    notes = clean_str(data.get('notes') or f"سند قبض عربون مبيعات - العميل {p_name}")
    user_id = resolve_active_user_id(cur, clean_str(data.get('created_by') or data.get('user_id') or ''))

    cash_acc = clean_str(data.get('account_id') or data.get('cash_acc')) or resolve_receiving_account(cur, pay_m, curr)
    tgt_acc = clean_str(data.get('target_account_id')) or resolve_customer_advance_account(cur)

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
        pay_no = ex_pay.get('payment_no') or custom_no or get_next_sequence_number(cur, 'RV', fallback_prefix='RV-')
        cur.execute("""UPDATE payments SET payment_no = %s, amount = %s, currency = %s, exchange_rate = %s, base_amount = %s,
            payment_method = %s, account_id = %s, target_account_id = %s, date = %s, notes = %s, party_name = %s,
            customer_id = COALESCE(%s, customer_id), order_id = COALESCE(%s, order_id), status = 'Confirmed'
            WHERE id = %s RETURNING *;""", (pay_no, amt, curr, rate, base_amt, pay_m, cash_acc, tgt_acc, p_date, notes, p_name, cust_id, order_id, pay_id))
        res = dict(cur.fetchone())
    else:
        pay_no = get_next_sequence_number(cur, 'RV', fallback_prefix='RV-')
        pay_id = pay_no
        cur.execute("""INSERT INTO payments (id, payment_no, customer_id, order_id, payment_type, amount, currency,
            exchange_rate, base_amount, payment_method, account_id, target_account_id, date, status, notes, party_name, created_by)
            VALUES (%s, %s, %s, %s, 'Receipt', %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET payment_no = EXCLUDED.payment_no, customer_id = COALESCE(EXCLUDED.customer_id, payments.customer_id),
            order_id = COALESCE(EXCLUDED.order_id, payments.order_id), amount = EXCLUDED.amount, base_amount = EXCLUDED.base_amount,
            account_id = EXCLUDED.account_id, target_account_id = EXCLUDED.target_account_id, payment_method = EXCLUDED.payment_method, notes = EXCLUDED.notes, party_name = EXCLUDED.party_name
            RETURNING *;""", (pay_id, pay_no, cust_id, order_id, amt, curr, rate, base_amt, pay_m, cash_acc, tgt_acc, p_date, notes, p_name, user_id))
        res = dict(cur.fetchone())

    jv_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
    jv_id = f"JV-{pay_no}"
    cur.execute("""INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
        amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Receipt', %s, %s, %s, 'Posted', %s, %s)
        ON CONFLICT (id) DO UPDATE SET entry_no = EXCLUDED.entry_no, amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount,
        base_amount = EXCLUDED.base_amount, debit_account_id = EXCLUDED.debit_account_id, credit_account_id = EXCLUDED.credit_account_id, currency = EXCLUDED.currency, notes = EXCLUDED.notes;""",
        (jv_id, jv_no, p_date, f"سند قبض عربون {pay_no}: {p_name}", cash_acc, tgt_acc, amt, amt, base_amt, pay_id, curr, rate, notes, user_id))

    cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (jv_id,))
    cur.execute("""INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES
        (%s, %s, %s, %s, %s, 0.0, %s, 0.0),
        (%s, %s, %s, %s, 0.0, %s, 0.0, %s);""",
        (generate_id("JVL"), jv_id, cash_acc, f"مدين - عربون عميل {p_name} ({pay_no})", amt, base_amt,
         generate_id("JVL"), jv_id, tgt_acc, f"دائن - أمانات وعرابين فساتين ({p_name})", amt, base_amt))

    cur.execute("UPDATE chart_of_accounts SET current_balance = COALESCE(current_balance, 0.0) + %s WHERE id = %s OR account_code = %s;", (base_amt, cash_acc, cash_acc))
    cur.execute("UPDATE chart_of_accounts SET current_balance = COALESCE(current_balance, 0.0) + %s WHERE id = %s OR account_code = %s;", (base_amt, tgt_acc, tgt_acc))
    cascade_account_balances(cur)

    log_audit_event(cur=cur, entity_type='payments', entity_id=pay_id, action='UPDATE' if ex_pay else 'INSERT', new_values={'payment_no': pay_no, 'amount': amt, 'currency': curr}, user_id=user_id, document_no=pay_no, details=f"سند قبض عربون {pay_no} للعميل {p_name}")
    log_audit_event(cur=cur, entity_type='journal_entries', entity_id=jv_id, action='INSERT', new_values={'entry_no': jv_no, 'amount': amt, 'base_amount': base_amt}, user_id=user_id, document_no=jv_no, details=f"قيد يومية مزدوج {jv_no} لسند {pay_no}")

    if cust_id and not data.get('skip_sync_order'):
        try:
            from .pg_financial_sync import sync_customer_order_from_voucher
            sync_customer_order_from_voucher(cur, cust_id, voucher_amount=amt, voucher_id=pay_id, voucher_no=pay_no, notes=notes, pay_method=pay_m, p_date=p_date)
        except Exception as ex:
            logger.warning(f"Financial sync notice: {ex}")
    return res


def recalculate_advance_deposits(cur):
    """إعادة احتساب وتصحيح رصيد حساب العربون في شجرة الحسابات بناءً على كافة سندات العربون المسجلة"""
    tgt_acc = resolve_customer_advance_account(cur)
    cur.execute("""
        SELECT id, payment_no, customer_id, party_name, amount, currency, exchange_rate, base_amount,
               account_id, target_account_id, date, notes
        FROM payments
        WHERE payment_type = 'Receipt' AND status != 'reversed'
          AND (target_account_id = %s OR notes ILIKE '%%عربون%%' OR notes ILIKE '%%حجز%%' OR payment_no ILIKE 'RV-CUST-%%');
    """, (tgt_acc,))
    rows = cur.fetchall()
    tot_adv = 0.0
    for r in rows:
        b_amt = clean_num(r.get('base_amount') or r.get('amount') or 0.0)
        tot_adv += b_amt
        cur.execute("UPDATE payments SET target_account_id = %s WHERE id = %s;", (tgt_acc, r['id']))
        jv_no = f"AUTO-VCH-{r['payment_no']}"
        cash_acc = r.get('account_id') or resolve_cash_account_by_currency(cur, r.get('currency'))
        p_name = r.get('party_name') or 'العميل'
        amt = clean_num(r.get('amount') or b_amt)
        curr = r.get('currency') or 'YER'
        rate = clean_num(r.get('exchange_rate') or 1.0)
        p_date = str(r.get('date') or today_str())
        notes = r.get('notes') or f"سند قبض عربون مبيعات - {p_name}"

        cur.execute("""INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Receipt', %s, %s, %s, 'Posted', %s)
            ON CONFLICT (entry_no) DO UPDATE SET credit_account_id = %s, base_amount = EXCLUDED.base_amount;""",
            (f"JV-{r['id']}", jv_no, p_date, f"سند قبض عربون {r['payment_no']}: {p_name}", cash_acc, tgt_acc, amt, amt, b_amt, r['id'], curr, rate, notes, tgt_acc))
        cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (jv_no,))
        j_id = cur.fetchone()['id']
        cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (j_id,))
        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);", (generate_id("JVL"), j_id, cash_acc, f"مدين - عربون عميل {p_name}", amt, b_amt))
        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);", (generate_id("JVL"), j_id, tgt_acc, f"دائن - أمانات وعرابين فساتين ({p_name})", amt, b_amt))

    distinct_custs = {r['customer_id'] for r in rows if r.get('customer_id')}
    from .pg_financial_sync import sync_customer_order_from_voucher
    for cid in distinct_custs:
        try: sync_customer_order_from_voucher(cur, cid)
        except Exception: pass

    tgt_acc = resolve_customer_advance_account(cur)
    cur.execute("SELECT COALESCE(SUM(debit), 0.0) as settled_adv FROM journal_entry_lines WHERE account_id = %s;", (tgt_acc,))
    settled_row = cur.fetchone()
    settled_adv = clean_num(settled_row['settled_adv'] if settled_row else 0.0)
    net_adv = max(0.0, tot_adv - settled_adv)

    cur.execute("UPDATE chart_of_accounts SET current_balance = %s WHERE id = %s OR account_code = '202';", (net_adv, tgt_acc))
    cascade_account_balances(cur)
    logger.info(f"✅ تم تصحيح رصيد حساب العربونات في شجرة الحسابات: {net_adv:,.2f} YER")
    sync_all_unvouchered_advances(cur)
    return {"total_advances": net_adv, "gross_advances": tot_adv, "settled": settled_adv, "count": len(rows), "synced_customers": len(distinct_custs)}


def sync_all_unvouchered_advances(cur):
    """مزامنة خلفية للطلبات والعملاء الذين لديهم مبالغ عربون مدفوعة لم يُنشأ لها سند قبض أو قيد محاسبي"""
    cur.execute("""
        SELECT o.id, o.order_no, o.customer_id, o.currency, o.exchange_rate, o.payment_method,
               o.order_date, o.delivery_date, COALESCE(o.deposit_amount, o.paid_amount, 0.0) as deposit,
               c.name as customer_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE COALESCE(o.deposit_amount, o.paid_amount, 0.0) > 0
          AND NOT EXISTS (
              SELECT 1 FROM payments p 
              WHERE (p.order_id = o.id OR p.order_id = o.order_no) AND p.payment_type = 'Receipt'
          );
    """)
    unvouchered_orders = cur.fetchall()
    vouchered_count = 0
    for o in unvouchered_orders:
        dep = clean_num(o['deposit'])
        if dep > 0:
            sync_advance_receipt(cur, {
                'order_id': o['id'], 'order_no': o['order_no'], 'customer_id': o['customer_id'],
                'party_name': o['customer_name'] or 'العميل', 'amount': dep,
                'currency': o['currency'] or 'YER', 'exchange_rate': o.get('exchange_rate'),
                'payment_method': o.get('payment_method') or 'نقد (كاش)',
                'date': str(o.get('order_date') or today_str()),
                'notes': f"سند قبض عربون مرحل آلياً للطلب {o['order_no']}"
            })
            vouchered_count += 1
    return {"synced_orders": vouchered_count}


def recalculate_advance_deposits_action(payload=None):
    from .db_pool import get_db_cursor
    with get_db_cursor(commit=True) as cur:
        return recalculate_advance_deposits(cur)

