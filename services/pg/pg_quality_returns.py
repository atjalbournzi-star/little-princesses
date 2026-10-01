from decimal import Decimal
import logging
from .db_pool import (
    get_db_cursor, execute_query, clean_num,
    clean_str, generate_id, today_str
)

logger = logging.getLogger("LittlePrincesses_PG_QualityReturns")


def get_quality_returns(params=None):
    query = "SELECT * FROM quality_returns ORDER BY created_at DESC;"
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        for k in ('created_at', 'return_date'):
            if r.get(k):
                r[k] = str(r[k])
        for k in ('refund_amount', 'replacement_cost'):
            if r.get(k) is not None:
                r[k] = float(r[k])
    return rows


def add_quality_return(payload):
    data = payload.get('data') or payload
    ret_id = clean_str(data.get('id') or data.get('return_id')) or generate_id("RET")
    ret_date = clean_str(data.get('return_date') or data.get('date')) or today_str()
    order_id = clean_str(data.get('order_id') or data.get('order_no')) or None
    cust_id = clean_str(data.get('customer_id')) or None
    prod_id = clean_str(data.get('product_id')) or None
    reason = clean_str(data.get('return_reason') or data.get('reason') or 'عيب جودة')
    cond = clean_str(data.get('condition') or 'مستلم من العميلة')
    action = clean_str(data.get('action_taken') or 'إعادة تشغيل واستبدال')
    refund = Decimal(str(clean_num(data.get('refund_amount') or 0.0)))
    rep_cost = Decimal(str(clean_num(data.get('replacement_cost') or 0.0)))
    status = clean_str(data.get('status') or 'Processing')

    with get_db_cursor(commit=True) as cur:
        valid_order_id = None
        if order_id:
            cur.execute(
                "SELECT id, customer_id, product_id FROM orders WHERE id = %s OR order_no = %s LIMIT 1;",
                (order_id, order_id)
            )
            o_row = cur.fetchone()
            if o_row:
                valid_order_id = o_row['id']
                if not cust_id and o_row.get('customer_id'):
                    cust_id = o_row['customer_id']
                if not prod_id and o_row.get('product_id'):
                    prod_id = o_row['product_id']

        valid_cust_id = None
        if cust_id:
            cur.execute("SELECT id FROM customers WHERE id = %s LIMIT 1;", (cust_id,))
            if cur.fetchone():
                valid_cust_id = cust_id

        valid_prod_id = None
        if prod_id:
            cur.execute("SELECT id FROM products WHERE id = %s LIMIT 1;", (prod_id,))
            if cur.fetchone():
                valid_prod_id = prod_id

        cur.execute("""
            INSERT INTO quality_returns (
                id, return_date, order_id, customer_id, product_id,
                return_reason, condition, action_taken, refund_amount,
                replacement_cost, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                return_reason = EXCLUDED.return_reason,
                condition = EXCLUDED.condition,
                action_taken = EXCLUDED.action_taken,
                refund_amount = EXCLUDED.refund_amount,
                replacement_cost = EXCLUDED.replacement_cost,
                status = EXCLUDED.status
            RETURNING *;
        """, (
            ret_id, ret_date, valid_order_id, valid_cust_id, valid_prod_id,
            reason, cond, action, refund, rep_cost, status
        ))
        row = dict(cur.fetchone())
        for k in ('created_at', 'return_date'):
            if row.get(k):
                row[k] = str(row[k])
        for k in ('refund_amount', 'replacement_cost'):
            if row.get(k) is not None:
                row[k] = float(row[k])
        return row
