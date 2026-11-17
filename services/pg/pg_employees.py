import logging
from .db_pool import get_db_cursor, clean_num, clean_str, today_str
from .pg_sequences import get_next_sequence_number
from .pg_audit import log_audit_event, get_active_user_context

logger = logging.getLogger("LittlePrincesses_PG_Employees")


def get_employees(params=None):
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT e.*, COALESCE(t.active_tasks_count, 0) as active_tasks_count
            FROM employees e
            LEFT JOIN (
                SELECT emp_name, COUNT(*) as active_tasks_count FROM (
                    SELECT cutter_name AS emp_name FROM production_orders WHERE status NOT IN ('Completed', 'Delivered', 'Cancelled', 'مكتمل', 'تم التسليم', 'ملغي') AND cutter_name IS NOT NULL AND cutter_name != ''
                    UNION ALL
                    SELECT tailor_name AS emp_name FROM production_orders WHERE status NOT IN ('Completed', 'Delivered', 'Cancelled', 'مكتمل', 'تم التسليم', 'ملغي') AND tailor_name IS NOT NULL AND tailor_name != ''
                    UNION ALL
                    SELECT embroiderer_name AS emp_name FROM production_orders WHERE status NOT IN ('Completed', 'Delivered', 'Cancelled', 'مكتمل', 'تم التسليم', 'ملغي') AND embroiderer_name IS NOT NULL AND embroiderer_name != ''
                    UNION ALL
                    SELECT finisher_name AS emp_name FROM production_orders WHERE status NOT IN ('Completed', 'Delivered', 'Cancelled', 'مكتمل', 'تم التسليم', 'ملغي') AND finisher_name IS NOT NULL AND finisher_name != ''
                ) sub GROUP BY emp_name
            ) t ON (e.name = t.emp_name OR e.full_name = t.emp_name)
            ORDER BY e.created_at DESC;
        """)
        rows = cur.fetchall()
        for r in rows:
            if r.get('created_at'):
                r['created_at'] = str(r['created_at'])
            if r.get('updated_at'):
                r['updated_at'] = str(r['updated_at'])
            sal = float(r.get('salary') or 0.0)
            r['salary'] = sal
            r['baseSalary'] = sal
            r['base_salary'] = sal
            pw = float(r.get('piece_rate') or r.get('piece_wage') or r.get('pieceRate') or r.get('pieceWage') or sal)
            r['piece_rate'] = pw
            r['piece_wage'] = pw
            r['hire_date'] = str(r['hire_date']) if r.get('hire_date') else today_str()
            r['hireDate'] = r['hire_date']
            r['type'] = r.get('type') or r.get('employment_type') or 'راتب شهري'
            r['employment_type'] = r['type']
            r['full_name'] = r.get('full_name') or r.get('name')
            raw_st = str(r.get('status') or 'نشط')
            r['status'] = 'نشط' if raw_st in ('Active', 'active', 'نشط') else 'موقوف'
            r['active_tasks_count'] = int(r.get('active_tasks_count') or 0)
        return rows


def _format_emp_dict(res, default_type, default_hire_date, default_status):
    if res.get('created_at'):
        res['created_at'] = str(res['created_at'])
    if res.get('updated_at'):
        res['updated_at'] = str(res['updated_at'])
    sal = float(res.get('salary') or 0.0)
    res['salary'] = sal
    res['baseSalary'] = sal
    res['base_salary'] = sal
    pw = float(res.get('piece_rate') or res.get('piece_wage') or sal)
    res['piece_rate'] = pw
    res['piece_wage'] = pw
    res['hire_date'] = str(res['hire_date']) if res.get('hire_date') else default_hire_date
    res['hireDate'] = res['hire_date']
    res['type'] = res.get('type') or res.get('employment_type') or default_type
    res['employment_type'] = res['type']
    res['full_name'] = res.get('full_name') or res.get('name')
    res['status'] = res.get('status') or default_status
    return res


def add_employee(payload):
    data = payload.get('data') or payload
    emp_id = clean_str(data.get('id'))
    name = clean_str(data.get('name') or data.get('full_name') or data.get('employee_name'))
    full_name = clean_str(data.get('full_name') or name)
    role = clean_str(data.get('role') or data.get('position') or 'خياط')
    emp_type = clean_str(data.get('type') or data.get('employment_type') or 'راتب شهري')
    employment_type = clean_str(data.get('employment_type') or emp_type)
    phone = clean_str(data.get('phone') or '')
    salary = clean_num(data.get('salary') or data.get('baseSalary') or data.get('base_salary'))
    currency = clean_str(data.get('currency') or 'YER')
    hire_date = clean_str(data.get('hire_date') or data.get('hireDate')) or today_str()
    status = clean_str(data.get('status') or 'نشط')
    notes = clean_str(data.get('notes') or '')

    with get_db_cursor(commit=True) as cur:
        existing = None
        if emp_id:
            cur.execute("SELECT id, name, role, type, salary, phone FROM employees WHERE id = %s;", (emp_id,))
            existing = cur.fetchone()

        if not existing and name:
            cur.execute("""
                SELECT id, name, role, type, salary, phone FROM employees 
                WHERE TRIM(LOWER(name)) = TRIM(LOWER(%s))
                  AND TRIM(LOWER(role)) = TRIM(LOWER(%s))
                  AND (
                      (phone IS NOT NULL AND TRIM(phone) != '' AND TRIM(phone) = TRIM(%s))
                      OR ((phone IS NULL OR TRIM(phone) = '') AND (%s = ''))
                  )
                ORDER BY created_at ASC LIMIT 1;
            """, (name, role, phone, phone))
            existing = cur.fetchone()
            if existing:
                logger.warning("Duplicate employee detected: %s (Reusing existing ID: %s)", name, existing['id'])
                emp_id = existing['id']

        is_update = bool(existing)
        if is_update:
            emp_id = existing['id']
        else:
            emp_id = get_next_sequence_number(cur, 'EMP', fallback_prefix='EMP-')

        cur.execute("""
            INSERT INTO employees (id, name, full_name, role, type, employment_type, phone, salary, currency, hire_date, status, notes, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role,
                type = EXCLUDED.type,
                employment_type = EXCLUDED.employment_type,
                phone = EXCLUDED.phone,
                salary = EXCLUDED.salary,
                currency = EXCLUDED.currency,
                hire_date = EXCLUDED.hire_date,
                status = EXCLUDED.status,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """, (emp_id, name, full_name, role, emp_type, employment_type, phone, salary, currency, hire_date, status, notes))
        res = dict(cur.fetchone())

        user_ctx = get_active_user_context('admin')
        new_val = {'id': emp_id, 'name': name, 'role': role, 'salary': salary, 'status': status}
        log_audit_event(
            entity_type='employees',
            entity_id=emp_id,
            action='UPDATE' if is_update else 'INSERT',
            old_values=dict(existing) if existing else None,
            new_values=new_val,
            user_id=user_ctx,
            document_no=emp_id,
            details=f"{'تحديث' if is_update else 'إضافة'} بيانات الموظف {name} ({emp_id})",
            cur=cur
        )

        return _format_emp_dict(res, emp_type, hire_date, status)


def delete_employee(payload):
    data = payload.get('data') or payload
    emp_id = clean_str(data.get('id'))
    user_ctx = get_active_user_context('admin')
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT id, name, role FROM employees WHERE id = %s;", (emp_id,))
        emp_row = cur.fetchone()
        emp_name = emp_row['name'] if emp_row else emp_id
        cur.execute("DELETE FROM payroll WHERE employee_id = %s;", (emp_id,))
        cur.execute("DELETE FROM employees WHERE id = %s;", (emp_id,))
        log_audit_event(
            entity_type='employees',
            entity_id=emp_id,
            action='DELETE',
            old_values=dict(emp_row) if emp_row else {'id': emp_id},
            user_id=user_ctx,
            document_no=emp_id,
            details=f"حذف الموظف {emp_name} ({emp_id})",
            cur=cur
        )
    return {"success": True, "deleted": True, "id": emp_id}

