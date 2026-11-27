# services/pg/pg_income_statement.py
# Income Statement Engine strictly derived from Posted Journal Entry Lines
# Compliance: Double-entry GAAP/IFRS, strict Single Source of Truth, < 220 lines

from decimal import Decimal
from .db_pool import execute_query, clean_str


def get_income_statement_pg(params=None):
    """حساب قائمة الدخل والأرباح حصراً من قيود اليومية المحاسبية المعتمدة"""
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
                COALESCE(SUM(l.debit_base), 0.0) as total_debit,
                COALESCE(SUM(l.credit_base), 0.0) as total_credit
            FROM chart_of_accounts a
            LEFT JOIN (
                journal_entry_lines l
                JOIN journal_entries j ON (l.entry_id = j.id OR l.entry_id = j.entry_no) AND j.status IN ('Posted', 'Reversed') {date_filter}
            ) ON (
                a.id = l.account_id 
                OR a.account_code = l.account_id
                OR REPLACE(REPLACE(a.id, 'ACC-', ''), 'ACC_', '') = REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '')
                OR a.account_code = REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '')
            )
            WHERE (a.is_group = FALSE OR a.is_group IS NULL)
              AND (
                a.account_code LIKE '4%%' OR a.account_code LIKE '5%%'
                OR a.account_type IN ('إيرادات', 'Revenue', 'مصروفات', 'Expenses', 'تكلفة المبيعات', 'COGS')
              )
            GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.normal_balance
        )
        SELECT * FROM account_movements ORDER BY code ASC;
    """
    rows = execute_query(query, params=sql_params, fetch_all=True) or []

    rev_accounts, cogs_accounts, opex_accounts = [], [], []
    tot_rev = Decimal("0.0")
    tot_cogs = Decimal("0.0")
    tot_opex = Decimal("0.0")

    for r in rows:
        code = str(r.get('code') or '')
        name = str(r.get('name') or '')
        atype = str(r.get('account_type') or '').lower()
        deb = Decimal(str(r.get('total_debit') or 0.0))
        crd = Decimal(str(r.get('total_credit') or 0.0))

        if 'إيراد' in atype or 'ايراد' in atype or 'revenu' in atype or code.startswith('4'):
            bal = max(Decimal("0.0"), crd - deb)
            if bal > Decimal("0.0") or crd > Decimal("0.0") or deb > Decimal("0.0"):
                rev_accounts.append({'id': r['id'], 'code': code, 'name': name, 'amount': float(bal)})
                tot_rev += bal
        elif 'تكلفة' in atype or 'cogs' in atype or code in ('501', '504') or 'تكلفة' in name or 'أجور' in name:
            bal = max(Decimal("0.0"), deb - crd)
            if bal > Decimal("0.0") or deb > Decimal("0.0") or crd > Decimal("0.0"):
                cogs_accounts.append({'id': r['id'], 'code': code, 'name': name, 'amount': float(bal)})
                tot_cogs += bal
        elif 'مصروف' in atype or 'expens' in atype or code.startswith('5'):
            bal = max(Decimal("0.0"), deb - crd)
            if bal > Decimal("0.0") or deb > Decimal("0.0") or crd > Decimal("0.0"):
                opex_accounts.append({'id': r['id'], 'code': code, 'name': name, 'amount': float(bal)})
                tot_opex += bal

    gross_profit = tot_rev - tot_cogs
    gross_margin_pct = float((gross_profit / tot_rev * Decimal("100.0"))) if tot_rev > Decimal("0.0") else 0.0
    tot_exp = tot_cogs + tot_opex
    net_profit = gross_profit - tot_opex
    net_margin_pct = float((net_profit / tot_rev * Decimal("100.0"))) if tot_rev > Decimal("0.0") else 0.0

    return {
        'revAccounts': rev_accounts,
        'totalRevenue': float(tot_rev),
        'cogsAccounts': cogs_accounts,
        'totalCOGS': float(tot_cogs),
        'grossProfit': float(gross_profit),
        'grossMarginPct': gross_margin_pct,
        'opexAccounts': opex_accounts,
        'totalOPEX': float(tot_opex),
        'totalExpenses': float(tot_exp),
        'netProfit': float(net_profit),
        'netMarginPct': net_margin_pct
    }
