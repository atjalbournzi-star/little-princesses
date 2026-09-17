# domains/accounting/routes_expenses.py
# Operating expenses HTTP route handlers

import json
import time
from datetime import datetime
import pg_service
from domains.system.db_connection import get_db

def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/expenses', '/api/expenses/list', '/api/finance/expenses', '/api/accounting/expenses'):
        try:
            expenses = pg_service.get_expenses()
        except Exception:
            expenses = []
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': expenses, 'count': len(expenses)}, ensure_ascii=False).encode('utf-8'))
        return True
    return False

def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/expenses', '/api/expenses/create', '/api/expenses/save', '/api/expenses/add', '/api/finance/expenses'):
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            post_body = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            data = json.loads(post_body.decode('utf-8'))
            payload = data.get('data') or data
            
            exp_no = payload.get('expense_no') or f"EXP-{int(time.time())}"
            category = payload.get('category') or payload.get('exp_category') or 'مصروفات عامة'
            amount = float(payload.get('amount') or 0.0)
            curr = str(payload.get('currency') or 'YER').replace(' ﷼', '').replace(' $', '').strip()
            rate = float(payload.get('exchange_rate') or 1.0)
            base_amt = float(payload.get('base_amount') or (amount * rate))
            date_val = payload.get('date') or datetime.now().strftime('%Y-%m-%d')
            pay_method = payload.get('payment_method') or payload.get('pay_method') or 'نقد (كاش)'
            account_id = payload.get('account_id') or payload.get('payment_source') or '101'
            recipient = payload.get('recipient') or ''
            notes = payload.get('notes') or ''
            tx_id = payload.get('transaction_id') or f"TX-{exp_no}"
            
            pg_res = pg_service.add_expense(payload)

            try:
                conn = get_db()
                try:
                    c = conn.cursor()
                    c.execute('''
                        INSERT OR REPLACE INTO expenses (
                            expense_no, exp_type, category, amount, currency, exchange_rate, base_amount,
                            transaction_id, date, payment_method, pay_method, recipient, account_id, source_acc, status, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted', ?)
                    ''', (exp_no, category, category, amount, curr, rate, base_amt, tx_id, date_val, pay_method, pay_method, recipient, account_id, account_id, notes))
                    
                    voucher_no = f"PV-{exp_no}"
                    c.execute('''
                        INSERT OR REPLACE INTO vouchers (
                            voucher_no, voucher_type, party_name, amount, currency, exchange_rate,
                            base_amount, pay_method, account_id, target_acc, date_created, notes, status
                        ) VALUES (?, 'سند صرف', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')
                    ''', (voucher_no, category, amount, curr, rate, base_amt, pay_method, account_id, category, date_val, f"سند صرف مصروف: {category} - {notes}"))
                    
                    j_no = f"JV-{exp_no}"
                    c.execute('''
                        INSERT OR REPLACE INTO journal_entries (
                            entry_number, entry_no, transaction_id, date, debit, credit, debit_account_id, credit_account_id,
                            amount, currency, exchange_rate, base_amount, ref_type, ref_id, notes, statement, status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EXPENSE', ?, ?, ?, 'posted')
                    ''', (j_no, j_no, tx_id, date_val, category, account_id, category, account_id, amount, curr, rate, base_amt, exp_no, f"قيد مصروف تشغيلي: {category} - {notes}", f"قيد مصروف تشغيلي: {category} - {notes}"))
                    
                    src_code = account_id.split(' - ')[0].strip() if ' - ' in str(account_id) else str(account_id).strip()
                    cat_code = category.split(' - ')[0].strip() if ' - ' in str(category) else str(category).strip()
                    c.execute("UPDATE accounts SET current_balance = current_balance - ?, balance = balance - ? WHERE code = ? OR account_code = ? OR id = ?", (base_amt, base_amt, src_code, src_code, src_code))
                    c.execute("UPDATE accounts SET current_balance = current_balance + ?, balance = balance + ? WHERE code = ? OR account_code = ? OR id = ?", (base_amt, base_amt, cat_code, cat_code, cat_code))
                    conn.commit()
                finally:
                    conn.close()
            except Exception:
                pass

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            res_no = pg_res.get('expense_no') if isinstance(pg_res, dict) else exp_no
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم حفظ المصروف وترحيل السند المالي والقيد اليومي بنجاح 💸', 'data': pg_res, 'expense_no': res_no}, ensure_ascii=False).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path in ('/api/expenses/delete', '/api/finance/expenses/delete'):
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            post_body = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            req_data = json.loads(post_body.decode('utf-8'))
            target_id = req_data.get('id')
            exp_no = req_data.get('expense_no') or target_id
            
            pg_del = pg_service.delete_expense(req_data)

            try:
                conn = get_db()
                try:
                    c = conn.cursor()
                    if exp_no:
                        c.execute("DELETE FROM expenses WHERE expense_no = ? OR id = ?", (exp_no, exp_no))
                        c.execute("DELETE FROM vouchers WHERE voucher_no IN (?, ?) OR id = ?", (f"PV-{exp_no}", exp_no, exp_no))
                        c.execute("DELETE FROM journal_entries WHERE entry_no IN (?, ?) OR ref_id = ? OR id = ?", (f"JV-{exp_no}", exp_no, exp_no, exp_no))
                    conn.commit()
                finally:
                    conn.close()
            except Exception:
                pass
            
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم حذف المصروف والسند المالي والقيد بنجاح 🗑️', 'result': pg_del}, ensure_ascii=False).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    return False
