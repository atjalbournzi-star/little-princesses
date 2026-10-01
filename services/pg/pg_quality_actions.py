import logging
from .db_pool import (
    get_db_cursor, execute_query, clean_num,
    clean_str, generate_id
)

logger = logging.getLogger("LittlePrincesses_PG_QualityActions")


def get_quality_actions(params=None):
    query = "SELECT * FROM quality_actions ORDER BY created_at DESC;"
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        for k in ('created_at', 'due_date', 'completion_date'):
            if r.get(k):
                r[k] = str(r[k])
    return rows


def add_quality_action(payload):
    data = payload.get('data') or payload
    act_id = clean_str(data.get('id') or data.get('action_id')) or generate_id("CAPA")
    act_type = clean_str(data.get('action_type') or 'Corrective')
    defect_id = clean_str(data.get('defect_id')) or None
    complaint_id = clean_str(data.get('complaint_id')) or None
    prob = clean_str(data.get('problem_statement') or data.get('problem') or 'مشكلة جودة تتطلب إجراء تصحيحي')
    root = clean_str(data.get('root_cause') or '')
    act_desc = clean_str(data.get('action_description') or data.get('action') or 'إجراء وقائي وتصحيحي')
    resp = clean_str(data.get('responsible_person') or data.get('responsible')) or None
    due = clean_str(data.get('due_date')) or None
    comp = clean_str(data.get('completion_date') or data.get('completed_date')) or None
    priority = clean_str(data.get('priority') or 'High')
    status = clean_str(data.get('status') or 'Planned')

    with get_db_cursor(commit=True) as cur:
        valid_def_id = None
        if defect_id:
            cur.execute("SELECT id FROM quality_defects WHERE id = %s LIMIT 1;", (defect_id,))
            if cur.fetchone():
                valid_def_id = defect_id

        valid_cmp_id = None
        if complaint_id:
            cur.execute("SELECT id FROM quality_complaints WHERE id = %s LIMIT 1;", (complaint_id,))
            if cur.fetchone():
                valid_cmp_id = complaint_id

        valid_resp = None
        if resp:
            cur.execute("SELECT id FROM users WHERE id = %s OR username = %s LIMIT 1;", (resp, resp))
            u_row = cur.fetchone()
            if u_row:
                valid_resp = u_row['id']

        cur.execute("""
            INSERT INTO quality_actions (
                id, action_type, defect_id, complaint_id, problem_statement,
                root_cause, action_description, responsible_person, due_date,
                completion_date, priority, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                action_type = EXCLUDED.action_type,
                problem_statement = EXCLUDED.problem_statement,
                root_cause = EXCLUDED.root_cause,
                action_description = EXCLUDED.action_description,
                priority = EXCLUDED.priority,
                status = EXCLUDED.status,
                completion_date = EXCLUDED.completion_date
            RETURNING *;
        """, (
            act_id, act_type, valid_def_id, valid_cmp_id, prob,
            root, act_desc, valid_resp, due, comp, priority, status
        ))
        row = dict(cur.fetchone())
        for k in ('created_at', 'due_date', 'completion_date'):
            if row.get(k):
                row[k] = str(row[k])
        return row


def ensure_quality_seed_data():
    try:
        from domains.quality.default_data import DEFAULT_QUALITY_CHECKPOINTS, DEFAULT_QUALITY_SETTINGS
        with get_db_cursor(commit=True) as cur:
            for chk in DEFAULT_QUALITY_CHECKPOINTS:
                cid, name, stage, desc, req, crit, tol, act = chk
                cur.execute("""
                    INSERT INTO quality_checkpoints (id, checkpoint_name, production_stage, description, required, criteria, tolerance, active)
                    VALUES (%s, %s, %s, %s, %s, %s, 0.0, %s)
                    ON CONFLICT (id) DO NOTHING;
                """, (cid, name, stage, desc, req == 'نعم', crit, act == 'Active'))

            for s in DEFAULT_QUALITY_SETTINGS:
                name, code, formula, target, warn, crit, weight, act = s
                sid = f"QSET-{code}"
                cur.execute("""
                    INSERT INTO quality_settings (id, metric_name, metric_code, formula, target, warning_threshold, critical_threshold, weight, active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (metric_code) DO NOTHING;
                """, (sid, name, code, formula, target, warn, crit, weight, act == 'Active'))
    except Exception as e:
        logger.warning(f"Quality seed check note: {e}")


def get_quality_checkpoints(params=None):
    query = "SELECT * FROM quality_checkpoints ORDER BY id ASC;"
    rows = execute_query(query, fetch_all=True)
    if not rows:
        ensure_quality_seed_data()
        rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('created_at'):
            r['created_at'] = str(r['created_at'])
        if r.get('tolerance') is not None:
            r['tolerance'] = float(r['tolerance'])
    return rows


def save_quality_checkpoint(payload):
    data = payload.get('data') or payload
    chk_id = clean_str(data.get('id') or data.get('checkpoint_id')) or generate_id("CHK")
    name = clean_str(data.get('checkpoint_name') or data.get('name') or 'معيار فحص')
    stage = clean_str(data.get('production_stage') or data.get('stage') or 'الفحص النهائي')
    desc = clean_str(data.get('description') or '')
    req = bool(data.get('required', True))
    crit = clean_str(data.get('criteria') or '')
    tol = clean_num(data.get('tolerance') or 0.0)
    act = bool(data.get('active', True))

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO quality_checkpoints (id, checkpoint_name, production_stage, description, required, criteria, tolerance, active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                checkpoint_name = EXCLUDED.checkpoint_name,
                production_stage = EXCLUDED.production_stage,
                description = EXCLUDED.description,
                required = EXCLUDED.required,
                criteria = EXCLUDED.criteria,
                tolerance = EXCLUDED.tolerance,
                active = EXCLUDED.active
            RETURNING *;
        """, (chk_id, name, stage, desc, req, crit, tol, act))
        row = dict(cur.fetchone())
        if row.get('created_at'):
            row['created_at'] = str(row['created_at'])
        if row.get('tolerance') is not None:
            row['tolerance'] = float(row['tolerance'])
        return row


def get_quality_settings(params=None):
    query = "SELECT * FROM quality_settings ORDER BY id ASC;"
    rows = execute_query(query, fetch_all=True)
    if not rows:
        ensure_quality_seed_data()
        rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('created_at'):
            r['created_at'] = str(r['created_at'])
        for k in ('target', 'warning_threshold', 'critical_threshold', 'weight'):
            if r.get(k) is not None:
                r[k] = float(r[k])
    return rows


def save_quality_settings(payload):
    data = payload.get('data') or payload
    s_id = clean_str(data.get('id')) or generate_id("QSET")
    name = clean_str(data.get('metric_name') or data.get('name') or 'مؤشر جودة')
    code = clean_str(data.get('metric_code') or data.get('code') or generate_id("MTR"))
    formula = clean_str(data.get('formula') or '')
    target = clean_num(data.get('target') or 95.0)
    warn = clean_num(data.get('warning_threshold') or 85.0)
    crit = clean_num(data.get('critical_threshold') or 70.0)
    weight = clean_num(data.get('weight') or 1.0)
    act = bool(data.get('active', True))

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO quality_settings (id, metric_name, metric_code, formula, target, warning_threshold, critical_threshold, weight, active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (metric_code) DO UPDATE SET
                metric_name = EXCLUDED.metric_name,
                formula = EXCLUDED.formula,
                target = EXCLUDED.target,
                warning_threshold = EXCLUDED.warning_threshold,
                critical_threshold = EXCLUDED.critical_threshold,
                weight = EXCLUDED.weight,
                active = EXCLUDED.active
            RETURNING *;
        """, (s_id, name, code, formula, target, warn, crit, weight, act))
        row = dict(cur.fetchone())
        if row.get('created_at'):
            row['created_at'] = str(row['created_at'])
        for k in ('target', 'warning_threshold', 'critical_threshold', 'weight'):
            if row.get(k) is not None:
                row[k] = float(row[k])
        return row
