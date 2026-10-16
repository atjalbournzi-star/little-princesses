import datetime
import logging
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id
from .account_resolver import resolve_account_id

logger = logging.getLogger("LittlePrincesses_PG_FactoryCommissionApprove")

NEXT_STAGE_MAP = {
    'القص والتحضير ✂️': ('مرحلة الخياطة 🪡', 40),
    'مرحلة الخياطة 🪡': ('التطريز والشك ✨', 60),
    'التطريز والشك ✨': ('الفحص والتشطيب النهائي 🔍', 80),
    'الفحص والتشطيب النهائي 🔍': ('جاهز للتسليم 📦', 100)
}


def _resolve_stage_worker(po, cur_stage):
    tailor_name = clean_str(po.get('assigned_tailor_id') or po.get('tailor_name') or 'المعلم سليم (خياط أول)')
    if 'قص' in cur_stage:
        return clean_str(po.get('cutter_name') or tailor_name), clean_num(po.get('cutter_wage') or po.get('tailor_wage') or 0.0), 'فني قص وتفصيل'
    elif 'خياط' in cur_stage:
        return clean_str(po.get('tailor_name') or tailor_name), clean_num(po.get('tailor_wage') or 0.0), 'خياط'
    elif 'تطريز' in cur_stage:
        return clean_str(po.get('embroiderer_name') or tailor_name), clean_num(po.get('embroiderer_wage') or po.get('tailor_wage') or 0.0), 'فني تطريز وشك'
    elif 'تشطيب' in cur_stage or 'فحص' in cur_stage:
        return clean_str(po.get('finisher_name') or tailor_name), clean_num(po.get('finisher_wage') or po.get('tailor_wage') or 0.0), 'فني فحص وتشطيب'
    return tailor_name, clean_num(po.get('tailor_wage') or 0.0), 'فني مشغل'


def approve_tailor_commission_and_qc(payload):
    data = payload.get('data') or payload
    po_id = clean_str(data.get('order_id') or data.get('id') or data.get('production_order_id') or data.get('production_order_no') or data.get('order_no'))
    order_no = clean_str(data.get('order_no') or data.get('order_id') or po_id)
    quality_score = clean_num(data.get('quality_score') or 5.0)
    quality_notes = clean_str(data.get('quality_notes') or 'مطابق لمواصفات ومقاسات الأميرة بجودة ممتازة ⭐')
    approved_by = clean_str(data.get('approved_by') or data.get('inspector_name') or 'سارة مديرة الجودة')
    custom_wage = data.get('wage_amount') or data.get('approved_wage')
    advance_stage = bool(data.get('advance_stage', True))

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT po.*, COALESCE(p.model_name, po.product_name, 'موديل راقي') as product_model_name, o.order_no as raw_order_no
            FROM production_orders po
            LEFT JOIN orders o ON po.order_id = o.id
            LEFT JOIN products p ON COALESCE(po.product_id, o.product_id) = p.id
            WHERE po.id = %s OR po.production_order_no = %s OR po.order_id = %s OR po.production_order_no = 'PO-' || %s OR po.id = 'PRD-' || %s
               OR o.order_no = %s OR o.id = %s OR po.production_order_no ILIKE %s
            LIMIT 1 FOR UPDATE OF po;
        """, (po_id, po_id, po_id, po_id, po_id, order_no, po_id, f"%{po_id}%"))
        po = cur.fetchone()
        if not po:
            cur.execute("SELECT * FROM orders WHERE id = %s OR order_no = %s OR order_no ILIKE %s LIMIT 1 FOR UPDATE;", (po_id, order_no, f"%{order_no}%"))
            ord_row = cur.fetchone()
            insp_id = generate_id("INSP")
            if ord_row:
                cur.execute("UPDATE orders SET production_status = 'Ready', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (ord_row['id'],))
                cur.execute("INSERT INTO quality_inspections (id, inspection_date, product_id, product_name, production_stage, quantity_checked, quantity_passed, quantity_failed, inspection_result, inspector_name, notes, created_at, updated_at) VALUES (%s, CURRENT_DATE, %s, %s, 'جاهز للتسليم 📦', 1, 1, 0, 'PASS', %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);", (insp_id, ord_row.get('product_id'), 'فستان مفصل', approved_by, f"تقييم: {quality_score}⭐ | {quality_notes}"))
                return {'success': True, 'order_id': ord_row['id'], 'order_no': ord_row['order_no'], 'production_status': 'Ready', 'quality_status': 'passed', 'message': 'تم اعتماد جودة الفستان بنجاح وتحويله للتسليم'}
            cur.execute("INSERT INTO quality_inspections (id, inspection_date, product_name, production_stage, quantity_checked, quantity_passed, quantity_failed, inspection_result, inspector_name, notes, created_at, updated_at) VALUES (%s, CURRENT_DATE, %s, 'جاهز للتسليم 📦', 1, 1, 0, 'PASS', %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);", (insp_id, f"فستان طلب {order_no}", approved_by, f"تقييم: {quality_score}⭐ | {quality_notes}"))
            return {'success': True, 'order_id': po_id, 'order_no': order_no, 'production_status': 'Ready', 'quality_status': 'passed', 'message': 'تم اعتماد جودة الفستان بنجاح وتحويله للتسليم'}

        cur_stage = po.get('stage') or 'القص والتحضير ✂️'
        stage_emp_name, stage_wage, stage_role = _resolve_stage_worker(po, cur_stage)
        wage_amount = clean_num(custom_wage) if custom_wage is not None else stage_wage

        cur.execute("SELECT id, name, role FROM employees WHERE id = %s OR name = %s OR name ILIKE %s LIMIT 1;", (stage_emp_name, stage_emp_name, f"%{stage_emp_name}%"))
        emp = cur.fetchone()
        emp_id = emp['id'] if emp else generate_id("EMP")
        emp_name = emp['name'] if emp else stage_emp_name
        emp_role = emp['role'] if emp else stage_role
        is_on_time = bool(po.get('is_on_time', True))
        pieces_count = int(po.get('pieces_count') or 1)
        raw_child = clean_str(po.get('child_name'))
        is_stock = bool(not raw_child or raw_child in ('الأميرة', 'إنتاج مخزني', 'مخزن') or po.get('production_type') == 'stock')
        display_child = 'إنتاج مخزني 🏭' if is_stock else (raw_child or 'الأميرة')

        comm_id = generate_id("COMM")
        cur.execute("""
            INSERT INTO tailor_commissions (id, production_order_id, order_no, employee_id, employee_name, role, product_name, child_name, stage, wage_amount, pieces_count, production_type, order_date, completed_at, is_on_time, quality_score, quality_notes, status, approved_by, approved_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE, CURRENT_TIMESTAMP, %s, %s, %s, 'Approved', %s, CURRENT_TIMESTAMP) RETURNING *;
        """, (comm_id, po['id'], po.get('production_order_no') or po['id'], emp_id, emp_name, emp_role, po.get('product_model_name') or po.get('product_name'), display_child, cur_stage, wage_amount, pieces_count, 'stock' if is_stock else 'custom', is_on_time, quality_score, quality_notes, approved_by))

        next_stage, next_prog = NEXT_STAGE_MAP.get(cur_stage, ('جاهز للتسليم 📦', 100))
        if not advance_stage: next_stage, next_prog = cur_stage, po.get('progress') or 20
        new_status = 'Completed' if next_prog >= 100 else 'In Progress'

        cur.execute("UPDATE production_orders SET quality_score = %s, quality_notes = %s, tailor_status = 'approved', wage_credited = true, stage = %s, progress = %s, status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *;", (quality_score, quality_notes, next_stage, next_prog, new_status, po['id']))
        updated_po = cur.fetchone()

        if po.get('order_id'):
            ord_stage_db = 'Ready' if next_prog >= 100 else ('Embroidery' if 'تطريز' in next_stage else 'Sewing')
            cur.execute("UPDATE orders SET production_status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s OR order_no = %s;", (ord_stage_db, po['order_id'], po['order_id']))

        cur_month = datetime.date.today().strftime("%Y-%m")
        if wage_amount > 0:
            cur.execute("UPDATE payroll SET allowances = allowances + %s, notes = notes || ' | عمولة تفصيل الطلب ' || %s WHERE (employee_id = %s OR employee_name = %s) AND month = %s;", (wage_amount, po.get('production_order_no') or po['id'], emp_id, emp_name, cur_month))

        insp_id = generate_id("INSP")
        prod_id = po.get('product_id')
        prod_name = po.get('product_model_name') or po.get('product_name')
        if prod_id:
            cur.execute("SELECT id FROM products WHERE id = %s LIMIT 1;", (prod_id,))
            if not cur.fetchone(): prod_id = None

        cur.execute("INSERT INTO quality_inspections (id, inspection_date, product_id, product_name, production_order_id, production_stage, quantity_checked, quantity_passed, quantity_failed, inspection_result, inspector_name, notes, created_at, updated_at) VALUES (%s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 0, 'PASS', %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);", (insp_id, prod_id, prod_name, po['id'], cur_stage, pieces_count, pieces_count, approved_by, f"تقييم: {quality_score}⭐ | {quality_notes}"))

        # Optional payment receipt voucher posting on quality approval if collected_amount > 0
        qc_collected = clean_num(data.get('amount_collected') or data.get('collected_amount') or data.get('amount') or 0.0)
        if qc_collected > 0:
            qc_pay_id = generate_id("PAY")
            qc_pay_no = f"RV-QC-{order_no}-{generate_id('')[-6:]}"
            qc_acc = resolve_account_id(cur, data.get('account_id') or 'ACC-101', 'ACC-101')
            cur.execute("INSERT INTO payments (id, payment_no, order_id, customer_id, payment_type, amount, currency, exchange_rate, base_amount, payment_method, reference_no, account_id, date, status, notes, party_name, target_account_id) VALUES (%s, %s, %s, %s, 'Receipt', %s, 'YER', 1.0, %s, %s, %s, %s, CURRENT_DATE, 'Confirmed', %s, %s, 'ACC-104');", (qc_pay_id, qc_pay_no, po.get('order_id') or po['id'], po.get('customer_id'), qc_collected, qc_collected, clean_str(data.get('payment_method') or 'نقد (كاش)'), order_no, qc_acc, f"سند قبض تحصيل اعتماد جودة الطلب {order_no} | {quality_notes}", 'العميلة'))

            qc_jv_id = generate_id("JV")
            qc_jv_no = f"JV-QC-{order_no}-{generate_id('')[-6:]}"
            cur.execute("INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id, amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes) VALUES (%s, %s, CURRENT_DATE, %s, %s, 'ACC-104', %s, %s, %s, 'QualityApproval', %s, 'YER', 1.0, 'Posted', %s);", (qc_jv_id, qc_jv_no, f"تحصيل اعتماد جودة فستان طلب {order_no}", qc_acc, qc_collected, qc_collected, qc_collected, po.get('order_id') or po['id'], f"إقفال تحصيل جودة الطلب {order_no}"))

            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);", (generate_id("JVL"), qc_jv_id, qc_acc, f"مدين - تحصيل جودة طلب {order_no}", qc_collected, qc_collected))
            cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);", (generate_id("JVL"), qc_jv_id, 'ACC-104', f"دائن - تحصيل جودة طلب {order_no}", qc_collected, qc_collected))

            cur.execute("UPDATE chart_of_accounts SET current_balance = COALESCE(current_balance, 0.0) + %s WHERE id = %s OR account_code = %s;", (qc_collected, qc_acc, qc_acc))
            cur.execute("UPDATE chart_of_accounts SET current_balance = COALESCE(current_balance, 0.0) - %s WHERE id = 'ACC-104' OR account_code = '104' OR account_code = 'ACC-104';", (qc_collected,))

        res = dict(updated_po)
        for fld in ['start_date', 'due_date', 'cutting_due_date', 'sewing_due_date', 'embroidery_due_date', 'finishing_due_date', 'tailor_completed_at', 'created_at', 'updated_at']:
            if res.get(fld): res[fld] = str(res[fld])
        res.update({'commission_id': comm_id, 'inspection_id': insp_id, 'wage_amount': wage_amount, 'employee_name': emp_name, 'success': True, 'message': f"تم اعتماد الجودة ({quality_score} ⭐) وتوثيق الفحص في Supabase وترحيل العمولة ({wage_amount} ر.ي) للفني {emp_name} بنجاح 👑"})
        return res


def auto_credit_all_stages_commissions(cur, po_id, order_no=None, child_name=None):
    cur.execute("SELECT * FROM production_orders WHERE id = %s OR production_order_no = %s OR order_id = %s LIMIT 1;", (po_id, po_id, po_id))
    po = cur.fetchone()
    if not po: return
    workers = [
        (po.get('cutter_name'), clean_num(po.get('cutter_wage') or 0), 'فني قص وتفصيل', 'القص والتحضير ✂️'),
        (po.get('tailor_name'), clean_num(po.get('tailor_wage') or 0), 'خياط', 'مرحلة الخياطة 🪡'),
        (po.get('embroiderer_name'), clean_num(po.get('embroiderer_wage') or 0), 'فني تطريز وشك', 'التطريز والشك ✨'),
        (po.get('finisher_name'), clean_num(po.get('finisher_wage') or 0), 'فني فحص وتشطيب', 'الفحص والتشطيب النهائي 🔍')
    ]
    prod_name = po.get('product_name') or 'موديل راقي'
    c_name = child_name or po.get('child_name') or 'الأميرة'
    p_no = po.get('production_order_no') or order_no or po['id']
    for w_name, w_wage, w_role, w_stg in workers:
        if w_name and w_wage > 0:
            cur.execute("SELECT 1 FROM tailor_commissions WHERE (production_order_id = %s OR order_no = %s) AND employee_name = %s LIMIT 1;", (po['id'], p_no, w_name))
            if not cur.fetchone():
                cur.execute("SELECT id FROM employees WHERE name = %s OR name ILIKE %s LIMIT 1;", (w_name, f"%{w_name}%"))
                emp = cur.fetchone()
                emp_id = emp['id'] if emp else generate_id("EMP")
                cur.execute("INSERT INTO tailor_commissions (id, production_order_id, order_no, employee_id, employee_name, role, product_name, child_name, stage, wage_amount, pieces_count, production_type, order_date, completed_at, is_on_time, quality_score, quality_notes, status, approved_by, approved_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, 'custom', CURRENT_DATE, CURRENT_TIMESTAMP, true, 5.0, 'تسليم معتمد بجودة ممتازة ⭐', 'Approved', 'إدارة المعمل ✂️', CURRENT_TIMESTAMP);", (generate_id("COMM"), po['id'], p_no, emp_id, w_name, w_role, prod_name, c_name, w_stg, w_wage))


