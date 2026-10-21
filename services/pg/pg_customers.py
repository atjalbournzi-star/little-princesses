# services/pg/pg_customers.py
# Customer records management, querying, ledger aggregation, and deletion

from .db_pool import get_db_cursor, clean_str, clean_num, logger
from .pg_customer_save import add_customer
from .pg_customer_tracking import get_customer_order_tracking, confirm_customer_fitting


def get_customers(params=None):
    """استرجاع سجلات العملاء كاملة مع القياسات وتجميعات أوامر المبيعات والسندات"""
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT id, id as customer_id, name, name as customer_name, phone, phone_alt, platform, handle, category, city, street,
                   children_count, current_balance, total_amount, deposit_amount, paid_amount, remaining_amount,
                   notes, status, selected_color, model_id, model_image, created_at, updated_at
            FROM customers
            ORDER BY created_at DESC;
        """)
        customers = cur.fetchall()

        cur.execute("""
            SELECT id, customer_id, child_id, child_name, date, measurement_date, unit,
                   total_len, dress_len, chest_len, skirt_len, sleeve_len,
                   chest_circ, waist_circ, shoulder_w, armpit_circ, neck_circ,
                   model_name, model_img, model_image, image_url, model_id, product_id,
                   selected_color, color, dress_color, comfort_profile, notes
            FROM measurements;
        """)
        all_meas = cur.fetchall()
        meas_map = {}
        for m in all_meas:
            cid = m.get('customer_id')
            if cid not in meas_map:
                meas_map[cid] = []
            m['total_length'] = m.get('total_len')
            m['total_height'] = m.get('total_len')
            m['dress_length'] = m.get('dress_len')
            m['chest_length'] = m.get('chest_len')
            m['skirt_length'] = m.get('skirt_len')
            m['sleeve_length'] = m.get('sleeve_len')
            m['shoulder_width'] = m.get('shoulder_w')
            m['armhole_circ'] = m.get('armpit_circ') or ''
            m['selected_model'] = m.get('model_name') or ''
            m['model_id'] = m.get('model_id') or m.get('product_id') or ''
            m['product_id'] = m['model_id']
            m['selected_color'] = m.get('selected_color') or m.get('dress_color') or m.get('color') or ''
            m['dress_color'] = m['selected_color']
            m['color'] = m['selected_color']
            m['model_image'] = m.get('model_image') or m.get('model_img') or m.get('image_url') or ''
            m['model_img'] = m['model_image']
            m['sewing_notes'] = m.get('notes')
            m['event_date'] = str(m.get('date') or '')

            dress_l = clean_num(m.get('dress_len'))
            if dress_l > 0:
                if dress_l <= 45: m['estimated_age'] = '1-2 سنوات'
                elif dress_l <= 55: m['estimated_age'] = '2-3 سنوات'
                elif dress_l <= 60: m['estimated_age'] = '4 سنوات'
                elif dress_l <= 65: m['estimated_age'] = '5 سنوات'
                elif dress_l <= 70: m['estimated_age'] = '6 سنوات'
                elif dress_l <= 75: m['estimated_age'] = '7 سنوات'
                elif dress_l <= 80: m['estimated_age'] = '8 سنوات'
                elif dress_l <= 85: m['estimated_age'] = '9 سنوات'
                elif dress_l <= 90: m['estimated_age'] = '10 سنوات'
                elif dress_l <= 95: m['estimated_age'] = '11 سنة'
                elif dress_l <= 100: m['estimated_age'] = '12 سنة'
                else: m['estimated_age'] = 'أكثر من 12 سنة'
            else:
                m['estimated_age'] = ''
            meas_map[cid].append(m)

        cur.execute("SELECT id, customer_id, child_name, notes FROM children;")
        all_children = cur.fetchall()
        ch_map = {}
        for ch in all_children:
            cid = ch.get('customer_id')
            if cid not in ch_map:
                ch_map[cid] = []
            ch_map[cid].append(ch)

        cur.execute("""
            SELECT customer_id, 
                   COALESCE(SUM(
                       CASE 
                           WHEN delivery_payment_mode = 'DIRECT_TO_COURIER' AND delivery_fee > 0 AND total_amount > subtotal AND subtotal > 0 THEN subtotal
                           ELSE total_amount 
                       END
                   ), 0) as total_sales,
                   COALESCE(SUM(paid_amount), 0) as total_paid,
                   COALESCE(SUM(remaining_amount), 0) as total_remaining,
                   MAX(order_no) as latest_order_no,
                   MAX(payment_method) as latest_pay_method,
                   MAX(delivery_payment_mode) as latest_delivery_mode,
                   COALESCE(MAX(delivery_fee), 0) as latest_delivery_fee
            FROM orders
            GROUP BY customer_id;
        """)
        orders_agg = {r['customer_id']: r for r in cur.fetchall()}

        cur.execute("""
            SELECT customer_id, COALESCE(SUM(amount), 0) as total_vouchers_paid
            FROM payments
            WHERE payment_type = 'Receipt' AND status != 'Cancelled'
            GROUP BY customer_id;
        """)
        payments_agg = {r['customer_id']: float(r['total_vouchers_paid']) for r in cur.fetchall()}

        for c in customers:
            if c.get('created_at'):
                c['created_at'] = str(c['created_at'])
                c['reg_date'] = str(c['created_at'])[:10]
            if c.get('updated_at'): c['updated_at'] = str(c['updated_at'])
            if not c.get('customer_id'):
                c['customer_id'] = c.get('id')
            c_id = c.get('id')
            c_meas_primary = meas_map.get(c_id, [])
            c_meas_alt = meas_map.get(c.get('customer_id'), []) if c.get('customer_id') != c_id else []
            seen_m_ids = set()
            c_meas = []
            for m in (c_meas_primary + c_meas_alt):
                m_id = m.get('id') or f"{m.get('child_name')}_{m.get('model_name')}"
                if m_id not in seen_m_ids:
                    seen_m_ids.add(m_id)
                    c_meas.append(m)
            c_children = ch_map.get(c_id, [])
            known_child_names = {clean_str(m.get('child_name')) for m in c_meas if clean_str(m.get('child_name'))}
            for ch in c_children:
                ch_n = clean_str(ch.get('child_name'))
                if ch_n and ch_n not in known_child_names:
                    c_meas.append({
                        'id': ch.get('id'), 'customer_id': c.get('id'), 'child_id': ch.get('id'),
                        'child_name': ch_n, 'notes': ch.get('notes'), 'estimated_age': '', 'event_date': ''
                    })
                    known_child_names.add(ch_n)

            cid = c.get('id')
            ord_info = orders_agg.get(cid, {})
            c_sales = float(ord_info.get('total_sales') or c.get('total_amount') or 0.0)
            c_paid_orders = float(ord_info.get('total_paid') or 0.0)
            c_paid_vouchers = payments_agg.get(cid, 0.0)
            c_paid_field = float(c.get('paid_amount') or c.get('deposit_amount') or 0.0)
            c_paid = max(c_paid_orders, c_paid_vouchers, c_paid_field)
            c_dep = float(c.get('deposit_amount') or c_paid)
            c_cur_bal = float(c.get('current_balance') or c.get('remaining_amount') or 0.0)
            c_remaining = max(0.0, c_sales - c_paid) if c_sales > 0 else c_cur_bal
            c_pay_method = ord_info.get('latest_pay_method') or 'نقد (كاش)'
            c_order_no = ord_info.get('latest_order_no') or f"INV-{cid}"
            del_mode = ord_info.get('latest_delivery_mode') or 'DIRECT_TO_COURIER'
            del_fee = float(ord_info.get('latest_delivery_fee') or 0.0)

            c['total_sales'] = c_sales
            c['total_amount'] = c_sales
            c['total_paid'] = c_paid
            c['paid_amount'] = c_paid
            c['deposit'] = c_dep
            c['deposit_amount'] = c_dep
            c['remaining'] = c_remaining
            c['remaining_amount'] = c_remaining
            c['current_balance'] = c_remaining
            c['latest_order_no'] = c_order_no
            c['delivery_payment_mode'] = del_mode
            c['delivery_fee'] = del_fee
            c['ledger'] = {
                'total_sales': c_sales, 'total_amount': c_sales,
                'total_paid': c_paid, 'paid_amount': c_paid,
                'deposit': c_dep, 'deposit_amount': c_dep,
                'remaining': c_remaining, 'remaining_amount': c_remaining,
                'pay_method': c_pay_method, 'delivery_payment_mode': del_mode,
                'delivery': del_fee, 'delivery_fee': del_fee
            }
            c['measurements'] = c_meas
            c['children'] = c_children
        return customers


def delete_customer(payload):
    """حذف العميل وسجلاته المرتبطة بأمان"""
    data = payload.get('data') or payload
    cid = clean_str(data.get('id') or data.get('customer_id'))
    if cid and cid != 'CUST-GENERAL':
        with get_db_cursor(commit=True) as cur:
            cur.execute("DELETE FROM measurements WHERE customer_id = %s;", (cid,))
            cur.execute("DELETE FROM children WHERE customer_id = %s;", (cid,))
            cur.execute("DELETE FROM customers WHERE id = %s;", (cid,))
    return {"deleted": True, "id": cid}
