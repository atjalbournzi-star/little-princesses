# services/pg/pg_customer_save.py
# Customer creation, profile updating, and integrated financial/production settlement

import time
import json
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, logger, today_str, generate_sequential_order_no
from .pg_receipt_sync import sync_advance_receipt


def _save_meas_and_children(cur, cust_id, meas_list):
    for m in meas_list:
        chld_name = clean_str(m.get('child_name') or m.get('name') or '')
        chld_id = clean_str(m.get('child_id'))
        if not chld_id and chld_name:
            cur.execute("SELECT id FROM children WHERE customer_id = %s AND child_name = %s LIMIT 1;", (cust_id, chld_name))
            ex_ch = cur.fetchone()
            if ex_ch: chld_id = ex_ch['id']
        if not chld_id: chld_id = generate_id("CHLD")
        m['child_id'] = chld_id
        cur.execute("""
            INSERT INTO children (id, customer_id, child_name, notes)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING;
        """, (chld_id, cust_id, chld_name, clean_str(m.get('notes'))))

        m_ev = clean_str(m.get('event_date') or m.get('date') or '') or None
        m_ms = clean_str(m.get('meas_date') or m.get('measurement_date') or '') or None
        m_mod_id = clean_str(m.get('model_id') or m.get('product_id') or '') or None

        meas_id = clean_str(m.get('id') or m.get('measurement_id'))
        if not meas_id and cust_id and chld_id:
            cur.execute("SELECT id FROM measurements WHERE customer_id = %s AND child_id = %s ORDER BY created_at DESC LIMIT 1;", (cust_id, chld_id))
            ex_m = cur.fetchone()
            if ex_m: meas_id = ex_m['id']
        if not meas_id: meas_id = generate_id("MEAS")
        m['id'] = meas_id
        m['measurement_id'] = meas_id

        unit_raw = clean_str(m.get('unit') or 'cm').lower()
        is_inch = any(k in unit_raw for k in ['إنش', 'انش', 'inch', 'in'])
        unit_clean = 'inch' if is_inch else 'cm'

        dress_len = clean_num(m.get('dress_length') or m.get('dress_len'))
        total_len = clean_num(m.get('total_height') or m.get('total_length') or m.get('total_len'))

        std_dress_cm = round(dress_len * 2.54, 2) if (is_inch and dress_len > 0) else dress_len
        std_dress_in = dress_len if is_inch else (round(dress_len / 2.54, 2) if dress_len > 0 else 0)

        notes_orig = clean_str(m.get('sewing_notes') or m.get('notes') or '')
        norm_info = f"[معياري: {std_dress_cm}سم / {std_dress_in}إنش]"
        notes_final = f"{notes_orig} | {norm_info}".strip(" |") if norm_info not in notes_orig else notes_orig

        m_mod_name = clean_str(m.get('model_name') or m.get('selected_model') or '')
        m_mod_id = clean_str(m.get('model_id') or m.get('product_id') or '') or None
        m_color = clean_str(m.get('selected_color') or m.get('color') or m.get('dress_color') or '')
        m_img = clean_str(m.get('model_image') or m.get('model_img') or m.get('image_url') or '')
        if m_img.startswith('data:image/') and len(m_img) > 500 and m_mod_id:
            cur.execute("SELECT image_url FROM products WHERE id = %s LIMIT 1;", (m_mod_id,))
            p_img_row = cur.fetchone()
            if p_img_row and p_img_row.get('image_url'):
                m_img = p_img_row['image_url']
        m['model_image'] = m_img

        raw_fbr = m.get('fabrics_breakdown') or m.get('bom_items') or m.get('fabrics_data') or []
        m_fabrics = json.dumps(raw_fbr, ensure_ascii=False)
        m['fabrics_data'] = raw_fbr
        m_price = clean_num(m.get('adjusted_price') or m.get('price') or 0.0)

        cur.execute("""
            INSERT INTO measurements (
                id, customer_id, child_id, child_name, unit, total_len, dress_len,
                chest_len, skirt_len, sleeve_len, chest_circ, waist_circ, shoulder_w,
                armpit_circ, neck_circ, model_name, model_id, product_id,
                selected_color, color, dress_color, model_image, model_img, image_url,
                comfort_profile, notes, date, measurement_date, fabrics_data, price, total_amount
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s::date, CURRENT_DATE), COALESCE(%s::date, CURRENT_DATE), %s::jsonb, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                child_name = EXCLUDED.child_name, unit = EXCLUDED.unit, total_len = EXCLUDED.total_len, dress_len = EXCLUDED.dress_len,
                chest_len = EXCLUDED.chest_len, skirt_len = EXCLUDED.skirt_len, sleeve_len = EXCLUDED.sleeve_len,
                chest_circ = EXCLUDED.chest_circ, waist_circ = EXCLUDED.waist_circ, shoulder_w = EXCLUDED.shoulder_w,
                armpit_circ = EXCLUDED.armpit_circ, neck_circ = EXCLUDED.neck_circ, model_name = EXCLUDED.model_name,
                model_id = EXCLUDED.model_id, product_id = EXCLUDED.product_id,
                selected_color = EXCLUDED.selected_color, color = EXCLUDED.color, dress_color = EXCLUDED.dress_color,
                model_image = EXCLUDED.model_image, model_img = EXCLUDED.model_img, image_url = EXCLUDED.image_url,
                comfort_profile = EXCLUDED.comfort_profile, notes = EXCLUDED.notes,
                fabrics_data = EXCLUDED.fabrics_data, price = EXCLUDED.price, total_amount = EXCLUDED.total_amount,
                date = COALESCE(EXCLUDED.date, measurements.date),
                measurement_date = COALESCE(EXCLUDED.measurement_date, measurements.measurement_date), updated_at = CURRENT_TIMESTAMP;
        """, (
            meas_id, cust_id, chld_id, chld_name, unit_clean, total_len, dress_len,
            clean_num(m.get('chest_length') or m.get('chest_len')), clean_num(m.get('skirt_length') or m.get('skirt_len')),
            clean_num(m.get('sleeve_length') or m.get('sleeve_len')), clean_num(m.get('chest_circ')), clean_num(m.get('waist_circ')),
            clean_num(m.get('shoulder_width') or m.get('shoulder_w')), clean_num(m.get('armpit_circ')), clean_num(m.get('neck_circ')),
            m_mod_name, m_mod_id, m_mod_id, m_color, m_color, m_color, m_img, m_img, m_img,
            clean_str(m.get('comfort_profile')), notes_final, m_ev, m_ms, m_fabrics, m_price, m_price
        ))


from .pg_customer_financials import save_customer_financials as _save_customer_financials



def add_customer(payload):
    data = payload.get('data') or payload
    cust_id = clean_str(data.get('id') or data.get('customer_id')) or generate_id("CUST")
    name = clean_str(data.get('name') or data.get('customer_name') or '')
    phone = clean_str(data.get('phone') or data.get('phone_number') or '')
    phone_alt = clean_str(data.get('phone_alt') or data.get('alternative_phone'))
    platform, handle = clean_str(data.get('platform') or ''), clean_str(data.get('handle') or '')
    category, city = clean_str(data.get('category') or ''), clean_str(data.get('city') or '')
    street, notes = clean_str(data.get('street') or ''), clean_str(data.get('notes') or '')
    children_cnt = int(clean_num(data.get('children_count') or 0))

    with get_db_cursor(commit=True) as cur:
        existing_c = None
        if cust_id and not cust_id.startswith('CUST-NEW'):
            cur.execute("SELECT id FROM customers WHERE id = %s LIMIT 1;", (cust_id,))
            existing_c = cur.fetchone()
        if not existing_c and phone:
            cur.execute("SELECT id FROM customers WHERE phone = %s LIMIT 1;", (phone,))
            existing_c = cur.fetchone()
        if not existing_c and name:
            cur.execute("SELECT id FROM customers WHERE name = %s LIMIT 1;", (name,))
            existing_c = cur.fetchone()
        if existing_c: cust_id = existing_c['id']

        cur.execute("""
            INSERT INTO customers (id, name, phone, phone_alt, platform, handle, category, city, street, children_count, notes, status, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Active', CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, phone = EXCLUDED.phone, phone_alt = EXCLUDED.phone_alt, platform = EXCLUDED.platform,
                handle = EXCLUDED.handle, category = EXCLUDED.category, city = EXCLUDED.city, street = EXCLUDED.street,
                children_count = EXCLUDED.children_count, notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """, (cust_id, name, phone, phone_alt, platform, handle, category, city, street, children_cnt, notes))
        res = dict(cur.fetchone())
        res['customer_name'] = res.get('name')

        meas_list = data.get('measurements') or []
        _save_meas_and_children(cur, cust_id, meas_list)
        total_sales, deposit, remaining, pay_method, order_no, del_fee, total_ord_amt, del_mode = _save_customer_financials(cur, cust_id, name, data, meas_list, is_existing=bool(existing_c))

        res.update({'current_balance': remaining, 'total_sales': total_sales, 'total_order_amount': total_ord_amt, 'total_paid': deposit, 'deposit': deposit, 'delivery_fee': del_fee, 'delivery_payment_mode': del_mode, 'remaining': remaining, 'latest_order_no': order_no, 'ledger': {'total_sales': total_sales, 'total_paid': deposit, 'deposit': deposit, 'delivery': del_fee, 'delivery_payment_mode': del_mode, 'total_order_amount': total_ord_amt, 'remaining': remaining, 'pay_method': pay_method}})
        for k in ['created_at', 'updated_at']: (res.get(k) and res.update({k: str(res[k])}))
    return res
