# services/pg/pg_piece_rates.py
# Tailor piece-rate logs, QA inspection tracking, IAS 2 WIP unification, and atomic liquidation
# Architectural Standards: Strictly < 220 lines per file

import logging
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str
from .pg_sequences import get_next_sequence_number
from .account_resolver import resolve_account_id, resolve_labor_liability_account
from .pg_delivery_cogs import refresh_chart_balances_atomic, cascade_account_balances
from .journal_lines_helper import insert_sorted_journal_lines
from services.security import assert_period_open

logger = logging.getLogger("LittlePrincesses_PG_PieceRates")


def get_worker_piece_rate_logs(params=None):
    """Retrieve piece-rate logs joined with production orders and order stages."""
    params = params or {}
    worker_id = clean_str(params.get('worker_id') or params.get('employee_id'))
    payment_status = clean_str(params.get('payment_status'))
    qa_status = clean_str(params.get('qa_status'))

    query = """
        SELECT prl.id, prl.worker_id, prl.worker_name, prl.production_order_id,
            COALESCE(po.production_order_no, prl.production_order_id, '-') AS production_order_no,
            COALESCE(po.product_name, po.child_name, 'تفصيل وتصميم مخصص') AS product_name,
            prl.stage_id, COALESCE(prl.stage_id, 'خياطة وتفصيل') AS stage_name,
            COALESCE(prl.piece_rate_amount, 0.0) AS piece_rate_amount,
            COALESCE(prl.pieces_count, 1) AS pieces_count, prl.payment_status,
            COALESCE(prl.qa_status, 'pending_qa') AS qa_status,
            5.0 AS qa_score, '' AS qa_notes,
            prl.completed_at, prl.voucher_no, prl.paid_at
        FROM piece_rate_logs prl
        LEFT JOIN production_orders po ON (po.id = prl.production_order_id OR po.production_order_no = prl.production_order_id)
        WHERE 1=1
    """
    args = []
    if worker_id:
        query += " AND (prl.worker_id = %s OR prl.worker_name = %s)"
        args.extend([worker_id, worker_id])
    if payment_status:
        if payment_status.lower() in ('pending', 'unpaid', 'معلق', 'accrued'):
            query += " AND prl.paid_at IS NULL AND (prl.payment_status IN ('Accrued', 'pending', 'معلق', 'Pending') OR prl.payment_status IS NULL)"
        else:
            query += " AND prl.payment_status = %s"
            args.append(payment_status)
    if qa_status:
        query += " AND prl.qa_status ILIKE %s"
        args.append(f"%{qa_status}%")

    query += " ORDER BY prl.completed_at DESC NULLS LAST, prl.created_at DESC;"
    with get_db_cursor(commit=False) as cur:
        cur.execute(query, tuple(args))
        rows = cur.fetchall()
        results = []
        for r in rows:
            item = dict(r)
            item['piece_rate_amount'] = float(item.get('piece_rate_amount') or 0.0)
            item['pieces_count'] = int(item.get('pieces_count') or 1)
            item['qa_score'] = float(item['qa_score']) if item.get('qa_score') is not None else 5.0
            is_approved = any(k in str(item.get('qa_status') or '').lower() for k in ('approved', 'passed', 'pass', 'approv'))
            is_paid = bool(item.get('paid_at') or str(item.get('payment_status') or '').lower() == 'paid')
            item['is_eligible'] = is_approved and not is_paid
            item['effective_amount'] = (item['piece_rate_amount'] * item['pieces_count']) if item['is_eligible'] else 0.0
            results.append(item)
        return results


def accrue_piece_rate_to_wip(cur, order_no, po_id, stage_lines, total_wage, desc=None):
    """
    IAS 2 (105.05 - WIP): رسملة أجور القطع مباشرة إلى حساب الإنتاج تحت التشغيل
    مع تحديث production_orders.wip_labor_cost لضمان سلامة المعادلة الخامسة في الرادار.
    """
    from .pg_wip_accounting import record_labor_wip_accrual
    return record_labor_wip_accrual(cur, order_no, po_id, stage_lines, total_wage, desc)


def liquidate_worker_pieces_atomic(payload):
    """
    اعتماد وصرف مستحقات الخياطين أوتوماتيكياً:
    إنشاء سند صرف رسمي PV-YYYY-MMDD-XX وقيد محاسبي (من حـ/ 203 مستحقات الخياطين إلى حـ/ 101.1 الخزينة)
    وتحديث حالة القطع إلى تم الصرف وترحيل أرصدة شجرة الحسابات ذرياً (IAS 2).
    """
    data = payload.get('data') or payload
    worker_id = clean_str(data.get('worker_id') or data.get('employee_id'))
    item_ids = data.get('item_ids') or []
    account_id = clean_str(data.get('account_id') or 'ACC-101-1')

    clean_ids = [str(x) for x in item_ids if str(x).strip()]
    with get_db_cursor(commit=True) as cur:
        assert_period_open(cur, None)
        log_rows = []
        if clean_ids:
            cur.execute("""
                SELECT id, worker_id, worker_name, piece_rate_amount, pieces_count 
                FROM piece_rate_logs 
                WHERE id = ANY(%s) 
                  AND (qa_status ILIKE '%%pass%%' OR qa_status ILIKE '%%approv%%')
                  AND paid_at IS NULL
                  AND (payment_status IN ('Accrued', 'pending', 'معلق') OR payment_status IS NULL)
                FOR UPDATE;
            """, (clean_ids,))
            log_rows = cur.fetchall()

        if not log_rows and worker_id:
            cur.execute("""
                SELECT id, worker_id, worker_name, piece_rate_amount, pieces_count 
                FROM piece_rate_logs 
                WHERE (worker_id = %s OR worker_name = %s)
                  AND (qa_status ILIKE '%%pass%%' OR qa_status ILIKE '%%approv%%')
                  AND paid_at IS NULL
                  AND (payment_status IN ('Accrued', 'pending', 'معلق') OR payment_status IS NULL)
                FOR UPDATE;
            """, (worker_id, worker_id))
            log_rows = cur.fetchall()

        if not log_rows:
            return {"success": False, "message": "لا توجد قطع مطابقة للجودة ومعلقة جاهزة للصرف"}

        total_amount = sum(clean_num(r.get('piece_rate_amount') or 0.0) * int(r.get('pieces_count') or 1) for r in log_rows)
        total_pieces = sum(int(r.get('pieces_count') or 1) for r in log_rows)
        worker_name = log_rows[0].get('worker_name') or worker_id
        actual_worker_id = log_rows[0].get('worker_id') or worker_id

        if total_amount <= 0:
            return {"success": False, "message": "مبلغ الاستحقاق غير صالح للصرف"}

        pay_no = get_next_sequence_number(cur, 'PV', fallback_prefix='PV-')
        credit_acc = resolve_account_id(cur, account_id, 'ACC-101-1')
        payable_acc = resolve_labor_liability_account(cur, 'ACC-203')

        pay_id = pay_no
        pay_notes = f"صرف مستحقات عدد ({total_pieces}) قطعة منجزة ومعتمدة للخياط: {worker_name}"
        cur.execute("""
            INSERT INTO payments (
                id, payment_no, payment_type, date, amount, currency, exchange_rate,
                base_amount, party_name, payment_method, account_id, notes, status, created_at, target_account_id
            ) VALUES (%s, %s, 'Payment', CURRENT_DATE, %s, 'YER', 1.0, %s, %s, 'Cash', %s, %s, 'Confirmed', CURRENT_TIMESTAMP, %s);
        """, (pay_id, pay_no, total_amount, total_amount, worker_name, credit_acc, pay_notes, payable_acc))

        jv_id = generate_id("JV")
        jv_no = f"JV-PAYOUT-{pay_no}"
        cur.execute("""
            INSERT INTO journal_entries (
                id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                amount, total_amount, base_amount, currency, exchange_rate, ref_type, ref_id,
                status, notes, created_at
            ) VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'YER', 1.0, 'TailorPayout', %s, 'Posted', %s, CURRENT_TIMESTAMP);
        """, (jv_id, jv_no, f"قيد صرف وإقفال مستحقات الخياط: {worker_name} بموجب سند {pay_no}", payable_acc, credit_acc, total_amount, total_amount, total_amount, pay_id, pay_notes))

        insert_sorted_journal_lines(cur, jv_id, [
            (payable_acc, f"إقفال مستحقات أجور قطع للخياط {worker_name}", total_amount, 0.0, total_amount, 0.0),
            (credit_acc, f"صرف نقدي من الخزينة للخياط {worker_name}", 0.0, total_amount, 0.0, total_amount),
        ])

        # Atomic chart refresh & balance cascade (Zero manual UPDATE on balances)
        refresh_chart_balances_atomic(cur)

        cur.execute("UPDATE piece_rate_logs SET payment_status = 'paid', voucher_no = %s, paid_at = CURRENT_TIMESTAMP WHERE id = ANY(%s) AND paid_at IS NULL;", (pay_no, [r['id'] for r in log_rows]))
        cur.execute("UPDATE tailor_commissions SET status = 'Paid', payout_voucher_no = %s, paid_at = CURRENT_TIMESTAMP WHERE (employee_id = %s OR employee_name = %s) AND status = 'Approved' AND paid_at IS NULL;", (pay_no, actual_worker_id, worker_name))

        return {
            "success": True,
            "message": f"تم اعتماد وصرف أجور {total_pieces} قطعة للخياط [{worker_name}] بموجب سند الصرف ({pay_no}) بنجاح 💸",
            "disbursed_count": total_pieces, "total_amount": float(total_amount),
            "voucher_no": pay_no, "entry_no": jv_no,
            "voucher": {"id": pay_id, "voucher_no": pay_no, "entry_no": jv_no, "employee_name": worker_name, "pieces_count": total_pieces, "net_amount": float(total_amount), "account_id": credit_acc, "date": today_str()}
        }
