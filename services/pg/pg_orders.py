# services/pg/pg_orders.py
# Sales orders management, status updating, pipeline sync, and safe order deletion
# Architectural Standards: Strictly < 220 lines per file

from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, execute_query
from .pg_orders_write import add_order
from .pg_audit import log_audit_event, get_active_user_context
from services.security import assert_period_open


def get_orders(params=None):
    """استرجاع كافة فواتير وأوامر المبيعات مع بيانات العميل والطفلة وتوحيد الحالات المالية بسرعة فائقة"""
    query = """
        WITH latest_items AS (
            SELECT DISTINCT ON (order_id) order_id, product_id, product_name, variant_id, age_size, color_name, notes, measurement_id
            FROM order_items ORDER BY order_id, id
        ),
        first_children AS (
            SELECT DISTINCT ON (customer_id) id, customer_id, child_name
            FROM children WHERE status != 'Deleted' ORDER BY customer_id, created_at ASC
        ),
        latest_meas AS (
            SELECT DISTINCT ON (customer_id) customer_id, id as meas_id, child_id, child_name, date as meas_delivery_date, notes as meas_notes
            FROM measurements ORDER BY customer_id, created_at DESC
        )
        SELECT o.id, o.order_no, o.customer_id, o.product_id, o.variant_id, o.quantity,
               o.order_date, COALESCE(o.delivery_date, m_item.date, m_cust.meas_delivery_date) as delivery_date,
               o.currency, o.exchange_rate, o.subtotal, o.discount, o.tax, o.total_amount,
               o.paid_amount, o.remaining_amount, o.base_amount, o.payment_status, o.production_status,
               o.payment_method, o.status, o.notes, o.created_by, o.created_at, o.updated_at,
               o.delivery_fee, o.delivery_payment_mode, o.deposit_amount, o.fabrics_data, o.dress_color,
               COALESCE(c.name, 'عميل') as customer_name, COALESCE(c.phone, '') as customer_phone,
               COALESCE(p.model_name, NULLIF(oi.product_name, ''), oi.notes, 'موديل راقي') as product_name,
               oi.age_size, oi.color_name as variant_color,
               CASE WHEN length(COALESCE(o.image_url, o.model_image, p.image_url, '')) > 500 THEN '' 
                    ELSE COALESCE(NULLIF(o.image_url, ''), NULLIF(o.model_image, ''), NULLIF(p.image_url, ''), '') 
               END as image_url,
               COALESCE(o.dress_color, o.selected_color, o.color, '') as dress_color,
               COALESCE(o.dress_color, o.selected_color, o.color, '') as selected_color,
               COALESCE(o.dress_color, o.selected_color, o.color, '') as color,
               COALESCE(o.model_id, o.product_id, '') as model_id,
               COALESCE(ch_direct.child_name, ch_cust.child_name, m_item.child_name, m_cust.child_name, '') as child_name,
               COALESCE(o.child_id, ch_direct.id, ch_cust.id, m_item.child_id, m_cust.child_id, '') as child_id,
               COALESCE(NULLIF(m_item.notes, ''), NULLIF(m_cust.meas_notes, ''), '') as measurement_notes
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN latest_items oi ON oi.order_id = o.id
        LEFT JOIN products p ON COALESCE(o.product_id, oi.product_id) = p.id
        LEFT JOIN children ch_direct ON o.child_id = ch_direct.id
        LEFT JOIN first_children ch_cust ON (o.child_id IS NULL AND o.customer_id = ch_cust.customer_id)
        LEFT JOIN measurements m_item ON oi.measurement_id = m_item.id
        LEFT JOIN latest_meas m_cust ON o.customer_id = m_cust.customer_id
        ORDER BY o.created_at DESC;
    """
    rows = execute_query(query, fetch_all=True) or []
    for r in rows:
        for k in ('created_at', 'updated_at', 'order_date', 'delivery_date'):
            if r.get(k): r[k] = str(r[k])
        notes_str = clean_str(r.get('notes') or '')
        if 'للطفلة ' in notes_str:
            try:
                extracted = notes_str.split('للطفلة ')[1].split('(')[0].split(' - ')[0].split(')')[0].strip()
                if extracted and (not r.get('child_name')): r['child_name'] = extracted
            except Exception: pass

        tot, pd = float(r.get('total_amount') or 0.0), float(r.get('paid_amount') or 0.0)
        rem, df = float(r.get('remaining_amount') or max(0.0, tot - pd)), float(r.get('delivery_fee') or 0.0)
        img_val = r.get('image_url') or ''
        r['prod_image_url'], r['model_image'] = img_val, img_val
        r.update({'total': tot, 'paid': pd, 'remaining': rem, 'remaining_balance': rem, 'advance_paid': pd, 'subtotal': float(r.get('subtotal') or (tot - df)), 'qty': int(clean_num(r.get('quantity') or 1)), 'delivery_fee': df, 'delivery_payment_mode': clean_str(r.get('delivery_payment_mode') or 'DIRECT_TO_COURIER'), 'measurement_notes': clean_str(r.get('measurement_notes') or (notes_str if 'تنبيه' in notes_str else ''))})

        prod_st = clean_str(r.get('production_status') or r.get('status') or '')
        if 'cut' in prod_st.lower() or 'قص' in prod_st: r['status'] = 'قيد القص ✂️'
        elif 'sew' in prod_st.lower() or 'خياط' in prod_st: r['status'] = 'قيد الخياطة 🪡'
        elif 'embroid' in prod_st.lower() or 'تطريز' in prod_st: r['status'] = 'التطريز والشك ✨'
        elif 'inspect' in prod_st.lower() or 'فحص' in prod_st: r['status'] = 'الفحص والتشطيب 🔍'
        elif 'ready' in prod_st.lower() or 'جاهز' in prod_st: r['status'] = 'جاهز للتسليم 🛍️'
        elif 'return' in prod_st.lower() or 'مرتجع' in prod_st: r['status'] = 'مرتجع ↩️'
        elif 'deliver' in prod_st.lower() or 'تسليم' in prod_st or prod_st == 'Completed': r['status'] = 'تم التسليم ✅'
        else: r['status'] = 'قيد الخياطة 🪡'
    return rows


def update_order(payload):
    """تحديث بيانات الطلب بصورة جزئية مع مزامنة خطوط الإنتاج بالمعمل"""
    data = payload.get('data') or payload
    order_id = clean_str(data.get('id') or data.get('order_id'))
    if not order_id: return {"error": "Missing order id"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT * FROM orders WHERE id = %s LIMIT 1 FOR UPDATE;", (order_id,))
        existing = cur.fetchone()
        if not existing: return add_order(payload)

        assert_period_open(cur, data.get('order_date') or existing.get('order_date'))

        updates, params = [], []
        status_raw = clean_str(data.get('status') or data.get('production_status')).lower()
        if status_raw:
            stage_ar, stage_db, progress = 'قيد الخياطة 🪡', 'Sewing', 40
            if 'cut' in status_raw or 'قص' in status_raw: stage_ar, stage_db, progress = 'قيد القص ✂️', 'Cutting', 20
            elif 'embroid' in status_raw or 'تطريز' in status_raw: stage_ar, stage_db, progress = 'التطريز والشك ✨', 'Embroidery', 60
            elif 'inspect' in status_raw or 'فحص' in status_raw: stage_ar, stage_db, progress = 'الفحص والتشطيب 🔍', 'Inspection', 80
            elif 'ready' in status_raw or 'جاهز' in status_raw: stage_ar, stage_db, progress = 'جاهز للتسليم 🛍️', 'Ready', 90
            elif 'deliver' in status_raw or 'تسليم' in status_raw or status_raw == 'completed': stage_ar, stage_db, progress = 'تم التسليم ✅', 'Delivered', 100

            updates.append("production_status = %s")
            params.append(stage_db)
            cur.execute("""
                UPDATE production_orders SET stage = %s, progress = %s, status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE order_id = %s OR production_order_no = %s;
            """, (stage_ar, progress, 'Completed' if progress == 100 else 'In Progress', order_id, f"PO-{existing.get('order_no') or order_id}"))

        if data.get('delivery_date'):
            updates.append("delivery_date = %s")
            params.append(clean_str(data['delivery_date']))

        if data.get('order_date'):
            updates.append("order_date = %s")
            params.append(clean_str(data['order_date']))

        if data.get('notes') is not None:
            updates.append("notes = %s")
            params.append(clean_str(data['notes']))

        if 'delivery_fee' in data or 'delivery' in data:
            df = clean_num(data.get('delivery_fee') if data.get('delivery_fee') is not None else data.get('delivery'))
            if df < 0: raise ValueError("رسوم التوصيل لا يمكن أن تكون سالبة")
            updates.append("delivery_fee = %s"); params.append(df)

        if 'delivery_payment_mode' in data:
            dpm = clean_str(data.get('delivery_payment_mode'))
            if dpm in ('DIRECT_TO_COURIER', 'PREPAID_VIA_ATELIER'):
                updates.append("delivery_payment_mode = %s")
                params.append(dpm)

        c_val = clean_str(data.get('dress_color') or data.get('selected_color') or data.get('color'))
        if c_val:
            updates.extend(["dress_color = %s", "selected_color = %s", "color = %s"])
            params.extend([c_val, c_val, c_val])
            cur.execute("UPDATE production_orders SET dress_color = %s, selected_color = %s, color = %s WHERE order_id = %s;", (c_val, c_val, c_val, order_id))

        raw_img = clean_str(data.get('model_image') or data.get('image_url') or data.get('image'))
        if raw_img:
            is_b64 = raw_img.startswith('data:image') or len(raw_img) > 500
            updates.extend(["model_image = %s", "image_url = %s"])
            params.extend([raw_img, None if is_b64 else raw_img])

        m_val = clean_str(data.get('model_id') or data.get('product_id'))
        if m_val:
            updates.extend(["model_id = %s", "product_id = %s"])
            params.extend([m_val, m_val])

        is_deliv = 'deliver' in str(existing.get('status') or '').lower() or 'deliver' in str(existing.get('production_status') or '').lower()
        if 'subtotal' in data:
            sub_v = clean_num(data.get('subtotal'))
            if sub_v < 0 or is_deliv: raise ValueError("لا يمكن تعديل المبالغ المالية للطلب بعد التسليم أو بقيمة سالبة")
            updates.append("subtotal = %s"); params.append(sub_v)
        if 'total' in data or 'total_amount' in data:
            tot = clean_num(data.get('total') or data.get('total_amount'))
            pd = clean_num(data.get('paid') or data.get('paid_amount') or existing.get('paid_amount'))
            if tot < 0 or pd < 0 or is_deliv: raise ValueError("لا يمكن تعديل المبالغ المالية للطلب بعد التسليم أو بقيمة سالبة")
            rem, rate = max(0.0, tot - pd), float(existing.get('exchange_rate') or 1.0)
            updates.extend(["total_amount = %s", "paid_amount = %s", "base_amount = %s", "payment_status = %s"])
            params.extend([tot, pd, (tot * rate), ('Paid' if rem == 0 and tot > 0 else ('Partial' if pd > 0 else 'Unpaid'))])

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            cur.execute(f"UPDATE orders SET {', '.join(updates)} WHERE id = %s RETURNING *;", tuple(params + [order_id]))
            res = dict(cur.fetchone())
            log_audit_event('orders', order_id, 'UPDATE', user_id=get_active_user_context('admin'), document_no=res.get('order_no'), details=f"تحديث بيانات الطلب {res.get('order_no')}", cur=cur)
        else:
            res = dict(existing)

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        return res


def delete_order(payload):
    """حذف أو إلغاء الطلب وعكس حركات المخزون وذمم العملاء والقيود المحاسبية"""
    data = payload.get('data') or payload
    oid = clean_str(data.get('id') or data.get('order_id') or data.get('order_no'))
    if not oid: return {"deleted": False, "error": "Missing order id"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id, order_no, customer_id, order_date, total_amount, paid_amount, remaining_amount FROM orders WHERE id = %s OR order_no = %s LIMIT 1;", (oid, oid))
        row = cur.fetchone()
        if not row: return {"deleted": False, "status": "not_found", "id": oid}

        assert_period_open(cur, row.get('order_date'))

        actual_id, cust_id = row['id'], row['customer_id']
        rem_amt = clean_num(row.get('remaining_amount') or 0.0)
        tot_amt = clean_num(row.get('total_amount') or 0.0)
        paid_amt = clean_num(row.get('paid_amount') or 0.0)
        if rem_amt <= 0 and (tot_amt - paid_amt) > 0: rem_amt = tot_amt - paid_amt

        if rem_amt > 0 and cust_id and cust_id != 'CUST-GENERAL':
            cur.execute("UPDATE customers SET current_balance = current_balance - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (rem_amt, cust_id))

        cur.execute("SELECT inventory_id, quantity FROM inventory_transactions WHERE reference_type = 'orders' AND reference_id = %s;", (actual_id,))
        for txn in cur.fetchall():
            cur.execute("UPDATE inventory SET quantity = quantity + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (abs(clean_num(txn['quantity'])), txn['inventory_id']))

        cur.execute("DELETE FROM inventory_transactions WHERE reference_type = 'orders' AND reference_id = %s;", (actual_id,))
        cur.execute("DELETE FROM order_items WHERE order_id = %s;", (actual_id,))
        cur.execute("DELETE FROM production_orders WHERE order_id = %s;", (actual_id,))
        cur.execute("DELETE FROM payments WHERE order_id = %s;", (actual_id,))

        cur.execute("SELECT id FROM journal_entries WHERE ref_type IN ('Order', 'POSSale', 'POSCOGS') AND ref_id = %s;", (actual_id,))
        for jv in cur.fetchall():
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (jv['id'],))
            cur.execute("DELETE FROM journal_entries WHERE id = %s;", (jv['id'],))

        cur.execute("DELETE FROM orders WHERE id = %s;", (actual_id,))
        log_audit_event('orders', actual_id, 'DELETE', user_id=get_active_user_context('admin'), document_no=row.get('order_no'), details=f"حذف الطلب {row.get('order_no')}", cur=cur)

    return {"deleted": True, "id": oid, "success": True}
