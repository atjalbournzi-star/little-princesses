# domains/accounting/reversing_service.py
# Immutability & Reversing Entry Engine for Payment & Receipt Vouchers

from datetime import datetime
from decimal import Decimal
import pg_service
from domains.system.db_connection import get_db

_columns_ensured = False

def ensure_reversal_columns():
    """ضمان وجود حقول التوثيق والسبب للقيد العكسي في الجداول"""
    global _columns_ensured
    if _columns_ensured:
        return

    try:
        with pg_service.get_db_cursor(commit=True) as cur:
            cur.execute("""
                ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversal_reason TEXT;
                ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;
                ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversed_by VARCHAR(64);
                ALTER TABLE payments ADD COLUMN IF NOT EXISTS reversal_entry_id VARCHAR(64);
            """)
    except Exception:
        pass

    try:
        conn = get_db()
        c = conn.cursor()
        for col in ('reversal_reason', 'reversed_at', 'reversed_by', 'reversal_entry_id'):
            try:
                c.execute(f"ALTER TABLE vouchers ADD COLUMN {col} TEXT DEFAULT ''")
            except Exception:
                pass
        conn.commit()
        conn.close()
    except Exception:
        pass

    _columns_ensured = True

def reverse_voucher(voucher_id_or_no: str, reason: str, user_id: str = 'admin') -> dict:
    """
    إلغاء السند المالي محاسبياً بإنشاء قيد يومية عكسي متزن دون حذف السجل الأصلي
    """
    if not voucher_id_or_no:
        return {'success': False, 'error': 'معرف أو رقم السند مطلوب'}
    clean_reason = str(reason or '').strip()
    if not clean_reason:
        return {'success': False, 'error': 'سبب الإلغاء إلزامي لتوثيق القيد العكسي ومطابقة الحوكمة'}

    ensure_reversal_columns()
    target = str(voucher_id_or_no).strip()

    with pg_service.get_db_cursor(commit=True) as cur:
        # 1. جلب السند الأصلي من PostgreSQL
        cur.execute("""
            SELECT id, payment_no, amount, base_amount, currency, exchange_rate,
                   payment_type, account_id, target_account_id, customer_id, supplier_id,
                   status, party_name, notes
            FROM payments
            WHERE id = %s OR payment_no = %s
            LIMIT 1;
        """, (target, target))
        v_row = cur.fetchone()

        if not v_row:
            return {'success': False, 'error': f'السند رقم {target} غير موجود في النظام'}

        v_dict = dict(v_row)
        actual_id = v_dict['id']
        pay_no = v_dict['payment_no']
        curr_status = str(v_dict.get('status') or '').lower()

        if curr_status == 'reversed':
            return {'success': False, 'error': f'السند {pay_no} ملغى مسبقاً بقيد عكسي'}

        amt = Decimal(str(v_dict.get('amount') or '0.00'))
        base_amt = Decimal(str(v_dict.get('base_amount') or (amt * Decimal(str(v_dict.get('exchange_rate') or 1.0)))))
        curr = str(v_dict.get('currency') or 'YER')
        rate = float(v_dict.get('exchange_rate') or 1.0)
        p_type = v_dict.get('payment_type') or 'Receipt'
        cust_id = v_dict.get('customer_id')
        supp_id = v_dict.get('supplier_id')
        cash_acc = v_dict.get('account_id') or '101'
        target_acc = v_dict.get('target_account_id') or ('104' if p_type == 'Receipt' else '201')
        party_name = v_dict.get('party_name') or 'طرف عام'

        # تحديد الحسابات الأصلية
        orig_deb = cash_acc if p_type == 'Receipt' else target_acc
        orig_crd = target_acc if p_type == 'Receipt' else cash_acc

        # في القيد العكسي نقلب الأطراف تماماً
        rev_deb = orig_crd
        rev_crd = orig_deb

        now_str = datetime.now().strftime('%Y-%m-%d')
        now_ts = datetime.now().isoformat()
        rev_jv_id = f"REV-JV-{actual_id}"
        rev_jv_no = f"REV-VCH-{pay_no}"
        desc = f"قيد عكسي لإلغاء سند {pay_no} ({party_name}) - السبب: {clean_reason}"

        # 2. إنشاء قيد اليومية العكسي المتزن
        if amt > 0:
            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id,
                    credit_account_id, amount, total_amount, base_amount, ref_type,
                    ref_id, currency, exchange_rate, status, notes
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, 'PaymentReversal',
                    %s, %s, %s, 'Posted', %s
                ) ON CONFLICT (entry_no) DO UPDATE SET
                    description = EXCLUDED.description,
                    status = 'Posted';
            """, (rev_jv_id, rev_jv_no, now_str, desc, rev_deb, rev_crd, float(amt), float(amt), float(base_amt), actual_id, curr, rate, clean_reason))

            cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (rev_jv_no,))
            entry_row = cur.fetchone()
            actual_entry_id = entry_row['id'] if entry_row else rev_jv_id

            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (actual_entry_id,))
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
            """, (pg_service.generate_id("JVL"), actual_entry_id, rev_deb, f"مدين عكسي - إلغاء {pay_no}", float(amt), float(base_amt)))

            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (pg_service.generate_id("JVL"), actual_entry_id, rev_crd, f"دائن عكسي - إلغاء {pay_no}", float(amt), float(base_amt)))

        # 3. عكس رصيد العميل أو المورد ذرياً
        if amt > 0:
            if p_type == 'Receipt' and cust_id:
                cur.execute("UPDATE customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (float(amt), cust_id))
            elif p_type == 'Payment' and supp_id:
                cur.execute("UPDATE suppliers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (float(amt), supp_id))

        # 4. تحديث حالة السند الأصلي إلى reversed مع توثيق السبب
        cur.execute("""
            UPDATE payments SET
                status = 'reversed',
                reversal_reason = %s,
                reversed_at = CURRENT_TIMESTAMP,
                reversed_by = %s,
                reversal_entry_id = %s
            WHERE id = %s;
        """, (clean_reason, user_id, rev_jv_no, actual_id))

    # 5. مزامنة SQLite لتحديث حالة السند وإدراج القيد العكسي
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute("""
            UPDATE vouchers SET
                status = 'reversed',
                reversal_reason = ?,
                reversed_at = ?,
                reversed_by = ?,
                reversal_entry_id = ?
            WHERE id = ? OR voucher_no = ?;
        """, (clean_reason, now_ts, user_id, rev_jv_no, actual_id, pay_no))

        c.execute("""
            INSERT OR REPLACE INTO journal_entries (
                entry_no, date, debit, credit, debit_account_id, credit_account_id,
                amount, currency, exchange_rate, base_amount, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Posted', ?)
        """, (rev_jv_no, now_str, rev_deb, rev_crd, rev_deb, rev_crd, float(amt), curr, rate, float(base_amt), desc))
        conn.commit()
        conn.close()
    except Exception:
        pass

    # 6. تسجيل الحدث في سجل التدقيق المالي
    try:
        pg_service.log_audit_event(
            'VOUCHER', actual_id, 'REVERSE',
            old_values={'status': v_dict.get('status') or 'Confirmed'},
            new_values={'status': 'reversed', 'reversal_reason': clean_reason, 'reversal_entry': rev_jv_no},
            user_id=user_id
        )
    except Exception:
        pass

    return {
        'success': True,
        'message': f'تم إلغاء السند {pay_no} بنجاح وتوليد القيد العكسي {rev_jv_no} المتزن ⚖️',
        'voucher_no': pay_no,
        'reversal_entry_no': rev_jv_no,
        'amount': float(amt),
        'currency': curr,
        'reason': clean_reason,
        'status': 'reversed'
    }
