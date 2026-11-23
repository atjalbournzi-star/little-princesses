import datetime
import logging
from .db_pool import get_db_cursor, clean_num, clean_str

logger = logging.getLogger("LittlePrincesses_PG_PayrollCalc")


def get_payroll(params=None):
    month = (params.get('month') if isinstance(params, dict) else params) or datetime.date.today().strftime("%Y-%m")

    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM payroll WHERE month = %s ORDER BY created_at DESC;", (month,))
        rows = cur.fetchall() or []

    if not rows:
        try:
            from .pg_payroll_post import add_payroll_batch
            calc_recs = calculate_payroll(month)
            if calc_recs:
                add_payroll_batch({'records': calc_recs, 'month': month})
            with get_db_cursor() as cur:
                cur.execute("SELECT * FROM payroll WHERE month = %s ORDER BY created_at DESC;", (month,))
                rows = cur.fetchall() or []
        except Exception as e:
            logger.warning(f"Auto-sync payroll warning: {e}")
        for r in rows:
            if r.get('created_at'):
                r['created_at'] = str(r['created_at'])
            if r.get('payment_date'):
                r['payment_date'] = str(r['payment_date'])
            e_name = r.get('employee_name') or ''
            r['empName'] = e_name
            r['employee_name'] = e_name
            r['name'] = e_name
            e_id = r.get('employee_id') or ''
            r['empId'] = e_id
            r['employee_id'] = e_id
            r['type'] = r.get('type') or 'راتب شهري'
            base_val = float(r.get('basic_salary') or 0.0)
            r['baseValue'] = base_val
            r['baseSalary'] = base_val
            r['basic_salary'] = base_val
            r['piecesCount'] = int(r.get('pieces_count') or 0)
            r['totalDue'] = base_val
            r['pieceWages'] = base_val
            bon = float(r.get('allowances') or 0.0)
            r['bonus'] = bon
            r['allowances'] = bon
            ded = float(r.get('deductions') or 0.0)
            r['deductions'] = ded
            r['deduction'] = ded
            net = float(r.get('net_salary') if r.get('net_salary') is not None else (base_val + bon - ded))
            r['netSalary'] = net
            r['net_salary'] = net
            r['status'] = r.get('status') or 'معلق'
        return rows


def update_payroll_record(payload):
    data = payload.get('data') or payload
    p_id = clean_str(data.get('id'))
    status = data.get('status')
    bonus = clean_num(data.get('bonus') or data.get('allowances'))
    deductions = clean_num(data.get('deductions') or data.get('deduction'))
    notes = clean_str(data.get('notes') or '')

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            UPDATE payroll 
            SET status = COALESCE(%s, status),
                allowances = CASE WHEN %s > 0 THEN %s ELSE allowances END,
                deductions = CASE WHEN %s > 0 THEN %s ELSE deductions END,
                notes = CASE WHEN %s != '' THEN %s ELSE notes END
            WHERE id = %s;
        """, (status, bonus, bonus, deductions, deductions, notes, notes, p_id))
    return {"updated": True, "id": p_id, "success": True}


def calculate_payroll(payload=None):
    month = (payload.get('month') if isinstance(payload, dict) else payload) or datetime.date.today().strftime("%Y-%m")

    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM employees WHERE status IN ('Active', 'active', 'نشط') ORDER BY name;")
        employees = cur.fetchall() or []

        cur.execute("""
            SELECT prl.id, prl.worker_id, prl.worker_name, prl.stage_id, prl.piece_rate_amount, prl.pieces_count, prl.completed_at,
                   COALESCE(po.production_order_no, prl.production_order_id, '-') as order_no,
                   COALESCE(po.product_name, 'فستان ملكي') as product_name
            FROM piece_rate_logs prl
            LEFT JOIN production_orders po ON (po.id = prl.production_order_id OR po.production_order_no = prl.production_order_id)
            WHERE prl.paid_at IS NULL
              AND (prl.payment_status IN ('Accrued', 'pending', 'معلق') OR prl.payment_status IS NULL)
              AND (prl.qa_status ILIKE '%pass%' OR prl.qa_status ILIKE '%approv%');
        """)
        all_logs = cur.fetchall() or []
        logs_by_emp = {}
        for l in all_logs:
            for k in (l.get('worker_id'), l.get('worker_name')):
                if k: logs_by_emp.setdefault(k, []).append(l)

        cur.execute("""
            SELECT party_name, COALESCE(SUM(amount), 0.0) as total_advances
            FROM payments
            WHERE payment_type IN ('Payment', 'سند_صرف')
              AND (payment_no LIKE 'PAY-ADV%' OR notes ILIKE '%سلفة%' OR notes ILIKE '%سلف%')
              AND to_char(date, 'YYYY-MM') = %s
            GROUP BY party_name;
        """, (month,))
        adv_by_emp = {r['party_name']: float(r['total_advances']) for r in (cur.fetchall() or [])}

        records = []
        for emp in employees:
            e_name, e_id = emp['name'], emp['id']
            e_type = emp.get('type') or 'راتب شهري'
            base_sal = float(emp.get('salary') or 0.0)
            comm_rows = logs_by_emp.get(e_id) or logs_by_emp.get(e_name) or []
            seen_ids = set()
            uniq_comm = []
            for c in comm_rows:
                if c['id'] not in seen_ids:
                    seen_ids.add(c['id'])
                    uniq_comm.append(c)

            comm_pieces = sum(int(c.get('pieces_count') or 1) for c in uniq_comm)
            comm_total = sum(float(c.get('piece_rate_amount') or 0.0) * int(c.get('pieces_count') or 1) for c in uniq_comm)
            pieces_stmt = "\n".join([f"- أمر {c['order_no']} ({c['product_name']}): {c['stage_id']} [{float(c['piece_rate_amount']):,.0f} ر.ي]" for c in uniq_comm])

            if e_type == 'بالقطعة':
                pieces_count, total_due, allowances = comm_pieces, comm_total, 0.0
            else:
                pieces_count, total_due, allowances = comm_pieces, base_sal, comm_total

            deductions = adv_by_emp.get(e_name, 0.0)
            net_sal = max(0.0, (total_due + allowances) - deductions)

            records.append({
                "empId": e_id, "empName": e_name, "name": e_name, "role": emp.get('role') or 'خياط',
                "type": e_type, "baseValue": base_sal, "baseSalary": base_sal, "piecesCount": pieces_count,
                "totalDue": total_due, "pieceWages": total_due, "bonus": allowances, "allowances": allowances,
                "deductions": deductions, "deduction": deductions, "netSalary": net_sal, "net_salary": net_sal,
                "month": month, "status": 'معلق', "piecesStatement": pieces_stmt
            })
        return records
