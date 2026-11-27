# services/security/rbac.py
# Server-Side Role-Based Access Control (RBAC) & Sovereign Operations Guard
# Architectural Standards: Strictly < 220 lines per file

from functools import wraps
from flask import request, g
from .error_translator import ForbiddenRoleError, UnauthorizedError
from .token_auth import verify_auth_token
from db_client import get_db_cursor

ROLE_MAP = {
    'admin': 'المدير العام',
    'accountant': 'محاسب',
    'workshop_manager': 'مدير ورشة',
    'data_entry': 'مدخل بيانات',
    'tailor': 'خياط / فني تفصيل',
    'المدير العام': 'admin',
    'محاسب': 'accountant',
    'مديرة الورشة': 'workshop_manager',
    'مدير ورشة': 'workshop_manager',
    'كاشير ومبيعات': 'data_entry',
    'مدخل بيانات': 'data_entry',
    'خياط': 'tailor'
}

def normalize_role(role_str):
    if not role_str:
        return 'data_entry'
    role_str = str(role_str).strip()
    if role_str in ('admin', 'accountant', 'workshop_manager', 'data_entry', 'tailor'):
        return role_str
    return ROLE_MAP.get(role_str, 'data_entry')

# Standard Sovereign Roles
ROLE_ADMIN = 'admin'
ROLE_ACCOUNTANT = 'accountant'
ROLE_WORKSHOP_MANAGER = 'workshop_manager'
ROLE_DATA_ENTRY = 'data_entry'
ROLE_TAILOR = 'tailor'


def resolve_request_user(req=None):
    """
    Extracts and cryptographically verifies the authenticated user from
    the signed Authorization Bearer token against PostgreSQL public.users.
    Returns None if token is missing, invalid, expired, or user is inactive.
    """
    if req is None:
        req = request

    cached = getattr(req, 'active_user', None)
    if isinstance(cached, dict) and cached.get('id') and cached.get('is_active'):
        return cached

    auth_header = (req.headers.get('Authorization') or '').strip()
    if not auth_header.startswith('Bearer '):
        return None

    token_str = auth_header.split(' ', 1)[1].strip()
    payload = verify_auth_token(token_str)
    if not payload:
        return None

    user_id = str(payload.get('uid') or '').strip()
    username = str(payload.get('u') or '').strip()
    if not user_id and not username:
        return None

    try:
        with get_db_cursor(commit=False) as cur:
            if user_id and username:
                cur.execute(
                    "SELECT id, username, role, full_name, is_active FROM public.users WHERE (id = %s OR username = %s) AND is_active = TRUE LIMIT 1;",
                    (user_id, username)
                )
            elif username:
                cur.execute(
                    "SELECT id, username, role, full_name, is_active FROM public.users WHERE username = %s AND is_active = TRUE LIMIT 1;",
                    (username,)
                )
            else:
                cur.execute(
                    "SELECT id, username, role, full_name, is_active FROM public.users WHERE id = %s AND is_active = TRUE LIMIT 1;",
                    (user_id,)
                )
            row = cur.fetchone()
            if not row:
                return None
            u = dict(row)
            if not u.get('is_active'):
                return None
            u['role'] = normalize_role(u.get('role'))
            u['role_label'] = ROLE_MAP.get(u['role'], u['role'])
            return u
    except Exception:
        return None


def require_roles(*allowed_roles):
    """
    Decorator enforcing server-side authentication & RBAC for sensitive operations.
    Admin / Owner role always retains full access to sovereign operations.
    """
    normalized_allowed = [normalize_role(r) for r in allowed_roles]

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = resolve_request_user(request)
            if not user:
                raise UnauthorizedError("يرجى تسجيل الدخول أولاً للوصول إلى هذه الخدمة")

            user_role = normalize_role(user.get('role'))
            request.active_user = user
            g.user = user
            g.user_id = user.get('id')

            if user_role == ROLE_ADMIN or user_role in normalized_allowed:
                return fn(*args, **kwargs)

            label = user.get('role_label') or user_role
            raise ForbiddenRoleError(f"عفواً، لا تملك صلاحية لتنفيذ هذه العملية السيادية (الدور الحالي: {label})")

        return wrapper
    return decorator
