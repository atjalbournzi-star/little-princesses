# -*- coding: utf-8 -*-
"""Public API for domains.tailoring"""
from .state_machine import (
    TailoringStage,
    STAGE_LABELS,
    ALLOWED_TRANSITIONS,
    normalize_stage,
    validate_transition,
    get_display_label
)
from .service import tailoring_service, TailoringOrderService
