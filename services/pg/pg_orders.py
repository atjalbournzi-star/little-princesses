# services/pg/pg_orders.py
# Sales orders management, status updating, pipeline sync, and safe order deletion

from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, execute_query
from .pg_orders_write import add_order


def get_orders(params=None):
    """استرجاع كافة فواتير وأوامر المبيعات مع بيانات العميل والطفلة وتوحيد الحالات المالية"""
    query = """
        SELECT o.*, 
               COALESCE(c.name, 'عميل') as customer_name, 
               COALESCE(c.phone, '') as customer_phone,
               COALESCE(p.model_name, oi.notes, 'موديل راقي') as product_name,
               COALESCE(
                   ch.child_name,
                   (SELECT m.child_name FROM measurements m WHERE m.child_id = o.child_id LIMIT 1),
                   (SELECT m.child_name FROM measurements m WHERE m.customer_id = o.customer_id AND m.model_name = p.model_name LIMIT 1),
                   (SELECT m.child_name FROM measurements m WHERE m.customer_id = o.customer_id ORDER BY m.created_at DESC LIMIT 1),
                   'الأميرة'
               ) as child_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN LATERAL (
            SELECT oi.product_id, oi.notes
            FROM order_items oi
            WHERE oi.order_id = o.id
            LIMIT 1
        ) oi ON true
        LEFT JOIN products p ON COALESCE(o.product_id, oi.product_id) = p.id
        LEFT JOIN children ch ON o.child_id = ch.id
        ORDER BY o.created_at DESC;
    """
    rows = execute_query(query, fetch_all=True) or []
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('updated_at'): r['updated_at'] = str(r['updated_at'])
        if r.get('order_date'): r['order_date'] = str(r['order_date'])
        if r.get('delivery_date'): r['delivery_date'] = str(r['delivery_date'])

        notes_str = clean_str(r.get('notes') or '')
        if 'للطفلة ' in notes_str:
            try:
                extracted = notes_str.split('للطفلة ')[1].split('(')[0].split(' - ')[0].split(')')[0].strip()
                if extracted and (r.get('child_name') in ('الأميرة', '', None)):
                    r['child_name'] = extracted
            except Exception: pass

        tot = float(r.get('total_amount') or 0.0)
        pd = float(r.get('paid_amount') or 0.0)
        rem = float(r.get('remaining_amount') or max(0.0, tot - pd))
        df = float(r.get('delivery_fee') or 0.0)
        r['total'] = tot
        r['paid'] = pd
        r['remaining'] = rem
        r['remaining_balance'] = rem
        r['advance_paid'] = pd
        r['subtotal'] = float(r.get('subtotal') or (tot - df))
        r['qty'] = int(clean_num(r.get('quantity') or 1))
        r['delivery_fee'] = df
        r['delivery_payment_mode'] = clean_str(r.get('delivery_payment_mode') or 'DIRECT_TO_COURIER')

        prod_st = clean_str(r.get('production_status') or r.get('status') or '')
        if 'cut' in prod_st.lower() or 'قص' in prod_st: r['status'] = 'قيد القص ✂️'
        elif 'sew' in prod_st.lower() or 'خياط' in prod_st: r['status'] = 'قيد الخياطة 🪡'
        elif 'embroid' in prod_st.lower() or 'تطريز' in prod_st: r['status'] = 'التطريز والشك ✨'
        elif 'inspect' in prod_st.lower() or 'فحص' in prod_st: r['status'] = 'الفحص والتشطيب 🔍'
        elif 'ready' in prod_st.lower() or 'جاهز' in prod_st: r['status'] = 'جاهز للتسليم 🛍️'
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

        updates, params = [], []
        status_raw = clean_str(data.get('status') or data.get('production_status'))
        if status_raw:
            stage_ar, stage_db, progress = 'قيد الخياطة 🪡', 'Sewing', 40
            if 'قص' in status_raw or 'cut' in status_raw.lower(): stage_ar, stage_db, progress = 'قيد القص ✂️', 'Cutting', 20
            elif 'خياط' in status_raw or 'sew' in status_raw.lower(): stage_ar, stage_db, progress = 'قيد الخياطة 🪡', 'Sewing', 40
            elif 'تطريز' in status_raw or 'embroid' in status_raw.lower(): stage_ar, stage_db, progress = 'التطريز والشك ✨', 'Embroidery', 60
            elif 'فحص' in status_raw or 'inspect' in status_raw.lower(): stage_ar, stage_db, progress = 'الفحص والتشطيب 🔍', 'Inspection', 80
            elif 'جاهز' in status_raw or 'ready' in status_raw.lower(): stage_ar, stage_db, progress = 'جاهز للتسليم 🛍️', 'Ready', 90
            elif 'تسليم' in status_raw or 'deliver' in status_raw.lower() or status_raw == 'Completed': stage_ar, stage_db, progress = 'تم التسليم ✅', 'Delivered', 100

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
            updates.append("delivery_fee = %s")
            params.append(df)

        if 'delivery_payment_mode' in data:
            dpm = clean_str(data.get('delivery_payment_mode'))
            if dpm in ('DIRECT_TO_COURIER', 'PREPAID_VIA_ATELIER'):
                updates.append("delivery_payment_mode = %s")
                params.append(dpm)

        if 'total' in data or 'total_amount' in data:
            tot = clean_num(data.get('total') or data.get('total_amount'))
            pd = clean_num(data.get('paid') or data.get('paid_amount') or existing.get('paid_amount'))
            rem = max(0.0, tot - pd)
            rate = float(existing.get('exchange_rate') or 1.0)
            updates.extend(["total_amount = %s", "paid_amount = %s", "base_amount = %s", "payment_status = %s"])
            params.extend([tot, pd, (tot * rate), ('Paid' if rem == 0 and tot > 0 else ('Partial' if pd > 0 else 'Unpaid'))])

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            cur.execute(f"UPDATE orders SET {', '.join(updates)} WHERE id = %s RETURNING *;", tuple(params + [order_id]))
            res = dict(cur.fetchone())
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
        cur.execute("SELECT id, order_no, customer_id, total_amount, paid_amount, remaining_amount FROM orders WHERE id = %s OR order_no = %s LIMIT 1;", (oid, oid))
        row = cur.fetchone()
        if not row: return {"deleted": False, "status": "not_found", "id": oid}

        actual_id = row['id']
        cust_id = row['customer_id']
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

        cur.execute("SELECT id FROM journal_entries WHERE ref_type = 'Order' AND ref_id = %s;", (actual_id,))
        for jv in cur.fetchall():
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (jv['id'],))
            cur.execute("DELETE FROM journal_entries WHERE id = %s;", (jv['id'],))

        cur.execute("DELETE FROM orders WHERE id = %s;", (actual_id,))

    return {"deleted": True, "id": oid, "success": True}
