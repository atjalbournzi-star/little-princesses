# tests/test_phase3_pos_and_closure.py
# Phase 3 Operational Verification: Atomic POS Stock & COGS, 5 Radar Equations & Shields
# Architectural Standards: Strictly < 220 lines per file (All tests in ROLLBACK)

import os
import sys
import unittest
from decimal import Decimal

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from db_client import get_db_cursor
from services.pg.pg_pos import process_pos_sale_atomic
from services.pg.pg_delivery_cogs import refresh_chart_balances_atomic
from services.pg.pg_integrity_radar import check_accounting_integrity
from services.security import assert_period_open, FiscalPeriodLockedError


class Phase3POSAndClosureTestCase(unittest.TestCase):
    """
    Automated verification of POS lifecycle, COGS recognition,
    5-equation radar compliance, and Layer 2 Shields under strict transaction rollback.
    """

    def test_pos_ready_made_sale_and_five_radar_equations(self):
        """Tests complete POS sale, stock deduction, COGS, and 5 healthy radar equations."""
        with get_db_cursor(commit=False) as cur:
            # 1. Setup isolated test warehouse, inventory item and stock
            cur.execute("INSERT INTO customers (id, name, phone, category) VALUES ('CUST-POS-T1', 'عميلة المعرض', '770000001', 'نقاط بيع') ON CONFLICT (id) DO NOTHING;")
            cur.execute("""
                INSERT INTO inventory (id, item_code, name, type, quantity, unit_cost)
                VALUES ('INV-POS-T1', 'DR-READY-01', 'فستان أميرة جاهز', 'FINISHED_PRODUCT', 10, 5000.0)
                ON CONFLICT (id) DO UPDATE SET quantity = 10, unit_cost = 5000.0;
            """)
            cur.execute("SELECT id FROM warehouses WHERE id = 'WH-SHOWROOM' LIMIT 1;")
            if not cur.fetchone():
                cur.execute("INSERT INTO warehouses (id, code, name, account_id) VALUES ('WH-SHOWROOM', 'WH-SHOWROOM', 'صالة العرض', 'ACC-105-03') ON CONFLICT (id) DO NOTHING;")

            cur.execute("""
                INSERT INTO warehouse_stock (id, warehouse_id, inventory_id, quantity)
                VALUES ('WS-POS-T1', 'WH-SHOWROOM', 'INV-POS-T1', 10)
                ON CONFLICT (id) DO UPDATE SET quantity = 10;
            """)

            # Initial opening balance for warehouse inventory (ACC-105-03) and Equity (ACC-301)
            cur.execute("""
                INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, currency, exchange_rate, status)
                VALUES ('JV-INIT-POS', 'JV-INIT-POS', CURRENT_DATE, 'رصيد افتتاحي مخزون المعرض', 'ACC-105-03', 'ACC-301', 50000.0, 50000.0, 50000.0, 'YER', 1.0, 'Posted')
                ON CONFLICT (entry_no) DO NOTHING;
            """)
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id IN ('JV-INIT-POS', (SELECT id FROM journal_entries WHERE entry_no = 'JV-INIT-POS'));")
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, debit, credit, debit_base, credit_base) VALUES ('JVL-INIT-1', 'JV-INIT-POS', 'ACC-105-03', 50000.0, 0.0, 50000.0, 0.0);")
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, debit, credit, debit_base, credit_base) VALUES ('JVL-INIT-2', 'JV-INIT-POS', 'ACC-301', 0.0, 50000.0, 0.0, 50000.0);")
            refresh_chart_balances_atomic(cur)

            # 2. Execute POS Sale for 2 units at 12,000 YER (Total: 24,000 YER, Cost: 10,000 YER)
            pos_payload = {
                'order_no': 'POS-TEST-001',
                'customer_id': 'CUST-POS-T1',
                'customer_name': 'عميلة المعرض',
                'payment_method': 'نقد (كاش)',
                'total_amount': 24000.0,
                'paid_amount': 24000.0,
                'warehouse_id': 'WH-SHOWROOM',
                'items': [{
                    'product_id': 'INV-POS-T1',
                    'product_name': 'فستان أميرة جاهز',
                    'quantity': 2.0,
                    'unit_price': 12000.0,
                    'total_price': 24000.0
                }]
            }
            res = process_pos_sale_atomic(cur, pos_payload, resolved_user='admin')
            self.assertTrue(res.get('is_pos'))
            self.assertEqual(res.get('status'), 'Delivered')
            self.assertEqual(res.get('cogs_amount'), 10000.0)

            # 3. Verify Stock Deduction in warehouse_stock
            cur.execute("SELECT quantity, available_qty FROM warehouse_stock WHERE id = 'WS-POS-T1';")
            ws_after = cur.fetchone()
            self.assertEqual(float(ws_after['quantity']), 8.0)

            # 4. Verify Stock Movements Log
            cur.execute("SELECT * FROM stock_movements WHERE reference_id = %s;", (res['id'],))
            sm = cur.fetchone()
            self.assertIsNotNone(sm)
            self.assertEqual(sm['movement_type'], 'POS_SALE')
            self.assertEqual(float(sm['quantity']), -2.0)
            self.assertEqual(abs(float(sm['total_cost'])), 10000.0)

            # 5. Verify Balanced Double-Entry Journals (Revenue & COGS)
            cur.execute("SELECT * FROM journal_entries WHERE ref_id = %s;", (res['id'],))
            jvs = cur.fetchall()
            self.assertEqual(len(jvs), 2)  # Revenue + COGS
            for j in jvs:
                cur.execute("SELECT SUM(debit_base) as deb, SUM(credit_base) as crd FROM journal_entry_lines WHERE entry_id = %s;", (j['id'],))
                sums = cur.fetchone()
                self.assertAlmostEqual(float(sums['deb']), float(sums['crd']), places=2)

            # 6. Verify 5 Radar Equations are HEALTHY at 0.00 YER Difference
            radar = check_accounting_integrity()
            self.assertEqual(radar['overall_status'], 'HEALTHY')
            for eq in radar['equations']:
                self.assertEqual(eq['status'], 'HEALTHY', f"Equation {eq['id']} failed: diff={eq['diff']}")
                self.assertLessEqual(eq['diff'], 0.001, f"Equation {eq['id']} diff > 0.00: {eq['diff']}")

            cur.connection.rollback()

    def test_pos_shield4_negative_stock_prevention(self):
        """Shield 4: Prohibits selling more than available warehouse stock."""
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT id FROM warehouses WHERE id = 'WH-SHOWROOM' LIMIT 1;")
            if not cur.fetchone():
                cur.execute("INSERT INTO warehouses (id, code, name, account_id) VALUES ('WH-SHOWROOM', 'WH-SHOWROOM', 'صالة العرض', 'ACC-105-03') ON CONFLICT (id) DO NOTHING;")
            cur.execute("""
                INSERT INTO inventory (id, item_code, name, type, quantity, unit_cost)
                VALUES ('INV-POS-T2', 'DR-LIMIT-02', 'فستان محدود', 'FINISHED_PRODUCT', 3, 4000.0)
                ON CONFLICT (id) DO UPDATE SET quantity = 3;
            """)
            cur.execute("""
                INSERT INTO warehouse_stock (id, warehouse_id, inventory_id, quantity)
                VALUES ('WS-POS-T2', 'WH-SHOWROOM', 'INV-POS-T2', 3)
                ON CONFLICT (id) DO UPDATE SET quantity = 3;
            """)

            pos_payload = {
                'order_no': 'POS-TEST-OVER',
                'customer_id': 'CUST-GENERAL',
                'total_amount': 50000.0,
                'paid_amount': 50000.0,
                'warehouse_id': 'WH-SHOWROOM',
                'items': [{'product_id': 'INV-POS-T2', 'product_name': 'فستان محدود', 'quantity': 5.0, 'unit_price': 10000.0}]
            }
            with self.assertRaises(ValueError) as ctx:
                process_pos_sale_atomic(cur, pos_payload)
            self.assertIn("المخزون السالب غير مسموح به", str(ctx.exception))
            cur.connection.rollback()

    def test_pos_shield1_period_locked_prevention(self):
        """Shield 1: Prohibits POS sale in a locked fiscal period (HTTP 423)."""
        with get_db_cursor(commit=False) as cur:
            cur.execute("""
                INSERT INTO fiscal_periods (period_key, start_date, end_date, is_locked)
                VALUES ('2026-01', '2026-01-01', '2026-01-31', TRUE)
                ON CONFLICT (period_key) DO UPDATE SET is_locked = TRUE;
            """)
            pos_payload = {
                'order_no': 'POS-TEST-LOCKED',
                'order_date': '2026-01-15',
                'customer_id': 'CUST-GENERAL',
                'total_amount': 10000.0,
                'paid_amount': 10000.0,
                'items': []
            }
            with self.assertRaises(FiscalPeriodLockedError):
                process_pos_sale_atomic(cur, pos_payload)
            cur.connection.rollback()


if __name__ == '__main__':
    unittest.main()
