# services/pg/pool_resilience.py
# Connection health probing and transparent pool recovery for unstable networks

import time
import logging
import psycopg2

logger = logging.getLogger("LittlePrincesses_DB_Resilience")
TRANSIENT_DB_ERRORS = (psycopg2.OperationalError, psycopg2.InterfaceError)


def is_connection_healthy(conn):
    """Probe an existing PostgreSQL connection before lending it out."""
    if not conn or getattr(conn, 'closed', 1) != 0:
        return False
    try:
        if conn.autocommit:
            conn.autocommit = False
        if conn.status != psycopg2.extensions.STATUS_READY:
            conn.rollback()
        with conn.cursor() as probe:
            probe.execute("SELECT 1;")
        if conn.status != psycopg2.extensions.STATUS_READY:
            conn.rollback()
        return True
    except Exception:
        return False


def acquire_healthy_connection(get_pool_fn, reset_pool_fn, mode=None, max_attempts=3):
    """Acquire a verified healthy connection, rebuilding stale pools transparently."""
    last_err = None
    for attempt in range(max_attempts):
        p = get_pool_fn(mode=mode)
        conn = None
        try:
            conn = p.getconn()
        except Exception as err:
            last_err = err
            logger.warning("⚠️ Pool getconn failed (attempt %d/%d): %s", attempt + 1, max_attempts, err)
            if attempt >= 1:
                reset_pool_fn()
            if attempt < max_attempts - 1:
                time.sleep(0.25 * (attempt + 1))
                continue
            raise

        if is_connection_healthy(conn):
            return conn, p

        if conn:
            try:
                p.putconn(conn, close=True)
            except Exception:
                try:
                    conn.close()
                except Exception:
                    pass
        logger.warning("🔄 Discarded stale DB connection (attempt %d/%d)", attempt + 1, max_attempts)
        if attempt >= 1:
            reset_pool_fn()
        if attempt < max_attempts - 1:
            time.sleep(0.25 * (attempt + 1))

    raise last_err or psycopg2.OperationalError("Unable to acquire a healthy database connection")


def release_connection(conn, conn_pool, is_bad=False):
    """Safely reset or close a connection back to its originating pool."""
    if not conn:
        return
    if not conn_pool or getattr(conn_pool, 'closed', True):
        try:
            conn.close()
        except Exception:
            pass
        return
    close_conn = is_bad or getattr(conn, 'closed', 1) != 0
    if not close_conn:
        try:
            if conn.autocommit:
                conn.autocommit = False
            if conn.status != psycopg2.extensions.STATUS_READY:
                conn.rollback()
        except Exception:
            close_conn = True
    try:
        conn_pool.putconn(conn, close=close_conn)
    except Exception:
        try:
            conn.close()
        except Exception:
            pass
