# services/pg/pg_quality_intelligence.py
# Real-time Quality Intelligence & Multi-Dimensional Analytics from PostgreSQL
# Architectural Standards: Strictly < 220 lines per file

import logging
from .db_pool import get_db_cursor, clean_num, clean_str

logger = logging.getLogger("LittlePrincesses_PG_QualityIntelligence")


def get_quality_intelligence(dimension=None):
    """
    Computes real-time Quality Intelligence metrics and multi-dimensional breakdowns
    directly from live PostgreSQL tables (quality_inspections, quality_defects, quality_complaints).
    Zero Hardcoding: 100% computed from persistent database state.
    """
    dim = clean_str(dimension or 'summary').lower()

    with get_db_cursor(commit=False) as cur:
        # 1. Dimension: Defects Analysis
        if dim == 'defects':
            cur.execute("""
                SELECT COALESCE(defect_type, defect_category, 'عام') as defect_category,
                       COALESCE(severity, 'Medium') as severity,
                       COALESCE(production_stage, 'غير محدد') as stage,
                       COUNT(*) as total_count,
                       COALESCE(SUM(rework_cost), 0.0) as total_rework_cost,
                       COALESCE(SUM(waste_cost), 0.0) as total_waste_cost,
                       COALESCE(SUM(total_cost), 0.0) as total_cost
                FROM quality_defects
                GROUP BY defect_category, severity, stage
                ORDER BY total_count DESC;
            """)
            rows = [dict(r) for r in cur.fetchall() or []]
            for r in rows:
                for k in ('total_rework_cost', 'total_waste_cost', 'total_cost'):
                    r[k] = float(r[k])
            return {'dimension': 'defects', 'categories': rows, 'count': len(rows)}

        # 2. Dimension: Workers / Tailors Quality Ranking
        if dim in ('workers', 'tailors'):
            cur.execute("""
                SELECT COALESCE(inspector_name, 'غير محدد') as worker_name,
                       COUNT(*) as total_checked,
                       COALESCE(SUM(quantity_passed), 0) as total_passed,
                       COALESCE(SUM(quantity_failed), 0) as total_failed,
                       ROUND(COALESCE(AVG(CASE WHEN inspection_result IN ('PASS', 'PASSED', 'ناجح') THEN 100.0 ELSE 0.0 END), 100.0), 1) as pass_rate
                FROM quality_inspections
                GROUP BY worker_name
                ORDER BY pass_rate DESC, total_checked DESC;
            """)
            rows = [dict(r) for r in cur.fetchall() or []]
            for r in rows:
                r['pass_rate'] = float(r['pass_rate'])
            return {'dimension': 'workers', 'workers': rows, 'count': len(rows)}

        # 3. Dimension: Production Stages Performance
        if dim in ('stages', 'production_stages'):
            cur.execute("""
                SELECT COALESCE(production_stage, 'مرحلة عامة') as stage_name,
                       COUNT(*) as total_inspections,
                       COALESCE(SUM(quantity_passed), 0) as total_passed,
                       COALESCE(SUM(quantity_failed), 0) as total_failed,
                       ROUND(COALESCE(AVG(CASE WHEN inspection_result IN ('PASS', 'PASSED', 'ناجح') THEN 100.0 ELSE 0.0 END), 100.0), 1) as fpy
                FROM quality_inspections
                GROUP BY stage_name
                ORDER BY total_inspections DESC;
            """)
            rows = [dict(r) for r in cur.fetchall() or []]
            for r in rows:
                r['fpy'] = float(r['fpy'])
            return {'dimension': 'stages', 'stages': rows, 'count': len(rows)}

        # 4. Dimension: Trends / Chronological Metrics
        if dim in ('trends', 'timeline'):
            cur.execute("""
                SELECT TO_CHAR(inspection_date, 'YYYY-MM') as period,
                       COUNT(*) as total_inspections,
                       COALESCE(SUM(CASE WHEN inspection_result IN ('PASS', 'PASSED', 'ناجح') THEN 1 ELSE 0 END), 0) as passed,
                       COALESCE(SUM(CASE WHEN inspection_result NOT IN ('PASS', 'PASSED', 'ناجح') THEN 1 ELSE 0 END), 0) as failed
                FROM quality_inspections
                WHERE inspection_date IS NOT NULL
                GROUP BY period
                ORDER BY period ASC;
            """)
            rows = [dict(r) for r in cur.fetchall() or []]
            return {'dimension': 'trends', 'trends': rows, 'count': len(rows)}

        # 5. Default: Overall Executive Quality Intelligence Summary
        cur.execute("""
            SELECT COUNT(*) as total_inspections,
                   COALESCE(SUM(CASE WHEN inspection_result IN ('PASS', 'PASSED', 'ناجح') THEN 1 ELSE 0 END), 0) as passed_count,
                   COALESCE(SUM(CASE WHEN inspection_result NOT IN ('PASS', 'PASSED', 'ناجح') THEN 1 ELSE 0 END), 0) as failed_count,
                   COALESCE(SUM(quantity_checked), 0) as total_units_checked,
                   COALESCE(SUM(quantity_passed), 0) as total_units_passed
            FROM quality_inspections;
        """)
        insp_stats = dict(cur.fetchone() or {})
        tot_insp = int(insp_stats.get('total_inspections') or 0)
        passed_insp = int(insp_stats.get('passed_count') or 0)
        fpy = round((passed_insp / max(1, tot_insp)) * 100.0, 1) if tot_insp > 0 else 100.0

        cur.execute("SELECT COUNT(*) as total_defects, COALESCE(SUM(total_cost), 0.0) as total_coq FROM quality_defects;")
        def_stats = dict(cur.fetchone() or {})
        tot_defects = int(def_stats.get('total_defects') or 0)
        tot_coq = float(def_stats.get('total_coq') or 0.0)

        cur.execute("SELECT COUNT(*) as total_complaints FROM quality_complaints;")
        tot_complaints = int((cur.fetchone() or {}).get('total_complaints') or 0)

        cur.execute("SELECT COUNT(*) as total_actions, COALESCE(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END), 0) as completed_actions FROM quality_actions;")
        act_stats = dict(cur.fetchone() or {})

        cur.execute("""
            SELECT COALESCE(defect_type, 'عيب عام') as name, COUNT(*) as count
            FROM quality_defects GROUP BY name ORDER BY count DESC LIMIT 5;
        """)
        top_defects = [dict(r) for r in cur.fetchall() or []]

        return {
            'dimension': 'summary',
            'first_pass_yield': fpy,
            'fpy_label': f"{fpy}%",
            'total_inspections': tot_insp,
            'passed_inspections': passed_insp,
            'failed_inspections': int(insp_stats.get('failed_count') or 0),
            'total_defects': tot_defects,
            'cost_of_quality': tot_coq,
            'total_complaints': tot_complaints,
            'capa_actions_total': int(act_stats.get('total_actions') or 0),
            'capa_actions_completed': int(act_stats.get('completed_actions') or 0),
            'top_defects': top_defects,
            'quality_health': 'EXCELLENT' if fpy >= 95.0 else ('GOOD' if fpy >= 85.0 else 'ATTENTION_REQUIRED')
        }
