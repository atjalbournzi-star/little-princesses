# services/pg/pg_vouchers_query.py
# Universal Financial Vouchers & Transactions Data Source - Ultra Fast Query Engine
from db_client import get_db_cursor, logger
from psycopg2 import extras
from .db_pool import clean_num, clean_str, today_str


def get_vouchers(params=None, voucher_id=None):
    """استرجاع سريع ومطبّع ومفهرس للسندات المالية والمعاملات والقيود مع حد افتراضي 100"""
    vid = clean_str(voucher_id or (params.get('voucher_id') if isinstance(params, dict) else None))
    limit = int(clean_num(params.get('limit'), 100)) if (isinstance(params, dict) and params.get('limit')) else 100

    p_filter = 'WHERE (p.id = %s OR p.payment_no = %s OR p.reference_no = %s)' if vid else ''
    j_filter = 'AND (j.id = %s OR j.entry_no = %s OR j.ref_id = %s)' if vid else ''
    sql_params = (vid, vid, vid, vid, vid, vid, limit) if vid else (limit,)

    query = f"""
    WITH p_data AS (
        SELECT 
            p.id::text, 
            p.payment_no::text AS v_no,
            p.payment_no::text AS voucher_no,
            p.payment_no::text AS payment_no,
            CASE 
                WHEN p.payment_type IN ('Receipt', 'سند قبض', 'سند_قبض') THEN 
                    CASE WHEN tgt.account_code LIKE '301%%' OR p.notes LIKE '%%رأس مال%%' THEN 'إيداع رأس مال' ELSE 'سند قبض' END
                ELSE 'سند صرف'
            END AS v_type,
            CASE 
                WHEN p.payment_type IN ('Receipt', 'سند قبض', 'سند_قبض') THEN 
                    CASE WHEN tgt.account_code LIKE '301%%' OR p.notes LIKE '%%رأس مال%%' THEN 'إيداع رأس مال' ELSE 'سند قبض' END
                ELSE 'سند صرف'
            END AS voucher_type,
            (p.payment_type IN ('Receipt', 'سند قبض', 'سند_قبض')) AS "isReceipt",
            (p.payment_type NOT IN ('Receipt', 'سند قبض', 'سند_قبض')) AS "isPayment",
            COALESCE(NULLIF(p.party_name, ''), c.name, s.name, '') AS party,
            COALESCE(NULLIF(p.party_name, ''), c.name, s.name, '') AS party_name,
            p.amount,
            p.currency,
            p.exchange_rate,
            p.base_amount,
            COALESCE(p.payment_method, 'نقد (كاش)') AS pay_method,
            p.date::text AS date,
            p.date::text AS date_created,
            COALESCE(p.notes, '') AS notes,
            CASE 
                WHEN p_leaf.account_name IS NOT NULL THEN CONCAT(p_leaf.account_code, ' - ', p_leaf.account_name)
                WHEN acc.account_name IS NOT NULL THEN CONCAT(acc.account_code, ' - ', acc.account_name) 
                ELSE COALESCE(p.account_id::text, '') 
            END AS account,
            COALESCE(p_leaf.id, p.account_id::text) AS account_id,
            CASE 
                WHEN tgt.account_name IS NOT NULL THEN CONCAT(tgt.account_code, ' - ', tgt.account_name) 
                ELSE COALESCE(p.target_account_id::text, '') 
            END AS target_account,
            p.target_account_id::text AS target_acc,
            COALESCE(p.status, 'Confirmed') AS status,
            p.created_at
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN chart_of_accounts acc ON (p.account_id = acc.id OR p.account_id = acc.account_code)
        LEFT JOIN chart_of_accounts p_leaf ON (acc.is_group = TRUE AND p_leaf.parent_account_id = acc.id AND p_leaf.is_postable = TRUE AND (p_leaf.currency = p.currency OR p_leaf.account_code LIKE '101.1%%'))
        LEFT JOIN chart_of_accounts tgt ON (p.target_account_id = tgt.id OR p.target_account_id = tgt.account_code)
        {p_filter}
    ),
    j_data AS (
        SELECT 
            j.id::text, 
            j.entry_no::text AS v_no,
            j.entry_no::text AS voucher_no,
            j.entry_no::text AS payment_no,
            'قيد يومية'::text AS v_type,
            'قيد يومية'::text AS voucher_type,
            FALSE AS "isReceipt",
            FALSE AS "isPayment",
            COALESCE(NULLIF(j.description, ''), 'طرف عام') AS party,
            COALESCE(NULLIF(j.description, ''), 'طرف عام') AS party_name,
            j.amount,
            j.currency,
            j.exchange_rate,
            j.base_amount,
            'قيد محاسبي'::text AS pay_method,
            j.entry_date::text AS date,
            j.entry_date::text AS date_created,
            COALESCE(j.notes, j.description, '') AS notes,
            CASE 
                WHEN j_leaf.account_name IS NOT NULL THEN CONCAT(j_leaf.account_code, ' - ', j_leaf.account_name)
                WHEN deb.account_name IS NOT NULL THEN CONCAT(deb.account_code, ' - ', deb.account_name) 
                ELSE COALESCE(j.debit_account_id::text, '') 
            END AS account,
            COALESCE(j_leaf.id, j.debit_account_id::text) AS account_id,
            CASE 
                WHEN crd.account_name IS NOT NULL THEN CONCAT(crd.account_code, ' - ', crd.account_name) 
                ELSE COALESCE(j.credit_account_id::text, '') 
            END AS target_account,
            j.credit_account_id::text AS target_acc,
            COALESCE(j.status, 'Posted') AS status,
            j.created_at
        FROM journal_entries j
        LEFT JOIN chart_of_accounts deb ON (j.debit_account_id = deb.id OR j.debit_account_id = deb.account_code)
        LEFT JOIN chart_of_accounts j_leaf ON (deb.is_group = TRUE AND j_leaf.parent_account_id = deb.id AND j_leaf.is_postable = TRUE AND (j_leaf.currency = j.currency OR j_leaf.account_code LIKE '101.1%%'))
        LEFT JOIN chart_of_accounts crd ON (j.credit_account_id = crd.id OR j.credit_account_id = crd.account_code)
        WHERE (j.entry_no IS NULL OR (j.entry_no NOT LIKE 'AUTO-VCH%%' AND j.entry_no NOT LIKE 'JV-PUR%%' AND j.entry_no NOT LIKE 'JV-PAY%%' AND j.entry_no NOT LIKE 'JV-ORD%%' AND j.entry_no NOT LIKE 'JV-EXP%%'))
          AND (j.ref_type IS NULL OR j.ref_type NOT IN ('Payment', 'Receipt', 'Purchase', 'Order', 'Expense'))
          {j_filter}
    )
    SELECT * FROM (
        SELECT * FROM p_data
        UNION ALL
        SELECT * FROM j_data
    ) combined
    ORDER BY created_at DESC
    LIMIT %s;
    """

    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute(query, sql_params)
            rows = [dict(r) for r in cur.fetchall()]
    except Exception as e:
        logger.error(f"Vouchers query error: {e}")
        rows = []

    results = []
    for r in rows:
        amt = clean_num(r.get('amount'))
        rate = clean_num(r.get('exchange_rate'), 1.0)
        curr = clean_str(r.get('currency') or 'YER')
        base = clean_num(r.get('base_amount')) or (amt * rate)
        r['amount'] = amt
        r['exchange_rate'] = rate
        r['currency'] = curr
        r['base_amount'] = base
        r['date'] = str(r.get('date') or today_str())
        r['date_created'] = r['date']
        r['created_at'] = str(r.get('created_at') or '')
        results.append(r)

    return results


def get_voucher_card_data(voucher_id):
    """استعلام مباشر وفوري لبيانات بطاقة السند المطلوبة فقط للطباعة والمعاينة"""
    v_clean = clean_str(voucher_id)
    if not v_clean:
        return {'success': False, 'error': 'Voucher ID is required'}
    vouchers = get_vouchers(voucher_id=v_clean)
    if not vouchers:
        return {'success': False, 'error': 'Voucher not found'}
    v = vouchers[0]
    is_r, curr = v.get('isReceipt', True), clean_str(v.get('currency') or 'YER')
    curr_label = {'YER': 'ريال يمني', 'SAR': 'ريال سعودي', 'USD': 'دولار أمريكي'}.get(curr, curr)
    return {
        'success': True, 'voucher_no': v.get('v_no') or '', 'voucher_type': v.get('v_type') or '',
        'is_receipt': is_r, 'party_name': v.get('party') or '',
        'party_title': 'المقبوض منه / وصل من' if is_r else 'المدفوع لأمره / صرف إلى',
        'badge_label': f"إشعار معتمد / {v.get('v_type')}" if v.get('v_type') else 'إشعار معتمد',
        'formatted_amount': f"{clean_num(v.get('amount')):,.2f}", 'currency': curr,
        'currency_label': curr_label, 'pay_method': v.get('pay_method') or '',
        'date': v.get('date') or '', 'notes': v.get('notes') or '',
        'account': v.get('account') or '', 'target_account': v.get('target_account') or ''
    }
