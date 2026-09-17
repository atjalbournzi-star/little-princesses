from domains.system.default_sequences import DEFAULT_SEQUENCES


def create_enterprise_tables(c):
    # 1. Number Sequences Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS number_sequences (
            id TEXT PRIMARY KEY,
            entity TEXT UNIQUE NOT NULL,
            prefix TEXT NOT NULL,
            current_number INTEGER DEFAULT 0,
            padding INTEGER DEFAULT 6,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Seed default sequences if empty
    for s in DEFAULT_SEQUENCES:
        c.execute("INSERT OR IGNORE INTO number_sequences (id, entity, prefix, current_number, padding, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)", s)

    # 2. Audit Logs Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            old_values TEXT DEFAULT '',
            new_values TEXT DEFAULT '',
            user_id TEXT DEFAULT 'system',
            ip_address TEXT DEFAULT '',
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 3. Inventory Transactions Movement Ledger
    c.execute('''
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            id TEXT PRIMARY KEY,
            product_id TEXT DEFAULT '',
            variant_id TEXT DEFAULT '',
            fabric_id TEXT DEFAULT '',
            warehouse_id TEXT DEFAULT 'WH-MAIN',
            transaction_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_cost REAL DEFAULT 0,
            reference_type TEXT DEFAULT 'MANUAL',
            reference_id TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'system'
        )
    ''')

    # 4. Customers Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            customer_name TEXT NOT NULL,
            phone TEXT DEFAULT '',
            phone_alt TEXT DEFAULT '',
            platform TEXT DEFAULT 'مباشر',
            handle TEXT DEFAULT '',
            category TEXT DEFAULT 'VIP',
            city TEXT DEFAULT 'صنعاء',
            street TEXT DEFAULT '',
            children_count INTEGER DEFAULT 1,
            notes TEXT DEFAULT '',
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'system',
            updated_by TEXT DEFAULT '',
            deleted_at TEXT DEFAULT ''
        )
    ''')

    # 5. Children Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS children (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            child_name TEXT NOT NULL,
            gender TEXT DEFAULT 'أنثى',
            birth_date TEXT DEFAULT '',
            age TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id)
        )
    ''')

    # 6. Measurement Profiles Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS measurement_profiles (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            child_id TEXT DEFAULT '',
            child_name TEXT DEFAULT '',
            meas_date TEXT DEFAULT '',
            unit TEXT DEFAULT 'cm',
            total_len TEXT DEFAULT '',
            dress_len TEXT DEFAULT '',
            chest_len TEXT DEFAULT '',
            skirt_len TEXT DEFAULT '',
            sleeve_len TEXT DEFAULT '',
            chest_circ TEXT DEFAULT '',
            waist_circ TEXT DEFAULT '',
            shoulder_w TEXT DEFAULT '',
            armpit_circ TEXT DEFAULT '',
            neck_circ TEXT DEFAULT '',
            model_name TEXT DEFAULT '',
            model_img TEXT DEFAULT '',
            comfort_profile TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id)
        )
    ''')

    # 7. Products & Models Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            sku TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'فساتين سهرة',
            subcategory TEXT DEFAULT 'أميرات',
            collection TEXT DEFAULT 'تشكيلة 2026',
            design_code TEXT DEFAULT '',
            designer_id TEXT DEFAULT '',
            fabric_id TEXT DEFAULT '',
            base_price REAL DEFAULT 0,
            cost_price REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD $',
            status TEXT DEFAULT 'active',
            image_url TEXT DEFAULT '',
            description TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'system'
        )
    ''')

    # 8. Sales Orders & Invoices Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS sales_orders (
            id TEXT PRIMARY KEY,
            order_no TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            child_id TEXT DEFAULT '',
            product_id TEXT DEFAULT '',
            variant_id TEXT DEFAULT '',
            qty REAL DEFAULT 1,
            order_date TEXT DEFAULT '',
            delivery_date TEXT DEFAULT '',
            total REAL DEFAULT 0,
            paid REAL DEFAULT 0,
            remaining REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD $',
            payment_status TEXT DEFAULT 'غير مدفوع',
            production_status TEXT DEFAULT 'قيد الخياطة 🪡',
            status TEXT DEFAULT 'نشط',
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'system'
        )
    ''')

    # 9. Payments & Vouchers Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            payment_no TEXT NOT NULL,
            order_id TEXT DEFAULT '',
            customer_id TEXT DEFAULT '',
            supplier_id TEXT DEFAULT '',
            payment_type TEXT DEFAULT 'سند قبض',
            amount REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD $',
            payment_method TEXT DEFAULT 'نقداً',
            reference_no TEXT DEFAULT '',
            account_id TEXT DEFAULT '101',
            date TEXT DEFAULT '',
            status TEXT DEFAULT 'posted',
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'system'
        )
    ''')

    # 10. Production Orders Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS production_orders (
            id TEXT PRIMARY KEY,
            production_order_no TEXT NOT NULL,
            order_id TEXT DEFAULT '',
            product_id TEXT DEFAULT '',
            variant_id TEXT DEFAULT '',
            product_name TEXT DEFAULT '',
            child_name TEXT DEFAULT '',
            stage TEXT DEFAULT 'القص والباترون ✂️',
            assigned_tailor_id TEXT DEFAULT '',
            assigned_designer_id TEXT DEFAULT '',
            start_date TEXT DEFAULT '',
            due_date TEXT DEFAULT '',
            progress TEXT DEFAULT '25%',
            status TEXT DEFAULT 'قيد التنفيذ',
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 11. Journal Entries Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS journal_entries (
            id TEXT PRIMARY KEY,
            entry_no TEXT NOT NULL,
            entry_date TEXT DEFAULT '',
            debit_account_id TEXT DEFAULT '',
            credit_account_id TEXT DEFAULT '',
            amount REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD $',
            ref_type TEXT DEFAULT 'MANUAL',
            ref_id TEXT DEFAULT '',
            status TEXT DEFAULT 'posted',
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'system'
        )
    ''')
