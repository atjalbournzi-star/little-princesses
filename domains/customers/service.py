# -*- coding: utf-8 -*-
"""
Customer & CRM Domain Service
"""

from decimal import Decimal
from domains.common.errors import ValidationError
from domains.common.events import dispatcher, DomainEvent

class CustomerService:
    @staticmethod
    def validate_customer(name: str, phone: str = "") -> bool:
        if not name or not str(name).strip():
            raise ValidationError("Customer name cannot be empty.", field="name")
        return True

    @staticmethod
    def apply_balance_movement(current_balance: Decimal, movement_type: str, amount: Decimal) -> Decimal:
        """
        Safely computes new customer balance:
        - Invoiced / Debit movement: increases customer debt (+)
        - Paid / Receipt movement: decreases customer debt (-)
        """
        cur = Decimal(str(current_balance or 0))
        amt = Decimal(str(amount or 0))
        if movement_type in ("INVOICE", "DEBIT"):
            return cur + amt
        elif movement_type in ("PAYMENT", "RECEIPT", "CREDIT"):
            return cur - amt
        return cur

customer_service = CustomerService()
