# domains/accounting/routes_reports.py
# Financial Reports HTTP route handlers (PostgreSQL Single Source of Truth)
# Compliance: Architectural Standard (< 220 lines)

import json
import urllib.parse
from services.pg.pg_financial_reports import (
    get_balance_sheet_pg,
    get_trial_balance_pg
)
from services.pg.pg_general_ledger import get_general_ledger_pg


def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/reports/balance-sheet', '/api/reports/financial-statements'):
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        try:
            data = get_balance_sheet_pg(params)
        except Exception as e:
            data = {'error': str(e), 'isBalanced': True, 'diff': 0.0}

        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/reports/trial-balance':
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        try:
            data = get_trial_balance_pg(params)
        except Exception as e:
            data = {'error': str(e), 'rows': [], 'is_balanced': True}

        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False).encode('utf-8'))
        return True

    if path == '/api/reports/general-ledger':
        query_params = urllib.parse.parse_qs(parsed_url.query)
        params = {k: v[0] for k, v in query_params.items()}
        try:
            data = get_general_ledger_pg(params)
        except Exception as e:
            data = {'error': str(e), 'rows': [], 'total_rows': 0}

        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': data}, ensure_ascii=False).encode('utf-8'))
        return True

    return False

