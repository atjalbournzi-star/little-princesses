# services/pg/pg_sequences.py
# Centralized Atomic Sequence Generator for Little Princesses ERP
# Thread-safe and concurrency-protected sequence generator using PostgreSQL row locks.

import logging
from .db_pool import get_db_cursor, clean_str, clean_num

logger = logging.getLogger("LittlePrincesses_PG_Sequences")


def ensure_number_sequences_schema(cur):
    """تهيئة جدول التسلسل الرقمي واستكمال قيم المفتاح الأساسي والكيانات المفقودة"""
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS number_sequences (
                id VARCHAR(64),
                entity VARCHAR(50),
                sequence_key VARCHAR(50) PRIMARY KEY,
                prefix VARCHAR(20) NOT NULL,
                current_number BIGINT NOT NULL DEFAULT 0,
                padding INT NOT NULL DEFAULT 6,
                description VARCHAR(255),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # 1. استكمال قيم المفتاح الأساسي (id) المفقودة
        cur.execute("UPDATE number_sequences SET id = 'SEQ-' || sequence_key WHERE id IS NULL;")

        # 2. استكمال أسماء الكيانات
        cur.execute("""
            UPDATE number_sequences SET entity = CASE sequence_key
                WHEN 'ACC' THEN 'chart_of_accounts'
                WHEN 'CHLD' THEN 'children'
                WHEN 'CUST' THEN 'customers'
                WHEN 'EMP' THEN 'employees'
                WHEN 'EXP' THEN 'expenses'
                WHEN 'INV-TXN' THEN 'inventory_transactions'
                WHEN 'JV' THEN 'journal_entries'
                WHEN 'MAT' THEN 'inventory_items'
                WHEN 'MEAS' THEN 'measurements'
                WHEN 'ORD' THEN 'orders'
                WHEN 'PAY' THEN 'payments'
                WHEN 'PROD' THEN 'products'
                WHEN 'PROD-ORD' THEN 'production_orders'
                WHEN 'PUR' THEN 'purchases'
                WHEN 'SUP' THEN 'suppliers'
                WHEN 'RV' THEN 'payments'
                WHEN 'PV' THEN 'payments'
                ELSE LOWER(sequence_key)
            END WHERE entity IS NULL;
        """)

        # 3. إدراج تسلسلات سندات القبض والصرف والموديلات في حال عدم وجودها
        cur.execute("""
            INSERT INTO number_sequences (id, entity, sequence_key, prefix, current_number, padding, description)
            VALUES 
                ('SEQ-PROD-KID', 'products', 'PROD-KID', 'LP-KID-', 1, 4, 'تسلسل موديلات الأطفال'),
                ('SEQ-PROD-WMN', 'products', 'PROD-WMN', 'LP-WMN-', 0, 4, 'تسلسل موديلات الكبار والنسائي'),
                ('SEQ-PROD-CST', 'products', 'PROD-CST', 'LP-CST-', 0, 4, 'تسلسل الموديلات الحرة والتفصيل'),
                ('SEQ-RV', 'payments', 'RV', 'RV-', 0, 6, 'تسلسل سندات القبض'),
                ('SEQ-PV', 'payments', 'PV', 'PV-', 0, 6, 'تسلسل سندات الصرف'),
                ('SEQ-EMP', 'employees', 'EMP', 'EMP-', 0, 6, 'تسلسل أرقام الموظفين')
            ON CONFLICT (sequence_key) DO NOTHING;
        """)
    except Exception as e:
        logger.warning(f"⚠️ تنبيه أثناء فحص جدول الترقيم المتسلسل: {e}")


def get_next_sequence_number(cur, sequence_key: str, fallback_prefix: str = None, fallback_padding: int = 6) -> str:
    """
    توليد رقم تسلسلي ذري ومحمي ضد التزامن (Atomic Sequence Generator)
    يقوم بزيادة العداد (current_number) بمقدار واحد داخل معاملة قاعدة بيانات محمية
    ويرجع الرقم الرسمي المنسق حسب البادئة وطول الخانات
    """
    key = clean_str(sequence_key).upper()
    if not key:
        key = 'GEN'

    # 1. التحديث الذري مع القفل في نفس المعاملة (Atomic UPDATE ... RETURNING)
    update_sql = """
        UPDATE number_sequences
        SET current_number = current_number + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE sequence_key = %s
        RETURNING prefix, current_number, padding;
    """
    cur.execute(update_sql, (key,))
    row = cur.fetchone()

    if not row:
        # في حال عدم وجود المفتاح، يتم إنشاؤه تلقائياً دون تعطل
        pfx = fallback_prefix or f"{key}-"
        pad = int(fallback_padding or 6)
        ins_sql = """
            INSERT INTO number_sequences (id, entity, sequence_key, prefix, current_number, padding, description)
            VALUES (%s, %s, %s, %s, 1, %s, %s)
            ON CONFLICT (sequence_key) DO UPDATE
            SET current_number = number_sequences.current_number + 1,
                updated_at = CURRENT_TIMESTAMP
            RETURNING prefix, current_number, padding;
        """
        cur.execute(ins_sql, (f"SEQ-{key}", key.lower(), key, pfx, pad, f"تسلسل تلقائي {key}"))
        row = cur.fetchone()

    prefix = row['prefix'] if row and 'prefix' in row else (fallback_prefix or f"{key}-")
    cur_num = row['current_number'] if row and 'current_number' in row else 1
    pad_len = row['padding'] if row and 'padding' in row else 6

    formatted_num = f"{prefix}{str(cur_num).zfill(pad_len)}"
    return formatted_num


def get_number_sequences(params=None):
    """استرجاع كافة تعريفات التسلسل الرقمي للنظام"""
    with get_db_cursor() as cur:
        ensure_number_sequences_schema(cur)
        cur.execute("SELECT id, entity, sequence_key, prefix, current_number, padding, description, updated_at FROM number_sequences ORDER BY sequence_key ASC;")
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            if r.get('updated_at'):
                r['updated_at'] = str(r['updated_at'])
            r['sample_next'] = f"{r['prefix']}{str(int(r['current_number']) + 1).zfill(int(r['padding']))}"
        return rows


def update_number_sequence(payload):
    """تحديث إعدادات بادئة أو طول خانات تسلسل معين بأمان"""
    data = payload.get('data') or payload
    key = clean_str(data.get('sequence_key')).upper()
    if not key:
        raise ValueError("sequence_key مطلوب")
    prefix = clean_str(data.get('prefix'))
    padding = int(clean_num(data.get('padding'), 6))

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            UPDATE number_sequences
            SET prefix = COALESCE(NULLIF(%s, ''), prefix),
                padding = GREATEST(2, LEAST(12, %s)),
                updated_at = CURRENT_TIMESTAMP
            WHERE sequence_key = %s
            RETURNING *;
        """, (prefix, padding, key))
        row = cur.fetchone()
        return dict(row) if row else {"success": False, "error": "المفتاح غير موجود"}


def preview_next_sequence_number(cur, sequence_key: str, fallback_prefix: str = None, fallback_padding: int = 4) -> str:
    """معاينة حية للرقم المتسلسل التالي دون زيادة العداد الفعلي في قاعدة البيانات"""
    key = clean_str(sequence_key).upper() or 'GEN'
    cur.execute("SELECT prefix, current_number, padding FROM number_sequences WHERE sequence_key = %s LIMIT 1;", (key,))
    row = cur.fetchone()
    if row:
        pfx = row['prefix']
        next_num = int(row['current_number']) + 1
        pad = int(row['padding'])
    else:
        pfx = fallback_prefix or f"{key}-"
        next_num = 1
        pad = int(fallback_padding or 4)
    return f"{pfx}{str(next_num).zfill(pad)}"


def preview_next_sequence(payload=None):
    """جلب المعاينة الحية للرقم المتسلسل التالي لكيان أو مفتاح معين"""
    payload = payload or {}
    data = payload.get('data') or payload if isinstance(payload, dict) else {}
    key = clean_str(data.get('sequence_key') or data.get('key') or data.get('entity') or 'GEN')
    pfx = clean_str(data.get('prefix'))
    pad = int(clean_num(data.get('padding'), 4))
    with get_db_cursor() as cur:
        ensure_number_sequences_schema(cur)
        num = preview_next_sequence_number(cur, key, fallback_prefix=pfx, fallback_padding=pad)
        return {"success": True, "sequence_number": num, "next_number": num, "preview": num}


def fetch_next_sequence(payload=None):
    """جلب الرقم المتسلسل الرسمي التالي لكيان أو مفتاح تسلسل معين وحفظه ذرياً"""
    payload = payload or {}
    data = payload.get('data') or payload if isinstance(payload, dict) else {}
    key = clean_str(data.get('sequence_key') or data.get('key') or data.get('entity') or (payload if isinstance(payload, str) else 'GEN'))
    with get_db_cursor(commit=True) as cur:
        ensure_number_sequences_schema(cur)
        num = get_next_sequence_number(cur, key)
        return {"success": True, "sequence_number": num, "next_number": num, "number": num}
