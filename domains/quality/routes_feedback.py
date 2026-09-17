# domains/quality/routes_feedback.py
# Quality feedback, complaints, returns, and corrective actions POST routes

import json
import time
import pg_service
from domains.system.db_connection import get_db
from domains.quality.db_init import sync_quality_to_gas_async


def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/quality/feedback':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            d = json.loads(post_data.decode('utf-8'))
            conn = get_db()
            c = conn.cursor()
            fb_id = d.get('feedback_id') or ('FB-' + str(int(time.time() * 1000)))
            rating = float(d.get('rating') or 5.0)
            nps_score = 10.0 if rating >= 5 else 7.0 if rating == 4 else 4.0
            c.execute('''
                INSERT INTO customer_feedback (feedback_id, feedback_date, customer_id, customer_name, order_id, product_id, sku, model_id, color, size, rating, nps_score, feedback_type, comment, channel)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                fb_id, d.get('feedback_date', ''), d.get('customer_id', ''), d.get('customer_name', ''),
                d.get('order_id', ''), d.get('product_id', ''), d.get('sku', ''), d.get('model_id', ''),
                d.get('color', ''), d.get('size', ''), rating, nps_score, d.get('feedback_type', 'NPS'),
                d.get('comment', ''), d.get('channel', 'WhatsApp')
            ))
            conn.commit()
            conn.close()

            sync_quality_to_gas_async('addQualityFeedback', d)

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم تسجيل تقييم العميل بنجاح', 'id': fb_id}, ensure_ascii=False).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path == '/api/quality/complaints':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            d = json.loads(post_data.decode('utf-8'))
            conn = get_db()
            c = conn.cursor()
            cmp_id = d.get('complaint_id') or ('CMP-' + str(int(time.time() * 1000)))
            c.execute('''
                INSERT INTO quality_complaints (complaint_id, complaint_date, customer_id, order_id, product_id, sku, model_id, complaint_type, complaint_description, severity, status, assigned_to, response_date, resolution_date, resolution_type, customer_satisfied, cost, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                cmp_id, d.get('complaint_date', ''), d.get('customer_id', ''), d.get('order_id', ''),
                d.get('product_id', ''), d.get('sku', ''), d.get('model_id', ''), d.get('complaint_type', 'مقاس'),
                d.get('complaint_description', ''), d.get('severity', 'Medium'), d.get('status', 'Open'),
                d.get('assigned_to', ''), d.get('response_date', ''), d.get('resolution_date', ''),
                d.get('resolution_type', 'تعديل مجاني'), d.get('customer_satisfied', 'Yes'), float(d.get('cost', 0)), d.get('notes', '')
            ))
            conn.commit()
            conn.close()

            sync_quality_to_gas_async('addQualityComplaint', d)

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم تسجيل الشكوى بنجاح', 'id': cmp_id}, ensure_ascii=False).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path == '/api/quality/returns':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            d = json.loads(post_data.decode('utf-8'))
            conn = get_db()
            c = conn.cursor()
            ret_id = d.get('return_id') or ('RET-' + str(int(time.time() * 1000)))
            c.execute('''
                INSERT INTO quality_returns (return_id, order_id, customer_id, product_id, sku, model_id, size, color, return_reason, is_quality_related, defect_id, return_date, refund_amount, replacement_cost)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                ret_id, d.get('order_id', ''), d.get('customer_id', ''), d.get('product_id', ''),
                d.get('sku', ''), d.get('model_id', ''), d.get('size', ''), d.get('color', ''),
                d.get('return_reason', 'عيب جودة'), d.get('is_quality_related', 'Yes'), d.get('defect_id', ''),
                d.get('return_date', ''), float(d.get('refund_amount', 0)), float(d.get('replacement_cost', 0))
            ))
            conn.commit()
            conn.close()

            sync_quality_to_gas_async('addQualityReturn', d)

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم تسجيل المرتجع بنجاح', 'id': ret_id}, ensure_ascii=False).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path == '/api/quality/corrective_actions':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            d = json.loads(post_data.decode('utf-8'))
            conn = get_db()
            c = conn.cursor()
            act_id = d.get('action_id') or ('CAPA-' + str(int(time.time() * 1000)))
            c.execute('''
                INSERT INTO quality_corrective_actions (action_id, defect_id, complaint_id, action_type, problem, root_cause, action_description, responsible, priority, start_date, due_date, completed_date, status, effectiveness, verification_date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                act_id, d.get('defect_id', ''), d.get('complaint_id', ''), d.get('action_type', 'Corrective'),
                d.get('problem', ''), d.get('root_cause', ''), d.get('action_description', ''),
                d.get('responsible', ''), d.get('priority', 'High'), d.get('start_date', ''),
                d.get('due_date', ''), d.get('completed_date', ''), d.get('status', 'In Progress'),
                d.get('effectiveness', 'Pending'), d.get('verification_date', ''), d.get('notes', '')
            ))
            conn.commit()
            conn.close()

            sync_quality_to_gas_async('addQualityCorrectiveAction', d)

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم تسجيل الإجراء التصحيحي بنجاح', 'id': act_id}, ensure_ascii=False).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path in ('/api/customer/feedback',):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_quality_feedback(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': res, 'message': 'تم تسجيل تقييمكم الراقي بنجاح! شكرًا لاختياركم Little Princesses 👑🌸'}, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    return False
