# services/pg/pg_tailoring_reports.py
# Order Profitability Report (By Mode & Material Source) + Promote Custom Bespoke to Catalog
# Architectural Standards: Strictly <= 220 lines

import json
from decimal import Decimal, ROUND_HALF_UP
from .db_pool import get_db_cursor, clean_str, to_decimal
from .pg_sequences import get_next_sequence_number, ensure_number_sequences_schema
from .pg_audit import log_audit_event, get_active_user_context, resolve_active_user_id

DEC_4 = Decimal('0.0001')
DEC_2 = Decimal('0.01')


def _q4(v):
    return to_decimal(v or 0).quantize(DEC_4, rounding=ROUND_HALF_UP)


def _q2(v):
    return to_decimal(v or 0).quantize(DEC_2, rounding=ROUND_HALF_UP)


def _empty_bucket():
    return {
        'count': 0, 'net_sales_price': Decimal('0'), 'wip_material_cost': Decimal('0'),
        'wip_labor_cost': Decimal('0'), 'wip_overhead_cost': Decimal('0'),
        'total_cost': Decimal('0'), 'net_profit': Decimal('0'),
    }


def _finalize_bucket(b):
    sales = b['net_sales_price']
    profit = b['net_profit']
    margin = float(((profit / sales) * Decimal('100')).quantize(DEC_2, rounding=ROUND_HALF_UP)) if sales > 0 else 0.0
    return {
        'count': b['count'],
        'net_sales_price': float(_q4(sales)),
        'wip_material_cost': float(_q4(b['wip_material_cost'])),
        'wip_labor_cost': float(_q4(b['wip_labor_cost'])),
        'wip_overhead_cost': float(_q4(b['wip_overhead_cost'])),
        'total_cost': float(_q4(b['total_cost'])),
        'net_profit': float(_q4(profit)),
        'margin_pct': margin,
    }


def get_order_profitability_report(params=None):
    p = params if isinstance(params, dict) else {}
    clauses, args = ["COALESCE(o.status, '') != 'cancelled'"], []
    if clean_str(p.get('date_from')):
        clauses.append("o.order_date >= %s::date")
        args.append(clean_str(p.get('date_from')))
    if clean_str(p.get('date_to')):
        clauses.append("o.order_date <= %s::date")
        args.append(clean_str(p.get('date_to')))
    if clean_str(p.get('item_mode')):
        clauses.append("COALESCE(po.item_mode, 'CATALOG_MTO') = %s")
        args.append(clean_str(p.get('item_mode')).upper())
    if clean_str(p.get('material_source')):
        clauses.append("COALESCE(po.material_source, 'WORKSHOP_STOCK') = %s")
        args.append(clean_str(p.get('material_source')).upper())
    if clean_str(p.get('status')):
        clauses.append("(po.status = %s OR o.production_status = %s)")
        args.extend([clean_str(p.get('status')), clean_str(p.get('status'))])

    where_sql = "WHERE " + " AND ".join(clauses)
    sql = f"""
        SELECT o.id AS order_id, o.order_no, o.order_date, o.total_amount, o.discount, o.base_amount,
               o.customer_id, COALESCE(c.name, po.customer_name, '') AS customer_name,
               po.id AS production_order_id, po.production_order_no, po.status AS po_status,
               COALESCE(po.custom_design_title, po.product_name, '') AS design_name,
               COALESCE(po.item_mode, 'CATALOG_MTO') AS item_mode,
               COALESCE(po.material_source, 'WORKSHOP_STOCK') AS material_source,
               COALESCE(po.sizing_mode, 'CUSTOM') AS sizing_mode,
               COALESCE(po.wip_material_cost, 0) AS wip_material_cost,
               COALESCE(po.wip_labor_cost, 0) AS wip_labor_cost,
               COALESCE(po.wip_overhead_cost, 0) AS wip_overhead_cost
        FROM public.orders o
        JOIN public.production_orders po ON po.order_id = o.id
        LEFT JOIN public.customers c ON c.id = o.customer_id
        {where_sql}
        ORDER BY o.order_date DESC, o.order_no DESC;
    """
    with get_db_cursor(commit=False) as cur:
        cur.execute(sql, tuple(args))
        raw_rows = cur.fetchall() or []

    rows_out = []
    by_mode, by_mat, overall = {}, {}, _empty_bucket()
    for r in raw_rows:
        sales = _q4(r.get('total_amount'))
        mat = _q4(r.get('wip_material_cost'))
        lab = _q4(r.get('wip_labor_cost'))
        ovh = _q4(r.get('wip_overhead_cost'))
        tot_cost = _q4(mat + lab + ovh)
        profit = _q4(sales - tot_cost)
        margin = float(((profit / sales) * Decimal('100')).quantize(DEC_2, rounding=ROUND_HALF_UP)) if sales > 0 else 0.0
        im, ms = r['item_mode'], r['material_source']

        rows_out.append({
            'order_id': r['order_id'],
            'order_no': r['order_no'],
            'production_order_id': r['production_order_id'],
            'production_order_no': r['production_order_no'],
            'order_date': str(r['order_date']) if r.get('order_date') else None,
            'status': r['po_status'],
            'customer_name': r['customer_name'],
            'design_name': r['design_name'],
            'item_mode': im,
            'material_source': ms,
            'sizing_mode': r['sizing_mode'],
            'net_sales_price': float(sales),
            'wip_material_cost': float(mat),
            'wip_labor_cost': float(lab),
            'wip_overhead_cost': float(ovh),
            'total_cost': float(tot_cost),
            'net_profit': float(profit),
            'margin_pct': margin,
        })
        for bucket in (overall, by_mode.setdefault(im, _empty_bucket()), by_mat.setdefault(ms, _empty_bucket())):
            bucket['count'] += 1
            bucket['net_sales_price'] += sales
            bucket['wip_material_cost'] += mat
            bucket['wip_labor_cost'] += lab
            bucket['wip_overhead_cost'] += ovh
            bucket['total_cost'] += tot_cost
            bucket['net_profit'] += profit

    return {
        'items': rows_out,
        'count': len(rows_out),
        'totals': _finalize_bucket(overall),
        'summary_by_item_mode': {k: _finalize_bucket(v) for k, v in by_mode.items()},
        'summary_by_material_source': {k: _finalize_bucket(v) for k, v in by_mat.items()},
    }


def promote_bespoke_to_catalog(po_id, payload=None):
    data = (payload.get('data') if isinstance(payload, dict) and isinstance(payload.get('data'), dict) else payload) or {}
    uid = get_active_user_context('admin')
    seg = clean_str(data.get('target_segment') or 'kids')
    if seg not in ('kids', 'women_adults', 'custom_free'):
        seg = 'kids'
    pfx_map = {'women_adults': ('PROD-WMN', 'PRD-WMN-'), 'custom_free': ('PROD-CST', 'PRD-GEN-'), 'school_uniform': ('PROD-UNI', 'PRD-UNI-'), 'kids': ('PROD-KID', 'PRD-GRL-')}
    seq_key, pfx = pfx_map[seg]

    with get_db_cursor(commit=True) as cur:
        ensure_number_sequences_schema(cur)
        cur.execute("""
            SELECT * FROM public.production_orders
            WHERE id = %s OR production_order_no = %s OR order_id = %s LIMIT 1 FOR UPDATE;
        """, (po_id, po_id, po_id))
        po = cur.fetchone()
        if not po:
            raise ValueError(f"أمر التشغيل [{po_id}] غير موجود")
        if clean_str(po.get('item_mode')).upper() != 'CUSTOM_BESPOKE':
            raise ValueError("يمكن ترقية طلبات التصميم الخاص (CUSTOM_BESPOKE) فقط إلى الكتالوج")

        prod_id = get_next_sequence_number(cur, 'PROD', fallback_prefix='PROD-', fallback_padding=6)
        sku = get_next_sequence_number(cur, seq_key, fallback_prefix=pfx, fallback_padding=4)
        model_name = clean_str(data.get('model_name') or po.get('custom_design_title') or po.get('product_name'))
        category = clean_str(data.get('category') or 'تصميم خاص مرقّى')
        img_url = clean_str(data.get('image_url') or po.get('model_image') or po.get('product_image')) or None
        fab_items = po.get('fabrics_data') if isinstance(po.get('fabrics_data'), list) else []

        c_w, t_w = float(_q4(po.get('cutter_wage'))), float(_q4(po.get('tailor_wage')))
        e_w, f_w = float(_q4(po.get('embroiderer_wage'))), float(_q4(po.get('finisher_wage')))
        p_w = float(_q4(po.get('packager_wage')))
        labor_cost = float(_q4(to_decimal(c_w + t_w + e_w + f_w) or to_decimal(po.get('wip_labor_cost'))))
        fab_cost = float(_q4(po.get('wip_material_cost')))
        tot_cost = float(_q4(Decimal(str(fab_cost)) + Decimal(str(labor_cost)) + Decimal(str(p_w))))
        sell_price = float(_q4(data.get('base_price') or po.get('total_amount') or 0))
        bom_json = json.dumps({
            'items': fab_items,
            'meta': {'barcode': sku, 'cutter_wage': c_w, 'tailor_wage': t_w, 'embroiderer_wage': e_w, 'finisher_wage': f_w, 'packaging_cost': p_w, 'promoted_from_po': po['id']},
        }, ensure_ascii=False)
        user_uuid = resolve_active_user_id(cur, uid)

        cur.execute("""
            INSERT INTO public.products (
                id, sku, model_name, model_no, category, design_code, base_price, cost_price,
                currency, image_url, status, labor_cost, packaging_cost, fabric_cost, bom,
                target_segment, barcode, fulfillment_mode, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'YER', %s, 'Active', %s, %s, %s, %s::jsonb, %s, %s, 'CATALOG_MTO', %s)
            RETURNING id, sku, model_name, fulfillment_mode, target_segment, base_price, labor_cost;
        """, (prod_id, sku, model_name, sku, category, sku, sell_price, tot_cost, img_url, labor_cost, p_w, fab_cost, bom_json, seg, sku, user_uuid))
        created = dict(cur.fetchone())
        log_audit_event('products', prod_id, 'PROMOTE_CAT', user_id=uid, document_no=sku,
                        new_values={'product_id': prod_id, 'sku': sku, 'source_po_id': po['id'], 'fulfillment_mode': 'CATALOG_MTO'},
                        details=f"ترقية التصميم الخاص {model_name} من أمر {po['production_order_no']} إلى الكتالوج ({sku})", cur=cur)
        return {'success': True, 'product': created}
