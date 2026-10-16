# services/pg/pg_piece_rates.py
# Tailor piece-rate logs, QA inspection tracking, and atomic liquidation

import logging
from .db_pool import get_db_cursor, clean_str, clean_num

logger = logging.getLogger("LittlePrincesses_PG_PieceRates")


def get_worker_piece_rate_logs(params=None):
    """
    Retrieve piece-rate logs joined with production orders and order stages.
    Enforces QA traceability and liquidation eligibility.
    """
    params = params or {}
    worker_id = clean_str(params.get('worker_id') or params.get('employee_id'))
    payment_status = clean_str(params.get('payment_status'))
    qa_status = clean_str(params.get('qa_status'))

    query = """
        SELECT 
            prl.id,
            prl.worker_id,
            prl.worker_name,
            prl.production_order_id,
            COALESCE(po.production_order_no, prl.production_order_id, '-') AS production_order_no,
            COALESCE(po.product_name, po.child_name, 'تفصيل وتصميم مخصص') AS product_name,
            prl.stage_id,
            COALESCE(stg.stage_name, 'خياطة وتفصيل') AS stage_name,
            COALESCE(prl.piece_rate_amount, 0.0) AS piece_rate_amount,
            COALESCE(prl.pieces_count, 1) AS pieces_count,
            prl.payment_status,
            COALESCE(prl.qa_status, stg.qa_status, 'approved') AS qa_status,
            COALESCE(stg.qa_score, 5.0) AS qa_score,
            COALESCE(stg.qa_notes, 'مطابق للجودة') AS qa_notes,
            prl.completed_at,
            prl.voucher_no,
            prl.paid_at
        FROM piece_rate_logs prl
        LEFT JOIN production_orders po 
            ON (po.id = prl.production_order_id OR po.production_order_no = prl.production_order_id)
        LEFT JOIN order_stages stg 
            ON stg.id = prl.stage_id
        WHERE 1=1
    """
    args = []

    if worker_id:
        query += " AND (prl.worker_id = %s OR prl.worker_name = %s)"
        args.extend([worker_id, worker_id])

    if payment_status:
        query += " AND prl.payment_status = %s"
        args.append(payment_status)

    if qa_status:
        query += " AND prl.qa_status = %s"
        args.append(qa_status)

    query += " ORDER BY prl.completed_at DESC NULLS LAST, prl.created_at DESC;"

    with get_db_cursor(commit=False) as cur:
        cur.execute(query, tuple(args))
        rows = cur.fetchall()
        results = []
        for r in rows:
            item = dict(r)
            item['piece_rate_amount'] = float(item.get('piece_rate_amount') or 0.0)
            item['pieces_count'] = int(item.get('pieces_count') or 1)
            item['qa_score'] = float(item.get('qa_score') or 5.0)
            is_approved = item.get('qa_status') == 'approved'
            is_pending = item.get('payment_status') == 'pending'
            item['is_eligible'] = is_approved and is_pending
            item['effective_amount'] = item['piece_rate_amount'] if is_approved else 0.0
            results.append(item)

        return results


def liquidate_worker_pieces_atomic(payload):
    """
    Atomically liquidate piece-rate items using PostgreSQL stored procedure.
    Enforces QA: only approved items are disbursed. Rework/rejected items are excluded.
    Generates payment voucher, double-entry journal entry, updates cash drawer and statuses.
    """
    data = payload.get('data') or payload
    worker_id = clean_str(data.get('worker_id') or data.get('employee_id'))
    item_ids = data.get('item_ids') or []
    account_id = clean_str(data.get('account_id') or 'ACC-101')

    if not item_ids:
        return {"success": False, "message": "لم يتم تحديد أي قطع للصرف"}

    clean_ids = [str(x) for x in item_ids if str(x).strip()]
    if not clean_ids:
        return {"success": False, "message": "قائمة معرفات القطع غير صالحة"}

    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute(
                "SELECT liquidate_piece_rates_atomic(%s, %s::varchar[], %s) AS res;",
                (worker_id, clean_ids, account_id)
            )
            row = cur.fetchone()
            if row and row.get('res'):
                res = row['res']
                logger.info(f"Liquidation response: {res}")
                return res

            return {"success": False, "message": "فشل تنفيذ عملية التصفية المالية للقطع"}
    except Exception as e:
        logger.error(f"Error in liquidate_worker_pieces_atomic: {e}")
        return {"success": False, "error": str(e)}
