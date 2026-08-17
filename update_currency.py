import os

DEFAULT_CUR = '{display: "USD $", code: "USD", symbol: "$"}'

updates = [
    ('src/features/Products.jsx',
     'function Products({ products = [], setProducts, inventory = [], showToast })',
     f'function Products({{ products = [], setProducts, inventory = [], showToast, currency = {DEFAULT_CUR} }})'),
    ('src/features/Orders.jsx',
     'function Orders({ orders = [], setOrders, customers = [], products = [], showToast })',
     f'function Orders({{ orders = [], setOrders, customers = [], products = [], showToast, currency = {DEFAULT_CUR} }})'),
    ('src/features/Purchases.jsx',
     'function Purchases({ purchases = [], setPurchases, inventory = [], setInventory, accounts = [], showToast })',
     f'function Purchases({{ purchases = [], setPurchases, inventory = [], setInventory, accounts = [], showToast, currency = {DEFAULT_CUR} }})'),
    ('src/features/Vouchers.jsx',
     'function Vouchers({ vouchers = [], setVouchers, accounts = [], showToast })',
     f'function Vouchers({{ vouchers = [], setVouchers, accounts = [], showToast, currency = {DEFAULT_CUR} }})'),
    ('src/features/Expenses.jsx',
     'function Expenses({ expenses = [], setExpenses, accounts = [], showToast })',
     f'function Expenses({{ expenses = [], setExpenses, accounts = [], showToast, currency = {DEFAULT_CUR} }})'),
    ('src/features/Inventory.jsx',
     'function Inventory({ inventory = [], setInventory, showToast })',
     f'function Inventory({{ inventory = [], setInventory, showToast, currency = {DEFAULT_CUR} }})'),
    ('src/features/Journal.jsx',
     'function Journal({ journal = [], setJournal, accounts = [], showToast })',
     f'function Journal({{ journal = [], setJournal, accounts = [], showToast, currency = {DEFAULT_CUR} }})'),
]

for path, old_sig, new_sig in updates:
    if not os.path.exists(path):
        print(f'SKIP (not found): {path}')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if old_sig in content:
        content = content.replace(old_sig, new_sig)
        print(f'Signature updated: {path}')
    else:
        print(f'Signature NOT found in {path} — check manually')

    # Replace hardcoded currency strings with dynamic
    content = content.replace('"USD $"', 'currency.display')
    content = content.replace("'USD $'", 'currency.display')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  -> Currency refs updated: {path}')

print('\nAll done!')
