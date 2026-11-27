-- ==============================================================================
-- Little Princesses ERP - Layer 1 Hard Armor: Shield 5
-- File: sql/armor/05_shield5_rls_hardening.sql
-- Description: Complete Row Level Security (RLS) & Access Hardening
-- Standard: Strictly < 220 lines per file
-- ==============================================================================

-- 1. تفعيل حماية RLS لجميع الجداول في المخطط العام (public) بلا استثناء
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);

        -- سياسة الصلاحيات الكاملة للواجهة الخلفية الموثقة عبر service_role
        EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%s" ON public.%I;', r.tablename, r.tablename);
        EXECUTE format('CREATE POLICY "service_role_all_%s" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', r.tablename, r.tablename);

        -- سياسة مسؤول قاعدة البيانات (postgres superuser)
        EXECUTE format('DROP POLICY IF EXISTS "postgres_all_%s" ON public.%I;', r.tablename, r.tablename);
        EXECUTE format('CREATE POLICY "postgres_all_%s" ON public.%I FOR ALL TO postgres USING (true) WITH CHECK (true);', r.tablename, r.tablename);
    END LOOP;
END $$;

-- 2. تأمين صلاحيات الدور العام (anon & public) وحظر أي تعديل أو مساس مالي مباشر
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM public;

-- حظر القراءة والاستعلام المباشر عن الجداول المالية الحساسة وسجلات التدقيق عبر anon
REVOKE ALL ON payments, journal_entries, journal_entry_lines, chart_of_accounts,
    payroll_runs, payroll, employee_advances, tailor_commissions, piece_rate_logs, audit_logs, users FROM anon;

-- السماح بالقراءة فقط لكتالوج المنتجات النشطة والعملات العامة عبر anon
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

-- 3. تفعيل خيار Security Invoker على كافة الـ Views لتوريث RLS
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
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END LOOP;
END $$;
