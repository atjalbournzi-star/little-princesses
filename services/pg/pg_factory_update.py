import logging
from .db_pool import (
    get_db_cursor, clean_num, clean_str,
    generate_id, today_str
)
from .pg_factory_fabric import deduct_fabric, deduct_fabrics_batch, ensure_valid_product

logger = logging.getLogger("LittlePrincesses_PG_FactoryUpdate")

ORDER_STAGE_MAP = {
    'القص والتحضير ✂️': 'Cutting',
    'مرحلة الخياطة 🪡': 'Sewing',
    'التطريز والشك ✨': 'Embroidery',
    'الفحص والتشطيب النهائي 🔍': 'Inspection',
    'جاهز للتسليم 📦': 'Ready',
    'قيد القص ✂️': 'Cutting',
    'قيد الخياطة 🪡': 'Sewing',
    'الفحص والتشطيب 🔍': 'Inspection',
    'جاهز للتسليم 🛍️': 'Ready',
    'تم التسليم ✅': 'Delivered'
}


def update_factory(payload):
    data = payload.get('data') or payload
    po_id = clean_str(data.get('id') or data.get('production_order_no') or data.get('order_no'))
    order_no_in = clean_str(data.get('order_no') or data.get('order_id'))
    stage = clean_str(data.get('stage') or 'القص والتحضير ✂️')
    progress = clean_num(data.get('progress') or 20)
    tailor = clean_str(data.get('tailor') or '')
    start_date = clean_str(data.get('start_date')) or None
    due_date = clean_str(data.get('due_date')) or None
    full_notes = clean_str(data.get('notes') or '')
    p_name = clean_str(data.get('product_name') or data.get('product') or '')
    p_id = clean_str(data.get('product_id') or '')
    ch_name = clean_str(data.get('child_name') or '')
    c_name = clean_str(data.get('customer_name') or data.get('customer') or '')
    qty = clean_num(data.get('quantity') or 1.0)

    cutter_name = clean_str(data.get('cutter_name') or data.get('cutterName') or '')
    cutter_wage = clean_num(data.get('cutter_wage') or data.get('cutterWage') or 0.0)
    tailor_name = clean_str(data.get('tailor_name') or data.get('tailorName') or tailor or '')
    tailor_wage = clean_num(data.get('tailor_wage') or data.get('tailorWage') or 0.0)
    emb_name = clean_str(data.get('embroiderer_name') or data.get('embroidererName') or '')
    emb_wage = clean_num(data.get('embroiderer_wage') or data.get('embroidererWage') or 0.0)
    fin_name = clean_str(data.get('finisher_name') or data.get('finisherName') or '')
    fin_wage = clean_num(data.get('finisher_wage') or data.get('finisherWage') or 0.0)
    pieces_count = int(clean_num(data.get('pieces_count') or data.get('piecesCount') or qty or 1))
    prod_type = clean_str(data.get('production_type') or data.get('productionType') or '')
    size_code = clean_str(data.get('size_code') or data.get('standard_size') or '')

    tailor_status = clean_str(data.get('tailor_status') or '')
    q_score = data.get('quality_score')
    q_notes = clean_str(data.get('quality_notes') or '')
    fabric_name = clean_str(data.get('fabric_name') or data.get('fabric') or '')
    fabric_id = clean_str(data.get('fabric_id') or '')
    cut_qty = clean_num(data.get('cut_meters') or data.get('cut_quantity') or data.get('meters') or 0.0)
    cut_unit = clean_str(data.get('cut_unit') or data.get('unit') or 'متر')
    deduct_inv_val = data.get('deduct_inventory')
    deduct_inv = True if deduct_inv_val is None else (str(deduct_inv_val).lower() in ('true', '1', 'yes'))

    t_disp = tailor_name or tailor
    if t_disp and 'الخياط:' not in full_notes:
        full_notes = f"الخياط: {t_disp} | {full_notes}".strip(" |")

    db_order_status = ORDER_STAGE_MAP.get(stage, 'Sewing')
    po_status = 'Completed' if (progress >= 100 or 'جاهز' in stage or 'تسليم' in stage) else 'In Progress'

    raw_fabrics = data.get('bom_items') or data.get('materials') or data.get('bom') or data.get('fabrics') or []
    if isinstance(raw_fabrics, dict) and isinstance(raw_fabrics.get('items'), list):
        fabrics_list = raw_fabrics['items']
    elif isinstance(raw_fabrics, list):
        fabrics_list = raw_fabrics
    else:
        fabrics_list = []

    deductions_count = 0
    with get_db_cursor(commit=True) as cur:
        if deduct_inv:
            if fabrics_list and len(fabrics_list) > 0:
                f_infos = deduct_fabrics_batch(cur, fabrics_list, order_no_in or po_id, c_name, ch_name)
                deductions_count = len(f_infos)
                for f_info in f_infos:
                    if f_info and f_info not in full_notes:
                        full_notes = f"{full_notes} | {f_info}".strip(" |")
            elif cut_qty > 0:
                f_info = deduct_fabric(cur, fabric_id, fabric_name, cut_qty, cut_unit, order_no_in or po_id, c_name, ch_name)
                if f_info:
                    deductions_count = 1
                    if f_info not in full_notes:
                        full_notes = f"{full_notes} | {f_info}".strip(" |")

        valid_tailor_uid = None
        if t_disp:
            cur.execute("SELECT id FROM users WHERE id = %s OR full_name ILIKE %s OR username ILIKE %s LIMIT 1;", (t_disp, f"%{t_disp}%", f"%{t_disp}%"))
            u_row = cur.fetchone()
            if u_row:
                valid_tailor_uid = u_row['id']

        po_no_fb = f"PO-{order_no_in}" if order_no_in else po_id
        cur.execute("""
            UPDATE production_orders
            SET stage = %s, progress = %s, notes = %s, start_date = COALESCE(%s, start_date),
                due_date = COALESCE(%s, due_date), status = %s,
                product_name = COALESCE(NULLIF(%s, ''), product_name),
                child_name = COALESCE(NULLIF(%s, ''), child_name),
                assigned_tailor_id = COALESCE(NULLIF(%s, ''), assigned_tailor_id),
                cutting_due_date = COALESCE(%s, cutting_due_date),
                sewing_due_date = COALESCE(%s, sewing_due_date),
                embroidery_due_date = COALESCE(%s, embroidery_due_date),
                finishing_due_date = COALESCE(%s, finishing_due_date),
                tailor_wage = CASE WHEN %s > 0 THEN %s ELSE tailor_wage END,
                tailor_status = COALESCE(NULLIF(%s, ''), tailor_status),
                quality_score = CASE WHEN %s IS NOT NULL THEN %s ELSE quality_score END,
                quality_notes = CASE WHEN %s != '' THEN %s ELSE quality_notes END,
                fabric_name = COALESCE(NULLIF(%s, ''), fabric_name),
                cut_meters = CASE WHEN %s > 0 THEN %s ELSE cut_meters END,
                cut_unit = COALESCE(NULLIF(%s, ''), cut_unit),
                cutter_name = COALESCE(NULLIF(%s, ''), cutter_name),
                cutter_wage = CASE WHEN %s > 0 THEN %s ELSE cutter_wage END,
                tailor_name = COALESCE(NULLIF(%s, ''), tailor_name),
                embroiderer_name = COALESCE(NULLIF(%s, ''), embroiderer_name),
                embroiderer_wage = CASE WHEN %s > 0 THEN %s ELSE embroiderer_wage END,
                finisher_name = COALESCE(NULLIF(%s, ''), finisher_name),
                finisher_wage = CASE WHEN %s > 0 THEN %s ELSE finisher_wage END,
                pieces_count = CASE WHEN %s > 0 THEN %s ELSE pieces_count END,
                production_type = COALESCE(NULLIF(%s, ''), production_type),
                size_code = COALESCE(NULLIF(%s, ''), size_code),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s OR production_order_no = %s OR order_id = %s OR order_id = %s OR production_order_no = %s
            RETURNING *;
        """, (
            stage, progress, full_notes, start_date, due_date, po_status, p_name, ch_name, valid_tailor_uid,
            clean_str(data.get('cutting_due_date')) or None, clean_str(data.get('sewing_due_date')) or None,
            clean_str(data.get('embroidery_due_date')) or None, clean_str(data.get('finishing_due_date')) or None,
            tailor_wage, tailor_wage, tailor_status, q_score, q_score, q_notes, q_notes,
            fabric_name, cut_qty, cut_qty, cut_unit, cutter_name, cutter_wage, cutter_wage, tailor_name,
            emb_name, emb_wage, emb_wage, fin_name, fin_wage, fin_wage, pieces_count, pieces_count,
            prod_type, size_code, po_id, po_id, po_id, order_no_in, po_no_fb
        ))
        row = cur.fetchone()

        if not row:
            target_lbl = order_no_in or po_id
            v_ord_id = None
            if target_lbl:
                cur.execute("SELECT id FROM orders WHERE id = %s OR order_no = %s LIMIT 1;", (target_lbl, target_lbl))
                m = cur.fetchone()
                if m:
                    v_ord_id = m['id']
            v_prod_id = ensure_valid_product(cur, p_id, p_name)

            cur.execute("""
                INSERT INTO production_orders (
                    id, production_order_no, order_id, product_id, product_name, child_name, assigned_tailor_id, 
                    stage, progress, status, notes, start_date, due_date,
                    cutting_due_date, sewing_due_date, embroidery_due_date, finishing_due_date,
                    tailor_wage, tailor_status, fabric_name, cut_meters, cut_unit,
                    cutter_name, cutter_wage, tailor_name, embroiderer_name, embroiderer_wage,
                    finisher_name, finisher_wage, pieces_count, production_type, size_code
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *;
            """, (
                generate_id("PRD"), f"PO-{target_lbl}", v_ord_id, v_prod_id, p_name or 'موديل راقي', ch_name or 'الأميرة', valid_tailor_uid,
                stage, progress, po_status, full_notes, start_date or today_str(), due_date,
                clean_str(data.get('cutting_due_date')) or None, clean_str(data.get('sewing_due_date')) or None,
                clean_str(data.get('embroidery_due_date')) or None, clean_str(data.get('finishing_due_date')) or None,
                tailor_wage, tailor_status or 'pending', fabric_name, cut_qty, cut_unit,
                cutter_name, cutter_wage, tailor_name, emb_name, emb_wage, fin_name, fin_wage, pieces_count, prod_type, size_code
            ))
            row = cur.fetchone()

        real_ord = (row.get('order_id') if row else None) or order_no_in or po_id
        if real_ord:
            cur.execute("UPDATE orders SET production_status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s OR order_no = %s;", (db_order_status, real_ord, real_ord))

        res = dict(row) if row else {"status": "success"}
        for k in ['created_at', 'updated_at', 'start_date']:
            if res.get(k):
                res[k] = str(res[k])
        res['status'] = 'success'
        res['fabric_deducted'] = cut_qty if cut_qty > 0 else deductions_count
        res['deducted_items'] = deductions_count
        return res


def delete_factory_order(payload):
    data = payload.get('data') or payload
    po_id = clean_str(data.get('id') or data.get('production_order_no') or data.get('order_no') or data.get('order_id'))
    if not po_id:
        return {"success": False, "error": "رقم أمر التشغيل مطلوب للحذف"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            DELETE FROM production_orders
            WHERE id = %s OR production_order_no = %s OR order_id = %s 
               OR id = 'PRD-' || %s OR production_order_no = 'PO-' || %s
            RETURNING id;
        """, (po_id, po_id, po_id, po_id, po_id))
        cur.execute("""
            DELETE FROM tailor_commissions
            WHERE (production_order_id = %s OR order_no = %s 
                   OR production_order_id = 'PRD-' || %s OR order_no = 'PO-' || %s)
              AND status != 'Paid';
        """, (po_id, po_id, po_id, po_id))
    return {"success": True, "message": f"تم حذف أمر التشغيل {po_id} بنجاح من سوبابيز 🗑️"}
