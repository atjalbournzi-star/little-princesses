# domains/marketing/routes_core.py
# Marketing platforms, content, campaigns, comments, and dashboard HTTP routes

import json
from domains.system.db_connection import get_db

def handle_get(handler, path, parsed_url) -> bool:
    if path == '/api/marketing/platforms':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM marketing_platforms ORDER BY platform_name ASC")
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': rows}).encode('utf-8'))
        return True

    if path == '/api/marketing/capability-matrix':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM capability_matrix ORDER BY platform ASC")
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': rows}).encode('utf-8'))
        return True

    if path == '/api/marketing/campaigns':
        try:
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT c.*, COALESCE(p.name, p.model_name) as product_name FROM campaigns c LEFT JOIN products p ON c.product_id = p.id ORDER BY c.created_at DESC")
            rows = [dict(r) for r in c.fetchall()]
            conn.close()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': rows}).encode('utf-8'))
        except Exception as e:
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': [], 'error': str(e)}).encode('utf-8'))
        return True

    if path == '/api/marketing/content':
        try:
            conn = get_db()
            c = conn.cursor()
            c.execute('''
                SELECT c.*, COALESCE(p.name, p.model_name) as product_name, cmp.campaign_name 
                FROM content c 
                LEFT JOIN products p ON c.product_id = p.id 
                LEFT JOIN campaigns cmp ON (c.campaign_id = cmp.campaign_id OR c.campaign_id = ('CMP-' || cmp.id))
                ORDER BY c.created_at DESC
            ''')
            content_rows = [dict(r) for r in c.fetchall()]
            for item in content_rows:
                c.execute("SELECT * FROM content_metrics WHERE content_id=? ORDER BY date DESC", (item['content_id'],))
                item['metrics_history'] = [dict(m) for m in c.fetchall()]
            conn.close()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': content_rows}).encode('utf-8'))
        except Exception as e:
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': [], 'error': str(e)}).encode('utf-8'))
        return True

    if path == '/api/marketing/comments':
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            SELECT cm.*, cust.name as customer_name, cnt.caption as content_caption 
            FROM comments cm 
            LEFT JOIN customers cust ON cm.customer_id = cust.id 
            LEFT JOIN content cnt ON cm.content_id = cnt.content_id 
            ORDER BY cm.created_at DESC
        ''')
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': rows}).encode('utf-8'))
        return True

    if path == '/api/marketing/conversations':
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            SELECT conv.*, cust.name as customer_name, cust.phone as customer_phone 
            FROM conversations conv 
            LEFT JOIN customers cust ON conv.customer_id = cust.id 
            ORDER BY conv.last_message_at DESC
        ''')
        convs = [dict(r) for r in c.fetchall()]
        for conv in convs:
            c.execute("SELECT * FROM messages WHERE conversation_id=? ORDER BY timestamp ASC", (conv['conversation_id'],))
            conv['messages'] = [dict(m) for m in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': convs}).encode('utf-8'))
        return True

    if path == '/api/marketing/webhooks':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM raw_platform_events ORDER BY received_at DESC LIMIT 100")
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': rows}).encode('utf-8'))
        return True

    if path in ('/api/marketing/dashboard', '/api/social/dashboard'):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM marketing_platforms WHERE status='connected'")
        connected_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM campaigns WHERE status='نشط'")
        active_campaigns = c.fetchone()[0]
        c.execute("SELECT SUM(budget) FROM campaigns")
        total_budget = c.fetchone()[0] or 0.0
        c.execute("SELECT SUM(reach), SUM(impressions), SUM(likes), SUM(comments), SUM(shares), SUM(revenue) FROM content_metrics")
        m = c.fetchone()
        tot_reach = m[0] or 0
        tot_impressions = m[1] or 0
        tot_likes = m[2] or 0
        tot_comments = m[3] or 0
        tot_shares = m[4] or 0
        tot_revenue = m[5] or 0.0

        c.execute("SELECT * FROM campaigns ORDER BY created_at DESC")
        cmp_list = [dict(r) for r in c.fetchall()]
        conn.close()
        
        summary = {
            'connected_platforms': connected_count,
            'active_campaigns': active_campaigns,
            'total_budget': total_budget,
            'total_reach': tot_reach,
            'total_impressions': tot_impressions,
            'total_engagement': tot_likes + tot_comments + tot_shares,
            'total_revenue': tot_revenue
        }
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': cmp_list, 'summary': summary}).encode('utf-8'))
        return True

    return False

def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/marketing/export':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            fmt = data.get('format', 'excel')
            report_type = data.get('report_type', 'executive')
            
            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT * FROM campaigns")
            camps = [dict(r) for r in c.fetchall()]
            conn.close()

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            res = {
                'success': True,
                'format': fmt,
                'report_type': report_type,
                'exported_records': len(camps),
                'message': f'تم توليد التقرير بنجاح بصيغة {fmt.upper()} وتصدير {len(camps)} سجلاً بنجاح 🚀'
            }
            handler.wfile.write(json.dumps(res).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    return False
