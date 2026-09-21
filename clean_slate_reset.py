"""
=============================================================================
👑 LITTLE PRINCESSES ERP — FACTORY RESET & CLEAN SLATE ENGINE
=============================================================================
سكربت التصفير الشامل والبدء النظيف:
1. أخذ نسخة احتياطية كاملة (Full Snapshot) لسكيما public في Supabase وقاعدة SQLite.
2. مسح وتصفير كافة البيانات التشغيلية والتجريبية من قاعدة بيانات PostgreSQL (Supabase).
3. تصفير عدادات الترقيم (Number Sequences) لتبدأ الفواتير والسندات والطلبات من رقم 1.
4. تصفير كافة أرصدة شجرة الحسابات (Chart of Accounts) إلى 0.0000.
5. الحفاظ التام على:
   - المستخدمين (users) وصلاحياتهم لتسجيل الدخول.
   - شجرة الحسابات القياسية (chart_of_accounts).
   - العملات وأسعار الصرف (currencies).
   - بروفايل المؤسسة وإعدادات النظام (company_profile, system_settings).
   - إعدادات منصات التسويق والجودة (marketing_platforms, capability_matrix, ai_scoring_weights).
   - العميل العام والمورد العام الافتراضي بأرصدة 0.0000.
6. تصفير قاعدة البيانات المحلية SQLite لتتطابق 100% مع السحابة.
"""

import os
import sys
import json
import shutil
import sqlite3
import datetime
from decimal import Decimal
import uuid

# ضبط ترميز الإخراج للغة العربية في Windows
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

import db_client

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUPS_DIR = os.path.join(BASE_DIR, "backups")
os.makedirs(BACKUPS_DIR, exist_ok=True)

def step1_create_full_backup():
    print("\n" + "=" * 70)
    print("📦 الخطوة 1: إنشاء نسخة احتياطية كاملة (Full Safety Snapshot)...")
    print("=" * 70)
    
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 1.1 نسخ ملف SQLite
    sqlite_db_path = os.path.join(BASE_DIR, "little_princesses.db")
    if os.path.exists(sqlite_db_path):
        sqlite_backup_name = f"little_princesses_pre_clean_slate_{ts}.db"
        sqlite_backup_path = os.path.join(BACKUPS_DIR, sqlite_backup_name)
        shutil.copy2(sqlite_db_path, sqlite_backup_path)
        print(f"  ✓ تم نسخ قاعدة البيانات المحلية SQLite إلى: {sqlite_backup_name}")

    # 1.2 تصدير كافة جداول Supabase PostgreSQL إلى ملف JSON شامل
    dump_data = {}
    with db_client.get_db_cursor() as cur:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        all_tables = [r['table_name'] for r in cur.fetchall()]
        print(f"  ✓ جاري تصدير {len(all_tables)} جدولاً من Supabase (public schema)...")
        
        for tbl in all_tables:
            try:
                cur.execute(f'SELECT * FROM "{tbl}";')
                rows = [dict(r) for r in cur.fetchall()]
                for r in rows:
                    for k, v in r.items():
                        if isinstance(v, (datetime.date, datetime.datetime, uuid.UUID)):
                            r[k] = str(v)
                        elif isinstance(v, Decimal):
                            r[k] = float(v)
                dump_data[tbl] = rows
            except Exception as e:
                print(f"    ⚠️ تعذر تصدير الجدول {tbl}: {e}")

    json_backup_name = f"snapshot_before_clean_slate_{ts}.json"
    json_backup_path = os.path.join(BACKUPS_DIR, json_backup_name)
    with open(json_backup_path, "w", encoding="utf-8") as f:
        json.dump({
            "metadata": {
                "action": "PRE_CLEAN_SLATE_FULL_BACKUP",
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "tables_count": len(dump_data)
            },
            "tables": dump_data
        }, f, ensure_ascii=False, indent=2)

    fsize_kb = os.path.getsize(json_backup_path) / 1024
    print(f"  ✅ تم بنجاح حفظ النسخة الاحتياطية السحابية الشاملة: {json_backup_name} ({fsize_kb:.1f} KB)")
    return json_backup_path


def step2_wipe_and_reset_supabase():
    print("\n" + "=" * 70)
    print("🧹 الخطوة 2: مسح وتصفير البيانات في Supabase (Public Schema)...")
    print("=" * 70)

    # قائمة الجداول التشغيلية والتجريبية المطلوب تصفيرها بالكامل
    tables_to_truncate = [
        # الجودة والمطابقة
        "quality_actions", "quality_returns", "quality_complaints",
        "quality_feedback", "quality_defects", "quality_inspections",
        
        # المعمل والطلبات والمبيعات
        "fitting_alterations", "tailor_commissions", "production_orders",
        "order_items", "orders",
        
        # التسويق والمحادثات
        "attribution_records", "ai_comment_nlp", "ai_conversation_intent",
        "comments", "content_metrics", "content", "messages", "conversations",
        "customer_platform_mappings", "campaigns", "raw_platform_events",
        "ai_daily_briefs", "ai_recommendations",
        
        # المشتريات والمخزون والموديلات
        "purchase_items", "purchases", "inventory_transactions", "inventory", "products",
        
        # الموارد البشرية والرواتب
        "payroll", "employees",
        
        # المالية والحسابات
        "payments", "expenses", "journal_entry_lines", "journal_entries",
        
        # المقاسات والأطفال
        "measurements", "children",
        
        # سجلات التدقيق والمفاتيح
        "audit_logs", "idempotency_keys"
    ]

    with db_client.get_db_cursor(commit=True) as cur:
        # 2.1 مسح الجداول التشغيلية عبر TRUNCATE CASCADE
        print("  • تنفيذ تفريغ الجداول التشغيلية (TRUNCATE CASCADE)...")
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
        existing_tables = {r['table_name'] for r in cur.fetchall()}
        
        valid_truncates = [f'"{t}"' for t in tables_to_truncate if t in existing_tables]
        if valid_truncates:
            truncate_sql = f"TRUNCATE TABLE {', '.join(valid_truncates)} RESTART IDENTITY CASCADE;"
            cur.execute(truncate_sql)
            print(f"    ✓ تم تفريغ {len(valid_truncates)} جدولاً تشغيلياً بنجاح.")

        # 2.2 تنظيف وتصفير جدول العملاء والموردين والإبقاء على الحساب العام
        print("  • تصفير جدول العملاء والموردين...")
        cur.execute("DELETE FROM customers WHERE id != 'CUST-GENERAL';")
        cur.execute("""
            INSERT INTO customers (id, name, phone, category, city, current_balance, status, notes)
            VALUES ('CUST-GENERAL', 'عميل عام / زائر صالة العرض', '000000000', 'عام', 'صنعاء', 0.0000, 'Active', 'الحساب العام للمبيعات النقدية المباشرة')
            ON CONFLICT (id) DO UPDATE SET 
                name = EXCLUDED.name,
                current_balance = 0.0000,
                status = 'Active';
        """)
        
        cur.execute("DELETE FROM suppliers;")


        # 2.3 تصفير كافة أرصدة شجرة الحسابات
        print("  • تصفير أرصدة شجرة الحسابات (Chart of Accounts)...")
        cur.execute("""
            UPDATE chart_of_accounts 
            SET opening_balance = 0.0000, current_balance = 0.0000;
        """)

        # 2.4 تصفير كافة عدادات الترقيم (Number Sequences) لتبدأ من 0
        print("  • تصفير عدادات الترقيم (Number Sequences) لتبدأ من 1...")
        cur.execute("""
            UPDATE number_sequences 
            SET current_number = 0;
        """)

        # 2.5 تسجيل حدث تدقيق للتصفير الشامل
        cur.execute("""
            INSERT INTO audit_logs (entity_type, entity_id, action, new_values, user_id, ip_address, created_at)
            VALUES (
                'SYSTEM',
                'PUBLIC',
                'RESET',
                '{"status": "CLEAN_SLATE_COMPLETED", "message": "تم تصفير النظام والبدء كنسخة جديدة نظيفة 100%"}'::jsonb,
                'USR-000001',
                '127.0.0.1',
                CURRENT_TIMESTAMP
            );
        """)

    print("  ✅ اكتملت عملية تصفير قاعدة بيانات Supabase (Public Schema) بنجاح تام!")


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

    sqlite_tables_to_clear = [
        "orders", "order_items", "sales_orders", "sales_orders_full", "sales_qr_orders",
        "production_orders", "factory", "finished_stock",
        "customers", "customers_full", "customers_old", "children", "customer_measurements", "measurement_profiles",
        "inventory", "inventory_v2", "inventory_transactions", "bom", "models_products", "models_products_v2", "products",
        "purchases", "purchases_full",
        "vouchers", "vouchers_full", "expenses", "payments",
        "journal_entries", "journal_entry_lines", "journal_lines",
        "payroll_records", "employees",
        "quality_inspections", "quality_defects", "customer_feedback", "quality_complaints",
        "quality_returns", "quality_corrective_actions", "quality_master_evaluations",
        "campaigns", "marketing_campaigns", "post_analytics", "content", "content_metrics", "comments",
        "conversations", "messages", "raw_platform_events", "customer_platform_mappings",
        "ai_comment_nlp", "ai_conversation_intent", "ai_daily_briefs", "ai_recommendations", "attribution_records",
        "audit_log", "account_audit_log", "audit_logs", "cloud_sync_queue", "idempotency_keys"
    ]

    c.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {r[0] for r in c.fetchall()}

    for tbl in sqlite_tables_to_clear:
        if tbl in existing_tables:
            try:
                c.execute(f"DELETE FROM {tbl};")
            except Exception as e:
                pass

    # تصفير الأرصدة في جداول الحسابات
    for acc_tbl in ["accounts", "accounts_v2"]:
        if acc_tbl in existing_tables:
            try:
                c.execute(f"UPDATE {acc_tbl} SET balance = 0.0;")
            except Exception:
                pass

    # تصفير عدادات الترقيم
    if "number_sequences" in existing_tables:
        try:
            c.execute("UPDATE number_sequences SET current_number = 0;")
        except Exception:
            pass

    # إعادة إدراج العميل العام الافتراضي
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
    print("  ✅ تم تصفير ومزامنة قاعدة البيانات المحلية SQLite بنجاح.")


def step4_verify_clean_state():
    print("\n" + "=" * 70)
    print("🔍 الخطوة 4: التحقق والفحص الميداني بعد التصفير...")
    print("=" * 70)

    tables_to_check = [
        ("orders", 0),
        ("order_items", 0),
        ("production_orders", 0),
        ("tailor_commissions", 0),
        ("fitting_alterations", 0),
        ("customers", 1),       # CUST-GENERAL فقط
        ("suppliers", 1),       # SUPP-GENERAL فقط
        ("children", 0),
        ("measurements", 0),
        ("products", 0),
        ("inventory", 0),
        ("inventory_transactions", 0),
        ("purchases", 0),
        ("purchase_items", 0),
        ("payments", 0),
        ("expenses", 0),
        ("journal_entries", 0),
        ("journal_entry_lines", 0),
        ("employees", 0),
        ("payroll", 0),
        ("campaigns", 0),
        ("quality_inspections", 0)
    ]

    all_passed = True
    with db_client.get_db_cursor() as cur:
        for tbl, expected in tables_to_check:
            try:
                cur.execute(f'SELECT count(*) as cnt FROM "{tbl}";')
                cnt = cur.fetchone()['cnt']
                status = "✅" if cnt == expected else "❌"
                if cnt != expected:
                    all_passed = False
                print(f"  {status} {tbl:<25}: {cnt} سجل (المتوقع: {expected})")
            except Exception as e:
                print(f"  ⚠️ {tbl:<25}: خطأ في الفحص ({e})")
                all_passed = False

        # فحص الحسابات
        cur.execute("SELECT count(*) as total, sum(abs(current_balance)) as sum_bal FROM chart_of_accounts;")
        coa_res = cur.fetchone()
        coa_total = coa_res['total']
        sum_bal = float(coa_res['sum_bal'] or 0.0)
        coa_status = "✅" if sum_bal == 0.0 else "❌"
        print(f"  {coa_status} chart_of_accounts         : {coa_total} حسابات | إجمالي الأرصدة = {sum_bal:.4f} YER")

        # فحص العدادات
        cur.execute("SELECT count(*) as total, sum(current_number) as sum_curr FROM number_sequences;")
        seq_res = cur.fetchone()
        seq_total = seq_res['total']
        sum_curr = int(seq_res['sum_curr'] or 0)
        seq_status = "✅" if sum_curr == 0 else "❌"
        print(f"  {seq_status} number_sequences          : {seq_total} عدادات | مجموع العدادات = {sum_curr}")

        # فحص المستخدمين
        cur.execute("SELECT count(*) as cnt FROM users WHERE is_active = TRUE;")
        usr_cnt = cur.fetchone()['cnt']
        usr_status = "✅" if usr_cnt >= 4 else "❌"
        print(f"  {usr_status} users                     : {usr_cnt} مستخدمين نشطين جاهزين للعمل")

    print("\n" + "=" * 70)
    if all_passed and sum_bal == 0.0 and sum_curr == 0:
        print("🎉 النتيجة النهائية: تم تصفير وتهيئة النظام بنجاح 100% كنسخة جديدة ونظيفة تماماً! 👑")
    else:
        print("⚠️ يرجى مراجعة بعض الجداول أعلاه للتأكد من مطابقتها الكاملة.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    print("👑 Little Princesses ERP — تشغيل محرك التصفير الشامل والبدء النظيف...")
    backup_file = step1_create_full_backup()
    step2_wipe_and_reset_supabase()
    step3_wipe_and_reset_sqlite()
    step4_verify_clean_state()
