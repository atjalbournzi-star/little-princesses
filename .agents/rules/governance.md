---
trigger: always_on
description: Mandatory software and financial governance guardrails for Little Princesses ERP.
---

# 🛡️ Mandatory Governance Guardrails for AI Agents

1. **Scope Discipline:** Agents must never touch files or domains outside their assigned task.
2. **No Duplicate Engines:** Always search existing implementations before creating new services or utilities.
3. **Financial Immutability:** Never modify balances directly (`balance = X` forbidden). Always create balanced journal entries.
4. **No Hard Deletes:** Never `DELETE` posted financial transactions, invoices, or vouchers. Use reversals (`Void`/`Reversal`) and audit logs.
5. **No Secrets in Code:** Never place API keys, passwords, or tokens in source code. Use environment variables.
6. **Decimal Only:** Never use `Float` for money. Always use `Decimal` with 4 decimal places.
7. **Server-Side Authorization:** Never rely solely on frontend UI hiding for permissions. Enforce in backend.
8. **Definition of Done:** Never declare a task complete without running empirical tests and checking runtime health.
