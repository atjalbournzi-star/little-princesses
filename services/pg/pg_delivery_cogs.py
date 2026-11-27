# services/pg/pg_delivery_cogs.py
# Automatic COGS journal recording and hierarchical account balance cascade
# Architectural Standards: Strictly < 220 lines per file

import logging
from .db_pool import clean_num, clean_str, generate_id

logger = logging.getLogger("LittlePrincesses_PG_DeliveryCOGS")


def cascade_account_balances(cur):
    """تحديث الأرصدة التجميعية للحسابات الأبوية تصاعدياً من المستوى الأدنى للأعلى"""
    cur.execute("UPDATE chart_of_accounts SET current_balance = 0.0 WHERE is_group = TRUE;")
    cur.execute("SELECT DISTINCT level FROM chart_of_accounts WHERE is_group = TRUE AND level IS NOT NULL ORDER BY level DESC;")
    levels = [r['level'] for r in cur.fetchall() if r.get('level') is not None]
    for lvl in levels:
        cur.execute("""
            UPDATE chart_of_accounts p
            SET current_balance = COALESCE((
                SELECT SUM(c.current_balance)
                FROM chart_of_accounts c
                WHERE (c.parent_account_code = p.account_code OR c.parent_account_id = p.id) AND c.id != p.id
            ), 0.0)
            WHERE p.level = %s AND p.is_group = TRUE;
        """, (lvl,))


def refresh_chart_balances_atomic(cur):
    """مزامنة واحتساب أرصدة الحسابات التفصيلية والتجميعية من قيود اليومية المعتمدة حصراً"""
    cur.execute("""
        WITH leaf_calc AS (
            SELECT c.id,
                   ROUND(COALESCE(c.opening_balance, 0.0) + 
                   CASE WHEN c.normal_balance = 'Credit' 
                        THEN (COALESCE(SUM(l.credit_base), 0.0) - COALESCE(SUM(l.debit_base), 0.0))
                        ELSE (COALESCE(SUM(l.debit_base), 0.0) - COALESCE(SUM(l.credit_base), 0.0))
                   END, 4) as calc_balance
            FROM chart_of_accounts c
            LEFT JOIN (
                journal_entry_lines l 
                JOIN journal_entries j ON (l.entry_id = j.id OR l.entry_id = j.entry_no) AND j.status IN ('Posted', 'Reversed')
            ) ON (
                l.account_id = c.id 
                OR l.account_id = c.account_code
                OR REPLACE(REPLACE(l.account_id, 'ACC-', ''), 'ACC_', '') = c.account_code
            )
            WHERE c.is_group = FALSE OR c.is_group IS NULL
            GROUP BY c.id, c.normal_balance, c.opening_balance
        )
        UPDATE chart_of_accounts
        SET current_balance = leaf_calc.calc_balance
        FROM leaf_calc
        WHERE chart_of_accounts.id = leaf_calc.id;
    """)
    cascade_account_balances(cur)


def record_delivery_cogs(cur, real_order_id, order_no, cust_name=None, child_name=None):
    """
    IAS 2: استبعاد رصيد أمر التشغيل من WIP (105.05) وتحميله على تكلفة البضاعة المباعة (ACC-504)
    مع حارس منع الازدواجية (Idempotent Guard).
    """
    from .pg_wip_accounting import clear_wip_to_cogs
    cur.execute("""
        SELECT j.id, j.entry_no, j.amount
        FROM journal_entries j
        WHERE (j.ref_id = %s OR j.ref_id = %s OR j.id LIKE %s OR j.entry_no LIKE %s)
          AND j.ref_type = 'ProductionCOGS' AND j.status = 'Posted'
        LIMIT 1;
    """, (real_order_id, order_no, f"%{order_no}%", f"%{order_no}%"))
    existing_cogs = cur.fetchone()
    if existing_cogs:
        logger.info(f"COGS already recorded for order {order_no} via {existing_cogs['entry_no']} - skipping duplicate.")
        return {"cogs_amount": clean_num(existing_cogs['amount']), "entry_no": existing_cogs['entry_no'], "already_recorded": True}

    res = clear_wip_to_cogs(cur, real_order_id, order_no, cust_name, child_name)
    logger.info(f"IAS 2 WIP Cleared to COGS for order {order_no}: {res}")
    return res


def reverse_delivery_cogs(cur, real_order_id, order_no):
    """عكس قيد تكلفة البضاعة المباعة عند إلغاء التسليم وفق معايير IFRS والدرع 2"""
    jv_cogs_no = f"JV-COGS-{order_no}"
    cur.execute("""
        SELECT id, entry_no, amount, debit_account_id, credit_account_id, status
        FROM journal_entries
        WHERE id = %s OR entry_no = %s
        ORDER BY CASE WHEN status = 'Posted' THEN 0 ELSE 1 END
        LIMIT 1 FOR UPDATE;
    """, (jv_cogs_no, jv_cogs_no))
    c_row = cur.fetchone()
    if not c_row: return

    if c_row['status'] == 'Posted':
        rev_no = f"REV-{c_row.get('entry_no') or jv_cogs_no}"
        cur.execute("SELECT id, account_id, line_description, debit, credit, debit_base, credit_base FROM journal_entry_lines WHERE entry_id = %s;", (c_row['id'],))
        orig_lines = cur.fetchall()
        cur.execute("""
            INSERT INTO journal_entries (id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes)
            VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, 'Reversal', %s, 'YER', 1.0, 'Posted', %s)
            ON CONFLICT (entry_no) DO NOTHING;
        """, (generate_id("JV"), rev_no, f"عكس قيد تكلفة البضاعة المباعة للطلب {order_no}", c_row['credit_account_id'], c_row['debit_account_id'], c_row['amount'], c_row['amount'], c_row['amount'], real_order_id, f"عكس {c_row.get('entry_no') or jv_cogs_no}"))
        cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (rev_no,))
        rev_row = cur.fetchone()
        if not rev_row:
            raise ValueError(f"فشل إنشاء القيد العكسي المتوازن {rev_no}")
        rev_id = rev_row['id']
        cur.execute("SELECT COUNT(*) AS cnt FROM journal_entry_lines WHERE entry_id = %s;", (rev_id,))
        if (cur.fetchone() or {}).get('cnt', 0) == 0:
            if orig_lines:
                for ol in orig_lines:
                    cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);",
                                (generate_id("JVL"), rev_id, ol['account_id'], f"عكس - {ol.get('line_description') or order_no}", ol['credit'], ol['debit'], ol['credit_base'], ol['debit_base']))
            elif clean_num(c_row['amount']) > 0:
                cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);", (generate_id("JVL"), rev_id, c_row['credit_account_id'], f"مدين - عكس تكلفة COGS للطلب {order_no}", c_row['amount'], c_row['amount']))
                cur.execute("INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base) VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);", (generate_id("JVL"), rev_id, c_row['debit_account_id'], f"دائن - عكس تكلفة COGS للطلب {order_no}", c_row['amount'], c_row['amount']))
        cur.execute("UPDATE journal_entries SET status = 'Reversed', updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (c_row['id'],))
        cur.execute("UPDATE production_orders SET wip_cleared_amount = GREATEST(0.0, COALESCE(wip_cleared_amount, 0.0) - %s), updated_at = CURRENT_TIMESTAMP WHERE order_id = %s OR id = %s;", (c_row['amount'], real_order_id, real_order_id))
    elif c_row['status'] == 'Draft':
        cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (c_row['id'],))
        cur.execute("DELETE FROM journal_entries WHERE id = %s;", (c_row['id'],))
