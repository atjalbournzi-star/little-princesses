# services/pg/pg_products.py
# Products catalog, pricing matrix, BOM models, and atomic sequence numbering
import json
import datetime
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, execute_query
from .pg_sequences import get_next_sequence_number, preview_next_sequence_number, ensure_number_sequences_schema
from .pg_audit import log_audit_event, get_active_user_context
from .pg_products_query import get_products, get_product_by_id, get_bom_models, get_product_categories
from .pg_products_delete import delete_product, delete_bom_model


def get_next_product_sku(segment='kids', category=None):
    """معاينة حية للكود التسلسلي التالي للموديل حسب الفئة دون زيادة العداد الفعلي"""
    seg = clean_str(segment or 'kids').lower()
    pfx_map = {'women_adults': ('PROD-WMN', 'LP-WMN-'), 'custom_free': ('PROD-CST', 'LP-CST-'), 'kids': ('PROD-KID', 'LP-KID-')}
    seq_key, pfx = pfx_map.get(seg, ('PROD-KID', 'LP-KID-'))
    with get_db_cursor() as cur:
        ensure_number_sequences_schema(cur)
        next_sku = preview_next_sequence_number(cur, seq_key, fallback_prefix=pfx, fallback_padding=4)
        return {"success": True, "sku": next_sku, "sequence_key": seq_key, "prefix": pfx}


def add_product(payload):
    """إضافة أو تحديث موديل جديد في قاعدة البيانات مع الترقيم المتسلسل والتدقيق"""
    data = payload.get('data') or payload
    raw_uid = clean_str(data.get('created_by') or data.get('user_id') or '')
    resolved_user = raw_uid or get_active_user_context('admin')

    prod_id = clean_str(data.get('id') or data.get('product_id'))
    name = clean_str(data.get('name') or data.get('model_name') or '')
    sku = clean_str(data.get('sku') or data.get('barcode'))
    barcode = clean_str(data.get('barcode') or sku)
    target_segment = clean_str(data.get('target_segment') or 'kids')
    if target_segment not in ('kids', 'women_adults', 'custom_free'): target_segment = 'kids'
    model_no, design_code = clean_str(data.get('model_no') or sku), clean_str(data.get('design_code') or sku)
    category, subcategory = clean_str(data.get('category') or ''), clean_str(data.get('subcategory') or '')
    collection, desc = clean_str(data.get('collection')) or None, clean_str(data.get('description') or '')
    curr_raw = clean_str(data.get('currency') or 'YER')
    currency = 'USD' if ('USD' in curr_raw or '$' in curr_raw) else ('SAR' if 'SAR' in curr_raw else 'YER')
    image_url = clean_str(data.get('image_url') or data.get('image') or data.get('image_data') or '')
    min_stock, status = int(clean_num(data.get('min_stock') or 2)), ('Active' if str(data.get('status', 'Active')).lower() in ('active', 'true', '1') else 'Inactive')

    raw_bm = data.get('bom') or {}
    if isinstance(raw_bm, str):
        try: raw_bm = json.loads(raw_bm)
        except Exception: raw_bm = {}
    bm_items = raw_bm.get('items') if isinstance(raw_bm, dict) and 'items' in raw_bm else (raw_bm if isinstance(raw_bm, list) else [])
    stage_wages = data.get('stage_wages') or (raw_bm.get('meta', {}).get('stage_wages') if isinstance(raw_bm, dict) else {}) or {}

    cutter_w = clean_num(data.get('cutter_wage') or data.get('cost_cutter') or stage_wages.get('cutter_wage') or 0.0)
    tailor_w = clean_num(data.get('tailor_wage') or data.get('cost_tailor') or stage_wages.get('tailor_wage') or 0.0)
    emb_w = clean_num(data.get('embroiderer_wage') or data.get('cost_embroidery') or stage_wages.get('embroiderer_wage') or 0.0)
    fin_w = clean_num(data.get('finisher_wage') or data.get('cost_finishing') or stage_wages.get('finisher_wage') or 0.0)
    pkg_cost = clean_num(data.get('packaging_cost') or data.get('cost_packaging') or stage_wages.get('packager_wage') or stage_wages.get('packaging_cost') or 0.0)
    extra_labor = sum(clean_num(v) for k, v in stage_wages.items() if k not in ('cutter_wage', 'tailor_wage', 'embroiderer_wage', 'finisher_wage', 'packager_wage', 'packaging_cost'))
    labor_cost = cutter_w + tailor_w + emb_w + fin_w + extra_labor

    fab_cost = clean_num(data.get('fabric_cost') or data.get('cost_fabric') or 0.0)
    if fab_cost == 0.0 and isinstance(bm_items, list):
        for bi in bm_items:
            uc, br = clean_num(bi.get('unit_cost') or bi.get('cost') or 0.0), bi.get('brackets') or {}
            m = clean_num(br.get('6-9Y') or br.get('6-9 سنوات') or br.get('M') or br.get('تفصيل حر') or bi.get('meters') or bi.get('yards') or 0.0)
            fab_cost += uc * m
    total_cost = (fab_cost + labor_cost + pkg_cost) if (fab_cost or labor_cost or pkg_cost) else clean_num(data.get('total_cost') or data.get('cost_price'))

    pm = data.get('price_matrix')
    pm_json = json.dumps(pm, ensure_ascii=False) if isinstance(pm, dict) else (pm if isinstance(pm, str) else None)
    raw_colors = data.get('colors') or data.get('approved_colors') or []
    if isinstance(raw_colors, str):
        try: raw_colors = json.loads(raw_colors)
        except Exception: raw_colors = [c.strip() for c in raw_colors.split(',') if c.strip()]
    clean_cols = []
    for c in (raw_colors if isinstance(raw_colors, list) else []):
        if isinstance(c, dict): clean_cols.append(clean_str(c.get('name') or c.get('color') or c.get('label') or str(c)))
        elif isinstance(c, str): clean_cols.append(c.strip())
        else: clean_cols.append(str(c))
    colors_json = json.dumps(clean_cols, ensure_ascii=False)
    bm_meta = {"barcode": barcode, "colors": clean_cols, "cutter_wage": cutter_w, "tailor_wage": tailor_w, "embroiderer_wage": emb_w, "finisher_wage": fin_w, "packaging_cost": pkg_cost, "stage_wages": stage_wages}
    bm_json = json.dumps({"items": bm_items if isinstance(bm_items, list) else [], "meta": bm_meta}, ensure_ascii=False)
    ac_json = json.dumps(data.get('age_chart'), ensure_ascii=False) if data.get('age_chart') else None

    sell_price = clean_num(data.get('sell_price') or data.get('price') or data.get('base_price') or 0.0)
    if sell_price == 0.0 and isinstance(pm, dict):
        ref_key = 'M' if target_segment == 'women_adults' else ('تفصيل حر' if target_segment == 'custom_free' else '6-9Y')
        sell_price = clean_num(pm.get(ref_key) or pm.get('6-9 سنوات') or (list(pm.values())[0] if pm else 0.0))
    profit = round(sell_price - total_cost, 2)
    margin_pct = round((profit / sell_price * 100), 2) if sell_price > 0 else 0.0

    pfx_map = {'women_adults': ('PROD-WMN', 'LP-WMN-'), 'custom_free': ('PROD-CST', 'LP-CST-'), 'kids': ('PROD-KID', 'LP-KID-')}
    seq_key, pfx = pfx_map.get(target_segment, ('PROD-KID', 'LP-KID-'))

    with get_db_cursor(commit=True) as cur:
        ensure_number_sequences_schema(cur)
        existing_p = None
        if prod_id and not prod_id.startswith('PROD-NEW') and not prod_id.startswith('PRD-NEW'):
            cur.execute("SELECT id, sku, model_no, barcode FROM products WHERE id = %s OR sku = %s LIMIT 1 FOR UPDATE;", (prod_id, prod_id))
            existing_p = cur.fetchone()

        if existing_p:
            prod_id = existing_p['id']
            sku = existing_p.get('sku') or existing_p.get('model_no') or sku
            if not barcode and existing_p.get('barcode'): barcode = existing_p['barcode']
        else:
            prod_id = get_next_sequence_number(cur, 'PROD', fallback_prefix='PROD-', fallback_padding=6)
            # التحقق من فرادة كود الموديل SKU وتثبيت الترقيم من number_sequences
            is_generic_pfx = not sku or sku in ('LP-KID', 'LP-WMN', 'LP-CST') or sku.endswith('-')
            if is_generic_pfx:
                sku = get_next_sequence_number(cur, seq_key, fallback_prefix=pfx, fallback_padding=4)
            cur.execute("SELECT id FROM products WHERE sku = %s AND id != %s LIMIT 1;", (sku, prod_id))
            while cur.fetchone():
                sku = get_next_sequence_number(cur, seq_key, fallback_prefix=pfx, fallback_padding=4)
                cur.execute("SELECT id FROM products WHERE sku = %s AND id != %s LIMIT 1;", (sku, prod_id))
            if sku.startswith(pfx):
                try:
                    num_part = int(sku.replace(pfx, ''))
                    cur.execute("UPDATE number_sequences SET current_number = GREATEST(current_number, %s), updated_at = CURRENT_TIMESTAMP WHERE sequence_key = %s;", (num_part, seq_key))
                except Exception: pass
            if not barcode: barcode = sku
            if not model_no: model_no = sku
            if not design_code: design_code = sku

        query = """INSERT INTO products (id, sku, model_name, model_no, category, subcategory, collection, design_code, base_price, cost_price, currency, image_url, image, image_data, colors, approved_colors, description, min_stock, status, labor_cost, packaging_cost, fabric_cost, bom, price_matrix, age_chart, target_segment, barcode, created_by, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET model_name = EXCLUDED.model_name, sku = products.sku, model_no = EXCLUDED.model_no, category = EXCLUDED.category,
                subcategory = EXCLUDED.subcategory, collection = EXCLUDED.collection, design_code = EXCLUDED.design_code, base_price = EXCLUDED.base_price, cost_price = EXCLUDED.cost_price,
                currency = EXCLUDED.currency, image_url = EXCLUDED.image_url, image = EXCLUDED.image, image_data = EXCLUDED.image_data, colors = EXCLUDED.colors, approved_colors = EXCLUDED.approved_colors,
                description = EXCLUDED.description, min_stock = EXCLUDED.min_stock, status = EXCLUDED.status, labor_cost = EXCLUDED.labor_cost, packaging_cost = EXCLUDED.packaging_cost,
                fabric_cost = EXCLUDED.fabric_cost, bom = EXCLUDED.bom, price_matrix = EXCLUDED.price_matrix, age_chart = EXCLUDED.age_chart, target_segment = EXCLUDED.target_segment,
                barcode = EXCLUDED.barcode, created_by = COALESCE(products.created_by, EXCLUDED.created_by), updated_at = CURRENT_TIMESTAMP
            RETURNING *, model_name as name, base_price as price, cost_price as cost;"""
        user_uuid = None
        if resolved_user:
            cur.execute("SELECT id FROM users WHERE id = %s OR username = %s LIMIT 1;", (resolved_user, resolved_user))
            u_row = cur.fetchone()
            if u_row: user_uuid = u_row['id']

        params = (
            prod_id, sku, name, model_no, category, subcategory, collection, design_code, sell_price, total_cost, currency, image_url, image_url, image_url,
            colors_json, colors_json, desc, min_stock, status, labor_cost, pkg_cost, fab_cost, bm_json, pm_json, ac_json, target_segment, barcode, user_uuid
        )
        cur.execute(query, params)
        res = dict(cur.fetchone())

        log_audit_event(
            entity_type='products', entity_id=prod_id, action='UPDATE' if existing_p else 'INSERT',
            new_values={'id': prod_id, 'name': name, 'sku': sku, 'price': sell_price, 'cost': total_cost, 'profit': profit, 'margin_pct': margin_pct, 'stage_wages': stage_wages},
            user_id=user_uuid or resolved_user, document_no=sku or prod_id,
            details=f"تعديل وتحديث مواصفات الموديل {name} ({sku}) في استوديو BOM" if existing_p else f"تسجيل موديل جديد {name} ({sku}) في استوديو BOM", cur=cur
        )

        res['id'], res['product_id'], res['model_no'] = prod_id, prod_id, model_no
        res['total_cost'], res['cost_price'] = total_cost, total_cost
        res['sell_price'], res['base_price'] = sell_price, sell_price
        res['profit'], res['margin_pct'] = profit, margin_pct
        res['stage_wages'] = stage_wages
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        res['success'], res['message'] = True, f"تم حفظ وتوثيق الموديل ({name}) بالرقم {prod_id} بنجاح 👑"
        return res


def save_bom_model(payload):
    return add_product(payload)
