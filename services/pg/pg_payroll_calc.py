import datetime
import logging
from .db_pool import get_db_cursor, clean_num, clean_str

logger = logging.getLogger("LittlePrincesses_PG_PayrollCalc")


def get_payroll(params=None):
    month = None
    if isinstance(params, dict):
        month = params.get('month')
    elif isinstance(params, str):
        month = params

    with get_db_cursor() as cur:
        if month:
            cur.execute("SELECT * FROM payroll WHERE month = %s ORDER BY created_at DESC;", (month,))
        else:
            cur.execute("SELECT * FROM payroll ORDER BY created_at DESC;")
        rows = cur.fetchall()
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
    month = None
    if isinstance(payload, dict):
        month = payload.get('month')
    elif isinstance(payload, str):
        month = payload
    if not month:
        month = datetime.date.today().strftime("%Y-%m")

    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM employees WHERE status IN ('Active', 'active', 'نشط') ORDER BY name;")
        employees = cur.fetchall()

        records = []
        for emp in employees:
            e_name = emp['name']
            e_id = emp['id']
            e_type = emp.get('type') or 'راتب شهري'
            base_sal = float(emp.get('salary') or 0.0)
            pieces_count = 0
            pieces_stmt = ""
            total_due = base_sal
            allowances = 0.0

            cur.execute("""
                SELECT id, order_no, product_name, stage, wage_amount, pieces_count, completed_at
                FROM tailor_commissions
                WHERE (employee_id = %s OR employee_name = %s)
                  AND status = 'Approved'
                  AND paid_at IS NULL
                  AND (completed_at IS NULL OR to_char(completed_at, 'YYYY-MM') = %s);
            """, (e_id, e_name, month))
            comm_rows = cur.fetchall()

            comm_pieces = sum(int(c.get('pieces_count') or 1) for c in comm_rows)
            comm_total = sum(float(c.get('wage_amount') or 0.0) for c in comm_rows)

            if comm_rows:
                pieces_stmt = "\n".join([
                    f"- أمر {c['order_no']} ({c['product_name']}): {c['stage']} [{float(c['wage_amount']):,.0f} ر.ي]"
                    for c in comm_rows
                ])
            elif e_type == 'بالقطعة':
                cur.execute("""
                    SELECT production_order_no, stage, due_date, order_id
                    FROM production_orders
                    WHERE (assigned_tailor_id = %s OR assigned_tailor_id = %s OR notes ILIKE %s)
                      AND stage IN ('تشطيب', 'جاهز للتسليم', 'تسليم', 'مكتمل', 'Completed')
                      AND to_char(created_at, 'YYYY-MM') = %s;
                """, (e_id, e_name, f"%{e_name}%", month))
                po_rows = cur.fetchall()
                comm_pieces = len(po_rows)
                comm_total = comm_pieces * base_sal
                if comm_pieces > 0:
                    pieces_stmt = "\n".join([f"- أمر معمل #{r['production_order_no']} (المرحلة: {r['stage']})" for r in po_rows])

            if e_type == 'بالقطعة':
                pieces_count = comm_pieces
                total_due = comm_total
                allowances = 0.0
            else:
                pieces_count = comm_pieces
                total_due = base_sal
                allowances = comm_total

            cur.execute("""
                SELECT COALESCE(SUM(amount), 0.0) as total_advances
                FROM payments
                WHERE (party_name = %s OR notes ILIKE %s)
                  AND payment_type IN ('Payment', 'سند_صرف')
                  AND (payment_no LIKE %s OR notes ILIKE %s OR notes ILIKE %s)
                  AND to_char(date, 'YYYY-MM') = %s;
            """, (e_name, f"%{e_name}%", "PAY-ADV%", "%سلفة%", "%سلف%", month))
            adv_row = cur.fetchone()
            deductions = float(adv_row['total_advances']) if adv_row else 0.0
            net_sal = max(0.0, (total_due + allowances) - deductions)

            records.append({
                "empId": e_id,
                "empName": e_name,
                "name": e_name,
                "role": emp.get('role') or 'خياط',
                "type": e_type,
                "baseValue": base_sal,
                "baseSalary": base_sal,
                "piecesCount": pieces_count,
                "totalDue": total_due,
                "pieceWages": total_due,
                "bonus": allowances,
                "allowances": allowances,
                "deductions": deductions,
                "deduction": deductions,
                "netSalary": net_sal,
                "net_salary": net_sal,
                "month": month,
                "status": 'معلق',
                "piecesStatement": pieces_stmt
            })
        return records
