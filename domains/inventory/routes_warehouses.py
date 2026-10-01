# domains/inventory/routes_warehouses.py
# Multi-Warehouse HTTP route handlers (GET, POST, UPDATE, TOGGLE, DELETE, TRANSFER)
# Powered directly by PostgreSQL service layer (pg_service)

import json
import urllib.parse
import pg_service


def handle_get(handler, path, parsed_url) -> bool:
    """معالجة استعلامات المستودعات وأرصدة الأصناف"""
    if path in ('/api/warehouses', '/api/warehouses/list'):
        try:
            q_params = urllib.parse.parse_qs(parsed_url.query) if parsed_url else {}
            inc_all = 'all' in q_params or q_params.get('include_inactive', ['false'])[0].lower() == 'true'
            data = pg_service.get_warehouses({'all': inc_all})
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(
                {'success': True, 'data': data, 'count': len(data)},
                ensure_ascii=False, default=str
            ).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(
                {'success': False, 'error': str(e), 'data': []},
                ensure_ascii=False
            ).encode('utf-8'))
        return True

    return False


def handle_post(handler, path, parsed_url) -> bool:
    """معالجة إنشاء وتعديل وحذف المستودعات والمناقلات المخزنية الذرية"""
    if path in ('/api/warehouses', '/api/warehouses/create'):
        return _dispatch_post(handler, pg_service.add_warehouse)

    if path in ('/api/warehouses/update', '/api/warehouses/edit'):
        return _dispatch_post(handler, pg_service.update_warehouse)

    if path in ('/api/warehouses/toggle-status', '/api/warehouses/status'):
        return _dispatch_post(handler, pg_service.toggle_warehouse_status)

    if path in ('/api/warehouses/delete', '/api/warehouses/remove'):
        return _dispatch_post(handler, pg_service.delete_warehouse_if_empty)

    if path in ('/api/inventory/transfer', '/api/warehouses/transfer'):
        return _dispatch_post(handler, pg_service.transfer_warehouse_stock)

    return False


def _dispatch_post(handler, service_fn) -> bool:
    """معالج موحد لطلبات الـ POST مع معالجة الأخطاء الذرية وحوكمة الاستجابات"""
    content_length = int(handler.headers.get('Content-Length', 0))
    post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
    try:
        data = json.loads(post_data.decode('utf-8')) if post_data else {}
        res = service_fn(data)
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
    except Exception as e:
        handler.send_response(400)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8'))
    return True
