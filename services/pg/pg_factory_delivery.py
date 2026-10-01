import logging
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id, today_str
from .account_resolver import resolve_account_id

logger = logging.getLogger("LittlePrincesses_PG_FactoryDelivery")


def deliver_and_settle_order(payload):
    data = payload.get('data') or payload
    order_id = clean_str(data.get('order_id') or data.get('id') or data.get('order_no'))
    if not order_id:
        return {"success": False, "error": "رقم الطلب مطلوب للتسليم والتحصيل"}

    collected_amt = clean_num(data.get('amount_collected') if data.get('amount_collected') is not None else data.get('amount'))
    discount_amt = clean_num(data.get('discount') or 0.0)
    account_id = clean_str(data.get('account_id') or 'ACC-101')
    payment_method = clean_str(data.get('payment_method') or 'نقد (كاش)')
    delivery_notes = clean_str(data.get('notes') or 'تسليم الفستان واستلام المتبقي')

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT * FROM orders 
            WHERE id = %s OR order_no = %s OR id = 'ORD-' || %s
            LIMIT 1 FOR UPDATE;
        """, (order_id, order_id, order_id))
        order = cur.fetchone()
        if not order:
            return {"success": False, "error": f"الطلب [{order_id}] غير موجود"}

        real_order_id = order['id']
        order_no = order.get('order_no') or real_order_id
        cust_id = order.get('customer_id')

        cust_name = ''
        child_name = ''
        if cust_id:
            cur.execute("SELECT name FROM customers WHERE id = %s LIMIT 1;", (cust_id,))
            c_row = cur.fetchone()
            if c_row:
                cust_name = c_row['name']
        if order.get('child_id'):
            cur.execute("SELECT child_name FROM children WHERE id = %s LIMIT 1;", (order['child_id'],))
            ch_row = cur.fetchone()
            if ch_row:
                child_name = ch_row['child_name']

        tot_amount = clean_num(order.get('total_amount') or 0.0)
        old_paid = clean_num(order.get('paid_amount') or 0.0)
        del_fee = clean_num(order.get('delivery_fee') or 0.0)
        del_mode = clean_str(order.get('delivery_payment_mode') or 'DIRECT_TO_COURIER')
        cur_remaining = clean_num(order.get('remaining_amount') or max(0.0, tot_amount - old_paid))

        if collected_amt <= 0 and cur_remaining > 0 and 'amount_collected' not in data:
            collected_amt = max(0.0, cur_remaining - discount_amt)

        new_total = tot_amount - discount_amt if discount_amt > 0 else tot_amount
        new_paid = min(new_total, old_paid + collected_amt)
        new_remaining = max(0.0, new_total - new_paid)
        new_pay_status = 'Paid' if new_remaining <= 0 else ('Partial' if new_paid > 0 else 'Unpaid')

        cur.execute("""
            UPDATE orders
            SET status = 'تم التسليم ✅', production_status = 'Delivered',
                total_amount = %s, paid_amount = %s, payment_status = %s,
                delivery_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (new_total, new_paid, new_pay_status, real_order_id))

        cur.execute("""
            UPDATE production_orders
            SET stage = 'تم التسليم ✅', progress = 100, status = 'Completed', updated_at = CURRENT_TIMESTAMP
            WHERE order_id = %s OR production_order_no = %s OR order_id = %s OR production_order_no = 'PO-' || %s;
        """, (real_order_id, f"PO-{order_no}", order_no, order_no))

        if cust_id:
            cur.execute("""
                UPDATE customers
                SET current_balance = GREATEST(0.0, COALESCE(current_balance, 0.0) - %s),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (collected_amt + discount_amt, cust_id))

        target_treasury_acc = resolve_account_id(cur, account_id, "ACC-101")
        pay_id, jv_id = None, None
        if collected_amt > 0:
            pay_id = generate_id("PAY")
            pay_no = f"RV-{order_no}-{today_str().replace('-', '')}"
            cur.execute("""
                INSERT INTO payments (
                    id, payment_no, order_id, customer_id, payment_type, amount, currency,
                    exchange_rate, base_amount, payment_method, reference_no, account_id,
                    date, status, notes, party_name, target_account_id
                ) VALUES (
                    %s, %s, %s, %s, 'Receipt', %s, 'YER',
                    1.0, %s, %s, %s, %s,
                    CURRENT_DATE, 'Confirmed', %s, %s, %s
                );
            """, (
                pay_id, pay_no, real_order_id, cust_id, collected_amt,
                collected_amt, payment_method, order_no, target_treasury_acc,
                f"سند قبض تحصيل تسليم نهائي لطلب {order_no} (العميلة: {cust_name} - الطفلة: {child_name}) | {delivery_notes}",
                cust_name or 'العميلة', target_treasury_acc
            ))

            jv_id = generate_id("JV")
            jv_no = f"JV-DEL-{order_no}"
            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, ref_type, ref_id, currency,
                    exchange_rate, status, notes
                ) VALUES (
                    %s, %s, CURRENT_DATE, %s, %s, 'ACC-104',
                    %s, %s, %s, 'SalesDelivery', %s, 'YER',
                    1.0, 'Posted', %s
                );
            """, (
                jv_id, jv_no, f"تحصيل تسليم فستان طلب {order_no} ({cust_name})",
                target_treasury_acc, collected_amt, collected_amt, collected_amt,
                real_order_id, f"تسليم نهائي وإقفال حساب الطلب {order_no}"
            ))

    congrats = f"👑 مبروك! تم تسليم فستان الأميرة [{child_name or 'الجميلة'}] للعميلة [{cust_name or 'الكريمة'}] بنجاح، وتحصيل {collected_amt} ر.ي وترحيلها للخزينة ✨"
    return {
        "success": True,
        "message": congrats,
        "data": {
            "order_id": real_order_id,
            "order_no": order_no,
            "customer_name": cust_name,
            "child_name": child_name,
            "total_amount": new_total,
            "paid_amount": new_paid,
            "remaining_amount": new_remaining,
            "amount_collected": collected_amt,
            "delivery_fee": del_fee,
            "delivery_payment_mode": del_mode,
            "payment_id": pay_id,
            "journal_entry_id": jv_id,
            "status": "تم التسليم ✅"
        }
    }


def reverse_order_delivery(payload):
    data = payload.get('data') or payload
    order_id = clean_str(data.get('order_id') or data.get('id') or data.get('order_no'))
    if not order_id:
        return {"success": False, "error": "رقم الطلب مطلوب لإلغاء التسليم"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT * FROM orders WHERE id = %s OR order_no = %s LIMIT 1 FOR UPDATE;", (order_id, order_id))
        order = cur.fetchone()
        if not order:
            return {"success": False, "error": "الطلب غير موجود"}

        real_order_id = order['id']
        order_no = order.get('order_no') or real_order_id

        cur.execute(
            "SELECT amount, account_id FROM payments WHERE order_id = %s AND payment_type = 'Receipt' AND notes ILIKE '%%تسليم نهائي%%' ORDER BY created_at DESC LIMIT 1;",
            (real_order_id,)
        )
        p_row = cur.fetchone()
        if p_row:
            p_amt = clean_num(p_row['amount'])
            cur.execute("DELETE FROM payments WHERE order_id = %s AND payment_type = 'Receipt' AND notes ILIKE '%%تسليم نهائي%%';", (real_order_id,))
            cur.execute("DELETE FROM journal_entries WHERE ref_type = 'SalesDelivery' AND ref_id = %s;", (real_order_id,))

            cur.execute("""
                UPDATE orders 
                SET status = 'جاهز للتسليم 🛍️', production_status = 'Ready',
                    paid_amount = GREATEST(0.0, paid_amount - %s),
                    payment_status = CASE WHEN (paid_amount - %s) > 0 THEN 'Partial' ELSE 'Unpaid' END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (p_amt, p_amt, real_order_id))

            if order.get('customer_id'):
                cur.execute("UPDATE customers SET current_balance = current_balance + %s WHERE id = %s;", (p_amt, order['customer_id']))
        else:
            cur.execute("UPDATE orders SET status = 'جاهز للتسليم 🛍️', production_status = 'Ready', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (real_order_id,))

        cur.execute("""
            UPDATE production_orders 
            SET stage = 'جاهز للتسليم 📦', progress = 95, status = 'In Progress', updated_at = CURRENT_TIMESTAMP
            WHERE order_id = %s OR production_order_no = %s;
        """, (real_order_id, f"PO-{order_no}"))

    return {"success": True, "message": f"تم إلغاء تسليم الطلب {order_no} وإعادته إلى قائمة الطلبات الجاهزة 🔄"}
