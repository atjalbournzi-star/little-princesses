# services/pg/pg_material_custody.py
# Customer Material Custody (CMT) Service - Zero Accounting Value

from decimal import Decimal
from .db_pool import get_db_cursor, clean_str, to_decimal, generate_id
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, get_active_user_context

VALID_CMT_STATUSES = ('RECEIVED', 'IN_PRODUCTION', 'RETURNED_LEFTOVER', 'CLOSED')


def _format_custody(row):
    r = dict(row)
    for k in ('received_qty', 'leftover_returned_qty'):
        if r.get(k) is not None:
            r[k] = float(r[k])
    for k in ('closed_at', 'created_at'):
        if r.get(k):
            r[k] = str(r[k])
    return r


def get_material_custody(params=None):
    p = params if isinstance(params, dict) else {}
    clauses, args = [], []
    for col in ('order_id', 'order_item_id', 'production_order_id', 'customer_id', 'status', 'custody_no'):
        val = clean_str(p.get(col))
        if val:
            clauses.append(f"{col} = %s")
            args.append(val)
    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"""
        SELECT id, custody_no, order_id, order_item_id, production_order_id, customer_id,
               fabric_description, received_qty, unit, condition_notes, reference_image,
               leftover_returned_qty, status, received_by, closed_at, created_at
        FROM public.customer_material_custody
        {where_sql}
        ORDER BY created_at DESC, id DESC;
    """
    with get_db_cursor(commit=False) as cur:
        cur.execute(sql, tuple(args))
        return [_format_custody(r) for r in (cur.fetchall() or [])]


def receive_material_custody(payload):
    data = payload.get('data') if isinstance(payload.get('data'), dict) else (payload or {})
    fabric_desc = clean_str(data.get('fabric_description'))
    if not fabric_desc:
        raise ValueError("وصف القماش المستلم (fabric_description) مطلوب")

    qty = to_decimal(data.get('received_qty') or 0)
    if qty <= Decimal('0'):
        raise ValueError("الكمية المستلمة (received_qty) يجب أن تكون أكبر من صفر")

    leftover = to_decimal(data.get('leftover_returned_qty') or 0)
    if leftover < Decimal('0'):
        raise ValueError("كمية المتبقي المرتجع لا يمكن أن تكون سالبة")

    unit = clean_str(data.get('unit') or 'meter')
    order_id = clean_str(data.get('order_id')) or None
    order_item_id = clean_str(data.get('order_item_id')) or None
    prod_order_id = clean_str(data.get('production_order_id')) or None
    customer_id = clean_str(data.get('customer_id')) or None
    condition_notes = clean_str(data.get('condition_notes')) or None
    ref_image = clean_str(data.get('reference_image')) or None
    user_id = get_active_user_context('admin')
    received_by = clean_str(data.get('received_by')) or user_id

    with get_db_cursor(commit=True) as cur:
        custody_no = get_next_sequence_number(cur, 'CMT', fallback_prefix='CMT-', fallback_padding=6)
        rec_id = clean_str(data.get('id')) or generate_id('CMT')
        cur.execute("""
            INSERT INTO public.customer_material_custody (
                id, custody_no, order_id, order_item_id, production_order_id, customer_id,
                fabric_description, received_qty, unit, condition_notes, reference_image,
                leftover_returned_qty, status, received_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'RECEIVED', %s)
            RETURNING *;
        """, (
            rec_id, custody_no, order_id, order_item_id, prod_order_id, customer_id,
            fabric_desc, qty, unit, condition_notes, ref_image, leftover, received_by,
        ))
        saved = _format_custody(cur.fetchone())
        log_audit_event(
            entity_type='customer_material_custody',
            entity_id=rec_id,
            action='CMT_RECEIVE',
            new_values={'custody_no': custody_no, 'customer_id': customer_id, 'received_qty': float(qty), 'unit': unit},
            user_id=user_id,
            document_no=custody_no,
            details=f"استلام عهدة قماش عميل {custody_no}: {fabric_desc} ({qty} {unit})",
            cur=cur,
        )
    return saved


def update_material_custody(custody_id, payload):
    rec_id = clean_str(custody_id)
    if not rec_id:
        raise ValueError("معرف العهدة مطلوب")
    data = payload.get('data') if isinstance(payload.get('data'), dict) else (payload or {})

    next_status = clean_str(data.get('status')).upper() if data.get('status') else None
    if next_status and next_status not in VALID_CMT_STATUSES:
        raise ValueError(f"حالة العهدة غير صالحة. القيم المسموحة: {', '.join(VALID_CMT_STATUSES)}")

    leftover = None
    if 'leftover_returned_qty' in data and data.get('leftover_returned_qty') is not None:
        leftover = to_decimal(data.get('leftover_returned_qty'))
        if leftover < Decimal('0'):
            raise ValueError("كمية المتبقي المرتجع لا يمكن أن تكون سالبة")

    user_id = get_active_user_context('admin')
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT * FROM public.customer_material_custody WHERE id = %s OR custody_no = %s LIMIT 1 FOR UPDATE;", (rec_id, rec_id))
        existing = cur.fetchone()
        if not existing:
            raise ValueError(f"لم يتم العثور على عهدة القماش: {rec_id}")

        target_id = existing['id']
        final_status = next_status or existing['status']
        final_leftover = leftover if leftover is not None else existing['leftover_returned_qty']
        final_notes = clean_str(data.get('condition_notes')) if 'condition_notes' in data else existing['condition_notes']
        final_po = clean_str(data.get('production_order_id')) or existing['production_order_id']
        final_ord = clean_str(data.get('order_id')) or existing['order_id']
        final_oi = clean_str(data.get('order_item_id')) or existing['order_item_id']

        cur.execute("""
            UPDATE public.customer_material_custody
            SET status = %s,
                leftover_returned_qty = %s,
                condition_notes = %s,
                production_order_id = %s,
                order_id = %s,
                order_item_id = %s,
                closed_at = CASE WHEN %s = 'CLOSED' AND closed_at IS NULL THEN CURRENT_TIMESTAMP ELSE closed_at END
            WHERE id = %s
            RETURNING *;
        """, (
            final_status, final_leftover, final_notes, final_po, final_ord, final_oi,
            final_status, target_id,
        ))
        updated = _format_custody(cur.fetchone())
        act = 'CMT_CLOSE' if final_status == 'CLOSED' else 'CMT_UPDATE'
        log_audit_event(
            entity_type='customer_material_custody',
            entity_id=target_id,
            action=act,
            old_values={'status': existing['status'], 'leftover_returned_qty': float(existing['leftover_returned_qty'] or 0)},
            new_values={'status': final_status, 'leftover_returned_qty': float(final_leftover or 0)},
            user_id=user_id,
            document_no=existing['custody_no'],
            details=f"تحديث عهدة قماش {existing['custody_no']} إلى {final_status}",
            cur=cur,
        )
    return updated
