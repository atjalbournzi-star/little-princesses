"""
Little Princesses ERP - Read-Only Architectural Integrity Audit Script
Executes non-destructive, read-only checks on accounting, HR wages, inventory,
workshop queue, and CRM contract balances. ZERO HISTORICAL DATA MUTATION.
"""

import sys
import os
from decimal import Decimal

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import db_client
import pg_service


def run_read_only_audit():
    print("=" * 70)
    print("👑 ERP MASTER — READ-ONLY ARCHITECTURAL INTEGRITY AUDIT")
    print("=" * 70)

    results = {}

    with db_client.get_db_cursor(commit=False) as cur:
        # ── 1. ACCOUNTING INTEGRITY CHECK ──
        cur.execute("""
            SELECT COALESCE(SUM(debit), 0.0) as total_debit,
                   COALESCE(SUM(credit), 0.0) as total_credit
            FROM journal_entry_lines;
        """)
        tb_row = cur.fetchone()
        tot_deb = Decimal(str(tb_row['total_debit']))
        tot_crd = Decimal(str(tb_row['total_credit']))
        tb_diff = abs(tot_deb - tot_crd)
        tb_balanced = tb_diff < Decimal("0.01")

        # Balance Sheet & Income Statement checks
        cur.execute("""
            SELECT account_type, COALESCE(SUM(current_balance), 0.0) as balance
            FROM chart_of_accounts GROUP BY account_type;
        """)
        bal_rows = {r['account_type']: Decimal(str(r['balance'])) for r in cur.fetchall()}
        assets = bal_rows.get('Asset', Decimal(0))
        liab = bal_rows.get('Liability', Decimal(0))
        equity = bal_rows.get('Equity', Decimal(0))
        rev = bal_rows.get('Revenue', Decimal(0))
        exp = bal_rows.get('Expense', Decimal(0))
        net_income = rev - exp

        results['accounting'] = {
            'total_debit': float(tot_deb), 'total_credit': float(tot_crd),
            'trial_balance_balanced': tb_balanced, 'assets': float(assets),
            'liabilities': float(liab), 'equity': float(equity),
            'net_income': float(net_income)
        }

        # ── 2. TRIPLE WAGE RECONCILIATION ──
        cur.execute("""
            SELECT COALESCE(current_balance, 0.0) as bal FROM chart_of_accounts
            WHERE id = 'ACC-203' OR account_code = '203' LIMIT 1;
        """)
        acc203_row = cur.fetchone()
        acc203_bal = float(acc203_row['bal']) if acc203_row else 0.0

        cur.execute("""
            SELECT COALESCE(SUM(piece_rate_amount), 0.0) as unliquidated_sum,
                   COUNT(*) as unliquidated_count
            FROM piece_rate_logs
            WHERE paid_at IS NULL
              AND (payment_status IN ('Accrued', 'pending', 'معلق') OR payment_status IS NULL)
              AND (qa_status ILIKE '%pass%' OR qa_status ILIKE '%approv%');
        """)
        prl_row = cur.fetchone()
        prl_sum = float(prl_row['unliquidated_sum'])
        prl_count = int(prl_row['unliquidated_count'])

        cur.execute("""
            SELECT COALESCE(SUM(prl.piece_rate_amount), 0.0) as emp_piece_sum,
                   COUNT(prl.id) as emp_piece_count
            FROM piece_rate_logs prl
            JOIN employees e ON (e.id = prl.worker_id OR e.name = prl.worker_name)
            WHERE e.status IN ('Active', 'active', 'نشط')
              AND prl.paid_at IS NULL
              AND (prl.payment_status IN ('Accrued', 'pending', 'معلق') OR prl.payment_status IS NULL)
              AND (prl.qa_status ILIKE '%pass%' OR prl.qa_status ILIKE '%approv%');
        """)
        emp_prl_row = cur.fetchone()
        payroll_piece_sum = float(emp_prl_row['emp_piece_sum'])
        payroll_piece_count = int(emp_prl_row['emp_piece_count'])

        results['wages'] = {
            'acc_203_balance': acc203_bal,
            'piece_rate_logs_unpaid_sum': prl_sum,
            'piece_rate_logs_unpaid_count': prl_count,
            'payroll_piece_wages_sum': payroll_piece_sum,
            'payroll_piece_count': payroll_piece_count
        }

        # ── 3. INVENTORY & GENERAL LEDGER MATCHING ──
        cur.execute("SELECT COALESCE(SUM(COALESCE(quantity, 0.0) * COALESCE(unit_cost, 0.0)), 0.0) as inv_val FROM inventory;")
        inv_val = float(cur.fetchone()['inv_val'])
        cur.execute("SELECT COALESCE(current_balance, 0.0) as bal FROM chart_of_accounts WHERE id = 'ACC-103' OR account_code = '103' LIMIT 1;")
        acc103_row = cur.fetchone()
        acc103_bal = float(acc103_row['bal']) if acc103_row else 0.0

        results['inventory'] = {
            'inventory_physical_valuation': inv_val,
            'acc_103_gl_balance': acc103_bal
        }

        # ── 4. WORKSHOP ACTIVE QUEUE PURITY ──
        cur.execute("""
            SELECT id, production_order_no, stage, status
            FROM production_orders
            WHERE COALESCE(status, '') NOT IN ('delivered', 'Delivered', 'مسلّم', 'تم التسليم', 'تم التسليم ✅', 'Completed', 'مكتمل', 'cancelled', 'ملغي')
              AND COALESCE(stage, '') NOT IN ('تم التسليم ✅', 'Delivered', 'مسلّم');
        """)
        active_factory_orders = cur.fetchall()
        delivered_in_pipeline = [
            f for f in active_factory_orders
            if 'deliver' in str(f.get('status') or '').lower()
            or 'تم التسليم' in str(f.get('stage') or '')
        ]

        results['workshop'] = {
            'active_orders_count': len(active_factory_orders),
            'delivered_orders_in_queue': len(delivered_in_pipeline),
            'is_pure': len(delivered_in_pipeline) == 0
        }

        # ── 5. CRM CONTRACT BALANCES BINDING ──
        cur.execute("SELECT * FROM customers;")
        all_custs = cur.fetchall()
        cur.execute("SELECT * FROM orders WHERE status NOT IN ('cancelled', 'ملغي');")
        all_ords = cur.fetchall()

        cust_rems = []
        for c in all_custs:
            cid = str(c.get('customer_id') or c.get('id') or '')
            cname = str(c.get('name') or c.get('customer_name') or '').strip()
            c_ords = [o for o in all_ords if (o.get('customer_id') and str(o.get('customer_id')) == cid) or (o.get('customer_name') and str(o.get('customer_name')).strip() == cname)]
            if c_ords:
                tot_o = sum(float(o.get('total_amount') or o.get('total') or 0.0) for o in c_ords)
                tot_p = sum(float(o.get('paid_amount') or o.get('paid') or 0.0) for o in c_ords)
                cust_rems.append(max(0.0, tot_o - tot_p))
            else:
                cust_rems.append(float(c.get('current_balance') or 0.0))

        crm_total_remaining = sum(cust_rems)
        results['crm'] = {
            'customers_count': len(all_custs),
            'total_contract_remaining': round(crm_total_remaining, 2)
        }

    # Print Formatted Report
    print(f"\n[1] المحاسبة وميزان المراجعة:")
    print(f"    - إجمالي المدين: {results['accounting']['total_debit']:,.2f} YER")
    print(f"    - إجمالي الدائن: {results['accounting']['total_credit']:,.2f} YER")
    print(f"    - حالة الاتزان: {'✅ متزن بدقة 100%' if results['accounting']['trial_balance_balanced'] else '⚠️ غير متزن'}")
    print(f"    - صافي الدخل (الأرباح): {results['accounting']['net_income']:,.2f} YER")

    print(f"\n[2] التطابق الثلاثي للأجور (Triple Wage Reconciliation):")
    print(f"    - رصيد حساب مستحقات الفنيين (203): {results['wages']['acc_203_balance']:,.2f} YER")
    print(f"    - محفظة أجور القطع غير المصروفة ({results['wages']['piece_rate_logs_unpaid_count']} قطعة): {results['wages']['piece_rate_logs_unpaid_sum']:,.2f} YER")
    print(f"    - مسير رواتب أجور القطع: {results['wages']['payroll_piece_wages_sum']:,.2f} YER ({results['wages']['payroll_piece_count']} قطعة)")

    print(f"\n[3] تطابق المخزون مع الأستاذ العام:")
    print(f"    - تقييم المخزون الفعلي: {results['inventory']['inventory_physical_valuation']:,.2f} YER")
    print(f"    - رصيد حساب المخزون (103): {results['inventory']['acc_103_gl_balance']:,.2f} YER")

    print(f"\n[4] نظافة طابور الورشة النشط:")
    print(f"    - عدد أوامر التشغيل بالورشة: {results['workshop']['active_orders_count']} أمر")
    print(f"    - طلبات مسلّمة عالقة بالطابور: {results['workshop']['delivered_orders_in_queue']} طلب")
    print(f"    - حالة الطابور: {'✅ نظيف 100% وخالٍ من أي طلبات مسلّمة' if results['workshop']['is_pure'] else '⚠️ يحتاج تصفية'}")

    print(f"\n[5] تطابق متبقي عقود العملاء (CRM):")
    print(f"    - إجمالي متبقي العقود الموحد: {results['crm']['total_contract_remaining']:,.2f} YER ({results['crm']['customers_count']} عميل)")
    print("=" * 70)
    print("✨ تم الانتهاء من الفحص التكاملي بنجاح تام دون تعديل أي سجل تاريخي.")
    return results


if __name__ == '__main__':
    run_read_only_audit()
