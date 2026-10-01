import datetime
import logging
import time
import uuid
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id, today_str
from .account_resolver import resolve_exchange_rate, resolve_account_id

logger = logging.getLogger("LittlePrincesses_PG_PayrollPost")


def add_payroll_batch(payload):
    data = payload.get('data') or payload
    records = data.get('records', [])
    if not records and isinstance(data, list):
        records = data
    elif not records and isinstance(data, dict) and (data.get('empName') or data.get('name') or data.get('employee_name')):
        records = [data]

    created = []
    with get_db_cursor(commit=True) as cur:
        for r in records:
            p_id = clean_str(r.get('id')) or generate_id("PAY")
            p_no = clean_str(r.get('payroll_no')) or f"PR-{datetime.date.today().strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"
            emp_name = clean_str(r.get('empName') or r.get('employee_name') or r.get('name') or 'موظف')
            emp_id = clean_str(r.get('empId') or r.get('employee_id'))

            if emp_id:
                cur.execute("SELECT id, name FROM employees WHERE id = %s LIMIT 1;", (emp_id,))
                emp_row = cur.fetchone()
                if not emp_row:
                    cur.execute("SELECT id, name FROM employees WHERE name = %s LIMIT 1;", (emp_name,))
                    emp_row = cur.fetchone()
                    if emp_row:
                        emp_id = emp_row['id']
            else:
                cur.execute("SELECT id, name FROM employees WHERE name = %s LIMIT 1;", (emp_name,))
                emp_row = cur.fetchone()
                if emp_row:
                    emp_id = emp_row['id']

            if not emp_id:
                emp_id = generate_id("EMP")
                cur.execute("""
                    INSERT INTO employees (id, name, role, type, currency, status)
                    VALUES (%s, %s, 'خياط', %s, 'YER', 'نشط')
                    ON CONFLICT (id) DO NOTHING;
                """, (emp_id, emp_name, clean_str(r.get('type') or 'راتب شهري')))

            month = clean_str(r.get('month')) or datetime.date.today().strftime("%Y-%m")
            basic = clean_num(r.get('totalDue') or r.get('baseValue') or r.get('basic_salary') or r.get('salary'))
            allowances = clean_num(r.get('bonus') or r.get('allowances'))
            deductions = clean_num(r.get('deductions') or r.get('deduction'))
            curr = clean_str(r.get('currency') or 'YER')
            pay_date = clean_str(r.get('payment_date')) or today_str()
            status = clean_str(r.get('status') or 'معلق')
            emp_type = clean_str(r.get('type') or 'راتب شهري')
            pieces_count = int(clean_num(r.get('piecesCount') or 0))
            notes = clean_str(r.get('piecesStatement') or r.get('notes') or '')

            cur.execute("""
                INSERT INTO payroll (id, payroll_no, employee_id, employee_name, month, type, pieces_count, basic_salary, allowances, deductions, currency, payment_date, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    basic_salary = EXCLUDED.basic_salary,
                    allowances = EXCLUDED.allowances,
                    deductions = EXCLUDED.deductions,
                    type = EXCLUDED.type,
                    pieces_count = EXCLUDED.pieces_count,
                    status = EXCLUDED.status,
                    notes = EXCLUDED.notes;
            """, (p_id, p_no, emp_id, emp_name, month, emp_type, pieces_count, basic, allowances, deductions, curr, pay_date, status, notes))
            created.append(p_id)
    return {"created_count": len(created), "ids": created, "success": True}


def post_payroll(payload):
    data = payload.get('data') or payload
    records = data.get('records', [])
    month = clean_str(data.get('month')) or datetime.date.today().strftime("%Y-%m")

    if not records:
        return {"success": False, "message": "لا توجد سجلات رواتب للصرف"}

    processed = []
    with get_db_cursor(commit=True) as cur:
        for r in records:
            p_id = clean_str(r.get('id'))
            emp_id = clean_str(r.get('empId') or r.get('employee_id'))
            emp_name = clean_str(r.get('name') or r.get('empName') or r.get('employee_name') or 'موظف')
            base_val = clean_num(r.get('baseSalary') or r.get('baseValue') or r.get('basic_salary') or r.get('totalDue'))
            bonus = clean_num(r.get('bonus') or r.get('allowances'))
            deductions = clean_num(r.get('deduction') or r.get('deductions'))
            gross = base_val + bonus
            if gross <= 0:
                continue

            effective_deductions = min(deductions, gross)
            net = clean_num(r.get('netSalary') or (gross - effective_deductions))
            if net < 0:
                net = 0.0

            curr = clean_str(r.get('currency') or 'YER')
            rate = resolve_exchange_rate(cur, curr, 1.0)
            base_gross = gross * rate
            base_deductions = effective_deductions * rate
            base_net = net * rate

            credit_acc = resolve_account_id(cur, data.get('account_id') or data.get('box_code') or 'ACC-101', 'ACC-101')
            expense_acc = 'ACC-501'
            advance_acc = 'ACC-107'

            cur.execute("""
                UPDATE payroll
                SET status = 'تم الصرف ✅',
                    basic_salary = CASE WHEN %s > 0 THEN %s ELSE basic_salary END,
                    allowances = %s, deductions = %s, payment_date = CURRENT_DATE,
                    notes = COALESCE(notes, '') || ' [تم الصرف]'
                WHERE id = %s OR (employee_id = %s AND month = %s);
            """, (base_val, base_val, bonus, effective_deductions, p_id, emp_id, month))

            pay_id = generate_id("PAY")
            pay_no = f"PAY-SAL-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
            cur.execute("""
                INSERT INTO payments (
                    id, payment_no, payment_type, date, amount, currency,
                    exchange_rate, base_amount, party_name, payment_method, account_id, notes, status, created_at
                ) VALUES (%s, %s, 'Payment', CURRENT_DATE, %s, %s, %s, %s, %s, 'Cash', %s, %s, 'Confirmed', CURRENT_TIMESTAMP);
            """, (pay_id, pay_no, net, curr, rate, base_net, emp_name, credit_acc, f"صرف راتب شهر {month} للموظف: {emp_name}"))

            jv_id = generate_id("JV")
            jv_no = f"JV-SAL-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, currency, exchange_rate, ref_type, ref_id,
                    status, notes, created_at
                ) VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, 'Payroll', %s, 'Posted', %s, CURRENT_TIMESTAMP);
            """, (jv_id, jv_no, f"قيد صرف راتب شهر {month} للموظف {emp_name}", expense_acc, credit_acc, gross, gross, base_gross, curr, rate, pay_id, f"مسير رواتب {month}"))

            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
            """, (generate_id("JVL"), jv_id, expense_acc, f"استحقاق راتب شهر {month}: {emp_name}", gross, base_gross))
            cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance + %s WHERE id = %s;", (base_gross, expense_acc))

            if effective_deductions > 0:
                cur.execute("""
                    INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
                """, (generate_id("JVL"), jv_id, advance_acc, f"استرداد وتسوية سلف موظف: {emp_name}", effective_deductions, base_deductions))
                cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance - %s WHERE id = %s;", (base_deductions, advance_acc))

            if net > 0:
                cur.execute("""
                    INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
                """, (generate_id("JVL"), jv_id, credit_acc, f"صرف صافي راتب شهر {month}: {emp_name}", net, base_net))
                cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance - %s WHERE id = %s;", (base_net, credit_acc))

            cur.execute("""
                UPDATE tailor_commissions
                SET paid_at = CURRENT_TIMESTAMP, payout_voucher_no = %s
                WHERE (employee_id = %s OR employee_name = %s)
                  AND status = 'Approved' AND paid_at IS NULL
                  AND (completed_at IS NULL OR to_char(completed_at, 'YYYY-MM') <= %s);
            """, (pay_no, emp_id, emp_name, month))

            processed.append({
                "id": p_id, "emp_name": emp_name, "emp_id": emp_id, "net": net,
                "gross": gross, "deductions": deductions, "base_salary": base_val,
                "allowances": bonus, "payment_no": pay_no, "entry_no": jv_no,
                "currency": curr, "date": str(datetime.date.today()), "month": month
            })

    logger.info(f"💸 تم صرف رواتب {len(processed)} موظف لشهر {month} بنجاح.")
    return {
        "success": True,
        "message": "تم تسليم الراتب وإنشاء القيد المحاسبي المركب 💸",
        "processed_records": processed,
        "count": len(processed),
        "month": month
    }
