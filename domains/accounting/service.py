# -*- coding: utf-8 -*-
"""
Accounting Application Service
Orchestrates balanced transaction creation, atomic validation, and event emission.
"""

from decimal import Decimal
from typing import List, Dict
from domains.common.currency import currency_engine
from domains.common.events import dispatcher, DomainEvent
from domains.accounting.rules import (
    validate_balanced_lines,
    resolve_account_nature,
    compute_balance_delta
)

class AccountingService:
    @staticmethod
    def create_standard_voucher_entry(
        voucher_no: str,
        voucher_type: str,
        amount: float,
        currency: str,
        cash_account: str,
        target_account: str,
        party_name: str = "",
        notes: str = "",
        exchange_rate: float = None
    ) -> dict:
        """
        Creates a guaranteed balanced double-entry structure for receipt or payment vouchers.
        """
        base_conv = currency_engine.to_base(amount, currency, exchange_rate)
        amt = base_conv["amount"]
        base_amt = base_conv["base_amount"]
        rate = base_conv["exchange_rate"]
        curr = base_conv["currency"]

        is_receipt = ("قبض" in voucher_type or voucher_type.lower() in ("receipt", "rv"))
        
        # Receipt: Debit Cash, Credit Target (e.g. Accounts Receivable)
        # Payment: Debit Target (e.g. Accounts Payable / Expense), Credit Cash
        deb_acc = cash_account if is_receipt else target_account
        crd_acc = target_account if is_receipt else cash_account

        lines = [
            {
                "account_id": deb_acc,
                "debit": amt,
                "credit": Decimal("0.0"),
                "debit_base": base_amt,
                "credit_base": Decimal("0.0"),
                "description": f"مدين - {voucher_type} {voucher_no} ({party_name})"
            },
            {
                "account_id": crd_acc,
                "debit": Decimal("0.0"),
                "credit": amt,
                "debit_base": Decimal("0.0"),
                "credit_base": base_amt,
                "description": f"دائن - {voucher_type} {voucher_no} ({party_name})"
            }
        ]

        # Invariant validation
        validate_balanced_lines(lines, entry_no=f"AUTO-VCH-{voucher_no}")

        entry = {
            "entry_no": f"AUTO-VCH-{voucher_no}",
            "ref_type": "Voucher",
            "ref_id": voucher_no,
            "description": f"{voucher_type} رقم {voucher_no}: {party_name}",
            "debit_account_id": deb_acc,
            "credit_account_id": crd_acc,
            "amount": amt,
            "currency": curr,
            "exchange_rate": rate,
            "base_amount": base_amt,
            "notes": notes,
            "status": "Posted",
            "lines": lines
        }

        dispatcher.publish(DomainEvent(
            name="VOUCHER_ENTRY_CREATED",
            payload={"voucher_no": voucher_no, "entry_no": entry["entry_no"], "base_amount": str(base_amt)},
            entity_id=voucher_no
        ))

        return entry

accounting_service = AccountingService()
