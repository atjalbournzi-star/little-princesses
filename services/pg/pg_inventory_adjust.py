# services/pg/pg_inventory_adjust.py
# Inventory adjustments (wastage & surplus) with automated balanced journal entries

import time
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str
from .account_resolver import resolve_exchange_rate
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, get_active_user_context


def adjust_inventory(payload):
    """تسجيل تسوية جردية للمخزون (عجز/هالك أو فائض) مع إنشاء قيد محاسبي مزدوج متوازن"""
    data = payload.get('data') or payload
    raw_uid = clean_str(data.get('created_by') or data.get('user_id') or '')
    resolved_user = raw_uid or get_active_user_context('admin')

    item_id = clean_str(data.get('item_id') or data.get('id'))
    item_name = clean_str(data.get('item_name') or data.get('name'))
    adj_type = clean_str(data.get('adj_type') or data.get('type') or 'wastage').lower()
    variance_qty = clean_num(data.get('variance_qty') or data.get('qty') or 0.0)
    reason = clean_str(data.get('reason') or data.get('notes') or ('إهلاك تالف وهالك أقمشة خياطة' if adj_type == 'wastage' else 'تسوية فائض جردي'))

    if variance_qty <= 0:
        raise ValueError("الكمية المراد تسويتها يجب أن تكون أكبر من الصفر")

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT id, name, item_code, quantity, reserved_qty, available_qty, unit_cost
            FROM inventory
            WHERE id = %s OR name = %s OR item_code = %s
            LIMIT 1 FOR UPDATE;
        """, (item_id, item_name or item_id, item_id))
        inv_row = cur.fetchone()
        if not inv_row:
            raise ValueError(f"لم يتم العثور على صنف المخزون: {item_name or item_id}")

        inv_id = inv_row['id']
        actual_name = inv_row['name']
        cur_q = float(inv_row['quantity'] or 0.0)
        u_cost = float(inv_row['unit_cost'] or 0.0)

        if adj_type == 'wastage':
            new_q = max(0.0, cur_q - variance_qty)
            change_qty = -abs(variance_qty)
            tx_type = 'WASTAGE'
        else:
            new_q = cur_q + variance_qty
            change_qty = abs(variance_qty)
            tx_type = 'GAIN'

        new_total_val = round(new_q * u_cost, 4)
        adj_amount = round(variance_qty * u_cost, 2)
        rate = resolve_exchange_rate(cur, 'YER', 1.0)
        adj_amount_yer = round(adj_amount * rate, 2)

        cur.execute("UPDATE inventory SET quantity = %s, total_value = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_q, new_total_val, inv_id))

        wh_raw = clean_str(data.get('warehouse_id') or data.get('warehouse') or '')
        cur.execute("SELECT id, name, account_id FROM warehouses WHERE id = %s OR code = %s OR name = %s LIMIT 1;", (wh_raw, wh_raw, wh_raw))
        wh_row = cur.fetchone()
        if not wh_row:
            cur.execute("SELECT id, name, account_id FROM warehouses WHERE is_active = TRUE ORDER BY id ASC LIMIT 1;")
            wh_row = cur.fetchone()
        warehouse_id = wh_row['id'] if wh_row else ''
        wh_acc = wh_row.get('account_id') if wh_row else None
        if not wh_acc and wh_row:
            from .pg_warehouse_accounts import create_or_link_warehouse_account
            wh_acc = create_or_link_warehouse_account(cur, wh_row['id'], wh_row['name'], user_id=resolved_user)

        tx_id = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='INV-TXN-')
        cur.execute("""
            INSERT INTO inventory_transactions (
                id, inventory_id, warehouse_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_by, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, 'ADJUSTMENT', %s, %s, %s, CURRENT_TIMESTAMP);
        """, (tx_id, inv_id, warehouse_id, tx_type, change_qty, u_cost, inv_id, reason, resolved_user))

        if warehouse_id:
            cur.execute("""
                INSERT INTO warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at)
                VALUES (%s, %s, %s, %s, 0.0, CURRENT_TIMESTAMP)
                ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET quantity = GREATEST(0, warehouse_stock.quantity + EXCLUDED.quantity), updated_at = CURRENT_TIMESTAMP;
            """, (f"WS-{inv_id}-{warehouse_id}", warehouse_id, inv_id, change_qty))

        if adj_amount > 0 and wh_acc:
            entry_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
            jv_id = entry_no
            today = today_str()

            if adj_type == 'wastage':
                cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_name ILIKE '%تالف%' OR account_name ILIKE '%هالك%' OR account_category ILIKE 'Expenses') ORDER BY level DESC LIMIT 1;")
                exp_acc = (cur.fetchone() or {}).get('id') or 'ACC-509'
                debit_acc, credit_acc = exp_acc, wh_acc
                jv_desc = f"إهلاك تالف وهالك أقمشة: {actual_name} ({variance_qty} متر) - {reason}"
                line1_desc, line2_desc = f"إهلاك تالف خامات: {actual_name}", f"تخفيض مخزون مستودع [{wh_row['name']}]: {actual_name}"
            else:
                cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_name ILIKE '%فائض%' OR account_name ILIKE '%تسوية%' OR account_category ILIKE 'Revenue') ORDER BY level DESC LIMIT 1;")
                rev_acc = (cur.fetchone() or {}).get('id') or 'ACC-404'
                debit_acc, credit_acc = wh_acc, rev_acc
                jv_desc = f"تسوية فائض جردي للأقمشة: {actual_name} ({variance_qty} متر) - {reason}"
                line1_desc, line2_desc = f"إضافة فائض لمخزون مستودع [{wh_row['name']}]: {actual_name}", f"أرباح تسوية جردية: {actual_name}"

            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Inventory_Adjustment', %s, 'YER', %s, 'Posted', %s, %s);
            """, (jv_id, entry_no, today, jv_desc, debit_acc, credit_acc, adj_amount, adj_amount, adj_amount_yer, inv_id, rate, reason, resolved_user))

            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
            """, (generate_id("JVL"), jv_id, debit_acc, line1_desc, adj_amount, adj_amount_yer))

            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (generate_id("JVL"), jv_id, credit_acc, line2_desc, adj_amount, adj_amount_yer))

            for aid in (debit_acc, credit_acc):
                cur.execute("SELECT COALESCE(SUM(debit_base - credit_base), 0.0) as net FROM journal_entry_lines WHERE account_id = %s;", (aid,))
                net = cur.fetchone()['net'] or 0.0
                cur.execute("UPDATE chart_of_accounts SET current_balance = %s WHERE id = %s;", (net, aid))

        log_audit_event(
            entity_type='inventory_transactions',
            entity_id=tx_id,
            action='ADJUST',
            new_values={'tx_id': tx_id, 'item': actual_name, 'type': adj_type, 'qty': change_qty, 'new_qty': new_q},
            user_id=resolved_user,
            document_no=tx_id,
            details=f"تسوية مخزون {actual_name} ({tx_type}) بمقدار {change_qty}",
            cur=cur
        )

        return {
            "success": True, "status": "success", "item_id": inv_id, "item_name": actual_name,
            "adj_type": adj_type, "variance_qty": variance_qty, "new_qty": new_q, "new_total": new_total_val,
            "unit_cost": u_cost, "adj_amount": adj_amount, "tx_id": tx_id, "message": f"تم ترحيل قيد التسوية الجردية لـ ({actual_name}) بنجاح ⚖️"
        }
