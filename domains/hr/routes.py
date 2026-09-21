# domains/hr/routes.py
# Human Resources, employees, advances, payroll, and tailor payout HTTP routes

import json
import urllib.parse
import pg_service


def handle_get(handler, path, parsed_url) -> bool:
    try:
        if path in ('/api/hr/employees', '/api/employees'):
            data = pg_service.get_employees()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
            return True

        if path in ('/api/hr/payroll', '/api/payroll'):
            query_params = urllib.parse.parse_qs(parsed_url.query)
            month = query_params.get('month', [None])[0]
            data = pg_service.get_payroll({'month': month} if month else None)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
            return True

        if path == '/api/hr/payroll/calculate':
            query_params = urllib.parse.parse_qs(parsed_url.query)
            month = query_params.get('month', [None])[0]
            data = pg_service.calculate_payroll({'month': month} if month else None)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
            return True

        if path in ('/api/hr/advances', '/api/advances'):
            query_params = urllib.parse.parse_qs(parsed_url.query)
            params = {k: v[0] for k, v in query_params.items()}
            data = pg_service.get_advances(params)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
            return True
    except Exception as e:
        handler.send_response(500)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    return False


def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/hr/employees', '/api/employees'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_employee(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': res, 'message': 'تم حفظ بيانات الموظف بنجاح 👤'}, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path in ('/api/hr/employees/advance', '/api/employees/advance'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_advance(data)
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

    if path in ('/api/hr/payroll/post', '/api/payroll/post', '/api/hr/payroll/pay'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.post_payroll(data)
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

    if path in ('/api/hr/payroll/batch', '/api/payroll/batch', '/api/hr/payroll/generate'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_payroll_batch(data)
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

    if path in ('/api/hr/tailor-payout', '/api/tailor-payout', '/api/hr/tailor/payout'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.post_tailor_payout_voucher(data)
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
