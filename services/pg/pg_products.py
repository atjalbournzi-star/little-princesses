# services/pg/pg_products.py
# Products catalog, pricing matrix, BOM models, and lifecycle management

import json
import datetime
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, execute_query


def get_products(params=None):
    """استرجاع كتالوج المنتجات والموديلات مع مصفوفة الأسعار وبطاقة المواد والألوان والصور الحية"""
    query = """
        SELECT id, sku, model_name, model_name as name, model_no, category, subcategory,
               collection, design_code, base_price, base_price as price, base_price as sell_price,
               cost_price, cost_price as cost, cost_price as total_cost,
               labor_cost, packaging_cost, fabric_cost,
               bom, price_matrix, age_chart, target_segment, barcode,
               currency, image_url, image, image_data, colors, approved_colors,
               description, min_stock, status,
               (status = 'Active') as is_active, created_at, updated_at
        FROM products
        ORDER BY created_at DESC;
    """
    rows = execute_query(query, fetch_all=True) or []
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('updated_at'): r['updated_at'] = str(r['updated_at'])

        for jf in ('bom', 'price_matrix', 'age_chart'):
            if isinstance(r.get(jf), str):
                try: r[jf] = json.loads(r[jf])
                except Exception: pass

        r['target_segment'] = r.get('target_segment') or 'kids'
        r['barcode'] = r.get('barcode') or r.get('sku') or f"PRD-{r.get('id')}"

        # مزامنة مسارات وبيانات صورة الموديل
        img = clean_str(r.get('image_url') or r.get('image') or r.get('image_data') or '')
        r['image_url'] = img
        r['image'] = img
        r['image_data'] = img

        bom_list = r.get('bom') or []
        if isinstance(bom_list, list) and len(bom_list) > 0:
            names, tot_meters = [], 0.0
            for b in bom_list:
                fn = b.get('fabric_name') or 'قماش'
                br = b.get('brackets') or {}
                m = float(br.get('6-9Y') or br.get('6-9 سنوات') or br.get('M') or br.get('تفصيل حر') or br.get('custom') or b.get('meters') or 0.0)
                tot_meters += m
                names.append(f"{fn} ({m}م متوسط)")
            r['fabric_name'] = " + ".join(names)
            r['yards_used'] = tot_meters
        else:
            r['fabric_name'] = r.get('description') or ''
            r['yards_used'] = 0.0

        # استخراج البيانات الملحقة (مراحل التشغيل، الباركود، المقاسات، والألوان المعتمدة)
        cols = r.get('colors') or r.get('approved_colors') or []
        if isinstance(cols, str):
            try: cols = json.loads(cols)
            except Exception: cols = [c.strip() for c in cols.split(',') if c.strip()]
        if not isinstance(cols, list): cols = []

        if isinstance(r.get('bom'), dict):
            meta = r['bom'].get('meta') or {}
            r['cutter_wage'] = meta.get('cutter_wage', 0.0)
            r['tailor_wage'] = meta.get('tailor_wage', 0.0)
            r['embroiderer_wage'] = meta.get('embroiderer_wage', 0.0)
            r['finisher_wage'] = meta.get('finisher_wage', 0.0)
            r['packaging_cost'] = float(r.get('packaging_cost') or meta.get('packaging_cost') or 0.0)
            r['barcode'] = meta.get('barcode') or r['barcode']
            if not cols: cols = meta.get('colors', [])
            r['sizes'] = meta.get('sizes', [])
            r['bom'] = r['bom'].get('items', [])

        r['colors'] = cols if isinstance(cols, list) else []
        r['approved_colors'] = r['colors']
        r['profit'] = float(r.get('sell_price') or 0.0) - float(r.get('total_cost') or 0.0)
        r['calc_date'] = str(r.get('updated_at') or r.get('created_at') or datetime.date.today())[:10]
    return rows


def add_product(payload):
    """إضافة أو تحديث موديل جديد في قاعدة البيانات السحابية"""
    data = payload.get('data') or payload
    prod_id = clean_str(data.get('id') or data.get('product_id')) or generate_id("PROD")
    name = clean_str(data.get('name') or data.get('model_name') or 'فستان أميرات')
    sku = clean_str(data.get('sku') or data.get('barcode') or prod_id)
    barcode = clean_str(data.get('barcode') or sku)
    target_segment = clean_str(data.get('target_segment') or 'kids')
    if target_segment not in ('kids', 'women_adults', 'custom_free'):
        target_segment = 'kids'
    model_no = clean_str(data.get('model_no') or sku)
    design_code = clean_str(data.get('design_code') or sku)
    category = clean_str(data.get('category') or 'فساتين وبدلات خاصة')
    subcategory = clean_str(data.get('subcategory') or '')
    collection = clean_str(data.get('collection')) or None
    curr_raw = clean_str(data.get('currency') or 'YER')
    currency = 'USD' if ('USD' in curr_raw or '$' in curr_raw) else ('SAR' if 'SAR' in curr_raw else 'YER')
    image_url = clean_str(data.get('image_url') or data.get('image') or data.get('image_data') or '')
    desc = clean_str(data.get('description') or '')
    min_stock = int(clean_num(data.get('min_stock') or 2))
    status = 'Active' if str(data.get('status', 'Active')).lower() in ('active', 'true', '1') else 'Inactive'

    cutter_wage = clean_num(data.get('cutter_wage') or 0.0)
    tailor_wage = clean_num(data.get('tailor_wage') or 0.0)
    embroiderer_wage = clean_num(data.get('embroiderer_wage') or 0.0)
    finisher_wage = clean_num(data.get('finisher_wage') or 0.0)
    labor_cost = clean_num(data.get('labor_cost') or (cutter_wage + tailor_wage + embroiderer_wage + finisher_wage))
    packaging_cost = clean_num(data.get('packaging_cost') or 0.0)
    fabric_cost = clean_num(data.get('fabric_cost') or 0.0)
    total_cost = clean_num(data.get('total_cost') or data.get('cost') or data.get('cost_price') or (fabric_cost + labor_cost + packaging_cost))

    pm = data.get('price_matrix')
    pm_json = json.dumps(pm, ensure_ascii=False) if isinstance(pm, dict) else (pm if isinstance(pm, str) else None)

    # هيكلة شجرة المواد BOM مع البيانات الوصفية (Metadata) والألوان المعتمدة
    raw_bm = data.get('bom')
    bm_items = raw_bm.get('items') if isinstance(raw_bm, dict) and 'items' in raw_bm else raw_bm
    raw_meta = raw_bm.get('meta') if isinstance(raw_bm, dict) and isinstance(raw_bm.get('meta'), dict) else {}
    raw_colors = data.get('colors') or data.get('approved_colors') or raw_meta.get('colors') or []
    if isinstance(raw_colors, str):
        try: raw_colors = json.loads(raw_colors)
        except Exception: raw_colors = [c.strip() for c in raw_colors.split(',') if c.strip()]
    if not isinstance(raw_colors, list): raw_colors = []
    colors_json = json.dumps(raw_colors, ensure_ascii=False)

    bm_payload = {
        "items": bm_items if isinstance(bm_items, list) else [],
        "meta": {
            "barcode": barcode, "target_segment": target_segment, "colors": raw_colors,
            "sizes": data.get('sizes') or raw_meta.get('sizes') or (list(pm.keys()) if isinstance(pm, dict) and pm else []),
            "cutter_wage": cutter_wage or clean_num(raw_meta.get('cutter_wage')),
            "tailor_wage": tailor_wage or clean_num(raw_meta.get('tailor_wage')),
            "embroiderer_wage": embroiderer_wage or clean_num(raw_meta.get('embroiderer_wage')),
            "finisher_wage": finisher_wage or clean_num(raw_meta.get('finisher_wage')),
            "packaging_cost": packaging_cost or clean_num(raw_meta.get('packaging_cost'))
        }
    }
    bm_json = json.dumps(bm_payload, ensure_ascii=False)
    ac = data.get('age_chart')
    ac_json = json.dumps(ac, ensure_ascii=False) if isinstance(ac, (list, dict)) else (ac if isinstance(ac, str) else None)

    sell_price = clean_num(data.get('sell_price') or data.get('price') or data.get('base_price') or 0.0)
    if sell_price == 0.0 and isinstance(pm, dict):
        sell_price = clean_num(pm.get('6-9Y') or pm.get('6-9 سنوات') or pm.get('M') or pm.get('تفصيل حر') or 0.0)

    query = """
        INSERT INTO products (
            id, sku, model_name, model_no, category, subcategory, collection, design_code,
            base_price, cost_price, currency, image_url, image, image_data, colors, approved_colors,
            description, min_stock, status, labor_cost, packaging_cost, fabric_cost,
            bom, price_matrix, age_chart, target_segment, barcode, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb,
            %s, %s, %s, %s, %s, %s,
            %s::jsonb, %s::jsonb, %s::jsonb, %s, %s, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
            model_name = EXCLUDED.model_name, sku = EXCLUDED.sku, model_no = EXCLUDED.model_no,
            category = EXCLUDED.category, subcategory = EXCLUDED.subcategory,
            collection = EXCLUDED.collection, design_code = EXCLUDED.design_code,
            base_price = EXCLUDED.base_price, cost_price = EXCLUDED.cost_price,
            currency = EXCLUDED.currency, image_url = EXCLUDED.image_url,
            image = EXCLUDED.image, image_data = EXCLUDED.image_data,
            colors = EXCLUDED.colors, approved_colors = EXCLUDED.approved_colors,
            description = EXCLUDED.description, min_stock = EXCLUDED.min_stock, status = EXCLUDED.status,
            labor_cost = EXCLUDED.labor_cost, packaging_cost = EXCLUDED.packaging_cost, fabric_cost = EXCLUDED.fabric_cost,
            bom = EXCLUDED.bom, price_matrix = EXCLUDED.price_matrix, age_chart = EXCLUDED.age_chart,
            target_segment = EXCLUDED.target_segment, barcode = EXCLUDED.barcode, updated_at = CURRENT_TIMESTAMP
        RETURNING *, model_name as name, base_price as price, cost_price as cost;
    """
    params = (
        prod_id, sku, name, model_no, category, subcategory, collection, design_code,
        sell_price, total_cost, currency, image_url, image_url, image_url, colors_json, colors_json,
        desc, min_stock, status, labor_cost, packaging_cost, fabric_cost,
        bm_json, pm_json, ac_json, target_segment, barcode
    )
    with get_db_cursor(commit=True) as cur:
        cur.execute(query, params)
        res = dict(cur.fetchone())
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        res['colors'] = raw_colors
        res['approved_colors'] = raw_colors
        res['image_url'] = image_url
        res['image'] = image_url
        res['image_data'] = image_url
        res['success'] = True
        res['message'] = f"تم حفظ وتوثيق الموديل ({name}) وحساب التكلفة سحابياً ☁️🧮"
        return res


def save_bom_model(payload):
    return add_product(payload)


def get_bom_models(payload=None):
    prods = get_products()
    total_models = len(prods)
    total_cost = sum(float(p.get('total_cost') or p.get('cost_price') or 0.0) for p in prods)
    total_price = sum(float(p.get('sell_price') or p.get('base_price') or 0.0) for p in prods)
    avg_cost = total_cost / total_models if total_models > 0 else 0.0
    avg_price = total_price / total_models if total_models > 0 else 0.0
    avg_margin = ((avg_price - avg_cost) / avg_price * 100) if avg_price > 0 else 0.0

    return {
        "success": True, "status": "success", "data": prods, "count": total_models,
        "kpis": {"total_models": total_models, "avg_cost": round(avg_cost, 2), "avg_price": round(avg_price, 2), "avg_margin": round(avg_margin, 1)}
    }


from .pg_products_delete import delete_product, delete_bom_model
