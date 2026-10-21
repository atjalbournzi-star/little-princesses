# domains/inventory/routes_inventory.py
# Inventory, products, BOM, and suppliers HTTP route handlers

import json
import pg_service
from domains.system.db_connection import get_db


def _send_json(handler, data, status=200):
    handler.send_response(status)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False, default=str).encode('utf-8'))


def _get_body(handler):
    try:
        length = int(handler.headers.get('Content-Length', 0))
        raw = handler.rfile.read(length) if length > 0 else b''
        return json.loads(raw.decode('utf-8')) if raw else {}
    except Exception:
        return {}


def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/products', '/api/products/list', '/api/products/bom'):
        try:
            bom_data = pg_service.get_bom_models()
            products, kpis = bom_data.get('data', []), bom_data.get('kpis', {})
        except Exception:
            products, kpis = [], {}
        _send_json(handler, {'success': True, 'data': products, 'count': len(products), 'kpis': kpis})
        return True

    if path in ('/api/inventory', '/api/inventory/list', '/api/inventory/fabrics', '/api/inventory/items'):
        try:
            normalized_inv = pg_service.get_inventory()
        except Exception:
            normalized_inv = []
        _send_json(handler, {'success': True, 'data': normalized_inv, 'count': len(normalized_inv)})
        return True

    if path in ('/api/inventory/transactions', '/api/inventory-transactions'):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT * FROM inventory_transactions ORDER BY created_at DESC")
        txns = [dict(r) for r in c.fetchall()]
        conn.close()
        _send_json(handler, {'success': True, 'data': txns, 'count': len(txns)})
        return True

    if path in ('/api/suppliers', '/api/suppliers/list', '/api/crm/suppliers'):
        try:
            suppliers = pg_service.get_suppliers()
        except Exception:
            suppliers = []
        _send_json(handler, {'success': True, 'data': suppliers, 'count': len(suppliers)})
        return True

    if path.startswith('/api/pricing/quick-quote'):
        _send_json(handler, {'success': True, 'price': 150.0, 'quote_text': 'عرض سعر تقريبي: 150 $'})
        return True

    return False


def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/inventory/reconcile', '/api/inventory/reconcile_governance'):
        try:
            res = pg_service.reconcile_inventory_governance()
            _send_json(handler, res)
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 400)
        return True

    if path == '/api/inventory/adjust':
        try:
            res = pg_service.adjust_inventory(_get_body(handler))
            _send_json(handler, res)
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 400)
        return True

    if path in ('/api/inventory/items', '/api/inventory/items/create', '/api/inventory/items/update'):
        try:
            res = pg_service.add_or_update_inventory(_get_body(handler))
            _send_json(handler, {'success': True, 'data': res})
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 400)
        return True

    if path in ('/api/inventory/issue', '/api/inventory/update_qty', '/api/inventory/deduct'):
        try:
            res = pg_service.update_inventory_qty(_get_body(handler))
            _send_json(handler, {'success': True, 'data': res})
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 400)
        return True

    if path in ('/api/suppliers', '/api/suppliers/create', '/api/suppliers/update'):
        try:
            res = pg_service.add_supplier(_get_body(handler))
            _send_json(handler, {'success': True, 'data': res})
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 400)
        return True

    if path == '/api/suppliers/delete':
        try:
            res = pg_service.delete_supplier(_get_body(handler))
            _send_json(handler, res)
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 400)
        return True

    if path in ('/api/products', '/api/products/bom', '/api/products/save', '/api/products/update', '/api/products/edit'):
        try:
            res = pg_service.save_bom_model(_get_body(handler))
            _send_json(handler, res)
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 500)
        return True

    if path in ('/api/products/delete', '/api/products/remove'):
        try:
            res = pg_service.delete_product(_get_body(handler))
            _send_json(handler, res)
        except Exception as e:
            _send_json(handler, {'success': False, 'error': str(e)}, 500)
        return True

    return False
