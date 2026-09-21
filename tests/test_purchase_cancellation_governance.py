# tests/test_purchase_cancellation_governance.py
# Verification suite for Purchase Cancellation, Phantom ID Handling, and Financial Governance

import unittest
import json
import time
import os
import sys
import urllib.request
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pg_service


class TestPurchaseCancellationGovernance(unittest.TestCase):

    def test_01_cancel_phantom_or_client_only_record(self):
        """Test cancelling a record that only existed in client state (e.g. PUR-1789917797945-0).
        Must return success: True without throwing an exception or blocking the UI.
        """
        phantom_id = "PUR-1789917797945-0"
        res = pg_service.cancel_purchase({'id': phantom_id, 'bill_no': '', 'invoice_no': ''})
        self.assertTrue(res.get('success'), f"Expected success: True for phantom record, got: {res}")
        self.assertTrue(res.get('not_in_db'), f"Expected not_in_db: True for phantom record, got: {res}")

    def test_02_cancel_real_purchase_invoice_with_full_governance(self):
        """Test creating a real purchase with items and payments, then cancelling it.
        Verifies:
        1. No Hard Delete on purchase record (status -> Cancelled).
        2. Inventory reversal transaction recorded.
        3. Payment status marked as Cancelled.
        4. Reversal Journal Entry created and 100% balanced.
        5. Audit trail log entry created.
        """
        test_inv_no = f"PUR-TEST-GOV-{int(time.time())}"
        payload = {
            'bill_no': test_inv_no,
            'invoice_no': test_inv_no,
            'supplier_name': 'مورد اختبار الحوكمة',
            'supplier_phone': '770000001',
            'currency': 'YER',
            'exchange_rate': 1.0,
            'date': '2026-09-20',
            'pay_type': 'نقدي',
            'payment_source': '101.1 - صندوق الريال اليمني',
            'freight_cost': 2000.0,
            'transfer_fees': 500.0,
            'discount': 1000.0,
            'items': [
                {'item_name': 'قماش ستان اختبار', 'unit': 'متر', 'qty': 20.0, 'cost': 1500.0},
                {'item_name': 'قماش دانتيل اختبار', 'unit': 'متر', 'qty': 10.0, 'cost': 3000.0}
            ]
        }
        # 1. إنشاء الفاتورة
        create_res = pg_service.add_purchase(payload)
        self.assertIsNotNone(create_res)
        pur_id = create_res['id']
        self.assertEqual(create_res['invoice_no'], test_inv_no)

        # 2. إلغاء الفاتورة نظامياً
        cancel_res = pg_service.cancel_purchase({'id': pur_id, 'invoice_no': test_inv_no})
        self.assertTrue(cancel_res.get('success'), f"Cancellation failed: {cancel_res}")

        # 3. التحقق من قاعدة البيانات وقواعد الحوكمة
        with pg_service.get_db_cursor() as cur:
            # أ. حظر الحذف النهائي: الفاتورة موجودة ولكن بحالة ملغاة
            cur.execute("SELECT receipt_status, payment_status FROM purchases WHERE id = %s;", (pur_id,))
            p_db = cur.fetchone()
            self.assertIsNotNone(p_db)
            self.assertEqual(p_db['receipt_status'], 'Cancelled')
            self.assertEqual(p_db['payment_status'], 'Cancelled')

            # ب. التحقق من تسجيل حركة عكس المخزون
            cur.execute("""
                SELECT transaction_type, quantity 
                FROM inventory_transactions 
                WHERE reference_type = 'purchases' AND reference_id = %s AND transaction_type = 'PURCHASE_CANCEL';
            """, (pur_id,))
            inv_txns = cur.fetchall()
            self.assertGreater(len(inv_txns), 0, "Expected PURCHASE_CANCEL inventory transactions")

            # ج. التحقق من القيد العكسي المتزن
            rev_jv_no = cancel_res.get('reversal_jv')
            self.assertIsNotNone(rev_jv_no)
            cur.execute("SELECT id, status FROM journal_entries WHERE entry_no = %s;", (rev_jv_no,))
            rev_jv = cur.fetchone()
            self.assertIsNotNone(rev_jv, f"Reversal journal entry {rev_jv_no} not found")

            # د. فحص اتزان القيد العكسي (Debit == Credit)
            cur.execute("SELECT SUM(debit) as tot_deb, SUM(credit) as tot_crd FROM journal_entry_lines WHERE entry_id = %s;", (rev_jv['id'],))
            balance = cur.fetchone()
            tot_deb = Decimal(str(balance['tot_deb'] or 0))
            tot_crd = Decimal(str(balance['tot_crd'] or 0))
            self.assertEqual(tot_deb, tot_crd, f"Reversal entry is unbalanced! Debit: {tot_deb}, Credit: {tot_crd}")

            # هـ. التحقق من إلغاء سند الصرف
            cur.execute("SELECT status FROM payments WHERE invoice_id = %s OR invoice_id = %s;", (pur_id, test_inv_no))
            pay_db = cur.fetchone()
            if pay_db:
                self.assertEqual(pay_db['status'], 'Cancelled')

            # و. التحقق من سجل التدقيق (Audit Logs)
            cur.execute("""
                SELECT action FROM audit_logs 
                WHERE entity_type = 'purchases' AND entity_id = %s AND action = 'CANCEL';
            """, (pur_id,))
            audit_log = cur.fetchone()
            self.assertIsNotNone(audit_log, "Expected CANCEL action in audit_logs")

    def test_03_http_delete_endpoint_with_phantom_id(self):
        """Test the HTTP API route POST /api/purchases/delete with a phantom ID.
        Verifies that it responds HTTP 200 with success: True.
        """
        req = urllib.request.Request(
            "http://127.0.0.1:5000/api/purchases/delete",
            data=json.dumps({'id': 'PUR-PHANTOM-CLIENT-0', 'bill_no': '', 'invoice_no': ''}).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                self.assertEqual(response.status, 200)
                body = json.loads(response.read().decode('utf-8'))
                self.assertTrue(body.get('success'), f"Expected success: True, got: {body}")
        except urllib.error.URLError as e:
            self.fail(f"HTTP request to /api/purchases/delete failed: {e}")


if __name__ == '__main__':
    unittest.main()
