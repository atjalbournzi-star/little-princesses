"""
Empirical line count verification for Little Princesses ERP modified files.
"""
import sys

FILES_TO_CHECK = [
    'services/pg/pg_factory_commission_approve.py',
    'services/pg/pg_factory_commissions.py',
    'services/pg/pg_payroll_calc.py',
    'src/features/hr/components/HRHeader.jsx',
    'services/pg/pg_factory_delivery.py',
    'services/pg/pg_factory_watchdog.py',
    'services/pg/pg_factory_query.py',
    'src/features/factory/utils/factoryUtils.js',
    'src/features/factory/components/FactoryHeader.jsx',
    'src/features/customers/utils/customerUtils.js',
    'src/features/customers/hooks/useCustomersData.js',
    'src/features/customers/components/CustomerTable.jsx',
    'src/features/customers/components/CustomerFinancialLedgerBar.jsx',
    'tests/read_only_integrity_audit.py'
]

max_lines = 220
has_violation = False

print(f"{'File':<55} | {'Lines':<6} | {'Status':<6}")
print("-" * 73)
for f in FILES_TO_CHECK:
    with open(f, 'r', encoding='utf-8') as fp:
        count = len(fp.readlines())
    status = "OK" if count <= max_lines else "EXCEEDED"
    if count > max_lines:
        has_violation = True
    print(f"{f:<55} | {count:<6} | {status:<6}")

print("-" * 73)
if has_violation:
    print("❌ Line count violation found!")
    sys.exit(1)
else:
    print("✅ All 14 files strictly within <= 220 lines limit!")
    sys.exit(0)
