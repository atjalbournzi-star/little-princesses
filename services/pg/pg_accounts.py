# services/pg/pg_accounts.py
# Chart of Accounts management, currency exchange rates, tree reset, and facade re-exports

import uuid
from decimal import Decimal
from .db_pool import get_db_cursor, clean_str, clean_num, execute_query
from .pg_account_code import suggest_account_code


def get_accounts(params=None):
    """استرجاع شجرة دليل الحسابات مع الأرصدة المحلية والأجنبية"""
    query = """
        SELECT c.id, c.account_code, c.account_name, c.account_name_en, c.account_type,
               c.account_category, c.parent_account_id, c.parent_account_code, c.level,
               c.account_path, c.is_group, c.is_postable, c.is_active, c.normal_balance,
               c.normal_balance as nature,
               c.opening_balance, c.current_balance, c.balance_type, c.currency, c.notes,
               COALESCE(c.parent_account_code, c.parent_account_id) as parent_id,
               c.account_code as code, c.account_name as name, c.current_balance as balance,
               CASE 
                 WHEN c.currency IS NULL OR c.currency = 'YER' THEN c.current_balance
                 WHEN c.normal_balance = 'Credit' THEN
                   COALESCE((
                     SELECT SUM(
                       CASE 
                         WHEN credit_account_id IN (c.id, c.account_code) THEN 
                           (CASE WHEN currency = c.currency THEN amount ELSE (base_amount / COALESCE((SELECT exchange_rate FROM currencies WHERE code = c.currency LIMIT 1), 142.0)) END)
                         ELSE 
                           -(CASE WHEN currency = c.currency THEN amount ELSE (base_amount / COALESCE((SELECT exchange_rate FROM currencies WHERE code = c.currency LIMIT 1), 142.0)) END)
                       END
                     )
                     FROM journal_entries 
                     WHERE (credit_account_id IN (c.id, c.account_code) OR debit_account_id IN (c.id, c.account_code))
                   ), 0.0)
                 ELSE
                   COALESCE((
                     SELECT SUM(
                       CASE 
                         WHEN debit_account_id IN (c.id, c.account_code) THEN 
                           (CASE WHEN currency = c.currency THEN amount ELSE (base_amount / COALESCE((SELECT exchange_rate FROM currencies WHERE code = c.currency LIMIT 1), 142.0)) END)
                         ELSE 
                           -(CASE WHEN currency = c.currency THEN amount ELSE (base_amount / COALESCE((SELECT exchange_rate FROM currencies WHERE code = c.currency LIMIT 1), 142.0)) END)
                       END
                     )
                     FROM journal_entries 
                     WHERE (debit_account_id IN (c.id, c.account_code) OR credit_account_id IN (c.id, c.account_code))
                   ), 0.0)
               END as foreign_balance
        FROM chart_of_accounts c
        ORDER BY c.account_code ASC;
    """
    return execute_query(query, fetch_all=True) or []


def add_account(payload):
    """إضافة أو تحديث حساب في شجرة الحسابات"""
    data = payload.get('data') or payload
    code = clean_str(data.get('code') or data.get('account_code') or data.get('acc_code'))
    if not code: raise ValueError("رمز الحساب (Account Code) مطلوب.")
    acc_id = clean_str(data.get('id') or data.get('account_id') or f"ACC-{code}")
    name = clean_str(data.get('name') or data.get('account_name') or data.get('acc_name') or data.get('name_ar') or code)
    name_en = clean_str(data.get('name_en') or data.get('account_name_en') or '')
    acc_type = clean_str(data.get('type') or data.get('account_type') or data.get('acc_type') or 'أصول')
    cat = clean_str(data.get('category') or data.get('account_category') or acc_type or 'General')
    p_code = clean_str(data.get('parent_code') or data.get('parent_account_code') or data.get('parent_id') or '')
    if p_code in ('0', 'null', 'None'): p_code = ''
    lvl = int(clean_num(data.get('level') or (2 if p_code else 1)))
    is_grp = bool(data.get('is_group') in (1, True, '1', 'true', 'group'))
    is_post = bool(data.get('is_postable') in (1, True, '1', 'true', None) and not is_grp)

    raw_norm = str(data.get('normal_balance') or data.get('nature') or '').strip().lower()
    norm_bal = 'Credit' if raw_norm in ('credit', 'دائن') else ('Debit' if raw_norm in ('debit', 'مدين') else ('Credit' if acc_type in ('Liabilities', 'Equity', 'Revenue', 'خصوم', 'حقوق ملكية', 'إيرادات') else 'Debit'))
    curr = clean_str(data.get('currency') or 'YER')
    notes = clean_str(data.get('notes') or '')

    query = """
        INSERT INTO chart_of_accounts (
            id, account_code, account_name, account_name_en, account_type,
            account_category, parent_account_code, level, is_group, is_postable,
            normal_balance, currency, notes
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (account_code) DO UPDATE SET
            account_name = EXCLUDED.account_name,
            account_name_en = COALESCE(NULLIF(EXCLUDED.account_name_en, ''), chart_of_accounts.account_name_en),
            account_type = EXCLUDED.account_type, account_category = EXCLUDED.account_category,
            is_group = EXCLUDED.is_group, is_postable = EXCLUDED.is_postable,
            normal_balance = EXCLUDED.normal_balance, notes = EXCLUDED.notes
        RETURNING *, account_code as code, account_name as name, current_balance as balance;
    """
    with get_db_cursor(commit=True) as cur:
        cur.execute(query, (acc_id, code, name, name_en, acc_type, cat, p_code, lvl, is_grp, is_post, norm_bal, curr, notes))
        res = dict(cur.fetchone())
        for k, v in res.items():
            if isinstance(v, (Decimal, uuid.UUID)): res[k] = float(v) if isinstance(v, Decimal) else str(v)
        return res


def delete_account(payload):
    """حذف حساب مع التحقق من عدم وجود حسابات فرعية أو قيود مرتبطة"""
    data = payload.get('data') or payload
    raw_code = clean_str(data.get('code') or data.get('account_code') or data.get('id') or '')
    if not raw_code: raise ValueError("رمز الحساب (Account Code) مطلوب للحذف.")

    clean_code = raw_code.replace('ACC-', '').replace('ACC_', '').strip()
    acc_id = f"ACC-{clean_code}"

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT COUNT(*) as count FROM chart_of_accounts WHERE parent_account_code IN (%s, %s) OR parent_account_id IN (%s, %s);", (raw_code, clean_code, raw_code, acc_id))
        row = cur.fetchone()
        if (row['count'] if row and 'count' in row else 0) > 0:
            raise ValueError("لا يمكن حذف حساب يمتلك حسابات فرعية تحته. قم بنقل أو حذف الحسابات الفرعية أولاً.")

        cur.execute("SELECT COUNT(*) as count FROM journal_entries WHERE debit_account_id IN (%s, %s, %s) OR credit_account_id IN (%s, %s, %s);", (raw_code, clean_code, acc_id, raw_code, clean_code, acc_id))
        j_row = cur.fetchone()
        if (j_row['count'] if j_row and 'count' in j_row else 0) > 0:
            raise ValueError("لا يمكن حذف هذا الحساب لوجود قيود يومية مرتبطة به في النظام.")

        cur.execute("DELETE FROM chart_of_accounts WHERE account_code IN (%s, %s) OR id IN (%s, %s);", (raw_code, clean_code, raw_code, acc_id))
        return {"deleted": clean_code, "id": acc_id, "success": True}


def reset_clean_chart_of_accounts(payload=None):
    """إعادة ضبط وتصفير شجرة الحسابات وإعادتها للهيكل النظيف القياسي"""
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM journal_entry_lines;")
        cur.execute("DELETE FROM journal_entries;")
        cur.execute("DELETE FROM payments;")
        cur.execute("DELETE FROM expenses;")
        cur.execute("UPDATE chart_of_accounts SET opening_balance = 0.0, current_balance = 0.0;")
        cur.execute("DELETE FROM chart_of_accounts WHERE account_code LIKE '01.06%' OR id IN ('ACC-000027', 'ACC-957272');")
        cur.execute("""
            UPDATE chart_of_accounts SET parent_account_code = '1', parent_account_id = 'ACC-1' WHERE account_code IN ('101', '102', '103', '104', '105', '106');
            UPDATE chart_of_accounts SET parent_account_code = '101', parent_account_id = 'ACC-101' WHERE account_code IN ('101.1', '101.2', '101.3');
            UPDATE chart_of_accounts SET parent_account_code = '102', parent_account_id = 'ACC-102' WHERE account_code IN ('102.01', '102.02');
            UPDATE chart_of_accounts SET parent_account_code = '2', parent_account_id = 'ACC-2' WHERE account_code IN ('201', '202');
            UPDATE chart_of_accounts SET parent_account_code = '3', parent_account_id = 'ACC-3' WHERE account_code IN ('301', '302');
            UPDATE chart_of_accounts SET parent_account_code = '301', parent_account_id = 'ACC-301' WHERE account_code IN ('301.01', '301.02');
            UPDATE chart_of_accounts SET parent_account_code = '4', parent_account_id = 'ACC-4' WHERE account_code IN ('401', '402');
            UPDATE chart_of_accounts SET parent_account_code = '5', parent_account_id = 'ACC-5' WHERE account_code IN ('501', '502', '503', '504', '505', '506');
        """)
    return {"reset": True, "accounts": get_accounts()}


def get_currencies(params=None):
    """استرجاع قائمة العملات المعرفة وأسعار الصرف الحية"""
    query = "SELECT code, name, symbol, exchange_rate, is_base, is_active, last_updated FROM currencies ORDER BY is_base DESC, code ASC;"
    rows = execute_query(query, fetch_all=True) or []
    for r in rows:
        if r.get('last_updated'): r['last_updated'] = str(r['last_updated'])
    return rows


def update_exchange_rate(payload):
    """تحديث سعر الصرف لعملة محددة"""
    data = payload.get('data') or payload
    code = clean_str(data.get('code') or data.get('currency')).upper()
    rate = clean_num(data.get('rate') or data.get('exchange_rate'))
    if rate <= 0: raise ValueError("سعر الصرف يجب أن يكون رقماً موجباً.")
    with get_db_cursor(commit=True) as cur:
        cur.execute("UPDATE currencies SET exchange_rate = %s, last_updated = CURRENT_TIMESTAMP WHERE code = %s RETURNING *;", (rate, code))
        row = cur.fetchone()
        return dict(row) if row else {"status": "not_found"}
