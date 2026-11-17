# services/pg/pg_suppliers.py
# Suppliers directory, credit terms, phone deduplication, and atomic sequence numbering

from .db_pool import get_db_cursor, clean_str, clean_num, generate_id, execute_query
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, get_active_user_context


def get_suppliers(params=None):
    """استرجاع قائمة الموردين مع الأرصدة والحالة"""
    active_only = True
    if params and isinstance(params, dict):
        if params.get('all') in ('true', True, '1', 1):
            active_only = False

    where_clause = "WHERE is_active = TRUE" if active_only else ""
    query = f"""
        SELECT id, name, name as supplier_name, phone, phone_alt, email, city, address,
               current_balance, current_balance as balance, is_active, created_by, created_at, updated_at
        FROM suppliers
        {where_clause}
        ORDER BY name ASC;
    """
    rows = execute_query(query, fetch_all=True) or []
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('updated_at'): r['updated_at'] = str(r['updated_at'])
        r['current_balance'] = float(r.get('current_balance') or 0.0)
        r['balance'] = r['current_balance']
    return rows


def add_supplier(payload):
    """إضافة أو تحديث مورد مع التحقق الصارم من عدم تكرار أرقام الهواتف والتسلسل التلقائي"""
    data = payload.get('data') or payload
    raw_uid = clean_str(data.get('created_by') or data.get('user_id') or '')
    resolved_user = raw_uid or get_active_user_context('admin')

    supp_id = clean_str(data.get('id') or data.get('supplier_id'))
    name = clean_str(data.get('name') or data.get('supplier_name'))
    if not name:
        raise ValueError("اسم المورد مطلوب")
    phone = clean_str(data.get('phone') or data.get('supplier_phone') or '')
    if not phone:
        raise ValueError("رقم الهاتف الأساسي للمورد مطلوب للتحقق ومنع الازدواجية")
    phone_alt = clean_str(data.get('phone_alt') or '')
    email = clean_str(data.get('email') or '')
    city = clean_str(data.get('city') or 'صنعاء')
    address = clean_str(data.get('address') or '')
    init_balance = clean_num(data.get('current_balance') or data.get('balance') or 0.0)
    is_active = True if data.get('is_active') is not False else False

    with get_db_cursor(commit=True) as cur:
        is_new = False
        if not supp_id or supp_id.startswith('SUP-NEW'):
            cur.execute("SELECT id, name FROM suppliers WHERE phone = %s AND is_active = TRUE LIMIT 1;", (phone,))
            dup = cur.fetchone()
            if dup:
                raise ValueError(f"رقم الهاتف ({phone}) مسجل بالفعل للمورد ({dup['name']})، يرجى استخدام رقم هاتف فريد.")
            supp_id = get_next_sequence_number(cur, 'SUP', fallback_prefix='SUP-')
            is_new = True
        else:
            cur.execute("SELECT id, name FROM suppliers WHERE phone = %s AND id != %s AND is_active = TRUE LIMIT 1;", (phone, supp_id))
            dup = cur.fetchone()
            if dup:
                raise ValueError(f"رقم الهاتف ({phone}) مسجل بالفعل لمورد آخر ({dup['name']}).")

        query = """
            INSERT INTO suppliers (id, name, phone, phone_alt, email, city, address, current_balance, is_active, created_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, phone = EXCLUDED.phone,
                phone_alt = COALESCE(NULLIF(EXCLUDED.phone_alt, ''), suppliers.phone_alt),
                email = COALESCE(NULLIF(EXCLUDED.email, ''), suppliers.email),
                city = EXCLUDED.city, address = EXCLUDED.address, is_active = EXCLUDED.is_active,
                created_by = COALESCE(suppliers.created_by, EXCLUDED.created_by), updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """
        cur.execute(query, (supp_id, name, phone, phone_alt, email, city, address, init_balance, is_active, resolved_user))
        res = dict(cur.fetchone())

        log_audit_event(
            entity_type='suppliers',
            entity_id=supp_id,
            action='INSERT' if is_new else 'UPDATE',
            new_values={'id': supp_id, 'name': name, 'phone': phone},
            user_id=resolved_user,
            document_no=supp_id,
            details=f"حفظ بيانات المورد {name} ({supp_id})",
            cur=cur
        )

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        res['supplier_name'] = res.get('name')
        res['supplier_id'] = supp_id
        res['id'] = supp_id
        res['balance'] = float(res.get('current_balance') or 0.0)
        res['success'] = True
        return res


def delete_supplier(payload):
    """التعطيل الآمن للمورد (Soft Delete) لحماية الفواتير التاريخية وتوازن القيود"""
    data = payload.get('data') or payload
    supp_id = clean_str(data.get('id') or data.get('supplier_id'))
    u_id = get_active_user_context('admin')
    if not supp_id or supp_id == 'SUPP-GENERAL':
        raise ValueError("معرف المورد مطلوب")
    with get_db_cursor(commit=True) as cur:
        cur.execute("UPDATE suppliers SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING id, name;", (supp_id,))
        row = cur.fetchone()
        if not row:
            raise ValueError("المورد غير موجود أو تم حذفه مسبقاً")
        log_audit_event('suppliers', supp_id, 'DEACTIVATE', user_id=u_id, document_no=supp_id, details=f"تعطيل المورد {row['name']}", cur=cur)
        return {
            "deleted": False, "deactivated": True, "id": supp_id, "success": True,
            "message": f"تم تعطيل المورد ({row['name']}) بنجاح (الحذف الآمن Soft Delete) لحماية سلامة الفواتير التاريخية وتوازن القيود المالية."
        }
