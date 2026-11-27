# tests/test_concurrency_hardening.py
# Real Concurrency, ACID Atomicity, Deadlock-Free & Idempotency Verification Suite
# Zero Residual Test Data Policy: Verifies clean DB before & restores clean DB in finally.

import os
import sys
import uuid
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app
from db_client import get_db_cursor
from services.pg.pg_orders_write import add_order
from services.pg.pg_journal import add_journal_entry
from services.pg.pg_sequences import get_next_sequence_number
from services.security.token_auth import generate_auth_token

TRANS_TABLES = [
    "journal_entry_lines", "journal_entries", "payments",
    "inventory_transactions", "order_items", "orders",
    "warehouse_stock", "product_variants", "inventory", "idempotency_keys"
]


def assert_clean_db(cur, label="Pre-check"):
    for t in TRANS_TABLES:
        cur.execute(f"SELECT COUNT(*) AS c FROM public.{t};")
        cnt = int(cur.fetchone()["c"])
        assert cnt == 0, f"[{label}] Expected 0 rows in {t}, found {cnt}"
    cur.execute("SELECT COALESCE(SUM(current_balance), 0) AS s FROM public.chart_of_accounts;")
    bal_sum = Decimal(str(cur.fetchone()["s"]))
    assert bal_sum == Decimal("0.0000"), f"[{label}] Expected SUM(current_balance)=0.0000, got {bal_sum}"
    cur.execute("SELECT COALESCE(MAX(current_number), 0) AS m FROM public.number_sequences;")
    max_seq = int(cur.fetchone()["m"])
    assert max_seq == 0, f"[{label}] Expected MAX(current_number)=0, got {max_seq}"


def cleanup_test_data(test_start_ts):
    with get_db_cursor(commit=True) as cur:
        tbls = ", ".join(f"public.{t}" for t in TRANS_TABLES)
        cur.execute(f"TRUNCATE TABLE {tbls} RESTART IDENTITY CASCADE;")
        cur.execute("DELETE FROM public.audit_logs WHERE created_at >= %s;", (test_start_ts,))
        cur.execute("UPDATE public.chart_of_accounts SET opening_balance = 0.0000, current_balance = 0.0000;")
        cur.execute("UPDATE public.number_sequences SET current_number = 0;")
        cur.execute("UPDATE public.customers SET current_balance = 0.0000 WHERE id = 'CUST-GENERAL';")


def run_concurrency_suite():
    with get_db_cursor(commit=False) as cur:
        assert_clean_db(cur, "Pre-flight")
        cur.execute("SELECT CURRENT_TIMESTAMP AS ts;")
        test_start_ts = cur.fetchone()["ts"]

    try:
        # 1. Concurrent Stock Deduction (qty=1, 2 concurrent POS orders of qty=1)
        inv_id, var_id = "TEST-INV-01", "TEST-VAR-01"
        with get_db_cursor(commit=True) as cur:
            cur.execute("SELECT id FROM public.warehouses WHERE is_active = TRUE ORDER BY id ASC LIMIT 1;")
            wh_id = cur.fetchone()["id"]
            cur.execute("""
                INSERT INTO public.inventory (id, item_code, name, type, unit, quantity, reserved_qty, unit_cost, currency, location, status)
                VALUES (%s, %s, 'فستان اختبار تزامن', 'Ready', 'قطعة', 1.0, 0.0, 5000.0, 'YER', %s, 'Available');
            """, (inv_id, inv_id, wh_id))
            cur.execute("""
                INSERT INTO public.warehouse_stock (id, warehouse_id, inventory_id, quantity, reserved_qty)
                VALUES (%s, %s, %s, 1.0, 0.0);
            """, (f"WS-{inv_id}-{wh_id}", wh_id, inv_id))
            cur.execute("""
                INSERT INTO public.product_variants (id, inventory_id, warehouse_id, age_size, color_name, sku, barcode, stock_qty, cost_price, selling_price, is_active)
                VALUES (%s, %s, %s, '6-8Y', 'وردي', 'TEST-SKU-1', 'TEST-BC-1', 1.0, 5000.0, 12000.0, TRUE);
            """, (var_id, inv_id, wh_id))

        def _pos_attempt(idx):
            try:
                res = add_order({
                    "is_pos": True, "order_type": "pos", "warehouse_id": wh_id,
                    "customer_id": "CUST-GENERAL", "payment_method": "نقد (كاش)",
                    "items": [{"inventory_id": inv_id, "variant_id": var_id, "product_name": "فستان اختبار تزامن", "quantity": 1, "unit_price": 12000}]
                })
                return ("ok", res.get("order_no"))
            except Exception as exc:
                return ("err", str(exc))

        with ThreadPoolExecutor(max_workers=2) as ex:
            pos_results = list(ex.map(_pos_attempt, [1, 2]))
        ok_cnt = sum(1 for s, _ in pos_results if s == "ok")
        err_cnt = sum(1 for s, _ in pos_results if s == "err")
        assert ok_cnt == 1 and err_cnt == 1, f"Stock race failed: {pos_results}"
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT quantity FROM public.inventory WHERE id = %s;", (inv_id,))
            assert Decimal(str(cur.fetchone()["quantity"])) == Decimal("0.0000"), "Inventory went negative or wrong!"
        print("✅ Test 1 Passed: Concurrent stock deduction (1 succeeded, 1 rejected, stock=0)")

        # 2. Mid-Transaction Failure -> 100% ROLLBACK
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT COUNT(*) AS c FROM public.journal_entries;")
            jv_before = int(cur.fetchone()["c"])
            cur.execute("SELECT COALESCE(SUM(current_balance), 0) AS s FROM public.chart_of_accounts;")
            bal_before = Decimal(str(cur.fetchone()["s"]))

        try:
            with get_db_cursor(commit=True) as cur:
                cur.execute("""
                    INSERT INTO public.journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, currency, exchange_rate, status)
                    VALUES ('JV-FAIL-1', 'JV-FAIL-1', CURRENT_DATE, 'اختبار فشل', 'ACC-101-1', 'ACC-401', 1000, 1000, 1000, 'Manual', 'YER', 1.0, 'Posted');
                """)
                cur.execute("""
                    INSERT INTO public.journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES ('JVL-F1', 'JV-FAIL-1', 'ACC-101-1', 'د', 1000, 0, 1000, 0),
                           ('JVL-F2', 'JV-FAIL-1', 'ACC-401', 'د', 0, 1000, 0, 1000);
                """)
                raise RuntimeError("Simulated mid-transaction crash")
        except RuntimeError:
            pass

        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT COUNT(*) AS c FROM public.journal_entries;")
            assert int(cur.fetchone()["c"]) == jv_before, "ROLLBACK failed: residual journal_entry!"
            cur.execute("SELECT COALESCE(SUM(current_balance), 0) AS s FROM public.chart_of_accounts;")
            assert Decimal(str(cur.fetchone()["s"])) == bal_before, "ROLLBACK failed: balance mutated!"
        print("✅ Test 2 Passed: Mid-transaction failure rolled back 100% (0 residual rows)")

        # 3. Concurrent Idempotency-Key via Flask test_client
        app.testing = True
        token = generate_auth_token({"id": "USR-000001", "username": "admin", "role": "admin"})
        idem_key = f"IDEM-TEST-{uuid.uuid4().hex[:10]}"
        jv_payload = {
            "date": "2026-11-27", "description": "قيد اختبار منع التكرار",
            "debit_account_id": "ACC-101-1", "credit_account_id": "ACC-401", "amount": 2500
        }
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT COUNT(*) AS c FROM public.journal_entries;")
            jv_pre_idem = int(cur.fetchone()["c"])

        def _post_idem(_):
            c = app.test_client()
            return c.post("/api/journal", json=jv_payload, headers={"Authorization": f"Bearer {token}", "Idempotency-Key": idem_key}).status_code

        with ThreadPoolExecutor(max_workers=2) as ex:
            codes = list(ex.map(_post_idem, [1, 2]))
        assert 200 in codes, f"Expected at least one 200, got {codes}"
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT COUNT(*) AS c FROM public.journal_entries;")
            jv_post_idem = int(cur.fetchone()["c"])
            assert jv_post_idem == jv_pre_idem + 1, f"Idempotency failed: created {jv_post_idem - jv_pre_idem} entries!"
            cur.execute("SELECT state FROM public.idempotency_keys WHERE idempotency_key = %s;", (idem_key,))
            assert cur.fetchone()["state"] == "completed"
        print(f"✅ Test 3 Passed: Concurrent Idempotency-Key ({codes}) -> exactly 1 journal entry")

        # 4. Concurrent Atomic Sequence Generation
        def _next_seq(_):
            with get_db_cursor(commit=True) as cur:
                return get_next_sequence_number(cur, "ORD", fallback_prefix="ORD-")

        with ThreadPoolExecutor(max_workers=4) as ex:
            seqs = list(ex.map(_next_seq, range(4)))
        assert len(set(seqs)) == 4, f"Sequence collision detected: {seqs}"
        print(f"✅ Test 4 Passed: 4 concurrent sequences unique: {seqs}")

        # 5. Concurrent Opposite-Order Journal Entries (Deadlock Prevention)
        def _opp_jv(idx):
            d_acc, c_acc = ("ACC-101-1", "ACC-401") if idx == 1 else ("ACC-401", "ACC-101-1")
            return add_journal_entry({"date": "2026-11-27", "description": f"Deadlock test {idx}", "debit_account_id": d_acc, "credit_account_id": c_acc, "amount": 500})

        with ThreadPoolExecutor(max_workers=2) as ex:
            dl_res = list(ex.map(_opp_jv, [1, 2]))
        assert len(dl_res) == 2, "Deadlock test failed"
        print("✅ Test 5 Passed: Concurrent opposite-order journal entries completed with 0 deadlocks")

    finally:
        cleanup_test_data(test_start_ts)
        with get_db_cursor(commit=False) as cur:
            assert_clean_db(cur, "Post-cleanup")
        print("🧹 Post-cleanup Verified: 0 transactional rows, SUM(current_balance)=0.0000, MAX(current_number)=0")


if __name__ == "__main__":
    run_concurrency_suite()
