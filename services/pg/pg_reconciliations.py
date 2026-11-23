# services/pg/pg_reconciliations.py
# Cash & Bank Reconciliation Engine (GAAP/IFRS compliance, single source of truth)

import logging
from .db_pool import execute_query, clean_num, clean_str

logger = logging.getLogger("LittlePrincesses_PG_Reconciliations")


def get_reconciliations_pg(params=None):
    """حساب مطابقة وتسوية أرصدة الصناديق والبنوك بين دليل الحسابات ودفتر الأستاذ العام"""
    query = """
        SELECT 
            coa.id, coa.account_code as code, coa.account_name as name,
            coa.currency, COALESCE(coa.current_balance, 0.0) as current_balance,
            COALESCE(SUM(l.debit), 0.0) as total_debit,
            COALESCE(SUM(l.credit), 0.0) as total_credit,
            COALESCE(SUM(l.debit - l.credit), 0.0) as ledger_balance
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines l ON l.account_id = coa.id
        WHERE coa.is_active = TRUE 
          AND (coa.account_code LIKE '101%' OR coa.account_code LIKE '102%')
          AND coa.account_code NOT LIKE '5%'
        GROUP BY coa.id, coa.account_code, coa.account_name, coa.currency, coa.current_balance
        ORDER BY coa.account_code ASC;
    """
    rows = execute_query(query, fetch_all=True) or []
    out_rows = []
    tot_chart, tot_ledger, tot_diff = 0.0, 0.0, 0.0

    for r in rows:
        cb = float(r.get('current_balance') or 0.0)
        lb = float(r.get('ledger_balance') or 0.0)
        deb = float(r.get('total_debit') or 0.0)
        crd = float(r.get('total_credit') or 0.0)
        diff = round(cb - lb, 2)
        matched = abs(diff) < 0.01

        tot_chart += cb
        tot_ledger += lb
        tot_diff += diff

        out_rows.append({
            'id': r.get('id'),
            'code': clean_str(r.get('code')),
            'name': clean_str(r.get('name')),
            'currency': clean_str(r.get('currency') or 'YER'),
            'chart_balance': cb,
            'current_balance': cb,
            'total_debit': deb,
            'total_credit': crd,
            'ledger_balance': lb,
            'closingLedgerTarget': lb,
            'chartBalanceTarget': cb,
            'diff': diff,
            'is_matched': matched,
            'isMatched': matched
        })

    return {
        'rows': out_rows,
        'accounts': out_rows,
        'total_chart_balance': round(tot_chart, 2),
        'total_ledger_balance': round(tot_ledger, 2),
        'total_diff': round(tot_diff, 2),
        'is_balanced': abs(tot_diff) < 0.01,
        'count': len(out_rows)
    }
