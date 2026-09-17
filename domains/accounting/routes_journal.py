# domains/accounting/routes_journal.py
# Journal entries and general ledger HTTP route handlers

import json
import time
from datetime import datetime
import pg_service
from domains.system.db_connection import get_db

def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/journal', '/api/journal/list', '/api/journal-entries'):
        try:
            entries = pg_service.get_journal_entries()
        except Exception:
            entries = []
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': entries, 'count': len(entries)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path in ('/api/accounting/ledger', '/api/accounting/general-ledger'):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM journal_entries ORDER BY date DESC, id DESC LIMIT 500")
        entries = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM accounts")
        accounts = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'entries': entries, 'accounts': accounts}, ensure_ascii=False).encode('utf-8'))
        return True

    return False

def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/journal/create', '/api/journal/save', '/api/journal/add'):
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            post_body = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            data = json.loads(post_body.decode('utf-8'))
            payload = data.get('data') or data
            
            entry_no = payload.get('entry_no') or f"JV-{int(time.time())}"
            debit = payload.get('debit') or payload.get('debit_account_id') or ''
            credit = payload.get('credit') or payload.get('credit_account_id') or ''
            amount = float(payload.get('amount') or 0.0)
            curr = str(payload.get('currency') or 'YER').replace(' ﷼', '').replace(' $', '').strip()
            rate = float(payload.get('exchange_rate') or 1.0)
            base_amt = float(payload.get('base_amount') or (amount * rate))
            ref_type = payload.get('ref_type') or 'قيد يدوي'
            ref_id = payload.get('ref_id') or ''
            date_val = payload.get('date') or datetime.now().strftime('%Y-%m-%d')
            notes = payload.get('notes') or payload.get('statement') or ''
            tx_id = payload.get('transaction_id') or f"TX-{entry_no}"
            
            conn = get_db()
            c = conn.cursor()
            c.execute('''
                INSERT OR REPLACE INTO journal_entries (
                    entry_no, transaction_id, date, debit, credit, debit_account_id, credit_account_id,
                    amount, currency, exchange_rate, base_amount, ref_type, ref_id, notes, statement, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')
            ''', (entry_no, tx_id, date_val, debit, credit, debit, credit, amount, curr, rate, base_amt, ref_type, ref_id, notes, notes))
            
            def update_acc_balance(acc_code, is_debit_side, amt):
                if not acc_code: return
                c.execute("SELECT nature, account_type FROM accounts WHERE code = ? OR account_code = ?", (acc_code, acc_code))
                row = c.fetchone()
                nature = 'debit'
                if row:
                    nature = row['nature'] if isinstance(row, dict) else row[0]
                    acc_type = row['account_type'] if isinstance(row, dict) else row[1]
                    if not nature:
                        nature = 'credit' if acc_type in ('خصوم', 'حقوق ملكية', 'إيرادات') else 'debit'
                
                delta = amt if ((nature == 'debit' and is_debit_side) or (nature == 'credit' and not is_debit_side)) else -amt
                c.execute("UPDATE accounts SET current_balance = COALESCE(current_balance, 0) + ?, balance = COALESCE(balance, 0) + ? WHERE code = ? OR account_code = ?", (delta, delta, acc_code, acc_code))

            d_code = debit.split(' - ')[0].strip() if ' - ' in str(debit) else str(debit).strip()
            c_code = credit.split(' - ')[0].strip() if ' - ' in str(credit) else str(credit).strip()
            update_acc_balance(d_code, True, base_amt)
            update_acc_balance(c_code, False, base_amt)
            
            conn.commit()
            conn.close()
            
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم حفظ وترحيل القيد اليومي بنجاح 📑', 'entry_no': entry_no}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path in ('/api/journal/delete', '/api/accounting/journal/delete'):
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            post_body = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            req_data = json.loads(post_body.decode('utf-8'))
            entry_id = req_data.get('id')
            entry_no = req_data.get('entry_no')
            ref_id = req_data.get('ref_id')

            conn = get_db()
            c = conn.cursor()
            if entry_id:
                c.execute("DELETE FROM journal_entries WHERE id = ? OR entry_no = ?", (entry_id, entry_no or entry_id))
            elif entry_no:
                c.execute("DELETE FROM journal_entries WHERE entry_no = ?", (entry_no,))
            
            if ref_id:
                c.execute("DELETE FROM vouchers WHERE voucher_no = ? OR id = ?", (ref_id, ref_id))
            
            conn.commit()
            conn.close()

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم حذف القيد المحاسبي بنجاح'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path in ('/api/journal/update', '/api/accounting/journal/update'):
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            post_body = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            data = json.loads(post_body.decode('utf-8'))
            j_id = data.get('id')
            entry_no = data.get('entry_no')
            debit = data.get('debit', '')
            credit = data.get('credit', '')
            amount = float(data.get('amount', 0))
            curr = data.get('currency', 'YER')
            rate = float(data.get('exchange_rate', 1.0))
            base_amt = float(data.get('base_amount', amount * rate))
            date_val = data.get('date') or datetime.now().strftime('%Y-%m-%d')
            notes = data.get('notes', '')
            ref_type = data.get('ref_type', 'قيد يدوي')
            ref_id = data.get('ref_id', '')

            conn = get_db()
            c = conn.cursor()
            c.execute('''
                UPDATE journal_entries SET
                    entry_no = ?, debit = ?, credit = ?, amount = ?,
                    currency = ?, exchange_rate = ?, base_amount = ?,
                    date = ?, notes = ?, ref_type = ?, ref_id = ?
                WHERE id = ? OR entry_no = ?
            ''', (entry_no, debit, credit, amount, curr, rate, base_amt, date_val, notes, ref_type, ref_id, j_id, entry_no))
            
            if ref_id:
                c.execute('''
                    UPDATE vouchers SET
                        amount = ?, currency = ?, exchange_rate = ?,
                        base_amount = ?, notes = ?
                    WHERE voucher_no = ? OR id = ?
                ''', (amount, curr, rate, base_amt, notes, ref_id, ref_id))

            conn.commit()
            conn.close()

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم تعديل القيد المحاسبي بنجاح'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    return False
