import json
from .db_pool import clean_str, clean_num, generate_id, today_str, generate_sequential_order_no
from .pg_receipt_sync import sync_advance_receipt
from .pg_order_stages import create_order_stages

def save_customer_financials(cur, cust_id, name, data, meas_list, is_existing=False):
    ledger_data = data.get('ledger') or {}
    raw_sales = ledger_data.get('total_sales') if ledger_data.get('total_sales') is not None else data.get('total_sales')
    raw_deposit = ledger_data.get('deposit') if ledger_data.get('deposit') is not None else (data.get('deposit') or ledger_data.get('total_paid') or data.get('total_paid'))
    raw_del = ledger_data.get('delivery') if ledger_data.get('delivery') is not None else (ledger_data.get('delivery_fee') or data.get('delivery_fee') or data.get('delivery'))
    raw_rem = ledger_data.get('remaining') if ledger_data.get('remaining') is not None else data.get('remaining')

    total_sales, deposit, delivery_fee = clean_num(raw_sales or 0.0), clean_num(raw_deposit or 0.0), clean_num(raw_del or 0.0)
    if total_sales <= 0 and meas_list and not is_existing:
        c_sum = sum(clean_num(m.get('adjusted_price') or m.get('price') or 0.0) for m in meas_list)
        if c_sum > 0: total_sales = c_sum

    del_mode = clean_str(ledger_data.get('delivery_payment_mode') or data.get('delivery_payment_mode') or 'DIRECT_TO_COURIER')
    is_prepaid = (del_mode == 'PREPAID_VIA_ATELIER')
    total_order_amount = total_sales + (delivery_fee if is_prepaid else 0.0)
    remaining = clean_num(raw_rem if raw_rem is not None else max(0.0, total_order_amount - deposit))
    pay_method = clean_str(ledger_data.get('pay_method') or data.get('pay_method') or data.get('payment_method') or 'نقد (كاش)')
    curr = clean_str(data.get('currency') or 'YER').replace('﷼', '').replace('$', '').strip() or 'YER'

    first_m = meas_list[0] if meas_list else {}
    first_model = clean_str(first_m.get('model_name') or first_m.get('selected_model') or '')
    first_chld_id = clean_str(data.get('child_id') or first_m.get('child_id')) or None
    if first_chld_id:
        cur.execute("SELECT id FROM children WHERE id = %s LIMIT 1;", (first_chld_id,))
        if not cur.fetchone(): first_chld_id = None
    first_chld_name = clean_str(first_m.get('child_name') or '')

    # اعتماد حقل واحد ديناميكي للون (selected_color) من مدخلات الواجهة
    m_color = clean_str(first_m.get('selected_color') or first_m.get('color') or first_m.get('dress_color') or data.get('selected_color') or data.get('color') or '')
    m_img = clean_str(first_m.get('model_image') or first_m.get('model_img') or first_m.get('image_url') or data.get('model_image') or '')
    prod_id = clean_str(first_m.get('model_id') or first_m.get('product_id') or data.get('product_id') or data.get('model_id'))

    if first_model or prod_id:
        cur.execute("SELECT id, image_url FROM products WHERE id = %s OR model_name = %s OR model_name ILIKE %s LIMIT 1;", (prod_id or first_model, first_model, f"%{first_model}%"))
        p_row = cur.fetchone()
        if p_row:
            if not prod_id: prod_id = p_row['id']
            if not m_img or (m_img.startswith('data:image/') and len(m_img) > 500):
                m_img = p_row.get('image_url') or ''

    # قصر البيانات المالية وتفاصيل الفستان على orders، وتحديث الرصيد الأساسي فقط في customers
    cur.execute("""
        UPDATE customers SET current_balance = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;
    """, (remaining, cust_id))

    req_ord_id = clean_str(data.get('order_id') or data.get('id_order'))
    req_ord_no = clean_str(data.get('order_no'))
    ex_order = None
    if req_ord_id or req_ord_no:
        cur.execute("SELECT id, order_no FROM orders WHERE id = %s OR order_no = %s LIMIT 1;", (req_ord_id or req_ord_no, req_ord_no or req_ord_id))
        ex_order = cur.fetchone()
    elif is_existing:
        cur.execute("SELECT id, order_no, paid_amount, total_amount FROM orders WHERE customer_id = %s ORDER BY created_at DESC LIMIT 1;", (cust_id,))
        ex_order = cur.fetchone()

    m_ev = clean_str(first_m.get('event_date') or first_m.get('date') or '') or None
    m_ms = clean_str(first_m.get('meas_date') or first_m.get('measurement_date') or '') or None
    actual_order_id = ex_order['id'] if ex_order else (generate_id("ORD") if (not is_existing or data.get('create_new_order')) else None)
    order_no = ex_order['order_no'] if ex_order else (generate_sequential_order_no(cur, m_ms or today_str()) if actual_order_id else None)
    order_status = 'Paid' if remaining <= 0 and total_sales > 0 else ('Partial' if deposit > 0 else 'Unpaid')
    order_notes = clean_str(data.get('notes') or (f"طلب تفصيل للعميلة {name}" + (f" ({first_model})" if first_model else "") + (f" | اللون: {m_color}" if m_color else "")))
    first_fb = json.dumps(first_m.get('fabrics_data') or first_m.get('fabrics_breakdown') or first_m.get('bom_items') or [], ensure_ascii=False)

    if ex_order and (deposit > 0 or total_sales > 0):
        cur.execute("""
            UPDATE orders SET product_id = COALESCE(%s, product_id), model_id = COALESCE(%s, model_id), child_id = COALESCE(%s, child_id),
                selected_color = COALESCE(NULLIF(%s, ''), selected_color), color = COALESCE(NULLIF(%s, ''), color),
                model_image = COALESCE(NULLIF(%s, ''), model_image), image_url = COALESCE(NULLIF(%s, ''), image_url),
                delivery_date = COALESCE(%s::date, delivery_date), order_date = COALESCE(%s::date, order_date),
                subtotal = CASE WHEN %s > 0 THEN %s ELSE subtotal END, total_amount = CASE WHEN %s > 0 THEN %s ELSE total_amount END,
                paid_amount = CASE WHEN %s > 0 THEN paid_amount + %s ELSE paid_amount END, deposit_amount = CASE WHEN %s > 0 THEN paid_amount + %s ELSE deposit_amount END,
                payment_status = %s, payment_method = %s, currency = %s, delivery_fee = %s, delivery_payment_mode = %s,
                fabrics_data = COALESCE(NULLIF(%s::jsonb, '[]'::jsonb), fabrics_data), updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (prod_id, prod_id, first_chld_id, m_color, m_color, m_img, m_img, m_ev, m_ms, total_sales, total_sales, total_order_amount, total_order_amount, deposit, deposit, deposit, deposit, order_status, pay_method, curr, delivery_fee, del_mode, first_fb, ex_order['id']))
    elif not is_existing and (total_sales > 0 or deposit > 0 or meas_list):
        cur.execute("""
            INSERT INTO orders (
                id, order_no, customer_id, child_id, product_id, model_id, selected_color, color, model_image, image_url,
                quantity, order_date, delivery_date, currency, exchange_rate, subtotal, discount, tax,
                total_amount, paid_amount, deposit_amount, base_amount, payment_status, production_status, payment_method, delivery_fee, delivery_payment_mode, fabrics_data, status, notes
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                1.0, COALESCE(%s::date, CURRENT_DATE), %s::date, %s, 1.0, %s, 0.0, 0.0,
                %s, %s, %s, %s, %s, 'Cutting', %s, %s, %s, %s::jsonb, 'Active', %s
            );
        """, (actual_order_id, order_no, cust_id, first_chld_id, prod_id, prod_id, m_color, m_color, m_img, m_img, m_ms, m_ev, curr, total_sales, total_order_amount, deposit, deposit, total_order_amount, order_status, pay_method, delivery_fee, del_mode, first_fb, order_notes))

        if meas_list:
            for idx_m, m_item in enumerate(meas_list):
                m_mod = clean_str(m_item.get('model_name') or m_item.get('selected_model') or first_model)
                m_ch = clean_str(m_item.get('child_name') or first_chld_name)
                m_c = clean_str(m_item.get('selected_color') or m_item.get('color') or m_item.get('dress_color') or m_color)
                m_i = clean_str(m_item.get('model_image') or m_item.get('model_img') or m_img)
                if m_i.startswith('data:image/') and len(m_i) > 500: m_i = ''
                m_meas_id = clean_str(m_item.get('measurement_id') or m_item.get('id')) or None
                raw_fb_list = m_item.get('fabrics_data') or m_item.get('fabrics_breakdown') or m_item.get('bom_items') or []
                if not m_meas_id and cust_id:
                    cur.execute("SELECT id, fabrics_data FROM measurements WHERE customer_id = %s ORDER BY created_at DESC LIMIT 1;", (cust_id,))
                    mr = cur.fetchone()
                    if mr:
                        m_meas_id = mr['id']
                        if not raw_fb_list: raw_fb_list = mr.get('fabrics_data') or []
                elif m_meas_id and not raw_fb_list:
                    cur.execute("SELECT fabrics_data FROM measurements WHERE id = %s LIMIT 1;", (m_meas_id,))
                    mr = cur.fetchone()
                    if mr and mr.get('fabrics_data'): raw_fb_list = mr['fabrics_data']

                m_fb = json.dumps(raw_fb_list, ensure_ascii=False)
                m_sp = json.dumps({k: m_item[k] for k in ['dress_length', 'total_height', 'chest_circ', 'waist_circ', 'shoulder_width', 'armpit_circ', 'neck_circ', 'unit'] if m_item.get(k)}, ensure_ascii=False)
                m_pr = clean_num(m_item.get('adjusted_price') or m_item.get('price') or total_sales)
                po_num = f"PO-{order_no}" if idx_m == 0 else f"PO-{order_no}-{idx_m+1}"

                cur.execute("""
                    INSERT INTO production_orders (
                        id, production_order_no, order_id, customer_id, customer_name, product_id, model_id, product_name, child_name,
                        selected_color, color, model_image, product_image, stage, progress, status,
                        total_amount, deposit_amount, remaining_amount, measurements_spec, fabrics_data, notes
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'القص والتحضير ✂️', 20, 'In Progress', %s, %s, %s, %s::jsonb, %s::jsonb, %s)
                    ON CONFLICT (production_order_no) DO UPDATE SET customer_id = EXCLUDED.customer_id, customer_name = EXCLUDED.customer_name,
                        product_name = EXCLUDED.product_name, child_name = EXCLUDED.child_name, selected_color = EXCLUDED.selected_color, color = EXCLUDED.color,
                        model_image = EXCLUDED.model_image, product_image = EXCLUDED.product_image, total_amount = EXCLUDED.total_amount,
                        deposit_amount = EXCLUDED.deposit_amount, remaining_amount = EXCLUDED.remaining_amount, measurements_spec = EXCLUDED.measurements_spec,
                        fabrics_data = EXCLUDED.fabrics_data, notes = EXCLUDED.notes;
                """, (generate_id("PRD"), po_num, actual_order_id, cust_id, name, prod_id, prod_id, m_mod, m_ch, m_c, m_c, m_i, m_i, m_pr, deposit, max(0.0, m_pr - deposit), m_sp, m_fb, clean_str(f"أمر تفصيل للعميلة {name} (طلب {order_no})")))
                it_id = clean_str(m_item.get('order_item_id')) or generate_id("ITEM")
                cur.execute("""
                    INSERT INTO order_items (id, order_id, product_id, measurement_id, model_id, product_name, selected_color, color, model_image, image_url, quantity, unit_price, total_price, total_amount, paid_amount, remaining_amount, fabrics_data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1.0, %s, %s, %s, %s, %s, %s::jsonb)
                    ON CONFLICT (id) DO UPDATE SET product_name = EXCLUDED.product_name, measurement_id = COALESCE(EXCLUDED.measurement_id, order_items.measurement_id),
                        selected_color = EXCLUDED.selected_color, color = EXCLUDED.color, total_price = EXCLUDED.total_price, total_amount = EXCLUDED.total_amount,
                        paid_amount = EXCLUDED.paid_amount, remaining_amount = EXCLUDED.remaining_amount, fabrics_data = EXCLUDED.fabrics_data;
                """, (it_id, actual_order_id, prod_id, m_meas_id, prod_id, m_mod, m_c, m_c, m_i, m_i, m_pr, m_pr, m_pr, deposit, max(0.0, m_pr - deposit), m_fb))
                create_order_stages(cur, actual_order_id, it_id, prod_id, m_mod, po_num)

    cash_acc = 'ACC-101-2' if curr == 'SAR' else ('ACC-101-3' if curr == 'USD' else 'ACC-101-1')

    if deposit > 0 and (actual_order_id or order_no or is_existing):
        sync_advance_receipt(cur, {
            'order_id': actual_order_id or f"ORD-{cust_id}", 'order_no': order_no or f"ORD-{cust_id}",
            'customer_id': cust_id, 'party_name': name, 'amount': deposit, 'currency': curr,
            'exchange_rate': 1.0, 'base_amount': deposit, 'payment_method': pay_method, 'account_id': cash_acc,
            'notes': f"سند قبض مبيعات - العميلة {name} ({first_model})"
        })

    return total_sales, deposit, remaining, pay_method, order_no, delivery_fee, total_order_amount, del_mode
