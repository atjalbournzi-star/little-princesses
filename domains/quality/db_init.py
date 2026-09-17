# domains/quality/db_init.py
# Quality management database initialization and sync

import sqlite3
import threading
from domains.system.db_connection import get_db
from domains.quality.default_data import DEFAULT_QUALITY_CHECKPOINTS, DEFAULT_QUALITY_SETTINGS
from domains.quality.db_tables import create_quality_tables
import pg_service


def init_quality_db(conn=None):
    close_at_end = False
    if conn is None:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        close_at_end = True
    c = conn.cursor()

    create_quality_tables(c)

    c.execute("SELECT COUNT(*) FROM quality_checkpoints")
    if c.fetchone()[0] == 0:
        c.executemany("INSERT OR IGNORE INTO quality_checkpoints (checkpoint_id, checkpoint_name, production_stage, description, required, criteria, tolerance, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", DEFAULT_QUALITY_CHECKPOINTS)

    c.execute("SELECT COUNT(*) FROM quality_settings")
    if c.fetchone()[0] == 0:
        c.executemany("INSERT OR IGNORE INTO quality_settings (metric_name, metric_code, formula, target, warning_threshold, critical_threshold, weight, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", DEFAULT_QUALITY_SETTINGS)

    conn.commit()
    if close_at_end:
        conn.close()


def sync_quality_to_gas_async(action, payload):
    """مزامنة سجلات الجودة مباشرة مع PostgreSQL بدلاً من Google Sheets"""
    def _worker():
        try:
            res = pg_service.dispatch_action(action, payload)
            if res.get('success'):
                print(f"[PG Quality Direct Save Success]: {action}")
            else:
                print(f"[PG Quality Save Warning]: {action} - {res.get('message')}")
        except Exception as e:
            print(f"[PG Quality Sync Error]: {action} - {e}")
    t = threading.Thread(target=_worker, daemon=True)
    t.start()
