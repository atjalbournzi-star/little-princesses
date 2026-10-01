from decimal import Decimal
import logging
from .db_pool import (
    get_db_cursor, execute_query, clean_num,
    clean_str, generate_id, today_str
)

logger = logging.getLogger("LittlePrincesses_PG_QualityInspections")


def get_quality_inspections(params=None):
    query = "SELECT * FROM quality_inspections ORDER BY created_at DESC;"
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        for k in ('created_at', 'updated_at', 'inspection_date'):
            if r.get(k):
                r[k] = str(r[k])
    return rows


def add_quality_inspection(payload):
    data = payload.get('data') or payload
    q_id = clean_str(data.get('id') or data.get('inspection_id')) or generate_id("INSP")
    i_date = clean_str(data.get('inspection_date') or data.get('date')) or today_str()
    p_id = clean_str(data.get('product_id')) or None
    p_name = clean_str(data.get('product_name') or data.get('model_name') or '')
    sku = clean_str(data.get('sku') or '')
    model_id = clean_str(data.get('model_id') or '')
    color = clean_str(data.get('color') or '')
    size = clean_str(data.get('size') or '')
    po_id = clean_str(data.get('production_order_id') or data.get('order_id')) or None
    stage = clean_str(data.get('production_stage') or data.get('stage') or 'الفحص النهائي')
    batch = clean_str(data.get('batch_id') or '')
    q_chk = int(clean_num(data.get('quantity_checked') or 1))
    q_pass = int(clean_num(data.get('quantity_passed') or 1))
    q_fail = int(clean_num(data.get('quantity_failed') or 0))
    res = clean_str(data.get('inspection_result') or ('PASS' if q_fail == 0 else 'FAIL'))
    insp_id = clean_str(data.get('inspector_id')) or None
    insp_name = clean_str(data.get('inspector_name') or 'مفتش الجودة')
    notes = clean_str(data.get('notes') or '')
    att_url = clean_str(data.get('attachment_url') or '')

    with get_db_cursor(commit=True) as cur:
        valid_prod_id = None
        if p_id:
            cur.execute("SELECT id, model_name FROM products WHERE id = %s LIMIT 1;", (p_id,))
            p_row = cur.fetchone()
            if p_row:
                valid_prod_id = p_row['id']
                if not p_name:
                    p_name = p_row.get('model_name', '')

        valid_po_id = None
        if po_id:
            cur.execute("SELECT id FROM production_orders WHERE id = %s LIMIT 1;", (po_id,))
            if cur.fetchone():
                valid_po_id = po_id

        valid_insp_id = None
        if insp_id:
            cur.execute("SELECT id FROM users WHERE id = %s LIMIT 1;", (insp_id,))
            if cur.fetchone():
                valid_insp_id = insp_id

        cur.execute("""
            INSERT INTO quality_inspections (
                id, inspection_date, product_id, product_name, sku, model_id,
                color, size, production_order_id, production_stage, batch_id,
                quantity_checked, quantity_passed, quantity_failed, inspection_result,
                inspector_id, inspector_name, notes, attachment_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                quantity_checked = EXCLUDED.quantity_checked,
                quantity_passed = EXCLUDED.quantity_passed,
                quantity_failed = EXCLUDED.quantity_failed,
                inspection_result = EXCLUDED.inspection_result,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """, (
            q_id, i_date, valid_prod_id, p_name, sku, model_id,
            color, size, valid_po_id, stage, batch,
            q_chk, q_pass, q_fail, res,
            valid_insp_id, insp_name, notes, att_url
        ))
        row = dict(cur.fetchone())
        for k in ('created_at', 'updated_at', 'inspection_date'):
            if row.get(k):
                row[k] = str(row[k])
        return row


def get_quality_defects(params=None):
    query = "SELECT * FROM quality_defects ORDER BY created_at DESC;"
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        for k in ('created_at', 'updated_at', 'defect_date', 'due_date', 'resolved_date'):
            if r.get(k):
                r[k] = str(r[k])
        for k in ('rework_cost', 'waste_cost', 'return_cost', 'total_cost'):
            if r.get(k) is not None:
                r[k] = float(r[k])
    return rows


def add_quality_defect(payload):
    data = payload.get('data') or payload
    d_id = clean_str(data.get('id') or data.get('defect_id')) or generate_id("DEF")
    d_date = clean_str(data.get('defect_date') or data.get('date')) or today_str()
    insp_id = clean_str(data.get('inspection_id')) or None
    p_id = clean_str(data.get('product_id')) or None
    p_name = clean_str(data.get('product_name') or data.get('model_name') or '')
    sku = clean_str(data.get('sku') or '')
    model_id = clean_str(data.get('model_id') or '')
    color = clean_str(data.get('color') or '')
    size = clean_str(data.get('size') or '')
    po_id = clean_str(data.get('production_order_id') or data.get('order_id')) or None
    stage = clean_str(data.get('production_stage') or data.get('stage') or 'الخياطة')
    d_type = clean_str(data.get('defect_type') or 'عيب خياطة')
    d_cat = clean_str(data.get('defect_category') or 'تشغيلي')
    sev = clean_str(data.get('severity') or 'Medium')
    aff_q = int(clean_num(data.get('affected_quantity') or 1))
    root_c = clean_str(data.get('root_cause') or '')
    corr = clean_str(data.get('corrective_action') or '')
    prev_act = clean_str(data.get('preventive_action') or '')
    status = clean_str(data.get('status') or 'Open')
    assigned_to = clean_str(data.get('assigned_to')) or None
    due_date = clean_str(data.get('due_date')) or None
    resolved_date = clean_str(data.get('resolved_date')) or None
    rework_cost = Decimal(str(clean_num(data.get('rework_cost') or data.get('cost') or 0.0)))
    waste_cost = Decimal(str(clean_num(data.get('waste_cost') or 0.0)))
    return_cost = Decimal(str(clean_num(data.get('return_cost') or 0.0)))
    notes = clean_str(data.get('notes') or '')

    with get_db_cursor(commit=True) as cur:
        valid_insp_id = None
        if insp_id:
            cur.execute("SELECT id FROM quality_inspections WHERE id = %s LIMIT 1;", (insp_id,))
            if cur.fetchone():
                valid_insp_id = insp_id

        valid_prod_id = None
        if p_id:
            cur.execute("SELECT id, model_name FROM products WHERE id = %s LIMIT 1;", (p_id,))
            p_row = cur.fetchone()
            if p_row:
                valid_prod_id = p_row['id']
                if not p_name:
                    p_name = p_row.get('model_name', '')

        valid_po_id = None
        if po_id:
            cur.execute("SELECT id FROM production_orders WHERE id = %s LIMIT 1;", (po_id,))
            if cur.fetchone():
                valid_po_id = po_id

        valid_assigned = None
        if assigned_to:
            cur.execute("SELECT id FROM users WHERE id = %s OR username = %s LIMIT 1;", (assigned_to, assigned_to))
            u_row = cur.fetchone()
            if u_row:
                valid_assigned = u_row['id']

        cur.execute("""
            INSERT INTO quality_defects (
                id, defect_date, inspection_id, product_id, product_name,
                sku, model_id, color, size, production_order_id, production_stage,
                defect_type, defect_category, severity, affected_quantity,
                root_cause, corrective_action, preventive_action, status,
                assigned_to, due_date, resolved_date, rework_cost, waste_cost,
                return_cost, notes
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                defect_type = EXCLUDED.defect_type,
                severity = EXCLUDED.severity,
                affected_quantity = EXCLUDED.affected_quantity,
                root_cause = EXCLUDED.root_cause,
                corrective_action = EXCLUDED.corrective_action,
                rework_cost = EXCLUDED.rework_cost,
                waste_cost = EXCLUDED.waste_cost,
                return_cost = EXCLUDED.return_cost,
                status = EXCLUDED.status,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """, (
            d_id, d_date, valid_insp_id, valid_prod_id, p_name,
            sku, model_id, color, size, valid_po_id, stage,
            d_type, d_cat, sev, aff_q,
            root_c, corr, prev_act, status,
            valid_assigned, due_date, resolved_date, rework_cost, waste_cost,
            return_cost, notes
        ))
        row = dict(cur.fetchone())
        for k in ('created_at', 'updated_at', 'defect_date', 'due_date', 'resolved_date'):
            if row.get(k):
                row[k] = str(row[k])
        for k in ('rework_cost', 'waste_cost', 'return_cost', 'total_cost'):
            if row.get(k) is not None:
                row[k] = float(row[k])
        return row
