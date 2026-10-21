# services/pg/pg_delivery_cogs.py
# Automatic COGS journal recording and hierarchical account balance cascade
import logging
from .db_pool import clean_num, clean_str, generate_id

logger = logging.getLogger("LittlePrincesses_PG_DeliveryCOGS")


def cascade_account_balances(cur):
    """
    تحديث الأرصدة التجميعية للحسابات الأبوية (Group Accounts) في شجرة الحسابات
    تصاعدياً من المستوى الأدنى إلى المستوى الأعلى لضمان توازن الميزانية التام.
    """
    cur.execute("SELECT DISTINCT level FROM chart_of_accounts WHERE is_group = true ORDER BY level DESC;")
    levels = [r['level'] for r in cur.fetchall() if r.get('level') is not None]
    for lvl in levels:
        cur.execute("""
            UPDATE chart_of_accounts p
            SET current_balance = COALESCE((
                SELECT SUM(c.current_balance)
                FROM chart_of_accounts c
                WHERE c.parent_account_code = p.account_code OR c.parent_account_id = p.id
            ), 0.0)
            WHERE p.level = %s AND p.is_group = true;
        """, (lvl,))


def record_delivery_cogs(cur, real_order_id, order_no, cust_name=None, child_name=None):
    """
    توليد قيد إثبات تكلفة البضاعة المباعة (COGS Journal Entry):
    حساب تكلفة الخامات المستهلكة من inventory_transactions أو BOM
    قيد من حـ/ 504 تكلفة الأقمشة والخامات (مدين) إلى حـ/ 105 مخزون الأقمشة والخامات (دائن).
    """
    # 1. البحث عن تكلفة المواد المستهلكة في حركات المخزون
    cur.execute("""
        SELECT COALESCE(SUM(ABS(total_cost)), 0.0) as total_cogs
        FROM inventory_transactions
        WHERE (reference_id = %s OR reference_id = %s OR notes LIKE %s OR notes LIKE %s)
          AND transaction_type IN ('PRODUCTION_CONSUMPTION', 'SALE_OUT', 'CONSUMPTION');
    """, (real_order_id, order_no, f"%{real_order_id}%", f"%{order_no}%"))
    row = cur.fetchone()
    total_cogs = clean_num(row['total_cogs']) if row else 0.0

    # فحص مرجعي إضافي عبر production_orders / measurement_id
    if total_cogs <= 0:
        cur.execute("SELECT measurement_id FROM order_items WHERE order_id = %s AND measurement_id IS NOT NULL LIMIT 1;", (real_order_id,))
        o_row = cur.fetchone()
        meas_id = str(o_row['measurement_id']) if o_row and o_row.get('measurement_id') else ''
        if meas_id:
            cur.execute("""
                SELECT COALESCE(SUM(ABS(total_cost)), 0.0) as total_cogs
                FROM inventory_transactions
                WHERE reference_id = %s AND transaction_type IN ('PRODUCTION_CONSUMPTION', 'SALE_OUT', 'CONSUMPTION');
            """, (meas_id,))
            m_row = cur.fetchone()
            if m_row and clean_num(m_row['total_cogs']) > 0:
                total_cogs = clean_num(m_row['total_cogs'])

    # 2. في حال عدم وجود حركات مسجلة، احتساب التكلفة ديناميكياً من مصفوفة fabrics_data
    if total_cogs <= 0:
        cur.execute("SELECT fabrics_data FROM orders WHERE id = %s LIMIT 1;", (real_order_id,))
        fab_row = cur.fetchone()
        fab_list = fab_row.get('fabrics_data') if fab_row else []
        if not fab_list:
            cur.execute("SELECT fabrics_data FROM order_items WHERE order_id = %s LIMIT 1;", (real_order_id,))
            it_row = cur.fetchone()
            fab_list = it_row.get('fabrics_data') if it_row else []

        if isinstance(fab_list, list):
            for item in fab_list:
                if isinstance(item, dict):
                    q = clean_num(item.get('qty') or item.get('meters') or item.get('cut_meters') or 0.0)
                    c = clean_num(item.get('cost') or item.get('unit_cost') or 0.0)
                    total_cogs += (q * c)

    total_cogs = round(total_cogs, 2)
    if total_cogs <= 0:
        return {"cogs_amount": 0.0, "entry_no": None}

    cogs_acc = 'ACC-504'
    inv_acc = 'ACC-105'
    jv_cogs_id = generate_id("JV")
    jv_cogs_no = f"JV-COGS-{order_no}"
    desc = f"تكلفة الخامات والأقمشة المستهلكة (COGS) لطلب {order_no} ({cust_name or 'العميلة'})"

    cur.execute("""
        INSERT INTO journal_entries (
            id, entry_no, entry_date, description, debit_account_id, credit_account_id,
            amount, total_amount, base_amount, ref_type, ref_id, currency,
            exchange_rate, status, notes
        ) VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'ProductionCOGS', %s, 'YER', 1.0, 'Posted', %s)
        ON CONFLICT (entry_no) DO UPDATE 
        SET amount = EXCLUDED.amount, total_amount = EXCLUDED.total_amount, base_amount = EXCLUDED.base_amount;
    """, (jv_cogs_id, jv_cogs_no, desc, cogs_acc, inv_acc, total_cogs, total_cogs, total_cogs, real_order_id, f"إثبات تكلفة البضاعة المباعة لفستان {child_name or ''}"))

    cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (jv_cogs_no,))
    act_id = cur.fetchone()['id']
    cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (act_id,))

    cur.execute("""
        INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
        VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
    """, (generate_id("JVL"), act_id, cogs_acc, f"مدين - تكلفة أقمشة ومستلزمات طلب {order_no}", total_cogs, total_cogs))

    cur.execute("""
        INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
        VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
    """, (generate_id("JVL"), act_id, inv_acc, f"دائن - صرف مخزون أقمشة وخامات طلب {order_no}", total_cogs, total_cogs))

    cur.execute("UPDATE chart_of_accounts SET current_balance = COALESCE(current_balance, 0.0) + %s WHERE id = %s OR account_code = '504';", (total_cogs, cogs_acc))
    cur.execute("UPDATE chart_of_accounts SET current_balance = GREATEST(0.0, COALESCE(current_balance, 0.0) - %s) WHERE id = %s OR account_code = '105';", (total_cogs, inv_acc))

    logger.info(f"Recorded COGS {total_cogs} YER for order {order_no} via {jv_cogs_no}")
    return {"cogs_amount": total_cogs, "entry_no": jv_cogs_no}


def reverse_delivery_cogs(cur, real_order_id, order_no):
    """عكس قيد تكلفة البضاعة المباعة عند إلغاء التسليم"""
    jv_cogs_no = f"JV-COGS-{order_no}"
    cur.execute("SELECT amount FROM journal_entries WHERE entry_no = %s LIMIT 1;", (jv_cogs_no,))
    c_row = cur.fetchone()
    if c_row:
        amt = clean_num(c_row['amount'])
        cur.execute("UPDATE chart_of_accounts SET current_balance = GREATEST(0.0, COALESCE(current_balance, 0.0) - %s) WHERE id = 'ACC-504' OR account_code = '504';", (amt,))
        cur.execute("UPDATE chart_of_accounts SET current_balance = COALESCE(current_balance, 0.0) + %s WHERE id = 'ACC-105' OR account_code = '105';", (amt,))
        cur.execute("DELETE FROM journal_entries WHERE entry_no = %s;", (jv_cogs_no,))
