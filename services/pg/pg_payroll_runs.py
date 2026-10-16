import datetime
import logging
import time
import uuid
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id, today_str
from .account_resolver import resolve_exchange_rate, resolve_account_id

logger = logging.getLogger("LittlePrincesses_PG_PayrollRuns")


def get_or_create_payroll_run(cur, month):
    cur.execute("SELECT * FROM payroll_runs WHERE month = %s LIMIT 1;", (month,))
    run = cur.fetchone()
    if run:
        return dict(run)
    run_id = generate_id("PRUN")
    run_no = f"RUN-{month}-{uuid.uuid4().hex[:4].upper()}"
    cur.execute("""
        INSERT INTO payroll_runs (id, run_no, month, run_date, status, total_gross, total_deductions, total_net)
        VALUES (%s, %s, %s, CURRENT_DATE, 'معلق', 0.0, 0.0, 0.0)
        RETURNING *;
    """, (run_id, run_no, month))
    return dict(cur.fetchone())


def disburse_payroll_run_atomic(payload):
    data = payload.get('data') or payload
    records = data.get('records', [])
    month = clean_str(data.get('month')) or datetime.date.today().strftime("%Y-%m")
    account_id = clean_str(data.get('account_id') or 'ACC-101')

    if not records:
        return {"success": False, "message": "لا توجد سجلات رواتب معلقة للصرف المجمع"}

    processed = []
    total_batch_gross = 0.0
    total_batch_deductions = 0.0
    total_batch_net = 0.0

    with get_db_cursor(commit=True) as cur:
        run = get_or_create_payroll_run(cur, month)
        run_id = run['id']
        credit_acc = resolve_account_id(cur, account_id, 'ACC-101')
        expense_acc = 'ACC-501'
        advance_acc = 'ACC-107'

        for r in records:
            p_id = clean_str(r.get('id') or r.get('payroll_id'))
            emp_id = clean_str(r.get('empId') or r.get('employee_id'))
            emp_name = clean_str(r.get('name') or r.get('empName') or r.get('employee_name') or 'موظف')
            base_val = clean_num(r.get('baseSalary') or r.get('baseValue') or r.get('basic_salary') or r.get('totalDue'))
            bonus = clean_num(r.get('bonus') or r.get('allowances'))
            deductions = clean_num(r.get('deduction') or r.get('deductions'))
            gross = base_val + bonus
            if gross <= 0:
                continue

            eff_ded = min(deductions, gross)
            net = max(0.0, gross - eff_ded)
            curr = clean_str(r.get('currency') or 'YER')
            rate = resolve_exchange_rate(cur, curr, 1.0)
            base_gross = gross * rate
            base_ded = eff_ded * rate
            base_net = net * rate

            # 1. تحديث جدول payroll
            cur.execute("""
                UPDATE payroll
                SET status = 'تم الصرف ✅', payment_date = CURRENT_DATE,
                    allowances = %s, deductions = %s, notes = COALESCE(notes, '') || ' [صرف مجمع]'
                WHERE id = %s OR (employee_id = %s AND month = %s);
            """, (bonus, eff_ded, p_id, emp_id, month))

            # 2. إنشاء سند الصرف في payments
            pay_id = generate_id("PAY")
            pay_no = f"PAY-SAL-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
            cur.execute("""
                INSERT INTO payments (
                    id, payment_no, payment_type, date, amount, currency,
                    exchange_rate, base_amount, party_name, payment_method, account_id, notes, status, created_at
                ) VALUES (%s, %s, 'Payment', CURRENT_DATE, %s, %s, %s, %s, %s, 'Cash', %s, %s, 'Confirmed', CURRENT_TIMESTAMP);
            """, (pay_id, pay_no, net, curr, rate, base_net, emp_name, credit_acc, f"صرف مسير مجمع شهر {month} للموظف: {emp_name}"))

            # 3. إنشاء قيد اليومية المتوازن
            jv_id = generate_id("JV")
            jv_no = f"JV-SAL-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, currency, exchange_rate, ref_type, ref_id,
                    status, notes, created_at
                ) VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, 'Payroll', %s, 'Posted', %s, CURRENT_TIMESTAMP);
            """, (jv_id, jv_no, f"قيد صرف مسير رواتب شهر {month} للموظف {emp_name}", expense_acc, credit_acc, gross, gross, base_gross, curr, rate, pay_id, f"مسير مجمع {month}"))

            # خطوط القيد: مدين للمصروف، دائن للسلف ودائن للصندوق
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
            """, (generate_id("JVL"), jv_id, expense_acc, f"استحقاق راتب {month}: {emp_name}", gross, base_gross))
            cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance + %s WHERE id = %s;", (base_gross, expense_acc))

            if eff_ded > 0:
                cur.execute("""
                    INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
                """, (generate_id("JVL"), jv_id, advance_acc, f"تسوية سلف {month}: {emp_name}", eff_ded, base_ded))
                cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance - %s WHERE id = %s;", (base_ded, advance_acc))

            if net > 0:
                cur.execute("""
                    INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
                """, (generate_id("JVL"), jv_id, credit_acc, f"صرف صافي راتب {month}: {emp_name}", net, base_net))
                cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance - %s WHERE id = %s;", (base_net, credit_acc))

            # 4. تسوية أجور القطع في tailor_commissions
            cur.execute("""
                UPDATE tailor_commissions
                SET paid_at = CURRENT_TIMESTAMP, payout_voucher_no = %s
                WHERE (employee_id = %s OR employee_name = %s)
                  AND status = 'Approved' AND paid_at IS NULL
                  AND (completed_at IS NULL OR to_char(completed_at, 'YYYY-MM') <= %s);
            """, (pay_no, emp_id, emp_name, month))

            # 5. مزامنة بند مسير الرواتب في payroll_items
            item_id = generate_id("PITEM")
            pieces_cnt = int(clean_num(r.get('piecesCount') or 0))
            cur.execute("""
                INSERT INTO payroll_items (
                    id, payroll_run_id, employee_id, base_amount, piece_rate_total,
                    incentives, deductions, advances_recovered, net_payable,
                    payment_status, payment_id, voucher_no, entry_no, pieces_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'تم الصرف ✅', %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (item_id, run_id, emp_id, base_val, (base_val if r.get('type') == 'بالقطعة' else 0.0),
                  bonus, deductions, eff_ded, net, pay_id, pay_no, jv_no, pieces_cnt))

            total_batch_gross += gross
            total_batch_deductions += eff_ded
            total_batch_net += net
            processed.append({
                "id": p_id, "emp_id": emp_id, "emp_name": emp_name, "net": net,
                "gross": gross, "deductions": eff_ded, "payment_no": pay_no, "entry_no": jv_no
            })

        # تحديث المسير المجمع في payroll_runs
        cur.execute("""
            UPDATE payroll_runs
            SET total_gross = total_gross + %s,
                total_deductions = total_deductions + %s,
                total_net = total_net + %s,
                status = 'تم الصرف ✅',
                disbursed_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (total_batch_gross, total_batch_deductions, total_batch_net, run_id))

    logger.info(f"✅ تم صرف المسير المجمع لعدد {len(processed)} موظف بإجمالي صافي {total_batch_net:,.2f} YER")
    return {
        "success": True,
        "message": f"تم اعتماد وصرف المسير المجمع لعدد {len(processed)} موظف بنجاح 💸",
        "processed_count": len(processed),
        "total_net": total_batch_net,
        "total_gross": total_batch_gross,
        "total_deductions": total_batch_deductions,
        "run_id": run_id,
        "month": month,
        "processed_records": processed
    }
