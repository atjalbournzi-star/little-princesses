# domains/tailoring/routes_delivery.py
# Customer fitting confirmation and delivery operations HTTP routes

import json
import pg_service


def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/customer/confirm-fitting', '/api/confirm-fitting'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            order_target = data.get('order') or data.get('order_id') or data.get('id') or data.get('order_no')
            notes = data.get('notes', '')
            if not order_target:
                handler.send_response(400)
                handler._send_cors_headers()
                handler.send_header('Content-Type', 'application/json; charset=utf-8')
                handler.end_headers()
                handler.wfile.write(json.dumps({'success': False, 'error': 'رقم الطلب مطلوب لتأكيد موعد البروفة'}, ensure_ascii=False).encode('utf-8'))
                return True
            res = pg_service.confirm_customer_fitting(order_target, notes)
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
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path in ('/api/sales/scan-to-deliver', '/api/scan-to-deliver', '/api/factory/scan-to-deliver'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.scan_to_deliver_order(data)
            status_code = 200 if res.get('success') else 400
            handler.send_response(status_code)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path in ('/api/sales/orders/deliver-and-settle', '/api/orders/deliver', '/api/sales/deliver'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.deliver_and_settle_order(data)
            status_code = 200 if res.get('success') else 400
            handler.send_response(status_code)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path in ('/api/sales/orders/reverse-delivery', '/api/orders/reverse-delivery'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.reverse_order_delivery(data)
            status_code = 200 if res.get('success') else 400
            handler.send_response(status_code)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    return False
