# scripts/supabase_hard_purge.py
# Little Princesses ERP - Supabase PostgreSQL Live Database Purge & Zeroing Engine

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Ensure UTF-8 output
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found in .env")
    sys.exit(1)

# الجداول التشغيلية والتجريبية المطلوب تفريغها بالكامل
OPERATIONAL_TABLES_TO_TRUNCATE = [
    # 1. المبيعات والتفصيل وخطوط الإنتاج
    "orders", "order_items", "order_stages", "production_orders",
    # 2. العملاء والقياسات واستوديو المقاسات
    "customers", "children", "measurements", "garment_measurements_studio", "fitting_alterations",
    # 3. المنتجات والباترونات والخامات
    "products", "materials", "bom",
    # 4. المخزون وحركات المستودعات
    "warehouse_stock", "inventory_transactions", "inventory",
    # 5. المشتريات والموردين
    "purchase_items", "purchase_orders", "purchase_order_items", "purchases", "suppliers",
    # 6. المالية والسندات والقيود والمصروفات
    "payments", "vouchers", "expenses", "expense_transactions", "journal_entry_lines", "journal_entries",
    # 7. الموارد البشرية والرواتب والعمولات
    "payroll_items", "payroll_runs", "payroll", "piece_rate_logs", "tailor_commissions", "employee_advances", "employees",
    # 8. الجودة والفحوصات والمرتجعات
    "quality_returns", "quality_complaints", "quality_defects", "quality_feedback", "quality_actions", "quality_inspections",
    # 9. التسويق والذكاء الاصطناعي والمحادثات
    "ai_comment_nlp", "ai_conversation_intent", "ai_daily_briefs", "ai_recommendations",
    "attribution_records", "comments", "content_metrics", "content", "messages", "conversations",
    "customer_platform_mappings", "campaigns", "raw_platform_events", "ai_scoring_weights",
    # 10. سجلات التدقيق والمفاتيح المؤقتة
    "audit_logs", "idempotency_keys", "tenants", "cost_centers"
]

# الجداول الأساسية المحمية التي يمنع حذفها
PRESERVED_SYSTEM_TABLES = {
    "users",
    "company_profile",
    "system_settings",
    "currencies",
    "chart_of_accounts",
    "warehouses",
    "quality_checkpoints",
    "quality_settings",
    "capability_matrix",
    "marketing_platforms",
    "number_sequences",
    "job_roles"
}

def execute_purge():
    print("=" * 75)
    print("👑 Little Princesses ERP - Supabase PostgreSQL Hard Purge Engine")
    print("=" * 75)
    
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # 1. اكتشاف كافة جداول المخطط العام public
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        all_public_tables = [r[0] for r in cur.fetchall()]
        print(f"🔍 Discovered {len(all_public_tables)} total tables in public schema.")

        # 2. تحديد الجداول التشغيلية المرشحة للتفريغ
        tables_to_truncate = [t for t in all_public_tables if t in OPERATIONAL_TABLES_TO_TRUNCATE and t not in PRESERVED_SYSTEM_TABLES]
        
        # تحقق من أي جدول غير مصنف
        unclassified = [t for t in all_public_tables if t not in OPERATIONAL_TABLES_TO_TRUNCATE and t not in PRESERVED_SYSTEM_TABLES]
        if unclassified:
            print(f"ℹ️ Additional operational tables discovered: {unclassified}")
            tables_to_truncate.extend(unclassified)

        print(f"\n🚀 Executing TRUNCATE CASCADE on {len(tables_to_truncate)} operational tables...")
        formatted_tables = ", ".join(f'"{t}"' for t in tables_to_truncate)
        cur.execute(f"TRUNCATE TABLE {formatted_tables} RESTART IDENTITY CASCADE;")
        print("✅ TRUNCATE CASCADE completed successfully.")

        # 3. تصفير أرصدة شجرة الحسابات (Chart of Accounts)
        print("\n💰 Zeroing all Chart of Accounts balances...")
        cur.execute("""
            UPDATE chart_of_accounts SET
                opening_balance = 0.0000,
                current_balance = 0.0000;
        """)
        print(f"✅ Zeroed balances for all accounts in chart_of_accounts ({cur.rowcount} accounts preserved).")

        # 4. تصفير عدادات الترقيم التسلسلي
        print("\n🔢 Resetting sequence counters (number_sequences)...")
        cur.execute("UPDATE number_sequences SET current_number = 0;")
        print(f"✅ Reset number_sequences counters ({cur.rowcount} sequences reset to 0).")

        # 5. تثبيت المعاملة
        conn.commit()
        print("\n💾 Database transaction committed successfully.")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error during Supabase purge (Rolled back): {e}")
        conn.close()
        sys.exit(1)

    # 6. التحقق النهائي من عدد الصفوف في كل جدول
    print("\n" + "=" * 75)
    print("📊 Mandatory Row-Count Verification Across All Supabase Tables:")
    print("=" * 75)

    verification_failed = False
    for t in all_public_tables:
        cur.execute(f'SELECT count(*) FROM "{t}";')
        cnt = cur.fetchone()[0]
        
        if t in PRESERVED_SYSTEM_TABLES:
            if t == "chart_of_accounts":
                cur.execute("SELECT sum(abs(opening_balance)) + sum(abs(current_balance)) FROM chart_of_accounts;")
                bal_sum = float(cur.fetchone()[0] or 0.0)
                status_icon = "✅" if bal_sum == 0.0 else "❌"
                print(f"  {status_icon} {t:<35} : {cnt} rows | Total Balances: {bal_sum:.4f} (Preserved Skeleton)")
                if bal_sum != 0.0:
                    verification_failed = True
            elif t == "number_sequences":
                cur.execute("SELECT sum(current_number) FROM number_sequences;")
                seq_sum = int(cur.fetchone()[0] or 0)
                status_icon = "✅" if seq_sum == 0 else "❌"
                print(f"  {status_icon} {t:<35} : {cnt} rows | Total Current Number: {seq_sum}")
                if seq_sum != 0:
                    verification_failed = True
            else:
                print(f"  🛡️ {t:<35} : {cnt} rows (Preserved System Table)")
        else:
            status_icon = "✅" if cnt == 0 else "❌"
            if cnt != 0:
                verification_failed = True
            print(f"  {status_icon} {t:<35} : {cnt} rows")

    conn.close()
    print("=" * 75)
    if verification_failed:
        print("⚠️ Verification found non-zero rows in operational tables.")
        sys.exit(1)
    else:
        print("👑 SUPABASE PURGE 100% VERIFIED: All operational data is exactly ZERO (0).")

if __name__ == "__main__":
    execute_purge()
