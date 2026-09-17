# -*- coding: utf-8 -*-
"""
Double-Entry Accounting Invariant Rules and Chart Definitions
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Tuple
from domains.common.errors import UnbalancedJournalEntryError, ValidationError

ACCOUNT_NATURES = {
    "1": "DEBIT",   # Assets (أصول)
    "2": "CREDIT",  # Liabilities (خصوم)
    "3": "CREDIT",  # Equity (حقوق ملكية)
    "4": "CREDIT",  # Revenue (إيرادات)
    "5": "DEBIT",   # Expenses (مصروفات)
}

def resolve_account_nature(account_code: str, account_type: str = "") -> str:
    """Resolves normal balance nature ('DEBIT' or 'CREDIT') from code or type."""
    code_str = str(account_code or "").replace("ACC-", "").replace("ACC_", "").strip()
    if code_str and code_str[0] in ACCOUNT_NATURES:
        return ACCOUNT_NATURES[code_str[0]]
    
    t = str(account_type or "").lower()
    if any(k in t for k in ["asset", "أصول", "اصول", "مصروف", "expense", "تكلفة", "cost"]):
        return "DEBIT"
    return "CREDIT"

def compute_balance_delta(nature: str, is_debit_movement: bool, amount: Decimal) -> Decimal:
    """
    Computes net impact on account balance respecting accounting normal balance:
    - Debit normal accounts (Assets/Expenses): Debit increases (+), Credit decreases (-)
    - Credit normal accounts (Liabilities/Equity/Revenue): Credit increases (+), Debit decreases (-)
    """
    amt = Decimal(str(amount))
    if nature == "DEBIT":
        return amt if is_debit_movement else -amt
    else:
        return amt if not is_debit_movement else -amt

def validate_balanced_lines(lines: List[Dict], entry_no: str = "UNASSIGNED") -> Tuple[Decimal, Decimal]:
    """Validates that total debits strictly equal total credits."""
    if not lines:
        raise ValidationError("Journal entry must have at least two lines.", field="lines")
    if len(lines) < 2:
        raise ValidationError("Double-entry bookkeeping requires at least two lines.", field="lines")

    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for l in lines:
        d = Decimal(str(l.get("debit") or l.get("debit_base") or 0)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        c = Decimal(str(l.get("credit") or l.get("credit_base") or 0)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        if d < Decimal("0") or c < Decimal("0"):
            raise ValidationError("Debit and credit amounts must be non-negative.")
        total_debit += d
        total_credit += c

    diff = abs(total_debit - total_credit)
    if diff > Decimal("0.0000"):
        raise UnbalancedJournalEntryError(
            entry_no=entry_no,
            total_debit=float(total_debit),
            total_credit=float(total_credit),
            diff=float(diff)
        )

    return total_debit, total_credit
