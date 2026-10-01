# services/pg/pg_customer_save.py
# Customer creation, profile updating, and integrated financial/production settlement

import time
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, logger
from .pg_receipt_sync import sync_advance_receipt


def _save_meas_and_children(cur, cust_id, meas_list):
    for m in meas_list:
        chld_name = clean_str(m.get('child_name') or m.get('name') or 'طفلة')
        chld_id = clean_str(m.get('child_id')) or generate_id("CHLD")
        m['child_id'] = chld_id
        cur.execute("""
            INSERT INTO children (id, customer_id, child_name, notes)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING;
        """, (chld_id, cust_id, chld_name, clean_str(m.get('notes'))))

        m_ev = clean_str(m.get('event_date') or m.get('date') or '') or None
        m_ms = clean_str(m.get('meas_date') or m.get('measurement_date') or '') or None
        meas_id = clean_str(m.get('id')) or generate_id("MEAS")

        cur.execute("""
            INSERT INTO measurements (
                id, customer_id, child_id, child_name, unit, total_len, dress_len,
                chest_len, skirt_len, sleeve_len, chest_circ, waist_circ, shoulder_w,
                armpit_circ, neck_circ, model_name, comfort_profile, notes, date, measurement_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s::date, CURRENT_DATE), COALESCE(%s::date, CURRENT_DATE))
            ON CONFLICT (id) DO UPDATE SET
                child_name = EXCLUDED.child_name, total_len = EXCLUDED.total_len, dress_len = EXCLUDED.dress_len,
                notes = EXCLUDED.notes, date = COALESCE(EXCLUDED.date, measurements.date),
                measurement_date = COALESCE(EXCLUDED.measurement_date, measurements.measurement_date), updated_at = CURRENT_TIMESTAMP;
        """, (
            meas_id, cust_id, chld_id, chld_name, clean_str(m.get('unit') or 'cm'),
            clean_num(m.get('total_height') or m.get('total_length') or m.get('total_len')),
            clean_num(m.get('dress_length') or m.get('dress_len')), clean_num(m.get('chest_length') or m.get('chest_len')),
            clean_num(m.get('skirt_length') or m.get('skirt_len')), clean_num(m.get('sleeve_length') or m.get('sleeve_len')),
            clean_num(m.get('chest_circ')), clean_num(m.get('waist_circ')), clean_num(m.get('shoulder_width') or m.get('shoulder_w')),
            clean_num(m.get('armpit_circ')), clean_num(m.get('neck_circ')), clean_str(m.get('model_name') or m.get('selected_model')),
            clean_str(m.get('comfort_profile')), clean_str(m.get('sewing_notes') or m.get('notes')), m_ev, m_ms
        ))


def _save_customer_financials(cur, cust_id, name, data, meas_list):
    ledger_data = data.get('ledger') or {}
    raw_sales = ledger_data.get('total_sales') if ledger_data.get('total_sales') is not None else data.get('total_sales')
    raw_deposit = ledger_data.get('deposit') if ledger_data.get('deposit') is not None else (data.get('deposit') or ledger_data.get('total_paid') or data.get('total_paid'))
    raw_del = ledger_data.get('delivery') if ledger_data.get('delivery') is not None else (ledger_data.get('delivery_fee') or data.get('delivery_fee') or data.get('delivery'))
    raw_rem = ledger_data.get('remaining') if ledger_data.get('remaining') is not None else data.get('remaining')

    total_sales = clean_num(raw_sales or 0.0)
    deposit = clean_num(raw_deposit or 0.0)
    delivery_fee = clean_num(raw_del or 0.0)

    if total_sales <= 0 and meas_list:
        c_sum = sum(clean_num(m.get('adjusted_price') or m.get('price') or 0.0) for m in meas_list)
        if c_sum > 0: total_sales = c_sum

    total_order_amount = total_sales + delivery_fee
    remaining = clean_num(raw_rem if raw_rem is not None else max(0.0, total_order_amount - deposit))
    pay_method = clean_str(ledger_data.get('pay_method') or data.get('pay_method') or data.get('payment_method') or 'نقد (كاش)')
    curr = clean_str(data.get('currency') or 'YER').replace('﷼', '').replace('$', '').strip() or 'YER'
    cur.execute("UPDATE customers SET current_balance = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (remaining, cust_id))

    first_m = meas_list[0] if meas_list else {}
    first_model = clean_str(first_m.get('model_name') or first_m.get('selected_model') or 'تفصيل فستان فاخر')
    first_chld_id = clean_str(first_m.get('child_id')) or None
    if first_chld_id:
        cur.execute("SELECT id FROM children WHERE id = %s LIMIT 1;", (first_chld_id,))
        if not cur.fetchone(): first_chld_id = None
    first_chld_name = clean_str(first_m.get('child_name')) or 'الأميرة'

    prod_id = None
    if first_model:
        cur.execute("SELECT id FROM products WHERE model_name = %s OR id = %s OR model_name ILIKE %s LIMIT 1;", (first_model, first_model, f"%{first_model}%"))
        p_row = cur.fetchone()
        if p_row: prod_id = p_row['id']
    if not prod_id:
        cur.execute("SELECT id FROM products ORDER BY created_at ASC LIMIT 1;")
        fallback_p = cur.fetchone()
        prod_id = fallback_p['id'] if fallback_p else 'PROD-CUSTOM-001'

    order_no = f"ORD-{cust_id}"
    cur.execute("SELECT id FROM orders WHERE customer_id = %s OR order_no = %s LIMIT 1;", (cust_id, order_no))
    ex_order = cur.fetchone()
    order_status = 'Paid' if remaining <= 0 and total_sales > 0 else ('Partial' if deposit > 0 else 'Unpaid')
    order_notes = clean_str(data.get('notes') or f"طلب تفصيل للطفلة {first_chld_name} ({first_model})")
    actual_order_id = ex_order['id'] if ex_order else generate_id("ORD")

    m_ev = clean_str(first_m.get('event_date') or first_m.get('date') or '') or None
    m_ms = clean_str(first_m.get('meas_date') or first_m.get('measurement_date') or '') or None

    if ex_order:
        cur.execute("""
            UPDATE orders SET product_id = COALESCE(%s, product_id), child_id = COALESCE(%s, child_id),
                delivery_date = COALESCE(%s::date, delivery_date), order_date = COALESCE(%s::date, order_date),
                subtotal = %s, total_amount = %s, paid_amount = %s, base_amount = %s, payment_status = %s,
                payment_method = %s, currency = %s, notes = COALESCE(NULLIF(%s, ''), notes), updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (prod_id, first_chld_id, m_ev, m_ms, total_sales, total_order_amount, deposit, total_order_amount, order_status, pay_method, curr, order_notes, actual_order_id))
    elif total_sales > 0 or deposit > 0 or meas_list:
        cur.execute("""
            INSERT INTO orders (
                id, order_no, customer_id, child_id, product_id, quantity, order_date, delivery_date,
                currency, exchange_rate, subtotal, discount, tax, total_amount, paid_amount, base_amount,
                payment_status, production_status, payment_method, status, notes
            ) VALUES (
                %s, %s, %s, %s, %s, 1.0, COALESCE(%s::date, CURRENT_DATE), %s::date, %s, 1.0, %s, 0.0, 0.0,
                %s, %s, %s, %s, 'Cutting', %s, 'Active', %s
            );
        """, (actual_order_id, order_no, cust_id, first_chld_id, prod_id, m_ms, m_ev, curr, total_sales, total_order_amount, deposit, total_order_amount, order_status, pay_method, order_notes))

    cash_acc = 'ACC-101-2' if curr == 'SAR' else ('ACC-101-3' if curr == 'USD' else 'ACC-101-1')

    if total_sales > 0:
        inv_jv_no = f"AUTO-INV-{cust_id}"
        cur.execute("""
            INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
            VALUES (%s, %s, CURRENT_DATE, %s, 'ACC-104', 'ACC-401', %s, %s, %s, 'Invoice', %s, %s, 1.0, 'Posted', %s)
            ON CONFLICT (entry_no) DO UPDATE SET amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount, currency = EXCLUDED.currency, description = EXCLUDED.description, notes = EXCLUDED.notes;
        """, (f"JV-INV-{cust_id}", inv_jv_no, f"فاتورة مبيعات وتفصيل - العميلة {name} ({first_model})", total_sales, total_sales, total_sales, cust_id, curr, f"إثبات مبيعات تفصيل للعميلة {name}"))

    if deposit > 0:
        sync_advance_receipt(cur, {
            'order_id': actual_order_id,
            'order_no': order_no or f"ORD-{cust_id}",
            'customer_id': cust_id,
            'party_name': name,
            'amount': deposit,
            'currency': curr,
            'exchange_rate': 1.0,
            'base_amount': deposit,
            'payment_method': pay_method,
            'account_id': cash_acc,
            'notes': f"سند قبض عربون مبيعات - العميلة {name} ({first_model})"
        })

    if meas_list:
        for m_item in meas_list:
            m_mod = clean_str(m_item.get('model_name') or m_item.get('selected_model'))
            m_ch = clean_str(m_item.get('child_name') or first_chld_name)
            cur.execute("""
                INSERT INTO production_orders (id, production_order_no, order_id, product_id, product_name, child_name, stage, progress, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, 'القص والتحضير ✂️', 20, 'In Progress', %s)
                ON CONFLICT (production_order_no) DO UPDATE SET product_name = EXCLUDED.product_name, child_name = EXCLUDED.child_name, notes = EXCLUDED.notes;
            """, (generate_id("PRD"), f"PRD-{cust_id}", actual_order_id, prod_id, m_mod or 'فستان مخصص', m_ch, f"أمر تفصيل للعميلة {name}"))

    return total_sales, deposit, remaining, pay_method, order_no, delivery_fee, total_order_amount


def add_customer(payload):
    data = payload.get('data') or payload
    cust_id = clean_str(data.get('id') or data.get('customer_id')) or generate_id("CUST")
    name = clean_str(data.get('name') or data.get('customer_name') or 'عميل جديد')
    phone = clean_str(data.get('phone') or data.get('phone_number')) or f"967-{int(time.time() % 100000000)}"
    phone_alt = clean_str(data.get('phone_alt') or data.get('alternative_phone'))
    platform = clean_str(data.get('platform') or 'Walk-in')
    handle = clean_str(data.get('handle') or '')
    category = clean_str(data.get('category') or 'VIP')
    city = clean_str(data.get('city') or 'صنعاء')
    street = clean_str(data.get('street') or '')
    children_cnt = int(clean_num(data.get('children_count') or 0))
    notes = clean_str(data.get('notes') or '')

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
        if existing_c:
            cust_id = existing_c['id']

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
        total_sales, deposit, remaining, pay_method, order_no, del_fee, total_ord_amt = _save_customer_financials(cur, cust_id, name, data, meas_list)

        res['current_balance'] = remaining
        res['total_sales'] = total_sales
        res['total_order_amount'] = total_ord_amt
        res['total_paid'] = deposit
        res['deposit'] = deposit
        res['delivery_fee'] = del_fee
        res['remaining'] = remaining
        res['latest_order_no'] = order_no
        res['ledger'] = {'total_sales': total_sales, 'total_paid': deposit, 'deposit': deposit, 'delivery': del_fee, 'total_order_amount': total_ord_amt, 'remaining': remaining, 'pay_method': pay_method}
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])

    return res
