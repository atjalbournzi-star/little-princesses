# services/pg/pg_general_ledger.py
# General Ledger Statement Engine (PostgreSQL / Supabase)
# Compliance: Double-entry GAAP/IFRS, no vouchers double counting, < 220 lines

from decimal import Decimal
from .db_pool import execute_query, clean_str


def get_general_ledger_pg(params=None):
    """استخراج كشف حركة دفتر الأستاذ العام تفصيلياً مع الرصيد التراكمي للحساب المحدد"""
    params = params or {}
    acc_filter = clean_str(params.get('account_id') or params.get('account') or params.get('code') or '').strip()
    start = clean_str(params.get('start_date') or params.get('start') or '') or None
    end = clean_str(params.get('end_date') or params.get('end') or '') or None

    is_all = not acc_filter or acc_filter.upper() == 'ALL'
    clean_acc = acc_filter.replace('ACC-', '').replace('ACC_', '')

    target_acc = None
    opening_bal = Decimal("0.0")
    acc_nature = "debit"

    if not is_all:
        acc_q = """
            SELECT id, account_code, account_name, normal_balance, COALESCE(opening_balance, 0.0) as opening
            FROM chart_of_accounts
            WHERE id = %s OR account_code = %s OR REPLACE(REPLACE(id, 'ACC-', ''), 'ACC_', '') = %s
            LIMIT 1;
        """
        target_acc = execute_query(acc_q, params=(acc_filter, acc_filter, clean_acc), fetch_one=True)
        if target_acc:
            raw_norm = str(target_acc.get('normal_balance') or '').strip().lower()
            acc_nature = 'credit' if raw_norm in ('credit', 'دائن') else 'debit'
            opening_bal = Decimal(str(target_acc.get('opening') or 0.0))

            if start:
                prior_q = """
                    SELECT COALESCE(SUM(l.debit_base - l.credit_base), 0.0) as prior_net
                    FROM journal_entry_lines l
                    JOIN journal_entries j ON (l.entry_id = j.id OR l.entry_id = j.entry_no)
                    LEFT JOIN chart_of_accounts a ON (
                        a.id = l.account_id 
                        OR a.account_code = l.account_id
                        OR REPLACE(REPLACE(a.id, 'ACC-', ''), 'ACC_', '') = REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '')
                        OR a.account_code = REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '')
                    )
                    WHERE (l.account_id = %s OR a.account_code = %s OR REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '') = %s)
                      AND (j.status IS NULL OR LOWER(j.status) NOT IN ('void', 'cancelled', 'ملغي'))
                      AND j.entry_date::date < %s::date;
                """
                prior_row = execute_query(prior_q, params=(acc_filter, acc_filter, clean_acc, start), fetch_one=True)
                prior_net = Decimal(str(prior_row.get('prior_net') or 0.0)) if prior_row else Decimal("0.0")
                if acc_nature == 'credit':
                    opening_bal -= prior_net
                else:
                    opening_bal += prior_net

    where_clauses = ["(j.status IS NULL OR LOWER(j.status) NOT IN ('void', 'cancelled', 'ملغي'))"]
    sql_params = []

    if not is_all:
        where_clauses.append("""
            (l.account_id = %s OR a.account_code = %s 
             OR REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '') = %s
             OR REPLACE(REPLACE(a.id, 'ACC-', ''), 'ACC_', '') = %s)
        """)
        sql_params.extend([acc_filter, acc_filter, clean_acc, clean_acc])

    if start:
        where_clauses.append("j.entry_date::date >= %s::date")
        sql_params.append(start)
    if end:
        where_clauses.append("j.entry_date::date <= %s::date")
        sql_params.append(end)

    query = f"""
        SELECT 
            l.id as line_id,
            j.id as entry_id,
            COALESCE(j.entry_no, 'JV-' || j.id) as entry_no,
            j.entry_date::date as date,
            COALESCE(a.id, l.account_id) as account_id,
            COALESCE(a.account_code, l.account_id) as account_code,
            COALESCE(a.account_name, l.account_id) as account_name,
            COALESCE(a.normal_balance, 'Debit') as normal_balance,
            COALESCE(l.line_description, j.description, j.notes, '') as notes,
            COALESCE(l.debit, 0.0) as debit_orig,
            COALESCE(l.credit, 0.0) as credit_orig,
            COALESCE(l.debit_base, 0.0) as debit_base,
            COALESCE(l.credit_base, 0.0) as credit_base,
            COALESCE(j.currency, 'YER') as currency,
            COALESCE(j.exchange_rate, 1.0) as exchange_rate,
            COALESCE(j.ref_type, 'قيد يومية') as ref_type,
            COALESCE(j.ref_id, '') as ref_id,
            j.status
        FROM journal_entry_lines l
        JOIN journal_entries j ON (l.entry_id = j.id OR l.entry_id = j.entry_no)
        LEFT JOIN chart_of_accounts a ON (
            a.id = l.account_id 
            OR a.account_code = l.account_id
            OR REPLACE(REPLACE(a.id, 'ACC-', ''), 'ACC_', '') = REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '')
            OR a.account_code = REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '')
        )
        WHERE {' AND '.join(where_clauses)}
        ORDER BY j.entry_date ASC, j.created_at ASC, l.id ASC;
    """
    rows = execute_query(query, params=tuple(sql_params), fetch_all=True) or []

    ledger_rows = []
    running_balance = opening_bal

    if not is_all and start:
        ledger_rows.append({
            'id': f'OPENING-{acc_filter}',
            'journal_id': 'OPENING',
            'entry_no': 'رصيد سابق',
            'date': start,
            'account_code': target_acc.get('account_code') if target_acc else acc_filter,
            'account_name': target_acc.get('account_name') if target_acc else acc_filter,
            'account_nature': acc_nature,
            'notes': f'الرصيد السابق / الافتتاحي حتى تاريخ {start}',
            'debit_orig': 0.0, 'credit_orig': 0.0,
            'debit_base': 0.0, 'credit_base': 0.0,
            'debit_target': 0.0, 'credit_target': 0.0,
            'running_target': float(running_balance),
            'running_balance_base': float(running_balance),
            'currency': 'YER', 'exchange_rate': 1.0,
            'ref_type': 'رصيد افتتاحي', 'ref_id': '',
            'is_opening': True
        })

    for r in rows:
        d_base = Decimal(str(r.get('debit_base') or 0.0))
        c_base = Decimal(str(r.get('credit_base') or 0.0))
        row_nature = 'credit' if str(r.get('normal_balance') or '').lower() in ('credit', 'دائن') else 'debit'

        if row_nature == 'credit':
            running_balance += (c_base - d_base)
        else:
            running_balance += (d_base - c_base)

        ledger_rows.append({
            'id': r['line_id'],
            'journal_id': r['entry_id'],
            'entry_no': r['entry_no'],
            'date': str(r['date']),
            'account_id': r['account_id'],
            'account_code': r['account_code'],
            'account_name': r['account_name'],
            'account_nature': row_nature,
            'notes': r['notes'],
            'debit_orig': float(r['debit_orig']),
            'credit_orig': float(r['credit_orig']),
            'debit_base': float(d_base),
            'credit_base': float(c_base),
            'debit_target': float(d_base),
            'credit_target': float(c_base),
            'running_target': float(running_balance),
            'running_balance_base': float(running_balance),
            'currency': r['currency'],
            'exchange_rate': float(r['exchange_rate']),
            'ref_type': r['ref_type'],
            'ref_id': r['ref_id'],
            'status': r['status']
        })

    return {
        'account_id': acc_filter,
        'account_name': target_acc.get('account_name') if target_acc else None,
        'opening_balance': float(opening_bal),
        'closing_balance': float(running_balance),
        'nature': acc_nature,
        'rows': ledger_rows,
        'total_rows': len(ledger_rows)
    }
