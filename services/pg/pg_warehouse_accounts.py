# services/pg/pg_warehouse_accounts.py
# Dynamic hierarchical linkage between warehouses and chart_of_accounts

import logging
from .db_pool import clean_str, generate_id
from .pg_audit import log_audit_event, resolve_active_user_id

logger = logging.getLogger("LittlePrincesses_PG_WarehouseAccounts")


def get_main_inventory_account(cur):
    """استعلام ديناميكي عن الحساب التجميعي الرئيسي للمخزون في شجرة الحسابات (chart_of_accounts)"""
    cur.execute("""
        SELECT id, account_code, account_name, account_type, account_category, level, currency
        FROM chart_of_accounts
        WHERE (account_category ILIKE 'Inventory' OR account_name ILIKE '%مخزون%')
          AND (parent_account_id IS NOT NULL OR level >= 2)
        ORDER BY level ASC, account_code ASC
        LIMIT 1;
    """)
    row = cur.fetchone()
    if not row:
        cur.execute("""
            SELECT id, account_code, account_name, account_type, account_category, level, currency
            FROM chart_of_accounts
            WHERE account_type IN ('Assets', 'أصول') AND (account_category ILIKE 'Inventory' OR account_name ILIKE '%مخزون%')
            ORDER BY level ASC, account_code ASC
            LIMIT 1;
        """)
        row = cur.fetchone()
    return dict(row) if row else None


def get_next_warehouse_account_code(cur, parent_id, parent_code):
    """توليد كود تسلسلي فرعي ديناميكي مشتق من كود الحساب الأب وأعلى تسلسل فرعي مسجل"""
    cur.execute("""
        SELECT account_code FROM chart_of_accounts
        WHERE parent_account_id = %s OR parent_account_code = %s OR account_code LIKE %s;
    """, (parent_id, parent_code, f"{parent_code}.%"))
    codes = [r['account_code'] for r in cur.fetchall()]
    max_seq = 0
    prefix = f"{parent_code}."
    for c in codes:
        if c.startswith(prefix):
            sub = c[len(prefix):].split('.')[0].split('-')[0].split('_')[0]
            if sub.isdigit():
                num = int(sub)
                if num < 1000 and num > max_seq:
                    max_seq = num
    candidate_seq = max_seq + 1
    candidate = f"{parent_code}.{str(candidate_seq).zfill(2)}"
    cur.execute("SELECT id FROM chart_of_accounts WHERE account_code = %s;", (candidate,))
    while cur.fetchone():
        candidate_seq += 1
        candidate = f"{parent_code}.{str(candidate_seq).zfill(2)}"
        cur.execute("SELECT id FROM chart_of_accounts WHERE account_code = %s;", (candidate,))
    return candidate


def ensure_warehouse_schema_columns(cur):
    """التأكد من وجود الأعمدة والمفاتيح الأجنبية للمستودعات وفواتير الشراء"""
    cur.execute("""
        ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS account_id VARCHAR(64) REFERENCES chart_of_accounts(id);
        CREATE INDEX IF NOT EXISTS idx_warehouses_account ON warehouses(account_id);
        ALTER TABLE purchases ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(64) REFERENCES warehouses(id);
        CREATE INDEX IF NOT EXISTS idx_purchases_warehouse ON purchases(warehouse_id);
    """)


def create_or_link_warehouse_account(cur, wh_id, wh_name, wh_code=None, user_id=None):
    """إنشاء أو ربط حساب فرعي للمستودع باسمه الفعلي وكود تسلسلي ديناميكي تحت الحساب الأب"""
    parent = get_main_inventory_account(cur)
    if not parent:
        raise ValueError("تعذر العثور على الحساب الرئيسي للمخزون في شجرة الحسابات")

    p_id, p_code = parent.get('id'), parent.get('account_code')
    if not p_id and p_code:
        cur.execute("SELECT id FROM chart_of_accounts WHERE account_code = %s LIMIT 1;", (p_code,))
        p_row = cur.fetchone()
        if p_row:
            p_id = p_row['id']

    p_type = parent.get('account_type') or 'أصول'
    p_cat = parent.get('account_category') or 'Inventory'
    p_curr = parent.get('currency') or 'YER'
    p_lvl = int(parent.get('level') or 2) + 1

    cur.execute("UPDATE chart_of_accounts SET is_group = TRUE WHERE id = %s;", (p_id,))
    cur.execute("SELECT account_id FROM warehouses WHERE id = %s LIMIT 1;", (wh_id,))
    wh_row = cur.fetchone()
    if wh_row and wh_row.get('account_id'):
        cur.execute("SELECT id, account_code FROM chart_of_accounts WHERE id = %s LIMIT 1;", (wh_row['account_id'],))
        acc_ex = cur.fetchone()
        if acc_ex:
            cur.execute("UPDATE chart_of_accounts SET account_name = %s WHERE id = %s;", (wh_name, acc_ex['id']))
            return acc_ex['id']

    cur.execute("""
        SELECT id FROM chart_of_accounts
        WHERE (parent_account_id = %s OR parent_account_code = %s)
          AND (account_name = %s OR account_name = %s OR account_name = %s)
        LIMIT 1;
    """, (p_id, p_code, wh_name, f"جرد مستودع {wh_name}", f"مخزون {wh_name}"))
    matched = cur.fetchone()
    if matched:
        acc_id = matched['id']
        cur.execute("""
            UPDATE chart_of_accounts 
            SET account_name = %s, is_postable = TRUE, is_active = TRUE,
                parent_account_id = COALESCE(parent_account_id, %s),
                parent_account_code = COALESCE(parent_account_code, %s)
            WHERE id = %s;
        """, (wh_name, p_id, p_code, acc_id))
        cur.execute("UPDATE warehouses SET account_id = %s WHERE id = %s;", (acc_id, wh_id))
        return acc_id

    new_code = get_next_warehouse_account_code(cur, p_id, p_code)
    code_suffix = new_code.replace(f"{p_code}.", "")
    acc_id = f"ACC-{p_code}-{code_suffix}"
    cur.execute("SELECT id FROM chart_of_accounts WHERE id = %s LIMIT 1;", (acc_id,))
    if cur.fetchone():
        acc_id = generate_id("ACC")

    wh_label = wh_code or wh_id
    acc_notes = f"حساب مخزون فرعي مرتبط بالمستودع {wh_name} ({wh_label})"
    cur.execute("""
        INSERT INTO chart_of_accounts (
            id, account_code, account_name, account_name_en, account_type,
            account_category, parent_account_id, parent_account_code, level,
            is_group, is_postable, normal_balance, currency, is_active, notes,
            created_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, FALSE, TRUE, 'Debit', %s, TRUE, %s,
            CURRENT_TIMESTAMP
        );
    """, (acc_id, new_code, wh_name, f"Inventory - {wh_label}", p_type,
          p_cat, p_id, p_code, p_lvl, p_curr, acc_notes))

    cur.execute("UPDATE warehouses SET account_id = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (acc_id, wh_id))
    resolved_uid = resolve_active_user_id(cur, user_id)
    log_audit_event('warehouses', wh_id, 'LINK_ACCOUNT', new_values={'account_id': acc_id, 'account_code': new_code, 'name': wh_name, 'parent_account_id': p_id, 'parent_account_code': p_code}, user_id=resolved_uid, cur=cur)
    return acc_id


def sync_all_warehouses_accounts(cur, user_id=None):
    """مزامنة كافة المستودعات القائمة مع شجرة الحسابات وتنظيم تسلسلها الرقمي"""
    ensure_warehouse_schema_columns(cur)
    cur.execute("SELECT id, code, name, account_id FROM warehouses ORDER BY CASE id WHEN 'WH-MAIN' THEN 1 WHEN 'WH-WORKSHOP' THEN 2 WHEN 'WH-SHOWROOM' THEN 3 ELSE 4 END, id ASC;")
    whs = cur.fetchall()
    result = {}
    for w in whs:
        acc_id = create_or_link_warehouse_account(cur, w['id'], w['name'], w.get('code'), user_id=user_id)
        result[w['id']] = acc_id
    return result
