import time
import logging
from .db_pool import get_db_cursor, execute_query, clean_num, clean_str, today_str

logger = logging.getLogger("LittlePrincesses_PG_FactoryQuery")

STAGE_MAP = {
    'cutting': 'القص والتحضير ✂️', 'قص': 'القص والتحضير ✂️', 'sewing': 'مرحلة الخياطة 🪡', 'خياطة': 'مرحلة الخياطة 🪡',
    'embroidery': 'التطريز والشك ✨', 'تطريز': 'التطريز والشك ✨', 'inspection': 'الفحص والتشطيب النهائي 🔍',
    'فحص': 'الفحص والتشطيب النهائي 🔍', 'تشطيب': 'الفحص والتشطيب النهائي 🔍', 'ready': 'جاهز للتسليم 📦', 'جاهز': 'جاهز للتسليم 📦', 'تسليم': 'جاهز للتسليم 📦'
}

STAGE_PROGRESS = {'القص والتحضير ✂️': 20, 'مرحلة الخياطة 🪡': 40, 'التطريز والشك ✨': 60, 'الفحص والتشطيب النهائي 🔍': 80, 'جاهز للتسليم 📦': 100}
_last_factory_sync = time.time()


def _sync_missing_production_orders(force=False):
    global _last_factory_sync
    now = time.time()
    if not force and (now - _last_factory_sync < 3600): return
    _last_factory_sync = now
    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                INSERT INTO production_orders (
                    id, production_order_no, order_id, customer_id, customer_name, product_id, product_name,
                    child_name, stage, start_date, due_date, progress, status, total_amount, deposit_amount, remaining_amount, notes
                )
                SELECT 'PRD-' || o.id, 'PO-' || o.order_no, o.id, o.customer_id, c.name, o.product_id,
                       COALESCE(p.model_name, ''), COALESCE(ch.child_name, ''),
                       CASE 
                           WHEN o.production_status ILIKE '%cut%' THEN 'القص والتحضير ✂️'
                           WHEN o.production_status ILIKE '%sew%' THEN 'مرحلة الخياطة 🪡'
                           WHEN o.production_status ILIKE '%embroid%' THEN 'التطريز والشك ✨'
                           WHEN o.production_status ILIKE '%inspect%' THEN 'الفحص والتشطيب النهائي 🔍'
                           WHEN o.production_status ILIKE '%ready%' THEN 'جاهز للتسليم 📦'
                           ELSE 'القص والتحضير ✂️'
                       END,
                       COALESCE(o.order_date, CURRENT_DATE), COALESCE(o.delivery_date, CURRENT_DATE + 5),
                       CASE 
                           WHEN o.production_status ILIKE '%cut%' THEN 20
                           WHEN o.production_status ILIKE '%sew%' THEN 40
                           WHEN o.production_status ILIKE '%embroid%' THEN 60
                           WHEN o.production_status ILIKE '%inspect%' THEN 80
                           WHEN o.production_status ILIKE '%ready%' THEN 100
                           ELSE 20
                       END,
                       CASE WHEN o.production_status ILIKE '%ready%' THEN 'Completed' ELSE 'In Progress' END,
                       COALESCE(o.total_amount, 0), COALESCE(o.paid_amount, 0), GREATEST(0, COALESCE(o.total_amount, 0) - COALESCE(o.paid_amount, 0)),
                       COALESCE(o.notes, '')
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN children ch ON o.child_id = ch.id
                WHERE (c.name IS NULL OR (c.name NOT LIKE '%تجربة%' AND c.name != 'Test Cust'))
                  AND COALESCE(o.status, '') NOT IN ('delivered', 'Delivered', 'مسلّم', 'تم التسليم', 'تم التسليم ✅', 'Completed', 'مكتمل', 'cancelled', 'ملغي')
                  AND COALESCE(o.production_status, '') NOT IN ('Delivered', 'delivered', 'مسلّم', 'تم التسليم', 'تم التسليم ✅', 'Completed', 'مكتمل')
                  AND NOT EXISTS (
                    SELECT 1 FROM production_orders po
                    WHERE po.order_id = o.id OR po.production_order_no = 'PO-' || o.order_no
                );
            """)
    except Exception as _e:
        logger.warning(f"⚠️ خطأ غير حرج أثناء مزامنة أوامر الإنتاج التلقائية: {_e}")


_emp_cache = None


def _load_employee_lookup():
    global _emp_cache
    if _emp_cache: return _emp_cache
    phones, names = {}, {}
    try:
        rows = execute_query("SELECT id, name, phone FROM employees", fetch_all=True) or []
        for er in rows:
            nm, eid, ph = clean_str(er.get('name')), clean_str(er.get('id')), er.get('phone') or ''
            if nm: phones[nm], names[nm] = ph, nm
            if eid: phones[eid], names[eid] = ph, nm
    except Exception: pass
    _emp_cache = (phones, names)
    return phones, names


def _format_factory_row(r, emp_phones, emp_names):
    d = dict(r)
    for k in ['created_at', 'updated_at', 'start_date', 'due_date', 'cutting_due_date', 'sewing_due_date', 'embroidery_due_date', 'finishing_due_date', 'tailor_completed_at']:
        if d.get(k): d[k] = str(d[k])

    d['order_no'] = clean_str(d.get('ord_order_no') or d.get('readable_order_no') or d.get('order_id') or d.get('production_order_no') or d.get('id'))
    c_name, ch_name, notes_str = d.get('customer_name') or '', d.get('child_name') or '', d.get('notes') or ''

    if 'للطفلة ' in notes_str and not ch_name:
        try:
            ext_ch = notes_str.split('للطفلة ')[1].split('(')[0].split(' - ')[0].split(')')[0].strip()
            if ext_ch: ch_name = ext_ch
        except Exception: pass

    d['customer_name'] = d.get('customer_name') or c_name
    d['child_name'] = ch_name
    d['customer'] = d['customer_name']
    d['product'] = d.get('product_name') or ''
    d['quantity'] = float(d.get('quantity') or 1.0)
    d['measurement_notes'] = clean_str(d.get('measurement_notes') or (notes_str if 'تنبيه' in notes_str else ''))

    tailor = d.get('assigned_tailor_id') or ''
    if not tailor and 'الخياط:' in notes_str:
        parts = notes_str.split('الخياط:')
        if len(parts) > 1: tailor = parts[1].split('|')[0].strip()
    d['tailor'] = tailor
    d['tailor_name'] = d.get('resolved_tailor_name') or emp_names.get(clean_str(d.get('tailor_name'))) or tailor or ''
    d['tailor_phone'] = d.get('resolved_tailor_phone') or emp_phones.get(tailor.strip()) or ''
    d['tailor_wage'] = float(d.get('tailor_wage') or 0.0)
    d['tailor_status'] = d.get('tailor_status') or 'pending'
    d['is_on_time'] = bool(d.get('is_on_time', True))
    d['quality_score'] = float(d['quality_score']) if d.get('quality_score') is not None else None
    d['quality_notes'] = d.get('quality_notes') or ''
    d['wage_credited'] = bool(d.get('wage_credited', False))
    d['fabric_name'] = d.get('fabric_name') or ''
    d['cut_meters'] = float(d.get('cut_meters') or 0.0)
    d['cut_unit'] = d.get('cut_unit') or 'متر'

    d['cutter_name'], d['cutter_wage'] = d.get('cutter_name') or '', float(d.get('cutter_wage') or 0.0)
    d['embroiderer_name'], d['embroiderer_wage'] = d.get('embroiderer_name') or '', float(d.get('embroiderer_wage') or 0.0)
    d['finisher_name'], d['finisher_wage'] = d.get('finisher_name') or '', float(d.get('finisher_wage') or 0.0)
    d['packager_name'], d['packager_wage'], d['packager_id'] = d.get('packager_name') or '', float(d.get('packager_wage') or 0.0), d.get('packager_id') or ''
    d['total_amount'], d['deposit_amount'], d['remaining_amount'] = float(d.get('total_amount') or 0.0), float(d.get('deposit_amount') or 0.0), float(d.get('remaining_amount') or 0.0)
    d['delivery_fee'], d['delivery_payment_mode'] = float(d.get('delivery_fee') or 0.0), d.get('delivery_payment_mode') or 'DIRECT_TO_COURIER'
    raw_fd = d.get('fabrics_data')
    if isinstance(raw_fd, str):
        try: raw_fd = json.loads(raw_fd)
        except Exception: raw_fd = []
    d['fabrics_data'] = raw_fd if isinstance(raw_fd, list) else []
    raw_ms = d.get('measurements_spec')
    if isinstance(raw_ms, str):
        try: raw_ms = json.loads(raw_ms)
        except Exception: raw_ms = {}
    d['measurements_spec'] = raw_ms if isinstance(raw_ms, (dict, list)) else {}
    d['pieces_count'] = int(d.get('pieces_count') or d.get('quantity') or 1)
    d['size_code'] = d.get('size_code') or ''
    d['product_image'] = d.get('product_image') or d.get('model_image') or ''
    d['dress_color'] = d.get('dress_color') or d.get('selected_color') or d.get('color') or ''
    d['selected_color'] = d['dress_color']
    d['color'] = d['dress_color']
    d['production_type'] = d.get('production_type') or ('ready_to_wear' if (d.get('production_type') == 'ready_to_wear' or 'إنتاج مخزني' in ch_name or 'RTW-' in str(d.get('order_no') or '')) else 'bespoke')

    raw_stage = str(d.get('stage') or 'القص والتحضير ✂️')
    norm_stage = raw_stage
    for k, v in STAGE_MAP.items():
        if k in raw_stage.lower():
            norm_stage = v
            break
    d['stage'] = norm_stage
    d['progress'] = int(float(d.get('progress') or STAGE_PROGRESS.get(norm_stage, 20)))
    return d


def get_factory(params=None):
    _sync_missing_production_orders()

    query = """
        WITH latest_meas AS (
            SELECT DISTINCT ON (customer_id) customer_id, child_name, notes
            FROM measurements ORDER BY customer_id, created_at DESC
        )
        SELECT po.id, po.production_order_no, po.order_id, po.product_id, po.product_name, po.child_name,
               po.stage, po.assigned_tailor_id, po.start_date, po.due_date, po.progress, po.status, po.notes,
               po.cutting_due_date, po.sewing_due_date, po.embroidery_due_date, po.finishing_due_date, po.packaging_due_date,
               po.tailor_wage, po.tailor_status, po.tailor_completed_at, po.is_on_time, po.quality_score, po.quality_notes,
               po.wage_credited, po.fabric_name, po.cut_meters, po.cut_unit, po.pieces_count, po.production_type,
               po.cutter_name, po.cutter_wage, po.tailor_name, po.embroiderer_name, po.embroiderer_wage,
               po.finisher_name, po.finisher_wage, po.packager_name, po.packager_wage, po.packager_id, po.size_code,
               (po.measurements_spec - 'model_img' - 'model_image' - 'image_url') as measurements_spec,
               COALESCE(o.order_no, po.order_id, po.production_order_no) as readable_order_no,
               o.order_no as ord_order_no,
               COALESCE(o.delivery_fee, 0) as delivery_fee,
               COALESCE(o.delivery_payment_mode, 'DIRECT_TO_COURIER') as delivery_payment_mode,
               COALESCE(NULLIF(po.fabrics_data, '[]'::jsonb), o.fabrics_data, '[]'::jsonb) as fabrics_data,
               COALESCE(NULLIF(po.customer_name, ''), c.name, '') as customer_name,
               COALESCE(c.phone, '') as customer_phone,
               COALESCE(p.model_name, po.product_name, '') as product_name,
               CASE WHEN length(COALESCE(po.product_image, po.model_image, p.image_url, '')) > 500 THEN ''
                    ELSE COALESCE(po.product_image, po.model_image, p.image_url, '')
               END as product_image,
               COALESCE(po.dress_color, o.dress_color, po.selected_color, po.color, '') as dress_color,
               COALESCE(po.dress_color, o.dress_color, po.selected_color, po.color, '') as selected_color,
               COALESCE(po.dress_color, o.dress_color, po.selected_color, po.color, '') as color,
               COALESCE(po.model_id, po.product_id, '') as model_id,
               COALESCE(NULLIF(po.child_name, ''), ch.child_name, lm.child_name, '') as child_name,
               CASE WHEN o.id IS NOT NULL THEN COALESCE(o.total_amount, 0) ELSE COALESCE(po.total_amount, 0) END as total_amount,
               CASE WHEN o.id IS NOT NULL THEN COALESCE(o.paid_amount, 0) ELSE COALESCE(po.deposit_amount, 0) END as deposit_amount,
               CASE WHEN o.id IS NOT NULL THEN GREATEST(0, COALESCE(o.total_amount, 0) - COALESCE(o.paid_amount, 0)) ELSE COALESCE(po.remaining_amount, 0) END as remaining_amount,
               COALESCE(po.due_date, o.delivery_date) as due_date,
               po.start_date,
               COALESCE(o.quantity, 1) as quantity,
               COALESCE(lm.notes, po.notes, '') as measurement_notes,
               e.name as resolved_tailor_name, e.phone as resolved_tailor_phone
        FROM production_orders po
        LEFT JOIN orders o ON po.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN products p ON COALESCE(po.product_id, o.product_id) = p.id
        LEFT JOIN children ch ON o.child_id = ch.id
        LEFT JOIN latest_meas lm ON o.customer_id = lm.customer_id
        LEFT JOIN employees e ON po.assigned_tailor_id = e.id
        WHERE (po.order_id IS NOT NULL OR po.production_type = 'ready_to_wear')
          AND (c.name IS NULL OR (c.name NOT LIKE '%تجربة%' AND c.name != 'Test Cust'))
          AND COALESCE(o.status, '') NOT IN ('delivered', 'Delivered', 'مسلّم', 'تم التسليم', 'تم التسليم ✅', 'Completed', 'مكتمل', 'cancelled', 'ملغي')
          AND COALESCE(o.production_status, '') NOT IN ('Delivered', 'delivered', 'مسلّم', 'تم التسليم', 'تم التسليم ✅', 'Completed', 'مكتمل')
          AND COALESCE(po.stage, '') NOT ILIKE '%تم التسليم%'
          AND COALESCE(po.status, '') NOT IN ('Delivered', 'delivered', 'مسلّم')
        ORDER BY po.created_at DESC;
    """
    rows = execute_query(query, fetch_all=True)
    if not rows:
        return []

    emp_phones, emp_names = _load_employee_lookup()
    return [_format_factory_row(r, emp_phones, emp_names) for r in rows]
