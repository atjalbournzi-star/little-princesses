# domains/accounting/db_financial.py
# Financial tables schema & column migrations

def init_financial_tables(c):
    c.execute('''
        CREATE TABLE IF NOT EXISTS vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_no TEXT UNIQUE,
            voucher_type TEXT DEFAULT 'سند صرف',
            party_name TEXT DEFAULT '',
            amount REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'YER',
            exchange_rate REAL DEFAULT 1.0,
            base_amount REAL DEFAULT 0.0,
            pay_method TEXT DEFAULT 'نقد (كاش)',
            transfer_no TEXT DEFAULT '',
            account_id TEXT DEFAULT '101',
            target_acc TEXT DEFAULT '201',
            date_created TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            status TEXT DEFAULT 'posted',
            image_path TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expense_no TEXT UNIQUE,
            category TEXT DEFAULT '',
            amount REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'YER',
            exchange_rate REAL DEFAULT 1.0,
            base_amount REAL DEFAULT 0.0,
            transaction_id TEXT DEFAULT '',
            date TEXT DEFAULT '',
            payment_method TEXT DEFAULT 'نقد (كاش)',
            recipient TEXT DEFAULT '',
            account_id TEXT DEFAULT '101',
            status TEXT DEFAULT 'posted',
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT DEFAULT 'المستخدم'
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            journal_id TEXT,
            journal_number TEXT,
            entry_no TEXT UNIQUE,
            transaction_id TEXT DEFAULT '',
            date TEXT DEFAULT '',
            transaction_date TEXT DEFAULT CURRENT_TIMESTAMP,
            debit TEXT DEFAULT '',
            credit TEXT DEFAULT '',
            debit_account_id TEXT DEFAULT '',
            credit_account_id TEXT DEFAULT '',
            debit_code TEXT DEFAULT '',
            credit_code TEXT DEFAULT '',
            amount REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'YER',
            exchange_rate REAL DEFAULT 1.0,
            base_amount REAL DEFAULT 0.0,
            ref_type TEXT DEFAULT 'قيد يدوي',
            ref_id TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            statement TEXT DEFAULT '',
            description TEXT DEFAULT '',
            status TEXT DEFAULT 'posted',
            created_by TEXT DEFAULT 'المستخدم',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS journal_lines (
            line_id TEXT PRIMARY KEY,
            journal_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            account_code TEXT NOT NULL,
            debit REAL DEFAULT 0.0,
            credit REAL DEFAULT 0.0,
            description TEXT DEFAULT '',
            cost_center TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            entity_type TEXT DEFAULT 'account',
            entity_id TEXT DEFAULT '',
            old_value TEXT DEFAULT '',
            new_value TEXT DEFAULT '',
            user TEXT DEFAULT 'المستخدم',
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            source TEXT DEFAULT 'Web Application'
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS exchange_rates (
            currency_code TEXT PRIMARY KEY,
            currency_name TEXT,
            symbol TEXT,
            rate_to_yer REAL DEFAULT 1.0,
            is_base INTEGER DEFAULT 0,
            decimals INTEGER DEFAULT 2,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute("INSERT OR IGNORE INTO exchange_rates (currency_code, currency_name, symbol, rate_to_yer, is_base, decimals) VALUES ('YER', 'ريال يمني', '﷼', 1.0, 1, 0)")
    c.execute("INSERT OR IGNORE INTO exchange_rates (currency_code, currency_name, symbol, rate_to_yer, is_base, decimals) VALUES ('SAR', 'ريال سعودي', '﷼', 142.0, 0, 2)")
    c.execute("INSERT OR IGNORE INTO exchange_rates (currency_code, currency_name, symbol, rate_to_yer, is_base, decimals) VALUES ('USD', 'دولار أمريكي', '$', 535.0, 0, 2)")

    table_cols_needed = {
        'expenses': {
            'expense_no': 'TEXT',
            'category': 'TEXT',
            'amount': 'REAL DEFAULT 0.0',
            'currency': "TEXT DEFAULT 'YER'",
            'exchange_rate': 'REAL DEFAULT 1.0',
            'base_amount': 'REAL DEFAULT 0.0',
            'transaction_id': "TEXT DEFAULT ''",
            'date': "TEXT DEFAULT ''",
            'payment_method': "TEXT DEFAULT 'نقد (كاش)'",
            'recipient': "TEXT DEFAULT ''",
            'account_id': "TEXT DEFAULT '101'",
            'status': "TEXT DEFAULT 'posted'",
            'notes': "TEXT DEFAULT ''",
            'created_at': 'TEXT DEFAULT CURRENT_TIMESTAMP',
            'created_by': "TEXT DEFAULT 'المستخدم'"
        },
        'vouchers': {
            'voucher_no': 'TEXT',
            'voucher_type': "TEXT DEFAULT 'سند صرف'",
            'party_name': "TEXT DEFAULT ''",
            'amount': 'REAL DEFAULT 0.0',
            'currency': "TEXT DEFAULT 'YER'",
            'exchange_rate': 'REAL DEFAULT 1.0',
            'base_amount': 'REAL DEFAULT 0.0',
            'pay_method': "TEXT DEFAULT 'نقد (كاش)'",
            'transfer_no': "TEXT DEFAULT ''",
            'account_id': "TEXT DEFAULT '101'",
            'target_acc': "TEXT DEFAULT '201'",
            'date_created': "TEXT DEFAULT ''",
            'notes': "TEXT DEFAULT ''",
            'status': "TEXT DEFAULT 'posted'",
            'image_path': "TEXT DEFAULT ''",
            'created_at': 'TEXT DEFAULT CURRENT_TIMESTAMP'
        },
        'journal_entries': {
            'entry_no': 'TEXT',
            'transaction_id': "TEXT DEFAULT ''",
            'date': "TEXT DEFAULT ''",
            'transaction_date': 'TEXT DEFAULT CURRENT_TIMESTAMP',
            'debit': "TEXT DEFAULT ''",
            'credit': "TEXT DEFAULT ''",
            'debit_account_id': "TEXT DEFAULT ''",
            'credit_account_id': "TEXT DEFAULT ''",
            'debit_code': "TEXT DEFAULT ''",
            'credit_code': "TEXT DEFAULT ''",
            'amount': 'REAL DEFAULT 0.0',
            'currency': "TEXT DEFAULT 'YER'",
            'exchange_rate': 'REAL DEFAULT 1.0',
            'base_amount': 'REAL DEFAULT 0.0',
            'ref_type': "TEXT DEFAULT 'قيد يدوي'",
            'ref_id': "TEXT DEFAULT ''",
            'notes': "TEXT DEFAULT ''",
            'statement': "TEXT DEFAULT ''",
            'description': "TEXT DEFAULT ''",
            'status': "TEXT DEFAULT 'posted'",
            'created_by': "TEXT DEFAULT 'المستخدم'",
            'created_at': 'TEXT DEFAULT CURRENT_TIMESTAMP'
        }
    }

    for tbl, cols_map in table_cols_needed.items():
        try:
            c.execute(f"PRAGMA table_info({tbl})")
            existing = set(r[1] if isinstance(r, (list, tuple)) else r['name'] for r in c.fetchall())
            for col, col_def in cols_map.items():
                if col not in existing:
                    try:
                        c.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_def}")
                    except Exception:
                        pass
        except Exception:
            pass

    for tbl in ('purchases', 'sales_orders', 'orders'):
        try:
            c.execute(f"PRAGMA table_info({tbl})")
            cols = set(r[1] if isinstance(r, (list, tuple)) else r['name'] for r in c.fetchall())
            if 'exchange_rate' not in cols:
                c.execute(f"ALTER TABLE {tbl} ADD COLUMN exchange_rate REAL DEFAULT 1.0")
            if 'base_amount' not in cols:
                c.execute(f"ALTER TABLE {tbl} ADD COLUMN base_amount REAL DEFAULT 0.0")
            if 'currency' not in cols:
                c.execute(f"ALTER TABLE {tbl} ADD COLUMN currency TEXT DEFAULT 'YER'")
        except Exception:
            pass

    c.execute('''
        CREATE TABLE IF NOT EXISTS sync_status (
            id INTEGER PRIMARY KEY DEFAULT 1,
            connected INTEGER DEFAULT 1,
            status_label TEXT DEFAULT '🟢 متصل',
            last_sync TEXT DEFAULT CURRENT_TIMESTAMP,
            message TEXT DEFAULT 'المزامنة سارية وبحالة جيدة'
        )
    ''')
    c.execute("INSERT OR IGNORE INTO sync_status (id, connected, status_label, last_sync, message) VALUES (1, 1, '🟢 متصل', CURRENT_TIMESTAMP, 'المزامنة سارية وبحالة جيدة')")
