# tests/test_phase2_tailoring_engine.py
# Isolated ROLLBACK & RBAC Verification for Phase 2 Bespoke & MTO Backend Engine
# Architectural Standards: Strictly <= 220 lines | Zero Production Pollution

import os
import sys
import json
from decimal import Decimal
from contextlib import contextmanager
from flask import Flask

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pg_service
from routes import register_blueprints
from services.security import register_shield_error_handlers, WorkflowGuardError, translate_shield_error
from services.pg.db_pool import get_db_cursor
from services.pg.pg_tailoring_engine import (
    resolve_tailoring_axes, build_standard_size_spec, determine_initial_po_state,
    guard_production_order_ready_for_work, attach_cmt_custody_atomic, close_cmt_custody_on_delivery,
)


def test_routes_and_rbac():
    app = Flask(__name__)
    register_shield_error_handlers(app)
    register_blueprints(app)
    client = app.test_client()

    # Every new endpoint must reject unauthenticated requests with 401
    for method, url, body in [
        ('POST', '/api/production-orders/PO-1/bto-purchase', {}),
        ('POST', '/api/production-orders/PO-1/bto-return-leftover', {}),
        ('POST', '/api/production-orders/PO-1/issue-materials', {}),
        ('PUT', '/api/production-orders/PO-1/confirm-sizing', {}),
        ('GET', '/api/reports/order-profitability', None),
        ('POST', '/api/production-orders/PO-1/promote-to-catalog', {}),
    ]:
        resp = client.open(url, method=method, json=body) if body is not None else client.get(url)
        assert resp.status_code == 401, f"{method} {url} expected 401, got {resp.status_code}"
    print("[PASS] RBAC & route registration verified (401 on unauthenticated)")


def test_isolated_db_rollback_scenarios():
    with get_db_cursor(commit=False) as cur:
        # 1. Seed temporary standard_size_matrices + customer inside rollback tx
        cur.execute("""
            INSERT INTO public.standard_size_matrices (id, segment_code, segment_name_ar, size_label, chest_cm, waist_cm, dress_length_cm)
            VALUES ('SM-TEST-1', 'GIRLS_DRESS', 'فساتين بناتي', '8Y', 66, 60, 80)
            ON CONFLICT (id) DO NOTHING;
        """)
        cur.execute("""
            INSERT INTO public.customers (id, name, phone, category, status)
            VALUES ('CUST-TEST-1', 'عميل اختبار', '777000111', 'VIP', 'Active')
            ON CONFLICT (id) DO NOTHING;
        """)

        # 2. Standard Size Merge + Highlighted Changes
        spec = build_standard_size_spec(cur, 'SM-TEST-1', {'dress_length_cm': 5, 'waist_cm': -2})
        assert spec['standard_size_disclaimer'] is True
        assert spec['final_measurements']['dress_length_cm'] == 85.0
        assert spec['highlighted_changes']['dress_length_cm'] == {'original': 80.0, 'adjustment': 5.0, 'final': 85.0}

        # 3. Deferred Sizing Guard -> 409 WorkflowGuardError
        st, stg = determine_initial_po_state('DEFERRED', 'WORKSHOP_STOCK')
        assert st == 'AWAITING_MEASUREMENTS'
        try:
            guard_production_order_ready_for_work({'status': st, 'sizing_mode': 'DEFERRED'})
            assert False, "Expected WorkflowGuardError"
        except WorkflowGuardError as wge:
            code, _ = translate_shield_error(wge)
            assert code == 409, f"Expected 409, got {code}"

        # 4. Custom Bespoke + BTO initial state & axes
        ax = resolve_tailoring_axes(cur, {
            'item_mode': 'CUSTOM_BESPOKE', 'material_source': 'BUY_TO_ORDER',
            'sizing_mode': 'CUSTOM', 'custom_design_title': 'فستان ملكي خاص'
        })
        assert ax['item_mode'] == 'CUSTOM_BESPOKE'
        bto_st, _ = determine_initial_po_state(ax['sizing_mode'], ax['material_source'])
        assert bto_st == 'AWAITING_MATERIAL'

        # 5. CMT Custody zero-value creation & closure inside rollback tx
        cur.execute("""
            INSERT INTO public.orders (id, order_no, customer_id, currency, total_amount)
            VALUES ('ORD-TEST-1', 'ORD-TEST-1', 'CUST-TEST-1', 'YER', 50000);
        """)
        cur.execute("""
            INSERT INTO public.production_orders (id, production_order_no, order_id, customer_id, item_mode, material_source, wip_material_cost, wip_labor_cost)
            VALUES ('PO-TEST-1', 'PO-TEST-1', 'ORD-TEST-1', 'CUST-TEST-1', 'CUSTOM_BESPOKE', 'CUSTOMER_CMT', 0, 12000);
        """)
        # Insert custody directly without advancing number_sequences
        cur.execute("""
            INSERT INTO public.customer_material_custody (id, custody_no, order_id, production_order_id, customer_id, fabric_description, received_qty, unit, status)
            VALUES ('CMT-TEST-1', 'CMT-000001', 'ORD-TEST-1', 'PO-TEST-1', 'CUST-TEST-1', 'حرير طبيعي أزرق', 3.5, 'meter', 'RECEIVED');
        """)
        closed = close_cmt_custody_on_delivery(cur, 'ORD-TEST-1', leftover_returned_qty=0.5, cust_name='عميل اختبار')
        assert closed == ['CMT-000001']
        cur.execute("SELECT status, leftover_returned_qty, closed_at FROM public.customer_material_custody WHERE id = 'CMT-TEST-1';")
        c_row = cur.fetchone()
        assert c_row['status'] == 'CLOSED' and Decimal(str(c_row['leftover_returned_qty'])) == Decimal('0.5000') and c_row['closed_at'] is not None

        # Explicit rollback ensures zero DB pollution
        cur.connection.rollback()
    print("[PASS] Isolated DB rollback scenarios verified (Standard Size, Deferred 409, BTO state, CMT closure)")


def verify_zero_production_pollution():
    with get_db_cursor(commit=False) as cur:
        cur.execute("SELECT COUNT(*) AS cnt, COALESCE(SUM(current_balance), 0) AS bal FROM public.chart_of_accounts;")
        coa = cur.fetchone()
        assert coa['cnt'] == 35 and coa['bal'] == Decimal('0.0000'), f"COA polluted: {coa}"
        cur.execute("SELECT MAX(current_number) AS max_seq FROM public.number_sequences;")
        seq = cur.fetchone()['max_seq']
        assert seq == 0, f"number_sequences polluted: {seq}"
        for tbl in ('orders', 'order_items', 'production_orders', 'customer_material_custody', 'journal_entries', 'inventory_transactions'):
            cur.execute(f"SELECT COUNT(*) AS cnt FROM public.{tbl};")
            cnt = cur.fetchone()['cnt']
            assert cnt == 0, f"Table {tbl} polluted: {cnt} rows"
    print("[PASS] Zero Production Pollution verified: COA=(35, 0.0000), MAX(seq)=0, 0 transactional rows")


if __name__ == '__main__':
    test_routes_and_rbac()
    test_isolated_db_rollback_scenarios()
    verify_zero_production_pollution()
    print("ALL PHASE 2 VERIFICATION CHECKS PASSED!")
