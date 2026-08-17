import sqlite3
import datetime
import os
import shutil
import csv
import urllib.parse
import webbrowser
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from PIL import Image, ImageTk

# محاولة استيراد مكتبة qrcode
try:
    import qrcode
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False

# ==========================================
# 1. تأسيس قاعدة البيانات وتحديث الجداول v16.0
# ==========================================
def init_full_erp_db():
    conn = sqlite3.connect('little_princesses.db')
    cursor = conn.cursor()

    if not os.path.exists('voucher_images'):
        os.makedirs('voucher_images')
    if not os.path.exists('qr_codes'):
        os.makedirs('qr_codes')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')

    default_settings = [
        ('store_name', 'مؤسسة Little Princesses 👑'),
        ('backup_email', 'backup@littleprincesses.com'),
        ('printer_type', 'طابعة حرارية 80mm (Thermal POS)'),
        ('currency', '$')
    ]
    for key, val in default_settings:
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, val))

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')

    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [
            ('admin', '1234', 'المدير العام'),
            ('cashier', '1234', 'كاشير ومبيعات'),
            ('workshop', '1234', 'مديرة الورشة')
        ])

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vouchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_no TEXT UNIQUE,
            voucher_type TEXT NOT NULL,
            pay_method TEXT DEFAULT 'نقد (كاش)',
            transfer_no TEXT DEFAULT '',
            image_path TEXT DEFAULT '',
            party_name TEXT NOT NULL,
            amount REAL NOT NULL,
            date_created TEXT,
            notes TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT,
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
            rating TEXT DEFAULT 'بانتظار التقييم ⏳',
            alteration_notes TEXT DEFAULT '',
            total_amount REAL DEFAULT 0.0,
            paid_amount REAL DEFAULT 0.0,
            remaining_amount REAL DEFAULT 0.0,
            profit REAL DEFAULT 0.0,
            qr_code_path TEXT DEFAULT ''
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_no TEXT,
            entry_date TEXT,
            debit_acc TEXT,
            credit_acc TEXT,
            amount REAL,
            notes TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            selling_price REAL NOT NULL,
            fabric_cost REAL DEFAULT 0,
            tailoring_cost REAL DEFAULT 0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            social_platform TEXT DEFAULT 'انستغرام',
            social_handle TEXT DEFAULT '',
            address TEXT,
            unit TEXT DEFAULT 'سم (cm)',
            total_length TEXT,
            shoulder_width TEXT,
            bust_circ TEXT,
            waist_circ TEXT,
            sleeve_length TEXT,
            chest_length TEXT,
            sizes_notes TEXT
        )
    ''')

    # جدول مخزون الأقمشة والمستلزمات
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL,
            quantity_meters REAL DEFAULT 0.0,
            cost_per_meter REAL DEFAULT 0.0,
            min_alert_qty REAL DEFAULT 5.0,
            notes TEXT DEFAULT ''
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS accounts (
            acc_code INTEGER PRIMARY KEY,
            acc_name TEXT NOT NULL,
            acc_type TEXT NOT NULL,
            balance REAL DEFAULT 0.0
        )
    ''')

    # Seed Accounts if empty or if all balances are zero
    cursor.execute("SELECT COUNT(*) FROM accounts WHERE balance > 0")
    if cursor.fetchone()[0] == 0:
        cursor.execute("DELETE FROM accounts")
        full_accounts = [
            (101, "الصندوق / الخزينة الرئيسية", "أصول", 420.0),
            (102, "مخزون الأقمشة والمستلزمات", "أصول", 1450.0),
            (103, "الحساب البنكي / الحوالات", "أصول", 850.0),
            (104, "ذمم العملاء (مستحقات خارجية)", "أصول", 370.0),
            (105, "الأصول الثابتة (آلات ومعدات)", "أصول", 3200.0),
            (201, "مستحقات الخياطين والموردين", "خصوم", 280.0),
            (202, "عرابين وأمانات العملاء", "خصوم", 520.0),
            (301, "رأس المال", "حقوق ملكية", 5000.0),
            (302, "المسحوبات الشخصية", "حقوق ملكية", 0.0),
            (401, "إيرادات مبيعات الفساتين والزي", "إيرادات", 1890.0),
            (402, "إيرادات خدمات وتعديلات الخياطة", "إيرادات", 350.0),
            (501, "مصاريف الخياطة والتشغيل المباشرة", "مصاريف", 450.0),
            (502, "أجور ومرتبات العاملين والخياطين", "مصاريف", 300.0),
            (503, "إيجار المحل والورشة", "مصاريف", 150.0),
            (504, "مصاريف كهرباء وماء وانترنت", "مصاريف", 90.0),
            (505, "مصاريف التسويق والإعلانات", "مصاريف", 50.0),
            (506, "مصاريف صيانة الآلات والمعدات", "مصاريف", 40.0)
        ]
        cursor.executemany("INSERT INTO accounts VALUES (?, ?, ?, ?)", full_accounts)

    # Seed Customers if empty
    cursor.execute("SELECT COUNT(*) FROM customers")
    if cursor.fetchone()[0] == 0:
        customers = [
            ('أميرة الأهدل', '771234567', 'واتساب', '@amira_ahdal', 'صنعاء - حدة', 'سم (cm)', '140', '38', '94', '78', '60', '42', 'فستان سهرة مطرز بحبات اللؤلؤ على الصدر والأكمام'),
            ('سارة الكبسي', '777888999', 'انستغرام', '@sara_kibsi', 'صنعاء - الأصبحي', 'سم (cm)', '135', '36', '88', '72', '58', '40', 'فستان كاجوال مخمل ملكي أحمر مع كسرات خصر'),
            ('فاطمة المحضار', '733445566', 'واتساب', '', 'صنعاء - الستين', 'سم (cm)', '145', '40', '98', '82', '62', '44', 'فستان زفاف دانتيل فرنسي بطرحة طويلة 3 متر'),
            ('ياسمين الضبيبي', '711223344', 'تيك توك', '@yasmine_d', 'صنعاء - شارع بغداد', 'سم (cm)', '130', '35', '84', '68', '56', '38', 'طقم زي مدرسي موحد 3 قطع (تنورة وجاكيت وقميص)'),
            ('مريم العرشي', '775511223', 'واتساب', '', 'صنعاء - بيت بوس', 'سم (cm)', '138', '37', '90', '74', '59', '41', 'فستان خطوبة شيفون ناعم مع حزام ذهبي')
        ]
        cursor.executemany('''
            INSERT INTO customers (name, phone, social_platform, social_handle, address, unit, total_length, shoulder_width, bust_circ, waist_circ, sleeve_length, chest_length, sizes_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', customers)

    # Seed Orders if empty
    cursor.execute("SELECT COUNT(*) FROM orders")
    if cursor.fetchone()[0] == 0:
        orders = [
            ('ORD-2026-001', 'أميرة الأهدل', 'فستان سهرة لؤلؤي ملكي', 1, 'حوالة بنكية', 'TR-9982', '2026-07-20', '2026-08-05', 'الساعة 5 مساءً', 5.0, 'جاهز بالمعمل', 'تفصيل خاص مع تطريز يدوي', 'قيد الخياطة 🪡', 'ممتاز ⭐⭐⭐⭐⭐', '', 180.0, 100.0, 80.0, 65.0, ''),
            ('ORD-2026-002', 'سارة الكبسي', 'فستان مخمل أحمر ملكي', 1, 'نقد (كاش)', '', '2026-07-22', '2026-08-01', 'الساعة 4 مساءً', 0.0, 'متوفر بالورشة', 'تحديد خصر دقيق مع بطانة حرير', 'مرحلة القص ✂️', 'ممتاز ⭐⭐⭐⭐⭐', '', 120.0, 60.0, 60.0, 45.0, ''),
            ('ORD-2026-003', 'فاطمة المحضار', 'فستان زفاف دانتيل فرنسي', 1, 'حوالة بنكية', 'TR-1044', '2026-07-15', '2026-08-15', 'الساعة 6 مساءً', 10.0, 'تم التوريد', 'طرحة 3 أمتار مطرزة بجوانب كريستال', 'التطريز والتركيب 👑', 'ممتاز ⭐⭐⭐⭐⭐', '', 350.0, 200.0, 150.0, 140.0, ''),
            ('ORD-2026-004', 'ياسمين الضبيبي', 'زي مدرسي موحد (3 قطع)', 2, 'نقد (كاش)', '', '2026-07-25', '2026-08-10', 'الساعة 3 مساءً', 0.0, 'متوفر بالورشة', 'مقاسات مدرسية خاصة', 'جاهز للتسليم 🎁', 'ممتاز ⭐⭐⭐⭐⭐', '', 80.0, 80.0, 0.0, 30.0, ''),
            ('ORD-2026-005', 'مريم العرشي', 'فستان خطوبة شيفون ناعم', 1, 'نقد (كاش)', '', '2026-07-26', '2026-08-12', 'الساعة 4 مساءً', 0.0, 'متوفر بالورشة', 'حزام ذهبي مطعم باللؤلؤ', 'قيد الخياطة 🪡', 'ممتاز ⭐⭐⭐⭐⭐', '', 160.0, 80.0, 80.0, 55.0, '')
        ]
        cursor.executemany('''
            INSERT INTO orders (order_no, customer_name, product_name, quantity, pay_method, transfer_no, order_date, delivery_date, pickup_time, delivery_fee, fabric_status, custom_notes, status, rating, alteration_notes, total_amount, paid_amount, remaining_amount, profit, qr_code_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', orders)

    # Seed Inventory if empty
    cursor.execute("SELECT COUNT(*) FROM inventory")
    if cursor.fetchone()[0] == 0:
        inventory_items = [
            ('قماش حرير ياباني طبيعي', 'أقمشة فاخرة', 85.0, 12.0, 15.0, 'مخصص لبطانات الفساتين السهرة'),
            ('قماش مخمل ملكي أحمر', 'أقمشة سهرة', 42.0, 18.0, 10.0, 'خامة شتوية ممتازة فائقة النعومة'),
            ('دانتيل فرنسي مطرز كريستال', 'دانتيل وإكسسوارات', 28.0, 35.0, 8.0, 'خاص بفساتين الأعراس والزفاف'),
            ('شيفون ناعم درجات الوردي', 'أقمشة خفيفة', 110.0, 8.0, 20.0, 'مناسب لفساتين الخطوبة والبنات'),
            ('قماش كريب مطاط زي مدرسي', 'أقمشة مدرسية', 150.0, 6.0, 25.0, 'مقاوم للتجعد والغسيل المتكرر'),
            ('خيوط خياطة ألماني مجمعة', 'مستلزمات خياطة', 200.0, 1.5, 30.0, 'مجموعة ألوان كاملة 50 بكرة'),
            ('سحابات مخفية كريستال 60سم', 'مستلزمات خياطة', 120.0, 1.0, 20.0, 'سحابات فساتين سهرة عالي الجودة')
        ]
        cursor.executemany('''
            INSERT INTO inventory (item_name, category, quantity_meters, cost_per_meter, min_alert_qty, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', inventory_items)

    # Seed Products if empty
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        products = [
            ('فستان سهرة لؤلؤي ملكي', 'فساتين سهرة', 180.0, 45.0, 70.0),
            ('فستان زفاف دانتيل فرنسي', 'فساتين زفاف', 350.0, 90.0, 120.0),
            ('فستان خطوبة شيفون ناعم', 'فساتين خطوبة', 160.0, 35.0, 60.0),
            ('طقم زي مدرسي موحد (3 قطع)', 'زي مدرسي', 40.0, 15.0, 15.0),
            ('فستان كاجوال مخمل ملكي', 'فساتين كاجوال', 120.0, 30.0, 45.0)
        ]
        cursor.executemany('''
            INSERT INTO products (name, category, selling_price, fabric_cost, tailoring_cost)
            VALUES (?, ?, ?, ?, ?)
        ''', products)

    # Seed Vouchers if empty
    cursor.execute("SELECT COUNT(*) FROM vouchers")
    if cursor.fetchone()[0] == 0:
        vouchers = [
            ('VOUCH-1001', 'قبض عربون', 'حوالة بنكية', 'TR-9982', '', 'أميرة الأهدل', 100.0, '2026-07-20', 'عربون تفصيل فستان سهرة لؤلؤي ملكي'),
            ('VOUCH-1002', 'صرف مصاريف', 'نقد (كاش)', '', '', 'مؤسسة البركة للأقمشة', 150.0, '2026-07-21', 'شراء شحنة أقمشة مخمل ودانتيل'),
            ('VOUCH-1003', 'قبض عربون', 'نقد (كاش)', '', '', 'سارة الكبسي', 60.0, '2026-07-22', 'عربون فستان مخمل أحمر ملكي'),
            ('VOUCH-1004', 'صرف أجور', 'نقد (كاش)', '', '', 'معلم خياطة محمود', 80.0, '2026-07-24', 'دفعة من أجور خياطة طلبيات الأسبوع'),
            ('VOUCH-1005', 'قبض كامل', 'نقد (كاش)', '', '', 'ياسمين الضبيبي', 80.0, '2026-07-25', 'تسديد كامل قيمة الزي المدرسي الموحد')
        ]
        cursor.executemany('''
            INSERT INTO vouchers (voucher_no, voucher_type, pay_method, transfer_no, image_path, party_name, amount, date_created, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', vouchers)

    conn.commit()
    conn.close()

# ==========================================
# 2. شاشة تسجيل الدخول
# ==========================================
class LoginWindow:
    def __init__(self, root):
        self.root = root
        self.root.title("تسجيل الدخول - Little Princesses ERP v16.0")
        self.root.geometry("420x330")
        self.root.resizable(False, False)

        tk.Label(root, text="👑 Little Princesses ERP", font=("Arial", 16, "bold"), fg="#2C3E50").pack(pady=15)
        
        frame = tk.Frame(root, padx=20, pady=10)
        frame.pack(fill=tk.BOTH, expand=True)

        tk.Label(frame, text="اسم المستخدم:", font=("Arial", 11, "bold")).grid(row=0, column=1, pady=10, sticky="e")
        self.ent_user = tk.Entry(frame, font=("Arial", 11), justify="right")
        self.ent_user.grid(row=0, column=0, pady=10, padx=5)

        tk.Label(frame, text="كلمة السر:", font=("Arial", 11, "bold")).grid(row=1, column=1, pady=10, sticky="e")
        self.ent_pass = tk.Entry(frame, font=("Arial", 11), show="*", justify="right")
        self.ent_pass.grid(row=1, column=0, pady=10, padx=5)

        btn_login = tk.Button(frame, text="🔓 دخول للنظام", bg="#27AE60", fg="white", font=("Arial", 11, "bold"), width=15, command=self.do_login)
        btn_login.grid(row=2, columnspan=2, pady=20)

    def do_login(self):
        u = self.ent_user.get()
        p = self.ent_pass.get()

        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT role FROM users WHERE username = ? AND password = ?", (u, p))
        res = cursor.fetchone()
        conn.close()

        if res:
            role = res[0]
            self.root.destroy()
            main_root = tk.Tk()
            app = LittlePrincessesFullERP(main_root, user_name=u, role=role)
            main_root.mainloop()
        else:
            messagebox.showerror("خطأ", "اسم المستخدم أو كلمة السر غير صحيحة!")

# ==========================================
# 3. الواجهة الرئيسية v16.0 Complete ERP Edition
# ==========================================
class LittlePrincessesFullERP:
    def __init__(self, root, user_name="admin", role="المدير العام"):
        self.root = root
        self.user_name = user_name
        self.role = role
        self.selected_voucher_image = ""

        self.root.title(f"Little Princesses ERP v16.0 Full Suite [{self.role}: {self.user_name}]")
        self.root.geometry("1350x920")

        self.auto_backup_db()

        header = tk.Label(root, text=f"👑 نظام Little Princesses ERP المحاسبي والإداري | المستخدم: {self.user_name} ({self.role})", 
                          font=("Arial", 15, "bold"), bg="#2C3E50", fg="white", pady=10)
        header.pack(fill=tk.X)

        self.notebook = ttk.Notebook(root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        self.create_modules()
        self.check_daily_alerts()

    def auto_backup_db(self):
        try:
            if not os.path.exists('backups'):
                os.makedirs('backups')
            now_str = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
            backup_path = f"backups/auto_backup_{now_str}.db"
            if os.path.exists('little_princesses.db'):
                shutil.copy('little_princesses.db', backup_path)
        except Exception as e:
            print("Auto backup error:", e)

    def get_setting(self, key):
        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
        res = cursor.fetchone()
        conn.close()
        return res[0] if res else ""

    def create_modules(self):
        tab1 = ttk.Frame(self.notebook)
        self.notebook.add(tab1, text="📊 لوحة التحكم والاشتراطات")
        self.build_dashboard(tab1)

        tab_vouchers = ttk.Frame(self.notebook)
        self.notebook.add(tab_vouchers, text="📄 السندات المالية وصور الحوالات")
        self.build_vouchers_module(tab_vouchers)

        tab_sales = ttk.Frame(self.notebook)
        self.notebook.add(tab_sales, text="🧾 المبيعات والـ QR Code 🛵")
        self.build_sales_module(tab_sales)

        if self.role in ["المدير العام"]:
            tab_journal = ttk.Frame(self.notebook)
            self.notebook.add(tab_journal, text="📝 قيود اليومية")
            self.build_journal_module(tab_journal)

        tab_prod = ttk.Frame(self.notebook)
        self.notebook.add(tab_prod, text="👗 المنتجات والتكاليف")
        self.build_products_module(tab_prod)

        tab_inv = ttk.Frame(self.notebook)
        self.notebook.add(tab_inv, text="🧵 مخزون الأقمشة والمستلزمات ✂️")
        self.build_inventory_module(tab_inv)

        tab_cust = ttk.Frame(self.notebook)
        self.notebook.add(tab_cust, text="👥 العملاء والمقاسات والتواصل الذكي 📲")
        self.build_customers_module(tab_cust)

        tab_marketing = ttk.Frame(self.notebook)
        self.notebook.add(tab_marketing, text="📈 إدارة الإعلانات والتسويق")
        try:
            from marketing_module import MarketingModule
            MarketingModule(self, tab_marketing)
        except Exception as e:
            print("Marketing module err:", e)


        tab_stmt = ttk.Frame(self.notebook)
        self.notebook.add(tab_stmt, text="📜 كشوفات الحسابات")
        self.build_statements_module(tab_stmt)

        if self.role in ["المدير العام"]:
            tab_acc = ttk.Frame(self.notebook)
            self.notebook.add(tab_acc, text="🏦 شجرة الحسابات")
            self.build_accounts_module(tab_acc)

        if self.role in ["المدير العام"]:
            tab_sett = ttk.Frame(self.notebook)
            self.notebook.add(tab_sett, text="⚙️ إعدادات النظام والصلاحيات")
            self.build_settings_module(tab_sett)

    def check_daily_alerts(self):
        today_str = datetime.date.today().strftime("%Y-%m-%d")

        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()

        cursor.execute("SELECT order_no, customer_name, product_name, remaining_amount FROM orders WHERE delivery_date = ?", (today_str,))
        today_orders = cursor.fetchall()

        cursor.execute("SELECT customer_name, order_no, remaining_amount FROM orders WHERE remaining_amount > 0")
        unpaid_orders = cursor.fetchall()

        cursor.execute("SELECT item_name, quantity_meters, min_alert_qty FROM inventory WHERE quantity_meters <= min_alert_qty")
        low_stock_items = cursor.fetchall()

        conn.close()

        if today_orders or len(unpaid_orders) > 0 or low_stock_items:
            win_alert = tk.Toplevel(self.root)
            win_alert.title("🔔 مركز التنبيهات والإشعارات اليومية الذكية")
            win_alert.geometry("620x480")

            tk.Label(win_alert, text="📢 تنبيهات ومواعيد اليوم والمخزون المستحقة", font=("Arial", 14, "bold"), fg="#C0392B").pack(pady=10)

            msg_box = tk.Text(win_alert, font=("Arial", 10), padX=10, padY=10)
            msg_box.pack(fill=tk.BOTH, expand=True, padx=15, pady=5)

            msg_box.insert(tk.END, f"🗓️ بتاريخ اليوم: {today_str}\n")
            msg_box.insert(tk.END, "=============================================\n")

            if today_orders:
                msg_box.insert(tk.END, f"🎯 فساتين/زي مدرسي مجهز للتسليم اليوم ({len(today_orders)} طلب):\n")
                for o in today_orders:
                    msg_box.insert(tk.END, f" • رقم: {o[0]} | العميل: {o[1]} | الموديل: {o[2]} | المتبقي: ${o[3]:.2f}\n")
                msg_box.insert(tk.END, "---------------------------------------------\n")
            else:
                msg_box.insert(tk.END, "✅ لا توجد مواعيد تسليم مستحقة لهذا اليوم.\n---------------------------------------------\n")

            if low_stock_items:
                msg_box.insert(tk.END, f"⚠️ أقمشة ومستلزمات شرف مخزونها على النفاذ بالورشة ({len(low_stock_items)} صنف):\n")
                for item in low_stock_items:
                    msg_box.insert(tk.END, f" • القماش: {item[0]} | المتبقي: {item[1]} متر (الحد الأدنى: {item[2]} متر)\n")
                msg_box.insert(tk.END, "---------------------------------------------\n")

            if unpaid_orders:
                msg_box.insert(tk.END, f"💰 عملاء عليهم مبالغ متبقية مستحقة ({len(unpaid_orders)} فاتورة):\n")
                for u in unpaid_orders:
                    msg_box.insert(tk.END, f" • العميل: {u[0]} | فاتورة: {u[1]} | المتبقي للتحصيل: ${u[2]:.2f}\n")

            btn_close = tk.Button(win_alert, text="👍 تم الاطلاع على التنبيهات", bg="#27AE60", fg="white", font=("Arial", 10, "bold"), command=win_alert.destroy)
            btn_close.pack(pady=10)

    def build_dashboard(self, frame):
        lbl = tk.Label(frame, text="ملخص الأداء والعمليات المالية - Little Princesses ERP", font=("Arial", 14, "bold"), fg="#2980B9")
        lbl.pack(pady=10)

        cards_frame = tk.Frame(frame)
        cards_frame.pack(fill=tk.X, padx=20)

        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        
        cursor.execute("SELECT balance FROM accounts WHERE acc_code = 101")
        res = cursor.fetchone()
        cash_balance = res[0] if res else 0.0

        cursor.execute("SELECT balance FROM accounts WHERE acc_code = 103")
        res_b = cursor.fetchone()
        bank_balance = res_b[0] if res_b else 0.0

        cursor.execute("SELECT SUM(profit) FROM orders")
        res_p = cursor.fetchone()
        total_profit = res_p[0] if res_p[0] else 0.0

        conn.close()

        c1 = tk.LabelFrame(cards_frame, text=" رصيد الصندوق الكاش ", font=("Arial", 11, "bold"), fg="#27AE60", padx=15, pady=10)
        c1.grid(row=0, column=0, padx=10, pady=10)
        self.lbl_dash_cash = tk.Label(c1, text=f"${cash_balance:.2f}", font=("Arial", 14, "bold"), fg="#27AE60")
        self.lbl_dash_cash.pack()

        c2 = tk.LabelFrame(cards_frame, text=" رصيد البنوك والحوالات ", font=("Arial", 11, "bold"), fg="#2980B9", padx=15, pady=10)
        c2.grid(row=0, column=1, padx=10, pady=10)
        self.lbl_dash_bank = tk.Label(c2, text=f"${bank_balance:.2f}", font=("Arial", 14, "bold"), fg="#2980B9")
        self.lbl_dash_bank.pack()

        c3 = tk.LabelFrame(cards_frame, text=" إجمالي الأرباح المتوقعة ", font=("Arial", 11, "bold"), fg="#8E44AD", padx=15, pady=10)
        c3.grid(row=0, column=2, padx=10, pady=10)
        self.lbl_dash_profit = tk.Label(c3, text=f"${total_profit:.2f}", font=("Arial", 14, "bold"), fg="#8E44AD")
        self.lbl_dash_profit.pack()

        btn_exp_fin = tk.Button(cards_frame, text="📊 تصدير المبيعات لـ Excel / CSV", bg="#16A085", fg="white", font=("Arial", 10, "bold"), command=self.export_orders_csv)
        btn_exp_fin.grid(row=0, column=3, padx=15, pady=10)

        btn_show_alerts = tk.Button(cards_frame, text="🔔 عرض التنبيهات والمخزون", bg="#E74C3C", fg="white", font=("Arial", 10, "bold"), command=self.check_daily_alerts)
        btn_show_alerts.grid(row=0, column=4, padx=15, pady=10)

    def export_orders_csv(self):
        file_p = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV Files", "*.csv")])
        if not file_p: return

        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT order_no, customer_name, product_name, quantity, total_amount, paid_amount, remaining_amount, profit, status FROM orders")
        rows = cursor.fetchall()
        conn.close()

        with open(file_p, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(["رقم الفاتورة", "العميل", "الفستان", "العدد", "الإجمالي", "المدفوع", "المتبقي", "الربح", "الحالة"])
            writer.writerows(rows)

        messagebox.showinfo("تصدير Excel", f"تم التصدير بنجاح إلى:\n{file_p}")

    def build_vouchers_module(self, frame):
        f_in = tk.LabelFrame(frame, text=" إصدار سند جديد وتأكيد الحوالة ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_in.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(f_in, text="نوع السند:").grid(row=0, column=5, padx=5, pady=5, sticky="e")
        self.combo_vtype = ttk.Combobox(f_in, values=["سند قبض (استلام دفعة/عربون)", "سند صرف (شراء أقمشة ومستلزمات)", "سند صرف (دفعة لخياط/مصروف)"], state="readonly", width=25)
        self.combo_vtype.grid(row=0, column=4, padx=5, pady=5)
        self.combo_vtype.current(0)

        tk.Label(f_in, text="طريقة الدفع:").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.combo_vmethod = ttk.Combobox(f_in, values=["نقد (كاش)", "حوالة مالية", "إيداع بنكي", "بطاقة / شبكة"], state="readonly", width=15)
        self.combo_vmethod.grid(row=0, column=2, padx=5, pady=5)
        self.combo_vmethod.current(0)

        tk.Label(f_in, text="رقم الحوالة/العملية:").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        self.ent_v_transferno = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_v_transferno.grid(row=0, column=0, padx=5, pady=5)

        tk.Label(f_in, text="اسم الطرف:").grid(row=1, column=5, padx=5, pady=5, sticky="e")
        self.ent_vparty = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_vparty.grid(row=1, column=4, padx=5, pady=5)

        tk.Label(f_in, text="المبلغ ($):").grid(row=1, column=3, padx=5, pady=5, sticky="e")
        self.ent_vamount = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_vamount.grid(row=1, column=2, padx=5, pady=5)

        tk.Label(f_in, text="صورة الحوالة المرفقة:").grid(row=1, column=1, padx=5, pady=5, sticky="e")
        btn_attach_img = tk.Button(f_in, text="📸 اختيار صورة الحوالة", bg="#34495E", fg="white", font=("Arial", 9, "bold"), command=self.attach_voucher_image)
        btn_attach_img.grid(row=1, column=0, padx=5, pady=5)

        tk.Label(f_in, text="البيان:").grid(row=2, column=5, padx=5, pady=5, sticky="e")
        self.ent_vnotes = tk.Entry(f_in, font=("Arial", 10), justify="right", width=35)
        self.ent_vnotes.grid(row=2, column=2, columnspan=3, padx=5, pady=5, sticky="w")

        btn_save_v = tk.Button(f_in, text="💾 حفظ السند وتحديث الحسابات", bg="#2ECC71", fg="white", font=("Arial", 10, "bold"), command=self.save_voucher)
        btn_save_v.grid(row=2, column=0, columnspan=2, pady=5)

        btn_view_img = tk.Button(f_in, text="👁️ معاينة صورة الحوالة المحددة", bg="#8E44AD", fg="white", font=("Arial", 9, "bold"), command=self.view_voucher_image)
        btn_view_img.grid(row=3, columnspan=6, pady=5)

        columns = ("id", "vno", "vtype", "method", "tno", "party", "amount", "date", "notes")
        self.tree_vouchers = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["ID", "رقم السند", "نوع السند", "طريقة الدفع", "رقم الحوالة", "اسم الطرف", "المبلغ", "التاريخ", "البيان"]
        for col, h in zip(columns, headings):
            self.tree_vouchers.heading(col, text=h)
            self.tree_vouchers.column(col, anchor="center")
        self.tree_vouchers.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.load_vouchers()

    def attach_voucher_image(self):
        file_path = filedialog.askopenfilename(filetypes=[("Image Files", "*.png;*.jpg;*.jpeg")])
        if file_path:
            self.selected_voucher_image = file_path
            messagebox.showinfo("تم الإرفاق", "تم اختيار صورة الحوالة بنجاح!")

    def view_voucher_image(self):
        selected_item = self.tree_vouchers.selection()
        if not selected_item:
            messagebox.showwarning("تنبيه", "حدد سنداً من الجدول أولاً!")
            return

        item_vals = self.tree_vouchers.item(selected_item)['values']
        v_no = item_vals[1]

        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT image_path FROM vouchers WHERE voucher_no = ?", (v_no,))
        res = cursor.fetchone()
        conn.close()

        img_p = res[0] if res else ""

        if img_p and os.path.exists(img_p):
            win_img = tk.Toplevel(self.root)
            win_img.title(f"معاينة صورة الحوالة - {v_no}")
            win_img.geometry("500x550")

            img = Image.open(img_p)
            img = img.resize((450, 480), Image.Resampling.LANCZOS)
            photo = ImageTk.PhotoImage(img)

            lbl_img = tk.Label(win_img, image=photo)
            lbl_img.image = photo
            lbl_img.pack(pady=10)
        else:
            messagebox.showwarning("تنبيه", "لا توجد صورة حوالة مرفقة مع هذا السند!")

    def save_voucher(self):
        vtype = self.combo_vtype.get()
        vmethod = self.combo_vmethod.get()
        tno = self.ent_v_transferno.get()
        party = self.ent_vparty.get()
        amount_str = self.ent_vamount.get()
        notes = self.ent_vnotes.get()

        if not party or not amount_str:
            messagebox.showwarning("تنبيه", "ادخل الاسم والمبلغ!")
            return

        try:
            amount = float(amount_str)
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            v_no = f"VOUCH-{datetime.datetime.now().strftime('%M%S')}"

            saved_img_path = ""
            if self.selected_voucher_image and os.path.exists(self.selected_voucher_image):
                ext = os.path.splitext(self.selected_voucher_image)[1]
                saved_img_path = f"voucher_images/{v_no}{ext}"
                shutil.copy(self.selected_voucher_image, saved_img_path)

            target_acc = 101 if "نقد" in vmethod else 103

            conn = sqlite3.connect('little_princesses.db')
            cursor = conn.cursor()

            cursor.execute("INSERT INTO vouchers (voucher_no, voucher_type, pay_method, transfer_no, image_path, party_name, amount, date_created, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                           (v_no, vtype, vmethod, tno, saved_img_path, party, amount, now_str, notes))

            if "سند قبض" in vtype:
                cursor.execute("UPDATE accounts SET balance = balance + ? WHERE acc_code = ?", (amount, target_acc))
            elif "سند صرف" in vtype:
                cursor.execute("UPDATE accounts SET balance = balance - ? WHERE acc_code = ?", (amount, target_acc))

            conn.commit()
            conn.close()

            messagebox.showinfo("نجاح", f"تم إصدار {vtype} وحفظ الحوالة بنجاح!")
            self.ent_vparty.delete(0, tk.END)
            self.ent_vamount.delete(0, tk.END)
            self.ent_vnotes.delete(0, tk.END)
            self.ent_v_transferno.delete(0, tk.END)
            self.selected_voucher_image = ""
            self.load_vouchers()
            self.load_accounts()
            self.update_dashboard_cash()
        except ValueError:
            messagebox.showerror("خطأ", "ادخل مبلغاً صحيحاً!")

    def load_vouchers(self):
        for r in self.tree_vouchers.get_children():
            self.tree_vouchers.delete(r)
        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT id, voucher_no, voucher_type, pay_method, transfer_no, party_name, amount, date_created, notes FROM vouchers ORDER BY id DESC")
        for row in cursor.fetchall():
            self.tree_vouchers.insert("", tk.END, values=row)
        conn.close()

    def build_sales_module(self, frame):
        f_in = tk.LabelFrame(frame, text=" حجز فستان / إصدار فاتورة وتوليد QR Code ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_in.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(f_in, text="اختر العميل:").grid(row=0, column=5, padx=5, pady=5, sticky="e")
        self.combo_s_cust = ttk.Combobox(f_in, state="normal", width=18)
        self.combo_s_cust.grid(row=0, column=4, padx=5, pady=5)

        tk.Label(f_in, text="اختر الفستان:").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.combo_s_prod = ttk.Combobox(f_in, state="normal", width=18)
        self.combo_s_prod.grid(row=0, column=2, padx=5, pady=5)

        tk.Label(f_in, text="العدد:").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        self.ent_s_qty = tk.Entry(f_in, font=("Arial", 10), justify="right", width=10)
        self.ent_s_qty.insert(0, "1")
        self.ent_s_qty.grid(row=0, column=0, padx=5, pady=5)

        tk.Label(f_in, text="المبلغ الإجمالي ($):").grid(row=1, column=5, padx=5, pady=5, sticky="e")
        self.ent_s_total = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_s_total.grid(row=1, column=4, padx=5, pady=5)

        tk.Label(f_in, text="العربون ($):").grid(row=1, column=3, padx=5, pady=5, sticky="e")
        self.ent_s_paid = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_s_paid.grid(row=1, column=2, padx=5, pady=5)

        tk.Label(f_in, text="طريقة التحصيل:").grid(row=1, column=1, padx=5, pady=5, sticky="e")
        self.combo_s_method = ttk.Combobox(f_in, values=["نقد (كاش)", "حوالة مالية", "إيداع بنكي", "بطاقة / شبكة"], state="readonly", width=12)
        self.combo_s_method.grid(row=1, column=0, padx=5, pady=5)
        self.combo_s_method.current(0)

        tk.Label(f_in, text="رقم الحوالة (إن وجد):").grid(row=2, column=5, padx=5, pady=5, sticky="e")
        self.ent_s_transferno = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_s_transferno.grid(row=2, column=4, padx=5, pady=5)

        tk.Label(f_in, text="تاريخ التسليم:").grid(row=2, column=3, padx=5, pady=5, sticky="e")
        self.ent_s_deldate = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_s_deldate.insert(0, (datetime.date.today() + datetime.timedelta(days=7)).strftime("%Y-%m-%d"))
        self.ent_s_deldate.grid(row=2, column=2, padx=5, pady=5)

        tk.Label(f_in, text="أجور التوصيل ($):").grid(row=2, column=1, padx=5, pady=5, sticky="e")
        self.ent_s_delfee = tk.Entry(f_in, font=("Arial", 10), justify="right", width=10)
        self.ent_s_delfee.insert(0, "3.0")
        self.ent_s_delfee.grid(row=2, column=0, padx=5, pady=5)

        btn_save_order = tk.Button(f_in, text="🧾 حفظ الفاتورة وتوليد QR", bg="#3498DB", fg="white", font=("Arial", 10, "bold"), command=self.save_order)
        btn_save_order.grid(row=3, column=5, pady=10)

        btn_send_driver = tk.Button(f_in, text="🛵 امر التوصيل للموصل (واتساب)", bg="#D35400", fg="white", font=("Arial", 10, "bold"), command=self.send_whatsapp_driver)
        btn_send_driver.grid(row=3, column=3, columnspan=2, pady=10)

        btn_send_wa_prod = tk.Button(f_in, text="📲 امر الإنتاج للورشة", bg="#27AE60", fg="white", font=("Arial", 10, "bold"), command=self.send_whatsapp_production)
        btn_send_wa_prod.grid(row=3, column=2, pady=10)

        btn_print_order = tk.Button(f_in, text="🖨️ طباعة الفاتورة + QR", bg="#8E44AD", fg="white", font=("Arial", 10, "bold"), command=self.print_invoice)
        btn_print_order.grid(row=3, column=0, columnspan=2, pady=10)

        columns = ("id", "ord_no", "cust", "prod", "qty", "deldate", "total", "paid", "remain", "status")
        self.tree_sales = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["ID", "رقم الفاتورة", "اسم العميل", "الفستان", "العدد", "موعد التسليم", "الإجمالي", "المدفوع", "المتبقي", "حالة الطلب"]
        for col, h in zip(columns, headings):
            self.tree_sales.heading(col, text=h)
            self.tree_sales.column(col, anchor="center")
        self.tree_sales.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.refresh_sales_dropdowns()
        self.load_orders()

    def generate_qr_code(self, ord_no, cust, total, remain, deldate):
        qr_path = f"qr_codes/{ord_no}.png"
        qr_data = f"Little Princesses ERP\nOrder: {ord_no}\nCustomer: {cust}\nTotal: ${total}\nRemain: ${remain}\nDelivery: {deldate}"
        if HAS_QRCODE:
            qr = qrcode.QRCode(version=1, box_size=5, border=2)
            qr.add_data(qr_data)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            img.save(qr_path)
        return qr_path

    def refresh_sales_dropdowns(self):
        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM customers ORDER BY name ASC")
        self.combo_s_cust['values'] = [row[0] for row in cursor.fetchall()]

        cursor.execute("SELECT name FROM products ORDER BY name ASC")
        self.combo_s_prod['values'] = [row[0] for row in cursor.fetchall()]
        conn.close()

    def save_order(self):
        cust = self.combo_s_cust.get()
        prod = self.combo_s_prod.get()
        qty_str = self.ent_s_qty.get() or "1"
        smethod = self.combo_s_method.get()
        tno = self.ent_s_transferno.get()
        total_str = self.ent_s_total.get()
        paid_str = self.ent_s_paid.get() or "0"
        deldate = self.ent_s_deldate.get()
        delfee_str = self.ent_s_delfee.get() or "0.0"

        if not cust or not prod or not total_str:
            messagebox.showwarning("تنبيه", "يرجى إكمال بيانات الفاتورة!")
            return

        try:
            qty = int(qty_str)
            total = float(total_str)
            paid = float(paid_str)
            delfee = float(delfee_str)
            remain = total - paid
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            ord_no = f"INV-{datetime.datetime.now().strftime('%M%S')}"

            qr_path = self.generate_qr_code(ord_no, cust, total, remain, deldate)

            target_acc = 101 if "نقد" in smethod else 103

            conn = sqlite3.connect('little_princesses.db')
            cursor = conn.cursor()
            cursor.execute("SELECT fabric_cost, tailoring_cost FROM products WHERE name = ?", (prod,))
            c_res = cursor.fetchone()
            fabric_cost = (c_res[0] if c_res else 0.0) * qty
            tailor_cost = (c_res[1] if c_res else 0.0) * qty
            profit = total - (fabric_cost + tailor_cost)

            cursor.execute('''INSERT INTO orders 
                (order_no, customer_name, product_name, quantity, pay_method, transfer_no, order_date, delivery_date, delivery_fee, total_amount, paid_amount, remaining_amount, profit, qr_code_path) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (ord_no, cust, prod, qty, smethod, tno, now_str, deldate, delfee, total, paid, remain, profit, qr_path))

            cursor.execute("UPDATE accounts SET balance = balance + ? WHERE acc_code = 401", (total,))

            if paid > 0:
                v_no = f"VOUCH-{datetime.datetime.now().strftime('%M%S')}"
                cursor.execute("INSERT INTO vouchers (voucher_no, voucher_type, pay_method, transfer_no, party_name, amount, date_created, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                               (v_no, "سند قبض (عربون فاتورة)", smethod, tno, cust, paid, now_str, f"عربون عن الفاتورة رقم {ord_no}"))
                cursor.execute("UPDATE accounts SET balance = balance + ? WHERE acc_code = ?", (paid, target_acc))

            conn.commit()
            conn.close()

            messagebox.showinfo("نجاح الحجز", f"تم حفظ الفاتورة {ord_no} وتوليد رمز הـ QR بنجاح!")
            self.load_orders()
            self.load_vouchers()
            self.load_accounts()
            self.update_dashboard_cash()
        except ValueError:
            messagebox.showerror("خطأ", "ادخل أرقاماً صحيحة!")

    def send_whatsapp_driver(self):
        selected_item = self.tree_sales.selection()
        if not selected_item:
            messagebox.showwarning("تنبيه", "حدد طلبية أولاً!")
            return

        item_vals = self.tree_sales.item(selected_item)['values']
        ord_no = item_vals[1]

        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT customer_name, product_name, quantity, delivery_date, pickup_time, delivery_fee, remaining_amount FROM orders WHERE order_no = ?", (ord_no,))
        o_data = cursor.fetchone()

        cursor.execute("SELECT phone, address FROM customers WHERE name = ?", (o_data[0],))
        c_data = cursor.fetchone()
        conn.close()

        c_phone = c_data[0] if c_data else "غير مسجل"
        c_address = c_data[1] if (c_data and c_data[1]) else "العنوان محدد مع العميل"

        del_fee = o_data[5] if o_data[5] else 0.0
        remain = o_data[6] if o_data[6] else 0.0
        total_collect = remain + del_fee

        store = self.get_setting('store_name')

        driver_msg = f"""🛵 أمر توصيل جديد - {store}

📄 رقم الطلب: {ord_no}
⏱️ موعد التسليم للزبون: {o_data[3]}

👤 بيانات الزبون للتواصل:
• الاسم: {o_data[0]}
📞 رقم الهاتف: {c_phone}
📍 العنوان: {c_address}

👗 المنتج: {o_data[1]} (عدد: {o_data[2]})

💵 التحصيل المالي المطلوب من الزبون عند الباب:
• المتبقي من الفستان: ${remain:.2f}
• أجور التوصيل: ${del_fee:.2f}
💰 إجمالي المبلغ المطلوب تحصيله: ${total_collect:.2f}"""

        encoded_msg = urllib.parse.quote(driver_msg)
        webbrowser.open(f"https://api.whatsapp.com/send?text={encoded_msg}")

    def send_whatsapp_production(self):
        selected_item = self.tree_sales.selection()
        if not selected_item:
            messagebox.showwarning("تنبيه", "حدد طلبية أولاً!")
            return

        item_vals = self.tree_sales.item(selected_item)['values']
        ord_no = item_vals[1]

        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT customer_name, product_name, quantity, delivery_date FROM orders WHERE order_no = ?", (ord_no,))
        o_data = cursor.fetchone()

        cursor.execute("SELECT phone, unit, total_length, shoulder_width, bust_circ, waist_circ, sleeve_length, chest_length FROM customers WHERE name = ?", (o_data[0],))
        c_data = cursor.fetchone()
        conn.close()

        unit = c_data[1] if c_data else "سم"
        store = self.get_setting('store_name')

        wa_msg = f"""📣 أمر تفصيل وإنتاج جديد - {store}

📄 رقم الفاتورة: {ord_no}
👤 اسم العميل: {o_data[0]}
👗 الفستان: {o_data[1]} | العدد: {o_data[2]}

📐 المقاسات الكاملة ({unit}):
• الطول الكلي: {c_data[2] if c_data else '-'} | عرض الكتف: {c_data[3] if c_data else '-'}
• دوران الصدر: {c_data[4] if c_data else '-'} | دوران الخصر: {c_data[5] if c_data else '-'}
• طول الكم: {c_data[6] if c_data else '-'} | طول الصدر: {c_data[7] if c_data else '-'}

📅 موعد التسليم المطلوب: {o_data[3]}"""

        encoded_msg = urllib.parse.quote(wa_msg)
        webbrowser.open(f"https://api.whatsapp.com/send?text={encoded_msg}")

    def print_invoice(self):
        selected_item = self.tree_sales.selection()
        if not selected_item:
            messagebox.showwarning("تنبيه", "حدد فاتورة أولاً!")
            return

        item_vals = self.tree_sales.item(selected_item)['values']
        store = self.get_setting('store_name')
        ptype = self.get_setting('printer_type')

        win_p = tk.Toplevel(self.root)
        win_p.title(f"معاينة طباعة الإيصال والـ QR Code ({ptype})")
        win_p.geometry("480x650")

        inv_text = f"""
=============================================
         {store}
        إيصال بيع وتفصيل (حراري 80mm)
=============================================
رقم الفاتورة: {item_vals[1]}
العميل: {item_vals[2]}
الفستان: {item_vals[3]} | العدد: {item_vals[4]}
تاريخ التسليم: {item_vals[5]}
---------------------------------------------
المبلغ الإجمالي: ${item_vals[6]}
العربون المدفوع: ${item_vals[7]}
المتبقي عند الاستلام: ${item_vals[8]}
---------------------------------------------
طابعة المهيأة: {ptype}
=============================================
   رمز QR المرفق للطلبية بالفاتورة بالأسفل 👑
=============================================
        """

        txt_widget = tk.Text(win_p, font=("Consolas", 10), height=15, padX=10, padY=10)
        txt_widget.insert(tk.END, inv_text)
        txt_widget.pack(fill=tk.X)

        qr_p = f"qr_codes/{item_vals[1]}.png"
        if os.path.exists(qr_p):
            img = Image.open(qr_p)
            img = img.resize((140, 140), Image.Resampling.LANCZOS)
            photo = ImageTk.PhotoImage(img)

            lbl_qr = tk.Label(win_p, image=photo)
            lbl_qr.image = photo
            lbl_qr.pack(pady=5)

        btn_do_print = tk.Button(win_p, text="🖨️ أرسل للطابعة الحرارية الآن", bg="#27AE60", fg="white", font=("Arial", 11, "bold"), command=lambda: messagebox.showinfo("طباعة", f"تمت الطباعة بنجاح على {ptype}!"))
        btn_do_print.pack(pady=10)

    def load_orders(self):
        for r in self.tree_sales.get_children():
            self.tree_sales.delete(r)
        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT id, order_no, customer_name, product_name, quantity, delivery_date, total_amount, paid_amount, remaining_amount, status FROM orders ORDER BY id DESC")
        for row in cursor.fetchall():
            self.tree_sales.insert("", tk.END, values=row)
        conn.close()

    def build_journal_module(self, frame):
        f_in = tk.LabelFrame(frame, text=" قيد يومية مزدوج ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_in.pack(fill=tk.X, padx=10, pady=5)

        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT acc_code, acc_name FROM accounts ORDER BY acc_code ASC")
        acc_options = [f"{row[0]} - {row[1]}" for row in cursor.fetchall()]
        conn.close()

        tk.Label(f_in, text="مدين (من حـ/):").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.combo_j_debit = ttk.Combobox(f_in, values=acc_options, state="readonly", width=35)
        self.combo_j_debit.grid(row=0, column=2, padx=5, pady=5)
        if acc_options: self.combo_j_debit.current(0)

        tk.Label(f_in, text="دائن (إلى حـ/):").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        self.combo_j_credit = ttk.Combobox(f_in, values=acc_options, state="readonly", width=35)
        self.combo_j_credit.grid(row=0, column=0, padx=5, pady=5)
        if acc_options: self.combo_j_credit.current(0)

        tk.Label(f_in, text="المبلغ ($):").grid(row=1, column=3, padx=5, pady=5, sticky="e")
        self.ent_j_amount = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_j_amount.grid(row=1, column=2, padx=5, pady=5)

        tk.Label(f_in, text="البيان:").grid(row=1, column=1, padx=5, pady=5, sticky="e")
        self.ent_j_notes = tk.Entry(f_in, font=("Arial", 10), justify="right", width=35)
        self.ent_j_notes.grid(row=1, column=0, padx=5, pady=5)

        btn_save_j = tk.Button(f_in, text="💾 رحّل القيد المزدوج", bg="#8E44AD", fg="white", font=("Arial", 10, "bold"), command=self.save_journal_entry)
        btn_save_j.grid(row=2, columnspan=4, pady=10)

        columns = ("id", "eno", "date", "debit", "credit", "amount", "notes")
        self.tree_journal = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["ID", "رقم القيد", "التاريخ", "من حـ/", "إلى حـ/", "المبلغ ($)", "البيان"]
        for col, h in zip(columns, headings):
            self.tree_journal.heading(col, text=h)
            self.tree_journal.column(col, anchor="center")
        self.tree_journal.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.load_journal_entries()

    def save_journal_entry(self):
        debit = self.combo_j_debit.get()
        credit = self.combo_j_credit.get()
        amount_str = self.ent_j_amount.get()
        notes = self.ent_j_notes.get()

        if not amount_str:
            messagebox.showwarning("تنبيه", "ادخل المبلغ!")
            return

        try:
            amount = float(amount_str)
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            e_no = f"JV-{datetime.datetime.now().strftime('%M%S')}"

            d_code = int(debit.split('-')[0].strip())
            c_code = int(credit.split('-')[0].strip())

            conn = sqlite3.connect('little_princesses.db')
            cursor = conn.cursor()

            cursor.execute("INSERT INTO journal_entries (entry_no, entry_date, debit_acc, credit_acc, amount, notes) VALUES (?, ?, ?, ?, ?, ?)",
                           (e_no, now_str, debit, credit, amount, notes))

            cursor.execute("UPDATE accounts SET balance = balance + ? WHERE acc_code = ?", (amount, d_code))
            cursor.execute("UPDATE accounts SET balance = balance - ? WHERE acc_code = ?", (amount, c_code))

            conn.commit()
            conn.close()

            messagebox.showinfo("نجاح", f"تم ترحيل القيد {e_no} بنجاح!")
            self.load_journal_entries()
            self.load_accounts()
            self.update_dashboard_cash()
        except ValueError:
            messagebox.showerror("خطأ", "ادخل مبلغاً صحيحاً!")

    def load_journal_entries(self):
        for r in self.tree_journal.get_children():
            self.tree_journal.delete(r)
        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT id, entry_no, entry_date, debit_acc, credit_acc, amount, notes FROM journal_entries ORDER BY id DESC")
        for row in cursor.fetchall():
            self.tree_journal.insert("", tk.END, values=row)
        conn.close()

    def build_products_module(self, frame):
        f_in = tk.LabelFrame(frame, text=" إضافة موديل / فستان جديد ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_in.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(f_in, text="اسم الموديل:").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.ent_p_name = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_p_name.grid(row=0, column=2, padx=5, pady=5)

        tk.Label(f_in, text="التصنيف:").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        categories_list = ["فستان أميرة (Princess)", "فستان زفاف للأطفال", "فستان حفلات", "فستان مناسبة", "فستان عيد", "زي مدرسي"]
        self.combo_p_cat = ttk.Combobox(f_in, values=categories_list, state="readonly", width=22)
        self.combo_p_cat.grid(row=0, column=0, padx=5, pady=5)
        self.combo_p_cat.current(0)

        tk.Label(f_in, text="سعر البيع ($):").grid(row=1, column=3, padx=5, pady=5, sticky="e")
        self.ent_p_price = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_p_price.grid(row=1, column=2, padx=5, pady=5)

        tk.Label(f_in, text="تكلفة المواد ($):").grid(row=1, column=1, padx=5, pady=5, sticky="e")
        self.ent_p_fabric = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_p_fabric.grid(row=1, column=0, padx=5, pady=5)

        tk.Label(f_in, text="تكلفة الخياطة ($):").grid(row=2, column=3, padx=5, pady=5, sticky="e")
        self.ent_p_tailor = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_p_tailor.grid(row=2, column=2, padx=5, pady=5)

        btn_add_p = tk.Button(f_in, text="➕ إضافة الموديل", bg="#9B59B6", fg="white", font=("Arial", 10, "bold"), command=self.save_product)
        btn_add_p.grid(row=2, column=0, columnspan=2, pady=5)

        columns = ("id", "name", "cat", "price", "fabric", "tailor")
        self.tree_products = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["ID", "اسم الموديل", "التصنيف", "سعر البيع ($)", "تكلفة المواد ($)", "تكلفة الخياطة ($)"]
        for col, h in zip(columns, headings):
            self.tree_products.heading(col, text=h)
            self.tree_products.column(col, anchor="center")
        self.tree_products.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.load_products()

    def save_product(self):
        name = self.ent_p_name.get()
        cat = self.combo_p_cat.get()
        price_str = self.ent_p_price.get()
        fabric_str = self.ent_p_fabric.get() or "0"
        tailor_str = self.ent_p_tailor.get() or "0"

        if not name or not price_str:
            messagebox.showwarning("تنبيه", "ادخل الاسم والسعر!")
            return

        try:
            price = float(price_str)
            fabric = float(fabric_str)
            tailor = float(tailor_str)

            conn = sqlite3.connect('little_princesses.db')
            cursor = conn.cursor()
            cursor.execute("INSERT INTO products (name, category, selling_price, fabric_cost, tailoring_cost) VALUES (?, ?, ?, ?, ?)",
                           (name, cat, price, fabric, tailor))
            conn.commit()
            conn.close()

            messagebox.showinfo("نجاح", f"تم إضافة الموديل '{name}' بنجاح!")
            self.ent_p_name.delete(0, tk.END)
            self.ent_p_price.delete(0, tk.END)
            self.ent_p_fabric.delete(0, tk.END)
            self.ent_p_tailor.delete(0, tk.END)
            self.load_products()
            self.refresh_sales_dropdowns()
        except ValueError:
            messagebox.showerror("خطأ", "ادخل أسعار صحيحة!")

    def load_products(self):
        for r in self.tree_products.get_children():
            self.tree_products.delete(r)
        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, category, selling_price, fabric_cost, tailoring_cost FROM products ORDER BY id DESC")
        for row in cursor.fetchall():
            self.tree_products.insert("", tk.END, values=row)
        conn.close()

    # --- 6. موديول إدارة مخزون الأقمشة والمستلزمات v16.0 ---
    def build_inventory_module(self, frame):
        f_in = tk.LabelFrame(frame, text=" إضافة قماش / مستلزم جديد إلى الورشة ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_in.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(f_in, text="اسم القماش/الصنف:").grid(row=0, column=5, padx=5, pady=5, sticky="e")
        self.ent_inv_name = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_inv_name.grid(row=0, column=4, padx=5, pady=5)

        tk.Label(f_in, text="التصنيف:").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.combo_inv_cat = ttk.Combobox(f_in, values=["قماش ساتان", "قماش تول", "قماش جوبير/دانتيل", "قماش زي مدرسي", "خيوط وسحابات", "إكسسوارات وخرز"], state="readonly", width=18)
        self.combo_inv_cat.grid(row=0, column=2, padx=5, pady=5)
        self.combo_inv_cat.current(0)

        tk.Label(f_in, text="الكمية المتاحة (بالأمتار):").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        self.ent_inv_qty = tk.Entry(f_in, font=("Arial", 10), justify="right", width=12)
        self.ent_inv_qty.grid(row=0, column=0, padx=5, pady=5)

        tk.Label(f_in, text="تكلفة المتر ($):").grid(row=1, column=5, padx=5, pady=5, sticky="e")
        self.ent_inv_cost = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_inv_cost.grid(row=1, column=4, padx=5, pady=5)

        tk.Label(f_in, text="حد التنبيه بالنفاذ (متر):").grid(row=1, column=3, padx=5, pady=5, sticky="e")
        self.ent_inv_min = tk.Entry(f_in, font=("Arial", 10), justify="right", width=18)
        self.ent_inv_min.insert(0, "5.0")
        self.ent_inv_min.grid(row=1, column=2, padx=5, pady=5)

        btn_add_inv = tk.Button(f_in, text="🧵 إضافة للمخزون", bg="#16A085", fg="white", font=("Arial", 10, "bold"), command=self.save_inventory_item)
        btn_add_inv.grid(row=1, column=0, columnspan=2, pady=5)

        columns = ("id", "name", "cat", "qty", "cost", "min")
        self.tree_inv = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["ID", "اسم القماش/الصنف", "التصنيف", "الكمية بالمخزون (متر)", "تكلفة المتر ($)", "حد التنبيه بالنفاذ"]
        for col, h in zip(columns, headings):
            self.tree_inv.heading(col, text=h)
            self.tree_inv.column(col, anchor="center")
        self.tree_inv.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.load_inventory()

    def save_inventory_item(self):
        name = self.ent_inv_name.get()
        cat = self.combo_inv_cat.get()
        qty_str = self.ent_inv_qty.get() or "0"
        cost_str = self.ent_inv_cost.get() or "0"
        min_str = self.ent_inv_min.get() or "5.0"

        if not name:
            messagebox.showwarning("تنبيه", "ادخل اسم القماش!")
            return

        try:
            qty = float(qty_str)
            cost = float(cost_str)
            min_alert = float(min_str)

            conn = sqlite3.connect('little_princesses.db')
            cursor = conn.cursor()
            cursor.execute("INSERT OR REPLACE INTO inventory (item_name, category, quantity_meters, cost_per_meter, min_alert_qty) VALUES (?, ?, ?, ?, ?)",
                           (name, cat, qty, cost, min_alert))
            conn.commit()
            conn.close()

            messagebox.showinfo("نجاح", f"تم حفظ القماش '{name}' بالمخزون بنجاح!")
            self.ent_inv_name.delete(0, tk.END)
            self.ent_inv_qty.delete(0, tk.END)
            self.ent_inv_cost.delete(0, tk.END)
            self.load_inventory()
        except ValueError:
            messagebox.showerror("خطأ", "ادخل أرقاماً صحيحة!")

    def load_inventory(self):
        for r in self.tree_inv.get_children():
            self.tree_inv.delete(r)
        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT id, item_name, category, quantity_meters, cost_per_meter, min_alert_qty FROM inventory ORDER BY id DESC")
        for row in cursor.fetchall():
            self.tree_inv.insert("", tk.END, values=row)
        conn.close()

    def build_customers_module(self, frame):
        f_in = tk.LabelFrame(frame, text=" تسجيل عميل جديد والمقاسات ومنصة التواصل الاجتماعي الذكية ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_in.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(f_in, text="اسم العميل:").grid(row=0, column=5, padx=5, pady=5, sticky="e")
        self.ent_c_name = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_c_name.grid(row=0, column=4, padx=5, pady=5)

        tk.Label(f_in, text="رقم الهاتف:").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.ent_c_phone = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_c_phone.grid(row=0, column=2, padx=5, pady=5)

        tk.Label(f_in, text="منصة التواصل:").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        self.combo_c_social_platform = ttk.Combobox(f_in, values=["انستغرام (Instagram)", "تيك توك (TikTok)", "فيسبوك (Facebook)", "واتساب (WhatsApp)"], state="readonly", width=18)
        self.combo_c_social_platform.grid(row=0, column=0, padx=5, pady=5)
        self.combo_c_social_platform.current(0)

        tk.Label(f_in, text="اسم الحساب/المعرف (@):").grid(row=1, column=5, padx=5, pady=5, sticky="e")
        self.ent_c_social = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_c_social.grid(row=1, column=4, padx=5, pady=5)

        tk.Label(f_in, text="العنوان:").grid(row=1, column=3, padx=5, pady=5, sticky="e")
        self.ent_c_address = tk.Entry(f_in, font=("Arial", 10), justify="right")
        self.ent_c_address.grid(row=1, column=2, padx=5, pady=5)

        tk.Label(f_in, text="وحدة القياس:").grid(row=1, column=1, padx=5, pady=5, sticky="e")
        self.combo_c_unit = ttk.Combobox(f_in, values=["سم (cm)", "إنش (inch)"], state="readonly", width=12)
        self.combo_c_unit.grid(row=1, column=0, padx=5, pady=5)
        self.combo_c_unit.current(0)

        tk.Label(f_in, text="الطول الكلي:").grid(row=2, column=5, padx=5, pady=5, sticky="e")
        self.ent_c_tlen = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_c_tlen.grid(row=2, column=4, padx=5, pady=5)

        tk.Label(f_in, text="عرض الكتف:").grid(row=2, column=3, padx=5, pady=5, sticky="e")
        self.ent_c_shw = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_c_shw.grid(row=2, column=2, padx=5, pady=5)

        tk.Label(f_in, text="دوران الصدر:").grid(row=2, column=1, padx=5, pady=5, sticky="e")
        self.ent_c_bust = tk.Entry(f_in, font=("Arial", 10), justify="right", width=12)
        self.ent_c_bust.grid(row=2, column=0, padx=5, pady=5)

        tk.Label(f_in, text="دوران الخصر:").grid(row=3, column=5, padx=5, pady=5, sticky="e")
        self.ent_c_waist = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_c_waist.grid(row=3, column=4, padx=5, pady=5)

        tk.Label(f_in, text="طول الكم:").grid(row=3, column=3, padx=5, pady=5, sticky="e")
        self.ent_c_sleeve = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_c_sleeve.grid(row=3, column=2, padx=5, pady=5)

        tk.Label(f_in, text="طول الصدر:").grid(row=3, column=1, padx=5, pady=5, sticky="e")
        self.ent_c_chestlen = tk.Entry(f_in, font=("Arial", 10), justify="right", width=12)
        self.ent_c_chestlen.grid(row=3, column=0, padx=5, pady=5)

        tk.Label(f_in, text="مصدر الاكتساب:").grid(row=4, column=5, padx=5, pady=5, sticky="e")
        self.combo_c_source = ttk.Combobox(f_in, values=["Organic", "Paid Ads", "Referral", "Other"], state="readonly", width=15)
        self.combo_c_source.grid(row=4, column=4, padx=5, pady=5)
        self.combo_c_source.current(0)

        tk.Label(f_in, text="اسم الحملة الإعلانية:").grid(row=4, column=3, padx=5, pady=5, sticky="e")
        self.ent_c_campaign = tk.Entry(f_in, font=("Arial", 10), justify="right", width=15)
        self.ent_c_campaign.grid(row=4, column=2, padx=5, pady=5)

        btn_add_c = tk.Button(f_in, text="📐 حفظ العميل والبيانات", bg="#E67E22", fg="white", font=("Arial", 10, "bold"), command=self.save_customer)
        btn_add_c.grid(row=5, column=3, columnspan=3, pady=10)

        btn_social_msg = tk.Button(f_in, text="📲 فتح حساب العميل / المراسلة الذكية", bg="#8E44AD", fg="white", font=("Arial", 10, "bold"), command=self.open_social_chat)
        btn_social_msg.grid(row=5, column=0, columnspan=3, pady=10)

        columns = ("id", "name", "phone", "platform", "social", "address", "unit", "tlen", "shw", "bust", "waist", "sleeve", "chestlen")
        self.tree_cust = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["ID", "اسم العميل", "الهاتف", "المنصة", "اسم الحساب", "العنوان", "الوحدة", "الطول الكلي", "عرض الكتف", "دوران الصدر", "دوران الخصر", "طول الكم", "طول الصدر"]
        for col, h in zip(columns, headings):
            self.tree_cust.heading(col, text=h)
            self.tree_cust.column(col, anchor="center", width=90)
        self.tree_cust.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        self.load_customers()

    def open_social_chat(self):
        selected_item = self.tree_cust.selection()
        if not selected_item:
            messagebox.showwarning("تنبيه", "حدد عميلاً من الجدول لمراسلته أو فتح حسابه!")
            return

        item_vals = self.tree_cust.item(selected_item)['values']
        phone = str(item_vals[2]).strip()
        platform = str(item_vals[3]).strip()
        social_handle = str(item_vals[4]).replace("@", "").strip()

        if "تيك توك" in platform:
            if social_handle:
                webbrowser.open(f"https://www.tiktok.com/@{social_handle}")
                messagebox.showinfo("توجيه تلقائي", f"تم فتح حساب تيك توك: @{social_handle}")
            else:
                messagebox.showwarning("تنبيه", "اسم حساب تيك توك غير مسجل!")
        elif "فيسبوك" in platform:
            if social_handle:
                webbrowser.open(f"https://www.facebook.com/{social_handle}")
                messagebox.showinfo("توجيه تلقائي", f"تم فتح حساب فيسبوك: {social_handle}")
            else:
                messagebox.showwarning("تنبيه", "اسم حساب فيسبوك غير مسجل!")
        elif "واتساب" in platform:
            if phone:
                webbrowser.open(f"https://api.whatsapp.com/send?phone={phone}")
                messagebox.showinfo("توجيه تلقائي", f"تم فتح المحادثة المباشرة عبر الواتساب مع {phone}")
            else:
                messagebox.showwarning("تنبيه", "رقم الهاتف غير مسجل!")
        else:
            if social_handle:
                webbrowser.open(f"https://www.instagram.com/{social_handle}")
                messagebox.showinfo("توجيه تلقائي", f"تم فتح حساب انستغرام: @{social_handle}")
            else:
                messagebox.showwarning("تنبيه", "اسم حساب انستغرام غير مسجل!")

    def save_customer(self):
        name = self.ent_c_name.get()
        phone = self.ent_c_phone.get()
        platform = self.combo_c_social_platform.get()
        social = self.ent_c_social.get()
        address = self.ent_c_address.get()
        unit = self.combo_c_unit.get()
        tlen = self.ent_c_tlen.get()
        shw = self.ent_c_shw.get()
        bust = self.ent_c_bust.get()
        waist = self.ent_c_waist.get()
        sleeve = self.ent_c_sleeve.get()
        chestlen = self.ent_c_chestlen.get()
        acq_source = getattr(self, "combo_c_source", None) and self.combo_c_source.get() or ""
        ad_campaign = getattr(self, "ent_c_campaign", None) and self.ent_c_campaign.get() or ""

        if not name:
            messagebox.showwarning("تنبيه", "ادخل اسم العميل!")
            return

        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute(\'\'\'INSERT INTO customers 
            (name, phone, social_platform, social_handle, address, unit, total_length, shoulder_width, bust_circ, waist_circ, sleeve_length, chest_length, acquisition_source, ad_campaign) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\'\'\',
            (name, phone, platform, social, address, unit, tlen, shw, bust, waist, sleeve, chestlen, acq_source, ad_campaign))
        conn.commit()
        conn.close()

        messagebox.showinfo("نجاح", f"تم حفظ العميل '{name}' والمنصة والمقاسات بنجاح!")
        self.load_customers()
        self.refresh_sales_dropdowns()

    def load_customers(self):
        for r in self.tree_cust.get_children():
            self.tree_cust.delete(r)
        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, phone, social_platform, social_handle, address, unit, total_length, shoulder_width, bust_circ, waist_circ, sleeve_length, chest_length FROM customers ORDER BY id DESC")
        for row in cursor.fetchall():
            self.tree_cust.insert("", tk.END, values=row)
        conn.close()

    def build_statements_module(self, frame):
        f_top = tk.Frame(frame)
        f_top.pack(fill=tk.X, padx=10, pady=10)

        tk.Label(f_top, text="ابحث عن اسم العميل/الخياط لرؤية كشف الحساب المفصل:", font=("Arial", 11, "bold")).pack(side=tk.RIGHT, padx=5)
        self.ent_stmt_search = tk.Entry(f_top, font=("Arial", 10), justify="right")
        self.ent_stmt_search.pack(side=tk.RIGHT, padx=5)

        btn_search = tk.Button(f_top, text="🔍 عرض كشف الحساب", bg="#34495E", fg="white", font=("Arial", 10, "bold"), command=self.search_statement)
        btn_search.pack(side=tk.RIGHT, padx=5)

        columns = ("type", "ref_no", "date", "party", "amount", "notes")
        self.tree_stmt = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["نوع الحركة", "رقم المرجع", "التاريخ", "الطرف", "المبلغ ($)", "البيان والتفاصيل"]
        for col, h in zip(columns, headings):
            self.tree_stmt.heading(col, text=h)
            self.tree_stmt.column(col, anchor="center")
        self.tree_stmt.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

    def search_statement(self):
        query = self.ent_stmt_search.get()
        if not query: return

        for r in self.tree_stmt.get_children():
            self.tree_stmt.delete(r)

        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()

        cursor.execute("SELECT 'فاتورة مبيعات', order_no, order_date, customer_name, total_amount, product_name FROM orders WHERE customer_name LIKE ?", (f"%{query}%",))
        for row in cursor.fetchall():
            self.tree_stmt.insert("", tk.END, values=row)

        cursor.execute("SELECT voucher_type, voucher_no, date_created, party_name, amount, notes FROM vouchers WHERE party_name LIKE ?", (f"%{query}%",))
        for row in cursor.fetchall():
            self.tree_stmt.insert("", tk.END, values=row)

        conn.close()

    def build_accounts_module(self, frame):
        columns = ("code", "name", "type", "balance")
        self.tree_acc = ttk.Treeview(frame, columns=columns, show="headings")
        headings = ["رقم الحساب", "اسم الحساب", "نوع الحساب", "الرصيد الحالي ($)"]
        for col, h in zip(columns, headings):
            self.tree_acc.heading(col, text=h)
            self.tree_acc.column(col, anchor="center")
        self.tree_acc.pack(fill=tk.BOTH, expand=True, padx=10, pady=15)

        self.load_accounts()

    def load_accounts(self):
        if hasattr(self, 'tree_acc'):
            for r in self.tree_acc.get_children():
                self.tree_acc.delete(r)
            conn = sqlite3.connect('little_princesses.db')
            cursor = conn.cursor()
            cursor.execute("SELECT acc_code, acc_name, acc_type, balance FROM accounts ORDER BY acc_code ASC")
            for r in cursor.fetchall():
                self.tree_acc.insert("", tk.END, values=r)
            conn.close()

    def build_settings_module(self, frame):
        f_store = tk.LabelFrame(frame, text=" ⚙️ الإعدادات العامة للمتجر والطابعة ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_store.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(f_store, text="اسم المتجر/المشروع:").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.ent_sett_store = tk.Entry(f_store, font=("Arial", 10), justify="right", width=30)
        self.ent_sett_store.insert(0, self.get_setting('store_name'))
        self.ent_sett_store.grid(row=0, column=2, padx=5, pady=5)

        tk.Label(f_store, text="إيميل النسخ الاحتياطي:").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        self.ent_sett_email = tk.Entry(f_store, font=("Arial", 10), justify="right", width=30)
        self.ent_sett_email.insert(0, self.get_setting('backup_email'))
        self.ent_sett_email.grid(row=0, column=0, padx=5, pady=5)

        tk.Label(f_store, text="نوع الطابعة المعرف:").grid(row=1, column=3, padx=5, pady=5, sticky="e")
        self.combo_sett_printer = ttk.Combobox(f_store, values=["طابعة حرارية 80mm (Thermal POS)", "طابعة مستندات ورقية (A4 / A5)"], state="readonly", width=28)
        self.combo_sett_printer.grid(row=1, column=2, padx=5, pady=5)
        self.combo_sett_printer.set(self.get_setting('printer_type'))

        btn_save_sett = tk.Button(f_store, text="💾 حفظ الإعدادات العامة", bg="#2980B9", fg="white", font=("Arial", 10, "bold"), command=self.save_general_settings)
        btn_save_sett.grid(row=1, column=0, columnspan=2, pady=5)

        f_users = tk.LabelFrame(frame, text=" 🔐 إدارة المستخدمين وتوزيع الصلاحيات ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_users.pack(fill=tk.X, padx=10, pady=5)

        tk.Label(f_users, text="اسم مستخدم جديد:").grid(row=0, column=5, padx=5, pady=5, sticky="e")
        self.ent_u_name = tk.Entry(f_users, font=("Arial", 10), justify="right", width=15)
        self.ent_u_name.grid(row=0, column=4, padx=5, pady=5)

        tk.Label(f_users, text="كلمة السر:").grid(row=0, column=3, padx=5, pady=5, sticky="e")
        self.ent_u_pass = tk.Entry(f_users, font=("Arial", 10), justify="right", width=15)
        self.ent_u_pass.grid(row=0, column=2, padx=5, pady=5)

        tk.Label(f_users, text="الصلاحية:").grid(row=0, column=1, padx=5, pady=5, sticky="e")
        self.combo_u_role = ttk.Combobox(f_users, values=["المدير العام", "كاشير ومبيعات", "مديرة الورشة"], state="readonly", width=15)
        self.combo_u_role.grid(row=0, column=0, padx=5, pady=5)
        self.combo_u_role.current(1)

        btn_add_user = tk.Button(f_users, text="👤 إضافة المستخدم", bg="#8E44AD", fg="white", font=("Arial", 10, "bold"), command=self.add_user)
        btn_add_user.grid(row=1, column=0, columnspan=6, pady=8)

        f_bk = tk.LabelFrame(frame, text=" 💾 النسخ الاحتياطي والاستعادة ", font=("Arial", 11, "bold"), padx=10, pady=10)
        f_bk.pack(fill=tk.X, padx=10, pady=5)

        btn_manual_bk = tk.Button(f_bk, text="📂 أخذ نسخة احتياطية فورية (Backup)", bg="#27AE60", fg="white", font=("Arial", 10, "bold"), command=self.manual_backup)
        btn_manual_bk.pack(side=tk.LEFT, padx=15)

    def save_general_settings(self):
        s_name = self.ent_sett_store.get()
        s_email = self.ent_sett_email.get()
        s_print = self.combo_sett_printer.get()

        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("REPLACE INTO settings (key, value) VALUES ('store_name', ?)", (s_name,))
        cursor.execute("REPLACE INTO settings (key, value) VALUES ('backup_email', ?)", (s_email,))
        cursor.execute("REPLACE INTO settings (key, value) VALUES ('printer_type', ?)", (s_print,))
        conn.commit()
        conn.close()

        messagebox.showinfo("نجاح", "تم حفظ الإعدادات العامة بنجاح!")

    def add_user(self):
        u = self.ent_u_name.get()
        p = self.ent_u_pass.get()
        r = self.combo_u_role.get()

        if not u or not p:
            messagebox.showwarning("تنبيه", "ادخل اسم المستخدم وكلمة السر!")
            return

        try:
            conn = sqlite3.connect('little_princesses.db')
            cursor = conn.cursor()
            cursor.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", (u, p, r))
            conn.commit()
            conn.close()
            messagebox.showinfo("نجاح", f"تم إضافة المستخدم '{u}' بنجاح!")
            self.ent_u_name.delete(0, tk.END)
            self.ent_u_pass.delete(0, tk.END)
        except sqlite3.IntegrityError:
            messagebox.showerror("خطأ", "اسم المستخدم موجود مسبقاً!")

    def manual_backup(self):
        try:
            if not os.path.exists('backups'):
                os.makedirs('backups')
            now_str = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
            backup_path = f"backups/manual_backup_{now_str}.db"
            shutil.copy('little_princesses.db', backup_path)
            messagebox.showinfo("النسخ الاحتياطي", f"تم حفظ النسخة الاحتياطية بنجاح:\n{backup_path}")
        except Exception as e:
            messagebox.showerror("خطأ", f"حدث خطأ: {e}")

    def update_dashboard_cash(self):
        conn = sqlite3.connect('little_princesses.db')
        cursor = conn.cursor()
        cursor.execute("SELECT balance FROM accounts WHERE acc_code = 101")
        res = cursor.fetchone()
        cash_balance = res[0] if res else 0.0

        cursor.execute("SELECT balance FROM accounts WHERE acc_code = 103")
        res_b = cursor.fetchone()
        bank_balance = res_b[0] if res_b else 0.0

        cursor.execute("SELECT SUM(profit) FROM orders")
        res_p = cursor.fetchone()
        total_profit = res_p[0] if res_p[0] else 0.0
        conn.close()

        if hasattr(self, 'lbl_dash_cash'):
            self.lbl_dash_cash.config(text=f"${cash_balance:.2f}")
        if hasattr(self, 'lbl_dash_bank'):
            self.lbl_dash_bank.config(text=f"${bank_balance:.2f}")
        if hasattr(self, 'lbl_dash_profit'):
            self.lbl_dash_profit.config(text=f"${total_profit:.2f}")

if __name__ == "__main__":
    init_full_erp_db()
    root = tk.Tk()
    login_app = LoginWindow(root)
    root.mainloop()
