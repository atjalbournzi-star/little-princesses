import logging
from .db_pool import get_db_cursor, execute_query, clean_num, clean_str, generate_id

logger = logging.getLogger("LittlePrincesses_PG_FactoryAlterations")


def get_fitting_alterations(params=None):
    order_id = None
    status = None
    tailor_id = None
    if isinstance(params, dict):
        order_id = clean_str(params.get('order_id') or params.get('order_no') or params.get('order'))
        status = clean_str(params.get('status'))
        tailor_id = clean_str(params.get('tailor_id') or params.get('assigned_tailor_id'))

    query = "SELECT * FROM fitting_alterations WHERE 1=1"
    args = []
    if order_id:
        query += " AND (order_id = %s OR production_order_no = %s OR order_id = 'ORD-' || %s)"
        args.extend([order_id, order_id, order_id])
    if status:
        query += " AND status = %s"
        args.append(status)
    if tailor_id:
        query += " AND (assigned_tailor_id = %s OR tailor_name ILIKE %s)"
        args.extend([tailor_id, f"%{tailor_id}%"])

    query += " ORDER BY created_at DESC;"
    rows = execute_query(query, tuple(args) if args else None, fetch_all=True)
    for r in rows:
        for fld in ['ticket_date', 'created_at', 'updated_at']:
            if r.get(fld):
                r[fld] = str(r[fld])
    return rows


def add_fitting_alteration(payload):
    data = payload.get('data') or payload
    alt_id = clean_str(data.get('id')) or generate_id("ALT")
    order_target = clean_str(data.get('order_id') or data.get('order_no') or data.get('order'))
    order_no_in = clean_str(data.get('order_no'))
    alt_type = clean_str(data.get('alteration_reason') or data.get('alteration_type') or 'تقصير طول الفستان')
    details = clean_str(data.get('adjustment_notes') or data.get('alteration_details') or data.get('details') or '')
    dress_type = clean_str(data.get('dress_type') or 'فستان ملكي')
    severity = clean_str(data.get('severity') or 'normal')
    target_date = clean_str(data.get('target_date')) or None
    tailor_name = clean_str(data.get('assigned_tailor') or data.get('tailor_name')) or None
    tailor_id = clean_str(data.get('assigned_tailor_id') or data.get('tailor_id')) or None
    is_free = bool(data.get('is_free', True))
    charge = clean_num(data.get('charge_amount') or 0.0) if not is_free else 0.0
    reason_cat = clean_str(data.get('reason_category') or 'طلب العميلة بالبروفة')

    with get_db_cursor(commit=True) as cur:
        valid_order_id = None
        prod_order_no = None
        cust_id = None
        child_name = clean_str(data.get('child_name')) or None
        cust_name = clean_str(data.get('customer_name')) or None
        final_order_no = order_no_in

        if order_target:
            cur.execute("""
                SELECT o.id, o.order_no, o.customer_id, c.name as customer_name, ch.child_name,
                       po.production_order_no, po.assigned_tailor_id
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                LEFT JOIN children ch ON o.child_id = ch.id
                LEFT JOIN production_orders po ON po.order_id = o.id OR po.production_order_no = 'PO-' || o.order_no
                WHERE o.id = %s OR o.order_no = %s OR o.order_no = 'ORD-' || %s OR o.id = 'ORD-' || %s
                LIMIT 1;
            """, (order_target, order_target, order_target, order_target))
            ord_row = cur.fetchone()
            if ord_row:
                valid_order_id = ord_row['id']
                if not final_order_no:
                    final_order_no = ord_row.get('order_no')
                prod_order_no = ord_row.get('production_order_no') or f"PO-{ord_row['order_no']}"
                cust_id = ord_row.get('customer_id')
                if not cust_name:
                    cust_name = ord_row.get('customer_name')
                if not child_name:
                    child_name = ord_row.get('child_name')
                if not tailor_id and ord_row.get('assigned_tailor_id'):
                    tailor_id = ord_row['assigned_tailor_id']

        if not valid_order_id and order_target:
            valid_order_id = order_target
        if not final_order_no:
            final_order_no = f"ORD-{order_target}" if order_target else 'ORD-ALT'
        if not child_name:
            child_name = 'الأميرة'
        if not cust_name:
            cust_name = 'العميلة'

        cur.execute("""
            INSERT INTO fitting_alterations (
                id, order_id, order_no, production_order_no, customer_id, child_name, customer_name,
                dress_type, alteration_reason, alteration_type, alteration_details, adjustment_notes,
                severity, assigned_tailor, assigned_tailor_id, tailor_name, target_date,
                ticket_date, is_free, charge_amount, reason_category, status
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                CURRENT_DATE, %s, %s, %s, 'pending'
            ) RETURNING *;
        """, (
            alt_id, str(valid_order_id) if valid_order_id else None, final_order_no, prod_order_no, cust_id, child_name, cust_name,
            dress_type, alt_type, alt_type, details, details,
            severity, tailor_name, tailor_id, tailor_name, target_date,
            is_free, charge, reason_cat
        ))
        row = dict(cur.fetchone())

        if valid_order_id:
            try:
                cur.execute("UPDATE orders SET notes = COALESCE(notes, '') || ' | ✂️ تذكرة تعديل بروفة: ' || %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (f"{alt_type} ({details})", str(valid_order_id)))
                cur.execute("UPDATE production_orders SET notes = COALESCE(notes, '') || ' | ✂️ تذكرة تعديل بروفة: ' || %s, updated_at = CURRENT_TIMESTAMP WHERE order_id = %s OR production_order_no = %s;", (f"{alt_type} ({details})", str(valid_order_id), prod_order_no))
            except Exception as update_err:
                logger.warning(f"Could not update orders notes for alteration {alt_id}: {update_err}")

        for fld in ['ticket_date', 'created_at', 'updated_at']:
            if row.get(fld):
                row[fld] = str(row[fld])
        return {"success": True, "data": row, "message": f"تم تسجيل تذكرة تعديل البروفة بنجاح ({alt_id}) وتوجيهها لمعمل الخياطة ✂️👑"}


def update_fitting_alteration_status(payload):
    data = payload.get('data') or payload
    alt_id = clean_str(data.get('id') or data.get('ticket_id'))
    new_status = clean_str(data.get('status') or 'completed').lower()
    notes = clean_str(data.get('notes') or data.get('completion_notes') or '')

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            UPDATE fitting_alterations
            SET status = %s,
                completion_notes = COALESCE(completion_notes, '') || CASE WHEN %s != '' THEN ' | ' || %s ELSE '' END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *;
        """, (new_status, notes, notes, alt_id))
        row = cur.fetchone()
        if not row:
            return {"success": False, "error": f"لم يتم العثور على تذكرة التعديل: {alt_id}"}
        res = dict(row)
        for fld in ['ticket_date', 'created_at', 'updated_at']:
            if res.get(fld):
                res[fld] = str(res[fld])
        return {"success": True, "data": res, "message": f"تم تحديث حالة تذكرة التعديل إلى ({new_status}) بنجاح ✨"}
