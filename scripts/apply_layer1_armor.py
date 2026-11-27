#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Little Princesses ERP - Layer 1 Hard Armor Migration & Verification Orchestrator
Executes the 5 SQL hard shields and runs empirical rollback tests.
Strictly compliant with Architectural Standards (< 220 lines).
"""

import os
import sys
from db_client import get_db_cursor, logger

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL_ARMOR_DIR = os.path.join(BASE_DIR, "sql", "armor")

SHIELD_FILES = [
    "01_shield1_double_entry_guard.sql",
    "02_shield2_ifrs_immutability.sql",
    "03_shield3_hard_uniqueness.sql",
    "04_shield4_zero_neg_stock_fk.sql",
    "05_shield5_rls_hardening.sql"
]
VERIFICATION_FILE = "06_verify_rollback_test.sql"


def verify_file_standards():
    """Verify all SQL armor files are strictly <= 220 lines."""
    all_files = SHIELD_FILES + [VERIFICATION_FILE]
    logger.info("📏 Checking line counts for all Layer 1 Armor SQL files...")
    for f in all_files:
        path = os.path.join(SQL_ARMOR_DIR, f)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Missing SQL file: {path}")
        with open(path, "r", encoding="utf-8") as fh:
            lines = len(fh.readlines())
        if lines > 220:
            raise ValueError(f"File {f} exceeds 220 lines limit: {lines} lines!")
        logger.info(f"  [PASS] {f:<40} : {lines:>3} lines (limit: 220)")


def apply_sql_file(file_name):
    """Execute an idempotent SQL migration file against Supabase."""
    path = os.path.join(SQL_ARMOR_DIR, file_name)
    logger.info(f"🛡️ Applying {file_name}...")
    with open(path, "r", encoding="utf-8") as fh:
        sql = fh.read()
    with get_db_cursor(commit=True) as cur:
        cur.execute(sql)
    logger.info(f"✅ Applied {file_name} successfully.")


def run_rollback_verification():
    """Execute the empirical verification test within BEGIN ... ROLLBACK."""
    path = os.path.join(SQL_ARMOR_DIR, VERIFICATION_FILE)
    logger.info(f"🧪 Running Rollback Verification Suite ({VERIFICATION_FILE})...")
    with open(path, "r", encoding="utf-8") as fh:
        sql = fh.read()
    with get_db_cursor(commit=False) as cur:
        # Capture notices
        cur.execute(sql)
        conn = cur.connection
        for notice in conn.notices:
            logger.info(f"[DB NOTICE] {notice.strip()}")
        conn.rollback()
    logger.info("✅ Verification Suite Executed and Rolled Back completely.")


def verify_clean_state():
    """Ensure zero persistent test records remain in transactional tables."""
    tables = [
        "journal_entries", "journal_entry_lines", "payments",
        "piece_rate_logs", "warehouse_stock", "orders"
    ]
    with get_db_cursor(commit=False) as cur:
        for t in tables:
            cur.execute(f"SELECT COUNT(*) as c FROM public.{t};")
            cnt = cur.fetchone()["c"]
            if cnt > 0:
                raise RuntimeError(f"Database hygiene violated: table {t} contains {cnt} dirty records!")
            logger.info(f"  [CLEAN 100%] Table {t:<25} : 0 rows")


def main():
    logger.info("==================================================================")
    logger.info("Little Princesses ERP - PostgreSQL Hard Armor Deployment & Verification")
    logger.info("==================================================================")
    verify_file_standards()
    for shield in SHIELD_FILES:
        apply_sql_file(shield)
    run_rollback_verification()
    verify_clean_state()
    logger.info("==================================================================")
    logger.info("🎉 PROTECTION LAYER 1 (POSTGRESQL HARD ARMOR) ACTIVATED 100%!")
    logger.info("==================================================================")


if __name__ == "__main__":
    main()
