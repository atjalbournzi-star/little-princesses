-- ==============================================================================
-- Little Princesses ERP - Layer 2 Security Shield: Idempotency & Fiscal Periods
-- File: sql/armor/07_shield_idempotency_and_periods.sql
-- Description: Idempotency Keys Storage & Dynamic Fiscal Period Lock
-- Standard: Strictly < 220 lines per file
-- ==============================================================================

-- 1. جدول درع منع التكرار عبر الشبكة (Idempotency Keys)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    idempotency_key VARCHAR(128) PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 200,
    response_json JSONB,
    state VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (state IN ('processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- تحديث الأعمدة في حال وجود الجدول سابقاً بهيكل قديم
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idempotency_keys') THEN
        ALTER TABLE public.idempotency_keys ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255);
        ALTER TABLE public.idempotency_keys ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);
        ALTER TABLE public.idempotency_keys ADD COLUMN IF NOT EXISTS status_code INTEGER DEFAULT 200;
        ALTER TABLE public.idempotency_keys ADD COLUMN IF NOT EXISTS response_json JSONB;
        ALTER TABLE public.idempotency_keys ADD COLUMN IF NOT EXISTS state VARCHAR(20) DEFAULT 'completed';
        ALTER TABLE public.idempotency_keys ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 2. جدول الفترات المحاسبية والقفل المالي الديناميكي (Fiscal Periods)
CREATE TABLE IF NOT EXISTS public.fiscal_periods (
    period_key VARCHAR(20) PRIMARY KEY, -- e.g. '2026-11'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_by VARCHAR(100),
    locked_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. تفعيل RLS وحمايتهما عبر الأدوار الموثوقة (service_role و postgres)
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_idempotency_keys" ON public.idempotency_keys;
CREATE POLICY "service_role_all_idempotency_keys" ON public.idempotency_keys FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "postgres_all_idempotency_keys" ON public.idempotency_keys;
CREATE POLICY "postgres_all_idempotency_keys" ON public.idempotency_keys FOR ALL TO postgres USING (true) WITH CHECK (true);

ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_fiscal_periods" ON public.fiscal_periods;
CREATE POLICY "service_role_all_fiscal_periods" ON public.fiscal_periods FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "postgres_all_fiscal_periods" ON public.fiscal_periods;
CREATE POLICY "postgres_all_fiscal_periods" ON public.fiscal_periods FOR ALL TO postgres USING (true) WITH CHECK (true);

-- 4. إدراج الفترات المحاسبية التأسيسية لعام 2026 مفتوحة بشكل افتراضي
INSERT INTO public.fiscal_periods (period_key, start_date, end_date, is_locked)
VALUES
    ('2026-01', '2026-01-01', '2026-01-31', FALSE),
    ('2026-02', '2026-02-01', '2026-02-28', FALSE),
    ('2026-03', '2026-03-01', '2026-03-31', FALSE),
    ('2026-04', '2026-04-01', '2026-04-30', FALSE),
    ('2026-05', '2026-05-01', '2026-05-31', FALSE),
    ('2026-06', '2026-06-01', '2026-06-30', FALSE),
    ('2026-07', '2026-07-01', '2026-07-31', FALSE),
    ('2026-08', '2026-08-01', '2026-08-31', FALSE),
    ('2026-09', '2026-09-01', '2026-09-30', FALSE),
    ('2026-10', '2026-10-01', '2026-10-31', FALSE),
    ('2026-11', '2026-11-01', '2026-11-30', FALSE),
    ('2026-12', '2026-12-01', '2026-12-31', FALSE)
ON CONFLICT (period_key) DO NOTHING;
