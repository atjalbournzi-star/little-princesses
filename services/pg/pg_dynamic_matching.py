# services/pg/pg_dynamic_matching.py
# Dynamic Ceiling Matching Engine, Tier Pricing & BOM Resolution
# Strict Upper-Bound Matching: 100% driven by product specifications in Supabase

import json
from .db_pool import clean_num, clean_str

KIDS_STANDARD_TIERS = [
    {'size': '1-2Y', 'age': '1-2 سنة', 'length': 55.9, 'chest': 50.8, 'waist': 48.3},
    {'size': '3-5Y', 'age': '3-5 سنوات', 'length': 68.6, 'chest': 61.0, 'waist': 55.9},
    {'size': '6-9Y', 'age': '6-9 سنوات', 'length': 83.8, 'chest': 81.3, 'waist': 66.0},
    {'size': '10-13Y', 'age': '10-13 سنة', 'length': 101.6, 'chest': 86.4, 'waist': 71.1}
]

WOMEN_STANDARD_TIERS = [
    {'size': 'XS', 'age': 'XS (34)', 'length': 135.0, 'chest': 82.0, 'waist': 64.0},
    {'size': 'S', 'age': 'S (36)', 'length': 138.0, 'chest': 88.0, 'waist': 70.0},
    {'size': 'M', 'age': 'M (38)', 'length': 140.0, 'chest': 94.0, 'waist': 76.0},
    {'size': 'L', 'age': 'L (40)', 'length': 142.0, 'chest': 102.0, 'waist': 84.0},
    {'size': 'XL', 'age': 'XL (42)', 'length': 145.0, 'chest': 110.0, 'waist': 92.0},
    {'size': 'XXL', 'age': 'XXL (44)', 'length': 145.0, 'chest': 118.0, 'waist': 100.0}
]


def _extract_cm(val, is_inch):
    num = clean_num(val)
    if num <= 0:
        return 0.0
    return round(num * 2.54, 2) if is_inch else round(num, 2)


def get_product_tiers(product):
    if not product:
        return KIDS_STANDARD_TIERS
    raw_ac = product.get('age_chart')
    if isinstance(raw_ac, str):
        try:
            raw_ac = json.loads(raw_ac)
        except Exception:
            raw_ac = None
    if isinstance(raw_ac, list) and len(raw_ac) > 0:
        tiers = []
        for r in raw_ac:
            sz = clean_str(r.get('size') or r.get('age') or '')
            if not sz:
                continue
            tiers.append({
                'size': sz,
                'age': clean_str(r.get('age') or r.get('label') or sz),
                'length': clean_num(r.get('length') or r.get('max') or 0.0),
                'chest': clean_num(r.get('chest') or 0.0),
                'waist': clean_num(r.get('waist') or 0.0)
            })
        if tiers:
            return sorted(tiers, key=lambda t: (t['length'], t['chest'], t['waist']))

    seg = clean_str(product.get('target_segment') or 'kids').lower()
    return WOMEN_STANDARD_TIERS if seg == 'women_adults' else KIDS_STANDARD_TIERS


def match_measurements_to_tier(product, measurements):
    if not measurements or not isinstance(measurements, dict):
        tiers = get_product_tiers(product)
        fallback = tiers[0]['size'] if tiers else '6-9Y'
        return {'tier': fallback, 'size_code': fallback, 'is_exceeded': False, 'badge': f'[{fallback}]'}

    raw_u = clean_str(measurements.get('unit') or 'cm').lower()
    is_inch = any(k in raw_u for k in ['inch', 'in', 'إنش', 'انش', '"'])

    m_len = _extract_cm(measurements.get('dress_length') or measurements.get('dress_len') or measurements.get('total_height') or measurements.get('total_len') or measurements.get('length'), is_inch)
    m_chest = _extract_cm(measurements.get('chest_circ') or measurements.get('chest'), is_inch)
    m_waist = _extract_cm(measurements.get('waist_circ') or measurements.get('waist'), is_inch)

    tiers = get_product_tiers(product)
    if not tiers:
        return {'tier': '6-9Y', 'size_code': '6-9Y', 'is_exceeded': False, 'badge': '[6-9Y]'}

    # If all entered measurements are 0, return first or standard tier
    if m_len <= 0 and m_chest <= 0 and m_waist <= 0:
        default_tier = tiers[0]['size']
        return {'tier': default_tier, 'size_code': default_tier, 'is_exceeded': False, 'badge': f'[{default_tier}]'}

    # Manual override check
    manual_sz = clean_str(measurements.get('manual_tier') or measurements.get('size_code'))
    matched_tier = next((t for t in tiers if t['size'] == manual_sz or manual_sz in t['size']), None) if manual_sz else None

    # Primary match: dress length ceiling
    if not matched_tier:
        for t in tiers:
            if m_len <= 0 or t['length'] <= 0 or m_len <= t['length']:
                matched_tier = t
                break

    is_exceeded = False
    if not matched_tier:
        matched_tier = tiers[-1]
        is_exceeded = True

    t_size = matched_tier['size']
    variances = []
    if m_chest > 0 and matched_tier.get('chest', 0) > 0 and m_chest > matched_tier['chest']:
        variances.append(f"محيط الصدر ({m_chest}سم > حد الفئة {matched_tier['chest']}سم)")
    if m_waist > 0 and matched_tier.get('waist', 0) > 0 and m_waist > matched_tier['waist']:
        variances.append(f"محيط الخصر ({m_waist}سم > حد الفئة {matched_tier['waist']}سم)")
    var_alert = f"⚠️ تنبيه فني للقصاص: تباين بالمقاسات [{', '.join(variances)}] عن الفئة المعيارية ({t_size})." if variances else ""
    badge = (f"{var_alert} - " if var_alert else "") + (f"[سقف الفئة {t_size}]" if is_exceeded else f"[الفئة المطابقة: {t_size}]")
    return {'tier': t_size, 'size_code': t_size, 'is_exceeded': is_exceeded, 'badge': badge, 'variance_alert': var_alert, 'tier_data': matched_tier}


def get_tier_pricing(product, tier_code):
    if not product:
        return 0.0
    pm = product.get('price_matrix')
    if isinstance(pm, str):
        try:
            pm = json.loads(pm)
        except Exception:
            pm = {}
    if isinstance(pm, dict) and pm:
        t_clean = clean_str(tier_code)
        if t_clean in pm:
            return clean_num(pm[t_clean])
        # Alias search
        for k, v in pm.items():
            if clean_str(k) == t_clean or t_clean in clean_str(k) or clean_str(k) in t_clean:
                return clean_num(v)
    return clean_num(product.get('base_price') or product.get('sell_price') or product.get('price') or 0.0)


def get_tier_bom(product, tier_code, order_qty=1.0):
    if not product:
        return []
    raw_bm = product.get('bom')
    if isinstance(raw_bm, str):
        try:
            raw_bm = json.loads(raw_bm)
        except Exception:
            raw_bm = {}
    items = raw_bm.get('items') if isinstance(raw_bm, dict) and 'items' in raw_bm else (raw_bm if isinstance(raw_bm, list) else [])
    if not isinstance(items, list):
        items = []

    qty = max(1.0, float(order_qty or 1.0))
    resolved = []
    for it in items:
        f_name = clean_str(it.get('fabric_name') or it.get('name') or 'قماش')
        unit = clean_str(it.get('unit') or it.get('cut_unit') or 'متر')
        u_cost = clean_num(it.get('unit_cost') or it.get('cost') or 0.0)
        inv_id = clean_str(it.get('inventory_id') or it.get('fabric_id') or '')
        curr = clean_str(it.get('currency') or product.get('currency') or 'YER')

        br = it.get('brackets') or {}
        single_m = clean_num(br.get(tier_code))
        if single_m <= 0:
            for k, v in br.items():
                if clean_str(k) == clean_str(tier_code) or clean_str(tier_code) in clean_str(k):
                    single_m = clean_num(v)
                    break
        if single_m <= 0:
            single_m = clean_num(it.get('cut_meters') or it.get('meters') or 0.0)

        tot_m = round(single_m * qty, 2)
        resolved.append({
            'fabric_id': inv_id,
            'inventory_id': inv_id,
            'fabric_name': f_name,
            'cut_meters': str(tot_m),
            'cut_unit': unit,
            'unit': unit,
            'unit_cost': u_cost,
            'currency': curr,
            'single_meters': single_m,
            'total_meters': tot_m,
            'meters': str(tot_m),
            'deduct_inventory': True
        })
    return resolved
