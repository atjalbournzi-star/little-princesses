# services/pg/pg_orders_write.py
# Order creation, item line attachment, inventory auto-deduction, payments, and double entry posting

import json
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str, generate_sequential_order_no
from .pg_receipt_sync import sync_advance_receipt
from .pg_order_stages import create_order_stages


def add_order(payload):
    data = payload.get('data') or payload
    order_id = clean_str(data.get('id') or data.get('order_id')) or generate_id("ORD")
    order_no = clean_str(data.get('order_no')) or order_id

    cust_id = clean_str(data.get('customer_id'))
    c_name = clean_str(data.get('customer_name'))
    with get_db_cursor(commit=True) as c_check:
        if not cust_id or cust_id == 'CUST-GENERAL':
            if c_name:
                c_check.execute("SELECT id FROM customers WHERE name = %s LIMIT 1;", (c_name,))
                c_row = c_check.fetchone()
                cust_id = c_row['id'] if c_row else None
            if not cust_id or cust_id == 'CUST-GENERAL':
                c_check.execute("SELECT id FROM customers WHERE id = 'CUST-GENERAL' LIMIT 1;")
                if not c_check.fetchone():
                    c_check.execute("INSERT INTO customers (id, name, phone, category, status, notes) VALUES ('CUST-GENERAL', 'عميلة عامة (POS)', '967000000000', 'عام', 'Active', 'عميل افتراضي للمبيعات المباشرة') ON CONFLICT (id) DO NOTHING;")
                cust_id = 'CUST-GENERAL'

    order_date = clean_str(data.get('order_date') or data.get('date')) or today_str()
    del_date = clean_str(data.get('delivery_date')) or None
    curr = clean_str(data.get('currency') or 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    tot_amt = clean_num(data.get('total_amount') or data.get('total') or 0.0)
    paid_amt = clean_num(data.get('paid_amount') or data.get('paid') or 0.0)
    base_amt = clean_num(data.get('base_amount') or (tot_amt * rate))
    subtotal = clean_num(data.get('subtotal') or tot_amt)
    discount = clean_num(data.get('discount') or 0.0)
    tax = clean_num(data.get('tax') or 0.0)
    pay_status = 'Paid' if paid_amt >= tot_amt and tot_amt > 0 else ('Partial' if paid_amt > 0 else 'Unpaid')
    prod_status = clean_str(data.get('production_status') or data.get('status') or 'Pending')
    pay_method = clean_str(data.get('payment_method') or 'نقد (كاش)')
    delivery_fee = clean_num(data.get('delivery_fee') or data.get('delivery') or 0.0)
    delivery_payment_mode = clean_str(data.get('delivery_payment_mode') or 'DIRECT_TO_COURIER')
    if delivery_payment_mode not in ('DIRECT_TO_COURIER', 'PREPAID_VIA_ATELIER'):
        delivery_payment_mode = 'DIRECT_TO_COURIER'
    notes = clean_str(data.get('notes') or '')
    color_val = clean_str(data.get('selected_color') or data.get('color') or data.get('dress_color') or '')
    img_val = clean_str(data.get('model_image') or data.get('image_url') or data.get('image') or '')

    ch_id = clean_str(data.get('child_id')) or None
    ch_name = clean_str(data.get('child_name'))
    prod_id = clean_str(data.get('product_id') or data.get('model_id')) or None
    p_name = clean_str(data.get('product_name') or data.get('model_name') or data.get('name'))
    raw_ord_fb = data.get('fabrics_data') or data.get('fabrics_breakdown') or []
    ord_fb_json = json.dumps(raw_ord_fb, ensure_ascii=False) if raw_ord_fb else '[]'

    with get_db_cursor(commit=True) as cur:
        if not order_no or order_no.startswith('ORD-CUST-') or order_no == order_id:
            order_no = generate_sequential_order_no(cur, order_date)

        if not ch_id and ch_name and cust_id and cust_id != 'CUST-GENERAL':
            cur.execute("SELECT id FROM children WHERE customer_id = %s AND child_name = %s LIMIT 1;", (cust_id, ch_name))
            c_ch = cur.fetchone()
            if c_ch: ch_id = c_ch['id']

        p_row = None
        if prod_id:
            cur.execute("SELECT id, image_url FROM products WHERE id = %s LIMIT 1;", (prod_id,))
            p_row = cur.fetchone()
        if not p_row and p_name:
            cur.execute("SELECT id, image_url FROM products WHERE model_name = %s OR id = %s LIMIT 1;", (p_name, p_name))
            p_row = cur.fetchone()
        if not p_row:
            cur.execute("SELECT id, image_url FROM products WHERE status = 'Active' LIMIT 1;")
            p_row = cur.fetchone()
        if p_row:
            prod_id = p_row['id']
            if not img_val or (img_val.startswith('data:image/') and len(img_val) > 500):
                p_img = p_row.get('image_url') or ''
                img_val = p_img if not p_img.startswith('data:image/') else ''

        query = """
            INSERT INTO orders (
                id, order_no, customer_id, child_id, product_id, model_id,
                selected_color, color, model_image, image_url, order_date, delivery_date,
                currency, exchange_rate, subtotal, discount, tax, total_amount,
                paid_amount, base_amount, payment_status, production_status,
                payment_method, delivery_fee, delivery_payment_mode, fabrics_data, status, notes, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s::jsonb, 'Active', %s, CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                child_id = COALESCE(EXCLUDED.child_id, orders.child_id),
                product_id = COALESCE(EXCLUDED.product_id, orders.product_id),
                model_id = COALESCE(EXCLUDED.model_id, orders.model_id),
                selected_color = COALESCE(NULLIF(EXCLUDED.selected_color, ''), orders.selected_color),
                color = COALESCE(NULLIF(EXCLUDED.color, ''), orders.color),
                model_image = COALESCE(NULLIF(EXCLUDED.model_image, ''), orders.model_image),
                image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), orders.image_url),
                total_amount = EXCLUDED.total_amount, paid_amount = EXCLUDED.paid_amount,
                payment_status = EXCLUDED.payment_status, production_status = EXCLUDED.production_status,
                delivery_fee = EXCLUDED.delivery_fee, delivery_payment_mode = EXCLUDED.delivery_payment_mode,
                fabrics_data = COALESCE(NULLIF(EXCLUDED.fabrics_data, '[]'::jsonb), orders.fabrics_data),
                notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """
        cur.execute(query, (order_id, order_no, cust_id, ch_id, prod_id, prod_id, color_val, color_val, img_val, img_val, order_date, del_date, curr, rate, subtotal, discount, tax, tot_amt, paid_amt, base_amt, pay_status, prod_status, pay_method, delivery_fee, delivery_payment_mode, ord_fb_json, notes))
        res = dict(cur.fetchone())

        # Save order items & auto-deduct inventory
        items = data.get('items') or []
        if not items and prod_id:
            items = [{'product_id': prod_id, 'product_name': p_name, 'quantity': clean_num(data.get('qty') or 1.0), 'unit_price': tot_amt, 'total_price': tot_amt, 'selected_color': color_val, 'measurement_id': data.get('measurement_id'), 'fabrics_data': raw_ord_fb}]

        for itm in items:
            itm_id = itm.get('id') or itm.get('order_item_id') or generate_id("OITM")
            p_id = itm.get('product_id') or prod_id
            if p_id:
                qty = clean_num(itm.get('quantity') or 1.0)
                u_price = clean_num(itm.get('unit_price') or itm.get('price') or (tot_amt / max(1.0, qty)))
                t_price = clean_num(itm.get('total_price') or (qty * u_price))
                itm_color = clean_str(itm.get('selected_color') or itm.get('color') or itm.get('dress_color') or color_val)
                itm_pname = clean_str(itm.get('product_name') or itm.get('name') or p_name)
                itm_meas = clean_str(itm.get('measurement_id') or data.get('measurement_id')) or None
                m_row = None
                if not itm_meas and ch_id:
                    cur.execute("SELECT id, fabrics_data FROM measurements WHERE child_id = %s ORDER BY created_at DESC LIMIT 1;", (ch_id,))
                    m_row = cur.fetchone()
                if not itm_meas and not m_row and cust_id:
                    cur.execute("SELECT id, fabrics_data FROM measurements WHERE customer_id = %s ORDER BY created_at DESC LIMIT 1;", (cust_id,))
                    m_row = cur.fetchone()
                if m_row:
                    itm_meas = m_row['id']
                raw_fb = itm.get('fabrics_data') or itm.get('fabrics_breakdown') or itm.get('bom_items') or raw_ord_fb
                if (not raw_fb or raw_fb == '[]') and m_row and m_row.get('fabrics_data'):
                    raw_fb = m_row['fabrics_data']
                elif (not raw_fb or raw_fb == '[]') and itm_meas:
                    cur.execute("SELECT fabrics_data FROM measurements WHERE id = %s LIMIT 1;", (itm_meas,))
                    mf = cur.fetchone()
                    if mf and mf.get('fabrics_data'): raw_fb = mf['fabrics_data']
                itm_fb = json.dumps(raw_fb or [], ensure_ascii=False)
                itm_paid = clean_num(itm.get('paid_amount') or paid_amt)
                itm_rem = clean_num(itm.get('remaining_amount') or max(0.0, t_price - itm_paid))

                cur.execute("""
                    INSERT INTO order_items (id, order_id, product_id, measurement_id, model_id, product_name, selected_color, color, model_image, image_url, quantity, unit_price, total_price, total_amount, paid_amount, remaining_amount, fabrics_data, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                    ON CONFLICT (id) DO UPDATE SET product_name = EXCLUDED.product_name, measurement_id = COALESCE(EXCLUDED.measurement_id, order_items.measurement_id),
                        selected_color = EXCLUDED.selected_color, color = EXCLUDED.color, total_price = EXCLUDED.total_price, total_amount = EXCLUDED.total_amount,
                        paid_amount = EXCLUDED.paid_amount, remaining_amount = EXCLUDED.remaining_amount, fabrics_data = EXCLUDED.fabrics_data;
                """, (itm_id, order_id, p_id, itm_meas, p_id, itm_pname, itm_color, itm_color, img_val, img_val, qty, u_price, t_price, t_price, itm_paid, itm_rem, itm_fb, clean_str(itm.get('notes') or '')))
                create_order_stages(cur, order_id, itm_id, p_id, itm_pname, f"PO-{order_no}")

        # Stock deduction
        deduct_candidates = [(itm.get('product_id') or prod_id, clean_str(itm.get('product_name') or itm.get('name') or p_name), clean_num(itm.get('quantity') or 1.0)) for itm in items] if items else [(prod_id, p_name, 1.0)]
        for p_id_ref, p_name_ref, q_deduct in deduct_candidates:
            if not p_id_ref and not p_name_ref: continue
            cur.execute("SELECT id, quantity, unit_cost FROM inventory WHERE id = %s OR item_code = %s OR name = %s LIMIT 1 FOR UPDATE;", (p_id_ref, p_id_ref, p_name_ref))
            inv_row = cur.fetchone()
            if inv_row:
                new_qty = max(0.0, float(inv_row['quantity']) - q_deduct)
                cur.execute("UPDATE inventory SET quantity = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_qty, inv_row['id']))
                cur.execute("INSERT INTO inventory_transactions (id, inventory_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes) VALUES (%s, %s, 'SALE_OUT', %s, %s, 'orders', %s, %s);",
                            (generate_id("ITXN"), inv_row['id'], -abs(q_deduct), inv_row['unit_cost'], order_id, f"خصم مبيعات للطلب {order_no}"))

        # Cash Account & Payment Receipt (Liability Account 202 - Customer Advance Deposits)
        cash_acc = 'ACC-101-2' if 'SAR' in curr.upper() else ('ACC-101-3' if 'USD' in curr.upper() else 'ACC-101-1')
        if any(k in pay_method for k in ['كريمي', 'بنك', 'حوالة']): cash_acc = 'ACC-102-2'

        if paid_amt > 0:
            sync_advance_receipt(cur, {
                'id': f"PAY-{order_id}",
                'order_id': order_id,
                'order_no': order_no,
                'customer_id': cust_id,
                'party_name': c_name or 'العميلة',
                'amount': paid_amt,
                'currency': curr,
                'exchange_rate': rate,
                'base_amount': (paid_amt * rate),
                'payment_method': pay_method,
                'account_id': cash_acc,
                'date': order_date,
                'notes': f"دفعة عربون طلب {order_no} ({c_name or 'العميلة'})"
            })

        rem_amt = tot_amt - paid_amt
        if rem_amt != 0 and cust_id and cust_id != 'CUST-GENERAL':
            cur.execute("UPDATE customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (rem_amt, cust_id))

        # Factory pipeline order
        if prod_status not in ('Delivered', 'Cancelled', 'Ready'):
            cur.execute("""
                INSERT INTO production_orders (id, production_order_no, order_id, product_id, model_id, product_name, child_name, selected_color, color, model_image, product_image, stage, start_date, due_date, progress, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'القص والتحضير ✂️', %s, %s, 20, 'In Progress', %s)
                ON CONFLICT (production_order_no) DO UPDATE SET stage = EXCLUDED.stage, product_name = EXCLUDED.product_name, child_name = EXCLUDED.child_name, selected_color = EXCLUDED.selected_color, color = EXCLUDED.color, model_image = EXCLUDED.model_image, product_image = EXCLUDED.product_image, notes = EXCLUDED.notes;
            """, (generate_id("PRD"), f"PO-{order_no}", order_id, prod_id, prod_id, p_name or 'فستان أميرات', ch_name or 'الأميرة', color_val, color_val, img_val, img_val, order_date, del_date, notes))

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        return res
