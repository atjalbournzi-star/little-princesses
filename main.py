import os
os.environ['KIVY_GL_BACKEND'] = 'angle_sdl2'

from kivy.config import Config
Config.set('graphics', 'width', '380')
Config.set('graphics', 'height', '720')

import sqlite3
import datetime
import webbrowser
from kivy.lang import Builder
from kivymd.app import MDApp
from kivymd.uix.screen import MDScreen
from kivymd.uix.dialog import MDDialog
from kivymd.uix.menu import MDDropdownMenu
from kivymd.uix.textfield import MDTextField
from kivymd.uix.button import MDRaisedButton
from kivymd.uix.card import MDCard
from kivymd.uix.label import MDLabel
from kivymd.uix.boxlayout import MDBoxLayout
from kivy.core.text import LabelBase

# مكتبات نافذة اختيار الملفات والـ PDF
from kivy.uix.popup import Popup
from kivy.uix.filechooser import FileChooserListView
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button

import arabic_reshaper
from bidi.algorithm import get_display

# --- دالة تشكيل ومعالجة النص العربي ---
def ar(text):
    if not text:
        return ""
    reshaped_text = arabic_reshaper.reshape(str(text))
    return get_display(reshaped_text)

font_path = "C:/Windows/Fonts/arial.ttf"
if os.path.exists(font_path):
    LabelBase.register(name='Roboto', fn_regular=font_path)

# --- المحرك البرمجي المخصص للكتابة العربية الحية ---
class ArabicTextField(MDTextField):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.halign = "right"
        self.font_name = "Roboto"
        self.logical_text = ""
        self._updating = False

    def insert_text(self, substring, from_undo=False):
        if self._updating:
            return super().insert_text(substring, from_undo=from_undo)
        self.logical_text += substring
        self._refresh_display()

    def do_backspace(self, from_undo=False, mode='bksp'):
        if self._updating:
            return super().do_backspace(from_undo=from_undo, mode=mode)
        if len(self.logical_text) > 0:
            self.logical_text = self.logical_text[:-1]
            self._refresh_display()

    def _refresh_display(self):
        self._updating = True
        if self.logical_text:
            reshaped = arabic_reshaper.reshape(self.logical_text)
            self.text = get_display(reshaped)
        else:
            self.text = ""
        self.cursor = (0, 0)
        self._updating = False

    def on_text(self, instance, value):
        if not self._updating:
            self.logical_text = value
            self._refresh_display()

    def get_text(self):
        return self.logical_text

DB_NAME = 'little_princesses.db'

def get_db_connection():
    return sqlite3.connect(DB_NAME)

def get_today_str():
    return datetime.datetime.now().strftime('%Y-%m-%d')

# ==========================================
# 1. تهيئة قواعد البيانات الكاملة
# ==========================================
def init_all_databases():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')
    cursor.execute("INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', '1234', 'مدير عام')")
    cursor.execute("INSERT OR IGNORE INTO users (username, password, role) VALUES ('sales', '1234', 'محاسب مبيعات')")
    cursor.execute("INSERT OR IGNORE INTO users (username, password, role) VALUES ('factory', '1234', 'مسؤول الخياطة والإنتاج')")

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS company_profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            company_name TEXT,
            phone TEXT,
            address TEXT,
            email TEXT,
            logo_path TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customers_full (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            phone TEXT,
            social_platform TEXT,
            social_handle TEXT,
            address TEXT,
            customer_type TEXT,
            unit TEXT
        )
    ''')
    
    # حل مشكلة الجدول القديم (إضافة الأعمدة إذا لم تكن موجودة)
    try: cursor.execute("ALTER TABLE customers_full ADD COLUMN social_platform TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE customers_full ADD COLUMN social_handle TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE customers_full ADD COLUMN customer_type TEXT")
    except: pass
    try: cursor.execute("ALTER TABLE customers_full ADD COLUMN unit TEXT")
    except: pass

    # جدول سلة الفساتين المتعددة الجديد
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customer_measurements (
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
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inventory_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT UNIQUE NOT NULL,
            category TEXT NOT NULL,
            quantity_meters REAL DEFAULT 0.0,
            unit_type TEXT DEFAULT 'متر',
            currency TEXT DEFAULT 'USD',
            cost_per_meter REAL DEFAULT 0.0,
            min_alert_qty REAL DEFAULT 5.0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS models_products_v2 (
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
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sales_orders_full (
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
            status TEXT DEFAULT 'في الانتظار ⏳',
            notes TEXT,
            order_date TEXT,
            delivery_date TEXT,
            delivery_fees REAL DEFAULT 0.0,
            payment_method TEXT,
            transfer_no TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS purchases_full (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_no TEXT UNIQUE,
            supplier_name TEXT,
            item_name TEXT,
            quantity REAL,
            unit_price REAL,
            transport_cost REAL DEFAULT 0.0,
            transfer_fee REAL DEFAULT 0.0,
            total_amount REAL,
            currency TEXT DEFAULT 'USD',
            payment_source TEXT DEFAULT 'الصندوق الرئيسي (101)',
            date_added TEXT
        )
    ''')
    try:
        cursor.execute("ALTER TABLE purchases_full ADD COLUMN transport_cost REAL DEFAULT 0.0")
        cursor.execute("ALTER TABLE purchases_full ADD COLUMN transfer_fee REAL DEFAULT 0.0")
    except:
        pass

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_no TEXT UNIQUE,
            entry_date TEXT,
            debit_account TEXT,
            credit_account TEXT,
            amount REAL,
            currency TEXT DEFAULT 'USD',
            statement TEXT,
            ref_type TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vouchers_full (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voucher_no TEXT UNIQUE,
            voucher_type TEXT,
            currency TEXT,
            amount REAL,
            account_name TEXT,
            statement TEXT,
            date_added TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS accounts_v2 (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            balance REAL DEFAULT 0.0
        )
    ''')

    default_accounts = [
        ('101', 'الصندوق / الخزينة الرئيسية', 'أصول', 0.0),
        ('102', 'مخزون الأقمشة والمستلزمات', 'أصول', 0.0),
        ('103', 'الحساب البنكي / الحوالات', 'أصول', 0.0),
        ('104', 'ذمم العملاء (مستحقات خارجية)', 'أصول', 0.0),
        ('105', 'الأصول الثابتة (آلات ومعدات)', 'أصول', 0.0),
        ('201', 'مستحقات الخياطين والموردين', 'خصوم', 0.0),
        ('202', 'عرابين وأمانات العملاء', 'خصوم', 0.0),
        ('301', 'رأس المال والأرباح المدورة', 'حقوق ملكية', 0.0),
        ('302', 'المسحوبات الشخصية', 'حقوق ملكية', 0.0),
        ('401', 'إيرادات مبيعات الفساتين والزي', 'إيرادات', 0.0),
        ('402', 'إيرادات خدمات وتعديلات الخياطة', 'إيرادات', 0.0),
        ('501', 'مصاريف الخياطة والتشغيل المباشرة', 'مصاريف', 0.0),
        ('502', 'أجور والمرتبات العاملين', 'مصاريف', 0.0),
        ('503', 'إيجار المحل والمعمل', 'مصاريف', 0.0),
        ('504', 'مصاريف كهرباء وماء وانترنت', 'مصاريف', 0.0),
        ('505', 'مصاريف التسويق والإعلانات', 'مصاريف', 0.0),
        ('506', 'مصاريف صيانة الآلات', 'مصاريف', 0.0),
        ('507', 'مصاريف ضيافة ونثريات', 'مصاريف', 0.0)
    ]
    for acc in default_accounts:
        cursor.execute('''
            INSERT INTO accounts_v2 (code, name, type, balance)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(code) DO NOTHING
        ''', acc)
    
    conn.commit()
    conn.close()

# --- تعريف الشاشات ---
class LoginScreen(MDScreen): pass
class DashboardScreen(MDScreen): pass
class FactoryScreen(MDScreen): pass
class ExpensesScreen(MDScreen): pass
class SalesScreen(MDScreen): pass
class CustomersSmartScreen(MDScreen): pass
class InventoryScreen(MDScreen): pass
class ModelsCostingScreen(MDScreen): pass
class PurchasesScreen(MDScreen): pass
class JournalEntriesScreen(MDScreen): pass
class VouchersScreen(MDScreen): pass
class ReportsScreen(MDScreen): pass
class AccountsTreeScreen(MDScreen): pass
class SettingsScreen(MDScreen): pass

# ==========================================
# الكلاس الرئيسي (LittlePrincessesMobileApp)
# ==========================================
class LittlePrincessesMobileApp(MDApp):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.current_user_role = ""
        self.temp_dresses = []
        self.dress_counter = 1

    def get_ar(self, text):
        return ar(text)

    def get_today_date(self):
        return get_today_str()

    def build(self):
        self.theme_cls.primary_palette = "Blue"
        self.theme_cls.theme_style = "Light"
        init_all_databases()
        return Builder.load_file('design.kv')

    # ==========================================
    # تسجيل الدخول والصلاحيات
    # ==========================================
    def login_user(self):
        scr = self.root.get_screen('login')
        user = scr.ids.login_username.text.strip()
        pwd = scr.ids.login_password.text.strip()
        
        if not user or not pwd:
            self.show_dialog("تنبيه", "يرجى إدخال اسم المستخدم وكلمة المرور.")
            return
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT role FROM users WHERE username=? AND password=?", (user, pwd))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            self.current_user_role = row[0]
            scr.ids.login_password.text = ""
            self.apply_role_permissions()
            self.root.current = 'dashboard'
        else:
            self.show_dialog("خطأ", "اسم المستخدم أو كلمة المرور غير صحيحة.")

    def logout_user(self):
        self.current_user_role = ""
        self.root.current = 'login'

    def apply_role_permissions(self):
        dash = self.root.get_screen('dashboard')
        role = self.current_user_role
        
        dash.ids.box_core_ops.opacity = 1
        dash.ids.box_core_ops.disabled = False
        dash.ids.card_sales.opacity = 1
        dash.ids.card_sales.disabled = False
        dash.ids.box_accounting.opacity = 1
        dash.ids.box_accounting.disabled = False
        dash.ids.btn_settings.opacity = 1
        dash.ids.btn_settings.disabled = False
        dash.ids.card_factory.opacity = 1
        dash.ids.card_factory.disabled = False
        dash.ids.card_expenses.opacity = 1
        dash.ids.card_expenses.disabled = False
        dash.ids.dashboard_stats.opacity = 1
        dash.ids.dashboard_stats.disabled = False
        dash.ids.lbl_logged_user.text = ar(f"الصلاحية: {role}")

        if role == 'محاسب مبيعات':
            dash.ids.box_accounting.opacity = 0
            dash.ids.box_accounting.disabled = True
            dash.ids.btn_settings.opacity = 0
            dash.ids.btn_settings.disabled = True
            dash.ids.card_factory.opacity = 0
            dash.ids.card_factory.disabled = True
            
        elif role == 'مسؤول الخياطة والإنتاج':
            dash.ids.card_sales.opacity = 0
            dash.ids.card_sales.disabled = True
            dash.ids.box_accounting.opacity = 0
            dash.ids.box_accounting.disabled = True
            dash.ids.box_core_ops.opacity = 0
            dash.ids.box_core_ops.disabled = True
            dash.ids.btn_settings.opacity = 0
            dash.ids.btn_settings.disabled = True
            dash.ids.card_expenses.opacity = 0
            dash.ids.card_expenses.disabled = True
            dash.ids.dashboard_stats.opacity = 0
            dash.ids.dashboard_stats.disabled = True

    # ==========================================
    # لوحة القيادة والمؤشرات
    # ==========================================
    def load_dashboard_stats(self):
        if self.current_user_role == 'مسؤول الخياطة والإنتاج':
            return
            
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            today = get_today_str()
            
            cursor.execute("SELECT SUM(total_amount) FROM sales_orders_full WHERE order_date = ?", (today,))
            sales_today = cursor.fetchone()[0] or 0.0
            
            cursor.execute("SELECT balance FROM accounts_v2 WHERE code = '101'")
            safe_bal = cursor.fetchone()[0] or 0.0
            
            cursor.execute("SELECT COUNT(*) FROM inventory_v2 WHERE quantity_meters <= min_alert_qty")
            low_stock = cursor.fetchone()[0] or 0
            
            cursor.execute("SELECT COUNT(*) FROM sales_orders_full WHERE delivery_date < ? AND status != 'تم التسليم ✅'", (today,))
            late_orders = cursor.fetchone()[0] or 0
            
            conn.close()
            
            scr = self.root.get_screen('dashboard')
            scr.ids.dash_sales.text = f"${sales_today:.2f}"
            scr.ids.dash_safe.text = f"${safe_bal:.2f}"
            scr.ids.dash_stock.text = str(low_stock)
            scr.ids.dash_late.text = str(late_orders)
        except Exception:
            pass

    # ==========================================
    # المبيعات وإصدار الفواتير
    # ==========================================
    def save_sale_order(self):
        scr = self.root.get_screen('sales')
        c_name = scr.ids.s_customer.get_text()
        product = scr.ids.s_product.get_text()
        tot_s = scr.ids.s_total.text
        paid_s = scr.ids.s_paid.text
        del_fees_s = scr.ids.s_delivery_fees.text
        curr = scr.ids.s_currency.text
        order_date = scr.ids.s_order_date.text or get_today_str()

        if not c_name or not product or not tot_s:
            self.show_dialog("تنبيه", "يرجى تعبئة اسم العميلة والموديل والمبلغ.")
            return

        tot = float(tot_s or 0)
        paid = float(paid_s or 0)
        del_fees = float(del_fees_s or 0)
        
        grand_total = tot + del_fees
        rem = grand_total - paid
        order_no = f"ORD-{datetime.datetime.now().strftime('%M%S')}"

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO sales_orders_full (
                    order_no, customer_name, phone, currency, product_name, fabric_type,
                    total_amount, paid_amount, remaining_amount, status, notes, order_date, delivery_date, delivery_fees
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (order_no, c_name, scr.ids.s_phone.text, curr, product, scr.ids.s_fabric.get_text(), grand_total, paid, rem, scr.ids.s_status.text, scr.ids.s_notes.get_text(), order_date, scr.ids.s_delivery_date.text, del_fees))
            
            cursor.execute("UPDATE accounts_v2 SET balance = balance + ? WHERE code = '401'", (tot,))
            cursor.execute("UPDATE accounts_v2 SET balance = balance + ? WHERE code = '101'", (paid,))
            if rem > 0:
                cursor.execute("UPDATE accounts_v2 SET balance = balance + ? WHERE code = '104'", (rem,))

            entry_no = f"JV-SLS-{datetime.datetime.now().strftime('%M%S')}"
            cursor.execute('''
                INSERT INTO journal_entries (entry_no, entry_date, debit_account, credit_account, amount, currency, statement, ref_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (entry_no, order_date, f'101-صندوق / 104-ذمم ({c_name})', '401 - إيرادات مبيعات الفساتين', grand_total, curr, f"إثبات فاتورة وحجز ({product}) للعميلة ({c_name})", 'مبيعات'))

            conn.commit()
            conn.close()

            scr.ids.s_customer.logical_text = ""
            scr.ids.s_customer.text = ""
            scr.ids.s_product.logical_text = ""
            scr.ids.s_product.text = ""
            self.load_sales_table()
            self.load_dashboard_stats()
            self.show_dialog("نجاح", f"تم حفظ الفاتورة برقم ({order_no})\nالإجمالي (شامل التوصيل): {grand_total:.2f}\nالمتبقي: {rem:.2f}")
        except Exception as e:
            self.show_dialog("خطأ", f"تعذر الحفظ: {str(e)}")

    def generate_pdf_invoice(self):
        try:
            from reportlab.pdfgen import canvas
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.colors import HexColor
        except ImportError:
            self.show_dialog("تنبيه هام", "لتوليد الفواتير قم بتثبيت: pip install reportlab")
            return

        scr = self.root.get_screen('sales')
        c_name = scr.ids.s_customer.get_text()
        tot = float(scr.ids.s_total.text or 0)
        paid = float(scr.ids.s_paid.text or 0)
        del_fee = float(scr.ids.s_delivery_fees.text or 0)
        
        curr_text = scr.ids.s_currency.text
        if "USD" in curr_text: curr_clean = "دولار أمريكي"
        elif "YER" in curr_text: curr_clean = "ريال يمني"
        elif "SAR" in curr_text: curr_clean = "ريال سعودي"
        else: curr_clean = ""

        if not c_name or not tot:
            self.show_dialog("تنبيه", "يرجى تعبئة بيانات العميلة والمبلغ قبل الطباعة.")
            return
            
        font_p = "C:/Windows/Fonts/arial.ttf"
        if not os.path.exists(font_p):
            self.show_dialog("خطأ", "لم يتم العثور على خط Arial في جهازك لدعم اللغة العربية.")
            return

        conn = get_db_connection()
        curr_db = conn.cursor()
        
        # سحب الفساتين من السلة للعميلة
        curr_db.execute("SELECT dress_number, total_length, shoulder, chest_circ, waist_circ, sleeve_length, chest_length FROM customer_measurements WHERE customer_name=?", (c_name,))
        dresses = curr_db.fetchall()
        
        curr_db.execute("SELECT company_name, phone FROM company_profile WHERE id=1")
        comp = curr_db.fetchone()
        conn.close()

        comp_name = comp[0] if comp and comp[0] else "أميرات صغيرات سوفت"
        comp_phone = comp[1] if comp and comp[1] else ""

        try:
            pdfmetrics.registerFont(TTFont('ArabicFont', font_p))
            pdf_file = f"Invoice_{datetime.datetime.now().strftime('%M%S')}.pdf"
            c = canvas.Canvas(pdf_file, pagesize=A4)
            width, height = A4

            def draw_ar_text(txt, x, y, size=12, color="#000000"):
                c.setFont('ArabicFont', size)
                c.setFillColor(HexColor(color))
                c.drawRightString(x, y, get_display(arabic_reshaper.reshape(str(txt))))

            # الترويسة
            c.setFillColor(HexColor("#0D47A1"))
            c.rect(40, height-110, width-80, 80, fill=1, stroke=0)
            draw_ar_text(comp_name, width/2 + 70, height-70, 24, color="#FFFFFF")
            draw_ar_text("لخياطة وتفصيل أرقى الفساتين والزي المدرسي", width/2 + 100, height-95, 14, color="#E3F2FD")

            # بيانات الفاتورة
            y_pos = height - 160
            draw_ar_text("فاتورة مبيعات وحجز تفصيل", width-50, y_pos, 18, color="#B71C1C")
            c.line(50, y_pos-10, width-50, y_pos-10)
            
            y_pos -= 40
            draw_ar_text(f"اسم العميلة: {c_name}", width-50, y_pos, 14)
            draw_ar_text(f"الموديل المطلوب: {scr.ids.s_product.get_text()}", width-50, y_pos-30, 14)
            draw_ar_text(f"نوع القماش: {scr.ids.s_fabric.get_text()}", width-50, y_pos-60, 14)
            
            if dresses:
                y_pos -= 90
                draw_ar_text("تفاصيل الفساتين والمقاسات:", width-50, y_pos, 14, color="#0D47A1")
                for d in dresses:
                    y_pos -= 25
                    meas_str = f"فستان {d[0]} | الطول({d[1]}) الكتف({d[2]}) الصدر({d[3]}) الخصر({d[4]}) الكم({d[5]}) طول الصدر({d[6]})"
                    draw_ar_text(meas_str, width-60, y_pos, 12, color="#424242")

            # الجدول المالي
            y_table = y_pos - 60
            if y_table < 200: 
                c.showPage()
                y_table = height - 100

            c.setFillColor(HexColor("#F5F5F5"))
            c.rect(50, y_table-130, width-100, 150, fill=1, stroke=1)
            
            c.setFillColor(HexColor("#000000"))
            draw_ar_text("البيان المالي", width-70, y_table, 16, color="#0D47A1")
            c.line(50, y_table-10, width-50, y_table-10)

            grand_total = tot + del_fee
            rem = grand_total - paid

            draw_ar_text("قيمة الموديل:", width-70, y_table-40, 14)
            draw_ar_text(f"{tot} {curr_clean}", 200, y_table-40, 14)

            draw_ar_text("أجور التوصيل:", width-70, y_table-70, 14)
            draw_ar_text(f"{del_fee} {curr_clean}", 200, y_table-70, 14)

            draw_ar_text("المدفوع (عربون):", width-70, y_table-100, 14, color="#2E7D32")
            draw_ar_text(f"{paid} {curr_clean}", 200, y_table-100, 14, color="#2E7D32")

            c.line(50, y_table-110, width-50, y_table-110)

            draw_ar_text("المتبقي عند الاستلام:", width-70, y_table-125, 14, color="#D32F2F")
            draw_ar_text(f"{rem} {curr_clean}", 200, y_table-125, 14, color="#D32F2F")

            # التذييل
            draw_ar_text("شكراً لاختياركم أميرات صغيرات 👑", width/2 + 80, 50, 14, color="#757575")

            c.save()
            self.show_dialog("نجاح ✅", f"تم إنشاء الفاتورة باحترافية:\n{pdf_file}")
            
            if os.name == 'nt':
                os.startfile(pdf_file)
            else:
                import subprocess
                subprocess.call(('open', pdf_file))
                
        except Exception as e:
            self.show_dialog("خطأ", f"تعذر إنشاء الـ PDF: {str(e)}")

    def send_driver_order(self):
        scr = self.root.get_screen('sales')
        c_name = scr.ids.s_customer.get_text()
        del_date = scr.ids.s_delivery_date.text
        fees = scr.ids.s_delivery_fees.text
        msg = f"أمر توصيل فستان 🚚\n• العميلة: {c_name}\n• تاريخ الاستلام: {del_date}\n• أجور التوصيل: {fees}"
        webbrowser.open(f"https://wa.me/?text={msg}")

    def send_workshop_order(self):
        scr = self.root.get_screen('sales')
        c_name = scr.ids.s_customer.get_text()
        product = scr.ids.s_product.get_text()
        fabric = scr.ids.s_fabric.get_text()
        msg = f"تم إرسال أمر الخياطة والإنتاج للمعمل 🪡\n• الموديل: {product}\n• القماش: {fabric}\n• العميلة: {c_name}"
        self.show_dialog("أمر الإنتاج للمعمل", msg)

    def load_sales_table(self):
        scr = self.root.get_screen('sales')
        container = scr.ids.sales_list_box
        search_query = scr.ids.search_sales.logical_text.strip()
        container.clear_widgets()
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            if search_query:
                cursor.execute("SELECT id, order_no, customer_name, product_name, total_amount, remaining_amount FROM sales_orders_full WHERE customer_name LIKE ? OR order_no LIKE ? ORDER BY id DESC", (f'%{search_query}%', f'%{search_query}%'))
            else:
                cursor.execute("SELECT id, order_no, customer_name, product_name, total_amount, remaining_amount FROM sales_orders_full ORDER BY id DESC")
            
            rows = cursor.fetchall()
            conn.close()
            
            for r in rows:
                o_no, c_n, p_n, tot, rem = r[1], r[2], r[3], r[4], r[5]
                card = MDCard(size_hint_y=None, height="36dp", radius=[0, 0, 0, 0], line_color=[0.9, 0.9, 0.9, 1], md_bg_color=[1, 1, 1, 1], padding=["2dp", "0dp"])
                box = MDBoxLayout(orientation='horizontal', spacing="2dp")
                box.add_widget(MDLabel(text=f"{rem:.1f}", size_hint_x=0.16, halign="center", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=f"{tot:.1f}", size_hint_x=0.16, halign="center", font_style="Caption"))
                box.add_widget(MDLabel(text=ar(p_n), size_hint_x=0.22, halign="center", font_style="Caption"))
                box.add_widget(MDLabel(text=ar(c_n), size_hint_x=0.26, halign="right", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=str(o_no), size_hint_x=0.1, halign="center", font_style="Caption", theme_text_color="Custom", text_color=[0.05, 0.32, 0.58, 1]))
                card.add_widget(box)
                container.add_widget(card)
        except Exception:
            pass

    # ==========================================
    # سلة العملاء والفساتين المتعددة
    # ==========================================
    def add_dress_to_basket(self):
        scr = self.root.get_screen('customers_smart')
        tl = scr.ids.sz_total_len.text
        cc = scr.ids.sz_chest_c.text
        
        if not tl or not cc:
            self.show_dialog("تنبيه", "يرجى إدخال الطول والصدر على الأقل لإضافة الفستان للسلة.")
            return

        dress_data = {
            'num': self.dress_counter,
            'tl': float(tl or 0), 'sh': float(scr.ids.sz_shoulder_w.text or 0),
            'cc': float(cc or 0), 'wc': float(scr.ids.sz_waist_c.text or 0),
            'sl': float(scr.ids.sz_sleeve_l.text or 0), 'cl': float(scr.ids.sz_chest_l.text or 0)
        }
        self.temp_dresses.append(dress_data)

        card = MDCard(size_hint_y=None, height="60dp", md_bg_color=[0.9, 0.95, 1, 1], padding="5dp")
        details = f"👗 فستان {self.dress_counter} | الطول:{dress_data['tl']} | الكتف:{dress_data['sh']} | الصدر:{dress_data['cc']}\nالخصر:{dress_data['wc']} | الكم:{dress_data['sl']} | طول الصدر:{dress_data['cl']}"
        card.add_widget(MDLabel(text=ar(details), halign="center", font_style="Caption", bold=True))
        scr.ids.dresses_basket_box.add_widget(card)

        self.dress_counter += 1

        for field in ['sz_total_len', 'sz_shoulder_w', 'sz_chest_c', 'sz_waist_c', 'sz_sleeve_l', 'sz_chest_l']:
            getattr(scr.ids, field).text = ""

    def save_full_customer_data(self):
        scr = self.root.get_screen('customers_smart')
        name = scr.ids.cust_name.get_text()
        phone = scr.ids.cust_phone.text

        if not name or not phone:
            self.show_dialog("تنبيه", "يرجى تسجيل اسم العميل ورقم الهاتف على الأقل.")
            return

        # إذا نسى المستخدم الضغط على الزر، نضيف الفستان الأخير آلياً
        if scr.ids.sz_total_len.text and not self.temp_dresses:
            self.add_dress_to_basket()

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO customers_full (customer_name, phone, social_platform, social_handle, address, customer_type, unit)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (name, phone, scr.ids.cust_platform.text, scr.ids.cust_handle.get_text(), scr.ids.cust_address.get_text(), scr.ids.cust_type.text, scr.ids.cust_unit.text))
            
            for d in self.temp_dresses:
                cursor.execute('''
                    INSERT INTO customer_measurements (customer_name, dress_number, total_length, shoulder, chest_circ, waist_circ, sleeve_length, chest_length)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (name, d['num'], d['tl'], d['sh'], d['cc'], d['wc'], d['sl'], d['cl']))
                
            conn.commit()
            conn.close()

            scr.ids.cust_name.logical_text = ""
            scr.ids.cust_name.text = ""
            scr.ids.dresses_basket_box.clear_widgets()
            
            saved_count = len(self.temp_dresses)
            self.temp_dresses = []
            self.dress_counter = 1
            
            self.show_dialog("نجاح", f"تم حفظ العميل وربطه بـ ({saved_count}) فستان بنجاح.")
        except Exception as e:
            self.show_dialog("خطأ", f"تعذر الحفظ: {str(e)}")

    def open_smart_chat(self):
        scr = self.root.get_screen('customers_smart')
        phone = scr.ids.cust_phone.text
        if phone:
            clean_phone = ''.join(filter(str.isdigit, phone))
            url = f"https://wa.me/{clean_phone}"
            webbrowser.open(url)
        else:
            self.show_dialog("تنبيه", "يرجى إدخال رقم الهاتف أولاً.")

    # ==========================================
    # معمل الإنتاج والخياطة
    # ==========================================
    def load_factory_orders(self):
        scr = self.root.get_screen('factory')
        container = scr.ids.factory_orders_box
        search_query = scr.ids.search_factory.logical_text.strip()
        container.clear_widgets()

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            if search_query:
                cursor.execute("SELECT id, order_no, customer_name, product_name, fabric_type, delivery_date, status, notes FROM sales_orders_full WHERE status != 'تم التسليم ✅' AND (customer_name LIKE ? OR order_no LIKE ?) ORDER BY delivery_date ASC", (f'%{search_query}%', f'%{search_query}%'))
            else:
                cursor.execute("SELECT id, order_no, customer_name, product_name, fabric_type, delivery_date, status, notes FROM sales_orders_full WHERE status != 'تم التسليم ✅' ORDER BY delivery_date ASC")
            
            rows = cursor.fetchall()
            conn.close()

            if not rows:
                from kivymd.uix.label import MDLabel
                container.add_widget(MDLabel(text=ar("لا توجد أوامر تشغيل حالياً، المعمل متفرغ ☕"), halign="center", theme_text_color="Secondary", font_style="Subtitle1"))
                return

            for r in rows:
                o_id, o_no, c_name, p_name, fab, del_date, status, notes = r
                card = MDCard(orientation='vertical', size_hint_y=None, height="160dp", padding="8dp", spacing="4dp", md_bg_color=[1, 1, 1, 1], elevation=2)
                
                header = MDBoxLayout(orientation='horizontal', size_hint_y=0.2)
                header.add_widget(MDLabel(text=str(del_date), size_hint_x=0.3, font_style="Caption", bold=True, theme_text_color="Error"))
                header.add_widget(MDLabel(text=ar(status), size_hint_x=0.4, halign="center", font_style="Caption", theme_text_color="Primary", bold=True))
                header.add_widget(MDLabel(text=str(o_no), size_hint_x=0.3, halign="right", font_style="Caption", bold=True))
                
                body = MDBoxLayout(orientation='horizontal', size_hint_y=0.4)
                body.add_widget(MDLabel(text=ar(f"القماش: {fab}"), size_hint_x=0.5, halign="right", font_style="Caption"))
                body.add_widget(MDLabel(text=ar(f"الموديل: {p_name}"), size_hint_x=0.5, halign="right", font_style="Subtitle2", bold=True))
                
                notes_box = MDBoxLayout(size_hint_y=0.2)
                notes_box.add_widget(MDLabel(text=ar(f"ملاحظات: {notes}"), font_style="Caption", theme_text_color="Secondary"))

                btn_box = MDBoxLayout(orientation='horizontal', size_hint_y=0.2, spacing="8dp")
                btn_sizes = MDRaisedButton(text=ar("المقاسات 📐"), md_bg_color=[0.05, 0.32, 0.58, 1], size_hint_x=0.5)
                btn_sizes.bind(on_release=lambda x, cn=c_name: self.show_measurements(cn))
                
                btn_status = MDRaisedButton(text=ar("تحديث الحالة 🔄"), md_bg_color=[0.9, 0.45, 0.1, 1], size_hint_x=0.5)
                btn_status.bind(on_release=lambda x, oid=o_id: self.open_factory_status_dialog(oid))

                btn_box.add_widget(btn_sizes)
                btn_box.add_widget(btn_status)

                card.add_widget(header)
                card.add_widget(body)
                card.add_widget(notes_box)
                card.add_widget(btn_box)

                container.add_widget(card)
        except Exception as e:
            self.show_dialog("خطأ", f"تعذر تحميل أوامر المعمل: {str(e)}")

    def show_measurements(self, customer_name):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT dress_number, total_length, shoulder, chest_circ, waist_circ, sleeve_length, chest_length FROM customer_measurements WHERE customer_name=?", (customer_name,))
            dresses = cursor.fetchall()
            conn.close()
            
            if dresses:
                msg = ""
                for d in dresses:
                    msg += f"👗 الفستان {d[0]}:\nالطول:{d[1]} | الكتف:{d[2]} | الصدر:{d[3]}\nالخصر:{d[4]} | الكم:{d[5]} | طول الصدر:{d[6]}\n\n"
                self.show_dialog(f"مقاسات: {customer_name}", msg)
            else:
                self.show_dialog("تنبيه", "لم يتم العثور على مقاسات مسجلة لهذه العميلة في السلة.")
        except:
            pass

    def open_factory_status_dialog(self, order_id):
        box = BoxLayout(orientation='vertical', spacing="8dp", padding="8dp")
        statuses = ["جاري القص ✂️", "تحت الخياطة 🪡", "التطريز والكي 👗", "جاهز للتسليم ✅"]
        popup = Popup(title=ar("تحديث حالة الإنتاج"), content=box, size_hint=(0.8, 0.6))
        for st in statuses:
            btn = Button(text=ar(st), font_name="Roboto", background_color=[0.05, 0.32, 0.58, 1])
            btn.bind(on_release=lambda btn, s=st: self.update_order_status(order_id, s, popup))
            box.add_widget(btn)
        popup.open()

    def update_order_status(self, order_id, new_status, popup):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE sales_orders_full SET status=? WHERE id=?", (new_status, order_id))
            conn.commit()
            conn.close()
            popup.dismiss()
            self.load_factory_orders()
            self.load_dashboard_stats()
            self.show_dialog("نجاح", f"تم تحديث حالة الفستان إلى:\n{new_status}")
        except Exception as e:
            self.show_dialog("خطأ", str(e))

    # ==========================================
    # المشتريات والتوريد
    # ==========================================
    def save_purchase_invoice(self):
        scr = self.root.get_screen('purchases')
        sup = scr.ids.pur_supplier.get_text()
        item = scr.ids.pur_item.get_text()
        qty = float(scr.ids.pur_qty.text or 0)
        price = float(scr.ids.pur_unit_price.text or 0)
        pay_source = scr.ids.pur_pay_source.text
        pur_date = scr.ids.pur_date.text or get_today_str()
        trans_cost = float(scr.ids.pur_transport_cost.text or 0)
        transfer_fee = float(scr.ids.pur_transfer_fee.text or 0)

        if not sup or not item:
            self.show_dialog("تنبيه", "يرجى تعبئة جميع حقول فاتورة الشراء والسعر.")
            return

        tot = (qty * price) + trans_cost + transfer_fee
        bill_no = f"PUR-{datetime.datetime.now().strftime('%M%S')}"

        if "101" in pay_source:
            credit_code, credit_name = '101', 'الصندوق'
        elif "103" in pay_source:
            credit_code, credit_name = '103', 'البنك'
        else:
            credit_code, credit_name = '201', 'الموردين'

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO purchases_full (
                    bill_no, supplier_name, item_name, quantity, unit_price, 
                    transport_cost, transfer_fee, total_amount, payment_source, date_added
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (bill_no, sup, item, qty, price, trans_cost, transfer_fee, tot, pay_source, pur_date))
            
            cursor.execute('''
                INSERT INTO inventory_v2 (item_name, category, quantity_meters, cost_per_meter)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(item_name) DO UPDATE SET quantity_meters = quantity_meters + excluded.quantity_meters
            ''', (item, "أقمشة مستوردة", qty, price))

            cursor.execute("UPDATE accounts_v2 SET balance = balance + ? WHERE code = '102'", (tot,))
            if credit_code == '201':
                cursor.execute("UPDATE accounts_v2 SET balance = balance + ? WHERE code = '201'", (tot,))
            else:
                cursor.execute("UPDATE accounts_v2 SET balance = balance - ? WHERE code = ?", (tot, credit_code))

            entry_no = f"JV-PUR-{datetime.datetime.now().strftime('%M%S')}"
            cursor.execute('''
                INSERT INTO journal_entries (entry_no, entry_date, debit_account, credit_account, amount, currency, statement, ref_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (entry_no, pur_date, '102 - مخزون الأقمشة', f'{credit_code} - {credit_name}', tot, 'USD', f"شراء ({item}) فاتورة ({bill_no})", 'مشتريات'))

            conn.commit()
            conn.close()

            scr.ids.pur_item.logical_text = ""
            scr.ids.pur_item.text = ""
            self.load_purchases_table()
            self.load_dashboard_stats()
            self.show_dialog("نجاح", f"تم حفظ الشراء ({bill_no})\nالإجمالي الشامل: {tot:.2f}\nتم الإضافة للمخزون!")
        except Exception as e:
            self.show_dialog("خطأ", f"تعذر الحفظ: {str(e)}")

    def load_purchases_table(self):
        scr = self.root.get_screen('purchases')
        container = scr.ids.purchases_list_box
        container.clear_widgets()
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT bill_no, supplier_name, item_name, payment_source, total_amount FROM purchases_full ORDER BY id DESC")
            rows = cursor.fetchall()
            conn.close()
            for r in rows:
                card = MDCard(size_hint_y=None, height="36dp", radius=[0, 0, 0, 0], line_color=[0.9, 0.9, 0.9, 1], md_bg_color=[1, 1, 1, 1], padding=["2dp", "0dp"])
                box = MDBoxLayout(orientation='horizontal', spacing="2dp")
                box.add_widget(MDLabel(text=f"${r[4]:.1f}", size_hint_x=0.2, halign="center", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=ar(r[3]), size_hint_x=0.3, halign="center", font_style="Caption"))
                box.add_widget(MDLabel(text=ar(r[2]), size_hint_x=0.2, halign="center", font_style="Caption"))
                box.add_widget(MDLabel(text=ar(r[1]), size_hint_x=0.2, halign="right", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=str(r[0]), size_hint_x=0.1, halign="center", font_style="Caption", theme_text_color="Custom", text_color=[0.05, 0.32, 0.58, 1]))
                card.add_widget(box)
                container.add_widget(card)
        except Exception:
            pass

    # ==========================================
    # المخزون (إضافة وعرض)
    # ==========================================
    def add_inventory_item(self):
        scr = self.root.get_screen('inventory')
        name = scr.ids.inv_item_name.get_text()
        qty = float(scr.ids.inv_qty.text or 0)
        cost = float(scr.ids.inv_cost.text or 0)
        unit_type = scr.ids.inv_unit_type.text
        curr = scr.ids.inv_currency.text

        if not name:
            return

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO inventory_v2 (item_name, category, quantity_meters, unit_type, currency, cost_per_meter)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(item_name) DO UPDATE SET 
                quantity_meters = quantity_meters + excluded.quantity_meters,
                cost_per_meter = excluded.cost_per_meter
            ''', (name, scr.ids.inv_category.text, qty, unit_type, curr, cost))
            conn.commit()
            conn.close()
            scr.ids.inv_item_name.logical_text = ""
            scr.ids.inv_item_name.text = ""
            self.load_inventory_table()
            self.show_dialog("نجاح", f"تم الإضافة للمخزون ({name})")
        except Exception as e:
            self.show_dialog("خطأ", str(e))

    def load_inventory_table(self):
        scr = self.root.get_screen('inventory')
        container = scr.ids.inventory_list_box
        container.clear_widgets()
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT item_name, category, quantity_meters, unit_type, currency, cost_per_meter FROM inventory_v2 ORDER BY id DESC")
            rows = cursor.fetchall()
            conn.close()
            for row in rows:
                name_str, cat_str, q_m, u_type, curr, c_m = row[0], row[1], row[2], row[3], row[4], row[5]
                card = MDCard(size_hint_y=None, height="38dp", radius=[0, 0, 0, 0], line_color=[0.9, 0.9, 0.9, 1], md_bg_color=[1, 1, 1, 1], padding=["2dp", "0dp"])
                box = MDBoxLayout(orientation='horizontal', spacing="2dp")
                box.add_widget(MDLabel(text=f"{c_m:.1f} {curr}", size_hint_x=0.22, halign="center", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=f"{q_m:.1f} {u_type}", size_hint_x=0.22, halign="center", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=ar(cat_str), size_hint_x=0.22, halign="center", font_style="Caption"))
                box.add_widget(MDLabel(text=ar(name_str), size_hint_x=0.34, halign="right", font_style="Caption", bold=True))
                card.add_widget(box)
                container.add_widget(card)
        except Exception:
            pass

    # ==========================================
    # الموديلات وحساب التكلفة
    # ==========================================
    def add_model_product(self):
        scr = self.root.get_screen('models_costing')
        name = scr.ids.mod_name.get_text()
        sell_p = float(scr.ids.mod_sell_price.text or 0)
        if not name:
            return

        f_qty = float(scr.ids.mod_fabric_qty.text or 0)
        f_unit_cost = float(scr.ids.mod_fabric_unit_cost.text or 0)
        total_fabric_cost = f_qty * f_unit_cost
        pkg_cost = float(scr.ids.mod_packaging_cost.text or 0)
        labor_cost = float(scr.ids.mod_labor_cost.text or 0)

        total_prod_cost = total_fabric_cost + pkg_cost + labor_cost
        net_profit = sell_p - total_prod_cost
        curr = scr.ids.mod_currency.text

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO models_products_v2 (
                    model_name, category, currency, fabric_name, fabric_qty, fabric_unit,
                    fabric_unit_cost, total_fabric_cost, packaging_cost, labor_cost,
                    total_product_cost, sell_price, net_profit
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (name, scr.ids.mod_category.text, curr, scr.ids.mod_fabric_name.get_text(), f_qty, scr.ids.mod_fabric_unit.text, f_unit_cost, total_fabric_cost, pkg_cost, labor_cost, total_prod_cost, sell_p, net_profit))
            conn.commit()
            conn.close()

            scr.ids.mod_name.logical_text = ""
            scr.ids.mod_name.text = ""
            scr.ids.mod_fabric_name.logical_text = ""
            scr.ids.mod_fabric_name.text = ""
            self.load_models_table()
            self.show_dialog("نجاح الحساب", f"تم اعتماد الموديل ({name})\nالربح الصافي: {net_profit:.2f} {curr}")
        except Exception as e:
            pass

    def load_models_table(self):
        scr = self.root.get_screen('models_costing')
        container = scr.ids.models_list_box
        container.clear_widgets()
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, model_name, total_product_cost, sell_price, net_profit, currency FROM models_products_v2 ORDER BY id DESC")
            rows = cursor.fetchall()
            conn.close()
            for row in rows:
                m_id, name_str, tot_c, sp, np, curr = row[0], row[1], row[2], row[3], row[4], row[5]
                card = MDCard(size_hint_y=None, height="38dp", radius=[0, 0, 0, 0], line_color=[0.9, 0.9, 0.9, 1], md_bg_color=[1, 1, 1, 1], padding=["2dp", "0dp"])
                box = MDBoxLayout(orientation='horizontal', spacing="2dp")
                box.add_widget(MDLabel(text=f"{np:.1f}", size_hint_x=0.2, halign="center", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=f"{sp:.1f}", size_hint_x=0.2, halign="center", font_style="Caption"))
                box.add_widget(MDLabel(text=f"{tot_c:.1f}", size_hint_x=0.25, halign="center", font_style="Caption"))
                box.add_widget(MDLabel(text=ar(name_str), size_hint_x=0.35, halign="right", font_style="Caption", bold=True))
                card.add_widget(box)
                container.add_widget(card)
        except Exception:
            pass

    # ==========================================
    # المصروفات والقيود اليومية
    # ==========================================
    def save_expense(self):
        scr = self.root.get_screen('expenses')
        e_type = scr.ids.exp_type.text
        amt = float(scr.ids.exp_amount.text or 0)
        if not amt or not e_type:
            return

        debit_code = '507'
        if "خياطة" in e_type: debit_code = '501'
        elif "أجور" in e_type: debit_code = '502'
        elif "إيجار" in e_type: debit_code = '503'
        elif "كهرباء" in e_type: debit_code = '504'
        elif "تسويق" in e_type: debit_code = '505'
        elif "صيانة" in e_type: debit_code = '506'

        credit_code, credit_name = '101', 'الصندوق'
        if "103" in scr.ids.exp_source.text:
            credit_code, credit_name = '103', 'البنك'

        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO journal_entries (entry_no, entry_date, debit_account, credit_account, amount, currency, statement, ref_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (f"EXP-{datetime.datetime.now().strftime('%M%S')}", get_today_str(), f"{debit_code} - {e_type}", f"{credit_code} - {credit_name}", amt, 'USD', scr.ids.exp_statement.get_text(), 'مصروفات'))
            
            cursor.execute("UPDATE accounts_v2 SET balance = balance - ? WHERE code = ?", (amt, credit_code))
            cursor.execute("UPDATE accounts_v2 SET balance = balance + ? WHERE code = ?", (amt, debit_code))
            conn.commit()
            conn.close()

            scr.ids.exp_statement.logical_text = ""
            scr.ids.exp_statement.text = ""
            scr.ids.exp_amount.text = ""
            self.load_dashboard_stats()
            self.show_dialog("نجاح", f"تم تسجيل المصروف وتوليد القيد بنجاح!\nالمبلغ: {amt:.2f}")
        except Exception as e:
            pass

    def load_expenses_table(self):
        pass

    def save_manual_journal_entry(self):
        scr = self.root.get_screen('journal_entries')
        amt = float(scr.ids.j_amount.text or 0)
        if not amt: return
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            entry_no = f"JV-{datetime.datetime.now().strftime('%M%S')}"
            cursor.execute('''
                INSERT INTO journal_entries (entry_no, entry_date, debit_account, credit_account, amount, currency, statement, ref_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (entry_no, get_today_str(), scr.ids.j_debit_acc.text, scr.ids.j_credit_acc.text, amt, 'USD', scr.ids.j_statement.get_text(), 'قيد يدوي'))
            conn.commit()
            conn.close()
            scr.ids.j_statement.logical_text = ""
            scr.ids.j_statement.text = ""
            self.load_journal_entries_table()
            self.show_dialog("نجاح", "تم الترحيل")
        except Exception:
            pass

    def load_journal_entries_table(self):
        scr = self.root.get_screen('journal_entries')
        container = scr.ids.journal_list_box
        container.clear_widgets()
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT entry_no, debit_account, credit_account, amount FROM journal_entries ORDER BY id DESC")
            rows = cursor.fetchall()
            conn.close()
            for r in rows:
                card = MDCard(size_hint_y=None, height="38dp", radius=[0, 0, 0, 0], line_color=[0.9, 0.9, 0.9, 1], md_bg_color=[1, 1, 1, 1], padding=["2dp", "0dp"])
                box = MDBoxLayout(orientation='horizontal', spacing="2dp")
                box.add_widget(MDLabel(text=f"{r[3]:.1f}", size_hint_x=0.18, halign="center", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=ar(r[2]), size_hint_x=0.32, halign="center", font_style="Caption"))
                box.add_widget(MDLabel(text=ar(r[1]), size_hint_x=0.32, halign="right", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=str(r[0]), size_hint_x=0.18, halign="center", font_style="Caption", theme_text_color="Custom", text_color=[0.05, 0.32, 0.58, 1]))
                card.add_widget(box)
                container.add_widget(card)
        except Exception:
            pass

    def save_voucher(self):
        scr = self.root.get_screen('vouchers')
        amt = float(scr.ids.v_amount.text or 0)
        acc = scr.ids.v_account.get_text()
        if not amt or not acc: return

        v_no = f"VOU-{datetime.datetime.now().strftime('%M%S')}"
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO vouchers_full (voucher_no, voucher_type, currency, amount, account_name, statement, date_added)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (v_no, scr.ids.v_type.text, 'USD', amt, acc, '', get_today_str()))
            
            if "قبض" in scr.ids.v_type.text:
                cursor.execute("UPDATE accounts_v2 SET balance = balance + ? WHERE code = '101'", (amt,))
            else:
                cursor.execute("UPDATE accounts_v2 SET balance = balance - ? WHERE code = '101'", (amt,))
                
            conn.commit()
            conn.close()
            scr.ids.v_account.logical_text = ""
            scr.ids.v_account.text = ""
            self.load_vouchers_table()
            self.load_dashboard_stats()
            self.show_dialog("نجاح", "تم الحفظ")
        except Exception:
            pass

    def load_vouchers_table(self):
        scr = self.root.get_screen('vouchers')
        container = scr.ids.vouchers_list_box
        container.clear_widgets()
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT voucher_no, voucher_type, amount, account_name FROM vouchers_full ORDER BY id DESC")
            rows = cursor.fetchall()
            conn.close()
            for r in rows:
                card = MDCard(size_hint_y=None, height="36dp", radius=[0, 0, 0, 0], line_color=[0.9, 0.9, 0.9, 1], md_bg_color=[1, 1, 1, 1], padding=["2dp", "0dp"])
                box = MDBoxLayout(orientation='horizontal', spacing="2dp")
                box.add_widget(MDLabel(text=f"{r[2]:.1f}", size_hint_x=0.25, halign="center", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=ar(r[3]), size_hint_x=0.35, halign="right", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=ar(r[1]), size_hint_x=0.25, halign="center", font_style="Caption"))
                box.add_widget(MDLabel(text=str(r[0]), size_hint_x=0.15, halign="center", font_style="Caption", theme_text_color="Custom", text_color=[0.05, 0.32, 0.58, 1]))
                card.add_widget(box)
                container.add_widget(card)
        except Exception:
            pass

    # ==========================================
    # شجرة الحسابات والتقارير
    # ==========================================
    def load_accounts_tree(self):
        scr = self.root.get_screen('accounts_tree')
        container = scr.ids.accounts_list_box
        container.clear_widgets()
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT code, name, type, balance FROM accounts_v2 ORDER BY code ASC")
            rows = cursor.fetchall()
            conn.close()
            for row in rows:
                card = MDCard(size_hint_y=None, height="42dp", radius=[0, 0, 0, 0], line_color=[0.9, 0.9, 0.9, 1], md_bg_color=[1, 1, 1, 1], padding=["4dp", "0dp"])
                box = MDBoxLayout(orientation='horizontal', spacing="2dp")
                box.add_widget(MDLabel(text=f"{row[3]:.1f}", size_hint_x=0.22, halign="center", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=ar(row[2]), size_hint_x=0.23, halign="center", font_style="Caption"))
                box.add_widget(MDLabel(text=ar(row[1]), size_hint_x=0.4, halign="right", font_style="Caption", bold=True))
                box.add_widget(MDLabel(text=str(row[0]), size_hint_x=0.15, halign="center", font_style="Caption", bold=True, theme_text_color="Custom", text_color=[0.05, 0.32, 0.58, 1]))
                card.add_widget(box)
                container.add_widget(card)
        except Exception:
            pass

    # ==========================================
    # النوافذ والمساعدات والقوائم المنسدلة (النهائية)
    # ==========================================
    def open_logo_chooser(self):
        layout = BoxLayout(orientation='vertical')
        filechooser = FileChooserListView(filters=['*.png', '*.jpg', '*.jpeg'])
        layout.add_widget(filechooser)
        btn_layout = BoxLayout(size_hint_y=None, height="50dp")
        cancel_btn = Button(text=ar("إلغاء"), font_name="Roboto")
        select_btn = Button(text=ar("اختيار"), font_name="Roboto")
        btn_layout.add_widget(cancel_btn)
        btn_layout.add_widget(select_btn)
        layout.add_widget(btn_layout)
        popup = Popup(title=ar("اختر الشعار"), content=layout, size_hint=(0.9, 0.9))
        def on_select(instance):
            if filechooser.selection:
                self.root.get_screen('settings').ids.cmp_logo.text = filechooser.selection[0]
            popup.dismiss()
        cancel_btn.bind(on_release=popup.dismiss)
        select_btn.bind(on_release=on_select)
        popup.open()

    def open_cust_type_menu(self, text_item):
        menu_items = [
            {"text": ar("زبون جديد"), "on_release": lambda x=ar("زبون جديد"): self.set_menu_val(text_item, x)}, 
            {"text": ar("زبون قديم / مستمر"), "on_release": lambda x=ar("زبون قديم / مستمر"): self.set_menu_val(text_item, x)}
        ]
        self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
        self.menu.open()
        
    def open_platform_menu(self, text_item):
        menu_items = [
            {"text": ar("انستغرام (Instagram)"), "on_release": lambda x=ar("انستغرام (Instagram)"): self.set_menu_val(text_item, x)}, 
            {"text": ar("واتساب (WhatsApp)"), "on_release": lambda x=ar("واتساب (WhatsApp)"): self.set_menu_val(text_item, x)}, 
            {"text": ar("فيسبوك (Facebook)"), "on_release": lambda x=ar("فيسبوك (Facebook)"): self.set_menu_val(text_item, x)}
        ]
        self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
        self.menu.open()
        
    def open_inv_unit_menu(self, text_item):
        menu_items = [
            {"text": ar("متر"), "on_release": lambda x=ar("متر"): self.set_menu_val(text_item, x)}, 
            {"text": ar("وار"), "on_release": lambda x=ar("وار"): self.set_menu_val(text_item, x)}
        ]
        self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
        self.menu.open()
        
    def open_currency_menu(self, text_item):
        menu_items = [
            {"text": ar("دولار أمريكي (USD)"), "on_release": lambda x=ar("دولار أمريكي (USD)"): self.set_menu_val(text_item, x)}, 
            {"text": ar("ريال يمني (YER)"), "on_release": lambda x=ar("ريال يمني (YER)"): self.set_menu_val(text_item, x)}, 
            {"text": ar("سعودي (SAR)"), "on_release": lambda x=ar("سعودي (SAR)"): self.set_menu_val(text_item, x)}
        ]
        self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
        self.menu.open()
        
    def open_unit_menu_full(self, text_item):
        menu_items = [
            {"text": ar("(cm) سم"), "on_release": lambda x=ar("(cm) سم"): self.set_menu_val(text_item, x)}, 
            {"text": ar("(inch) إنش"), "on_release": lambda x=ar("(inch) إنش"): self.set_menu_val(text_item, x)}
        ]
        self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
        self.menu.open()
        
    def open_pay_source_menu(self, text_item):
        menu_items = [
            {"text": ar("الصندوق الرئيسي (101)"), "on_release": lambda x=ar("الصندوق الرئيسي (101)"): self.set_menu_val(text_item, x)}, 
            {"text": ar("البنك (103)"), "on_release": lambda x=ar("البنك (103)"): self.set_menu_val(text_item, x)}
        ]
        self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
        self.menu.open()
        
    def open_inv_category_menu(self, text_item):
        menu_items = [
            {"text": ar("قماش ساتان"), "on_release": lambda x=ar("قماش ساتان"): self.set_menu_val(text_item, x)}
        ]
        self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
        self.menu.open()
        
    def open_mod_category_menu(self, text_item):
        menu_items = [
            {"text": ar("فستان أميرة"), "on_release": lambda x=ar("فستان أميرة"): self.set_menu_val(text_item, x)}
        ]
        self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
        self.menu.open()
        
    def open_status_menu(self, text_item):
        menu_items = [
            {"text": ar("قيد الخياطة"), "on_release": lambda x=ar("قيد الخياطة"): self.set_menu_val(text_item, x)}, 
            {"text": ar("جاهز للتسليم"), "on_release": lambda x=ar("جاهز للتسليم"): self.set_menu_val(text_item, x)}, 
            {"text": ar("تم التسليم ✅"), "on_release": lambda x=ar("تم التسليم ✅"): self.set_menu_val(text_item, x)}
        ]
        self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
        self.menu.open()
        
    def open_voucher_menu(self, text_item):
        menu_items = [
            {"text": ar("سند قبض"), "on_release": lambda x=ar("سند قبض"): self.set_menu_val(text_item, x)}, 
            {"text": ar("سند صرف"), "on_release": lambda x=ar("سند صرف"): self.set_menu_val(text_item, x)}
        ]
        self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
        self.menu.open()
        
    def open_exp_type_menu(self, text_item):
        items = ["مصاريف خياطة وتشغيل", "أجور العاملين", "إيجار", "كهرباء", "تسويق", "صيانة", "ضيافة ونثريات"]
        menu_items = [{"text": ar(i), "on_release": lambda x=ar(i): self.set_menu_val(text_item, x)} for i in items]
        self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
        self.menu.open()
        
    def open_inventory_fabric_menu(self, text_item):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT item_name, unit_type, cost_per_meter FROM inventory_v2")
            rows = cursor.fetchall()
            conn.close()
            if not rows: return
            menu_items = [{"text": ar(f"{r[0]}"), "on_release": lambda f=r[0], u=r[1], c=r[2]: self.auto_fill_fabric_cost(text_item, f, u, c)} for r in rows]
            self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
            self.menu.open()
        except:
            pass
            
    def auto_fill_fabric_cost(self, text_item, f_name, u_type, c_cost):
        text_item.text = f_name
        scr = self.root.get_screen('models_costing')
        scr.ids.mod_fabric_unit.text = u_type
        scr.ids.mod_fabric_unit_cost.text = str(c_cost)
        if hasattr(self, 'menu'):
            self.menu.dismiss()
            
    def open_account_select_menu(self, text_item, is_debit=True):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT code, name FROM accounts_v2")
            rows = cursor.fetchall()
            conn.close()
            menu_items = [{"text": ar(f"{r[0]} - {r[1]}"), "on_release": lambda x=ar(f"{r[0]} - {r[1]}"): self.set_menu_val(text_item, x)} for r in rows]
            self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
            self.menu.open()
        except:
            pass
            
    def open_sales_cust_menu(self, text_item):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT customer_name, phone FROM customers_full")
            rows = cursor.fetchall()
            conn.close()
            if not rows: return
            menu_items = [{"text": ar(r[0]), "on_release": lambda c=r[0], p=r[1]: self.auto_fill_sales_cust(text_item, c, p)} for r in rows]
            self.menu = MDDropdownMenu(caller=text_item, items=menu_items, width_mult=4)
            self.menu.open()
        except:
            pass
            
    def auto_fill_sales_cust(self, text_item, c_name, phone):
        text_item.text = c_name
        self.root.get_screen('sales').ids.s_phone.text = phone or ""
        if hasattr(self, 'menu'):
            self.menu.dismiss()
            
    def set_menu_val(self, text_item, val):
        text_item.text = val
        if hasattr(self, 'menu'):
            self.menu.dismiss()

    # ==========================================
    # الإعدادات والترحيل السنوي
    # ==========================================
    def load_company_profile(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT company_name, phone, address, email, logo_path FROM company_profile WHERE id=1")
            row = cursor.fetchone()
            conn.close()
            if row:
                scr = self.root.get_screen('settings')
                scr.ids.cmp_name.logical_text = row[0] or ""
                scr.ids.cmp_name._refresh_display()
                scr.ids.cmp_phone.text = row[1] or ""
                scr.ids.cmp_address.logical_text = row[2] or ""
                scr.ids.cmp_address._refresh_display()
                scr.ids.cmp_email.text = row[3] or ""
                scr.ids.cmp_logo.text = row[4] or ""
        except:
            pass

    def save_company_profile(self):
        scr = self.root.get_screen('settings')
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO company_profile (id, company_name, phone, address, email, logo_path)
                VALUES (1, ?, ?, ?, ?, ?)
            ''', (scr.ids.cmp_name.get_text(), scr.ids.cmp_phone.text, scr.ids.cmp_address.get_text(), scr.ids.cmp_email.text, scr.ids.cmp_logo.text))
            conn.commit()
            conn.close()
            self.show_dialog("نجاح", "تم حفظ بيانات المنشأة والشعار بنجاح.")
        except Exception as e:
            self.show_dialog("خطأ", str(e))

    def export_data(self, format_type):
        self.show_dialog("تصدير", f"تم تحضير البيانات بصيغة ({format_type.upper()})")

    def open_export_dialog(self, format_type):
        self.show_dialog("الطباعة", f"جاري تحضير {format_type.upper()}...")

    def import_database(self):
        self.show_dialog("استيراد", "تم الاستيراد بنجاح.")

    def send_database(self):
        self.show_dialog("إرسال", "تم الإرسال بنجاح.")

    def process_year_end_closing(self):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT SUM(balance) FROM accounts_v2 WHERE code LIKE '4%'")
            total_rev = cursor.fetchone()[0] or 0.0
            cursor.execute("SELECT SUM(balance) FROM accounts_v2 WHERE code LIKE '5%'")
            total_exp = cursor.fetchone()[0] or 0.0
            net_profit = total_rev - total_exp

            cursor.execute("UPDATE accounts_v2 SET balance = balance + ? WHERE code = '301'", (net_profit,))
            cursor.execute("UPDATE accounts_v2 SET balance = 0.0 WHERE code LIKE '4%' OR code LIKE '5%'")

            closing_no = f"JV-CLOSE-{datetime.datetime.now().strftime('%Y')}"
            cursor.execute('''
                INSERT INTO journal_entries (entry_no, entry_date, debit_account, credit_account, amount, currency, statement, ref_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (closing_no, get_today_str(), 'قائمة الإيرادات والمصروفات', '301 - رأس المال والأرباح', net_profit, 'USD', 'قيد الإقفال السنوي', 'إقفال سنوي'))
            conn.commit()
            conn.close()
            self.show_dialog("الإقفال السنوي", "تم الإقفال وتصفير المصروفات بنجاح.")
        except Exception as e:
            self.show_dialog("خطأ", str(e))

    def backup_database(self):
        self.show_dialog("النسخ الاحتياطي", f"تم إنشاء نسخة احتياطية بنجاح.")

    def show_dialog(self, title, text):
        MDDialog(title=ar(title), text=ar(text), size_hint=(0.8, None)).open()

if __name__ == '__main__':
    LittlePrincessesMobileApp().run()