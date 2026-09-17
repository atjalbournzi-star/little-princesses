# -*- coding: utf-8 -*-
"""
Canonical Currency Engine for Little Princesses ERP
Enforces Decimal precision and unified exchange rate conversions across all domains.
"""

from decimal import Decimal, ROUND_HALF_UP

DEFAULT_RATES = {
    "YER": Decimal("1.0"),
    "SAR": Decimal("142.0"),
    "USD": Decimal("530.0")
}

def normalize_currency_code(raw: str) -> str:
    """Normalizes any currency string into standard 3-letter ISO code."""
    if not raw:
        return "YER"
    s = str(raw).strip().upper()
    if "SAR" in s or "سعودي" in s:
        return "SAR"
    if "USD" in s or "$" in s or "دولار" in s:
        return "USD"
    return "YER"

class CurrencyEngine:
    def __init__(self, rates: dict = None):
        self.rates = {k: Decimal(str(v)) for k, v in (rates or DEFAULT_RATES).items()}

    def get_rate(self, code: str) -> Decimal:
        norm = normalize_currency_code(code)
        return self.rates.get(norm, Decimal("1.0"))

    def set_rate(self, code: str, rate: float):
        norm = normalize_currency_code(code)
        self.rates[norm] = Decimal(str(rate))

    def to_base(self, amount, currency: str, explicit_rate=None) -> dict:
        """Converts an amount from a given currency into base currency (YER)."""
        amt = Decimal(str(amount or 0)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        curr = normalize_currency_code(currency)
        rate = Decimal(str(explicit_rate)) if explicit_rate else self.get_rate(curr)
        
        base_amt = (amt * rate).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        return {
            "amount": amt,
            "currency": curr,
            "exchange_rate": rate,
            "base_amount": base_amt
        }

    def from_base(self, base_amount, target_currency: str) -> Decimal:
        """Converts an amount from base currency (YER) to a target currency."""
        b_amt = Decimal(str(base_amount or 0)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        curr = normalize_currency_code(target_currency)
        rate = self.get_rate(curr)
        if rate == Decimal("0"):
            return Decimal("0.00")
        return (b_amt / rate).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)

# Global singleton instance
currency_engine = CurrencyEngine()
