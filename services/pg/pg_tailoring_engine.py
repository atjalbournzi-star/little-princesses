# services/pg/pg_tailoring_engine.py
# 4-Mode Bespoke & MTO Tailoring Engine: Axes, Standard Size Merge, Deferred Guard & CMT Custody
# Architectural Standards: Strictly <= 220 lines

import json
from decimal import Decimal
from .db_pool import get_db_cursor, clean_str, to_decimal, generate_id
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, get_active_user_context
from services.security import WorkflowGuardError

VALID_ITEM_MODES = ('READY_STOCK', 'CATALOG_MTO', 'CUSTOM_BESPOKE')
VALID_MATERIAL_SOURCES = ('WORKSHOP_STOCK', 'BUY_TO_ORDER', 'CUSTOMER_CMT')
VALID_SIZING_MODES = ('CUSTOM', 'STANDARD_SIZE', 'DEFERRED')
_SIZE_DIMS = ('chest_cm', 'waist_cm', 'hip_cm', 'dress_length_cm', 'shoulder_cm', 'sleeve_cm')


def _parse_json_dict(raw):
    if isinstance(raw, dict): return raw
    if isinstance(raw, str) and raw.strip():
        try:
            p = json.loads(raw)
            return p if isinstance(p, dict) else {}
        except Exception: return {}
    return {}


def is_catalog_mto_product(cur, product_id):
    if not product_id: return False
    cur.execute("SELECT fulfillment_mode FROM public.products WHERE id = %s OR sku = %s LIMIT 1;", (product_id, product_id))
    row = cur.fetchone()
    return bool(row and str(row.get('fulfillment_mode') or '').upper() == 'CATALOG_MTO')


def resolve_tailoring_axes(cur, data, itm=None, prod_id=None):
    src = itm if isinstance(itm, dict) else data
    raw_mode = clean_str(src.get('item_mode') or data.get('item_mode') or '').upper()
    raw_mat = clean_str(src.get('material_source') or data.get('material_source') or 'WORKSHOP_STOCK').upper()
    raw_sz = clean_str(src.get('sizing_mode') or data.get('sizing_mode') or 'CUSTOM').upper()
    custom_title = clean_str(src.get('custom_design_title') or data.get('custom_design_title') or '') or None
    sz_matrix_id = clean_str(src.get('size_matrix_id') or data.get('size_matrix_id') or '') or None
    adj_dict = _parse_json_dict(src.get('size_adjustments_json') if 'size_adjustments_json' in src else data.get('size_adjustments_json'))

    if not raw_mode: raw_mode = 'CUSTOM_BESPOKE' if (custom_title and not prod_id) else 'CATALOG_MTO'
    if raw_mode != 'CUSTOM_BESPOKE' and is_catalog_mto_product(cur, prod_id): raw_mode = 'CATALOG_MTO'
    if raw_mode not in VALID_ITEM_MODES: raise ValueError(f"نوع البند غير صالح ({raw_mode})")
    if raw_mat not in VALID_MATERIAL_SOURCES: raise ValueError(f"مصدر القماش غير صالح ({raw_mat})")
    if raw_sz not in VALID_SIZING_MODES: raise ValueError(f"وضع المقاس غير صالح ({raw_sz})")
    if raw_mode == 'CUSTOM_BESPOKE' and not custom_title:
        custom_title = clean_str(src.get('product_name') or data.get('product_name') or data.get('model_name') or '') or None
        if not custom_title: raise ValueError("عنوان التصميم الخاص (custom_design_title) مطلوب لطلبات التفصيل الخاص")

    return {
        'item_mode': raw_mode, 'material_source': raw_mat, 'sizing_mode': raw_sz,
        'size_matrix_id': sz_matrix_id, 'size_adjustments': adj_dict,
        'size_adjustments_json': json.dumps(adj_dict, ensure_ascii=False),
        'custom_design_title': custom_title, 'standard_size_disclaimer': (raw_sz == 'STANDARD_SIZE'),
    }


def build_standard_size_spec(cur, size_matrix_id, adjustments_raw=None):
    if not size_matrix_id: raise ValueError("معرف مصفوفة المقاس القياسي (size_matrix_id) مطلوب عند اختيار STANDARD_SIZE")
    cur.execute("SELECT * FROM public.standard_size_matrices WHERE id = %s LIMIT 1;", (size_matrix_id,))
    m = cur.fetchone()
    if not m: raise ValueError(f"المقاس القياسي [{size_matrix_id}] غير موجود")

    base = {k: float(m[k]) for k in _SIZE_DIMS if m.get(k) is not None}
    base.update(_parse_json_dict(m.get('extra_measurements_json')))
    adj = _parse_json_dict(adjustments_raw)
    final, highlighted = dict(base), {}
    for k, dv in adj.items():
        orig = base.get(k)
        if isinstance(dv, dict) and 'final' in dv:
            highlighted[k] = {'original': orig, 'adjustment': dv.get('adjustment', 0), 'final': dv['final']}
            final[k] = dv['final']
        elif isinstance(dv, (int, float)) and isinstance(orig, (int, float)):
            fv = float(to_decimal(orig) + to_decimal(dv))
            highlighted[k] = {'original': orig, 'adjustment': float(dv), 'final': fv}
            final[k] = fv
        else:
            highlighted[k] = {'original': orig, 'adjustment': dv, 'final': dv}
            final[k] = dv

    return {
        'sizing_mode': 'STANDARD_SIZE', 'size_matrix_id': m['id'], 'segment_code': m.get('segment_code'),
        'size_label': m.get('size_label'), 'display_unit': m.get('display_unit') or 'cm',
        'fabric_factor': float(m.get('fabric_factor') or 1.0), 'base_measurements': base,
        'adjustments': adj, 'final_measurements': final, 'highlighted_changes': highlighted,
        'standard_size_disclaimer': True,
    }


def determine_initial_po_state(sizing_mode, material_source):
    if sizing_mode == 'DEFERRED': return 'AWAITING_MEASUREMENTS', 'بانتظار المقاسات'
    if material_source == 'BUY_TO_ORDER': return 'AWAITING_MATERIAL', 'بانتظار شراء الخامات'
    return 'In Progress', 'القص والتحضير'


def guard_production_order_ready_for_work(po_row):
    if not po_row: return
    if clean_str(po_row.get('status')) == 'AWAITING_MEASUREMENTS' or clean_str(po_row.get('sizing_mode')) == 'DEFERRED':
        raise WorkflowGuardError("محظور تشغيلياً (AWAITING_MEASUREMENTS): أمر التشغيل بانتظار تأكيد المقاسات ولا يمكن القص أو صرف خامات عليه قبل تأكيد المقاس.")


def attach_cmt_custody_atomic(cur, order_id, order_item_id, po_id, customer_id, custody_data, user_id):
    if not isinstance(custody_data, dict):
        return None
    f_desc = clean_str(custody_data.get('fabric_description'))
    qty = to_decimal(custody_data.get('received_qty') or 0)
    if not f_desc or qty <= Decimal('0'):
        raise ValueError("بيانات عهدة قماش العميل (fabric_description و received_qty > 0) مطلوبة لنوع CUSTOMER_CMT")
    custody_no = get_next_sequence_number(cur, 'CMT', fallback_prefix='CMT-', fallback_padding=6)
    rec_id = generate_id('CMT')
    cur.execute("""
        INSERT INTO public.customer_material_custody (
            id, custody_no, order_id, order_item_id, production_order_id, customer_id,
            fabric_description, received_qty, unit, condition_notes, reference_image,
            leftover_returned_qty, status, received_by
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0.0000, 'RECEIVED', %s)
        RETURNING id, custody_no;
    """, (
        rec_id, custody_no, order_id, order_item_id, po_id, customer_id,
        f_desc, qty, clean_str(custody_data.get('unit') or 'meter'),
        clean_str(custody_data.get('condition_notes')) or None,
        clean_str(custody_data.get('reference_image')) or None, user_id,
    ))
    log_audit_event('customer_material_custody', rec_id, 'CMT_RECEIVE', user_id=user_id, document_no=custody_no,
                    new_values={'custody_no': custody_no, 'accounting_value': '0.0000'},
                    details=f"استلام عهدة قماش عميل {custody_no} (قيمة 0.0000 YER)", cur=cur)
    return custody_no


def close_cmt_custody_on_delivery(cur, order_id, leftover_returned_qty=None, cust_name=None):
    cur.execute("SELECT id, custody_no, status FROM public.customer_material_custody WHERE order_id = %s AND status != 'CLOSED' FOR UPDATE;", (order_id,))
    rows = cur.fetchall() or []
    if not rows:
        return []
    leftover = to_decimal(leftover_returned_qty or 0) if leftover_returned_qty is not None else Decimal('0')
    if leftover < Decimal('0'):
        raise ValueError("كمية القماش المتبقي المرتجع لا يمكن أن تكون سالبة")
    closed_nos = []
    uid = get_active_user_context('admin')
    for r in rows:
        cur.execute("""
            UPDATE public.customer_material_custody
            SET status = 'CLOSED', leftover_returned_qty = %s, closed_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (leftover, r['id']))
        log_audit_event('customer_material_custody', r['id'], 'CMT_CLOSE', user_id=uid, document_no=r['custody_no'],
                        new_values={'status': 'CLOSED', 'leftover_returned_qty': float(leftover)},
                        details=f"إغلاق عهدة قماش عميل {r['custody_no']} عند التسليم ({cust_name or ''})", cur=cur)
        closed_nos.append(r['custody_no'])
    return closed_nos


def confirm_production_sizing(po_id, payload):
    data = payload.get('data') if isinstance(payload.get('data'), dict) else (payload or {})
    new_sz = clean_str(data.get('sizing_mode') or '').upper()
    if new_sz not in ('CUSTOM', 'STANDARD_SIZE'):
        raise ValueError("يجب تحديد وضع المقاس المؤكد (CUSTOM أو STANDARD_SIZE)")
    uid = get_active_user_context('admin')

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT * FROM public.production_orders
            WHERE id = %s OR production_order_no = %s OR order_id = %s LIMIT 1 FOR UPDATE;
        """, (po_id, po_id, po_id))
        po = cur.fetchone()
        if not po:
            raise ValueError(f"أمر التشغيل [{po_id}] غير موجود")

        sz_matrix_id = clean_str(data.get('size_matrix_id')) or po.get('size_matrix_id')
        adj_dict = _parse_json_dict(data.get('size_adjustments_json') if 'size_adjustments_json' in data else po.get('size_adjustments_json'))
        if new_sz == 'STANDARD_SIZE':
            meas_spec = build_standard_size_spec(cur, sz_matrix_id, adj_dict)
            disclaimer = True
        else:
            meas_spec = _parse_json_dict(data.get('measurements_spec') or data.get('measurements') or po.get('measurements_spec'))
            disclaimer = False

        mat_src = clean_str(po.get('material_source') or 'WORKSHOP_STOCK').upper()
        wip_mat = to_decimal(po.get('wip_material_cost') or 0)
        if mat_src == 'BUY_TO_ORDER' and wip_mat <= Decimal('0'):
            next_status, next_stage = 'AWAITING_MATERIAL', 'بانتظار شراء الخامات'
        else:
            next_status, next_stage = 'In Progress', 'القص والتحضير'

        cur.execute("""
            UPDATE public.production_orders
            SET sizing_mode = %s, size_matrix_id = %s, size_adjustments_json = %s::jsonb,
                measurements_spec = %s::jsonb, standard_size_disclaimer = %s,
                status = %s, stage = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *;
        """, (
            new_sz, sz_matrix_id, json.dumps(adj_dict, ensure_ascii=False),
            json.dumps(meas_spec, ensure_ascii=False), disclaimer, next_status, next_stage, po['id'],
        ))
        updated = dict(cur.fetchone())
        if po.get('order_id'):
            cur.execute("""
                UPDATE public.order_items
                SET sizing_mode = %s, size_matrix_id = %s, size_adjustments_json = %s::jsonb, standard_size_disclaimer = %s
                WHERE order_id = %s;
            """, (new_sz, sz_matrix_id, json.dumps(adj_dict, ensure_ascii=False), disclaimer, po['order_id']))

        log_audit_event('production_orders', po['id'], 'CONFIRM_SIZING', user_id=uid, document_no=po.get('production_order_no'),
                        new_values={'sizing_mode': new_sz, 'status': next_status, 'size_matrix_id': sz_matrix_id},
                        details=f"تأكيد مقاس أمر التشغيل {po.get('production_order_no')} إلى {new_sz}", cur=cur)
        for k in ('created_at', 'updated_at', 'start_date', 'due_date'):
            if updated.get(k):
                updated[k] = str(updated[k])
        return updated
