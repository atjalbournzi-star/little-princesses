# services/pg/pg_order_stages.py
# Dynamic order stages generation from product model settings and BOM configuration

import json
from .db_pool import clean_str, clean_num, generate_id, execute_query


def resolve_product_stages(cur, product_id, product_name=None):
    """
    استخراج مصفوفة مراحل التصنيع المسجلة فعلياً للموديل المختار
    من جدول products (مصفوفة المراحل أو إعدادات أجور الورشة في BOM)
    """
    p_row = None
    if product_id:
        cur.execute("SELECT id, model_name, bom, labor_cost, packaging_cost FROM products WHERE id = %s OR sku = %s LIMIT 1;", (product_id, product_id))
        p_row = cur.fetchone()
    if not p_row and product_name:
        cur.execute("SELECT id, model_name, bom, labor_cost, packaging_cost FROM products WHERE model_name = %s OR model_name ILIKE %s LIMIT 1;", (product_name, f"%{product_name}%"))
        p_row = cur.fetchone()

    if not p_row:
        # المراحل التشغيلية الخمس الشاملة في حال عدم تحديد الموديل
        return [
            {'stage_name': 'القص والباترون ✂️', 'wage': 0.0},
            {'stage_name': 'الخياطة والتفصيل 🪡', 'wage': 0.0},
            {'stage_name': 'التطريز والشك اليدوي ✨', 'wage': 0.0},
            {'stage_name': 'الكي والتشطيب النهائي 👔', 'wage': 0.0},
            {'stage_name': 'التغليف ومستلزمات التسليم 📦', 'wage': 0.0}
        ]

    bom_raw = p_row.get('bom')
    bom = {}
    if isinstance(bom_raw, str):
        try:
            bom = json.loads(bom_raw)
        except Exception:
            bom = {}
    elif isinstance(bom_raw, dict):
        bom = bom_raw

    # 1. إذا كان الموديل يحمل مصفوفة مراحل معرفة مسبقاً (stages / bom_stages)
    explicit_stages = bom.get('stages') or bom.get('bom_stages') or []
    if isinstance(explicit_stages, list) and len(explicit_stages) > 0:
        resolved = []
        for s in explicit_stages:
            if isinstance(s, dict):
                s_name = clean_str(s.get('stage_name') or s.get('name') or s.get('title'))
                s_wage = clean_num(s.get('wage') or s.get('rate') or s.get('stage_fee') or s.get('cost') or 0.0)
                if s_name:
                    resolved.append({'stage_name': s_name, 'wage': s_wage})
            elif isinstance(s, str) and s.strip():
                resolved.append({'stage_name': s.strip(), 'wage': 0.0})
        if resolved:
            return resolved

    # 2. قراءة الأجور والمراحل الفنية من meta الخاص بالـ BOM أو حقول الموديل
    meta = bom.get('meta') if isinstance(bom, dict) and isinstance(bom.get('meta'), dict) else {}
    c_wage = clean_num(meta.get('cutter_wage') or 0.0)
    t_wage = clean_num(meta.get('tailor_wage') or 0.0)
    e_wage = clean_num(meta.get('embroiderer_wage') or 0.0)
    f_wage = clean_num(meta.get('finisher_wage') or 0.0)
    p_cost = clean_num(meta.get('packaging_cost') or p_row.get('packaging_cost') or 0.0)

    stages = [
        {'stage_name': 'القص والباترون ✂️', 'wage': c_wage},
        {'stage_name': 'الخياطة والتفصيل 🪡', 'wage': t_wage},
        {'stage_name': 'التطريز والشك اليدوي ✨', 'wage': e_wage},
        {'stage_name': 'الكي والتشطيب النهائي 👔', 'wage': f_wage},
        {'stage_name': 'التغليف ومستلزمات التسليم 📦', 'wage': p_cost}
    ]

    return stages


def create_order_stages(cur, order_id, order_item_id, product_id, product_name=None, production_order_id=None):
    """
    توليد قيود مراحل الإنتاج ديناميكياً في جدول order_stages
    لكل مرحلة معرفة في الموديل: order_id, order_item_id, stage_name, wage, status='Pending'
    """
    if not order_id or not order_item_id:
        return []

    # حذف المراحل السابقة لهذا البند لمنع التكرار عند إعادة الحفظ
    cur.execute("DELETE FROM order_stages WHERE order_item_id = %s;", (order_item_id,))

    stages = resolve_product_stages(cur, product_id, product_name)
    created = []

    for stg in stages:
        s_id = generate_id("STG")
        s_name = stg['stage_name']
        s_wage = float(stg['wage'])

        cur.execute("""
            INSERT INTO order_stages (
                id, order_id, order_item_id, production_order_id, stage_name,
                wage, rate, stage_fee, status, qa_status, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pending', 'Pending', CURRENT_TIMESTAMP)
            RETURNING *;
        """, (s_id, order_id, order_item_id, production_order_id, s_name, s_wage, s_wage, s_wage))

        row = cur.fetchone()
        if row:
            created.append(dict(row))

    return created


def get_order_stages_by_order(order_id):
    """استرجاع مراحل الإنتاج الفنية المرتبطة بالطلب"""
    query = """
        SELECT id, order_id, order_item_id, production_order_id, stage_name,
               wage, rate, stage_fee, status, worker_id, worker_name, qa_status,
               qa_score, qa_notes, qa_inspected_at, created_at
        FROM order_stages
        WHERE order_id = %s
        ORDER BY created_at ASC, id ASC;
    """
    return execute_query(query, (order_id,), fetch_all=True) or []
