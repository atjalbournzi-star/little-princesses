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
    if ctx_user and str(ctx_user).strip(): return str(ctx_user).strip()
    try:
        from flask import request, session, g, has_request_context
        if has_request_context():
            g_user = getattr(g, 'user_id', None) or getattr(g, 'user', None)
            if g_user and str(g_user).strip(): return str(g_user).strip()
            if session:
                for k in ['user_id', 'uid', 'username', 'user']:
                    if session.get(k) and str(session.get(k)).strip(): return str(session.get(k)).strip()
            for h in ['X-User-Id', 'X-Username', 'X-Current-User', 'X-User']:
                if request.headers.get(h) and request.headers.get(h).strip(): return request.headers.get(h).strip()
            auth = request.headers.get('Authorization', '')
            if auth.startswith('Bearer '):
                parts = auth.split(' ', 1)[1].split('_')
                if len(parts) >= 3 and parts[2]: return parts[2]
                elif len(parts) >= 2 and parts[1]: return parts[1]
            if request.args.get('user_id'): return request.args.get('user_id').strip()
            if request.is_json:
                data = request.get_json(silent=True) or {}
                nested = data.get('data') if isinstance(data.get('data'), dict) else {}
                for k in ['created_by', 'reversed_by', 'user_id', 'username', 'user', 'uid']:
                    val = data.get(k) or nested.get(k)
                    if val and str(val).strip(): return str(val).strip()
    except Exception: pass
    return default_user


def resolve_active_user_id(cur=None, user_hint=None):
    """جلب واستيثاق معرف المستخدم النشط ديناميكياً من قاعدة البيانات حصراً دون أي قيم ثابتة"""
    hint = clean_str(user_hint) if user_hint else get_active_user_context()
    def _fetch_active_uid(c):
        if hint:
            c.execute("SELECT id FROM users WHERE (id = %s OR username = %s) AND is_active = true LIMIT 1;", (hint, hint))
            row = c.fetchone()
            if row and row.get('id'): return str(row['id'])
        c.execute("SELECT id FROM users WHERE is_active = true ORDER BY (CASE WHEN role IN ('admin', 'accountant') THEN 1 ELSE 2 END), id ASC LIMIT 1;")
        fallback_row = c.fetchone()
        return str(fallback_row['id']) if fallback_row and fallback_row.get('id') else None
    if cur is not None: return _fetch_active_uid(cur)
    with get_db_cursor() as new_cur: return _fetch_active_uid(new_cur)


def _get_cached_user_info(c, user_id=None):
    cache = getattr(c, '_cached_user_info', None)
    if cache is None: c._cached_user_info = {}
    u_key = str(user_id or '')
    if u_key in c._cached_user_info: return c._cached_user_info[u_key]
    uid = resolve_active_user_id(c, user_id)
    uname = None
    if uid:
        try:
            c.execute("SELECT full_name, username FROM users WHERE id = %s LIMIT 1;", (uid,))
            u_row = c.fetchone()
            if u_row: uname = u_row.get('full_name') or u_row.get('username')
        except Exception: pass
    c._cached_user_info[u_key] = (uid, uname)
    return uid, uname


def log_audit_events_batch(events, cur=None, user_id=None, ip_address=None):
    """تسجيل مجموعة من أحداث التدقيق بجملة إدراج واحدة (Multi-row INSERT) لتوفير رحلات الشبكة"""
    if not events: return []
    client_ip = clean_str(ip_address or '127.0.0.1')
    def _do_batch(c):
        from psycopg2.extras import execute_values
        records = []
        for ev in events:
            uid, uname = _get_cached_user_info(c, ev.get('user_id') or user_id)
            records.append((
                clean_str(ev.get('entity_type') or 'SYSTEM'), str(ev.get('entity_id') or 'GENERAL'),
                clean_str(ev.get('action') or 'INFO').upper(),
                json.dumps(ev.get('old_values'), default=str, ensure_ascii=False) if ev.get('old_values') is not None else None,
                json.dumps(ev.get('new_values'), default=str, ensure_ascii=False) if ev.get('new_values') is not None else None,
                uid, uname, clean_str(ev.get('document_no')) if ev.get('document_no') else None,
                clean_str(ev.get('details')) if ev.get('details') else None, client_ip
            ))
        sql = """
            INSERT INTO audit_logs (
                entity_type, entity_id, action, old_values, new_values,
                user_id, user_name, document_no, details, ip_address, timestamp, created_at
            ) VALUES %s RETURNING id;
        """
        tmpl = "(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        res = execute_values(c, sql, records, template=tmpl, fetch=True)
        return [r['id'] if isinstance(r, dict) else r[0] for r in res] if res else []
    try:
        if cur is not None: return _do_batch(cur)
        with get_db_cursor(commit=True) as new_cur: return _do_batch(new_cur)
    except Exception as e:
        logger.error(f"❌ Batch audit error: {e}")
        return []


def flush_audit_events(cur):
    """تفريغ كافة أحداث التدقيق المجمعة في معاملة الحفظ بجملة إدراج مجمعة واحدة"""
    buf = getattr(cur, '_audit_buffer', None)
    if not buf: return []
    cur._audit_buffer = []
    return log_audit_events_batch(buf, cur=cur)


def log_audit_event(entity_type, entity_id=None, action=None, old_values=None, new_values=None,
                    user_id=None, ip_address=None, document_no=None, details=None, cur=None):
    """تسجيل حركة تدقيق أمني ورقابي مركزي في جدول audit_logs مع دعم التجميع الذري"""
    if isinstance(entity_type, list):
        return log_audit_events_batch(entity_type, cur=cur, user_id=user_id, ip_address=ip_address)

    if cur is not None and getattr(cur, '_audit_buffer', None) is not None:
        cur._audit_buffer.append({
            'entity_type': entity_type, 'entity_id': entity_id, 'action': action,
            'old_values': old_values, 'new_values': new_values, 'user_id': user_id,
            'ip_address': ip_address, 'document_no': document_no, 'details': details
        })
        return True

    client_ip = clean_str(ip_address or '127.0.0.1')
    def _execute_insert(c):
        uid, uname = _get_cached_user_info(c, user_id)
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
            uid, uname, clean_str(document_no) if document_no else None,
            clean_str(details) if details else None, client_ip
        ))
        res = c.fetchone()
        return res['id'] if res else None

    try:
        if cur is not None: return _execute_insert(cur)
        with get_db_cursor(commit=True) as new_cur: return _execute_insert(new_cur)
    except Exception as e:
        logger.error(f"❌ خطأ أثناء تسجيل حركة التدقيق (Audit Log): {e}")
        return None


def get_audit_logs(params=None):
    """استرجاع سجلات التدقيق مع الفلترة المتقدمة والترقيم والبحث بالرقم المرجعي والمستخدم"""
    p = (params.get('data') if isinstance(params, dict) and 'data' in params else params) or {}
    limit, offset = int(clean_num(p.get('limit') or 50)), int(clean_num(p.get('offset') or 0))
    e_type, action, search = clean_str(p.get('entity_type') or ''), clean_str(p.get('action') or ''), clean_str(p.get('search') or '')
    where_clauses, args = [], []
    if e_type: where_clauses.append("entity_type ILIKE %s"); args.append(f"%{e_type}%")
    if action: where_clauses.append("action ILIKE %s"); args.append(f"%{action}%")
    if search:
        where_clauses.append("(entity_id ILIKE %s OR user_id ILIKE %s OR user_name ILIKE %s OR document_no ILIKE %s OR action ILIKE %s OR details ILIKE %s)")
        args.extend([f"%{search}%"] * 6)
    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    with get_db_cursor() as cur:
        cur.execute(f"SELECT COUNT(*) as total FROM audit_logs {where_sql};", tuple(args))
        total = cur.fetchone()['total']
        cur.execute(f"SELECT id, entity_type, entity_id, action, old_values, new_values, user_id, user_name, document_no, details, ip_address, timestamp, created_at FROM audit_logs {where_sql} ORDER BY id DESC LIMIT %s OFFSET %s;", tuple(args + [limit, offset]))
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            for k in ('timestamp', 'created_at'): (r.get(k) and r.update({k: str(r[k])}))
        return {"total": total, "logs": rows, "limit": limit, "offset": offset}


def add_audit_log(payload):
    """تسجيل حدث تدقيق يدوي من الواجهة الأمامية"""
    d = payload.get('data') or payload
    log_id = log_audit_event(clean_str(d.get('entity_type') or 'USER_ACTION'), clean_str(d.get('entity_id') or 'CLIENT'),
                             clean_str(d.get('action') or 'LOG'), d.get('old_values'), d.get('new_values'),
                             clean_str(d.get('user_id') or d.get('username')), clean_str(d.get('ip_address') or '127.0.0.1'),
                             document_no=clean_str(d.get('document_no') or d.get('reference_no')), details=clean_str(d.get('details') or d.get('notes')))
    return {"id": log_id, "success": True}
