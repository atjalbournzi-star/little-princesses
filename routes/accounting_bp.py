# routes/accounting_bp.py
# Accounts, Journal Entries, Vouchers, and Expenses Flask Blueprint
# Architectural Standards: Strictly < 220 lines per file

from flask import Blueprint, request, jsonify
import pg_service
from domains.accounting.code_generator import suggest_next_account_code
from domains.accounting.routes_accounts import fetch_accounts_audit_logs
from domains.system.db_connection import get_db
from services.security import idempotent_op, require_roles, ROLE_ADMIN, ROLE_ACCOUNTANT, translate_shield_error

accounting_bp = Blueprint('accounting_bp', __name__)

@accounting_bp.route('/api/accounts', methods=['GET'])
@accounting_bp.route('/api/accounts/list', methods=['GET'])
@accounting_bp.route('/api/accounts/tree', methods=['GET'])
def list_accounts():
    try: rows = pg_service.get_accounts(request.args.to_dict())
    except Exception: rows = []
    return jsonify({'success': True, 'data': rows, 'count': len(rows)}), 200

@accounting_bp.route('/api/accounts/summary', methods=['GET'])
def accounts_summary():
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT account_type, COUNT(*) as count, SUM(current_balance) as total_balance FROM accounts WHERE is_group=1 GROUP BY account_type")
        rows = [dict(r) for r in c.fetchall()]
        conn.close()
        return jsonify({'success': True, 'data': rows}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg, 'data': []}), code

@accounting_bp.route('/api/accounts/suggest-code', methods=['GET'])
def suggest_code():
    return jsonify({'success': True, 'code': suggest_next_account_code(request.args.get('parent_id', ''))}), 200

@accounting_bp.route('/api/accounts/audit-log', methods=['GET'])
def accounts_audit_log():
    try:
        rows = fetch_accounts_audit_logs()
        return jsonify({'success': True, 'data': rows, 'count': len(rows)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg, 'data': []}), code

@accounting_bp.route('/api/accounts/save', methods=['POST'])
@accounting_bp.route('/api/accounts', methods=['POST'])
@idempotent_op('account_save')
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
def save_account():
    try:
        return jsonify({'success': True, 'data': pg_service.add_account(request.get_json(silent=True) or {})}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/accounts/delete', methods=['POST'])
@idempotent_op('account_delete')
@require_roles(ROLE_ADMIN)
def delete_account():
    try:
        res = pg_service.delete_account(request.get_json(silent=True) or {})
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/accounts/clean-reset', methods=['POST'])
@require_roles(ROLE_ADMIN)
def clean_reset_accounts():
    try:
        return jsonify({'success': True, 'data': pg_service.reset_clean_chart_of_accounts()}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/journal', methods=['GET'])
@accounting_bp.route('/api/accounting/journal', methods=['GET'])
def list_journal():
    try: entries = pg_service.get_journal_entries(request.args.to_dict())
    except Exception: entries = []
    return jsonify({'success': True, 'data': entries, 'count': len(entries)}), 200

@accounting_bp.route('/api/journal', methods=['POST'])
@accounting_bp.route('/api/journal/create', methods=['POST'])
@accounting_bp.route('/api/journal/save', methods=['POST'])
@idempotent_op('journal_write')
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
def add_journal():
    try:
        data = request.get_json(silent=True) or {}
        return jsonify({'success': True, 'data': pg_service.add_journal_entry(data)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/journal/delete', methods=['POST'])
@idempotent_op('journal_delete')
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
def delete_journal():
    try:
        res = pg_service.delete_journal_entry(request.get_json(silent=True) or {})
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/finance/vouchers', methods=['GET'])
@accounting_bp.route('/api/vouchers', methods=['GET'])
@accounting_bp.route('/api/vouchers/list', methods=['GET'])
def list_vouchers():
    try: vouchers = pg_service.get_vouchers()
    except Exception: vouchers = []
    return jsonify({'success': True, 'data': vouchers, 'count': len(vouchers)}), 200

@accounting_bp.route('/api/finance/vouchers', methods=['POST'])
@accounting_bp.route('/api/vouchers', methods=['POST'])
@accounting_bp.route('/api/vouchers/create', methods=['POST'])
@accounting_bp.route('/api/vouchers/save', methods=['POST'])
@idempotent_op('voucher_write')
def save_voucher():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_voucher(data.get('data') or data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/finance/vouchers/delete', methods=['POST'])
@accounting_bp.route('/api/vouchers/delete', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
@idempotent_op('voucher_delete')
def delete_voucher():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_voucher(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/vouchers/reverse', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
@idempotent_op('voucher_reverse')
def reverse_voucher():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.reverse_voucher(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/vouchers/card-data', methods=['GET'])
def voucher_card_data():
    try: return jsonify(pg_service.get_voucher_card_data(request.args.get('id', ''))), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/finance/expenses', methods=['GET'])
@accounting_bp.route('/api/expenses', methods=['GET'])
@accounting_bp.route('/api/expenses/list', methods=['GET'])
def list_expenses():
    try: expenses = pg_service.get_expenses()
    except Exception: expenses = []
    return jsonify({'success': True, 'data': expenses, 'count': len(expenses)}), 200

@accounting_bp.route('/api/finance/expenses', methods=['POST'])
@accounting_bp.route('/api/expenses', methods=['POST'])
@accounting_bp.route('/api/expenses/create', methods=['POST'])
@accounting_bp.route('/api/expenses/save', methods=['POST'])
@idempotent_op('expense_write')
def save_expense():
    try:
        data = request.get_json(silent=True) or {}
        return jsonify({'success': True, 'data': pg_service.add_expense(data.get('data') or data)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/finance/expenses/delete', methods=['POST'])
@accounting_bp.route('/api/expenses/delete', methods=['POST'])
@idempotent_op('expense_delete')
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
def delete_expense():
    try:
        res = pg_service.delete_expense(request.get_json(silent=True) or {})
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/finance/expenses/approve', methods=['POST'])
@accounting_bp.route('/api/expenses/approve', methods=['POST'])
@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)
@idempotent_op('expense_approve')
def approve_expense():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.approve_expense_atomic(data.get('data') or data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code

@accounting_bp.route('/api/cost-centers', methods=['GET'])
@accounting_bp.route('/api/accounting/cost-centers', methods=['GET'])
def list_cost_centers():
    try:
        data = pg_service.get_cost_centers()
        return jsonify({'success': True, 'data': data, 'count': len(data)}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg, 'data': []}), code
