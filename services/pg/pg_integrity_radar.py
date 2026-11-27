# services/pg/pg_integrity_radar.py
# Real-Time Accounting Integrity Radar & Golden Equations (IAS 2 WIP Upgrade)
# Architectural Standards: Strictly < 220 lines per file

import datetime
from decimal import Decimal
from db_client import get_db_cursor


def check_accounting_integrity():
    """
    Executes live read-only verification of the Five Golden Accounting Equations
    directly against PostgreSQL state. Returns structured radar report.
    """
    with get_db_cursor(commit=False) as cur:
        # ── Equation 1: Balance Sheet (Assets = Liabilities + Equity + Net Profit) ──
        cur.execute("SELECT account_type, COALESCE(SUM(current_balance), 0) as total FROM public.accounts WHERE is_group = false GROUP BY account_type;")
        bal_map = {str(r['account_type']).strip(): Decimal(str(r['total'])) for r in cur.fetchall()}
        assets = bal_map.get('أصول', Decimal('0'))
        liabilities = bal_map.get('خصوم', Decimal('0'))
        equity = bal_map.get('حقوق ملكية', Decimal('0'))
        revenue = bal_map.get('إيرادات', Decimal('0'))
        expenses = bal_map.get('مصروفات', Decimal('0')) + bal_map.get('تكلفة المبيعات', Decimal('0'))
        right_side_bs = liabilities + equity + (revenue - expenses)
        diff_bs = abs(assets - right_side_bs)
        status_bs = 'HEALTHY' if diff_bs <= Decimal('0.001') else ('WARNING' if diff_bs <= Decimal('10') else 'CRITICAL')

        # ── Equation 2: Double-Entry Journal Lines Balance (|Debit - Credit| == 0) ──
        cur.execute("""
            SELECT COALESCE(SUM(COALESCE(l.debit_base, l.debit, 0)), 0) as total_debit,
                   COALESCE(SUM(COALESCE(l.credit_base, l.credit, 0)), 0) as total_credit
            FROM public.journal_entry_lines l
            JOIN public.journal_entries j ON (l.entry_id = j.id OR l.entry_id = j.entry_no)
            WHERE j.status IN ('Posted', 'Reversed');
        """)
        j_row = cur.fetchone()
        tot_debit = Decimal(str(j_row.get('total_debit') or 0))
        tot_credit = Decimal(str(j_row.get('total_credit') or 0))
        diff_journal = abs(tot_debit - tot_credit)
        status_journal = 'HEALTHY' if diff_journal == Decimal('0.00') else 'CRITICAL'

        # ── Equation 3: Inventory Reconciliation (Physical Stock Valuation = Accounts 105 Excl WIP) ──
        cur.execute("SELECT COALESCE(SUM(ws.quantity * COALESCE(i.unit_cost, 0)), 0) as stock_valuation FROM public.warehouse_stock ws JOIN public.inventory i ON ws.inventory_id = i.id;")
        stk_val = Decimal(str(cur.fetchone().get('stock_valuation') or 0))
        if stk_val == Decimal('0'):
            cur.execute("SELECT COALESCE(SUM(quantity * COALESCE(unit_cost, 0)), 0) as inv_val FROM public.inventory;")
            stk_val = Decimal(str(cur.fetchone().get('inv_val') or 0))

        cur.execute("""
            SELECT COALESCE(SUM(current_balance), 0) as inv_acc_balance
            FROM public.accounts
            WHERE (account_category = 'Inventory' OR account_code LIKE '105%' OR account_code = '105')
              AND account_code NOT IN ('105.05', 'ACC-105-05') AND id != 'ACC-105-05' AND is_group = false;
        """)
        inv_acc_bal = Decimal(str(cur.fetchone().get('inv_acc_balance') or 0))
        diff_inventory = abs(stk_val - inv_acc_bal)
        status_inventory = 'HEALTHY' if diff_inventory <= Decimal('0.01') else ('WARNING' if diff_inventory <= Decimal('10') else 'CRITICAL')

        # ── Equation 4: Piece-Rate Wages Reconciliation (Unpaid Piece Rates = ACC-203) ──
        cur.execute("SELECT COALESCE(SUM(piece_rate_amount * pieces_count), 0) as unpaid_piece_rates FROM public.piece_rate_logs WHERE payment_status IN ('unpaid', 'pending', 'approved', 'Accrued');")
        unpaid_pr = Decimal(str(cur.fetchone().get('unpaid_piece_rates') or 0))

        cur.execute("SELECT COALESCE(current_balance, 0) as acc_203_balance FROM public.accounts WHERE account_code IN ('203', 'ACC-203') LIMIT 1;")
        acc_203_bal = Decimal(str((cur.fetchone() or {}).get('acc_203_balance') or 0))
        diff_piece_rates = abs(unpaid_pr - acc_203_bal)
        status_piece_rates = 'HEALTHY' if diff_piece_rates <= Decimal('0.01') else ('WARNING' if diff_piece_rates <= Decimal('10') else 'CRITICAL')

        # ── Equation 5: IAS 2 WIP Reconciliation (Active WIP on Orders = Account 105.05) ──
        cur.execute("""
            SELECT COALESCE(SUM(
                COALESCE(wip_material_cost, 0) + COALESCE(wip_labor_cost, 0) + 
                COALESCE(wip_overhead_cost, 0) - COALESCE(wip_cleared_amount, 0)
            ), 0) as total_active_wip
            FROM public.production_orders WHERE status NOT IN ('Cancelled');
        """)
        active_wip = Decimal(str(cur.fetchone().get('total_active_wip') or 0))

        cur.execute("SELECT COALESCE(current_balance, 0) as wip_acc_balance FROM public.accounts WHERE account_code IN ('105.05', 'ACC-105-05') OR id = 'ACC-105-05' LIMIT 1;")
        wip_acc_bal = Decimal(str((cur.fetchone() or {}).get('wip_acc_balance') or 0))
        diff_wip = abs(active_wip - wip_acc_bal)
        status_wip = 'HEALTHY' if diff_wip <= Decimal('0.01') else ('WARNING' if diff_wip <= Decimal('10') else 'CRITICAL')

        # ── Fiscal Periods Statistics ──
        cur.execute("SELECT COUNT(*) as total_periods, COALESCE(SUM(CASE WHEN is_locked THEN 1 ELSE 0 END), 0) as locked_periods FROM public.fiscal_periods;")
        p_row = cur.fetchone() or {}
        tot_periods = int(p_row.get('total_periods') or 0)
        locked_periods = int(p_row.get('locked_periods') or 0)

    # ── Overall Status Calculation ──
    statuses = [status_bs, status_journal, status_inventory, status_piece_rates, status_wip]
    overall = 'CRITICAL' if any(s == 'CRITICAL' for s in statuses) else ('WARNING' if any(s == 'WARNING' for s in statuses) else 'HEALTHY')

    return {
        'success': True,
        'overall_status': overall,
        'check_timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'locked_periods_count': locked_periods,
        'total_periods_count': tot_periods,
        'open_periods_count': tot_periods - locked_periods,
        'equations': [
            {
                'id': 'balance_sheet',
                'title': 'معادلة الميزانية العمومية',
                'formula': 'الأصول = الخصوم + حقوق الملكية + صافي الربح',
                'left_label': 'إجمالي الأصول',
                'left_value': float(assets),
                'right_label': 'الخصوم + حقوق الملكية',
                'right_value': float(right_side_bs),
                'diff': float(diff_bs),
                'tolerance': 0.001,
                'status': status_bs,
                'unit': 'YER'
            },
            {
                'id': 'journal_balance',
                'title': 'توازن القيود المحاسبية المرحلة',
                'formula': 'إجمالي المدين = إجمالي الدائن (Double-Entry)',
                'left_label': 'إجمالي المدين',
                'left_value': float(tot_debit),
                'right_label': 'إجمالي الدائن',
                'right_value': float(tot_credit),
                'diff': float(diff_journal),
                'tolerance': 0.0,
                'status': status_journal,
                'unit': 'YER'
            },
            {
                'id': 'inventory_reconciliation',
                'title': 'مطابقة المخزون الفعلي مع الدفاتر',
                'formula': 'تقييم المستودعات الفعلي = رصيد حسابات المخزون (ACC-105)',
                'left_label': 'تقييم المستودعات الفعلي',
                'left_value': float(stk_val),
                'right_label': 'رصيد حسابات المخزون',
                'right_value': float(inv_acc_bal),
                'diff': float(diff_inventory),
                'tolerance': 0.01,
                'status': status_inventory,
                'unit': 'YER'
            },
            {
                'id': 'piece_rate_reconciliation',
                'title': 'مطابقة استحقاقات أجور القطع',
                'formula': 'أجور القطع غير المسددة = رصيد حساب المستحقات (ACC-203)',
                'left_label': 'أجور القطع غير المسددة',
                'left_value': float(unpaid_pr),
                'right_label': 'رصيد حساب ACC-203',
                'right_value': float(acc_203_bal),
                'diff': float(diff_piece_rates),
                'tolerance': 0.01,
                'status': status_piece_rates,
                'unit': 'YER'
            },
            {
                'id': 'wip_reconciliation',
                'title': 'مطابقة الإنتاج تحت التشغيل (IAS 2 WIP)',
                'formula': 'أرصدة أوامر التشغيل المفتوحة = رصيد حساب 105.05 (WIP)',
                'left_label': 'أوامر التشغيل المفتوحة (مواد+أجور)',
                'left_value': float(active_wip),
                'right_label': 'رصيد حـ/ 105.05',
                'right_value': float(wip_acc_bal),
                'diff': float(diff_wip),
                'tolerance': 0.01,
                'status': status_wip,
                'unit': 'YER'
            }
        ]
    }
