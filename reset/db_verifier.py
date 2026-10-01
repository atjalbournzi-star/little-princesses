"""
reset/db_verifier.py
خطوة 4: التحقق والفحص الميداني بعد التصفير الشامل
"""

import db_client

TABLES_TO_CHECK = [
    ("orders", 0),
    ("order_items", 0),
    ("production_orders", 0),
    ("tailor_commissions", 0),
    ("fitting_alterations", 0),
    ("customers", 1),
    ("suppliers", 1),
    ("children", 0),
    ("measurements", 0),
    ("products", 0),
    ("inventory", 0),
    ("inventory_transactions", 0),
    ("purchases", 0),
    ("purchase_items", 0),
    ("payments", 0),
    ("expenses", 0),
    ("journal_entries", 0),
    ("journal_entry_lines", 0),
    ("employees", 0),
    ("payroll", 0),
    ("campaigns", 0),
    ("quality_inspections", 0),
]


def step4_verify_clean_state():
    print("\n" + "=" * 70)
    print("🔍 الخطوة 4: التحقق والفحص الميداني بعد التصفير...")
    print("=" * 70)

    all_passed = True
    sum_bal = 0.0
    sum_curr = 0

    with db_client.get_db_cursor() as cur:
        # فحص الجداول التشغيلية
        for tbl, expected in TABLES_TO_CHECK:
            try:
                cur.execute(f'SELECT count(*) as cnt FROM "{tbl}";')
                cnt = cur.fetchone()['cnt']
                status = "✅" if cnt == expected else "❌"
                if cnt != expected:
                    all_passed = False
                print(f"  {status} {tbl:<25}: {cnt} سجل (المتوقع: {expected})")
            except Exception as e:
                print(f"  ⚠️ {tbl:<25}: خطأ في الفحص ({e})")
                all_passed = False

        # فحص شجرة الحسابات
        cur.execute("SELECT count(*) as total, sum(abs(current_balance)) as sum_bal "
                    "FROM chart_of_accounts;")
        coa_res = cur.fetchone()
        coa_total = coa_res['total']
        sum_bal = float(coa_res['sum_bal'] or 0.0)
        coa_status = "✅" if sum_bal == 0.0 else "❌"
        print(f"  {coa_status} {'chart_of_accounts':<25}: {coa_total} حسابات | "
              f"إجمالي الأرصدة = {sum_bal:.4f} YER")

        # فحص عدادات الترقيم
        cur.execute("SELECT count(*) as total, sum(current_number) as sum_curr "
                    "FROM number_sequences;")
        seq_res = cur.fetchone()
        seq_total = seq_res['total']
        sum_curr = int(seq_res['sum_curr'] or 0)
        seq_status = "✅" if sum_curr == 0 else "❌"
        print(f"  {seq_status} {'number_sequences':<25}: {seq_total} عدادات | "
              f"مجموع العدادات = {sum_curr}")

        # فحص المستخدمين النشطين
        cur.execute("SELECT count(*) as cnt FROM users WHERE is_active = TRUE;")
        usr_cnt = cur.fetchone()['cnt']
        usr_status = "✅" if usr_cnt >= 4 else "❌"
        print(f"  {usr_status} {'users':<25}: {usr_cnt} مستخدمين نشطين جاهزين للعمل")

    print("\n" + "=" * 70)
    if all_passed and sum_bal == 0.0 and sum_curr == 0:
        print("🎉 النتيجة النهائية: تم تصفير النظام بنجاح 100% كنسخة جديدة ونظيفة! 👑")
    else:
        print("⚠️ يرجى مراجعة بعض الجداول أعلاه للتأكد من مطابقتها الكاملة.")
    print("=" * 70 + "\n")
