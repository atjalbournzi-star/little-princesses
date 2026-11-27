import datetime
import logging
import time
from decimal import Decimal, ROUND_HALF_UP
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id
from .account_resolver import resolve_exchange_rate, resolve_account_id, normalize_currency_code
from .pg_sequences import get_next_sequence_number
from .pg_delivery_cogs import refresh_chart_balances_atomic
from .journal_lines_helper import insert_sorted_journal_lines
from services.security import assert_period_open

logger = logging.getLogger("LittlePrincesses_PG_Advances")
Q4 = Decimal("0.0001")
_ADV_COL_READY = False


def _ensure_advance_remaining_column(cur=None):
    global _ADV_COL_READY
    if _ADV_COL_READY:
        return
    def _apply(c):
        c.execute("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='employee_advances' AND column_name='remaining_amount' LIMIT 1;")
        if not c.fetchone():
            c.execute("ALTER TABLE public.employee_advances ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(18, 4);")
            c.execute("UPDATE public.employee_advances SET remaining_amount = CASE WHEN LOWER(COALESCE(status, 'active')) IN ('settled', 'deducted', 'closed') THEN 0 ELSE amount END WHERE remaining_amount IS NULL;")
    if cur is not None:
        _apply(cur)
    else:
        with get_db_cursor(commit=True) as new_cur:
            _apply(new_cur)
    _ADV_COL_READY = True


def settle_employee_advances_fifo(cur, emp_id, emp_name, deduction_amount):
    """خصم السلف القائمة للموظف بأسلوب FIFO داخل نفس معاملة صرف الرواتب ومنع تجاوز الرصيد"""
    ded = Decimal(str(clean_num(deduction_amount or 0.0))).quantize(Q4, rounding=ROUND_HALF_UP)
    if ded <= Decimal('0'):
        return []
    _ensure_advance_remaining_column(cur)
    cur.execute("""
        SELECT id, amount, COALESCE(remaining_amount, amount) AS rem_amt, status
        FROM employee_advances
        WHERE (employee_id = %s OR employee_name = %s)
          AND LOWER(COALESCE(status, 'active')) NOT IN ('settled', 'deducted', 'closed', 'cancelled')
          AND COALESCE(remaining_amount, amount) > 0
        ORDER BY advance_date ASC, created_at ASC
        FOR UPDATE;
    """, (emp_id, emp_name))
    open_rows = cur.fetchall() or []
    total_open = sum((Decimal(str(r['rem_amt'] or 0)).quantize(Q4, rounding=ROUND_HALF_UP) for r in open_rows), Decimal('0.0000'))
    if ded > total_open:
        raise ValueError(f"مبلغ استقطاع السلفة ({float(ded):,.2f}) يتجاوز رصيد السلف القائمة للموظف ({float(total_open):,.2f})")
    rem_to_apply, settled_ids = ded, []
    for r in open_rows:
        if rem_to_apply <= Decimal('0'):
            break
        row_rem = Decimal(str(r['rem_amt'] or 0)).quantize(Q4, rounding=ROUND_HALF_UP)
        take = min(rem_to_apply, row_rem)
        new_rem = (row_rem - take).quantize(Q4, rounding=ROUND_HALF_UP)
        new_status = 'settled' if new_rem <= Decimal('0') else 'active'
        cur.execute("UPDATE employee_advances SET remaining_amount = %s, status = %s WHERE id = %s;", (new_rem, new_status, r['id']))
        rem_to_apply = (rem_to_apply - take).quantize(Q4, rounding=ROUND_HALF_UP)
        settled_ids.append(r['id'])
    return settled_ids


def add_advance(payload):
    data = payload.get('data') or payload
    emp_id = clean_str(data.get('emp_id') or data.get('employee_id'))
    emp_name = clean_str(data.get('emp_name') or data.get('name') or data.get('employee_name'))
    amount = clean_num(data.get('amount'))
    if amount <= 0:
        raise ValueError("مبلغ السلفة يجب أن يكون أكبر من الصفر")

    curr = normalize_currency_code(clean_str(data.get('currency') or 'YER'))
    notes = clean_str(data.get('notes') or f"سلفة نقدية للموظف {emp_name}")
    month = clean_str(data.get('month')) or datetime.date.today().strftime("%Y-%m")

    with get_db_cursor(commit=True) as cur:
        assert_period_open(cur, data.get('advance_date') or data.get('date'))
        rate = resolve_exchange_rate(cur, curr, 1.0)
        base_amt = amount * rate

        if emp_id:
            cur.execute("SELECT id, name FROM employees WHERE id = %s LIMIT 1;", (emp_id,))
            row = cur.fetchone()
            if row and not emp_name:
                emp_name = row['name']
        elif emp_name:
            cur.execute("SELECT id, name FROM employees WHERE name = %s LIMIT 1;", (emp_name,))
            row = cur.fetchone()
            if row:
                emp_id = row['id']
                emp_name = row['name']

        if not emp_id:
            emp_id = get_next_sequence_number(cur, 'EMP', fallback_prefix='EMP-')
            cur.execute("""
                INSERT INTO employees (id, name, role, type, currency, status)
                VALUES (%s, %s, 'خياط', 'راتب شهري', 'YER', 'نشط')
                ON CONFLICT (id) DO NOTHING;
            """, (emp_id, emp_name or 'موظف'))

        pay_id = generate_id("PAY")
        pay_no = get_next_sequence_number(cur, 'PV', fallback_prefix='PV-')
        jv_id = generate_id("JV")
        jv_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')

        credit_acc = resolve_account_id(cur, data.get('account_id') or data.get('box_code') or 'ACC-101', 'ACC-101')
        debit_acc = 'ACC-107'

        cur.execute("""
            INSERT INTO payments (
                id, payment_no, payment_type, date, amount, currency,
                exchange_rate, base_amount, party_name, payment_method, account_id, notes, status, created_at
            ) VALUES (%s, %s, 'Payment', CURRENT_DATE, %s, %s, %s, %s, %s, 'Cash', %s, %s, 'Confirmed', CURRENT_TIMESTAMP);
        """, (pay_id, pay_no, amount, curr, rate, base_amt, emp_name, credit_acc, notes))

        cur.execute("""
            INSERT INTO journal_entries (
                id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                amount, total_amount, base_amount, currency, exchange_rate, ref_type, ref_id,
                status, notes, created_at
            ) VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, 'Advance', %s, 'Posted', %s, CURRENT_TIMESTAMP);
        """, (jv_id, jv_no, notes, debit_acc, credit_acc, amount, amount, base_amt, curr, rate, pay_id, notes))

        insert_sorted_journal_lines(cur, jv_id, [
            (debit_acc, f"سلفة نقدية: {emp_name}", amount, 0.0, base_amt, 0.0),
            (credit_acc, f"صرف سلفة نقدية للموظف {emp_name}", 0.0, amount, 0.0, base_amt),
        ])
        refresh_chart_balances_atomic(cur)

        cur.execute("""
            UPDATE payroll 
            SET deductions = deductions + %s
            WHERE (employee_id = %s OR employee_name = %s) AND month = %s;
        """, (amount, emp_id, emp_name, month))

        _ensure_advance_remaining_column(cur)
        cur.execute("""
            INSERT INTO employee_advances (
                id, employee_id, employee_name, amount, remaining_amount, currency, payment_method,
                cash_account_id, notes, advance_date, month_deduction, status, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, 'cash', %s, %s, CURRENT_DATE, %s, 'active', CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO NOTHING;
        """, (f"ADV-{pay_id}", emp_id, emp_name, amount, amount, curr, credit_acc, notes, month))

    logger.info(f"💵 تم صرف وتسجيل سلفة للموظف {emp_name} بمبلغ {amount} سند {pay_no} وقيد {jv_no}")
    return {
        "success": True,
        "message": f"تم تسجيل السلفة للموظف ({emp_name}) بمبلغ {amount:,.0f} {curr} بنجاح وتقييد القيد المحاسبي والسند المالي ✅",
        "payment_no": pay_no,
        "entry_no": jv_no,
        "amount": amount,
        "employee_id": emp_id,
        "voucher": {
            "id": pay_id,
            "voucher_no": pay_no,
            "entry_no": jv_no,
            "employee_name": emp_name,
            "employee_id": emp_id,
            "amount": amount,
            "currency": curr,
            "account_id": credit_acc,
            "notes": notes,
            "date": str(datetime.date.today())
        }
    }


def get_advances(params=None):
    emp_name = clean_str(params.get('employee_name') or params.get('name')) if isinstance(params, dict) else None
    month = clean_str(params.get('month')) if isinstance(params, dict) else None
    _ensure_advance_remaining_column()
    with get_db_cursor() as cur:
        query = """
            SELECT p.*, p.party_name as employee_name, jv.entry_no as jv_no,
                   jv.entry_no as entry_no, coa.account_name as box_name, coa.account_name as account_name,
                   ea.status as adv_status, ea.remaining_amount as adv_remaining
            FROM payments p
            LEFT JOIN employee_advances ea ON ea.id = ('ADV-' || p.id)
            LEFT JOIN journal_entries jv ON jv.ref_id = p.id AND jv.ref_type = 'Advance'
            LEFT JOIN chart_of_accounts coa ON p.account_id = coa.id OR p.account_id = coa.account_code
            WHERE p.payment_type = 'Payment'
              AND (p.payment_no LIKE %s OR p.notes ILIKE %s OR p.notes ILIKE %s)
        """
        args = ['PAY-ADV%', '%سلفة%', '%سلف%']
        if emp_name:
            query += " AND (p.party_name = %s OR p.notes ILIKE %s)"
            args.extend([emp_name, f"%{emp_name}%"])
        if month:
            query += " AND to_char(p.date, 'YYYY-MM') = %s"
            args.append(month)
        cur.execute(query + " ORDER BY p.date DESC, p.created_at DESC;", tuple(args))
        rows = cur.fetchall()
        for r in rows:
            if r.get('created_at'): r['created_at'] = str(r['created_at'])
            if r.get('date'): r['date'] = str(r['date'])
            amt_f = float(r.get('amount') or 0.0)
            r['amount'] = amt_f
            if r.get('base_amount'): r['base_amount'] = float(r['base_amount'])
            adv_st = str(r.get('adv_status') or 'active').lower()
            rem_f = float(r['adv_remaining']) if r.get('adv_remaining') is not None else (0.0 if adv_st in ('settled', 'deducted', 'closed') else amt_f)
            is_settled = (adv_st in ('settled', 'deducted', 'closed')) or (rem_f <= 0)
            r['status'], r['is_settled'], r['remaining_amount'] = ('settled' if is_settled else 'active'), is_settled, (0.0 if is_settled else rem_f)
        return rows
