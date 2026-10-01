# services/pg/pg_auth.py
# User authentication, user synchronization, and user records management

import datetime
from .db_pool import get_db_cursor, clean_str, execute_query, logger


def get_users_pg(params=None):
    """استرجاع قائمة المستخدمين من PostgreSQL"""
    query = "SELECT id, username, full_name, role, email, phone, is_active, created_at FROM users ORDER BY created_at ASC;"
    rows = execute_query(query, fetch_all=True) or []
    for r in rows:
        if r.get('created_at'):
            r['created_at'] = str(r['created_at'])
    return rows


def sync_user_to_pg(payload):
    """مزامنة أو إضافة مستخدم في جدول users السحابي"""
    data = payload.get('data') or payload
    u_id = clean_str(data.get('id')) or f"USR-{int(datetime.datetime.now().timestamp())}"
    uname = clean_str(data.get('username'))
    if not uname:
        return {"error": "Username required"}
    pwd_hash = clean_str(data.get('password_hash') or data.get('password') or 'hashed_default')
    full_name = clean_str(data.get('full_name') or uname)
    role = clean_str(data.get('role') or 'data_entry')
    email = clean_str(data.get('email') or f"{uname}@littleprincesses.com")
    phone = clean_str(data.get('phone') or '')
    is_act = bool(data.get('is_active', True))

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO users (id, username, password_hash, full_name, role, email, phone, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (username) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role,
                is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, username, full_name, role, email, phone, is_active;
        """, (u_id, uname, pwd_hash, full_name, role, email, phone, is_act))
        row = cur.fetchone()
        return dict(row) if row else {"id": u_id, "username": uname, "full_name": full_name, "role": role}
