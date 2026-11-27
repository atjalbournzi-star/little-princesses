# domains/accounting/routes_reports.py
# Financial Reports HTTP route handlers (PostgreSQL Single Source of Truth)
# Compliance: Architectural Standard (< 220 lines)

import json
import urllib.parse
from services.pg.pg_financial_reports import (
    get_balance_sheet_pg,
    get_trial_balance_pg
)
from services.pg.pg_income_statement import get_income_statement_pg
from services.pg.pg_general_ledger import get_general_ledger_pg
from services.pg.pg_integrity_radar import check_accounting_integrity
from services.pg.pg_audit import resolve_active_user_id
from services.security.period_lock import get_fiscal_periods, toggle_fiscal_period


def _send_json_ok(handler, data, status=200):
    handler.send_response(status)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))


def handle_get(handler, path, parsed_url) -> bool:
    if path == '/api/audit/integrity':
        try:
            res = check_accounting_integrity()
            _send_json_ok(handler, res)
        except Exception as e:
            _send_json_ok(handler, {'success': False, 'error': str(e)}, status=500)
        return True

    if path == '/api/accounting/periods':
        try:
            periods = get_fiscal_periods()
            _send_json_ok(handler, {'success': True, 'data': periods})
        except Exception as e:
            _send_json_ok(handler, {'success': False, 'error': str(e), 'data': []}, status=500)
        return True

    if path == '/api/reports/income-statement':
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        try:
            data = get_income_statement_pg(params)
        except Exception as e:
            data = {'error': str(e), 'revAccounts': [], 'cogsAccounts': [], 'opexAccounts': [], 'totalRevenue': 0.0, 'totalCOGS': 0.0, 'grossProfit': 0.0, 'totalOPEX': 0.0, 'totalExpenses': 0.0, 'netProfit': 0.0}
        _send_json_ok(handler, {'success': True, 'data': data})
        return True

    if path in ('/api/reports/balance-sheet', '/api/reports/financial-statements'):
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        try:
            data = get_balance_sheet_pg(params)
        except Exception as e:
            data = {'error': str(e), 'isBalanced': True, 'diff': 0.0}

        _send_json_ok(handler, {'success': True, 'data': data})
        return True

    if path == '/api/reports/trial-balance':
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        try:
            data = get_trial_balance_pg(params)
        except Exception as e:
            data = {'error': str(e), 'rows': [], 'is_balanced': True}

        _send_json_ok(handler, {'success': True, 'data': data})
        return True

    if path == '/api/reports/general-ledger':
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        try:
            data = get_general_ledger_pg(params)
        except Exception as e:
            data = {'error': str(e), 'rows': [], 'total_rows': 0}

        _send_json_ok(handler, {'success': True, 'data': data})
        return True

    return False


def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/accounting/periods':
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            raw = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            payload = json.loads(raw.decode('utf-8'))
            user_id = resolve_active_user_id() or 'admin'
            row = toggle_fiscal_period(
                payload.get('period_key'),
                bool(payload.get('is_locked')),
                user_id=user_id,
                notes=payload.get('notes')
            )
            msg = 'تم إقفال الفترة المحاسبية بنجاح 🔒' if row.get('is_locked') else 'تم فتح الفترة المحاسبية للترحيل 🔓'
            _send_json_ok(handler, {'success': True, 'data': row, 'message': msg})
        except Exception as e:
            _send_json_ok(handler, {'success': False, 'error': str(e)}, status=400)
        return True

    return False

