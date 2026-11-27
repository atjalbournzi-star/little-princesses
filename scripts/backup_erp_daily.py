# scripts/backup_erp_daily.py
# Off-Project Automated Daily Database Snapshot & Retention System
# Standard: Strictly < 220 lines per file

import os
import sys
import io
import json
import zipfile
import hashlib
import datetime
from decimal import Decimal
import uuid

# Add project root to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from db_client import get_db_cursor

BACKUP_DIR = r"C:\Users\Mohammed Falah\ERP_Backups_Daily"

CORE_TABLES = [
    'accounts', 'system_settings', 'company_profile', 'currencies', 'cost_centers',
    'customers', 'employees', 'job_roles', 'products', 'product_categories',
    'orders', 'order_items', 'order_stages', 'production_orders',
    'journal_entries', 'journal_entry_lines', 'payments', 'expenses',
    'inventory', 'warehouse_stock', 'warehouses', 'suppliers', 'purchases',
    'purchase_items', 'piece_rate_logs', 'fiscal_periods', 'number_sequences',
    'users', 'audit_logs'
]


def serialize_cell(val):
    """Custom serializer for PostgreSQL types in JSON."""
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.isoformat()
    if isinstance(val, uuid.UUID):
        return str(val)
    return val


def prune_old_backups(backup_dir, max_keep=30):
    """Retains latest max_keep backups and prunes older ones."""
    if not os.path.exists(backup_dir):
        return 0
    zips = [
        os.path.join(backup_dir, f) for f in os.listdir(backup_dir)
        if f.startswith("LP_ERP_Backup_") and f.endswith(".zip")
    ]
    zips.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    pruned = 0
    if len(zips) > max_keep:
        for old_file in zips[max_keep:]:
            try:
                os.remove(old_file)
                sha_file = old_file + ".sha256"
                if os.path.exists(sha_file):
                    os.remove(sha_file)
                pruned += 1
            except Exception as e:
                print(f"Prune notice: {e}")
    return pruned


def run_erp_backup(backup_dir=BACKUP_DIR, max_keep=30):
    """
    Exports live Supabase PostgreSQL tables into an off-project ZIP backup
    with manifest.json, SHA-256 integrity hash, and automatic 30-day retention.
    """
    os.makedirs(backup_dir, exist_ok=True)
    ts_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = f"LP_ERP_Backup_{ts_str}"
    zip_path = os.path.join(backup_dir, f"{base_name}.zip")

    table_data = {}
    table_counts = {}
    total_records = 0

    with get_db_cursor(commit=False) as cur:
        for tbl in CORE_TABLES:
            try:
                cur.execute(f"SELECT * FROM public.{tbl};")
                rows = cur.fetchall() or []
                serialized = [
                    {k: serialize_cell(v) for k, v in dict(r).items()}
                    for r in rows
                ]
                table_data[tbl] = serialized
                table_counts[tbl] = len(serialized)
                total_records += len(serialized)
            except Exception:
                table_data[tbl] = []
                table_counts[tbl] = 0

    # Build manifest
    manifest = {
        "backup_name": base_name,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "database_engine": "PostgreSQL (Supabase Cloud)",
        "tables_count": len(CORE_TABLES),
        "total_records": total_records,
        "table_rows": table_counts
    }

    # Write ZIP archive
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))
        for tbl, rows in table_data.items():
            content = json.dumps(rows, indent=2, ensure_ascii=False)
            zf.writestr(f"tables/{tbl}.json", content)

    zip_bytes = zip_buffer.getvalue()
    sha256_hash = hashlib.sha256(zip_bytes).hexdigest()

    # Save ZIP and companion checksum
    with open(zip_path, "wb") as f:
        f.write(zip_bytes)

    sha_path = f"{zip_path}.sha256"
    with open(sha_path, "w", encoding="utf-8") as f:
        f.write(f"{sha256_hash}  {os.path.basename(zip_path)}\n")

    pruned = prune_old_backups(backup_dir, max_keep)

    result = {
        "success": True,
        "backup_name": base_name,
        "zip_path": zip_path,
        "sha256": sha256_hash,
        "size_bytes": len(zip_bytes),
        "size_kb": round(len(zip_bytes) / 1024, 2),
        "total_records": total_records,
        "tables_count": len(CORE_TABLES),
        "table_counts": table_counts,
        "pruned_old_backups": pruned,
        "message": f"تم إنشاء النسخة الاحتياطية بنجاح 💾 ({base_name}.zip)"
    }
    return result


if __name__ == '__main__':
    print("🚀 بدء النسخ الاحتياطي لقاعدة بيانات Little Princesses ERP...")
    res = run_erp_backup()
    print(f"✅ تم الحفظ بنجاح: {res['zip_path']}")
    print(f"🔒 بصمة SHA-256: {res['sha256']}")
    print(f"📊 إجمالي السجلات: {res['total_records']} عبر {res['tables_count']} جدول")
    if res['pruned_old_backups'] > 0:
        print(f"🧹 تم حذف {res['pruned_old_backups']} نسخة قديمة وفق سياسة الاحتفاظ")
