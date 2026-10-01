"""
Little Princesses ERP - Production Fabric Deduction & Product Resolver Helpers
"""

import logging
from .db_pool import clean_num, clean_str, generate_id
from .uom_service import convert_uom, normalize_uom

logger = logging.getLogger("LittlePrincesses_PG_FactoryFabric")


def deduct_fabric(cur, fabric_id, fabric_name, cut_qty, cut_unit, order_label, customer_name, child_name):
    inv_row = None
    fabric_id_clean = clean_str(fabric_id)
    fabric_name_clean = clean_str(fabric_name)

    if fabric_id_clean:
        cur.execute(
            "SELECT id, name, quantity, unit_cost, unit FROM inventory WHERE id = %s OR item_code = %s LIMIT 1 FOR UPDATE;",
            (fabric_id_clean, fabric_id_clean)
        )
        inv_row = cur.fetchone()
    if not inv_row and fabric_name_clean:
        cur.execute(
            "SELECT id, name, quantity, unit_cost, unit FROM inventory WHERE name = %s OR name ILIKE %s LIMIT 1 FOR UPDATE;",
            (fabric_name_clean, f"%{fabric_name_clean}%")
        )
        inv_row = cur.fetchone()

    if not inv_row:
        return ""

    old_q = float(inv_row['quantity'] or 0.0)
    u_cost = float(inv_row['unit_cost'] or 0.0)
    stock_unit = clean_str(inv_row.get('unit') or 'وار')
    deduct_stock_qty = convert_uom(cut_qty, cut_unit, stock_unit)
    new_q = max(0.0, old_q - deduct_stock_qty)
    cur.execute("UPDATE inventory SET quantity = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_q, inv_row['id']))

    # خصم الكمية من مستودع المعمل والورشة (WH-WORKSHOP)
    cur.execute("""
        INSERT INTO warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at)
        VALUES (%s, 'WH-WORKSHOP', %s, GREATEST(0.0, %s - %s), 0.0, CURRENT_TIMESTAMP)
        ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET
            quantity = GREATEST(0.0, warehouse_stock.quantity - %s), updated_at = CURRENT_TIMESTAMP;
    """, (f"WS-{inv_row['id']}-WH-WORKSHOP", inv_row['id'], old_q, deduct_stock_qty, deduct_stock_qty))

    norm_cut, norm_stock = normalize_uom(cut_unit), normalize_uom(stock_unit)
    uom_desc = f"{round(deduct_stock_qty, 2)} {stock_unit}" + (
        f" (ما يعادل {round(cut_qty, 2)} {cut_unit})" if norm_cut != norm_stock else ""
    )
    tx_notes = f"صرف قماش ({inv_row['name']}) بمقدار {uom_desc} من مستودع المعمل (WH-WORKSHOP) لأمر تشغيل {order_label} (العميلة: {customer_name} - الطفلة: {child_name})"
    cur.execute("""
        INSERT INTO inventory_transactions (
            id, inventory_id, warehouse_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes
        ) VALUES (%s, %s, 'WH-WORKSHOP', 'PRODUCTION_CONSUMPTION', %s, %s, 'production_orders', %s, %s);
    """, (generate_id("ITXN"), inv_row['id'], -abs(round(deduct_stock_qty, 4)), u_cost, order_label, tx_notes))
    return f"تم اقتطاع {uom_desc} من قماش ({inv_row['name']}) من مستودع المعمل (WH-WORKSHOP)"


def deduct_fabrics_batch(cur, fabrics_list, order_label, customer_name, child_name):
    """Deducts multiple BOM fabrics in a single atomic transaction."""
    if not fabrics_list or not isinstance(fabrics_list, list):
        return []
    deductions_info = []
    for item in fabrics_list:
        fid = item.get('fabric_id') or item.get('id') or item.get('inventory_id') or item.get('material_id') or ''
        fname = item.get('fabric_name') or item.get('name') or item.get('material_name') or ''
        qty = clean_num(item.get('cut_meters') or item.get('quantity') or item.get('qty') or item.get('cut_qty') or item.get('cut_quantity') or item.get('meters') or 0.0)
        unit = clean_str(item.get('cut_unit') or item.get('unit') or 'متر')
        if qty > 0 and (fid or fname):
            msg = deduct_fabric(cur, fid, fname, qty, unit, order_label, customer_name, child_name)
            if msg:
                deductions_info.append(msg)
    return deductions_info


def ensure_valid_product(cur, product_id, product_name):
    if product_id:
        cur.execute("SELECT id FROM products WHERE id = %s LIMIT 1;", (product_id,))
        if cur.fetchone():
            return product_id
    if product_name:
        cur.execute("SELECT id FROM products WHERE model_name = %s OR id = %s OR model_name ILIKE %s LIMIT 1;", (product_name, product_name, f"%{product_name}%"))
        p = cur.fetchone()
        if p:
            return p['id']
    cur.execute("SELECT id FROM products LIMIT 1;")
    any_p = cur.fetchone()
    if any_p:
        return any_p['id']
    cur.execute("""
        INSERT INTO products (id, sku, model_name, category, currency, base_price, status)
        VALUES ('PROD-CUSTOM-001', 'PROD-CUSTOM-001', %s, 'فساتين تفصيل', 'YER', 0, 'Active')
        ON CONFLICT (id) DO NOTHING;
    """, (product_name or 'موديل راقي',))
    return 'PROD-CUSTOM-001'
