# -*- coding: utf-8 -*-
"""
Automated Governance Scenario Verification Test Suite
Tests enforcement of the 10 critical governance guardrails for Little Princesses ERP.
"""

import sys
import os
import re

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import unittest

class GovernanceViolation(Exception):
    def __init__(self, rule_id: str, message: str):
        super().__init__(f"[{rule_id}] {message}")
        self.rule_id = rule_id
        self.message = message

class GovernanceValidator:
    """Automated guardrail validator enforcing Little Princesses ERP Governance."""

    @staticmethod
    def validate_engine_creation(engine_name: str, existing_engines: list):
        name_lower = engine_name.lower()
        core_keywords = ["accounting", "inventory", "customer", "order", "currency", "payment", "invoice", "payroll", "tailor"]
        for ex in existing_engines:
            ex_lower = ex.lower()
            if name_lower in ex_lower or ex_lower in name_lower:
                raise GovernanceViolation("GOV-03", f"Duplicate Engine Forbidden: '{engine_name}' conflicts with existing '{ex}'.")
            for kw in core_keywords:
                if kw in name_lower and kw in ex_lower:
                    raise GovernanceViolation("GOV-03", f"Duplicate Engine Forbidden: Domain keyword '{kw}' in '{engine_name}' conflicts with existing '{ex}'. Reuse or extend existing engine.")

    @staticmethod
    def validate_balance_mutation(query_or_action: str):
        pattern = r"UPDATE\s+(customers|suppliers|accounts)\s+SET\s+.*balance\s*="
        if re.search(pattern, query_or_action, re.IGNORECASE) and "transaction" not in query_or_action.lower():
            raise GovernanceViolation("GOV-05", "Direct Balance Mutation Forbidden: Balances must only be derived from posted journal transactions.")

    @staticmethod
    def validate_deletion(query_or_action: str, is_financial: bool = False):
        if is_financial or any(table in query_or_action.lower() for table in ["invoice", "payment", "voucher", "journal"]):
            if "DELETE FROM" in query_or_action.upper():
                raise GovernanceViolation("GOV-06", "Hard Delete Forbidden: Financial records cannot be deleted. Use Reversal, Void, or Soft Delete.")

    @staticmethod
    def validate_source_code_secrets(code_snippet: str):
        secret_patterns = [
            r"api_key\s*=\s*['\"][A-Za-z0-9_\-]{20,}['\"]",
            r"password\s*=\s*['\"][^'\"]+['\"]",
            r"bearer\s+[A-Za-z0-9_\-\.]{30,}",
            r"postgresql://[^:]+:[^@]+@"
        ]
        for pattern in secret_patterns:
            if re.search(pattern, code_snippet, re.IGNORECASE):
                raise GovernanceViolation("GOV-20", "Hardcoded Secret Forbidden: Credentials must be loaded from environment variables (.env).")

    @staticmethod
    def validate_agent_scope(task_scope: str, file_to_modify: str):
        scope = task_scope.lower()
        f = file_to_modify.lower().replace("\\", "/")
        if "ui" in scope and ("accounting" in f or "pg_service" in f):
            raise GovernanceViolation("GOV-22", f"Scope Discipline Violation: Agent with scope '{task_scope}' is prohibited from modifying '{file_to_modify}'.")

    @staticmethod
    def validate_dod_testing(has_run_tests: bool, test_exit_code: int):
        if not has_run_tests:
            raise GovernanceViolation("GOV-11", "Definition of Done Violation: Critical changes require automated test execution.")
        if test_exit_code != 0:
            raise GovernanceViolation("GOV-28", "Definition of Done Violation: Task cannot be declared complete while tests are failing.")

    @staticmethod
    def validate_authorization_layer(has_backend_auth: bool, is_sensitive_action: bool):
        if is_sensitive_action and not has_backend_auth:
            raise GovernanceViolation("GOV-08", "Backend Authorization Required: Sensitive actions cannot rely solely on frontend UI permission hiding.")

    @staticmethod
    def validate_database_schema_change(ddl_statement: str, is_versioned_migration: bool):
        if any(keyword in ddl_statement.upper() for keyword in ["DROP TABLE", "ALTER TABLE", "CREATE TABLE"]):
            if not is_versioned_migration:
                raise GovernanceViolation("GOV-10", "Unversioned DDL Forbidden: Schema modifications must be performed via versioned, reversible migration files.")

    @staticmethod
    def validate_single_responsibility(class_name: str, responsibility_domains: list):
        if len(set(responsibility_domains)) > 1:
            raise GovernanceViolation("GOV-18", f"God Object Forbidden: Class '{class_name}' spans multiple domains ({responsibility_domains}). Split into single-responsibility services.")

class TestGovernanceScenarios(unittest.TestCase):

    def test_scenario_01_prevent_duplicate_accounting_engine(self):
        """Scenario 1: Agent wants to create new Accounting Engine when one exists."""
        existing = ["domains.accounting", "domains.common.currency_engine"]
        with self.assertRaises(GovernanceViolation) as ctx:
            GovernanceValidator.validate_engine_creation("NewAccountingEngineService", existing)
        self.assertEqual(ctx.exception.rule_id, "GOV-03")

    def test_scenario_02_prevent_direct_customer_balance_mutation(self):
        """Scenario 2: Agent wants to modify customer balance directly."""
        illegal_sql = "UPDATE customers SET current_balance = 5000 WHERE id = 'CUST-1001';"
        with self.assertRaises(GovernanceViolation) as ctx:
            GovernanceValidator.validate_balance_mutation(illegal_sql)
        self.assertEqual(ctx.exception.rule_id, "GOV-05")

    def test_scenario_03_prevent_hard_delete_paid_invoice(self):
        """Scenario 3: Agent wants to delete a paid invoice."""
        illegal_delete = "DELETE FROM invoices WHERE invoice_no = 'INV-2026-001';"
        with self.assertRaises(GovernanceViolation) as ctx:
            GovernanceValidator.validate_deletion(illegal_delete, is_financial=True)
        self.assertEqual(ctx.exception.rule_id, "GOV-06")

    def test_scenario_04_prevent_api_key_in_source_code(self):
        """Scenario 4: Agent wants to embed an API key inside code."""
        code_with_secret = "api_key = 'sk_live_99283748291039485726152'"
        with self.assertRaises(GovernanceViolation) as ctx:
            GovernanceValidator.validate_source_code_secrets(code_with_secret)
        self.assertEqual(ctx.exception.rule_id, "GOV-20")

    def test_scenario_05_prevent_cross_scope_modification(self):
        """Scenario 5: UI Agent wants to modify core accounting rules."""
        with self.assertRaises(GovernanceViolation) as ctx:
            GovernanceValidator.validate_agent_scope(
                task_scope="UI Component Styling",
                file_to_modify="domains/accounting/rules.py"
            )
        self.assertEqual(ctx.exception.rule_id, "GOV-22")

    def test_scenario_06_prevent_skipping_tests(self):
        """Scenario 6: Agent wants to complete task without executing tests."""
        with self.assertRaises(GovernanceViolation) as ctx:
            GovernanceValidator.validate_dod_testing(has_run_tests=False, test_exit_code=0)
        self.assertEqual(ctx.exception.rule_id, "GOV-11")

    def test_scenario_07_prevent_frontend_only_permission(self):
        """Scenario 7: Agent wants to implement sensitive action with frontend-only hiding."""
        with self.assertRaises(GovernanceViolation) as ctx:
            GovernanceValidator.validate_authorization_layer(has_backend_auth=False, is_sensitive_action=True)
        self.assertEqual(ctx.exception.rule_id, "GOV-08")

    def test_scenario_08_prevent_unversioned_db_mutation(self):
        """Scenario 8: Agent wants to run raw DDL without migration script."""
        raw_ddl = "DROP TABLE payments;"
        with self.assertRaises(GovernanceViolation) as ctx:
            GovernanceValidator.validate_database_schema_change(raw_ddl, is_versioned_migration=False)
        self.assertEqual(ctx.exception.rule_id, "GOV-10")

    def test_scenario_09_prevent_god_service_creation(self):
        """Scenario 9: Agent wants to create a massive multi-domain service."""
        with self.assertRaises(GovernanceViolation) as ctx:
            GovernanceValidator.validate_single_responsibility(
                class_name="MasterSuperManager",
                responsibility_domains=["accounting", "inventory", "authentication"]
            )
        self.assertEqual(ctx.exception.rule_id, "GOV-18")

    def test_scenario_10_prevent_completion_with_failing_tests(self):
        """Scenario 10: Agent wants to declare task complete while test suite exits with error."""
        with self.assertRaises(GovernanceViolation) as ctx:
            GovernanceValidator.validate_dod_testing(has_run_tests=True, test_exit_code=1)
        self.assertEqual(ctx.exception.rule_id, "GOV-28")

if __name__ == "__main__":
    unittest.main(verbosity=2)
