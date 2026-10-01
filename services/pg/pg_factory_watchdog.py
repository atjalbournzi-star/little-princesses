import logging
from .db_pool import get_db_cursor, clean_num, clean_str

logger = logging.getLogger("LittlePrincesses_PG_FactoryWatchdog")


def get_atelier_watchdog(params=None):
    with get_db_cursor(commit=False) as cur:
        cur.execute("""
            SELECT o.id, o.order_no, o.delivery_date, o.order_date, o.status, o.production_status,
                   o.total_amount, o.paid_amount, o.remaining_amount, o.currency,
                   COALESCE(c.name, '') as customer_name,
                   COALESCE(c.phone, '') as customer_phone,
                   COALESCE(ch.child_name, 'الأميرة') as child_name,
                   COALESCE(p.model_name, 'موديل راقي') as product_name,
                   po.stage as factory_stage,
                   po.progress as factory_progress,
                   (o.delivery_date - CURRENT_DATE) as days_remaining
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN children ch ON o.child_id = ch.id
            LEFT JOIN products p ON o.product_id = p.id
            LEFT JOIN production_orders po ON po.order_id = o.id
            WHERE o.delivery_date IS NOT NULL
              AND o.delivery_date <= CURRENT_DATE + INTERVAL '2 days'
              AND o.status NOT IN ('Completed', 'Cancelled', 'Delivered', 'تم التسليم ✅', 'مكتمل', 'ملغي')
              AND COALESCE(o.production_status, '') NOT IN ('Delivered', 'Completed', 'تم التسليم ✅', 'مكتمل', 'ملغي')
              AND o.status NOT ILIKE '%تم التسليم%'
              AND COALESCE(o.production_status, '') NOT ILIKE '%تم التسليم%'
            ORDER BY o.delivery_date ASC
            LIMIT 25;
        """)
        urgent_rows = cur.fetchall()
        urgent_list = []
        for r in urgent_rows:
            d = dict(r)
            for fld in ['delivery_date', 'order_date']:
                if d.get(fld):
                    d[fld] = str(d[fld])
            d['is_overdue'] = (d.get('days_remaining') is not None and d['days_remaining'] < 0)
            d['is_today'] = (d.get('days_remaining') == 0)
            urgent_list.append(d)

        cur.execute("""
            SELECT o.id, o.order_no, o.delivery_date, o.notes,
                   COALESCE(c.name, '') as customer_name,
                   COALESCE(c.phone, '') as customer_phone,
                   COALESCE(ch.child_name, 'الأميرة') as child_name,
                   COALESCE(p.model_name, 'فستان ملكي') as product_name,
                   po.stage as factory_stage
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN children ch ON o.child_id = ch.id
            LEFT JOIN products p ON o.product_id = p.id
            LEFT JOIN production_orders po ON po.order_id = o.id
            WHERE (o.delivery_date = CURRENT_DATE OR o.notes LIKE '%%تم تأكيد موعد البروفة%%')
              AND o.status NOT IN ('Completed', 'Cancelled', 'Delivered')
            ORDER BY o.delivery_date ASC
            LIMIT 15;
        """)
        fittings_list = []
        for r in cur.fetchall():
            d = dict(r)
            if d.get('delivery_date'):
                d['delivery_date'] = str(d['delivery_date'])
            fittings_list.append(d)

        cur.execute("""
            SELECT * FROM fitting_alterations
            WHERE status IN ('Pending', 'In_Progress')
            ORDER BY created_at DESC
            LIMIT 10;
        """)
        alt_list = []
        for r in cur.fetchall():
            d = dict(r)
            for fld in ['ticket_date', 'created_at', 'updated_at']:
                if d.get(fld):
                    d[fld] = str(d[fld])
            alt_list.append(d)

    overdue_count = sum(1 for x in urgent_list if x.get('is_overdue'))
    today_due_count = sum(1 for x in urgent_list if x.get('is_today'))

    return {
        "status": "Healthy" if overdue_count == 0 else "Critical",
        "overdue_count": overdue_count,
        "today_due_count": today_due_count,
        "urgent_count": len(urgent_list),
        "fittings_today_count": len(fittings_list),
        "active_alterations_count": len(alt_list),
        "urgent_deliveries": urgent_list,
        "fittings_today": fittings_list,
        "active_alterations": alt_list
    }


def scan_to_deliver_order(payload):
    data = payload.get('data') or payload
    order_target = clean_str(data.get('barcode') or data.get('order_no') or data.get('order_id') or data.get('id'))
    if not order_target:
        return {"success": False, "error": "رمز الباركود أو رقم الطلب مطلوب"}

    collect_payment = bool(data.get('collect_payment', True))
    collected_amount = clean_num(data.get('amount_collected') or 0.0)

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT o.*,
                   COALESCE(c.name, '') as real_customer_name,
                   COALESCE(c.phone, '') as customer_phone,
                   COALESCE(ch.child_name, 'الأميرة') as real_child_name,
                   COALESCE(p.model_name, 'فستان ملكي') as real_product_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN children ch ON o.child_id = ch.id
            LEFT JOIN products p ON o.product_id = p.id
            WHERE o.id = %s OR o.order_no = %s OR o.order_no = 'ORD-' || %s OR o.id = 'ORD-' || %s
            LIMIT 1;
        """, (order_target, order_target, order_target, order_target))
        ord_row = cur.fetchone()
        if not ord_row:
            return {"success": False, "error": f"عذراً، لم نتمكن من العثور على فستان برقم/باركود: {order_target}"}

        o_id = ord_row['id']
        tot = clean_num(ord_row.get('total_amount') or ord_row.get('total') or 0.0)
        pd = clean_num(ord_row.get('paid_amount') or ord_row.get('paid') or 0.0)
        rem = max(0.0, tot - pd)

        final_pd = pd
        if collect_payment and rem > 0:
            pay_amt = collected_amount if collected_amount > 0 else rem
            final_pd += pay_amt

        cur.execute("""
            UPDATE orders
            SET production_status = 'Delivered',
                status = 'Completed',
                paid_amount = %s,
                payment_status = CASE WHEN %s >= total_amount THEN 'Paid' ELSE 'Partial' END,
                notes = COALESCE(notes, '') || ' | 👗 تم التسليم بالمعرض بمسح الباركود بتاريخ ' || CURRENT_DATE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *;
        """, (final_pd, final_pd, o_id))
        updated_ord = cur.fetchone()

        cur.execute("""
            UPDATE production_orders
            SET stage = 'تم التسليم ✅', progress = 100.0, status = 'Completed',
                notes = COALESCE(notes, '') || ' | تم تسليم الفستان للأميرة', updated_at = CURRENT_TIMESTAMP
            WHERE order_id = %s;
        """, (o_id,))

        res_ord = dict(updated_ord)
        for fld in ['order_date', 'delivery_date', 'created_at', 'updated_at']:
            if res_ord.get(fld):
                res_ord[fld] = str(res_ord[fld])

        child_name = ord_row['real_child_name']
        return {
            "success": True,
            "order": res_ord,
            "message": f"ألف مبارك! تم تسليم الفستان الملكي لأميرتنا ({child_name}) بنجاح تام وتسوية الحساب 👑🌸"
        }
