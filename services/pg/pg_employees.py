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
            r['hire_date'] = str(r['hire_date']) if r.get('hire_date') else today_str()
            r['hireDate'] = r['hire_date']
            r['type'] = r.get('type') or 'راتب شهري'
            raw_st = str(r.get('status') or 'نشط')
            r['status'] = 'نشط' if raw_st in ('Active', 'active', 'نشط') else 'موقوف'
        return rows


def add_employee(payload):
    data = payload.get('data') or payload
    emp_id = clean_str(data.get('id')) or generate_id("EMP")
    name = clean_str(data.get('name') or data.get('employee_name'))
    role = clean_str(data.get('role') or data.get('position') or 'خياط')
    emp_type = clean_str(data.get('type') or 'راتب شهري')
    phone = clean_str(data.get('phone') or '')
    salary = clean_num(data.get('salary') or data.get('baseSalary') or data.get('base_salary'))
    currency = clean_str(data.get('currency') or 'YER')
    hire_date = clean_str(data.get('hire_date') or data.get('hireDate')) or today_str()
    status = clean_str(data.get('status') or 'نشط')
    notes = clean_str(data.get('notes') or '')

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO employees (id, name, role, type, phone, salary, currency, hire_date, status, notes, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                type = EXCLUDED.type,
                phone = EXCLUDED.phone,
                salary = EXCLUDED.salary,
                currency = EXCLUDED.currency,
                hire_date = EXCLUDED.hire_date,
                status = EXCLUDED.status,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """, (emp_id, name, role, emp_type, phone, salary, currency, hire_date, status, notes))
        res = dict(cur.fetchone())
        if res.get('created_at'):
            res['created_at'] = str(res['created_at'])
        if res.get('updated_at'):
            res['updated_at'] = str(res['updated_at'])
        sal = float(res.get('salary') or 0.0)
        res['salary'] = sal
        res['baseSalary'] = sal
        res['base_salary'] = sal
        res['hire_date'] = str(res['hire_date']) if res.get('hire_date') else hire_date
        res['hireDate'] = res['hire_date']
        res['type'] = res.get('type') or emp_type
        res['status'] = status
        return res


def delete_employee(payload):
    data = payload.get('data') or payload
    emp_id = clean_str(data.get('id'))
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM payroll WHERE employee_id = %s;", (emp_id,))
        cur.execute("DELETE FROM employees WHERE id = %s;", (emp_id,))
    return {"success": True, "deleted": True, "id": emp_id}

