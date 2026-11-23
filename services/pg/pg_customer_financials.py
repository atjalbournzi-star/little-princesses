import json
from decimal import Decimal, ROUND_HALF_UP
from .db_pool import clean_str, clean_num, generate_id, today_str
from .pg_receipt_sync import sync_advance_receipt
from .pg_order_stages import create_order_stages
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, resolve_active_user_id
from .account_resolver import resolve_receiving_account, resolve_customer_advance_account

def to_dec(val):
    if val is None: return Decimal('0.0000')
    try: return Decimal(str(val).strip().replace(',', '')).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
    except Exception: return Decimal('0.0000')

def save_customer_financials(cur, cust_id, name, data, meas_list, is_existing=False):
    ledger_data = data.get('ledger') or {}
    raw_sales = ledger_data.get('subtotal') if ledger_data.get('subtotal') is not None else (ledger_data.get('total_sales') if ledger_data.get('total_sales') is not None else data.get('subtotal', data.get('total_sales')))
    raw_deposit = ledger_data.get('deposit') if ledger_data.get('deposit') is not None else (data.get('deposit') or ledger_data.get('total_paid') or data.get('total_paid'))
    raw_del = ledger_data.get('delivery_fee') if ledger_data.get('delivery_fee') is not None else (ledger_data.get('delivery') if ledger_data.get('delivery') is not None else data.get('delivery_fee', data.get('delivery')))
    raw_rem = ledger_data.get('remaining') if ledger_data.get('remaining') is not None else data.get('remaining')

    total_sales, deposit, delivery_fee = to_dec(raw_sales), to_dec(raw_deposit), to_dec(raw_del)
    if total_sales <= Decimal('0.0000') and meas_list and not is_existing:
        c_sum = sum(to_dec(m.get('adjusted_price') or m.get('price')) for m in meas_list)
        if c_sum > Decimal('0.0000'): total_sales = c_sum

    del_mode = clean_str(ledger_data.get('delivery_payment_mode') or data.get('delivery_payment_mode') or 'DIRECT_TO_COURIER')
    total_order_amount = total_sales + (delivery_fee if del_mode == 'PREPAID_VIA_ATELIER' else Decimal('0.0000'))
    remaining = to_dec(raw_rem) if raw_rem is not None else max(Decimal('0.0000'), total_order_amount - deposit)
    pay_method = clean_str(ledger_data.get('pay_method') or data.get('pay_method') or data.get('payment_method') or 'نقد (كاش)')
    curr = clean_str(data.get('currency') or 'YER').replace('﷼', '').replace('$', '').strip() or 'YER'

    first_m = meas_list[0] if meas_list else {}
    first_model = clean_str(first_m.get('model_name') or first_m.get('selected_model') or '')
    first_chld_id, first_chld_name = clean_str(data.get('child_id') or first_m.get('child_id')) or None, clean_str(first_m.get('child_name') or '')
    if first_chld_id:
        cur.execute("SELECT id, child_name FROM children WHERE id = %s LIMIT 1;", (first_chld_id,))
        cr = cur.fetchone()
        if not cr: first_chld_id = None
        elif not first_chld_name: first_chld_name = cr.get('child_name') or ''
    if not first_chld_id and cust_id:
        cur.execute("SELECT id, child_name FROM children WHERE customer_id = %s ORDER BY created_at ASC LIMIT 1;", (cust_id,))
        cr = cur.fetchone()
        if cr: first_chld_id, first_chld_name = cr['id'], first_chld_name or cr.get('child_name') or ''

    # اعتماد حقل واحد ديناميكي للون (selected_color) من مدخلات الواجهة
    m_color = clean_str(first_m.get('selected_color') or first_m.get('color') or first_m.get('dress_color') or data.get('selected_color') or data.get('color') or '')
    m_img, prod_id = clean_str(first_m.get('model_image') or first_m.get('model_img') or first_m.get('image_url') or data.get('model_image') or ''), clean_str(first_m.get('model_id') or first_m.get('product_id') or data.get('product_id') or data.get('model_id')) or None

    p_bom_row = None
    if first_model or prod_id:
        cur.execute("SELECT * FROM products WHERE id = %s OR model_name = %s OR model_name ILIKE %s LIMIT 1;", (prod_id or first_model, first_model, f"%{first_model}%"))
        p_row = cur.fetchone()
        if p_row:
            p_bom_row = p_row
            prod_id = p_row['id']
            if not m_img or (m_img.startswith('data:image/') and len(m_img) > 500): m_img = p_row.get('image_url') or ''
        else:
            prod_id = None

    req_ord_id = clean_str(data.get('order_id') or data.get('id_order'))
    req_ord_no = clean_str(data.get('order_no'))
    ex_order = None
    if req_ord_id or req_ord_no:
        cur.execute("SELECT id, order_no, paid_amount, total_amount FROM orders WHERE id = %s OR order_no = %s LIMIT 1;", (req_ord_id or req_ord_no, req_ord_no or req_ord_id))
        ex_order = cur.fetchone()

    confirm_order = bool(data.get('confirm_order') or data.get('action') == 'confirm_order')

    if not confirm_order and not (ex_order and deposit > Decimal('0.0000')):
        cur.execute("""
            UPDATE customers SET
                model_id = COALESCE(NULLIF(%s, ''), model_id),
                selected_color = COALESCE(NULLIF(%s, ''), selected_color),
                model_image = COALESCE(NULLIF(%s, ''), model_image),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (prod_id, m_color, m_img, cust_id))
        return float(total_sales), float(deposit), float(remaining), pay_method, None, float(delivery_fee), float(total_order_amount), del_mode

    # تحديث الحقول المالية عند الاعتماد الفعلي للطلب أو سداد دفعة
    cur.execute("""
        UPDATE customers SET
            current_balance = %s, total_amount = %s, deposit_amount = %s,
            paid_amount = %s, remaining_amount = %s,
            model_id = COALESCE(NULLIF(%s, ''), model_id),
            selected_color = COALESCE(NULLIF(%s, ''), selected_color),
            model_image = COALESCE(NULLIF(%s, ''), model_image),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s;
    """, (remaining, total_order_amount, deposit, deposit, remaining, prod_id, m_color, m_img, cust_id))

    m_ev = clean_str(data.get('delivery_date') or data.get('event_date') or first_m.get('event_date') or first_m.get('delivery_date') or first_m.get('date') or '') or None
    if not m_ev and cust_id:
        cur.execute("SELECT date FROM measurements WHERE customer_id = %s AND date IS NOT NULL ORDER BY created_at DESC LIMIT 1;", (cust_id,))
        mr_d = cur.fetchone()
        if mr_d and mr_d.get('date'): m_ev = str(mr_d['date'])
    m_ms = clean_str(data.get('order_date') or first_m.get('meas_date') or first_m.get('measurement_date') or '') or None
    actual_order_id = ex_order['id'] if ex_order else (get_next_sequence_number(cur, 'ORD', fallback_prefix='ORD-') if confirm_order else None)
    order_no, order_status = (ex_order['order_no'] if ex_order else actual_order_id), ('Paid' if remaining <= 0 and total_sales > 0 else ('Partial' if deposit > 0 else 'Unpaid'))
    order_notes = clean_str(data.get('notes') or (f"طلب تفصيل للعميل {name}" + (f" ({first_model})" if first_model else "") + (f" | اللون: {m_color}" if m_color else "")))
    first_fb = json.dumps(first_m.get('fabrics_data') or first_m.get('fabrics_breakdown') or first_m.get('bom_items') or [], ensure_ascii=False)

    valid_uid = resolve_active_user_id(cur, clean_str(data.get('user_id') or data.get('created_by')))
    if ex_order and (deposit > Decimal('0.0000') or total_sales > Decimal('0.0000')):
        cur.execute("""
            UPDATE orders SET product_id = COALESCE(%s, product_id), model_id = COALESCE(%s, model_id), child_id = COALESCE(%s, child_id),
                selected_color = COALESCE(NULLIF(%s, ''), selected_color), color = COALESCE(NULLIF(%s, ''), color),
                model_image = COALESCE(NULLIF(%s, ''), model_image), image_url = COALESCE(NULLIF(%s, ''), image_url),
                delivery_date = COALESCE(%s::date, delivery_date), order_date = COALESCE(%s::date, order_date),
                subtotal = CASE WHEN %s > 0 THEN %s ELSE subtotal END, total_amount = CASE WHEN %s > 0 THEN %s ELSE total_amount END,
                paid_amount = CASE WHEN %s > 0 THEN %s ELSE paid_amount END, deposit_amount = CASE WHEN %s > 0 THEN %s ELSE deposit_amount END,
                payment_status = %s, payment_method = %s, currency = %s, delivery_fee = %s, delivery_payment_mode = %s,
                fabrics_data = COALESCE(NULLIF(%s::jsonb, '[]'::jsonb), fabrics_data), updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING remaining_amount, total_amount, paid_amount;
        """, (prod_id, prod_id, first_chld_id, m_color, m_color, m_img, m_img, m_ev, m_ms, total_sales, total_sales, total_order_amount, total_order_amount, deposit, deposit, deposit, deposit, order_status, pay_method, curr, delivery_fee, del_mode, first_fb, ex_order['id']))
        ord_ret = cur.fetchone()
        if ord_ret and ord_ret.get('remaining_amount') is not None: remaining = to_dec(ord_ret['remaining_amount'])
    elif (not ex_order) and confirm_order:
        cur.execute("""
            INSERT INTO orders (
                id, order_no, customer_id, child_id, product_id, model_id, selected_color, color, model_image, image_url,
                quantity, order_date, delivery_date, currency, exchange_rate, subtotal, discount, tax,
                total_amount, paid_amount, deposit_amount, base_amount, payment_status, production_status, payment_method, delivery_fee, delivery_payment_mode, fabrics_data, status, notes, created_by
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1.0, COALESCE(%s::date, CURRENT_DATE), %s::date, %s, 1.0, %s, 0.0, 0.0,
                %s, %s, %s, %s, %s, 'Cutting', %s, %s, %s, %s::jsonb, 'Active', %s, %s
            ) RETURNING remaining_amount, total_amount, paid_amount;
        """, (actual_order_id, order_no, cust_id, first_chld_id, prod_id, prod_id, m_color, m_color, m_img, m_img, m_ms, m_ev, curr, total_sales, total_order_amount, deposit, deposit, total_order_amount, order_status, pay_method, delivery_fee, del_mode, first_fb, order_notes, valid_uid))
        ord_ret = cur.fetchone()
        if ord_ret and ord_ret.get('remaining_amount') is not None: remaining = to_dec(ord_ret['remaining_amount'])

        log_audit_event(cur=cur, entity_type='orders', entity_id=actual_order_id, action='INSERT', new_values={'order_no': order_no, 'customer_id': cust_id, 'total_amount': total_order_amount, 'deposit': deposit}, document_no=order_no, details=f"إنشاء طلب تفصيل رقم {order_no} للعميل {name}")

        if meas_list:
            if not p_bom_row and (prod_id or first_model):
                cur.execute("SELECT * FROM products WHERE id = %s OR model_name = %s LIMIT 1;", (prod_id or first_model, first_model))
                p_bom_row = cur.fetchone()
            from .pg_dynamic_matching import match_measurements_to_tier, get_tier_pricing, get_tier_bom
            b_meta = (p_bom_row['bom'].get('meta') or {}) if (p_bom_row and isinstance(p_bom_row.get('bom'), dict)) else {}
            c_w, t_w, e_w, f_w = clean_num(b_meta.get('cutter_wage') or 0.0), clean_num(b_meta.get('tailor_wage') or 0.0), clean_num(b_meta.get('embroiderer_wage') or 0.0), clean_num(b_meta.get('finisher_wage') or 0.0)
            p_w = clean_num(b_meta.get('packaging_cost') or (p_bom_row.get('packaging_cost') if p_bom_row else 0.0))

            total_dyn_sales = 0.0
            for idx_m, m_item in enumerate(meas_list):
                m_mod, m_ch = clean_str(m_item.get('model_name') or m_item.get('selected_model') or first_model), clean_str(m_item.get('child_name') or first_chld_name)
                m_c, m_i = clean_str(m_item.get('selected_color') or m_item.get('color') or m_item.get('dress_color') or m_color), clean_str(m_item.get('model_image') or m_item.get('model_img') or m_img)
                if m_i.startswith('data:image/') and len(m_i) > 500: m_i = ''
                m_meas_id = clean_str(m_item.get('measurement_id') or m_item.get('id')) or None
                raw_fb_list = m_item.get('fabrics_data') or m_item.get('fabrics_breakdown') or m_item.get('bom_items') or []

                m_match = match_measurements_to_tier(p_bom_row, m_item) if p_bom_row else {'tier': '6-9Y'}
                m_tier = clean_str(m_item.get('size_code') or m_item.get('age_tier') or m_match['tier'])
                m_tier_price, m_tier_bom = (get_tier_pricing(p_bom_row, m_tier) if p_bom_row else 0.0), (get_tier_bom(p_bom_row, m_tier, 1.0) if p_bom_row else [])
                if not raw_fb_list or not isinstance(raw_fb_list, list) or len(raw_fb_list) == 0: raw_fb_list = m_tier_bom
                m_pr = clean_num(m_item.get('adjusted_price') or m_item.get('price')) or (m_tier_price if m_tier_price > 0 else float(total_sales))
                total_dyn_sales += m_pr

                m_notes = clean_str(m_item.get('notes') or m_item.get('sewing_notes') or '')
                if not m_meas_id and cust_id:
                    cur.execute("SELECT id, notes FROM measurements WHERE customer_id = %s ORDER BY created_at DESC LIMIT 1;", (cust_id,))
                    mr = cur.fetchone()
                    if mr:
                        m_meas_id = mr['id']
                        if not m_notes and mr.get('notes'): m_notes = clean_str(mr['notes'])
                elif m_meas_id and not m_notes:
                    cur.execute("SELECT notes FROM measurements WHERE id = %s;", (m_meas_id,))
                    mr = cur.fetchone()
                    if mr and mr.get('notes'): m_notes = clean_str(mr['notes'])
                if m_meas_id:
                    cur.execute("UPDATE measurements SET fabrics_data = %s::jsonb, total_amount = %s, price = %s WHERE id = %s;", (json.dumps(raw_fb_list, ensure_ascii=False), m_pr, m_pr, m_meas_id))

                m_fb = json.dumps(raw_fb_list, ensure_ascii=False)
                m_sp_dict = {k: m_item[k] for k in ['dress_length', 'total_height', 'chest_circ', 'waist_circ', 'shoulder_width', 'armpit_circ', 'neck_circ', 'unit'] if m_item.get(k)}
                if m_notes: m_sp_dict['notes'] = m_notes
                m_sp = json.dumps(m_sp_dict, ensure_ascii=False)
                po_num = get_next_sequence_number(cur, 'PROD-ORD', fallback_prefix='PROD-ORD-')
                po_base_note = clean_str(f"أمر تفصيل للعميل {name} (طلب {order_no})")
                po_notes = f"{po_base_note} | {m_notes}" if m_notes else po_base_note

                cur.execute("""
                    INSERT INTO production_orders (id, production_order_no, order_id, customer_id, customer_name, product_id, model_id, product_name, child_name, selected_color, color, model_image, product_image, stage, progress, status, total_amount, deposit_amount, remaining_amount, size_code, measurements_spec, fabrics_data, notes, start_date, due_date, cutter_wage, tailor_wage, embroiderer_wage, finisher_wage, packager_wage)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'القص والتحضير', 20, 'In Progress', %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, COALESCE(%s::date, CURRENT_DATE), %s::date, %s, %s, %s, %s, %s)
                    ON CONFLICT (production_order_no) DO UPDATE SET customer_id = EXCLUDED.customer_id, customer_name = EXCLUDED.customer_name, product_name = EXCLUDED.product_name, child_name = EXCLUDED.child_name, selected_color = EXCLUDED.selected_color, color = EXCLUDED.color, model_image = EXCLUDED.model_image, product_image = EXCLUDED.product_image, total_amount = EXCLUDED.total_amount, deposit_amount = EXCLUDED.deposit_amount, remaining_amount = EXCLUDED.remaining_amount, size_code = EXCLUDED.size_code, measurements_spec = EXCLUDED.measurements_spec, fabrics_data = EXCLUDED.fabrics_data, notes = EXCLUDED.notes, due_date = EXCLUDED.due_date, cutter_wage = EXCLUDED.cutter_wage, tailor_wage = EXCLUDED.tailor_wage, embroiderer_wage = EXCLUDED.embroiderer_wage, finisher_wage = EXCLUDED.finisher_wage, packager_wage = EXCLUDED.packager_wage;
                """, (po_num, po_num, actual_order_id, cust_id, name, prod_id, prod_id, m_mod, m_ch or first_chld_name, m_c, m_c, m_i, m_i, m_pr, deposit, max(0.0, m_pr - float(deposit)), m_tier, m_sp, m_fb, po_notes, m_ms, m_ev, c_w, t_w, e_w, f_w, p_w))

                log_audit_event(cur=cur, entity_type='production_orders', entity_id=po_num, action='INSERT', new_values={'production_order_no': po_num, 'order_id': actual_order_id, 'size_code': m_tier, 'total_amount': m_pr}, document_no=po_num, details=f"إنشاء أمر تصنيع {po_num} للطلب {order_no}")

                it_id = clean_str(m_item.get('order_item_id')) or generate_id("ITEM")
                cur.execute("""
                    INSERT INTO order_items (id, order_id, product_id, measurement_id, model_id, product_name, selected_color, color, model_image, image_url, quantity, unit_price, total_price, total_amount, paid_amount, remaining_amount, fabrics_data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1.0, %s, %s, %s, %s, %s, %s::jsonb)
                    ON CONFLICT (id) DO UPDATE SET product_name = EXCLUDED.product_name, measurement_id = COALESCE(EXCLUDED.measurement_id, order_items.measurement_id), selected_color = EXCLUDED.selected_color, color = EXCLUDED.color, unit_price = EXCLUDED.unit_price, total_price = EXCLUDED.total_price, total_amount = EXCLUDED.total_amount, paid_amount = EXCLUDED.paid_amount, remaining_amount = EXCLUDED.remaining_amount, fabrics_data = EXCLUDED.fabrics_data;
                """, (it_id, actual_order_id, prod_id, m_meas_id, prod_id, m_mod, m_c, m_c, m_i, m_i, m_pr, m_pr, m_pr, deposit, max(0.0, m_pr - float(deposit)), m_fb))
                create_order_stages(cur, actual_order_id, it_id, prod_id, m_mod, po_num)
            if total_sales <= Decimal('0.0000') and total_dyn_sales > Decimal('0.0000'):
                total_sales = to_dec(total_dyn_sales)
                total_order_amount = total_sales + (delivery_fee if (del_mode == 'PREPAID_VIA_ATELIER') else Decimal('0.0000'))
                cur.execute("UPDATE orders SET subtotal = %s, total_amount = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING remaining_amount;", (total_sales, total_order_amount, actual_order_id))
                ord_ret = cur.fetchone()
                if ord_ret and ord_ret.get('remaining_amount') is not None: remaining = to_dec(ord_ret['remaining_amount'])
                cur.execute("UPDATE customers SET current_balance = %s, total_amount = %s, remaining_amount = %s WHERE id = %s;", (remaining, total_order_amount, remaining, cust_id))

    cash_acc = clean_str(data.get('account_id') or ledger_data.get('account_id')) or resolve_receiving_account(cur, pay_method, curr)

    if deposit > 0 and (actual_order_id or order_no or is_existing):
        sync_advance_receipt(cur, {
            'order_id': actual_order_id, 'order_no': order_no, 'customer_id': cust_id,
            'party_name': name, 'amount': float(deposit), 'currency': curr, 'exchange_rate': 1.0,
            'base_amount': float(deposit), 'payment_method': pay_method, 'account_id': cash_acc,
            'notes': f"سند قبض مبيعات - العميل {name}" + (f" ({first_model})" if first_model else ""),
            'skip_sync_order': bool(confirm_order)
        })
    return float(total_sales), float(deposit), float(remaining), pay_method, order_no, float(delivery_fee), float(total_order_amount), del_mode
