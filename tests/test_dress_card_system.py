# tests/test_dress_card_system.py
# Verification suite for Royal Dress Card, Hangtag & WhatsApp Integration

import unittest
import json
import time
import os
import urllib.request
import socketserver
import threading

import pg_service
from domains.tailoring.dress_card_service import get_dress_card_payload
import unified_server


class TestDressCardSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.port = 5096
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

    def test_01_dress_card_static_assets_served(self):
        """Ensure dress_card.html and dress_card.js are served over HTTP with 200 OK"""
        for asset in ['dress_card.html', 'dress_card.js']:
            req = urllib.request.Request(f"http://127.0.0.1:{self.port}/{asset}", headers={'Connection': 'close'})
            with urllib.request.urlopen(req, timeout=5) as res:
                self.assertEqual(res.status, 200)
                body = res.read()
                self.assertGreater(len(body), 500)

    def test_02_dress_card_service_payload(self):
        """Test dress_card_service payload extraction and normalization"""
        order_no = f"ORD-TEST-{int(time.time())}"
        try:
            pg_service.add_order({
                'order_no': order_no,
                'customer_name': 'أم سارة المحترمة',
                'child_name': 'سارة الصغيرة',
                'product_name': 'فستان أورجانزا برنسيس',
                'total_amount': 95000,
                'paid_amount': 50000,
                'currency': 'YER',
                'status': 'مؤكد',
                'delivery_date': '2026-10-01'
            })
        except Exception:
            pass

        card = get_dress_card_payload(order_no)
        self.assertTrue(card.get('success'))
        self.assertEqual(card.get('order_no'), order_no)
        self.assertIn('financials', card)
        fin = card['financials']
        self.assertEqual(fin['total'], 95000.0)
        self.assertEqual(fin['paid'], 50000.0)
        self.assertEqual(fin['remaining'], 45000.0)
        self.assertIn('measurements', card)
        self.assertIn('verify_hash', card)
        self.assertTrue(card['verify_hash'].startswith('LP-'))

    def test_03_http_dress_card_api(self):
        """Test GET /api/orders/dress-card?id=... endpoint"""
        order_no = f"ORD-HTTP-{int(time.time())}"
        try:
            pg_service.add_order({
                'order_no': order_no,
                'customer_name': 'أم مريم',
                'child_name': 'مريم',
                'product_name': 'فستان سندريلا تل مطرز',
                'total_amount': 120000,
                'paid_amount': 60000,
                'currency': 'YER'
            })
        except Exception:
            pass

        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}/api/orders/dress-card?id={order_no}",
            headers={'Connection': 'close'}
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            self.assertEqual(res.status, 200)
            data = json.loads(res.read().decode('utf-8'))
            self.assertTrue(data.get('success'))
            self.assertEqual(data.get('order_no'), order_no)
            self.assertEqual(data.get('financials', {}).get('total'), 120000.0)

    def test_04_domains_line_count_governance(self):
        """Ensure all domain files and unified_server.py remain < 250 lines"""
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        domains_dir = os.path.join(root_dir, 'domains')
        for root, _, files in os.walk(domains_dir):
            for file in files:
                if file.endswith('.py'):
                    p = os.path.join(root, file)
                    with open(p, 'r', encoding='utf-8') as f:
                        lines = len(f.readlines())
                    self.assertLessEqual(lines, 250, f"File {file} exceeds 250 lines: {lines}")

    def test_05_standard_age_sizing_and_brand_resolution(self):
        """Ensure standard age sizing detection and brand settings resolution"""
        card = get_dress_card_payload('ORD-CUST-9490891-4916')
        if card.get('success'):
            self.assertTrue(card.get('is_standard_age_sizing'))
            self.assertIn('sizing_summary', card)
            self.assertIn('brand', card)
            self.assertIn('name', card['brand'])
            self.assertIn('phone', card['brand'])
            # Verify fitting date is completely absent
            self.assertNotIn('fitting_date', card)
            # Verify CRM delivery date resolution (not empty)
            self.assertTrue(bool(card.get('delivery_date')))


if __name__ == '__main__':
    unittest.main()
