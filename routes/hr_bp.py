# routes/hr_bp.py
# Human Resources, Payroll, Advances, and Tailor Payouts Flask Blueprint

from flask import Blueprint, request, jsonify
import pg_service

hr_bp = Blueprint('hr_bp', __name__)


@hr_bp.route('/api/hr/employees', methods=['GET'])
@hr_bp.route('/api/employees', methods=['GET'])
def list_employees():
    try:
        data = pg_service.get_employees()
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@hr_bp.route('/api/hr/employees', methods=['POST'])
@hr_bp.route('/api/employees', methods=['POST'])
def save_employee():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_employee(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@hr_bp.route('/api/hr/employees/delete', methods=['POST'])
def delete_employee():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_employee(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@hr_bp.route('/api/hr/payroll', methods=['GET'])
@hr_bp.route('/api/payroll', methods=['GET'])
def get_payroll():
    try:
        month = request.args.get('month')
        data = pg_service.get_payroll({'month': month} if month else None)
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@hr_bp.route('/api/hr/payroll/calculate', methods=['GET'])
def calculate_payroll():
    try:
        month = request.args.get('month')
        data = pg_service.calculate_payroll({'month': month} if month else None)
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@hr_bp.route('/api/hr/payroll/batch', methods=['POST'])
def save_payroll_batch():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_payroll_batch(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@hr_bp.route('/api/hr/advances', methods=['GET'])
@hr_bp.route('/api/advances', methods=['GET'])
def list_advances():
    try:
        params = {k: v for k, v in request.args.items()}
        data = pg_service.get_advances(params)
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@hr_bp.route('/api/hr/advances', methods=['POST'])
@hr_bp.route('/api/advances', methods=['POST'])
def save_advance():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_advance(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@hr_bp.route('/api/hr/commissions', methods=['GET'])
@hr_bp.route('/api/commissions', methods=['GET'])
def tailor_commissions():
    try:
        params = {k: v for k, v in request.args.items()}
        data = pg_service.get_tailor_commissions(params)
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@hr_bp.route('/api/hr/tailors-summary', methods=['GET'])
def tailors_summary():
    try:
        params = {k: v for k, v in request.args.items()}
        data = pg_service.get_tailor_payout_summary(params)
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@hr_bp.route('/api/hr/tailor-pieces', methods=['GET'])
def tailor_pieces():
    try:
        params = {k: v for k, v in request.args.items()}
        data = pg_service.get_tailor_unpaid_pieces(params)
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@hr_bp.route('/api/hr/tailor-payout', methods=['POST'])
def tailor_payout():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.post_tailor_payout_voucher(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400
