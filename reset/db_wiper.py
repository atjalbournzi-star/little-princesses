"""
reset/db_wiper.py
خطوة 2 و3: مسح وتصفير قاعدة بيانات PostgreSQL (Supabase) وSQLite المحلية
"""

import os
import sqlite3
import db_client

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# الجداول التشغيلية المطلوب تصفيرها بالكامل في PostgreSQL
TABLES_TO_TRUNCATE = [
    "quality_actions", "quality_returns", "quality_complaints",
    "quality_feedback", "quality_defects", "quality_inspections",
    "fitting_alterations", "tailor_commissions", "production_orders",
    "order_items", "orders",
    "attribution_records", "ai_comment_nlp", "ai_conversation_intent",
    "comments", "content_metrics", "content", "messages", "conversations",
    "customer_platform_mappings", "campaigns", "raw_platform_events",
    "ai_daily_briefs", "ai_recommendations",
    "purchase_items", "purchases", "inventory_transactions", "inventory", "products",
    "payroll", "employees",
    "payments", "expenses", "journal_entry_lines", "journal_entries",
    "measurements", "children",
    "audit_logs", "idempotency_keys"
]

# الجداول المحلية SQLite المطلوب تصفيرها
SQLITE_TABLES_TO_CLEAR = [
    "orders", "order_items", "sales_orders", "sales_orders_full", "sales_qr_orders",
    "production_orders", "factory", "finished_stock",
    "customers", "customers_full", "customers_old", "children",
    "customer_measurements", "measurement_profiles",
    "inventory", "inventory_v2", "inventory_transactions",
    "bom", "models_products", "models_products_v2", "products",
    "purchases", "purchases_full",
    "vouchers", "vouchers_full", "expenses", "payments",
    "journal_entries", "journal_entry_lines", "journal_lines",
    "payroll_records", "employees",
    "quality_inspections", "quality_defects", "customer_feedback",
    "quality_complaints", "quality_returns", "quality_corrective_actions",
    "quality_master_evaluations",
    "campaigns", "marketing_campaigns", "post_analytics", "content",
    "content_metrics", "comments", "conversations", "messages",
    "raw_platform_events", "customer_platform_mappings",
    "ai_comment_nlp", "ai_conversation_intent", "ai_daily_briefs",
    "ai_recommendations", "attribution_records",
    "audit_log", "account_audit_log", "audit_logs",
    "cloud_sync_queue", "idempotency_keys"
]


def step2_wipe_and_reset_supabase():
    print("\n" + "=" * 70)
    print("🧹 الخطوة 2: مسح وتصفير البيانات في Supabase (Public Schema)...")
    print("=" * 70)

    with db_client.get_db_cursor(commit=True) as cur:
        # 2.1 مسح الجداول التشغيلية عبر TRUNCATE CASCADE
        print("  • تنفيذ تفريغ الجداول التشغيلية (TRUNCATE CASCADE)...")
        cur.execute("SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
        existing_tables = {r['table_name'] for r in cur.fetchall()}

        valid_truncates = [f'"{t}"' for t in TABLES_TO_TRUNCATE if t in existing_tables]
        if valid_truncates:
            cur.execute(f"TRUNCATE TABLE {', '.join(valid_truncates)} RESTART IDENTITY CASCADE;")
            print(f"    ✓ تم تفريغ {len(valid_truncates)} جدولاً تشغيلياً بنجاح.")

        # 2.2 تنظيف العملاء والإبقاء على الحساب العام فقط
        print("  • تصفير جدول العملاء والموردين...")
        cur.execute("DELETE FROM customers WHERE id != 'CUST-GENERAL';")
        cur.execute("""
            INSERT INTO customers (id, name, phone, category, city, current_balance, status, notes)
            VALUES ('CUST-GENERAL', 'عميل عام / زائر صالة العرض', '000000000',
                    'عام', 'صنعاء', 0.0000, 'Active',
                    'الحساب العام للمبيعات النقدية المباشرة')
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                current_balance = 0.0000,
                status = 'Active';
        """)
        cur.execute("DELETE FROM suppliers;")

        # 2.3 تصفير أرصدة شجرة الحسابات
        print("  • تصفير أرصدة شجرة الحسابات (Chart of Accounts)...")
        cur.execute("UPDATE chart_of_accounts SET opening_balance = 0.0000, current_balance = 0.0000;")

        # 2.4 تصفير عدادات الترقيم
        print("  • تصفير عدادات الترقيم (Number Sequences)...")
        cur.execute("UPDATE number_sequences SET current_number = 0;")

        # 2.5 تسجيل حدث تدقيق للتصفير
        cur.execute("""
            INSERT INTO audit_logs (entity_type, entity_id, action, new_values, user_id, ip_address, created_at)
            VALUES ('SYSTEM', 'PUBLIC', 'RESET',
                '{"status": "CLEAN_SLATE_COMPLETED", "message": "تم تصفير النظام والبدء كنسخة جديدة نظيفة 100%"}'::jsonb,
                'USR-000001', '127.0.0.1', CURRENT_TIMESTAMP);
        """)

    print("  ✅ اكتملت عملية تصفير Supabase بنجاح تام!")


def step3_wipe_and_reset_sqlite():
    print("\n" + "=" * 70)
    print("🔄 الخطوة 3: تصفير ومزامنة قاعدة البيانات المحلية SQLite...")
    print("=" * 70)

    sqlite_db_path = os.path.join(BASE_DIR, "little_princesses.db")
    if not os.path.exists(sqlite_db_path):
        print("  ℹ️ قاعدة البيانات المحلية غير موجودة، تم التخطي.")
        return

    conn = sqlite3.connect(sqlite_db_path)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {r[0] for r in c.fetchall()}

    for tbl in SQLITE_TABLES_TO_CLEAR:
        if tbl in existing_tables:
            try:
                c.execute(f"DELETE FROM {tbl};")
            except Exception:
                pass

    for acc_tbl in ["accounts", "accounts_v2"]:
        if acc_tbl in existing_tables:
            try:
                c.execute(f"UPDATE {acc_tbl} SET balance = 0.0;")
            except Exception:
                pass

    if "number_sequences" in existing_tables:
        try:
            c.execute("UPDATE number_sequences SET current_number = 0;")
        except Exception:
            pass

    if "customers" in existing_tables:
        try:
            c.execute("""
                INSERT OR REPLACE INTO customers (id, name, phone, current_balance, status)
                VALUES ('CUST-GENERAL', 'عميل عام / زائر صالة العرض', '000000000', 0.0, 'Active');
            """)
        except Exception:
            pass

    conn.commit()
    conn.close()
    print("  ✅ تم تصفير ومزامنة SQLite بنجاح.")
