# services/pg/pg_products_query.py
# Products query, BOM models calculation, and dynamic categories retrieval
import json
from .db_pool import clean_str, clean_num, execute_query


def get_products(params=None):
    """استرجاع كتالوج المنتجات والموديلات مع مصفوفة الأسعار وبطاقة المواد والألوان والصور الحية"""
    query = """SELECT id, sku, model_name, model_name as name, model_no, category, subcategory, collection, design_code,
               base_price, base_price as price, base_price as sell_price, cost_price, cost_price as cost, cost_price as total_cost,
               labor_cost, packaging_cost, fabric_cost, bom, price_matrix, age_chart, target_segment, barcode, currency,
               image_url, colors, description, min_stock, status, created_by,
               (status = 'Active') as is_active, created_at, updated_at FROM products ORDER BY created_at DESC;"""
    rows = execute_query(query, fetch_all=True) or []
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('updated_at'): r['updated_at'] = str(r['updated_at'])
        for jf in ('bom', 'price_matrix', 'age_chart', 'colors'):
            if isinstance(r.get(jf), str):
                try: r[jf] = json.loads(r[jf])
                except Exception: pass
        r['target_segment'] = r.get('target_segment') or 'kids'
        r['barcode'] = r.get('barcode') or r.get('sku') or f"PRD-{r.get('id')}"
        img = clean_str(r.get('image_url') or '')
        r['image_url'], r['image'], r['image_data'] = img, img, img

        raw_bm = r.get('bom') or {}
        bom_list = raw_bm.get('items') if isinstance(raw_bm, dict) and 'items' in raw_bm else (raw_bm if isinstance(raw_bm, list) else [])
        bm_meta = raw_bm.get('meta') if isinstance(raw_bm, dict) and 'meta' in raw_bm else {}
        if isinstance(bom_list, list) and len(bom_list) > 0:
            names, tot_m = [], 0.0
            for b in bom_list:
                fn, br = b.get('fabric_name') or 'قماش', b.get('brackets') or {}
                m = float(br.get('6-9Y') or br.get('M') or b.get('meters') or 0.0)
                tot_m += m
                names.append(f"{fn} ({m}م)")
            r['fabric_name'], r['yards_used'] = " + ".join(names), tot_m
        else:
            r['fabric_name'], r['yards_used'] = r.get('description') or '', 0.0

        stg = bm_meta.get('stage_wages') or {}
        r['cutter_wage'] = clean_num(stg.get('cutter_wage') or bm_meta.get('cutter_wage') or r.get('cutter_wage') or 0.0)
        r['tailor_wage'] = clean_num(stg.get('tailor_wage') or bm_meta.get('tailor_wage') or r.get('tailor_wage') or 0.0)
        r['embroiderer_wage'] = clean_num(stg.get('embroiderer_wage') or bm_meta.get('embroiderer_wage') or r.get('embroiderer_wage') or 0.0)
        r['finisher_wage'] = clean_num(stg.get('finisher_wage') or bm_meta.get('finisher_wage') or r.get('finisher_wage') or 0.0)
        r['packaging_cost'] = clean_num(stg.get('packaging_cost') or stg.get('packager_wage') or r.get('packaging_cost') or bm_meta.get('packaging_cost') or 0.0)
        r['packager_wage'] = r['packaging_cost']
        for wk in ('cutter_wage', 'tailor_wage', 'embroiderer_wage', 'finisher_wage', 'packager_wage', 'packaging_cost'):
            if not stg.get(wk) and r.get(wk): stg[wk] = r[wk]
        r['stage_wages'] = stg

        cols = r.get('colors') or bm_meta.get('colors') or []
        if isinstance(cols, str):
            try: cols = json.loads(cols)
            except Exception: cols = [c.strip() for c in cols.split(',') if c.strip()]
        clean_cols, seen_c = [], set()
        for c in (cols if isinstance(cols, list) else []):
            c_str = c.get('name') or c.get('color') or c.get('label') or str(c) if isinstance(c, dict) else clean_str(str(c))
            if c_str and c_str not in seen_c:
                seen_c.add(c_str)
                clean_cols.append(c_str)
        r['colors'], r['approved_colors'] = clean_cols, clean_cols
        if not r.get('price_matrix'):
            ref = 'M' if r['target_segment'] == 'women_adults' else ('تفصيل حر' if r['target_segment'] == 'custom_free' else '6-9Y')
            r['price_matrix'] = {ref: float(r.get('sell_price') or r.get('base_price') or 0.0)}
        r['profit'] = float(r.get('sell_price') or 0.0) - float(r.get('total_cost') or 0.0)
    return rows


def get_product_by_id(prod_id):
    """استرجاع بيانات موديل محدد بالكامل مع تفاصيل شجرة المواد والمراحل"""
    clean_id = clean_str(prod_id)
    if not clean_id: return None
    for p in get_products():
        if str(p.get('id')) == clean_id or str(p.get('sku')) == clean_id or str(p.get('barcode')) == clean_id:
            return p
    return None


def get_bom_models(payload=None):
    prods = get_products()
    n = len(prods)
    tot_cost = sum(float(p.get('total_cost') or p.get('cost_price') or 0.0) for p in prods)
    tot_price = sum(float(p.get('sell_price') or p.get('base_price') or 0.0) for p in prods)
    avg_c, avg_p = (tot_cost / n if n else 0.0), (tot_price / n if n else 0.0)
    avg_m = ((avg_p - avg_c) / avg_p * 100) if avg_p > 0 else 0.0
    return {"success": True, "status": "success", "data": prods, "count": n,
            "kpis": {"total_models": n, "avg_cost": round(avg_c, 2), "avg_price": round(avg_p, 2), "avg_margin": round(avg_m, 2)}}


def get_product_categories():
    """استرجاع خيارات التصنيف الفني ديناميكياً من جدول product_categories حصراً دون قراءة أي سجلات صفرية"""
    query = """SELECT name FROM product_categories 
               WHERE name IS NOT NULL AND TRIM(name) != '' 
               ORDER BY created_at ASC, name ASC;"""
    rows = execute_query(query, fetch_all=True) or []
    return [clean_str(r['name']) for r in rows if clean_str(r.get('name'))]
