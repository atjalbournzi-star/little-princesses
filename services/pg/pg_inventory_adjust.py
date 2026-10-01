# services/pg/pg_inventory_adjust.py
# Inventory adjustments (wastage & surplus) with automated balanced journal entries

import time
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str
from .account_resolver import resolve_exchange_rate


def adjust_inventory(payload):
    """تسجيل تسوية جردية للمخزون (عجز/هالك أو فائض) مع إنشاء قيد محاسبي مزدوج متوازن"""
    data = payload.get('data') or payload
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

        new_total_val = round(new_q * u_cost, 2)
        adj_amount = round(variance_qty * u_cost, 2)
        rate = resolve_exchange_rate(cur, 'YER', 1.0)
        adj_amount_yer = round(adj_amount * rate, 2)

        cur.execute("UPDATE inventory SET quantity = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_q, inv_id))

        tx_id = generate_id("ITXN")
        cur.execute("""
            INSERT INTO inventory_transactions (
                id, inventory_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_at
            ) VALUES (%s, %s, %s, %s, %s, 'ADJUSTMENT', %s, %s, CURRENT_TIMESTAMP);
        """, (tx_id, inv_id, tx_type, change_qty, u_cost, inv_id, reason))

        if adj_amount > 0:
            jv_id = generate_id("JV")
            clean_ts = int(time.time())
            entry_no = f"JV-ADJ-{clean_ts}"
            today = today_str()

            if adj_type == 'wastage':
                debit_acc, credit_acc = 'ACC-509', 'ACC-105'
                jv_desc = f"إهلاك تالف وهالك أقمشة: {actual_name} ({variance_qty} متر) - {reason}"
                line1_desc, line2_desc = f"إهلاك تالف خامات: {actual_name}", f"تخفيض مخزون خامات: {actual_name}"
            else:
                debit_acc, credit_acc = 'ACC-105', 'ACC-404'
                jv_desc = f"تسوية فائض جردي للأقمشة: {actual_name} ({variance_qty} متر) - {reason}"
                line1_desc, line2_desc = f"إضافة فائض لمخزون: {actual_name}", f"أرباح تسوية جردية: {actual_name}"

            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Inventory_Adjustment', %s, 'YER', %s, 'Posted', %s);
            """, (jv_id, entry_no, today, jv_desc, debit_acc, credit_acc, adj_amount, adj_amount, adj_amount_yer, inv_id, rate, reason))

            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
            """, (generate_id("JVL"), jv_id, debit_acc, line1_desc, adj_amount, adj_amount_yer))

            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (generate_id("JVL"), jv_id, credit_acc, line2_desc, adj_amount, adj_amount_yer))

        return {
            "success": True, "status": "success", "item_id": inv_id, "item_name": actual_name,
            "adj_type": adj_type, "variance_qty": variance_qty, "new_qty": new_q, "new_total": new_total_val,
            "unit_cost": u_cost, "adj_amount": adj_amount, "message": f"تم ترحيل قيد التسوية الجردية لـ ({actual_name}) بنجاح ⚖️"
        }
