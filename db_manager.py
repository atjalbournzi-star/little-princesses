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

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2 import sql
from dotenv import load_dotenv

# تحميل متغيرات البيئة من ملف .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

def get_connection_string(mode=None):
    """
    إرجاع سلسلة الاتصال بناءً على الوضع المطلوب ('cloud' أو 'local')
    أو بناءً على المتغير DB_MODE الموجود في .env
    """
    if mode is None:
        mode = os.getenv('DB_MODE', 'cloud').lower()
    
    if mode == 'local':
        url = os.getenv('LOCAL_DATABASE_URL')
        if not url:
            host = os.getenv('LOCAL_DB_HOST', 'localhost')
            port = os.getenv('LOCAL_DB_PORT', '5432')
            dbname = os.getenv('LOCAL_DB_NAME', 'little_princesses_erp')
            user = os.getenv('LOCAL_DB_USER', 'postgres')
            pwd = os.getenv('LOCAL_DB_PASSWORD', 'postgres')
            url = f"postgresql://{user}:{pwd}@{host}:{port}/{dbname}"
        return url, 'local'
    else:
        url = os.getenv('DATABASE_URL')
        return url, 'cloud'

def get_db_connection(mode=None):
    """
    إنشاء اتصال مباشر مع قاعدة بيانات PostgreSQL
    """
    conn_str, active_mode = get_connection_string(mode)
    if not conn_str or conn_str.strip() == "":
        raise ValueError(
            f"❌ لم يتم ضبط رابط الاتصال لقاعدة البيانات في وضع ({active_mode}). "
            f"يرجى فتح ملف .env وإضافة رابط الاتصال في المتغير {'DATABASE_URL' if active_mode == 'cloud' else 'LOCAL_DATABASE_URL'}."
        )
    return psycopg2.connect(conn_str)

def test_connection(mode=None):
    """
    فحص صحة الاتصال بقاعدة البيانات وإرجاع إصدار PostgreSQL
    """
    try:
        conn_str, active_mode = get_connection_string(mode)
        print(f"🔄 جاري محاولة الاتصال بـ PostgreSQL ({active_mode})...")
        conn = get_db_connection(mode)
        cur = conn.cursor()
        cur.execute("SELECT version();")
        ver = cur.fetchone()[0]
        cur.close()
        conn.close()
        print(f"✅ تم الاتصال بنجاح بقاعدة البيانات ({active_mode})!")
        print(f"📌 إصدار السيرفر: {ver[:70]}...")
        return True, ver
    except Exception as e:
        print(f"❌ فشل الاتصال بقاعدة البيانات: {e}")
        return False, str(e)

def apply_schema(schema_file_path=None, mode=None):
    """
    تطبيق ملف DDL (schema_postgresql.sql) لإنشاء كافة الجداول والفهارس
    """
    if schema_file_path is None:
        schema_file_path = os.path.join(os.path.dirname(__file__), 'schema_postgresql.sql')
    
    if not os.path.exists(schema_file_path):
        raise FileNotFoundError(f"❌ لم يتم العثور على ملف المخطط: {schema_file_path}")

    print(f"📖 جاري قراءة ملف المخطط من: {schema_file_path}")
    with open(schema_file_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    conn = get_db_connection(mode)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    print("🚀 جاري تنفيذ أوامر إنشاء الجداول في PostgreSQL...")
    try:
        cur.execute(schema_sql)
        print("✅ تم إنشاء كافة الجداول والفهارس والقيود بنجاح تام!")
    except Exception as e:
        print(f"❌ خطأ أثناء تطبيق المخطط: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

def list_created_tables(mode=None):
    """
    عرض قائمة بجميع الجداول المنشأة في قاعدة البيانات مع عدد الأعمدة
    """
    conn = get_db_connection(mode)
    cur = conn.cursor()
    query = """
        SELECT table_name, count(column_name) as col_count
        FROM information_schema.columns
        WHERE table_schema = 'public'
        GROUP BY table_name
        ORDER BY table_name;
    """
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

if __name__ == "__main__":
    mode_arg = sys.argv[1] if len(sys.argv) > 1 else None
    success, info = test_connection(mode_arg)
    if success:
        print("\n📊 فحص الجداول القائمة:")
        tables = list_created_tables(mode_arg)
        if tables:
            print(f"عدد الجداول الموجودة: {len(tables)}")
            for t, count in tables:
                print(f" - {t}: ({count} أعمدة)")
        else:
            print("قاعدة البيانات فارغة حالياً. لتطبيق المخطط قم بتشغيل: python -c 'import db_manager; db_manager.apply_schema()'")
