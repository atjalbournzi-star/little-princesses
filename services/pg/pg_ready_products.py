# services/pg/pg_ready_products.py
# Atomic Ready-to-Wear Apparel Creation with Multi-Size/Color Variants, SKUs, Barcodes & Accounting

import re
from decimal import Decimal, ROUND_HALF_UP
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str
from .pg_sequences import get_next_sequence_number
from .pg_ready_schema import ensure_ready_products_schema
from .pg_warehouse_accounts import create_or_link_warehouse_account
from .pg_delivery_cogs import refresh_chart_balances_atomic
from .pg_audit import log_audit_event, resolve_active_user_id
from .account_resolver import resolve_exchange_rate
from services.security import assert_period_open

DEC_4 = Decimal('0.0001')


def _d(val):
    try:
        return Decimal(str(val if val not in (None, '') else 0)).quantize(DEC_4, rounding=ROUND_HALF_UP)
    except Exception:
        return Decimal('0.0000')


def _age_slug(age_size):
    s = re.sub(r'[^0-9A-Za-z]+', '', str(age_size or '').strip()).upper()
    return s[:8] if s else 'SZ'


def _resolve_opening_contra_account(cur):
    cur.execute("""
        SELECT id FROM public.chart_of_accounts
        WHERE is_postable = TRUE AND is_active = TRUE
          AND (account_code = '302' OR account_category IN ('Retained_Earnings', 'Capital') OR account_code LIKE '30%')
        ORDER BY CASE WHEN account_code = '302' THEN 0 ELSE 1 END, level DESC, account_code ASC LIMIT 1;
    """)
    row = cur.fetchone()
    if row:
        return row['id']
    cur.execute("SELECT id FROM public.chart_of_accounts WHERE is_postable = TRUE AND is_active = TRUE AND account_type IN ('حقوق ملكية', 'Equity') ORDER BY level DESC, account_code ASC LIMIT 1;")
    row = cur.fetchone()
    if not row:
        raise ValueError("تعذر العثور على حساب حقوق الملكية المقابل للرصيد الافتتاحي")
    return row['id']


def _resolve_target_warehouse(cur, raw_wh):
    if raw_wh:
        cur.execute("SELECT id, name, account_id FROM public.warehouses WHERE id = %s OR code = %s OR name = %s LIMIT 1;", (raw_wh, raw_wh, raw_wh))
        row = cur.fetchone()
        if row:
            return row
    cur.execute("SELECT id, name, account_id FROM public.warehouses WHERE id = 'WH-SHOWROOM' OR code = 'WH-SHOWROOM' LIMIT 1;")
    row = cur.fetchone()
    if row:
        return row
    cur.execute("SELECT id, name, account_id FROM public.warehouses WHERE is_active = TRUE ORDER BY id ASC LIMIT 1;")
    row = cur.fetchone()
    if not row:
        raise ValueError("لا يوجد أي مستودع نشط معرف في قاعدة البيانات")
    return row


def create_ready_product_with_variants(payload):
    """إنشاء منتج جاهز مع مصفوفة مقاسات/أعمار وألوان وتوليد SKU/Barcode وأرصدة افتتاحية ذرياً"""
    data = payload.get('data') or payload
    name = clean_str(data.get('name') or data.get('model_name') or '')
    if not name:
        raise ValueError("اسم الفستان / المنتج الجاهز مطلوب")

    image_url = clean_str(data.get('image_url') or '')
    if image_url.startswith('data:') or len(image_url) > 500:
        raise ValueError("يُحظر حفظ صور Base64 في قاعدة البيانات؛ يرجى رفع الصورة عبر /api/uploads/product-image")

    variants_in = data.get('variants') or []
    if not isinstance(variants_in, list) or len(variants_in) == 0:
        raise ValueError("يجب إدخال مقاس واحد على الأقل في مصفوفة الأعمار والألوان")

    category = clean_str(data.get('category') or 'فساتين جاهزة')
    season = clean_str(data.get('season_collection') or data.get('collection') or '')
    care_notes = clean_str(data.get('care_notes') or '')
    curr_raw = clean_str(data.get('currency') or 'YER').upper()
    curr = 'SAR' if 'SAR' in curr_raw else ('USD' if 'USD' in curr_raw else 'YER')
    default_sell = _d(data.get('selling_price') or 0)
    default_cost = _d(data.get('cost_price') or 0)
    default_min = _d(data.get('min_stock') or 1)
    entry_date = clean_str(data.get('entry_date') or today_str())
    raw_wh = clean_str(data.get('warehouse_id') or data.get('warehouse') or 'WH-SHOWROOM')
    raw_uid = clean_str(data.get('user_id') or data.get('created_by') or '')

    with get_db_cursor(commit=True) as cur:
        ensure_ready_products_schema(cur)
        assert_period_open(cur, entry_date)
        resolved_uid = resolve_active_user_id(cur, raw_uid)
        rate = _d(resolve_exchange_rate(cur, curr, clean_num(data.get('exchange_rate') or 1.0)))

        wh_row = _resolve_target_warehouse(cur, raw_wh)
        wh_id, wh_name = wh_row['id'], wh_row['name']
        wh_acc = wh_row.get('account_id') or create_or_link_warehouse_account(cur, wh_id, wh_name, user_id=resolved_uid)

        inv_id = get_next_sequence_number(cur, 'RDY', fallback_prefix='RDY-')
        style_code = clean_str(data.get('style_code')) or get_next_sequence_number(cur, 'STYLE', fallback_prefix='LP-RD-', fallback_padding=4)

        prepared_variants = []
        total_qty = Decimal('0.0000')
        total_cost_yer = Decimal('0.0000')
        ref_sell_yer = default_sell * rate

        for idx, v in enumerate(variants_in):
            age_size = clean_str(v.get('age_size') or '')
            if not age_size:
                raise ValueError(f"المقاس / العمر مطلوب في السطر رقم {idx + 1}")
            qty = _d(v.get('stock_qty') if v.get('stock_qty') is not None else v.get('qty') or 0)
            if qty < 0:
                raise ValueError(f"الكمية لا يمكن أن تكون سالبة للمقاس {age_size}")

            v_cost_yer = (_d(v.get('cost_price') if v.get('cost_price') not in (None, '') else default_cost) * rate).quantize(DEC_4, rounding=ROUND_HALF_UP)
            v_sell_yer = (_d(v.get('selling_price') if v.get('selling_price') not in (None, '') else default_sell) * rate).quantize(DEC_4, rounding=ROUND_HALF_UP)
            v_min = _d(v.get('min_stock') if v.get('min_stock') not in (None, '') else default_min)
            if ref_sell_yer <= 0 and v_sell_yer > 0:
                ref_sell_yer = v_sell_yer

            sku = clean_str(v.get('sku')) or f"{style_code}-{_age_slug(age_size)}-{idx + 1}"
            cur.execute("SELECT id FROM public.product_variants WHERE sku = %s LIMIT 1;", (sku,))
            if cur.fetchone():
                sku = f"{sku}-{get_next_sequence_number(cur, 'VAR', fallback_prefix='VAR-')[-4:]}"

            barcode = clean_str(v.get('barcode')) or get_next_sequence_number(cur, 'BARCODE', fallback_prefix='LP80', fallback_padding=6)
            cur.execute("SELECT id FROM public.product_variants WHERE barcode = %s LIMIT 1;", (barcode,))
            while cur.fetchone():
                barcode = get_next_sequence_number(cur, 'BARCODE', fallback_prefix='LP80', fallback_padding=6)
                cur.execute("SELECT id FROM public.product_variants WHERE barcode = %s LIMIT 1;", (barcode,))

            var_id = get_next_sequence_number(cur, 'VAR', fallback_prefix='VAR-')
            total_qty += qty
            total_cost_yer += (qty * v_cost_yer).quantize(DEC_4, rounding=ROUND_HALF_UP)
            prepared_variants.append({
                "id": var_id, "age_size": age_size, "color_name": clean_str(v.get('color_name') or ''),
                "color_hex": clean_str(v.get('color_hex') or '#D00070'), "sku": sku, "barcode": barcode,
                "cost_price": v_cost_yer, "selling_price": v_sell_yer, "stock_qty": qty, "min_stock": v_min
            })

        avg_unit_cost = (total_cost_yer / total_qty).quantize(DEC_4, rounding=ROUND_HALF_UP) if total_qty > 0 else (default_cost * rate).quantize(DEC_4, rounding=ROUND_HALF_UP)
        exact_opening_val = (total_qty * avg_unit_cost).quantize(DEC_4, rounding=ROUND_HALF_UP)
        overall_min = sum((pv["min_stock"] for pv in prepared_variants), Decimal('0.0000'))

        cur.execute("""
            INSERT INTO public.inventory (
                id, item_code, name, type, category, unit, quantity, reserved_qty,
                min_limit, unit_cost, currency, location, status,
                item_type, image_url, selling_price, style_code, season_collection, care_notes, updated_at
            ) VALUES (
                %s, %s, %s, 'Product', %s, 'قطعة', %s, 0.0000,
                %s, %s, 'YER', %s, %s,
                'finished_product', %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
            ) RETURNING *;
        """, (
            inv_id, style_code, name, category, total_qty,
            overall_min, avg_unit_cost, wh_id, ('Available' if total_qty > 0 else 'OutOfStock'),
            image_url, ref_sell_yer, style_code, season, care_notes
        ))
        inv_row = dict(cur.fetchone())

        cur.execute("""
            INSERT INTO public.warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty, updated_at)
            VALUES (%s, %s, %s, %s, 0.0000, CURRENT_TIMESTAMP)
            ON CONFLICT (warehouse_id, inventory_id) DO UPDATE SET
                quantity = warehouse_stock.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP;
        """, (f"WS-{inv_id}-{wh_id}", wh_id, inv_id, total_qty))

        saved_variants = []
        for pv in prepared_variants:
            cur.execute("""
                INSERT INTO public.product_variants (id, inventory_id, warehouse_id, age_size, color_name, color_hex, sku, barcode, cost_price, selling_price, stock_qty, min_stock, is_active, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP) RETURNING *;
            """, (pv["id"], inv_id, wh_id, pv["age_size"], pv["color_name"], pv["color_hex"], pv["sku"], pv["barcode"], pv["cost_price"], pv["selling_price"], pv["stock_qty"], pv["min_stock"]))
            saved_variants.append({k: (str(val) if k in ('created_at', 'updated_at') and val else (float(val) if isinstance(val, Decimal) else val)) for k, val in dict(cur.fetchone()).items()})

            if pv["stock_qty"] > 0:
                tx_id = get_next_sequence_number(cur, 'INV-TXN', fallback_prefix='ITXN-')
                note = f"رصيد افتتاحي منتج جاهز: {name} ({pv['age_size']} {pv['color_name']}) [{wh_name}]"
                cur.execute("""
                    INSERT INTO public.inventory_transactions (id, inventory_id, variant_id, warehouse_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_by, created_at)
                    VALUES (%s, %s, %s, %s, 'OPENING_STOCK', %s, %s, 'READY_PRODUCT', %s, %s, %s, CURRENT_TIMESTAMP);
                """, (tx_id, inv_id, pv["id"], wh_id, pv["stock_qty"], pv["cost_price"], inv_id, note, resolved_uid))

        jv_no = None
        if exact_opening_val > 0:
            contra_acc = _resolve_opening_contra_account(cur)
            jv_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
            jv_desc = f"إثبات رصيد افتتاحي فستان جاهز: {name} ({style_code}) - {total_qty} قطعة [{wh_name}]"
            cur.execute("""
                INSERT INTO public.journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'ReadyProductOpening', %s, 'YER', 1.0, 'Posted', %s, %s);
            """, (jv_no, jv_no, entry_date, jv_desc, wh_acc, contra_acc, exact_opening_val, exact_opening_val, exact_opening_val, inv_id, jv_desc, resolved_uid))
            cur.execute("INSERT INTO public.journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);",
                        (generate_id("JVL"), jv_no, wh_acc, f"مدين - مخزون جاهز {name} ({wh_name})", exact_opening_val, exact_opening_val))
            cur.execute("INSERT INTO public.journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);",
                        (generate_id("JVL"), jv_no, contra_acc, f"دائن - مقابل رصيد افتتاحي منتج جاهز ({style_code})", exact_opening_val, exact_opening_val))
            refresh_chart_balances_atomic(cur)

        log_audit_event(
            entity_type='inventory', entity_id=inv_id, action='INSERT_READY_PRODUCT',
            new_values={'id': inv_id, 'style_code': style_code, 'name': name, 'variants_count': len(saved_variants), 'total_qty': float(total_qty), 'opening_value': float(exact_opening_val), 'jv_no': jv_no},
            user_id=resolved_uid, document_no=style_code, details=f"إضافة فستان/منتج جاهز {name} ({len(saved_variants)} مقاسات، {total_qty} قطعة)", cur=cur
        )
        inv_clean = {k: (str(v) if k in ('created_at', 'updated_at') and v else (float(v) if isinstance(v, Decimal) else v)) for k, v in inv_row.items()}
        inv_clean.update({"success": True, "variants": saved_variants, "journal_entry_no": jv_no, "warehouse_id": wh_id, "warehouse_name": wh_name,
                          "message": f"تم تسجيل الفستان الجاهز [{name}] بعدد ({len(saved_variants)}) مقاساً وإجمالي ({float(total_qty):.0f}) قطعة بنجاح 👗✨"})
        return inv_clean
