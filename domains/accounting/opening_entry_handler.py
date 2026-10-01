# domains/accounting/opening_entry_handler.py
# Extracted handler for /api/accounts/opening-entry to keep routes_accounts.py within 220 lines

import json
from datetime import date
from domains.system.db_connection import get_db


def handle_opening_entry(handler, data):
    """Process and persist a capital opening journal entry."""
    capital_code = str(data.get('capital_acc_code') or '301.01').strip()
    cash_code    = str(data.get('cash_acc_code')    or '101.02').strip()
    amount       = float(data.get('amount') or 0.0)
    description  = str(data.get('description') or f'قيد رأس المال الافتتاحي - {capital_code}').strip()
    user_name    = str(data.get('user_name') or 'المستخدم').strip()
    entry_date   = str(data.get('date') or '').strip() or None

    if amount <= 0:
        raise Exception('المبلغ يجب أن يكون أكبر من صفر')

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT id, code, name, nature, current_balance, account_id FROM accounts WHERE code=? OR account_code=? LIMIT 1", (capital_code, capital_code))
    cap_row = c.fetchone()
    if not cap_row:
        raise Exception(f'حساب رأس المال {capital_code} غير موجود')

    c.execute("SELECT id, code, name, nature, current_balance, account_id FROM accounts WHERE code=? OR account_code=? LIMIT 1", (cash_code, cash_code))
    cash_row = c.fetchone()
    if not cash_row:
        raise Exception(f'حساب الصندوق {cash_code} غير موجود')

    # Duplicate check
    c.execute("""SELECT id FROM journal_entries WHERE
        ((debit=? OR debit_code=?) AND (credit=? OR credit_code=?) AND ABS(amount-?)<=1)
        OR ((debit_account_id=? AND credit_account_id=? AND ABS(amount-?)<=1))
        LIMIT 1""",
        (cash_code, cash_code, capital_code, capital_code, amount,
         str(cap_row['account_id'] if hasattr(cap_row, 'keys') else cap_row[5]),
         str(cash_row['account_id'] if hasattr(cash_row, 'keys') else cash_row[5]),
         amount))
    if c.fetchone():
        conn.close()
        _send_json(handler, 200, {'success': True, 'message': 'القيد موجود بالفعل - لا حاجة لإعادة التسجيل', 'duplicate': True})
        return

    today    = entry_date or date.today().isoformat()
    cap_id   = str(cap_row['account_id'] if hasattr(cap_row, 'keys') else cap_row[5])
    cap_name = str(cap_row['name']       if hasattr(cap_row, 'keys') else cap_row[2])
    cash_id  = str(cash_row['account_id'] if hasattr(cash_row, 'keys') else cash_row[5])
    cash_name = str(cash_row['name']      if hasattr(cash_row, 'keys') else cash_row[2])

    c.execute("""
        INSERT INTO journal_entries (
            entry_no, debit, credit, amount, currency, base_amount, exchange_rate,
            ref_type, date, entry_date, transaction_date,
            debit_acc, credit_acc, debit_code, credit_code,
            debit_account_id, credit_account_id,
            statement, description, notes, status, created_by, created_at
        ) VALUES (
            ?, ?, ?, ?, 'YER', ?, 1.0,
            'OPENING_CAPITAL', ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?, 'POSTED', ?, CURRENT_TIMESTAMP
        )
    """, (
        f'OC-{capital_code}-{today}',
        cash_code, capital_code,
        amount, amount,
        today, today, today,
        cash_code, capital_code,
        cash_code, capital_code,
        cash_id, cap_id,
        description, description,
        f'قيد رأس المال الافتتاحي: مدين {cash_name} ({cash_code}) | دائن {cap_name} ({capital_code}) | المبلغ: {amount:,.0f} ريال',
        user_name
    ))

    c.execute("""UPDATE accounts SET
        current_balance = COALESCE(current_balance, 0) + ?,
        balance = COALESCE(balance, 0) + ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE code=? OR account_code=?""", (amount, amount, cash_code, cash_code))

    c.execute("""UPDATE accounts SET
        current_balance = CASE WHEN current_balance < ? THEN ? ELSE current_balance END,
        balance = CASE WHEN balance < ? THEN ? ELSE balance END,
        updated_at = CURRENT_TIMESTAMP
        WHERE code=? OR account_code=?""", (amount, amount, amount, amount, capital_code, capital_code))

    c.execute("INSERT INTO audit_log (action, entity_type, entity_id, old_value, new_value, user, source) VALUES (?, ?, ?, ?, ?, ?, ?)",
              ('OPENING_ENTRY', 'journal', f'OC-{capital_code}', '', json.dumps(data, ensure_ascii=False), user_name, 'Web Application'))

    conn.commit()

    c.execute("SELECT id, code, name, nature, current_balance, balance, opening_balance FROM accounts WHERE code IN (?, ?) ORDER BY code", (cash_code, capital_code))
    updated_accs = [dict(r) for r in c.fetchall()]
    conn.close()

    _send_json(handler, 200, {
        'success': True,
        'message': f'✅ تم تسجيل قيد رأس المال الافتتاحي | مدين: {cash_name} ({cash_code}) | دائن: {cap_name} ({capital_code}) | {amount:,.0f} ريال',
        'updated_accounts': updated_accs
    })


def _send_json(handler, code, payload):
    handler.send_response(code)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))
