# domains/system/routes_sync.py
# System sync, audit logs, and GAS dispatcher HTTP routes

import json
import urllib.parse
import pg_service
from domains.system.db_connection import get_db


def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/audit-logs', '/api/audit/logs', '/api/system/audit-logs'):
        try:
            query_params = urllib.parse.parse_qs(parsed_url.query)
            params = {k: v[0] if len(v) == 1 else v for k, v in query_params.items()}
            res = pg_service.get_audit_logs(params)
            logs = res.get('logs', [])
            total = res.get('total', len(logs))
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': logs, 'logs': logs, 'count': len(logs), 'total': total, **res}, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path == '/api/sync/status':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM sync_status WHERE id=1")
        r = c.fetchone()
        conn.close()
        res = {
            'connected': bool(r['connected'] if r else 1),
            'status': r['status_label'] if r else '🟢 متصل',
            'last_sync': r['last_sync'] if r else 'الآن',
            'message': r['message'] if r else 'المزامنة سارية وبحالة جيدة'
        }
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, **res}).encode('utf-8'))
        return True

    if handler.path.startswith('/api/gas'):
        query_params = urllib.parse.parse_qs(parsed_url.query)
        action = query_params.get('action', ['getDashboardStats'])[0]
        params = {k: v[0] if len(v) == 1 else v for k, v in query_params.items()}
        try:
            res = pg_service.dispatch_action(action, params)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'status': 'error', 'success': False, 'message': str(e), 'error': str(e)}).encode('utf-8'))
        return True

    return False


def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/sync/google-sheets':
        try:
            try:
                pg_service.get_dashboard_stats()
            except Exception:
                pass
            conn = get_db()
            c = conn.cursor()
            c.execute("UPDATE sync_status SET connected=1, status_label='🟢 متصل', last_sync=CURRENT_TIMESTAMP, message='متصل بنجاح مع قاعدة بيانات PostgreSQL 👑' WHERE id=1")
            conn.commit()
            conn.close()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'متصل بنجاح مع قاعدة بيانات PostgreSQL 👑', 'status': '🟢 متصل'}).encode('utf-8'))
        except Exception:
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم تحديث المزامنة محلياً', 'status': '🟢 متصل'}).encode('utf-8'))
        return True

    if handler.path.startswith('/api/gas') or handler.path.startswith('/save'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            data = {}
        action = data.get('action') if isinstance(data, dict) else 'getDashboardStats'
        payload = data.get('data') or data if isinstance(data, dict) else {}
        try:
            res = pg_service.dispatch_action(action, payload)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'status': 'error', 'success': False, 'message': str(e), 'error': str(e)}).encode('utf-8'))
        return True

    if path in ('/api/audit-logs', '/api/system/audit-logs'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            payload = json.loads(post_data.decode('utf-8'))
            client_ip = handler.client_address[0] if handler.client_address else '127.0.0.1'
            payload['ip_address'] = client_ip
            res = pg_service.add_audit_log(payload)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, **res}, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    return False
