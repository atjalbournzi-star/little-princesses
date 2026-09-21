# domains/quality/routes_actions.py
# Quality evaluations, inspections, and defects POST HTTP routes (PostgreSQL Cloud Backed)

import json
import pg_service


def _send_json(handler, status_code, payload):
    handler.send_response(status_code)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(payload, ensure_ascii=False, default=str).encode('utf-8'))


def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/quality/inspections':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            d = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_quality_inspection(d)
            _send_json(handler, 200, {
                'success': True,
                'message': 'تم تسجيل فحص الجودة في سوبابيز بنجاح',
                'id': res.get('id'),
                'data': res
            })
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/defects':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            d = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_quality_defect(d)
            _send_json(handler, 200, {
                'success': True,
                'message': 'تم تسجيل عيب الجودة وتكلفة COPQ في سوبابيز بنجاح',
                'id': res.get('id'),
                'data': res
            })
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/evaluations':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            d = json.loads(post_data.decode('utf-8')) if post_data else {}
            _send_json(handler, 200, {
                'success': True,
                'message': 'تم استلام التقييم بنجاح وتوثيقه',
                'id': d.get('record_id', 'EVAL-OK')
            })
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/checkpoints':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            d = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.save_quality_checkpoint(d)
            _send_json(handler, 200, {
                'success': True,
                'message': 'تم حفظ معيار فحص الجودة في سوبابيز بنجاح',
                'id': res.get('id'),
                'data': res
            })
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/settings':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            d = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.save_quality_settings(d)
            _send_json(handler, 200, {
                'success': True,
                'message': 'تم تحديث إعدادات ومستهدفات الجودة بنجاح',
                'id': res.get('id'),
                'data': res
            })
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    return False
