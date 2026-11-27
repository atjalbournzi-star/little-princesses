# services/security/token_auth.py
# Signed HMAC-SHA256 Authentication Tokens (itsdangerous URLSafeTimedSerializer)
# Architectural Standards: Strictly < 220 lines per file

import os
import secrets
from dotenv import load_dotenv
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

load_dotenv()

_FALLBACK_RUNTIME_SECRET = secrets.token_hex(32)
TOKEN_SALT = 'lp-erp-auth-v1'
DEFAULT_MAX_AGE_SECONDS = 7 * 24 * 3600  # 7 days


def _get_secret_key() -> str:
    key = (os.environ.get('SECRET_KEY') or '').strip()
    if key and len(key) >= 16:
        return key
    return _FALLBACK_RUNTIME_SECRET


def _get_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(_get_secret_key(), salt=TOKEN_SALT)


def generate_auth_token(user_dict: dict) -> str:
    """Generates a cryptographically signed timed token for an authenticated user."""
    payload = {
        'uid': str(user_dict.get('id') or ''),
        'u': str(user_dict.get('username') or ''),
        'r': str(user_dict.get('role') or 'data_entry'),
    }
    return _get_serializer().dumps(payload)


def verify_auth_token(token: str, max_age: int = DEFAULT_MAX_AGE_SECONDS):
    """
    Verifies HMAC signature and expiration of a bearer token.
    Returns payload dict {'uid', 'u', 'r'} or None if invalid/expired.
    """
    if not token or not isinstance(token, str):
        return None
    token = token.strip()
    if not token:
        return None
    try:
        data = _get_serializer().loads(token, max_age=max_age)
        if isinstance(data, dict) and (data.get('uid') or data.get('u')):
            return data
        return None
    except (SignatureExpired, BadSignature, Exception):
        return None
