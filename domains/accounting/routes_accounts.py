# domains/accounting/routes_accounts.py
# Chart of Accounts, opening entries, audit logs, and clean reset HTTP routes

import json
import urllib.parse
from datetime import date
import pg_service
from domains.system.db_connection import get_db
from domains.accounting.code_generator import suggest_next_account_code
from domains.accounting.opening_entry_handler import handle_opening_entry

def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/accounts', '/api/accounts/list', '/api/accounts/tree'):
        try:
            deduped_rows = pg_service.get_accounts()
        except Exception:
            deduped_rows = []
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': deduped_rows}, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/accounts/summary':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT account_type, COUNT(*) as count, SUM(current_balance) as total_balance FROM accounts WHERE is_group=1 GROUP BY account_type")
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': rows}).encode('utf-8'))
        return True

    if path == '/api/accounts/suggest-code':
        query_params = urllib.parse.parse_qs(parsed_url.query)
        parent_id = query_params.get('parent_id', [''])[0]
        suggested = suggest_next_account_code(parent_id)
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'code': suggested}).encode('utf-8'))
        return True

    if path in ('/api/accounts/audit-log', '/api/audit-log'):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM audit_log ORDER BY log_id DESC LIMIT 100")
        rows = [dict(r) for r in c.fetchall()]
        if not rows:
            c.execute("SELECT * FROM account_audit_log ORDER BY id DESC LIMIT 100")
            rows = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': rows}).encode('utf-8'))
        return True

    return False

def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/accounts/save', '/api/accounts', '/api/accounts/create', '/api/accounts/add') and handler.command == 'POST':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            res = pg_service.add_account(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': res, 'account_id': res.get('id'), 'account_code': res.get('account_code') or res.get('code'), 'message': 'تم حفظ الحساب بنجاح في PostgreSQL'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e), 'message': str(e)}).encode('utf-8'))
            return True

    if path == '/api/accounts/delete':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            res = pg_service.delete_account(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': res, 'message': 'تم حذف الحساب بنجاح من PostgreSQL'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e), 'message': str(e)}).encode('utf-8'))
            return True

    if path == '/api/accounts/opening-entry':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            handle_opening_entry(handler, data)
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path in ('/api/accounts/clean-reset', '/api/accounts/reset'):
        try:
            res = pg_service.reset_clean_chart_of_accounts()
            clean_rows = res.get('accounts') or []
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': clean_rows, 'message': 'تم تصفير شجرة الحسابات وتصفير كافة الأرصدة والسندات بنجاح 👑'}, ensure_ascii=False).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    return False
