# routes/periods_bp.py
# Dynamic Fiscal Periods Management & Locking Blueprint
# Architectural Standards: Strictly < 220 lines per file

from flask import Blueprint, request, jsonify
from services.security import (
    get_fiscal_periods,
    toggle_fiscal_period,
    require_roles,
    ROLE_ADMIN,
    ROLE_ACCOUNTANT,
    translate_shield_error
)

periods_bp = Blueprint('periods_bp', __name__)


@periods_bp.route('/api/audit/integrity', methods=['GET'])
def audit_integrity():
    """Live read-only audit of the 4 Golden Equations in PostgreSQL."""
    try:
        from services.pg.pg_integrity_radar import check_accounting_integrity
        report = check_accounting_integrity()
        return jsonify(report), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@periods_bp.route('/api/accounting/periods', methods=['GET'])
def list_periods():
    """Returns list of fiscal periods with dynamic lock statuses."""
    try:
        data = get_fiscal_periods()
        return jsonify({
            'success': True,
            'data': data,
            'periods': data,
            'count': len(data)
        }), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@periods_bp.route('/api/accounting/periods', methods=['POST'])
@periods_bp.route('/api/accounting/periods/lock', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
def lock_period():
    """Toggles or sets fiscal period lock with sovereign audit."""
    try:
        body = request.get_json(silent=True) or {}
        data = body.get('data') or body
        period_key = str(data.get('period_key') or data.get('month') or data.get('period') or '').strip()
        is_locked = bool(data.get('is_locked', True))
        notes = str(data.get('notes') or '').strip()
        user_id = getattr(request, 'active_user', {}).get('id') or 'USR-ADMIN'

        res = toggle_fiscal_period(period_key, is_locked, user_id=user_id, notes=notes)
        action_name = "إقفال" if is_locked else "فتح"
        return jsonify({
            'success': True,
            'data': res,
            'message': f"تم {action_name} الفترة المحاسبية {period_key} بنجاح 🔒"
        }), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@periods_bp.route('/api/accounting/periods/unlock', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
def unlock_period():
    """Explicitly unlocks a fiscal period."""
    try:
        body = request.get_json(silent=True) or {}
        data = body.get('data') or body
        period_key = str(data.get('period_key') or data.get('month') or data.get('period') or '').strip()
        notes = str(data.get('notes') or '').strip()
        user_id = getattr(request, 'active_user', {}).get('id') or 'USR-ADMIN'

        res = toggle_fiscal_period(period_key, is_locked=False, user_id=user_id, notes=notes)
        return jsonify({
            'success': True,
            'data': res,
            'message': f"تم فتح الفترة المحاسبية {period_key} بنجاح 🔓"
        }), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code
