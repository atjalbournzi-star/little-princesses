import os
import unittest
import json
import time
from decimal import Decimal
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, '.env'))

import pg_service
from db_client import get_db_cursor


class TestInventoryGovernanceReconciliation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        pg_service.reconcile_inventory_governance()

    def test_01_save_and_update_purchase_no_duplication(self):
        """التحقق من عدم مضاعفة رصيد المخزون عند تعديل فاتورة مشتريات قائمة"""
        ts = int(time.time() * 1000)
        bill_no = f"PUR-TEST-INV-{ts}"
        fabric_name = f"قماش حوكمة اختبار {ts}"

        # 1. إنشاء الفاتورة لأول مرة بكمية 100
        payload_create = {
            "bill_no": bill_no,
            "invoice_no": bill_no,
            "supplier_name": "مورد اختبار المخزون",
            "payment_method": "نقدي",
            "payment_account_code": "ACC-101-1",
            "items": [
                {
                    "item_name": fabric_name,
                    "unit": "متر",
                    "quantity": 100.0,
                    "unit_price": 500.0,
                    "total_price": 50000.0
                }
            ]
        }
        res_create = pg_service.add_purchase(payload_create)
        self.assertTrue(res_create.get('id'), "فشل إنشاء فاتورة المشتريات")
        pur_id = res_create['id']

        with get_db_cursor() as cur:
            cur.execute("SELECT id, quantity, unit_cost, total_value, status FROM inventory WHERE name = %s;", (fabric_name,))
            inv_row = cur.fetchone()
            self.assertIsNotNone(inv_row, "لم يتم العثور على الصنف في المخزون")
            self.assertEqual(float(inv_row['quantity']), 100.0)
            self.assertEqual(inv_row['status'], 'Available')

        # 2. تعديل نفس الفاتورة وتغيير الكمية إلى 150 (يجب ألا تصبح 250!)
        payload_update = {
            "id": pur_id,
            "bill_no": bill_no,
            "invoice_no": bill_no,
            "supplier_name": "مورد اختبار المخزون",
            "payment_method": "نقدي",
            "payment_account_code": "ACC-101-1",
            "items": [
                {
                    "item_name": fabric_name,
                    "unit": "متر",
                    "quantity": 150.0,
                    "unit_price": 500.0,
                    "total_price": 75000.0
                }
            ]
        }
        res_update = pg_service.add_purchase(payload_update)
        self.assertEqual(res_update.get('id'), pur_id)

        with get_db_cursor() as cur:
            cur.execute("SELECT id, quantity, unit_cost, total_value, status FROM inventory WHERE name = %s;", (fabric_name,))
            inv_row_after = cur.fetchone()
            self.assertEqual(float(inv_row_after['quantity']), 150.0, "فشل منع التكرار: تضاعفت كمية المخزون عند تعديل الفاتورة!")
            self.assertEqual(float(inv_row_after['total_value']), 75000.0)

        # 3. إلغاء الفاتورة بالكامل والتحقق من تصفير المخزون
        res_cancel = pg_service.cancel_purchase({"id": pur_id})
        self.assertTrue(res_cancel.get('success'), "فشل إلغاء الفاتورة")

        with get_db_cursor() as cur:
            cur.execute("SELECT id, quantity, total_value, status FROM inventory WHERE name = %s;", (fabric_name,))
            inv_row_cancel = cur.fetchone()
            self.assertEqual(float(inv_row_cancel['quantity']), 0.0)
            self.assertEqual(float(inv_row_cancel['total_value']), 0.0)
            self.assertEqual(inv_row_cancel['status'], 'OutOfStock')

            cur.execute("SELECT * FROM inventory_transactions WHERE reference_id = %s AND transaction_type = 'PURCHASE_CANCEL';", (pur_id,))
            tx_cancel = cur.fetchone()
            self.assertIsNotNone(tx_cancel)

    def test_02_reconcile_inventory_governance_engine(self):
        """التحقق من عمل محرك التسوية الرقابي وتصحيح أي فوارق"""
        res = pg_service.reconcile_inventory_governance()
        self.assertTrue(res.get('success'))

        with get_db_cursor() as cur:
            cur.execute("""
                SELECT i.id, i.name, i.quantity, COALESCE(SUM(t.quantity), 0.0) as net_tx
                FROM inventory i
                LEFT JOIN inventory_transactions t ON i.id = t.inventory_id
                GROUP BY i.id, i.name, i.quantity;
            """)
            for r in cur.fetchall():
                qty = float(r['quantity'])
                net_tx = max(0.0, float(r['net_tx']))
                self.assertAlmostEqual(qty, net_tx, places=2)

if __name__ == '__main__':
    unittest.main()
