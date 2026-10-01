# services/pg/account_resolver.py
# Currency exchange rate resolution and chart of accounts code/name resolution

import re
from .db_pool import clean_str, clean_num


def resolve_exchange_rate(cur, currency_code, provided_rate=1.0):
    curr = clean_str(currency_code or 'YER').upper()
    if curr == 'YER':
        return 1.0
    rate = clean_num(provided_rate or 0.0)
    if rate > 1.0:
        return rate
    try:
        cur.execute("SELECT exchange_rate FROM currencies WHERE code = %s AND is_active = true LIMIT 1;", (curr,))
        row = cur.fetchone()
        if row and clean_num(row['exchange_rate']) > 0:
            return clean_num(row['exchange_rate'])
    except Exception:
        pass
    if curr == 'SAR': return 142.0
    if curr == 'USD': return 535.0
    return 1.0


def resolve_cash_account_by_currency(currency_code, default_id="ACC-101-1"):
    curr = clean_str(currency_code or 'YER').upper()
    if 'SAR' in curr: return 'ACC-101-2'
    if 'USD' in curr: return 'ACC-101-3'
    return 'ACC-101-1'


def resolve_account_id(cur, acc_input, default_id="ACC-101-1", currency=None):
    if not acc_input:
        return resolve_cash_account_by_currency(currency, default_id) if currency else default_id
    acc_str = str(acc_input).strip()

    if acc_str in ('ACC-101', '101', 'ACC-101-1', '101.1') and currency:
        curr = clean_str(currency).upper()
        if 'SAR' in curr: return 'ACC-101-2'
        if 'USD' in curr: return 'ACC-101-3'
        return 'ACC-101-1'

    cur.execute("SELECT id FROM chart_of_accounts WHERE id = %s OR account_code = %s LIMIT 1;", (acc_str, acc_str))
    row = cur.fetchone()
    if row: return row['id']

    code_part = acc_str.split(' - ')[0].strip()
    if code_part != acc_str:
        cur.execute("SELECT id FROM chart_of_accounts WHERE account_code = %s OR id = %s OR id = %s LIMIT 1;", (code_part, code_part, f"ACC-{code_part}"))
        row = cur.fetchone()
        if row: return row['id']

    m = re.match(r'^(ACC[-_]?)?([0-9]+(?:\.[0-9]+)?)', acc_str, re.IGNORECASE)
    if m:
        extracted = m.group(2)
        cur.execute("SELECT id FROM chart_of_accounts WHERE account_code = %s OR id = %s OR id = %s LIMIT 1;", (extracted, extracted, f"ACC-{extracted}"))
        row = cur.fetchone()
        if row: return row['id']

    cur.execute("SELECT id FROM chart_of_accounts WHERE id = %s OR account_code = %s LIMIT 1;", (f"ACC-{acc_str}", f"ACC-{acc_str}"))
    row = cur.fetchone()
    if row: return row['id']

    clean_name = re.sub(r'^(ACC[-_]?)?[0-9]+(?:\.[0-9]+)?[\s\-_:/|]*', '', acc_str).strip()
    if clean_name:
        cur.execute("SELECT id FROM chart_of_accounts WHERE account_name = %s OR account_name ILIKE %s LIMIT 1;", (clean_name, f"%{clean_name}%"))
        row = cur.fetchone()
        if row: return row['id']

    low = acc_str.lower()
    if any(k in low for k in ['سعودي', 'sar', '101.2', '101-2']): return 'ACC-101-2'
    if any(k in low for k in ['دولار', 'usd', '101.3', '101-3']): return 'ACC-101-3'
    if any(k in low for k in ['يمني', 'yer', '101.1', '101-1']): return 'ACC-101-1'
    if 'كريمي' in low or '103' in low: return 'ACC-103'
    if any(k in low for k in ['رئيسي', '101', 'خزينة', '1111']): return 'ACC-101-1'
    if any(k in low for k in ['5121', '501', 'رواتب', 'راتب', 'أجور']): return 'ACC-501'
    if any(k in low for k in ['1141', '107', 'سلف', 'سلفة']): return 'ACC-107'
    if any(k in low for k in ['5211', '502', 'ورشة', 'معمل', 'إيجار', 'ايجار']): return 'ACC-502'
    if any(k in low for k in ['503', 'كهرباء', 'ماء', 'مياه']): return 'ACC-503'
    if '504' in low or 'تشغيل' in low: return 'ACC-504'
    if any(k in low for k in ['505', 'صيانة', 'نظافة', 'تسويق', 'ضيافة', 'عام', 'إداري', 'اداري']): return 'ACC-505'
    if '506' in low or 'فروق' in low or 'صرف' in low: return 'ACC-506'
    if '507' in low or 'شحن' in low or 'نقل' in low: return 'ACC-507'
    if '508' in low or 'عمولة' in low or 'تحويل' in low: return 'ACC-508'
    if '509' in low or 'تالف' in low or 'هالك' in low: return 'ACC-509'
    if any(k in low for k in ['2111', '201', 'مورد', 'أقمشة']): return 'ACC-201'
    if any(k in low for k in ['1121', '104', 'عميل', 'ذمم عملاء']): return 'ACC-104'
    if any(k in low for k in ['3111', '301', 'رأس مال', 'راس مال']): return 'ACC-301'
    return default_id
