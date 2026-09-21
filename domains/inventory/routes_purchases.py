# domains/inventory/routes_purchases.py
# Purchase invoice creation and inventory receipt HTTP route handler
# Powered directly by PostgreSQL service layer (pg_service)

import json
import time
import pg_service


def handle_post(handler, path, parsed_url) -> bool:
    if path in ('/api/purchases', '/api/purchases/create') or (path == '/api/purchases' and handler.command == 'POST'):
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            data = json.loads(post_data.decode('utf-8'))
            
            # استخراج وتوحيد بيانات الفاتورة
            bill_no = data.get('bill_no') or data.get('invoice_no') or f"PUR-{int(time.time())}"
            supplier_id = data.get('supplier_id') or ''
            supplier = data.get('supplier') or data.get('supplier_name') or ''
            supplier_phone = str(data.get('supplier_phone') or data.get('phone') or data.get('supplier_number') or '').strip()
            discount = float(data.get('discount') or data.get('discount_amount') or 0.0)
            notes_val = str(data.get('notes') or '').strip()
            currency = data.get('currency', 'YER')
            date_val = data.get('date') or data.get('invoice_date') or time.strftime('%Y-%m-%d')
            pay_type = data.get('pay_type') or data.get('payment_method') or 'نقدي'
            payment_source = data.get('payment_source') or data.get('payment_account_code') or '101.1 - صندوق الريال اليمني'
            transfer_no = data.get('transfer_no') or data.get('transaction_ref') or ''
            freight_cost = float(data.get('freight_cost') or data.get('shipping_cost') or 0.0)
            transfer_fees = float(data.get('transfer_fees') or data.get('transfer_fee') or 0.0)
            receipt_url = data.get('receipt_url') or data.get('receipt_attachment') or ''
            invoice_image_url = data.get('invoice_image_url') or data.get('invoice_attachment') or data.get('invoice_url') or ''
            created_by = data.get('created_by', 'admin')

            items = data.get('items', [])
            if not items:
                items = [{
                    'item_name': data.get('item') or data.get('item_name') or data.get('fabric_name') or 'صنف مشتريات',
                    'unit': data.get('unit', 'متر'),
                    'qty': float(data.get('qty', 1.0)),
                    'cost': float(data.get('cost') or data.get('price') or data.get('unit_price') or 0.0)
                }]

            # تجهيز حمولة PostgreSQL المتكاملة
            pg_payload = {
                'bill_no': bill_no,
                'invoice_no': bill_no,
                'supplier_id': supplier_id,
                'supplier': supplier,
                'supplier_name': supplier,
                'supplier_phone': supplier_phone,
                'discount': discount,
                'currency': currency,
                'date': date_val,
                'invoice_date': date_val,
                'pay_type': pay_type,
                'payment_method': pay_type,
                'payment_source': payment_source,
                'payment_account_code': payment_source,
                'transfer_no': transfer_no,
                'transaction_ref': transfer_no,
                'freight_cost': freight_cost,
                'shipping_cost': freight_cost,
                'transfer_fees': transfer_fees,
                'transfer_fee': transfer_fees,
                'receipt_url': receipt_url,
                'receipt_attachment': receipt_url,
                'invoice_image_url': invoice_image_url,
                'invoice_attachment': invoice_image_url,
                'notes': notes_val,
                'created_by': created_by,
                'items': items
            }

            # تنفيذ المعاملة المركزية مباشرة عبر خدمة PostgreSQL
            res = pg_service.add_purchase(pg_payload)

            clean_ref = str(res.get('id', ''))[4:] if str(res.get('id', '')).startswith('PUR-') else str(res.get('id', ''))
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({
                'success': True,
                'bill_no': res.get('invoice_no') or bill_no,
                'id': res.get('id'),
                'data': res,
                'voucher_no': f"PAY-{clean_ref}" if pay_type != 'آجل' else None,
                'journal_no': f"JV-PUR-{clean_ref}",
                'message': f"✅ تم حفظ الفاتورة {bill_no} وتوريد الأصناف للمخزون وترحيل القيود وسندات الصرف بنجاح"
            }, ensure_ascii=False, default=str).encode('utf-8'))
            return True
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}, ensure_ascii=False).encode('utf-8'))
            return True

    return False
