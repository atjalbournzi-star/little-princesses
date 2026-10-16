# services/pg/pg_vouchers.py
# Payment & Receipt vouchers, automated balanced journal entries, reversals & audit
from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, today_str
from .account_resolver import resolve_exchange_rate, resolve_account_id
from .pg_vouchers_query import get_vouchers, get_voucher_card_data


def add_voucher(payload):
    """إصدار أو تعديل سند مالي وترحيل القيد المحاسبي المزدوج آلياً"""
    data = payload.get('data') or payload
    pay_id = clean_str(data.get('id') or data.get('voucher_id')) or generate_id("PAY")
    pay_no = clean_str(data.get('payment_no') or data.get('voucher_no') or data.get('v_no')) or pay_id
    raw_type = clean_str(data.get('voucher_type') or data.get('payment_type') or data.get('v_type') or 'سند قبض')
    is_rcpt = ('قبض' in raw_type or raw_type.lower() in ('receipt', 'receipt_voucher', 'rv') or str(pay_no).upper().startswith('RV'))
    p_type = 'Receipt' if is_rcpt else 'Payment'
    v_type = 'سند قبض' if is_rcpt else 'سند صرف'
    amt = clean_num(data.get('amount') or 0.0)
    curr = clean_str(data.get('currency') or 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    base_amt = clean_num(data.get('base_amount') or (amt * rate))
    pay_method = clean_str(data.get('payment_method') or data.get('pay_method') or 'نقد (كاش)')
    p_date = clean_str(data.get('date') or data.get('date_created')) or today_str()
    notes = clean_str(data.get('notes') or '')
    party_val = clean_str(data.get('party') or data.get('party_name') or '')
    target_acc_input = clean_str(data.get('target_acc') or data.get('target_account_id') or data.get('target_account') or '')
    cust_id = clean_str(data.get('customer_id') or '') or None
    supp_id = clean_str(data.get('supplier_id') or '') or None

    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, rate)
        if curr != 'YER' and (base_amt <= 0 or base_amt == amt):
            base_amt = amt * rate

        raw_cash = data.get('account_id') or data.get('acc_code') or data.get('source_acc')
        resolved_cash_acc = resolve_account_id(cur, raw_cash, default_id='ACC-101-1', currency=curr)
        if resolved_cash_acc in ('ACC-101', 'ACC-101-1', '101', '101.1'):
            if curr == 'SAR': resolved_cash_acc = 'ACC-101-2'
            elif curr == 'USD': resolved_cash_acc = 'ACC-101-3'
            else: resolved_cash_acc = 'ACC-101-1'
        default_target = 'ACC-104' if p_type == 'Receipt' else 'ACC-201'
        if p_type == 'Receipt' and (target_acc_input in ('202', 'ACC-202') or 'عربون' in notes or 'حجز' in notes or data.get('is_advance')):
            default_target = 'ACC-202'
        resolved_target_acc = resolve_account_id(cur, target_acc_input, default_target) if target_acc_input else default_target

        if cust_id:
            cur.execute("SELECT id FROM customers WHERE id = %s LIMIT 1;", (cust_id,))
            if not cur.fetchone(): cust_id = None
        if supp_id:
            cur.execute("SELECT id FROM suppliers WHERE id = %s LIMIT 1;", (supp_id,))
            if not cur.fetchone(): supp_id = None

        order_ref = clean_str(data.get('order_id') or data.get('order_no') or data.get('reference_no') or '')
        resolved_order_id = None
        if order_ref:
            cur.execute("SELECT id FROM orders WHERE id = %s OR order_no = %s LIMIT 1;", (order_ref, order_ref))
            o_row = cur.fetchone()
            if o_row: resolved_order_id = o_row['id']

        cur.execute("SELECT id, amount, payment_type, customer_id, supplier_id, payment_no FROM payments WHERE id = %s OR payment_no = %s LIMIT 1 FOR UPDATE;", (pay_id, pay_no))
        existing_v = cur.fetchone()
        if existing_v:
            pay_id = existing_v['id']
            pay_no = existing_v.get('payment_no') or pay_no
            old_amt = clean_num(existing_v.get('amount') or 0.0)
            if old_amt > 0:
                if existing_v.get('payment_type') == 'Receipt' and existing_v.get('customer_id'):
                    cur.execute("UPDATE customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (old_amt, existing_v['customer_id']))
                elif existing_v.get('payment_type') == 'Payment' and existing_v.get('supplier_id'):
                    cur.execute("UPDATE suppliers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (old_amt, existing_v['supplier_id']))

        query = """
            INSERT INTO payments (
                id, payment_no, customer_id, supplier_id, payment_type, amount, currency,
                exchange_rate, base_amount, payment_method, account_id, date, status, notes,
                party_name, target_account_id, order_id, reference_no
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                payment_no = EXCLUDED.payment_no, customer_id = EXCLUDED.customer_id, supplier_id = EXCLUDED.supplier_id,
                payment_type = EXCLUDED.payment_type, amount = EXCLUDED.amount, currency = EXCLUDED.currency,
                exchange_rate = EXCLUDED.exchange_rate, base_amount = EXCLUDED.base_amount, payment_method = EXCLUDED.payment_method,
                account_id = EXCLUDED.account_id, date = EXCLUDED.date, notes = EXCLUDED.notes,
                party_name = EXCLUDED.party_name, target_account_id = EXCLUDED.target_account_id,
                order_id = COALESCE(EXCLUDED.order_id, payments.order_id), reference_no = COALESCE(EXCLUDED.reference_no, payments.reference_no)
            RETURNING *, payment_no as voucher_no, payment_type as voucher_type;
        """
        cur.execute(query, (pay_id, pay_no, cust_id, supp_id, p_type, amt, curr, rate, base_amt, pay_method, resolved_cash_acc, p_date, notes, party_val, resolved_target_acc, resolved_order_id, order_ref or None))
        res = dict(cur.fetchone())

        if amt > 0:
            if p_type == 'Receipt' and cust_id:
                cur.execute("UPDATE customers SET current_balance = current_balance - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, cust_id))
            elif p_type == 'Payment' and supp_id:
                cur.execute("UPDATE suppliers SET current_balance = current_balance - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, supp_id))

            auto_jv_no = f"AUTO-VCH-{pay_no}"
            deb_acc = resolved_cash_acc if p_type == 'Receipt' else resolved_target_acc
            crd_acc = resolved_target_acc if p_type == 'Receipt' else resolved_cash_acc

            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Payment', %s, %s, %s, 'Posted', %s)
                ON CONFLICT (entry_no) DO UPDATE SET
                    amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount,
                    debit_account_id = EXCLUDED.debit_account_id, credit_account_id = EXCLUDED.credit_account_id,
                    currency = EXCLUDED.currency, exchange_rate = EXCLUDED.exchange_rate, description = EXCLUDED.description, notes = EXCLUDED.notes;
            """, (f"JV-{pay_id}", auto_jv_no, p_date, f"{v_type} رقم {pay_no}: {party_val or 'طرف عام'}", deb_acc, crd_acc, amt, amt, base_amt, pay_id, curr, rate, f"سند {pay_no} - {party_val or 'طرف عام'}"))

            cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
            actual_entry_id = cur.fetchone()['id']
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (actual_entry_id,))
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);",
                        (generate_id("JVL"), actual_entry_id, deb_acc, f"مدين - {v_type} {pay_no} ({party_val or 'طرف عام'})", amt, base_amt))
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);",
                        (generate_id("JVL"), actual_entry_id, crd_acc, f"دائن - {v_type} {pay_no} ({party_val or 'طرف عام'})", amt, base_amt))

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        return res


def reverse_voucher(payload):
    """إلغاء السند المالي وتوليد قيد عكسي متزن وحفظ الأثر المحاسبي في سجل التدقيق"""
    data = payload.get('data') or payload
    v_id = clean_str(data.get('id') or data.get('voucher_no') or data.get('v_no'))
    reason = clean_str(data.get('reason') or 'إلغاء السند بطلب المحاسب')
    user_id = clean_str(data.get('user_id') or 'admin')
    if not v_id: return {"success": False, "error": "المعرف المطلوب للإلغاء غير محدد"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT * FROM payments WHERE id = %s OR payment_no = %s LIMIT 1 FOR UPDATE;", (v_id, v_id))
        p_row = cur.fetchone()
        cur.execute("SELECT * FROM journal_entries WHERE id = %s OR entry_no = %s OR entry_no = %s OR ref_id = %s LIMIT 1 FOR UPDATE;", (v_id, v_id, f"AUTO-VCH-{v_id}", v_id))
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
            cur.execute("UPDATE payments SET status = 'reversed', notes = COALESCE(notes, '') || %s WHERE id = %s;", (f" | [ملغى بقيد عكسي {rev_entry_no}: {reason}]", p_row['id']))
            if amt > 0 and p_row.get('payment_type') == 'Receipt' and p_row.get('customer_id'):
                cur.execute("UPDATE customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, p_row['customer_id']))
            elif amt > 0 and p_row.get('payment_type') == 'Payment' and p_row.get('supplier_id'):
                cur.execute("UPDATE suppliers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, p_row['supplier_id']))

        if j_row:
            cur.execute("UPDATE journal_entries SET status = 'Reversed', notes = COALESCE(notes, '') || %s WHERE id = %s;", (f" | [ملغى بقيد عكسي {rev_entry_no}: {reason}]", j_row['id']))

        # Flip debit & credit to make balanced reversing entry
        deb_acc = (p_row.get('account_id') if p_row and p_row.get('payment_type') == 'Receipt' else (p_row.get('target_account_id') if p_row else j_row.get('debit_account_id'))) or 'ACC-101-1'
        crd_acc = (p_row.get('target_account_id') if p_row and p_row.get('payment_type') == 'Receipt' else (p_row.get('account_id') if p_row else j_row.get('credit_account_id'))) or 'ACC-104'
        rev_deb, rev_crd = crd_acc, deb_acc

        rev_id = generate_id("JV")
        cur.execute("""
            INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
            VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'Reversal', %s, %s, %s, 'Posted', %s)
            ON CONFLICT (entry_no) DO UPDATE SET description = EXCLUDED.description;
        """, (rev_id, rev_entry_no, f"قيد عكسي لإلغاء السند {v_no}: {reason}", rev_deb, rev_crd, amt, amt, base_amt, v_id, curr, rate, f"إلغاء سند {v_no} - {reason}"))

        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);",
                    (generate_id("JVL"), rev_id, rev_deb, f"مدين - قيد عكسي لسند {v_no} ({reason})", amt, base_amt))
        cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);",
                    (generate_id("JVL"), rev_id, rev_crd, f"دائن - قيد عكسي لسند {v_no} ({reason})", amt, base_amt))

        try:
            cur.execute("INSERT INTO audit_logs (entity_type, entity_id, action, notes, user_id) VALUES ('vouchers', %s, 'REVERSE', %s, %s);", (v_no, reason, user_id))
        except Exception:
            pass

        return {"success": True, "reversal_entry_no": rev_entry_no, "voucher_no": v_no, "message": f"تم إلغاء السند {v_no} وتوليد القيد العكسي {rev_entry_no} بنجاح ⚖️"}


def delete_voucher(payload):
    """إلغاء آمن ومحكوم للسند المالي دون مساس بسلامة الحسابات"""
    return reverse_voucher(payload)
