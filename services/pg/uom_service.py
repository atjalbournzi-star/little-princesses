"""
Little Princesses ERP - Unit of Measure (UoM) Conversion Service
Handles conversion between meters, yards, cm, inches, rolls, and pieces.
"""


def normalize_uom(unit_str):
    if not unit_str:
        return 'متر'
    u = str(unit_str).strip().lower()
    if 'وار' in u or 'يارد' in u or u in ('yd', 'yard', 'yards'):
        return 'وار'
    if 'إنش' in u or 'انش' in u or 'بوص' in u or u in ('in', 'inch', 'inches', '"'):
        return 'إنش'
    if 'سم' in u or 'سنتيمتر' in u or u == 'cm':
        return 'سم'
    if 'رول' in u or 'طاق' in u or u in ('roll', 'bolt'):
        return 'رول'
    if 'حب' in u or 'قطع' in u or u in ('pc', 'piece'):
        return 'حبة'
    if 'متر' in u or u in ('m', 'meter', 'meters'):
        return 'متر'
    return u


def convert_uom(val, from_u, to_u):
    if not val:
        return 0.0
    try:
        val = float(val)
    except (ValueError, TypeError):
        return 0.0
    f = normalize_uom(from_u)
    t = normalize_uom(to_u)
    if f == t or val == 0:
        return val

    # 1. Convert to Meters
    if f == 'متر':
        m = val
    elif f == 'وار':
        m = val * 0.9144
    elif f == 'سم':
        m = val * 0.01
    elif f == 'إنش':
        m = val * 0.0254
    elif f == 'رول':
        m = val * 25.0 * 0.9144
    else:
        m = val

    # 2. Convert from Meters to Target
    if t == 'متر':
        return m
    elif t == 'وار':
        return m / 0.9144
    elif t == 'سم':
        return m * 100.0
    elif t == 'إنش':
        return m / 0.0254
    elif t == 'رول':
        return (m / 0.9144) / 25.0
    return m
