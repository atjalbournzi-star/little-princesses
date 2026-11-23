# services/pg/pg_warehouse_transfer_post.py
# Warehouse stock transfers journal posting and historical lines reconciliation

import logging
from .db_pool import clean_num
from .pg_audit import log_audit_event, resolve_active_user_id
from .pg_sequences import get_next_sequence_number
from .pg_warehouse_accounts import sync_all_warehouses_accounts

logger = logging.getLogger("LittlePrincesses_PG_WarehouseTransferPost")


def post_warehouse_transfer_journal(cur, transfer_ref, from_name, to_name, from_acc, to_acc, qty, u_cost, notes="", user_id=None):
    """ترحيل قيد محاسبي مزدوج ومتوازن لمناقلة مخزنية بين مستودعين"""
    tot_amt = round(clean_num(qty) * clean_num(u_cost), 4)
    if tot_amt <= 0 or not from_acc or not to_acc or from_acc == to_acc:
        return None

    active_user = resolve_active_user_id(cur, user_id)
    jv_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
    jv_id = f"JV-{transfer_ref}"
    desc = f"مناقلة مخزنية ({transfer_ref}): من [{from_name}] إلى [{to_name}] ({qty} وحدة)"

    cur.execute("""
        INSERT INTO journal_entries (
            id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency,
            exchange_rate, status, notes, created_by, created_at
        ) VALUES (
            %s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'Transfer', %s, 'YER', 1.0, 'Posted', %s, %s, CURRENT_TIMESTAMP
        ) ON CONFLICT (entry_no) DO UPDATE SET
            amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount,
            created_by = COALESCE(journal_entries.created_by, EXCLUDED.created_by);
    """, (jv_id, jv_no, desc, to_acc, from_acc, tot_amt, tot_amt, tot_amt, transfer_ref, notes, active_user))

    cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (jv_no,))
    row = cur.fetchone()
    act_id = row['id'] if row else jv_id
    cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (act_id,))

    cur.execute("""
        INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
        VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
    """, (f"JVL-{transfer_ref}-D", act_id, to_acc, f"مدين - استلام مناقلة في [{to_name}] من [{from_name}]", tot_amt, tot_amt))

    cur.execute("""
        INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
        VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
    """, (f"JVL-{transfer_ref}-C", act_id, from_acc, f"دائن - صرف مناقلة من [{from_name}] إلى [{to_name}]", tot_amt, tot_amt))

    for aid in (from_acc, to_acc):
        cur.execute("SELECT COALESCE(SUM(debit_base - credit_base), 0.0) as net FROM journal_entry_lines WHERE account_id = %s;", (aid,))
        net = cur.fetchone()['net'] or 0.0
        cur.execute("UPDATE chart_of_accounts SET current_balance = %s WHERE id = %s;", (net, aid))

    return jv_no


def reconcile_past_journal_lines_to_warehouses(cur, user_id=None):
    """مطابقة قيود المشتريات وحركات المخزون وربطها بالحسابات الفرعية للمستودعات المستلمة فعلياً"""
    sync_all_warehouses_accounts(cur, user_id=user_id)
    cur.execute("SELECT id, code, account_id FROM warehouses WHERE account_id IS NOT NULL;")
    w_rows = cur.fetchall()
    wh_map = {}
    for w in w_rows:
        wh_map[w['id']] = w['account_id']
        if w.get('code'): wh_map[w['code']] = w['account_id']

    cur.execute("SELECT id, invoice_no FROM purchases;")
    purchases = cur.fetchall()
    reconciled_purchases = 0

    for p in purchases:
        p_id = p['id']
        cur.execute("SELECT warehouse_id FROM stock_movements WHERE reference_id = %s AND reference_type = 'purchases' AND warehouse_id IS NOT NULL LIMIT 1;", (p_id,))
        sm_row = cur.fetchone()
        wh_id = sm_row['warehouse_id'] if sm_row and sm_row.get('warehouse_id') else None

        if not wh_id:
            cur.execute("SELECT warehouse_id FROM inventory_transactions WHERE reference_id = %s AND reference_type = 'purchases' AND warehouse_id IS NOT NULL LIMIT 1;", (p_id,))
            it_row = cur.fetchone()
            wh_id = it_row['warehouse_id'] if it_row and it_row.get('warehouse_id') else None

        if not wh_id:
            cur.execute("SELECT warehouse_id FROM purchases WHERE id = %s LIMIT 1;", (p_id,))
            pr = cur.fetchone()
            wh_id = pr['warehouse_id'] if pr and pr.get('warehouse_id') else None

        target_acc = wh_map.get(wh_id)
        if wh_id:
            cur.execute("UPDATE purchases SET warehouse_id = %s WHERE id = %s AND (warehouse_id IS NULL OR warehouse_id != %s);", (wh_id, p_id, wh_id))

        if target_acc:
            cur.execute("""
                SELECT je.id as jv_id, jel.id as line_id, jel.account_id
                FROM journal_entries je
                JOIN journal_entry_lines jel ON je.id = jel.entry_id
                WHERE (je.ref_id = %s OR je.id = %s) AND je.ref_type IN ('Purchase', 'purchases')
                  AND jel.debit > 0;
            """, (p_id, f"JV-{p_id}"))
            for l in cur.fetchall():
                if l['account_id'] != target_acc:
                    cur.execute("UPDATE journal_entry_lines SET account_id = %s WHERE id = %s;", (target_acc, l['line_id']))
                    cur.execute("UPDATE journal_entries SET debit_account_id = %s WHERE id = %s;", (target_acc, l['jv_id']))
                    reconciled_purchases += 1

    cur.execute("""
        SELECT DISTINCT account_id FROM journal_entry_lines
        WHERE account_id IN (SELECT id FROM chart_of_accounts WHERE account_category ILIKE 'Inventory' OR account_name ILIKE '%مخزون%');
    """)
    for a in cur.fetchall():
        aid = a['account_id']
        cur.execute("SELECT COALESCE(SUM(debit_base - credit_base), 0.0) as net FROM journal_entry_lines WHERE account_id = %s;", (aid,))
        net = cur.fetchone()['net'] or 0.0
        cur.execute("UPDATE chart_of_accounts SET current_balance = %s WHERE id = %s;", (net, aid))

    log_audit_event('system', 'COA_RECONCILE', 'RECONCILE_WAREHOUSES', new_values={'reconciled_purchases': reconciled_purchases}, user_id=user_id, cur=cur)
    return {"reconciled_purchases": reconciled_purchases}
