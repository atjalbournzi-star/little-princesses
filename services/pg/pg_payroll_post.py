import datetime
import logging
import time
import uuid
from decimal import Decimal, ROUND_HALF_UP
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id, today_str
from .account_resolver import (
    resolve_exchange_rate, resolve_account_id,
    resolve_labor_liability_account, resolve_labor_expense_account
)
from .pg_sequences import get_next_sequence_number
from .pg_delivery_cogs import refresh_chart_balances_atomic
from .pg_advances import settle_employee_advances_fifo
from .journal_lines_helper import insert_sorted_journal_lines
from services.security import assert_period_open

logger = logging.getLogger("LittlePrincesses_PG_PayrollPost")
Q4 = Decimal("0.0001")


def _d(val):
    return Decimal(str(clean_num(val or 0.0)))


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
            p_id = clean_str(r.get('id'))
            p_no = clean_str(r.get('payroll_no'))
            emp_name = clean_str(r.get('empName') or r.get('employee_name') or r.get('name') or 'موظف')
            emp_id = clean_str(r.get('empId') or r.get('employee_id'))

            if emp_id:
                cur.execute("SELECT id, name FROM employees WHERE id = %s LIMIT 1;", (emp_id,))
                emp_row = cur.fetchone()
                if not emp_row:
                    cur.execute("SELECT id, name FROM employees WHERE name = %s LIMIT 1;", (emp_name,))
                    emp_row = cur.fetchone()
            else:
                cur.execute("SELECT id, name FROM employees WHERE name = %s LIMIT 1;", (emp_name,))
                emp_row = cur.fetchone()
            if emp_row:
                emp_id = emp_row['id']

            if not emp_id:
                emp_id = get_next_sequence_number(cur, 'EMP', fallback_prefix='EMP-')
                cur.execute("INSERT INTO employees (id, name, role, type, currency, status) VALUES (%s, %s, 'خياط', %s, 'YER', 'نشط') ON CONFLICT (id) DO NOTHING;", (emp_id, emp_name, clean_str(r.get('type') or 'راتب شهري')))

            month = clean_str(r.get('month')) or datetime.date.today().strftime("%Y-%m")
            basic = clean_num(r.get('totalDue') or r.get('baseValue') or r.get('basic_salary') or r.get('salary'))
            allowances = clean_num(r.get('bonus') or r.get('allowances'))
            deductions = clean_num(r.get('deductions') or r.get('deduction'))
            curr, pay_date = clean_str(r.get('currency') or 'YER'), clean_str(r.get('payment_date')) or today_str()
            status, emp_type = clean_str(r.get('status') or 'معلق'), clean_str(r.get('type') or 'راتب شهري')
            pieces_count, notes = int(clean_num(r.get('piecesCount') or 0)), clean_str(r.get('piecesStatement') or r.get('notes') or '')

            cur.execute("SELECT id, payroll_no, status FROM payroll WHERE (employee_id = %s OR employee_name = %s) AND month = %s LIMIT 1;", (emp_id, emp_name, month))
            exist_row = cur.fetchone()
            if exist_row:
                p_id, p_no = exist_row['id'], exist_row.get('payroll_no') or p_no
                if exist_row.get('status') == 'تم الصرف ✅': status = 'تم الصرف ✅'
            else:
                if not p_id: p_id = generate_id("PAY")
                if not p_no: p_no = f"PR-{datetime.date.today().strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"

            cur.execute("""
                INSERT INTO payroll (id, payroll_no, employee_id, employee_name, month, type, pieces_count, basic_salary, allowances, deductions, currency, payment_date, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    basic_salary = EXCLUDED.basic_salary, allowances = EXCLUDED.allowances, deductions = EXCLUDED.deductions,
                    type = EXCLUDED.type, pieces_count = EXCLUDED.pieces_count, status = EXCLUDED.status, notes = EXCLUDED.notes;
            """, (p_id, p_no, emp_id, emp_name, month, emp_type, pieces_count, basic, allowances, deductions, curr, pay_date, status, notes))
            created.append(p_id)
    return {"created_count": len(created), "ids": created, "success": True}


def disburse_employee_payroll_entry(cur, r, month, credit_acc, is_bulk=False):
    """تفكيك وصرف راتب موظف بقيد محاسبي مركب (203 لأجور القطع، 501 للراتب الثابت، 107 للسلف، 101 للصافي)"""
    p_id = clean_str(r.get('id') or r.get('payroll_id'))
    emp_id = clean_str(r.get('empId') or r.get('employee_id'))
    emp_name = clean_str(r.get('name') or r.get('empName') or r.get('employee_name') or 'موظف')
    deductions = _d(r.get('deduction') or r.get('deductions'))

    cur.execute("SELECT id, name, type, salary FROM employees WHERE id = %s OR name = %s LIMIT 1;", (emp_id, emp_name))
    emp_db = cur.fetchone()
    emp_type = emp_db.get('type') if emp_db else clean_str(r.get('type') or 'راتب شهري')
    base_fixed = _d(emp_db.get('salary')) if emp_db else _d(r.get('baseSalary'))

    cur.execute("""
        SELECT id, COALESCE(piece_rate_amount, 0.0) as amount, COALESCE(pieces_count, 1) as count
        FROM piece_rate_logs
        WHERE (worker_id = %s OR worker_name = %s) AND paid_at IS NULL
          AND (payment_status IN ('Accrued', 'pending', 'معلق', 'Pending') OR payment_status IS NULL)
          AND (qa_status ILIKE '%%pass%%' OR qa_status ILIKE '%%approv%%')
        FOR UPDATE;
    """, (emp_id, emp_name))
    locked_prl = cur.fetchall()
    locked_ids = [row['id'] for row in locked_prl]
    real_piece_wages = sum(_d(row['amount']) * int(row['count']) for row in locked_prl)
    real_piece_cnt = sum(int(row['count']) for row in locked_prl)

    extra_bonus = _d(r.get('bonus'))
    if emp_type == 'بالقطعة':
        base_val = real_piece_wages if real_piece_wages > 0 else _d(r.get('baseSalary'))
        piece_part = real_piece_wages
        salary_part = (base_val - real_piece_wages) + extra_bonus if real_piece_wages == 0 else extra_bonus
        bonus_col = extra_bonus
    else:
        base_val = base_fixed
        piece_part = real_piece_wages
        salary_part = base_fixed + extra_bonus
        bonus_col = real_piece_wages + extra_bonus

    gross = piece_part + salary_part
    if gross <= 0:
        return None
    eff_ded = min(deductions, gross)
    net = max(Decimal('0'), gross - eff_ded)
    if net <= 0:
        return None

    curr = clean_str(r.get('currency') or 'YER')
    rate = _d(resolve_exchange_rate(cur, curr, 1.0))
    base_piece = (piece_part * rate).quantize(Q4, rounding=ROUND_HALF_UP)
    base_salary = (salary_part * rate).quantize(Q4, rounding=ROUND_HALF_UP)
    base_gross = base_piece + base_salary
    base_ded = (eff_ded * rate).quantize(Q4, rounding=ROUND_HALF_UP)
    base_net = base_gross - base_ded

    payable_acc = resolve_labor_liability_account(cur, 'ACC-203')
    expense_acc = resolve_labor_expense_account(cur, 'ACC-501')
    advance_acc = resolve_account_id(cur, 'ACC-107', 'ACC-107')
    target_acc = payable_acc if (piece_part > 0 and (emp_type == 'بالقطعة' or piece_part >= salary_part)) else expense_acc

    tag = ' [صرف مجمع]' if is_bulk else ' [تم الصرف]'
    cur.execute("""
        UPDATE payroll SET status = 'تم الصرف ✅', basic_salary = %s, allowances = %s, deductions = %s,
            pieces_count = %s, payment_date = CURRENT_DATE, notes = COALESCE(notes, '') || %s
        WHERE id = %s OR (employee_id = %s AND month = %s);
    """, (float(base_val), float(bonus_col), float(eff_ded), real_piece_cnt, tag, p_id, emp_id, month))

    pay_id = generate_id("PAY")
    pay_no = f"PAY-SAL-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
    pay_desc = f"صرف {'مسير مجمع' if is_bulk else 'راتب'} شهر {month} للموظف: {emp_name}"
    cur.execute("""
        INSERT INTO payments (id, payment_no, payment_type, date, amount, currency, exchange_rate,
            base_amount, party_name, payment_method, account_id, target_account_id, notes, status, created_at)
        VALUES (%s, %s, 'Payment', CURRENT_DATE, %s, %s, %s, %s, %s, 'Cash', %s, %s, %s, 'Confirmed', CURRENT_TIMESTAMP);
    """, (pay_id, pay_no, float(net), curr, float(rate), float(base_net), emp_name, credit_acc, target_acc, pay_desc))

    jv_id, jv_no = generate_id("JV"), f"JV-SAL-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
    cur.execute("""
        INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, currency, exchange_rate, ref_type, ref_id, status, notes, created_at)
        VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, 'Payroll', %s, 'Posted', %s, CURRENT_TIMESTAMP);
    """, (jv_id, jv_no, f"قيد صرف مسير رواتب شهر {month} للموظف {emp_name}", target_acc, credit_acc, float(gross), float(gross), float(base_gross), curr, float(rate), pay_id, f"مسير رواتب {month}"))

    pay_lines = []
    if piece_part > 0:
        pay_lines.append((payable_acc, f"إقفال مستحقات أجور قطع شهر {month}: {emp_name}", float(piece_part), 0.0, float(base_piece), 0.0))
    if salary_part > 0:
        pay_lines.append((expense_acc, f"استحقاق راتب ومكافآت شهر {month}: {emp_name}", float(salary_part), 0.0, float(base_salary), 0.0))
    if eff_ded > 0:
        pay_lines.append((advance_acc, f"استرداد وتسوية سلف موظف: {emp_name}", 0.0, float(eff_ded), 0.0, float(base_ded)))
        settle_employee_advances_fifo(cur, emp_id, emp_name, eff_ded)
    pay_lines.append((credit_acc, f"صرف صافي راتب شهر {month}: {emp_name}", 0.0, float(net), 0.0, float(base_net)))
    insert_sorted_journal_lines(cur, jv_id, pay_lines)

    if locked_ids:
        cur.execute("UPDATE piece_rate_logs SET payment_status = 'paid', paid_at = CURRENT_TIMESTAMP, voucher_no = %s WHERE id = ANY(%s) AND paid_at IS NULL;", (pay_no, locked_ids))
    cur.execute("UPDATE tailor_commissions SET paid_at = CURRENT_TIMESTAMP, payout_voucher_no = %s WHERE (employee_id = %s OR employee_name = %s) AND status = 'Approved' AND paid_at IS NULL AND (completed_at IS NULL OR to_char(completed_at, 'YYYY-MM') <= %s);", (pay_no, emp_id, emp_name, month))

    return {
        "id": p_id, "emp_name": emp_name, "emp_id": emp_id, "net": float(net), "gross": float(gross),
        "deductions": float(eff_ded), "raw_deductions": float(deductions), "base_salary": float(base_val),
        "allowances": float(bonus_col), "piece_rate_part": float(piece_part), "extra_bonus": float(extra_bonus),
        "pieces_count": real_piece_cnt or int(clean_num(r.get('piecesCount') or 0)),
        "payment_id": pay_id, "payment_no": pay_no, "entry_no": jv_no,
        "target_account_id": target_acc, "currency": curr, "date": str(datetime.date.today()), "month": month
    }


def post_payroll(payload):
    data = payload.get('data') or payload
    records = data.get('records', [])
    month = clean_str(data.get('month')) or datetime.date.today().strftime("%Y-%m")
    if not records:
        return {"success": False, "message": "لا توجد سجلات رواتب للصرف"}

    processed = []
    with get_db_cursor(commit=True) as cur:
        assert_period_open(cur, month)
        for r in records:
            curr = clean_str(r.get('currency') or 'YER')
            credit_acc = resolve_account_id(cur, data.get('account_id') or data.get('box_code') or 'ACC-101', 'ACC-101-1', currency=curr)
            res = disburse_employee_payroll_entry(cur, r, month, credit_acc, is_bulk=False)
            if res:
                processed.append(res)
        if processed:
            refresh_chart_balances_atomic(cur)

    if not processed:
        return {"success": False, "message": "لا يوجد موظفون بصافي مستحق موجب للصرف (الصافي صفر أو أقل)"}
    logger.info(f"💸 تم صرف رواتب {len(processed)} موظف لشهر {month} بنجاح.")
    return {
        "success": True,
        "message": "تم تسليم الراتب وإنشاء القيد المحاسبي المركب 💸",
        "processed_records": processed,
        "count": len(processed),
        "month": month
    }
