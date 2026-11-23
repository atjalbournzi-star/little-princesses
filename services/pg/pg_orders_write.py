# services/pg/pg_orders_write.py
# Order creation, items attachment, inventory deduction, and atomic sequence numbering

import json
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str
from .pg_receipt_sync import sync_advance_receipt
from .pg_order_stages import create_order_stages
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, get_active_user_context
from .account_resolver import resolve_receiving_account


def add_order(payload):
    data = payload.get('data') or payload
    raw_uid = clean_str(data.get('created_by') or data.get('user_id') or '')
    resolved_user = raw_uid or get_active_user_context('admin')

    order_id = clean_str(data.get('id') or data.get('order_id'))
    order_no = clean_str(data.get('order_no'))
    cust_id = clean_str(data.get('customer_id'))
    c_name = clean_str(data.get('customer_name'))

    with get_db_cursor(commit=True) as cur:
        if not cust_id or cust_id == 'CUST-GENERAL':
            if c_name:
                cur.execute("SELECT id FROM customers WHERE name = %s LIMIT 1;", (c_name,))
                c_row = cur.fetchone()
                cust_id = c_row['id'] if c_row else None
            if not cust_id or cust_id == 'CUST-GENERAL':
                cur.execute("INSERT INTO customers (id, name, phone, category, status, notes) VALUES ('CUST-GENERAL', 'عميل عامة (POS)', '967000000000', 'عام', 'Active', 'عميل افتراضي للمبيعات المباشرة') ON CONFLICT (id) DO NOTHING;")
                cust_id = 'CUST-GENERAL'

        order_date = clean_str(data.get('order_date') or data.get('date')) or today_str()
        del_date = clean_str(data.get('delivery_date')) or None
        curr = clean_str(data.get('currency') or 'YER')
        rate = clean_num(data.get('exchange_rate') or 1.0)
        tot_amt = clean_num(data.get('total_amount') or data.get('total') or 0.0)
        paid_amt = clean_num(data.get('paid_amount') or data.get('paid') or 0.0)
        base_amt = clean_num(data.get('base_amount') or (tot_amt * rate))
        subtotal, discount, tax = clean_num(data.get('subtotal') or tot_amt), clean_num(data.get('discount') or 0.0), clean_num(data.get('tax') or 0.0)
        pay_status = 'Paid' if paid_amt >= tot_amt and tot_amt > 0 else ('Partial' if paid_amt > 0 else 'Unpaid')
        prod_status = clean_str(data.get('production_status') or data.get('status') or 'Pending')
        pay_method = clean_str(data.get('payment_method') or 'نقد (كاش)')
        delivery_fee = clean_num(data.get('delivery_fee') or data.get('delivery') or 0.0)
        del_mode = clean_str(data.get('delivery_payment_mode') or 'DIRECT_TO_COURIER')
        notes, color_val = clean_str(data.get('notes') or ''), clean_str(data.get('dress_color') or data.get('selected_color') or data.get('color') or '')
        raw_img = clean_str(data.get('model_image') or data.get('image_url') or '')
        is_b64 = raw_img.startswith('data:image') or len(raw_img) > 500
        model_img = raw_img if raw_img else None
        img_url = None if is_b64 else (raw_img if raw_img else None)

        ch_id, ch_name = clean_str(data.get('child_id')) or None, clean_str(data.get('child_name'))
        prod_id, p_name = clean_str(data.get('product_id') or data.get('model_id')) or None, clean_str(data.get('product_name') or data.get('model_name') or data.get('name'))
        raw_ord_fb = data.get('fabrics_data') or data.get('fabrics_breakdown') or []
        ord_fb_json = json.dumps(raw_ord_fb, ensure_ascii=False) if raw_ord_fb else '[]'

        existing_o = None
        if order_id or (order_no and not order_no.startswith('POS-') and not order_no.startswith('ORD-NEW')):
            cur.execute("SELECT id, order_no FROM orders WHERE id = %s OR order_no = %s LIMIT 1 FOR UPDATE;", (order_id or '', order_no or ''))
            existing_o = cur.fetchone()

        if existing_o:
            order_id = existing_o['id']
            order_no = existing_o.get('order_no') or order_no
        else:
            order_no = get_next_sequence_number(cur, 'ORD', fallback_prefix='ORD-')
            order_id = order_no

        if not ch_id and cust_id and cust_id != 'CUST-GENERAL':
            if ch_name:
                cur.execute("SELECT id, child_name FROM children WHERE customer_id = %s AND child_name = %s LIMIT 1;", (cust_id, ch_name))
                c_ch = cur.fetchone()
                if c_ch: ch_id = c_ch['id']
            if not ch_id:
                cur.execute("SELECT id, child_name FROM children WHERE customer_id = %s ORDER BY created_at ASC LIMIT 1;", (cust_id,))
                c_ch = cur.fetchone()
                if c_ch:
                    ch_id = c_ch['id']
                    if not ch_name: ch_name = c_ch['child_name']

        query = """
            INSERT INTO orders (
                id, order_no, customer_id, child_id, product_id, model_id,
                selected_color, color, dress_color, model_image, image_url, order_date, delivery_date,
                currency, exchange_rate, subtotal, discount, tax, total_amount,
                paid_amount, base_amount, payment_status, production_status,
                payment_method, delivery_fee, delivery_payment_mode, fabrics_data, status, notes, created_by, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, 'Active', %s, %s, CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                order_no = COALESCE(orders.order_no, EXCLUDED.order_no), child_id = COALESCE(EXCLUDED.child_id, orders.child_id),
                dress_color = COALESCE(EXCLUDED.dress_color, orders.dress_color), selected_color = COALESCE(EXCLUDED.selected_color, orders.selected_color), color = COALESCE(EXCLUDED.color, orders.color),
                total_amount = EXCLUDED.total_amount, paid_amount = EXCLUDED.paid_amount, payment_status = EXCLUDED.payment_status,
                production_status = EXCLUDED.production_status, delivery_fee = EXCLUDED.delivery_fee, fabrics_data = COALESCE(NULLIF(EXCLUDED.fabrics_data, '[]'::jsonb), orders.fabrics_data),
                notes = EXCLUDED.notes, created_by = COALESCE(orders.created_by, EXCLUDED.created_by), updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """
        cur.execute(query, (order_id, order_no, cust_id, ch_id, prod_id, prod_id, color_val, color_val, color_val, model_img, img_url, order_date, del_date, curr, rate, subtotal, discount, tax, tot_amt, paid_amt, base_amt, pay_status, prod_status, pay_method, delivery_fee, del_mode, ord_fb_json, notes, resolved_user))
        res = dict(cur.fetchone())

        items = data.get('items') or []
        if not items and prod_id:
            items = [{'product_id': prod_id, 'product_name': p_name, 'quantity': clean_num(data.get('qty') or 1.0), 'unit_price': tot_amt, 'total_price': tot_amt, 'selected_color': color_val, 'measurement_id': data.get('measurement_id'), 'fabrics_data': raw_ord_fb}]

        for itm in items:
            itm_id = itm.get('id') or itm.get('order_item_id') or generate_id("OITM")
            p_id = itm.get('product_id') or prod_id
            if p_id:
                qty, u_price = clean_num(itm.get('quantity') or 1.0), clean_num(itm.get('unit_price') or itm.get('price') or (tot_amt / max(1.0, clean_num(itm.get('quantity') or 1.0))))
                t_price = clean_num(itm.get('total_price') or (qty * u_price))
                cur.execute("""
                    INSERT INTO order_items (id, order_id, product_id, measurement_id, model_id, product_name, selected_color, color, model_image, image_url, quantity, unit_price, total_price, total_amount, paid_amount, remaining_amount, fabrics_data, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                    ON CONFLICT (id) DO UPDATE SET total_price = EXCLUDED.total_price, total_amount = EXCLUDED.total_amount, paid_amount = EXCLUDED.paid_amount, remaining_amount = EXCLUDED.remaining_amount;
                """, (itm_id, order_id, p_id, itm.get('measurement_id') or data.get('measurement_id'), p_id, clean_str(itm.get('product_name') or p_name), color_val, color_val, model_img, img_url, qty, u_price, t_price, t_price, paid_amt, max(0.0, t_price - paid_amt), json.dumps(itm.get('fabrics_data') or raw_ord_fb, ensure_ascii=False), clean_str(itm.get('notes') or '')))
                create_order_stages(cur, order_id, itm_id, p_id, clean_str(itm.get('product_name') or p_name), f"PO-{order_no}")

        # Stock deduction
        deduct_candidates = [(itm.get('product_id') or prod_id, clean_str(itm.get('product_name') or p_name), clean_num(itm.get('quantity') or 1.0)) for itm in items] if items else [(prod_id, p_name, 1.0)]
        for p_id_ref, p_name_ref, q_deduct in deduct_candidates:
            if not p_id_ref and not p_name_ref: continue
            cur.execute("SELECT id, quantity, unit_cost FROM inventory WHERE id = %s OR item_code = %s OR name = %s LIMIT 1 FOR UPDATE;", (p_id_ref, p_id_ref, p_name_ref))
            inv_row = cur.fetchone()
            if inv_row:
                new_qty = max(0.0, float(inv_row['quantity']) - q_deduct)
                cur.execute("UPDATE inventory SET quantity = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_qty, inv_row['id']))
                inv_tx_no = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='INV-TXN-')
                cur.execute("INSERT INTO inventory_transactions (id, inventory_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_by) VALUES (%s, %s, 'SALE_OUT', %s, %s, 'orders', %s, %s, %s);",
                            (inv_tx_no, inv_row['id'], -abs(q_deduct), inv_row['unit_cost'], order_id, f"خصم مبيعات للطلب {order_no}", resolved_user))

        cash_acc = resolve_receiving_account(cur, pay_method, curr)
        if paid_amt > 0:
            sync_advance_receipt(cur, {'id': f"PAY-{order_id}", 'order_id': order_id, 'order_no': order_no, 'customer_id': cust_id, 'party_name': c_name or 'العميل', 'amount': paid_amt, 'currency': curr, 'exchange_rate': rate, 'base_amount': (paid_amt * rate), 'payment_method': pay_method, 'account_id': cash_acc, 'date': order_date, 'notes': f"دفعة عربون طلب {order_no} ({c_name or 'العميل'})", 'created_by': resolved_user})

        rem_amt = tot_amt - paid_amt
        if rem_amt != 0 and cust_id and cust_id != 'CUST-GENERAL':
            cur.execute("UPDATE customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (rem_amt, cust_id))

        if prod_status not in ('Delivered', 'Cancelled', 'Ready'):
            c_w, t_w, e_w, f_w, p_w = 0.0, 0.0, 0.0, 0.0, 0.0
            if prod_id or p_name:
                cur.execute("SELECT bom, labor_cost, packaging_cost FROM products WHERE id = %s OR model_name = %s LIMIT 1;", (prod_id or p_name, p_name))
                p_r = cur.fetchone()
                if p_r and isinstance(p_r.get('bom'), dict):
                    bm = p_r['bom'].get('meta') or {}
                    c_w, t_w = clean_num(bm.get('cutter_wage') or 0.0), clean_num(bm.get('tailor_wage') or 0.0)
                    e_w, f_w = clean_num(bm.get('embroiderer_wage') or 0.0), clean_num(bm.get('finisher_wage') or 0.0)
                    p_w = clean_num(bm.get('packaging_cost') or p_r.get('packaging_cost') or 0.0)

            cur.execute("SELECT id, production_order_no FROM production_orders WHERE order_id = %s LIMIT 1;", (order_id,))
            ex_po = cur.fetchone()
            if ex_po:
                po_no = ex_po.get('production_order_no') or ex_po['id']
                cur.execute("""
                    UPDATE production_orders SET customer_name = COALESCE(NULLIF(%s, ''), customer_name),
                        product_name = COALESCE(NULLIF(%s, ''), product_name), child_name = COALESCE(NULLIF(%s, ''), child_name),
                        selected_color = COALESCE(NULLIF(%s, ''), selected_color), color = COALESCE(NULLIF(%s, ''), color), dress_color = COALESCE(NULLIF(%s, ''), dress_color),
                        model_image = COALESCE(NULLIF(%s, ''), model_image), due_date = COALESCE(%s::date, due_date),
                        cutter_wage = CASE WHEN %s > 0 THEN %s ELSE cutter_wage END, tailor_wage = CASE WHEN %s > 0 THEN %s ELSE tailor_wage END,
                        embroiderer_wage = CASE WHEN %s > 0 THEN %s ELSE embroiderer_wage END, finisher_wage = CASE WHEN %s > 0 THEN %s ELSE finisher_wage END,
                        packager_wage = CASE WHEN %s > 0 THEN %s ELSE packager_wage END, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                """, (c_name, p_name, ch_name, color_val, color_val, color_val, model_img, del_date, c_w, c_w, t_w, t_w, e_w, e_w, f_w, f_w, p_w, p_w, ex_po['id']))
            else:
                po_no = get_next_sequence_number(cur, 'PROD-ORD', fallback_prefix='PROD-ORD-')
                raw_sz = clean_str(data.get('size_code') or data.get('age_tier') or '6-9Y')
                po_sz = None if raw_sz in ('EMPTY', '', 'null', 'None') else raw_sz
                p_type = clean_str(data.get('production_type') or 'custom')
                cur.execute("""
                    INSERT INTO production_orders (
                        id, production_order_no, order_id, customer_id, customer_name, product_id, model_id, product_name, child_name,
                        selected_color, color, dress_color, model_image, product_image, stage, start_date, due_date, progress, status, notes,
                        cutter_wage, tailor_wage, embroiderer_wage, finisher_wage, packager_wage,
                        size_code, fabrics_data, total_amount, deposit_amount, remaining_amount, production_type
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'القص والتحضير', %s, %s, 0.0, 'In Progress', %s,
                        %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s
                    );
                """, (po_no, po_no, order_id, cust_id, c_name or '', prod_id, prod_id, p_name or '', ch_name or '', color_val, color_val, color_val, model_img, img_url, order_date, del_date, notes, c_w, t_w, e_w, f_w, p_w, po_sz, ord_fb_json, tot_amt, paid_amt, max(0.0, tot_amt - paid_amt), p_type))
                log_audit_event(cur=cur, entity_type='production_orders', entity_id=po_no, action='INSERT',
                                new_values={'production_order_no': po_no, 'order_id': order_id, 'size_code': po_sz, 'due_date': del_date},
                                document_no=po_no, details=f"إنشاء أمر تشغيل {po_no} للطلب {order_no}")

        log_audit_event(
            entity_type='orders',
            entity_id=order_id,
            action='UPDATE' if existing_o else 'INSERT',
            new_values={'order_no': order_no, 'customer_id': cust_id, 'total_amount': tot_amt, 'currency': curr},
            user_id=resolved_user,
            document_no=order_no,
            details=f"طلب جديد {order_no} بمبلغ {tot_amt} {curr} للعميل {c_name or 'عام'}",
            cur=cur
        )

        res['order_no'] = order_no
        res['id'] = order_id
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        return res
