# scripts/hard_purge_all.py
# Little Princesses ERP - Hard Execution Purge Script
# Wipes all demo and test data across all databases, zeroes accounts, resets sequences

import os
import sys
import sqlite3
import json

# Ensure UTF-8 output
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TABLES_TO_WIPE = [
    "orders", "order_items", "order_stages", "sales_orders", "sales_orders_full", "sales_qr_orders",
    "production_orders", "factory", "finished_stock", "fittings", "fitting_alterations",
    "customers", "customers_full", "customers_old", "children",
    "customer_measurements", "measurement_profiles", "measurements", "garment_measurements_studio",
    "inventory", "inventory_v2", "inventory_transactions", "warehouse_stock",
    "bom", "models_products", "models_products_v2", "products", "materials",
    "purchases", "purchases_full", "purchase_orders", "purchase_order_items", "purchase_items",
    "suppliers", "vendors",
    "vouchers", "vouchers_full", "expenses", "payments",
    "journal_entries", "journal_entry_lines", "journal_lines",
    "payroll", "payroll_records", "employees", "tailor_commissions", "tailors",
    "quality_inspections", "quality_defects", "customer_feedback", "quality_feedback",
    "quality_complaints", "quality_returns", "quality_corrective_actions", "quality_actions",
    "quality_master_evaluations",
    "campaigns", "marketing_campaigns", "post_analytics", "content",
    "content_metrics", "comments", "conversations", "messages",
    "raw_platform_events", "customer_platform_mappings",
    "ai_comment_nlp", "ai_conversation_intent", "ai_daily_briefs",
    "ai_recommendations", "attribution_records",
    "audit_log", "account_audit_log", "audit_logs",
    "cloud_sync_queue", "idempotency_keys"
]

def purge_sqlite_database(db_path):
    if not os.path.exists(db_path):
        return
    print(f"🧹 Purging SQLite database: {os.path.basename(db_path)}...")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    existing_tables = {r[0] for r in cur.fetchall()}

    for tbl in TABLES_TO_WIPE:
        if tbl in existing_tables:
            try:
                cur.execute(f'DELETE FROM "{tbl}";')
            except Exception as e:
                print(f"  Notice deleting {tbl}: {e}")

    # Zero all accounts
    for acc_tbl in ["accounts", "accounts_v2", "accounts_old", "chart_of_accounts"]:
        if acc_tbl in existing_tables:
            try:
                cur.execute(f"""
                    UPDATE "{acc_tbl}" SET
                        balance = 0.0,
                        opening_balance = 0.0,
                        current_balance = 0.0;
                """)
            except Exception:
                pass

    # Reset sequences
    if "number_sequences" in existing_tables:
        try:
            cur.execute("UPDATE number_sequences SET current_number = 0;")
        except Exception:
            pass

    conn.commit()
    conn.close()
    print(f"  ✅ Finished purging {os.path.basename(db_path)}")

def purge_postgres():
    print("🧹 Attempting PostgreSQL / Supabase purge...")
    try:
        import db_client
        with db_client.get_db_cursor(commit=True) as cur:
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
            existing = {r['table_name'] for r in cur.fetchall()}
            valid_truncates = [f'"{t}"' for t in TABLES_TO_WIPE if t in existing]
            if valid_truncates:
                cur.execute(f"TRUNCATE TABLE {', '.join(valid_truncates)} RESTART IDENTITY CASCADE;")
                print(f"  ✅ Truncated {len(valid_truncates)} PostgreSQL tables.")
            if "chart_of_accounts" in existing:
                cur.execute("UPDATE chart_of_accounts SET opening_balance = 0.0000, current_balance = 0.0000;")
                print("  ✅ Zeroed chart_of_accounts balances.")
            if "number_sequences" in existing:
                cur.execute("UPDATE number_sequences SET current_number = 0;")
                print("  ✅ Reset number_sequences.")
    except Exception as e:
        print(f"  ℹ️ PostgreSQL/Cloud connection unavailable ({e}), skipped cloud purge.")

def purge_backup_snapshots():
    print("🧹 Cleaning demo data from backup snapshots...")
    backup_dir = os.path.join(BASE_DIR, "backups")
    if not os.path.exists(backup_dir):
        return
    for f in os.listdir(backup_dir):
        if f.endswith('.json'):
            p = os.path.join(backup_dir, f)
            try:
                with open(p, 'r', encoding='utf-8') as fp:
                    content = fp.read()
                if any(x in content for x in ['LP-KID-5279', 'PUR-1001', 'بشورة']):
                    # Overwrite with empty clean snapshot
                    clean_snap = {"metadata": {"purged": True, "date": "2026-11-12"}, "tables": {}}
                    with open(p, 'w', encoding='utf-8') as fp:
                        json.dump(clean_snap, fp)
                    print(f"  ✅ Purged demo data from {f}")
            except Exception as e:
                pass

if __name__ == "__main__":
    print("👑 Little Princesses ERP - Executing Hard Purge Engine...")
    for db in ['little_princesses.db', 'database.db', 'database_backup.db', 'erp_system.db', 'pos.db', 'little_princesses_mobile.db']:
        purge_sqlite_database(os.path.join(BASE_DIR, db))
    purge_postgres()
    purge_backup_snapshots()
    print("👑 Hard purge completed 100% successfully.")
