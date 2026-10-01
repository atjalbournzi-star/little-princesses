"""
Little Princesses ERP - Employees & Payroll Facade
Re-exports all employee, advance, and payroll functions.
"""

from .pg_employees import (
    get_employees,
    add_employee,
    delete_employee
)
from .pg_advances import (
    add_advance,
    get_advances
)
from .pg_payroll_calc import (
    get_payroll,
    update_payroll_record,
    calculate_payroll
)
from .pg_payroll_post import (
    add_payroll_batch,
    post_payroll
)

__all__ = [
    "get_employees",
    "add_employee",
    "delete_employee",
    "add_advance",
    "get_advances",
    "get_payroll",
    "update_payroll_record",
    "calculate_payroll",
    "add_payroll_batch",
    "post_payroll"
]
