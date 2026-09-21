# domains/quality/routes_feedback.py
# Quality feedback, complaints, returns, and corrective actions GET/POST routes (PostgreSQL Cloud Backed)

import json
import pg_service


def _send_json(handler, status_code, payload):
    handler.send_response(status_code)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(payload, ensure_ascii=False, default=str).encode('utf-8'))


def handle_get(handler, path, parsed_url) -> bool:
    if path == '/api/quality/feedback':
        try:
            data = pg_service.get_quality_feedback()
            _send_json(handler, 200, {'success': True, 'data': data})
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/complaints':
        try:
            data = pg_service.get_quality_complaints()
            _send_json(handler, 200, {'success': True, 'data': data})
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/returns':
        try:
            data = pg_service.get_quality_returns()
            _send_json(handler, 200, {'success': True, 'data': data})
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/corrective_actions':
        try:
            data = pg_service.get_quality_actions()
            _send_json(handler, 200, {'success': True, 'data': data})
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    return False


def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/quality/feedback':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            d = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_quality_feedback(d)
            _send_json(handler, 200, {
                'success': True,
                'message': 'تم تسجيل تقييم العميل بنجاح في سوبابيز',
                'id': res.get('id'),
                'data': res
            })
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/complaints':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            d = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_quality_complaint(d)
            _send_json(handler, 200, {
                'success': True,
                'message': 'تم تسجيل الشكوى بنجاح في سوبابيز',
                'id': res.get('id'),
                'data': res
            })
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/returns':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            d = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_quality_return(d)
            _send_json(handler, 200, {
                'success': True,
                'message': 'تم تسجيل المرتجع واحتساب أثر COPQ بنجاح',
                'id': res.get('id'),
                'data': res
            })
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/corrective_actions':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            d = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_quality_action(d)
            _send_json(handler, 200, {
                'success': True,
                'message': 'تم تسجيل الإجراء التصحيحي والوقائي CAPA بنجاح',
                'id': res.get('id'),
                'data': res
            })
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path in ('/api/customer/feedback',):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_quality_feedback(data)
            _send_json(handler, 200, {
                'success': True,
                'data': res,
                'message': 'تم تسجيل تقييمكم الراقي بنجاح! شكرًا لاختياركم Little Princesses 👑🌸'
            })
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    return False

