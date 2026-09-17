# domains/quality/routes_dashboard.py
# Quality inspections, defects, feedback, and dashboard GET routes

import json
import pg_service
from domains.system.db_connection import get_db

def handle_get(handler, path, parsed_url) -> bool:
    if path == '/api/quality/dashboard':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM quality_inspections ORDER BY id DESC")
        inspections = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM quality_defects ORDER BY id DESC")
        defects = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM customer_feedback ORDER BY id DESC")
        feedback = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM quality_complaints ORDER BY id DESC")
        complaints = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM quality_returns ORDER BY id DESC")
        returns = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM quality_corrective_actions ORDER BY id DESC")
        actions = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM quality_checkpoints WHERE active='Active'")
        checkpoints = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM quality_settings WHERE active='Active'")
        settings = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM quality_master_evaluations ORDER BY id DESC")
        evaluations = [dict(r) for r in c.fetchall()]
        
        total_orders = 0
        total_sales = 0.0
        try:
            c.execute("SELECT COUNT(*), SUM(total) FROM orders")
            row = c.fetchone()
            total_orders = row[0] or 0
            total_sales = row[1] or 0.0
        except Exception: pass
        
        total_factory = 0
        try:
            c.execute("SELECT COUNT(*) FROM factory")
            total_factory = c.fetchone()[0] or 0
        except Exception: pass
        conn.close()

        total_inspections = len(inspections)
        passed_inspections = sum(1 for i in inspections if i.get('inspection_result') == 'PASS')
        first_pass_yield = round((passed_inspections / total_inspections * 100), 1) if total_inspections > 0 else None
        
        total_defects = len(defects)
        defect_rate = round((total_defects / max(1, total_orders or total_factory or 1) * 100), 1) if (total_orders > 0 or total_factory > 0) else None
        
        total_fb = len(feedback)
        ratings = [float(f.get('rating') or 5) for f in feedback]
        csat = round(sum(ratings) / total_fb, 1) if total_fb > 0 else None
        promoters = sum(1 for r in ratings if r >= 5)
        detractors = sum(1 for r in ratings if r <= 3)
        nps = round(((promoters - detractors) / total_fb * 100)) if total_fb > 0 else None

        rework_cost = sum(float(d.get('rework_cost') or 0) for d in defects)
        waste_cost = sum(float(d.get('waste_cost') or 0) for d in defects)
        return_cost = sum(float(r.get('refund_amount') or 0) for r in returns)
        total_copq = rework_cost + waste_cost + return_cost
        copq_pct = round((total_copq / total_sales * 100), 1) if total_sales > 0 else 0.0

        prod_score = max(50, min(100, round(100 - (defect_rate * 3)))) if defect_rate is not None else 95
        cust_score = max(50, min(100, round((csat / 5.0) * 100))) if csat is not None else 90
        supp_score = 98.0
        oqs = round((prod_score * 0.35) + (cust_score * 0.35) + (supp_score * 0.30)) if (defect_rate is not None or csat is not None or len(evaluations) > 0) else None

        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({
            'success': True,
            'data': {
                'oqs': oqs,
                'defect_rate': defect_rate,
                'first_pass_yield': first_pass_yield,
                'csat': csat,
                'nps': nps,
                'copq': total_copq,
                'copq_percentage': copq_pct,
                'total_inspections': total_inspections,
                'total_defects': total_defects,
                'total_feedback': total_fb,
                'total_complaints': len(complaints),
                'total_returns': len(returns),
                'total_actions': len(actions),
                'total_evaluations': len(evaluations),
                'inspections': inspections,
                'defects': defects,
                'feedback': feedback,
                'complaints': complaints,
                'returns': returns,
                'corrective_actions': actions,
                'checkpoints': checkpoints,
                'settings': settings,
                'evaluations': evaluations
            }
        }, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/quality/evaluations':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM quality_master_evaluations ORDER BY id DESC")
        data = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/quality/inspections':
        data = pg_service.get_quality_inspections()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path == '/api/quality/defects':
        data = pg_service.get_quality_defects()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path == '/api/quality/feedback':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM customer_feedback ORDER BY id DESC")
        data = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/quality/complaints':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM quality_complaints ORDER BY id DESC")
        data = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/quality/returns':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM quality_returns ORDER BY id DESC")
        data = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/quality/corrective_actions':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM quality_corrective_actions ORDER BY id DESC")
        data = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/quality/checkpoints':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM quality_checkpoints WHERE active='Active'")
        data = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/quality/settings':
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM quality_settings WHERE active='Active'")
        data = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False).encode('utf-8'))
        return True

    return False
