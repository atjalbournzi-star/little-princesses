# services/pg/pg_financial_reports.py
# Single Source of Truth Financial Reports Engine (PostgreSQL / Supabase)
# Compliance: Double-entry GAAP/IFRS, no vouchers double counting, < 220 lines

from decimal import Decimal
from .db_pool import execute_query, clean_num, clean_str


def get_balance_sheet_pg(params=None):
    """حساب الميزانية العمومية والمركز المالي حصراً من قيود اليومية المحاسبية دون تكرار"""
    params = params or {}
    start = clean_str(params.get('start_date') or params.get('start') or '')
    end = clean_str(params.get('end_date') or params.get('end') or '')

    date_filter = ""
    sql_params = []
    if start:
        date_filter += " AND j.entry_date::date >= %s::date"
        sql_params.append(start)
    if end:
        date_filter += " AND j.entry_date::date <= %s::date"
        sql_params.append(end)

    query = f"""
        WITH account_movements AS (
            SELECT 
                a.id, a.account_code as code, a.account_name as name,
                a.account_type, a.normal_balance,
                COALESCE(a.opening_balance, 0.0) as opening,
                COALESCE(SUM(l.debit_base), 0.0) as total_debit,
                COALESCE(SUM(l.credit_base), 0.0) as total_credit
            FROM chart_of_accounts a
            LEFT JOIN journal_entry_lines l ON (
                a.id = l.account_id 
                OR a.account_code = l.account_id
                OR REPLACE(REPLACE(a.id, 'ACC-', ''), 'ACC_', '') = REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '')
                OR a.account_code = REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '')
            )
            LEFT JOIN journal_entries j ON l.entry_id = j.id {date_filter}
            WHERE a.is_group = FALSE OR a.is_group IS NULL
            GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.normal_balance, a.opening_balance
        )
        SELECT * FROM account_movements ORDER BY code ASC;
    """
    rows = execute_query(query, params=sql_params, fetch_all=True) or []

    cur_assets, fix_assets, liab_rows, eq_rows = [], [], [], []
    tot_cur_assets = Decimal("0.0")
    tot_fix_assets = Decimal("0.0")
    tot_liab = Decimal("0.0")
    tot_eq_accs = Decimal("0.0")
    tot_rev = Decimal("0.0")
    tot_exp = Decimal("0.0")

    for r in rows:
        code = str(r.get('code') or '')
        atype = str(r.get('account_type') or '').lower()
        deb = Decimal(str(r.get('total_debit') or 0.0))
        crd = Decimal(str(r.get('total_credit') or 0.0))
        op = Decimal(str(r.get('opening') or 0.0))

        # تصنيف الحسابات وحساب الرصيد الصافي مرة واحدة فقط
        if 'أصول' in atype or 'asset' in atype or code.startswith('1'):
            bal = max(Decimal("0.0"), op + deb - crd)
            item = {'id': r['id'], 'code': code, 'name': r['name'], 'amount': float(bal)}
            if code.startswith('12') or code == '106' or 'ثابت' in r['name']:
                fix_assets.append(item)
                tot_fix_assets += bal
            else:
                cur_assets.append(item)
                tot_cur_assets += bal
        elif 'خصوم' in atype or 'التزام' in atype or 'liabilit' in atype or code.startswith('2'):
            bal = max(Decimal("0.0"), op + crd - deb)
            liab_rows.append({'id': r['id'], 'code': code, 'name': r['name'], 'amount': float(bal)})
            tot_liab += bal
        elif 'ملكية' in atype or 'equity' in atype or code.startswith('3'):
            bal = max(Decimal("0.0"), op + crd - deb)
            eq_rows.append({'id': r['id'], 'code': code, 'name': r['name'], 'amount': float(bal)})
            tot_eq_accs += bal
        elif 'إيراد' in atype or 'ايراد' in atype or 'revenu' in atype or code.startswith('4'):
            tot_rev += (crd - deb)
        elif 'مصروف' in atype or 'expens' in atype or code.startswith('5'):
            tot_exp += (deb - crd)

    period_profit = tot_rev - tot_exp
    tot_assets = tot_cur_assets + tot_fix_assets
    tot_equity = tot_eq_accs + period_profit
    tot_liab_and_equity = tot_liab + tot_equity
    diff = abs(tot_assets - tot_liab_and_equity)

    return {
        'currentAssets': cur_assets,
        'totalCurrentAssets': float(tot_cur_assets),
        'fixedAssets': fix_assets,
        'totalFixedAssets': float(tot_fix_assets),
        'totalAssets': float(tot_assets),
        'currentLiabilities': liab_rows,
        'totalLiabilities': float(tot_liab),
        'equityAccounts': eq_rows,
        'totalEquityAccounts': float(tot_eq_accs),
        'periodProfit': float(period_profit),
        'totalEquity': float(tot_equity),
        'totalLiabilitiesAndEquity': float(tot_liab_and_equity),
        'isBalanced': diff < Decimal("0.05"),
        'diff': float(diff)
    }


def get_trial_balance_pg(params=None):
    """استخراج ميزان المراجعة بالمجاميع والأرصدة الختامية بدقة متناهية"""
    params = params or {}
    start = clean_str(params.get('start_date') or params.get('start') or '') or None
    end = clean_str(params.get('end_date') or params.get('end') or '') or None

    query = """
        SELECT 
            a.id, a.account_code as code, a.account_name as name,
            a.account_type as type, a.normal_balance,
            COALESCE(a.opening_balance, 0.0) as opening,
            COALESCE(SUM(CASE WHEN %s::date IS NOT NULL AND j.entry_date::date < %s::date THEN (l.debit_base - l.credit_base) ELSE 0.0 END), 0.0) as prior_net,
            COALESCE(SUM(CASE WHEN (%s::date IS NULL OR j.entry_date::date >= %s::date) AND (%s::date IS NULL OR j.entry_date::date <= %s::date) THEN l.debit_base ELSE 0.0 END), 0.0) as total_debit,
            COALESCE(SUM(CASE WHEN (%s::date IS NULL OR j.entry_date::date >= %s::date) AND (%s::date IS NULL OR j.entry_date::date <= %s::date) THEN l.credit_base ELSE 0.0 END), 0.0) as total_credit
        FROM chart_of_accounts a
        LEFT JOIN journal_entry_lines l ON (
            a.id = l.account_id 
            OR a.account_code = l.account_id
            OR REPLACE(REPLACE(a.id, 'ACC-', ''), 'ACC_', '') = REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '')
            OR a.account_code = REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '')
        )
        LEFT JOIN journal_entries j ON (l.entry_id = j.id OR l.entry_id = j.entry_no)
        WHERE (a.is_group = FALSE OR a.is_group IS NULL)
          AND (j.id IS NULL OR j.status IS NULL OR LOWER(j.status) NOT IN ('void', 'cancelled', 'ملغي'))
        GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.normal_balance, a.opening_balance
        ORDER BY a.account_code ASC;
    """
    rows = execute_query(query, params=(start, start, start, start, end, end, start, start, end, end), fetch_all=True) or []

    tb_rows = []
    g_open = Decimal("0.0")
    g_deb = Decimal("0.0")
    g_crd = Decimal("0.0")
    g_deb_bal = Decimal("0.0")
    g_crd_bal = Decimal("0.0")

    for r in rows:
        code = str(r.get('code') or '')
        raw_norm = str(r.get('normal_balance') or '').strip().lower()
        atype = str(r.get('type') or '').lower()
        is_credit = raw_norm in ('credit', 'دائن') or any(k in atype for k in ('خصوم', 'حقوق', 'إيراد', 'liab', 'equity', 'rev')) or code[0] in ('2', '3', '4')
        nature = 'credit' if is_credit else 'debit'

        op = Decimal(str(r.get('opening') or 0.0))
        p_net = Decimal(str(r.get('prior_net') or 0.0))
        eff_open = (op - p_net) if is_credit else (op + p_net)
        t_deb = Decimal(str(r.get('total_debit') or 0.0))
        t_crd = Decimal(str(r.get('total_credit') or 0.0))

        tot_deb = (Decimal("0.0") if is_credit else eff_open) + t_deb
        tot_crd = (eff_open if is_credit else Decimal("0.0")) + t_crd
        net_diff = tot_deb - tot_crd

        if net_diff > Decimal("0.0001"):
            c_deb = net_diff
            c_crd = Decimal("0.0")
        elif net_diff < Decimal("-0.0001"):
            c_deb = Decimal("0.0")
            c_crd = abs(net_diff)
        else:
            c_deb = Decimal("0.0")
            c_crd = Decimal("0.0")

        if eff_open != Decimal("0.0") or t_deb > Decimal("0.0") or t_crd > Decimal("0.0"):
            tb_rows.append({
                'id': r['id'], 'code': code, 'name': r['name'],
                'type': r['type'] or ('أصول' if not is_credit else 'خصوم'),
                'nature': nature,
                'opening_balance_base': float(eff_open),
                'total_debit_base': float(t_deb),
                'total_credit_base': float(t_crd),
                'debit_balance_base': float(c_deb),
                'credit_balance_base': float(c_crd)
            })
            g_open += eff_open
            g_deb += t_deb
            g_crd += t_crd
            g_deb_bal += c_deb
            g_crd_bal += c_crd

    diff_movements = abs(g_deb - g_crd)
    diff_balances = abs(g_deb_bal - g_crd_bal)
    return {
        'rows': tb_rows,
        'grand_total_opening': float(g_open),
        'grand_total_debit': float(g_deb),
        'grand_total_credit': float(g_crd),
        'grand_total_debit_balance': float(g_deb_bal),
        'grand_total_credit_balance': float(g_crd_bal),
        'is_balanced': diff_movements < Decimal("0.05") and diff_balances < Decimal("0.05"),
        'diff': float(max(diff_movements, diff_balances))
    }
