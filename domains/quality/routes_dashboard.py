# domains/quality/routes_dashboard.py
# Quality inspections, defects, feedback, and dashboard GET routes (PostgreSQL Cloud Backed)

import json
import pg_service


def _send_json(handler, status_code, payload):
    handler.send_response(status_code)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(payload, ensure_ascii=False, default=str).encode('utf-8'))


def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/quality/dashboard', '/api/quality/summary', '/api/quality/reports'):
        try:
            data = pg_service.get_quality_dashboard_pg()
            _send_json(handler, 200, {'success': True, 'data': data})
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/inspections':
        try:
            data = pg_service.get_quality_inspections()
            _send_json(handler, 200, {'success': True, 'data': data})
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/defects':
        try:
            data = pg_service.get_quality_defects()
            _send_json(handler, 200, {'success': True, 'data': data})
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

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

    if path == '/api/quality/checkpoints':
        try:
            data = pg_service.get_quality_checkpoints()
            _send_json(handler, 200, {'success': True, 'data': data})
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/settings':
        try:
            data = pg_service.get_quality_settings()
            _send_json(handler, 200, {'success': True, 'data': data})
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    if path == '/api/quality/evaluations':
        try:
            _send_json(handler, 200, {'success': True, 'data': []})
        except Exception as e:
            _send_json(handler, 500, {'success': False, 'error': str(e)})
        return True

    return False

