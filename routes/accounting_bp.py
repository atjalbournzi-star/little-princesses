# routes/accounting_bp.py
# Accounts, Journal Entries, Vouchers, and Expenses Flask Blueprint

from flask import Blueprint, request, jsonify
import pg_service
from domains.accounting.code_generator import suggest_next_account_code
from domains.system.db_connection import get_db

accounting_bp = Blueprint('accounting_bp', __name__)


@accounting_bp.route('/api/accounts', methods=['GET'])
@accounting_bp.route('/api/accounts/list', methods=['GET'])
@accounting_bp.route('/api/accounts/tree', methods=['GET'])
def list_accounts():
    try:
        rows = pg_service.get_accounts()
        return jsonify({'success': True, 'data': rows}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


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
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@accounting_bp.route('/api/accounts/suggest-code', methods=['GET'])
def suggest_code():
    parent_id = request.args.get('parent_id', '')
    suggested = suggest_next_account_code(parent_id)
    return jsonify({'success': True, 'code': suggested}), 200


@accounting_bp.route('/api/accounts/save', methods=['POST'])
@accounting_bp.route('/api/accounts', methods=['POST'])
def save_account():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_account(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@accounting_bp.route('/api/accounts/delete', methods=['POST'])
def delete_account():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_account(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@accounting_bp.route('/api/accounts/clean-reset', methods=['POST'])
def clean_reset_accounts():
    try:
        res = pg_service.reset_clean_chart_of_accounts()
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@accounting_bp.route('/api/journal', methods=['GET'])
def list_journal():
    try:
        entries = pg_service.get_journal_entries()
        return jsonify({'success': True, 'data': entries, 'count': len(entries)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@accounting_bp.route('/api/journal', methods=['POST'])
def add_journal():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.add_journal_entry(data)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@accounting_bp.route('/api/journal/delete', methods=['POST'])
def delete_journal():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_journal_entry(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@accounting_bp.route('/api/finance/vouchers', methods=['GET'])
@accounting_bp.route('/api/vouchers', methods=['GET'])
@accounting_bp.route('/api/vouchers/list', methods=['GET'])
def list_vouchers():
    try:
        vouchers = pg_service.get_vouchers()
        return jsonify({'success': True, 'data': vouchers, 'count': len(vouchers)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@accounting_bp.route('/api/finance/vouchers', methods=['POST'])
@accounting_bp.route('/api/vouchers', methods=['POST'])
@accounting_bp.route('/api/vouchers/create', methods=['POST'])
@accounting_bp.route('/api/vouchers/save', methods=['POST'])
def save_voucher():
    try:
        data = request.get_json(silent=True) or {}
        payload = data.get('data') or data
        res = pg_service.add_voucher(payload)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@accounting_bp.route('/api/finance/vouchers/delete', methods=['POST'])
@accounting_bp.route('/api/vouchers/delete', methods=['POST'])
def delete_voucher():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_voucher(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@accounting_bp.route('/api/finance/expenses', methods=['GET'])
@accounting_bp.route('/api/expenses', methods=['GET'])
@accounting_bp.route('/api/expenses/list', methods=['GET'])
def list_expenses():
    try:
        expenses = pg_service.get_expenses()
        return jsonify({'success': True, 'data': expenses, 'count': len(expenses)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500


@accounting_bp.route('/api/finance/expenses', methods=['POST'])
@accounting_bp.route('/api/expenses', methods=['POST'])
@accounting_bp.route('/api/expenses/create', methods=['POST'])
@accounting_bp.route('/api/expenses/save', methods=['POST'])
def save_expense():
    try:
        data = request.get_json(silent=True) or {}
        payload = data.get('data') or data
        res = pg_service.add_expense(payload)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@accounting_bp.route('/api/finance/expenses/delete', methods=['POST'])
@accounting_bp.route('/api/expenses/delete', methods=['POST'])
def delete_expense():
    try:
        data = request.get_json(silent=True) or {}
        res = pg_service.delete_expense(data)
        return jsonify(res), (200 if res.get('success') else 400)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400
