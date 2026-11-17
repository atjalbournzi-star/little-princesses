# domains/tailoring/routes_measurement.py
# A4 Homography Measurement Studio HTTP route handlers (GET & POST)
# Architecture Standard: Rule 1 & 3 (< 220 lines, atomic error handling)

import json
import urllib.parse
import pg_service


def _send_json(handler, status_code: int, data: dict):
    handler.send_response(status_code)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False, default=str).encode('utf-8'))


def handle_get(handler, path: str, parsed_url) -> bool:
    if path == '/api/measurements/studio/recent':
        try:
            query = urllib.parse.parse_qs(parsed_url.query)
            limit = int((query.get('limit') or [20])[0])
            sessions = pg_service.get_recent_measurement_sessions(limit)
            _send_json(handler, 200, {'success': True, 'data': sessions, 'count': len(sessions)})
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e), 'data': []})
        return True

    if path.startswith('/api/measurements/studio/') and len(path) > len('/api/measurements/studio/'):
        ident = path[len('/api/measurements/studio/'):].strip()
        if ident and ident not in ('save', 'approve'):
            try:
                session = pg_service.get_measurement_session_by_order(ident)
                if session:
                    _send_json(handler, 200, {'success': True, 'data': session})
                else:
                    _send_json(handler, 404, {'success': False, 'error': f'لم يتم العثور على جلسة للطلب: {ident}', 'data': None})
            except Exception as e:
                _send_json(handler, 500, {'success': False, 'error': str(e), 'data': None})
            return True

    if path == '/api/measurements/studio':
        query = urllib.parse.parse_qs(parsed_url.query)
        order_param = (query.get('order') or query.get('order_id') or query.get('id') or [None])[0]
        if order_param:
            try:
                session = pg_service.get_measurement_session_by_order(order_param)
                if session:
                    _send_json(handler, 200, {'success': True, 'data': session})
                else:
                    _send_json(handler, 404, {'success': False, 'error': 'لم يتم العثور على جلسة', 'data': None})
            except Exception as e:
                _send_json(handler, 500, {'success': False, 'error': str(e), 'data': None})
            return True

    return False


def handle_post(handler, path: str, parsed_url) -> bool:
    if path in ('/api/measurements/studio/save', '/api/measurements/save'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(post_data.decode('utf-8'))
            session = pg_service.save_measurement_session(data)
            _send_json(handler, 200, {
                'success': True,
                'data': session,
                'message': 'تم حفظ وتحديث جلسة المعايرة والمقاسات بنجاح في قاعدة البيانات 📐'
            })
        except Exception as e:
            _send_json(handler, 400, {'success': False, 'error': str(e)})
        return True

    if path in ('/api/measurements/studio/approve', '/api/measurements/approve'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(post_data.decode('utf-8'))
            session = pg_service.approve_measurement_session(data)
            _send_json(handler, 200, {
                'success': True,
                'data': session,
                'message': 'تم اعتماد المقاسات رسمياً وتمريرها لقسم التصنيع والمعمل 🚀'
            })
        except Exception as e:
            _send_json(handler, 400, {'success': False, 'error': str(e)})
        return True

    if path == '/api/measurements/studio/detect-a4-subpixel':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            import base64
            from domains.tailoring.subpixel_a4_detector import detect_a4_corners_subpixel
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            img_b64 = data.get('image') or data.get('image_base64') or ''
            if ',' in img_b64:
                img_b64 = img_b64.split(',', 1)[1]
            raw_bytes = base64.b64decode(img_b64)
            result = detect_a4_corners_subpixel(raw_bytes)
            status = 200 if result.get('success') else 422
            _send_json(handler, status, result)
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    return False
