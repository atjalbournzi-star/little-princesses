-- ==============================================================================
-- Little Princesses ERP - Layer 1 Hard Armor: Shield 3
-- File: sql/armor/03_shield3_hard_uniqueness.sql
-- Description: Hard Uniqueness Constraints (Piece Rates, References)
-- Standard: Strictly < 220 lines per file
-- ==============================================================================

-- 1. دالة توحيد المراحل التشغيلية المعيارية بصيغة غير قابلة للتغيير (IMMUTABLE)
CREATE OR REPLACE FUNCTION public.fn_canonical_stage(p_stage text)
RETURNS text IMMUTABLE AS $$
DECLARE
    s text;
BEGIN
    IF p_stage IS NULL THEN
        RETURN NULL;
    END IF;
    -- تنظيف الرموز التعبيرية والمسافات
    s := regexp_replace(p_stage, '[✂️🪡✨🔍📦🛍️✅]', '', 'g');
    s := trim(lower(s));

    -- الفحص المعياري للمراحل التشغيلية الأربع
    IF s ~ 'تسليم|جاهز|ready|deliver' THEN
        RETURN NULL;
    ELSIF s ~ 'قص|باترون|تحضير|cut' THEN
        RETURN 'cutting';
    ELSIF s ~ 'خياط|تفصيل|sew' THEN
        RETURN 'sewing';
    ELSIF s ~ 'تطريز|شك|embroid' THEN
        RETURN 'embroidery';
    ELSIF s ~ 'تشطيب|فحص|كي|finish|inspect' THEN
        RETURN 'finishing';
    ELSE
        RETURN s;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. فهرس فريد لمنع تضاعف أجور القطع لنفس (أمر التشغيل + العامل + المرحلة)
CREATE UNIQUE INDEX IF NOT EXISTS uq_piece_rate_order_worker_stage
ON public.piece_rate_logs (
    production_order_id,
    COALESCE(worker_id, worker_name),
    COALESCE(public.fn_canonical_stage(stage_id), stage_id)
)
WHERE production_order_id IS NOT NULL 
  AND (payment_status IS NULL OR LOWER(payment_status) != 'cancelled');

-- 3. فهرس فريد لمنع تضاعف عمولات الخياطين لنفس (أمر التشغيل + العامل + المرحلة)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tailor_commissions_order_stage
ON public.tailor_commissions (
    production_order_id,
    COALESCE(employee_id, employee_name),
    COALESCE(public.fn_canonical_stage(stage), stage)
)
WHERE production_order_id IS NOT NULL 
  AND (status IS NULL OR LOWER(status) != 'cancelled');

-- 4. التحقق وتثبيت قيود التفرد للمراجع الحيوية في النظام
DO $$
BEGIN
    -- قيد تفرد رقم هاتف المورد إن لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'suppliers' AND indexname = 'uq_suppliers_phone'
    ) THEN
        CREATE UNIQUE INDEX uq_suppliers_phone 
        ON public.suppliers (phone) 
        WHERE phone IS NOT NULL AND phone != '';
    END IF;
END $$;
