import logging
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id
from .pg_accounts import refresh_chart_balances_atomic
from .pg_audit import get_active_user_context, resolve_active_user_id
from .pg_factory_qc import resolve_inspector_name
from .pg_wip_accounting import record_labor_wip_accrual
from .stage_normalizer import normalize_canonical_stage, CANONICAL_STAGE_NAMES

logger = logging.getLogger("LittlePrincesses_PG_FactoryCommissionApprove")

NEXT_STAGE_MAP = {
    'القص والتحضير ✂️': ('مرحلة الخياطة 🪡', 40),
    'مرحلة الخياطة 🪡': ('التطريز والشك ✨', 60),
    'التطريز والشك ✨': ('الفحص والتشطيب النهائي 🔍', 80),
    'الفحص والتشطيب النهائي 🔍': ('جاهز للتسليم 📦', 100)
}


def _resolve_stage_worker(po, cur_stage):
    t_name = clean_str(po.get('assigned_tailor_id') or po.get('tailor_name') or 'المعلم سليم (خياط أول)')
    if 'قص' in cur_stage: return clean_str(po.get('cutter_name') or t_name), clean_num(po.get('cutter_wage') or po.get('tailor_wage') or 0.0), 'فني قص وتفصيل'
    if 'خياط' in cur_stage: return clean_str(po.get('tailor_name') or t_name), clean_num(po.get('tailor_wage') or 0.0), 'خياط'
    if 'تطريز' in cur_stage: return clean_str(po.get('embroiderer_name') or t_name), clean_num(po.get('embroiderer_wage') or po.get('tailor_wage') or 0.0), 'فني تطريز وشك'
    if 'تشطيب' in cur_stage or 'فحص' in cur_stage: return clean_str(po.get('finisher_name') or t_name), clean_num(po.get('finisher_wage') or po.get('tailor_wage') or 0.0), 'فني فحص وتشطيب'
    return t_name, clean_num(po.get('tailor_wage') or 0.0), 'فني مشغل'


def approve_tailor_commission_and_qc(payload):
    data = payload.get('data') or payload
    po_id = clean_str(data.get('order_id') or data.get('id') or data.get('production_order_id') or data.get('production_order_no') or data.get('order_no'))
    order_no = clean_str(data.get('order_no') or data.get('order_id') or po_id)
    quality_score = clean_num(data.get('quality_score') or 5.0)
    quality_notes = clean_str(data.get('quality_notes') or 'مطابق لمواصفات ومقاسات الأميرة بجودة ممتازة ⭐')
    approved_by = resolve_inspector_name(data, prefer_approved_by=True)
    custom_wage = data.get('wage_amount') or data.get('approved_wage')
    advance_stage = bool(data.get('advance_stage', True))

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT po.*, COALESCE(p.model_name, po.product_name, 'موديل راقي') as product_model_name, o.order_no as raw_order_no
            FROM production_orders po
            LEFT JOIN orders o ON po.order_id = o.id
            LEFT JOIN products p ON COALESCE(po.product_id, o.product_id) = p.id
            WHERE po.id = %s OR po.production_order_no = %s OR po.order_id = %s OR po.production_order_no = 'PO-' || %s OR po.id = 'PRD-' || %s
               OR o.order_no = %s OR o.id = %s OR po.production_order_no ILIKE %s
            LIMIT 1 FOR UPDATE OF po;
        """, (po_id, po_id, po_id, po_id, po_id, order_no, po_id, f"%{po_id}%"))
        po = cur.fetchone()
        if not po:
            cur.execute("SELECT * FROM orders WHERE id = %s OR order_no = %s OR order_no ILIKE %s LIMIT 1 FOR UPDATE;", (po_id, order_no, f"%{order_no}%"))
            ord_row = cur.fetchone()
            insp_id, insp_uid = generate_id("INSP"), resolve_active_user_id(cur, get_active_user_context() or approved_by)
            if ord_row:
                cur.execute("UPDATE orders SET production_status = 'Ready', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (ord_row['id'],))
                cur.execute("INSERT INTO quality_inspections (id, inspection_date, product_id, product_name, sku, model_id, color, size, production_stage, quantity_checked, quantity_passed, quantity_failed, inspection_result, inspector_id, inspector_name, notes, created_at, updated_at) VALUES (%s, CURRENT_DATE, %s, %s, %s, %s, %s, '', 'جاهز للتسليم 📦', 1, 1, 0, 'PASS', %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);", (insp_id, ord_row.get('product_id'), 'فستان مفصل', ord_row.get('order_no'), ord_row.get('model_id') or ord_row.get('product_id'), ord_row.get('dress_color') or ord_row.get('selected_color') or '', insp_uid, approved_by, f"تقييم: {quality_score}⭐ | {quality_notes}"))
                return {'success': True, 'order_id': ord_row['id'], 'order_no': ord_row['order_no'], 'production_status': 'Ready', 'quality_status': 'passed', 'message': 'تم اعتماد جودة الفستان بنجاح وتحويله للتسليم'}
            cur.execute("INSERT INTO quality_inspections (id, inspection_date, product_name, sku, production_stage, quantity_checked, quantity_passed, quantity_failed, inspection_result, inspector_id, inspector_name, notes, created_at, updated_at) VALUES (%s, CURRENT_DATE, %s, %s, 'جاهز للتسليم 📦', 1, 1, 0, 'PASS', %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);", (insp_id, f"فستان طلب {order_no}", order_no, insp_uid, approved_by, f"تقييم: {quality_score}⭐ | {quality_notes}"))
            return {'success': True, 'order_id': po_id, 'order_no': order_no, 'production_status': 'Ready', 'quality_status': 'passed', 'message': 'تم اعتماد جودة الفستان بنجاح وتحويله للتسليم'}

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
        display_child = 'إنتاج مخزني 🏭' if is_stock else (raw_child or 'الأميرة')

        clean_cur = cur_stage.replace('✂️','').replace('🪡','').replace('✨','').replace('🔍','').replace('📦','').replace('🛍️','').replace('✅','').strip()
        c_cur_stage = normalize_canonical_stage(cur_stage)
        comm_id = None
        if c_cur_stage:
            cur.execute("""
                SELECT id FROM tailor_commissions 
                WHERE (production_order_id = %s OR order_no = %s) 
                  AND (stage = %s OR stage ILIKE %s) LIMIT 1;
            """, (po['id'], po.get('production_order_no') or po['id'], cur_stage, f"%{clean_cur}%"))
            exist_c = cur.fetchone()
            if exist_c:
                comm_id = exist_c['id']
                cur.execute("UPDATE tailor_commissions SET status = 'Approved', quality_score = %s, quality_notes = %s, approved_by = %s, approved_at = CURRENT_TIMESTAMP WHERE id = %s;", (quality_score, quality_notes, approved_by, comm_id))
            else:
                comm_id = generate_id("COMM")
                cur.execute("""
                    INSERT INTO tailor_commissions (id, production_order_id, order_no, employee_id, employee_name, role, product_name, child_name, stage, wage_amount, pieces_count, production_type, order_date, completed_at, is_on_time, quality_score, quality_notes, status, approved_by, approved_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE, CURRENT_TIMESTAMP, %s, %s, %s, 'Approved', %s, CURRENT_TIMESTAMP);
                """, (comm_id, po['id'], po.get('production_order_no') or po['id'], emp_id, emp_name, emp_role, po.get('product_model_name') or po.get('product_name'), display_child, cur_stage, wage_amount, pieces_count, 'stock' if is_stock else 'custom', is_on_time, quality_score, quality_notes, approved_by))

        next_stage, next_prog = NEXT_STAGE_MAP.get(cur_stage, ('جاهز للتسليم', 100))
        clean_next = next_stage.replace('✂️','').replace('🪡','').replace('✨','').replace('🔍','').replace('📦','').replace('🛍️','').replace('✅','').strip()
        if not advance_stage: clean_next, next_prog = clean_cur, po.get('progress') or 20
        new_status = 'Completed' if next_prog >= 100 else 'In Progress'

        cur.execute("UPDATE production_orders SET quality_score = %s, quality_notes = %s, tailor_status = 'approved', wage_credited = true, stage = %s, progress = %s, status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *;", (quality_score, quality_notes, clean_next, next_prog, new_status, po['id']))
        updated_po = cur.fetchone()

        cur.execute("""
            UPDATE order_stages
            SET qa_status = 'Passed', qa_score = %s, qa_notes = %s, qa_inspected_at = CURRENT_TIMESTAMP, status = 'Completed', completed_at = CURRENT_TIMESTAMP
            WHERE (production_order_id = %s OR order_id = %s) AND (stage_name ILIKE %s OR stage_name ILIKE %s);
        """, (quality_score, quality_notes, po['id'], po.get('order_id'), f"%{clean_cur}%", f"%{cur_stage}%"))

        if po.get('order_id'):
            ord_stage_db = 'Ready' if next_prog >= 100 else ('Embroidery' if 'تطريز' in next_stage else 'Sewing')
            cur.execute("UPDATE orders SET production_status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s OR order_no = %s;", (ord_stage_db, po['order_id'], po['order_id']))

        insp_id, prod_id, prod_name = generate_id("INSP"), po.get('product_id'), (po.get('product_model_name') or po.get('product_name'))
        if prod_id:
            cur.execute("SELECT id FROM products WHERE id = %s LIMIT 1;", (prod_id,))
            if not cur.fetchone(): prod_id = None
        cur.execute("SELECT id FROM users WHERE username = %s OR full_name = %s LIMIT 1;", (approved_by, approved_by))
        u_row = cur.fetchone()
        insp_uid, po_clr = (u_row['id'] if u_row else resolve_active_user_id(cur, get_active_user_context() or approved_by)), (po.get('dress_color') or po.get('selected_color') or po.get('color') or '')
        po_sz, po_sku, po_model = (po.get('size_code') or ''), (po.get('production_order_no') or po['id']), (po.get('model_id') or prod_id or '')
        cur.execute("INSERT INTO quality_inspections (id, inspection_date, product_id, product_name, sku, model_id, color, size, production_order_id, production_stage, quantity_checked, quantity_passed, quantity_failed, inspection_result, inspector_id, inspector_name, notes, created_at, updated_at) VALUES (%s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 'PASS', %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);", (insp_id, prod_id, prod_name, po_sku, po_model, po_clr, po_sz, po['id'], cur_stage, pieces_count, pieces_count, insp_uid, approved_by, f"تقييم: {quality_score}⭐ | {quality_notes}"))

        # عند الوصول لجاهز للتسليم أو اجتياز الفحص: ترحيل استحقاق كافة مراحل وفنيي الطلب آلياً
        if next_prog >= 100 or 'جاهز' in clean_next or 'تسليم' in clean_next:
            auto_credit_all_stages_commissions(cur, po['id'], order_no, po.get('child_name'), quality_score, approved_by)

        refresh_chart_balances_atomic(cur)
        res = dict(updated_po)
        for fld in ['start_date', 'due_date', 'cutting_due_date', 'sewing_due_date', 'embroidery_due_date', 'finishing_due_date', 'tailor_completed_at', 'created_at', 'updated_at']:
            if res.get(fld): res[fld] = str(res[fld])
        res.update({'commission_id': comm_id, 'inspection_id': insp_id, 'wage_amount': wage_amount, 'employee_name': emp_name, 'success': True, 'message': f"تم اعتماد الجودة ({quality_score} ⭐) وتوثيق الفحص وترحيل استحقاق أجور الفنيين بنجاح 👑"})
        return res


def auto_credit_all_stages_commissions(cur, po_id, order_no=None, child_name=None, quality_score=5.0, approved_by=None):
    """ترحيل استحقاق أجور القطعة لكافة الفنيين والمراحل بقيد محاسبي مركب متزن (مدين: 105.05 WIP / دائن: 203 وفق IAS 2)"""
    cur.execute("SELECT * FROM production_orders WHERE id = %s OR production_order_no = %s OR order_id = %s LIMIT 1 FOR UPDATE;", (po_id, po_id, po_id))
    po = cur.fetchone()
    if not po: return
    real_po_id, p_no = po['id'], po.get('production_order_no') or order_no or po['id']
    ord_id = po.get('order_id') or real_po_id
    c_name = child_name or po.get('child_name') or 'الأميرة'
    q_score = clean_num(quality_score or 5.0)
    appr_by = clean_str(approved_by or get_active_user_context() or 'admin')

    workers_map = {}
    stg_defs = [
        (po.get('cutter_name'), clean_num(po.get('cutter_wage') or 0), 'فني قص وتفصيل', 'القص والتحضير ✂️'),
        (po.get('tailor_name'), clean_num(po.get('tailor_wage') or 0), 'خياط', 'مرحلة الخياطة 🪡'),
        (po.get('embroiderer_name'), clean_num(po.get('embroiderer_wage') or 0), 'فني تطريز وشك', 'التطريز والشك ✨'),
        (po.get('finisher_name'), clean_num(po.get('finisher_wage') or 0), 'فني فحص وتشطيب', 'الفحص والتشطيب النهائي 🔍')
    ]
    for w_name, w_wage, w_role, w_stg in stg_defs:
        c_k = normalize_canonical_stage(w_stg)
        if c_k and w_name and w_wage > 0:
            workers_map[c_k] = {'name': w_name, 'wage': w_wage, 'role': w_role, 'stage': CANONICAL_STAGE_NAMES.get(c_k, w_stg)}

    cur.execute("SELECT worker_name, stage_name, wage, rate FROM order_stages WHERE order_id = %s OR production_order_id = %s;", (ord_id, real_po_id))
    for r in cur.fetchall():
        w_nm, w_wg, s_nm = clean_str(r.get('worker_name')), clean_num(r.get('wage') or r.get('rate') or 0.0), clean_str(r.get('stage_name'))
        c_k = normalize_canonical_stage(s_nm)
        if c_k and w_nm and w_wg > 0 and c_k not in workers_map:
            workers_map[c_k] = {'name': w_nm, 'wage': w_wg, 'role': 'فني تشغيل', 'stage': CANONICAL_STAGE_NAMES.get(c_k, s_nm)}

    if not workers_map: return

    cur.execute("SELECT id FROM journal_entries WHERE ref_type = 'ProductionWageAccrual' AND status = 'Posted' AND (ref_id = %s OR ref_id = %s OR notes LIKE %s) LIMIT 1;", (real_po_id, ord_id, f"%{p_no}%"))
    exist_jv = cur.fetchone()

    cur.execute("SELECT id, worker_id, worker_name, stage_id, piece_rate_amount, pieces_count, payment_status, qa_status, paid_at FROM piece_rate_logs WHERE production_order_id IN (%s, %s, %s) FOR UPDATE;", (real_po_id, p_no, ord_id))
    prl_existing = {normalize_canonical_stage(r['stage_id']): r for r in cur.fetchall() if normalize_canonical_stage(r['stage_id'])}

    cur.execute("SELECT id, employee_id, employee_name, stage FROM tailor_commissions WHERE production_order_id = %s OR order_no = %s;", (real_po_id, p_no))
    comm_existing = {normalize_canonical_stage(r['stage']): r for r in cur.fetchall() if normalize_canonical_stage(r['stage'])}

    stg_lines, new_accruals_sum = [], 0.0
    p_cnt_def = max(1, int(clean_num(po.get('pieces_count') or 1)))
    for c_k, w in workers_map.items():
        cur.execute("SELECT id FROM employees WHERE name = %s OR name ILIKE %s LIMIT 1;", (w['name'], f"%{w['name']}%"))
        e_row = cur.fetchone()
        emp_id = e_row['id'] if e_row else generate_id("EMP")
        w_wage = w['wage']

        exist_prl = prl_existing.get(c_k)
        if exist_prl:
            p_stat = clean_str(exist_prl.get('payment_status')).lower()
            if not (bool(exist_prl.get('paid_at')) or p_stat in ('accrued', 'paid')):
                prl_amt = clean_num(exist_prl.get('piece_rate_amount') or 0.0)
                eff_wage = round(prl_amt * max(1, int(clean_num(exist_prl.get('pieces_count') or 1))), 2) if prl_amt > 0 else round(w_wage * p_cnt_def, 2)
                cur.execute("UPDATE piece_rate_logs SET qa_status = 'Passed', payment_status = 'Accrued', piece_rate_amount = CASE WHEN COALESCE(piece_rate_amount, 0) <= 0 THEN %s ELSE piece_rate_amount END, completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP) WHERE id = %s;", (w_wage, exist_prl['id']))
                if eff_wage > 0:
                    new_accruals_sum += eff_wage
                    stg_lines.append((exist_prl.get('worker_id') or emp_id, exist_prl.get('worker_name') or w['name'], eff_wage, w['stage']))
            elif p_stat != 'paid' and not exist_prl.get('paid_at') and clean_str(exist_prl.get('qa_status')).lower() not in ('passed', 'approved'):
                cur.execute("UPDATE piece_rate_logs SET qa_status = 'Passed', completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP) WHERE id = %s;", (exist_prl['id'],))
        else:
            eff_wage = round(w_wage * p_cnt_def, 2)
            cur.execute("INSERT INTO piece_rate_logs (id, worker_id, worker_name, production_order_id, stage_id, piece_rate_amount, pieces_count, payment_status, qa_status, completed_at, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, 'Accrued', 'Passed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);", (generate_id("PRL"), emp_id, w['name'], real_po_id, w['stage'], w_wage, p_cnt_def))
            if eff_wage > 0:
                new_accruals_sum += eff_wage
                stg_lines.append((emp_id, w['name'], eff_wage, w['stage']))

        exist_comm = comm_existing.get(c_k)
        if exist_comm:
            cur.execute("UPDATE tailor_commissions SET status = CASE WHEN status = 'Paid' THEN 'Paid' ELSE 'Approved' END, quality_score = COALESCE(quality_score, %s), approved_by = %s, approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP) WHERE id = %s;", (q_score, appr_by, exist_comm['id']))
        else:
            cur.execute("INSERT INTO tailor_commissions (id, production_order_id, order_no, employee_id, employee_name, role, stage, wage_amount, pieces_count, status, quality_score, approved_by, approved_at, order_date, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, 'Approved', %s, %s, CURRENT_TIMESTAMP, CURRENT_DATE, CURRENT_TIMESTAMP);", (generate_id("COMM"), real_po_id, p_no, emp_id, w['name'], w['role'], w['stage'], w_wage, q_score, appr_by))

    cur.execute("UPDATE order_stages SET qa_status = 'Passed', status = 'Completed', qa_score = %s, completed_at = CURRENT_TIMESTAMP WHERE production_order_id = %s OR order_id = %s;", (q_score, real_po_id, ord_id))

    new_accruals_sum = round(new_accruals_sum, 2)
    if exist_jv or new_accruals_sum <= 0 or not stg_lines:
        logger.info(f"Wage accrual guard for {p_no}: exist_jv={bool(exist_jv)}, new_sum={new_accruals_sum}")
        return

    wip_res = record_labor_wip_accrual(cur, p_no, real_po_id, stg_lines, new_accruals_sum, f"استحقاق ورسملة أجور تشغيل طلب {p_no} ({c_name}) لكافة الفنيين")
    if wip_res:
        logger.info(f"Accrued and capitalized new wages {new_accruals_sum} YER across {len(stg_lines)} stage logs for order {p_no} via {wip_res['entry_no']}")
