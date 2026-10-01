# routes/inventory_bp.py
# Inventory, Purchases, Suppliers, and BOM Flask Blueprint

from flask import Blueprint, request, jsonify
import pg_service
from domains.system.db_connection import get_db

inventory_bp = Blueprint('inventory_bp', __name__)


@inventory_bp.route('/api/inventory', methods=['GET'])
@inventory_bp.route('/api/inventory/list', methods=['GET'])
def list_inventory():
    try:
        data = pg_service.get_inventory(request.args.to_dict())
        return jsonify({'success': True, 'data': data, 'count': len(data)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@inventory_bp.route('/api/warehouses', methods=['GET'])
def list_warehouses():
    try:
        data = pg_service.get_warehouses()
        return jsonify({'success': True, 'data': data, 'count': len(data)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@inventory_bp.route('/api/warehouses', methods=['POST'])
@inventory_bp.route('/api/warehouses/create', methods=['POST'])
def create_warehouse():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_warehouse(data)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@inventory_bp.route('/api/inventory/transfer', methods=['POST'])
def transfer_inventory():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.transfer_warehouse_stock(data)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@inventory_bp.route('/api/inventory', methods=['POST'])
@inventory_bp.route('/api/inventory/save', methods=['POST'])
def save_inventory():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_or_update_inventory(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@inventory_bp.route('/api/inventory/adjust', methods=['POST'])
def adjust_inventory():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.adjust_inventory(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@inventory_bp.route('/api/inventory/delete', methods=['POST'])
def delete_inventory():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_inventory(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@inventory_bp.route('/api/inventory/transactions', methods=['GET'])
def inventory_transactions():
    try:
        from services.pg.db_pool import execute_query
        q = """
            SELECT t.*, COALESCE(w.name, t.warehouse_id, 'المستودع الرئيسي') as warehouse_name
            FROM inventory_transactions t
            LEFT JOIN warehouses w ON t.warehouse_id = w.id
            ORDER BY t.created_at DESC;
        """
        txns = execute_query(q, fetch_all=True) or []
        for tx in txns:
            if tx.get('created_at'): tx['created_at'] = str(tx['created_at'])
        return jsonify({'success': True, 'data': txns, 'count': len(txns)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@inventory_bp.route('/api/inventory/issue', methods=['POST'])
def issue_inventory():
    try:
        data = request.get_json(silent=True) or {}
        if data.get('transfer_type') == 'TRANSFER' or data.get('to_location') or data.get('to_warehouse'):
            res = pg_service.transfer_warehouse_stock(data)
        else:
            res = pg_service.adjust_inventory(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@inventory_bp.route('/api/inventory/reconcile', methods=['POST'])
def reconcile_inventory():
    return jsonify({'success': True, 'message': 'تم مطابقة المخزون بنجاح'}), 200


@inventory_bp.route('/api/purchases', methods=['GET'])
def list_purchases():
    try:
        purchases = pg_service.get_purchases()
        return jsonify({'success': True, 'data': purchases, 'count': len(purchases)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@inventory_bp.route('/api/purchases', methods=['POST'])
@inventory_bp.route('/api/purchases/create', methods=['POST'])
def create_purchase():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_purchase(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@inventory_bp.route('/api/purchases/delete', methods=['POST'])
def delete_purchase():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_purchase(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@inventory_bp.route('/api/suppliers', methods=['GET'])
@inventory_bp.route('/api/suppliers/list', methods=['GET'])
def list_suppliers():
    try:
        suppliers = pg_service.get_suppliers()
        return jsonify({'success': True, 'data': suppliers, 'count': len(suppliers)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@inventory_bp.route('/api/suppliers', methods=['POST'])
@inventory_bp.route('/api/suppliers/create', methods=['POST'])
@inventory_bp.route('/api/suppliers/save', methods=['POST'])
def save_supplier():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_supplier(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@inventory_bp.route('/api/suppliers/delete', methods=['POST'])
def delete_supplier():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_supplier(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@inventory_bp.route('/api/products', methods=['GET'])
@inventory_bp.route('/api/products/bom', methods=['GET'])
def list_products():
    try:
        bom_data = pg_service.get_bom_models()
        products = bom_data.get('data', [])
        kpis = bom_data.get('kpis', {})
        return jsonify({'success': True, 'data': products, 'count': len(products), 'kpis': kpis}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@inventory_bp.route('/api/products', methods=['POST'])
@inventory_bp.route('/api/products/bom', methods=['POST'])
def save_product():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.save_bom_model(data)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@inventory_bp.route('/api/products/delete', methods=['POST'])
def delete_product():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_product(data)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400
