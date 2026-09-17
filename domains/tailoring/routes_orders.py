# domains/tailoring/routes_orders.py
# Sales orders GET & CRUD HTTP routes

import json
import time
import urllib.parse
import pg_service
from domains.system.db_connection import get_db


def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/orders', '/api/orders/list', '/api/sales/orders'):
        try:
            orders = pg_service.get_orders()
        except Exception:
            orders = []
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': orders, 'count': len(orders)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path in ('/api/customer/track', '/api/track'):
        query_params = urllib.parse.parse_qs(parsed_url.query)
        order_param = (query_params.get('order') or query_params.get('order_id') or query_params.get('id') or [None])[0]
        if not order_param:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': 'رقم الطلب أو الفاتورة مطلوب'}, ensure_ascii=False).encode('utf-8'))
            return True
        res = pg_service.get_customer_order_tracking(order_param)
        status_code = 200 if 'error' not in res else 404
        handler.send_response(status_code)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': 'error' not in res, 'data': res, 'error': res.get('error')}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path in ('/api/orders/dress-card', '/api/tailoring/dress-card', '/api/dress-card'):
        query_params = urllib.parse.parse_qs(parsed_url.query)
        order_param = (query_params.get('order') or query_params.get('order_id') or query_params.get('id') or [None])[0]
        if not order_param:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': 'رقم الطلب أو الفاتورة مطلوب'}, ensure_ascii=False).encode('utf-8'))
            return True
        from domains.tailoring.dress_card_service import get_dress_card_payload
        res = get_dress_card_payload(order_param)
        status_code = 200 if res.get('success') else 404
        handler.send_response(status_code)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    return False


def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/orders/create', '/api/orders/save', '/api/sales/orders/create', '/api/sales/orders/save', '/api/orders', '/api/sales/orders'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(post_data.decode('utf-8'))
        except Exception:
            data = {}
        try:
            res = pg_service.add_order(data)
            order_id = res.get('id') or data.get('id')
            order_no = res.get('order_no') or data.get('order_no') or order_id
            try:
                conn = get_db()
                try:
                    c = conn.cursor()
                    now = time.strftime('%Y-%m-%d %H:%M:%S')
                    total = float(data.get('total') or data.get('total_amount') or 0.0)
                    paid = float(data.get('paid') or data.get('paid_amount') or 0.0)
                    remaining = total - paid
                    c.execute('''
                        INSERT OR REPLACE INTO sales_orders (
                            id, order_no, customer_id, child_id, product_id, variant_id, qty,
                            order_date, delivery_date, total, paid, remaining, currency,
                            payment_status, production_status, status, notes, created_at, updated_at, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        order_id, order_no,
                        data.get('customer_id') or data.get('customer_name') or '',
                        data.get('child_id') or data.get('child_name') or '',
                        data.get('product_id') or data.get('product_name') or '',
                        data.get('variant_id', ''),
                        float(data.get('qty', 1.0)),
                        data.get('order_date', now[:10]),
                        data.get('delivery_date', ''),
                        total, paid, remaining,
                        data.get('currency', 'YER'),
                        'مدفوع بالكامل' if paid >= total and total > 0 else ('مدفوع جزئياً' if paid > 0 else 'غير مدفوع'),
                        data.get('production_status', 'قيد الخياطة 🪡'),
                        data.get('status', 'نشط'),
                        data.get('notes', ''),
                        now, now,
                        data.get('created_by', 'system')
                    ))
                    conn.commit()
                finally:
                    conn.close()
            except Exception:
                pass

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'id': order_id, 'order_no': order_no, 'data': res, 'order': res, 'message': 'تم حفظ الفاتورة وتوليد QR Code سحابياً ☁️📄'}, ensure_ascii=False, default=str).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path in ('/api/orders/update', '/api/sales/orders/update'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(post_data.decode('utf-8'))
        except Exception:
            data = {}
        try:
            new_stage = data.get('status') or data.get('production_status')
            oid = data.get('id') or data.get('order_id')
            if new_stage and oid:
                try:
                    curr_track = pg_service.get_customer_order_tracking(oid)
                    if curr_track and not curr_track.get('error'):
                        curr_status = curr_track.get('status') or curr_track.get('stage')
                        if curr_status:
                            from domains.tailoring.state_machine import validate_transition
                            validate_transition(curr_status, new_stage)
                except Exception as ve:
                    from domains.common.errors import InvalidStateTransitionError
                    if isinstance(ve, InvalidStateTransitionError):
                        handler.send_response(400)
                        handler._send_cors_headers()
                        handler.send_header('Content-Type', 'application/json; charset=utf-8')
                        handler.end_headers()
                        handler.wfile.write(json.dumps({'success': False, 'error': str(ve)}, ensure_ascii=False).encode('utf-8'))
                        return True

            res = pg_service.update_order(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': res, 'message': 'تم تحديث بيانات الفاتورة بنجاح 🔄'}, ensure_ascii=False, default=str).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path in ('/api/orders/delete', '/api/sales/orders/delete'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(post_data.decode('utf-8'))
        except Exception:
            data = {}
        try:
            res = pg_service.delete_order(data)
            oid = data.get('id') or data.get('order_id')
            try:
                conn = get_db()
                try:
                    c = conn.cursor()
                    if oid:
                        c.execute("DELETE FROM sales_orders WHERE id = ? OR order_no = ?", (oid, oid))
                        c.execute("DELETE FROM production_orders WHERE order_id = ?", (oid,))
                    conn.commit()
                finally:
                    conn.close()
            except Exception:
                pass

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': res, 'message': 'تم حذف الطلب والفاتورة وسنداتها الانسيابية بنجاح 🗑️'}, ensure_ascii=False, default=str).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    return False
