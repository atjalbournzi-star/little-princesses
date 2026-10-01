"""
Little Princesses ERP - Database Pool & Common Utilities
Provides cursor context managers, converters, ID generators, and system seed init.
"""

import logging
import time
import uuid
import datetime
from decimal import Decimal
from db_client import get_db_cursor, execute_query, logger


def generate_id(prefix="LP"):
    ts = int(time.time() % 10000000)
    rand_suffix = uuid.uuid4().hex[:4].upper()
    return f"{prefix}-{ts}-{rand_suffix}"


def now_iso():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def today_str():
    return datetime.date.today().strftime("%Y-%m-%d")


def clean_num(val, default=0.0):
    if val is None or val == "":
        return default
    try:
        if isinstance(val, str):
            val = val.replace(",", "").replace("$", "").replace("YER", "").replace("SAR", "").strip()
        return float(val)
    except (ValueError, TypeError):
        return default


def clean_str(val, default=""):
    if val is None:
        return default
    return str(val).strip()


def to_decimal(val):
    if val is None:
        return Decimal("0.00")
    try:
        return Decimal(str(val))
    except Exception:
        return Decimal("0.00")


def ensure_base_system_seed():
    """غرس إعدادات المؤسسة والعملات والمستخدم الافتراضي عند أول تشغيل"""
    try:
        with get_db_cursor(commit=True) as cur:
            # 1. Company Profile
            cur.execute("""
                INSERT INTO company_profile (id, company_name, phone, address, email, fiscal_date, theme_mode, base_currency)
                VALUES (1, 'مؤسسة الأميرات الصغيرات للأزياء الراقية', '776773458', 'اليمن - صنعاء - شارع حدة', 'info@littleprincesses.com', '2026-01-01', 'light', 'YER')
                ON CONFLICT (id) DO NOTHING;
            """)
            # 2. Base Currencies
            cur.execute("""
                INSERT INTO currencies (code, name, symbol, exchange_rate, is_base) VALUES
                ('YER', 'ريال يمني', 'ر.ي', 1.00, TRUE),
                ('SAR', 'ريال سعودي', 'ر.س', 142.00, FALSE),
                ('USD', 'دولار أمريكي', '$', 535.00, FALSE)
                ON CONFLICT (code) DO NOTHING;
            """)
            # 3. Default Admin User
            cur.execute("""
                INSERT INTO users (id, username, password_hash, full_name, role)
                VALUES ('usr_admin_1', 'admin', 'admin123', 'المدير العام', 'المدير العام')
                ON CONFLICT (username) DO NOTHING;
            """)
            # 4. System Settings
            cur.execute("""
                INSERT INTO system_settings (key, value, category, description) VALUES
                ('auto_backup_daily', 'true', 'general', 'النسخ الاحتياطي التلقائي اليومي'),
                ('enable_cloud_sync', 'true', 'sync', 'المزامنة السحابية الفورية'),
                ('default_tax_percent', '0', 'finance', 'نسبة الضريبة الافتراضية'),
                ('currency_precision', '2', 'finance', 'دقة المنازل العشرية للعملة')
                ON CONFLICT (key) DO NOTHING;
            """)
            # 5. Products & Orders schema support (target segment, barcode, delivery payment mode)
            try:
                cur.execute("""
                    ALTER TABLE products ADD COLUMN IF NOT EXISTS target_segment VARCHAR(50) DEFAULT 'kids';
                    ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
                    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12, 2) DEFAULT 0.00;
                    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_payment_mode VARCHAR(30) DEFAULT 'DIRECT_TO_COURIER';
                """)
            except Exception as e_col:
                logger.warning(f"⚠️ Products/orders schema check notice: {e_col}")
            # 6. Warehouses & Stock Tables Initialization
            try:
                from .pg_warehouses import ensure_warehouses_schema
                ensure_warehouses_schema()
            except Exception as e_wh:
                logger.warning(f"⚠️ Warehouses seed warning: {e_wh}")
            # 7. Account 202 Customer Advance Deposits Sync
            try:
                from .pg_receipt_sync import recalculate_advance_deposits
                recalculate_advance_deposits(cur)
            except Exception as e_adv:
                logger.warning(f"⚠️ Account 202 sync notice: {e_adv}")
        logger.info("✅ تم التحقق من البيانات التأسيسية للنظام (Seed Data Checked)")
    except Exception as e:
        logger.warning(f"⚠️ تنبيه أثناء غرس البيانات التأسيسية: {e}")
