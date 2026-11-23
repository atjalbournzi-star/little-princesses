# services/pg/pg_purchases.py
# Purchases queries, line item joins, and facade re-exports for purchasing workflows

from .db_pool import execute_query
from .pg_purchases_write import add_purchase, update_purchase
from .pg_purchases_cancel import cancel_purchase, delete_purchase, reconcile_inventory_governance, purge_purchases


def get_purchases(params=None):
    """استرجاع فواتير المشتريات وتفاصيل الأصناف المرفقة والموردين"""
    params = params or {}
    include_cancelled = params.get('include_cancelled', False)
    where_clause = "" if include_cancelled else "WHERE (p.receipt_status IS NULL OR p.receipt_status != 'Cancelled')"
    query = f"""
        SELECT p.*,
               COALESCE(
                   p.warehouse_id,
                   (SELECT it.warehouse_id FROM inventory_transactions it WHERE it.reference_id = p.id AND it.reference_type = 'purchases' AND it.warehouse_id IS NOT NULL LIMIT 1),
                   (SELECT sm.warehouse_id FROM stock_movements sm WHERE sm.reference_id = p.id AND sm.reference_type = 'purchases' AND sm.warehouse_id IS NOT NULL LIMIT 1),
                   (SELECT w.id FROM warehouses w WHERE w.is_active = TRUE ORDER BY w.id ASC LIMIT 1)
               ) AS warehouse_id,
               w.name AS warehouse_name
        FROM purchases p
        LEFT JOIN warehouses w ON (p.warehouse_id = w.id)
        {where_clause}
        ORDER BY p.invoice_date DESC, p.created_at DESC;
    """
    rows = execute_query(query, fetch_all=True) or []

    items_by_pur = {}
    try:
        items_rows = execute_query("SELECT * FROM purchase_items ORDER BY id ASC;", fetch_all=True) or []
        for itm in items_rows:
            pid = itm.get('purchase_id')
            if pid not in items_by_pur:
                items_by_pur[pid] = []
            items_by_pur[pid].append({
                "id": itm.get('id'), "item_name": itm.get('item_name'), "unit": itm.get('unit'),
                "qty": float(itm.get('quantity') or 0.0), "cost": float(itm.get('unit_price') or 0.0),
                "total": float(itm.get('total_price') or 0.0), "notes": itm.get('notes')
            })
    except Exception:
        items_by_pur = {}

    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('invoice_date'): r['invoice_date'] = str(r['invoice_date'])

        r['bill_no'] = r.get('invoice_no') or r.get('id') or ''
        r['purchase_no'] = r['bill_no']
        r['supplier'] = r.get('supplier_name') or 'مورد عام'
        r['item'] = r.get('item_name') or ''
        r['fabric_name'] = r.get('item_name') or ''
        r['qty'] = float(r.get('quantity') or 0.0)
        r['price'] = float(r.get('unit_price') or 0.0)
        r['cost_per_unit'] = r['price']
        r['total'] = float(r.get('original_amount') or (r['qty'] * r['price']))
        r['pay_type'] = r.get('payment_method') or 'نقدي'
        r['payment_source'] = r.get('payment_account_code') or '101 - الصندوق الرئيسي'
        r['transfer_no'] = r.get('transaction_ref') or ''
        r['date'] = str(r.get('invoice_date') or (r.get('created_at', '')[:10] if r.get('created_at') else ''))
        r['receipt_url'] = r.get('receipt_attachment') or r.get('receipt_url') or ''
        r['image_path'] = r['receipt_url']
        r['invoice_image_url'] = r.get('invoice_attachment') or r.get('invoice_image_url') or r.get('invoice_url') or ''
        pur_items = items_by_pur.get(r['id']) or []
        r['items'] = pur_items
        r['warehouse_id'] = r.get('warehouse_id') or ''
        r['warehouse_name'] = r.get('warehouse_name') or ''

        # حساب صافي مبلغ الفاتورة بالعملة الأصلية بعد الخصم وإضافة النقل والرسوم
        rate = float(r.get('exchange_rate') or 1.0)
        grand_yer = float(r.get('grand_total_yer') or 0.0)
        orig_raw = float(r.get('original_amount') or r['total'] or 0.0)
        disc = float(r.get('discount') or 0.0)
        ship = float(r.get('shipping_cost') or 0.0)
        fees = float(r.get('transfer_fee') or 0.0)
        net_orig = round(grand_yer / rate, 4) if (rate > 0 and grand_yer > 0) else round(max(0.0, orig_raw - disc + ship + fees), 4)
        r['net_original_amount'] = net_orig
        r['net_amount'] = net_orig

        from .uom_service import normalize_uom, convert_uom
        if pur_items and len(pur_items) > 1:
            u_set = list({normalize_uom(it.get('unit')) for it in pur_items if it.get('unit')})
            if len(u_set) > 1:
                len_u = ('متر', 'وار', 'سم', 'إنش', 'رول')
                if all(u in len_u for u in u_set):
                    r['unified_quantity'] = round(sum(convert_uom(it.get('qty', 0), it.get('unit'), 'متر') for it in pur_items), 2)
                    r['unified_unit'] = 'متر'
                    r['is_multi_unit'] = True
                    r['multi_unit_label'] = f"{r['unified_quantity']} متر (موحد)"
                else:
                    r['unified_quantity'] = len(pur_items)
                    r['unified_unit'] = 'أصناف (مشكل)'
                    r['is_multi_unit'] = True
                    r['multi_unit_label'] = f"{len(pur_items)} أصناف (مشكل)"
            else:
                r['unified_quantity'] = sum(float(it.get('qty', 0)) for it in pur_items)
                r['unified_unit'] = u_set[0] if u_set else (r.get('unit') or 'متر')
                r['is_multi_unit'] = False
                r['multi_unit_label'] = f"{r['unified_quantity']} {r['unified_unit']}"
        elif r.get('unit') == 'مشكل':
            r['unified_quantity'] = r['qty'] or 1
            r['unified_unit'] = 'أصناف (مشكل)'
            r['is_multi_unit'] = True
            r['multi_unit_label'] = f"{int(r['unified_quantity'])} أصناف (مشكل)" if r['qty'] > 0 else "أصناف متعددة (مشكل)"
        else:
            r['unified_quantity'] = r['qty']
            r['unified_unit'] = r.get('unit') or 'متر'
            r['is_multi_unit'] = False
            r['multi_unit_label'] = f"{r['qty']} {r['unified_unit']}"

    return rows


def get_purchase_by_id(purchase_id):
    """استرجاع فاتورة مشتريات محددة مع بنودها التفصيلية من جدول purchase_items"""
    if not purchase_id: return None
    rows = get_purchases({'include_cancelled': True})
    for r in rows:
        if str(r.get('id')) == str(purchase_id) or str(r.get('invoice_no')) == str(purchase_id) or str(r.get('bill_no')) == str(purchase_id):
            return r
    return None

