# domains/accounting/db_accounts.py
# Accounts table and audit log schema & migration

def init_accounts_table(c):
    c.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id TEXT UNIQUE,
            account_code TEXT UNIQUE,
            account_name TEXT,
            account_name_en TEXT DEFAULT '',
            account_type TEXT DEFAULT 'أصول',
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
            parent_id INTEGER NULL,
            nature TEXT DEFAULT 'debit',
            sort_order INTEGER DEFAULT 0,
            balance REAL DEFAULT 0.0,
            acc_code TEXT,
            acc_name TEXT,
            acc_type TEXT,
            created_date TEXT
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS account_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER,
            account_code TEXT,
            action TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            user_name TEXT DEFAULT 'المستخدم',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute("PRAGMA table_info(accounts)")
    existing_cols = set(r[1] if isinstance(r, (list, tuple)) else r['name'] for r in c.fetchall())
    
    needed_cols = {
        'account_id': 'TEXT',
        'account_code': 'TEXT',
        'account_name': 'TEXT',
        'account_name_en': "TEXT DEFAULT ''",
        'account_type': "TEXT DEFAULT 'أصول'",
        'account_category': "TEXT DEFAULT ''",
        'parent_account_id': "TEXT DEFAULT ''",
        'parent_account_code': "TEXT DEFAULT ''",
        'level': 'INTEGER DEFAULT 1',
        'account_path': "TEXT DEFAULT ''",
        'is_group': 'INTEGER DEFAULT 0',
        'is_postable': 'INTEGER DEFAULT 1',
        'is_active': 'INTEGER DEFAULT 1',
        'normal_balance': "TEXT DEFAULT 'debit'",
        'opening_balance': 'REAL DEFAULT 0.0',
        'current_balance': 'REAL DEFAULT 0.0',
        'balance_type': "TEXT DEFAULT 'debit'",
        'currency': "TEXT DEFAULT 'YER'",
        'establishment_date': "TEXT DEFAULT ''",
        'notes': "TEXT DEFAULT ''",
        'created_at': 'TEXT DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'TEXT DEFAULT CURRENT_TIMESTAMP',
        'created_by': "TEXT DEFAULT 'النظام'",
        'updated_by': "TEXT DEFAULT 'النظام'",
        'code': 'TEXT',
        'name': 'TEXT',
        'parent_id': 'INTEGER NULL',
        'nature': "TEXT DEFAULT 'debit'",
        'sort_order': 'INTEGER DEFAULT 0',
        'balance': 'REAL DEFAULT 0.0',
        'acc_code': 'TEXT',
        'acc_name': 'TEXT',
        'acc_type': 'TEXT',
        'created_date': 'TEXT'
    }
    for col, col_def in needed_cols.items():
        if col not in existing_cols:
            try: c.execute(f"ALTER TABLE accounts ADD COLUMN {col} {col_def}")
            except Exception: pass
