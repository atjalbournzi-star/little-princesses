import sqlite3
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
DB_FILE = 'little_princesses.db'

def seed_database():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    # Drop existing tables to recreate clean schema with seed data
    c.execute("DROP TABLE IF EXISTS customers")
    c.execute("DROP TABLE IF EXISTS orders")
    c.execute("DROP TABLE IF EXISTS inventory")
    c.execute("DROP TABLE IF EXISTS accounts")
    c.execute("DROP TABLE IF EXISTS vouchers")
    c.execute("DROP TABLE IF EXISTS products")
    c.execute("DROP TABLE IF EXISTS journal_entries")
    c.execute("DROP TABLE IF EXISTS purchases")
    c.execute("DROP TABLE IF EXISTS expenses")
    c.execute("DROP TABLE IF EXISTS factory")

    # 1. Customers Table
    c.execute('''
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
    ''')

    customers = [
        ('أميرة الأهدل', '771234567', 'واتساب', '@amira_ahdal', 'صنعاء - حدة', 'سم (cm)', '140', '38', '94', '78', '60', '42', 'فستان سهرة مطرز بحبات اللؤلؤ على الصدر والأكمام', '2026-07-20'),
        ('سارة الكبسي', '777888999', 'انستغرام (Instagram)', '@sara_kibsi', 'صنعاء - الأصبحي', 'سم (cm)', '135', '36', '88', '72', '58', '40', 'فستان كاجوال مخمل ملكي أحمر مع كسرات خصر', '2026-07-22'),
        ('فاطمة المحضار', '733445566', 'واتساب', '', 'صنعاء - الستين', 'سم (cm)', '145', '40', '98', '82', '62', '44', 'فستان زفاف دانتيل فرنسي بطرحة طويلة 3 متر', '2026-07-25'),
        ('ياسمين الضبيبي', '711223344', 'تيك توك (TikTok)', '@yasmine_d', 'صنعاء - شارع بغداد', 'سم (cm)', '130', '35', '84', '68', '56', '38', 'طقم زي مدرسي موحد 3 قطع (تنورة وجاكيت وقميص)', '2026-07-28'),
        ('مريم العرشي', '775511223', 'فيسبوك (Facebook)', '@maryam_arshi', 'صنعاء - بيت بوس', 'سم (cm)', '138', '37', '90', '74', '59', '41', 'فستان خطوبة شيفون ناعم مع حزام ذهبي', '2026-07-30')
    ]

    for cust in customers:
        c.execute('''
            INSERT INTO customers (name, phone, social_platform, social_handle, address, unit, total_length, shoulder_width, bust_circ, waist_circ, sleeve_length, chest_length, sizes_notes, reg_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', cust)

    # 2. Orders Table
    c.execute('''
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
    ''')

    orders = [
        ('ORD-2026-001', 'أميرة الأهدل', 'فستان سهرة لؤلؤي ملكي', 1, 'حوالة بنكية', 'TR-9982', '2026-07-20', '2026-08-05', 'الساعة 5 مساءً', 5.0, 'جاهز بالمعمل', 'تفصيل خاص مع تطريز يدوي', 'قيد الخياطة 🪡', 180.0, 100.0, 80.0, 'USD $', 65.0),
        ('ORD-2026-002', 'سارة الكبسي', 'فستان مخمل أحمر ملكي', 1, 'نقد (كاش)', '', '2026-07-22', '2026-08-01', 'الساعة 4 مساءً', 0.0, 'متوفر بالورشة', 'تحديد خصر دقيق مع بطانة حرير', 'مرحلة القص ✂️', 120.0, 60.0, 60.0, 'USD $', 45.0),
        ('ORD-2026-003', 'فاطمة المحضار', 'فستان زفاف دانتيل فرنسي', 1, 'حوالة بنكية', 'TR-1044', '2026-07-15', '2026-08-15', 'الساعة 6 مساءً', 10.0, 'تم التوريد', 'طرحة 3 أمتار مطرزة بجوانب كريستال', 'التطريز والتركيب 👑', 350.0, 200.0, 150.0, 'USD $', 140.0),
        ('ORD-2026-004', 'ياسمين الضبيبي', 'زي مدرسي موحد (3 قطع)', 2, 'نقد (كاش)', '', '2026-07-25', '2026-08-10', 'الساعة 3 مساءً', 0.0, 'متوفر بالورشة', 'مقاسات مدرسية خاصة', 'جاهز للتسليم 🎁', 80.0, 80.0, 0.0, 'USD $', 30.0),
        ('ORD-2026-005', 'مريم العرشي', 'فستان خطوبة شيفون ناعم', 1, 'نقد (كاش)', '', '2026-07-26', '2026-08-12', 'الساعة 4 مساءً', 0.0, 'متوفر بالورشة', 'حزام ذهبي مطعم باللؤلؤ', 'قيد الخياطة 🪡', 160.0, 80.0, 80.0, 'USD $', 55.0)
    ]

    for ord in orders:
        c.execute('''
            INSERT INTO orders (order_no, customer_name, product_name, quantity, pay_method, transfer_no, order_date, delivery_date, pickup_time, delivery_fee, fabric_status, custom_notes, status, total_amount, paid_amount, remaining_amount, currency, profit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ord)

    # 3. Inventory Table
    c.execute('''
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
    ''')

    inventory_items = [
        ('قماش حرير ياباني طبيعي', 'أقمشة فاخرة', 85.0, 12.0, 15.0, 'USD $', '2026-07-10', 'مخصص لبطانات الفساتين السهرة'),
        ('قماش مخمل ملكي أحمر', 'أقمشة سهرة', 42.0, 18.0, 10.0, 'USD $', '2026-07-12', 'خامة شتوية ممتازة فائقة النعومة'),
        ('دانتيل فرنسي مطرز كريستال', 'دانتيل وإكسسوارات', 28.0, 35.0, 8.0, 'USD $', '2026-07-15', 'خاص بفساتين الأعراس والزفاف'),
        ('شيفون ناعم درجات الوردي', 'أقمشة خفيفة', 110.0, 8.0, 20.0, 'USD $', '2026-07-18', 'مناسب لفساتين الخطوبة والبنات'),
        ('قماش كريب مطاط زي مدرسي', 'أقمشة مدرسية', 150.0, 6.0, 25.0, 'USD $', '2026-07-20', 'مقاوم للتجعد والغسيل المتكرر'),
        ('خيوط خياطة ألماني مجمعة', 'مستلزمات خياطة', 200.0, 1.5, 30.0, 'USD $', '2026-07-22', 'مجموعة ألوان كاملة 50 بكرة'),
        ('سحابات مخفية كريستال 60سم', 'مستلزمات خياطة', 120.0, 1.0, 20.0, 'USD $', '2026-07-25', 'سحابات فساتين سهرة عالي الجودة')
    ]

    for inv in inventory_items:
        c.execute('''
            INSERT INTO inventory (item_name, category, quantity_meters, cost_per_meter, min_alert_qty, currency, supply_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', inv)

    # 4. Accounts Table
    c.execute('''
        CREATE TABLE accounts (
            acc_code INTEGER PRIMARY KEY,
            acc_name TEXT NOT NULL,
            acc_type TEXT NOT NULL,
            balance REAL DEFAULT 0.0,
            created_date TEXT DEFAULT '2026-01-01'
        )
    ''')

    accounts = [
        (101, "الصندوق الرئيسي (خزينة الورشة)", "أصول متداولة", 420.0, '2026-01-01'),
        (102, "حساب بنك اليمن والكويت / المحافظ الرقمية", "أصول متداولة", 850.0, '2026-01-01'),
        (104, "ذمم العملاء (مستحقات خارجيّة متفتحة)", "أصول متداولة", 370.0, '2026-01-01'),
        (105, "مخزون الأقمشة والخامات ومستلزمات الخياطة", "أصول متداولة", 1450.0, '2026-01-01'),
        (106, "الأصول الثابتة (ماكينات خياطة وتطريز ومكابس)", "أصول ثابتة", 3200.0, '2026-01-01'),
        (201, "ذمم الموردين ومحلات الأقمشة", "التزامات متداولة", 280.0, '2026-01-01'),
        (202, "عرابين وأمانات عملاء الفساتين", "التزامات متداولة", 520.0, '2026-01-01'),
        (301, "رأس المال المباشر لمؤسسة Little Princesses", "حقوق ملكية", 5000.0, '2026-01-01'),
        (401, "إيرادات تفصيل خياطة الفساتين والزي المدرسي", "إيرادات النشاط", 1890.0, '2026-01-01'),
        (501, "أجور ورواتب الخياطين والمطرزين", "مصاريف تشغيلية", 450.0, '2026-01-01'),
        (502, "إيجار ورشة الخياطة والمعمل", "مصاريف تشغيلية", 300.0, '2026-01-01'),
        (503, "مصاريف الكهرباء والماء والصيانة", "مصاريف تشغيلية", 90.0, '2026-01-01')
    ]

    for acc in accounts:
        c.execute('''
            INSERT INTO accounts (acc_code, acc_name, acc_type, balance, created_date)
            VALUES (?, ?, ?, ?, ?)
        ''', acc)

    # 5. Vouchers Table
    c.execute('''
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
    ''')

    vouchers = [
        ('VOUCH-1001', 'قبض عربون', 'حوالة بنكية', 'TR-9982', '', 'أميرة الأهدل', 100.0, 'USD $', '2026-07-20', 'عربون تفصيل فستان سهرة لؤلؤي ملكي'),
        ('VOUCH-1002', 'صرف مصاريف', 'نقد (كاش)', '', '', 'مؤسسة البركة للأقمشة', 150.0, 'USD $', '2026-07-21', 'شراء شحنة أقمشة مخمل ودانتيل'),
        ('VOUCH-1003', 'قبض عربون', 'نقد (كاش)', '', '', 'سارة الكبسي', 60.0, 'USD $', '2026-07-22', 'عربون فستان مخمل أحمر ملكي'),
        ('VOUCH-1004', 'صرف أجور', 'نقد (كاش)', '', '', 'معلم خياطة محمود', 80.0, 'USD $', '2026-07-24', 'دفعة من أجور خياطة طلبيات الأسبوع'),
        ('VOUCH-1005', 'قبض كامل', 'نقد (كاش)', '', '', 'ياسمين الضبيبي', 80.0, 'USD $', '2026-07-25', 'تسديد كامل قيمة الزي المدرسي الموحد')
    ]

    for v in vouchers:
        c.execute('''
            INSERT INTO vouchers (voucher_no, voucher_type, pay_method, transfer_no, image_path, party_name, amount, currency, date_created, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', v)

    # 6. Products Table
    c.execute('''
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
    ''')

    products = [
        ('فستان سهرة لؤلؤي ملكي', '(Princess) فستان أميرة', 'قماش حرير ياباني طبيعي', 3.5, 42.0, 70.0, 10.0, 122.0, 180.0, 'USD $', 58.0, '2026-07-20'),
        ('فستان زفاف دانتيل فرنسي', 'فساتين زفاف', 'دانتيل فرنسي مطرز كريستال', 4.0, 140.0, 120.0, 15.0, 275.0, 350.0, 'USD $', 75.0, '2026-07-22'),
        ('فستان خطوبة شيفون ناعم', 'فساتين خطوبة', 'شيفون ناعم درجات الوردي', 3.0, 24.0, 60.0, 10.0, 94.0, 160.0, 'USD $', 66.0, '2026-07-25')
    ]

    for p in products:
        c.execute('''
            INSERT INTO products (name, category, fabric_name, yards_used, fabric_cost, labor_cost, packaging_cost, total_cost, selling_price, currency, profit, calc_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', p)

    # 7. Journal Entries Table
    c.execute('''
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
    ''')

    journal_entries = [
        ('ENT-501', '101 - الصندوق / الخزينة الرئيسية', '401 - إيرادات مبيعات الفساتين والزي', 100.0, 'USD $', 'فاتورة مبيعات', '2026-07-20', 'عربون طلب فستان أميرة الأهدل'),
        ('ENT-502', '102 - مخزون الأقمشة والمستلزمات', '101 - الصندوق / الخزينة الرئيسية', 150.0, 'USD $', 'فاتورة مشتريات', '2026-07-21', 'شراء أقمشة ودانتيل من المورد'),
        ('ENT-503', '502 - إيجار الورشة والمعمل والمحل الرئيسي', '101 - الصندوق / الخزينة الرئيسية', 150.0, 'USD $', 'مصروف تشغيلي', '2026-07-01', 'إيجار الورشة لشهر يوليو')
    ]

    for j in journal_entries:
        c.execute('''
            INSERT INTO journal_entries (entry_no, debit, credit, amount, currency, ref_type, date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', j)

    # 8. Purchases Table
    c.execute('''
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
    ''')

    purchases = [
        ('BILL-8891', 'مؤسسة البركة للأقمشة', 'قماش مخمل ملكي أحمر', 50.0, 18.0, 'USD $', 'آجل (على الحساب)', '', '201 - ذمم الموردين ومحلات الأقمشة (آجل)', '2026-07-10'),
        ('BILL-8892', 'مورد الدانتيل الفرنسي', 'دانتيل فرنسي مطرز كريستال', 30.0, 35.0, 'USD $', 'حوالة بنكية', 'TR-99812', '103 - الحساب البنكي / الحوالات والمافظ', '2026-07-12')
    ]

    for pur in purchases:
        c.execute('''
            INSERT INTO purchases (bill_no, supplier, item, qty, price, currency, pay_type, transfer_no, payment_source, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', pur)

    # 9. Expenses Table
    c.execute('''
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
    ''')

    expenses = [
        ('502 - إيجار الورشة والمعمل والمحل الرئيسي', 150.0, 'USD $', 'نقد (كاش)', '101 - الصندوق / الخزينة الرئيسية', '2026-07-01', 'إيجار الورشة والمعمل لشهر يوليو'),
        ('503 - كهرباء وماء وإنترنت واستضافة المتجر', 90.0, 'USD $', 'نقد (كاش)', '101 - الصندوق / الخزينة الرئيسية', '2026-07-05', 'سداد فاتورة الكهرباء والإنترنت')
    ]

    for exp in expenses:
        c.execute('''
            INSERT INTO expenses (exp_type, amount, currency, pay_method, source_acc, date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', exp)

    # 10. Factory Table
    c.execute('''
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
    ''')

    factory_items = [
        ('ORD-2026-001', 'أميرة الأهدل', 'فستان سهرة مطرز', 'معلم محمود', 'مرحلة التطريز والتركيب 👑', 75, '2026-07-21', '2026-08-05', 'تطريز لؤلؤي يدوي على الصدر والخصر'),
        ('ORD-2026-002', 'سارة الكبسي', 'فستان مخمل أحمر', 'معلمة فاطمة', 'مرحلة القص والتحضير ✂️', 30, '2026-07-23', '2026-08-01', 'كسرات خصر دقيقة وبطانة حرير')
    ]

    for fac in factory_items:
        c.execute('''
            INSERT INTO factory (order_no, customer_name, product_name, tailor, stage, progress, start_date, due_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', fac)

    conn.commit()
    conn.close()
    print("✅ Database seeded successfully into SQLite tables (little_princesses.db)!")

if __name__ == '__main__':
    seed_database()
