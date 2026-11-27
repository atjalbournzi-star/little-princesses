# services/security/__init__.py
# Master Security & Protection Layer 2 Facade
# Architectural Standards: Strictly < 220 lines per file

from .error_translator import (
    FiscalPeriodLockedError,
    IdempotencyConflictError,
    ForbiddenRoleError,
    UnauthorizedError,
    WorkflowGuardError,
    translate_shield_error,
    register_shield_error_handlers
)
from .token_auth import generate_auth_token, verify_auth_token
from .period_lock import (
    assert_period_open,
    get_fiscal_periods,
    toggle_fiscal_period
)
from .rbac import (
    require_roles,
    resolve_request_user,
    ROLE_ADMIN,
    ROLE_ACCOUNTANT,
    ROLE_WORKSHOP_MANAGER,
    ROLE_DATA_ENTRY,
    ROLE_TAILOR
)
from .idempotency import idempotent_op

__all__ = [
    "FiscalPeriodLockedError",
    "IdempotencyConflictError",
    "ForbiddenRoleError",
    "UnauthorizedError",
    "WorkflowGuardError",
    "generate_auth_token",
    "verify_auth_token",
    "translate_shield_error",
    "register_shield_error_handlers",
    "assert_period_open",
    "get_fiscal_periods",
    "toggle_fiscal_period",
    "require_roles",
    "resolve_request_user",
    "ROLE_ADMIN",
    "ROLE_ACCOUNTANT",
    "ROLE_WORKSHOP_MANAGER",
    "ROLE_DATA_ENTRY",
    "ROLE_TAILOR",
    "idempotent_op",
]
