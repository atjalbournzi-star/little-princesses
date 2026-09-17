# domains/inventory/routes_purchases.py
# Purchase invoice creation and inventory receipt HTTP route handler

import json
import time
from domains.system.db_connection import get_db
from domains.system.relational_db import log_audit, record_inventory_movement
import pg_service

def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/purchases', '/api/purchases/create') or (path == '/api/purchases' and handler.command == 'POST'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            conn = get_db()
            c = conn.cursor()
            now = time.strftime('%Y-%m-%d %H:%M:%S')
            today_iso = now[:10]
            
            bill_no = data.get('bill_no') or f"PUR-{int(time.time())}"
            supplier = data.get('supplier') or data.get('supplier_name') or 'مورد عام'
            supplier_phone = str(data.get('supplier_phone') or data.get('phone') or data.get('supplier_number') or '').strip()
            discount = float(data.get('discount') or data.get('discount_amount') or 0.0)
            notes_val = str(data.get('notes') or '').strip()
            currency = data.get('currency', 'YER ﷼')
            date_val = data.get('date', today_iso)
            pay_type = data.get('pay_type', 'نقدي')
            payment_source = data.get('payment_source') or '101 - الصندوق الرئيسي'
            transfer_no = data.get('transfer_no', '')
            freight_cost = float(data.get('freight_cost') or 0.0)
            transfer_fees = float(data.get('transfer_fees') or 0.0)
            receipt_url = data.get('receipt_url', '')
            invoice_image_url = data.get('invoice_image_url') or data.get('invoice_url') or data.get('bill_image_url') or ''
            created_by = data.get('created_by', 'system')

            items = data.get('items', [])
            if not items:
                items = [{
                    'item_name': data.get('item') or data.get('item_name') or data.get('fabric_name') or 'صنف مشتريات',
                    'unit': data.get('unit', 'متر'),
                    'qty': float(data.get('qty', 1.0)),
                    'cost': float(data.get('cost') or data.get('price') or 0.0)
                }]

            created_records = []
            total_items_amount = 0.0

            if bill_no:
                c.execute("SELECT id FROM purchases WHERE bill_no=?", (bill_no,))
                if c.fetchone():
                    conn.close()
                    handler.send_response(200)
                    handler._send_cors_headers()
                    handler.send_header('Content-Type', 'application/json; charset=utf-8')
                    handler.end_headers()
                    handler.wfile.write(json.dumps({'success': True, 'message': f'الفاتورة {bill_no} مسجلة مسبقاً'}, ensure_ascii=False).encode('utf-8'))
                    return True

            for idx_itm, itm in enumerate(items):
                itm_name = (itm.get('item_name') or itm.get('item') or '').strip()
                unit_val = itm.get('unit') or 'متر'
                qty = float(itm.get('qty', 1.0))
                unit_price = float(itm.get('cost') or itm.get('price') or 0.0)
                line_total = qty * unit_price
                total_items_amount += line_total

                c.execute('''
                    INSERT INTO purchases (bill_no, supplier, supplier_phone, discount, currency, pay_type, payment_source, date, transfer_no, freight_cost, transfer_fees, receipt_url, invoice_image_url, item, unit, qty, price, total, payment_status, status, notes, created_at, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    bill_no, supplier, supplier_phone, discount if idx_itm == 0 else 0.0, currency, pay_type, payment_source, date_val, transfer_no, freight_cost, transfer_fees, receipt_url, invoice_image_url, itm_name, unit_val, qty, unit_price, line_total, 'مدفوع' if pay_type != 'آجل' else 'غير مدفوع', 'تم الاستلام', notes_val, now, created_by
                ))
                pur_row_id = c.lastrowid

                c.execute("SELECT id, quantity_meters, cost_per_meter FROM inventory WHERE item_name=?", (itm_name,))
                inv_row = c.fetchone()
                if inv_row:
                    curr_qty = float(inv_row['quantity_meters'] or 0.0)
                    curr_cost = float(inv_row['cost_per_meter'] or 0.0)
                    new_qty = curr_qty + qty
                    new_weighted_cost = ((curr_qty * curr_cost) + (qty * unit_price)) / new_qty if new_qty > 0 else unit_price
                    new_weighted_cost = round(new_weighted_cost, 2)
                    
                    c.execute("UPDATE inventory SET quantity_meters=?, cost_per_meter=?, currency=? WHERE id=?", 
                              (new_qty, new_weighted_cost, currency, inv_row['id']))
                    inv_id = str(inv_row['id'])
                else:
                    c.execute('''
                        INSERT INTO inventory (item_name, category, quantity_meters, cost_per_meter, min_alert_qty, currency, supply_date, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (itm_name, 'أقمشة وخامات', qty, unit_price, 5.0, currency, date_val, f"مورد: {supplier}"))
                    inv_id = str(c.lastrowid)

                record_inventory_movement(
                    conn,
                    fabric_id=f"FAB-{inv_id}",
                    txn_type='PURCHASE_RECEIPT',
                    qty=qty,
                    unit_cost=unit_price,
                    ref_type='PURCHASE',
                    ref_id=str(bill_no),
                    notes=f"توريد مخزون من فاتورة شراء {bill_no} - المورد: {supplier}",
                    created_by=created_by
                )

                try:
                    c.execute("UPDATE bom SET qty_needed=qty_needed WHERE inventory_item_name=?", (itm_name,))
                except Exception:
                    pass

                created_records.append({
                    'id': pur_row_id,
                    'bill_no': bill_no,
                    'supplier': supplier,
                    'item': itm_name,
                    'unit': unit_val,
                    'qty': qty,
                    'price': unit_price,
                    'total': line_total,
                    'currency': currency,
                    'date': date_val,
                    'pay_type': pay_type,
                    'payment_source': payment_source,
                    'transfer_no': transfer_no,
                    'freight_cost': freight_cost,
                    'transfer_fees': transfer_fees,
                    'receipt_url': receipt_url
                })

            grand_invoice_total = max(0.0, (total_items_amount + freight_cost + transfer_fees) - discount)

            if pay_type != 'آجل':
                try:
                    acc_code = payment_source.split(' - ')[0] if ' - ' in payment_source else payment_source
                    c.execute("UPDATE accounts SET current_balance = current_balance - ? WHERE code = ? OR id = ? OR account_code = ?", 
                              (grand_invoice_total, acc_code, acc_code, acc_code))
                except Exception as ae:
                    print(f"[Accounts balance update warning]: {ae}")

                voucher_no = f"PV-{bill_no}"
                c.execute('''
                    INSERT OR IGNORE INTO vouchers (voucher_no, voucher_type, pay_method, transfer_no, image_path, party_name, amount, currency, date_created, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    voucher_no, 'سند صرف', pay_type, transfer_no, receipt_url, supplier, grand_invoice_total, currency, date_val, f"سند صرف فاتورة مشتريات {bill_no} - {supplier}"
                ))
                
                try:
                    c.execute('''
                        INSERT OR IGNORE INTO payments (id, payment_no, supplier_id, payment_type, amount, currency, payment_method, reference_no, account_id, date, status, notes, created_at, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        f"PAY-{voucher_no}", voucher_no, supplier, 'سند صرف', grand_invoice_total, currency, pay_type, transfer_no or bill_no, payment_source, date_val, 'posted', f"سند صرف فاتورة مشتريات {bill_no}", now, created_by
                    ))
                except Exception:
                    pass
            else:
                try:
                    c.execute("UPDATE accounts SET current_balance = current_balance + ? WHERE code IN ('201', '2101') OR account_code IN ('201', '2101')", 
                              (grand_invoice_total,))
                except Exception as ae:
                    print(f"[Accounts balance update warning]: {ae}")

            inv_acc_code = '105' if any(w in str(data.get('category') or '') or w in str(items[0].get('name') if items else '') for w in ['معدات', 'آلات', 'ماكينة', 'ماكينات', 'أصول ثابتة']) else '102'
            inv_acc_name = "الأصول الثابتة (آلات ومعدات)" if inv_acc_code == '105' else "مخزون الأقمشة والمستلزمات"

            try:
                c.execute("UPDATE accounts SET current_balance = current_balance + ?, balance = balance + ? WHERE code = ? OR account_code = ?", 
                          (total_items_amount, total_items_amount, inv_acc_code, inv_acc_code))
            except Exception as ae:
                print(f"[Inventory balance update warning]: {ae}")

            jv_no = f"JV-PUR-{bill_no}"
            debit_acc = f"{inv_acc_code} - {inv_acc_name}"
            credit_acc = payment_source if pay_type != 'آجل' else "201 - ذمم الموردين ومحلات الأقمشة (آجل)"

            c.execute('''
                INSERT OR IGNORE INTO journal_entries (entry_no, debit, credit, amount, currency, ref_type, date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                jv_no, debit_acc, credit_acc, grand_invoice_total, currency, 'PURCHASE', date_val, f"قيد مشتريات الفاتورة {bill_no} - المورد: {supplier}"
            ))

            log_audit(conn, 'purchase_invoice', str(bill_no), 'CREATE', None, data, created_by)
            conn.commit()
            conn.close()

            try:
                pg_purchase_data = dict(data)
                pg_purchase_data['bill_no'] = bill_no
                pg_purchase_data['invoice_no'] = bill_no
                pg_purchase_data['supplier_name'] = supplier
                pg_purchase_data['supplier_phone'] = supplier_phone
                pg_purchase_data['invoice_date'] = date_val
                pg_purchase_data['payment_method'] = pay_type
                pg_purchase_data['payment_account_code'] = payment_source
                pg_purchase_data['transaction_ref'] = transfer_no
                pg_purchase_data['receipt_attachment'] = receipt_url
                pg_purchase_data['invoice_attachment'] = invoice_image_url
                pg_purchase_data['shipping_cost'] = freight_cost
                pg_purchase_data['transfer_fee'] = transfer_fees
                pg_purchase_data['discount'] = discount
                pg_purchase_data['items'] = items
                pg_service.add_purchase(pg_purchase_data)
            except Exception as pge:
                print(f"[PG Service Add Purchase Error]: {pge}")

            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({
                'success': True,
                'bill_no': bill_no,
                'count': len(created_records),
                'total_items': total_items_amount,
                'grand_total': grand_invoice_total,
                'voucher_no': f"PV-{bill_no}" if pay_type != 'آجل' else None,
                'journal_no': jv_no,
                'message': f'✅ تم حفظ الفاتورة {bill_no} وتوريد الأصناف للمخزون وترحيل القيود وسندات الصرف بنجاح'
            }, ensure_ascii=False).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8'))
            return True

    return False
