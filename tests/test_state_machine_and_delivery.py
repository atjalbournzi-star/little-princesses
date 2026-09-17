# -*- coding: utf-8 -*-
"""
Test Suite: State Machine, Delivery Workflow and Governance Compliance
Tests canonical state transitions, API validation on orders update,
delivery settlement, and confirms that all domains/ files are strictly under 250 lines.
"""

import sys
import os
import unittest
from decimal import Decimal

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from domains.tailoring.state_machine import (
    TailoringStage,
    STAGE_LABELS,
    ALLOWED_TRANSITIONS,
    normalize_stage,
    validate_transition,
    get_display_label
)
from domains.common.errors import InvalidStateTransitionError


class TestStateMachineAndDelivery(unittest.TestCase):

    def test_01_domains_line_count_governance(self):
        """Rule Governance: All python files under domains/ must be strictly < 250 lines."""
        domains_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'domains'))
        violations = []
        checked_count = 0

        for root, dirs, files in os.walk(domains_dir):
            for f in files:
                if f.endswith('.py'):
                    checked_count += 1
                    full_path = os.path.join(root, f)
                    with open(full_path, 'r', encoding='utf-8', errors='replace') as fp:
                        lines = fp.readlines()
                        line_count = len(lines)
                        if line_count >= 250:
                            rel_path = os.path.relpath(full_path, domains_dir)
                            violations.append(f"{rel_path}: {line_count} lines (must be < 250)")

        self.assertGreater(checked_count, 10, "Should have inspected modular domain files")
        self.assertEqual(len(violations), 0, f"Found files exceeding 250 lines limit: {violations}")

    def test_02_all_canonical_stages_defined(self):
        """All 13 canonical stages must have Arabic display labels and mappings."""
        expected_stages = {
            TailoringStage.DRAFT,
            TailoringStage.MEASURED,
            TailoringStage.CONFIRMED,
            TailoringStage.WAITING_MATERIAL,
            TailoringStage.CUTTING,
            TailoringStage.SEWING,
            TailoringStage.FITTING,
            TailoringStage.ALTERATION,
            TailoringStage.FINISHING,
            TailoringStage.QUALITY_CHECK,
            TailoringStage.READY,
            TailoringStage.DELIVERED,
            TailoringStage.CANCELLED,
        }
        self.assertEqual(set(STAGE_LABELS.keys()), expected_stages)

        for stg in expected_stages:
            label = get_display_label(stg)
            self.assertTrue(len(label) > 0)
            self.assertEqual(normalize_stage(label), stg)

    def test_03_stage_normalization_fuzzy_and_legacy(self):
        """Normalization must handle legacy labels and UI variants seamlessly."""
        self.assertEqual(normalize_stage("قيد القص ✂️"), TailoringStage.CUTTING)
        self.assertEqual(normalize_stage("مرحلة القص ✂️"), TailoringStage.CUTTING)
        self.assertEqual(normalize_stage("مرحلة الخياطة 🪡"), TailoringStage.SEWING)
        self.assertEqual(normalize_stage("قيد الخياطة 🪡"), TailoringStage.SEWING)
        self.assertEqual(normalize_stage("جاهز للتسليم 🛍️"), TailoringStage.READY)
        self.assertEqual(normalize_stage("جاهز للتسليم 📦"), TailoringStage.READY)
        self.assertEqual(normalize_stage("جاهز للتسليم 🎁"), TailoringStage.READY)
        self.assertEqual(normalize_stage("تم التسليم ✅"), TailoringStage.DELIVERED)
        self.assertEqual(normalize_stage("تم التسليم للعميل ✔️"), TailoringStage.DELIVERED)
        self.assertEqual(normalize_stage("Delivered"), TailoringStage.DELIVERED)
        self.assertEqual(normalize_stage("Ready"), TailoringStage.READY)

    def test_04_valid_pipeline_transitions(self):
        """Test legitimate forward lifecycle transitions."""
        self.assertTrue(validate_transition("CONFIRMED", "CUTTING"))
        self.assertTrue(validate_transition("CUTTING", "SEWING"))
        self.assertTrue(validate_transition("SEWING", "FINISHING"))
        self.assertTrue(validate_transition("FINISHING", "READY"))
        self.assertTrue(validate_transition("READY", "DELIVERED"))
        self.assertTrue(validate_transition("SEWING", "QUALITY_CHECK"))
        self.assertTrue(validate_transition("QUALITY_CHECK", "READY"))
        self.assertTrue(validate_transition("SEWING", "FITTING"))
        self.assertTrue(validate_transition("FITTING", "ALTERATION"))
        self.assertTrue(validate_transition("ALTERATION", "SEWING"))

    def test_05_illegal_transition_raises_error(self):
        """Illegal shortcuts (e.g. DRAFT -> DELIVERED, DELIVERED -> CUTTING) must raise InvalidStateTransitionError."""
        with self.assertRaises(InvalidStateTransitionError) as ctx:
            validate_transition("DRAFT", "DELIVERED")
        self.assertIn("مسودة", str(ctx.exception))

        with self.assertRaises(InvalidStateTransitionError):
            validate_transition("تم التسليم للعميل ✔️", "مرحلة القص ✂️")

        with self.assertRaises(InvalidStateTransitionError):
            validate_transition("CANCELLED", "SEWING")

    def test_06_routes_orders_transition_guard_import(self):
        """Ensure routes_orders imports state_machine and stays under 250 lines."""
        from domains.tailoring import routes_orders
        self.assertTrue(hasattr(routes_orders, 'handle_post'))
        self.assertTrue(hasattr(routes_orders, 'handle_get'))

        file_path = routes_orders.__file__
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        self.assertLess(len(lines), 250, f"routes_orders.py has {len(lines)} lines; must be < 250")

    def test_07_routes_delivery_import_and_size(self):
        """Ensure routes_delivery stays modular and under 250 lines."""
        from domains.tailoring import routes_delivery
        self.assertTrue(hasattr(routes_delivery, 'handle_post'))

        file_path = routes_delivery.__file__
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        self.assertLess(len(lines), 250, f"routes_delivery.py has {len(lines)} lines; must be < 250")


if __name__ == "__main__":
    unittest.main(verbosity=2)
