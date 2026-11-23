import logging
from .db_pool import get_db_cursor, execute_query, clean_str

logger = logging.getLogger("LittlePrincesses_PG_FactoryCommissions")


def get_tailor_commissions(params=None):
    emp_id = None
    emp_name = None
    po_id = None
    if isinstance(params, dict):
        emp_id = clean_str(params.get('employee_id') or params.get('emp_id'))
        emp_name = clean_str(params.get('employee_name') or params.get('name'))
        po_id = clean_str(params.get('order_id') or params.get('po_id'))

    query = """
        SELECT prl.id, prl.worker_id as employee_id, prl.worker_name as employee_name,
               COALESCE(e.role, 'فني تشغيل وتفصيل') as role,
               COALESCE(po.product_name, 'فستان ملكي') as product_name,
               COALESCE(po.child_name, 'الأميرة') as child_name,
               prl.stage_id as stage,
               (prl.piece_rate_amount * COALESCE(prl.pieces_count, 1)) as wage_amount,
               COALESCE(prl.pieces_count, 1) as pieces_count,
               prl.production_order_id,
               COALESCE(po.production_order_no, prl.production_order_id, '-') as order_no,
               CASE 
                   WHEN prl.paid_at IS NOT NULL OR prl.payment_status = 'paid' THEN 'Paid' 
                   WHEN (prl.qa_status ILIKE '%%pass%%' OR prl.qa_status ILIKE '%%approv%%') THEN 'Approved' 
                   ELSE 'Pending QA' 
               END as status,
               prl.qa_status, prl.completed_at, prl.created_at, prl.paid_at,
               prl.voucher_no as payout_voucher_no, true as is_on_time, 5.0 as quality_score
        FROM piece_rate_logs prl
        LEFT JOIN production_orders po ON (po.id = prl.production_order_id OR po.production_order_no = prl.production_order_id)
        LEFT JOIN employees e ON (e.id = prl.worker_id OR e.name = prl.worker_name)
        WHERE 1=1
    """
    args = []
    if emp_id:
        query += " AND (prl.worker_id = %s OR e.id = %s)"
        args.extend([emp_id, emp_id])
    if emp_name:
        query += " AND (prl.worker_name = %s OR e.name = %s)"
        args.extend([emp_name, emp_name])
    if po_id:
        query += " AND (prl.production_order_id = %s OR po.production_order_no = %s)"
        args.extend([po_id, po_id])

    query += " ORDER BY prl.created_at DESC;"
    rows = execute_query(query, tuple(args) if args else None, fetch_all=True) or []
    res = []
    for r in rows:
        d = dict(r)
        for fld in ['completed_at', 'approved_at', 'created_at', 'paid_at']:
            if d.get(fld): d[fld] = str(d[fld])
        d['wage_amount'] = float(d.get('wage_amount') or 0.0)
        d['quality_score'] = float(d['quality_score']) if d.get('quality_score') is not None else 5.0
        d['pieces_count'] = int(d.get('pieces_count') or 1)
        d['is_on_time'] = True
        res.append(d)
    return res


def get_tailor_payout_summary(params=None):
    with get_db_cursor(commit=False) as cur:
        cur.execute("""
            SELECT 
                COALESCE(prl.worker_name, 'الخياط') as employee_name,
                MAX(prl.worker_id) as employee_id,
                COALESCE(MAX(e.role), 'فني تشغيل وتفصيل') as role,
                COUNT(*) FILTER (WHERE prl.paid_at IS NULL AND (prl.payment_status IN ('Accrued', 'pending', 'معلق') OR prl.payment_status IS NULL) AND (prl.qa_status ILIKE '%pass%' OR prl.qa_status ILIKE '%approv%')) as unpaid_tasks_count,
                COALESCE(SUM(COALESCE(prl.pieces_count, 1)) FILTER (WHERE prl.paid_at IS NULL AND (prl.payment_status IN ('Accrued', 'pending', 'معلق') OR prl.payment_status IS NULL) AND (prl.qa_status ILIKE '%pass%' OR prl.qa_status ILIKE '%approv%')), 0) as unpaid_pieces_count,
                COALESCE(SUM(prl.piece_rate_amount * COALESCE(prl.pieces_count, 1)) FILTER (WHERE prl.paid_at IS NULL AND (prl.payment_status IN ('Accrued', 'pending', 'معلق') OR prl.payment_status IS NULL) AND (prl.qa_status ILIKE '%pass%' OR prl.qa_status ILIKE '%approv%')), 0.0) as unpaid_total_amount,
                COUNT(*) FILTER (WHERE prl.payment_status = 'paid' OR prl.paid_at IS NOT NULL) as paid_tasks_count,
                COALESCE(SUM(COALESCE(prl.pieces_count, 1)) FILTER (WHERE prl.payment_status = 'paid' OR prl.paid_at IS NOT NULL), 0) as paid_pieces_count,
                COALESCE(SUM(prl.piece_rate_amount * COALESCE(prl.pieces_count, 1)) FILTER (WHERE prl.payment_status = 'paid' OR prl.paid_at IS NOT NULL), 0.0) as paid_total_amount,
                5.0 as avg_quality,
                100.0 as on_time_rate,
                MAX(prl.completed_at) as latest_completion
            FROM piece_rate_logs prl
            LEFT JOIN employees e ON (e.id = prl.worker_id OR e.name = prl.worker_name)
            GROUP BY COALESCE(prl.worker_name, 'الخياط')
            ORDER BY unpaid_total_amount DESC, latest_completion DESC;
        """)
        rows = cur.fetchall() or []
        res = []
        for r in rows:
            d = dict(r)
            d['unpaid_tasks_count'] = int(d['unpaid_tasks_count'] or 0)
            d['unpaid_pieces_count'] = int(d['unpaid_pieces_count'] or 0)
            d['unpaid_total_amount'] = float(d['unpaid_total_amount'] or 0.0)
            d['paid_tasks_count'] = int(d['paid_tasks_count'] or 0)
            d['paid_pieces_count'] = int(d['paid_pieces_count'] or 0)
            d['paid_total_amount'] = float(d['paid_total_amount'] or 0.0)
            d['avg_quality'] = float(d['avg_quality']) if d.get('avg_quality') is not None else 5.0
            d['on_time_rate'] = float(d['on_time_rate'] or 100.0)
            if d.get('latest_completion'): d['latest_completion'] = str(d['latest_completion'])
            res.append(d)
        return res


def get_tailor_unpaid_pieces(params=None):
    data = params or {}
    emp_name = clean_str(data.get('employee_name') or data.get('name'))
    emp_id = clean_str(data.get('employee_id') or data.get('emp_id'))
    status_filter = clean_str(data.get('status') or 'unpaid')

    with get_db_cursor(commit=False) as cur:
        query = """
            SELECT prl.id, prl.production_order_id,
                   COALESCE(po.production_order_no, prl.production_order_id, '-') as order_no,
                   prl.worker_id as employee_id, prl.worker_name as employee_name,
                   COALESCE(e.role, 'فني تشغيل وتفصيل') as role,
                   COALESCE(po.product_name, 'فستان ملكي') as product_name,
                   COALESCE(po.child_name, 'الأميرة') as child_name,
                   prl.stage_id as stage,
                   prl.piece_rate_amount as wage_amount,
                   COALESCE(prl.pieces_count, 1) as pieces_count,
                   'custom' as production_type,
                   po.start_date as order_date,
                   prl.completed_at, true as is_on_time, 5.0 as quality_score, '' as quality_notes,
                   CASE WHEN prl.payment_status = 'paid' THEN 'Paid' ELSE 'Approved' END as status,
                   'مدير الجودة' as approved_by, prl.completed_at as approved_at,
                   prl.voucher_no as payout_voucher_no, prl.paid_at
            FROM piece_rate_logs prl
            LEFT JOIN production_orders po ON (po.id = prl.production_order_id OR po.production_order_no = prl.production_order_id)
            LEFT JOIN employees e ON (e.id = prl.worker_id OR e.name = prl.worker_name)
            WHERE 1=1
        """
        args = []
        if emp_name:
            query += " AND (prl.worker_name = %s OR e.name = %s)"
            args.extend([emp_name, emp_name])
        elif emp_id:
            query += " AND (prl.worker_id = %s OR e.id = %s)"
            args.extend([emp_id, emp_id])

        if status_filter == 'unpaid':
            query += " AND prl.paid_at IS NULL AND (prl.payment_status IN ('Accrued', 'pending', 'معلق') OR prl.payment_status IS NULL) AND (prl.qa_status ILIKE '%pass%' OR prl.qa_status ILIKE '%approv%')"
        elif status_filter == 'paid':
            query += " AND (prl.payment_status = 'paid' OR prl.paid_at IS NOT NULL)"

        query += " ORDER BY prl.created_at DESC;"
        cur.execute(query, tuple(args) if args else None)
        rows = cur.fetchall() or []
        res = []
        for r in rows:
            d = dict(r)
            for fld in ['completed_at', 'approved_at', 'paid_at', 'order_date']:
                if d.get(fld): d[fld] = str(d[fld])
            d['wage_amount'] = float(d.get('wage_amount') or 0.0)
            d['quality_score'] = float(d.get('quality_score') or 5.0)
            d['pieces_count'] = int(d.get('pieces_count') or 1)
            d['is_on_time'] = True
            res.append(d)
        return res


def get_tailor_payout_vouchers(params=None):
    with get_db_cursor(commit=False) as cur:
        cur.execute("""
            SELECT p.*, coa.account_name
            FROM payments p
            LEFT JOIN chart_of_accounts coa ON p.account_id = coa.id
            WHERE STARTS_WITH(p.payment_no, 'PAY-VCH-') OR POSITION('صرف مستحقات' IN p.notes) > 0
            ORDER BY p.date DESC, p.created_at DESC
            LIMIT 50;
        """)
        rows = cur.fetchall()
        res = []
        for r in rows:
            d = dict(r)
            for fld in ['date', 'created_at']:
                if d.get(fld):
                    d[fld] = str(d[fld])
            d['amount'] = float(d.get('amount') or 0.0)
            d['base_amount'] = float(d.get('base_amount') or 0.0)
            res.append(d)
        return res
