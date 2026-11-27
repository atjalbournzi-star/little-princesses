# services/pg/pg_customer_measurements.py
# Customer children & measurements persistence (supports DEPENDENT & SELF/Women profiles)

import json
from .db_pool import clean_str, clean_num
from .pg_sequences import get_next_sequence_number


def _opt_num(val):
    if val is None or str(val).strip() == '':
        return None
    return clean_num(val)


def save_meas_and_children(cur, cust_id, meas_list, children_list=None, user_id='admin'):
    saved_ch_map, saved_children, saved_meas = {}, [], []
    if cust_id and not str(cust_id).startswith('CUST-NEW'):
        cur.execute("SELECT id, child_name FROM children WHERE customer_id = %s AND status != 'Deleted';", (cust_id,))
        for r in cur.fetchall():
            saved_ch_map[clean_str(r['child_name'])] = r['id']

    for ch in (children_list or []):
        chld_name = clean_str(ch.get('child_name') or ch.get('name') or '')
        if not chld_name:
            continue
        chld_id = clean_str(ch.get('id') or ch.get('child_id')) or saved_ch_map.get(chld_name)
        if not chld_id or chld_id.startswith('CHLD-NEW'):
            chld_id = get_next_sequence_number(cur, 'CHLD', fallback_prefix='CHLD-')
        ch['id'] = ch['child_id'] = saved_ch_map[chld_name] = chld_id
        g_clean = 'ذكر' if 'ذكر' in clean_str(ch.get('gender') or '') or 'male' in clean_str(ch.get('gender') or '').lower() else 'أنثى'
        ch_age = int(clean_num(ch.get('age') or 0)) or None
        cur.execute("""
            INSERT INTO children (id, customer_id, child_name, gender, age, notes, status, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'Active', CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET child_name = EXCLUDED.child_name, gender = COALESCE(EXCLUDED.gender, children.gender),
                age = COALESCE(EXCLUDED.age, children.age), notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
            RETURNING id, customer_id, child_name, gender, age, notes, status;
        """, (chld_id, cust_id, chld_name, g_clean, ch_age, clean_str(ch.get('notes'))))
        saved_children.append(dict(cur.fetchone()))

    for m in (meas_list or []):
        wearer_type = clean_str(m.get('wearer_type') or 'DEPENDENT').upper()
        if wearer_type not in ('SELF', 'DEPENDENT'):
            wearer_type = 'DEPENDENT'
        target_seg = clean_str(m.get('target_segment') or ('WOMEN_APPAREL' if wearer_type == 'SELF' else 'GIRLS_DRESS')).upper()
        chld_name = clean_str(m.get('child_name') or m.get('name') or '')
        chld_id = clean_str(m.get('child_id')) or (saved_ch_map.get(chld_name) if (chld_name and wearer_type != 'SELF') else None)

        if wearer_type != 'SELF':
            if not chld_id:
                chld_id = get_next_sequence_number(cur, 'CHLD', fallback_prefix='CHLD-')
                if chld_name:
                    saved_ch_map[chld_name] = chld_id
            m['child_id'] = chld_id
            g_clean = 'ذكر' if 'ذكر' in clean_str(m.get('gender') or '') or 'male' in clean_str(m.get('gender') or '').lower() else 'أنثى'
            ch_age = int(clean_num(m.get('age') or 0)) or None
            cur.execute("""
                INSERT INTO children (id, customer_id, child_name, gender, age, notes, status, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, 'Active', CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET child_name = EXCLUDED.child_name, gender = COALESCE(EXCLUDED.gender, children.gender),
                    age = COALESCE(EXCLUDED.age, children.age), notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
                RETURNING id, customer_id, child_name, gender, age, notes, status;
            """, (chld_id, cust_id, chld_name, g_clean, ch_age, clean_str(m.get('notes'))))
            ch_row = dict(cur.fetchone())
            if not any(c['id'] == chld_id for c in saved_children):
                saved_children.append(ch_row)
        else:
            m['child_id'] = chld_id

        m_ev = clean_str(m.get('event_date') or m.get('date') or '') or None
        m_ms = clean_str(m.get('meas_date') or m.get('measurement_date') or '') or None
        meas_id = clean_str(m.get('id') or m.get('measurement_id'))
        if not meas_id or meas_id.startswith('MEAS-NEW'):
            meas_id = get_next_sequence_number(cur, 'MEAS', fallback_prefix='MEAS-')
        m['id'] = m['measurement_id'] = meas_id

        unit_clean = 'inch' if any(k in clean_str(m.get('unit') or 'cm').lower() for k in ['إنش', 'انش', 'inch', 'in']) else 'cm'
        dress_len = clean_num(m.get('dress_length') or m.get('dress_len'))
        total_len = clean_num(m.get('total_height') or m.get('total_length') or m.get('total_len'))
        std_dress_cm = round(dress_len * 2.54, 2) if (unit_clean == 'inch' and dress_len > 0) else dress_len
        std_dress_in = dress_len if unit_clean == 'inch' else (round(dress_len / 2.54, 2) if dress_len > 0 else 0)
        notes_orig = clean_str(m.get('sewing_notes') or m.get('notes') or '')
        norm_info = f"[معياري: {std_dress_cm}سم / {std_dress_in}إنش]"
        notes_final = f"{notes_orig} | {norm_info}".strip(" |") if norm_info not in notes_orig else notes_orig
        m_mod_name = clean_str(m.get('model_name') or m.get('selected_model') or '')
        m_mod_id = clean_str(m.get('model_id') or m.get('product_id') or '') or None
        m_color = clean_str(m.get('selected_color') or m.get('color') or m.get('dress_color') or '')
        m_img = clean_str(m.get('model_image') or m.get('model_img') or m.get('image_url') or '')
        raw_fbr = m.get('fabrics_breakdown') or m.get('bom_items') or m.get('fabrics_data') or []
        m_price = clean_num(m.get('adjusted_price') or m.get('price') or 0.0)
        hip_circ = _opt_num(m.get('hip_circ') or m.get('hip_cm'))
        arm_circ = _opt_num(m.get('arm_circ') or m.get('arm_cm'))
        extra_raw = m.get('extra_measurements_json')
        if isinstance(extra_raw, str):
            try:
                extra_raw = json.loads(extra_raw)
            except Exception:
                extra_raw = {}
        extra_json = json.dumps(extra_raw if isinstance(extra_raw, dict) else {}, ensure_ascii=False)

        cur.execute("""
            INSERT INTO measurements (
                id, customer_id, child_id, child_name, unit, total_len, dress_len,
                chest_len, skirt_len, sleeve_len, chest_circ, waist_circ, shoulder_w,
                armpit_circ, neck_circ, wearer_type, target_segment, hip_circ, arm_circ,
                extra_measurements_json, model_name, model_id, product_id,
                selected_color, color, dress_color, model_image, model_img, image_url,
                comfort_profile, notes, date, measurement_date, fabrics_data, price, total_amount
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                COALESCE(%s::date, CURRENT_DATE), COALESCE(%s::date, CURRENT_DATE), %s::jsonb, %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                child_id = EXCLUDED.child_id, child_name = EXCLUDED.child_name, unit = EXCLUDED.unit,
                total_len = EXCLUDED.total_len, dress_len = EXCLUDED.dress_len,
                chest_len = EXCLUDED.chest_len, skirt_len = EXCLUDED.skirt_len, sleeve_len = EXCLUDED.sleeve_len,
                chest_circ = EXCLUDED.chest_circ, waist_circ = EXCLUDED.waist_circ, shoulder_w = EXCLUDED.shoulder_w,
                armpit_circ = EXCLUDED.armpit_circ, neck_circ = EXCLUDED.neck_circ,
                wearer_type = EXCLUDED.wearer_type, target_segment = EXCLUDED.target_segment,
                hip_circ = EXCLUDED.hip_circ, arm_circ = EXCLUDED.arm_circ,
                extra_measurements_json = EXCLUDED.extra_measurements_json,
                model_name = EXCLUDED.model_name, model_id = EXCLUDED.model_id, product_id = EXCLUDED.product_id,
                selected_color = EXCLUDED.selected_color, color = EXCLUDED.color, dress_color = EXCLUDED.dress_color,
                model_image = EXCLUDED.model_image, model_img = EXCLUDED.model_img, image_url = EXCLUDED.image_url,
                comfort_profile = EXCLUDED.comfort_profile, notes = EXCLUDED.notes,
                fabrics_data = EXCLUDED.fabrics_data, price = EXCLUDED.price, total_amount = EXCLUDED.total_amount,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """, (
            meas_id, cust_id, chld_id, chld_name, unit_clean, total_len, dress_len,
            clean_num(m.get('chest_length') or m.get('chest_len')),
            clean_num(m.get('skirt_length') or m.get('skirt_len')),
            clean_num(m.get('sleeve_length') or m.get('sleeve_len')),
            clean_num(m.get('chest_circ')), clean_num(m.get('waist_circ')),
            clean_num(m.get('shoulder_width') or m.get('shoulder_w')),
            clean_num(m.get('armpit_circ')), clean_num(m.get('neck_circ')),
            wearer_type, target_seg, hip_circ, arm_circ, extra_json,
            m_mod_name, m_mod_id, m_mod_id, m_color, m_color, m_color, m_img, m_img, m_img,
            clean_str(m.get('comfort_profile')), notes_final, m_ev, m_ms,
            json.dumps(raw_fbr, ensure_ascii=False), m_price, m_price,
        ))
        meas_row = dict(cur.fetchone())
        for k in ('created_at', 'updated_at', 'date', 'measurement_date'):
            if meas_row.get(k):
                meas_row[k] = str(meas_row[k])
        saved_meas.append(meas_row)

    return saved_children, saved_meas
