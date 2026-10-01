# db_client.py
# Little Princesses ERP - Central PostgreSQL Connection Pool & Transactions Layer

import os
import sys
import threading
import logging
from contextlib import contextmanager
import psycopg2
from psycopg2 import pool, extras
from dotenv import load_dotenv

# UTF-8 stdout configuration for Arabic logging
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

logger = logging.getLogger("db_client")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [DB_CLIENT]: %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, '.env'))

DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))
DB_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "30"))

_db_pool = None
_pool_lock = threading.Lock()


def get_active_database_url(mode=None):
    if mode is None:
        mode = os.getenv("DB_MODE", "cloud").strip().lower()
    if mode == "local":
        url = os.getenv("LOCAL_DATABASE_URL")
        if not url:
            host = os.getenv("LOCAL_DB_HOST", "localhost")
            port = os.getenv("LOCAL_DB_PORT", "5432")
            dbname = os.getenv("LOCAL_DB_NAME", "little_princesses_erp")
            user = os.getenv("LOCAL_DB_USER", "postgres")
            pwd = os.getenv("LOCAL_DB_PASSWORD", "postgres")
            url = f"postgresql://{user}:{pwd}@{host}:{port}/{dbname}"
        return url, "local"
    return os.getenv("DATABASE_URL"), "cloud"


def init_pool(minconn=None, maxconn=None, mode=None):
    global _db_pool
    with _pool_lock:
        if _db_pool is not None and not _db_pool.closed:
            return _db_pool
        min_c = minconn or DB_POOL_MIN
        max_c = maxconn or DB_POOL_MAX
        db_url, active_mode = get_active_database_url(mode)
        if not db_url or not db_url.strip():
            raise ValueError(f"DATABASE_URL not configured for mode ({active_mode})")
        logger.info(f"🔄 Initializing PostgreSQL connection pool ({active_mode})...")
        _db_pool = pool.ThreadedConnectionPool(minconn=min_c, maxconn=max_c, dsn=db_url, connect_timeout=DB_TIMEOUT)
        logger.info("✅ PostgreSQL connection pool created successfully.")
        return _db_pool


def get_pool(mode=None):
    global _db_pool
    if _db_pool is None or _db_pool.closed:
        return init_pool(mode=mode)
    return _db_pool


def close_pool():
    global _db_pool
    with _pool_lock:
        if _db_pool is not None and not _db_pool.closed:
            _db_pool.closeall()
            _db_pool = None
            logger.info("✅ Connection pool closed.")


@contextmanager
def get_db_connection(mode=None):
    p = get_pool(mode=mode)
    conn = None
    try:
        conn = p.getconn()
        is_bad = False
        try:
            if conn.closed != 0:
                is_bad = True
            else:
                with conn.cursor() as probe:
                    probe.execute("SELECT 1;")
        except Exception:
            is_bad = True
        if is_bad:
            try: p.putconn(conn, close=True)
            except Exception: pass
            conn = p.getconn()
            is_bad = False
        yield conn
    except Exception as e:
        if isinstance(e, (psycopg2.OperationalError, psycopg2.InterfaceError)):
            is_bad = True
        if conn and not conn.closed:
            try: conn.rollback()
            except Exception: pass
        raise e
    finally:
        if conn and not p.closed:
            try:
                if is_bad or conn.closed != 0:
                    p.putconn(conn, close=True)
                else:
                    p.putconn(conn)
            except Exception:
                pass


@contextmanager
def get_db_cursor(commit=True, dict_cursor=True, mode=None):
    with get_db_connection(mode=mode) as conn:
        cursor_factory = extras.RealDictCursor if dict_cursor else None
        cur = conn.cursor(cursor_factory=cursor_factory)
        try:
            yield cur
            if commit:
                conn.commit()
            else:
                conn.rollback()
        except Exception as e:
            if not conn.closed:
                try: conn.rollback()
                except Exception: pass
            logger.error(f"❌ Query execution error (Rolled back): {e}")
            raise e
        finally:
            try: cur.close()
            except Exception: pass


def execute_query(query, params=None, fetch_one=False, fetch_all=False, commit=False, dict_cursor=True, mode=None):
    with get_db_cursor(commit=commit, dict_cursor=dict_cursor, mode=mode) as cur:
        cur.execute(query, params)
        if fetch_one:
            res = cur.fetchone()
            return dict(res) if (dict_cursor and res is not None) else res
        if fetch_all:
            res = cur.fetchall()
            return [dict(r) if dict_cursor else r for r in res]
        return cur.rowcount


def execute_batch(query, param_list, commit=True, mode=None):
    with get_db_cursor(commit=commit, dict_cursor=False, mode=mode) as cur:
        extras.execute_batch(cur, query, param_list)
        return cur.rowcount


def test_connection(mode=None):
    try:
        db_url, active_mode = get_active_database_url(mode)
        if not db_url or not db_url.strip():
            return False, f"DATABASE_URL not configured for mode ({active_mode})."
        with get_db_cursor(commit=False, dict_cursor=False, mode=mode) as cur:
            cur.execute("SELECT version();")
            ver = cur.fetchone()[0]
            cur.execute("SELECT current_database(), current_user;")
            dbname, user = cur.fetchone()
        info = f"✅ Connected ({active_mode}) | DB: {dbname} | User: {user} | Version: {ver[:50]}..."
        logger.info(info)
        return True, info
    except Exception as e:
        err = f"❌ Connection failed: {e}"
        logger.error(err)
        return False, err


if __name__ == "__main__":
    success, message = test_connection(sys.argv[1] if len(sys.argv) > 1 else None)
    print(message)
