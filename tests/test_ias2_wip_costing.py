# tests/test_ias2_wip_costing.py
# Verification Suite for IAS 2 Work In Progress (105.05 WIP) & Radar Upgrade
# Architectural Standards: Strictly < 220 lines per file

import os
import sys
import unittest
from decimal import Decimal

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from db_client import get_db_cursor
from services.pg.pg_wip_accounting import (
    resolve_wip_account, record_material_wip_issue,
    record_labor_wip_accrual, clear_wip_to_cogs
)
from services.pg.pg_delivery_cogs import refresh_chart_balances_atomic
from services.pg.pg_integrity_radar import check_accounting_integrity


class IAS2WIPCostingTestCase(unittest.TestCase):
    ORDER_NO = "ORD-IAS2-TEST"
    PO_NO = "PO-IAS2-TEST"
    CUST_ID = "CUST-IAS2-TEST"
    INV_ID = "INV-IAS2-TEST"
    WS_ID = "WS-IAS2-TEST"

    @classmethod
    def clean_test_data(cls):
        """Hard purge of test records strictly preserving zero-state."""
        try:
            with get_db_cursor(commit=True) as cur:
                cur.execute("UPDATE public.journal_entries SET status = 'Draft' WHERE ref_id LIKE %s OR ref_id LIKE %s OR entry_no LIKE %s OR id LIKE %s;", (f"%{cls.ORDER_NO}%", f"%{cls.PO_NO}%", f"%{cls.PO_NO}%", f"%{cls.PO_NO}%"))
                cur.execute("DELETE FROM public.journal_entry_lines WHERE entry_id IN (SELECT id FROM public.journal_entries WHERE ref_id LIKE %s OR ref_id LIKE %s OR entry_no LIKE %s OR id LIKE %s);", (f"%{cls.ORDER_NO}%", f"%{cls.PO_NO}%", f"%{cls.PO_NO}%", f"%{cls.PO_NO}%"))
                cur.execute("DELETE FROM public.journal_entries WHERE ref_id LIKE %s OR ref_id LIKE %s OR entry_no LIKE %s OR id LIKE %s;", (f"%{cls.ORDER_NO}%", f"%{cls.PO_NO}%", f"%{cls.PO_NO}%", f"%{cls.PO_NO}%"))
                cur.execute("DELETE FROM public.piece_rate_logs WHERE production_order_id = %s OR production_order_id = %s;", (cls.PO_NO, cls.ORDER_NO))
                cur.execute("DELETE FROM public.production_orders WHERE production_order_no = %s OR id = %s;", (cls.PO_NO, cls.PO_NO))
                cur.execute("DELETE FROM public.orders WHERE order_no = %s OR id = %s;", (cls.ORDER_NO, cls.ORDER_NO))
                cur.execute("DELETE FROM public.customers WHERE id = %s;", (cls.CUST_ID,))
                cur.execute("DELETE FROM public.warehouse_stock WHERE id = %s OR inventory_id = %s;", (cls.WS_ID, cls.INV_ID))
                cur.execute("DELETE FROM public.inventory WHERE id = %s;", (cls.INV_ID,))
                refresh_chart_balances_atomic(cur)
        except Exception:
            pass

    @classmethod
    def setUpClass(cls):
        cls.clean_test_data()

    @classmethod
    def tearDownClass(cls):
        cls.clean_test_data()

    def test_complete_ias2_wip_lifecycle(self):
        """Verify the full IAS 2 cycle: Issue -> Accrue -> Radar Match -> Deliver -> COGS Clear."""
        with get_db_cursor(commit=True) as cur:
            # 1. Setup minimal test customer, inventory, stock and orders
            cur.execute("INSERT INTO public.customers (id, name, phone, current_balance) VALUES (%s, 'أميرة الاختبار', '777123456', 0) ON CONFLICT (id) DO NOTHING;", (self.CUST_ID,))
            cur.execute("""
                INSERT INTO public.inventory (id, item_code, name, unit, quantity, reserved_qty, unit_cost, created_at, updated_at)
                VALUES (%s, 'FAB-TEST-01', 'حرير ملكي', 'متر', 10, 0, 2500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO NOTHING;
            """, (self.INV_ID,))
            cur.execute("INSERT INTO public.warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty) VALUES (%s, 'WH-WORKSHOP', %s, 10, 0) ON CONFLICT (id) DO NOTHING;", (self.WS_ID, self.INV_ID))
            
            # Stocking journal entry (25,000 YER on ACC-105-02)
            cur.execute("""
                INSERT INTO public.journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status)
                VALUES (%s, %s, CURRENT_DATE, 'توريد رصيد خامات تجريبي', 'ACC-105-02', 'ACC-201', 25000, 25000, 25000, 'TestStock', %s, 'YER', 1.0, 'Posted')
                ON CONFLICT (id) DO NOTHING;
            """, (f"JV-STK-{self.PO_NO}", f"JV-STK-{self.PO_NO}", self.PO_NO))
            cur.execute("INSERT INTO public.journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, 'ACC-105-02', 'مدين مخزون', 25000, 0, 25000, 0);", (f"JVL1-{self.PO_NO}", f"JV-STK-{self.PO_NO}"))
            cur.execute("INSERT INTO public.journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, 'ACC-201', 'دائن مورد', 0, 25000, 0, 25000);", (f"JVL2-{self.PO_NO}", f"JV-STK-{self.PO_NO}"))

            cur.execute("""
                INSERT INTO public.orders (id, order_no, customer_id, order_date, currency, exchange_rate, subtotal, discount, tax, total_amount, paid_amount, base_amount, status, production_status)
                VALUES (%s, %s, %s, CURRENT_DATE, 'YER', 1.0, 50000, 0, 0, 50000, 20000, 50000, 'in_production', 'In Production')
                ON CONFLICT (id) DO NOTHING;
            """, (self.ORDER_NO, self.ORDER_NO, self.CUST_ID))

            cur.execute("""
                INSERT INTO public.production_orders (id, production_order_no, order_id, product_name, stage, status, wip_material_cost, wip_labor_cost, wip_overhead_cost, wip_cleared_amount)
                VALUES (%s, %s, %s, 'فستان ملكي تجريبي', 'قص وتفصيل', 'In Progress', 0, 0, 0, 0)
                ON CONFLICT (id) DO NOTHING;
            """, (self.PO_NO, self.PO_NO, self.ORDER_NO))

            # 2. Issue Raw Materials to WIP (5 meters = 12,500 YER)
            cur.execute("UPDATE public.warehouse_stock SET quantity = quantity - 5 WHERE id = %s;", (self.WS_ID,))
            cur.execute("UPDATE public.inventory SET quantity = quantity - 5 WHERE id = %s;", (self.INV_ID,))
            mat_res = record_material_wip_issue(cur, self.PO_NO, "FAB-TEST-01", "حرير ملكي", "ACC-105-02", 12500.0, f"صرف حرير لأمر {self.PO_NO}", skip_cascade=True)
            self.assertIsNotNone(mat_res, "Material WIP issue failed")
            self.assertEqual(mat_res['amount'], 12500.0)

            # 3. Accrue Direct Labor to WIP (7,500 YER)
            stage_lines = [("EMP-T01", "أحمد الخياط", 4500.0, "خياطة"), ("EMP-T02", "سارة التطريز", 3000.0, "تطريز")]
            for emp_id, emp_name, w_wage, stg_name in stage_lines:
                cur.execute("INSERT INTO public.piece_rate_logs (id, worker_id, worker_name, production_order_id, stage_id, piece_rate_amount, pieces_count, payment_status, qa_status, completed_at) VALUES (%s, %s, %s, %s, %s, %s, 1, 'Accrued', 'Passed', CURRENT_TIMESTAMP);", (f"PRL-{self.PO_NO}-{emp_id}", emp_id, emp_name, self.PO_NO, stg_name, w_wage))

            lab_res = record_labor_wip_accrual(cur, self.ORDER_NO, self.PO_NO, stage_lines, 7500.0)
            self.assertIsNotNone(lab_res, "Labor WIP accrual failed")

            refresh_chart_balances_atomic(cur)

        # 4. Verify Integrity Radar with Active WIP (12,500 + 7,500 = 20,000 YER)
        radar_mid = check_accounting_integrity()
        self.assertEqual(radar_mid['overall_status'], 'HEALTHY')
        eq_map = {eq['id']: eq for eq in radar_mid['equations']}
        wip_eq = eq_map['wip_reconciliation']
        self.assertEqual(wip_eq['status'], 'HEALTHY')
        self.assertEqual(Decimal(str(wip_eq['left_value'])), Decimal('20000.0'))
        self.assertEqual(Decimal(str(wip_eq['right_value'])), Decimal('20000.0'))
        self.assertEqual(Decimal(str(wip_eq['diff'])), Decimal('0.0'))

        # 5. Delivery & Final COGS Clearance
        with get_db_cursor(commit=True) as cur:
            cogs_res = clear_wip_to_cogs(cur, self.ORDER_NO, self.ORDER_NO, cust_name="العميل التجريبي", child_name="الأميرة")
            self.assertIsNotNone(cogs_res)
            self.assertEqual(cogs_res['cogs_amount'], 20000.0)

            cur.execute("SELECT wip_material_cost, wip_labor_cost, wip_cleared_amount FROM public.production_orders WHERE id = %s;", (self.PO_NO,))
            po_cleared = cur.fetchone()
            self.assertEqual(Decimal(str(po_cleared['wip_cleared_amount'])), Decimal('20000.0000'))
            refresh_chart_balances_atomic(cur)

        # 6. Verify Integrity Radar after Delivery (Active WIP = 0.00, Account 105.05 = 0.00)
        radar_post = check_accounting_integrity()
        self.assertEqual(radar_post['overall_status'], 'HEALTHY')
        eq_map_post = {eq['id']: eq for eq in radar_post['equations']}
        wip_eq_post = eq_map_post['wip_reconciliation']
        self.assertEqual(wip_eq_post['status'], 'HEALTHY')
        self.assertEqual(Decimal(str(wip_eq_post['left_value'])), Decimal('0.0'))
        self.assertEqual(Decimal(str(wip_eq_post['right_value'])), Decimal('0.0'))
        self.assertEqual(Decimal(str(wip_eq_post['diff'])), Decimal('0.0'))

        # 7. Clean up and verify 0 records
        self.clean_test_data()
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT COUNT(*) as c FROM public.orders WHERE id = %s;", (self.ORDER_NO,))
            self.assertEqual(cur.fetchone()['c'], 0)
            cur.execute("SELECT COUNT(*) as c FROM public.production_orders WHERE id = %s;", (self.PO_NO,))
            self.assertEqual(cur.fetchone()['c'], 0)


if __name__ == '__main__':
    unittest.main()
