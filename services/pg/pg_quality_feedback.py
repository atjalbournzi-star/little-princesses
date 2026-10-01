from decimal import Decimal
import logging
from .db_pool import (
    get_db_cursor, execute_query, clean_num,
    clean_str, generate_id, today_str
)

logger = logging.getLogger("LittlePrincesses_PG_QualityFeedback")


def get_quality_feedback(params=None):
    query = "SELECT * FROM quality_feedback ORDER BY created_at DESC;"
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        for k in ('created_at', 'feedback_date'):
            if r.get(k):
                r[k] = str(r[k])
        if r.get('csat_score') is not None:
            r['csat_score'] = float(r['csat_score'])
    return rows


def add_quality_feedback(payload):
    data = payload.get('data') or payload
    fb_id = clean_str(data.get('id') or data.get('feedback_id')) or generate_id("FB")
    rating = int(clean_num(data.get('rating') or 5))
    if rating < 1:
        rating = 1
    if rating > 5:
        rating = 5
    nps_score = int(data.get('nps_score') or (10 if rating >= 5 else 7 if rating == 4 else 4))
    csat_score = Decimal(str(clean_num(data.get('csat_score') or rating)))
    comment = clean_str(data.get('feedback_comment') or data.get('comment') or '')
    cat = clean_str(data.get('feedback_category') or 'خدمة عملاء')
    cust_id = clean_str(data.get('customer_id')) or None
    cust_name = clean_str(data.get('customer_name')) or None
    order_id = clean_str(data.get('order_id') or data.get('order_no')) or None
    prod_id = clean_str(data.get('product_id')) or None
    channel = clean_str(data.get('channel') or 'بوابة التتبع الإلكترونية')

    with get_db_cursor(commit=True) as cur:
        valid_order_id = None
        if order_id:
            cur.execute("""
                SELECT o.id, o.customer_id, o.product_id, c.name as customer_name 
                FROM orders o 
                LEFT JOIN customers c ON o.customer_id = c.id 
                WHERE o.id = %s OR o.order_no = %s OR o.order_no = 'ORD-' || %s OR o.id = 'ORD-' || %s 
                LIMIT 1;
            """, (order_id, order_id, order_id, order_id))
            ord_row = cur.fetchone()
            if ord_row:
                valid_order_id = ord_row['id']
                if not cust_id and ord_row.get('customer_id'):
                    cust_id = ord_row['customer_id']
                if not cust_name and ord_row.get('customer_name'):
                    cust_name = ord_row['customer_name']
                if not prod_id and ord_row.get('product_id'):
                    prod_id = ord_row['product_id']

        valid_cust_id = None
        if cust_id:
            cur.execute("SELECT id, name FROM customers WHERE id = %s LIMIT 1;", (cust_id,))
            c_row = cur.fetchone()
            if c_row:
                valid_cust_id = c_row['id']
                if not cust_name:
                    cust_name = c_row['name']

        valid_prod_id = None
        if prod_id:
            cur.execute("SELECT id FROM products WHERE id = %s LIMIT 1;", (prod_id,))
            if cur.fetchone():
                valid_prod_id = prod_id

        cur.execute("""
            INSERT INTO quality_feedback (
                id, rating, csat_score, nps_score, feedback_comment, feedback_category,
                customer_id, customer_name, order_id, product_id, channel, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Reviewed')
            ON CONFLICT (id) DO UPDATE SET
                rating = EXCLUDED.rating,
                csat_score = EXCLUDED.csat_score,
                nps_score = EXCLUDED.nps_score,
                feedback_comment = EXCLUDED.feedback_comment,
                customer_name = COALESCE(EXCLUDED.customer_name, quality_feedback.customer_name)
            RETURNING *;
        """, (fb_id, rating, csat_score, nps_score, comment, cat, valid_cust_id, cust_name, valid_order_id, valid_prod_id, channel))
        row = dict(cur.fetchone())
        for k in ('created_at', 'feedback_date'):
            if row.get(k):
                row[k] = str(row[k])
        if row.get('csat_score') is not None:
            row['csat_score'] = float(row['csat_score'])
        return row


def get_quality_complaints(params=None):
    query = "SELECT * FROM quality_complaints ORDER BY created_at DESC;"
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        for k in ('created_at', 'complaint_date', 'response_date'):
            if r.get(k):
                r[k] = str(r[k])
        if r.get('compensation_cost') is not None:
            r['compensation_cost'] = float(r['compensation_cost'])
    return rows


def add_quality_complaint(payload):
    data = payload.get('data') or payload
    c_id = clean_str(data.get('id') or data.get('complaint_id')) or generate_id("CMP")
    c_date = clean_str(data.get('complaint_date') or data.get('date')) or today_str()
    cust_id = clean_str(data.get('customer_id')) or None
    cust_name = clean_str(data.get('customer_name') or '')
    order_id = clean_str(data.get('order_id') or data.get('order_no')) or None
    c_type = clean_str(data.get('complaint_type') or 'مقاس')
    sev = clean_str(data.get('severity') or 'Medium')
    desc = clean_str(data.get('description') or data.get('complaint_description') or 'شكوى جودة ومقاسات')
    assigned_to = clean_str(data.get('assigned_to')) or None
    resp_date = clean_str(data.get('response_date')) or None
    comp_cost = Decimal(str(clean_num(data.get('compensation_cost') or data.get('cost') or 0.0)))
    status = clean_str(data.get('status') or 'Pending')

    with get_db_cursor(commit=True) as cur:
        valid_cust_id = None
        if cust_id:
            cur.execute("SELECT id, name FROM customers WHERE id = %s LIMIT 1;", (cust_id,))
            c_row = cur.fetchone()
            if c_row:
                valid_cust_id = c_row['id']
                if not cust_name:
                    cust_name = c_row.get('name', '')

        valid_order_id = None
        if order_id:
            cur.execute("SELECT id, customer_id FROM orders WHERE id = %s OR order_no = %s LIMIT 1;", (order_id, order_id))
            o_row = cur.fetchone()
            if o_row:
                valid_order_id = o_row['id']
                if not valid_cust_id and o_row.get('customer_id'):
                    valid_cust_id = o_row['customer_id']

        valid_assigned = None
        if assigned_to:
            cur.execute("SELECT id FROM users WHERE id = %s OR username = %s LIMIT 1;", (assigned_to, assigned_to))
            u_row = cur.fetchone()
            if u_row:
                valid_assigned = u_row['id']

        cur.execute("""
            INSERT INTO quality_complaints (
                id, complaint_date, customer_id, customer_name, order_id,
                complaint_type, severity, description, assigned_to,
                response_date, compensation_cost, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                complaint_type = EXCLUDED.complaint_type,
                severity = EXCLUDED.severity,
                description = EXCLUDED.description,
                compensation_cost = EXCLUDED.compensation_cost,
                status = EXCLUDED.status,
                response_date = EXCLUDED.response_date
            RETURNING *;
        """, (
            c_id, c_date, valid_cust_id, cust_name, valid_order_id,
            c_type, sev, desc, valid_assigned,
            resp_date, comp_cost, status
        ))
        row = dict(cur.fetchone())
        for k in ('created_at', 'complaint_date', 'response_date'):
            if row.get(k):
                row[k] = str(row[k])
        if row.get('compensation_cost') is not None:
            row['compensation_cost'] = float(row['compensation_cost'])
        return row
