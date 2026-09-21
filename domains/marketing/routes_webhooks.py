# domains/marketing/routes_webhooks.py
# Marketing webhooks, Meta verification, and message/comment ingestion (PostgreSQL-Native)

import json
import time
import urllib.parse
from db_client import get_db_cursor


def _send_json(handler, data, code=200):
    handler.send_response(code)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))


def _send_text(handler, text, code=200):
    handler.send_response(code)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'text/plain; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(str(text).encode('utf-8'))


def handle_get(handler, path, parsed_url) -> bool:
    if path.startswith('/api/webhooks/'):
        query = urllib.parse.parse_qs(parsed_url.query)
        mode = query.get('hub.mode', [None])[0]
        challenge = query.get('hub.challenge', [None])[0]
        if mode == 'subscribe' and challenge:
            _send_text(handler, challenge, 200)
            return True
        platform = path.strip('/').split('/')[-1].capitalize()
        _send_json(handler, {'success': True, 'platform': platform, 'webhook_endpoint': 'active'})
        return True
    return False


def _ingest_webhook_data(cur, platform, payload):
    entry_changes = payload.get('entry', [{}])[0].get('changes', [{}])[0].get('value', {})
    wa_msgs = entry_changes.get('messages', [])
    wa_contacts = entry_changes.get('contacts', [])
    
    msg_text = payload.get('text') or payload.get('message')
    phone = payload.get('phone') or payload.get('customer_phone')
    cust_name = payload.get('customer_name') or 'عميل منصة'

    if wa_msgs:
        m = wa_msgs[0]
        msg_text = m.get('text', {}).get('body') or m.get('body')
        phone = m.get('from')
        if wa_contacts:
            cust_name = wa_contacts[0].get('profile', {}).get('name') or cust_name

    if msg_text:
        plat_key = 'WhatsApp Business' if 'what' in platform.lower() else platform
        cur.execute("SELECT id FROM customers WHERE phone = %s LIMIT 1", (phone,))
        c_row = cur.fetchone()
        cust_id = c_row['id'] if c_row else None

        if not cust_id and phone:
            cust_id = f"CUST-WH-{phone[-4:] if len(phone)>=4 else '001'}"
            cur.execute("""
                INSERT INTO customers (id, name, phone, platform, notes, status)
                VALUES (%s, %s, %s, %s, %s, 'Active')
                ON CONFLICT (id) DO NOTHING
            """, (cust_id, cust_name, phone, plat_key, 'وارد من واتساب'))

        cur.execute("""
            SELECT conversation_id FROM conversations 
            WHERE platform = %s AND (customer_id = %s OR conversation_id = %s)
            LIMIT 1
        """, (plat_key, cust_id, f"CONV-{phone}"))
        conv = cur.fetchone()
        
        conv_id = conv['conversation_id'] if conv else f"CONV-{int(time.time()*1000)}"
        if not conv:
            cur.execute("""
                INSERT INTO conversations (conversation_id, platform, customer_id, started_at, last_message_at, status)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'open')
            """, (conv_id, plat_key, cust_id))
        else:
            cur.execute("UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE conversation_id = %s", (conv_id,))

        msg_id = f"MSG-{int(time.time()*1000)}"
        cur.execute("""
            INSERT INTO messages (message_id, conversation_id, platform_message_id, sender_type, text, timestamp, raw_data)
            VALUES (%s, %s, %s, 'customer', %s, CURRENT_TIMESTAMP, %s)
        """, (msg_id, conv_id, payload.get('id', msg_id), msg_text, json.dumps(payload, ensure_ascii=False)))


def handle_post(handler, path, parsed_url) -> bool:
    if path.startswith('/api/webhooks/'):
        platform = path.strip('/').split('/')[-1].capitalize()
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            payload = json.loads(post_data.decode('utf-8'))
        except Exception:
            payload = {'raw': post_data.decode('utf-8', errors='ignore')}

        event_id = f"EVT-{int(time.time() * 1000)}"
        event_type = payload.get('event_type') or payload.get('entry', [{}])[0].get('changes', [{}])[0].get('field', 'incoming_message')
        idempotency_key = payload.get('idempotency_key') or handler.headers.get('X-Idempotency-Key') or f"{platform}_{event_type}_{event_id}"

        try:
            with get_db_cursor(commit=True) as cur:
                cur.execute("""
                    INSERT INTO raw_platform_events (
                        event_id, platform, event_type, payload, status, idempotency_key
                    ) VALUES (%s, %s, %s, %s, 'processed', %s)
                    ON CONFLICT (idempotency_key) DO NOTHING;
                """, (event_id, platform, event_type, json.dumps(payload, ensure_ascii=False), idempotency_key))

                plat_db_name = 'WhatsApp Business' if 'what' in platform.lower() else platform
                cur.execute("UPDATE marketing_platforms SET last_sync = CURRENT_TIMESTAMP, webhook_status = 'active' WHERE platform_name = %s", (plat_db_name,))

                _ingest_webhook_data(cur, platform, payload)

            _send_json(handler, {'success': True, 'event_id': event_id, 'status': 'processed', 'message': f'Webhook received and ingested for {platform}'})
            return True
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 400)
            return True

    if path == '/api/marketing/sync':
        try:
            with get_db_cursor(commit=True) as cur:
                cur.execute("UPDATE marketing_platforms SET last_sync = CURRENT_TIMESTAMP WHERE status = 'connected';")
            _send_json(handler, {'success': True, 'message': 'تمت مزامنة طبقة التسويق والبيانات السحابية بنجاح 🟢'})
            return True
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 500)
            return True

    return False


