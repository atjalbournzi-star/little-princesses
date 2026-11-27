# routes/warehouses_bp.py
# Warehouses management & Inventory API alias routes (keeps inventory_bp < 220 lines)

from flask import Blueprint, request, jsonify
import pg_service
from services.security import (
    idempotent_op, require_roles, ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER, translate_shield_error
)

warehouses_bp = Blueprint('warehouses_bp', __name__)


@warehouses_bp.route('/api/warehouses/update', methods=['POST'])
@warehouses_bp.route('/api/warehouses/edit', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
def update_warehouse_route():
    try:
        data = request.get_json(silent=True) or {}
        return jsonify(pg_service.update_warehouse(data)), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@warehouses_bp.route('/api/warehouses/toggle-status', methods=['POST'])
@warehouses_bp.route('/api/warehouses/status', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
def toggle_warehouse_status_route():
    try:
        data = request.get_json(silent=True) or {}
        return jsonify(pg_service.toggle_warehouse_status(data)), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@warehouses_bp.route('/api/warehouses/delete', methods=['POST'])
@warehouses_bp.route('/api/warehouses/remove', methods=['POST'])
@require_roles(ROLE_ADMIN)
def delete_warehouse_route():
    try:
        data = request.get_json(silent=True) or {}
        return jsonify(pg_service.delete_warehouse_if_empty(data)), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@warehouses_bp.route('/api/inventory/items', methods=['GET'])
def list_inventory_items_alias():
    try:
        data = pg_service.get_inventory(request.args.to_dict())
        return jsonify({'success': True, 'data': data, 'count': len(data)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg, 'data': []}), code


@warehouses_bp.route('/api/inventory/items', methods=['POST'])
@warehouses_bp.route('/api/inventory/items/create', methods=['POST'])
@warehouses_bp.route('/api/inventory/items/update', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER)
def save_inventory_item_alias():
    try:
        data = request.get_json(silent=True) or {}
        return jsonify({'success': True, 'data': pg_service.add_or_update_inventory(data)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@warehouses_bp.route('/api/inventory/procurement', methods=['GET'])
def list_procurement_alias():
    try:
        purchases = pg_service.get_purchases()
        return jsonify({'success': True, 'data': purchases, 'count': len(purchases)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg, 'data': []}), code


@warehouses_bp.route('/api/inventory/procurement', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
@idempotent_op('purchase_create')
def create_procurement_alias():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_purchase(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code
