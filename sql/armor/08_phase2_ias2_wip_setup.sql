-- ==============================================================================
-- Little Princesses ERP - Phase 2: IAS 2 Work In Progress (105.05 WIP) Setup
-- File: sql/armor/08_phase2_ias2_wip_setup.sql
-- Description: Establishes Account 105.05 (WIP) and Production Order Cost Columns
-- Standard: Strictly < 220 lines per file (Idempotent Migration)
-- ==============================================================================

DO $$
BEGIN
    -- 1. التأكد من وجود حساب (105.05 - إنتاج تحت التشغيل / WIP) في شجرة الحسابات
    IF NOT EXISTS (
        SELECT 1 FROM public.chart_of_accounts 
        WHERE account_code = '105.05' OR id = 'ACC-105-05'
    ) THEN
        INSERT INTO public.chart_of_accounts (
            id,
            account_code,
            account_name,
            account_name_en,
            account_type,
            account_category,
            parent_account_id,
            parent_account_code,
            level,
            is_group,
            is_postable,
            is_active,
            normal_balance,
            opening_balance,
            current_balance,
            balance_type,
            currency,
            notes,
            created_at
        ) VALUES (
            'ACC-105-05',
            '105.05',
            'إنتاج تحت التشغيل (WIP)',
            'Work In Progress (WIP)',
            'أصول',
            'Inventory',
            'ACC-105',
            '105',
            3,
            false,
            true,
            true,
            'Debit',
            0.0000,
            0.0000,
            'Debit',
            'YER',
            'حساب الإنتاج تحت التشغيل لتقييد تكلفة الخامات والأجور الصناعية المباشرة وفق معيار IAS 2',
            CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'تم إنشاء حساب 105.05 (إنتاج تحت التشغيل) بنجاح في شجرة الحسابات.';
    ELSE
        -- تحديث الحساب ليضمن تصنيف وتفعيل الحساب كأصل متداول فرعي حركي
        UPDATE public.chart_of_accounts
        SET 
            account_name = 'إنتاج تحت التشغيل (WIP)',
            account_type = 'أصول',
            account_category = 'Inventory',
            parent_account_id = 'ACC-105',
            parent_account_code = '105',
            level = 3,
            is_group = false,
            is_postable = true,
            is_active = true,
            normal_balance = 'Debit',
            currency = 'YER'
        WHERE account_code = '105.05' OR id = 'ACC-105-05';
        RAISE NOTICE 'حساب 105.05 موجود مسبقاً - تم التحقق من سلامة البيانات وخصائصه المحاسبية.';
    END IF;
END $$;

-- 2. إضافة أعمدة تتبع التكلفة الصناعية الفعلية على جدول أمر التشغيل (production_orders)
ALTER TABLE public.production_orders 
    ADD COLUMN IF NOT EXISTS wip_material_cost NUMERIC(18,4) DEFAULT 0;

ALTER TABLE public.production_orders 
    ADD COLUMN IF NOT EXISTS wip_labor_cost NUMERIC(18,4) DEFAULT 0;

ALTER TABLE public.production_orders 
    ADD COLUMN IF NOT EXISTS wip_overhead_cost NUMERIC(18,4) DEFAULT 0;

ALTER TABLE public.production_orders 
    ADD COLUMN IF NOT EXISTS wip_cleared_amount NUMERIC(18,4) DEFAULT 0;

-- تطبيق قيود عدم السالبية على تكاليف الإنتاج تحت التشغيل (Non-Negative Checks)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_po_wip_material_cost'
    ) THEN
        ALTER TABLE public.production_orders 
            ADD CONSTRAINT chk_po_wip_material_cost CHECK (wip_material_cost >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_po_wip_labor_cost'
    ) THEN
        ALTER TABLE public.production_orders 
            ADD CONSTRAINT chk_po_wip_labor_cost CHECK (wip_labor_cost >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_po_wip_overhead_cost'
    ) THEN
        ALTER TABLE public.production_orders 
            ADD CONSTRAINT chk_po_wip_overhead_cost CHECK (wip_overhead_cost >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_po_wip_cleared_amount'
    ) THEN
        ALTER TABLE public.production_orders 
            ADD CONSTRAINT chk_po_wip_cleared_amount CHECK (wip_cleared_amount >= 0);
    END IF;
END $$;

-- 3. إنشاء فهارس لتحسين أداء الرادار ومطابقة أوامر التشغيل المفتوحة
CREATE INDEX IF NOT EXISTS idx_production_orders_wip_calc
    ON public.production_orders (status)
    INCLUDE (wip_material_cost, wip_labor_cost, wip_overhead_cost, wip_cleared_amount);

-- 4. تعليقات التوثيق المحاسبي في PostgreSQL
COMMENT ON COLUMN public.production_orders.wip_material_cost IS 'IAS 2: تكلفة المواد والخامات المباشرة المنصرفة لأمر التشغيل من المستودع';
COMMENT ON COLUMN public.production_orders.wip_labor_cost IS 'IAS 2: تكلفة الأجور المباشرة وأجور القطع المستحقة للفنيين على أمر التشغيل';
COMMENT ON COLUMN public.production_orders.wip_overhead_cost IS 'IAS 2: تكاليف صناعية غير مباشرة محملة على أمر التشغيل';
COMMENT ON COLUMN public.production_orders.wip_cleared_amount IS 'IAS 2: إجمالي التكلفة المستبعدة من WIP والمحملة على تكلفة البضاعة المباعة (COGS) عند التسليم';
