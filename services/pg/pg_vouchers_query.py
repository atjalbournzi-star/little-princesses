# services/pg/pg_vouchers_query.py
# Universal Financial Vouchers & Transactions Data Source
import re
from .db_pool import execute_query, clean_num, clean_str, today_str


def _is_cash_bank_account(acc, acc_id):
    if not acc_id:
        return False
    if acc:
        cat = (acc.get('account_category') or '').lower()
        code = str(acc.get('account_code') or '')
        name = acc.get('account_name') or ''
        if cat in ('cash', 'banks') or code.startswith('101') or code.startswith('102'):
            return True
        return any(w in name for w in ('صندوق', 'خزينة', 'بنك', 'محفظة', 'كريمي', 'نقدية'))
    clean = acc_id.replace('ACC-', '')
    return clean.startswith('101') or clean.startswith('102')


def _format_acc_title(acc, raw_id):
    if not raw_id:
        return '101 - الصندوق الرئيسي'
    if acc:
        return f"{acc.get('account_code')} - {acc.get('account_name')}"
    return f"{raw_id.replace('ACC-', '')} - حساب مالي"


def _extract_party_name(desc, notes, lines, default='طرف عام'):
    m = re.search(r':\s*(.+)$', desc or '')
    if m and len(m.group(1).strip()) > 1:
        return m.group(1).strip()
    if '-' in (desc or '') and any(w in desc for w in ('سند', 'قيد', 'إيداع')):
        part = desc.split('-')[-1].strip()
        if len(part) > 1:
            return part
    for l in (lines or []):
        m_l = re.search(r'\((.+?)\)', l.get('line_description') or '')
        if m_l and len(m_l.group(1).strip()) > 1:
            return m_l.group(1).strip()
    if notes and '-' in notes:
        return notes.split('-')[-1].strip()
    return default


def get_vouchers(params=None):
    """استرجاع شامل وديناميكي لكافة السندات والعمليات المالية والقيود المحاسبية"""
    acc_rows = execute_query("SELECT id, account_code, account_name, account_type, account_category, currency FROM chart_of_accounts;", fetch_all=True) or []
    acc_map = {}
    for a in acc_rows:
        acc_map[a['id']] = a
        acc_map[a['account_code']] = a

    payments = execute_query("""
        SELECT p.id, p.payment_no, p.payment_type, p.amount, p.currency, p.exchange_rate,
               p.base_amount, p.payment_method, p.account_id, p.date as date_created,
               p.notes, p.status, p.target_account_id, p.reference_no, p.order_id, p.invoice_id, p.created_at,
               COALESCE(NULLIF(p.party_name, ''), c.name, s.name, 'طرف عام') as party_name
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.created_at DESC;
    """, fetch_all=True) or []

    j_entries = execute_query("""
        SELECT id, entry_no, entry_date, description, debit_account_id, credit_account_id,
               amount, total_amount, base_amount, ref_type, ref_id, currency,
               exchange_rate, status, notes, created_at
        FROM journal_entries ORDER BY created_at DESC;
    """, fetch_all=True) or []

    j_lines = execute_query("""
        SELECT id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base
        FROM journal_entry_lines ORDER BY id ASC;
    """, fetch_all=True) or []

    lines_map = {}
    for l in j_lines:
        lines_map.setdefault(l['entry_id'], []).append(l)

    results = []
    seen_refs = set()

    for p in payments:
        v_no = clean_str(p.get('payment_no') or p.get('id'))
        seen_refs.add(v_no)
        seen_refs.add(p['id'])
        seen_refs.add(f"AUTO-VCH-{v_no}")
        seen_refs.add(f"JV-{p['id']}")
        if p.get('invoice_id'):
            inv_str = str(p['invoice_id'])
            seen_refs.add(inv_str)
            seen_refs.add(f"JV-PUR-{inv_str.replace('PUR-', '')}")
        amt = clean_num(p.get('amount'))
        rate = clean_num(p.get('exchange_rate'), 1.0)
        curr = clean_str(p.get('currency') or 'YER')
        base_amt = clean_num(p.get('base_amount')) or (amt * rate)
        raw_p_type = clean_str(p.get('payment_type') or 'Receipt')
        is_rcpt = raw_p_type in ('Receipt', 'سند قبض', 'سند_قبض')
        target_acc = clean_str(p.get('target_account_id') or ('ACC-104' if is_rcpt else 'ACC-201'))
        tgt_obj = acc_map.get(target_acc)
        tgt_code = str(tgt_obj.get('account_code') or target_acc) if tgt_obj else target_acc
        v_type = 'إيداع رأس مال' if (is_rcpt and tgt_code.startswith('301')) else ('سند قبض' if is_rcpt else 'سند صرف')
        results.append({
            'id': p['id'], 'v_no': v_no, 'voucher_no': v_no, 'payment_no': v_no,
            'v_type': v_type, 'voucher_type': v_type, 'isReceipt': is_rcpt,
            'party': p.get('party_name') or 'طرف عام', 'party_name': p.get('party_name') or 'طرف عام',
            'amount': amt, 'currency': curr, 'exchange_rate': rate, 'base_amount': base_amt,
            'pay_method': clean_str(p.get('payment_method') or 'نقدي (كاش)'),
            'date': str(p.get('date_created') or today_str()), 'date_created': str(p.get('date_created') or today_str()),
            'notes': p.get('notes') or f"{v_type} {v_no}",
            'account': _format_acc_title(acc_map.get(p.get('account_id')), p.get('account_id')),
            'account_id': p.get('account_id'),
            'target_account': _format_acc_title(tgt_obj, target_acc), 'target_acc': target_acc,
            'status': p.get('status') or 'Posted', 'created_at': str(p.get('created_at') or '')
        })

    for j in j_entries:
        jid = j.get('id')
        eno = clean_str(j.get('entry_no') or jid)
        ref_id = clean_str(j.get('ref_id') or '')
        if eno in seen_refs or jid in seen_refs or ref_id in seen_refs:
            continue
        clean_v_no = eno.replace('AUTO-VCH-', '').replace('JV-AUTO-VCH-', '')
        if clean_v_no in seen_refs:
            continue
        seen_refs.add(eno)
        seen_refs.add(clean_v_no)

        lines = lines_map.get(jid) or []
        desc = j.get('description') or ''
        amt = clean_num(j.get('amount') or j.get('total_amount'))
        curr = clean_str(j.get('currency') or 'YER')
        rate = clean_num(j.get('exchange_rate'), 1.0)
        base_amt = clean_num(j.get('base_amount')) or (amt * rate)

        cash_deb = [l for l in lines if _is_cash_bank_account(acc_map.get(l.get('account_id')), l.get('account_id')) and clean_num(l.get('debit')) > 0]
        cash_crd = [l for l in lines if _is_cash_bank_account(acc_map.get(l.get('account_id')), l.get('account_id')) and clean_num(l.get('credit')) > 0]
        non_cash = [l for l in lines if not _is_cash_bank_account(acc_map.get(l.get('account_id')), l.get('account_id'))]

        is_rcpt = False
        v_type = 'قيد يومية'
        fin_acc, target_acc = '', ''

        if cash_deb and not cash_crd:
            is_rcpt = True
            fin_acc = cash_deb[0].get('account_id')
            target_acc = non_cash[0].get('account_id') if non_cash else (lines[-1].get('account_id') if lines else '')
            tgt_code = str(acc_map.get(target_acc, {}).get('account_code') or target_acc)
            v_type = 'إيداع رأس مال' if (tgt_code.startswith('301') or 'رأس مال' in desc or 'شريك' in desc) else 'سند قبض'
        elif cash_crd and not cash_deb:
            is_rcpt = False
            fin_acc = cash_crd[0].get('account_id')
            target_acc = non_cash[0].get('account_id') if non_cash else (lines[0].get('account_id') if lines else '')
            v_type = 'سند صرف'
        elif cash_deb and cash_crd:
            is_rcpt = True
            fin_acc = cash_deb[0].get('account_id')
            target_acc = cash_crd[0].get('account_id')
            v_type = 'قيد مركب'
        else:
            deb_acc = j.get('debit_account_id')
            crd_acc = j.get('credit_account_id')
            if _is_cash_bank_account(acc_map.get(deb_acc), deb_acc):
                is_rcpt, fin_acc, target_acc = True, deb_acc, crd_acc
                v_type = 'إيداع رأس مال' if '301' in str(crd_acc) or 'شريك' in desc else 'سند قبض'
            elif _is_cash_bank_account(acc_map.get(crd_acc), crd_acc):
                is_rcpt, fin_acc, target_acc = False, crd_acc, deb_acc
                v_type = 'سند صرف'
            else:
                fin_acc, target_acc = deb_acc or '', crd_acc or ''
                v_type = 'قيد تسوية' if 'تسوية' in desc else 'قيد يومية'

        fin_obj = acc_map.get(fin_acc)
        tgt_obj = acc_map.get(target_acc)
        fin_code = str(fin_obj.get('account_code') or fin_acc) if fin_obj else fin_acc
        party = _extract_party_name(desc, j.get('notes'), lines, default=(tgt_obj.get('account_name') if tgt_obj else 'طرف عام'))
        pay_method = 'نقد (كاش)' if fin_code.startswith('101') else ('تحويل بنكي / محفظة' if fin_code.startswith('102') else 'قيد محاسبي')

        results.append({
            'id': jid, 'v_no': clean_v_no, 'voucher_no': clean_v_no, 'payment_no': clean_v_no,
            'v_type': v_type, 'voucher_type': v_type, 'isReceipt': is_rcpt,
            'party': party, 'party_name': party, 'amount': amt, 'currency': curr,
            'exchange_rate': rate, 'base_amount': base_amt, 'pay_method': pay_method,
            'date': str(j.get('entry_date') or today_str()), 'date_created': str(j.get('entry_date') or today_str()),
            'notes': j.get('notes') or desc,
            'account': _format_acc_title(fin_obj, fin_acc), 'account_id': fin_acc,
            'target_account': _format_acc_title(tgt_obj, target_acc), 'target_acc': target_acc,
            'status': j.get('status') or 'Posted', 'created_at': str(j.get('created_at') or '')
        })

    results.sort(key=lambda x: str(x.get('created_at') or x.get('date')), reverse=True)
    return results


def get_voucher_card_data(voucher_id):
    """تجهيز واستخراج بيانات بطاقة السند الرسمية للطباعة والمعاينة"""
    all_v = get_vouchers()
    v_clean = clean_str(voucher_id).lower()
    found = next((v for v in all_v if v_clean in (str(v.get('id', '')).lower(), str(v.get('v_no', '')).lower(), str(v.get('voucher_no', '')).lower())), None)
    if not found:
        return {'success': False, 'error': 'Voucher not found'}
    is_r = found.get('isReceipt', True)
    curr = found.get('currency', 'YER')
    curr_label = {'YER': 'ريال يمني', 'SAR': 'ريال سعودي', 'USD': 'دولار أمريكي'}.get(curr, curr)
    return {
        'success': True, 'voucher_no': found['v_no'], 'voucher_type': found['v_type'],
        'is_receipt': is_r, 'party_name': found['party'],
        'party_title': 'المقبوض منه / وصل من' if is_r else 'المدفوع لأمره / صرف إلى',
        'badge_label': f"إشعار معتمد / {found['v_type']}",
        'formatted_amount': f"{found['amount']:,.2f}", 'currency': curr,
        'currency_label': curr_label, 'pay_method': found['pay_method'],
        'date': found['date'], 'notes': found['notes'],
        'account': found['account'], 'target_account': found['target_account']
    }
