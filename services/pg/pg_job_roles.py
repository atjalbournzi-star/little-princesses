# services/pg/pg_job_roles.py
# Centralized Job Roles and Technical Specialties Service for Little Princesses ERP

import re
import logging
from .db_pool import get_db_cursor, clean_str, clean_num, today_str
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, get_active_user_context

logger = logging.getLogger("LittlePrincesses_PG_JobRoles")

INITIAL_ROLES = [
    {
        "role_code": "ROLE-0001", "role_key": "cutter", "role_name": "القصاص (قص وتفصيل)",
        "display_name": "القصاص (قص وتفصيل)", "department": "المعمل والإنتاج",
        "is_production": True, "wage_key": "cutter_wage", "icon": "✂️", "color": "#f43f5e", "sort_order": 1
    },
    {
        "role_code": "ROLE-0002", "role_key": "tailor", "role_name": "خياط",
        "display_name": "خياط", "department": "المعمل والإنتاج",
        "is_production": True, "wage_key": "tailor_wage", "icon": "🪡", "color": "#38bdf8", "sort_order": 2
    },
    {
        "role_code": "ROLE-0003", "role_key": "embroiderer", "role_name": "تطريز",
        "display_name": "فني تطريز وشك", "department": "المعمل والإنتاج",
        "is_production": True, "wage_key": "embroiderer_wage", "icon": "✨", "color": "#c084fc", "sort_order": 3
    },
    {
        "role_code": "ROLE-0004", "role_key": "finisher", "role_name": "تشطيب",
        "display_name": "فني تشطيب وكي", "department": "المعمل والإنتاج",
        "is_production": True, "wage_key": "finisher_wage", "icon": "🔍", "color": "#34d399", "sort_order": 4
    },
    {
        "role_code": "ROLE-0005", "role_key": "packager", "role_name": "تكلفة التغليف والإكسسوارات",
        "display_name": "تكلفة التغليف والإكسسوارات", "department": "المعمل والإنتاج",
        "is_production": False, "wage_key": "packaging_cost", "icon": "📦", "color": "#fbbf24", "sort_order": 5
    },
    {
        "role_code": "ROLE-0006", "role_key": "management", "role_name": "إدارة",
        "display_name": "إدارة وإشراف عام", "department": "الإدارة العامة",
        "is_production": False, "wage_key": None, "icon": "🏢", "color": "#94a3b8", "sort_order": 6
    }
]


def ensure_job_roles_schema(cur):
    """تهيئة جدول المسميات الوظيفية والتسلسل الرقمي الخاص به وضمان التوافق التام"""
    cur.execute("""
        CREATE TABLE IF NOT EXISTS job_roles (
            id VARCHAR(64) PRIMARY KEY,
            role_code VARCHAR(50) UNIQUE NOT NULL,
            role_key VARCHAR(50) UNIQUE NOT NULL,
            role_name VARCHAR(100) NOT NULL,
            display_name VARCHAR(150),
            department VARCHAR(100) NOT NULL DEFAULT 'المعمل والإنتاج',
            is_production BOOLEAN NOT NULL DEFAULT true,
            wage_key VARCHAR(50),
            icon VARCHAR(20) DEFAULT '🧵',
            color VARCHAR(30) DEFAULT '#ec4899',
            sort_order INT DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_job_roles_key ON job_roles(role_key);
        CREATE INDEX IF NOT EXISTS idx_job_roles_name ON job_roles(role_name);
        CREATE INDEX IF NOT EXISTS idx_job_roles_is_prod ON job_roles(is_production);
    """)

    cur.execute("""
        INSERT INTO number_sequences (id, entity, sequence_key, prefix, current_number, padding, description)
        VALUES ('SEQ-ROLE', 'job_roles', 'ROLE', 'ROLE-', 6, 4, 'تسلسل المسميات الوظيفية والتخصصات')
        ON CONFLICT (sequence_key) DO NOTHING;
    """)

    for r in INITIAL_ROLES:
        cur.execute("""
            INSERT INTO job_roles (
                id, role_code, role_key, role_name, display_name,
                department, is_production, wage_key, icon, color, sort_order, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, true)
            ON CONFLICT (role_key) DO NOTHING;
        """, (
            r["role_code"], r["role_code"], r["role_key"], r["role_name"],
            r["display_name"], r["department"], r["is_production"],
            r["wage_key"], r["icon"], r["color"], r["sort_order"]
        ))


def get_job_roles(params=None):
    """استرجاع كافة المسميات الوظيفية والتخصصات الفنية مع دعم الفلترة"""
    params = params or {}
    is_prod = params.get('is_production')
    active_only = params.get('active_only', True)

    with get_db_cursor() as cur:
        ensure_job_roles_schema(cur)
        query = "SELECT * FROM job_roles WHERE 1=1"
        args = []
        if active_only:
            query += " AND is_active = true"
        if is_prod is not None:
            bool_val = str(is_prod).lower() in ('true', '1', 'yes')
            query += " AND is_production = %s"
            args.append(bool_val)
        query += " ORDER BY sort_order ASC, created_at ASC;"
        cur.execute(query, tuple(args))
        rows = cur.fetchall()
        for r in rows:
            if r.get('created_at'): r['created_at'] = str(r['created_at'])
            if r.get('updated_at'): r['updated_at'] = str(r['updated_at'])
            r['is_production'] = bool(r.get('is_production'))
            r['is_active'] = bool(r.get('is_active'))
        return rows


def add_job_role(payload):
    """إضافة مسمى وظيفي جديد عبر محرك الترقيم المتسلسل والتدقيق المحاسبي"""
    data = payload.get('data') or payload
    name = clean_str(data.get('role_name') or data.get('name'))
    if not name:
        raise ValueError("اسم المسمى الوظيفي مطلوب")

    disp_name = clean_str(data.get('display_name') or name)
    dept = clean_str(data.get('department') or 'المعمل والإنتاج')
    is_prod = bool(data.get('is_production', True))
    raw_key = clean_str(data.get('role_key') or '')
    icon = clean_str(data.get('icon') or ('🧵' if is_prod else '🏢'))
    color = clean_str(data.get('color') or ('#ec4899' if is_prod else '#94a3b8'))

    with get_db_cursor(commit=True) as cur:
        ensure_job_roles_schema(cur)
        cur.execute("""
            SELECT * FROM job_roles 
            WHERE TRIM(LOWER(role_name)) = TRIM(LOWER(%s))
               OR (NULLIF(%s, '') IS NOT NULL AND role_key = %s)
            LIMIT 1;
        """, (name, raw_key, raw_key))
        existing = cur.fetchone()
        if existing:
            return dict(existing)

        role_code = get_next_sequence_number(cur, 'ROLE', fallback_prefix='ROLE-', fallback_padding=4)
        clean_num_str = re.sub(r'[^0-9]', '', role_code) or '99'
        role_key = raw_key or f"role_{clean_num_str}"
        wage_key = clean_str(data.get('wage_key')) or (f"{role_key}_wage" if is_prod else None)

        cur.execute("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort FROM job_roles;")
        next_sort = cur.fetchone()['next_sort']

        cur.execute("""
            INSERT INTO job_roles (
                id, role_code, role_key, role_name, display_name,
                department, is_production, wage_key, icon, color, sort_order, is_active, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, true, CURRENT_TIMESTAMP)
            RETURNING *;
        """, (role_code, role_code, role_key, name, disp_name, dept, is_prod, wage_key, icon, color, next_sort))
        res = dict(cur.fetchone())

        user_ctx = get_active_user_context('admin')
        log_audit_event(
            entity_type='job_roles',
            entity_id=role_code,
            action='INSERT',
            new_values={'code': role_code, 'key': role_key, 'name': name, 'dept': dept, 'is_prod': is_prod},
            user_id=user_ctx,
            document_no=role_code,
            details=f"إضافة مسمى وظيفي جديد: {name} ({role_code})",
            cur=cur
        )

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        res['is_production'] = bool(res.get('is_production'))
        res['is_active'] = bool(res.get('is_active'))
        return res
