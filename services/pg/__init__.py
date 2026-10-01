"""
Little Princesses ERP - PostgreSQL Domain Services Package
Modular micro-services layer connecting to PostgreSQL / Supabase.
"""

from .db_pool import (
    get_db_cursor, execute_query, clean_num, clean_str,
    to_decimal, generate_id, now_iso, today_str, ensure_base_system_seed
)
from .account_resolver import resolve_exchange_rate, resolve_account_id
from .pg_customers import get_customers, add_customer, delete_customer
from .pg_products import (
    get_products, add_product, delete_product,
    get_bom_models, save_bom_model, delete_bom_model
)
from .pg_inventory import (
    get_inventory, add_or_update_inventory,
    update_inventory_qty, adjust_inventory, delete_inventory
)
from .pg_orders import get_orders, add_order, update_order, delete_order
from .pg_purchases import (
    get_purchases, add_purchase, delete_purchase,
    purge_purchases, cancel_purchase, reconcile_inventory_governance
)
from .pg_suppliers import get_suppliers, add_supplier, delete_supplier
from .pg_vouchers import get_vouchers, add_voucher, delete_voucher
from .pg_receipt_sync import sync_advance_receipt, recalculate_advance_deposits
from .pg_expenses import get_expenses, add_expense, delete_expense
from .pg_accounts import (
    get_accounts, add_account, delete_account,
    reset_clean_chart_of_accounts, get_currencies, update_exchange_rate
)
from .pg_journal import get_journal_entries, add_journal_entry, delete_journal_entry
from .pg_factory import (
    get_factory, update_factory, delete_factory_order,
    process_stock_inflow, reverse_stock_inflow,
    deliver_and_settle_order, reverse_order_delivery,
    get_factory_analytics, get_production_order_for_job_card,
    submit_tailor_stage_completion, reject_tailor_job_and_rework,
    approve_tailor_commission_and_qc, get_fitting_alterations,
    add_fitting_alteration, update_fitting_alteration_status,
    get_atelier_watchdog, scan_to_deliver_order,
    get_tailor_commissions, get_tailor_payout_summary,
    get_tailor_unpaid_pieces, get_tailor_payout_vouchers,
    post_tailor_payout_voucher
)
from .pg_payroll import (
    get_employees, add_employee, delete_employee,
    add_advance, get_advances, get_payroll,
    update_payroll_record, calculate_payroll,
    add_payroll_batch, post_payroll
)
from .pg_quality import (
    get_quality_inspections, add_quality_inspection,
    get_quality_defects, add_quality_defect,
    get_quality_feedback, add_quality_feedback,
    get_quality_complaints, add_quality_complaint,
    get_quality_returns, add_quality_return,
    get_quality_actions, add_quality_action,
    get_quality_checkpoints, save_quality_checkpoint,
    get_quality_settings, save_quality_settings,
    ensure_quality_seed_data, get_quality_dashboard_pg,
    get_quality_summary
)
from .pg_auth import get_users_pg, sync_user_to_pg
from .pg_audit import log_audit_event, get_audit_logs, add_audit_log
from .pg_system import (
    get_system_settings, save_system_settings,
    get_backup_status, create_backup_snapshot,
    restore_backup_data, clear_all_transactional_data
)
from .pg_dashboard import get_dashboard_stats
from .pg_customer_tracking import get_customer_order_tracking, confirm_customer_fitting
from .dispatcher import dispatch_action
from .action_map import ACTION_HANDLERS
