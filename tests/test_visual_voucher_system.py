# tests/test_visual_voucher_system.py
# Empirical Verification for Visual Voucher Card & Tafqeet Engine

import unittest
import socketserver
import threading
import time
import urllib.request
import json
from decimal import Decimal

from domains.accounting.tafqeet import tafqeet_arabic
from domains.accounting.voucher_card_service import format_voucher_for_card
import unified_server


class TestVisualVoucherSystem(unittest.TestCase):
    def test_01_tafqeet_financial_precision(self):
        """Test Arabic number-to-words for various currencies and fractions"""
        self.assertEqual(tafqeet_arabic(0), "صفر")
        self.assertEqual(tafqeet_arabic(1, 'YER'), "فقط ريال يمني لا غير")
        self.assertEqual(tafqeet_arabic(2, 'YER'), "فقط ريالان يمنيان لا غير")
        self.assertEqual(tafqeet_arabic(10, 'YER'), "فقط عشرة ريالات يمنية لا غير")
        self.assertIn("مائة وخمسون ألف ريال يمني", tafqeet_arabic(150000, 'YER'))
        self.assertIn("دولار أمريكي", tafqeet_arabic(250.50, 'USD'))
        self.assertIn("ريال سعودي", tafqeet_arabic(5000, 'SAR'))

    def test_02_receipt_voucher_formatting(self):
        """Test formatting of receipt voucher (RV) card structure"""
        raw_rv = {
            'voucher_no': 'RV-2026-00451',
            'voucher_type': 'سند قبض',
            'party_name': 'أميرة فهد',
            'amount': 250000,
            'currency': 'YER',
            'pay_method': 'تحويل بنكي',
            'transfer_no': 'TR-98213',
            'date_created': '2026-09-17 14:30',
            'notes': 'عربون فستان عرائسي ملكي'
        }
        card = format_voucher_for_card(raw_rv)
        self.assertTrue(card['success'])
        self.assertTrue(card['is_receipt'])
        self.assertEqual(card['badge_color'], '#059669')
        self.assertEqual(card['party_title'], 'المقبوض منه')
        self.assertIn('مائتان وخمسون ألف ريال يمني', card['written_amount'])
        self.assertIn('LP-ERP:VERIFY', card['qr_payload'])

    def test_03_payment_voucher_formatting(self):
        """Test formatting of payment voucher (PV) card structure"""
        raw_pv = {
            'voucher_no': 'PV-2026-00112',
            'voucher_type': 'سند صرف',
            'party_name': 'مورد أقمشة الحرير الفاخر',
            'amount': 850.00,
            'currency': 'USD',
            'pay_method': 'شيك بنكي',
            'transfer_no': 'CHK-7741',
            'date_created': '2026-09-17 15:00',
            'notes': 'سداد فاتورة توريد حرير طبيعي'
        }
        card = format_voucher_for_card(raw_pv)
        self.assertTrue(card['success'])
        self.assertFalse(card['is_receipt'])
        self.assertEqual(card['badge_color'], '#991b1b')
        self.assertEqual(card['party_title'], 'المدفوع لأمره')
        self.assertIn('ثمانمائة وخمسون دولار أمريكي', card['written_amount'])

    def test_04_live_http_voucher_endpoints(self):
        """Test HTTP server serving voucher.html, voucher_card.js and card-data route"""
        port = 5088
        socketserver.ThreadingTCPServer.allow_reuse_address = True
        httpd = socketserver.ThreadingTCPServer(("", port), unified_server.UnifiedERPHandler)
        srv_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        srv_thread.start()
        time.sleep(1.0)

        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/voucher.html", timeout=5) as res:
                self.assertEqual(res.status, 200)
                html = res.read().decode('utf-8')
                self.assertIn("مؤسسة الأميرات الصغيرات", html)
                self.assertIn("officialStamp", html)
                self.assertIn("voucher_card.js", html)

            # 2. Test /voucher_card.js
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/voucher_card.js", timeout=5) as res:
                self.assertEqual(res.status, 200)
                js = res.read().decode('utf-8')
                self.assertIn("renderVoucherToCanvas", js)

            # 3. Test /api/vouchers/card-data
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/vouchers/card-data?id=TEST", timeout=5) as res:
                self.assertEqual(res.status, 200)
                body = json.loads(res.read().decode('utf-8'))
                self.assertIn("success", body)
        finally:
            httpd.shutdown()


if __name__ == '__main__':
    unittest.main()
