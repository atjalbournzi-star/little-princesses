# routes/orders_bp.py
# Sales Orders, Deliveries, and Pricing Quotes Flask Blueprint

from flask import Blueprint, request, jsonify
import pg_service

orders_bp = Blueprint('orders_bp', __name__)


@orders_bp.route('/api/orders', methods=['GET'])
@orders_bp.route('/api/orders/list', methods=['GET'])
@orders_bp.route('/api/sales/orders', methods=['GET'])
def list_orders():
    try:
        orders = pg_service.get_orders()
        return jsonify({'success': True, 'data': orders, 'count': len(orders)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@orders_bp.route('/api/orders', methods=['POST'])
@orders_bp.route('/api/sales/orders', methods=['POST'])
@orders_bp.route('/api/orders/create', methods=['POST'])
@orders_bp.route('/api/sales/orders/create', methods=['POST'])
def create_order():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_order(data)
        return jsonify({'success': True, 'data': res, 'order': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@orders_bp.route('/api/orders/update', methods=['POST'])
@orders_bp.route('/api/sales/orders/update', methods=['POST'])
def update_order():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.update_order(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@orders_bp.route('/api/orders/delete', methods=['POST'])
@orders_bp.route('/api/sales/orders/delete', methods=['POST'])
@orders_bp.route('/api/sales/orders/<order_id>', methods=['DELETE'])
def delete_order(order_id=None):
    try:
        if not order_id:
            data = request.get_json(silent=True) or {}
            order_id = data.get('order_id') or data.get('id') or data.get('order_no')
        if not order_id:
            return jsonify({'success': False, 'error': 'معرف الطلب مطلوب'}), 400
        res = pg_service.delete_order({'order_id': order_id})
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@orders_bp.route('/api/pricing/quick-quote', methods=['GET'])
def quick_quote():
    model_name = request.args.get('model_name', '')
    return jsonify({
        'success': True,
        'model_name': model_name,
        'price': 150.0,
        'quote_text': f'عرض سعر تقريبي: 150 $'
    }), 200


@orders_bp.route('/api/customer/track', methods=['GET'])
@orders_bp.route('/api/track', methods=['GET'])
def track_order():
    order_id = request.args.get('order') or request.args.get('order_id') or request.args.get('id')
    if not order_id:
        return jsonify({'success': False, 'error': 'رقم الطلب مطلوب'}), 400
    res = pg_service.get_customer_order_tracking(order_id)
    status_code = 200 if 'error' not in res else 404
    return jsonify({'success': 'error' not in res, 'data': res, 'error': res.get('error')}), status_code


@orders_bp.route('/api/orders/dress-card', methods=['GET'])
@orders_bp.route('/api/tailoring/dress-card', methods=['GET'])
def dress_card():
    order_id = request.args.get('order') or request.args.get('order_id') or request.args.get('id')
    if not order_id:
        return jsonify({'success': False, 'error': 'رقم الطلب مطلوب'}), 400
    try:
        from domains.tailoring.dress_card_service import get_dress_card_payload
        res = get_dress_card_payload(order_id)
        return jsonify(res), (200 if res.get('success') else 404)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@orders_bp.route('/api/sales/orders/deliver-and-settle', methods=['POST'])
def deliver_and_settle():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.deliver_and_settle_order(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@orders_bp.route('/api/sales/orders/reverse-delivery', methods=['POST'])
def reverse_delivery():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.reverse_order_delivery(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@orders_bp.route('/api/sales/scan-to-deliver', methods=['POST'])
def scan_to_deliver():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.scan_to_deliver_order(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
