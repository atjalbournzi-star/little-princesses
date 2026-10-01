# services/pg/pg_inventory.py
# Materials and fabrics inventory stock management, updates, movements, and deletion

from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, execute_query
from .account_resolver import resolve_exchange_rate
from .pg_inventory_adjust import adjust_inventory


def get_inventory(params=None):
    """استرجاع أرصدة مخزون الخامات والأقمشة وتكاليفها مع دعم المستودعات المتعددة"""
    params = params or {}
    raw_wh = clean_str(params.get('warehouse_id') or params.get('warehouse') or params.get('location') or '')
    from .pg_warehouses import normalize_warehouse_id
    wh_filter = normalize_warehouse_id(raw_wh, default='') if raw_wh and raw_wh not in ('الكل', 'ALL', 'all') else ''

    if wh_filter:
        query = """
            SELECT i.id, i.item_code, i.name, i.name as item_name, i.type, i.category, i.unit,
                   COALESCE(ws.quantity, 0.0) as quantity, COALESCE(ws.quantity, 0.0) as qty,
                   COALESCE(ws.quantity, 0.0) as current_balance,
                   COALESCE(ws.reserved_qty, 0.0) as reserved_qty,
                   COALESCE(ws.available_qty, ws.quantity - COALESCE(ws.reserved_qty, 0), 0.0) as available_qty,
                   COALESCE(i.min_limit, 5.0) as min_limit, i.min_limit as reorder_level,
                   COALESCE(i.unit_cost, 0.0) as unit_cost, i.unit_cost as avg_cost,
                   COALESCE(ws.quantity, 0.0) * COALESCE(i.unit_cost, 0.0) as total_value,
                   COALESCE(i.currency, 'YER') as currency, COALESCE(s.name, 'مورد عام') as supplier,
                   i.supplier_id, w.name as location, w.id as warehouse_id,
                   COALESCE(i.status, 'Available') as status, i.created_at, i.updated_at
            FROM inventory i
            LEFT JOIN warehouse_stock ws ON i.id = ws.inventory_id AND ws.warehouse_id = %s
            LEFT JOIN warehouses w ON w.id = %s
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            ORDER BY i.name ASC;
        """
        rows = execute_query(query, (wh_filter, wh_filter), fetch_all=True) or []
    else:
        query = """
            SELECT i.id, i.item_code, i.name, i.name as item_name, i.type, i.category, i.unit,
                   i.quantity, i.quantity as qty, i.quantity as quantity_meters, i.quantity as current_balance,
                   COALESCE(i.reserved_qty, 0) as reserved_qty,
                   COALESCE(i.available_qty, i.quantity - COALESCE(i.reserved_qty, 0), i.quantity) as available_qty,
                   COALESCE(i.min_limit, 5.0) as min_limit, i.min_limit as reorder_level,
                   COALESCE(i.unit_cost, 0.0) as unit_cost, i.unit_cost as avg_cost,
                   i.unit_cost as cost, i.unit_cost as cost_per_meter, i.unit_cost as cost_per_unit,
                   COALESCE(i.total_value, i.quantity * i.unit_cost, 0.0) as total_value,
                   COALESCE(i.currency, 'YER') as currency,
                   COALESCE(s.name, i.supplier_id, 'مورد عام') as supplier,
                   i.supplier_id, COALESCE(i.location, 'المستودع الرئيسي') as location,
                   COALESCE(i.status, 'Available') as status, i.created_at, i.updated_at
            FROM inventory i
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            ORDER BY i.name ASC;
        """
        rows = execute_query(query, fetch_all=True) or []

    # إلحاق تفاصيل أرصدة المستودعات لكل مادة
    ws_all = execute_query("SELECT warehouse_id, inventory_id, quantity, available_qty FROM warehouse_stock;", fetch_all=True) or []
    ws_map = {}
    for w_entry in ws_all:
        inv_k = w_entry['inventory_id']
        ws_map.setdefault(inv_k, {})[w_entry['warehouse_id']] = float(w_entry['quantity'] or 0.0)

    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('updated_at'): r['updated_at'] = str(r['updated_at'])
        r['warehouse_stocks'] = ws_map.get(r['id'], {'WH-MAIN': float(r.get('quantity') or 0.0)})
    return rows


def add_or_update_inventory(payload):
    """إضافة أو تحديث بطاقة مادة في المخزون"""
    data = payload.get('data') or payload
    inv_id = clean_str(data.get('id') or data.get('item_id'))
    item_code = clean_str(data.get('item_code') or data.get('code'))
    name = clean_str(data.get('name') or data.get('item_name') or 'خامة قماش')
    m_type = clean_str(data.get('type') or 'Fabric')
    cat = clean_str(data.get('category') or 'أقمشة فاخرة')
    unit = clean_str(data.get('unit') or 'متر')
    qty = clean_num(data.get('quantity') or data.get('qty') or data.get('current_balance') or 0.0)
    res_qty = clean_num(data.get('reserved_qty') or 0.0)
    min_lim = clean_num(data.get('min_limit') or data.get('reorder_level') or 5.0)
    unit_cost = clean_num(data.get('unit_cost') or data.get('cost') or data.get('cost_per_meter') or data.get('avg_cost') or 0.0)
    location = clean_str(data.get('location') or 'المستودع الرئيسي')
    supplier_id = clean_str(data.get('supplier_id') or data.get('supplier') or '')
    curr_raw = clean_str(data.get('currency') or 'YER')
    curr = 'SAR' if 'SAR' in curr_raw.upper() else ('USD' if 'USD' in curr_raw.upper() else 'YER')

    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, clean_num(data.get('exchange_rate') or 1.0))
        unit_cost_yer = round(unit_cost * rate, 2)

        if not inv_id:
            cur.execute("SELECT id, item_code FROM inventory WHERE name = %s OR (item_code IS NOT NULL AND item_code = %s) LIMIT 1;", (name, item_code or name))
            ex_row = cur.fetchone()
            if ex_row:
                inv_id = ex_row['id']
                if not item_code: item_code = ex_row['item_code']
        if not inv_id: inv_id = generate_id("MAT")
        if not item_code: item_code = inv_id

        query = """
            INSERT INTO inventory (
                id, item_code, name, type, category, unit, quantity, reserved_qty,
                min_limit, unit_cost, currency, supplier_id, location, status, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'YER', %s, %s, 'Available', CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                item_code = EXCLUDED.item_code, name = EXCLUDED.name, type = EXCLUDED.type,
                category = EXCLUDED.category, unit = EXCLUDED.unit, quantity = EXCLUDED.quantity,
                reserved_qty = EXCLUDED.reserved_qty, min_limit = EXCLUDED.min_limit, unit_cost = EXCLUDED.unit_cost,
                currency = 'YER', supplier_id = COALESCE(NULLIF(EXCLUDED.supplier_id, ''), inventory.supplier_id),
                location = EXCLUDED.location, updated_at = CURRENT_TIMESTAMP
            RETURNING *, name as item_name, quantity as qty, quantity as current_balance, unit_cost as avg_cost, unit_cost as cost, 'YER' as currency;
        """
        params = (inv_id, item_code, name, m_type, cat, unit, qty, res_qty, min_lim, unit_cost_yer, supplier_id, location)
        cur.execute(query, params)
        res = dict(cur.fetchone())

        from .pg_warehouses import normalize_warehouse_id
        target_wh = normalize_warehouse_id(location, default="WH-MAIN")
        cur.execute("""
            INSERT INTO warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at)
            VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET
                quantity = EXCLUDED.quantity, reserved_qty = EXCLUDED.reserved_qty, updated_at = CURRENT_TIMESTAMP;
        """, (f"WS-{inv_id}-{target_wh}", target_wh, inv_id, qty, res_qty))

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        res['success'] = True
        return res


def update_inventory_qty(payload):
    """تعديل كمية المخزون المباشرة وحفظ حركة المستودع"""
    data = payload.get('data') or payload
    item_id = clean_str(data.get('id') or data.get('item_id') or data.get('item_code') or data.get('item_name') or data.get('name'))
    qty_deduct = clean_num(data.get('qty_to_deduct'))
    change = -abs(qty_deduct) if qty_deduct > 0 else clean_num(data.get('change_qty') or data.get('quantity') or data.get('qty') or 0.0)
    tx_type = clean_str(data.get('type') or ('PRODUCTION_OUT' if change < 0 else 'ADJUSTMENT'))
    notes = clean_str(data.get('notes') or ('صرف خامات لمعمل التفصيل' if change < 0 else 'تعديل مخزني'))

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT * FROM inventory WHERE id = %s OR item_code = %s OR name = %s LIMIT 1 FOR UPDATE;", (item_id, item_id, item_id))
        row = cur.fetchone()
        if not row:
            new_id = generate_id("MAT")
            init_qty = max(0.0, 100.0 + change)
            cur.execute("""
                INSERT INTO inventory (id, item_code, name, type, category, unit, quantity, unit_cost, location, status)
                VALUES (%s, %s, %s, 'Fabric', 'أقمشة فاخرة', 'meter', %s, 0.0, 'المستودع الرئيسي', 'Available')
                RETURNING *, name as item_name, quantity as current_balance;
            """, (new_id, new_id, item_id or 'خامة قماش', init_qty))
            row = cur.fetchone()

        old_q = float(row['quantity'] or 0.0)
        u_cost = float(row['unit_cost'] or 0.0)
        new_q = max(0.0, old_q + change)
        new_total = round(new_q * u_cost, 2)

        cur.execute("""
            UPDATE inventory SET quantity = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s
            RETURNING *, name as item_name, quantity as current_balance, quantity as qty;
        """, (new_q, row['id']))
        updated_row = dict(cur.fetchone())

        cur.execute("""
            INSERT INTO inventory_transactions (id, inventory_id, transaction_type, quantity, unit_cost, reference_type, notes)
            VALUES (%s, %s, %s, %s, %s, 'MANUAL', %s);
        """, (generate_id("ITXN"), row['id'], tx_type, change, u_cost, notes))

        updated_row['new_qty'] = new_q
        updated_row['new_total'] = new_total
        updated_row['success'] = True
        return updated_row


def delete_inventory(payload):
    """حذف صنف المخزون وحركاته المرتبطة بأمان"""
    data = payload.get('data') or payload
    iid = clean_str(data.get('id') or data.get('item_id'))
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM inventory_transactions WHERE inventory_id = %s;", (iid,))
        cur.execute("DELETE FROM inventory WHERE id = %s;", (iid,))
    return {"deleted": True, "id": iid}
