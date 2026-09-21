# unified_server.py
# Little Princesses ERP - Master Unified Server Facade & Router
# Architectural refactoring: Modular routing & clean surgical extraction

import http.server
import socketserver
import json
import urllib.parse
import os
import sys
import io
import time
from datetime import datetime, date
import uuid
from decimal import Decimal

# Custom JSON encoder for Decimal, UUID, and date objects across all endpoints
_orig_json_default = json.JSONEncoder.default


def _custom_json_default(self, o):
    if isinstance(o, Decimal):
        return float(o)
    if isinstance(o, (date, datetime)):
        return str(o)
    if isinstance(o, uuid.UUID):
        return str(o)
    return _orig_json_default(self, o)


json.JSONEncoder.default = _custom_json_default

import pg_service
import db_client

# UTF-8 stdout configuration for Arabic logging
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PORT = 5000
DB_FILE = 'little_princesses.db'
GAS_URL = None

# Re-exports for 100% backward compatibility
from domains.system.db_connection import get_db
from domains.auth.db_init import (
    hash_password,
    verify_password,
    ROLE_MAP,
    normalize_role,
    init_users_db,
    sync_users_to_gas_async,
)
from domains.system.relational_db import (
    init_enterprise_relational_db,
    get_next_sequence_id,
    log_audit,
    record_inventory_movement,
)
from domains.quality.db_init import (
    init_quality_db,
    sync_quality_to_gas_async,
)
from domains.accounting.db_schema import init_accounts_db
from domains.accounting.code_generator import suggest_next_account_code
from domains.marketing.db_init import init_marketing_db
from domains.marketing.db_ai_init import init_marketing_ai_db

# Route Handlers
from domains.auth import routes as auth_routes, routes_users
from domains.customers import routes as customer_routes
from domains.tailoring import (
    routes_orders,
    routes_delivery,
    routes_factory,
    routes_factory_actions,
)
from domains.inventory import (
    routes_inventory,
    routes_purchases,
    routes_purchases_manage,
)
from domains.accounting import (
    routes_vouchers,
    routes_expenses,
    routes_journal,
    routes_accounts,
)
from domains.quality import (
    routes_dashboard,
    routes_actions as quality_actions,
    routes_feedback,
)
from domains.marketing import (
    routes_core,
    routes_webhooks,
    routes_ai_analysis,
    routes_ai_insights,
    routes_ai_actions,
)
from domains.hr import routes as hr_routes
from domains.system import (
    routes as system_routes,
    routes_backup,
    routes_sync,
)

GET_ROUTERS = [
    auth_routes.handle_get,
    customer_routes.handle_get,
    routes_orders.handle_get,
    routes_factory.handle_get,
    routes_inventory.handle_get,
    routes_purchases_manage.handle_get,
    routes_vouchers.handle_get,
    routes_expenses.handle_get,
    routes_journal.handle_get,
    routes_accounts.handle_get,
    routes_dashboard.handle_get,
    routes_feedback.handle_get,
    routes_core.handle_get,
    routes_webhooks.handle_get,
    routes_ai_analysis.handle_get,
    routes_ai_insights.handle_get,
    hr_routes.handle_get,
    routes_backup.handle_get,
    system_routes.handle_get,
    routes_sync.handle_get,
]

POST_ROUTERS = [
    auth_routes.handle_post,
    routes_users.handle_post,
    customer_routes.handle_post,
    routes_orders.handle_post,
    routes_delivery.handle_post,
    routes_factory_actions.handle_post,
    routes_inventory.handle_post,
    routes_purchases.handle_post,
    routes_purchases_manage.handle_post,
    routes_vouchers.handle_post,
    routes_expenses.handle_post,
    routes_journal.handle_post,
    routes_accounts.handle_post,
    quality_actions.handle_post,
    routes_feedback.handle_post,
    routes_core.handle_post,
    routes_webhooks.handle_post,
    routes_ai_actions.handle_post,
    hr_routes.handle_post,
    routes_backup.handle_post,
    system_routes.handle_post,
    routes_sync.handle_post,
]


class UnifiedERPHandler(http.server.SimpleHTTPRequestHandler):
    def handle(self):
        try:
            super().handle()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, TimeoutError):
            pass

    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def guess_type(self, path):
        if str(path).endswith('.jsx') or str(path).endswith('.js'):
            return 'application/javascript; charset=utf-8'
        return super().guess_type(path)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        for router in GET_ROUTERS:
            if router(self, path, parsed_url):
                return
        super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        for router in POST_ROUTERS:
            if router(self, path, parsed_url):
                return

        self.send_response(404)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps({'success': False, 'error': f'Endpoint not found: {self.path}'}).encode('utf-8'))


if __name__ == '__main__':
    init_users_db()
    init_enterprise_relational_db()
    init_quality_db()
    init_accounts_db()
    init_marketing_db()
    init_marketing_ai_db()
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), UnifiedERPHandler) as httpd:
        print(f"🏢 ERP Master Server running at http://127.0.0.1:{PORT}")
        while True:
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("🛑 Server stopped.")
                break
            except Exception as e:
                print(f"⚠️ Server loop exception (recovering): {e}")
                time.sleep(0.5)
