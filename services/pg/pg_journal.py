import logging
from .db_pool import (
    get_db_cursor, execute_query, clean_num,
    clean_str, generate_id, today_str
)
from .account_resolver import resolve_exchange_rate, resolve_account_id

logger = logging.getLogger("LittlePrincesses_PG_Journal")


def get_journal_entries(params=None):
    query = """
        SELECT id, entry_no, entry_date, description, debit_account_id,
               credit_account_id, amount, total_amount, base_amount, ref_type,
               ref_id, currency, exchange_rate, status, notes, created_at
        FROM journal_entries
        ORDER BY created_at DESC;
    """
    rows = execute_query(query, fetch_all=True)
    if not rows:
        return []

    lines_map = {}
    try:
        lines_query = """
            SELECT id, entry_id, account_id, line_description, debit,
                   credit, debit_base, credit_base
            FROM journal_entry_lines
            ORDER BY id ASC;
        """
        all_lines = execute_query(lines_query, fetch_all=True) or []
        for l in all_lines:
            eid = l.get('entry_id')
            if eid not in lines_map:
                lines_map[eid] = []
            lines_map[eid].append({
                'id': l.get('id'),
                'entry_id': eid,
                'account_id': l.get('account_id'),
                'line_description': l.get('line_description'),
                'debit': clean_num(l.get('debit')),
                'credit': clean_num(l.get('credit')),
                'debit_base': clean_num(l.get('debit_base')),
                'credit_base': clean_num(l.get('credit_base'))
            })
    except Exception as e:
        logger.warning(f"Failed to fetch journal_entry_lines: {e}")

    for r in rows:
        if r.get('created_at'):
            r['created_at'] = str(r['created_at'])
        if r.get('entry_date'):
            r['entry_date'] = str(r['entry_date'])
        r['date'] = r.get('entry_date')
        r['statement'] = r.get('description')
        r['debit'] = r.get('debit_account_id')
        r['credit'] = r.get('credit_account_id')
        r['exchange_rate'] = clean_num(r.get('exchange_rate'), 1.0)

        entry_lines = lines_map.get(r['id']) or []
        if not entry_lines and (r.get('debit_account_id') or r.get('credit_account_id')):
            amt = clean_num(r.get('amount') or r.get('total_amount'))
            rate = r['exchange_rate']
            base_amt = clean_num(r.get('base_amount')) or (amt * rate)
            if r.get('debit_account_id'):
                entry_lines.append({
                    'entry_id': r['id'],
                    'account_id': r.get('debit_account_id'),
                    'line_description': r.get('description') or '',
                    'debit': amt,
                    'credit': 0.0,
                    'debit_base': base_amt,
                    'credit_base': 0.0
                })
            if r.get('credit_account_id'):
                entry_lines.append({
                    'entry_id': r['id'],
                    'account_id': r.get('credit_account_id'),
                    'line_description': r.get('description') or '',
                    'debit': 0.0,
                    'credit': amt,
                    'debit_base': 0.0,
                    'credit_base': base_amt
                })
        r['lines'] = entry_lines
    return rows


def add_journal_entry(payload):
    data = payload.get('data') or payload
    j_id = clean_str(data.get('id') or data.get('entry_id')) or generate_id("JV")
    j_no = clean_str(data.get('entry_no')) or j_id
    j_date = clean_str(data.get('date') or data.get('entry_date')) or today_str()
    desc = clean_str(data.get('description') or data.get('statement') or data.get('notes') or 'قيد محاسبي')
    deb_acc = clean_str(data.get('debit_account_id') or data.get('debit') or 'ACC-1111')
    crd_acc = clean_str(data.get('credit_account_id') or data.get('credit') or 'ACC-4111')
    amt = clean_num(data.get('amount') or data.get('total_amount') or 0.0)
    curr = clean_str(data.get('currency') or 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    base_amt = clean_num(data.get('base_amount') or (amt * rate))
    ref_type = clean_str(data.get('ref_type') or 'Manual')
    ref_id = clean_str(data.get('ref_id') or '')
    notes = clean_str(data.get('notes') or '')

    query = """
        INSERT INTO journal_entries (
            id, entry_no, entry_date, description, debit_account_id,
            credit_account_id, amount, total_amount, base_amount, ref_type,
            ref_id, currency, exchange_rate, status, notes
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Posted', %s
        )
        ON CONFLICT (entry_no) DO UPDATE SET
            description = EXCLUDED.description,
            amount = EXCLUDED.amount,
            total_amount = EXCLUDED.total_amount,
            base_amount = EXCLUDED.base_amount,
            debit_account_id = EXCLUDED.debit_account_id,
            credit_account_id = EXCLUDED.credit_account_id,
            currency = EXCLUDED.currency,
            exchange_rate = EXCLUDED.exchange_rate,
            notes = EXCLUDED.notes
        RETURNING *;
    """
    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, rate)
        if curr != 'YER' and (base_amt <= 0 or base_amt == amt):
            base_amt = amt * rate

        deb_acc = resolve_account_id(
            cur,
            data.get('debit_account_id') or data.get('debit') or data.get('debit_code') or 'ACC-101',
            'ACC-101'
        )
        crd_acc = resolve_account_id(
            cur,
            data.get('credit_account_id') or data.get('credit') or data.get('credit_code') or 'ACC-401',
            'ACC-401'
        )
        params = (j_id, j_no, j_date, desc, deb_acc, crd_acc, amt, amt, base_amt, ref_type, ref_id, curr, rate, notes)
        cur.execute(query, params)
        res = dict(cur.fetchone())

        if amt > 0:
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (res['id'],))
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
            """, (generate_id("JVL"), res['id'], deb_acc, f"مدين - {desc}", amt, base_amt))
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (generate_id("JVL"), res['id'], crd_acc, f"دائن - {desc}", amt, base_amt))

        if res.get('created_at'):
            res['created_at'] = str(res['created_at'])
        return res


def delete_journal_entry(payload):
    data = payload.get('data') or payload
    jid = clean_str(data.get('id'))
    entry_no = clean_str(data.get('entry_no'))
    ref_id = clean_str(data.get('ref_id'))
    with get_db_cursor(commit=True) as cur:
        if jid:
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (jid,))
            cur.execute("DELETE FROM journal_entries WHERE id = %s;", (jid,))
        elif entry_no:
            cur.execute("DELETE FROM journal_entries WHERE entry_no = %s;", (entry_no,))
        elif ref_id:
            cur.execute("DELETE FROM journal_entries WHERE ref_id = %s;", (ref_id,))
    return {"deleted": True}
