import http.server
import socketserver
import json
import sqlite3
import urllib.parse
import os
import sys
import io

# Force UTF-8 encoding for stdout on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PORT = 8000
DB_FILE = 'little_princesses.db'

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

class ERPRequestHandler(http.server.BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def _respond_json(self, data, code=200):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._send_cors_headers()
        self.end_headers()
        response_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.wfile.write(response_bytes)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed_url.query)
        action = params.get('action', [''])[0]

        try:
            if action == 'ping' or action == '':
                self._respond_json({
                    "status": "ok",
                    "app": "Little Princesses ERP Central API Server 👑",
                    "version": "16.0",
                    "database": DB_FILE
                })

            elif action == 'getDashboardStats' or action == 'getDashboard':
                conn = get_db()
                c = conn.cursor()
                
                c.execute("SELECT COUNT(*) FROM customers")
                total_customers = c.fetchone()[0]

                c.execute("SELECT COUNT(*), SUM(total_amount), SUM(paid_amount) FROM orders")
                row = c.fetchone()
                total_orders = row[0] or 0
                total_sales = row[1] or 0.0
                total_paid = row[2] or 0.0

                c.execute("SELECT COUNT(*) FROM inventory WHERE quantity_meters <= min_alert_qty")
                low_stock = c.fetchone()[0] or 0

                c.execute("SELECT COUNT(*) FROM orders WHERE status LIKE '%خياطة%' OR status LIKE '%انتظار%'")
                active_tailoring = c.fetchone()[0] or 0

                conn.close()

                self._respond_json({
                    "success": True,
                    "stats": {
                        "total_customers": total_customers,
                        "total_orders": total_orders,
                        "total_sales": total_sales,
                        "total_paid": total_paid,
                        "low_stock_alerts": low_stock,
                        "active_tailoring": active_tailoring
                    }
                })

            elif action == 'getCustomers':
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT * FROM customers ORDER BY id DESC")
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                self._respond_json({"success": True, "customers": rows, "data": rows})

            elif action == 'getOrders':
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT * FROM orders ORDER BY id DESC")
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                self._respond_json({"success": True, "orders": rows, "data": rows})

            elif action == 'getInventory':
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT * FROM inventory ORDER BY id DESC")
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                self._respond_json({"success": True, "inventory": rows, "data": rows})

            elif action == 'getVouchers':
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT * FROM vouchers ORDER BY id DESC")
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                self._respond_json({"success": True, "vouchers": rows, "data": rows})

            elif action == 'getAccounts':
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT * FROM accounts ORDER BY acc_code ASC")
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                self._respond_json({"success": True, "accounts": rows, "data": rows})

            elif action == 'getJournalEntries':
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT * FROM journal_entries ORDER BY id DESC")
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                self._respond_json({"success": True, "journal_entries": rows, "data": rows})

            elif action == 'getProducts':
                conn = get_db()
                c = conn.cursor()
                c.execute("SELECT * FROM products ORDER BY id DESC")
                rows = [dict(r) for r in c.fetchall()]
                conn.close()
                self._respond_json({"success": True, "products": rows, "data": rows})

            else:
                self._respond_json({"success": False, "error": f"Unknown action: {action}"}, 400)

        except Exception as e:
            self._respond_json({"success": False, "error": str(e)}, 500)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            payload = json.loads(post_data) if post_data else {}
        except Exception:
            payload = {}

        parsed_url = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed_url.query)
        action = payload.get('action') or params.get('action', [''])[0]

        try:
            conn = get_db()
            c = conn.cursor()

            if action == 'addCustomer':
                name = payload.get('name', '')
                phone = payload.get('phone', '')
                address = payload.get('address', '')
                notes = payload.get('sizes_notes', '')

                c.execute('''
                    INSERT INTO customers (name, phone, address, sizes_notes)
                    VALUES (?, ?, ?, ?)
                ''', (name, phone, address, notes))
                conn.commit()
                conn.close()
                self._respond_json({"success": True, "message": "تم إضافة العميل بنجاح ✨"})

            elif action == 'addOrder':
                order_no = payload.get('order_no', f"ORD-{int(os.times().system * 1000)}")
                customer_name = payload.get('customer_name', 'عميل جديد')
                product_name = payload.get('product_name', 'فستان خياطة')
                total_amount = float(payload.get('total_amount', 0))
                paid_amount = float(payload.get('paid_amount', 0))
                remaining = total_amount - paid_amount

                c.execute('''
                    INSERT INTO orders (order_no, customer_name, product_name, total_amount, paid_amount, remaining_amount)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (order_no, customer_name, product_name, total_amount, paid_amount, remaining))
                conn.commit()
                conn.close()
                self._respond_json({"success": True, "message": "تم إدخال الفاتورة/الطلب بنجاح 👗"})

            elif action == 'addVoucher':
                v_no = payload.get('voucher_no', f"V-{int(os.times().system * 1000)}")
                v_type = payload.get('voucher_type', 'قبض')
                party = payload.get('party_name', '')
                amount = float(payload.get('amount', 0))
                notes = payload.get('notes', '')

                c.execute('''
                    INSERT INTO vouchers (voucher_no, voucher_type, party_name, amount, notes)
                    VALUES (?, ?, ?, ?, ?)
                ''', (v_no, v_type, party, amount, notes))
                conn.commit()
                conn.close()
                self._respond_json({"success": True, "message": "تم إضافة السند بنجاح 📄"})

            else:
                conn.close()
                self._respond_json({"success": False, "error": f"Unsupported POST action: {action}"}, 400)

        except Exception as e:
            self._respond_json({"success": False, "error": str(e)}, 500)

class ThreadingSimpleServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    pass

if __name__ == '__main__':
    print(f"Little Princesses ERP API Server starting on http://localhost:{PORT}...")
    server = ThreadingSimpleServer(('0.0.0.0', PORT), ERPRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()
