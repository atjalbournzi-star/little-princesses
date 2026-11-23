# routes/accounting_reports_bp.py
# Financial Reports Blueprint (Balance Sheet, Trial Balance, Income Statement, GL)
# Compliance: Double-entry GAAP/IFRS, Single Source of Truth, < 220 lines

from flask import Blueprint, request, jsonify
from services.pg.pg_financial_reports import get_balance_sheet_pg, get_trial_balance_pg
from services.pg.pg_income_statement import get_income_statement_pg
from services.pg.pg_general_ledger import get_general_ledger_pg
from services.pg.pg_reconciliations import get_reconciliations_pg

accounting_reports_bp = Blueprint('accounting_reports_bp', __name__)


@accounting_reports_bp.route('/api/reports/balance-sheet', methods=['GET'])
@accounting_reports_bp.route('/api/reports/financial-statements', methods=['GET'])
def balance_sheet_report():
    try:
        return jsonify({'success': True, 'data': get_balance_sheet_pg(request.args.to_dict())}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': {'isBalanced': True, 'diff': 0.0}}), 500


@accounting_reports_bp.route('/api/reports/trial-balance', methods=['GET'])
def trial_balance_report():
    try:
        return jsonify({'success': True, 'data': get_trial_balance_pg(request.args.to_dict())}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': {'rows': [], 'is_balanced': True}}), 500


@accounting_reports_bp.route('/api/reports/income-statement', methods=['GET'])
def income_statement_report():
    try:
        return jsonify({'success': True, 'data': get_income_statement_pg(request.args.to_dict())}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': {}}), 500


@accounting_reports_bp.route('/api/reports/general-ledger', methods=['GET'])
def general_ledger_report():
    try:
        return jsonify({'success': True, 'data': get_general_ledger_pg(request.args.to_dict())}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': {'rows': [], 'total_rows': 0}}), 500


@accounting_reports_bp.route('/api/reports/reconciliations', methods=['GET'])
@accounting_reports_bp.route('/api/reports/reconciliation', methods=['GET'])
def reconciliations_report():
    try:
        data = get_reconciliations_pg(request.args.to_dict())
        return jsonify({'success': True, 'data': data, **data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'data': [], 'rows': []}), 500
