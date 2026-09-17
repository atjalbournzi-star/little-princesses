# tests/test_voucher_reversal.py
# Verification suite for Voucher Immutability, Reversal Engine & GAAP/IFRS Governance

import unittest
import json
import time
import urllib.request
import socketserver
import threading
from decimal import Decimal

import pg_service
from domains.accounting.reversing_service import reverse_voucher, ensure_reversal_columns
import unified_server

class TestVoucherReversal(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ensure_reversal_columns()
        cls.port = 5095
        socketserver.ThreadingTCPServer.allow_reuse_address = True
        cls.httpd = socketserver.ThreadingTCPServer(("", cls.port), unified_server.UnifiedERPHandler)
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.5)

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, 'httpd') and cls.httpd:
            cls.httpd.shutdown()
            cls.httpd.server_close()

    def test_01_prevent_hard_delete_and_direct_update(self):
        """Test that hard delete and direct mutation of vouchers are strictly rejected (403 Forbidden)"""
        # 1. Test DELETE /api/vouchers/delete
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/vouchers/delete",
            data=json.dumps({'id': 'TEST-VCH-1'}).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'Connection': 'close'},
            method='POST'
        )
        try:
            urllib.request.urlopen(req, timeout=5)
            self.fail("Expected HTTP 403 Forbidden for DELETE")
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 403)
            body = json.loads(e.read().decode('utf-8'))
            self.assertFalse(body['success'])
            self.assertIn("No Hard Delete", body['error'])

        # 2. Test POST /api/vouchers/update
        req_up = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/vouchers/update",
            data=json.dumps({'id': 'TEST-VCH-1', 'amount': 100}).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'Connection': 'close'},
            method='POST'
        )
        try:
            urllib.request.urlopen(req_up, timeout=5)
            self.fail("Expected HTTP 403 Forbidden for UPDATE")
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 403)
            body = json.loads(e.read().decode('utf-8'))
            self.assertFalse(body['success'])
            self.assertIn("غير مسموح بالتعديل المباشر", body['error'])

    def test_02_reversal_engine_creates_balanced_entry(self):
        """Test creating a voucher and reversing it with atomic balanced journal entry"""
        v_no = f"RV-TEST-{int(time.time())}"
        test_payload = {
            'voucher_no': v_no,
            'voucher_type': 'سند قبض',
            'amount': 45000,
            'currency': 'YER',
            'exchange_rate': 1.0,
            'party': 'عميل تجريبي للإلغاء',
            'account_id': '101',
            'target_acc': '104',
            'notes': 'سند اختبار تجريبي'
        }
        create_res = pg_service.add_voucher(test_payload)
        self.assertIsNotNone(create_res)

        # إلغاء السند بقيد عكسي
        reason = "خطأ في تسجيل حساب الطرف المستفيد"
        rev_res = reverse_voucher(v_no, reason, user_id='auditor_user')
        self.assertTrue(rev_res['success'])
        self.assertEqual(rev_res['status'], 'reversed')
        self.assertEqual(rev_res['voucher_no'], v_no)

        # التحقق من قاعدة البيانات
        with pg_service.get_db_cursor() as cur:
            # 1. السند الأصلي محفوظ ولم يُحذف نهائياً (Audit Trail)
            cur.execute("SELECT status, reversal_reason, reversal_entry_id FROM payments WHERE payment_no = %s;", (v_no,))
            v_db = cur.fetchone()
            self.assertIsNotNone(v_db)
            self.assertEqual(v_db['status'], 'reversed')
            self.assertEqual(v_db['reversal_reason'], reason)
            rev_entry_no = v_db['reversal_entry_id']

            # 2. القيد العكسي متزن: مجموع المدين = مجموع الدائن
            cur.execute("""
                SELECT l.debit, l.credit
                FROM journal_entries e
                JOIN journal_entry_lines l ON e.id = l.entry_id
                WHERE e.entry_no = %s;
            """, (rev_entry_no,))
            lines = cur.fetchall()
            self.assertGreaterEqual(len(lines), 2)
            total_debit = sum(Decimal(str(r['debit'] or 0)) for r in lines)
            total_credit = sum(Decimal(str(r['credit'] or 0)) for r in lines)
            self.assertEqual(total_debit, total_credit)
            self.assertEqual(total_debit, Decimal('45000.0000'))

    def test_03_prevent_double_reversal(self):
        """Test that already reversed vouchers cannot be reversed again"""
        v_no = f"PV-TEST-{int(time.time())}"
        test_payload = {
            'voucher_no': v_no,
            'voucher_type': 'سند صرف',
            'amount': 20000,
            'currency': 'YER',
            'account_id': '101',
            'target_acc': '201',
            'party': 'مورد تجريبي'
        }
        pg_service.add_voucher(test_payload)

        # الإلغاء للمرة الأولى -> ينجح
        r1 = reverse_voucher(v_no, "إلغاء لمرة أولى")
        self.assertTrue(r1['success'])

        # الإلغاء للمرة الثانية -> يفشل ويمنع التكرار
        r2 = reverse_voucher(v_no, "محاولة إلغاء ثانية")
        self.assertFalse(r2['success'])
        self.assertIn("ملغى مسبقاً", r2['error'])

    def test_04_http_api_vouchers_reverse(self):
        """Test POST /api/vouchers/reverse endpoint via HTTP"""
        v_no = f"RV-API-{int(time.time())}"
        pg_service.add_voucher({
            'voucher_no': v_no,
            'voucher_type': 'سند قبض',
            'amount': 75000,
            'currency': 'YER',
            'party': 'عميل عبر API'
        })

        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/vouchers/reverse",
            data=json.dumps({
                'voucher_no': v_no,
                'reason': 'طلب العميل إلغاء الحجز واسترداد القيد',
                'user_id': 'finance_manager'
            }).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'Connection': 'close'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=60) as res:
            self.assertEqual(res.status, 200)
            body = json.loads(res.read().decode('utf-8'))
            self.assertTrue(body['success'])
            self.assertEqual(body['status'], 'reversed')
            self.assertEqual(body['voucher_no'], v_no)

if __name__ == '__main__':
    unittest.main()
