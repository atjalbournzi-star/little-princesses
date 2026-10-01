# Little Princesses ERP - Architecture & Coding Standards

1. **Strict File Length Limit**:
   - No single source file must ever exceed 220 lines (including imports, comments, and empty lines).
   - Target range: 80 - 180 lines per file.
   - If a file approaches 200 lines, immediately extract business logic into hooks, helpers into utils, or split UI into sub-components.

2. **Modular Directory Pattern (Frontend)**:
   - `src/features/[feature]/utils/`: Pure helper functions, formatting, calculations, and message templates.
   - `src/features/[feature]/hooks/`: `use[Feature]Data.js` (fetching/filtering) and `use[Feature]Actions.js` (business logic/mutations).
   - `src/features/[feature]/components/`: Modular UI (Header, FilterBar, Tables, Cards, Modals).
   - Complex Modals and heavy Tables must have their own isolated component file.
   - `src/features/[feature].jsx`: Strict orchestrator / layout coordinator (100–150 lines max).

3. **Backend & Shared Services Pattern**:
   - Heavy service files (e.g., `pg_service.py`, `api.js`) must be split into domain-driven sub-modules within a dedicated folder (e.g., `services/pg/`).
   - The root file must remain as a lightweight Facade re-exporting functions to ensure zero breaking changes for existing API consumers.
   - Multi-table operations (vouchers, inventory moves, journal lines) must strictly use atomic database transactions with automatic rollback on error.

4. **Browser Runtime & Global Scope Contract**:
   - Every modular sub-file must export to `window` using a unique feature prefix (e.g., `window.MarketingHeader`, `window.AccountsTable`) to prevent global namespace collisions.
   - The main orchestrator must safely resolve dependencies with fallbacks (`window.[Name] || ...`).
   - `index.html` imports must strictly respect execution order: `utils` -> `services` -> `hooks` -> `components` -> `Feature.jsx`.
   - Any added or updated script in `index.html` must include an updated cache-busting query (e.g., `?v=192`).

5. **Zero Regressions & Financial Governance**:
   - Preserve existing State, Props, and DB schema contracts without renaming or losing features.
   - Reuse core shared engines (`CurrencyService`, `AccountingEngine`) with zero duplication.
   - Strict Monetary Precision: No raw floating-point math for currency; use strict accounting rounding and integer units where applicable.
   - Absolute prohibition of hard deletes on financial, transactional, and audit records (use soft flags / audit logs).

6. **Mandatory Automated & Runtime Verification**:
   - Empirical line-count verification via PowerShell is required before marking any task as complete (all business files < 220 lines).
   - Automated line-count excludes vendor bundles (*.min.js), database seed/migration scripts, and backups.
   - Runtime health check: Backend responding, browser console clean (zero red errors/ReferenceErrors), and zero Babel runtime syntax crashes.

