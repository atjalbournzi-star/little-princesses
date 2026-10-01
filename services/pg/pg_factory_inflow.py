import logging
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id

logger = logging.getLogger("LittlePrincesses_PG_FactoryInflow")


def process_stock_inflow(payload):
    data = payload.get('data') or payload
    po_id = clean_str(data.get('id') or data.get('production_order_no') or data.get('order_no') or data.get('order_id'))
    if not po_id:
        return {"success": False, "error": "رقم أمر الإنتاج مطلوب للتوريد"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT * FROM production_orders 
            WHERE id = %s OR production_order_no = %s OR order_id = %s
               OR id = 'PRD-' || %s OR production_order_no = 'PO-' || %s
            LIMIT 1 FOR UPDATE;
        """, (po_id, po_id, po_id, po_id, po_id))
        po = cur.fetchone()
        if not po:
            return {"success": False, "error": f"أمر الإنتاج [{po_id}] غير موجود"}

        if po.get('stock_received'):
            return {
                "success": True,
                "already_received": True,
                "message": f"أمر الإنتاج [{po.get('production_order_no') or po_id}] تم توريده مسبقاً للمخزن 📦"
            }

        target_po_no = po.get('production_order_no') or f"PO-{po_id}"
        prod_name = po.get('product_name') or 'موديل راقي'
        prod_id = po.get('product_id')
        pieces_count = int(clean_num(po.get('pieces_count') or 1))
        if pieces_count <= 0:
            pieces_count = 1

        cut_qty = clean_num(po.get('cut_meters') or 0.0)
        fabric_name = clean_str(po.get('fabric_name') or '')
        fabric_unit_cost = 0.0
        if fabric_name:
            cur.execute(
                "SELECT unit_cost FROM inventory WHERE name = %s OR name ILIKE %s OR id = %s LIMIT 1;",
                (fabric_name, f"%{fabric_name}%", fabric_name)
            )
            f_row = cur.fetchone()
            if f_row:
                fabric_unit_cost = clean_num(f_row.get('unit_cost') or 0.0)

        total_fabric_cost = round(cut_qty * fabric_unit_cost, 2)
        fabric_cost_per_piece = round(total_fabric_cost / pieces_count, 2)

        cutter_w = clean_num(po.get('cutter_wage') or 0.0)
        tailor_w = clean_num(po.get('tailor_wage') or 0.0)
        embroid_w = clean_num(po.get('embroiderer_wage') or 0.0)
        finisher_w = clean_num(po.get('finisher_wage') or 0.0)
        labor_cost_per_piece = round(cutter_w + tailor_w + embroid_w + finisher_w, 2)
        total_labor_cost = round(labor_cost_per_piece * pieces_count, 2)

        unit_cost = round(fabric_cost_per_piece + labor_cost_per_piece, 2)
        total_mfg_cost = round(total_fabric_cost + total_labor_cost, 2)

        tx_id = generate_id("ITXN")
        tx_notes = (
            f"توريد مخزني جاهز لأمر الإنتاج {target_po_no} ({prod_name}) | "
            f"الكمية: {pieces_count} قطعة | التكلفة للقطعة: {unit_cost} ر.ي "
            f"(قماش: {fabric_cost_per_piece} + أجور فنيين: {labor_cost_per_piece})"
        )
        cur.execute("""
            INSERT INTO inventory_transactions (
                id, warehouse_id, product_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes
            ) VALUES (%s, 'WH-SHOWROOM', %s, 'PRODUCTION_IN', %s, %s, 'production_orders', %s, %s);
        """, (tx_id, prod_id, pieces_count, unit_cost, target_po_no, tx_notes))

        if prod_id or prod_name:
            cur.execute("""
                UPDATE products
                SET cost_price = %s, labor_cost = %s, fabric_cost = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s OR model_name = %s OR model_name ILIKE %s;
            """, (unit_cost, labor_cost_per_piece, fabric_cost_per_piece, prod_id, prod_name, f"%{prod_name}%"))

        cur.execute("SELECT id, quantity FROM inventory WHERE name = %s OR item_code = %s LIMIT 1;", (prod_name, prod_id))
        inv_item = cur.fetchone()
        if inv_item:
            inv_id = inv_item['id']
            cur.execute("""
                UPDATE inventory 
                SET quantity = quantity + %s, unit_cost = %s, location = 'معرض وصالة التسليم', updated_at = CURRENT_TIMESTAMP 
                WHERE id = %s;
            """, (pieces_count, unit_cost, inv_id))
        else:
            inv_id = generate_id("INV")
            cur.execute("""
                INSERT INTO inventory (id, item_code, name, type, category, unit, quantity, unit_cost, location, status)
                VALUES (%s, %s, %s, 'Finished', 'فساتين جاهزة', 'قطعة', %s, %s, 'معرض وصالة التسليم', 'Active');
            """, (inv_id, prod_id or target_po_no, prod_name, pieces_count, unit_cost))

        cur.execute("""
            INSERT INTO warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at)
            VALUES (%s, 'WH-SHOWROOM', %s, %s, 0.0, CURRENT_TIMESTAMP)
            ON CONFLICT (warehouse_id, inventory_id)
            DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity,
                          updated_at = CURRENT_TIMESTAMP;
        """, (f"WS-{inv_id}-WH-SHOWROOM", inv_id, pieces_count))

        cur.execute("""
            UPDATE production_orders
            SET stock_received = TRUE, stage = 'جاهز للتسليم 📦', progress = 100, status = 'Completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *;
        """, (po['id'],))

    return {
        "success": True,
        "message": f"تم توريد {pieces_count} فساتين من موديل [{prod_name}] للمخزن بنجاح 📦 بتكلفة {unit_cost} ر.ي/قطعة",
        "data": {
            "production_order_no": target_po_no,
            "product_name": prod_name,
            "pieces_count": pieces_count,
            "unit_cost": unit_cost,
            "fabric_cost_per_piece": fabric_cost_per_piece,
            "labor_cost_per_piece": labor_cost_per_piece,
            "total_manufacturing_cost": total_mfg_cost,
            "stock_received": True
        }
    }


def reverse_stock_inflow(payload):
    data = payload.get('data') or payload
    po_id = clean_str(data.get('id') or data.get('production_order_no') or data.get('order_no') or data.get('order_id'))
    if not po_id:
        return {"success": False, "error": "رقم أمر الإنتاج مطلوب لإلغاء التوريد"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT * FROM production_orders 
            WHERE id = %s OR production_order_no = %s OR order_id = %s
               OR id = 'PRD-' || %s OR production_order_no = 'PO-' || %s
            LIMIT 1 FOR UPDATE;
        """, (po_id, po_id, po_id, po_id, po_id))
        po = cur.fetchone()
        if not po:
            return {"success": False, "error": "أمر الإنتاج غير موجود"}

        if not po.get('stock_received'):
            return {"success": False, "error": "هذا الأمر لم يتم توريده للمخزن بعد لإلغائه"}

        target_po_no = po.get('production_order_no') or po_id
        pieces_count = int(clean_num(po.get('pieces_count') or 1))

        cur.execute("""
            DELETE FROM inventory_transactions
            WHERE reference_type = 'production_orders' AND reference_id = %s AND transaction_type = 'PRODUCTION_IN';
        """, (target_po_no,))

        cur.execute("SELECT id FROM inventory WHERE name = %s OR item_code = %s LIMIT 1;", (po.get('product_name'), po.get('product_id')))
        inv_item = cur.fetchone()
        if inv_item:
            cur.execute("""
                UPDATE warehouse_stock
                SET quantity = GREATEST(0.0, quantity - %s), updated_at = CURRENT_TIMESTAMP
                WHERE warehouse_id = 'WH-SHOWROOM' AND inventory_id = %s;
            """, (pieces_count, inv_item['id']))

        cur.execute("""
            UPDATE inventory
            SET quantity = GREATEST(0, quantity - %s), updated_at = CURRENT_TIMESTAMP
            WHERE name = %s OR item_code = %s;
        """, (pieces_count, po.get('product_name'), po.get('product_id')))

        cur.execute("""
            UPDATE production_orders
            SET stock_received = FALSE, status = 'In Progress', updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *;
        """, (po['id'],))

    return {"success": True, "message": f"تم إلغاء التوريد المخزني لأمر التشغيل {target_po_no} بنجاح ويمكنك تعديله الآن 🔄"}
