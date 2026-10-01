# domains/customers/routes.py
# Customers and CRM HTTP route handlers

import json
import time
import threading
import pg_service
from domains.system.db_connection import get_db
from domains.system.relational_db import get_next_sequence_id, log_audit

def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/customers', '/api/customers/list', '/api/crm/customers'):
        try:
            customers = pg_service.get_customers()
        except Exception:
            customers = []
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': customers, 'count': len(customers)}, ensure_ascii=False).encode('utf-8'))
        return True
    return False

def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/customers/create', '/api/customers/update') or (path == '/api/customers' and handler.command == 'POST'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            conn = get_db()
            cust_id = data.get('id') or get_next_sequence_id(conn, 'customers', 'CUST')
            c = conn.cursor()
            now = time.strftime('%Y-%m-%d %H:%M:%S')

            c.execute("SELECT id FROM customers WHERE id=?", (cust_id,))
            exists = c.fetchone()
            if exists:
                c.execute('''
                    UPDATE customers SET
                        customer_name = COALESCE(NULLIF(?, ''), customer_name),
                        name = COALESCE(NULLIF(?, ''), name),
                        phone = COALESCE(NULLIF(?, ''), phone),
                        phone_alt = COALESCE(NULLIF(?, ''), phone_alt),
                        platform = COALESCE(NULLIF(?, ''), platform),
                        handle = COALESCE(NULLIF(?, ''), handle),
                        category = COALESCE(NULLIF(?, ''), category),
                        city = COALESCE(NULLIF(?, ''), city),
                        street = COALESCE(NULLIF(?, ''), street),
                        notes = COALESCE(NULLIF(?, ''), notes),
                        status = COALESCE(NULLIF(?, ''), status),
                        updated_at = ?
                    WHERE id = ?
                ''', (
                    data.get('name') or data.get('customer_name') or '',
                    data.get('name') or data.get('customer_name') or '',
                    data.get('phone', ''),
                    data.get('phone_alt', ''),
                    data.get('platform', ''),
                    data.get('handle', ''),
                    data.get('category', ''),
                    data.get('city', ''),
                    data.get('street', ''),
                    data.get('notes', ''),
                    data.get('status', ''),
                    now,
                    cust_id
                ))
                log_audit(conn, 'customer', cust_id, 'UPDATE', None, data, data.get('updated_by'))
            else:
                c.execute('''
                    INSERT INTO customers (id, customer_name, name, phone, phone_alt, platform, handle, category, city, street, children_count, notes, status, created_at, updated_at, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    cust_id,
                    data.get('name') or data.get('customer_name') or '',
                    data.get('name') or data.get('customer_name') or '',
                    data.get('phone', ''),
                    data.get('phone_alt', ''),
                    data.get('platform', 'مباشر'),
                    data.get('handle', ''),
                    data.get('category', 'VIP'),
                    data.get('city', 'صنعاء'),
                    data.get('street', ''),
                    int(data.get('children_count', 1)),
                    data.get('notes', ''),
                    data.get('status', 'active'),
                    now, now,
                    data.get('created_by', 'system')
                ))
                log_audit(conn, 'customer', cust_id, 'CREATE', None, data, data.get('created_by'))

            # Handle measurement profiles & children
            meas_list = data.get('measurements', [])
            for m in meas_list:
                meas_id = m.get('id') or get_next_sequence_id(conn, 'measurement_profiles', 'MEAS')
                child_id = m.get('child_id') or get_next_sequence_id(conn, 'children', 'CHLD')
                c.execute('''
                    INSERT INTO children (id, customer_id, child_name, notes, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (child_id, cust_id, m.get('child_name') or m.get('name') or '', m.get('notes', ''), now, now))
                c.execute('''
                    INSERT INTO measurement_profiles (
                        id, customer_id, child_id, child_name, meas_date, unit, total_len, dress_len,
                        chest_len, skirt_len, sleeve_len, chest_circ, waist_circ, shoulder_w, armpit_circ,
                        neck_circ, model_name, model_img, comfort_profile, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    meas_id, cust_id, child_id, m.get('child_name') or m.get('name') or '',
                    m.get('date', now[:10]), m.get('unit', 'cm'),
                    str(m.get('total_length', '')), str(m.get('dress_length', '')),
                    str(m.get('chest_length', '')), str(m.get('skirt_length', '')),
                    str(m.get('sleeve_length', '')), str(m.get('chest_circ', '')),
                    str(m.get('waist_circ', '')), str(m.get('shoulder_width', '')),
                    str(m.get('armpit_circ', '')), str(m.get('neck_circ', '')),
                    m.get('model_name', ''), m.get('model_image', ''),
                    m.get('comfort_profile', ''), m.get('notes', ''), now, now
                ))

            conn.commit()
            conn.close()

            # Sync to PostgreSQL in background
            def _sync_cust_pg():
                try:
                    pg_service.add_customer({'id': cust_id, **data})
                except Exception as e:
                    print(f"[PG Customer Sync Error]: {e}")
            threading.Thread(target=_sync_cust_pg, daemon=True).start()

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'id': cust_id, 'message': 'تم حفظ العميلة بنجاح'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path in ('/api/crm/customers', '/api/customers') and handler.command == 'POST':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            data = {}
        try:
            res = pg_service.add_customer(data)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'data': res, 'customer': res}, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            try:
                handler.send_response(500)
                handler._send_cors_headers()
                handler.send_header('Content-Type', 'application/json; charset=utf-8')
                handler.end_headers()
                handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            except Exception:
                pass
        return True

    if path in ('/api/crm/customers/delete', '/api/customers/delete') and handler.command == 'POST':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8')) if post_data else {}
            cid = data.get('customer_id') or data.get('id')
            if not cid:
                raise ValueError("معرف العميل مطلوب للحذف")
            try:
                conn = get_db()
                cur = conn.cursor()
                cur.execute("DELETE FROM measurement_profiles WHERE customer_id = ?", (cid,))
                cur.execute("DELETE FROM children WHERE customer_id = ?", (cid,))
                cur.execute("DELETE FROM customers WHERE id = ?", (cid,))
                log_audit(conn, 'customer', cid, 'DELETE', None, {'id': cid}, data.get('deleted_by', 'system'))
                conn.commit()
                conn.close()
            except Exception as e_sql:
                print(f"[SQLite Delete Customer Fallback]: {e_sql}")

            try:
                pg_service.delete_customer({'customer_id': cid, 'id': cid})
            except Exception as e_pg:
                print(f"[PG Delete Customer Fallback]: {e_pg}")

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'id': cid, 'message': 'تم حذف بيانات العميل بنجاح'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    return False
