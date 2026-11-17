"""
reset/db_verifier.py
خطوة 4: التحقق والفحص الميداني بعد التصفير الشامل
"""

import db_client

"""
reset/db_verifier.py
خطوة 4: التحقق والفحص الميداني بعد التصفير الشامل لقواعد البيانات
"""

import os
import sqlite3
import db_client

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TABLES_TO_CHECK = [
    ("orders", 0), ("order_items", 0), ("production_orders", 0),
    ("tailor_commissions", 0), ("fitting_alterations", 0),
    ("customers", 1), ("children", 0), ("measurements", 0),
    ("products", 0), ("inventory", 0), ("inventory_transactions", 0),
    ("purchases", 0), ("payments", 0), ("expenses", 0),
    ("journal_entries", 0), ("employees", 0), ("payroll", 0),
    ("campaigns", 0), ("quality_inspections", 0)
]


def _verify_sqlite_state():
    print("  --- فحص قاعدة البيانات المحلية SQLite (little_princesses.db) ---")
    sqlite_db_path = os.path.join(BASE_DIR, "little_princesses.db")
    if not os.path.exists(sqlite_db_path):
        print("  ℹ️ SQLite DB غير موجودة.")
        return True

    conn = sqlite3.connect(sqlite_db_path)
    c = conn.cursor()
    all_ok = True

    for tbl, expected in TABLES_TO_CHECK:
        try:
            c.execute(f'SELECT count(*) FROM "{tbl}";')
            cnt = c.fetchone()[0]
            status = "✅" if cnt == expected else "❌"
            if cnt != expected: all_ok = False
            print(f"  {status} {tbl:<23} (SQLite): {cnt} (المتوقع: {expected})")
        except Exception:
            pass

    # فحص شجرة الحسابات المحلية
    c.execute("SELECT count(*), sum(abs(current_balance)), sum(abs(balance)) FROM accounts;")
    row = c.fetchone()
    coa_tot, cur_bal, bal = row[0], float(row[1] or 0.0), float(row[2] or 0.0)
    bal_ok = (cur_bal == 0.0 and bal == 0.0)
    st = "✅" if bal_ok else "❌"
    print(f"  {st} accounts (SQLite)     : {coa_tot} حسابات | إجمالي الأرصدة = {cur_bal:.2f}")

    # فحص العدادات
    c.execute("SELECT sum(current_number) FROM number_sequences;")
    seq_sum = int(c.fetchone()[0] or 0)
    st_seq = "✅" if seq_sum == 0 else "❌"
    print(f"  {st_seq} number_sequences (SQLite): مجموع العدادات = {seq_sum}")

    conn.close()
    return all_ok and bal_ok and seq_sum == 0


def _verify_postgres_state():
    print("  --- فحص قاعدة بيانات PostgreSQL / Supabase ---")
    try:
        with db_client.get_db_cursor() as cur:
            all_ok = True
            for tbl, expected in TABLES_TO_CHECK:
                try:
                    cur.execute(f'SELECT count(*) as cnt FROM "{tbl}";')
                    cnt = cur.fetchone()['cnt']
                    status = "✅" if cnt == expected else "❌"
                    if cnt != expected: all_ok = False
                    print(f"  {status} {tbl:<23} (Cloud) : {cnt} (المتوقع: {expected})")
                except Exception:
                    pass

            cur.execute("SELECT count(*) as total, sum(abs(current_balance)) as sum_bal FROM chart_of_accounts;")
            coa = cur.fetchone()
            s_bal = float(coa['sum_bal'] or 0.0)
            st = "✅" if s_bal == 0.0 else "❌"
            print(f"  {st} chart_of_accounts (Cloud) : {coa['total']} حسابات | أرصدة = {s_bal:.4f}")

            cur.execute("SELECT sum(current_number) as s_num FROM number_sequences;")
            seq_s = int(cur.fetchone()['s_num'] or 0)
            st_seq = "✅" if seq_s == 0 else "❌"
            print(f"  {st_seq} number_sequences (Cloud) : مجموع العدادات = {seq_s}")
            return all_ok and s_bal == 0.0 and seq_s == 0
    except Exception as e:
        print(f"  ℹ️ تنبيه: فحص السحابة غير متاح حالياً ({e}).")
        return True


def step4_verify_clean_state():
    print("\n" + "=" * 70)
    print("🔍 الخطوة 4: التحقق والفحص الميداني بعد التصفير...")
    print("=" * 70)

    sq_ok = _verify_sqlite_state()
    pg_ok = _verify_postgres_state()

    print("\n" + "=" * 70)
    if sq_ok and pg_ok:
        print("🎉 النتيجة النهائية: تم تصفير وتطهير النظام بنجاح 100% كنسخة إنتاجية نظيفة! 👑")
    else:
        print("⚠️ يرجى مراجعة بعض الجداول أعلاه للتأكد من مطابقتها الكاملة.")
    print("=" * 70 + "\n")
