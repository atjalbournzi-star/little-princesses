# services/pg/pg_account_code.py
# Automatic chart of accounts hierarchical numbering and code suggestions

from .db_pool import get_db_cursor


def suggest_account_code(parent_id=None):
    """اقتراح رقم كود حساب جديد تلقائياً بناءً على شجرة الحسابات والتسلسل الهرمي"""
    with get_db_cursor(commit=False) as cur:
        if not parent_id or str(parent_id).strip() in ('0', '', 'None', 'null'):
            cur.execute("SELECT account_code FROM chart_of_accounts WHERE level = 1 AND account_code ~ '^[0-9]+$' AND LENGTH(account_code) = 1;")
            root_codes = [int(r['account_code']) for r in cur.fetchall() if r.get('account_code', '').isdigit()]
            return str(max(root_codes) + 1 if root_codes else 6)

        p_clean = str(parent_id).replace('ACC-', '').replace('ACC_', '').strip()
        cur.execute("SELECT account_code, level FROM chart_of_accounts WHERE account_code = %s OR id = %s LIMIT 1;", (p_clean, str(parent_id)))
        p_row = cur.fetchone()
        p_code = p_row['account_code'] if p_row else p_clean

        cur.execute("SELECT account_code, parent_account_code FROM chart_of_accounts;")
        all_accounts = cur.fetchall()
        existing_codes = set(r['account_code'] for r in all_accounts)

        if len(p_code) == 1 and p_code.isdigit():
            prefix = p_code
            max_num = 0
            for r in all_accounts:
                c = r['account_code'].strip()
                if len(c) == 3 and c.startswith(prefix) and c.isdigit():
                    num = int(c)
                    if num > max_num: max_num = num
                elif r.get('parent_account_code') == prefix and c.isdigit():
                    num = int(c)
                    if num > max_num: max_num = num

            candidate = max_num + 1 if max_num > 0 else int(f"{prefix}01")
            while str(candidate) in existing_codes:
                candidate += 1
            return str(candidate)

        prefix = f"{p_code}."
        max_seq = 0
        for r in all_accounts:
            c = r['account_code'].strip()
            if c.startswith(prefix):
                rest = c[len(prefix):].split('.')[0].split('-')[0].split('_')[0]
                if rest.isdigit():
                    s = int(rest)
                    if s > max_seq: max_seq = s
            elif r.get('parent_account_code') == p_code:
                if c.startswith(p_code) and len(c) > len(p_code):
                    rest = c[len(p_code):].lstrip('.-_').split('.')[0]
                    if rest.isdigit():
                        s = int(rest)
                        if s > max_seq: max_seq = s

        candidate_seq = max_seq + 1
        candidate_code = f"{p_code}.{str(candidate_seq).zfill(2)}"
        while candidate_code in existing_codes:
            candidate_seq += 1
            candidate_code = f"{p_code}.{str(candidate_seq).zfill(2)}"

        return candidate_code
