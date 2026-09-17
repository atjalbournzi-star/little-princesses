# -*- coding: utf-8 -*-
"""
Architectural Verification Test Suite for Little Princesses ERP
Tests Domain Layer Isolation, Invariants, State Machine, Accounting Rules, and Event Decoupling.
"""

import sys
import os

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import unittest
from decimal import Decimal

import domains
from domains.common.errors import (
    DomainError,
    ValidationError,
    InvalidStateTransitionError,
    UnbalancedJournalEntryError
)
from domains.common.currency import currency_engine, normalize_currency_code
from domains.common.events import dispatcher, DomainEvent
from domains.tailoring.state_machine import (
    TailoringStage,
    normalize_stage,
    validate_transition,
    get_display_label
)
from domains.tailoring.service import tailoring_service
from domains.accounting.rules import (
    resolve_account_nature,
    compute_balance_delta,
    validate_balanced_lines
)
from domains.accounting.service import accounting_service
from domains.customers.service import customer_service
from domains.inventory.service import inventory_service
from domains.repositories.db_gateway import db_gateway

class TestDomainArchitecture(unittest.TestCase):

    def test_01_currency_engine_precision(self):
        """Test Decimal currency conversions and normalization."""
        self.assertEqual(normalize_currency_code("YER ﷼"), "YER")
        self.assertEqual(normalize_currency_code("SAR"), "SAR")
        self.assertEqual(normalize_currency_code("USD $"), "USD")

        # Decimal precision test: 100 SAR at 142.0 rate should equal exactly 14,200 YER
        res = currency_engine.to_base(Decimal("100.00"), "SAR")
        self.assertEqual(res["base_amount"], Decimal("14200.0000"))
        self.assertIsInstance(res["base_amount"], Decimal)

        # Reverse conversion
        target_amt = currency_engine.from_base(Decimal("14200.0000"), "SAR")
        self.assertEqual(target_amt, Decimal("100.0000"))

    def test_02_tailoring_state_machine_normalization(self):
        """Test normalization of status strings from various UI and database representations."""
        self.assertEqual(normalize_stage("قيد الخياطة 🪡"), TailoringStage.SEWING)
        self.assertEqual(normalize_stage("قيد الخياطة"), TailoringStage.SEWING)
        self.assertEqual(normalize_stage("Sewing"), TailoringStage.SEWING)
        self.assertEqual(normalize_stage("مرحلة القص ✂️"), TailoringStage.CUTTING)
        self.assertEqual(normalize_stage("جاهز للتسليم 🎁"), TailoringStage.READY)
        self.assertEqual(normalize_stage("تم التسليم للعميل ✔️"), TailoringStage.DELIVERED)

    def test_03_tailoring_allowed_and_forbidden_transitions(self):
        """Test state machine guards against invalid state jumps."""
        # Valid progression: Confirmed -> Cutting -> Sewing -> Quality Check -> Ready -> Delivered
        self.assertTrue(validate_transition(TailoringStage.CONFIRMED, TailoringStage.CUTTING))
        self.assertTrue(validate_transition(TailoringStage.CUTTING, TailoringStage.SEWING))
        self.assertTrue(validate_transition(TailoringStage.SEWING, TailoringStage.QUALITY_CHECK))
        self.assertTrue(validate_transition(TailoringStage.QUALITY_CHECK, TailoringStage.READY))
        self.assertTrue(validate_transition(TailoringStage.READY, TailoringStage.DELIVERED))

        # Forbidden jump: Draft -> Delivered directly must be rejected
        with self.assertRaises(InvalidStateTransitionError):
            validate_transition(TailoringStage.DRAFT, TailoringStage.DELIVERED)

        # Forbidden jump: Delivered -> Cutting must be rejected
        with self.assertRaises(InvalidStateTransitionError):
            validate_transition(TailoringStage.DELIVERED, TailoringStage.CUTTING)

    def test_04_double_entry_balance_invariants(self):
        """Test accounting rules enforce strict double-entry balance."""
        balanced_lines = [
            {"account_id": "101", "debit": Decimal("500.00"), "credit": Decimal("0.0")},
            {"account_id": "401", "debit": Decimal("0.0"), "credit": Decimal("500.00")}
        ]
        deb, crd = validate_balanced_lines(balanced_lines, "JV-TEST-BAL")
        self.assertEqual(deb, crd)

        # Unbalanced lines must raise error
        unbalanced_lines = [
            {"account_id": "101", "debit": Decimal("500.00"), "credit": Decimal("0.0")},
            {"account_id": "401", "debit": Decimal("0.0"), "credit": Decimal("499.90")}
        ]
        with self.assertRaises(UnbalancedJournalEntryError):
            validate_balanced_lines(unbalanced_lines, "JV-TEST-UNBAL")

    def test_05_account_natures_and_balance_deltas(self):
        """Test that Assets/Expenses and Liabilities/Equity/Revenue delta calculations are correct."""
        self.assertEqual(resolve_account_nature("101"), "DEBIT")   # Asset
        self.assertEqual(resolve_account_nature("201"), "CREDIT")  # Liability
        self.assertEqual(resolve_account_nature("301"), "CREDIT")  # Equity
        self.assertEqual(resolve_account_nature("401"), "CREDIT")  # Revenue
        self.assertEqual(resolve_account_nature("501"), "DEBIT")   # Expense

        # For Asset (Debit nature): Debit movement increases balance (+)
        self.assertEqual(compute_balance_delta("DEBIT", True, Decimal("100")), Decimal("100"))
        # For Asset: Credit movement decreases balance (-)
        self.assertEqual(compute_balance_delta("DEBIT", False, Decimal("100")), Decimal("-100"))
        # For Liability (Credit nature): Credit movement increases balance (+)
        self.assertEqual(compute_balance_delta("CREDIT", False, Decimal("100")), Decimal("100"))
        # For Liability: Debit movement decreases balance (-)
        self.assertEqual(compute_balance_delta("CREDIT", True, Decimal("100")), Decimal("-100"))

    def test_06_domain_event_decoupling(self):
        """Test domain event pub/sub without tight module coupling."""
        received_events = []

        def sample_accounting_listener(event):
            received_events.append(event)

        dispatcher.subscribe("STOCK_MOVEMENT_RECORDED", sample_accounting_listener)

        # Trigger domain action from inventory
        inventory_service.record_stock_movement(
            item_id="FAB-SILK-01",
            movement_type="OUT",
            qty=3.5,
            reference_id="ORD-2026-TEST"
        )

        self.assertEqual(len(received_events), 1)
        self.assertEqual(received_events[0].name, "STOCK_MOVEMENT_RECORDED")
        self.assertEqual(received_events[0].payload["item_id"], "FAB-SILK-01")

        # Clean up
        dispatcher.unsubscribe("STOCK_MOVEMENT_RECORDED", sample_accounting_listener)

    def test_07_db_gateway_initialization(self):
        """Test DB Gateway initializes and exposes unified interface."""
        self.assertIsNotNone(db_gateway)
        self.assertIn(db_gateway.mode, ("cloud", "local", "postgres", "sqlite"))

if __name__ == "__main__":
    unittest.main(verbosity=2)
