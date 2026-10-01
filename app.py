# app.py
# Little Princesses ERP - Master Flask Application Bootstrapper
# Domain-Driven Micro-Modules & Flask Blueprints Architecture

import os
import sys
import io
import uuid
from decimal import Decimal
from datetime import date, datetime
import mimetypes
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask.json.provider import DefaultJSONProvider

# Configure MIME types for modern React JSX in browser
mimetypes.add_type('application/javascript', '.jsx')
mimetypes.add_type('application/javascript', '.js')

# Configure UTF-8 encoding for Arabic console output
if sys.stdout and hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 1. Custom JSON Provider for Decimal, Date, and UUID Serialization
class ERPJSONProvider(DefaultJSONProvider):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        if isinstance(o, (date, datetime)):
            return str(o)
        if isinstance(o, uuid.UUID):
            return str(o)
        return super().default(o)


# 2. Application Factory & Bootstrap
def create_app():
    root_dir = os.path.abspath(os.path.dirname(__file__))
    flask_app = Flask(__name__, static_folder=None)
    flask_app.json = ERPJSONProvider(flask_app)

    # Enable full Cross-Origin Resource Sharing (CORS)
    CORS(flask_app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Register Domain Blueprints
    from routes import register_blueprints
    register_blueprints(flask_app)

    # 3. HTTP Security & Cache-Control Headers
    @flask_app.after_request
    def set_custom_headers(response):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['X-Powered-By'] = 'Little Princesses ERP 2.0'
        return response

    # 4. SPA Client-Side Routing & Static Asset Serving
    @flask_app.route('/', defaults={'path': ''})
    @flask_app.route('/<path:path>')
    def serve_spa(path):
        if path and os.path.exists(os.path.join(root_dir, path)):
            return send_from_directory(root_dir, path)
        if path.startswith('api/'):
            return jsonify({'success': False, 'error': f'Endpoint not found: /{path}'}), 404
        ext = os.path.splitext(path)[1]
        if ext and ext.lower() not in ('.html', '.htm'):
            return f"Asset not found: /{path}", 404
        return send_from_directory(root_dir, 'index.html')

    # 5. Global Error Handlers
    @flask_app.errorhandler(404)
    def handle_not_found(e):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'error': f'API endpoint not found: {request.path}'}), 404
        ext = os.path.splitext(request.path)[1]
        if ext and ext.lower() not in ('.html', '.htm'):
            return f"Asset not found: {request.path}", 404
        return send_from_directory(root_dir, 'index.html')

    @flask_app.errorhandler(500)
    def handle_server_error(e):
        return jsonify({'success': False, 'error': 'Internal server error', 'detail': str(e)}), 500

    return flask_app


app = create_app()


def init_database_schemas():
    """Initializes local relational tables and caches if needed."""
    try:
        from domains.auth.db_init import init_users_db
        from domains.system.relational_db import init_enterprise_relational_db
        from domains.quality.db_init import init_quality_db
        from domains.accounting.db_schema import init_accounts_db
        from domains.marketing.db_init import init_marketing_db
        init_users_db()
        init_enterprise_relational_db()
        init_quality_db()
        init_accounts_db()
        init_marketing_db()
    except Exception as ex:
        print(f"Schema initialization notice: {ex}")


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    init_database_schemas()
    print(f"👑 Little Princesses ERP Flask Server running at http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
