import logging
from .db_pool import (
    get_db_cursor, execute_query, clean_num,
    clean_str, today_str
)

logger = logging.getLogger("LittlePrincesses_PG_FactoryQuery")

STAGE_MAP = {
    'cutting': 'القص والتحضير ✂️',
    'قص': 'القص والتحضير ✂️',
    'sewing': 'مرحلة الخياطة 🪡',
    'خياطة': 'مرحلة الخياطة 🪡',
    'embroidery': 'التطريز والشك ✨',
    'تطريز': 'التطريز والشك ✨',
    'inspection': 'الفحص والتشطيب النهائي 🔍',
    'فحص': 'الفحص والتشطيب النهائي 🔍',
    'تشطيب': 'الفحص والتشطيب النهائي 🔍',
    'ready': 'جاهز للتسليم 📦',
    'جاهز': 'جاهز للتسليم 📦',
    'تسليم': 'جاهز للتسليم 📦'
}

STAGE_PROGRESS = {
    'القص والتحضير ✂️': 20,
    'مرحلة الخياطة 🪡': 40,
    'التطريز والشك ✨': 60,
    'الفحص والتشطيب النهائي 🔍': 80,
    'جاهز للتسليم 📦': 100
}


def _sync_missing_production_orders():
    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                INSERT INTO production_orders (
                    id, production_order_no, order_id, product_id, product_name,
                    child_name, stage, start_date, due_date, progress, status, notes
                )
                SELECT 'PRD-' || o.id, 'PO-' || o.order_no, o.id, o.product_id,
                       COALESCE(p.model_name, 'فستان أميرات'),
                       COALESCE(ch.child_name, 'الأميرة'),
                       CASE 
                           WHEN o.production_status ILIKE '%cut%' THEN 'القص والتحضير ✂️'
                           WHEN o.production_status ILIKE '%sew%' THEN 'مرحلة الخياطة 🪡'
                           WHEN o.production_status ILIKE '%embroid%' THEN 'التطريز والشك ✨'
                           WHEN o.production_status ILIKE '%inspect%' THEN 'الفحص والتشطيب النهائي 🔍'
                           WHEN o.production_status ILIKE '%ready%' THEN 'جاهز للتسليم 📦'
                           ELSE 'القص والتحضير ✂️'
                       END,
                       COALESCE(o.order_date, CURRENT_DATE),
                       COALESCE(o.delivery_date, CURRENT_DATE + 5),
                       CASE 
                           WHEN o.production_status ILIKE '%cut%' THEN 20
                           WHEN o.production_status ILIKE '%sew%' THEN 40
                           WHEN o.production_status ILIKE '%embroid%' THEN 60
                           WHEN o.production_status ILIKE '%inspect%' THEN 80
                           WHEN o.production_status ILIKE '%ready%' THEN 100
                           ELSE 20
                       END,
                       CASE WHEN o.production_status ILIKE '%ready%' THEN 'Completed' ELSE 'In Progress' END,
                       COALESCE(o.notes, 'تفصيل وتطريز فاخر')
                FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN children ch ON o.child_id = ch.id
                WHERE NOT EXISTS (
                    SELECT 1 FROM production_orders po
                    WHERE po.order_id = o.id OR po.production_order_no = 'PO-' || o.order_no
                );
            """)
    except Exception as _e:
        logger.warning(f"⚠️ خطأ غير حرج أثناء مزامنة أوامر الإنتاج التلقائية: {_e}")


def _load_employee_phones():
    phones = {}
    try:
        rows = execute_query("SELECT id, name, phone FROM employees", fetch_all=True) or []
        for er in rows:
            if er.get('name'):
                phones[er['name'].strip()] = er.get('phone') or ''
            if er.get('id'):
                phones[er['id'].strip()] = er.get('phone') or ''
    except Exception:
        pass
    return phones


def _format_factory_row(r, emp_phones):
    d = dict(r)
    for k in ['created_at', 'updated_at', 'start_date', 'due_date',
              'cutting_due_date', 'sewing_due_date', 'embroidery_due_date',
              'finishing_due_date', 'tailor_completed_at']:
        if d.get(k):
            d[k] = str(d[k])

    d['order_no'] = d.get('order_id') or d.get('production_order_no') or d.get('id')
    c_name = d.get('customer_name') or ''
    ch_name = d.get('child_name') or ''
    notes_str = d.get('notes') or ''

    if 'للطفلة ' in notes_str and (not ch_name or ch_name == 'الأميرة'):
        try:
            ext_ch = notes_str.split('للطفلة ')[1].split('(')[0].split(' - ')[0].split(')')[0].strip()
            if ext_ch:
                ch_name = ext_ch
        except Exception:
            pass

    d['customer_name'] = c_name
    d['child_name'] = ch_name
    d['customer'] = c_name
    d['product'] = d.get('product_name') or ''
    d['quantity'] = float(d.get('quantity') or 1.0)

    tailor = d.get('assigned_tailor_id') or ''
    if not tailor and 'الخياط:' in notes_str:
        parts = notes_str.split('الخياط:')
        if len(parts) > 1:
            tailor = parts[1].split('|')[0].strip()
    if not tailor:
        tailor = 'المعلم سليم (خياط أول)'
    d['tailor'] = tailor

    t_phone = emp_phones.get(tailor.strip()) or ''
    if not t_phone:
        for ename, ephone in emp_phones.items():
            if ename in tailor or tailor in ename:
                t_phone = ephone
                break
    d['tailor_phone'] = t_phone

    d['tailor_wage'] = float(d.get('tailor_wage') or 0.0)
    d['tailor_status'] = d.get('tailor_status') or 'pending'
    d['is_on_time'] = bool(d.get('is_on_time', True))
    d['quality_score'] = float(d['quality_score']) if d.get('quality_score') is not None else None
    d['quality_notes'] = d.get('quality_notes') or ''
    d['wage_credited'] = bool(d.get('wage_credited', False))
    d['fabric_name'] = d.get('fabric_name') or ''
    d['cut_meters'] = float(d.get('cut_meters') or 0.0)
    d['cut_unit'] = d.get('cut_unit') or 'متر'

    d['cutter_name'] = d.get('cutter_name') or ''
    d['cutter_wage'] = float(d.get('cutter_wage') or 0.0)
    d['tailor_name'] = d.get('tailor_name') or tailor or ''
    d['embroiderer_name'] = d.get('embroiderer_name') or ''
    d['embroiderer_wage'] = float(d.get('embroiderer_wage') or 0.0)
    d['finisher_name'] = d.get('finisher_name') or ''
    d['finisher_wage'] = float(d.get('finisher_wage') or 0.0)
    d['pieces_count'] = int(d.get('pieces_count') or d.get('quantity') or 1)
    d['size_code'] = d.get('size_code') or ''
    d['product_image'] = d.get('product_image') or ''
    d['production_type'] = d.get('production_type') or (
        'ready_to_wear' if (d.get('production_type') == 'ready_to_wear' or 'إنتاج مخزني' in ch_name or 'RTW-' in str(d.get('order_no') or '')) else 'bespoke'
    )

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
        SELECT po.*, 
               COALESCE(c.name, '') as customer_name,
               COALESCE(c.phone, '') as customer_phone,
               COALESCE(p.model_name, po.product_name, 'موديل راقي') as product_name,
               COALESCE(p.image_url, '') as product_image,
               COALESCE(
                   NULLIF(po.child_name, ''), 
                   ch.child_name, 
                   (SELECT m.child_name FROM measurements m WHERE m.child_id = o.child_id LIMIT 1),
                   (SELECT m.child_name FROM measurements m WHERE m.customer_id = o.customer_id AND m.model_name = p.model_name LIMIT 1),
                   (SELECT m.child_name FROM measurements m WHERE m.customer_id = o.customer_id ORDER BY m.created_at DESC LIMIT 1),
                   (SELECT ch2.child_name FROM children ch2 WHERE ch2.customer_id = o.customer_id ORDER BY ch2.created_at DESC LIMIT 1),
                   'الأميرة'
               ) as child_name,
               COALESCE(po.due_date, o.delivery_date) as due_date,
               po.start_date,
               COALESCE(o.quantity, 1) as quantity
        FROM production_orders po
        LEFT JOIN orders o ON po.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN products p ON COALESCE(po.product_id, o.product_id) = p.id
        LEFT JOIN children ch ON o.child_id = ch.id
        ORDER BY po.created_at DESC;
    """
    rows = execute_query(query, fetch_all=True)
    if not rows:
        return []

    emp_phones = _load_employee_phones()
    return [_format_factory_row(r, emp_phones) for r in rows]
