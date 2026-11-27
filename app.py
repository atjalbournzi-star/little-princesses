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
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask.json.provider import DefaultJSONProvider
from werkzeug.exceptions import HTTPException
from services.security.http_guard import (
    is_forbidden_path,
    is_safe_static_path,
    enforce_api_authentication,
)

load_dotenv()

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
    flask_app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5 MB

    raw_origins = os.environ.get('ALLOWED_ORIGINS', 'http://127.0.0.1:5000,http://localhost:5000')
    allowed_origins = [o.strip() for o in raw_origins.split(',') if o.strip()]
    CORS(flask_app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)

    # Register Domain Blueprints
    from routes import register_blueprints
    register_blueprints(flask_app)

    # 2b. Central Zero-Trust Authentication Guard for /api/* and /save
    flask_app.before_request(enforce_api_authentication)

    # 3. HTTP Compression (Gzip), Security & Cache-Control Headers
    from services.security.http_compression import init_http_compression
    init_http_compression(flask_app)

    _STATIC_EXTS = ('.js', '.jsx', '.css', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot')

    @flask_app.after_request
    def set_custom_headers(response):
        path_lower = (request.path or '').lower()
        is_api_or_html = (
            path_lower.startswith('/api/')
            or path_lower in ('', '/', '/index.html')
            or (response.mimetype or '').startswith('text/html')
        )
        if not is_api_or_html and path_lower.startswith('/static/vendor/'):
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
        elif not is_api_or_html and (request.args.get('v') or path_lower.endswith(_STATIC_EXTS)):
            response.headers['Cache-Control'] = 'public, max-age=86400'
        else:
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers.pop('X-Powered-By', None)
        return response

    # 4. Favicon & SPA Client-Side Routing (Strict Static Allowlist)
    @flask_app.route('/favicon.ico')
    def favicon():
        return '', 204

    @flask_app.route('/', defaults={'path': ''}, methods=['GET'])
    @flask_app.route('/<path:path>', methods=['GET'])
    def serve_spa(path):
        norm = (path or '').replace('\\', '/').lstrip('/')
        if norm.startswith('api/'):
            return jsonify({'success': False, 'error': f'Endpoint not found: /{norm}', 'message': f'المسار غير موجود: /{norm}'}), 404
        if is_forbidden_path(norm):
            return 'Not found', 404
        if norm and is_safe_static_path(norm):
            full_target = os.path.abspath(os.path.join(root_dir, norm))
            if full_target.startswith(root_dir + os.sep) and os.path.isfile(full_target):
                return send_from_directory(root_dir, norm)
            return 'Asset not found', 404
        ext = os.path.splitext(norm)[1]
        if ext and ext.lower() not in ('.html', '.htm'):
            return 'Asset not found', 404
        return send_from_directory(root_dir, 'index.html')

    @flask_app.route('/api/<path:path>', methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
    def api_fallback(path):
        return jsonify({'success': False, 'error': f'API endpoint not found: /api/{path}', 'message': f'نقطة النهاية غير موجودة: /api/{path}'}), 404

    # 5. Global Error Handlers & Shield Translator
    from services.security import register_shield_error_handlers, translate_shield_error
    register_shield_error_handlers(flask_app)

    @flask_app.errorhandler(HTTPException)
    def handle_http_exception(e):
        if request.path.startswith('/api/'):
            code = getattr(e, 'code', 500) or 500
            desc = getattr(e, 'description', str(e))
            return jsonify({'success': False, 'error': desc, 'message': desc, 'status': code}), code
        if getattr(e, 'code', None) == 404:
            ext = os.path.splitext(request.path)[1]
            if ext and ext.lower() not in ('.html', '.htm'):
                return f"Asset not found: {request.path}", 404
            return send_from_directory(root_dir, 'index.html')
        return e

    @flask_app.errorhandler(404)
    def handle_not_found(e):
        if request.path.startswith('/api/'):
            return jsonify({'success': False, 'error': f'API endpoint not found: {request.path}', 'message': f'نقطة النهاية غير موجودة: {request.path}'}), 404
        ext = os.path.splitext(request.path)[1]
        if ext and ext.lower() not in ('.html', '.htm'):
            return f"Asset not found: {request.path}", 404
        return send_from_directory(root_dir, 'index.html')

    @flask_app.errorhandler(500)
    def handle_server_error(e):
        orig_err = getattr(e, 'original_exception', e)
        flask_app.logger.exception("Internal server error: %s", orig_err)
        code, ar_msg = translate_shield_error(orig_err)
        if code != 500:
            return jsonify({'success': False, 'error': ar_msg, 'message': ar_msg}), code
        return jsonify({'success': False, 'error': 'حدث خطأ داخلي في الخادم', 'message': 'حدث خطأ داخلي في الخادم'}), 500

    @flask_app.errorhandler(Exception)
    def handle_unhandled_exception(e):
        flask_app.logger.exception("Unhandled exception: %s", e)
        if request.path.startswith('/api/'):
            code, ar_msg = translate_shield_error(e)
            return jsonify({'success': False, 'error': ar_msg, 'message': ar_msg}), code
        raise e

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
        from services.pg.pg_ready_schema import ensure_ready_products_schema
        init_users_db()
        init_enterprise_relational_db()
        init_quality_db()
        init_accounts_db()
        init_marketing_db()
        ensure_ready_products_schema()
    except Exception as ex:
        print(f"Schema initialization notice: {ex}")


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    init_database_schemas()
    print(f"👑 Little Princesses ERP Flask Server running at http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
