# routes/auth_bp.py
# Authentication & User Management Flask Blueprint
# Architectural Standards: Strictly < 220 lines per file

from flask import Blueprint, request, jsonify
from db_client import get_db_cursor
from domains.system.db_connection import get_db
from domains.auth.db_init import (
    verify_password,
    hash_password,
    is_legacy_password_hash,
    ROLE_MAP,
    normalize_role,
)
from services.security import (
    generate_auth_token,
    resolve_request_user,
    require_roles,
    ROLE_ADMIN,
    translate_shield_error,
)
from services.pg.pg_audit import log_audit_event
import pg_service

auth_bp = Blueprint('auth_bp', __name__)


def _upgrade_sqlite_hash(username, new_hash):
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute("PRAGMA table_info(users)")
        cols = {r[1] for r in c.fetchall()}
        if 'password' in cols:
            c.execute("UPDATE users SET password_hash=?, password='' WHERE username=?", (new_hash, username))
        else:
            c.execute("UPDATE users SET password_hash=? WHERE username=?", (new_hash, username))
        conn.commit()
        conn.close()
    except Exception:
        pass


@auth_bp.route('/api/auth/login', methods=['POST'])
@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username') or '').strip()
    password = str(data.get('password') or '').strip()
    ip_addr = request.remote_addr or '127.0.0.1'

    if not username or not password:
        return jsonify({'success': False, 'message': 'يرجى إدخال اسم المستخدم وكلمة المرور'}), 400

    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute(
                "SELECT id, username, password_hash, role, full_name, is_active FROM public.users WHERE LOWER(username) = LOWER(%s) LIMIT 1;",
                (username,)
            )
            row = cur.fetchone()
            if not row:
                log_audit_event('AUTH', username, 'LOGIN_FAILED', details='محاولة دخول باسم مستخدم غير مسجل', ip_address=ip_addr, cur=cur)
                return jsonify({'success': False, 'message': 'بيانات الدخول غير صحيحة'}), 401

            user_dict = dict(row)
            if not user_dict.get('is_active'):
                log_audit_event('AUTH', user_dict['id'], 'LOGIN_BLOCKED', details='محاولة دخول لحساب معطّل', ip_address=ip_addr, cur=cur)
                return jsonify({'success': False, 'message': 'هذا الحساب معطّل، يرجى مراجعة المدير العام'}), 403

            stored_hash = user_dict.get('password_hash') or ''
            if not verify_password(password, stored_hash):
                log_audit_event('AUTH', user_dict['id'], 'LOGIN_FAILED', details='كلمة مرور غير صحيحة', ip_address=ip_addr, cur=cur)
                return jsonify({'success': False, 'message': 'بيانات الدخول غير صحيحة'}), 401

            if is_legacy_password_hash(stored_hash):
                upgraded = hash_password(password)
                cur.execute("UPDATE public.users SET password_hash = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (upgraded, user_dict['id']))
                _upgrade_sqlite_hash(user_dict['username'], upgraded)

            user_dict.pop('password_hash', None)
            user_dict['role'] = normalize_role(user_dict.get('role'))
            user_dict['role_label'] = ROLE_MAP.get(user_dict['role'], user_dict['role'])
            token = generate_auth_token(user_dict)

            log_audit_event('AUTH', user_dict['id'], 'LOGIN_SUCCESS', user_id=user_dict['id'], ip_address=ip_addr, details=f"تسجيل دخول ناجح للمستخدم {user_dict['username']}", cur=cur)
            return jsonify({
                'success': True,
                'message': f'مرحباً بك {user_dict["full_name"] or user_dict["username"]} 👑',
                'user': user_dict,
                'token': token
            }), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@auth_bp.route('/api/auth/me', methods=['GET'])
def get_current_user():
    user = resolve_request_user(request)
    if not user:
        return jsonify({'success': False, 'error': 'غير مصرح، يرجى تسجيل الدخول', 'message': 'غير مصرح، يرجى تسجيل الدخول'}), 401
    return jsonify({'success': True, 'user': user}), 200


@auth_bp.route('/api/users', methods=['GET'])
@auth_bp.route('/api/users/list', methods=['GET'])
@require_roles(ROLE_ADMIN)
def list_users():
    try:
        users = pg_service.get_users_pg() or []
        for u in users:
            u['role'] = normalize_role(u.get('role'))
            u['role_label'] = ROLE_MAP.get(u['role'], u['role'])
        return jsonify({'success': True, 'data': users, 'users': users}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@auth_bp.route('/api/users/save', methods=['POST'])
@auth_bp.route('/api/users', methods=['POST'])
@require_roles(ROLE_ADMIN)
def save_user():
    data = request.get_json(silent=True) or {}
    user_id = str(data.get('id') or '').strip() or None
    username = str(data.get('username') or '').strip().lower()
    password = str(data.get('password') or '').strip()
    role = normalize_role(data.get('role') or 'data_entry')
    full_name = str(data.get('full_name') or username).strip()
    is_active = data.get('is_active', True) in (1, True, '1', 'true', 'True')

    if not username:
        return jsonify({'success': False, 'message': 'اسم المستخدم مطلوب'}), 400
    if not user_id and not password:
        return jsonify({'success': False, 'message': 'كلمة المرور مطلوبة عند إنشاء مستخدم جديد'}), 400

    try:
        payload = {
            'id': user_id,
            'username': username,
            'role': role,
            'full_name': full_name,
            'is_active': is_active,
        }
        if password:
            payload['password_hash'] = hash_password(password)
        saved = pg_service.sync_user_to_pg(payload)
        actor = getattr(request, 'active_user', {}) or {}
        log_audit_event('USERS', saved.get('id') or username, 'UPDATE' if user_id else 'INSERT', user_id=actor.get('id'), new_values={'username': username, 'role': role, 'is_active': is_active}, details=f"حفظ بيانات المستخدم {username}")
        return jsonify({'success': True, 'message': f'تم حفظ بيانات المستخدم {full_name} بنجاح 👑', 'user_id': saved.get('id'), 'user': saved}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code


@auth_bp.route('/api/users/delete', methods=['POST'])
@auth_bp.route('/api/users/<user_id>', methods=['DELETE'])
@require_roles(ROLE_ADMIN)
def delete_user(user_id=None):
    if user_id is None:
        data = request.get_json(silent=True) or {}
        user_id = str(data.get('id') or '').strip()
    if not user_id:
        return jsonify({'success': False, 'message': 'معرف المستخدم غير محدد'}), 400

    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("SELECT id, username FROM public.users WHERE id = %s LIMIT 1;", (str(user_id),))
            row = cur.fetchone()
            if not row:
                return jsonify({'success': False, 'message': 'المستخدم غير موجود'}), 404
            if str(row['username']).lower() == 'admin':
                return jsonify({'success': False, 'message': 'لا يمكن تعطيل حساب المدير العام الرئيسي (admin)'}), 400
            cur.execute("UPDATE public.users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (row['id'],))
            actor = getattr(request, 'active_user', {}) or {}
            log_audit_event('USERS', row['id'], 'DEACTIVATE', user_id=actor.get('id'), details=f"تعطيل حساب المستخدم {row['username']}", cur=cur)
        return jsonify({'success': True, 'message': 'تم تعطيل حساب المستخدم بنجاح مع الحفاظ على سجل التدقيق'}), 200
    except Exception as e:
        code, msg = translate_shield_error(e)
        return jsonify({'success': False, 'error': msg, 'message': msg}), code
