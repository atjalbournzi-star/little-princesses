# routes/auth_bp.py
# Authentication & User Management Flask Blueprint

from flask import Blueprint, request, jsonify
from domains.system.db_connection import get_db
from domains.auth.db_init import (
    verify_password,
    hash_password,
    ROLE_MAP,
    normalize_role,
    sync_users_to_gas_async,
)
import pg_service

auth_bp = Blueprint('auth_bp', __name__)


@auth_bp.route('/api/auth/login', methods=['POST'])
@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username') or '').strip()
    password = str(data.get('password') or '').strip()

    if not username or not password:
        return jsonify({'success': False, 'message': 'يرجى إدخال اسم المستخدم وكلمة المرور'}), 200

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, username, password_hash, role, full_name, is_active FROM users WHERE username=?", (username,))
    row = c.fetchone()
    conn.close()

    if not row:
        return jsonify({'success': False, 'message': 'اسم المستخدم غير مسجل في النظام'}), 200

    user_dict = dict(row)
    if not user_dict.get('is_active', 1):
        return jsonify({'success': False, 'message': 'هذا الحساب معطّل، يرجى مراجعة المدير العام'}), 200

    if not verify_password(password, user_dict.get('password_hash', '')):
        return jsonify({'success': False, 'message': 'كلمة المرور غير صحيحة'}), 200

    user_dict.pop('password_hash', None)
    user_dict['role_label'] = ROLE_MAP.get(user_dict['role'], user_dict['role'])
    token = f"erp_{user_dict['username']}_{user_dict['id']}_{user_dict['role']}"

    return jsonify({
        'success': True,
        'message': f'مرحباً بك {user_dict["full_name"] or user_dict["username"]} 👑',
        'user': user_dict,
        'token': token
    }), 200


@auth_bp.route('/api/auth/me', methods=['GET'])
def get_current_user():
    auth_header = request.headers.get('Authorization', '')
    username = None
    if auth_header.startswith('Bearer '):
        parts = auth_header.split(' ', 1)[1].split('_')
        if len(parts) >= 2:
            username = parts[1]

    conn = get_db()
    c = conn.cursor()
    user = None
    if username:
        c.execute("SELECT id, username, role, full_name, is_active, created_at FROM users WHERE username=? AND is_active=1", (username,))
        row = c.fetchone()
        if row:
            user = dict(row)
    if not user:
        c.execute("SELECT id, username, role, full_name, is_active, created_at FROM users WHERE is_active=1 ORDER BY id ASC LIMIT 1")
        row = c.fetchone()
        if row:
            user = dict(row)
    conn.close()

    if user:
        user['role_label'] = ROLE_MAP.get(user['role'], user['role'])
        return jsonify({'success': True, 'user': user}), 200
    return jsonify({'success': True, 'user': {'id': 1, 'username': 'admin', 'role': 'admin', 'full_name': 'المدير العام 👑', 'role_label': 'المدير العام', 'is_active': 1}}), 200


@auth_bp.route('/api/users', methods=['GET'])
@auth_bp.route('/api/users/list', methods=['GET'])
def list_users():
    try:
        users = pg_service.get_users_pg()
        if users:
            return jsonify({'success': True, 'data': users, 'users': users}), 200
    except Exception:
        pass

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id, username, role, full_name, is_active, created_at FROM users ORDER BY id ASC")
    users = []
    for r in c.fetchall():
        u = dict(r)
        u['role_label'] = ROLE_MAP.get(u['role'], u['role'])
        users.append(u)
    conn.close()
    return jsonify({'success': True, 'data': users, 'users': users}), 200


@auth_bp.route('/api/users/save', methods=['POST'])
@auth_bp.route('/api/users', methods=['POST'])
def save_user():
    data = request.get_json(silent=True) or {}
    user_id = data.get('id')
    username = str(data.get('username') or '').strip().lower()
    password = str(data.get('password') or '').strip()
    role = normalize_role(data.get('role') or 'data_entry')
    full_name = str(data.get('full_name') or username).strip()
    is_active = 1 if data.get('is_active', 1) in (1, True, '1', 'true') else 0

    if not username:
        return jsonify({'success': False, 'message': 'اسم المستخدم مطلوب'}), 200

    conn = get_db()
    c = conn.cursor()
    if user_id:
        if password:
            p_hash = hash_password(password)
            c.execute("UPDATE users SET username=?, password=?, password_hash=?, role=?, full_name=?, is_active=? WHERE id=?",
                      (username, password, p_hash, role, full_name, is_active, user_id))
        else:
            c.execute("UPDATE users SET username=?, role=?, full_name=?, is_active=? WHERE id=?",
                      (username, role, full_name, is_active, user_id))
    else:
        if not password:
            password = '1234'
        p_hash = hash_password(password)
        c.execute("INSERT INTO users (username, password, password_hash, role, full_name, is_active) VALUES (?, ?, ?, ?, ?, ?)",
                  (username, password, p_hash, role, full_name, is_active))
        user_id = c.lastrowid

    conn.commit()
    conn.close()
    sync_users_to_gas_async()

    return jsonify({
        'success': True,
        'message': f'تم حفظ بيانات المستخدم {full_name} بنجاح ومزامنته سحابياً 👑',
        'user_id': user_id
    }), 200


@auth_bp.route('/api/users/delete', methods=['POST'])
@auth_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id=None):
    if user_id is None:
        data = request.get_json(silent=True) or {}
        user_id = data.get('id')

    if not user_id:
        return jsonify({'success': False, 'message': 'معرف المستخدم غير محدد'}), 200

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT username FROM users WHERE id=?", (user_id,))
    row = c.fetchone()
    if row and row['username'] == 'admin':
        conn.close()
        return jsonify({'success': False, 'message': 'لا يمكن حذف حساب المدير العام الرئيسي (admin)'}), 200

    c.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    sync_users_to_gas_async()
    return jsonify({'success': True, 'message': 'تم حذف حساب المستخدم بنجاح'}), 200
