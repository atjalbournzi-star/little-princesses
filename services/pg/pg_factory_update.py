import json
import logging
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id, today_str
from .pg_factory_fabric import deduct_fabric, deduct_fabrics_batch, ensure_valid_product
from .pg_factory_stage_sync import sync_production_order_commissions
from .pg_tailoring_engine import guard_production_order_ready_for_work

logger = logging.getLogger("LittlePrincesses_PG_FactoryUpdate")

ORDER_STAGE_MAP = {
    'القص والتحضير': 'Cutting', 'مرحلة الخياطة': 'Sewing', 'التطريز والشك': 'Embroidery',
    'الفحص والتشطيب النهائي': 'Inspection', 'جاهز للتسليم': 'Ready', 'قيد القص': 'Cutting',
    'قيد الخياطة': 'Sewing', 'الفحص والتشطيب': 'Inspection', 'تم التسليم': 'Delivered'
}


def update_factory(payload):
    data = payload.get('data') or payload
    po_id, order_no_in = clean_str(data.get('id') or data.get('production_order_no') or data.get('order_no')), clean_str(data.get('order_no') or data.get('order_id'))
    stage = clean_str(data.get('stage') or 'القص والتحضير').replace('✂️','').replace('🪡','').replace('✨','').replace('🔍','').replace('📦','').replace('🛍️','').replace('✅','').strip()
    progress, tailor = clean_num(data.get('progress') or 20), clean_str(data.get('tailor') or '')
    start_date, due_date, full_notes = clean_str(data.get('start_date')) or None, clean_str(data.get('due_date')) or None, clean_str(data.get('notes') or '')
    p_name, p_id, ch_name = clean_str(data.get('product_name') or data.get('product') or ''), clean_str(data.get('product_id') or ''), clean_str(data.get('child_name') or '')
    c_name, c_id, qty = clean_str(data.get('customer_name') or data.get('customer') or ''), clean_str(data.get('customer_id') or ''), clean_num(data.get('quantity') or 1.0)
    cutter_name, cutter_wage = clean_str(data.get('cutter_name') or data.get('cutterName') or ''), clean_num(data.get('cutter_wage') or data.get('cutterWage') or 0.0)
    tailor_name, tailor_wage = clean_str(data.get('tailor_name') or data.get('tailorName') or tailor or ''), clean_num(data.get('tailor_wage') or data.get('tailorWage') or 0.0)
    emb_name, emb_wage, fin_name, fin_wage = clean_str(data.get('embroiderer_name') or data.get('embroidererName') or ''), clean_num(data.get('embroiderer_wage') or data.get('embroidererWage') or 0.0), clean_str(data.get('finisher_name') or data.get('finisherName') or ''), clean_num(data.get('finisher_wage') or data.get('finisherWage') or 0.0)
    pkg_name, pkg_wage, pkg_date = clean_str(data.get('packager_name') or data.get('packagerName') or ''), clean_num(data.get('packager_wage') or data.get('packagerWage') or 0.0), clean_str(data.get('packaging_due_date')) or None
    tot_amt, dep_amt = clean_num(data.get('total_amount') or 0.0), clean_num(data.get('deposit_amount') or data.get('paid_amount') or 0.0)
    rem_amt, pieces_count = clean_num(data.get('remaining_amount') or (tot_amt - dep_amt if tot_amt > 0 else 0.0)), int(clean_num(data.get('pieces_count') or data.get('piecesCount') or qty or 1))
    prod_type, size_code = clean_str(data.get('production_type') or data.get('productionType') or ''), clean_str(data.get('size_code') or data.get('standard_size') or '')
    dress_color = clean_str(data.get('dress_color') or data.get('selected_color') or data.get('color') or '')
    tailor_status, q_score, q_notes = clean_str(data.get('tailor_status') or ''), data.get('quality_score'), clean_str(data.get('quality_notes') or '')
    fabric_name, fabric_id, cut_qty, cut_unit = clean_str(data.get('fabric_name') or data.get('fabric') or ''), clean_str(data.get('fabric_id') or ''), clean_num(data.get('cut_meters') or data.get('cut_quantity') or data.get('meters') or 0.0), clean_str(data.get('cut_unit') or data.get('unit') or 'متر')
    target_wh, deduct_inv = clean_str(data.get('warehouse_id') or data.get('warehouse') or ''), (str(data.get('deduct_inventory', 'true')).lower() in ('true', '1', 'yes'))
    t_disp = tailor_name or tailor
    if t_disp and 'الخياط:' not in full_notes: full_notes = f"الخياط: {t_disp} | {full_notes}".strip(" |")
    db_order_status = ORDER_STAGE_MAP.get(stage, 'Sewing')
    po_status = 'Completed' if (progress >= 100 or 'جاهز' in stage or 'تسليم' in stage) else 'In Progress'
    raw_fabrics = data.get('bom_items') or data.get('materials') or data.get('bom') or data.get('fabrics') or data.get('fabrics_data') or []
    fabrics_list = raw_fabrics['items'] if (isinstance(raw_fabrics, dict) and isinstance(raw_fabrics.get('items'), list)) else (raw_fabrics if isinstance(raw_fabrics, list) else [])
    fabrics_json = json.dumps(fabrics_list, ensure_ascii=False) if fabrics_list else None
    meas_spec = data.get('measurements_spec') or data.get('measurements')
    if isinstance(meas_spec, dict):
        meas_spec = {k: v for k, v in meas_spec.items() if k not in ('model_img', 'model_image', 'image_url') or not (isinstance(v, str) and (v.startswith('data:image') or len(v) > 500))}
    meas_json, raw_uid, deductions_count = (json.dumps(meas_spec, ensure_ascii=False) if isinstance(meas_spec, (dict, list)) else None), (clean_str(data.get('user_id') or data.get('created_by')) or 'admin'), 0
    with get_db_cursor(commit=True) as cur:
        target_ord = order_no_in or po_id
        ord_ctx = None
        ord_base_sql = "SELECT o.id as ord_id, o.order_no, o.customer_id, o.child_id, c.name as real_cname, ch.child_name as real_chname, o.delivery_date as ord_due, o.total_amount as ord_tot, o.paid_amount as ord_pd, po.size_code as ord_size, o.fabrics_data as ord_fabs, po.measurements_spec as ord_meas FROM orders o LEFT JOIN production_orders po ON (po.order_id = o.id OR po.production_order_no = 'PO-' || o.order_no) LEFT JOIN customers c ON o.customer_id = c.id LEFT JOIN children ch ON o.child_id = ch.id"
        if target_ord:
            cur.execute(ord_base_sql + " WHERE o.id = %s OR o.order_no = %s LIMIT 1;", (target_ord, target_ord))
            ord_ctx = cur.fetchone()
        if not ord_ctx and (c_id or c_name):
            cur.execute(ord_base_sql + " WHERE (o.customer_id = %s OR c.name = %s OR c.name ILIKE %s) AND COALESCE(o.status, '') NOT IN ('delivered', 'cancelled') ORDER BY o.created_at DESC LIMIT 1;", (c_id, c_name, f"%{c_name}%"))
            ord_ctx = cur.fetchone()
            if ord_ctx: order_no_in = ord_ctx['order_no']
        if prod_type not in ('ready_to_wear', 'stock') and not ord_ctx:
            raise ValueError(f"في وضع التفصيل الخاص، يجب ربط أمر التشغيل برقم طلب رسمي معتمد وموجود في جدول الطلبات ({target_ord or 'فارغ'}).")
        cur.execute("SELECT id, status, sizing_mode FROM production_orders WHERE id = %s OR production_order_no = %s OR order_id = %s LIMIT 1 FOR UPDATE;", (po_id, po_id, (ord_ctx['ord_id'] if ord_ctx else order_no_in)))
        guard_production_order_ready_for_work(cur.fetchone())
        if ord_ctx:
            c_name, ch_name, c_id = ord_ctx.get('real_cname') or c_name, ord_ctx.get('real_chname') or ch_name, ord_ctx.get('customer_id') or c_id
            due_date = str(ord_ctx['ord_due']) if ord_ctx.get('ord_due') and not due_date else due_date
            tot_amt = clean_num(ord_ctx['ord_tot']) if tot_amt <= 0 and ord_ctx.get('ord_tot') else tot_amt
            dep_amt = clean_num(ord_ctx['ord_pd']) if dep_amt <= 0 and ord_ctx.get('ord_pd') else dep_amt
            rem_amt = max(0.0, tot_amt - dep_amt)
            size_code = clean_str(ord_ctx['ord_size']) if not size_code and ord_ctx.get('ord_size') else size_code
            if not fabrics_json and ord_ctx.get('ord_fabs'): fabrics_json = json.dumps(ord_ctx['ord_fabs'], ensure_ascii=False) if isinstance(ord_ctx['ord_fabs'], list) else str(ord_ctx['ord_fabs'])
            if not meas_json and ord_ctx.get('ord_meas'): meas_json = json.dumps(ord_ctx['ord_meas'], ensure_ascii=False) if isinstance(ord_ctx['ord_meas'], dict) else str(ord_ctx['ord_meas'])
        if prod_type not in ('ready_to_wear', 'stock') and ord_ctx:
            if dep_amt <= 0.0 and clean_num(ord_ctx.get('ord_pd') or 0.0) <= 0.0:
                if not (data.get('allow_unpaid_exception') or data.get('admin_override')):
                    raise ValueError("⚠️ قفل رقابي: لا يمكن اعتماد أمر التشغيل واقتطاع الخامات لطلب غير مسدد (المدفوع = 0) إلا بتفعيل استثناء إداري صريح.")
                exc_note = "[استثناء إداري: تشغيل طلب غير مسدد]"
                if exc_note not in full_notes: full_notes = f"{exc_note} | {full_notes}".strip(" |")
        if deduct_inv:
            if fabrics_list and len(fabrics_list) > 0:
                f_infos = deduct_fabrics_batch(cur, fabrics_list, order_no_in or po_id, c_name, ch_name, warehouse_id=target_wh, created_by=raw_uid)
                deductions_count = len(f_infos)
                for f_info in f_infos:
                    if f_info and f_info not in full_notes: full_notes = f"{full_notes} | {f_info}".strip(" |")
            elif cut_qty > 0:
                f_info = deduct_fabric(cur, fabric_id, fabric_name, cut_qty, cut_unit, order_no_in or po_id, c_name, ch_name, warehouse_id=target_wh, created_by=raw_uid)
                if f_info:
                    deductions_count = 1
                    if f_info not in full_notes: full_notes = f"{full_notes} | {f_info}".strip(" |")

        if (p_id or p_name) and (cutter_wage == 0 or tailor_wage == 0 or emb_wage == 0 or fin_wage == 0 or pkg_wage == 0 or not fabrics_list):
            cur.execute("SELECT bom, labor_cost, packaging_cost FROM products WHERE id = %s OR model_name = %s LIMIT 1;", (p_id, p_name))
            p_row = cur.fetchone()
            if p_row:
                p_bom = p_row.get('bom') or {}
                if isinstance(p_bom, str):
                    try: p_bom = json.loads(p_bom)
                    except Exception: p_bom = {}
                bm_meta = (p_bom.get('meta') if isinstance(p_bom, dict) else {}) or {}
                stg = bm_meta.get('stage_wages') or {}
                cutter_wage = cutter_wage or clean_num(stg.get('cutter_wage') or bm_meta.get('cutter_wage') or 0.0)
                tailor_wage, emb_wage = tailor_wage or clean_num(stg.get('tailor_wage') or bm_meta.get('tailor_wage') or 0.0), emb_wage or clean_num(stg.get('embroiderer_wage') or bm_meta.get('embroiderer_wage') or 0.0)
                fin_wage, pkg_wage = fin_wage or clean_num(stg.get('finisher_wage') or bm_meta.get('finisher_wage') or 0.0), pkg_wage or clean_num(stg.get('packager_wage') or stg.get('packaging_cost') or bm_meta.get('packaging_cost') or p_row.get('packaging_cost') or 0.0)
                if not fabrics_list and isinstance(p_bom, dict) and p_bom.get('items'):
                    fabrics_list, fabrics_json = p_bom['items'], json.dumps(p_bom['items'], ensure_ascii=False)

        valid_tailor_uid = None
        if t_disp:
            cur.execute("SELECT id FROM employees WHERE id = %s OR name ILIKE %s OR full_name ILIKE %s LIMIT 1;", (t_disp, f"%{t_disp}%", f"%{t_disp}%"))
            u_row = cur.fetchone()
            if u_row: valid_tailor_uid = u_row['id']
        c_uid, t_uid = clean_str(data.get('cutter_id')) or None, clean_str(data.get('tailor_id')) or valid_tailor_uid
        e_uid, f_uid, p_uid = clean_str(data.get('embroiderer_id')) or None, clean_str(data.get('finisher_id')) or None, clean_str(data.get('packager_id')) or None
        emp_map = [('c', cutter_name, c_uid), ('t', tailor_name or t_disp, t_uid), ('e', emb_name, e_uid), ('f', fin_name, f_uid), ('p', pkg_name, p_uid)]
        for k, nm, uid in emp_map:
            if nm and not uid:
                cur.execute("SELECT id FROM employees WHERE id = %s OR name = %s OR name ILIKE %s OR full_name ILIKE %s LIMIT 1;", (nm, nm, f"%{nm}%", f"%{nm}%"))
                er = cur.fetchone()
                if er:
                    c_uid = er['id'] if k == 'c' else c_uid
                    t_uid = er['id'] if k == 't' else t_uid
                    e_uid = er['id'] if k == 'e' else e_uid
                    f_uid = er['id'] if k == 'f' else f_uid
                    p_uid = er['id'] if k == 'p' else p_uid
        if t_uid:
            cur.execute("SELECT id FROM employees WHERE id = %s;", (t_uid,))
            if not cur.fetchone(): t_uid = None

        po_no_fb = f"PO-{order_no_in}" if order_no_in else po_id
        cur.execute("""
            UPDATE production_orders SET
                stage=%s, progress=%s, notes=%s, start_date=COALESCE(%s, start_date), due_date=COALESCE(%s, due_date), status=%s,
                product_name=COALESCE(NULLIF(%s, ''), product_name), child_name=COALESCE(NULLIF(%s, ''), child_name), customer_name=COALESCE(NULLIF(%s, ''), customer_name), customer_id=COALESCE(NULLIF(%s, ''), customer_id),
                cutter_id=COALESCE(%s, cutter_id), tailor_id=COALESCE(%s, tailor_id), assigned_tailor_id=COALESCE(%s, assigned_tailor_id), embroiderer_id=COALESCE(%s, embroiderer_id), finisher_id=COALESCE(%s, finisher_id), packager_id=COALESCE(%s, packager_id),
                cutting_due_date=COALESCE(%s, cutting_due_date), sewing_due_date=COALESCE(%s, sewing_due_date), embroidery_due_date=COALESCE(%s, embroidery_due_date), finishing_due_date=COALESCE(%s, finishing_due_date), packaging_due_date=COALESCE(%s, packaging_due_date),
                tailor_wage=CASE WHEN %s>=0 THEN %s ELSE tailor_wage END, tailor_status=COALESCE(NULLIF(%s, ''), tailor_status), quality_score=CASE WHEN %s IS NOT NULL THEN %s ELSE quality_score END, quality_notes=CASE WHEN %s!='' THEN %s ELSE quality_notes END,
                fabric_name=COALESCE(NULLIF(%s, ''), fabric_name), cut_meters=CASE WHEN %s>0 THEN %s ELSE cut_meters END, cut_unit=COALESCE(NULLIF(%s, ''), cut_unit), cutter_name=COALESCE(NULLIF(%s, ''), cutter_name), cutter_wage=CASE WHEN %s>=0 THEN %s ELSE cutter_wage END,
                tailor_name=COALESCE(NULLIF(%s, ''), tailor_name), embroiderer_name=COALESCE(NULLIF(%s, ''), embroiderer_name), embroiderer_wage=CASE WHEN %s>=0 THEN %s ELSE embroiderer_wage END, finisher_name=COALESCE(NULLIF(%s, ''), finisher_name), finisher_wage=CASE WHEN %s>=0 THEN %s ELSE finisher_wage END,
                packager_name=COALESCE(NULLIF(%s, ''), packager_name), packager_wage=CASE WHEN %s>=0 THEN %s ELSE packager_wage END, pieces_count=CASE WHEN %s>0 THEN %s ELSE pieces_count END, production_type=COALESCE(NULLIF(%s, ''), production_type), size_code=COALESCE(NULLIF(%s, ''), size_code),
                dress_color=COALESCE(NULLIF(%s, ''), dress_color), selected_color=COALESCE(NULLIF(%s, ''), selected_color), color=COALESCE(NULLIF(%s, ''), color),
                fabrics_data=CASE WHEN %s::jsonb IS NOT NULL AND %s::text != '[]' THEN %s::jsonb ELSE fabrics_data END, measurements_spec=CASE WHEN %s::jsonb IS NOT NULL AND %s::text != '{}' THEN %s::jsonb ELSE measurements_spec END,
                total_amount=CASE WHEN %s>0 THEN %s ELSE total_amount END, deposit_amount=CASE WHEN %s>=0 THEN %s ELSE deposit_amount END, remaining_amount=CASE WHEN %s>=0 THEN %s ELSE remaining_amount END, updated_at=CURRENT_TIMESTAMP
            WHERE id=%s OR production_order_no=%s OR order_id=%s OR order_id=%s OR order_id=%s OR production_order_no=%s
            RETURNING *;
        """, (
            stage, progress, full_notes, start_date, due_date, po_status, p_name, ch_name, c_name, c_id, c_uid, t_uid, t_uid, e_uid, f_uid, p_uid,
            clean_str(data.get('cutting_due_date')) or None, clean_str(data.get('sewing_due_date')) or None, clean_str(data.get('embroidery_due_date')) or None, clean_str(data.get('finishing_due_date')) or None, pkg_date,
            tailor_wage, tailor_wage, tailor_status, q_score, q_score, q_notes, q_notes, fabric_name, cut_qty, cut_qty, cut_unit, cutter_name, cutter_wage, cutter_wage, tailor_name,
            emb_name, emb_wage, emb_wage, fin_name, fin_wage, fin_wage, pkg_name, pkg_wage, pkg_wage, pieces_count, pieces_count, prod_type, size_code,
            dress_color, dress_color, dress_color, fabrics_json, fabrics_json or '[]', fabrics_json, meas_json, meas_json or '{}', meas_json,
            tot_amt, tot_amt, dep_amt, dep_amt, rem_amt, rem_amt, po_id, po_id, po_id, order_no_in, (ord_ctx['ord_id'] if ord_ctx else order_no_in), po_no_fb
        ))
        row = cur.fetchone()

        if not row:
            target_lbl, v_ord_id = order_no_in or po_id, None
            if target_lbl:
                cur.execute("SELECT id FROM orders WHERE id = %s OR order_no = %s LIMIT 1;", (target_lbl, target_lbl))
                m = cur.fetchone()
                v_ord_id = m['id'] if m else None
            v_prod_id = ensure_valid_product(cur, p_id, p_name)
            cur.execute("""
                INSERT INTO production_orders (
                    id, production_order_no, order_id, product_id, product_name, child_name, customer_id, customer_name, assigned_tailor_id, cutter_id, tailor_id, embroiderer_id, finisher_id, packager_id, stage, progress, status, notes,
                    start_date, due_date, cutting_due_date, sewing_due_date, embroidery_due_date, finishing_due_date, packaging_due_date, tailor_wage, tailor_status, fabric_name, cut_meters, cut_unit, cutter_name, cutter_wage, tailor_name,
                    embroiderer_name, embroiderer_wage, finisher_name, finisher_wage, packager_name, packager_wage, pieces_count, production_type, size_code, dress_color, selected_color, color, fabrics_data, measurements_spec, total_amount, deposit_amount, remaining_amount
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s
                ) RETURNING *;
            """, (
                generate_id("PRD"), f"PO-{target_lbl}", v_ord_id, v_prod_id, p_name or '', ch_name or '', c_id, c_name, t_uid or valid_tailor_uid, c_uid, t_uid, e_uid, f_uid, p_uid, stage, progress, po_status, full_notes, start_date or today_str(), due_date,
                clean_str(data.get('cutting_due_date')) or None, clean_str(data.get('sewing_due_date')) or None, clean_str(data.get('embroidery_due_date')) or None, clean_str(data.get('finishing_due_date')) or None, pkg_date,
                tailor_wage, tailor_status or 'pending', fabric_name, cut_qty, cut_unit, cutter_name, cutter_wage, tailor_name, emb_name, emb_wage, fin_name, fin_wage, pkg_name, pkg_wage, pieces_count, prod_type, size_code, dress_color, dress_color, dress_color, fabrics_json, meas_json, tot_amt, dep_amt, rem_amt
            ))
            row = cur.fetchone()

        real_ord = (row.get('order_id') if row else None) or order_no_in or po_id
        if real_ord:
            cur.execute("UPDATE orders SET production_status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s OR order_no = %s;", (db_order_status, real_ord, real_ord))
        if row:
            p_ident, o_ident = row.get('id'), row.get('order_id') or order_no_in
            cur.execute("""
                UPDATE order_stages AS os SET
                    worker_id = COALESCE(v.w_id, os.worker_id),
                    worker_name = COALESCE(NULLIF(v.w_name, ''), os.worker_name),
                    wage = CASE WHEN v.w_wage > 0 THEN v.w_wage ELSE os.wage END,
                    rate = CASE WHEN v.w_wage > 0 THEN v.w_wage ELSE os.rate END,
                    stage_fee = CASE WHEN v.w_wage > 0 THEN v.w_wage ELSE os.stage_fee END,
                    production_order_id = COALESCE(os.production_order_id, %s)
                FROM (VALUES
                    ('القص%%', %s::text, %s::text, %s::numeric),
                    ('الخياط%%', %s::text, %s::text, %s::numeric),
                    ('التطريز%%', %s::text, %s::text, %s::numeric),
                    ('الكي%%', %s::text, %s::text, %s::numeric),
                    ('التشطيب%%', %s::text, %s::text, %s::numeric),
                    ('التغليف%%', %s::text, %s::text, %s::numeric)
                ) AS v(pat, w_id, w_name, w_wage)
                WHERE (os.production_order_id = %s OR os.order_id = %s)
                  AND os.stage_name ILIKE v.pat
                  AND (v.w_name != '' OR v.w_id IS NOT NULL);
            """, (p_ident, c_uid, cutter_name, cutter_wage, t_uid, tailor_name, tailor_wage, e_uid, emb_name, emb_wage, f_uid, fin_name, fin_wage, f_uid, fin_name, fin_wage, p_uid, pkg_name, pkg_wage, p_ident, o_ident))
            sync_production_order_commissions(cur, row)

            res = {k: (str(v) if k in ('created_at', 'updated_at', 'start_date') and v else v) for k, v in dict(row).items()} if row else {"status": "success"}
            res.update({'status': 'success', 'fabric_deducted': cut_qty if cut_qty > 0 else deductions_count, 'deducted_items': deductions_count})
            return res


def delete_factory_order(payload):
    data = payload.get('data') or payload
    po_id = clean_str(data.get('id') or data.get('production_order_no') or data.get('order_no') or data.get('order_id'))
    if not po_id: return {"success": False, "error": "رقم أمر التشغيل مطلوب للحذف"}
    with get_db_cursor(commit=True) as cur:
        for q in ("DELETE FROM production_orders WHERE id=%s OR production_order_no=%s OR order_id=%s OR id='PRD-'||%s OR production_order_no='PO-'||%s RETURNING id;",
                  "DELETE FROM tailor_commissions WHERE (production_order_id=%s OR order_no=%s OR production_order_id='PRD-'||%s OR order_no='PO-'||%s) AND status != 'Paid';"):
            cur.execute(q, (po_id, po_id, po_id, po_id, po_id))
    return {"success": True, "message": f"تم حذف أمر التشغيل {po_id} بنجاح من سوبابيز 🗑️"}
