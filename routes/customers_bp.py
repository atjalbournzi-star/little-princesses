# routes/customers_bp.py
# Customer CRM & Princess Profiles Flask Blueprint
# Architectural Standards: Strictly < 220 lines per file

from flask import Blueprint, request, jsonify
import pg_service
from services.security import require_roles, ROLE_ADMIN, translate_shield_error

customers_bp = Blueprint('customers_bp', __name__)

@customers_bp.route('/api/customers', methods=['GET'])
@customers_bp.route('/api/customers/list', methods=['GET'])
@customers_bp.route('/api/crm/customers', methods=['GET'])
def list_customers():
    try: customers = pg_service.get_customers()
    except Exception: customers = []
    return jsonify({'success': True, 'data': customers, 'customers': customers, 'count': len(customers)}), 200

@customers_bp.route('/api/customers', methods=['POST', 'PUT'])
@customers_bp.route('/api/crm/customers', methods=['POST', 'PUT'])
@customers_bp.route('/api/customers/create', methods=['POST', 'PUT'])
@customers_bp.route('/api/customers/update', methods=['POST', 'PUT'])
def save_customer():
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return jsonify({'success': False, 'error': 'لم يتم استلام بيانات صالحة ⚠️'}), 400
        name = str(data.get('name') or data.get('customer_name') or '').strip()
        phone = str(data.get('phone') or data.get('phone_number') or '').strip()
        if not name:
            return jsonify({'success': False, 'error': 'اسم العميل / المنشأة مطلوب ⚠️'}), 400
        if not phone:
            return jsonify({'success': False, 'error': 'رقم هاتف العميل مطلوب ⚠️'}), 400
        res = pg_service.add_customer(data)
        return jsonify({'success': True, 'data': res, 'customer': res, 'message': 'تم حفظ بيانات العميل بنجاح 👑'}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@customers_bp.route('/api/crm/customers/<customer_id>', methods=['DELETE'])
@customers_bp.route('/api/customers/<customer_id>', methods=['DELETE'])
@customers_bp.route('/api/crm/customers/delete', methods=['POST'])
@customers_bp.route('/api/customers/delete', methods=['POST'])
@require_roles(ROLE_ADMIN)
def delete_customer(customer_id=None):
    try:
        if not customer_id:
            data = request.get_json(silent=True) or {}
            customer_id = data.get('customer_id') or data.get('id')
        if not customer_id:
            return jsonify({'success': False, 'error': 'معرف العميلة مطلوب'}), 400
        res = pg_service.delete_customer({'customer_id': customer_id})
        return jsonify({'success': True, 'message': 'تم حذف بيانات العميلة بنجاح', 'data': res}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@customers_bp.route('/api/crm/customers/<customer_id>/tracking', methods=['GET'])
@customers_bp.route('/api/customers/<customer_id>/tracking', methods=['GET'])
def customer_tracking(customer_id):
    try:
        data = pg_service.get_customer_order_tracking(customer_id)
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@customers_bp.route('/api/crm/customers/confirm-fitting', methods=['POST'])
def confirm_fitting():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.confirm_customer_fitting(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code
