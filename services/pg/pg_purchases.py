# services/pg/pg_purchases.py
# Purchases queries, line item joins, and facade re-exports for purchasing workflows

from .db_pool import execute_query
from .pg_purchases_write import add_purchase
from .pg_purchases_cancel import cancel_purchase, delete_purchase, reconcile_inventory_governance, purge_purchases


def get_purchases(params=None):
    """استرجاع فواتير المشتريات وتفاصيل الأصناف المرفقة والموردين"""
    params = params or {}
    include_cancelled = params.get('include_cancelled', False)
    where_clause = "" if include_cancelled else "WHERE (receipt_status IS NULL OR receipt_status != 'Cancelled')"
    query = f"""
        SELECT * FROM purchases
        {where_clause}
        ORDER BY invoice_date DESC, created_at DESC;
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
        r['items'] = items_by_pur.get(r['id']) or []

    return rows
