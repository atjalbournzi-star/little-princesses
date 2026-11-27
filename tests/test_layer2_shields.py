# tests/test_layer2_shields.py
# Automated Verification Suite for Protection Layer 2 (Flask Zero-Trust & Shields)
# Architectural Standards: Strictly < 220 lines per file

import os
import sys
import unittest
from decimal import Decimal

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app
from db_client import get_db_cursor
from services.security import toggle_fiscal_period


class Layer2ShieldsTestCase(unittest.TestCase):
    @classmethod
    def clean_db(cls):
        try:
            with get_db_cursor(commit=True) as cur:
                cur.execute("DELETE FROM public.idempotency_keys;")
                cur.execute("UPDATE public.journal_entries SET status = 'Draft';")
                cur.execute("DELETE FROM public.journal_entry_lines;")
                cur.execute("DELETE FROM public.journal_entries;")
                cur.execute("DELETE FROM public.payments;")
                cur.execute("DELETE FROM public.expenses;")
                cur.execute("DELETE FROM public.expense_transactions;")
        except Exception:
            pass

    @classmethod
    def setUpClass(cls):
        app.testing = True
        cls.client = app.test_client()
        cls.clean_db()

    @classmethod
    def tearDownClass(cls):
        cls.clean_db()

    def test_01_live_compatibility_endpoints(self):
        """1. Verify HTTP 200 on all core endpoints."""
        endpoints = [
            '/api/health',
            '/api/accounts/list',
            '/api/factory',
            '/api/accounting/periods'
        ]
        for ep in endpoints:
            res = self.client.get(ep)
            self.assertEqual(res.status_code, 200, f"Endpoint {ep} failed with status {res.status_code}: {res.get_data(as_text=True)}")
            data = res.get_json() or {}
            self.assertTrue(data.get('success', False) or data.get('status') == 'ok', f"Endpoint {ep} did not return success")

    def test_02_idempotency_shield(self):
        """2. Verify Idempotency-Key prevents double submission and returns cached response."""
        test_key = "test-idem-key-v7-001"
        payload = {
            "amount": 5000,
            "currency": "YER",
            "category": "مصروفات مكتبية",
            "notes": "اختبار درع تكرار الإرسال",
            "date": "2026-11-20"
        }
        headers = {"Idempotency-Key": test_key}

        # First request
        res1 = self.client.post('/api/expenses', json=payload, headers=headers)
        self.assertEqual(res1.status_code, 200, f"First request failed: {res1.get_data(as_text=True)}")
        data1 = res1.get_json()
        doc_no = data1.get('data', {}).get('expense_no') or data1.get('data', {}).get('voucher_no')

        # Second request with SAME key (should return cached response)
        res2 = self.client.post('/api/expenses', json=payload, headers=headers)
        self.assertEqual(res2.status_code, 200, f"Second request failed: {res2.get_data(as_text=True)}")
        data2 = res2.get_json()
        self.assertEqual(data1, data2, "Cached response does not match first response!")

        # Clean up test expense and idempotency key
        with get_db_cursor(commit=True) as cur:
            cur.execute("DELETE FROM public.idempotency_keys WHERE idempotency_key = %s;", (test_key,))
            if doc_no:
                cur.execute("UPDATE public.journal_entries SET status = 'Draft' WHERE entry_no LIKE %s OR ref_id = %s;", (f"%{doc_no}%", doc_no))
                cur.execute("DELETE FROM public.journal_entry_lines WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE entry_no LIKE %s OR ref_id = %s);", (f"%{doc_no}%", doc_no))
                cur.execute("DELETE FROM public.journal_entries WHERE entry_no LIKE %s OR ref_id = %s;", (f"%{doc_no}%", doc_no))
                cur.execute("DELETE FROM public.payments WHERE payment_no LIKE %s OR reference_no = %s;", (f"%{doc_no}%", doc_no))
                cur.execute("DELETE FROM public.expenses WHERE expense_no = %s OR id = %s;", (doc_no, doc_no))
                cur.execute("DELETE FROM public.expense_transactions WHERE expense_no = %s OR id = %s;", (doc_no, doc_no))

    def test_03_arabic_error_translator_double_entry(self):
        """3. Verify PostgreSQL trigger violations return Arabic messages instead of 500."""
        # Attempt to insert an unbalanced journal entry directly
        unbalanced_payload = {
            "entry_date": "2026-11-20",
            "description": "قيد اختبار مخالف لدرع التوازن",
            "lines": [
                {"account_id": "ACC-101", "debit": 10000, "credit": 0},
                {"account_id": "ACC-401", "debit": 0, "credit": 5000}  # Unbalanced: 10000 != 5000
            ]
        }
        res = self.client.post('/api/journal', json=unbalanced_payload)
        self.assertIn(res.status_code, (400, 409, 422), f"Expected 4xx error code, got: {res.status_code}")
        data = res.get_json() or {}
        self.assertFalse(data.get('success', True))
        err_msg = data.get('error') or data.get('message') or ""
        self.assertTrue(any(k in err_msg for k in ["غير متزن", "توازن", "المخالفة المحاسبية", "Double-Entry"]), f"Expected Arabic balance guard message, got: {err_msg}")

    def test_04_dynamic_period_lock(self):
        """4. Verify dynamic fiscal period lock rejects posting with HTTP 423 Locked."""
        # Lock October 2026
        toggle_fiscal_period("2026-10", is_locked=True, user_id="TEST-SUITE", notes="قفل تجريبي للاختبار")

        # Try to post a voucher inside October 2026
        voucher_payload = {
            "voucher_type": "سند صرف",
            "amount": 2500,
            "currency": "YER",
            "date": "2026-10-15",
            "party": "طرف تجريبي",
            "notes": "محاولة صرف في فترة مقفلة"
        }
        res = self.client.post('/api/vouchers', json=voucher_payload)
        self.assertEqual(res.status_code, 423, f"Expected HTTP 423 Locked, got {res.status_code}: {res.get_data(as_text=True)}")
        data = res.get_json() or {}
        err_msg = data.get('error') or data.get('message') or ""
        self.assertIn("الفترة المحاسبية مغلقة", err_msg)

        # Unlock October 2026
        toggle_fiscal_period("2026-10", is_locked=False, user_id="TEST-SUITE", notes="إلغاء القفل بعد الاختبار")

    def test_05_server_side_rbac(self):
        """5. Verify RBAC rejects unauthorized roles with HTTP 403 Forbidden."""
        # Cashier / data_entry attempting sovereign voucher reversal
        cashier_token = "erp_cashier_USR-000004_data_entry"
        headers = {"Authorization": f"Bearer {cashier_token}"}

        res = self.client.post('/api/vouchers/reverse', json={"id": "PV-NONEXISTENT", "reason": "محاولة إلغاء غير مصرحة"}, headers=headers)
        self.assertEqual(res.status_code, 403, f"Expected HTTP 403 Forbidden, got {res.status_code}: {res.get_data(as_text=True)}")
        data = res.get_json() or {}
        err_msg = data.get('error') or data.get('message') or ""
        self.assertIn("صلاحية", err_msg)

        # Cashier attempting to lock fiscal period
        res_lock = self.client.post('/api/accounting/periods/lock', json={"period_key": "2026-09", "is_locked": True}, headers=headers)
        self.assertEqual(res_lock.status_code, 403, f"Expected HTTP 403 Forbidden, got {res_lock.status_code}")

    def test_06_database_zero_state_hygiene(self):
        """6. Confirm transactional tables remain 100% clean at 0 rows."""
        tables = ['orders', 'journal_entries', 'payments', 'piece_rate_logs', 'warehouse_stock', 'idempotency_keys']
        with get_db_cursor(commit=False) as cur:
            for t in tables:
                cur.execute(f"SELECT COUNT(*) as c FROM public.{t};")
                cnt = cur.fetchone()['c']
                self.assertEqual(cnt, 0, f"Table {t} contains {cnt} dirty records!")


if __name__ == '__main__':
    unittest.main()
