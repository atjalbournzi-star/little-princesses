# -*- coding: utf-8 -*-
"""
Unified Database Gateway & Repository Architecture for Little Princesses ERP
Resolves Split-Brain persistence by routing database operations through a single authoritative gateway.
"""

import os
from typing import List, Dict, Any, Optional

try:
    import db_client
    HAS_PG_CLIENT = True
except ImportError:
    HAS_PG_CLIENT = False

class DBGateway:
    def __init__(self):
        self.mode = os.environ.get("DB_MODE", "cloud").strip().lower()

    def is_postgres_active(self) -> bool:
        return HAS_PG_CLIENT and self.mode in ("cloud", "postgres", "postgresql")

    def execute_read(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Executes a read query against the authoritative database."""
        if self.is_postgres_active():
            return db_client.execute_query(query, params)
        else:
            import db_manager
            conn = db_manager.get_connection()
            c = conn.cursor()
            c.execute(query, params or ())
            rows = [dict(r) for r in c.fetchall()]
            conn.close()
            return rows

    def execute_write(self, query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
        """Executes a write query with immediate transaction commit."""
        if self.is_postgres_active():
            with db_client.get_db_cursor(commit=True) as cur:
                cur.execute(query, params)
                try:
                    res = cur.fetchone()
                    return dict(res) if res else None
                except Exception:
                    return None
        else:
            import db_manager
            conn = db_manager.get_connection()
            c = conn.cursor()
            c.execute(query, params or ())
            conn.commit()
            conn.close()
            return None

# Global gateway singleton
db_gateway = DBGateway()
