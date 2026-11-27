# services/pg/pg_inventory_adjust.py
# Inventory adjustments (wastage & surplus) with automated balanced journal entries

from decimal import Decimal, ROUND_HALF_UP
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str
from .account_resolver import resolve_exchange_rate
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, resolve_active_user_id
from .pg_delivery_cogs import refresh_chart_balances_atomic
from services.security import assert_period_open


def _resolve_adjustment_account(cur, adj_type):
    """حل ديناميكي لحساب التسوية الجردية من public.accounts دون أي حسابات ثابتة"""
    if adj_type == 'wastage':
        cur.execute("""
            SELECT id FROM public.accounts
            WHERE is_postable = TRUE AND is_active = TRUE
              AND (account_code LIKE '5%%' OR account_type IN ('مصروفات', 'تكلفة المبيعات', 'Expenses', 'COGS'))
            ORDER BY
              CASE
                WHEN account_name ILIKE '%%تالف%%' OR account_name ILIKE '%%هالك%%' OR account_name ILIKE '%%عجز%%' OR account_name ILIKE '%%فروقات%%' OR account_name ILIKE '%%تسوية%%' THEN 0
                WHEN account_category IN ('General_Expenses', 'COGS', 'Expenses') THEN 1
                ELSE 2
              END,
              level DESC, account_code ASC
            LIMIT 1;
        """)
        row = cur.fetchone()
        if not row:
            raise ValueError("لا يوجد حساب مصروفات أو تكلفة فعال في دليل الحسابات لتسجيل قيد العجز الجردي")
        return row['id']

    cur.execute("""
        SELECT id FROM public.accounts
        WHERE is_postable = TRUE AND is_active = TRUE
          AND (account_code LIKE '4%%' OR account_type IN ('إيرادات', 'Revenue'))
        ORDER BY
          CASE
            WHEN account_name ILIKE '%%فائض%%' OR account_name ILIKE '%%تسوية%%' OR account_name ILIKE '%%فروقات%%' THEN 0
            WHEN account_category IN ('Other_Revenue', 'Revenue', 'Sales') THEN 1
            ELSE 2
          END,
          level DESC, account_code ASC
        LIMIT 1;
    """)
    row = cur.fetchone()
    if not row:
        raise ValueError("لا يوجد حساب إيرادات فعال في دليل الحسابات لتسجيل قيد الفائض الجردي")
    return row['id']


def adjust_inventory(payload):
    """تسجيل تسوية جردية للمخزون (عجز/هالك أو فائض) مع إنشاء قيد محاسبي مزدوج متوازن"""
    data = payload.get('data') or payload
    raw_uid = clean_str(data.get('created_by') or data.get('user_id') or '')
    item_id = clean_str(data.get('item_id') or data.get('id'))
    item_name = clean_str(data.get('item_name') or data.get('name'))
    adj_type = clean_str(data.get('adj_type') or data.get('type') or 'wastage').lower()
    variance_qty = clean_num(data.get('variance_qty') or data.get('qty') or 0.0)
    adj_date = clean_str(data.get('adj_date') or data.get('date') or data.get('entry_date')) or today_str()
    wh_raw = clean_str(data.get('warehouse_id') or data.get('warehouse') or '')
    reason = clean_str(data.get('reason') or data.get('notes') or ('إهلاك تالف وهالك أقمشة خياطة' if adj_type == 'wastage' else 'تسوية فائض جردي'))

    if variance_qty <= 0:
        raise ValueError("الكمية المراد تسويتها يجب أن تكون أكبر من الصفر")
    if not wh_raw:
        raise ValueError("يجب تحديد المستودع المستهدف للتسوية الجردية (warehouse_id)")

    with get_db_cursor(commit=True) as cur:
        assert_period_open(cur, adj_date)
        resolved_user = resolve_active_user_id(cur, raw_uid)

        cur.execute("""
            SELECT id, name, item_code, quantity, reserved_qty, available_qty, unit_cost
            FROM inventory
            WHERE id = %s OR name = %s OR item_code = %s
            LIMIT 1 FOR UPDATE;
        """, (item_id, item_name or item_id, item_id))
        inv_row = cur.fetchone()
        if not inv_row:
            raise ValueError(f"لم يتم العثور على صنف المخزون: {item_name or item_id}")

        cur.execute("""
            SELECT id, name, account_id FROM warehouses
            WHERE id = %s OR UPPER(code) = UPPER(%s) OR UPPER(name) = UPPER(%s)
            LIMIT 1;
        """, (wh_raw, wh_raw, wh_raw))
        wh_row = cur.fetchone()
        if not wh_row:
            raise ValueError(f"المستودع المحدد غير موجود: {wh_raw}")

        warehouse_id = wh_row['id']
        wh_acc = wh_row.get('account_id')
        if not wh_acc:
            from .pg_warehouse_accounts import create_or_link_warehouse_account
            wh_acc = create_or_link_warehouse_account(cur, warehouse_id, wh_row['name'], user_id=resolved_user)

        inv_id, actual_name = inv_row['id'], inv_row['name']
        cur_q_dec = Decimal(str(inv_row['quantity'] or 0))
        var_dec = Decimal(str(variance_qty))
        u_cost_dec = Decimal(str(inv_row['unit_cost'] or 0))

        cur.execute("SELECT id, quantity, reserved_qty FROM warehouse_stock WHERE warehouse_id = %s AND inventory_id = %s LIMIT 1 FOR UPDATE;", (warehouse_id, inv_id))
        ws_row = cur.fetchone()
        ws_qty_dec = Decimal(str(ws_row['quantity'] or 0)) if ws_row else Decimal('0')

        if adj_type == 'wastage':
            if ws_qty_dec < var_dec:
                raise ValueError(f"الكمية المتوفرة في مستودع [{wh_row['name']}] ({float(ws_qty_dec)}) أقل من كمية التسوية المطلوبة ({variance_qty})")
            if cur_q_dec < var_dec:
                raise ValueError(f"الكمية الإجمالية للصنف ({float(cur_q_dec)}) أقل من كمية التسوية المطلوبة ({variance_qty})")
            new_q_dec = cur_q_dec - var_dec
            new_ws_dec = ws_qty_dec - var_dec
            change_qty = -abs(float(var_dec))
            tx_type = 'WASTAGE'
        else:
            new_q_dec = cur_q_dec + var_dec
            new_ws_dec = ws_qty_dec + var_dec
            change_qty = abs(float(var_dec))
            tx_type = 'GAIN'

        new_q = float(new_q_dec.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP))
        new_total_val = float((new_q_dec * u_cost_dec).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP))
        adj_amt_dec = (var_dec * u_cost_dec).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        rate = resolve_exchange_rate(cur, 'YER', 1.0)
        adj_amt_yer_dec = (adj_amt_dec * Decimal(str(rate))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        adj_amount, adj_amount_yer, u_cost = float(adj_amt_dec), float(adj_amt_yer_dec), float(u_cost_dec)

        cur.execute("UPDATE inventory SET quantity = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_q, inv_id))

        tx_id = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='INV-TXN-')
        cur.execute("""
            INSERT INTO inventory_transactions (
                id, inventory_id, warehouse_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_by, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, 'ADJUSTMENT', %s, %s, %s, CURRENT_TIMESTAMP);
        """, (tx_id, inv_id, warehouse_id, tx_type, change_qty, u_cost, inv_id, reason, resolved_user))

        cur.execute("""
            INSERT INTO warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at)
            VALUES (%s, %s, %s, %s, 0.0, CURRENT_TIMESTAMP)
            ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET quantity = %s, updated_at = CURRENT_TIMESTAMP;
        """, (f"WS-{inv_id}-{warehouse_id}", warehouse_id, inv_id, float(new_ws_dec), float(new_ws_dec)))

        if adj_amount > 0 and wh_acc:
            entry_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
            counter_acc = _resolve_adjustment_account(cur, adj_type)
            if adj_type == 'wastage':
                debit_acc, credit_acc = counter_acc, wh_acc
                jv_desc = f"إهلاك تالف وهالك أقمشة: {actual_name} ({variance_qty} متر) - {reason}"
                line1_desc, line2_desc = f"إهلاك تالف خامات: {actual_name}", f"تخفيض مخزون مستودع [{wh_row['name']}]: {actual_name}"
            else:
                debit_acc, credit_acc = wh_acc, counter_acc
                jv_desc = f"تسوية فائض جردي للأقمشة: {actual_name} ({variance_qty} متر) - {reason}"
                line1_desc, line2_desc = f"إضافة فائض لمخزون مستودع [{wh_row['name']}]: {actual_name}", f"أرباح تسوية جردية: {actual_name}"

            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Inventory_Adjustment', %s, 'YER', %s, 'Posted', %s, %s);
            """, (entry_no, entry_no, adj_date, jv_desc, debit_acc, credit_acc, adj_amount, adj_amount, adj_amount_yer, inv_id, rate, reason, resolved_user))

            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0), (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (generate_id("JVL"), entry_no, debit_acc, line1_desc, adj_amount, adj_amount_yer,
                  generate_id("JVL"), entry_no, credit_acc, line2_desc, adj_amount, adj_amount_yer))

            refresh_chart_balances_atomic(cur)

        log_audit_event(
            entity_type='inventory_transactions', entity_id=tx_id, action='ADJUST',
            new_values={'tx_id': tx_id, 'item': actual_name, 'warehouse_id': warehouse_id, 'type': adj_type, 'qty': change_qty, 'new_qty': new_q},
            user_id=resolved_user, document_no=tx_id,
            details=f"تسوية مخزون {actual_name} في [{wh_row['name']}] ({tx_type}) بمقدار {change_qty}", cur=cur
        )

        return {
            "success": True, "status": "success", "item_id": inv_id, "item_name": actual_name,
            "warehouse_id": warehouse_id, "warehouse_name": wh_row['name'],
            "adj_type": adj_type, "variance_qty": variance_qty, "new_qty": new_q, "new_total": new_total_val,
            "unit_cost": u_cost, "adj_amount": adj_amount, "tx_id": tx_id, "message": f"تم ترحيل قيد التسوية الجردية لـ ({actual_name}) بنجاح ⚖️"
        }
