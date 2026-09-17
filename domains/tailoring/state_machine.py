# -*- coding: utf-8 -*-
"""
Canonical Tailoring Order State Machine for Little Princesses ERP
Single Source of Truth for order statuses and allowed lifecycle transitions.
"""

from enum import Enum
from typing import Set, Dict
from domains.common.errors import InvalidStateTransitionError

class TailoringStage(str, Enum):
    DRAFT = "DRAFT"
    MEASURED = "MEASURED"
    CONFIRMED = "CONFIRMED"
    WAITING_MATERIAL = "WAITING_MATERIAL"
    CUTTING = "CUTTING"
    SEWING = "SEWING"
    FITTING = "FITTING"
    ALTERATION = "ALTERATION"
    FINISHING = "FINISHING"
    QUALITY_CHECK = "QUALITY_CHECK"
    READY = "READY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

# Canonical labels mapping (Arabic Display Names)
STAGE_LABELS: Dict[TailoringStage, str] = {
    TailoringStage.DRAFT: "مسودة 📝",
    TailoringStage.MEASURED: "تم أخذ المقاسات 📐",
    TailoringStage.CONFIRMED: "مؤكد ومحجوز 🏷️",
    TailoringStage.WAITING_MATERIAL: "بانتظار توفر الأقمشة ⏳",
    TailoringStage.CUTTING: "مرحلة القص ✂️",
    TailoringStage.SEWING: "قيد الخياطة 🪡",
    TailoringStage.FITTING: "جلسة تجربة وقياس 👗",
    TailoringStage.ALTERATION: "تعديل مقاسات ورتوش 🪡",
    TailoringStage.FINISHING: "مرحلة التشطيب والشك 👑",
    TailoringStage.QUALITY_CHECK: "فحص الجودة والمطابقة 🔍",
    TailoringStage.READY: "جاهز للتسليم 🎁",
    TailoringStage.DELIVERED: "تم التسليم للعميل ✔️",
    TailoringStage.CANCELLED: "ملغي ❌"
}

# Inverted mapping for normalization
_LOOKUP: Dict[str, TailoringStage] = {}
for stage, label in STAGE_LABELS.items():
    _LOOKUP[stage.value.upper()] = stage
    _LOOKUP[label.strip()] = stage
    # Also strip emojis
    clean_label = "".join(ch for ch in label if ch.isalnum() or ch.isspace()).strip()
    _LOOKUP[clean_label] = stage

# Explicit allowed state transitions
ALLOWED_TRANSITIONS: Dict[TailoringStage, Set[TailoringStage]] = {
    TailoringStage.DRAFT: {TailoringStage.MEASURED, TailoringStage.CONFIRMED, TailoringStage.CANCELLED},
    TailoringStage.MEASURED: {TailoringStage.CONFIRMED, TailoringStage.CANCELLED},
    TailoringStage.CONFIRMED: {TailoringStage.WAITING_MATERIAL, TailoringStage.CUTTING, TailoringStage.CANCELLED},
    TailoringStage.WAITING_MATERIAL: {TailoringStage.CUTTING, TailoringStage.CANCELLED},
    TailoringStage.CUTTING: {TailoringStage.SEWING, TailoringStage.ALTERATION, TailoringStage.CANCELLED},
    TailoringStage.SEWING: {TailoringStage.FITTING, TailoringStage.FINISHING, TailoringStage.ALTERATION, TailoringStage.QUALITY_CHECK},
    TailoringStage.FITTING: {TailoringStage.ALTERATION, TailoringStage.FINISHING, TailoringStage.SEWING},
    TailoringStage.ALTERATION: {TailoringStage.SEWING, TailoringStage.FINISHING, TailoringStage.QUALITY_CHECK},
    TailoringStage.FINISHING: {TailoringStage.QUALITY_CHECK, TailoringStage.READY, TailoringStage.ALTERATION},
    TailoringStage.QUALITY_CHECK: {TailoringStage.READY, TailoringStage.ALTERATION, TailoringStage.SEWING},
    TailoringStage.READY: {TailoringStage.DELIVERED, TailoringStage.ALTERATION},
    TailoringStage.DELIVERED: set(),  # Terminal state
    TailoringStage.CANCELLED: set()   # Terminal state
}

def normalize_stage(raw) -> TailoringStage:
    """Resolves any string or TailoringStage representation into canonical TailoringStage."""
    if isinstance(raw, TailoringStage):
        return raw
    if hasattr(raw, "value") and isinstance(raw.value, str):
        raw = raw.value
    if not raw:
        return TailoringStage.CONFIRMED
    s = str(raw).strip()
    if s in _LOOKUP:
        return _LOOKUP[s]
    if s.upper() in _LOOKUP:
        return _LOOKUP[s.upper()]
    # Fuzzy match keywords
    s_clean = s.lower()
    if "draft" in s_clean or "مسود" in s: return TailoringStage.DRAFT
    if "measure" in s_clean or "أخذ المقاسات" in s: return TailoringStage.MEASURED
    if "confirm" in s_clean or "مؤكد" in s or "محجوز" in s: return TailoringStage.CONFIRMED
    if "material" in s_clean or "أقمشة" in s or "قماش" in s: return TailoringStage.WAITING_MATERIAL
    if "cut" in s_clean or "قص" in s: return TailoringStage.CUTTING
    if "sew" in s_clean or "خياط" in s: return TailoringStage.SEWING
    if "fit" in s_clean or "تجرب" in s or "قياس" in s: return TailoringStage.FITTING
    if "alter" in s_clean or "تعديل" in s or "رتوش" in s: return TailoringStage.ALTERATION
    if "finish" in s_clean or "تشطيب" in s or "تطريز" in s: return TailoringStage.FINISHING
    if "qual" in s_clean or "جود" in s: return TailoringStage.QUALITY_CHECK
    if "ready" in s_clean or "جاهز" in s: return TailoringStage.READY
    if "deliv" in s_clean or "تسليم" in s: return TailoringStage.DELIVERED
    if "cancel" in s_clean or "إلغاء" in s or "ملغي" in s or "ملغى" in s: return TailoringStage.CANCELLED
    return TailoringStage.CONFIRMED

def validate_transition(current: str, target: str) -> bool:
    """Validates if transition is allowed, raising an error if prohibited."""
    c_stage = normalize_stage(current)
    t_stage = normalize_stage(target)
    
    if c_stage == t_stage:
        return True
        
    allowed = ALLOWED_TRANSITIONS.get(c_stage, set())
    if t_stage not in allowed:
        raise InvalidStateTransitionError(
            entity="TailoringOrder",
            current_state=STAGE_LABELS.get(c_stage, c_stage.value),
            target_state=STAGE_LABELS.get(t_stage, t_stage.value)
        )
    return True

def get_display_label(stage: TailoringStage) -> str:
    return STAGE_LABELS.get(stage, stage.value)
