# routes/tailoring_bp.py
# Tailoring Confirm-Sizing, Order Profitability Report & Promote-to-Catalog
# Architectural Standards: Strictly <= 220 lines

from flask import Blueprint, request, jsonify
import pg_service
from services.security import (
    idempotent_op,
    require_roles,
    ROLE_ADMIN,
    ROLE_ACCOUNTANT,
    ROLE_WORKSHOP_MANAGER,
    ROLE_DATA_ENTRY,
    translate_shield_error,
)

tailoring_bp = Blueprint('tailoring_bp', __name__)


def _err(exc):
    code, msg = translate_shield_error(exc)
    return jsonify({'success': False, 'error': msg, 'message': msg}), code


@tailoring_bp.route('/api/production-orders/<po_id>/confirm-sizing', methods=['PUT'])
@require_roles(ROLE_ADMIN, ROLE_WORKSHOP_MANAGER, ROLE_DATA_ENTRY)
@idempotent_op('confirm_sizing')
def confirm_sizing_route(po_id):
    try:
        res = pg_service.confirm_production_sizing(po_id, request.get_json(silent=True) or {})
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return _err(e)


@tailoring_bp.route('/api/reports/order-profitability', methods=['GET'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
def order_profitability_route():
    try:
        res = pg_service.get_order_profitability_report(dict(request.args))
        return jsonify({'success': True, 'data': res, **res}), 200
    except Exception as e:
        return _err(e)


@tailoring_bp.route('/api/production-orders/<po_id>/promote-to-catalog', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_WORKSHOP_MANAGER)
@idempotent_op('promote_catalog')
def promote_to_catalog_route(po_id):
    try:
        res = pg_service.promote_bespoke_to_catalog(po_id, request.get_json(silent=True) or {})
        return jsonify({'success': True, 'data': res, **res}), 201
    except Exception as e:
        return _err(e)
