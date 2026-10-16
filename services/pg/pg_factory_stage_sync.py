import datetime
import logging
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id, today_str

logger = logging.getLogger("LittlePrincesses_PG_FactoryStageSync")


def _is_stage_done(stage_idx, prog, stage_str):
    s = stage_str or ''
    if stage_idx == 0:  # Cutting
        return prog >= 40 or any(k in s for k in ['خياطة', 'تطريز', 'تشطيب', 'فحص', 'جاهز', 'تسليم', 'Sewing', 'Embroidery', 'Inspection', 'Ready', 'Delivered'])
    elif stage_idx == 1:  # Sewing
        return prog >= 60 or any(k in s for k in ['تطريز', 'تشطيب', 'فحص', 'جاهز', 'تسليم', 'Embroidery', 'Inspection', 'Ready', 'Delivered'])
    elif stage_idx == 2:  # Embroidery
        return prog >= 80 or any(k in s for k in ['تشطيب', 'فحص', 'جاهز', 'تسليم', 'Inspection', 'Ready', 'Delivered'])
    elif stage_idx in (3, 4):  # Finishing & Packaging
        return prog >= 100 or any(k in s for k in ['جاهز', 'تسليم', 'Ready', 'Delivered'])
    return False


def sync_production_order_commissions(cur, po_id_or_data):
    if isinstance(po_id_or_data, dict) and po_id_or_data.get('id'):
        po = po_id_or_data
    else:
        pid = clean_str(po_id_or_data)
        cur.execute("SELECT * FROM production_orders WHERE id = %s OR production_order_no = %s LIMIT 1;", (pid, pid))
        po = cur.fetchone()
    if not po:
        return []

    po_id = po['id']
    order_no = po.get('production_order_no') or po_id
    stage_str = clean_str(po.get('stage') or '')
    prog = float(clean_num(po.get('progress') or 0.0))
    p_name = po.get('product_name') or 'موديل راقي'
    c_name = po.get('child_name') or 'الأميرة'
    p_type = po.get('production_type') or 'custom'
    p_count = max(1, int(clean_num(po.get('pieces_count') or 1)))
    o_date = po.get('start_date') or (po.get('created_at').date() if hasattr(po.get('created_at'), 'date') else None) or today_str()

    prod_wages = {}
    p_ref = po.get('product_id') or po.get('product_name')
    if p_ref:
        cur.execute("SELECT bom, labor_cost, packaging_cost FROM products WHERE id = %s OR model_name = %s LIMIT 1;", (p_ref, p_ref))
        p_row = cur.fetchone()
        if p_row and isinstance(p_row.get('bom'), dict):
            prod_wages = p_row['bom'].get('meta') or {}

    stages_config = [
        (0, po.get('cutter_name'), po.get('cutter_wage') or prod_wages.get('cutter_wage'), 'قصاص', 'القص والتحضير ✂️'),
        (1, po.get('tailor_name') or po.get('assigned_tailor_id'), po.get('tailor_wage') or prod_wages.get('tailor_wage'), 'خياط', 'مرحلة الخياطة 🪡'),
        (2, po.get('embroiderer_name'), po.get('embroiderer_wage') or prod_wages.get('embroiderer_wage'), 'تطريز', 'التطريز والشك ✨'),
        (3, po.get('finisher_name'), po.get('finisher_wage') or prod_wages.get('finisher_wage'), 'تشطيب', 'الفحص والتشطيب النهائي 🔍'),
        (4, po.get('packager_name'), po.get('packaging_cost') or prod_wages.get('packaging_cost'), 'تغليف', 'التغليف والإكسسوار 📦')
    ]

    synced_emps = set()
    for s_idx, w_name, w_wage, def_role, stg_title in stages_config:
        w_name = clean_str(w_name)
        if not w_name or not _is_stage_done(s_idx, prog, stage_str):
            continue

        raw_wage = clean_num(w_wage or 0.0)
        cur.execute("""
            SELECT id, name, role, salary, type FROM employees
            WHERE name = %s OR name ILIKE %s
            ORDER BY (salary = %s) DESC LIMIT 1;
        """, (w_name, f"%{w_name}%", raw_wage))
        emp = cur.fetchone()
        emp_id = emp['id'] if emp else generate_id("EMP")
        final_wage = raw_wage if raw_wage > 0 else (clean_num(emp['salary']) if emp else 0.0)
        final_role = (emp.get('role') if emp else None) or def_role

        cur.execute("""
            SELECT id, status FROM tailor_commissions 
            WHERE (production_order_id = %s OR order_no = %s) AND stage = %s LIMIT 1;
        """, (po_id, order_no, stg_title))
        comm = cur.fetchone()

        if not comm:
            comm_id = generate_id("COMM")
            cur.execute("""
                INSERT INTO tailor_commissions (
                    id, production_order_id, order_no, employee_id, employee_name, role,
                    product_name, child_name, stage, wage_amount, pieces_count, production_type,
                    order_date, completed_at, is_on_time, quality_score, quality_notes, status,
                    approved_by, approved_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, CURRENT_TIMESTAMP, true, 5.0, 'إنجاز مرحلة تصنيع معتمدة ⭐', 'Approved',
                    'إدارة المعمل ✂️', CURRENT_TIMESTAMP
                );
            """, (comm_id, po_id, order_no, emp_id, w_name, final_role, p_name, c_name, stg_title, final_wage, p_count, p_type, o_date))
        elif comm.get('status') != 'Paid':
            cur.execute("""
                UPDATE tailor_commissions
                SET employee_id = %s, employee_name = %s, wage_amount = %s, pieces_count = %s
                WHERE id = %s;
            """, (emp_id, w_name, final_wage, p_count, comm['id']))

        synced_emps.add((emp_id, w_name))

    target_m = str(o_date)[:7] if o_date else datetime.date.today().strftime("%Y-%m")
    for e_id, e_name in synced_emps:
        sync_payroll_from_commissions(cur, e_name, target_m)
    return list(synced_emps)


def sync_payroll_from_commissions(cur, emp_name_or_id, target_month=None):
    month = target_month or datetime.date.today().strftime("%Y-%m")
    cur.execute("SELECT id, name, role, salary, type FROM employees WHERE id = %s OR name = %s LIMIT 1;", (emp_name_or_id, emp_name_or_id))
    emp = cur.fetchone()
    if not emp:
        return None

    e_id = emp['id']
    e_name = emp['name']
    e_type = emp.get('type') or 'راتب شهري'

    cur.execute("""
        SELECT 
            COALESCE(SUM(pieces_count), 0) as total_pieces,
            COALESCE(SUM(wage_amount * COALESCE(pieces_count, 1)), 0.0) as total_wages
        FROM tailor_commissions
        WHERE (employee_id = %s OR employee_name = %s)
          AND status = 'Approved'
          AND (
              (order_date IS NOT NULL AND to_char(order_date, 'YYYY-MM') = %s)
              OR (order_date IS NULL AND (completed_at IS NULL OR to_char(completed_at, 'YYYY-MM') = %s))
          );
    """, (e_id, e_name, month, month))
    comm_stats = cur.fetchone() or {'total_pieces': 0, 'total_wages': 0.0}
    tot_pieces = int(comm_stats['total_pieces'])
    tot_wages = float(comm_stats['total_wages'])

    cur.execute("""
        SELECT COALESCE(SUM(amount), 0.0) as total_advances
        FROM payments
        WHERE (party_name = %s OR notes ILIKE %s)
          AND payment_type IN ('Payment', 'سند_صرف')
          AND (payment_no LIKE %s OR notes ILIKE %s OR notes ILIKE %s)
          AND to_char(date, 'YYYY-MM') = %s;
    """, (e_name, f"%{e_name}%", 'PAY-ADV%', '%سلفة%', '%سلف%', month))
    adv_row = cur.fetchone()
    adv_amount = float(adv_row['total_advances']) if adv_row else 0.0

    if e_type == 'بالقطعة':
        b_sal = tot_wages
        allowances = 0.0
    else:
        b_sal = float(emp.get('salary') or 0.0)
        allowances = tot_wages
    net_sal = max(0.0, (b_sal + allowances) - adv_amount)

    cur.execute("SELECT id, status FROM payroll WHERE (employee_id = %s OR employee_name = %s) AND month = %s LIMIT 1;", (e_id, e_name, month))
    existing = cur.fetchone()

    if existing:
        if existing.get('status') != 'تم الصرف ✅':
            cur.execute("""
                UPDATE payroll
                SET pieces_count = %s, basic_salary = %s, allowances = %s,
                    notes = 'تم التحديث التلقائي من أوامر المعمل ✂️'
                WHERE id = %s;
            """, (tot_pieces, b_sal, allowances, existing['id']))
    else:
        p_no = f"PR-{month.replace('-', '')}-{generate_id('P')[-4:]}"
        cur.execute("""
            INSERT INTO payroll (
                id, payroll_no, employee_id, employee_name, month, type,
                pieces_count, basic_salary, allowances, deductions,
                currency, payment_date, status, notes
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                'YER', CURRENT_DATE, 'معلق', 'تم الإنشاء التلقائي من أوامر المعمل ✂️'
            );
        """, (generate_id("PAY"), p_no, e_id, e_name, month, e_type, tot_pieces, b_sal, allowances, adv_amount))
    return {"employee": e_name, "pieces": tot_pieces, "wages": b_sal, "net": net_sal}
