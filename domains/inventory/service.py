# -*- coding: utf-8 -*-
"""
Inventory & Fabric Domain Service
Manages stock movements, BOM deductions, and emits stock events without direct coupling to accounting.
"""

from decimal import Decimal
from typing import Dict
from domains.common.errors import InsufficientInventoryError, ValidationError
from domains.common.events import dispatcher, DomainEvent

class InventoryService:
    @staticmethod
    def calculate_bom_usage(garment_type: str, age_category: str = "6-8") -> Decimal:
        """Dynamic BOM matrix estimating fabric usage (meters) by garment & age."""
        base_meters = Decimal("2.5")
        if "زفاف" in garment_type or "ملكي" in garment_type:
            base_meters = Decimal("4.0")
        elif "مدرسي" in garment_type or "طفل" in garment_type:
            base_meters = Decimal("1.5")
        
        # Age multiplier
        if age_category in ("1-3", "طفل صغير"):
            return base_meters * Decimal("0.7")
        elif age_category in ("10-14", "كبير"):
            return base_meters * Decimal("1.3")
        return base_meters

    @staticmethod
    def validate_stock_deduction(item_name: str, available_qty: float, requested_qty: float, allow_negative: bool = False):
        avail = Decimal(str(available_qty or 0))
        req = Decimal(str(requested_qty or 0))
        if req <= Decimal("0"):
            raise ValidationError("Deduction quantity must be positive.", field="quantity")
        if not allow_negative and req > avail:
            raise InsufficientInventoryError(item_name, float(req), float(avail))
        return avail - req

    @staticmethod
    def record_stock_movement(item_id: str, movement_type: str, qty: float, reference_id: str = "") -> dict:
        """Emits a domain event for stock change so accounting listener can record cost if needed."""
        event_payload = {
            "item_id": item_id,
            "movement_type": movement_type,
            "quantity": str(qty),
            "reference_id": reference_id
        }
        dispatcher.publish(DomainEvent(
            name="STOCK_MOVEMENT_RECORDED",
            payload=event_payload,
            entity_id=item_id
        ))
        return event_payload

inventory_service = InventoryService()
