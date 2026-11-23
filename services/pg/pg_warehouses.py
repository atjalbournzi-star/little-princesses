# services/pg/pg_warehouses.py
# Multi-Warehouse Engine: Warehouses master, stock distribution, and atomic transfers

import logging
from .db_pool import get_db_cursor, clean_str, clean_num, execute_query
from .pg_sequences import get_next_sequence_number

logger = logging.getLogger("LittlePrincesses_PG_Warehouses")

DEFAULT_WAREHOUSES = [
    {"id": "WH-MAIN", "code": "WH-MAIN", "name": "المستودع الرئيسي", "location": "المقر الرئيسي - التخزين والتوريد", "is_active": True},
    {"id": "WH-WORKSHOP", "code": "WH-WORKSHOP", "name": "معمل وورشة الخياطة", "location": "معمل التفصيل والخياطة والإنتاج", "is_active": True},
    {"id": "WH-SHOWROOM", "code": "WH-SHOWROOM", "name": "معرض وصالة التسليم", "location": "صالة العرض والمبيعات والتسليم", "is_active": True}
]


def normalize_warehouse_id(val, default="WH-MAIN"):
    """مطابقة معرّف المستودع ديناميكياً من جدول warehouses في قاعدة البيانات"""
    clean = clean_str(val).strip()
    if not clean: return default
    try:
        with get_db_cursor() as cur:
            cur.execute("SELECT id FROM warehouses WHERE id = %s OR UPPER(code) = UPPER(%s) OR UPPER(name) = UPPER(%s) LIMIT 1;", (clean, clean, clean))
            row = cur.fetchone()
            if row: return row['id']
            cur.execute("SELECT id FROM warehouses WHERE name ILIKE %s OR code ILIKE %s ORDER BY is_active DESC, id ASC LIMIT 1;", (f"%{clean}%", f"%{clean}%"))
            row = cur.fetchone()
            if row: return row['id']
    except Exception as ex:
        logger.warning(f"Dynamic warehouse normalization note: {ex}")
    return default


_warehouses_schema_ensured = True


def ensure_warehouses_schema():
    """التحقق من إنشاء جداول المستودعات والأرصدة مع تهيئة المواقع والربط الحسابي"""
    global _warehouses_schema_ensured
    if _warehouses_schema_ensured:
        return
    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS warehouses (
                    id VARCHAR(64) PRIMARY KEY, code VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(150) NOT NULL, location VARCHAR(200), is_active BOOLEAN DEFAULT TRUE,
                    account_id VARCHAR(64) REFERENCES chart_of_accounts(id),
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS warehouse_stock (
                    id VARCHAR(64) PRIMARY KEY,
                    warehouse_id VARCHAR(64) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
                    inventory_id VARCHAR(64) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
                    quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000, reserved_qty NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
                    available_qty NUMERIC(14, 4) GENERATED ALWAYS AS (quantity - reserved_qty) STORED,
                    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, CONSTRAINT uq_warehouse_item UNIQUE(warehouse_id, inventory_id)
                );
            """)
            cur.execute("SELECT COUNT(*) as count FROM warehouses;")
            w_cnt = cur.fetchone()
            if not w_cnt or int(w_cnt.get('count') or 0) == 0:
                for w in DEFAULT_WAREHOUSES:
                    cur.execute("INSERT INTO warehouses (id, code, name, location, is_active) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING;", (w["id"], w["code"], w["name"], w["location"], w["is_active"]))

            from .pg_warehouse_accounts import sync_all_warehouses_accounts
            sync_all_warehouses_accounts(cur)
            _warehouses_schema_ensured = True
    except Exception as ex:
        logger.warning(f"Warehouses schema check note: {ex}")


def get_warehouses(payload=None):
    """استرجاع قائمة المستودعات النشطة أو الكل مع إحصائيات الأصناف والحسابات المرتبطة"""
    ensure_warehouses_schema()
    inc_inactive = bool(payload and (payload.get('all') or payload.get('include_inactive')))
    where_clause = "" if inc_inactive else "WHERE w.is_active = TRUE"
    query = f"""
        SELECT w.id, w.code, w.name, w.location, w.is_active, w.account_id,
               coa.account_code, coa.account_name,
               COALESCE(COUNT(ws.inventory_id), 0) as items_count,
               COALESCE(SUM(ws.quantity), 0) as total_units
        FROM warehouses w
        LEFT JOIN chart_of_accounts coa ON w.account_id = coa.id
        LEFT JOIN warehouse_stock ws ON w.id = ws.warehouse_id AND ws.quantity > 0
        {where_clause}
        GROUP BY w.id, w.code, w.name, w.location, w.is_active, w.account_id, coa.account_code, coa.account_name
        ORDER BY CASE w.id WHEN 'WH-MAIN' THEN 1 WHEN 'WH-WORKSHOP' THEN 2 WHEN 'WH-SHOWROOM' THEN 3 ELSE 4 END;
    """
    rows = execute_query(query, fetch_all=True) or []
    for r in rows:
        r["total_units"] = float(r["total_units"] or 0)
        r["items_count"] = int(r["items_count"] or 0)
    return rows


def get_item_stock_by_warehouse(inventory_id):
    """جلب توزيع رصيد مادة معينة عبر جميع المستودعات"""
    query = """
        SELECT w.id as warehouse_id, w.code as warehouse_code, w.name as warehouse_name,
               COALESCE(ws.quantity, 0) as quantity,
               COALESCE(ws.reserved_qty, 0) as reserved_qty,
               COALESCE(ws.available_qty, ws.quantity - COALESCE(ws.reserved_qty, 0), 0) as available_qty
        FROM warehouses w
        LEFT JOIN warehouse_stock ws ON w.id = ws.warehouse_id AND ws.inventory_id = %s
        WHERE w.is_active = TRUE
        ORDER BY w.id;
    """
    rows = execute_query(query, (inventory_id,), fetch_all=True) or []
    for r in rows:
        r["quantity"] = float(r["quantity"] or 0)
        r["reserved_qty"] = float(r["reserved_qty"] or 0)
        r["available_qty"] = float(r["available_qty"] or 0)
    return rows

# Re-export from write module to keep facade lean (governance: max 220 lines)
from .pg_warehouses_write import (
    add_warehouse, update_warehouse, toggle_warehouse_status, delete_warehouse_if_empty
)  # noqa: F401


def transfer_warehouse_stock(payload):
    """تنفيذ مناقلة مخزنية ذرية بين مستودعين مع حركتي TRANSFER_OUT / TRANSFER_IN برقم مرجعي موحد"""
    ensure_warehouses_schema()
    data = payload.get("data") or payload
    item_id = clean_str(data.get("item_id") or data.get("id"))
    item_name = clean_str(data.get("item_name") or data.get("name"))
    from_wh = normalize_warehouse_id(data.get("from_warehouse") or data.get("from_location") or "WH-MAIN")
    to_wh = normalize_warehouse_id(data.get("to_warehouse") or data.get("to_location") or "WH-WORKSHOP")
    qty = clean_num(data.get("quantity") or data.get("qty") or 0.0)
    notes = clean_str(data.get("notes") or "")

    if qty <= 0:
        raise ValueError("الكمية المراد نقلها يجب أن تكون أكبر من الصفر")
    if from_wh == to_wh:
        raise ValueError("لا يمكن إجراء مناقلة مخزنية لنفس المستودع")

    with get_db_cursor(commit=True) as cur:
        # البحث عن المادة في المخزون
        cur.execute("SELECT id, name, unit, unit_cost, quantity FROM inventory WHERE id = %s OR name = %s OR item_code = %s LIMIT 1 FOR UPDATE;", (item_id, item_name or item_id, item_id))
        inv = cur.fetchone()
        if not inv:
            raise ValueError(f"لم يتم العثور على الصنف المخزني: {item_name or item_id}")

        inv_id, actual_name, unit, u_cost = inv["id"], inv["name"], inv.get("unit") or "متر", float(inv.get("unit_cost") or 0.0)

        # التحقق من رصيد المستودع المصدر
        cur.execute("SELECT id, quantity, reserved_qty, COALESCE(available_qty, quantity - reserved_qty) as avail FROM warehouse_stock WHERE warehouse_id = %s AND inventory_id = %s LIMIT 1 FOR UPDATE;", (from_wh, inv_id))
        src_stock = cur.fetchone()
        src_avail = float(src_stock["avail"] or 0.0) if src_stock else 0.0

        cur.execute("SELECT id, name, account_id FROM warehouses WHERE id IN (%s, %s);", (from_wh, to_wh))
        wh_rows = cur.fetchall()
        wh_map = {w['id']: w['name'] for w in wh_rows}
        wh_accs = {w['id']: w.get('account_id') for w in wh_rows}
        from_name = wh_map.get(from_wh, from_wh)
        to_name = wh_map.get(to_wh, to_wh)

        if not src_stock or src_avail < qty:
            raise ValueError(f"الرصيد المتاح في {from_name} ({src_avail} {unit}) غير كافٍ لنقل {qty} {unit}")

        # رقم مرجعي موحد للمناقلة من محرك التسلسل المركزي
        transfer_ref = get_next_sequence_number(cur, 'TRF', fallback_prefix='TRF-')

        # استكمال ربط الحسابات المحاسبية للمستودعين إن لم تكن مربوطة
        from .pg_warehouse_accounts import create_or_link_warehouse_account
        from_acc = wh_accs.get(from_wh) or create_or_link_warehouse_account(cur, from_wh, from_name)
        to_acc = wh_accs.get(to_wh) or create_or_link_warehouse_account(cur, to_wh, to_name)

        # 1. خصم من مستودع المصدر دون المساس برصيد inventory الإجمالي
        cur.execute("UPDATE warehouse_stock SET quantity = quantity - %s, updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = %s AND inventory_id = %s;", (qty, from_wh, inv_id))

        # 2. قيد حركة الصرف (TRANSFER_OUT)
        itxn_out = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='ITXN-')
        cur.execute("""
            INSERT INTO inventory_transactions (id, inventory_id, warehouse_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_at)
            VALUES (%s, %s, %s, 'TRANSFER_OUT', %s, %s, 'TRANSFER', %s, %s, CURRENT_TIMESTAMP);
        """, (itxn_out, inv_id, from_wh, -abs(qty), u_cost, transfer_ref, f"مناقلة مخزنية صادرة إلى [{to_name}] | {notes}".strip(" |")))

        sm_out = get_next_sequence_number(cur, 'SM', fallback_prefix='SM-')
        cur.execute("""
            INSERT INTO stock_movements (id, item_id, warehouse_id, movement_type, quantity, unit_cost, total_cost, reference_type, reference_id, notes, created_at)
            VALUES (%s, %s, %s, 'TRANSFER_OUT', %s, %s, %s, 'TRANSFER', %s, %s, CURRENT_TIMESTAMP);
        """, (sm_out, inv_id, from_wh, -abs(qty), u_cost, round(qty * u_cost, 4), transfer_ref, f"مناقلة صادرة إلى [{to_name}] | {notes}".strip(" |")))

        # 3. إضافة إلى مستودع الوجهة دون المساس برصيد inventory الإجمالي
        cur.execute("""
            INSERT INTO warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at)
            VALUES (%s, %s, %s, %s, 0.0, CURRENT_TIMESTAMP)
            ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP;
        """, (f"WS-{inv_id}-{to_wh}", to_wh, inv_id, qty))

        # 4. قيد حركة الإيداع (TRANSFER_IN) بنفس الرقم المرجعي الموحد
        itxn_in = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='ITXN-')
        cur.execute("""
            INSERT INTO inventory_transactions (id, inventory_id, warehouse_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_at)
            VALUES (%s, %s, %s, 'TRANSFER_IN', %s, %s, 'TRANSFER', %s, %s, CURRENT_TIMESTAMP);
        """, (itxn_in, inv_id, to_wh, abs(qty), u_cost, transfer_ref, f"مناقلة مخزنية واردة من [{from_name}] | {notes}".strip(" |")))

        sm_in = get_next_sequence_number(cur, 'SM', fallback_prefix='SM-')
        cur.execute("""
            INSERT INTO stock_movements (id, item_id, warehouse_id, movement_type, quantity, unit_cost, total_cost, reference_type, reference_id, notes, created_at)
            VALUES (%s, %s, %s, 'TRANSFER_IN', %s, %s, %s, 'TRANSFER', %s, %s, CURRENT_TIMESTAMP);
        """, (sm_in, inv_id, to_wh, abs(qty), u_cost, round(qty * u_cost, 4), transfer_ref, f"مناقلة واردة من [{from_name}] | {notes}".strip(" |")))

        # 5. ترحيل القيد المحاسبي المزدوج بين الحسابين الفرعيين للمستودعين
        from .pg_warehouse_transfer_post import post_warehouse_transfer_journal
        jv_no = post_warehouse_transfer_journal(cur, transfer_ref, from_name, to_name, from_acc, to_acc, qty, u_cost, notes, data.get("user_id"))

        return {
            "success": True, "status": "success", "transfer_ref": transfer_ref, "journal_entry_no": jv_no,
            "item_id": inv_id, "item_name": actual_name, "from_warehouse": from_wh, "from_warehouse_name": from_name,
            "to_warehouse": to_wh, "to_warehouse_name": to_name, "quantity": qty, "unit": unit,
            "message": f"تمت مناقلة {qty} {unit} من [{from_name}] إلى [{to_name}] وترحيل قيد اليومية بنجاح 🔄"
        }
