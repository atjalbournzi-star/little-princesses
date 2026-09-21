# domains/marketing/routes_core.py
# Marketing platforms, content, campaigns, comments, and dashboard HTTP routes (PostgreSQL-Native)

import json
import time
from db_client import get_db_cursor


def _send_json(handler, data, code=200):
    handler.send_response(code)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))


def handle_get(handler, path, parsed_url) -> bool:
    if path == '/api/marketing/platforms':
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT * FROM marketing_platforms ORDER BY platform_name ASC")
            rows = cur.fetchall()
        _send_json(handler, {'success': True, 'data': rows})
        return True

    if path == '/api/marketing/capability-matrix':
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT * FROM capability_matrix ORDER BY platform ASC")
            rows = cur.fetchall()
        _send_json(handler, {'success': True, 'data': rows})
        return True

    if path == '/api/marketing/campaigns':
        try:
            with get_db_cursor(commit=False) as cur:
                cur.execute("""
                    SELECT c.*, p.model_name as product_name 
                    FROM campaigns c 
                    LEFT JOIN products p ON c.product_id = p.id 
                    ORDER BY c.created_at DESC
                """)
                rows = cur.fetchall()
            _send_json(handler, {'success': True, 'data': rows})
        except Exception as e:
            _send_json(handler, {'success': True, 'data': [], 'error': str(e)})
        return True

    if path == '/api/marketing/content':
        try:
            with get_db_cursor(commit=False) as cur:
                cur.execute("""
                    SELECT c.*, p.model_name as product_name, cmp.campaign_name 
                    FROM content c 
                    LEFT JOIN products p ON c.product_id = p.id 
                    LEFT JOIN campaigns cmp ON (c.campaign_id = cmp.campaign_id)
                    ORDER BY c.created_at DESC
                """)
                content_rows = cur.fetchall()
                for item in content_rows:
                    cur.execute("SELECT * FROM content_metrics WHERE content_id = %s ORDER BY metric_date DESC", (item['content_id'],))
                    item['metrics_history'] = cur.fetchall()
            _send_json(handler, {'success': True, 'data': content_rows})
        except Exception as e:
            _send_json(handler, {'success': True, 'data': [], 'error': str(e)})
        return True

    if path == '/api/marketing/comments':
        with get_db_cursor(commit=False) as cur:
            cur.execute("""
                SELECT cm.*, cust.name as customer_name, cnt.caption as content_caption 
                FROM comments cm 
                LEFT JOIN customers cust ON cm.customer_id = cust.id 
                LEFT JOIN content cnt ON cm.content_id = cnt.content_id 
                ORDER BY cm.created_at DESC
            """)
            rows = cur.fetchall()
        _send_json(handler, {'success': True, 'data': rows})
        return True

    if path == '/api/marketing/conversations':
        with get_db_cursor(commit=False) as cur:
            cur.execute("""
                SELECT conv.*, cust.name as customer_name, cust.phone as customer_phone 
                FROM conversations conv 
                LEFT JOIN customers cust ON conv.customer_id = cust.id 
                ORDER BY conv.last_message_at DESC
            """)
            convs = cur.fetchall()
            for conv in convs:
                cur.execute("SELECT * FROM messages WHERE conversation_id = %s ORDER BY timestamp ASC", (conv['conversation_id'],))
                conv['messages'] = cur.fetchall()
        _send_json(handler, {'success': True, 'data': convs})
        return True

    if path == '/api/marketing/webhooks':
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT * FROM raw_platform_events ORDER BY received_at DESC LIMIT 100")
            rows = cur.fetchall()
        _send_json(handler, {'success': True, 'data': rows})
        return True

    if path in ('/api/marketing/dashboard', '/api/social/dashboard'):
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT COUNT(*) as cnt FROM marketing_platforms WHERE status = 'connected'")
            connected_count = cur.fetchone()['cnt']
            cur.execute("SELECT COUNT(*) as cnt FROM campaigns WHERE status = 'نشط'")
            active_campaigns = cur.fetchone()['cnt']
            cur.execute("SELECT COALESCE(SUM(budget), 0.0) as tot_budget FROM campaigns")
            total_budget = float(cur.fetchone()['tot_budget'] or 0.0)
            cur.execute("""
                SELECT 
                    COALESCE(SUM(reach), 0) as reach,
                    COALESCE(SUM(impressions), 0) as impressions,
                    COALESCE(SUM(likes), 0) as likes,
                    COALESCE(SUM(comments), 0) as comments,
                    COALESCE(SUM(shares), 0) as shares,
                    COALESCE(SUM(revenue), 0.0) as revenue
                FROM content_metrics
            """)
            m = cur.fetchone()
            cur.execute("SELECT * FROM campaigns ORDER BY created_at DESC")
            cmp_list = cur.fetchall()
            
            summary = {
                'connected_platforms': connected_count,
                'active_campaigns': active_campaigns,
                'total_budget': total_budget,
                'total_reach': int(m['reach'] or 0),
                'total_impressions': int(m['impressions'] or 0),
                'total_engagement': int((m['likes'] or 0) + (m['comments'] or 0) + (m['shares'] or 0)),
                'total_revenue': float(m['revenue'] or 0.0)
            }
        _send_json(handler, {'success': True, 'data': cmp_list, 'summary': summary})
        return True

    if path.startswith('/api/oauth/') and path.endswith('/authorize'):
        parts = path.strip('/').split('/')
        plat = parts[2].capitalize() if len(parts) >= 3 else 'Platform'
        _send_json(handler, {'success': True, 'platform': plat, 'oauth_url': f"https://auth.littleprincesses.erp/oauth?platform={plat}"})
        return True

    return False


def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/marketing/campaigns', '/api/campaigns'):
        length = int(handler.headers.get('Content-Length', 0))
        body = handler.rfile.read(length) if length > 0 else b'{}'
        try:
            data = json.loads(body.decode('utf-8'))
            cmp_id = data.get('campaign_id') or f"CMP-{int(time.time() * 1000)}"
            c_name = data.get('campaign_name') or data.get('name') or 'حملة جديدة'
            plat = data.get('platform') or 'Instagram'
            obj = data.get('objective') or 'مبيعات مباشرة'
            p_id = data.get('product_id') or None
            budget = float(data.get('budget') or data.get('spend') or 0.0)
            st_date = data.get('start_date') or None
            status = data.get('status') or 'نشط'
            pay_acc = data.get('payment_account') or '101 - الصندوق الرئيسي'

            with get_db_cursor(commit=True) as cur:
                cur.execute("""
                    INSERT INTO campaigns (campaign_id, campaign_name, platform, objective, product_id, budget, start_date, status, payment_account)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (campaign_id) DO UPDATE SET
                        campaign_name = EXCLUDED.campaign_name,
                        platform = EXCLUDED.platform,
                        budget = EXCLUDED.budget,
                        status = EXCLUDED.status,
                        updated_at = CURRENT_TIMESTAMP;
                """, (cmp_id, c_name, plat, obj, p_id, budget, st_date, status, pay_acc))

            _send_json(handler, {'success': True, 'campaign_id': cmp_id, 'message': 'تم حفظ وتحديث الحملة الإعلانية بنجاح 🚀'})
            return True
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 400)
            return True

    if path == '/api/marketing/platforms':
        length = int(handler.headers.get('Content-Length', 0))
        body = handler.rfile.read(length) if length > 0 else b'{}'
        try:
            data = json.loads(body.decode('utf-8'))
            p_name = data.get('platform_name')
            p_status = data.get('status', 'connected')
            acc_name = data.get('account_name', '')
            with get_db_cursor(commit=True) as cur:
                cur.execute("""
                    UPDATE marketing_platforms 
                    SET status = %s, account_name = %s, last_sync = CURRENT_TIMESTAMP 
                    WHERE platform_name = %s
                """, (p_status, acc_name, p_name))
            _send_json(handler, {'success': True, 'message': f'تم تحديث حالة منصة {p_name} بنجاح'})
            return True
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 400)
            return True

    if path == '/api/marketing/export':
        length = int(handler.headers.get('Content-Length', 0))
        body = handler.rfile.read(length) if length > 0 else b'{}'
        try:
            data = json.loads(body.decode('utf-8'))
            fmt = data.get('format', 'excel')
            report_type = data.get('report_type', 'executive')
            with get_db_cursor(commit=False) as cur:
                cur.execute("SELECT * FROM campaigns ORDER BY created_at DESC")
                camps = cur.fetchall()
            res = {
                'success': True,
                'format': fmt,
                'report_type': report_type,
                'exported_records': len(camps),
                'message': f'تم توليد التقرير بنجاح بصيغة {fmt.upper()} وتصدير {len(camps)} سجلاً بنجاح 🚀'
            }
            _send_json(handler, res)
            return True
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 400)
            return True

    return False

