# -*- coding: utf-8 -*-
"""
Canonical Error Architecture for Little Princesses ERP
Provides structured, typed exception classes across all domains.
"""

class DomainError(Exception):
    """Base exception for all domain logic violations."""
    def __init__(self, message: str, code: str = "DOMAIN_ERROR", details: dict = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}

    def to_dict(self):
        return {
            "success": False,
            "error": self.message,
            "error_code": self.code,
            "details": self.details
        }

class ValidationError(DomainError):
    def __init__(self, message: str, field: str = None, details: dict = None):
        super().__init__(message, code="VALIDATION_ERROR", details=details or {"field": field})

class InvalidStateTransitionError(DomainError):
    def __init__(self, entity: str, current_state: str, target_state: str):
        msg = f"Invalid state transition for {entity}: cannot transition from '{current_state}' to '{target_state}'."
        super().__init__(msg, code="INVALID_STATE_TRANSITION", details={
            "entity": entity,
            "current_state": current_state,
            "target_state": target_state
        })

class UnbalancedJournalEntryError(DomainError):
    def __init__(self, entry_no: str, total_debit: float, total_credit: float, diff: float):
        msg = f"Unbalanced Journal Entry {entry_no}: Debit ({total_debit}) != Credit ({total_credit}), Difference: {diff}."
        super().__init__(msg, code="UNBALANCED_JOURNAL_ENTRY", details={
            "entry_no": entry_no,
            "total_debit": str(total_debit),
            "total_credit": str(total_credit),
            "difference": str(diff)
        })

class InsufficientInventoryError(DomainError):
    def __init__(self, item_name: str, requested: float, available: float):
        msg = f"Insufficient stock for '{item_name}': requested {requested}, available {available}."
        super().__init__(msg, code="INSUFFICIENT_INVENTORY", details={
            "item": item_name,
            "requested": requested,
            "available": available
        })

class PeriodClosedError(DomainError):
    def __init__(self, period_name: str, transaction_date: str):
        msg = f"Financial period '{period_name}' is closed. Mutation prohibited on {transaction_date}."
        super().__init__(msg, code="PERIOD_CLOSED", details={
            "period": period_name,
            "date": transaction_date
        })

class RecordNotFoundError(DomainError):
    def __init__(self, entity: str, entity_id: str):
        msg = f"{entity} with ID '{entity_id}' not found."
        super().__init__(msg, code="RECORD_NOT_FOUND", details={"entity": entity, "id": entity_id})

class InfrastructureError(Exception):
    """Base exception for external infrastructure failures."""
    def __init__(self, message: str, source: str = "DATABASE"):
        super().__init__(message)
        self.message = message
        self.source = source
