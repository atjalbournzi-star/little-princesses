# domains/auth/routes.py
# User authentication and session HTTP routes

import json
from domains.system.db_connection import get_db
from domains.auth.db_init import (
    verify_password,
    ROLE_MAP,
)


def handle_get(handler, path, parsed_url) -> bool:
    if path == '/api/auth/me':
        auth_header = handler.headers.get('Authorization', '')
        username = None
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]
            parts = token.split('_')
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
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'user': user}).encode('utf-8'))
        else:
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'user': {'id': 1, 'username': 'admin', 'role': 'admin', 'full_name': 'المدير العام 👑', 'role_label': 'المدير العام', 'is_active': 1}}).encode('utf-8'))
        return True

    if path in ('/api/users', '/api/users/list'):
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT id, username, password, role, full_name, is_active, created_at FROM users ORDER BY id ASC")
        users = []
        for r in c.fetchall():
            u = dict(r)
            u['role_label'] = ROLE_MAP.get(u['role'], u['role'])
            users.append(u)
        conn.close()
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': users, 'users': users}).encode('utf-8'))
        return True

    return False


def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/auth/login':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            username = str(data.get('username') or '').strip()
            password = str(data.get('password') or '').strip()

            if not username or not password:
                handler.send_response(200)
                handler._send_cors_headers()
                handler.send_header('Content-Type', 'application/json; charset=utf-8')
                handler.end_headers()
                handler.wfile.write(json.dumps({'success': False, 'message': 'يرجى إدخال اسم المستخدم وكلمة المرور'}).encode('utf-8'))
                return True

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT id, username, password_hash, role, full_name, is_active FROM users WHERE username=?", (username,))
            row = c.fetchone()
            conn.close()

            if not row:
                handler.send_response(200)
                handler._send_cors_headers()
                handler.send_header('Content-Type', 'application/json; charset=utf-8')
                handler.end_headers()
                handler.wfile.write(json.dumps({'success': False, 'message': 'اسم المستخدم غير مسجل في النظام'}).encode('utf-8'))
                return True

            user_dict = dict(row)
            if not user_dict.get('is_active', 1):
                handler.send_response(200)
                handler._send_cors_headers()
                handler.send_header('Content-Type', 'application/json; charset=utf-8')
                handler.end_headers()
                handler.wfile.write(json.dumps({'success': False, 'message': 'هذا الحساب معطّل، يرجى مراجعة المدير العام'}).encode('utf-8'))
                return True

            if not verify_password(password, user_dict.get('password_hash', '')):
                handler.send_response(200)
                handler._send_cors_headers()
                handler.send_header('Content-Type', 'application/json; charset=utf-8')
                handler.end_headers()
                handler.wfile.write(json.dumps({'success': False, 'message': 'كلمة المرور غير صحيحة'}).encode('utf-8'))
                return True

            del user_dict['password_hash']
            user_dict['role_label'] = ROLE_MAP.get(user_dict['role'], user_dict['role'])
            token = f"erp_{user_dict['username']}_{user_dict['id']}_{user_dict['role']}"

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({
                'success': True,
                'message': f'مرحباً بك {user_dict["full_name"] or user_dict["username"]} 👑',
                'user': user_dict,
                'token': token
            }).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'message': str(e)}).encode('utf-8'))
            return True

    return False
