# services/pg/pg_audit.py
# Audit logging and audit trail retrieval

import json
from .db_pool import get_db_cursor, clean_str, clean_num, logger


def log_audit_event(entity_type, entity_id, action, old_values=None, new_values=None, user_id='SYSTEM', ip_address='127.0.0.1'):
    """تسجيل حركة تدقيق أمني في جدول audit_logs مع دعم التراجع الذاتي"""
    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id BIGSERIAL PRIMARY KEY,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id VARCHAR(100) NOT NULL,
                    action VARCHAR(50) NOT NULL,
                    old_values JSONB,
                    new_values JSONB,
                    user_id VARCHAR(100),
                    ip_address VARCHAR(45),
                    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                );
            """)
            resolved_user_id = None
            if user_id:
                cur.execute("SELECT id FROM users WHERE id = %s OR username = %s LIMIT 1;", (str(user_id), str(user_id)))
                u_row = cur.fetchone()
                if u_row:
                    resolved_user_id = u_row['id']
            cur.execute("""
                INSERT INTO audit_logs (entity_type, entity_id, action, old_values, new_values, user_id, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                clean_str(entity_type or 'SYSTEM'),
                str(entity_id or 'GENERAL'),
                clean_str(action or 'INFO'),
                json.dumps(old_values, default=str) if old_values is not None else None,
                json.dumps(new_values, default=str) if new_values is not None else None,
                resolved_user_id,
                clean_str(ip_address or '127.0.0.1')
            ))
            row = cur.fetchone()
            return row['id'] if row else None
    except Exception as e:
        logger.error(f"❌ خطأ أثناء تسجيل سجل التدقيق (Audit Log): {e}")
        return None


def get_audit_logs(params=None):
    """استرجاع سجلات التدقيق الأمني مع الفلترة والترقيم"""
    params = params or {}
    if isinstance(params, dict) and 'data' in params:
        params = params['data']
    limit = int(clean_num(params.get('limit') or 50))
    offset = int(clean_num(params.get('offset') or 0))
    entity_type = clean_str(params.get('entity_type') or '')
    action = clean_str(params.get('action') or '')
    search = clean_str(params.get('search') or '')

    where_clauses = []
    args = []
    if entity_type:
        where_clauses.append("entity_type ILIKE %s")
        args.append(f"%{entity_type}%")
    if action:
        where_clauses.append("action ILIKE %s")
        args.append(f"%{action}%")
    if search:
        where_clauses.append("(entity_id ILIKE %s OR user_id ILIKE %s OR action ILIKE %s)")
        args.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    with get_db_cursor() as cur:
        cur.execute(f"SELECT COUNT(*) as total FROM audit_logs {where_sql};", tuple(args))
        total = cur.fetchone()['total']

        cur.execute(f"""
            SELECT id, entity_type, entity_id, action, old_values, new_values, user_id, ip_address, timestamp, created_at
            FROM audit_logs
            {where_sql}
            ORDER BY id DESC
            LIMIT %s OFFSET %s;
        """, tuple(args + [limit, offset]))
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            if r.get('timestamp'): r['timestamp'] = str(r['timestamp'])
            if r.get('created_at'): r['created_at'] = str(r['created_at'])

        return {
            "total": total,
            "logs": rows,
            "limit": limit,
            "offset": offset
        }


def add_audit_log(payload):
    """تسجيل حدث تدقيق جديد عبر واجهة المستخدم"""
    data = payload.get('data') or payload
    e_type = clean_str(data.get('entity_type') or 'USER_ACTION')
    e_id = clean_str(data.get('entity_id') or 'CLIENT')
    act = clean_str(data.get('action') or 'LOG')
    old_v = data.get('old_values')
    new_v = data.get('new_values')
    u_id = clean_str(data.get('user_id') or 'admin')
    ip = clean_str(data.get('ip_address') or '127.0.0.1')
    log_id = log_audit_event(e_type, e_id, act, old_v, new_v, u_id, ip)
    return {"id": log_id, "success": True}
