# services/pg/pg_pos_pricing.py
# Zero-Trust Backend POS Pricing, Variant Price Verification & Discount Guard
# Architectural Standards: Strictly < 220 lines per file

from decimal import Decimal, ROUND_HALF_UP
from .db_pool import clean_str

DEC_4 = Decimal('0.0001')


def _d(val):
    return Decimal(str(val if val not in (None, '') else 0)).quantize(DEC_4, rounding=ROUND_HALF_UP)


def resolve_pos_pricing(cur, items, data):
    """
    Validates POS line quantities, resolves authoritative selling prices from DB
    (product_variants.selling_price -> products.selling_price -> fallback),
    and computes subtotal, discount, gift_wrap_fee, and total_amount server-side.
    """
    raw_disc = _d(data.get('discount') or 0)
    if raw_disc < 0:
        raise ValueError("قيمة الخصم لا يمكن أن تكون سالبة")
    gift_wrap = bool(data.get('gift_wrap', False))
    raw_gift = _d(data.get('gift_wrap_fee') or 0) if gift_wrap else Decimal('0.0000')
    if raw_gift < 0:
        raise ValueError("رسوم التغليف لا يمكن أن تكون سالبة")

    priced_items = []
    subtotal = Decimal('0.0000')

    for itm in (items or []):
        qty = _d(itm.get('quantity') or itm.get('qty') or 1)
        if qty <= 0:
            raise ValueError("كمية الصنف يجب أن تكون أكبر من الصفر")

        var_id = clean_str(itm.get('variant_id')) or None
        p_id = clean_str(itm.get('product_id') or itm.get('inventory_id') or itm.get('id'))
        db_price = None

        if var_id:
            cur.execute("SELECT selling_price FROM public.product_variants WHERE id = %s LIMIT 1;", (var_id,))
            vr = cur.fetchone()
            if vr and vr.get('selling_price') is not None and _d(vr['selling_price']) > 0:
                db_price = _d(vr['selling_price'])
        if db_price is None and p_id:
            cur.execute("SELECT selling_price FROM public.products WHERE id = %s LIMIT 1;", (p_id,))
            pr = cur.fetchone()
            if pr and pr.get('selling_price') is not None and _d(pr['selling_price']) > 0:
                db_price = _d(pr['selling_price'])

        client_price = _d(itm.get('unit_price') if itm.get('unit_price') is not None else itm.get('price', 0))
        u_price = db_price if db_price is not None else client_price
        if u_price < 0:
            raise ValueError("سعر الصنف لا يمكن أن يكون قيمة سالبة")

        t_price = (qty * u_price).quantize(DEC_4, rounding=ROUND_HALF_UP)
        subtotal += t_price
        enriched = dict(itm)
        enriched['_qty'] = qty
        enriched['_unit_price'] = u_price
        enriched['_total_price'] = t_price
        priced_items.append(enriched)

    if raw_disc > subtotal:
        raise ValueError("قيمة الخصم لا يمكن أن تتجاوز إجمالي الفاتورة")

    tot_amt = max(Decimal('0.0000'), (subtotal - raw_disc + raw_gift).quantize(DEC_4, rounding=ROUND_HALF_UP))
    return priced_items, subtotal, raw_disc, gift_wrap, raw_gift, tot_amt
