import datetime
import logging
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id

logger = logging.getLogger("LittlePrincesses_PG_FactoryQC")


def submit_tailor_stage_completion(payload):
    data = payload.get('data') or payload
    po_id = clean_str(data.get('order_id') or data.get('id') or data.get('production_order_no'))
    tailor_notes = clean_str(data.get('notes') or data.get('tailor_notes') or '')

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT * FROM production_orders 
            WHERE id = %s OR production_order_no = %s OR order_id = %s OR production_order_no = 'PO-' || %s OR id = 'PRD-' || %s
            LIMIT 1 FOR UPDATE;
        """, (po_id, po_id, po_id, po_id, po_id))
        po = cur.fetchone()
        if not po:
            raise ValueError(f"لم يتم العثور على أمر التشغيل: {po_id}")

        cur_stage = po.get('stage') or 'القص والتحضير ✂️'
        if 'قص' in cur_stage:
            target_deadline = po.get('cutting_due_date') or po.get('due_date')
        elif 'خياط' in cur_stage:
            target_deadline = po.get('sewing_due_date') or po.get('due_date')
        elif 'تطريز' in cur_stage:
            target_deadline = po.get('embroidery_due_date') or po.get('due_date')
        elif 'تشطيب' in cur_stage or 'فحص' in cur_stage:
            target_deadline = po.get('finishing_due_date') or po.get('due_date')
        else:
            target_deadline = po.get('due_date')

        today_dt = datetime.date.today()
        is_on_time = True
        if target_deadline:
            try:
                deadline_dt = target_deadline if isinstance(target_deadline, datetime.date) else datetime.datetime.strptime(str(target_deadline)[:10], "%Y-%m-%d").date()
                is_on_time = (today_dt <= deadline_dt)
            except Exception:
                is_on_time = True

        full_notes = po.get('notes') or ''
        if tailor_notes:
            stamp = f"[إنجاز الخياط {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}: {tailor_notes}]"
            full_notes = f"{full_notes} | {stamp}".strip(" |")

        cur.execute("""
            UPDATE production_orders
            SET tailor_status = 'ready_for_inspection',
                tailor_completed_at = CURRENT_TIMESTAMP,
                is_on_time = %s, notes = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *;
        """, (is_on_time, full_notes, po['id']))
        res = dict(cur.fetchone())

        for fld in ['start_date', 'due_date', 'cutting_due_date', 'sewing_due_date',
                    'embroidery_due_date', 'finishing_due_date', 'tailor_completed_at',
                    'created_at', 'updated_at']:
            if res.get(fld):
                res[fld] = str(res[fld])
        res['is_on_time'] = is_on_time
        res['success'] = True
        res['message'] = "تم رفع إشعار إتمام العمل للمشرف وتوثيق الالتزام بالموعد بنجاح 👏"
        return res


def reject_tailor_job_and_rework(payload):
    data = payload.get('data') or payload
    po_id = clean_str(data.get('order_id') or data.get('id') or data.get('production_order_id'))
    defect_type = clean_str(data.get('defect_type') or 'مقاسات غير مطابقة')
    defect_category = clean_str(data.get('defect_category') or 'معمل وتفصيل')
    severity = clean_str(data.get('severity') or 'Medium')
    root_cause = clean_str(data.get('root_cause') or 'عدم مطابقة مقاسات الأميرة أو عيب في خياطة الفستان')
    corrective_action = clean_str(data.get('corrective_action') or 'إعادة ضبط المقاسات والسحاب ومعالجة العيب المطلوب')
    inspector_name = clean_str(data.get('inspector_name') or data.get('approved_by') or 'سارة مديرة الورشة ✂️')
    rework_cost = clean_num(data.get('rework_cost') or 0.0)
    defect_notes = clean_str(data.get('notes') or data.get('quality_notes') or '')

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT po.*, COALESCE(p.model_name, po.product_name, 'موديل راقي') as product_model_name
            FROM production_orders po
            LEFT JOIN products p ON po.product_id = p.id
            WHERE po.id = %s OR po.production_order_no = %s OR po.order_id = %s
            LIMIT 1 FOR UPDATE OF po;
        """, (po_id, po_id, po_id))
        po = cur.fetchone()
        if not po:
            raise ValueError(f"لم يتم العثور على أمر التشغيل: {po_id}")

        cur_stage = po.get('stage') or 'الفحص والتشطيب النهائي 🔍'
        pieces_count = int(po.get('pieces_count') or 1)
        today_date = datetime.date.today()

        prod_id = po.get('product_id')
        if prod_id:
            cur.execute("SELECT id FROM products WHERE id = %s LIMIT 1;", (prod_id,))
            if not cur.fetchone():
                prod_id = None

        insp_id = generate_id("INSP")
        cur.execute("""
            INSERT INTO quality_inspections (
                id, inspection_date, product_id, product_name, production_order_id,
                production_stage, quantity_checked, quantity_passed, quantity_failed,
                inspection_result, inspector_name, notes, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, 0, %s,
                'FAIL', %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING id;
        """, (
            insp_id, today_date, prod_id, po.get('product_model_name'), po['id'],
            cur_stage, pieces_count, pieces_count,
            inspector_name, f"تم الرفض للتعديل: {defect_type} - {defect_notes}"
        ))

        def_id = generate_id("DEF")
        cur.execute("""
            INSERT INTO quality_defects (
                id, defect_date, inspection_id, product_id, product_name,
                production_order_id, production_stage, defect_type, defect_category,
                severity, affected_quantity, root_cause, corrective_action,
                rework_cost, notes, status, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, 'Open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING *;
        """, (
            def_id, today_date, insp_id, prod_id, po.get('product_model_name'),
            po['id'], cur_stage, defect_type, defect_category,
            severity, pieces_count, root_cause, corrective_action,
            rework_cost, defect_notes
        ))

        cur.execute("""
            UPDATE production_orders
            SET tailor_status = 'rework', wage_credited = false, quality_score = 2.0,
                quality_notes = %s, notes = COALESCE(notes, '') || ' | ' || %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *;
        """, (
            f"مرفوض من الجودة ({defect_type}): {defect_notes}",
            f"⚠️ مطلوب تعديل للخياط ({defect_type})",
            po['id']
        ))
        res = dict(cur.fetchone())

        for fld in ['start_date', 'due_date', 'cutting_due_date', 'sewing_due_date',
                    'embroidery_due_date', 'finishing_due_date', 'tailor_completed_at',
                    'created_at', 'updated_at']:
            if res.get(fld):
                res[fld] = str(res[fld])
        res['defect_id'] = def_id
        res['inspection_id'] = insp_id
        res['success'] = True
        res['message'] = f"تم توثيق العيب ({defect_type}) في سوبابيز وإرجاع الفستان للخياط للتعديل بنجاح ⚠️"
        return res
