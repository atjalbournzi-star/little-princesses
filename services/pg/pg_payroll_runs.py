import datetime
import logging
import uuid
from .db_pool import get_db_cursor, clean_str, generate_id
from .account_resolver import resolve_account_id
from .pg_payroll_post import disburse_employee_payroll_entry
from .pg_delivery_cogs import refresh_chart_balances_atomic
from services.security import assert_period_open

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
        assert_period_open(cur, month)
        run = get_or_create_payroll_run(cur, month)
        run_id = run['id']

        for r in records:
            curr = clean_str(r.get('currency') or 'YER')
            credit_acc = resolve_account_id(cur, account_id, 'ACC-101-1', currency=curr)
            res = disburse_employee_payroll_entry(cur, r, month, credit_acc, is_bulk=True)
            if not res:
                continue

            item_id = generate_id("PITEM")
            cur.execute("""
                INSERT INTO payroll_items (
                    id, payroll_run_id, employee_id, base_amount, piece_rate_total,
                    incentives, deductions, advances_recovered, net_payable,
                    payment_status, payment_id, voucher_no, entry_no, pieces_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'تم الصرف ✅', %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (item_id, run_id, res['emp_id'], res['base_salary'], res['piece_rate_part'],
                  res['extra_bonus'], res['raw_deductions'], res['deductions'], res['net'],
                  res['payment_id'], res['payment_no'], res['entry_no'], res['pieces_count']))

            total_batch_gross += res['gross']
            total_batch_deductions += res['deductions']
            total_batch_net += res['net']
            processed.append({
                "id": res['id'], "emp_id": res['emp_id'], "emp_name": res['emp_name'],
                "net": res['net'], "gross": res['gross'], "deductions": res['deductions'],
                "payment_no": res['payment_no'], "entry_no": res['entry_no'],
                "target_account_id": res['target_account_id']
            })

        if not processed:
            return {"success": False, "message": "لا توجد سجلات برصيد صافي موجب للصرف"}

        cur.execute("""
            UPDATE payroll_runs
            SET total_gross = total_gross + %s, total_deductions = total_deductions + %s,
                total_net = total_net + %s, status = 'تم الصرف ✅', disbursed_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (total_batch_gross, total_batch_deductions, total_batch_net, run_id))
        refresh_chart_balances_atomic(cur)

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
