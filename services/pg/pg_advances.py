import datetime
import logging
import time
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id
from .account_resolver import resolve_exchange_rate, resolve_account_id

logger = logging.getLogger("LittlePrincesses_PG_Advances")


def add_advance(payload):
    data = payload.get('data') or payload
    emp_id = clean_str(data.get('emp_id') or data.get('employee_id'))
    emp_name = clean_str(data.get('emp_name') or data.get('name') or data.get('employee_name'))
    amount = clean_num(data.get('amount'))
    if amount <= 0:
        raise ValueError("مبلغ السلفة يجب أن يكون أكبر من الصفر")

    curr = clean_str(data.get('currency') or 'YER')
    notes = clean_str(data.get('notes') or f"سلفة نقدية للموظف {emp_name}")
    month = clean_str(data.get('month')) or datetime.date.today().strftime("%Y-%m")

    with get_db_cursor(commit=True) as cur:
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
            emp_id = generate_id("EMP")
            cur.execute("""
                INSERT INTO employees (id, name, role, type, currency, status)
                VALUES (%s, %s, 'خياط', 'راتب شهري', 'YER', 'نشط')
                ON CONFLICT (id) DO NOTHING;
            """, (emp_id, emp_name or 'موظف'))

        pay_id = generate_id("PAY")
        pay_no = f"PAY-ADV-{int(time.time())}"
        jv_id = generate_id("JV")
        jv_no = f"JV-ADV-{int(time.time())}"

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

        cur.execute("""
            INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
            VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
        """, (generate_id("JVL"), jv_id, debit_acc, f"سلفة نقدية: {emp_name}", amount, base_amt))

        cur.execute("""
            INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
            VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
        """, (generate_id("JVL"), jv_id, credit_acc, f"صرف سلفة نقدية للموظف {emp_name}", amount, base_amt))

        cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance + %s WHERE id = %s;", (base_amt, debit_acc))
        cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance - %s WHERE id = %s;", (base_amt, credit_acc))

        cur.execute("""
            UPDATE payroll 
            SET deductions = deductions + %s
            WHERE (employee_id = %s OR employee_name = %s) AND month = %s;
        """, (amount, emp_id, emp_name, month))

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
    emp_name = None
    emp_id = None
    month = None
    if isinstance(params, dict):
        emp_name = clean_str(params.get('employee_name') or params.get('name'))
        emp_id = clean_str(params.get('employee_id') or params.get('emp_id'))
        month = clean_str(params.get('month'))

    with get_db_cursor() as cur:
        query = """
            SELECT p.*, p.party_name as employee_name, jv.entry_no as jv_no,
                   jv.entry_no as entry_no, coa.account_name as box_name, coa.account_name as account_name
            FROM payments p
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
        query += " ORDER BY p.date DESC, p.created_at DESC;"
        cur.execute(query, tuple(args))
        rows = cur.fetchall()
        for r in rows:
            if r.get('created_at'):
                r['created_at'] = str(r['created_at'])
            if r.get('date'):
                r['date'] = str(r['date'])
            if r.get('amount'):
                r['amount'] = float(r['amount'])
            if r.get('base_amount'):
                r['base_amount'] = float(r['base_amount'])
        return rows
