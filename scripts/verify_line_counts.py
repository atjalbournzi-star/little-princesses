import os

files = [
    'src/index.css',
    'src/App.jsx',
    'src/components/AppLayout.jsx',
    'src/features/Vouchers.jsx',
    'src/features/vouchers/components/ReceiptVoucherModal.jsx',
    'src/features/vouchers/components/PaymentVoucherModal.jsx',
    'src/features/vouchers/components/JournalVoucherModal.jsx',
    'src/features/vouchers/components/VoucherViewModal.jsx',
    'src/features/vouchers/components/VoucherReversalModal.jsx',
    'src/components/PrintModal.jsx',
    'src/components/LoginModal.jsx',
    'src/components/UsersModal.jsx',
]

print("=== LINE COUNT VERIFICATION (Limit: 220 lines) ===")
all_pass = True
for f in files:
    path = os.path.normpath(f)
    if not os.path.exists(path):
        print(f"MISSING: {f}")
        all_pass = False
        continue
    with open(path, 'r', encoding='utf-8') as fh:
        lines = len(fh.readlines())
    status = "PASS" if lines <= 220 else "FAIL"
    if lines > 220:
        all_pass = False
    print(f"[{status}] {f:<55} : {lines:>3} lines")

print("===================================================")
if all_pass:
    print("ALL FILES PASS THE STRICT <= 220 LINES STANDARD!")
else:
    print("FAILURES DETECTED!")
