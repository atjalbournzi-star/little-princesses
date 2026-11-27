# routes/material_custody_bp.py
# Flask Blueprint for Customer Material Custody (CMT)

from flask import Blueprint, request, jsonify
import pg_service
from services.security import (
    require_roles, translate_shield_error,
    ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER, ROLE_DATA_ENTRY, ROLE_TAILOR,
)

material_custody_bp = Blueprint('material_custody_bp', __name__)


@material_custody_bp.route('/api/material-custody', methods=['GET'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER, ROLE_DATA_ENTRY, ROLE_TAILOR)
def list_material_custody():
    try:
        rows = pg_service.get_material_custody(dict(request.args))
        return jsonify({'success': True, 'data': rows, 'count': len(rows)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg, 'data': []}), code


@material_custody_bp.route('/api/material-custody', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_WORKSHOP_MANAGER, ROLE_DATA_ENTRY)
def create_material_custody():
    try:
        data = request.get_json(silent=True) or {}
        saved = pg_service.receive_material_custody(data)
        return jsonify({
            'success': True,
            'data': saved,
            'message': f"تم استلام عهدة القماش برقم {saved.get('custody_no')} بنجاح",
        }), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@material_custody_bp.route('/api/material-custody/<custody_id>', methods=['PUT'])
@require_roles(ROLE_ADMIN, ROLE_WORKSHOP_MANAGER, ROLE_DATA_ENTRY)
def update_material_custody_route(custody_id):
    try:
        data = request.get_json(silent=True) or {}
        updated = pg_service.update_material_custody(custody_id, data)
        return jsonify({
            'success': True,
            'data': updated,
            'message': f"تم تحديث عهدة القماش {updated.get('custody_no')} بنجاح",
        }), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code
