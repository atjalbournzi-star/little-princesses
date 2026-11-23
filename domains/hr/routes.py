# domains/hr/routes.py
# Human Resources, employees, advances, payroll, and tailor payout HTTP routes

import json
import urllib.parse
import pg_service


def _send_json(handler, data, code=200):
    handler.send_response(code)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False, default=str).encode('utf-8'))
    return True


def handle_get(handler, path, parsed_url) -> bool:
    try:
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}

        if path in ('/api/hr/employees', '/api/employees'):
            return _send_json(handler, {'success': True, 'data': pg_service.get_employees()})

        if path in ('/api/hr/payroll', '/api/payroll'):
            month = params.get('month')
            return _send_json(handler, {'success': True, 'data': pg_service.get_payroll({'month': month} if month else None)})

        if path == '/api/hr/payroll/calculate':
            month = params.get('month')
            return _send_json(handler, {'success': True, 'data': pg_service.calculate_payroll({'month': month} if month else None)})

        if path in ('/api/hr/advances', '/api/advances'):
            return _send_json(handler, {'success': True, 'data': pg_service.get_advances(params)})

        if path in ('/api/hr/job-roles', '/api/job-roles'):
            return _send_json(handler, {'success': True, 'data': pg_service.get_job_roles({'is_production': True})})

        if path in ('/api/hr/piece-rate-logs', '/api/piece-rate-logs'):
            return _send_json(handler, {'success': True, 'data': pg_service.get_worker_piece_rate_logs(params)})

        if path == '/api/hr/tailors-summary':
            return _send_json(handler, {'success': True, 'data': pg_service.get_tailor_payout_summary(params)})

        if path in ('/api/hr/commissions', '/api/commissions'):
            return _send_json(handler, {'success': True, 'data': pg_service.get_tailor_commissions(params)})

        if path == '/api/hr/tailor-pieces':
            return _send_json(handler, {'success': True, 'data': pg_service.get_tailor_unpaid_pieces(params)})

    except Exception as e:
        return _send_json(handler, {'success': True, 'data': []})

    return False


def _get_post_data(handler):
    content_length = int(handler.headers.get('Content-Length', 0))
    post_data = handler.rfile.read(content_length)
    return json.loads(post_data.decode('utf-8')) if post_data else {}


def handle_post(handler, path, parsed_url) -> bool:
    try:
        if path in ('/api/hr/employees', '/api/employees'):
            res = pg_service.add_employee(_get_post_data(handler))
            return _send_json(handler, {'success': True, 'data': res, 'message': 'تم حفظ بيانات الموظف بنجاح 👤'})

        if path in ('/api/hr/employees/advance', '/api/employees/advance'):
            return _send_json(handler, pg_service.add_advance(_get_post_data(handler)))

        if path in ('/api/hr/payroll/post', '/api/payroll/post', '/api/hr/payroll/pay', '/api/hr/payroll/disburse-bulk', '/api/payroll/disburse-bulk'):
            data = _get_post_data(handler)
            fn = pg_service.disburse_payroll_run_atomic if 'disburse-bulk' in path else pg_service.post_payroll
            return _send_json(handler, fn(data))

        if path in ('/api/hr/payroll/batch', '/api/payroll/batch', '/api/hr/payroll/generate'):
            return _send_json(handler, pg_service.add_payroll_batch(_get_post_data(handler)))

        if path in ('/api/hr/tailor-payout', '/api/tailor-payout', '/api/hr/tailor/payout'):
            res = pg_service.post_tailor_payout_voucher(_get_post_data(handler))
            return _send_json(handler, res, 200 if res.get('success') else 400)

        if path in ('/api/hr/liquidate-pieces', '/api/liquidate-pieces'):
            res = pg_service.liquidate_worker_pieces_atomic(_get_post_data(handler))
            return _send_json(handler, res, 200 if res.get('success') else 400)

    except Exception as e:
        return _send_json(handler, {'success': False, 'error': str(e)}, 500)

    return False

