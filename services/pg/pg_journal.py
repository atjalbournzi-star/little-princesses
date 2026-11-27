# services/pg/pg_journal.py
# Journal entries management, multi-line double entry posting, and atomic sequence numbering

import logging
from decimal import Decimal, ROUND_HALF_UP
from .db_pool import (
    get_db_cursor, execute_query, clean_num,
    clean_str, generate_id, today_str
)
from .account_resolver import resolve_exchange_rate, resolve_account_id, resolve_leaf_account
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, get_active_user_context, resolve_active_user_id
from .pg_delivery_cogs import refresh_chart_balances_atomic
from .journal_lines_helper import insert_sorted_journal_lines
from services.security import assert_period_open

logger = logging.getLogger("LittlePrincesses_PG_Journal")


def get_journal_entries(params=None):
    params = params or {}
    try: limit = min(max(int(params.get('limit') or 500), 1), 2000)
    except Exception: limit = 500
    try: offset = max(int(params.get('offset') or 0), 0)
    except Exception: offset = 0
    where_parts, sql_params = [], []
    if params.get('start_date'): where_parts.append("j.entry_date::date >= %s::date"); sql_params.append(clean_str(params.get('start_date')))
    if params.get('end_date'): where_parts.append("j.entry_date::date <= %s::date"); sql_params.append(clean_str(params.get('end_date')))
    where_sql = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""
    sql_params.extend([limit, offset])
    query = f"""
        SELECT j.id, j.entry_no, j.entry_date, j.description, j.debit_account_id,
               j.credit_account_id, j.amount, j.total_amount, j.base_amount, j.ref_type,
               j.ref_id, j.currency, j.exchange_rate, j.status, j.notes, j.created_by, j.created_at,
               COALESCE(json_agg(json_build_object(
                   'id', l.id, 'entry_id', l.entry_id, 'account_id', l.account_id,
                   'line_description', l.line_description, 'debit', COALESCE(l.debit, 0.0),
                   'credit', COALESCE(l.credit, 0.0), 'debit_base', COALESCE(l.debit_base, 0.0),
                   'credit_base', COALESCE(l.credit_base, 0.0)
               ) ORDER BY l.id ASC) FILTER (WHERE l.id IS NOT NULL), '[]'::json) AS lines
        FROM journal_entries j
        LEFT JOIN journal_entry_lines l ON l.entry_id = j.id
        {where_sql}
        GROUP BY j.id, j.entry_no, j.entry_date, j.description, j.debit_account_id,
                 j.credit_account_id, j.amount, j.total_amount, j.base_amount, j.ref_type,
                 j.ref_id, j.currency, j.exchange_rate, j.status, j.notes, j.created_by, j.created_at
        ORDER BY j.created_at DESC
        LIMIT %s OFFSET %s;
    """
    rows = execute_query(query, params=tuple(sql_params), fetch_all=True) or []
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('entry_date'): r['entry_date'] = str(r['entry_date'])
        r['date'] = r.get('entry_date')
        r['statement'] = r.get('description')
        r['debit'] = r.get('debit_account_id')
        r['credit'] = r.get('credit_account_id')
        r['exchange_rate'] = clean_num(r.get('exchange_rate'), 1.0)
        r['party_id'] = r.get('ref_id') or ''
        r['party_type'] = r.get('ref_type') or ''
        r['link_subparty'] = bool(r.get('ref_id'))
        r['general_notes'] = r.get('notes') or ''

        entry_lines = r.get('lines') or []
        if isinstance(entry_lines, str):
            import json
            try: entry_lines = json.loads(entry_lines)
            except Exception: entry_lines = []
        if not entry_lines and (r.get('debit_account_id') or r.get('credit_account_id')):
            amt = clean_num(r.get('amount') or r.get('total_amount'))
            rate = r['exchange_rate']
            base_amt = clean_num(r.get('base_amount')) or (amt * rate)
            if r.get('debit_account_id'):
                entry_lines.append({
                    'entry_id': r['id'], 'account_id': r.get('debit_account_id'),
                    'line_description': r.get('description') or '',
                    'debit': amt, 'credit': 0.0, 'debit_base': base_amt, 'credit_base': 0.0
                })
            if r.get('credit_account_id'):
                entry_lines.append({
                    'entry_id': r['id'], 'account_id': r.get('credit_account_id'),
                    'line_description': r.get('description') or '',
                    'debit': 0.0, 'credit': amt, 'debit_base': 0.0, 'credit_base': base_amt
                })
        r['lines'] = entry_lines
    return rows


def add_journal_entry(payload):
    data = payload.get('data') or payload
    raw_uid = clean_str(data.get('created_by') or data.get('user_id') or '')

    j_id = clean_str(data.get('id') or data.get('entry_id'))
    j_no = clean_str(data.get('entry_no'))
    j_date = clean_str(data.get('date') or data.get('entry_date')) or today_str()
    desc = clean_str(data.get('description') or data.get('statement') or data.get('notes') or 'قيد محاسبي')
    amt = clean_num(data.get('amount') or data.get('total_amount') or 0.0)
    curr = clean_str(data.get('currency') or 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    base_amt = clean_num(data.get('base_amount') or (amt * rate))
    ref_type = clean_str(data.get('ref_type') or data.get('party_type') or 'Manual')
    ref_id = clean_str(data.get('ref_id') or data.get('party_id') or '')
    notes = clean_str(data.get('notes') or data.get('general_notes') or '')

    with get_db_cursor(commit=True) as cur:
        assert_period_open(cur, j_date)
        resolved_user = resolve_active_user_id(cur, raw_uid)
        rate = resolve_exchange_rate(cur, curr, rate)
        rate_dec = Decimal(str(rate))

        lines_data = data.get('lines')
        parsed_lines = []
        if isinstance(lines_data, list) and len(lines_data) > 0:
            tot_deb, tot_crd = Decimal('0'), Decimal('0')
            for l in lines_data:
                d_val = Decimal(str(clean_num(l.get('debit'))))
                c_val = Decimal(str(clean_num(l.get('credit'))))
                if d_val < 0 or c_val < 0 or (d_val > 0 and c_val > 0):
                    raise ValueError("خطأ محاسبي: لا يمكن أن يكون السطر سالباً أو مديناً ودائناً في آنٍ واحد")
                if d_val == 0 and c_val == 0:
                    continue
                raw_acc = l.get('account_id') or l.get('account_code') or l.get('code')
                if not raw_acc:
                    raise ValueError("يرجى تحديد حساب لكل سطر مالي")
                l_acc = resolve_leaf_account(cur, resolve_account_id(cur, raw_acc, None, curr), curr)
                d_base = Decimal(str(clean_num(l.get('debit_base')))) if clean_num(l.get('debit_base')) > 0 else (d_val * rate_dec).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
                c_base = Decimal(str(clean_num(l.get('credit_base')))) if clean_num(l.get('credit_base')) > 0 else (c_val * rate_dec).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
                tot_deb += d_val
                tot_crd += c_val
                parsed_lines.append((l_acc, float(d_val), float(c_val), float(d_base), float(c_base), clean_str(l.get('line_description') or l.get('description') or desc)))
            if len(parsed_lines) < 2 or tot_deb <= 0 or abs(tot_deb - tot_crd) >= Decimal('0.01'):
                raise ValueError("القيد غير متوازن! يجب أن يحتوي القيد على سطرين على الأقل وأن يتساوى مجموع المدين والدائن (> 0)")
            if amt <= 0:
                amt = float(tot_deb)
            base_amt = sum(p[3] for p in parsed_lines)
        else:
            if amt <= 0:
                raise ValueError("مبلغ القيد المحاسبي يجب أن يكون أكبر من الصفر")
            if curr != 'YER' and (base_amt <= 0 or base_amt == amt):
                base_amt = float((Decimal(str(amt)) * rate_dec).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP))

        existing_j = None
        if j_id or j_no:
            cur.execute("SELECT id, entry_no FROM journal_entries WHERE id = %s OR entry_no = %s LIMIT 1 FOR UPDATE;", (j_id or '', j_no or ''))
            existing_j = cur.fetchone()
        if existing_j:
            j_id, j_no = existing_j['id'], existing_j.get('entry_no') or j_no
        else:
            j_no = get_next_sequence_number(cur, 'JV', fallback_prefix='JV-')
            j_id = j_no
        first_deb = next((p[0] for p in parsed_lines if p[1] > 0), None)
        first_crd = next((p[0] for p in parsed_lines if p[2] > 0), None)
        deb_acc = resolve_leaf_account(cur, resolve_account_id(cur, data.get('debit_account_id') or data.get('debit') or data.get('debit_code') or first_deb, first_deb, curr), curr)
        crd_acc = resolve_leaf_account(cur, resolve_account_id(cur, data.get('credit_account_id') or data.get('credit') or data.get('credit_code') or first_crd, first_crd, curr), curr)
        if not deb_acc or not crd_acc:
            raise ValueError("يرجى تحديد حسابات صحيحة للطرف المدين والطرف الدائن")
        query = """
            INSERT INTO journal_entries (
                id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Posted', %s, %s)
            ON CONFLICT (entry_no) DO UPDATE SET
                description = EXCLUDED.description, amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount,
                base_amount = EXCLUDED.base_amount, debit_account_id = EXCLUDED.debit_account_id, credit_account_id = EXCLUDED.credit_account_id,
                currency = EXCLUDED.currency, exchange_rate = EXCLUDED.exchange_rate, notes = EXCLUDED.notes,
                created_by = COALESCE(journal_entries.created_by, EXCLUDED.created_by)
            RETURNING *;
        """
        cur.execute(query, (j_id, j_no, j_date, desc, deb_acc, crd_acc, amt, amt, base_amt, ref_type, ref_id, curr, rate, notes, resolved_user))
        res = dict(cur.fetchone())

        cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (res['id'],))
        if parsed_lines:
            insert_sorted_journal_lines(cur, res['id'], [
                (l_acc, l_desc, l_deb, l_crd, l_deb_b, l_crd_b)
                for l_acc, l_deb, l_crd, l_deb_b, l_crd_b, l_desc in parsed_lines
            ])
        else:
            insert_sorted_journal_lines(cur, res['id'], [
                (deb_acc, f"مدين - {desc}", amt, 0.0, base_amt, 0.0),
                (crd_acc, f"دائن - {desc}", 0.0, amt, 0.0, base_amt),
            ])

        refresh_chart_balances_atomic(cur)

        log_audit_event(
            entity_type='journal_entries',
            entity_id=res['id'],
            action='UPDATE' if existing_j else 'INSERT',
            new_values={'entry_no': j_no, 'amount': amt, 'currency': curr, 'debit': deb_acc, 'credit': crd_acc},
            user_id=resolved_user,
            document_no=j_no,
            details=f"قيد محاسبي {j_no}: {desc}",
            cur=cur
        )

        res['entry_no'] = j_no
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        return res


def delete_journal_entry(payload):
    data = payload.get('data') or payload
    jid, entry_no, ref_id = clean_str(data.get('id')), clean_str(data.get('entry_no')), clean_str(data.get('ref_id'))
    raw_uid = clean_str(data.get('user_id') or data.get('deleted_by') or '')
    with get_db_cursor(commit=True) as cur:
        u_id = resolve_active_user_id(cur, raw_uid)
        t_id = jid or entry_no or ref_id
        if jid:
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (jid,))
            cur.execute("DELETE FROM journal_entries WHERE id = %s;", (jid,))
        elif entry_no:
            cur.execute("DELETE FROM journal_entries WHERE entry_no = %s;", (entry_no,))
        elif ref_id:
            cur.execute("DELETE FROM journal_entries WHERE ref_id = %s;", (ref_id,))
        refresh_chart_balances_atomic(cur)
        log_audit_event('journal_entries', t_id or 'UNKNOWN', 'DELETE', user_id=u_id, document_no=entry_no, details="حذف قيد يومية", cur=cur)
    return {"deleted": True}
