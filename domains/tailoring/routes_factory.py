# domains/tailoring/routes_factory.py
# Factory, production, job cards, alterations, watchdog, and tailor commissions GET HTTP routes

import json
import urllib.parse
import pg_service


def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/stats', '/api/dashboard/stats'):
        data = pg_service.get_dashboard_stats()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path in ('/api/factory', '/api/factory/orders'):
        data = pg_service.get_factory()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path in ('/api/factory/analytics', '/api/production/analytics'):
        data = pg_service.get_factory_analytics()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps(data, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path in ('/api/factory/job-card', '/api/production/job-card'):
        query_params = urllib.parse.parse_qs(parsed_url.query)
        order_id = query_params.get('id', [None])[0] or query_params.get('order_no', [None])[0]
        data = pg_service.get_production_order_for_job_card(order_id)
        status_code = 200 if 'error' not in data else 404
        handler.send_response(status_code)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': 'error' not in data, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path in ('/api/hr/commissions', '/api/commissions'):
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        data = pg_service.get_tailor_commissions(params)
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path in ('/api/hr/tailors-summary', '/api/tailors-summary'):
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        data = pg_service.get_tailor_payout_summary(params)
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path in ('/api/hr/tailor-pieces', '/api/tailor-pieces'):
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        data = pg_service.get_tailor_unpaid_pieces(params)
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path in ('/api/hr/tailor-vouchers', '/api/tailor-vouchers'):
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        data = pg_service.get_tailor_payout_vouchers(params)
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path in ('/api/alterations', '/api/factory/alterations'):
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        data = pg_service.get_fitting_alterations(params)
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data, 'count': len(data)}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path in ('/api/atelier/watchdog', '/api/factory/watchdog'):
        data = pg_service.get_atelier_watchdog()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    return False
