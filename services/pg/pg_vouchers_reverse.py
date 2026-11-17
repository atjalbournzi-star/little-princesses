# services/pg/pg_vouchers_reverse.py
# Reversal operations and audit trail logging for financial vouchers

from .db_pool import get_db_cursor, clean_str, clean_num, generate_id
from .pg_financial_sync import sync_customer_order_from_voucher
from .pg_audit import log_audit_event, get_active_user_context, resolve_active_user_id


def reverse_voucher(payload):
    """إلغاء السند المالي وتوليد قيد عكسي متزن وحفظ الأثر المحاسبي في سجل التدقيق"""
    data = payload.get('data') or payload
    v_id = clean_str(data.get('id') or data.get('voucher_no') or data.get('v_no'))
    reason = clean_str(data.get('reason') or 'إلغاء السند بطلب المحاسب')
    raw_uid = clean_str(data.get('reversed_by') or data.get('user_id') or '')
    if not v_id:
        return {"success": False, "error": "المعرف المطلوب للإلغاء غير محدد"}

    with get_db_cursor(commit=True) as cur:
        resolved_user = resolve_active_user_id(cur, raw_uid)
        cur.execute("SELECT * FROM payments WHERE id = %s OR payment_no = %s LIMIT 1 FOR UPDATE;", (v_id, v_id))
        p_row = cur.fetchone()
        cur.execute("SELECT * FROM journal_entries WHERE id = %s OR entry_no = %s OR entry_no = %s OR ref_id = %s LIMIT 1 FOR UPDATE;",
                    (v_id, v_id, f"AUTO-VCH-{v_id}", v_id))
        j_row = cur.fetchone()

        if not p_row and not j_row:
            return {"success": False, "error": "لم يتم العثور على السند المالي أو القيد المقترن"}

        status = (p_row.get('status') if p_row else j_row.get('status')) or ''
        if status.lower() == 'reversed':
            return {"success": False, "error": "هذا السند تم إلغاؤه مسبقاً بقيد عكسي"}

        amt = clean_num((p_row.get('amount') if p_row else j_row.get('amount')) or 0.0)
        curr = clean_str((p_row.get('currency') if p_row else j_row.get('currency')) or 'YER')
        rate = clean_num((p_row.get('exchange_rate') if p_row else j_row.get('exchange_rate')) or 1.0)
        base_amt = clean_num((p_row.get('base_amount') if p_row else j_row.get('base_amount')) or (amt * rate))
        v_no = clean_str((p_row.get('payment_no') if p_row else j_row.get('entry_no')).replace('AUTO-VCH-', ''))
        rev_entry_no = f"REV-{v_no}"

        if p_row:
            cur.execute("""
                UPDATE payments
                SET status = 'reversed',
                    reversed_by = %s,
                    reversed_at = CURRENT_TIMESTAMP,
                    reversal_reason = %s,
                    reversal_entry_id = %s,
                    notes = COALESCE(notes, '') || %s
                WHERE id = %s;
            """, (resolved_user, reason, rev_entry_no, f" | [ملغى بقيد عكسي {rev_entry_no}: {reason}]", p_row['id']))
            if amt > 0 and p_row.get('payment_type') == 'Receipt' and p_row.get('customer_id'):
                cur.execute("UPDATE customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
                            (amt, p_row['customer_id']))
                sync_customer_order_from_voucher(cur, p_row['customer_id'])
            elif amt > 0 and p_row.get('payment_type') == 'Payment' and p_row.get('supplier_id'):
                cur.execute("UPDATE suppliers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
                            (amt, p_row['supplier_id']))

        if j_row:
            cur.execute("UPDATE journal_entries SET status = 'Reversed', notes = COALESCE(notes, '') || %s WHERE id = %s;",
                        (f" | [ملغى بقيد عكسي {rev_entry_no}: {reason}]", j_row['id']))

        deb_acc = (p_row.get('account_id') if p_row and p_row.get('payment_type') == 'Receipt' else (p_row.get('target_account_id') if p_row else j_row.get('debit_account_id'))) or 'ACC-101-1'
        crd_acc = (p_row.get('target_account_id') if p_row and p_row.get('payment_type') == 'Receipt' else (p_row.get('account_id') if p_row else j_row.get('credit_account_id'))) or 'ACC-104'

        rev_id = generate_id("JV")
        cur.execute("""
            INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                                        amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes, created_by)
            VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'Reversal', %s, %s, %s, 'Posted', %s, %s)
            ON CONFLICT (entry_no) DO UPDATE SET description = EXCLUDED.description;
        """, (rev_id, rev_entry_no, f"قيد عكسي لإلغاء السند {v_no}: {reason}", crd_acc, deb_acc, amt, amt, base_amt, v_id, curr, rate, f"إلغاء سند {v_no} - {reason}", resolved_user))

        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);",
                    (generate_id("JVL"), rev_id, crd_acc, f"مدين - قيد عكسي لسند {v_no} ({reason})", amt, base_amt))
        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);",
                    (generate_id("JVL"), rev_id, deb_acc, f"دائن - قيد عكسي لسند {v_no} ({reason})", amt, base_amt))

        log_audit_event(
            entity_type='payments', entity_id=v_no, action='REVERSE',
            old_values={'payment_no': v_no, 'amount': amt, 'status': 'Confirmed'},
            new_values={'payment_no': v_no, 'status': 'reversed', 'reversal_entry_no': rev_entry_no, 'reversed_by': resolved_user},
            user_id=resolved_user, document_no=v_no, details=f"إلغاء السند {v_no} بقيد عكسي {rev_entry_no}: {reason}", cur=cur
        )

        return {"success": True, "reversal_entry_no": rev_entry_no, "voucher_no": v_no, "message": f"تم إلغاء السند {v_no} وتوليد القيد العكسي {rev_entry_no} بنجاح ⚖️"}
