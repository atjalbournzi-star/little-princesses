# routes/bto_bp.py
# Buy-To-Order (BTO) Direct-to-WIP Purchases, Leftover Returns & Late BOM Material Issue
# Architectural Standards: Strictly <= 220 lines

from flask import Blueprint, request, jsonify
import pg_service
from services.security import (
    idempotent_op,
    require_roles,
    ROLE_ADMIN,
    ROLE_ACCOUNTANT,
    ROLE_WORKSHOP_MANAGER,
    translate_shield_error,
)

bto_bp = Blueprint('bto_bp', __name__)


def _err(exc):
    code, msg = translate_shield_error(exc)
    return jsonify({'success': False, 'error': msg, 'message': msg}), code


@bto_bp.route('/api/production-orders/<po_id>/bto-purchase', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER)
@idempotent_op('bto_purchase')
def bto_purchase_route(po_id):
    try:
        res = pg_service.record_bto_purchase(po_id, request.get_json(silent=True) or {})
        return jsonify({'success': True, 'data': res, **res}), 200
    except Exception as e:
        return _err(e)


@bto_bp.route('/api/production-orders/<po_id>/bto-return-leftover', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER)
@idempotent_op('bto_leftover')
def bto_return_leftover_route(po_id):
    try:
        res = pg_service.return_bto_leftover(po_id, request.get_json(silent=True) or {})
        return jsonify({'success': True, 'data': res, **res}), 200
    except Exception as e:
        return _err(e)


@bto_bp.route('/api/production-orders/<po_id>/issue-materials', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_WORKSHOP_MANAGER)
@idempotent_op('issue_materials')
def issue_materials_route(po_id):
    try:
        res = pg_service.issue_production_materials(po_id, request.get_json(silent=True) or {})
        return jsonify({'success': True, 'data': res, **res}), 200
    except Exception as e:
        return _err(e)
