"""
Little Princesses ERP - Factory & Atelier Facade
Re-exports all production, tailor, alteration, watchdog, and settlement functions.
"""

from .pg_factory_query import get_factory
from .pg_factory_update import update_factory, delete_factory_order
from .pg_factory_inflow import process_stock_inflow, reverse_stock_inflow
from .pg_factory_delivery import deliver_and_settle_order, reverse_order_delivery
from .pg_factory_analytics import get_factory_analytics
from .pg_factory_job_card import get_production_order_for_job_card
from .pg_factory_qc import submit_tailor_stage_completion, reject_tailor_job_and_rework
from .pg_factory_commission_approve import approve_tailor_commission_and_qc
from .pg_factory_alterations import (
    get_fitting_alterations,
    add_fitting_alteration,
    update_fitting_alteration_status
)
from .pg_factory_watchdog import get_atelier_watchdog, scan_to_deliver_order
from .pg_factory_commissions import (
    get_tailor_commissions,
    get_tailor_payout_summary,
    get_tailor_unpaid_pieces,
    get_tailor_payout_vouchers
)
from .pg_factory_payout import post_tailor_payout_voucher

__all__ = [
    "get_factory",
    "update_factory",
    "delete_factory_order",
    "process_stock_inflow",
    "reverse_stock_inflow",
    "deliver_and_settle_order",
    "reverse_order_delivery",
    "get_factory_analytics",
    "get_production_order_for_job_card",
    "submit_tailor_stage_completion",
    "reject_tailor_job_and_rework",
    "approve_tailor_commission_and_qc",
    "get_fitting_alterations",
    "add_fitting_alteration",
    "update_fitting_alteration_status",
    "get_atelier_watchdog",
    "scan_to_deliver_order",
    "get_tailor_commissions",
    "get_tailor_payout_summary",
    "get_tailor_unpaid_pieces",
    "get_tailor_payout_vouchers",
    "post_tailor_payout_voucher"
]
