# services/pg/pg_audit.py
# Comprehensive Audit Trail and Centralized Security Logger for Little Princesses ERP

import json
import logging
import threading
from .db_pool import get_db_cursor, clean_str, clean_num, logger

_active_user_store = threading.local()


def ensure_audit_logs_schema(cur):
    """التحقق من أعمدة وفهارس سجل التدقيق الشامل"""
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id BIGSERIAL PRIMARY KEY, entity_type VARCHAR(50) NOT NULL, entity_id VARCHAR(100) NOT NULL,
                action VARCHAR(50) NOT NULL, old_values JSONB, new_values JSONB, user_id VARCHAR(100),
                user_name VARCHAR(100), document_no VARCHAR(100), details TEXT, ip_address VARCHAR(45),
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS document_no VARCHAR(100), ADD COLUMN IF NOT EXISTS details TEXT, ADD COLUMN IF NOT EXISTS user_name VARCHAR(100);
            CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_doc_no ON audit_logs(document_no);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
        """)
    except Exception as e:
        logger.warning(f"⚠️ تنبيه أثناء فحص جدول سجل التدقيق: {e}")


def set_current_user_context(user_id):
    """تحديد المستخدم النشط للطلب في سياق الخيط الحالي"""
    _active_user_store.user = clean_str(user_id) if user_id else None


def get_current_user_context():
    """الحصول على المستخدم النشط من سياق الطلب الحالي"""
    return getattr(_active_user_store, 'user', None)


def get_active_user_context(default_user=None):
    """استخراج معرّف أو اسم المستخدم النشط من سياق الطلب الحالي ديناميكياً دون قيم ثابتة"""
    ctx_user = get_current_user_context()
    if ctx_user and str(ctx_user).strip():
        return str(ctx_user).strip()

    try:
        from flask import request, session, g, has_request_context
        if has_request_context():
            g_user = getattr(g, 'user_id', None) or getattr(g, 'user', None)
            if g_user and str(g_user).strip():
                return str(g_user).strip()

            if session:
                for k in ['user_id', 'uid', 'username', 'user']:
                    s_val = session.get(k)
                    if s_val and str(s_val).strip():
                        return str(s_val).strip()

            for h in ['X-User-Id', 'X-Username', 'X-Current-User', 'X-User']:
                val = request.headers.get(h)
                if val and val.strip():
                    return val.strip()

            auth = request.headers.get('Authorization', '')
            if auth.startswith('Bearer '):
                token = auth.split(' ', 1)[1]
                parts = token.split('_')
                if len(parts) >= 3 and parts[2]:
                    return parts[2]
                elif len(parts) >= 2 and parts[1]:
                    return parts[1]

            if request.args.get('user_id'):
                return request.args.get('user_id').strip()

            if request.is_json:
                data = request.get_json(silent=True) or {}
                nested = data.get('data') if isinstance(data.get('data'), dict) else {}
                for k in ['created_by', 'reversed_by', 'user_id', 'username', 'user', 'uid']:
                    val = data.get(k) or nested.get(k)
                    if val and str(val).strip():
                        return str(val).strip()
    except Exception:
        pass
    return default_user


def resolve_active_user_id(cur=None, user_hint=None):
    """جلب واستيثاق معرف المستخدم النشط ديناميكياً من قاعدة البيانات حصراً دون أي قيم ثابتة"""
    hint = clean_str(user_hint) if user_hint else get_active_user_context()

    def _fetch_active_uid(c):
        if hint:
            c.execute(
                "SELECT id FROM users WHERE (id = %s OR username = %s) AND is_active = true LIMIT 1;",
                (hint, hint)
            )
            row = c.fetchone()
            if row and row.get('id'):
                return str(row['id'])

        c.execute("""
            SELECT id FROM users
            WHERE is_active = true
            ORDER BY (CASE WHEN role IN ('admin', 'accountant') THEN 1 ELSE 2 END), id ASC
            LIMIT 1;
        """)
        fallback_row = c.fetchone()
        return str(fallback_row['id']) if fallback_row and fallback_row.get('id') else None

    if cur is not None:
        return _fetch_active_uid(cur)
    with get_db_cursor() as new_cur:
        return _fetch_active_uid(new_cur)


def log_audit_event(entity_type, entity_id, action, old_values=None, new_values=None,
                    user_id=None, ip_address=None, document_no=None, details=None, cur=None):
    """تسجيل حركة تدقيق أمني ورقابي مركزي في جدول audit_logs مع التوثيق التلقائي للمستخدم"""
    client_ip = clean_str(ip_address or '127.0.0.1')

    def _execute_insert(c):
        resolved_uid = resolve_active_user_id(c, user_id)
        resolved_uname = None
        if resolved_uid:
            try:
                c.execute("SELECT full_name, username FROM users WHERE id = %s LIMIT 1;", (resolved_uid,))
                u_row = c.fetchone()
                if u_row:
                    resolved_uname = u_row.get('full_name') or u_row.get('username')
            except Exception:
                pass

        ins_sql = """
            INSERT INTO audit_logs (
                entity_type, entity_id, action, old_values, new_values,
                user_id, user_name, document_no, details, ip_address, timestamp, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id;
        """
        c.execute(ins_sql, (
            clean_str(entity_type or 'SYSTEM'), str(entity_id or 'GENERAL'), clean_str(action or 'INFO').upper(),
            json.dumps(old_values, default=str, ensure_ascii=False) if old_values is not None else None,
            json.dumps(new_values, default=str, ensure_ascii=False) if new_values is not None else None,
            resolved_uid, resolved_uname, clean_str(document_no) if document_no else None,
            clean_str(details) if details else None, client_ip
        ))
        res = c.fetchone()
        return res['id'] if res else None

    try:
        if cur is not None:
            return _execute_insert(cur)
        with get_db_cursor(commit=True) as new_cur:
            return _execute_insert(new_cur)
    except Exception as e:
        logger.error(f"❌ خطأ أثناء تسجيل حركة التدقيق (Audit Log): {e}")
        return None


def get_audit_logs(params=None):
    """استرجاع سجلات التدقيق مع الفلترة المتقدمة والترقيم والبحث بالرقم المرجعي والمستخدم"""
    params = params or {}
    if isinstance(params, dict) and 'data' in params:
        params = params['data']
    limit = int(clean_num(params.get('limit') or 50))
    offset = int(clean_num(params.get('offset') or 0))
    entity_type = clean_str(params.get('entity_type') or '')
    action = clean_str(params.get('action') or '')
    search = clean_str(params.get('search') or '')

    where_clauses, args = [], []
    if entity_type:
        where_clauses.append("entity_type ILIKE %s"); args.append(f"%{entity_type}%")
    if action:
        where_clauses.append("action ILIKE %s"); args.append(f"%{action}%")
    if search:
        where_clauses.append("(entity_id ILIKE %s OR user_id ILIKE %s OR user_name ILIKE %s OR document_no ILIKE %s OR action ILIKE %s OR details ILIKE %s)")
        args.extend([f"%{search}%"] * 6)

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    with get_db_cursor() as cur:
        cur.execute(f"SELECT COUNT(*) as total FROM audit_logs {where_sql};", tuple(args))
        total = cur.fetchone()['total']
        cur.execute(f"""
            SELECT id, entity_type, entity_id, action, old_values, new_values,
                   user_id, user_name, document_no, details, ip_address, timestamp, created_at
            FROM audit_logs {where_sql} ORDER BY id DESC LIMIT %s OFFSET %s;
        """, tuple(args + [limit, offset]))
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            if r.get('timestamp'): r['timestamp'] = str(r['timestamp'])
            if r.get('created_at'): r['created_at'] = str(r['created_at'])
        return {"total": total, "logs": rows, "limit": limit, "offset": offset}


def add_audit_log(payload):
    """تسجيل حدث تدقيق يدوي من الواجهة الأمامية"""
    data = payload.get('data') or payload
    e_type = clean_str(data.get('entity_type') or 'USER_ACTION')
    e_id = clean_str(data.get('entity_id') or 'CLIENT')
    act = clean_str(data.get('action') or 'LOG')
    doc_no = clean_str(data.get('document_no') or data.get('reference_no'))
    details = clean_str(data.get('details') or data.get('notes'))
    old_v, new_v = data.get('old_values'), data.get('new_values')
    u_id = clean_str(data.get('user_id') or data.get('username'))
    ip = clean_str(data.get('ip_address') or '127.0.0.1')
    log_id = log_audit_event(e_type, e_id, act, old_v, new_v, u_id, ip, document_no=doc_no, details=details)
    return {"id": log_id, "success": True}
