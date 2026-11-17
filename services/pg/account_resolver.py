# services/pg/account_resolver.py
# Currency exchange rate resolution and chart of accounts code/name resolution

import re
from .db_pool import clean_str, clean_num


def normalize_currency_code(currency_code):
    if not currency_code:
        return 'YER'
    c = str(currency_code).upper().strip()
    if 'SAR' in c or 'سعود' in c:
        return 'SAR'
    if 'USD' in c or 'دولار' in c or '$' in c:
        return 'USD'
    if 'YER' in c or 'يمن' in c or '﷼' in c:
        return 'YER'
    clean = re.sub(r'[^A-Z]', '', c)
    return clean[:3] if clean else 'YER'


def resolve_exchange_rate(cur, currency_code, provided_rate=1.0):
    curr = normalize_currency_code(currency_code)
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


def resolve_cash_account_by_currency(cur, currency_code=None, default_id=None):
    curr = normalize_currency_code(currency_code)
    if cur:
        try:
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND is_active = TRUE AND (account_category ILIKE %s OR account_code LIKE %s OR account_name ILIKE %s) AND currency = %s ORDER BY level DESC, account_code ASC LIMIT 1;", ('%Cash%', '101%', '%صندوق%', curr))
            row = cur.fetchone()
            if row: return row['id']
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND is_active = TRUE AND (account_category ILIKE %s OR account_code LIKE %s OR account_name ILIKE %s) ORDER BY level DESC, account_code ASC LIMIT 1;", ('%Cash%', '101%', '%صندوق%'))
            row = cur.fetchone()
            if row: return row['id']
        except Exception: pass
    return default_id


def resolve_bank_account_by_currency(cur, currency_code=None, default_id=None):
    curr = normalize_currency_code(currency_code)
    if cur:
        try:
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND is_active = TRUE AND (account_category ILIKE %s OR account_code LIKE %s OR account_name ILIKE %s OR account_name ILIKE %s) AND currency = %s ORDER BY level DESC, account_code ASC LIMIT 1;", ('%Banks%', '102%', '%بنك%', '%كريمي%', curr))
            row = cur.fetchone()
            if row: return row['id']
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND is_active = TRUE AND (account_category ILIKE %s OR account_code LIKE %s OR account_name ILIKE %s) ORDER BY level DESC, account_code ASC LIMIT 1;", ('%Banks%', '102%', '%بنك%'))
            row = cur.fetchone()
            if row: return row['id']
        except Exception: pass
    return default_id


def resolve_receiving_account(cur, payment_method, currency_code):
    p_meth = clean_str(payment_method).lower()
    if any(w in p_meth for w in ['بنك', 'bank', 'حوالة', 'transfer', 'كريمي', 'kuraimi', 'محفظ', 'شبك', 'إلكتروني', 'الكتروني']):
        b_acc = resolve_bank_account_by_currency(cur, currency_code)
        if b_acc: return b_acc
    return resolve_cash_account_by_currency(cur, currency_code)


def resolve_customer_advance_account(cur, default_id=None):
    if cur:
        try:
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_category ILIKE 'Customer_Deposits' OR account_name ILIKE '%عربون%' OR account_name ILIKE '%أمانات%' OR account_name ILIKE '%دفعات مقدمة%') ORDER BY level DESC, account_code ASC LIMIT 1;")
            row = cur.fetchone()
            if row: return row['id']
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_category ILIKE 'Receivables' OR account_name ILIKE '%عملاء%') ORDER BY level DESC, account_code ASC LIMIT 1;")
            row = cur.fetchone()
            if row: return row['id']
        except Exception: pass
    return default_id


def resolve_receivables_account(cur, default_id=None):
    if cur:
        try:
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_category ILIKE 'Receivables' OR account_name ILIKE '%عملاء%' OR account_name ILIKE '%مدينون%') ORDER BY level DESC, account_code ASC LIMIT 1;")
            row = cur.fetchone()
            if row: return row['id']
        except Exception: pass
    return default_id


def resolve_payables_account(cur, default_id=None):
    if cur:
        try:
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_category ILIKE 'Payables' OR account_name ILIKE '%مورد%' OR account_name ILIKE '%دائنون%') ORDER BY level DESC, account_code ASC LIMIT 1;")
            row = cur.fetchone()
            if row: return row['id']
        except Exception: pass
    return default_id


def resolve_inventory_account(cur, default_id=None):
    if cur:
        try:
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_category ILIKE 'Inventory' OR account_name ILIKE '%مخزون%' OR account_name ILIKE '%أقمشة%') ORDER BY level DESC, account_code ASC LIMIT 1;")
            row = cur.fetchone()
            if row: return row['id']
        except Exception: pass
    return default_id


def resolve_labor_expense_account(cur, default_id=None):
    if cur:
        try:
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_category ILIKE 'Salaries' OR account_name ILIKE '%أجور%' OR account_name ILIKE '%رواتب%') ORDER BY level DESC, account_code ASC LIMIT 1;")
            row = cur.fetchone()
            if row: return row['id']
        except Exception: pass
    return default_id


def resolve_labor_liability_account(cur, default_id=None):
    if cur:
        try:
            cur.execute("SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND (account_name ILIKE '%مستحق%' OR account_name ILIKE '%أجور%') AND (account_type ILIKE 'Liability' OR account_type ILIKE 'خصوم') ORDER BY level DESC, account_code ASC LIMIT 1;")
            row = cur.fetchone()
            if row: return row['id']
        except Exception: pass
    return default_id


def resolve_account_id(cur, acc_input, default_id=None, currency=None):
    if not acc_input:
        return resolve_cash_account_by_currency(cur, currency, default_id) if (cur and currency) else default_id
    acc_str = str(acc_input).strip()
    if not cur:
        return default_id or acc_str

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
        cur.execute("SELECT id FROM chart_of_accounts WHERE account_name = %s OR account_name ILIKE %s ORDER BY level DESC LIMIT 1;", (clean_name, f"%{clean_name}%"))
        row = cur.fetchone()
        if row: return row['id']

    low = acc_str.lower()
    keywords = []
    if any(k in low for k in ['رواتب', 'راتب', 'أجور']): keywords.extend(['رواتب', 'أجور'])
    elif any(k in low for k in ['إيجار', 'ايجار', 'ورشة']): keywords.extend(['إيجار', 'ايجار'])
    elif any(k in low for k in ['كهرباء', 'ماء', 'مياه']): keywords.extend(['كهرباء', 'ماء'])
    elif any(k in low for k in ['صيانة', 'نظافة', 'تسويق', 'إداري']): keywords.extend(['صيانة', 'تسويق'])
    elif any(k in low for k in ['مورد', 'أقمشة']): keywords.extend(['مورد', 'أقمشة'])
    elif any(k in low for k in ['عميل', 'ذمم']): keywords.extend(['عملاء', 'عميل'])
    elif any(k in low for k in ['رأس مال', 'راس مال']): keywords.extend(['رأس مال'])

    if keywords:
        likes = " OR ".join(["account_name ILIKE %s" for _ in keywords])
        cur.execute(f"SELECT id FROM chart_of_accounts WHERE is_postable = TRUE AND ({likes}) ORDER BY level DESC, account_code ASC LIMIT 1;", tuple(f"%{k}%" for k in keywords))
        row = cur.fetchone()
        if row: return row['id']

    if currency:
        cash_acc = resolve_cash_account_by_currency(cur, currency)
        if cash_acc: return cash_acc

    return default_id
