# scripts/migrate_employee_ids.py
# Migrates timestamp-based employee IDs to official sequential number sequences (EMP-000001...)
# Complies with Software & Financial Governance: atomic transaction, no hard delete, audit logging.

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import db_client
from services.pg.pg_audit import log_audit_event


def run_migration():
    with db_client.get_db_cursor(commit=True) as cur:
        # 1. Read EMP sequence definition dynamically from database
        cur.execute("""
            SELECT prefix, padding, current_number 
            FROM number_sequences 
            WHERE sequence_key = 'EMP' 
            FOR UPDATE;
        """)
        seq_row = cur.fetchone()
        if not seq_row:
            raise RuntimeError("تعريف تسلسل الموظفين (EMP) غير موجود في جدول number_sequences!")

        prefix = seq_row['prefix']
        padding = int(seq_row['padding'])
        current_num = int(seq_row['current_number'])

        print(f"📊 التسلسل الحالي في قاعدة البيانات: prefix='{prefix}', padding={padding}, current_number={current_num}")

        # 2. Select employees with timestamp-based IDs in order of creation
        cur.execute("""
            SELECT id, name, role, salary, created_at 
            FROM employees 
            WHERE id ~ '^EMP-[0-9]{10,}$' 
            ORDER BY created_at ASC;
        """)
        legacy_emps = cur.fetchall()
        print(f"🔍 عُثر على {len(legacy_emps)} موظفين يحملون معرفات زمنية للتحويل.")

        if not legacy_emps:
            print("✅ لا توجد سجلات موظفين بمعرفات زمنية بحاجة للتحويل.")
            return

        migrated_mappings = []
        for emp in legacy_emps:
            old_id = emp['id']
            current_num += 1
            new_id = f"{prefix}{str(current_num).zfill(padding)}"
            migrated_mappings.append((old_id, new_id, emp['name'], emp['role']))

            print(f"  🔄 تحويل: {emp['name']} ({emp['role']}) | القديم: {old_id} ➔ الجديد: {new_id}")

            # 3. Update referencing tables first (if any exist)
            try:
                cur.execute("UPDATE payroll SET employee_id = %s WHERE employee_id = %s;", (new_id, old_id))
            except Exception as e:
                print(f"    ℹ️ payroll update: {e}")

            try:
                cur.execute("UPDATE employee_advances SET employee_id = %s WHERE employee_id = %s;", (new_id, old_id))
            except Exception as e:
                print(f"    ℹ️ employee_advances update: {e}")

            try:
                cur.execute("UPDATE tailor_commissions SET employee_id = %s WHERE employee_id = %s;", (new_id, old_id))
            except Exception as e:
                print(f"    ℹ️ tailor_commissions update: {e}")

            # 4. Update audit_logs references
            try:
                cur.execute("""
                    UPDATE audit_logs 
                    SET entity_id = %s, document_no = %s 
                    WHERE entity_type = 'employees' AND entity_id = %s;
                """, (new_id, new_id, old_id))
                cur.execute("""
                    UPDATE audit_logs 
                    SET details = REPLACE(details, %s, %s) 
                    WHERE entity_type = 'employees' AND details LIKE %s;
                """, (old_id, new_id, f"%{old_id}%"))
            except Exception as e:
                print(f"    ℹ️ audit_logs update: {e}")

            # 5. Update employees table primary key
            cur.execute("""
                UPDATE employees 
                SET id = %s, updated_at = CURRENT_TIMESTAMP 
                WHERE id = %s;
            """, (new_id, old_id))

        # 6. Update number_sequences with the last sequential number
        cur.execute("""
            UPDATE number_sequences 
            SET current_number = %s, updated_at = CURRENT_TIMESTAMP 
            WHERE sequence_key = 'EMP';
        """, (current_num,))

        # 7. Log audit event for migration
        log_audit_event(
            entity_type='number_sequences',
            entity_id='SEQ-EMP',
            action='MIGRATION',
            old_values={'current_number': seq_row['current_number']},
            new_values={'current_number': current_num, 'migrated_count': len(legacy_emps)},
            user_id='admin',
            document_no='SEQ-EMP',
            details=f"ترحيل وتحديث أرقام {len(legacy_emps)} موظفين للتسلسل الرسمي وضبط العداد إلى {current_num}",
            cur=cur
        )

        print(f"✅ تم الانتهاء بنجاح! تم تحديث العداد current_number لـ 'EMP' ليصبح: {current_num}")


if __name__ == '__main__':
    run_migration()
