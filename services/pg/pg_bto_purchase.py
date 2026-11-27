# services/pg/pg_bto_purchase.py
# Direct-to-WIP Buy-To-Order (BTO) Purchase, Leftover Return & Late BOM Material Issue
# Architectural Standards: Strictly <= 220 lines

import json
from decimal import Decimal, ROUND_HALF_UP
from .db_pool import get_db_cursor, clean_str, to_decimal, generate_id
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, get_active_user_context
from .journal_lines_helper import insert_sorted_journal_lines
from .pg_delivery_cogs import refresh_chart_balances_atomic
from .pg_wip_accounting import resolve_wip_account
from .account_resolver import resolve_leaf_account
from .pg_factory_fabric import resolve_operating_warehouse, deduct_fabrics_batch
from .pg_tailoring_engine import guard_production_order_ready_for_work
from .uom_service import convert_uom
from services.security import assert_period_open, WorkflowGuardError

DEC_4 = Decimal('0.0001')


def _q4(val):
    return to_decimal(val).quantize(DEC_4, rounding=ROUND_HALF_UP)


def _lock_po(cur, po_id):
    cur.execute("""
        SELECT * FROM public.production_orders
        WHERE id = %s OR production_order_no = %s OR order_id = %s
        LIMIT 1 FOR UPDATE;
    """, (po_id, po_id, po_id))
    po = cur.fetchone()
    if not po:
        raise ValueError(f"أمر التشغيل [{po_id}] غير موجود")
    return po


def _resolve_bto_credit_account(cur, raw_acc_id):
    acc_id = resolve_leaf_account(cur, clean_str(raw_acc_id), 'YER')
    cur.execute("""
        SELECT id, account_code, account_name, is_postable
        FROM public.chart_of_accounts
        WHERE id = %s OR account_code = %s LIMIT 1;
    """, (acc_id, acc_id))
    row = cur.fetchone()
    if not row or not row.get('is_postable'):
        raise ValueError("حساب الدفع أو المورد المحدد غير صالح أو غير قابل للترحيل")
    code = str(row.get('account_code') or '')
    if not (code.startswith('101') or code.startswith('102') or code.startswith('201')):
        raise ValueError("يجب أن يكون حساب الدفع صندوقاً (101) أو بنكاً (102) أو ذمم موردين (201)")
    return row['id'], row['account_name']


def _append_fabrics_data(existing_raw, new_entry):
    items = list(existing_raw) if isinstance(existing_raw, list) else []
    items.append(new_entry)
    return json.dumps(items, ensure_ascii=False)


def record_bto_purchase(po_id, payload):
    data = payload.get('data') if isinstance(payload.get('data'), dict) else (payload or {})
    desc = clean_str(data.get('fabric_description'))
    qty = _q4(data.get('quantity') or 0)
    unit = clean_str(data.get('unit') or 'meter')
    cost = _q4(data.get('total_cost') or 0)
    pay_acc_raw = clean_str(data.get('payment_account_id'))
    supplier_id = clean_str(data.get('supplier_id')) or None
    invoice_ref = clean_str(data.get('invoice_ref')) or None
    notes = clean_str(data.get('notes')) or ''
    if not desc or qty <= 0 or cost <= 0 or not pay_acc_raw:
        raise ValueError("بيانات الشراء المباشر (fabric_description, quantity > 0, total_cost > 0, payment_account_id) مطلوبة")

    uid = get_active_user_context('admin')
    with get_db_cursor(commit=True) as cur:
        assert_period_open(cur, clean_str(data.get('purchase_date')) or None)
        po = _lock_po(cur, po_id)
        if clean_str(po.get('status')) in ('Completed', 'Delivered', 'Cancelled'):
            raise WorkflowGuardError("لا يمكن تسجيل شراء مباشر على أمر تشغيل مغلق أو مسلّم")

        cr_acc, cr_name = _resolve_bto_credit_account(cur, pay_acc_raw)
        wip_acc = resolve_leaf_account(cur, resolve_wip_account(cur, 'ACC-105-05'), 'YER')
        jv_id, jv_no = generate_id('JV'), get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
        jv_desc = f"شراء مباشر BTO ({desc}) لأمر تشغيل {po['production_order_no']}"
        cost_f = float(cost)
        cur.execute("""
            INSERT INTO public.journal_entries (
                id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by
            ) VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'BTO_PURCHASE', %s, 'YER', 1.0, 'Posted', %s, %s);
        """, (jv_id, jv_no, jv_desc, wip_acc, cr_acc, cost_f, cost_f, cost_f, po['id'], notes or jv_desc, uid))
        insert_sorted_journal_lines(cur, jv_id, [
            (wip_acc, f"مدين - خامات شراء مباشر BTO ({desc}) إلى WIP", cost_f, 0.0, cost_f, 0.0),
            (cr_acc, f"دائن - {cr_name} ({invoice_ref or po['production_order_no']})", 0.0, cost_f, 0.0, cost_f),
        ])
        refresh_chart_balances_atomic(cur)

        bto_item = {
            'source': 'BUY_TO_ORDER', 'fabric_description': desc, 'quantity': float(qty),
            'unit': unit, 'total_cost': cost_f, 'supplier_id': supplier_id,
            'invoice_ref': invoice_ref, 'entry_no': jv_no, 'notes': notes,
        }
        new_fab_json = _append_fabrics_data(po.get('fabrics_data'), bto_item)
        next_status = 'In Progress' if clean_str(po.get('status')) == 'AWAITING_MATERIAL' else po.get('status')
        next_stage = 'القص والتحضير' if clean_str(po.get('status')) == 'AWAITING_MATERIAL' else po.get('stage')

        cur.execute("""
            UPDATE public.production_orders
            SET wip_material_cost = COALESCE(wip_material_cost, 0.0) + %s,
                fabrics_data = %s::jsonb, status = %s, stage = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING wip_material_cost, status, stage;
        """, (cost_f, new_fab_json, next_status, next_stage, po['id']))
        upd = cur.fetchone()
        log_audit_event('production_orders', po['id'], 'BTO_PURCHASE', user_id=uid, document_no=jv_no,
                        new_values={'entry_no': jv_no, 'total_cost': cost_f, 'wip_material_cost': float(upd['wip_material_cost'])},
                        details=jv_desc, cur=cur)
        return {'success': True, 'entry_no': jv_no, 'production_order_id': po['id'], 'wip_material_cost': float(upd['wip_material_cost']), 'status': upd['status'], 'stage': upd['stage']}


def return_bto_leftover(po_id, payload):
    data = payload.get('data') if isinstance(payload.get('data'), dict) else (payload or {})
    inv_id_in = clean_str(data.get('inventory_id') or data.get('fabric_id') or data.get('item_id'))
    qty = _q4(data.get('quantity') or 0)
    unit = clean_str(data.get('unit') or 'meter')
    val = _q4(data.get('leftover_value') or 0)
    if not inv_id_in or qty <= 0 or val <= 0:
        raise ValueError("بيانات ترجيع الفائض (inventory_id, quantity > 0, leftover_value > 0) مطلوبة")

    uid = get_active_user_context('admin')
    with get_db_cursor(commit=True) as cur:
        assert_period_open(cur, clean_str(data.get('return_date')) or None)
        po = _lock_po(cur, po_id)
        cur_wip = _q4(po.get('wip_material_cost') or 0)
        if cur_wip < val:
            raise ValueError(f"قيمة الفائض المرتجع ({float(val)}) تتجاوز رصيد خامات WIP الحالي ({float(cur_wip)})")

        wh_id, wh_name = resolve_operating_warehouse(cur, 'WH-WORKSHOP')
        cur.execute("SELECT account_id FROM public.warehouses WHERE id = %s LIMIT 1;", (wh_id,))
        wh_acc = resolve_leaf_account(cur, (cur.fetchone() or {}).get('account_id') or 'ACC-105-02', 'YER')
        wip_acc = resolve_leaf_account(cur, resolve_wip_account(cur, 'ACC-105-05'), 'YER')

        cur.execute("SELECT id, name, unit FROM public.inventory WHERE id = %s OR item_code = %s LIMIT 1 FOR UPDATE;", (inv_id_in, inv_id_in))
        inv = cur.fetchone()
        if not inv:
            raise ValueError(f"صنف المستودع [{inv_id_in}] غير موجود")
        stock_qty = _q4(convert_uom(float(qty), unit, clean_str(inv.get('unit') or 'meter')))
        unit_cost = (val / stock_qty).quantize(DEC_4, rounding=ROUND_HALF_UP)

        cur.execute("SELECT id FROM public.warehouse_stock WHERE warehouse_id = %s AND inventory_id = %s LIMIT 1 FOR UPDATE;", (wh_id, inv['id']))
        cur.execute("""
            INSERT INTO public.warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at)
            VALUES (%s, %s, %s, %s, 0.0, CURRENT_TIMESTAMP)
            ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP;
        """, (f"WS-{inv['id']}-{wh_id}", wh_id, inv['id'], float(stock_qty)))
        cur.execute("UPDATE public.inventory SET quantity = quantity + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (float(stock_qty), inv['id']))

        tx_id = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='ITXN-')
        cur.execute("""
            INSERT INTO public.inventory_transactions (id, inventory_id, fabric_id, warehouse_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_by, created_at)
            VALUES (%s, %s, %s, %s, 'BTO_LEFTOVER_RETURN', %s, %s, 'production_orders', %s, %s, %s, CURRENT_TIMESTAMP);
        """, (tx_id, inv['id'], inv['id'], wh_id, float(stock_qty), float(unit_cost), po['id'], f"ترجيع فائض BTO من أمر {po['production_order_no']} إلى [{wh_name}]", uid))

        jv_id, jv_no = generate_id('JV'), get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
        val_f = float(val)
        cur.execute("""
            INSERT INTO public.journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by)
            VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'BTO_LEFTOVER', %s, 'YER', 1.0, 'Posted', %s, %s);
        """, (jv_id, jv_no, f"ترجيع فائض قماش BTO ({inv['name']}) إلى {wh_name}", wh_acc, wip_acc, val_f, val_f, val_f, po['id'], f"إرجاع فائض {po['production_order_no']}", uid))
        insert_sorted_journal_lines(cur, jv_id, [
            (wh_acc, f"مدين - إضافة فائض {inv['name']} لمستودع {wh_name}", val_f, 0.0, val_f, 0.0),
            (wip_acc, f"دائن - تخفيض WIP بقيمة الفائض المرتجع ({po['production_order_no']})", 0.0, val_f, 0.0, val_f),
        ])
        refresh_chart_balances_atomic(cur)

        cur.execute("UPDATE public.production_orders SET wip_material_cost = wip_material_cost - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING wip_material_cost;", (val_f, po['id']))
        new_wip = float(cur.fetchone()['wip_material_cost'])
        log_audit_event('production_orders', po['id'], 'BTO_LEFTOVER', user_id=uid, document_no=jv_no,
                        new_values={'tx_id': tx_id, 'entry_no': jv_no, 'leftover_value': val_f, 'wip_material_cost': new_wip},
                        details=f"ترجيع فائض BTO بقيمة {val_f} إلى {wh_name}", cur=cur)
        return {'success': True, 'tx_id': tx_id, 'entry_no': jv_no, 'wip_material_cost': new_wip}


def issue_production_materials(po_id, payload):
    data = payload.get('data') if isinstance(payload.get('data'), dict) else (payload or {})
    materials = data.get('materials') or data.get('items') or data.get('fabrics') or []
    if not materials and (data.get('fabric_id') or data.get('inventory_id') or data.get('fabric_name')):
        materials = [data]
    if not isinstance(materials, list) or not materials:
        raise ValueError("قائمة الخامات أو المستلزمات المطلوب صرفها مطلوبة")

    uid = get_active_user_context('admin')
    with get_db_cursor(commit=True) as cur:
        assert_period_open(cur, clean_str(data.get('issue_date')) or None)
        po = _lock_po(cur, po_id)
        guard_production_order_ready_for_work(po)
        if clean_str(po.get('status')) in ('Completed', 'Delivered', 'Cancelled'):
            raise WorkflowGuardError("لا يمكن صرف خامات على أمر تشغيل مغلق أو مسلّم")

        infos = deduct_fabrics_batch(cur, materials, po['production_order_no'], po.get('customer_name') or '', po.get('child_name') or '', warehouse_id=clean_str(data.get('warehouse_id')) or 'WH-WORKSHOP', created_by=uid)
        refresh_chart_balances_atomic(cur)
        cur.execute("SELECT wip_material_cost FROM public.production_orders WHERE id = %s;", (po['id'],))
        new_wip = float((cur.fetchone() or {}).get('wip_material_cost') or 0)
        log_audit_event('production_orders', po['id'], 'ISSUE_MAT', user_id=uid, document_no=po['production_order_no'],
                        new_values={'deducted_count': len(infos), 'wip_material_cost': new_wip},
                        details=f"صرف خامات إضافية/مساعدة لأمر {po['production_order_no']}", cur=cur)
        return {'success': True, 'production_order_id': po['id'], 'deducted_items': len(infos), 'details': infos, 'wip_material_cost': new_wip}
