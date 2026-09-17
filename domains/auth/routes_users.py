# domains/auth/routes_users.py
# User management CRUD POST HTTP routes

import json
from domains.system.db_connection import get_db
from domains.auth.db_init import (
    hash_password,
    normalize_role,
    sync_users_to_gas_async
)


def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/users/save':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            user_id = data.get('id')
            username = str(data.get('username') or '').strip().lower()
            password = str(data.get('password') or '').strip()
            role = normalize_role(data.get('role') or 'data_entry')
            full_name = str(data.get('full_name') or username).strip()
            is_active = 1 if data.get('is_active', 1) in (1, True, '1', 'true') else 0

            if not username:
                handler.send_response(200)
                handler._send_cors_headers()
                handler.send_header('Content-Type', 'application/json; charset=utf-8')
                handler.end_headers()
                handler.wfile.write(json.dumps({'success': False, 'message': 'اسم المستخدم مطلوب'}).encode('utf-8'))
                return True

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

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({
                'success': True,
                'message': f'تم حفظ بيانات المستخدم {full_name} بنجاح ومزامنته سحابياً 👑',
                'user_id': user_id
            }).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'message': f'خطأ أثناء الحفظ: {str(e)}'}).encode('utf-8'))
            return True

    if path == '/api/users/delete':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            user_id = data.get('id')
            if not user_id:
                handler.send_response(200)
                handler._send_cors_headers()
                handler.send_header('Content-Type', 'application/json; charset=utf-8')
                handler.end_headers()
                handler.wfile.write(json.dumps({'success': False, 'message': 'معرف المستخدم غير محدد'}).encode('utf-8'))
                return True

            conn = get_db()
            c = conn.cursor()
            c.execute("SELECT username, role FROM users WHERE id=?", (user_id,))
            row = c.fetchone()
            if row and row['username'] == 'admin':
                conn.close()
                handler.send_response(200)
                handler._send_cors_headers()
                handler.send_header('Content-Type', 'application/json; charset=utf-8')
                handler.end_headers()
                handler.wfile.write(json.dumps({'success': False, 'message': 'لا يمكن حذف حساب المدير العام الرئيسي (admin)'}).encode('utf-8'))
                return True

            c.execute("DELETE FROM users WHERE id=?", (user_id,))
            conn.commit()
            conn.close()

            sync_users_to_gas_async()

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم حذف المستخدم بنجاح'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'message': str(e)}).encode('utf-8'))
            return True

    if path == '/api/users/sync':
        try:
            sync_users_to_gas_async()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'جاري مزامنة بيانات المستخدمين مع Google Sheets'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'message': str(e)}).encode('utf-8'))
            return True

    return False
