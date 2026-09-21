# domains/inventory/routes_inventory.py
# Inventory, products, BOM, and suppliers HTTP route handlers

import json
import pg_service
from domains.system.db_connection import get_db

def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/products', '/api/products/list', '/api/products/bom'):
        try:
            bom_data = pg_service.get_bom_models()
            products = bom_data.get('data', [])
            kpis = bom_data.get('kpis', {})
        except Exception:
            products = []
            kpis = {}
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': products, 'count': len(products), 'kpis': kpis}, ensure_ascii=False, default=str).encode('utf-8'))
        return True

    if path in ('/api/inventory', '/api/inventory/list', '/api/inventory/fabrics', '/api/inventory/items'):
        try:
            normalized_inv = pg_service.get_inventory()
        except Exception:
            normalized_inv = []
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': normalized_inv, 'count': len(normalized_inv)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path in ('/api/inventory/transactions', '/api/inventory-transactions'):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM inventory_transactions ORDER BY created_at DESC")
        txns = [dict(r) for r in c.fetchall()]
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': txns, 'count': len(txns)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path in ('/api/suppliers', '/api/suppliers/list', '/api/crm/suppliers'):
        try:
            suppliers = pg_service.get_suppliers()
        except Exception:
            suppliers = []
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': suppliers, 'count': len(suppliers)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path.startswith('/api/pricing/quick-quote'):
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'price': 150.0, 'quote_text': 'عرض سعر تقريبي: 150 $'}, ensure_ascii=False).encode('utf-8'))
        return True

    return False

def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/inventory/reconcile', '/api/inventory/reconcile_governance'):
        try:
            res = pg_service.reconcile_inventory_governance()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/inventory/adjust':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.adjust_inventory(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path in ('/api/inventory/items', '/api/inventory/items/create', '/api/inventory/items/update') and handler.command == 'POST':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_or_update_inventory(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': res}, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path in ('/api/inventory/issue', '/api/inventory/update_qty', '/api/inventory/deduct'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.update_inventory_qty(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': res}, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path in ('/api/suppliers', '/api/suppliers/create', '/api/suppliers/update') and handler.command == 'POST':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.add_supplier(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': res}, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/suppliers/delete':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.delete_supplier(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8'))
        return True

    if path in ('/api/products', '/api/products/bom', '/api/products/save') and handler.command == 'POST':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.save_bom_model(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path in ('/api/products/delete', '/api/products/remove'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            res = pg_service.delete_product(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    return False
