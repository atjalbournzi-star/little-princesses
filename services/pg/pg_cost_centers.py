# services/pg/pg_cost_centers.py
# Cost centers management and querying for Little Princesses ERP

from .db_pool import execute_query, clean_str


def get_cost_centers(params=None):
    """استرجاع مراكز التكلفة النشطة من قاعدة بيانات Supabase حصراً دون أي قيم ثابتة"""
    query = """
        SELECT id, code, name, name_en, is_active, created_at
        FROM cost_centers
        WHERE is_active = true
        ORDER BY code ASC;
    """
    rows = execute_query(query, fetch_all=True) or []
    res = []
    for r in rows:
        d = dict(r)
        if d.get('created_at'):
            d['created_at'] = str(d['created_at'])
        res.append(d)
    return res
