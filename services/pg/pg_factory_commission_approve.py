import datetime
import logging
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id

logger = logging.getLogger("LittlePrincesses_PG_FactoryCommissionApprove")

NEXT_STAGE_MAP = {
    'القص والتحضير ✂️': ('مرحلة الخياطة 🪡', 40),
    'مرحلة الخياطة 🪡': ('التطريز والشك ✨', 60),
    'التطريز والشك ✨': ('الفحص والتشطيب النهائي 🔍', 80),
    'الفحص والتشطيب النهائي 🔍': ('جاهز للتسليم 📦', 100)
}


def _resolve_stage_worker(po, cur_stage):
    tailor_name = clean_str(po.get('assigned_tailor_id') or po.get('tailor_name') or 'المعلم سليم (خياط أول)')
    if 'قص' in cur_stage:
        return clean_str(po.get('cutter_name') or tailor_name), clean_num(po.get('cutter_wage') or po.get('tailor_wage') or 0.0), 'فني قص وتفصيل'
    elif 'خياط' in cur_stage:
        return clean_str(po.get('tailor_name') or tailor_name), clean_num(po.get('tailor_wage') or 0.0), 'خياط'
    elif 'تطريز' in cur_stage:
        return clean_str(po.get('embroiderer_name') or tailor_name), clean_num(po.get('embroiderer_wage') or po.get('tailor_wage') or 0.0), 'فني تطريز وشك'
    elif 'تشطيب' in cur_stage or 'فحص' in cur_stage:
        return clean_str(po.get('finisher_name') or tailor_name), clean_num(po.get('finisher_wage') or po.get('tailor_wage') or 0.0), 'فني فحص وتشطيب'
    return tailor_name, clean_num(po.get('tailor_wage') or 0.0), 'فني مشغل'


def approve_tailor_commission_and_qc(payload):
    data = payload.get('data') or payload
    po_id = clean_str(data.get('order_id') or data.get('id') or data.get('production_order_id') or data.get('production_order_no'))
    quality_score = clean_num(data.get('quality_score') or 5.0)
    quality_notes = clean_str(data.get('quality_notes') or 'مطابق لمواصفات ومقاسات الأميرة بجودة ممتازة ⭐')
    approved_by = clean_str(data.get('approved_by') or 'سارة مديرة الورشة ✂️')
    custom_wage = data.get('wage_amount') or data.get('approved_wage')
    advance_stage = bool(data.get('advance_stage', True))

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT po.*, 
                   COALESCE(p.model_name, po.product_name, 'موديل راقي') as product_model_name,
                   o.order_no as raw_order_no
            FROM production_orders po
            LEFT JOIN orders o ON po.order_id = o.id
            LEFT JOIN products p ON COALESCE(po.product_id, o.product_id) = p.id
            WHERE po.id = %s OR po.production_order_no = %s OR po.order_id = %s OR po.production_order_no = 'PO-' || %s OR po.id = 'PRD-' || %s
            LIMIT 1 FOR UPDATE OF po;
        """, (po_id, po_id, po_id, po_id, po_id))
        po = cur.fetchone()
        if not po:
            raise ValueError(f"لم يتم العثور على أمر التشغيل: {po_id}")

        cur_stage = po.get('stage') or 'القص والتحضير ✂️'
        stage_emp_name, stage_wage, stage_role = _resolve_stage_worker(po, cur_stage)
        wage_amount = clean_num(custom_wage) if custom_wage is not None else stage_wage

        cur.execute("SELECT id, name, role FROM employees WHERE id = %s OR name = %s OR name ILIKE %s LIMIT 1;", (stage_emp_name, stage_emp_name, f"%{stage_emp_name}%"))
        emp = cur.fetchone()
        emp_id = emp['id'] if emp else generate_id("EMP")
        emp_name = emp['name'] if emp else stage_emp_name
        emp_role = emp['role'] if emp else stage_role
        is_on_time = bool(po.get('is_on_time', True))
        pieces_count = int(po.get('pieces_count') or 1)
        raw_child = clean_str(po.get('child_name'))
        is_stock = bool(not raw_child or raw_child in ('الأميرة', 'إنتاج مخزني', 'مخزن') or po.get('production_type') == 'stock')
        prod_type = 'stock' if is_stock else 'custom'
        display_child = 'إنتاج مخزني 🏭' if is_stock else (raw_child or 'الأميرة')
        order_date = po.get('start_date') or (po.get('created_at').date() if hasattr(po.get('created_at'), 'date') else None)

        comm_id = generate_id("COMM")
        cur.execute("""
            INSERT INTO tailor_commissions (
                id, production_order_id, order_no, employee_id, employee_name, role,
                product_name, child_name, stage, wage_amount, pieces_count, production_type, order_date,
                completed_at, is_on_time, quality_score, quality_notes, status, approved_by, approved_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s,
                CURRENT_TIMESTAMP, %s, %s, %s, 'Approved', %s, CURRENT_TIMESTAMP
            ) RETURNING *;
        """, (
            comm_id, po['id'], po.get('production_order_no') or po['id'],
            emp_id, emp_name, emp_role,
            po.get('product_model_name') or po.get('product_name'),
            display_child, cur_stage, wage_amount, pieces_count, prod_type, order_date,
            is_on_time, quality_score, quality_notes, approved_by
        ))

        next_stage, next_prog = NEXT_STAGE_MAP.get(cur_stage, ('جاهز للتسليم 📦', 100))
        if not advance_stage:
            next_stage, next_prog = cur_stage, po.get('progress') or 20
        new_status = 'Completed' if next_prog >= 100 else 'In Progress'

        cur.execute("""
            UPDATE production_orders
            SET quality_score = %s, quality_notes = %s, tailor_status = 'approved',
                wage_credited = true, stage = %s, progress = %s, status = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *;
        """, (quality_score, quality_notes, next_stage, next_prog, new_status, po['id']))
        updated_po = cur.fetchone()

        if po.get('order_id'):
            ord_stage_db = 'Ready' if next_prog >= 100 else ('Embroidery' if 'تطريز' in next_stage else 'Sewing')
            cur.execute("UPDATE orders SET production_status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s OR order_no = %s;", (ord_stage_db, po['order_id'], po['order_id']))

        cur_month = datetime.date.today().strftime("%Y-%m")
        if wage_amount > 0:
            cur.execute("""
                UPDATE payroll
                SET allowances = allowances + %s,
                    notes = notes || ' | عمولة تفصيل الطلب ' || %s
                WHERE (employee_id = %s OR employee_name = %s) AND month = %s;
            """, (wage_amount, po.get('production_order_no') or po['id'], emp_id, emp_name, cur_month))

        insp_id = generate_id("INSP")
        today_date = datetime.date.today()
        prod_id = po.get('product_id')
        prod_name = po.get('product_model_name') or po.get('product_name')
        if prod_id:
            cur.execute("SELECT id FROM products WHERE id = %s LIMIT 1;", (prod_id,))
            if not cur.fetchone():
                prod_id = None

        cur.execute("""
            INSERT INTO quality_inspections (
                id, inspection_date, product_id, product_name, production_order_id,
                production_stage, quantity_checked, quantity_passed, quantity_failed,
                inspection_result, inspector_name, notes, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, 'PASS', %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        """, (insp_id, today_date, prod_id, prod_name, po['id'], cur_stage, pieces_count, pieces_count, approved_by, f"تقييم: {quality_score}⭐ | {quality_notes}"))

        res = dict(updated_po)
        for fld in ['start_date', 'due_date', 'cutting_due_date', 'sewing_due_date',
                    'embroidery_due_date', 'finishing_due_date', 'tailor_completed_at',
                    'created_at', 'updated_at']:
            if res.get(fld):
                res[fld] = str(res[fld])
        res.update({
            'commission_id': comm_id,
            'inspection_id': insp_id,
            'wage_amount': wage_amount,
            'employee_name': emp_name,
            'success': True,
            'message': f"تم اعتماد الجودة ({quality_score} ⭐) وتوثيق الفحص في Supabase وترحيل العمولة ({wage_amount} ر.ي) للفني {emp_name} بنجاح 👑"
        })
        return res
