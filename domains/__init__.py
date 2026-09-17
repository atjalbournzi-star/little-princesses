# -*- coding: utf-8 -*-
"""
Little Princesses ERP — Canonical Domain Architecture Package
Exporting domain modules, state machine, errors, and application services.
"""

from .common import (
    DomainError,
    ValidationError,
    InvalidStateTransitionError,
    UnbalancedJournalEntryError,
    InsufficientInventoryError,
    PeriodClosedError,
    RecordNotFoundError,
    currency_engine,
    normalize_currency_code,
    dispatcher,
    DomainEvent
)

from .tailoring import (
    TailoringStage,
    STAGE_LABELS,
    ALLOWED_TRANSITIONS,
    normalize_stage,
    validate_transition,
    get_display_label,
    tailoring_service
)

from .accounting import (
    resolve_account_nature,
    compute_balance_delta,
    validate_balanced_lines,
    accounting_service
)

from .customers import customer_service
from .inventory import inventory_service
from .repositories import db_gateway
