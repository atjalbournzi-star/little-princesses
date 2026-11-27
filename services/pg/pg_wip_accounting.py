# services/pg/pg_wip_accounting.py
# IAS 2 Work In Progress (105.05 WIP) Costing Engine & Clearances
# Architectural Standards: Strictly < 220 lines per file

import logging
from .db_pool import clean_num, clean_str, generate_id
from .pg_sequences import get_next_sequence_number
from .journal_lines_helper import insert_sorted_journal_lines
from .account_resolver import (
    resolve_leaf_account, resolve_labor_liability_account, resolve_account_id
)

logger = logging.getLogger("LittlePrincesses_PG_WIPAccounting")


def resolve_wip_account(cur, default_id='ACC-105-05'):
    """تحديد حساب إنتاج تحت التشغيل (105.05) ديناميكياً من شجرة الحسابات"""
    if cur:
        try:
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_code = '105.05' OR account_name ILIKE '%تحت التشغيل%' OR account_category = 'WIP') ORDER BY level DESC, account_code ASC LIMIT 1;")
            row = cur.fetchone()
            if row and row.get('id'): return row['id']
        except Exception: pass
    return default_id


def resolve_cogs_account(cur, default_id='ACC-504'):
    """تحديد حساب تكلفة المبيعات والتصنيع ديناميكياً"""
    if cur:
        try:
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_code LIKE '504%' OR account_category ILIKE '%COGS%' OR account_name ILIKE '%تكلفة المبيعات%') ORDER BY level DESC, account_code ASC LIMIT 1;")
            row = cur.fetchone()
            if row and row.get('id'): return row['id']
        except Exception: pass
    return default_id


def record_material_wip_issue(cur, order_label, fabric_id, fabric_name, warehouse_account_id, cost_amount, tx_notes=None, created_by=None, skip_cascade=False):
    """IAS 2: صرف الخامات من المستودع إلى حساب إنتاج تحت التشغيل (من 105.02 إلى 105.05)"""
    tot_cost = round(clean_num(cost_amount), 4)
    if tot_cost <= 0: return None

    wip_acc = resolve_leaf_account(cur, resolve_wip_account(cur, 'ACC-105-05'), 'YER')
    cr_acc = resolve_leaf_account(cur, warehouse_account_id or 'ACC-105-02', 'YER')
    jv_ref = f"FAB-WIP-{order_label}-{fabric_id}"

    cur.execute("SELECT id FROM journal_entries WHERE ref_id = %s OR id = %s LIMIT 1;", (jv_ref, f"JV-{jv_ref}"))
    if cur.fetchone():
        logger.info(f"WIP Material Issue already recorded for {jv_ref} - skipping.")
        return None

    jv_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
    jv_id, desc = f"JV-{jv_ref}", (tx_notes or f"صرف خامات قماش ({fabric_name}) لأمر تشغيل {order_label} لحساب WIP")
    cur.execute("""
        INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by)
        VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'FabricWIPIssue', %s, 'YER', 1.0, 'Posted', %s, %s)
        ON CONFLICT (id) DO NOTHING;
    """, (jv_id, jv_no, desc, wip_acc, cr_acc, tot_cost, tot_cost, tot_cost, jv_ref, desc, created_by))

    cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (jv_id,))
    insert_sorted_journal_lines(cur, jv_id, [
        (wip_acc, f"مدين - تحميل WIP بخامات {fabric_name} ({order_label})", tot_cost, 0.0, tot_cost, 0.0),
        (cr_acc, f"دائن - صرف خامات من المستودع لأمر {order_label}", 0.0, tot_cost, 0.0, tot_cost),
    ])

    cur.execute("UPDATE production_orders SET wip_material_cost = COALESCE(wip_material_cost, 0.0) + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s OR production_order_no = %s OR order_id = %s OR production_order_no = 'PO-' || %s;", (tot_cost, order_label, order_label, order_label, order_label))
    if not skip_cascade:
        from .pg_delivery_cogs import cascade_account_balances
        cascade_account_balances(cur)
    return {"entry_no": jv_no, "amount": tot_cost, "wip_account": wip_acc}


def record_labor_wip_accrual(cur, order_no, real_po_id, stage_lines, total_wage, desc_label=None):
    """IAS 2: استحقاق ورسملة أجور الفنيين إلى حساب إنتاج تحت التشغيل (من ACC-203 إلى 105.05)"""
    valid_lines = [(eid, ename, round(clean_num(ww), 2), stg) for eid, ename, ww, stg in (stage_lines or []) if round(clean_num(ww), 2) > 0]
    lines_sum = round(sum(x[2] for x in valid_lines), 2)
    tot_wage = round(clean_num(total_wage), 2)
    if tot_wage <= 0 or not valid_lines: return None
    if abs(lines_sum - tot_wage) > 0.001: tot_wage = lines_sum

    wip_acc = resolve_leaf_account(cur, resolve_wip_account(cur, 'ACC-105-05'), 'YER')
    liab_acc = resolve_leaf_account(cur, resolve_labor_liability_account(cur, 'ACC-203'), 'YER')
    if wip_acc == liab_acc: liab_acc = 'ACC-203'

    jv_id, jv_no = generate_id("JV"), get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
    desc = desc_label or f"استحقاق ورسملة أجور تشغيل طلب {order_no} إلى حساب WIP"
    cur.execute("""
        INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
        VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'ProductionLaborWIP', %s, 'YER', 1.0, 'Posted', %s);
    """, (jv_id, jv_no, desc, wip_acc, liab_acc, tot_wage, tot_wage, tot_wage, real_po_id, f"استحقاق أجور {order_no}"))

    cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (jv_id,))
    labor_lines = [(wip_acc, f"مدين - رسملة أجور تشغيل طلب {order_no} (WIP)", tot_wage, 0.0, tot_wage, 0.0)]
    for emp_id, emp_name, w_wage, stg_name in valid_lines:
        labor_lines.append((liab_acc, f"دائن - مستحقات الفني {emp_name} ({stg_name})", 0.0, w_wage, 0.0, w_wage))
    insert_sorted_journal_lines(cur, jv_id, labor_lines)

    cur.execute("UPDATE production_orders SET wip_labor_cost = COALESCE(wip_labor_cost, 0.0) + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s OR production_order_no = %s OR order_id IN (%s, %s) OR production_order_no = 'PO-' || %s;", (tot_wage, real_po_id, order_no, real_po_id, order_no, order_no))
    return {"entry_no": jv_no, "amount": tot_wage, "wip_account": wip_acc}


def clear_wip_to_cogs(cur, real_order_id, order_no, cust_name=None, child_name=None):
    """IAS 2: استبعاد رصيد أمر التشغيل من WIP وتحميله على تكلفة المبيعات والتصنيع عند التسليم"""
    cur.execute("""
        SELECT id, COALESCE(wip_material_cost, 0.0) as mat_cost, COALESCE(wip_labor_cost, 0.0) as lab_cost,
               COALESCE(wip_overhead_cost, 0.0) as ovh_cost, COALESCE(wip_cleared_amount, 0.0) as clr_cost
        FROM production_orders WHERE order_id = %s OR production_order_no = %s OR id = %s OR production_order_no = 'PO-' || %s
        LIMIT 1 FOR UPDATE;
    """, (real_order_id, order_no, real_order_id, order_no))
    po_row = cur.fetchone()

    total_wip, po_id = 0.0, None
    if po_row:
        po_id = po_row['id']
        total_wip = clean_num(po_row['mat_cost']) + clean_num(po_row['lab_cost']) + clean_num(po_row['ovh_cost']) - clean_num(po_row['clr_cost'])

    if total_wip <= 0:
        cur.execute("SELECT COALESCE(SUM(ABS(total_cost)), 0.0) as mat_cogs FROM inventory_transactions WHERE (reference_id = %s OR reference_id = %s OR notes LIKE %s) AND transaction_type = 'PRODUCTION_CONSUMPTION';", (real_order_id, order_no, f"%{order_no}%"))
        r = cur.fetchone()
        if r and clean_num(r['mat_cogs']) > 0: total_wip = clean_num(r['mat_cogs'])

    total_wip = round(total_wip, 2)
    if total_wip <= 0: return {"cogs_amount": 0.0, "entry_no": None}

    cogs_acc = resolve_leaf_account(cur, resolve_cogs_account(cur, 'ACC-504'), 'YER')
    wip_acc = resolve_leaf_account(cur, resolve_wip_account(cur, 'ACC-105-05'), 'YER')
    jv_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
    jv_id, desc = f"JV-COGS-{order_no}", f"تكلفة المبيعات وإقفال تشغيل طلب {order_no} ({cust_name or 'العميل'})"

    cur.execute("""
        INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
        VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'ProductionCOGS', %s, 'YER', 1.0, 'Posted', %s)
        ON CONFLICT (entry_no) DO UPDATE SET amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount;
    """, (jv_id, jv_no, desc, cogs_acc, wip_acc, total_wip, total_wip, total_wip, real_order_id, f"إثبات تكلفة البضاعة المباعة لفستان {child_name or ''}"))

    cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (jv_no,))
    act_id = cur.fetchone()['id']
    cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (act_id,))
    insert_sorted_journal_lines(cur, act_id, [
        (cogs_acc, f"مدين - تكلفة البضاعة المباعة لطلب {order_no}", total_wip, 0.0, total_wip, 0.0),
        (wip_acc, f"دائن - استبعاد وإقفال WIP لطلب {order_no}", 0.0, total_wip, 0.0, total_wip),
    ])

    if po_id:
        cur.execute("UPDATE production_orders SET wip_cleared_amount = COALESCE(wip_cleared_amount, 0.0) + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (total_wip, po_id))

    return {"cogs_amount": total_wip, "entry_no": jv_no, "wip_cleared": total_wip}
