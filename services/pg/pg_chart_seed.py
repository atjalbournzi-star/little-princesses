# services/pg/pg_chart_seed.py
# Default Standard Chart of Accounts Seeder for Little Princesses ERP

import logging
logger = logging.getLogger('DB_CLIENT')

DEFAULT_CHART_OF_ACCOUNTS = [
    # ── 1. الأصول (Assets) ──
    ('ACC-1', '1', 'الأصول', 'Assets', 'أصول', 'Assets', None, None, 1, True, False, 'Debit', 'YER'),
    ('ACC-101', '101', 'الصندوق الرئيسي (خزينة الورشة)', 'Main Cash Vault', 'أصول', 'Cash', 'ACC-1', '1', 2, True, False, 'Debit', 'YER'),
    ('ACC-101-1', '101.1', 'صندوق النقدية الرئيسي (YER)', 'Main Cash Box (YER)', 'أصول', 'Cash', 'ACC-101', '101', 3, False, True, 'Debit', 'YER'),
    ('ACC-101-2', '101.2', 'صندوق الريال السعودي (SAR)', 'Saudi Riyal Cash (SAR)', 'أصول', 'Cash', 'ACC-101', '101', 3, False, True, 'Debit', 'SAR'),
    ('ACC-101-3', '101.3', 'صندوق الدولار الأمريكي (USD)', 'US Dollar Cash (USD)', 'أصول', 'Cash', 'ACC-101', '101', 3, False, True, 'Debit', 'USD'),
    ('ACC-102', '102', 'البنوك والمحافظ الرقمية والشبكات', 'Banks & E-Wallets', 'أصول', 'Banks', 'ACC-1', '1', 2, True, False, 'Debit', 'YER'),
    ('ACC-102-1', '102.01', 'حساب بنك اليمن والكويت', 'Yemen Kuwait Bank', 'أصول', 'Banks', 'ACC-102', '102', 3, False, True, 'Debit', 'YER'),
    ('ACC-102-2', '102.02', 'حساب بنك الكريمي / المحافظ (YER)', 'Kuraimi Bank / E-Wallets', 'أصول', 'Banks', 'ACC-102', '102', 3, False, True, 'Debit', 'YER'),
    ('ACC-104', '104', 'ذمم العملاء (حسابات القبض)', 'Accounts Receivable', 'أصول', 'Receivables', 'ACC-1', '1', 2, False, True, 'Debit', 'YER'),
    ('ACC-105', '105', 'مخزون الأقمشة والخامات ومستلزمات الخياطة', 'Fabric & Raw Materials Inventory', 'أصول', 'Inventory', 'ACC-1', '1', 2, False, True, 'Debit', 'YER'),
    ('ACC-106', '106', 'الأصول الثابتة (ماكينات وتجهيزات المعمل)', 'Fixed Assets (Machinery)', 'أصول', 'Fixed_Assets', 'ACC-1', '1', 2, False, True, 'Debit', 'YER'),
    ('ACC-107', '107', 'سلف الخياطين والعاملين', 'Tailor & Staff Advances', 'أصول', 'Advances', 'ACC-1', '1', 2, False, True, 'Debit', 'YER'),

    # ── 2. الخصوم والالتزامات (Liabilities) ──
    ('ACC-2', '2', 'الخصوم والالتزامات', 'Liabilities', 'خصوم', 'Liabilities', None, None, 1, True, False, 'Credit', 'YER'),
    ('ACC-201', '201', 'ذمم الموردين ومحلات الأقمشة', 'Accounts Payable', 'خصوم', 'Payables', 'ACC-2', '2', 2, False, True, 'Credit', 'YER'),
    ('ACC-202', '202', 'أمانات وعربونات العملاء المقدمة', 'Customer Deposits & Advances', 'خصوم', 'Customer_Deposits', 'ACC-2', '2', 2, False, True, 'Credit', 'YER'),

    # ── 3. حقوق الملكية (Equity) ──
    ('ACC-3', '3', 'حقوق الملكية', 'Equity', 'حقوق ملكية', 'Equity', None, None, 1, True, False, 'Credit', 'YER'),
    ('ACC-301', '301', 'رأس المال المباشر وحسابات الشركاء', 'Direct Capital & Partners', 'حقوق ملكية', 'Capital', 'ACC-3', '3', 2, True, False, 'Credit', 'YER'),
    ('ACC-301-2', '301.02', 'رأس مال المؤسسة التأسيسي', 'Establishment Capital', 'حقوق ملكية', 'Capital', 'ACC-301', '301', 3, False, True, 'Credit', 'YER'),
    ('ACC-302', '302', 'الأرباح والخسائر المرحلة (المحتجزة)', 'Retained Earnings', 'حقوق ملكية', 'Retained_Earnings', 'ACC-3', '3', 2, False, True, 'Credit', 'YER'),

    # ── 4. الإيرادات (Revenue) ──
    ('ACC-4', '4', 'الإيرادات والمبيعات', 'Revenue & Sales', 'إيرادات', 'Revenue', None, None, 1, True, False, 'Credit', 'YER'),
    ('ACC-401', '401', 'إيرادات تفصيل وتصميم الفساتين والزي المدرسي', 'Tailoring & Dress Sales Revenue', 'إيرادات', 'Sales', 'ACC-4', '4', 2, False, True, 'Credit', 'YER'),
    ('ACC-402', '402', 'أرباح فروق أسعار الصرف', 'Foreign Exchange Gains', 'إيرادات', 'Exchange_Gain', 'ACC-4', '4', 2, False, True, 'Credit', 'YER'),

    # ── 5. المصروفات وتكاليف الإنتاج (Expenses) ──
    ('ACC-5', '5', 'المصروفات والتكاليف التشغيلية', 'Operating Expenses & Costs', 'مصروفات', 'Expenses', None, None, 1, True, False, 'Debit', 'YER'),
    ('ACC-501', '501', 'أجور ورواتب الخياطين والمطرزين وموظفي المعمل', 'Direct Tailoring Wages & Salaries', 'مصروفات', 'Salaries', 'ACC-5', '5', 2, False, True, 'Debit', 'YER'),
    ('ACC-502', '502', 'إيجار ورشة الخياطة والمعرض', 'Workshop & Showroom Rent', 'مصروفات', 'Rent', 'ACC-5', '5', 2, False, True, 'Debit', 'YER'),
    ('ACC-503', '503', 'مصاريف الكهرباء والماء وخدمات الطاقة', 'Utilities', 'مصروفات', 'Utilities', 'ACC-5', '5', 2, False, True, 'Debit', 'YER'),
    ('ACC-504', '504', 'تكلفة الأقمشة والخامات ومستلزمات الإنتاج', 'Fabric & Raw Materials Consumed (COGS)', 'تكلفة المبيعات', 'COGS', 'ACC-5', '5', 2, False, True, 'Debit', 'YER'),
    ('ACC-505', '505', 'مصاريف الصيانة وقطع الغيار والتسويق والإدارة', 'Maintenance, Marketing & Admin', 'مصروفات', 'General_Expenses', 'ACC-5', '5', 2, False, True, 'Debit', 'YER'),
    ('ACC-506', '506', 'خسائر فروق أسعار الصرف', 'Foreign Exchange Losses', 'مصروفات', 'Exchange_Loss', 'ACC-5', '5', 2, False, True, 'Debit', 'YER')
]


def ensure_chart_of_accounts_seed(cur):
    """التحقق من وجود الحسابات التأسيسية لشجرة الحسابات وزرعها إذا كانت مفقودة دون مساس بالحسابات المضافة"""
    try:
        cur.execute("SELECT COUNT(*) as count FROM chart_of_accounts WHERE account_code IN ('1', '2', '3', '4', '5');")
        row = cur.fetchone()
        roots_count = row['count'] if row and 'count' in row else 0
        
        insert_query = """
            INSERT INTO chart_of_accounts (
                id, account_code, account_name, account_name_en, account_type,
                account_category, parent_account_id, parent_account_code, level,
                is_group, is_postable, normal_balance, currency
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (account_code) DO NOTHING;
        """
        for item in DEFAULT_CHART_OF_ACCOUNTS:
            cur.execute(insert_query, item)

        # ربط الحساب 301.01 بالحساب الأب 301 وبحقوق الملكية وتحديث المستويات
        cur.execute("""
            UPDATE chart_of_accounts SET is_group = TRUE, is_postable = FALSE WHERE account_code = '301';
            UPDATE chart_of_accounts SET parent_account_code = '301', parent_account_id = 'ACC-301', level = 3
            WHERE account_code = '301.01';
        """)
        
        if roots_count < 5:
            logger.info("✅ تم تثبيت شجرة الحسابات التأسيسية وربط الحسابات الشجرية بنجاح.")
    except Exception as e:
        logger.warning(f"⚠️ تنبيه فحص شجرة الحسابات: {e}")
