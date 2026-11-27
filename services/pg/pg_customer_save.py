# services/pg/pg_customer_save.py
# Customer creation, profile updating, measurements and integrated financial settlement

import time
import json
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, logger, today_str, generate_sequential_order_no
from .pg_receipt_sync import sync_advance_receipt
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, flush_audit_events, get_active_user_context
from .pg_customer_financials import save_customer_financials as _save_customer_financials
from .pg_customer_measurements import save_meas_and_children as _save_meas_and_children


def _resolve_user_id(cur, user_val):
    if not user_val: return None
    u_str = str(user_val).strip()
    cur.execute("SELECT id FROM users WHERE id = %s OR username = %s LIMIT 1;", (u_str, u_str))
    row = cur.fetchone()
    if row: return row['id']
    cur.execute("SELECT id FROM users ORDER BY id ASC LIMIT 1;")
    first_u = cur.fetchone()
    return first_u['id'] if first_u else None

def _clean_date(date_val):
    if not date_val: return None
    s = str(date_val).strip()
    for i, d in enumerate('٠١٢٣٤٥٦٧٨٩'): s = s.replace(d, str(i))
    for i, d in enumerate('۰۱۲۳۴۵۶۷۸۹'): s = s.replace(d, str(i))
    import re
    m = re.search(r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', s)
    return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}" if m else None


def add_customer(payload):
    data = payload.get('data') or payload
    raw_uid = clean_str(data.get('created_by') or data.get('user_id') or '')
    resolved_user = raw_uid or get_active_user_context('admin')

    cust_id, name, phone = clean_str(data.get('id') or data.get('customer_id')), clean_str(data.get('name') or data.get('customer_name') or ''), clean_str(data.get('phone') or data.get('phone_number') or '')
    phone_alt = clean_str(data.get('phone_alt') or data.get('alternative_phone')) or None
    platform, handle, category = clean_str(data.get('platform') or ''), clean_str(data.get('handle') or ''), clean_str(data.get('category') or '')
    city, street, notes = clean_str(data.get('city') or ''), clean_str(data.get('street') or ''), clean_str(data.get('notes') or '')
    children_cnt, reg_date = int(clean_num(data.get('children_count') or 0)), _clean_date(data.get('reg_date') or data.get('created_at'))

    with get_db_cursor(commit=True) as cur:
        cur._audit_buffer = []
        valid_user_id = _resolve_user_id(cur, resolved_user)
        existing_c = None
        if cust_id and not cust_id.startswith('CUST-NEW'):
            cur.execute("SELECT id FROM customers WHERE id = %s LIMIT 1 FOR UPDATE;", (cust_id,))
            existing_c = cur.fetchone()
        if not existing_c and phone:
            cur.execute("SELECT id FROM customers WHERE phone = %s LIMIT 1 FOR UPDATE;", (phone,))
            existing_c = cur.fetchone()
        if not existing_c and name:
            cur.execute("SELECT id FROM customers WHERE name = %s LIMIT 1 FOR UPDATE;", (name,))
            existing_c = cur.fetchone()

        cust_id = existing_c['id'] if existing_c else get_next_sequence_number(cur, 'CUST', fallback_prefix='CUST-')

        cur.execute("""
            INSERT INTO customers (
                id, name, phone, phone_alt, platform, handle, category, city, street,
                children_count, notes, status, created_by, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Active', %s,
                COALESCE(%s::timestamptz, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, phone = EXCLUDED.phone, phone_alt = EXCLUDED.phone_alt,
                platform = EXCLUDED.platform, handle = EXCLUDED.handle, category = EXCLUDED.category,
                city = EXCLUDED.city, street = EXCLUDED.street, children_count = EXCLUDED.children_count,
                notes = EXCLUDED.notes, created_by = COALESCE(customers.created_by, EXCLUDED.created_by),
                created_at = COALESCE(%s::timestamptz, customers.created_at), updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """, (cust_id, name, phone, phone_alt, platform, handle, category, city, street, children_cnt, notes, valid_user_id, reg_date, reg_date))
        res = dict(cur.fetchone())
        res['customer_name'] = res.get('name')

        if platform or handle or phone:
            safe_platform, safe_handle, safe_phone = platform or 'واتساب (WhatsApp)', handle or phone or '', phone or ''
            cur.execute("SELECT mapping_id FROM customer_platform_mappings WHERE customer_id = %s LIMIT 1;", (cust_id,))
            ex_map = cur.fetchone()
            if ex_map:
                cur.execute("UPDATE customer_platform_mappings SET platform = COALESCE(NULLIF(%s, ''), platform), platform_user_id = COALESCE(NULLIF(%s, ''), platform_user_id), whatsapp_phone_reference = COALESCE(NULLIF(%s, ''), whatsapp_phone_reference) WHERE mapping_id = %s;", (safe_platform, safe_handle, safe_phone, ex_map['mapping_id']))
            else:
                cur.execute("INSERT INTO customer_platform_mappings (customer_id, platform, platform_user_id, whatsapp_phone_reference) VALUES (%s, %s, %s, %s);", (cust_id, safe_platform, safe_handle, safe_phone))

        meas_list = data.get('measurements') or []
        ch_list = data.get('children') or []
        saved_children, saved_meas = _save_meas_and_children(cur, cust_id, meas_list, children_list=ch_list, user_id=valid_user_id or resolved_user)
        cur.execute("UPDATE customers SET children_count = (SELECT COUNT(*) FROM children WHERE customer_id = customers.id AND status != 'Deleted') WHERE id = %s;", (cust_id,))
        total_sales, deposit, remaining, pay_method, order_no, del_fee, total_ord_amt, del_mode = _save_customer_financials(cur, cust_id, name, data, meas_list, is_existing=bool(existing_c))

        if not saved_children and existing_c:
            cur.execute("SELECT id, customer_id, child_name, gender, age, notes, status FROM children WHERE customer_id = %s AND status != 'Deleted' ORDER BY created_at ASC;", (cust_id,))
            saved_children = [dict(c) for c in cur.fetchall()]
        if not saved_meas and existing_c:
            cur.execute("SELECT * FROM measurements WHERE customer_id = %s ORDER BY created_at DESC;", (cust_id,))
            saved_meas = [dict(m) for m in cur.fetchall()]
            for m in saved_meas:
                for k in ('created_at', 'updated_at', 'date', 'measurement_date'):
                    if m.get(k): m[k] = str(m[k])

        log_audit_event(entity_type='customers', entity_id=cust_id, action='UPDATE' if existing_c else 'INSERT',
                        new_values={'id': cust_id, 'name': name, 'phone': phone, 'city': city},
                        user_id=valid_user_id or resolved_user, document_no=cust_id, details=f"حفظ بيانات عميل {name} ({cust_id})", cur=cur)
        flush_audit_events(cur)

        res.update({
            'id': cust_id, 'customer_id': cust_id, 'current_balance': float(remaining), 'total_sales': float(total_sales),
            'subtotal': float(total_sales), 'total_order_amount': float(total_ord_amt), 'total_paid': float(deposit),
            'deposit': float(deposit), 'delivery_fee': float(del_fee), 'delivery_payment_mode': del_mode, 'remaining': float(remaining),
            'latest_order_no': order_no, 'child_id': saved_children[0]['id'] if saved_children else None,
            'child_name': saved_children[0]['child_name'] if saved_children else '',
            'reg_date': reg_date or (str(res.get('created_at', ''))[:10] if res.get('created_at') else today_str()),
            'measurements': saved_meas if saved_meas else meas_list, 'children': saved_children,
            'ledger': {'total_sales': float(total_sales), 'subtotal': float(total_sales), 'total_paid': float(deposit), 'deposit': float(deposit), 'delivery': float(del_fee), 'delivery_fee': float(del_fee), 'delivery_payment_mode': del_mode, 'total_order_amount': float(total_ord_amt), 'remaining': float(remaining), 'pay_method': pay_method}
        })
        for k in ('created_at', 'updated_at'): (res.get(k) and res.update({k: str(res[k])}))
    return res
