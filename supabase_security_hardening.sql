-- ==============================================================================
-- Little Princesses ERP - Supabase PostgreSQL Production Security Hardening
-- الحزمة 7 (ملحق تدقيق Supabase الجنائي): تأمين قاعدة البيانات قبل الإطلاق التجاري
-- ==============================================================================

-- 1. تفعيل سياسات الحماية على مستوى الصفوف (Row Level Security - RLS) لكافة الجداول الأساسية
DO $$
DECLARE
    tbl text;
    base_tables text[] := ARRAY[
        'chart_of_accounts', 'journal_entries', 'journal_entry_lines', 'payments',
        'orders', 'order_items', 'order_stages', 'production_orders', 'fitting_alterations',
        'customers', 'customer_platform_mappings', 'children', 'measurements', 'garment_measurements_studio',
        'products', 'product_categories', 'inventory', 'inventory_transactions', 'warehouse_stock', 'warehouses',
        'purchases', 'purchase_items', 'suppliers', 'employees', 'employee_advances', 'payroll', 'payroll_items', 'payroll_runs',
        'tailor_commissions', 'piece_rate_logs', 'cost_centers', 'job_roles', 'currencies', 'company_profile',
        'number_sequences', 'audit_logs', 'users', 'expenses', 'expense_transactions', 'quality_actions',
        'quality_checkpoints', 'quality_complaints', 'quality_defects', 'quality_feedback', 'quality_inspections',
        'quality_returns', 'quality_settings', 'system_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY base_tables
    LOOP
        -- التحقق من وجود الجدول قبل تطبيق RLS والسياسات
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

            -- سياسة الصلاحيات الكاملة للواجهة الخلفية الموثقة عبر service_role
            EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%s" ON public.%I;', tbl, tbl);
            EXECUTE format('CREATE POLICY "service_role_all_%s" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);

            -- سياسة مسؤول قاعدة البيانات (postgres superuser)
            EXECUTE format('DROP POLICY IF EXISTS "postgres_all_%s" ON public.%I;', tbl, tbl);
            EXECUTE format('CREATE POLICY "postgres_all_%s" ON public.%I FOR ALL TO postgres USING (true) WITH CHECK (true);', tbl, tbl);

            RAISE NOTICE 'RLS & Admin Policies Enabled for table: %', tbl;
        END IF;
    END LOOP;
END $$;

-- 2. تأمين صلاحيات الدور العام (anon & public) وحظر أي تعديل أو مساس مالي مباشر
-- منع التعديل المباشر (INSERT, UPDATE, DELETE) لجميع الجداول عبر مفتاح anon العام
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM public;

-- حظر القراءة والاستعلام المباشر عن الجداول المالية الحساسة وسجلات التدقيق عبر anon
REVOKE ALL ON payments, journal_entries, journal_entry_lines, chart_of_accounts,
    payroll_runs, payroll, employee_advances, tailor_commissions, audit_logs, users FROM anon;

-- السماح بالقراءة فقط لكتالوج المنتجات النشطة والعملات العامة عبر anon (لأغراض الكتالوج والاستعراض)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
        DROP POLICY IF EXISTS "anon_read_active_products" ON public.products;
        CREATE POLICY "anon_read_active_products" ON public.products
            FOR SELECT TO anon
            USING (status = 'Active');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'currencies') THEN
        DROP POLICY IF EXISTS "anon_read_currencies" ON public.currencies;
        CREATE POLICY "anon_read_currencies" ON public.currencies
            FOR SELECT TO anon
            USING (true);
    END IF;
END $$;

-- 3. تأمين الواجهات البرمجية والعروض (Views) بتفعيل خيار Security Invoker
DO $$
DECLARE
    vw text;
    views_list text[] := ARRAY[
        'accounts', 'vouchers', 'items', 'inventory_items', 'stock_movements',
        'financial_vouchers', 'journal_lines', 'v_trial_balance', 'v_general_ledger',
        'v_inventory_status', 'v_orders_detailed'
    ];
BEGIN
    FOREACH vw IN ARRAY views_list
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = vw) THEN
            BEGIN
                EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true);', vw);
                RAISE NOTICE 'Security invoker enabled on view: %', vw;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Notice on view %: %', vw, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- 4. تقرير التحقق النهائي لحالة الحماية (Security Hardening Status)
SELECT 
    schemaname, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename ASC;
