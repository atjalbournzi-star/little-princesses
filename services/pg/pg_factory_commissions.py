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

    query = "SELECT * FROM tailor_commissions WHERE 1=1"
    args = []
    if emp_id:
        query += " AND employee_id = %s"
        args.append(emp_id)
    if emp_name:
        query += " AND employee_name = %s"
        args.append(emp_name)
    if po_id:
        query += " AND (production_order_id = %s OR order_no = %s)"
        args.extend([po_id, po_id])

    query += " ORDER BY created_at DESC;"
    rows = execute_query(query, tuple(args) if args else None, fetch_all=True)
    res = []
    for r in rows:
        d = dict(r)
        for fld in ['target_due_date', 'completed_at', 'approved_at', 'created_at', 'paid_at']:
            if d.get(fld):
                d[fld] = str(d[fld])
        if d.get('order_date'):
            d['order_date'] = str(d['order_date'])
        d['wage_amount'] = float(d.get('wage_amount') or 0.0)
        d['quality_score'] = float(d['quality_score']) if d.get('quality_score') is not None else None
        d['pieces_count'] = int(d.get('pieces_count') or 1)
        d['production_type'] = str(d.get('production_type') or 'custom')
        d['is_on_time'] = bool(d.get('is_on_time', True))
        res.append(d)
    return res


def get_tailor_payout_summary(params=None):
    with get_db_cursor(commit=False) as cur:
        cur.execute("""
            SELECT 
                COALESCE(tc.employee_name, 'الخياط') as employee_name,
                MAX(tc.employee_id) as employee_id,
                MAX(tc.role) as role,
                COUNT(*) FILTER (WHERE tc.status = 'Approved' AND tc.paid_at IS NULL) as unpaid_tasks_count,
                COALESCE(SUM(tc.pieces_count) FILTER (WHERE tc.status = 'Approved' AND tc.paid_at IS NULL), 0) as unpaid_pieces_count,
                COALESCE(SUM(tc.wage_amount) FILTER (WHERE tc.status = 'Approved' AND tc.paid_at IS NULL), 0.0) as unpaid_total_amount,
                COUNT(*) FILTER (WHERE tc.status = 'Paid' OR tc.paid_at IS NOT NULL) as paid_tasks_count,
                COALESCE(SUM(tc.pieces_count) FILTER (WHERE tc.status = 'Paid' OR tc.paid_at IS NOT NULL), 0) as paid_pieces_count,
                COALESCE(SUM(tc.wage_amount) FILTER (WHERE tc.status = 'Paid' OR tc.paid_at IS NOT NULL), 0.0) as paid_total_amount,
                ROUND(AVG(tc.quality_score), 1) as avg_quality,
                ROUND(100.0 * COUNT(*) FILTER (WHERE tc.is_on_time = true) / GREATEST(COUNT(*), 1), 1) as on_time_rate,
                MAX(tc.completed_at) as latest_completion
            FROM tailor_commissions tc
            GROUP BY COALESCE(tc.employee_name, 'الخياط')
            ORDER BY unpaid_total_amount DESC, latest_completion DESC;
        """)
        rows = cur.fetchall()
        res = []
        for r in rows:
            d = dict(r)
            d['unpaid_tasks_count'] = int(d['unpaid_tasks_count'] or 0)
            d['unpaid_pieces_count'] = int(d['unpaid_pieces_count'] or 0)
            d['unpaid_total_amount'] = float(d['unpaid_total_amount'] or 0.0)
            d['paid_tasks_count'] = int(d['paid_tasks_count'] or 0)
            d['paid_pieces_count'] = int(d['paid_pieces_count'] or 0)
            d['paid_total_amount'] = float(d['paid_total_amount'] or 0.0)
            d['avg_quality'] = float(d['avg_quality'] or 5.0)
            d['on_time_rate'] = float(d['on_time_rate'] or 100.0)
            if d.get('latest_completion'):
                d['latest_completion'] = str(d['latest_completion'])
            res.append(d)
        return res


def get_tailor_unpaid_pieces(params=None):
    data = params or {}
    emp_name = clean_str(data.get('employee_name') or data.get('name'))
    emp_id = clean_str(data.get('employee_id') or data.get('emp_id'))
    status_filter = clean_str(data.get('status') or 'unpaid')

    with get_db_cursor(commit=False) as cur:
        query = """
            SELECT 
                tc.id, tc.production_order_id, tc.order_no, tc.employee_id, tc.employee_name,
                tc.role, tc.product_name, tc.child_name, tc.stage, tc.wage_amount,
                COALESCE(tc.pieces_count, 1) as pieces_count,
                COALESCE(tc.production_type, CASE WHEN POSITION('مخزن' IN tc.child_name) > 0 THEN 'stock' ELSE 'custom' END) as production_type,
                COALESCE(tc.order_date, po.start_date, tc.created_at::date) as order_date,
                tc.completed_at, tc.is_on_time, tc.quality_score, tc.quality_notes,
                tc.status, tc.approved_by, tc.approved_at, tc.payout_voucher_no, tc.paid_at
            FROM tailor_commissions tc
            LEFT JOIN production_orders po ON tc.production_order_id = po.id
            WHERE 1=1
        """
        args = []
        if emp_name:
            query += " AND tc.employee_name = %s"
            args.append(emp_name)
        elif emp_id:
            query += " AND (tc.employee_id = %s OR tc.employee_name = %s)"
            args.extend([emp_id, emp_id])

        if status_filter == 'unpaid':
            query += " AND (tc.status = 'Approved' AND tc.paid_at IS NULL)"
        elif status_filter == 'paid':
            query += " AND (tc.status = 'Paid' OR tc.paid_at IS NOT NULL)"

        query += " ORDER BY tc.created_at DESC;"
        cur.execute(query, tuple(args) if args else None)
        rows = cur.fetchall()
        res = []
        for r in rows:
            d = dict(r)
            for fld in ['completed_at', 'approved_at', 'paid_at']:
                if d.get(fld):
                    d[fld] = str(d[fld])
            if d.get('order_date'):
                d['order_date'] = str(d['order_date'])
            d['wage_amount'] = float(d.get('wage_amount') or 0.0)
            d['quality_score'] = float(d.get('quality_score') or 5.0)
            d['pieces_count'] = int(d.get('pieces_count') or 1)
            d['is_on_time'] = bool(d.get('is_on_time', True))
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
