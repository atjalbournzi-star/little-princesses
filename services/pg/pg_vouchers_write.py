# services/pg/pg_vouchers_write.py
# Payment & Receipt vouchers write facade with 100% dynamic chart_of_accounts resolution
# Architectural Standards Compliant (< 220 lines)

from .pg_vouchers import add_voucher

__all__ = ["add_voucher"]
