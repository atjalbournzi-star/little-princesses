"""
Little Princesses ERP - Quality Assurance & Control Facade
Re-exports all inspection, defect, feedback, complaint, return, CAPA, checkpoint, and dashboard functions.
"""

from .pg_quality_inspections import (
    get_quality_inspections,
    add_quality_inspection,
    get_quality_defects,
    add_quality_defect
)
from .pg_quality_feedback import (
    get_quality_feedback,
    add_quality_feedback,
    get_quality_complaints,
    add_quality_complaint
)
from .pg_quality_returns import (
    get_quality_returns,
    add_quality_return
)
from .pg_quality_actions import (
    get_quality_actions,
    add_quality_action,
    get_quality_checkpoints,
    save_quality_checkpoint,
    get_quality_settings,
    save_quality_settings,
    ensure_quality_seed_data
)
from .pg_quality_dashboard import (
    get_quality_dashboard_pg,
    get_quality_summary
)

__all__ = [
    "get_quality_inspections",
    "add_quality_inspection",
    "get_quality_defects",
    "add_quality_defect",
    "get_quality_feedback",
    "add_quality_feedback",
    "get_quality_complaints",
    "add_quality_complaint",
    "get_quality_returns",
    "add_quality_return",
    "get_quality_actions",
    "add_quality_action",
    "get_quality_checkpoints",
    "save_quality_checkpoint",
    "get_quality_settings",
    "save_quality_settings",
    "ensure_quality_seed_data",
    "get_quality_dashboard_pg",
    "get_quality_summary"
]
