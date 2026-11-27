# services/pg/pg_pos_return.py
# Atomic POS Sales Return: Variant/Warehouse Stock Restoration + Balanced Reversal Journals

import json
import logging
from decimal import Decimal, ROUND_HALF_UP
from .db_pool import get_db_cursor, clean_str, generate_id, today_str
from .pg_sequences import get_next_sequence_number
from .account_resolver import resolve_receiving_account, resolve_cash_account_by_currency, resolve_bank_account_by_currency, resolve_leaf_account
from .pg_delivery_cogs import refresh_chart_balances_atomic
from .journal_lines_helper import insert_sorted_journal_lines
from .pg_pos import _sync_inventory_avg_cost
from .pg_audit import log_audit_event, resolve_active_user_id
from services.security import assert_period_open

logger = logging.getLogger("LittlePrincesses_PG_POSReturn")
DEC_4 = Decimal('0.0001')


def _d(val):
    return Decimal(str(val if val not in (None, '') else 0)).quantize(DEC_4, rounding=ROUND_HALF_UP)


def _resolve_account_dynamic(cur, kind):
    """Resolves revenue/returns, receivables, or COGS account dynamically from public.accounts."""
    queries = {
        'rev': "SELECT id FROM public.accounts WHERE is_postable = TRUE AND is_active = TRUE AND (account_code LIKE '4%%' OR account_type IN ('إيرادات', 'Revenue')) ORDER BY CASE WHEN account_name ILIKE '%%مرتجع%%' THEN 0 WHEN account_code = '401' OR account_category ILIKE 'Sales' THEN 1 ELSE 2 END, level DESC, account_code ASC LIMIT 1;",
        'ar': "SELECT id FROM public.accounts WHERE is_postable = TRUE AND is_active = TRUE AND (account_category ILIKE 'Receivables' OR account_code = '104' OR account_name ILIKE '%%ذمم العملاء%%' OR account_name ILIKE '%%عملاء%%') ORDER BY CASE WHEN account_code = '104' THEN 0 ELSE 1 END, level DESC, account_code ASC LIMIT 1;",
        'cogs': "SELECT id FROM public.accounts WHERE is_postable = TRUE AND is_active = TRUE AND (account_code LIKE '504%%' OR account_category ILIKE '%%COGS%%' OR account_name ILIKE '%%تكلفة%%') ORDER BY CASE WHEN account_code = '504' THEN 0 ELSE 1 END, level DESC, account_code ASC LIMIT 1;"
    }
    cur.execute(queries[kind])
    row = cur.fetchone()
    if not row:
        raise ValueError(f"لا يوجد حساب فعال في دليل الحسابات ({kind})")
    return resolve_leaf_account(cur, row['id'], 'YER')


def _resolve_refund_splits(cur, order, paid_amt, pay_method, curr):
    """Determines exact cash/bank accounts to credit back for the paid portion of the POS invoice."""
    if paid_amt <= 0:
        return []
    cur.execute("SELECT account_id, COALESCE(SUM(amount), 0) AS amt FROM public.payments WHERE order_id = %s AND payment_type IN ('Receipt', 'سند_قبض') AND status = 'Confirmed' GROUP BY account_id ORDER BY amt DESC;", (order['id'],))
    splits = [(resolve_leaf_account(cur, r['account_id'], 'YER'), _d(r['amt'])) for r in cur.fetchall() if _d(r['amt']) > 0]
    if not splits:
        raw_split = order.get('split_payment_details') or {}
        if isinstance(raw_split, str):
            try: raw_split = json.loads(raw_split)
            except Exception: raw_split = {}
        if isinstance(raw_split, dict) and (raw_split.get('cash') or raw_split.get('bank')):
            c_amt, b_amt = _d(raw_split.get('cash') or 0), _d(raw_split.get('bank') or 0)
            if c_amt > 0: splits.append((resolve_leaf_account(cur, resolve_cash_account_by_currency(cur, curr), 'YER'), c_amt))
            if b_amt > 0: splits.append((resolve_leaf_account(cur, raw_split.get('bank_account_id') or resolve_bank_account_by_currency(cur, curr), 'YER'), b_amt))
    prim_acc = resolve_leaf_account(cur, resolve_receiving_account(cur, pay_method, curr), 'YER')
    if not splits:
        return [(prim_acc, paid_amt)]
    diff = (paid_amt - sum((a for _, a in splits), Decimal('0.0000'))).quantize(DEC_4, rounding=ROUND_HALF_UP)
    if diff != 0:
        merged = {}
        for acc, amt in splits:
            merged[acc] = merged.get(acc, Decimal('0.0000')) + amt
        merged[prim_acc] = max(Decimal('0.0000'), merged.get(prim_acc, Decimal('0.0000')) + diff)
        splits = [(k, v) for k, v in merged.items() if v > 0]
    return splits


def _restore_pos_items_stock(cur, order_id, order_no, user_fk_id):
    """Restores variant, warehouse_stock, and inventory quantities and logs RETURN_IN movements."""
    cur.execute("SELECT * FROM public.order_items WHERE order_id = %s ORDER BY id ASC FOR UPDATE;", (order_id,))
    items = cur.fetchall()
    cur.execute("SELECT inventory_id, variant_id, warehouse_id, quantity, unit_cost FROM public.inventory_transactions WHERE reference_id = %s AND reference_type = 'orders' AND transaction_type = 'POS_SALE';", (order_id,))
    sale_txns = cur.fetchall()
    if not items and sale_txns:
        items = [{'variant_id': t['variant_id'], 'product_id': t['inventory_id'], 'quantity': abs(_d(t['quantity'])), 'cost_price': t['unit_cost'], 'age_size': ''} for t in sale_txns]

    wh_cogs_map, total_cogs = {}, Decimal('0.0000')
    for oi in items:
        qty = _d(oi.get('quantity') or 0)
        if qty <= 0:
            continue
        var_id, inv_id, wh_id = oi.get('variant_id'), None, None
        u_cost = _d(oi.get('cost_price') or 0)
        if var_id:
            cur.execute("SELECT * FROM public.product_variants WHERE id = %s LIMIT 1 FOR UPDATE;", (var_id,))
            v_row = cur.fetchone()
            if v_row:
                inv_id, wh_id = v_row['inventory_id'], v_row.get('warehouse_id') or 'WH-SHOWROOM'
                if u_cost <= 0: u_cost = _d(v_row.get('cost_price') or 0)
                cur.execute("UPDATE public.product_variants SET stock_qty = stock_qty + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (qty, var_id))
        if not inv_id:
            match_t = next((t for t in sale_txns if (var_id and t.get('variant_id') == var_id) or not var_id), None)
            inv_id = (match_t.get('inventory_id') if match_t else None) or oi.get('product_id')
            wh_id = (match_t.get('warehouse_id') if match_t else None) or 'WH-SHOWROOM'
            if u_cost <= 0 and match_t: u_cost = _d(match_t.get('unit_cost') or 0)
        wh_id = wh_id or 'WH-SHOWROOM'
        cur.execute("SELECT id, account_id FROM public.warehouses WHERE id = %s OR code = %s LIMIT 1;", (wh_id, wh_id))
        wh_row = cur.fetchone()
        wh_acc = resolve_leaf_account(cur, (wh_row.get('account_id') if wh_row else None) or 'ACC-105-03', 'YER')

        if inv_id:
            cur.execute("SELECT id, quantity, unit_cost FROM public.inventory WHERE id = %s LIMIT 1 FOR UPDATE;", (inv_id,))
            inv_row = cur.fetchone()
            if inv_row:
                if u_cost <= 0: u_cost = _d(inv_row.get('unit_cost') or 0)
                cur.execute("INSERT INTO public.warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at) VALUES (%s, %s, %s, %s, 0.0, CURRENT_TIMESTAMP) ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP;", (f"WS-{inv_id}-{wh_id}", wh_id, inv_id, qty))
                cur.execute("UPDATE public.inventory SET quantity = quantity + %s, status = 'Available', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (qty, inv_id))
                _sync_inventory_avg_cost(cur, inv_id, inv_row['quantity'], inv_row['unit_cost'], 0, 0)
                tx_id = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='INV-TXN-')
                cur.execute("INSERT INTO public.inventory_transactions (id, inventory_id, variant_id, warehouse_id, transaction_type, quantity, unit_cost, reference_id, reference_type, notes, created_by, created_at) VALUES (%s, %s, %s, %s, 'RETURN_IN', %s, %s, %s, 'orders', %s, %s, CURRENT_TIMESTAMP);", (tx_id, inv_id, var_id, wh_id, qty, u_cost, order_id, f"مرتجع مبيعات POS {order_no} ({oi.get('age_size') or ''})".strip(), user_fk_id))
        line_cost = (qty * u_cost).quantize(DEC_4, rounding=ROUND_HALF_UP)
        if line_cost > 0:
            wh_cogs_map[wh_acc] = wh_cogs_map.get(wh_acc, Decimal('0.0000')) + line_cost
            total_cogs += line_cost
    return wh_cogs_map, total_cogs


def _insert_balanced_entry(cur, jv_no, j_date, desc, dr_main, cr_main, amt, base_amt, ref_type, ref_id, curr, rate, notes, user_fk_id, lines):
    sum_dr = sum((x[2] for x in lines), Decimal('0.0000'))
    sum_cr = sum((x[3] for x in lines), Decimal('0.0000'))
    sum_dr_b = sum((x[4] for x in lines), Decimal('0.0000'))
    sum_cr_b = sum((x[5] for x in lines), Decimal('0.0000'))
    if sum_dr != sum_cr or sum_dr_b != sum_cr_b:
        raise ValueError(f"فشل توازن قيد مرتجع POS ({jv_no}): المدين {sum_dr_b} != الدائن {sum_cr_b}")
    jv_id = generate_id("JV")
    cur.execute("INSERT INTO public.journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Posted', %s, %s);",
                (jv_id, jv_no, j_date, desc, dr_main, cr_main, amt, amt, base_amt, ref_type, ref_id, curr, rate, notes, user_fk_id))
    insert_sorted_journal_lines(cur, jv_id, lines)
    return jv_no


def return_pos_order_atomic(order_ref, payload=None):
    """Executes atomic POS sales return: restores stock, posts reversal revenue & COGS entries, updates order & audit log."""
    data = (payload or {}).get('data') or (payload or {})
    ref = clean_str(order_ref or data.get('order_id') or data.get('order_no'))
    if not ref:
        raise ValueError("رقم فاتورة نقاط البيع مطلوب لإتمام المرتجع")
    reason = clean_str(data.get('reason') or data.get('notes') or 'مرتجع مبيعات نقاط البيع')
    return_date = clean_str(data.get('return_date') or data.get('date')) or today_str()
    raw_uid = clean_str(data.get('user_id') or data.get('created_by') or '')

    with get_db_cursor(commit=True) as cur:
        assert_period_open(cur, return_date)
        user_fk_id = resolve_active_user_id(cur, raw_uid)
        cur.execute("SELECT * FROM public.orders WHERE id = %s OR order_no = %s LIMIT 1 FOR UPDATE;", (ref, ref))
        order = cur.fetchone()
        if not order:
            raise ValueError(f"فاتورة نقاط البيع غير موجودة: {ref}")
        order_id, order_no = order['id'], order.get('order_no') or order['id']

        cur.execute("SELECT 1 FROM public.journal_entries WHERE ref_type = 'POSSale' AND ref_id = %s LIMIT 1;", (order_id,))
        is_pos = str(order_no).upper().startswith('POS-') or str(order_id).upper().startswith('POS-') or bool(cur.fetchone())
        if not is_pos:
            raise ValueError(f"الفاتورة {order_no} ليست فاتورة نقطة بيع (POS)")

        st_l, pst_l = str(order.get('status') or '').strip().lower(), str(order.get('production_status') or '').strip().lower()
        cur.execute("SELECT id FROM public.journal_entries WHERE ref_type = 'POSReturn' AND ref_id = %s AND status = 'Posted' LIMIT 1;", (order_id,))
        if st_l in ('returned', 'مرتجع', 'مرتجعة') or pst_l in ('returned', 'مرتجع', 'مرتجعة') or cur.fetchone():
            raise ValueError(f"الفاتورة {order_no} تم إرجاعها مسبقاً ولا يمكن تكرار المرتجع")

        wh_cogs_map, total_cogs = _restore_pos_items_stock(cur, order_id, order_no, user_fk_id)
        tot_amt = _d(order.get('total_amount') or 0)
        paid_amt = min(tot_amt, max(Decimal('0.0000'), _d(order.get('paid_amount') or 0)))
        rem_amt = max(Decimal('0.0000'), tot_amt - paid_amt)
        curr, rate = clean_str(order.get('currency') or 'YER'), _d(order.get('exchange_rate') or 1.0)
        base_tot = (tot_amt * rate).quantize(DEC_4, rounding=ROUND_HALF_UP)

        rev_acc, ar_acc = _resolve_account_dynamic(cur, 'rev'), _resolve_account_dynamic(cur, 'ar')
        refund_splits = _resolve_refund_splits(cur, order, paid_amt, order.get('payment_method'), curr)
        cust_name = 'عميل عام (POS)'
        if order.get('customer_id'):
            cur.execute("SELECT name FROM public.customers WHERE id = %s LIMIT 1;", (order['customer_id'],))
            crow = cur.fetchone()
            if crow and crow.get('name'):
                cust_name = crow['name']

        jv_ret_no = None
        if tot_amt > 0:
            rev_lines = [(rev_acc, f"مدين - عكس إيراد/مرتجع مبيعات {order_no}", tot_amt, Decimal('0.0000'), base_tot, Decimal('0.0000'))]
            acc_base_cr = Decimal('0.0000')
            for ref_acc, ref_amt in refund_splits:
                ref_base = (ref_amt * rate).quantize(DEC_4, rounding=ROUND_HALF_UP)
                acc_base_cr += ref_base
                rev_lines.append((ref_acc, f"دائن - رد مبلغ مبيعات مرتجعة {order_no}", Decimal('0.0000'), ref_amt, Decimal('0.0000'), ref_base))
                pv_no = get_next_sequence_number(cur, 'PV', fallback_prefix='PV-')
                cur.execute("INSERT INTO public.payments (id, payment_no, order_id, customer_id, payment_type, amount, currency, exchange_rate, base_amount, payment_method, reference_no, account_id, date, status, notes, party_name, target_account_id, created_by) VALUES (%s, %s, %s, %s, 'Payment', %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, %s, %s);",
                            (pv_no, pv_no, order_id, order['customer_id'], ref_amt, curr, rate, ref_base, order.get('payment_method') or 'نقد (كاش)', order_no, ref_acc, return_date, f"صرف مرتجع مبيعات POS {order_no}: {reason}", cust_name, rev_acc, user_fk_id))
            if rem_amt > 0:
                base_rem = (base_tot - acc_base_cr).quantize(DEC_4, rounding=ROUND_HALF_UP)
                rev_lines.append((ar_acc, f"دائن - عكس ذمة عميل لمرتجع {order_no}", Decimal('0.0000'), rem_amt, Decimal('0.0000'), base_rem))
            elif base_tot != acc_base_cr and len(rev_lines) > 1:
                last = rev_lines[-1]
                rev_lines[-1] = (last[0], last[1], last[2], last[3], last[4], last[5] + (base_tot - acc_base_cr))
            cr_main = refund_splits[0][0] if refund_splits else ar_acc
            jv_ret_no = _insert_balanced_entry(cur, get_next_sequence_number(cur, 'JV', fallback_prefix='JV-'), return_date, f"قيد مرتجع مبيعات POS {order_no} ({reason})", rev_acc, cr_main, tot_amt, base_tot, 'POSReturn', order_id, curr, rate, reason, user_fk_id, rev_lines)

        if rem_amt > 0 and order.get('customer_id') and order['customer_id'] != 'CUST-GENERAL':
            cur.execute("UPDATE public.customers SET current_balance = GREATEST(0.0, COALESCE(current_balance, 0.0) - %s), updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (rem_amt, order['customer_id']))

        jv_cogs_no = None
        if total_cogs > 0:
            cogs_acc = _resolve_account_dynamic(cur, 'cogs')
            cogs_lines = [(wh_acc, f"مدين - استرداد تكلفة مخزون مرتجع {order_no}", c_amt, Decimal('0.0000'), c_amt, Decimal('0.0000')) for wh_acc, c_amt in wh_cogs_map.items()]
            cogs_lines.append((cogs_acc, f"دائن - عكس تكلفة المبيعات COGS لمرتجع {order_no}", Decimal('0.0000'), total_cogs, Decimal('0.0000'), total_cogs))
            dr_wh = next(iter(wh_cogs_map.keys()))
            jv_cogs_no = _insert_balanced_entry(cur, get_next_sequence_number(cur, 'JV', fallback_prefix='JV-'), return_date, f"عكس تكلفة البضاعة المباعة لمرتجع POS {order_no}", dr_wh, cogs_acc, total_cogs, total_cogs, 'POSReturnCOGS', order_id, 'YER', Decimal('1.0000'), f"عكس COGS {order_no}", user_fk_id, cogs_lines)

        cur.execute("UPDATE public.orders SET status = 'Returned', production_status = 'Returned', notes = COALESCE(notes, '') || %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (f" | مرتجع مبيعات ({return_date}): {reason}", order_id))
        refresh_chart_balances_atomic(cur)
        log_audit_event('orders', order_id, 'POS_RETURN', old_values={'status': order.get('status'), 'total_amount': float(tot_amt)}, new_values={'status': 'Returned', 'jv_return_no': jv_ret_no, 'jv_cogs_no': jv_cogs_no}, user_id=user_fk_id, document_no=order_no, details=f"مرتجع مبيعات POS {order_no} بمبلغ {float(tot_amt)} {curr} وتكلفة {float(total_cogs)} YER", cur=cur)

        return {"success": True, "order_id": order_id, "order_no": order_no, "status": "Returned", "refund_amount": float(paid_amt), "ar_reversed": float(rem_amt), "cogs_reversed": float(total_cogs), "jv_return_no": jv_ret_no, "jv_cogs_no": jv_cogs_no, "message": f"تم اعتماد مرتجع المبيعات للفاتورة {order_no} وإرجاع المخزون وعكس القيود بنجاح ↩️✅"}
