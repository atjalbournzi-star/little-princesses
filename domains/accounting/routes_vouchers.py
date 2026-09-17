# domains/accounting/routes_vouchers.py
# Payment vouchers (Receipt & Payment) and payments HTTP route handlers

import json
from datetime import datetime
import pg_service
from domains.system.db_connection import get_db

def _send_json(handler, data, status=200):
    payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
    handler.send_response(status)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Content-Length', str(len(payload)))
    handler.send_header('Connection', 'close')
    handler.end_headers()
    handler.wfile.write(payload)

def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/payments', '/api/payments/list'):
        try:
            payments = pg_service.get_vouchers()
        except Exception:
            payments = []
        _send_json(handler, {'success': True, 'data': payments, 'count': len(payments)})
        return True

    if path in ('/api/vouchers', '/api/vouchers/list', '/api/accounting/vouchers', '/api/finance/vouchers'):
        try:
            vouchers = pg_service.get_vouchers()
        except Exception:
            vouchers = []
        _send_json(handler, {'success': True, 'data': vouchers, 'count': len(vouchers)})
        return True

    if path in ('/api/vouchers/card-data', '/api/vouchers/card', '/api/voucher/card'):
        import urllib.parse
        from domains.accounting.voucher_card_service import get_voucher_card_data
        query_params = urllib.parse.parse_qs(parsed_url.query)
        v_id = (query_params.get('id') or query_params.get('no') or query_params.get('voucher_no') or [None])[0]
        data = get_voucher_card_data(v_id)
        _send_json(handler, data)
        return True

    return False

def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/vouchers', '/api/vouchers/create', '/api/vouchers/save', '/api/vouchers/add', '/api/accounting/vouchers', '/api/accounting/vouchers/save'):
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            post_body = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            data = json.loads(post_body.decode('utf-8'))
            payload = data.get('data') or data
            
            res = pg_service.add_voucher(payload)
            v_num = res.get('voucher_no') or res.get('payment_no') or payload.get('v_no') or ''
            _send_json(handler, {'success': True, 'message': 'تم حفظ السند المالي وترحيل القيد بنجاح في PostgreSQL 🧾', 'data': res, 'voucher_no': v_num})
            return True
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, status=400)
            return True

    if path in ('/api/vouchers/reverse', '/api/accounting/vouchers/reverse'):
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            post_body = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            data = json.loads(post_body.decode('utf-8'))
            from domains.accounting.reversing_service import reverse_voucher
            v_id = data.get('id') or data.get('voucher_no') or data.get('v_no')
            reason = data.get('reason') or data.get('reversal_reason') or ''
            u_id = data.get('user_id') or 'admin'
            res = reverse_voucher(v_id, reason, u_id)
            status_code = 200 if res.get('success') else 400
            _send_json(handler, res, status=status_code)
            return True
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, status=500)
            return True

    if path in ('/api/vouchers/update', '/api/accounting/vouchers/update'):
        try:
            cl = int(handler.headers.get('Content-Length', 0))
            if cl > 0:
                handler.rfile.read(cl)
        except Exception:
            pass
        _send_json(handler, {
            'success': False,
            'error': 'غير مسموح بالتعديل المباشر على السندات المعتمدة حفاظاً على سلامة الدورة المستندية. يرجى إلغاء السند بقيد عكسي وإنشاء سند جديد صحيح.'
        }, status=403)
        return True

    if path in ('/api/vouchers/delete', '/api/accounting/vouchers/delete', '/api/finance/vouchers/delete'):
        try:
            cl = int(handler.headers.get('Content-Length', 0))
            if cl > 0:
                handler.rfile.read(cl)
        except Exception:
            pass
        _send_json(handler, {
            'success': False,
            'error': 'غير مسموح بحذف السندات المعتمدة نهائياً وفق معايير المحاسبة وميثاق الحوكمة (No Hard Delete). يرجى استخدام ميزة الإلغاء بقيد عكسي (Cancel with Reversing Entry).'
        }, status=403)
        return True

    return False
