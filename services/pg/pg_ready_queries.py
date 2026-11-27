# services/pg/pg_ready_queries.py
# Fast single-query POS Catalog & Instant Barcode/SKU Lookup (Zero N+1)

from .db_pool import clean_str, execute_query
from .pg_ready_schema import ensure_ready_products_schema


def _normalize_variant_row(v):
    return {
        "id": v.get("id"),
        "inventory_id": v.get("inventory_id"),
        "warehouse_id": v.get("warehouse_id") or "WH-SHOWROOM",
        "warehouse_name": v.get("warehouse_name") or "معرض وصالة التسليم",
        "age_size": v.get("age_size") or "",
        "color_name": v.get("color_name") or "",
        "color_hex": v.get("color_hex") or "#D00070",
        "sku": v.get("sku") or "",
        "barcode": v.get("barcode") or "",
        "cost_price": float(v.get("cost_price") or 0.0),
        "selling_price": float(v.get("selling_price") or 0.0),
        "stock_qty": float(v.get("stock_qty") or 0.0),
        "min_stock": float(v.get("min_stock") or 1.0),
        "is_active": bool(v.get("is_active", True)),
    }


def get_pos_catalog(params=None):
    """استرجاع الفساتين الجاهزة فقط مع صورتها ومصفوفة الأعمار والألوان والرصيد الحي باستعلام واحد"""
    ensure_ready_products_schema()
    params = params or {}
    wh_filter = clean_str(params.get("warehouse_id") or "")

    wh_condition = "AND (pv.warehouse_id = %s OR pv.warehouse_id IS NULL)" if wh_filter else ""
    sql_params = (wh_filter,) if wh_filter else ()

    query = f"""
        SELECT
            i.id, i.item_code, i.name, i.category, i.unit,
            COALESCE(i.style_code, i.item_code) AS style_code,
            COALESCE(i.season_collection, '') AS season_collection,
            COALESCE(i.care_notes, '') AS care_notes,
            CASE WHEN length(COALESCE(i.image_url, '')) > 500 AND i.image_url LIKE 'data:%%' THEN ''
                 ELSE COALESCE(i.image_url, '') END AS image_url,
            COALESCE(i.selling_price, 0.0) AS selling_price,
            COALESCE(i.unit_cost, 0.0) AS cost_price,
            COALESCE(i.currency, 'YER') AS currency,
            COALESCE(i.quantity, 0.0) AS quantity,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', pv.id,
                        'inventory_id', pv.inventory_id,
                        'warehouse_id', pv.warehouse_id,
                        'warehouse_name', COALESCE(w.name, 'معرض وصالة التسليم'),
                        'age_size', pv.age_size,
                        'color_name', COALESCE(pv.color_name, ''),
                        'color_hex', COALESCE(pv.color_hex, '#D00070'),
                        'sku', pv.sku,
                        'barcode', pv.barcode,
                        'cost_price', pv.cost_price,
                        'selling_price', pv.selling_price,
                        'stock_qty', pv.stock_qty,
                        'min_stock', pv.min_stock,
                        'is_active', pv.is_active
                    ) ORDER BY pv.created_at ASC, pv.age_size ASC, pv.id ASC
                ) FILTER (WHERE pv.id IS NOT NULL),
                '[]'::json
            ) AS variants
        FROM public.inventory i
        LEFT JOIN public.product_variants pv
            ON pv.inventory_id = i.id AND pv.is_active = TRUE {wh_condition}
        LEFT JOIN public.warehouses w ON pv.warehouse_id = w.id
        WHERE COALESCE(i.item_type, 'raw_material') = 'finished_product'
           OR LOWER(COALESCE(i.category, '')) LIKE '%%فساتين جاهز%%'
        GROUP BY i.id
        ORDER BY i.created_at DESC, i.name ASC;
    """
    rows = execute_query(query, sql_params if sql_params else None, fetch_all=True) or []
    result = []
    for r in rows:
        variants = [_normalize_variant_row(v) for v in (r.get("variants") or [])]
        total_variant_stock = sum(v["stock_qty"] for v in variants)
        base_sell = float(r.get("selling_price") or 0.0)
        if base_sell <= 0 and variants:
            prices = [v["selling_price"] for v in variants if v["selling_price"] > 0]
            base_sell = min(prices) if prices else 0.0

        result.append({
            "id": r["id"],
            "inventory_id": r["id"],
            "item_code": r.get("item_code") or r["id"],
            "style_code": r.get("style_code") or r.get("item_code") or r["id"],
            "name": r.get("name") or "",
            "category": r.get("category") or "فساتين جاهزة",
            "season_collection": r.get("season_collection") or "",
            "care_notes": r.get("care_notes") or "",
            "image_url": r.get("image_url") or "",
            "selling_price": base_sell,
            "sell_price": base_sell,
            "base_price": base_sell,
            "cost_price": float(r.get("cost_price") or 0.0),
            "currency": r.get("currency") or "YER",
            "total_stock": total_variant_stock if variants else float(r.get("quantity") or 0.0),
            "variants": variants,
        })
    return result


def lookup_pos_barcode(barcode_val):
    """بحث فوري بالباركود أو SKU لإرجاع المنتج والمقاس المحدد والسعر والرصيد الحي"""
    ensure_ready_products_schema()
    code = clean_str(barcode_val)
    if not code:
        return None
    query = """
        SELECT pv.*, i.name AS product_name, i.item_code, i.style_code, i.category,
               i.season_collection, i.care_notes, i.image_url, i.currency,
               COALESCE(w.name, 'معرض وصالة التسليم') AS warehouse_name
        FROM public.product_variants pv
        JOIN public.inventory i ON pv.inventory_id = i.id
        LEFT JOIN public.warehouses w ON pv.warehouse_id = w.id
        WHERE pv.is_active = TRUE
          AND (LOWER(pv.barcode) = LOWER(%s) OR LOWER(pv.sku) = LOWER(%s))
        LIMIT 1;
    """
    row = execute_query(query, (code, code), fetch_one=True)
    if not row:
        return None
    return {
        "id": row["id"],
        "variant_id": row["id"],
        "inventory_id": row["inventory_id"],
        "product_id": row["inventory_id"],
        "product_name": row.get("product_name") or "",
        "name": row.get("product_name") or "",
        "style_code": row.get("style_code") or row.get("item_code") or "",
        "category": row.get("category") or "فساتين جاهزة",
        "season_collection": row.get("season_collection") or "",
        "image_url": row.get("image_url") or "",
        "currency": row.get("currency") or "YER",
        "age_size": row.get("age_size") or "",
        "color_name": row.get("color_name") or "",
        "color_hex": row.get("color_hex") or "#D00070",
        "sku": row.get("sku") or "",
        "barcode": row.get("barcode") or "",
        "cost_price": float(row.get("cost_price") or 0.0),
        "selling_price": float(row.get("selling_price") or 0.0),
        "stock_qty": float(row.get("stock_qty") or 0.0),
        "warehouse_id": row.get("warehouse_id") or "WH-SHOWROOM",
        "warehouse_name": row.get("warehouse_name") or "معرض وصالة التسليم",
    }


def attach_variants_to_inventory(rows):
    """إلحاق متغيرات المقاسات والألوان لسجلات المخزون باستعلام واحد بدون N+1"""
    if not rows:
        return rows
    ensure_ready_products_schema()
    inv_ids = [r["id"] for r in rows if r.get("id")]
    if not inv_ids:
        return rows
    v_rows = execute_query("""
        SELECT pv.*, COALESCE(w.name, 'معرض وصالة التسليم') AS warehouse_name
        FROM public.product_variants pv
        LEFT JOIN public.warehouses w ON pv.warehouse_id = w.id
        WHERE pv.inventory_id = ANY(%s) AND pv.is_active = TRUE
        ORDER BY pv.created_at ASC, pv.age_size ASC, pv.id ASC;
    """, (inv_ids,), fetch_all=True) or []
    v_map = {}
    for v in v_rows:
        v_map.setdefault(v["inventory_id"], []).append(_normalize_variant_row(v))
    for r in rows:
        r["variants"] = v_map.get(r["id"], [])
    return rows


def get_pos_order_items(order_ref):
    """استرجاع بنود فاتورة نقاط بيع مع تفاصيل المقاسات للاستبدال"""
    ref = clean_str(order_ref)
    if not ref:
        return []
    rows = execute_query("""
        SELECT oi.*, o.order_no
        FROM public.order_items oi
        JOIN public.orders o ON oi.order_id = o.id
        WHERE o.id = %s OR o.order_no = %s
        ORDER BY oi.id ASC;
    """, (ref, ref), fetch_all=True) or []
    for r in rows:
        for k in ('quantity', 'unit_price', 'total_price', 'cost_price'):
            if r.get(k) is not None:
                r[k] = float(r[k])
    return rows
