# routes/hr_bp.py
# Human Resources, Payroll, Advances, and Tailor Payouts Flask Blueprint
# Architectural Standards: Strictly < 220 lines per file

import logging
from flask import Blueprint, request, jsonify
import pg_service
from services.security import (
    idempotent_op, require_roles, ROLE_ADMIN, ROLE_ACCOUNTANT, translate_shield_error
)

logger = logging.getLogger("LittlePrincesses_HR_BP")
hr_bp = Blueprint('hr_bp', __name__)

@hr_bp.route('/api/hr/employees', methods=['GET'])
@hr_bp.route('/api/employees', methods=['GET'])
def list_employees():
    try: data = pg_service.get_employees()
    except Exception: data = []
    return jsonify({'success': True, 'data': data, 'count': len(data)}), 200

@hr_bp.route('/api/hr/employees', methods=['POST'])
@hr_bp.route('/api/employees', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
def save_employee():
    try:
        data = request.get_json(silent=True) or {}
        return jsonify({'success': True, 'data': pg_service.add_employee(data)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/employees/delete', methods=['POST'])
@require_roles(ROLE_ADMIN)
def delete_employee():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_employee(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/job-roles', methods=['GET'])
@hr_bp.route('/api/job-roles', methods=['GET'])
def list_job_roles():
    try: data = pg_service.get_job_roles(dict(request.args))
    except Exception: data = []
    return jsonify({'success': True, 'data': data, 'count': len(data)}), 200

@hr_bp.route('/api/hr/job-roles', methods=['POST'])
@hr_bp.route('/api/job-roles', methods=['POST'])
@require_roles(ROLE_ADMIN)
def save_job_role():
    try:
        data = request.get_json(silent=True) or {}
        return jsonify({'success': True, 'data': pg_service.add_job_role(data)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/payroll', methods=['GET'])
@hr_bp.route('/api/payroll', methods=['GET'])
def get_payroll():
    try:
        month = request.args.get('month')
        data = pg_service.get_payroll({'month': month} if month else None)
    except Exception as e:
        logger.error(f"Error fetching payroll: {e}")
        data = []
    return jsonify({'success': True, 'data': data or [], 'count': len(data or [])}), 200

@hr_bp.route('/api/hr/payroll/calculate', methods=['GET'])
def calculate_payroll():
    try:
        month = request.args.get('month')
        return jsonify({'success': True, 'data': pg_service.calculate_payroll({'month': month} if month else None)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/payroll/batch', methods=['POST'])
@idempotent_op('payroll_batch')
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
def save_payroll_batch():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_payroll_batch(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/payroll/post', methods=['POST'])
@hr_bp.route('/api/payroll/post', methods=['POST'])
@hr_bp.route('/api/payroll/runs/post', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
@idempotent_op('payroll_post')
def post_payroll():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.post_payroll(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/payroll/disburse-bulk', methods=['POST'])
@hr_bp.route('/api/payroll/disburse-bulk', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
@idempotent_op('payroll_disburse')
def disburse_payroll_bulk():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.disburse_payroll_run_atomic(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/advances', methods=['GET'])
@hr_bp.route('/api/advances', methods=['GET'])
def list_advances():
    try:
        params = {k: v for k, v in request.args.items()}
        return jsonify({'success': True, 'data': pg_service.get_advances(params)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg, 'data': []}), code

@hr_bp.route('/api/hr/advances', methods=['POST'])
@hr_bp.route('/api/advances', methods=['POST'])
@hr_bp.route('/api/hr/employees/advance', methods=['POST'])
@hr_bp.route('/api/employees/advance', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
@idempotent_op('employee_advance')
def save_advance():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_advance(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/commissions', methods=['GET'])
@hr_bp.route('/api/commissions', methods=['GET'])
def tailor_commissions():
    try:
        params = {k: v for k, v in request.args.items()}
        return jsonify({'success': True, 'data': pg_service.get_tailor_commissions(params)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/tailors-summary', methods=['GET'])
def tailors_summary():
    try:
        params = {k: v for k, v in request.args.items()}
        return jsonify({'success': True, 'data': pg_service.get_tailor_payout_summary(params)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/tailor-pieces', methods=['GET'])
def tailor_pieces():
    try:
        params = {k: v for k, v in request.args.items()}
        return jsonify({'success': True, 'data': pg_service.get_tailor_unpaid_pieces(params)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/tailor-payout', methods=['POST'])
@hr_bp.route('/api/factory/piece-rates/pay', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
@idempotent_op('tailor_payout')
def tailor_payout():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.post_tailor_payout_voucher(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/piece-rate-logs', methods=['GET'])
@hr_bp.route('/api/piece-rate-logs', methods=['GET'])
def piece_rate_logs():
    try:
        params = {k: v for k, v in request.args.items()}
        return jsonify({'success': True, 'data': pg_service.get_worker_piece_rate_logs(params)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@hr_bp.route('/api/hr/liquidate-pieces', methods=['POST'])
@hr_bp.route('/api/liquidate-pieces', methods=['POST'])
@hr_bp.route('/api/factory/piece-rates/liquidate', methods=['POST'])
@hr_bp.route('/api/factory/piece-rates/post', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
@idempotent_op('liquidate_pieces')
def liquidate_pieces():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.liquidate_worker_pieces_atomic(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code
