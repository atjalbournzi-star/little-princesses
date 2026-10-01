"""
reset/db_backup.py
خطوة 1: إنشاء نسخة احتياطية كاملة (Full Safety Snapshot) قبل التصفير
"""

import os
import json
import shutil
import datetime
from decimal import Decimal
import uuid

import db_client

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUPS_DIR = os.path.join(BASE_DIR, "backups")
os.makedirs(BACKUPS_DIR, exist_ok=True)


def step1_create_full_backup():
    print("\n" + "=" * 70)
    print("📦 الخطوة 1: إنشاء نسخة احتياطية كاملة (Full Safety Snapshot)...")
    print("=" * 70)

    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    # 1.1 نسخ ملف SQLite المحلي
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
    print(f"  ✅ تم حفظ النسخة الاحتياطية: {json_backup_name} ({fsize_kb:.1f} KB)")
    return json_backup_path
