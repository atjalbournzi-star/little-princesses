import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL') or os.getenv('SUPABASE_DB_URL')

conn = psycopg2.connect(db_url)
cur = conn.cursor()

# جلب جميع الجداول مع استثناء الجداول الإدارية والأساسية
cur.execute("""
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename NOT IN ('chart_of_accounts', 'accounts_schema', 'schema_migrations', 'users', 'roles', 'settings');
""")
tables = cur.fetchall()

for t in tables:
    table_name = t[0]
    try:
        cur.execute(f'TRUNCATE TABLE "{table_name}" CASCADE;')
        conn.commit()
    except Exception:
        conn.rollback()

# تصفير شجرة الحسابات
cur.execute("UPDATE chart_of_accounts SET current_balance = 0 WHERE current_balance IS NOT NULL;")
conn.commit()

cur.close()
conn.close()
print("--- COMPLETE RESET SUCCESSFUL ---")
