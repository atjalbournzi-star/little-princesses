# services/pg/pg_piece_rates.py
# Tailor piece-rate logs, QA inspection tracking, and atomic liquidation
import logging
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str
from .pg_account_code import generate_sequential_voucher_no
from .account_resolver import resolve_account_id
from .pg_delivery_cogs import cascade_account_balances

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
            prl.stage_id, COALESCE(stg.stage_name, 'خياطة وتفصيل') AS stage_name,
            COALESCE(prl.piece_rate_amount, 0.0) AS piece_rate_amount,
            COALESCE(prl.pieces_count, 1) AS pieces_count, prl.payment_status,
            COALESCE(prl.qa_status, stg.qa_status, 'approved') AS qa_status,
            COALESCE(stg.qa_score, 5.0) AS qa_score, COALESCE(stg.qa_notes, 'مطابق للجودة') AS qa_notes,
            prl.completed_at, prl.voucher_no, prl.paid_at
        FROM piece_rate_logs prl
        LEFT JOIN production_orders po ON (po.id = prl.production_order_id OR po.production_order_no = prl.production_order_id)
        LEFT JOIN order_stages stg ON stg.id = prl.stage_id
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
    اعتماد وصرف مستحقات الخياطين أوتوماتيكياً:
    إنشاء سند صرف رسمي PV-YYYY-MMDD-XX وقيد محاسبي (من حـ/ 504/501 إلى حـ/ 101.1)
    وتحديث حالة القطع إلى تم الصرف وترحيل أرصدة شجرة الحسابات.
    """
    data = payload.get('data') or payload
    worker_id = clean_str(data.get('worker_id') or data.get('employee_id'))
    item_ids = data.get('item_ids') or []
    account_id = clean_str(data.get('account_id') or 'ACC-101-1')

    clean_ids = [str(x) for x in item_ids if str(x).strip()]
    with get_db_cursor(commit=True) as cur:
        comm_rows, log_rows = [], []
        if clean_ids:
            cur.execute("SELECT id, employee_id, employee_name, wage_amount, pieces_count FROM tailor_commissions WHERE id = ANY(%s) AND status = 'Approved' AND paid_at IS NULL;", (clean_ids,))
            comm_rows = cur.fetchall()
            cur.execute("SELECT id, worker_id, worker_name, piece_rate_amount, pieces_count FROM piece_rate_logs WHERE id = ANY(%s) AND qa_status = 'approved' AND payment_status = 'pending';", (clean_ids,))
            log_rows = cur.fetchall()

        if not comm_rows and not log_rows and worker_id:
            cur.execute("SELECT id, employee_id, employee_name, wage_amount, pieces_count FROM tailor_commissions WHERE (employee_id = %s OR employee_name = %s) AND status = 'Approved' AND paid_at IS NULL;", (worker_id, worker_id))
            comm_rows = cur.fetchall()

        if not comm_rows and not log_rows:
            return {"success": False, "message": "لا توجد قطع مطابقة للجودة ومعلقة جاهزة للصرف"}

        total_amount = sum(clean_num(r.get('wage_amount') or 0.0) for r in comm_rows) + sum(clean_num(r.get('piece_rate_amount') or 0.0) for r in log_rows)
        total_pieces = sum(int(r.get('pieces_count') or 1) for r in comm_rows) + sum(int(r.get('pieces_count') or 1) for r in log_rows)
        worker_name = (comm_rows and comm_rows[0].get('employee_name')) or (log_rows and log_rows[0].get('worker_name')) or worker_id

        if total_amount <= 0:
            return {"success": False, "message": "مبلغ الاستحقاق غير صالح للصرف"}

        pay_no = generate_sequential_voucher_no(cur, 'Payment', today_str())
        credit_acc = resolve_account_id(cur, account_id, 'ACC-101-1')
        expense_acc = 'ACC-501'

        pay_id = generate_id("PAY")
        pay_notes = f"صرف مستحقات عدد ({total_pieces}) قطعة منجزة ومعتمدة للخياط: {worker_name}"
        cur.execute("""
            INSERT INTO payments (
                id, payment_no, payment_type, date, amount, currency, exchange_rate,
                base_amount, party_name, payment_method, account_id, notes, status, created_at, target_account_id
            ) VALUES (%s, %s, 'Payment', CURRENT_DATE, %s, 'YER', 1.0, %s, %s, 'Cash', %s, %s, 'Confirmed', CURRENT_TIMESTAMP, %s);
        """, (pay_id, pay_no, total_amount, total_amount, worker_name, credit_acc, pay_notes, expense_acc))

        jv_id = generate_id("JV")
        jv_no = f"JV-PAYOUT-{pay_no}"
        cur.execute("""
            INSERT INTO journal_entries (
                id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                amount, total_amount, base_amount, currency, exchange_rate, ref_type, ref_id,
                status, notes, created_at
            ) VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'YER', 1.0, 'TailorPayout', %s, 'Posted', %s, CURRENT_TIMESTAMP);
        """, (jv_id, jv_no, f"قيد صرف أجور ({total_pieces}) قطعة للخياط: {worker_name} بموجب سند {pay_no}", expense_acc, credit_acc, total_amount, total_amount, total_amount, pay_id, pay_notes))

        line_sql = "INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);"
        cur.execute(line_sql, (generate_id("JVL"), jv_id, expense_acc, f"مدين - استحقاق أجور قطع للخياط {worker_name}", total_amount, total_amount))
        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);",
                    (generate_id("JVL"), jv_id, credit_acc, f"دائن - صرف نقدي من الخزينة للخياط {worker_name}", total_amount, total_amount))

        cur.execute("UPDATE chart_of_accounts SET current_balance = COALESCE(current_balance, 0.0) + %s WHERE id = 'ACC-501' OR account_code = '501';", (total_amount,))
        cur.execute("UPDATE chart_of_accounts SET current_balance = GREATEST(0.0, COALESCE(current_balance, 0.0) - %s) WHERE id = %s OR account_code = %s;", (total_amount, credit_acc, credit_acc))
        cascade_account_balances(cur)

        if comm_rows:
            cur.execute("UPDATE tailor_commissions SET status = 'Paid', payout_voucher_no = %s, paid_at = CURRENT_TIMESTAMP WHERE id = ANY(%s);", (pay_no, [r['id'] for r in comm_rows]))
        if log_rows:
            cur.execute("UPDATE piece_rate_logs SET payment_status = 'paid', voucher_no = %s, paid_at = CURRENT_TIMESTAMP WHERE id = ANY(%s);", (pay_no, [r['id'] for r in log_rows]))

        return {
            "success": True,
            "message": f"تم اعتماد وصرف أجور {total_pieces} قطعة للخياط [{worker_name}] بموجب سند الصرف ({pay_no}) بنجاح 💸",
            "disbursed_count": total_pieces, "total_amount": float(total_amount),
            "voucher_no": pay_no, "entry_no": jv_no,
            "voucher": {"id": pay_id, "voucher_no": pay_no, "entry_no": jv_no, "employee_name": worker_name, "pieces_count": total_pieces, "net_amount": float(total_amount), "account_id": credit_acc, "date": today_str()}
        }
