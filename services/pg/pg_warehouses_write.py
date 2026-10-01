# services/pg/pg_warehouses_write.py
# Warehouse write operations: add, update, toggle status, and safe empty deletion

import logging
from .db_pool import get_db_cursor, clean_str
from .pg_warehouses import WAREHOUSE_NORMALIZE, ensure_warehouses_schema

logger = logging.getLogger("LittlePrincesses_PG_Warehouses_Write")

SYSTEM_WAREHOUSE_IDS = {"WH-MAIN", "WH-WORKSHOP", "WH-SHOWROOM"}


def add_warehouse(payload):
    """إضافة مستودع جديد وربطه بشجرة الحسابات (حساب جرد فرعي) تلقائياً"""
    data = payload.get("data") or payload
    name = clean_str(data.get("name") or data.get("warehouse_name") or "")
    if not name:
        raise ValueError("اسم المستودع مطلوب ولا يمكن أن يكون فارغاً")
    raw_code = clean_str(data.get("code") or data.get("warehouse_code") or "")
    if not raw_code:
        raise ValueError("رمز/كود المستودع مطلوب")
    code = raw_code.upper().strip()
    if not code.startswith("WH-"):
        code = f"WH-{code}"
    location = clean_str(data.get("location") or "")

    ensure_warehouses_schema()

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id FROM warehouses WHERE code = %s OR id = %s LIMIT 1;", (code, code))
        if cur.fetchone():
            raise ValueError(f"رمز المستودع ({code}) مستخدم مسبقاً. يرجى اختيار رمز مختلف.")

        cur.execute("""
            INSERT INTO warehouses (id, code, name, location, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *;
        """, (code, code, name, location))
        wh = dict(cur.fetchone())

        # إنشاء حساب فرعي تحت مجموعة المخزون (كود الأب 105)
        acc_suffix = code.replace("WH-", "").lower()
        acc_code = f"105.{acc_suffix}"
        acc_id = f"ACC-105-{acc_suffix}"
        acc_name = f"جرد مستودع {name}"
        cur.execute("""
            INSERT INTO chart_of_accounts (
                id, account_code, account_name, account_name_en, account_type,
                account_category, parent_account_code, level, is_group, is_postable,
                normal_balance, currency, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (account_code) DO NOTHING;
        """, (acc_id, acc_code, acc_name, f"Warehouse Inventory - {name}", "أصول",
              "Inventory", "105", 3, False, True, "Debit", "YER",
              f"حساب جرد آلي مرتبط بالمستودع {code}"))

    WAREHOUSE_NORMALIZE[code] = code
    WAREHOUSE_NORMALIZE[name] = code

    logger.info(f"New warehouse created: {code} | Account: {acc_code}")
    wh_clean = {k: str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v for k, v in wh.items()}
    return {
        "success": True, "status": "created",
        "data": {**wh_clean, "account_code": acc_code, "account_name": acc_name},
        "message": f"تم إنشاء المستودع [{name}] ({code}) وحساب الجرد [{acc_code}] بنجاح 🏢✅"
    }


def update_warehouse(payload):
    """تعديل اسم وموقع المستودع ومزامنة شجرة الحسابات تلقائياً"""
    data = payload.get("data") or payload
    wh_id = clean_str(data.get("id") or data.get("code") or "")
    if not wh_id:
        raise ValueError("معرف أو رمز المستودع مطلوب للتعديل")
    name = clean_str(data.get("name") or data.get("warehouse_name") or "")
    if not name:
        raise ValueError("اسم المستودع مطلوب ولا يمكن أن يكون فارغاً")
    location = clean_str(data.get("location") or "")

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id, code, name FROM warehouses WHERE id = %s OR code = %s LIMIT 1 FOR UPDATE;", (wh_id, wh_id))
        wh = cur.fetchone()
        if not wh:
            raise ValueError(f"لم يتم العثور على المستودع: {wh_id}")

        code = wh["code"]
        old_name = wh["name"]

        cur.execute("""
            UPDATE warehouses SET name = %s, location = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *;
        """, (name, location, wh["id"]))
        updated_wh = dict(cur.fetchone())

        acc_suffix = code.replace("WH-", "").lower()
        acc_code = f"105.{acc_suffix}"
        cur.execute("""
            UPDATE chart_of_accounts
            SET account_name = %s, account_name_en = %s
            WHERE account_code = %s;
        """, (f"جرد مستودع {name}", f"Warehouse Inventory - {name}", acc_code))

    WAREHOUSE_NORMALIZE.pop(old_name, None)
    WAREHOUSE_NORMALIZE[name] = code

    logger.info(f"Warehouse updated: {code} | Name: {name}")
    wh_clean = {k: str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v for k, v in updated_wh.items()}
    return {
        "success": True,
        "data": wh_clean,
        "message": f"تم تحديث بيانات المستودع [{name}] ومزامنة شجرة الحسابات بنجاح 🏢✏️"
    }


def toggle_warehouse_status(payload):
    """تفعيل أو تعطيل المستودع (Soft Delete / Inactive) مع حماية المستودعات السيادية"""
    data = payload.get("data") or payload
    wh_id = clean_str(data.get("id") or data.get("code") or "")
    if not wh_id:
        raise ValueError("معرف المستودع مطلوب")

    if wh_id in SYSTEM_WAREHOUSE_IDS:
        raise ValueError("لا يمكن تعطيل مستودعات النظام الأساسية (المستودع الرئيسي، المعمل، المعرض) حفاظاً على استقرار العمليات")

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id, code, name, is_active FROM warehouses WHERE id = %s OR code = %s LIMIT 1 FOR UPDATE;", (wh_id, wh_id))
        wh = cur.fetchone()
        if not wh:
            raise ValueError(f"لم يتم العثور على المستودع: {wh_id}")

        new_status = not bool(wh["is_active"])
        cur.execute("""
            UPDATE warehouses SET is_active = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s RETURNING *;
        """, (new_status, wh["id"]))
        updated_wh = dict(cur.fetchone())

    status_txt = "تنشيط" if new_status else "تعطيل"
    logger.info(f"Warehouse status toggled: {wh['code']} -> {new_status}")
    wh_clean = {k: str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v for k, v in updated_wh.items()}
    return {
        "success": True,
        "data": wh_clean,
        "is_active": new_status,
        "message": f"تم {status_txt} المستودع [{wh['name']}] بنجاح"
    }


def delete_warehouse_if_empty(payload):
    """حذف المستودع نهائياً فقط إذا كان خالياً تماماً من أي رصيد أو حركة أو قيد مالي"""
    data = payload.get("data") or payload
    wh_id = clean_str(data.get("id") or data.get("code") or "")
    if not wh_id:
        raise ValueError("معرف المستودع مطلوب")

    if wh_id in SYSTEM_WAREHOUSE_IDS:
        raise ValueError("محظور حوكمياً: لا يمكن حذف مستودعات النظام الأساسية السيادية إطلاقاً")

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id, code, name FROM warehouses WHERE id = %s OR code = %s LIMIT 1 FOR UPDATE;", (wh_id, wh_id))
        wh = cur.fetchone()
        if not wh:
            raise ValueError(f"لم يتم العثور على المستودع: {wh_id}")

        code = wh["code"]
        name = wh["name"]

        cur.execute("SELECT COALESCE(SUM(quantity), 0) as tot FROM warehouse_stock WHERE warehouse_id = %s;", (code,))
        tot_stock = float(cur.fetchone()["tot"] or 0)
        if tot_stock > 0:
            raise ValueError(f"لا يمكن حذف المستودع [{name}]: يحتوي على رصيد مخزني حالي ({tot_stock} وحدة). يرجى تصفير أو مناقلة الرصيد أولاً.")

        cur.execute("SELECT COUNT(*) as cnt FROM inventory_transactions WHERE warehouse_id = %s;", (code,))
        txn_cnt = int(cur.fetchone()["cnt"] or 0)
        if txn_cnt > 0:
            raise ValueError(f"حظر حوكمي: لا يمكن حذف المستودع [{name}] لوجود ({txn_cnt}) حركة مخزنية مسجلة به. يمكنك تعطيله بدلاً من ذلك.")

        acc_suffix = code.replace("WH-", "").lower()
        acc_code = f"105.{acc_suffix}"
        cur.execute("""
            SELECT COUNT(*) as cnt FROM journal_entry_lines jel
            JOIN chart_of_accounts coa ON (jel.account_id = coa.id OR jel.account_id = coa.account_code)
            WHERE coa.account_code = %s OR coa.id = %s;
        """, (acc_code, f"ACC-105-{acc_suffix}"))
        j_cnt = int(cur.fetchone()["cnt"] or 0)
        if j_cnt > 0:
            raise ValueError(f"حظر مالي حوكمي: حساب الجرد المرتبط بهذا المستودع مسجل عليه ({j_cnt}) قيد محاسبي. لا يمكن حذفه للحفاظ على سلامة الحسابات.")

        cur.execute("DELETE FROM warehouse_stock WHERE warehouse_id = %s;", (code,))
        cur.execute("DELETE FROM warehouses WHERE id = %s;", (wh["id"],))
        cur.execute("DELETE FROM chart_of_accounts WHERE account_code = %s;", (acc_code,))

    WAREHOUSE_NORMALIZE.pop(code, None)
    WAREHOUSE_NORMALIZE.pop(name, None)

    logger.info(f"Empty warehouse safely deleted: {code} | {name}")
    return {
        "success": True,
        "message": f"تم حذف المستودع الخالي [{name}] وحسابه المرتبط نهائياً بنجاح 🗑️✅"
    }
