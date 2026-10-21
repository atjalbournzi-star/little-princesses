# services/pg/pg_financial_sync.py
# Seamless financial synchronization between vouchers, customers, and orders

import json
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str, generate_sequential_order_no, logger
from .pg_order_stages import create_order_stages


def sync_customer_order_from_voucher(cur, cust_id, voucher_amount=0.0, voucher_id=None, voucher_no=None, notes=None, pay_method=None, p_date=None):
    """مزامنة وترحيل كافة الحقول المالية لسندات القبض آلياً إلى سجل العميل وسجل الطلبات"""
    if not cust_id:
        return None

    # 1. إجمالي المقبوض الفعلي من سندات القبض غير الملغاة
    cur.execute("""
        SELECT COALESCE(SUM(amount), 0) as total_receipts,
               MAX(currency) as last_currency
        FROM payments
        WHERE customer_id = %s AND payment_type = 'Receipt' AND status NOT IN ('Cancelled', 'reversed');
    """, (cust_id,))
    p_row = cur.fetchone()
    total_receipts = clean_num(p_row.get('total_receipts') if p_row else 0.0)
    order_currency = clean_str(p_row.get('last_currency') if p_row else None) or 'YER'

    # 2. فحص القياسات والموديلات لتحديد إجمالي القيمة المستحقة للطلب
    cur.execute("""
        SELECT m.id, m.child_name, m.model_name, m.model_id, m.product_id, m.price, m.total_amount,
               m.selected_color, m.dress_color, m.color, m.model_image, m.fabrics_data,
               p.base_price as prod_base_price, p.id as p_id, p.image_url as prod_img
        FROM measurements m
        LEFT JOIN products p ON (p.id = m.product_id OR p.id = m.model_id OR p.model_name = m.model_name)
        WHERE m.customer_id = %s
        ORDER BY m.created_at ASC;
    """, (cust_id,))
    meas_rows = cur.fetchall() or []

    tot_items_price = 0.0
    first_model_id = None
    first_model_name = None
    first_model_img = None
    first_color = None

    for m in meas_rows:
        item_price = clean_num(m.get('adjusted_price') or m.get('price') or m.get('total_amount') or m.get('prod_base_price') or 0.0)
        if item_price > 0 and clean_num(m.get('price') or 0.0) == 0.0:
            cur.execute("UPDATE measurements SET price = %s, total_amount = %s WHERE id = %s;", (item_price, item_price, m['id']))
        tot_items_price += item_price
        if not first_model_id:
            first_model_id = clean_str(m.get('product_id') or m.get('model_id') or m.get('p_id'))
            first_model_name = clean_str(m.get('model_name') or '')
            first_model_img = clean_str(m.get('model_image') or m.get('prod_img'))
            first_color = clean_str(m.get('selected_color') or m.get('dress_color') or m.get('color'))

    # 3. فحص الطلب القائم للعميل لجلب خيارات التوصيل والإجمالي
    cur.execute("""
        SELECT * FROM orders WHERE customer_id = %s ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    """, (cust_id,))
    ex_order = cur.fetchone()

    del_fee = clean_num(ex_order.get('delivery_fee') if ex_order else 0.0)
    del_mode = clean_str((ex_order.get('delivery_payment_mode') if ex_order else None) or 'DIRECT_TO_COURIER')

    if tot_items_price <= 0 and ex_order:
        tot_items_price = clean_num(ex_order.get('subtotal') or ex_order.get('total_amount') or 0.0)

    is_prepaid = (del_mode == 'PREPAID_VIA_ATELIER')
    total_order_amount = tot_items_price + (del_fee if is_prepaid else 0.0)
    paid_amount = total_receipts
    deposit_amount = total_receipts
    remaining_amount = max(0.0, total_order_amount - paid_amount)
    payment_status = 'Paid' if remaining_amount <= 0 and total_order_amount > 0 else ('Partial' if paid_amount > 0 else 'Unpaid')
    order_notes = notes or (f"طلب تفصيل - {first_model_name}" if first_model_name else "طلب تفصيل ومقاسات")

    # 4. تحديث رصيد العميل فقط لمنع تلويث جدول العملاء ببيانات الطلبات والفساتين
    cur.execute("""
        UPDATE customers SET
            current_balance = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s;
    """, (remaining_amount, cust_id))

    # 5. تحديث أو إنشاء سجل الطلب دون الكتابة فوق اللون أو الموديل المحدد بالطلب
    actual_order_id = None
    if ex_order:
        actual_order_id = ex_order['id']
        cur.execute("""
            UPDATE orders SET
                subtotal = CASE WHEN subtotal > 0 THEN subtotal ELSE %s END,
                total_amount = CASE WHEN total_amount > 0 THEN total_amount ELSE %s END,
                deposit_amount = %s,
                paid_amount = %s,
                payment_status = %s,
                delivery_fee = COALESCE(orders.delivery_fee, %s),
                delivery_payment_mode = COALESCE(orders.delivery_payment_mode, %s),
                model_id = COALESCE(orders.model_id, NULLIF(%s, '')),
                product_id = COALESCE(orders.product_id, NULLIF(%s, '')),
                selected_color = COALESCE(NULLIF(orders.selected_color, ''), NULLIF(%s, '')),
                color = COALESCE(NULLIF(orders.color, ''), NULLIF(%s, '')),
                model_image = COALESCE(NULLIF(orders.model_image, ''), NULLIF(%s, '')),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (tot_items_price, total_order_amount, deposit_amount, paid_amount, payment_status, del_fee, del_mode, first_model_id, first_model_id, first_color, first_color, first_model_img, actual_order_id))
    else:
        actual_order_id = generate_id("ORD")
        o_date = p_date or today_str()
        o_no = generate_sequential_order_no(cur, o_date)
        cur.execute("""
            INSERT INTO orders (
                id, order_no, customer_id, product_id, model_id,
                total_amount, subtotal, discount, tax, base_amount,
                currency, exchange_rate, deposit_amount, paid_amount,
                payment_status, production_status, payment_method,
                delivery_fee, delivery_payment_mode, order_date, selected_color, color,
                model_image, status, notes
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, 0.0, 0.0, %s,
                %s, 1.0, %s, %s,
                %s, 'Cutting', %s,
                %s, %s, %s, %s, %s,
                %s, 'Active', %s
            );
        """, (
            actual_order_id, o_no, cust_id, first_model_id, first_model_id,
            total_order_amount, tot_items_price, total_order_amount,
            order_currency, deposit_amount, paid_amount,
            payment_status, pay_method or 'نقد (كاش)',
            del_fee, del_mode, o_date, first_color, first_color,
            first_model_img, order_notes
        ))

    # ربط أصناف الطلب في جدول order_items وتوليد مراحل الإنتاج
    if actual_order_id and first_model_id:
        cur.execute("SELECT id, measurement_id, fabrics_data FROM order_items WHERE order_id = %s LIMIT 1;", (actual_order_id,))
        ex_item = cur.fetchone()
        f_meas = meas_rows[0] if meas_rows else {}
        m_meas_id = f_meas.get('id')
        m_fb_raw = f_meas.get('fabrics_data') or []
        m_fb_json = json.dumps(m_fb_raw, ensure_ascii=False)
        item_img = first_model_img if (first_model_img and not first_model_img.startswith('data:image/')) else ''
        po_no = f"PO-{o_no if not ex_order else ex_order['order_no']}"

        if not ex_item:
            itm_id = generate_id("OITM")
            cur.execute("""
                INSERT INTO order_items (id, order_id, product_id, model_id, measurement_id, product_name, selected_color, color, model_image, image_url, quantity, unit_price, total_price, total_amount, paid_amount, remaining_amount, fabrics_data, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, %s, %s, %s, %s, %s, %s::jsonb, %s);
            """, (itm_id, actual_order_id, first_model_id, first_model_id, m_meas_id, first_model_name or 'فستان أميرات', first_color, first_color, item_img, item_img, tot_items_price, tot_items_price, total_order_amount, paid_amount, remaining_amount, m_fb_json, order_notes))
            create_order_stages(cur, actual_order_id, itm_id, first_model_id, first_model_name, po_no)
        else:
            itm_id = ex_item['id']
            cur.execute("""
                UPDATE order_items SET
                    measurement_id = COALESCE(order_items.measurement_id, %s),
                    fabrics_data = CASE WHEN order_items.fabrics_data IS NULL OR order_items.fabrics_data = '[]'::jsonb THEN %s::jsonb ELSE order_items.fabrics_data END,
                    paid_amount = %s, remaining_amount = %s, total_amount = %s, total_price = %s
                WHERE id = %s;
            """, (m_meas_id, m_fb_json, paid_amount, remaining_amount, total_order_amount, tot_items_price, itm_id))
            cur.execute("SELECT COUNT(*) as cnt FROM order_stages WHERE order_item_id = %s;", (itm_id,))
            if cur.fetchone()['cnt'] == 0:
                create_order_stages(cur, actual_order_id, itm_id, first_model_id, first_model_name, po_no)

        cur.execute("SELECT id FROM production_orders WHERE order_id = %s OR production_order_no = %s LIMIT 1;", (actual_order_id, po_no))
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO production_orders (id, production_order_no, order_id, customer_id, customer_name, product_id, model_id, product_name, child_name, selected_color, color, model_image, product_image, stage, progress, status, total_amount, deposit_amount, remaining_amount, fabrics_data, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'القص والتحضير ✂️', 20, 'In Progress', %s, %s, %s, %s::jsonb, %s)
                ON CONFLICT (production_order_no) DO NOTHING;
            """, (generate_id("PRD"), po_no, actual_order_id, cust_id, f_meas.get('child_name') or '', first_model_id, first_model_id, first_model_name or 'فستان أميرات', f_meas.get('child_name') or '', first_color, first_color, item_img, item_img, total_order_amount, paid_amount, remaining_amount, m_fb_json, order_notes))

    # 6. ربط سند القبض بالطلب المنشأ أو المحدث
    if voucher_id and actual_order_id:
        cur.execute("UPDATE payments SET order_id = COALESCE(order_id, %s) WHERE id = %s;", (actual_order_id, voucher_id))
    elif cust_id and actual_order_id:
        cur.execute("UPDATE payments SET order_id = COALESCE(order_id, %s) WHERE customer_id = %s AND payment_type = 'Receipt' AND order_id IS NULL;", (actual_order_id, cust_id))

    return {
        "customer_id": cust_id, "order_id": actual_order_id,
        "total_amount": total_order_amount, "deposit_amount": deposit_amount,
        "paid_amount": paid_amount, "remaining_amount": remaining_amount
    }


def retroactive_financial_sync(cur=None):
    """مزامنة خلفية شاملة لكافة العملاء والطلبات وتصحيح الحقول الصفرية"""
    def _execute_sync(c):
        c.execute("SELECT id, name FROM customers ORDER BY created_at ASC;")
        customers = c.fetchall() or []
        reconciled = []
        for cust in customers:
            cid = cust['id']
            res = sync_customer_order_from_voucher(c, cid)
            if res:
                reconciled.append(res)
        logger.info(f"✅ تم تنفيذ المزامنة المالية الخلفية بنجاح لـ {len(reconciled)} عميل.")
        return {"success": True, "reconciled_count": len(reconciled), "customers": reconciled}

    if cur:
        return _execute_sync(cur)
    with get_db_cursor(commit=True) as c:
        return _execute_sync(c)
