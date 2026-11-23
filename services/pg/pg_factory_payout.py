import datetime
import logging
import time
import uuid
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id, today_str
from .account_resolver import resolve_exchange_rate, resolve_account_id, resolve_labor_liability_account
from .pg_sequences import get_next_sequence_number
from .pg_delivery_cogs import cascade_account_balances

logger = logging.getLogger("LittlePrincesses_PG_FactoryPayout")


def post_tailor_payout_voucher(payload):
    data = payload.get('data') or payload
    emp_name = clean_str(data.get('employee_name') or data.get('name'))
    emp_id = clean_str(data.get('employee_id') or data.get('emp_id'))
    commission_ids = data.get('commission_ids') or []
    account_id = clean_str(data.get('account_id') or 'ACC-101')
    payment_method = clean_str(data.get('payment_method') or 'Cash')
    deductions = clean_num(data.get('deductions') or 0.0)
    notes = clean_str(data.get('notes') or '')
    created_by = clean_str(data.get('created_by') or 'المحاسب العام')
    currency = clean_str(data.get('currency') or 'YER')

    with get_db_cursor(commit=True) as cur:
        if commission_ids:
            cur.execute("""
                SELECT prl.id, prl.worker_id as employee_id, prl.worker_name as employee_name,
                       prl.stage_id as stage, (prl.piece_rate_amount * COALESCE(prl.pieces_count, 1)) as wage_amount,
                       COALESCE(prl.pieces_count, 1) as pieces_count,
                       COALESCE(po.production_order_no, prl.production_order_id, '-') as order_no,
                       COALESCE(po.product_name, 'فستان ملكي') as product_name,
                       COALESCE(po.child_name, 'الأميرة') as child_name
                FROM piece_rate_logs prl
                LEFT JOIN production_orders po ON (po.id = prl.production_order_id OR po.production_order_no = prl.production_order_id)
                WHERE prl.id = ANY(%s)
                  AND prl.paid_at IS NULL
                  AND (prl.payment_status IN ('Accrued', 'pending', 'معلق') OR prl.payment_status IS NULL)
                  AND (prl.qa_status ILIKE '%%pass%%' OR prl.qa_status ILIKE '%%approv%%');
            """, (commission_ids,))
        else:
            cur.execute("""
                SELECT prl.id, prl.worker_id as employee_id, prl.worker_name as employee_name,
                       prl.stage_id as stage, (prl.piece_rate_amount * COALESCE(prl.pieces_count, 1)) as wage_amount,
                       COALESCE(prl.pieces_count, 1) as pieces_count,
                       COALESCE(po.production_order_no, prl.production_order_id, '-') as order_no,
                       COALESCE(po.product_name, 'فستان ملكي') as product_name,
                       COALESCE(po.child_name, 'الأميرة') as child_name
                FROM piece_rate_logs prl
                LEFT JOIN production_orders po ON (po.id = prl.production_order_id OR po.production_order_no = prl.production_order_id)
                WHERE (prl.worker_name = %s OR prl.worker_id = %s)
                  AND prl.paid_at IS NULL
                  AND (prl.payment_status IN ('Accrued', 'pending', 'معلق') OR prl.payment_status IS NULL)
                  AND (prl.qa_status ILIKE '%%pass%%' OR prl.qa_status ILIKE '%%approv%%');
            """, (emp_name, emp_id))

        unpaid_pieces = cur.fetchall()
        if not unpaid_pieces:
            return {"success": False, "message": "لا توجد قطع معتمدة معلقة جاهزة للصرف لهذا الخياط"}

        target_ids = [r['id'] for r in unpaid_pieces]
        gross_wage = sum(float(r.get('wage_amount') or 0.0) for r in unpaid_pieces)
        total_pieces = sum(int(r.get('pieces_count') or 1) for r in unpaid_pieces)
        actual_emp_name = emp_name or unpaid_pieces[0]['employee_name']
        actual_emp_id = emp_id or unpaid_pieces[0].get('employee_id')

        custom_amount = clean_num(data.get('amount'))
        gross = custom_amount if custom_amount > 0 else gross_wage
        net = gross - deductions
        if net < 0:
            return {"success": False, "message": "صافي المبلغ المصروف لا يمكن أن يكون سالباً"}

        rate = resolve_exchange_rate(cur, currency, 1.0)
        base_net = net * rate
        base_gross = gross * rate
        base_deductions = deductions * rate

        credit_acc = resolve_account_id(cur, account_id, 'ACC-101-1')
        payable_acc = resolve_labor_liability_account(cur, 'ACC-203')
        advance_acc = resolve_account_id(cur, 'ACC-107', 'ACC-107')

        pay_no = get_next_sequence_number(cur, 'PV', fallback_prefix='PV-')
        pay_id = pay_no
        pay_notes = f"صرف مستحقات عدد ({total_pieces}) قطعة منجزة للخياط: {actual_emp_name}. {notes}".strip()

        cur.execute("""
            INSERT INTO payments (
                id, payment_no, payment_type, date, amount, currency,
                exchange_rate, base_amount, party_name, payment_method, account_id, notes, status, created_at, target_account_id
            ) VALUES (%s, %s, 'Payment', CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', CURRENT_TIMESTAMP, %s);
        """, (pay_id, pay_no, net, currency, rate, base_net, actual_emp_name, payment_method, credit_acc, pay_notes, payable_acc))

        jv_id = generate_id("JV")
        jv_no = f"JV-PAYOUT-{pay_no}"
        cur.execute("""
            INSERT INTO journal_entries (
                id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                amount, total_amount, base_amount, currency, exchange_rate, ref_type, ref_id,
                status, notes, created_at
            ) VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, 'TailorPayout', %s, 'Posted', %s, CURRENT_TIMESTAMP);
        """, (jv_id, jv_no, f"قيد صرف وإقفال مستحقات الخياط: {actual_emp_name} بموجب سند {pay_no}", payable_acc, credit_acc, gross, gross, base_gross, currency, rate, pay_id, pay_notes))

        cur.execute("""
            INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
            VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
        """, (generate_id("JVL"), jv_id, payable_acc, f"إقفال مستحقات ({total_pieces}) قطعة للخياط {actual_emp_name}", gross, base_gross))

        if deductions > 0:
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (generate_id("JVL"), jv_id, advance_acc, f"خصم سلفة/جزاءات للخياط {actual_emp_name}", deductions, base_deductions))
            cur.execute("UPDATE chart_of_accounts SET current_balance = GREATEST(0.0, COALESCE(current_balance, 0.0) - %s) WHERE id = %s;", (base_deductions, advance_acc))

        cur.execute("""
            INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
            VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
        """, (generate_id("JVL"), jv_id, credit_acc, f"صرف نقدي للخياط {actual_emp_name} سند {pay_no}", net, base_net))

        cur.execute("UPDATE chart_of_accounts SET current_balance = GREATEST(0.0, COALESCE(current_balance, 0.0) - %s) WHERE id = %s;", (base_gross, payable_acc))
        cur.execute("UPDATE chart_of_accounts SET current_balance = GREATEST(0.0, COALESCE(current_balance, 0.0) - %s) WHERE id = %s;", (base_net, credit_acc))
        cascade_account_balances(cur)

        cur.execute("""
            UPDATE piece_rate_logs
            SET payment_status = 'paid', voucher_no = %s, paid_at = CURRENT_TIMESTAMP
            WHERE id = ANY(%s);
        """, (pay_no, target_ids))

        cur.execute("""
            UPDATE tailor_commissions
            SET status = 'Paid', payout_voucher_no = %s, paid_at = CURRENT_TIMESTAMP
            WHERE (employee_id = %s OR employee_name = %s) AND status = 'Approved' AND paid_at IS NULL;
        """, (pay_no, actual_emp_id, actual_emp_name))

        return {
            "success": True,
            "message": f"تم إصدار سند الصرف {pay_no} وترحيله محاسبياً بنجاح ✅",
            "voucher": {
                "id": pay_id,
                "voucher_no": pay_no,
                "entry_no": jv_no,
                "employee_name": actual_emp_name,
                "employee_id": actual_emp_id,
                "pieces_count": total_pieces,
                "gross_amount": gross,
                "deductions": deductions,
                "net_amount": net,
                "currency": currency,
                "account_id": credit_acc,
                "payment_method": payment_method,
                "date": str(datetime.date.today()),
                "created_by": created_by,
                "pieces": [
                    {
                        "id": p['id'],
                        "order_no": p.get('order_no'),
                        "product_name": p.get('product_name'),
                        "child_name": p.get('child_name'),
                        "stage": p.get('stage'),
                        "pieces_count": p.get('pieces_count') or 1,
                        "production_type": p.get('production_type') or 'custom',
                        "wage_amount": float(p.get('wage_amount') or 0.0)
                    } for p in unpaid_pieces
                ]
            }
        }
