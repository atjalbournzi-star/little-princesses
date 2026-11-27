# routes/size_matrices_bp.py
# Flask Blueprint for Multi-Segment Standard Size Matrices

from flask import Blueprint, request, jsonify
import pg_service
from services.security import (
    require_roles, translate_shield_error,
    ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER, ROLE_DATA_ENTRY, ROLE_TAILOR,
)

size_matrices_bp = Blueprint('size_matrices_bp', __name__)


@size_matrices_bp.route('/api/size-matrices', methods=['GET'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER, ROLE_DATA_ENTRY, ROLE_TAILOR)
def list_size_matrices():
    try:
        seg = request.args.get('segment_code') or request.args.get('segment')
        inc = str(request.args.get('include_inactive', '')).strip().lower() in ('1', 'true', 'yes')
        rows = pg_service.get_size_matrices(segment_code=seg, include_inactive=inc)
        return jsonify({'success': True, 'data': rows, 'count': len(rows)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg, 'data': []}), code


@size_matrices_bp.route('/api/size-matrices', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_WORKSHOP_MANAGER)
def create_size_matrix():
    try:
        data = request.get_json(silent=True) or {}
        saved = pg_service.save_size_matrix(data)
        return jsonify({'success': True, 'data': saved, 'message': 'تم حفظ المقاس القياسي بنجاح'}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@size_matrices_bp.route('/api/size-matrices/<matrix_id>', methods=['PUT'])
@require_roles(ROLE_ADMIN, ROLE_WORKSHOP_MANAGER)
def update_size_matrix(matrix_id):
    try:
        data = request.get_json(silent=True) or {}
        saved = pg_service.save_size_matrix(data, matrix_id=matrix_id)
        return jsonify({'success': True, 'data': saved, 'message': 'تم تحديث المقاس القياسي بنجاح'}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@size_matrices_bp.route('/api/size-matrices/<matrix_id>', methods=['DELETE'])
@require_roles(ROLE_ADMIN, ROLE_WORKSHOP_MANAGER)
def remove_size_matrix(matrix_id):
    try:
        res = pg_service.delete_size_matrix(matrix_id)
        return jsonify({'success': True, 'data': res, 'message': 'تم تعطيل المقاس القياسي بنجاح'}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code
