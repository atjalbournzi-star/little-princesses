import datetime
import logging
from .db_pool import get_db_cursor, clean_str, today_str

logger = logging.getLogger("LittlePrincesses_PG_FactoryJobCard")


def _calc_target_deadline(d):
    cur_stage = d.get('stage') or 'القص والتحضير ✂️'
    if 'قص' in cur_stage:
        target_deadline = d.get('cutting_due_date') or d.get('due_date')
    elif 'خياط' in cur_stage:
        target_deadline = d.get('sewing_due_date') or d.get('due_date')
    elif 'تطريز' in cur_stage:
        target_deadline = d.get('embroidery_due_date') or d.get('due_date')
    elif 'تشطيب' in cur_stage or 'فحص' in cur_stage:
        target_deadline = d.get('finishing_due_date') or d.get('due_date')
    else:
        target_deadline = d.get('due_date')
    d['current_target_deadline'] = target_deadline

    if target_deadline:
        try:
            deadline_dt = datetime.datetime.strptime(str(target_deadline)[:10], "%Y-%m-%d").date()
            diff_days = (deadline_dt - datetime.date.today()).days
            d['days_left'] = diff_days
            d['is_overdue'] = diff_days < 0
        except Exception:
            d['days_left'] = None
            d['is_overdue'] = False
    else:
        d['days_left'] = None
        d['is_overdue'] = False


def _fetch_measurements(cur, cust_id, child_name):
    if not cust_id:
        return {}
    meas = None
    if child_name:
        cur.execute("""
            SELECT * FROM measurements 
            WHERE customer_id = %s AND (child_name = %s OR child_name ILIKE %s)
            ORDER BY created_at DESC LIMIT 1;
        """, (cust_id, child_name, f"%{child_name}%"))
        meas = cur.fetchone()
    if not meas:
        cur.execute("""
            SELECT * FROM measurements 
            WHERE customer_id = %s 
            ORDER BY created_at DESC LIMIT 1;
        """, (cust_id,))
        meas = cur.fetchone()
    return dict(meas) if meas else {}


def get_production_order_for_job_card(po_id_or_no):
    if not po_id_or_no:
        return {"error": "رقم أمر التشغيل أو الطلب مطلوب"}
    target = clean_str(po_id_or_no)

    with get_db_cursor(commit=False) as cur:
        cur.execute("""
            SELECT po.*, 
                   COALESCE(c.name, '') as customer_name,
                   COALESCE(c.phone, '') as customer_phone,
                   COALESCE(c.id, '') as customer_id,
                   COALESCE(p.model_name, po.product_name, 'موديل راقي') as product_name,
                   COALESCE(p.image_url, '') as product_image,
                   COALESCE(o.quantity, 1) as quantity,
                   COALESCE(o.delivery_date, po.due_date) as order_delivery_date,
                   o.id as real_order_id,
                   o.child_id as real_child_id
            FROM production_orders po
            LEFT JOIN orders o ON po.order_id = o.id OR po.production_order_no = 'PO-' || o.order_no
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN products p ON COALESCE(po.product_id, o.product_id) = p.id
            WHERE po.id = %s OR po.production_order_no = %s OR po.order_id = %s 
               OR po.production_order_no = 'PO-' || %s OR po.id = 'PRD-' || %s
            ORDER BY po.created_at DESC
            LIMIT 1;
        """, (target, target, target, target, target))
        row = cur.fetchone()

        if not row:
            cur.execute("""
                SELECT o.*, 
                       COALESCE(c.name, '') as customer_name,
                       COALESCE(c.phone, '') as customer_phone,
                       COALESCE(c.id, '') as customer_id,
                       COALESCE(p.model_name, 'فستان أميرات') as product_name,
                       COALESCE(p.image_url, '') as product_image,
                       COALESCE(ch.child_name, 'الأميرة') as child_name
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN children ch ON o.child_id = ch.id
                WHERE o.id = %s OR o.order_no = %s
                LIMIT 1;
            """, (target, target))
            ord_row = cur.fetchone()
            if ord_row:
                new_prd_id = f"PRD-{ord_row['id']}"
                new_po_no = f"PO-{ord_row['order_no']}"
                cur.execute("""
                    INSERT INTO production_orders (
                        id, production_order_no, order_id, product_id, product_name, child_name,
                        stage, progress, status, start_date, due_date
                    ) VALUES (%s, %s, %s, %s, %s, %s, 'القص والتحضير ✂️', 20, 'In Progress', %s, %s)
                    ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
                    RETURNING *;
                """, (new_prd_id, new_po_no, ord_row['id'], ord_row.get('product_id'), ord_row['product_name'], ord_row['child_name'], ord_row.get('order_date') or today_str(), ord_row.get('delivery_date')))
                cur.execute("""
                    SELECT po.*, 
                           COALESCE(c.name, '') as customer_name,
                           COALESCE(c.phone, '') as customer_phone,
                           COALESCE(c.id, '') as customer_id,
                           COALESCE(p.model_name, po.product_name, 'موديل راقي') as product_name,
                           COALESCE(p.image_url, '') as product_image,
                           COALESCE(o.quantity, 1) as quantity,
                           COALESCE(o.delivery_date, po.due_date) as order_delivery_date,
                           o.id as real_order_id,
                           o.child_id as real_child_id
                    FROM production_orders po
                    LEFT JOIN orders o ON po.order_id = o.id
                    LEFT JOIN customers c ON o.customer_id = c.id
                    LEFT JOIN products p ON COALESCE(po.product_id, o.product_id) = p.id
                    WHERE po.id = %s
                    LIMIT 1;
                """, (new_prd_id,))
                row = cur.fetchone()

        if not row:
            return {"error": f"لم يتم العثور على أمر تشغيل للرقم: {target}"}

        d = dict(row)
        d['measurements'] = _fetch_measurements(cur, d.get('customer_id'), d.get('child_name'))

        for fld in ['start_date', 'due_date', 'cutting_due_date', 'sewing_due_date',
                    'embroidery_due_date', 'finishing_due_date', 'tailor_completed_at',
                    'created_at', 'updated_at', 'order_delivery_date']:
            if d.get(fld):
                d[fld] = str(d[fld])

        tailor = d.get('assigned_tailor_id') or ''
        d['tailor_name'] = tailor
        d['tailor_phone'] = ''
        if tailor:
            cur.execute("SELECT phone FROM employees WHERE id = %s OR name = %s OR name ILIKE %s LIMIT 1;", (tailor, tailor, f"%{tailor}%"))
            er = cur.fetchone()
            if er and er.get('phone'):
                d['tailor_phone'] = er['phone']

        _calc_target_deadline(d)
        return d
