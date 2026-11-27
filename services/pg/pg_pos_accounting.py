# services/pg/pg_pos_accounting.py
# Double-entry POS Revenue (Split Cash/Bank/AR) & COGS Accounting Engine

from decimal import Decimal, ROUND_HALF_UP
from .db_pool import generate_id
from .pg_sequences import get_next_sequence_number
from .account_resolver import (
    resolve_cash_account_by_currency, resolve_bank_account_by_currency,
    resolve_sales_revenue_account, resolve_receivables_account, resolve_leaf_account
)
from .pg_wip_accounting import resolve_cogs_account
from .pg_delivery_cogs import refresh_chart_balances_atomic
from .journal_lines_helper import insert_sorted_journal_lines

DEC_4 = Decimal('0.0001')


def _d(val):
    return Decimal(str(val if val not in (None, '') else 0)).quantize(DEC_4, rounding=ROUND_HALF_UP)


def post_pos_journal_entries(cur, ctx):
    """
    Posts balanced Revenue/Receipts (supporting Split Cash + Bank + AR) and COGS entries.
    Guarantees Sum(Debit) == Sum(Credit) with Decimal precision.
    """
    order_id = ctx['order_id']
    order_no = ctx['order_no']
    order_date = ctx['order_date']
    cust_id = ctx['cust_id']
    c_name = ctx['c_name']
    curr = ctx['curr']
    rate = _d(ctx['rate'] or 1)
    tot_amt = _d(ctx['tot_amt'])
    paid_cash = _d(ctx.get('paid_cash', 0))
    paid_bank = _d(ctx.get('paid_bank', 0))
    paid_amt = paid_cash + paid_bank
    rem_amt = max(Decimal('0.0000'), tot_amt - paid_amt)
    total_cogs = _d(ctx.get('total_cogs', 0))
    wh_acc = ctx['wh_acc']
    notes = ctx.get('notes') or ''

    base_tot = (tot_amt * rate).quantize(DEC_4, rounding=ROUND_HALF_UP)
    base_cash = (paid_cash * rate).quantize(DEC_4, rounding=ROUND_HALF_UP)
    base_bank = (paid_bank * rate).quantize(DEC_4, rounding=ROUND_HALF_UP)
    base_rem = (base_tot - base_cash - base_bank).quantize(DEC_4, rounding=ROUND_HALF_UP)

    rev_acc = resolve_leaf_account(cur, resolve_sales_revenue_account(cur, 'ACC-401'), 'YER')
    cash_acc = resolve_leaf_account(cur, resolve_cash_account_by_currency(cur, curr), 'YER')
    bank_acc = resolve_leaf_account(cur, ctx.get('bank_account_id') or resolve_bank_account_by_currency(cur, curr), 'YER')
    ar_acc = resolve_leaf_account(cur, resolve_receivables_account(cur, 'ACC-104'), 'YER')

    primary_debit_acc = ar_acc if (paid_amt == 0 and rem_amt > 0) else (cash_acc if paid_cash >= paid_bank else bank_acc)
    jv_rev_no = f"JV-POS-{order_no}"
    cur.execute("""
        INSERT INTO public.journal_entries (
            id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'POSSale', %s, %s, %s, 'Posted', %s)
        ON CONFLICT (entry_no) DO UPDATE SET amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount;
    """, (generate_id("JV"), jv_rev_no, order_date, f"إثبات إيراد مبيعات نقاط البيع {order_no} ({c_name})", primary_debit_acc, rev_acc, tot_amt, tot_amt, base_tot, order_id, curr, rate, notes))

    cur.execute("SELECT id FROM public.journal_entries WHERE entry_no = %s LIMIT 1;", (jv_rev_no,))
    jv_rev_id = cur.fetchone()['id']
    cur.execute("DELETE FROM public.journal_entry_lines WHERE entry_id = %s;", (jv_rev_id,))

    lines = []
    if paid_cash > 0:
        lines.append((cash_acc, f"مدين - تحصيل نقدي مبيعات {order_no}", paid_cash, Decimal('0.0000'), base_cash, Decimal('0.0000')))
        pay_no = get_next_sequence_number(cur, 'RV', fallback_prefix='RV-')
        cur.execute("""
            INSERT INTO public.payments (id, payment_no, order_id, customer_id, payment_type, amount, currency, exchange_rate, base_amount, payment_method, reference_no, account_id, date, status, notes, party_name, target_account_id)
            VALUES (%s, %s, %s, %s, 'Receipt', %s, %s, %s, %s, 'نقد (كاش)', %s, %s, %s, 'Confirmed', %s, %s, %s);
        """, (pay_no, pay_no, order_id, cust_id, paid_cash, curr, rate, base_cash, order_no, cash_acc, order_date, f"قبض نقدي POS {order_no}", c_name, rev_acc))

    if paid_bank > 0:
        lines.append((bank_acc, f"مدين - تحصيل بنكي/تحويل مبيعات {order_no}", paid_bank, Decimal('0.0000'), base_bank, Decimal('0.0000')))
        pay_no_b = get_next_sequence_number(cur, 'RV', fallback_prefix='RV-')
        cur.execute("""
            INSERT INTO public.payments (id, payment_no, order_id, customer_id, payment_type, amount, currency, exchange_rate, base_amount, payment_method, reference_no, account_id, date, status, notes, party_name, target_account_id)
            VALUES (%s, %s, %s, %s, 'Receipt', %s, %s, %s, %s, 'بنك / تحويل', %s, %s, %s, 'Confirmed', %s, %s, %s);
        """, (pay_no_b, pay_no_b, order_id, cust_id, paid_bank, curr, rate, base_bank, order_no, bank_acc, order_date, f"قبض بنكي POS {order_no}", c_name, rev_acc))

    if rem_amt > 0:
        lines.append((ar_acc, f"مدين - رصيد آجل على العميل {c_name} ({order_no})", rem_amt, Decimal('0.0000'), base_rem, Decimal('0.0000')))
        if cust_id != 'CUST-GENERAL':
            cur.execute("UPDATE public.customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (rem_amt, cust_id))

    if tot_amt > 0:
        lines.append((rev_acc, f"دائن - إيراد مبيعات فورية {order_no}", Decimal('0.0000'), tot_amt, Decimal('0.0000'), base_tot))

    sum_dr = sum(x[4] for x in lines)
    sum_cr = sum(x[5] for x in lines)
    if sum_dr != sum_cr:
        raise ValueError(f"فشل توازن قيد مبيعات POS ({order_no}): المدين {sum_dr} != الدائن {sum_cr}")

    insert_sorted_journal_lines(cur, jv_rev_id, lines)

    jv_cogs_no = None
    if total_cogs > 0:
        cogs_acc = resolve_leaf_account(cur, resolve_cogs_account(cur, 'ACC-504'), 'YER')
        jv_cogs_no = f"JV-POS-COGS-{order_no}"
        cur.execute("""
            INSERT INTO public.journal_entries (
                id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'POSCOGS', %s, 'YER', 1.0, 'Posted', %s)
            ON CONFLICT (entry_no) DO UPDATE SET amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount;
        """, (generate_id("JV"), jv_cogs_no, order_date, f"إثبات تكلفة البضاعة المباعة COGS للطلب {order_no}", cogs_acc, wh_acc, total_cogs, total_cogs, total_cogs, order_id, f"تكلفة مخزون مبيعات {order_no}"))
        cur.execute("SELECT id FROM public.journal_entries WHERE entry_no = %s LIMIT 1;", (jv_cogs_no,))
        jv_cogs_id = cur.fetchone()['id']
        cur.execute("DELETE FROM public.journal_entry_lines WHERE entry_id = %s;", (jv_cogs_id,))
        insert_sorted_journal_lines(cur, jv_cogs_id, [
            (cogs_acc, f"مدين - تكلفة البضاعة المباعة COGS ({order_no})", total_cogs, Decimal('0.0000'), total_cogs, Decimal('0.0000')),
            (wh_acc, f"دائن - صرف بضاعة تامة من المستودع ({order_no})", Decimal('0.0000'), total_cogs, Decimal('0.0000'), total_cogs),
        ])

    refresh_chart_balances_atomic(cur)
    return {"jv_rev_no": jv_rev_no, "jv_cogs_no": jv_cogs_no}
