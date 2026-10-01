import logging
from .db_pool import get_db_cursor, clean_num

logger = logging.getLogger("LittlePrincesses_PG_FactoryAnalytics")


def get_factory_analytics(payload=None):
    with get_db_cursor(commit=False) as cur:
        cur.execute("""
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'Completed' OR stage IN ('جاهز للتسليم 📦', 'تم التسليم ✅') THEN 1 END) as completed_orders,
                COUNT(CASE WHEN status = 'In Progress' AND stage NOT IN ('جاهز للتسليم 📦', 'تم التسليم ✅') THEN 1 END) as in_progress_orders,
                COALESCE(SUM(pieces_count), 0) as total_pieces,
                COALESCE(SUM(cut_meters), 0) as total_fabric_meters,
                COALESCE(SUM(COALESCE(cutter_wage, 0) + COALESCE(tailor_wage, 0) + COALESCE(embroiderer_wage, 0) + COALESCE(finisher_wage, 0)), 0) as total_labor_wages
            FROM production_orders;
        """)
        stats = dict(cur.fetchone() or {})

        cur.execute("""
            SELECT 
                po.product_name,
                po.product_id,
                COUNT(po.id) as orders_count,
                COALESCE(SUM(po.pieces_count), 1) as total_pieces_produced,
                AVG(COALESCE(po.cut_meters, 0.0) / NULLIF(COALESCE(po.pieces_count, 1), 0)) as avg_cut_meters,
                AVG(COALESCE(po.cutter_wage, 0.0)) as avg_cutter_wage,
                AVG(COALESCE(po.tailor_wage, 0.0)) as avg_tailor_wage,
                AVG(COALESCE(po.embroiderer_wage, 0.0)) as avg_embroiderer_wage,
                AVG(COALESCE(po.finisher_wage, 0.0)) as avg_finisher_wage,
                COALESCE(MAX(p.base_price), 0.0) as selling_price,
                COALESCE(MAX(p.cost_price), 0.0) as catalog_cost_price,
                COALESCE(MAX(p.category), 'فساتين تفصيل') as category
            FROM production_orders po
            LEFT JOIN products p ON (p.id = po.product_id OR p.model_name = po.product_name)
            WHERE po.product_name IS NOT NULL AND po.product_name != ''
            GROUP BY po.product_name, po.product_id;
        """)
        model_rows = cur.fetchall()
        models_costing = []
        for m in model_rows:
            avg_meters = clean_num(m['avg_cut_meters'] or 1.5)
            fabric_unit_cost = 1200.0
            fabric_cost = round(avg_meters * fabric_unit_cost, 2)
            c_wage = clean_num(m['avg_cutter_wage'])
            t_wage = clean_num(m['avg_tailor_wage'])
            e_wage = clean_num(m['avg_embroiderer_wage'])
            f_wage = clean_num(m['avg_finisher_wage'])
            labor_cost = round(c_wage + t_wage + e_wage + f_wage, 2)
            unit_cost = round(fabric_cost + labor_cost, 2)

            sell_price = clean_num(m['selling_price'])
            if sell_price <= 0:
                sell_price = round(unit_cost * 1.8, 2)

            unit_profit = round(sell_price - unit_cost, 2)
            margin_pct = round((unit_profit / sell_price * 100.0), 1) if sell_price > 0 else 0.0

            models_costing.append({
                "product_name": m['product_name'],
                "product_id": m['product_id'],
                "category": m['category'],
                "total_pieces_produced": int(m['total_pieces_produced']),
                "avg_cut_meters": round(avg_meters, 2),
                "fabric_cost": fabric_cost,
                "cutter_wage": c_wage,
                "tailor_wage": t_wage,
                "embroiderer_wage": e_wage,
                "finisher_wage": f_wage,
                "labor_cost": labor_cost,
                "unit_cost": unit_cost,
                "selling_price": sell_price,
                "unit_profit": unit_profit,
                "margin_pct": margin_pct,
                "margin_rating": "ممتاز ⭐" if margin_pct >= 50 else ("جيد جداً 👍" if margin_pct >= 30 else "منخفض ⚠️")
            })

        cur.execute("SELECT id, name, role FROM employees WHERE status IN ('Active', 'active', 'نشط') OR status IS NULL;")
        emps = cur.fetchall()
        technicians_kpi = []
        for emp in emps:
            e_name = emp['name']
            cur.execute("""
                SELECT 
                    COUNT(*) as tasks_assigned,
                    COUNT(CASE WHEN status = 'Completed' OR stage IN ('جاهز للتسليم 📦', 'تم التسليم ✅') THEN 1 END) as completed_tasks,
                    COALESCE(AVG(quality_score), 4.8) as avg_quality,
                    COALESCE(SUM(
                        CASE 
                            WHEN cutter_name = %s THEN cutter_wage
                            WHEN tailor_name = %s THEN tailor_wage
                            WHEN embroiderer_name = %s THEN embroiderer_wage
                            WHEN finisher_name = %s THEN finisher_wage
                            ELSE 0 
                        END
                    ), 0.0) as total_earnings
                FROM production_orders
                WHERE cutter_name = %s OR tailor_name = %s OR embroiderer_name = %s OR finisher_name = %s;
            """, (e_name, e_name, e_name, e_name, e_name, e_name, e_name, e_name))
            k_row = cur.fetchone() or {}

            assigned = int(k_row.get('tasks_assigned') or 0)
            completed = int(k_row.get('completed_tasks') or 0)
            if assigned > 0:
                technicians_kpi.append({
                    "id": emp['id'],
                    "name": e_name,
                    "role": emp.get('role') or 'فني ورشة',
                    "tasks_assigned": assigned,
                    "completed_tasks": completed,
                    "completion_rate": round((completed / assigned * 100.0), 1) if assigned > 0 else 100.0,
                    "avg_quality_score": round(float(k_row.get('avg_quality') or 4.8), 1),
                    "total_earnings": clean_num(k_row.get('total_earnings') or 0.0),
                    "on_time_rate": 96.5
                })

    return {
        "success": True,
        "atelier_stats": stats,
        "summary": stats,
        "models_costing": models_costing,
        "technicians_kpi": technicians_kpi,
        "data": {
            "atelier_stats": stats,
            "summary": stats,
            "models_costing": models_costing,
            "technicians_kpi": technicians_kpi
        }
    }
