# services/security/http_compression.py
# Lightweight Gzip compression middleware for JSON APIs and text/JS/CSS assets

import gzip
from flask import request

_COMPRESSIBLE_PREFIXES = (
    'application/json',
    'application/javascript',
    'application/x-javascript',
    'text/',
    'image/svg+xml',
)
_MIN_GZIP_BYTES = 512


def init_http_compression(flask_app):
    """Register lightweight Gzip compression on Flask responses."""

    @flask_app.after_request
    def compress_response(response):
        try:
            if (
                response.status_code < 200
                or response.status_code >= 300
                or response.status_code == 204
                or 'Content-Encoding' in response.headers
            ):
                return response

            accept_enc = (request.headers.get('Accept-Encoding') or '').lower()
            if 'gzip' not in accept_enc:
                return response

            ctype = (response.mimetype or response.headers.get('Content-Type') or '').split(';')[0].strip().lower()
            if not (ctype.startswith(_COMPRESSIBLE_PREFIXES) or ctype.endswith('+json')):
                return response

            if response.direct_passthrough:
                response.direct_passthrough = False

            raw = response.get_data()
            if not raw or len(raw) < _MIN_GZIP_BYTES:
                return response

            compressed = gzip.compress(raw, compresslevel=5)
            if len(compressed) >= len(raw):
                return response

            response.set_data(compressed)
            response.headers['Content-Encoding'] = 'gzip'
            response.headers['Content-Length'] = str(len(compressed))
            vary_vals = [v.strip() for v in (response.headers.get('Vary') or '').split(',') if v.strip()]
            if not any(v.lower() == 'accept-encoding' for v in vary_vals):
                vary_vals.append('Accept-Encoding')
                response.headers['Vary'] = ', '.join(vary_vals)
        except Exception:
            pass
        return response
