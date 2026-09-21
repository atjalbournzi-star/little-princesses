# domains/inventory/routes_purchases_manage.py
# Purchases list, logical cancellation, and update HTTP routes
# Powered directly by PostgreSQL service layer (pg_service)

import json
import pg_service


def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/purchases', '/api/purchases/list'):
        try:
            purchases = pg_service.get_purchases()
        except Exception:
            purchases = []
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': purchases, 'count': len(purchases)}, ensure_ascii=False, default=str).encode('utf-8'))
        return True
    return False


def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/purchases/purge':
        # الحظر الصارم للتصفير والحذف النهائي وفق ميثاق الحوكمة المالية
        handler.send_response(403)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({
            'success': False,
            'error': 'تصفير وحذف السجلات المالية محظور بموجب ميثاق الحوكمة البرمجية والمالية (No Hard Delete Policy)'
        }, ensure_ascii=False).encode('utf-8'))
        return True

    if path in ('/api/purchases/update',):
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            post_body = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            data = json.loads(post_body.decode('utf-8'))
            
            res = pg_service.add_purchase(data)

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({
                'success': True,
                'data': res,
                'message': 'تم تحديث سجل المشتريات بنجاح في PostgreSQL'
            }, ensure_ascii=False, default=str).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8'))
            return True

    if path in ('/api/purchases/delete', '/api/purchases/cancel'):
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            post_body = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            data = json.loads(post_body.decode('utf-8'))

            # تنفيذ الإلغاء المنطقي والقيد العكسي بدلاً من الحذف الفيزيائي
            res = pg_service.cancel_purchase(data)

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8'))
            return True

    return False
