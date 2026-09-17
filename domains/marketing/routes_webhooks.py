# domains/marketing/routes_webhooks.py
# Marketing webhooks, platform management, and campaign creation POST routes

import json
import time
import sys
import sqlite3
from domains.system.db_connection import get_db

def handle_post(handler, path, parsed_url) -> bool:
    if path.startswith('/api/webhooks/'):
        platform = path.strip('/').split('/')[-1].capitalize()
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            payload = json.loads(post_data.decode('utf-8'))
        except Exception:
            payload = {'raw': post_data.decode('utf-8', errors='ignore')}
            
        event_id = f"EVT-{int(time.time() * 1000)}" if 'time' in sys.modules else f"EVT-{hash(post_data) & 0xffffff}"
        event_type = payload.get('event_type') or payload.get('entry', [{}])[0].get('changes', [{}])[0].get('field', 'general_event')
        idempotency_key = payload.get('idempotency_key') or handler.headers.get('X-Idempotency-Key') or f"{platform}_{event_type}_{event_id}"
        
        conn = get_db()
        c = conn.cursor()
        try:
            c.execute('''
                INSERT INTO raw_platform_events (
                    event_id, platform, event_type, payload, status, idempotency_key
                ) VALUES (?, ?, ?, ?, 'processed', ?)
            ''', (event_id, platform, event_type, json.dumps(payload, ensure_ascii=False), idempotency_key))
            
            c.execute("UPDATE marketing_platforms SET last_sync=CURRENT_TIMESTAMP, webhook_status='active' WHERE platform_name=?", (platform,))
            conn.commit()
            conn.close()
            
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'event_id': event_id, 'status': 'processed', 'message': f'Webhook event received & logged for {platform}'}).encode('utf-8'))
            return True
        except sqlite3.IntegrityError:
            conn.close()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'event_id': event_id, 'status': 'duplicate_ignored', 'message': 'Duplicate webhook event ignored (Idempotency)'}).encode('utf-8'))
            return True
        except Exception as e:
            if conn: conn.close()
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path == '/api/marketing/platforms':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            p_name = data.get('platform_name')
            p_status = data.get('status', 'connected')
            acc_name = data.get('account_name', '')
            conn = get_db()
            c = conn.cursor()
            c.execute("UPDATE marketing_platforms SET status=?, account_name=?, last_sync=CURRENT_TIMESTAMP WHERE platform_name=?", (p_status, acc_name, p_name))
            conn.commit()
            conn.close()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': f'تم تحديث حالة منصة {p_name} بنجاح'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path in ('/api/marketing/campaigns', '/api/campaigns'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            cmp_id = data.get('campaign_id') or f"CMP-{int(time.time() * 1000) if 'time' in sys.modules else 1003}"
            c_name = data.get('campaign_name') or data.get('name')
            plat = data.get('platform') or 'Instagram'
            obj = data.get('objective') or 'مبيعات مباشرة'
            p_id = data.get('product_id')
            budget = float(data.get('budget') or data.get('spend') or 0.0)
            st_date = data.get('start_date') or ''
            status = data.get('status') or 'نشط'
            pay_acc = data.get('payment_account') or '505 - مصاريف التسويق والإعلانات'
            
            if not c_name:
                raise Exception("اسم الحملة مطلوب")

            conn = get_db()
            c = conn.cursor()
            c.execute('''
                INSERT INTO campaigns (campaign_id, campaign_name, platform, objective, product_id, budget, start_date, status, payment_account)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (cmp_id, c_name, plat, obj, p_id, budget, st_date, status, pay_acc))
            conn.commit()
            conn.close()

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'campaign_id': cmp_id, 'message': 'تم إضافة الحملة الإعلانية بنجاح'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path == '/api/marketing/sync':
        try:
            conn = get_db()
            c = conn.cursor()
            c.execute("UPDATE sync_status SET connected=1, status_label='🟢 متصل', last_sync=CURRENT_TIMESTAMP, message='تمت مزامنة طبقة التسويق بنجاح' WHERE id=1")
            conn.commit()
            conn.close()

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تمت مزامنة طبقة التسويق والبيانات السحابية بنجاح'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    return False
