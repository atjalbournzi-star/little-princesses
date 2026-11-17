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
    routes_list_map = {
        '/api/quality/inspections': pg_service.get_quality_inspections,
        '/api/quality/defects': pg_service.get_quality_defects,
        '/api/quality/feedback': pg_service.get_quality_feedback,
        '/api/quality/complaints': pg_service.get_quality_complaints,
        '/api/quality/returns': pg_service.get_quality_returns,
        '/api/quality/corrective_actions': pg_service.get_quality_actions,
        '/api/quality/checkpoints': pg_service.get_quality_checkpoints,
        '/api/quality/settings': pg_service.get_quality_settings,
    }

    if path in ('/api/quality/dashboard', '/api/quality/summary', '/api/quality/reports'):
        try:
            data = pg_service.get_quality_dashboard_pg()
        except Exception:
            data = {
                'oqs': 100, 'defect_rate': 0.0, 'first_pass_yield': 100.0, 'csat': 5.0,
                'nps': 100, 'copq': 0.0, 'total_inspections': 0, 'total_defects': 0,
                'total_feedback': 0, 'total_complaints': 0, 'total_returns': 0, 'total_actions': 0,
                'inspections': [], 'defects': [], 'feedback': [], 'complaints': [],
                'returns': [], 'corrective_actions': [], 'checkpoints': [], 'settings': []
            }
        _send_json(handler, 200, {'success': True, 'data': data})
        return True

    if path in routes_list_map:
        try:
            fn = routes_list_map[path]
            data = fn()
        except Exception:
            data = []
        _send_json(handler, 200, {'success': True, 'data': data if isinstance(data, list) else []})
        return True

    if path == '/api/quality/evaluations':
        _send_json(handler, 200, {'success': True, 'data': []})
        return True

    return False

