# domains/system/routes.py
# System settings, FX rates, sequences, currencies, and exchange rates HTTP routes

import json
import urllib.parse
import pg_service
from domains.system.db_connection import get_db


def handle_get(handler, path, parsed_url) -> bool:
    if path.startswith('/api/pricing/quick-quote'):
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'price': 150.0, 'quote_text': 'عرض سعر تقريبي: 150 $'}, ensure_ascii=False).encode('utf-8'))
        return True

    if path in ('/api/sequences', '/api/number-sequences'):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM number_sequences ORDER BY entity ASC")
        seqs = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': seqs, 'count': len(seqs)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path in ('/api/currencies', '/api/currencies/list'):
        try:
            currencies = pg_service.get_currencies()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': currencies}, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path in ('/api/exchange-rates', '/api/rates'):
        try:
            currencies = pg_service.get_currencies()
            rates = {r['code']: float(r['exchange_rate']) for r in currencies if r.get('code')}
            rates['YER'] = 1.0
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'rates': rates}, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path in ('/api/settings', '/api/system/settings'):
        try:
            res = pg_service.get_system_settings()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, **res}, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path == '/api/settings/fx-rates':
        try:
            settings = pg_service.get_system_settings()
            rates = settings.get('currency', {}).get('rates', {})
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'rates': rates}, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    return False


def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/exchange-rates', '/api/rates'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            rates = data.get('rates', {})
            for curr, rate in rates.items():
                if curr != 'YER' and float(rate) > 0:
                    pg_service.update_exchange_rate({'code': curr, 'rate': float(rate)})
            currencies = pg_service.get_currencies()
            updated_rates = {r['code']: float(r['exchange_rate']) for r in currencies if r.get('code')}
            updated_rates['YER'] = 1.0
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'rates': updated_rates}, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path in ('/api/settings', '/api/system/settings'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            payload = json.loads(post_data.decode('utf-8'))
            client_ip = handler.client_address[0] if handler.client_address else '127.0.0.1'
            payload['ip_address'] = client_ip
            res = pg_service.save_system_settings(payload)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, **res}, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path == '/api/settings/fx-rates':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            payload = json.loads(post_data.decode('utf-8'))
            rates = payload.get('rates') or payload
            res = pg_service.save_system_settings({'rates': rates})
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'rates': rates, 'message': 'تم تحديث أسعار الصرف بنجاح'}, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    return False
