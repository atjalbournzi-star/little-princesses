import logging
from .db_pool import get_db_cursor, clean_num, clean_str, generate_id, today_str

logger = logging.getLogger("LittlePrincesses_PG_Employees")


def get_employees(params=None):
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM employees ORDER BY created_at DESC;")
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
    emp_id = clean_str(data.get('id')) or generate_id("EMP")
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
        # Deduplication Guard: Check if employee already exists with same name, role and phone
        cur.execute("SELECT id FROM employees WHERE id = %s;", (emp_id,))
        id_exists = cur.fetchone()

        if not id_exists:
            cur.execute("""
                SELECT id FROM employees 
                WHERE TRIM(LOWER(name)) = TRIM(LOWER(%s))
                  AND TRIM(LOWER(role)) = TRIM(LOWER(%s))
                  AND (
                      (phone IS NOT NULL AND TRIM(phone) != '' AND TRIM(phone) = TRIM(%s))
                      OR ((phone IS NULL OR TRIM(phone) = '') AND (%s = ''))
                  )
                ORDER BY created_at ASC LIMIT 1;
            """, (name, role, phone, phone))
            duplicate = cur.fetchone()
            if duplicate:
                logger.warning("Duplicate employee detected: %s (Reusing existing ID: %s)", name, duplicate['id'])
                emp_id = duplicate['id']

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
        return _format_emp_dict(res, emp_type, hire_date, status)


def delete_employee(payload):
    data = payload.get('data') or payload
    emp_id = clean_str(data.get('id'))
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM payroll WHERE employee_id = %s;", (emp_id,))
        cur.execute("DELETE FROM employees WHERE id = %s;", (emp_id,))
    return {"success": True, "deleted": True, "id": emp_id}

