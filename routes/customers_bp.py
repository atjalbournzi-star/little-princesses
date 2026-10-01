# routes/customers_bp.py
# Customer CRM & Princess Profiles Flask Blueprint

from flask import Blueprint, request, jsonify
import pg_service

customers_bp = Blueprint('customers_bp', __name__)


@customers_bp.route('/api/customers', methods=['GET'])
@customers_bp.route('/api/customers/list', methods=['GET'])
@customers_bp.route('/api/crm/customers', methods=['GET'])
def list_customers():
    try:
        customers = pg_service.get_customers()
        return jsonify({
            'success': True,
            'data': customers,
            'customers': customers,
            'count': len(customers)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@customers_bp.route('/api/customers', methods=['POST'])
@customers_bp.route('/api/crm/customers', methods=['POST'])
@customers_bp.route('/api/customers/create', methods=['POST'])
@customers_bp.route('/api/customers/update', methods=['POST'])
def save_customer():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_customer(data)
        return jsonify({
            'success': True,
            'data': res,
            'customer': res,
            'message': 'تم حفظ بيانات العميلة بنجاح 👑'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@customers_bp.route('/api/crm/customers/<customer_id>', methods=['DELETE'])
@customers_bp.route('/api/customers/<customer_id>', methods=['DELETE'])
@customers_bp.route('/api/crm/customers/delete', methods=['POST'])
@customers_bp.route('/api/customers/delete', methods=['POST'])
def delete_customer(customer_id=None):
    try:
        if not customer_id:
            data = request.get_json(silent=True) or {}
            customer_id = data.get('customer_id') or data.get('id')

        if not customer_id:
            return jsonify({'success': False, 'error': 'معرف العميلة مطلوب'}), 400

        res = pg_service.delete_customer({'customer_id': customer_id})
        return jsonify({
            'success': True,
            'message': 'تم حذف بيانات العميلة بنجاح',
            'data': res
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@customers_bp.route('/api/crm/customers/<customer_id>/tracking', methods=['GET'])
@customers_bp.route('/api/customers/<customer_id>/tracking', methods=['GET'])
def customer_tracking(customer_id):
    try:
        data = pg_service.get_customer_order_tracking(customer_id)
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@customers_bp.route('/api/crm/customers/confirm-fitting', methods=['POST'])
def confirm_fitting():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.confirm_customer_fitting(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400
