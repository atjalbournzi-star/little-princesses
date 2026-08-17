CREATE TABLE settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
CREATE TABLE sqlite_sequence(name,seq)
CREATE TABLE accounts_v2 (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            balance REAL DEFAULT 0.0
        )
CREATE TABLE customers_full (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            phone TEXT,
            social_platform TEXT,
            social_handle TEXT,
            address TEXT,
            unit TEXT,
            total_length REAL,
            shoulder REAL,
            chest_circ REAL,
            waist_circ REAL,
            sleeve_length REAL,
            chest_length REAL
        , extra_measurements TEXT, customer_type TEXT)
CREATE TABLE inventory_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL,
            quantity_meters REAL DEFAULT 0.0,
            cost_per_meter REAL DEFAULT 0.0,
            min_alert_qty REAL DEFAULT 5.0
        )
CREATE TABLE models_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_name TEXT NOT NULL,
            category TEXT NOT NULL,
            sell_price REAL DEFAULT 0.0,
            material_cost REAL DEFAULT 0.0,
            labor_cost REAL DEFAULT 0.0
        )
CREATE TABLE sales_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT, customer_name TEXT, phone TEXT, product_name TEXT,
            total_amount REAL, paid_amount REAL, remaining_amount REAL,
            currency TEXT, status TEXT, notes TEXT
        )
CREATE TABLE sales_qr_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_no TEXT UNIQUE,
            customer_name TEXT,
            dress_name TEXT,
            qty INTEGER DEFAULT 1,
            total_amount REAL,
            paid_deposit REAL,
            remaining_amount REAL,
            currency TEXT DEFAULT 'USD',
            payment_method TEXT,
            transfer_no TEXT,
            delivery_date TEXT,
            delivery_fees REAL DEFAULT 0.0
        )
CREATE TABLE sales_orders_full (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT UNIQUE,
            customer_name TEXT,
            phone TEXT,
            currency TEXT DEFAULT 'USD',
            product_name TEXT,
            fabric_type TEXT,
            total_amount REAL,
            paid_amount REAL,
            remaining_amount REAL,
            status TEXT,
            notes TEXT,
            delivery_date TEXT,
            delivery_fees REAL DEFAULT 0.0,
            payment_method TEXT,
            transfer_no TEXT
        )
CREATE TABLE purchases_full (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_no TEXT UNIQUE,
            supplier_name TEXT,
            item_name TEXT,
            quantity REAL,
            unit_price REAL,
            total_amount REAL,
            currency TEXT DEFAULT 'USD',
            date_added TEXT
        , transport_cost REAL DEFAULT 0.0, transfer_fee REAL DEFAULT 0.0)
CREATE TABLE vouchers_full (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_no TEXT UNIQUE,
            voucher_type TEXT,
            currency TEXT,
            amount REAL,
            account_name TEXT,
            statement TEXT,
            date_added TEXT
        )
CREATE TABLE models_products_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_name TEXT NOT NULL,
            category TEXT NOT NULL,
            currency TEXT DEFAULT 'USD',
            fabric_name TEXT,
            fabric_qty REAL DEFAULT 0.0,
            fabric_unit TEXT DEFAULT 'متر',
            fabric_unit_cost REAL DEFAULT 0.0,
            total_fabric_cost REAL DEFAULT 0.0,
            packaging_cost REAL DEFAULT 0.0,
            labor_cost REAL DEFAULT 0.0,
            total_product_cost REAL DEFAULT 0.0,
            sell_price REAL DEFAULT 0.0,
            net_profit REAL DEFAULT 0.0
        )
CREATE TABLE company_profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            company_name TEXT,
            phone TEXT,
            address TEXT,
            email TEXT,
            logo_path TEXT
        )
CREATE TABLE customer_measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT,
            dress_number INTEGER,
            total_length REAL,
            shoulder REAL,
            chest_circ REAL,
            waist_circ REAL,
            sleeve_length REAL,
            chest_length REAL
        )
CREATE TABLE customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            social_platform TEXT DEFAULT 'واتساب',
            social_handle TEXT DEFAULT '',
            address TEXT,
            unit TEXT DEFAULT 'سم (cm)',
            total_length TEXT,
            shoulder_width TEXT,
            bust_circ TEXT,
            waist_circ TEXT,
            sleeve_length TEXT,
            chest_length TEXT,
            sizes_notes TEXT,
            reg_date TEXT DEFAULT '2026-07-31'
        )
CREATE TABLE orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT UNIQUE,
            customer_name TEXT NOT NULL,
            product_name TEXT,
            quantity INTEGER DEFAULT 1,
            pay_method TEXT DEFAULT 'نقد (كاش)',
            transfer_no TEXT DEFAULT '',
            order_date TEXT,
            delivery_date TEXT,
            pickup_time TEXT DEFAULT 'الساعة 4 مساءً',
            delivery_fee REAL DEFAULT 0.0,
            fabric_status TEXT DEFAULT 'متوفر بالورشة',
            custom_notes TEXT,
            status TEXT DEFAULT 'قيد الخياطة 🪡',
            rating TEXT DEFAULT 'ممتاز ⭐⭐⭐⭐⭐',
            alteration_notes TEXT DEFAULT '',
            total_amount REAL DEFAULT 0.0,
            paid_amount REAL DEFAULT 0.0,
            remaining_amount REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'USD $',
            profit REAL DEFAULT 0.0,
            qr_code_path TEXT DEFAULT ''
        )
CREATE TABLE inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL,
            quantity_meters REAL DEFAULT 0.0,
            cost_per_meter REAL DEFAULT 0.0,
            min_alert_qty REAL DEFAULT 5.0,
            currency TEXT DEFAULT 'USD $',
            supply_date TEXT DEFAULT '2026-07-31',
            notes TEXT DEFAULT ''
        )
CREATE TABLE accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id TEXT UNIQUE NOT NULL,
            account_code TEXT UNIQUE NOT NULL,
            account_name TEXT NOT NULL,
            account_name_en TEXT DEFAULT '',
            account_type TEXT NOT NULL,
            account_category TEXT DEFAULT '',
            parent_account_id TEXT DEFAULT '',
            parent_account_code TEXT DEFAULT '',
            level INTEGER DEFAULT 1,
            account_path TEXT DEFAULT '',
            is_group INTEGER DEFAULT 0,
            is_postable INTEGER DEFAULT 1,
            is_active INTEGER DEFAULT 1,
            normal_balance TEXT DEFAULT 'debit',
            opening_balance REAL DEFAULT 0.0,
            current_balance REAL DEFAULT 0.0,
            balance_type TEXT DEFAULT 'debit',
            currency TEXT DEFAULT 'YER',
            establishment_date TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'النظام',
            updated_by TEXT DEFAULT 'النظام',
            code TEXT,
            name TEXT,
            parent_id INTEGER,
            nature TEXT DEFAULT 'debit',
            balance REAL DEFAULT 0.0,
            acc_code TEXT,
            acc_name TEXT,
            acc_type TEXT,
            created_date TEXT
        );
CREATE TABLE journal_entries (
            journal_id TEXT PRIMARY KEY,
            journal_number TEXT UNIQUE NOT NULL,
            transaction_date TEXT DEFAULT CURRENT_TIMESTAMP,
            description TEXT DEFAULT '',
            reference_type TEXT DEFAULT '',
            reference_id TEXT DEFAULT '',
            created_by TEXT DEFAULT 'المستخدم',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'posted'
        );
CREATE TABLE journal_lines (
            line_id TEXT PRIMARY KEY,
            journal_id TEXT NOT NULL REFERENCES journal_entries(journal_id),
            account_id TEXT NOT NULL,
            account_code TEXT NOT NULL,
            debit REAL DEFAULT 0.0,
            credit REAL DEFAULT 0.0,
            description TEXT DEFAULT '',
            cost_center TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
CREATE TABLE audit_log (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            entity_type TEXT DEFAULT 'account',
            entity_id TEXT DEFAULT '',
            old_value TEXT DEFAULT '',
            new_value TEXT DEFAULT '',
            user TEXT DEFAULT 'المستخدم',
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            source TEXT DEFAULT 'Web Application'
        );
CREATE TABLE vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_no TEXT UNIQUE,
            voucher_type TEXT NOT NULL,
            pay_method TEXT DEFAULT 'نقد (كاش)',
            transfer_no TEXT DEFAULT '',
            image_path TEXT DEFAULT '',
            party_name TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'USD $',
            date_created TEXT,
            notes TEXT
        )
CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            fabric_name TEXT DEFAULT '',
            yards_used REAL DEFAULT 0.0,
            fabric_cost REAL DEFAULT 0.0,
            labor_cost REAL DEFAULT 0.0,
            packaging_cost REAL DEFAULT 0.0,
            total_cost REAL DEFAULT 0.0,
            selling_price REAL NOT NULL,
            currency TEXT DEFAULT 'USD $',
            profit REAL DEFAULT 0.0,
            calc_date TEXT DEFAULT '2026-07-31'
        )
CREATE TABLE journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_no TEXT UNIQUE,
            debit TEXT NOT NULL,
            credit TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'USD $',
            ref_type TEXT DEFAULT 'فاتورة مبيعات',
            date TEXT DEFAULT '2026-07-31',
            notes TEXT DEFAULT ''
        )
CREATE TABLE purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_no TEXT UNIQUE,
            supplier TEXT NOT NULL,
            item TEXT NOT NULL,
            qty REAL DEFAULT 0.0,
            price REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'USD $',
            pay_type TEXT DEFAULT 'نقد (كاش)',
            transfer_no TEXT DEFAULT '',
            payment_source TEXT DEFAULT '101 - الصندوق الرئيسي',
            date TEXT DEFAULT '2026-07-31'
        )
CREATE TABLE expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exp_type TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'USD $',
            pay_method TEXT DEFAULT 'نقد (كاش)',
            source_acc TEXT DEFAULT '101 - الصندوق الرئيسي',
            date TEXT DEFAULT '2026-07-31',
            notes TEXT DEFAULT ''
        )
CREATE TABLE factory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            product_name TEXT NOT NULL,
            tailor TEXT NOT NULL,
            stage TEXT NOT NULL,
            progress INTEGER DEFAULT 0,
            start_date TEXT DEFAULT '2026-07-31',
            due_date TEXT DEFAULT '2026-08-15',
            notes TEXT DEFAULT ''
        )
CREATE TABLE IF NOT EXISTS bom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    inventory_item_name TEXT NOT NULL,
    qty_needed REAL DEFAULT 0.0
);
CREATE TABLE IF NOT EXISTS finished_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    model_name TEXT NOT NULL,
    size TEXT,
    status TEXT DEFAULT 'إنتاج مسبق',
    price REAL DEFAULT 0.0,
    location TEXT DEFAULT 'المعرض الرئيسي'
);
