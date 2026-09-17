# domains/quality/db_tables.py
# Quality management table definitions

def create_quality_tables(c):
    c.execute('''
        CREATE TABLE IF NOT EXISTS quality_master_evaluations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id TEXT UNIQUE NOT NULL,
            record_date TEXT DEFAULT '',
            evaluation_type TEXT DEFAULT 'Customer',
            entity_type TEXT DEFAULT 'Product',
            entity_id TEXT DEFAULT '',
            entity_name TEXT DEFAULT '',
            department TEXT DEFAULT 'الإنتاج',
            related_product_id TEXT DEFAULT '',
            related_order_id TEXT DEFAULT '',
            related_production_order_id TEXT DEFAULT '',
            related_customer_id TEXT DEFAULT '',
            related_supplier_id TEXT DEFAULT '',
            related_material_id TEXT DEFAULT '',
            related_employee_id TEXT DEFAULT '',
            model_id TEXT DEFAULT '',
            sku TEXT DEFAULT '',
            color TEXT DEFAULT '',
            size TEXT DEFAULT '',
            fabric_id TEXT DEFAULT '',
            production_stage TEXT DEFAULT 'الفحص النهائي',
            quality_criteria TEXT DEFAULT 'معايير الجودة العامة',
            metric_code TEXT DEFAULT 'OQS',
            score REAL DEFAULT 5.0,
            max_score REAL DEFAULT 5.0,
            percentage REAL DEFAULT 100.0,
            status TEXT DEFAULT 'Active',
            severity TEXT DEFAULT 'Low',
            issue_type TEXT DEFAULT 'None',
            defect_type TEXT DEFAULT '',
            comment TEXT DEFAULT '',
            evidence_url TEXT DEFAULT '',
            root_cause TEXT DEFAULT '',
            corrective_action TEXT DEFAULT '',
            responsible_id TEXT DEFAULT '',
            due_date TEXT DEFAULT '',
            resolution_date TEXT DEFAULT '',
            cost REAL DEFAULT 0.0,
            source_module TEXT DEFAULT 'Quality',
            source_record_id TEXT DEFAULT '',
            created_by TEXT DEFAULT 'مفتش الجودة',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS quality_inspections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inspection_id TEXT UNIQUE NOT NULL,
            inspection_date TEXT DEFAULT '',
            product_id TEXT DEFAULT '',
            product_name TEXT DEFAULT '',
            sku TEXT DEFAULT '',
            model_id TEXT DEFAULT '',
            color TEXT DEFAULT '',
            size TEXT DEFAULT '',
            production_order_id TEXT DEFAULT '',
            production_stage TEXT DEFAULT 'الفحص النهائي',
            batch_id TEXT DEFAULT '',
            quantity_checked REAL DEFAULT 1,
            quantity_passed REAL DEFAULT 1,
            quantity_failed REAL DEFAULT 0,
            inspection_result TEXT DEFAULT 'PASS',
            inspector_id TEXT DEFAULT '',
            inspector_name TEXT DEFAULT 'مفتش الجودة',
            notes TEXT DEFAULT '',
            attachment_url TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS quality_defects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            defect_id TEXT UNIQUE NOT NULL,
            defect_date TEXT DEFAULT '',
            inspection_id TEXT DEFAULT '',
            product_id TEXT DEFAULT '',
            sku TEXT DEFAULT '',
            model_id TEXT DEFAULT '',
            color TEXT DEFAULT '',
            size TEXT DEFAULT '',
            production_order_id TEXT DEFAULT '',
            production_stage TEXT DEFAULT 'الخياطة',
            defect_type TEXT DEFAULT 'عيب خياطة',
            defect_category TEXT DEFAULT 'تشغيلي',
            severity TEXT DEFAULT 'Medium',
            affected_quantity REAL DEFAULT 1,
            root_cause TEXT DEFAULT '',
            corrective_action TEXT DEFAULT '',
            preventive_action TEXT DEFAULT '',
            status TEXT DEFAULT 'Open',
            assigned_to TEXT DEFAULT '',
            due_date TEXT DEFAULT '',
            resolved_date TEXT DEFAULT '',
            rework_cost REAL DEFAULT 0.0,
            waste_cost REAL DEFAULT 0.0,
            return_cost REAL DEFAULT 0.0,
            total_cost REAL DEFAULT 0.0,
            notes TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS customer_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            feedback_id TEXT UNIQUE NOT NULL,
            feedback_date TEXT DEFAULT '',
            customer_id TEXT DEFAULT '',
            customer_name TEXT DEFAULT '',
            order_id TEXT DEFAULT '',
            product_id TEXT DEFAULT '',
            sku TEXT DEFAULT '',
            model_id TEXT DEFAULT '',
            color TEXT DEFAULT '',
            size TEXT DEFAULT '',
            rating REAL DEFAULT 5.0,
            nps_score REAL DEFAULT 10.0,
            feedback_type TEXT DEFAULT 'NPS',
            comment TEXT DEFAULT '',
            channel TEXT DEFAULT 'WhatsApp',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS quality_complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complaint_id TEXT UNIQUE NOT NULL,
            complaint_date TEXT DEFAULT '',
            customer_id TEXT DEFAULT '',
            order_id TEXT DEFAULT '',
            product_id TEXT DEFAULT '',
            sku TEXT DEFAULT '',
            model_id TEXT DEFAULT '',
            complaint_type TEXT DEFAULT 'مقاس',
            complaint_description TEXT DEFAULT '',
            severity TEXT DEFAULT 'Medium',
            status TEXT DEFAULT 'Open',
            assigned_to TEXT DEFAULT '',
            response_date TEXT DEFAULT '',
            resolution_date TEXT DEFAULT '',
            resolution_type TEXT DEFAULT 'تعديل مجاني',
            customer_satisfied TEXT DEFAULT 'Yes',
            cost REAL DEFAULT 0.0,
            notes TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS quality_returns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            return_id TEXT UNIQUE NOT NULL,
            order_id TEXT DEFAULT '',
            customer_id TEXT DEFAULT '',
            product_id TEXT DEFAULT '',
            sku TEXT DEFAULT '',
            model_id TEXT DEFAULT '',
            size TEXT DEFAULT '',
            color TEXT DEFAULT '',
            return_reason TEXT DEFAULT 'عيب جودة',
            is_quality_related TEXT DEFAULT 'Yes',
            defect_id TEXT DEFAULT '',
            return_date TEXT DEFAULT '',
            refund_amount REAL DEFAULT 0.0,
            replacement_cost REAL DEFAULT 0.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS quality_corrective_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_id TEXT UNIQUE NOT NULL,
            defect_id TEXT DEFAULT '',
            complaint_id TEXT DEFAULT '',
            action_type TEXT DEFAULT 'Corrective',
            problem TEXT DEFAULT '',
            root_cause TEXT DEFAULT '',
            action_description TEXT DEFAULT '',
            responsible TEXT DEFAULT '',
            priority TEXT DEFAULT 'High',
            start_date TEXT DEFAULT '',
            due_date TEXT DEFAULT '',
            completed_date TEXT DEFAULT '',
            status TEXT DEFAULT 'In Progress',
            effectiveness TEXT DEFAULT 'Pending',
            verification_date TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS quality_checkpoints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checkpoint_id TEXT UNIQUE NOT NULL,
            checkpoint_name TEXT DEFAULT '',
            production_stage TEXT DEFAULT '',
            description TEXT DEFAULT '',
            required TEXT DEFAULT 'نعم',
            criteria TEXT DEFAULT '',
            tolerance TEXT DEFAULT '',
            active TEXT DEFAULT 'Active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS quality_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_name TEXT DEFAULT '',
            metric_code TEXT UNIQUE NOT NULL,
            formula TEXT DEFAULT '',
            target REAL DEFAULT 95.0,
            warning_threshold REAL DEFAULT 85.0,
            critical_threshold REAL DEFAULT 70.0,
            weight REAL DEFAULT 1.0,
            active TEXT DEFAULT 'Active'
        )
    ''')
