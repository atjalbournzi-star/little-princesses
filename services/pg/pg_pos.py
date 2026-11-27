# services/pg/pg_pos.py
# Atomic POS Sales, Variant Stock Deduction (FOR UPDATE), Split Payment & COGS

import json
import logging
from decimal import Decimal, ROUND_HALF_UP
from .db_pool import clean_str, clean_num, generate_id, today_str
from .pg_sequences import get_next_sequence_number
from .account_resolver import resolve_leaf_account, resolve_exchange_rate
from .pg_pos_accounting import post_pos_journal_entries
from .pg_pos_pricing import resolve_pos_pricing
from .pg_ready_schema import ensure_ready_products_schema
from .pg_audit import log_audit_event, resolve_active_user_id
from services.security import assert_period_open

logger = logging.getLogger("LittlePrincesses_PG_POS")
DEC_4 = Decimal('0.0001')


def _d(val):
    return Decimal(str(val if val not in (None, '') else 0)).quantize(DEC_4, rounding=ROUND_HALF_UP)


def _sync_inventory_avg_cost(cur, inv_id, old_qty, old_cost, sold_qty, sold_cost):
    """Keeps inventory.unit_cost aligned with remaining stock valuation for Equation 3."""
    cur.execute("SELECT COALESCE(SUM(stock_qty), 0) AS q, COALESCE(SUM(stock_qty * cost_price), 0) AS v FROM public.product_variants WHERE inventory_id = %s AND is_active = TRUE;", (inv_id,))
    pv_tot = cur.fetchone()
    if pv_tot and _d(pv_tot['q']) > 0:
        new_avg = (_d(pv_tot['v']) / _d(pv_tot['q'])).quantize(DEC_4, rounding=ROUND_HALF_UP)
        cur.execute("UPDATE public.inventory SET unit_cost = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_avg, inv_id))
        return
    rem_qty = _d(old_qty) - _d(sold_qty)
    if rem_qty > 0:
        rem_val = max(Decimal('0.0000'), (_d(old_qty) * _d(old_cost)) - (_d(sold_qty) * _d(sold_cost)))
        new_avg = (rem_val / rem_qty).quantize(DEC_4, rounding=ROUND_HALF_UP)
        cur.execute("UPDATE public.inventory SET unit_cost = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_avg, inv_id))


def _resolve_split_amounts(data, tot_amt, pay_method):
    split = data.get('split_payment_details') or {}
    if isinstance(split, str):
        try: split = json.loads(split)
        except Exception: split = {}
    if isinstance(split, dict) and any(k in split for k in ('cash_amount', 'bank_amount', 'cash', 'bank')):
        raw_c = split.get('cash_amount') if split.get('cash_amount') is not None else split.get('cash', 0)
        raw_b = split.get('bank_amount') if split.get('bank_amount') is not None else split.get('bank', 0)
        cash_amt, bank_amt = _d(raw_c), _d(raw_b)
        if cash_amt < 0 or bank_amt < 0:
            raise ValueError("لا يمكن أن يكون المبلغ المستلم قيمة سالبة")
        if cash_amt + bank_amt > tot_amt:
            raise ValueError("مجموع الدفع المقسّم (نقد + بنك) يتجاوز صافي الفاتورة")
        return cash_amt, bank_amt, split.get('bank_account_id'), split
    pm_low = str(pay_method or '').lower()
    is_partial = any(w in pm_low for w in ['آجل', 'اجل', 'جزئي', 'credit', 'partial'])
    raw_paid_val = data.get('paid_amount') if data.get('paid_amount') is not None else data.get('paid')
    if raw_paid_val is None or raw_paid_val == '':
        paid_amt = Decimal('0.0000') if is_partial else tot_amt
    else:
        paid_amt = _d(raw_paid_val)
    if paid_amt < 0:
        raise ValueError("المبلغ المستلم لا يمكن أن يكون قيمة سالبة")
    if is_partial and paid_amt > tot_amt:
        raise ValueError("المبلغ المستلم مقدماً لا يمكن أن يتجاوز صافي الفاتورة")
    paid_amt = min(tot_amt, paid_amt)
    if any(w in pm_low for w in ['بنك', 'شبك', 'تحويل', 'كريمي', 'bank', 'card']):
        return Decimal('0.0000'), paid_amt, None, None
    return paid_amt, Decimal('0.0000'), None, None


def is_pos_payload(data):
    """Detects if order payload is an immediate POS/Ready-made sale."""
    if not isinstance(data, dict): return False
    o_type = str(data.get('order_type') or '').lower()
    o_no = str(data.get('order_no') or '')
    p_type = str(data.get('production_type') or '').lower()
    return (
        data.get('is_pos') is True or
        o_type in ('pos', 'ready_made', 'ready', 'point_of_sale') or
        o_no.startswith('POS-') or
        data.get('source') == 'POS' or
        data.get('order_mode') == 'pos' or
        p_type == 'pos'
    )


def process_pos_sale_atomic(cur, data, resolved_user='admin'):
    """Executes atomic POS checkout supporting product_variants, gift wrap, discount, and split payment."""
    ensure_ready_products_schema(cur)
    order_date = clean_str(data.get('order_date') or data.get('date')) or today_str()
    assert_period_open(cur, order_date)

    order_no = clean_str(data.get('order_no'))
    if not order_no or not order_no.startswith('POS-'):
        order_no = get_next_sequence_number(cur, 'POS', fallback_prefix='POS-')
    order_id = clean_str(data.get('id') or data.get('order_id')) or order_no

    cust_id = clean_str(data.get('customer_id') or 'CUST-GENERAL')
    c_name = clean_str(data.get('customer_name') or 'عميل عام (POS)')
    curr = clean_str(data.get('currency') or 'YER')
    rate = _d(resolve_exchange_rate(cur, curr, data.get('exchange_rate') or 1.0))
    pay_method = clean_str(data.get('payment_method') or 'نقد (كاش)')

    items = data.get('items') or []
    if not items and data.get('product_id'):
        items = [{'product_id': data.get('product_id'), 'variant_id': data.get('variant_id'), 'product_name': data.get('product_name') or 'صنف POS', 'quantity': clean_num(data.get('qty') or 1.0), 'unit_price': clean_num(data.get('total_amount') or data.get('total') or 0), 'total_price': clean_num(data.get('total_amount') or data.get('total') or 0)}]

    items, subtotal, discount, gift_wrap, gift_wrap_fee, tot_amt = resolve_pos_pricing(cur, items, data)
    paid_cash, paid_bank, bank_acc_id, split_json = _resolve_split_amounts(data, tot_amt, pay_method)
    paid_amt = paid_cash + paid_bank
    rem_amt = max(Decimal('0.0000'), tot_amt - paid_amt)
    if rem_amt > 0 and cust_id == 'CUST-GENERAL':
        raise ValueError("لا يمكن إتمام بيع آجل أو جزئي على عميل عام، يرجى اختيار عميل مسجل")
    pay_status = 'Paid' if rem_amt == 0 and tot_amt > 0 else ('Partial' if paid_amt > 0 else 'Unpaid')
    notes = clean_str(data.get('notes') or f"مبيعات فورية كاشير {order_no}")
    user_fk_id = resolve_active_user_id(cur, resolved_user)
    cur.execute("INSERT INTO public.customers (id, name, phone, category, status) VALUES ('CUST-GENERAL', 'عميل عام (POS)', '967000000000', 'عام', 'Active') ON CONFLICT (id) DO NOTHING;")

    wh_ref = clean_str(data.get('warehouse_id') or data.get('warehouse') or 'WH-SHOWROOM')
    cur.execute("SELECT id, account_id FROM public.warehouses WHERE id = %s OR code = %s LIMIT 1;", (wh_ref, wh_ref))
    wh_row = cur.fetchone() or (cur.execute("SELECT id, account_id FROM public.warehouses WHERE id IN ('WH-SHOWROOM','WH-MAIN') OR code = 'WH-SHOWROOM' LIMIT 1;") or cur.fetchone())
    wh_id = wh_row['id'] if wh_row else 'WH-SHOWROOM'
    wh_acc = resolve_leaf_account(cur, wh_row.get('account_id') if wh_row else 'ACC-105-03', 'YER')

    first_var = next((itm.get('variant_id') for itm in items if itm.get('variant_id')), None)
    cur.execute("""
        INSERT INTO public.orders (id, order_no, customer_id, variant_id, order_date, delivery_date, currency, exchange_rate, subtotal, discount, tax, total_amount, paid_amount, base_amount, payment_status, production_status, status, payment_method, gift_wrap, gift_wrap_fee, split_payment_details, notes, created_by, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0.0, %s, %s, %s, %s, 'Delivered', 'Delivered', %s, %s, %s, %s::jsonb, %s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET total_amount = EXCLUDED.total_amount, paid_amount = EXCLUDED.paid_amount, updated_at = CURRENT_TIMESTAMP RETURNING *;
    """, (order_id, order_no, cust_id, first_var, order_date, order_date, curr, rate, subtotal, discount, tot_amt, paid_amt, (tot_amt * rate).quantize(DEC_4), pay_status, pay_method, gift_wrap, gift_wrap_fee, json.dumps(split_json, ensure_ascii=False) if split_json else None, notes, user_fk_id))
    res = dict(cur.fetchone())

    total_cogs = Decimal('0.0000')
    for itm in items:
        var_id = clean_str(itm.get('variant_id')) or None
        p_id = clean_str(itm.get('product_id') or itm.get('inventory_id') or itm.get('id'))
        p_name = clean_str(itm.get('product_name') or itm.get('name') or 'صنف مبيعات')
        qty = itm.get('_qty') or max(Decimal('1.0000'), _d(itm.get('quantity') or itm.get('qty') or 1))
        u_price = itm.get('_unit_price') if itm.get('_unit_price') is not None else _d(itm.get('unit_price') or itm.get('price') or 0)
        t_price = itm.get('_total_price') if itm.get('_total_price') is not None else (qty * u_price).quantize(DEC_4, rounding=ROUND_HALF_UP)
        itm_id = itm.get('id') or itm.get('order_item_id') or generate_id("OITM")

        valid_prod_id = None
        if p_id:
            cur.execute("SELECT id FROM public.products WHERE id = %s LIMIT 1;", (p_id,))
            p_chk = cur.fetchone()
            if p_chk: valid_prod_id = p_chk['id']

        v_row = None
        if var_id:
            cur.execute("SELECT * FROM public.product_variants WHERE id = %s LIMIT 1 FOR UPDATE;", (var_id,))
            v_row = cur.fetchone()
            if not v_row:
                raise ValueError(f"المقاس / المتغير غير موجود: {var_id}")
            if _d(v_row['stock_qty']) < qty:
                raise ValueError(f"نفد الرصيد المطلوب للمقاس [{v_row['age_size']}]: المتوفر ({float(v_row['stock_qty']):g}) والمطلوب ({float(qty):g}).")
            p_id = v_row['inventory_id']
            wh_id = v_row.get('warehouse_id') or wh_id
            cur.execute("SELECT id, account_id FROM public.warehouses WHERE id = %s LIMIT 1;", (wh_id,))
            w_override = cur.fetchone()
            if w_override and w_override.get('account_id'):
                wh_acc = resolve_leaf_account(cur, w_override['account_id'], 'YER')

        cur.execute("SELECT id, item_code, name, unit_cost, quantity FROM public.inventory WHERE id = %s OR item_code = %s OR name = %s LIMIT 1 FOR UPDATE;", (p_id, p_id, p_name))
        inv_row = cur.fetchone()

        item_unit_cost = _d(v_row['cost_price']) if v_row else (_d(inv_row.get('unit_cost') or 0) if inv_row else Decimal('0.0000'))
        age_sz = (v_row.get('age_size') if v_row else clean_str(itm.get('age_size'))) or None
        col_nm = (v_row.get('color_name') if v_row else clean_str(itm.get('color_name') or itm.get('selected_color'))) or None
        sku_v = (v_row.get('sku') if v_row else clean_str(itm.get('sku'))) or None
        bc_v = (v_row.get('barcode') if v_row else clean_str(itm.get('barcode'))) or None

        cur.execute("""
            INSERT INTO public.order_items (
                id, order_id, product_id, variant_id, age_size, color_name, selected_color, sku, barcode,
                product_name, quantity, unit_price, cost_price, total_price, total_amount, paid_amount, remaining_amount, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0.0, %s)
            ON CONFLICT (id) DO NOTHING;
        """, (itm_id, order_id, valid_prod_id, var_id, age_sz, col_nm, col_nm, sku_v, bc_v, p_name, qty, u_price, item_unit_cost, t_price, t_price, t_price, notes))

        if inv_row:
            real_inv_id = inv_row['id']
            cur.execute("SELECT id, quantity FROM public.warehouse_stock WHERE warehouse_id = %s AND inventory_id = %s LIMIT 1 FOR UPDATE;", (wh_id, real_inv_id))
            ws_row = cur.fetchone()
            avail_stock = _d(ws_row['quantity']) if ws_row else _d(inv_row.get('quantity') or 0)
            if avail_stock < qty:
                raise ValueError(f"محظور تشغيلياً (الدرع 4): المخزون السالب غير مسموح به! الصنف [{p_name}] المتوفر ({float(avail_stock):g}) والمطلوب ({float(qty):g}).")

            if v_row:
                cur.execute("UPDATE public.product_variants SET stock_qty = stock_qty - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (qty, var_id))
            if ws_row:
                cur.execute("UPDATE public.warehouse_stock SET quantity = quantity - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (qty, ws_row['id']))
            cur.execute("UPDATE public.inventory SET quantity = quantity - %s, status = CASE WHEN (quantity - %s) <= 0 THEN 'OutOfStock' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (qty, qty, real_inv_id))

            _sync_inventory_avg_cost(cur, real_inv_id, inv_row['quantity'], inv_row['unit_cost'], qty, item_unit_cost)

            tx_id = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='ITXN-')
            line_cogs = (qty * item_unit_cost).quantize(DEC_4, rounding=ROUND_HALF_UP)
            cur.execute("""
                INSERT INTO public.inventory_transactions (id, inventory_id, variant_id, warehouse_id, transaction_type, quantity, unit_cost, reference_id, reference_type, notes, created_by, created_at)
                VALUES (%s, %s, %s, %s, 'POS_SALE', %s, %s, %s, 'orders', %s, %s, CURRENT_TIMESTAMP);
            """, (tx_id, real_inv_id, var_id, wh_id, -abs(qty), item_unit_cost, order_id, f"صرف مبيعات POS {order_no} ({age_sz or ''})".strip(), user_fk_id))
            total_cogs += line_cogs

    jv_info = post_pos_journal_entries(cur, {
        'order_id': order_id, 'order_no': order_no, 'order_date': order_date, 'cust_id': cust_id, 'c_name': c_name,
        'curr': curr, 'rate': rate, 'tot_amt': tot_amt, 'paid_cash': paid_cash, 'paid_bank': paid_bank,
        'bank_account_id': bank_acc_id, 'total_cogs': total_cogs, 'wh_acc': wh_acc, 'notes': notes
    })
    log_audit_event('orders', order_id, 'INSERT', user_id=resolved_user, document_no=order_no, details=f"عملية بيع POS {order_no} بمبلغ {float(tot_amt)} {curr} وتكلفة {float(total_cogs)} YER", cur=cur)
    res.update({'order_no': order_no, 'id': order_id, 'cogs_amount': float(total_cogs), 'status': 'Delivered', 'is_pos': True, **jv_info})
    for k in ('created_at', 'updated_at', 'order_date', 'delivery_date'):
        if res.get(k): res[k] = str(res[k])
    return res
