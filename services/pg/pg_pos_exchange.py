# services/pg/pg_pos_exchange.py
# Atomic POS Size Exchange (ACID Stock Return/Issue + Price & COGS Accounting Settlement)

from decimal import Decimal, ROUND_HALF_UP
from .db_pool import get_db_cursor, clean_str, generate_id, today_str
from .pg_sequences import get_next_sequence_number
from .account_resolver import (
    resolve_receiving_account, resolve_sales_revenue_account, resolve_leaf_account
)
from .pg_wip_accounting import resolve_cogs_account
from .pg_delivery_cogs import refresh_chart_balances_atomic
from .journal_lines_helper import insert_sorted_journal_lines
from .pg_pos import _sync_inventory_avg_cost
from .pg_audit import log_audit_event, resolve_active_user_id
from services.security import assert_period_open

DEC_4 = Decimal('0.0001')


def _d(val):
    return Decimal(str(val if val not in (None, '') else 0)).quantize(DEC_4, rounding=ROUND_HALF_UP)


def _post_exchange_journal(cur, jv_no, ex_date, desc, dr_acc, cr_acc, amount, ref_type, ref_id, dr_desc, cr_desc):
    amt = _d(amount)
    if amt <= 0:
        return None
    cur.execute("""
        INSERT INTO public.journal_entries (
            id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'YER', 1.0, 'Posted', %s);
    """, (jv_no, jv_no, ex_date, desc, dr_acc, cr_acc, amt, amt, amt, ref_type, ref_id, desc))
    insert_sorted_journal_lines(cur, jv_no, [
        (dr_acc, dr_desc, amt, Decimal('0.0000'), amt, Decimal('0.0000')),
        (cr_acc, cr_desc, Decimal('0.0000'), amt, Decimal('0.0000'), amt),
    ])
    return jv_no


def exchange_pos_size_atomic(payload):
    """استبدال مقاس بمقاس آخر في فاتورة سابقة ذرياً مع التسوية المالية والمحاسبية"""
    data = payload.get('data') or payload
    order_ref = clean_str(data.get('order_id') or data.get('order_no'))
    old_var_id = clean_str(data.get('old_variant_id'))
    new_var_id = clean_str(data.get('new_variant_id'))
    qty = max(Decimal('1.0000'), _d(data.get('quantity') or 1))
    pay_method = clean_str(data.get('payment_method') or 'نقد (كاش)')
    notes = clean_str(data.get('notes') or '')
    raw_uid = clean_str(data.get('user_id') or data.get('created_by') or '')

    if not order_ref or not old_var_id or not new_var_id:
        raise ValueError("رقم الفاتورة والمقاس القديم والمقاس الجديد مطلوبة")
    if old_var_id == new_var_id:
        raise ValueError("لا يمكن استبدال المقاس بنفسه؛ يرجى اختيار مقاس أو لون مختلف")

    ex_date = today_str()
    with get_db_cursor(commit=True) as cur:
        assert_period_open(cur, ex_date)
        resolved_uid = resolve_active_user_id(cur, raw_uid)

        cur.execute("SELECT * FROM public.orders WHERE id = %s OR order_no = %s LIMIT 1 FOR UPDATE;", (order_ref, order_ref))
        ord_row = cur.fetchone()
        if not ord_row:
            raise ValueError(f"الفاتورة غير موجودة: {order_ref}")
        order_id, order_no = ord_row['id'], ord_row['order_no']

        cur.execute("SELECT * FROM public.order_items WHERE order_id = %s AND variant_id = %s LIMIT 1 FOR UPDATE;", (order_id, old_var_id))
        oi_row = cur.fetchone()
        if not oi_row or _d(oi_row['quantity']) < qty:
            raise ValueError("المقاس المحدد غير موجود في بنود هذه الفاتورة بالكمية المطلوبة")

        # Lock both variants in deterministic order to avoid deadlocks
        for vid in sorted([old_var_id, new_var_id]):
            cur.execute("SELECT id FROM public.product_variants WHERE id = %s LIMIT 1 FOR UPDATE;", (vid,))

        cur.execute("SELECT * FROM public.product_variants WHERE id = %s LIMIT 1;", (old_var_id,))
        old_v = cur.fetchone()
        cur.execute("SELECT * FROM public.product_variants WHERE id = %s LIMIT 1;", (new_var_id,))
        new_v = cur.fetchone()
        if not old_v or not new_v:
            raise ValueError("تعذر العثور على بيانات أحد المقاسات")
        if _d(new_v['stock_qty']) < qty:
            raise ValueError(f"المقاس الجديد [{new_v['age_size']}] غير متوفر بالكمية المطلوبة (المتوفر: {float(new_v['stock_qty']):g})")

        old_inv_id, new_inv_id = old_v['inventory_id'], new_v['inventory_id']
        for iid in sorted({old_inv_id, new_inv_id}):
            cur.execute("SELECT id, quantity, unit_cost FROM public.inventory WHERE id = %s LIMIT 1 FOR UPDATE;", (iid,))

        cur.execute("SELECT id, quantity, unit_cost FROM public.inventory WHERE id = %s;", (old_inv_id,))
        old_inv = cur.fetchone()
        cur.execute("SELECT id, quantity, unit_cost FROM public.inventory WHERE id = %s;", (new_inv_id,))
        new_inv = cur.fetchone()

        old_wh = old_v.get('warehouse_id') or 'WH-SHOWROOM'
        new_wh = new_v.get('warehouse_id') or 'WH-SHOWROOM'

        # 1. Return old variant to stock (+qty)
        cur.execute("UPDATE public.product_variants SET stock_qty = stock_qty + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (qty, old_var_id))
        cur.execute("""
            INSERT INTO public.warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at)
            VALUES (%s, %s, %s, %s, 0.0, CURRENT_TIMESTAMP)
            ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP;
        """, (f"WS-{old_inv_id}-{old_wh}", old_wh, old_inv_id, qty))
        cur.execute("UPDATE public.inventory SET quantity = quantity + %s, status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (qty, old_inv_id))

        # 2. Deduct new variant from stock (-qty)
        cur.execute("UPDATE public.product_variants SET stock_qty = stock_qty - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (qty, new_var_id))
        cur.execute("UPDATE public.warehouse_stock SET quantity = quantity - %s, updated_at = CURRENT_TIMESTAMP WHERE warehouse_id = %s AND inventory_id = %s;", (qty, new_wh, new_inv_id))
        cur.execute("UPDATE public.inventory SET quantity = quantity - %s, status = CASE WHEN (quantity - %s) <= 0 THEN 'OutOfStock' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (qty, qty, new_inv_id))

        for iid, inv_r in [(old_inv_id, old_inv), (new_inv_id, new_inv)]:
            _sync_inventory_avg_cost(cur, iid, inv_r['quantity'], inv_r['unit_cost'], 0, 0)

        # 3. Log inventory transactions
        old_cost = _d(old_v['cost_price'])
        new_cost = _d(new_v['cost_price'])
        tx_in = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='ITXN-')
        cur.execute("""
            INSERT INTO public.inventory_transactions (id, inventory_id, variant_id, warehouse_id, transaction_type, quantity, unit_cost, reference_id, reference_type, notes, created_by)
            VALUES (%s, %s, %s, %s, 'EXCHANGE_IN', %s, %s, %s, 'orders', %s, %s);
        """, (tx_in, old_inv_id, old_var_id, old_wh, qty, old_cost, order_id, f"إرجاع استبدال مقاس {old_v['age_size']} للفاتورة {order_no}", resolved_uid))

        tx_out = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='ITXN-')
        cur.execute("""
            INSERT INTO public.inventory_transactions (id, inventory_id, variant_id, warehouse_id, transaction_type, quantity, unit_cost, reference_id, reference_type, notes, created_by)
            VALUES (%s, %s, %s, %s, 'EXCHANGE_OUT', %s, %s, %s, 'orders', %s, %s);
        """, (tx_out, new_inv_id, new_var_id, new_wh, -qty, new_cost, order_id, f"صرف استبدال مقاس {new_v['age_size']} للفاتورة {order_no}", resolved_uid))

        # 4. Update order_items & orders
        old_unit_price = _d(oi_row['unit_price'])
        new_unit_price = _d(new_v['selling_price'])
        price_diff = ((new_unit_price - old_unit_price) * qty).quantize(DEC_4, rounding=ROUND_HALF_UP)

        if _d(oi_row['quantity']) == qty:
            cur.execute("""
                UPDATE public.order_items
                SET variant_id = %s, age_size = %s, color_name = %s, selected_color = %s, sku = %s, barcode = %s,
                    unit_price = %s, cost_price = %s, total_price = %s, total_amount = %s,
                    notes = COALESCE(notes, '') || %s
                WHERE id = %s;
            """, (new_var_id, new_v['age_size'], new_v.get('color_name'), new_v.get('color_name'), new_v['sku'], new_v['barcode'], new_unit_price, new_cost, (new_unit_price * qty).quantize(DEC_4), (new_unit_price * qty).quantize(DEC_4), f" | استبدال من {old_v['age_size']} إلى {new_v['age_size']}", oi_row['id']))
        else:
            rem_q = _d(oi_row['quantity']) - qty
            cur.execute("UPDATE public.order_items SET quantity = %s, total_price = %s, total_amount = %s WHERE id = %s;", (rem_q, (rem_q * old_unit_price).quantize(DEC_4), (rem_q * old_unit_price).quantize(DEC_4), oi_row['id']))
            cur.execute("""
                INSERT INTO public.order_items (id, order_id, product_id, variant_id, age_size, color_name, selected_color, sku, barcode, product_name, quantity, unit_price, cost_price, total_price, total_amount, paid_amount, remaining_amount, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0.0, %s);
            """, (generate_id("OITM"), order_id, oi_row.get('product_id'), new_var_id, new_v['age_size'], new_v.get('color_name'), new_v.get('color_name'), new_v['sku'], new_v['barcode'], oi_row.get('product_name'), qty, new_unit_price, new_cost, (new_unit_price * qty).quantize(DEC_4), (new_unit_price * qty).quantize(DEC_4), (new_unit_price * qty).quantize(DEC_4), f"استبدال مقاس من {old_v['age_size']}"))

        new_tot = max(Decimal('0.0000'), _d(ord_row['total_amount']) + price_diff)
        new_paid = max(Decimal('0.0000'), _d(ord_row['paid_amount']) + price_diff)
        cur.execute("UPDATE public.orders SET variant_id = %s, subtotal = subtotal + %s, total_amount = %s, paid_amount = %s, base_amount = %s, notes = COALESCE(notes, '') || %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
                    (new_var_id, price_diff, new_tot, new_paid, new_tot, f" | استبدال مقاس ({old_v['age_size']} -> {new_v['age_size']}) {notes}".strip(), order_id))

        # 5. Financial & COGS journal settlement
        rev_acc = resolve_leaf_account(cur, resolve_sales_revenue_account(cur, 'ACC-401'), 'YER')
        cash_acc = resolve_leaf_account(cur, resolve_receiving_account(cur, pay_method, 'YER'), 'YER')
        cogs_acc = resolve_leaf_account(cur, resolve_cogs_account(cur, 'ACC-504'), 'YER')
        cur.execute("SELECT account_id FROM public.warehouses WHERE id = %s LIMIT 1;", (new_wh,))
        wh_acc = resolve_leaf_account(cur, (cur.fetchone() or {}).get('account_id') or 'ACC-105-03', 'YER')

        jv_price_no = None
        if price_diff > 0:
            jv_price_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
            _post_exchange_journal(cur, jv_price_no, ex_date, f"تسوية فرق سعر استبدال مقاس ({order_no})", cash_acc, rev_acc, price_diff, 'POSExchange', order_id, f"تحصيل فرق استبدال مقاس {order_no}", f"إيراد فرق استبدال مقاس {order_no}")
        elif price_diff < 0:
            jv_price_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
            _post_exchange_journal(cur, jv_price_no, ex_date, f"رد فرق سعر استبدال مقاس ({order_no})", rev_acc, cash_acc, abs(price_diff), 'POSExchange', order_id, f"خصم إيراد فرق استبدال {order_no}", f"صرف رد فرق استبدال {order_no}")

        cogs_diff = ((new_cost - old_cost) * qty).quantize(DEC_4, rounding=ROUND_HALF_UP)
        jv_cogs_no = None
        if cogs_diff > 0:
            jv_cogs_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
            _post_exchange_journal(cur, jv_cogs_no, ex_date, f"تسوية تكلفة استبدال مقاس ({order_no})", cogs_acc, wh_acc, cogs_diff, 'POSExchangeCOGS', order_id, f"مدين فرق تكلفة COGS ({order_no})", f"دائن فرق مخزون استبدال ({order_no})")
        elif cogs_diff < 0:
            jv_cogs_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
            _post_exchange_journal(cur, jv_cogs_no, ex_date, f"عكس فرق تكلفة استبدال مقاس ({order_no})", wh_acc, cogs_acc, abs(cogs_diff), 'POSExchangeCOGS', order_id, f"مدين استرداد تكلفة مخزون ({order_no})", f"دائن تخفيض COGS استبدال ({order_no})")

        refresh_chart_balances_atomic(cur)
        log_audit_event('orders', order_id, 'SIZE_EXCHANGE', user_id=resolved_uid, document_no=order_no, details=f"استبدال مقاس {old_v['age_size']} إلى {new_v['age_size']} (فرق السعر: {float(price_diff)})", cur=cur)

        return {
            "success": True, "order_id": order_id, "order_no": order_no,
            "old_variant_id": old_var_id, "new_variant_id": new_var_id,
            "price_diff": float(price_diff), "cogs_diff": float(cogs_diff),
            "jv_price_no": jv_price_no, "jv_cogs_no": jv_cogs_no,
            "message": f"تم استبدال المقاس من [{old_v['age_size']}] إلى [{new_v['age_size']}] وتسوية المخزون والحسابات بنجاح 🔄✨"
        }
