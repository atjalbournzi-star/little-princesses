"""Idempotent runner for Migration 002 (PostgreSQL + optional SQLite schema sync)."""

import os
import sqlite3
from services.pg.db_pool import get_db_cursor, logger

MIGRATION_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "migrations",
    "002_bespoke_mto_tailoring_foundation.sql",
)

SQLITE_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "little_princesses.db",
)


def apply_postgres_migration():
    with open(MIGRATION_PATH, "r", encoding="utf-8") as f:
        sql_text = f.read()
    with get_db_cursor(commit=True) as cur:
        cur.execute(sql_text)
    logger.info("PostgreSQL Migration 002 applied successfully.")


def _sqlite_has_table(conn, table_name):
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?;", (table_name,)
    ).fetchone()
    return bool(row)


def _sqlite_add_col(conn, table_name, col_name, col_def):
    if not _sqlite_has_table(conn, table_name):
        return
    cols = {r[1] for r in conn.execute(f'PRAGMA table_info("{table_name}");').fetchall()}
    if col_name not in cols:
        conn.execute(f'ALTER TABLE "{table_name}" ADD COLUMN {col_name} {col_def};')


def sync_sqlite_schema():
    if not os.path.exists(SQLITE_DB_PATH):
        return
    conn = sqlite3.connect(SQLITE_DB_PATH)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS standard_size_matrices (
                id TEXT PRIMARY KEY, segment_code TEXT NOT NULL, segment_name_ar TEXT NOT NULL,
                size_label TEXT NOT NULL, display_unit TEXT DEFAULT 'cm',
                chest_cm REAL, waist_cm REAL, hip_cm REAL, dress_length_cm REAL,
                shoulder_cm REAL, sleeve_cm REAL, extra_measurements_json TEXT DEFAULT '{}',
                fabric_factor REAL DEFAULT 1.0, sort_order INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS customer_material_custody (
                id TEXT PRIMARY KEY, custody_no TEXT UNIQUE NOT NULL, order_id TEXT,
                order_item_id TEXT, production_order_id TEXT, customer_id TEXT,
                fabric_description TEXT NOT NULL, received_qty REAL NOT NULL,
                unit TEXT DEFAULT 'meter', condition_notes TEXT, reference_image TEXT,
                leftover_returned_qty REAL DEFAULT 0, status TEXT DEFAULT 'RECEIVED',
                received_by TEXT, closed_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        _sqlite_add_col(conn, "products", "fulfillment_mode", "TEXT DEFAULT 'READY_STOCK'")
        for tbl in ("order_items", "production_orders"):
            for col, cdef in (
                ("item_mode", "TEXT DEFAULT 'CATALOG_MTO'"),
                ("material_source", "TEXT DEFAULT 'WORKSHOP_STOCK'"),
                ("sizing_mode", "TEXT DEFAULT 'CUSTOM'"),
                ("size_matrix_id", "TEXT"),
                ("size_adjustments_json", "TEXT DEFAULT '{}'"),
                ("custom_design_title", "TEXT"),
                ("standard_size_disclaimer", "INTEGER DEFAULT 0"),
            ):
                _sqlite_add_col(conn, tbl, col, cdef)
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    apply_postgres_migration()
    sync_sqlite_schema()
    print("Migration 002 completed.")
