"""
Little Princesses ERP - Production Fabric Deduction & Product Resolver Helpers
"""

import logging
from .db_pool import clean_num, clean_str, generate_id
from .pg_sequences import get_next_sequence_number
from .uom_service import convert_uom, normalize_uom

logger = logging.getLogger("LittlePrincesses_PG_FactoryFabric")


def resolve_operating_warehouse(cur, warehouse_hint=None):
    """تحديد مستودع المعمل/التشغيل ديناميكياً من قاعدة البيانات Supabase دون تثبيت ثابت"""
    hint = clean_str(warehouse_hint)
    if hint:
        cur.execute("SELECT id, name FROM warehouses WHERE id = %s OR code ILIKE %s OR name ILIKE %s LIMIT 1;", (hint, hint, f"%{hint}%"))
        w = cur.fetchone()
        if w: return w['id'], w['name']
    cur.execute("SELECT id, name FROM warehouses WHERE (name ILIKE '%معمل%' OR name ILIKE '%ورش%' OR code ILIKE '%WORKSHOP%') AND is_active = TRUE ORDER BY id ASC LIMIT 1;")
    w = cur.fetchone()
    if w: return w['id'], w['name']
    cur.execute("SELECT id, name FROM warehouses WHERE is_active = TRUE ORDER BY id ASC LIMIT 1;")
    w = cur.fetchone()
    return (w['id'], w['name']) if w else ('WH-WORKSHOP', 'معمل وورشة الخياطة')


def deduct_fabric(cur, fabric_id, fabric_name, cut_qty, cut_unit, order_label, customer_name, child_name, warehouse_id=None, created_by=None, skip_cascade=False):
    op_wh_id, op_wh_name = resolve_operating_warehouse(cur, warehouse_id)
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

    # حماية منع تكرار الخصم لنفس أمر التشغيل (Idempotency Guard)
    if order_label:
        ref_ids = [order_label, f"PO-{order_label}", f"PRD-{order_label}", order_label.replace('PO-', '').replace('PRD-', '')]
        cur.execute("""
            SELECT id FROM inventory_transactions
            WHERE reference_type = 'production_orders' AND reference_id = ANY(%s)
              AND inventory_id = %s AND transaction_type = 'PRODUCTION_CONSUMPTION' LIMIT 1;
        """, (ref_ids, inv_row['id']))
        if cur.fetchone():
            return f"تم اقتطاع قماش ({inv_row['name']}) مسبقاً لهذا الطلب"

    u_cost = float(inv_row['unit_cost'] or 0.0)
    stock_unit = clean_str(inv_row.get('unit') or 'وار')
    deduct_stock_qty = convert_uom(cut_qty, cut_unit, stock_unit)
    if deduct_stock_qty <= 0:
        return ""

    # حارس التحقق من رصيد مستودع التشغيل والخصم التفاضلي (Warehouse Stock Availability Guard)
    cur.execute("""
        SELECT id, quantity, reserved_qty, COALESCE(available_qty, quantity - reserved_qty) as avail
        FROM warehouse_stock WHERE warehouse_id = %s AND inventory_id = %s LIMIT 1 FOR UPDATE;
    """, (op_wh_id, inv_row['id']))
    ws_row = cur.fetchone()
    cur_avail = float(ws_row['avail'] or 0.0) if ws_row else 0.0

    if not ws_row or cur_avail < deduct_stock_qty:
        cur.execute("""
            SELECT w.id, w.name, ws.quantity, COALESCE(ws.available_qty, ws.quantity - ws.reserved_qty) as avail
            FROM warehouse_stock ws JOIN warehouses w ON ws.warehouse_id = w.id
            WHERE ws.inventory_id = %s AND ws.warehouse_id != %s AND (ws.quantity - ws.reserved_qty) > 0
            ORDER BY ws.quantity DESC;
        """, (inv_row['id'], op_wh_id))
        other_stocks = cur.fetchall()
        if other_stocks:
            wh_details = "، ".join([f"[{r['name']}: {round(float(r['avail'] or r['quantity']), 2)} {stock_unit}]" for r in other_stocks])
            raise ValueError(
                f"لا يمكن صرف خامات أمر التشغيل: الرصيد المتاح من قماش ({inv_row['name']}) في مستودع التشغيل [{op_wh_name}] هو ({round(cur_avail, 2)} {stock_unit}) "
                f"وهو غير كافٍ لصرف ({round(deduct_stock_qty, 2)} {stock_unit}). "
                f"يتوفر رصيد في مستودعات أخرى: {wh_details}. يرجى إجراء «مناقلة مخزنية» إلى [{op_wh_name}] أولاً قبل الصرف."
            )
        raise ValueError(
            f"لا يمكن صرف خامات أمر التشغيل: لا يتوفر رصيد كافٍ من قماش ({inv_row['name']}) في مستودع التشغيل [{op_wh_name}] (المتاح: {round(cur_avail, 2)} {stock_unit}) "
            f"ولا في أي مستودع آخر (المطلوب: {round(deduct_stock_qty, 2)} {stock_unit}). يرجى توريد أو شراء الصنف أولاً."
        )

    # الخصم التفاضلي المزدوج في معاملة واحدة دون نسخ الرصيد الإجمالي
    cur.execute("UPDATE warehouse_stock SET quantity = quantity - %s, updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = %s AND inventory_id = %s;", (deduct_stock_qty, op_wh_id, inv_row['id']))
    cur.execute("UPDATE inventory SET quantity = quantity - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (deduct_stock_qty, inv_row['id']))

    norm_cut, norm_stock = normalize_uom(cut_unit), normalize_uom(stock_unit)
    fmt_deduct = f"{float(deduct_stock_qty):.2f}".rstrip('0').rstrip('.')
    fmt_cut = f"{float(cut_qty):.2f}".rstrip('0').rstrip('.')
    uom_desc = f"{fmt_deduct} {stock_unit}" + (f" (ما يعادل {fmt_cut} {cut_unit})" if norm_cut != norm_stock else "")
    tx_notes = f"صرف قماش ({inv_row['name']}) بمقدار {uom_desc} من [{op_wh_name}] لأمر تشغيل {order_label} (العميل: {customer_name} - الطفلة: {child_name})"

    # الترقيم المتسلسل لحركات المخزون وقيد اليومية المزدوج
    tot_cost = round(deduct_stock_qty * u_cost, 4)
    creator = clean_str(created_by) or 'admin'
    cur.execute("SELECT id FROM users WHERE id = %s OR username = %s LIMIT 1;", (creator, creator))
    u_row = cur.fetchone()
    creator = u_row['id'] if u_row else None
    tx_id = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='ITXN-')
    cur.execute("""
        INSERT INTO inventory_transactions (
            id, inventory_id, fabric_id, warehouse_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_by, created_at
        ) VALUES (%s, %s, %s, %s, 'PRODUCTION_CONSUMPTION', %s, %s, 'production_orders', %s, %s, %s, CURRENT_TIMESTAMP);
    """, (tx_id, inv_row['id'], inv_row['id'], op_wh_id, -abs(round(deduct_stock_qty, 4)), u_cost, order_label, tx_notes, creator))

    if tot_cost > 0:
        cur.execute("SELECT account_id FROM warehouses WHERE id = %s LIMIT 1;", (op_wh_id,))
        wh_acc_row = cur.fetchone()
        cr_acc = (wh_acc_row.get('account_id') if wh_acc_row else None) or 'ACC-105-02'
        from .pg_wip_accounting import record_material_wip_issue
        record_material_wip_issue(cur, order_label, inv_row['id'], inv_row['name'], cr_acc, tot_cost, tx_notes=tx_notes, created_by=creator, skip_cascade=skip_cascade)

    return f"تم اقتطاع {uom_desc} من قماش ({inv_row['name']}) من [{op_wh_name}]"


def deduct_fabrics_batch(cur, fabrics_list, order_label, customer_name, child_name, warehouse_id=None, created_by=None):
    """Deducts multiple BOM fabrics in a single atomic transaction with single cascade."""
    if not fabrics_list or not isinstance(fabrics_list, list):
        return []
    deductions_info = []
    has_deduction = False
    sorted_fabrics = sorted(
        fabrics_list,
        key=lambda x: (
            clean_str(x.get('fabric_id') or x.get('id') or x.get('inventory_id') or x.get('material_id') or ''),
            clean_str(x.get('fabric_name') or x.get('name') or x.get('material_name') or ''),
        ),
    )
    for item in sorted_fabrics:
        fid = item.get('fabric_id') or item.get('id') or item.get('inventory_id') or item.get('material_id') or ''
        fname = item.get('fabric_name') or item.get('name') or item.get('material_name') or ''
        qty = clean_num(item.get('cut_meters') or item.get('quantity') or item.get('qty') or item.get('cut_qty') or item.get('cut_quantity') or item.get('meters') or 0.0)
        unit = clean_str(item.get('cut_unit') or item.get('unit') or 'متر')
        if qty > 0 and (fid or fname):
            msg = deduct_fabric(cur, fid, fname, qty, unit, order_label, customer_name, child_name, warehouse_id=warehouse_id, created_by=created_by, skip_cascade=True)
            if msg:
                deductions_info.append(msg)
                if "تم اقتطاع" in msg and "مسبقاً" not in msg:
                    has_deduction = True
    if has_deduction:
        from .pg_delivery_cogs import cascade_account_balances
        cascade_account_balances(cur)
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
    return None
