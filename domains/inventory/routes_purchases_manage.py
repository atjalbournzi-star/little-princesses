# domains/inventory/routes_purchases_manage.py
# Purchases list, purge, update, and delete HTTP routes

import json
from datetime import datetime
import pg_service
from domains.system.db_connection import get_db

def handle_get(handler, path, parsed_url) -> bool:
    if path in ('/api/purchases', '/api/purchases/list'):
        try:
            purchases = pg_service.get_purchases()
        except Exception:
            purchases = []
        handler.send_response(200)
        handler._send_cors_headers()
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({'success': True, 'data': purchases, 'count': len(purchases)}, ensure_ascii=False).encode('utf-8'))
        return True
    return False

def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/purchases/purge':
        try:
            conn = get_db()
            c = conn.cursor()
            c.execute("DELETE FROM purchase_items")
            c.execute("DELETE FROM purchases")
            conn.commit()
            conn.close()
            try:
                pg_service.purge_purchases()
            except Exception:
                pass
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم تصفير سجل المشتريات بنجاح'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path in ('/api/purchases/update',):
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            post_body = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            data = json.loads(post_body.decode('utf-8'))
            pur_id = data.get('id')
            bill_no = data.get('bill_no')
            supplier = data.get('supplier') or data.get('supplier_name') or ''
            supplier_phone = str(data.get('supplier_phone') or data.get('phone') or '').strip()
            discount = float(data.get('discount') or 0.0)
            notes = str(data.get('notes') or '').strip()
            item = str(data.get('item') or data.get('item_name') or '').strip()
            unit = str(data.get('unit') or 'متر').strip()
            qty = float(data.get('qty') or 0.0)
            price = float(data.get('price') or 0.0)
            total = float(data.get('total') or (qty * price))
            curr = str(data.get('currency') or 'YER')
            pay_type = str(data.get('pay_type') or 'نقدي')
            payment_source = str(data.get('payment_source') or '')
            transfer_no = str(data.get('transfer_no') or '')
            date_val = str(data.get('date') or datetime.now().strftime('%Y-%m-%d'))
            receipt_url = str(data.get('receipt_url') or '')
            invoice_image_url = str(data.get('invoice_image_url') or data.get('invoice_url') or data.get('bill_image_url') or '')

            conn = get_db()
            c = conn.cursor()
            c.execute('''
                UPDATE purchases SET
                    supplier = ?, supplier_phone = ?, discount = ?, notes = ?,
                    item = ?, unit = ?, qty = ?, price = ?, total = ?,
                    currency = ?, pay_type = ?, payment_source = ?, transfer_no = ?, date = ?,
                    receipt_url = CASE WHEN ? != '' THEN ? ELSE receipt_url END,
                    invoice_image_url = CASE WHEN ? != '' THEN ? ELSE invoice_image_url END
                WHERE id = ? OR bill_no = ?
            ''', (supplier, supplier_phone, discount, notes, item, unit, qty, price, total, curr, pay_type, payment_source, transfer_no, date_val, receipt_url, receipt_url, invoice_image_url, invoice_image_url, pur_id, bill_no))
            conn.commit()
            conn.close()

            try:
                pg_service.add_purchase({
                    'id': str(pur_id or bill_no),
                    'invoice_no': str(bill_no),
                    'bill_no': str(bill_no),
                    'supplier_name': supplier,
                    'supplier': supplier,
                    'supplier_phone': supplier_phone,
                    'invoice_date': date_val,
                    'date': date_val,
                    'item_name': item,
                    'unit': unit,
                    'quantity': qty,
                    'unit_price': price,
                    'original_amount': total,
                    'currency': curr,
                    'discount': discount,
                    'payment_method': pay_type,
                    'payment_source': payment_source,
                    'payment_account_code': payment_source,
                    'transaction_ref': transfer_no,
                    'receipt_attachment': receipt_url,
                    'invoice_attachment': invoice_image_url,
                    'notes': notes
                })
            except Exception as pge:
                print(f"[PG Service Update Purchase Error]: {pge}")

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم تحديث سجل المشتريات بنجاح'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    if path in ('/api/purchases/delete',):
        try:
            content_len = int(handler.headers.get('Content-Length', 0))
            post_body = handler.rfile.read(content_len) if content_len > 0 else b'{}'
            data = json.loads(post_body.decode('utf-8'))
            pur_id = data.get('id')
            bill_no = data.get('bill_no')

            conn = get_db()
            c = conn.cursor()
            if pur_id:
                c.execute("DELETE FROM purchases WHERE id = ? OR bill_no = ?", (pur_id, bill_no or pur_id))
            elif bill_no:
                c.execute("DELETE FROM purchases WHERE bill_no = ?", (bill_no,))
            
            if bill_no:
                c.execute("DELETE FROM vouchers WHERE voucher_no = ?", (f"PV-{bill_no}",))
                c.execute("DELETE FROM journal_entries WHERE ref_id = ? OR entry_no = ?", (bill_no, f"JV-PUR-{bill_no}"))

            conn.commit()
            conn.close()

            try:
                pg_service.delete_purchase({'id': str(pur_id or bill_no)})
            except Exception as pge:
                print(f"[PG Service Delete Purchase Warning]: {pge}")

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'message': 'تم حذف سجل المشتريات بنجاح'}).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
            return True

    return False
