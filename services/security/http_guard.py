# services/security/http_guard.py
# Central HTTP Static Allowlist, API Auth Guard & Strict /api/gas Action Whitelist
# Architectural Standards: Strictly < 220 lines per file

import os
from flask import request, jsonify, g
from .rbac import resolve_request_user, normalize_role, ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER, ROLE_DATA_ENTRY
from .error_translator import ForbiddenRoleError, UnauthorizedError

SAFE_ROOT_FILES = {
    'index.html', 'track.html', 'dress_card.html', 'logo.svg',
    'tailwindcss.js', 'react.production.min.js', 'react-dom.production.min.js', 'babel.min.js',
}
SAFE_STATIC_EXTS = {
    '.html', '.htm', '.js', '.jsx', '.css', '.svg',
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf',
}
FORBIDDEN_EXTS = {
    '.env', '.db', '.db-shm', '.db-wal', '.py', '.pyc', '.pyo',
    '.sql', '.md', '.log', '.json', '.sh', '.bat', '.ps1', '.key', '.pem', '.bak', '.zip',
}
PUBLIC_API_PATHS = {'/api/auth/login', '/api/login', '/api/health', '/health'}

_ALL_STAFF = (ROLE_ADMIN, ROLE_ACCOUNTANT, ROLE_WORKSHOP_MANAGER, ROLE_DATA_ENTRY)
_FINANCE = (ROLE_ADMIN, ROLE_ACCOUNTANT)
_WORKSHOP = (ROLE_ADMIN, ROLE_WORKSHOP_MANAGER)

# Strict whitelist of allowed /api/gas actions -> permitted roles.
# Sovereign/destructive actions (clearAllData, restoreBackup, saveUser, saveSettings,
# deleteAccount, deleteOrder, deletePurchase, postPayroll, etc.) are explicitly forbidden.
GAS_ALLOWED_ACTIONS = {
    'getDashboardStats': _ALL_STAFF,
    'getCurrencies': _ALL_STAFF,
    'getCustomers': _ALL_STAFF,
    'getProducts': _ALL_STAFF,
    'getProductById': _ALL_STAFF,
    'getBOM': _ALL_STAFF,
    'getBOMModels': _ALL_STAFF,
    'getInventory': _ALL_STAFF,
    'getWarehouses': _ALL_STAFF,
    'getItemStockByWarehouse': _ALL_STAFF,
    'getOrders': _ALL_STAFF,
    'getSuppliers': _FINANCE,
    'getPurchases': _FINANCE,
    'getVouchers': _FINANCE,
    'getPayments': _FINANCE,
    'getVoucherCardData': _FINANCE,
    'getExpenses': _FINANCE,
    'getCostCenters': _FINANCE,
    'getAccounts': _ALL_STAFF,
    'getChartOfAccounts': _ALL_STAFF,
    'getChartOfAccountsTree': _ALL_STAFF,
    'getJournalEntries': _FINANCE,
    'getFactory': _WORKSHOP,
    'getFactoryAnalytics': _WORKSHOP,
    'getAtelierWatchdog': _WORKSHOP,
    'getFittingAlterations': _WORKSHOP,
    'getTailorCommissions': _FINANCE,
    'getQualitySummary': _WORKSHOP,
    'getQualityDashboard': _WORKSHOP,
    'getQualityInspections': _WORKSHOP,
    'getQualityDefects': _WORKSHOP,
    'getQualityFeedback': _WORKSHOP,
    'getFeedback': _WORKSHOP,
    'getQualityComplaints': _WORKSHOP,
    'getQualityReturns': _WORKSHOP,
    'getQualityActions': _WORKSHOP,
    'getQualityCheckpoints': _WORKSHOP,
    'getQualitySettings': _WORKSHOP,
    'getQualityIntelligence': _WORKSHOP,
    'getNumberSequences': _ALL_STAFF,
    'getMeasurementStudio': _ALL_STAFF,
    'getRecentMeasurementStudios': _ALL_STAFF,
    'getAuditLogs': _FINANCE,
    'getSettings': _ALL_STAFF,
    'getSystemSettings': _ALL_STAFF,
}


def is_forbidden_path(rel_path: str) -> bool:
    norm = (rel_path or '').replace('\\', '/').lstrip('/')
    parts = [p for p in norm.split('/') if p]
    if any(p.startswith('.') or p == '..' for p in parts):
        return True
    return os.path.splitext(norm)[1].lower() in FORBIDDEN_EXTS


def is_safe_static_path(rel_path: str) -> bool:
    norm = (rel_path or '').replace('\\', '/').lstrip('/')
    if not norm or is_forbidden_path(norm):
        return False
    if norm in SAFE_ROOT_FILES:
        return True
    if norm.startswith(('src/', 'static/')):
        return os.path.splitext(norm)[1].lower() in SAFE_STATIC_EXTS
    return False


def enforce_api_authentication():
    """Flask before_request hook requiring a valid signed token on all /api/* and /save routes."""
    if request.method == 'OPTIONS':
        return None
    path = request.path or ''
    if not (path.startswith('/api/') or path == '/save'):
        return None
    if path in PUBLIC_API_PATHS:
        return None
    user = resolve_request_user(request)
    if not user:
        return jsonify({
            'success': False,
            'error': 'يرجى تسجيل الدخول للوصول إلى هذا المورد',
            'message': 'يرجى تسجيل الدخول للوصول إلى هذا المورد'
        }), 401
    request.active_user = user
    g.user = user
    g.user_id = user.get('id')
    return None


def authorize_gas_action(action: str, req=None):
    """Enforces strict action whitelist and RBAC check for /api/gas and /save."""
    user = resolve_request_user(req or request)
    if not user:
        raise UnauthorizedError("يرجى تسجيل الدخول لتنفيذ هذا الإجراء")
    allowed_roles = GAS_ALLOWED_ACTIONS.get(str(action or '').strip())
    if not allowed_roles:
        raise ForbiddenRoleError("هذا الإجراء غير مسموح عبر البوابة التوافقية (/api/gas) لأسباب أمنية")
    role = normalize_role(user.get('role'))
    if role == ROLE_ADMIN or role in allowed_roles:
        return user
    raise ForbiddenRoleError("عفواً، لا تملك صلاحية تنفيذ هذا الإجراء")
