"""
=============================================================================
👑 LITTLE PRINCESSES ERP — DATABASE CONNECTION CLIENT & THREADED POOL
=============================================================================
طبقة الاتصال المركزية بقاعدة بيانات PostgreSQL مع إدارة حوض الاتصالات (Connection Pool)،
والإدارة الآمنة للمعاملات (Transactions)، واسترجاع البيانات بصيغة قواميس (RealDictCursor).
"""

import os
import sys

# ضبط ترميز الإخراج لمنع أخطاء UnicodeEncodeError في نظام Windows (cp1256)
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

import threading
import logging
from contextlib import contextmanager
import psycopg2
from psycopg2 import pool, extras
from dotenv import load_dotenv

# إعداد السجلات (Logging)
logger = logging.getLogger("db_client")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [DB_CLIENT]: %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# تحميل متغيرات البيئة من ملف .env
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, '.env'))

# إعدادات حوض الاتصال
DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))
DB_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "30"))

# كائن حوض الاتصال وقفل التزامن (Thread Lock)
_db_pool = None
_pool_lock = threading.Lock()


def get_active_database_url(mode=None):
    """
    استخراج رابط الاتصال النشط بناءً على الوضع المحدد أو المتغير DB_MODE
    يدعم السحابي (Cloud - Neon / Supabase) والمحلي (Local PostgreSQL)
    """
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
    else:
        url = os.getenv("DATABASE_URL")
        return url, "cloud"


def init_pool(minconn=None, maxconn=None, mode=None):
    """
    تهيئة حوض الاتصالات المشترك (ThreadedConnectionPool)
    """
    global _db_pool
    with _pool_lock:
        if _db_pool is not None and not _db_pool.closed:
            return _db_pool

        min_c = minconn or DB_POOL_MIN
        max_c = maxconn or DB_POOL_MAX
        db_url, active_mode = get_active_database_url(mode)

        if not db_url or not db_url.strip():
            raise ValueError(
                f"❌ رابط قاعدة البيانات غير مضبوط في ملف .env لوضع ({active_mode}).\n"
                f"يرجى ضبط المتغير {'DATABASE_URL' if active_mode == 'cloud' else 'LOCAL_DATABASE_URL'} في ملف .env"
            )

        logger.info(f"🔄 جاري تهيئة حوض اتصالات PostgreSQL ({active_mode}) بحجم (min={min_c}, max={max_c})...")
        try:
            _db_pool = pool.ThreadedConnectionPool(
                minconn=min_c,
                maxconn=max_c,
                dsn=db_url,
                connect_timeout=DB_TIMEOUT
            )
            logger.info("✅ تم إنشاء حوض الاتصالات بنجاح.")
            return _db_pool
        except Exception as e:
            logger.error(f"❌ فشل إنشاء حوض الاتصالات: {e}")
            raise e


def get_pool(mode=None):
    """
    الحصول على الحوض القائم أو إنشاؤه في حال لم يكن موجوداً
    """
    global _db_pool
    if _db_pool is None or _db_pool.closed:
        return init_pool(mode=mode)
    return _db_pool


def close_pool():
    """
    إغلاق جميع الاتصالات في الحوض عند إيقاف تشغيل الخادم
    """
    global _db_pool
    with _pool_lock:
        if _db_pool is not None and not _db_pool.closed:
            logger.info("🔒 جاري إغلاق حوض اتصالات PostgreSQL...")
            _db_pool.closeall()
            _db_pool = None
            logger.info("✅ تم إغلاق كافة الاتصالات بأمان.")


@contextmanager
def get_db_connection(mode=None):
    """
    مدير سياق (Context Manager) لاستعارة اتصال من الحوض وإرجاعه تلقائياً بعد الانتهاء.
    الاستخدام:
        with get_db_connection() as conn:
            # استخدام الاتصال
    """
    p = get_pool(mode=mode)
    conn = None
    try:
        conn = p.getconn()
        # فحص سلامة الاتصال والتأكد من أنه لم ينقطع
        is_bad = False
        try:
            if conn.closed != 0:
                is_bad = True
        except Exception:
            is_bad = True

        if is_bad:
            logger.warning("⚠️ تم استلام اتصال غير صالح أو مقطوع من الحوض، جاري استبداله باتصال جديد...")
            try:
                p.putconn(conn, close=True)
            except Exception:
                pass
            conn = p.getconn()

        yield conn
    except Exception as e:
        if conn:
            try:
                if not conn.closed:
                    conn.rollback()
            except Exception:
                pass
        raise e
    finally:
        if conn and not p.closed:
            try:
                p.putconn(conn)
            except Exception as pe:
                logger.error(f"⚠️ خطأ أثناء إعادة الاتصال إلى الحوض: {pe}")


@contextmanager
def get_db_cursor(commit=True, dict_cursor=True, mode=None):
    """
    مدير سياق (Context Manager) للحصول على Cursor لتنفيذ الاستعلامات.
    
    الميزات:
    - إرجاع النتائج على شكل قواميس (RealDictCursor) افتراضياً لتسهيل التعامل مع JSON وواجهات برمجة التطبيقات.
    - تنفيذ الالتزام التلقائي (Commit) في حال عدم حدوث أي خطأ و commit=True.
    - تنفيذ التراجع التلقائي (Rollback) عند حدوث أي خطأ برمجياً.
    - إعادة الاتصال إلى الحوض تلقائياً في النهاية دون تسريب اتصالات.
    
    الاستخدام:
        with get_db_cursor() as cur:
            cur.execute("SELECT * FROM customers WHERE id = %s", (customer_id,))
            customer = cur.fetchone()
    """
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
            try:
                if not conn.closed:
                    conn.rollback()
            except Exception:
                pass
            logger.error(f"❌ خطأ أثناء تنفيذ الاستعلام، تم التراجع (Rollback): {e}")
            raise e
        finally:
            try:
                cur.close()
            except Exception:
                pass


def execute_query(query, params=None, fetch_one=False, fetch_all=False, commit=False, dict_cursor=True, mode=None):
    """
    دالة مساعدة مريحة لتنفيذ استعلام أحادي وإرجاع البيانات مباشرة.
    
    أمثلة:
        rows = execute_query("SELECT * FROM products WHERE is_active = %s", (True,), fetch_all=True)
        row = execute_query("SELECT * FROM users WHERE username = %s", ("admin",), fetch_one=True)
        execute_query("UPDATE accounts SET balance = %s WHERE id = %s", (15000, 1), commit=True)
    """
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
    """
    تنفيذ استعلام دفعي لسرعة فائقة (Batch Insert/Update)
    """
    with get_db_cursor(commit=commit, dict_cursor=False, mode=mode) as cur:
        extras.execute_batch(cur, query, param_list)
        return cur.rowcount


def test_connection(mode=None):
    """
    فحص صحة واستقرار الاتصال بقاعدة البيانات وحوض الاتصال
    """
    try:
        db_url, active_mode = get_active_database_url(mode)
        if not db_url or not db_url.strip():
            return False, f"متغير DATABASE_URL غير مضبوط لوضع ({active_mode})."

        with get_db_cursor(commit=False, dict_cursor=False, mode=mode) as cur:
            cur.execute("SELECT version();")
            ver = cur.fetchone()[0]
            cur.execute("SELECT current_database(), current_user;")
            dbname, user = cur.fetchone()
            
        info = f"✅ اتصال ناجح ({active_mode}) | قاعدة البيانات: {dbname} | المستخدم: {user} | الإصدار: {ver[:60]}..."
        logger.info(info)
        return True, info
    except Exception as e:
        err = f"❌ فشل الاتصال بقاعدة البيانات: {e}"
        logger.error(err)
        return False, err


if __name__ == "__main__":
    # تشغيل مباشر للاختبار
    print("=" * 70)
    print("👑 LITTLE PRINCESSES ERP — فحص طبقة الاتصال بقاعدة البيانات")
    print("=" * 70)
    target_mode = sys.argv[1] if len(sys.argv) > 1 else None
    success, message = test_connection(target_mode)
    print(message)
