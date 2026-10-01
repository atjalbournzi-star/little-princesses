import logging
from .db_pool import get_db_cursor
from .pg_quality_inspections import get_quality_inspections, get_quality_defects
from .pg_quality_feedback import get_quality_feedback, get_quality_complaints
from .pg_quality_returns import get_quality_returns
from .pg_quality_actions import (
    get_quality_actions,
    get_quality_checkpoints,
    get_quality_settings
)

logger = logging.getLogger("LittlePrincesses_PG_QualityDashboard")


def get_quality_dashboard_pg(params=None):
    inspections = get_quality_inspections()
    defects = get_quality_defects()
    feedback = get_quality_feedback()
    complaints = get_quality_complaints()
    returns = get_quality_returns()
    actions = get_quality_actions()
    checkpoints = get_quality_checkpoints()
    settings = get_quality_settings()

    total_orders = 0
    total_sales = 0.0
    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_sales FROM orders;")
            ord_stats = cur.fetchone()
            if ord_stats:
                total_orders = ord_stats['total_orders'] or 0
                total_sales = float(ord_stats['total_sales'] or 0.0)
    except Exception:
        pass

    total_inspections = len(inspections)
    passed_inspections = sum(1 for i in inspections if str(i.get('inspection_result', '')).upper() in ('PASS', 'PASSED', 'ناجح'))
    first_pass_yield = round((passed_inspections / total_inspections * 100), 1) if total_inspections > 0 else 100.0

    total_defects = len(defects)
    base_units = max(total_inspections, total_orders, 1)
    defect_rate = round((total_defects / base_units * 100), 1)

    total_fb = len(feedback)
    if total_fb > 0:
        ratings = [float(f.get('rating') or 5.0) for f in feedback]
        csat = round(sum(ratings) / total_fb, 1)
        promoters = sum(1 for r in ratings if r >= 5.0)
        detractors = sum(1 for r in ratings if r <= 3.0)
        nps = round(((promoters - detractors) / total_fb) * 100)
    else:
        csat = 5.0
        nps = 100

    rework_cost = sum(float(d.get('rework_cost') or 0.0) for d in defects)
    waste_cost = sum(float(d.get('waste_cost') or 0.0) for d in defects)
    return_cost = sum(float(r.get('refund_amount') or 0.0) for r in returns)
    replacement_cost = sum(float(r.get('replacement_cost') or 0.0) for r in returns)
    comp_cost = sum(float(c.get('compensation_cost') or 0.0) for c in complaints)
    total_copq = round(rework_cost + waste_cost + return_cost + replacement_cost + comp_cost, 2)
    copq_pct = round((total_copq / total_sales * 100), 1) if total_sales > 0 else 0.0

    prod_score = max(50.0, min(100.0, round(100.0 - (defect_rate * 3.0), 1)))
    cust_score = max(50.0, min(100.0, round((csat / 5.0) * 100.0, 1)))
    supp_score = 98.0
    oqs = round((prod_score * 0.35) + (cust_score * 0.35) + (supp_score * 0.30), 1)

    return {
        'oqs': oqs,
        'defect_rate': defect_rate,
        'first_pass_yield': first_pass_yield,
        'fpy': first_pass_yield,
        'csat': csat,
        'csat_percentage': round((csat / 5.0) * 100.0, 1),
        'nps': nps,
        'copq': total_copq,
        'copq_total': total_copq,
        'copq_percentage': copq_pct,
        'total_inspections': total_inspections,
        'total_defects': total_defects,
        'total_feedback': total_fb,
        'total_complaints': len(complaints),
        'total_returns': len(returns),
        'total_actions': len(actions),
        'total_evaluations': 0,
        'inspections': inspections,
        'defects': defects,
        'feedback': feedback,
        'complaints': complaints,
        'returns': returns,
        'corrective_actions': actions,
        'checkpoints': checkpoints,
        'settings': settings,
        'evaluations': []
    }


def get_quality_summary(params=None):
    with get_db_cursor(commit=False) as cur:
        cur.execute("SELECT count(*) as total_inspections FROM quality_inspections;")
        tot_insp = cur.fetchone()['total_inspections']
        cur.execute("SELECT count(*) as total_defects FROM quality_defects;")
        tot_def = cur.fetchone()['total_defects']
        cur.execute("SELECT count(*) as total_feedback, COALESCE(avg(rating), 5.0) as avg_rating FROM quality_feedback;")
        fb_info = cur.fetchone()
    return {
        "totalInspections": tot_insp,
        "totalDefects": tot_def,
        "totalFeedback": fb_info['total_feedback'],
        "averageRating": float(fb_info['avg_rating']),
        "status": "Healthy"
    }
