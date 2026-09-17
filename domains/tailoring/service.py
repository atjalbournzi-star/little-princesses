# -*- coding: utf-8 -*-
"""
Tailoring Order Domain Service
Orchestrates order operations, SLA deadline enforcement (e.g. 4-day delivery rule), and transitions.
"""

import datetime
from decimal import Decimal
from domains.common.errors import ValidationError
from domains.common.events import dispatcher, DomainEvent
from domains.tailoring.state_machine import (
    TailoringStage,
    normalize_stage,
    validate_transition,
    get_display_label
)

DEFAULT_SLA_DAYS = 4

class TailoringOrderService:
    @staticmethod
    def calculate_delivery_date(order_date: str, days: int = DEFAULT_SLA_DAYS) -> str:
        """Calculates promised delivery date based on automated SLA rules (4 days)."""
        try:
            d = datetime.datetime.strptime(str(order_date).split('T')[0], "%Y-%m-%d")
        except Exception:
            d = datetime.datetime.now()
        delivery = d + datetime.timedelta(days=days)
        return delivery.strftime("%Y-%m-%d")

    @staticmethod
    def transition_order_stage(order: dict, target_stage_raw: str, actor: str = "system") -> dict:
        """Executes a valid order lifecycle transition and emits a DomainEvent."""
        current_raw = order.get("production_status") or order.get("status") or "CONFIRMED"
        current_stage = normalize_stage(current_raw)
        target_stage = normalize_stage(target_stage_raw)

        # Validate business transition rule
        validate_transition(current_stage, target_stage)

        order_id = order.get("id") or order.get("order_no")
        label = get_display_label(target_stage)
        order["production_status"] = label
        if target_stage in (TailoringStage.DELIVERED, TailoringStage.READY):
            order["status"] = "مكتمل"
        elif target_stage == TailoringStage.CANCELLED:
            order["status"] = "ملغي"
        else:
            order["status"] = "قيد التنفيذ"

        # Emit domain event for decoupling other domains (e.g. Accounting, Notifications)
        dispatcher.publish(DomainEvent(
            name="ORDER_STAGE_TRANSITIONED",
            payload={
                "order_id": order_id,
                "from_stage": current_stage.value,
                "to_stage": target_stage.value,
                "actor": actor
            },
            entity_id=str(order_id)
        ))

        return {
            "success": True,
            "order_id": order_id,
            "previous_stage": current_stage.value,
            "new_stage": target_stage.value,
            "display_label": label
        }

    @staticmethod
    def validate_new_order(payload: dict) -> bool:
        """Validates mandatory invariant rules before an order can be created."""
        if not payload.get("customer_id") and not payload.get("customer_name"):
            raise ValidationError("Order must have an associated customer.", field="customer")
        total = Decimal(str(payload.get("total") or payload.get("total_amount") or 0))
        if total <= Decimal("0"):
            raise ValidationError("Order total must be greater than zero.", field="total")
        return True

tailoring_service = TailoringOrderService()
