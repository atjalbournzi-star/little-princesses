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
                   children_count, current_balance, notes, status, created_at, updated_at
            FROM customers
            ORDER BY created_at DESC;
        """)
        customers = cur.fetchall()

        cur.execute("""
            SELECT id, customer_id, child_id, child_name, date, measurement_date, unit,
                   total_len, dress_len, chest_len, skirt_len, sleeve_len,
                   chest_circ, waist_circ, shoulder_w, armpit_circ, neck_circ,
                   model_name, model_img, comfort_profile, notes
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
            m['model_image'] = m.get('model_img') or ''
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
                   COALESCE(SUM(total_amount), 0) as total_sales,
                   COALESCE(SUM(paid_amount), 0) as total_paid,
                   COALESCE(SUM(remaining_amount), 0) as total_remaining,
                   MAX(order_no) as latest_order_no,
                   MAX(payment_method) as latest_pay_method
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
            c_sales = float(ord_info.get('total_sales') or 0.0)
            c_paid_orders = float(ord_info.get('total_paid') or 0.0)
            c_paid_vouchers = payments_agg.get(cid, 0.0)
            c_paid = max(c_paid_orders, c_paid_vouchers)
            c_cur_bal = float(c.get('current_balance') or 0.0)
            c_remaining = max(0.0, c_sales - c_paid) if c_sales > 0 else c_cur_bal
            c_pay_method = ord_info.get('latest_pay_method') or 'نقد (كاش)'
            c_order_no = ord_info.get('latest_order_no') or f"INV-{cid}"

            c['total_sales'] = c_sales
            c['total_paid'] = c_paid
            c['deposit'] = c_paid
            c['remaining'] = c_remaining
            c['current_balance'] = c_remaining
            c['latest_order_no'] = c_order_no
            c['ledger'] = {'total_sales': c_sales, 'total_paid': c_paid, 'deposit': c_paid, 'remaining': c_remaining, 'pay_method': c_pay_method}
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
