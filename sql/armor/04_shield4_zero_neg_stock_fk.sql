-- ==============================================================================
-- Little Princesses ERP - Layer 1 Hard Armor: Shield 4
-- File: sql/armor/04_shield4_zero_neg_stock_fk.sql
-- Description: Zero-Negative Stock Constraints & Referential Integrity Protection
-- Standard: Strictly < 220 lines per file
-- ==============================================================================

-- 1. حظر الأرصدة السالبة في المخازن والأصناف (Zero-Negative Stock)
ALTER TABLE public.warehouse_stock
    DROP CONSTRAINT IF EXISTS chk_warehouse_stock_quantity_non_negative,
    ADD CONSTRAINT chk_warehouse_stock_quantity_non_negative CHECK (quantity >= 0);

ALTER TABLE public.warehouse_stock
    DROP CONSTRAINT IF EXISTS chk_warehouse_stock_reserved_non_negative,
    ADD CONSTRAINT chk_warehouse_stock_reserved_non_negative CHECK (reserved_qty >= 0);

ALTER TABLE public.warehouse_stock
    DROP CONSTRAINT IF EXISTS chk_warehouse_stock_available_non_negative,
    ADD CONSTRAINT chk_warehouse_stock_available_non_negative CHECK (available_qty IS NULL OR available_qty >= 0);

ALTER TABLE public.inventory
    DROP CONSTRAINT IF EXISTS chk_inventory_quantity_non_negative,
    ADD CONSTRAINT chk_inventory_quantity_non_negative CHECK (quantity >= 0);

ALTER TABLE public.inventory
    DROP CONSTRAINT IF EXISTS chk_inventory_reserved_non_negative,
    ADD CONSTRAINT chk_inventory_reserved_non_negative CHECK (reserved_qty >= 0);

ALTER TABLE public.inventory
    DROP CONSTRAINT IF EXISTS chk_inventory_unit_cost_non_negative,
    ADD CONSTRAINT chk_inventory_unit_cost_non_negative CHECK (unit_cost >= 0);

-- 2. حظر القيم السالبة وازدواج المدين والدائن في أسطر وسجلات القيود والسندات
ALTER TABLE public.journal_entry_lines
    DROP CONSTRAINT IF EXISTS chk_jline_debit_credit_valid,
    ADD CONSTRAINT chk_jline_debit_credit_valid CHECK (
        debit >= 0 AND credit >= 0 AND 
        (debit = 0 OR credit = 0) AND
        (debit > 0 OR credit > 0)
    );

ALTER TABLE public.journal_entry_lines
    DROP CONSTRAINT IF EXISTS chk_jline_base_valid,
    ADD CONSTRAINT chk_jline_base_valid CHECK (
        debit_base >= 0 AND credit_base >= 0 AND 
        (debit_base = 0 OR credit_base = 0)
    );

ALTER TABLE public.journal_entries
    DROP CONSTRAINT IF EXISTS chk_journal_entries_amounts_non_negative,
    ADD CONSTRAINT chk_journal_entries_amounts_non_negative CHECK (
        amount >= 0 AND total_amount >= 0 AND base_amount >= 0 AND exchange_rate > 0
    );

ALTER TABLE public.payments
    DROP CONSTRAINT IF EXISTS chk_payments_amounts_non_negative,
    ADD CONSTRAINT chk_payments_amounts_non_negative CHECK (
        amount >= 0 AND base_amount >= 0 AND exchange_rate > 0
    );

ALTER TABLE public.piece_rate_logs
    DROP CONSTRAINT IF EXISTS chk_piece_rate_amount_non_negative,
    ADD CONSTRAINT chk_piece_rate_amount_non_negative CHECK (
        piece_rate_amount >= 0 AND pieces_count > 0
    );

-- 3. تأمين المفاتيح الأجنبية وقفل الحذف العشوائي (ON DELETE RESTRICT)
-- حظر حذف صنف مخزون يمتلك رصيداً في أي مستودع
ALTER TABLE public.warehouse_stock
    DROP CONSTRAINT IF EXISTS warehouse_stock_inventory_id_fkey,
    ADD CONSTRAINT warehouse_stock_inventory_id_fkey 
    FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) 
    ON DELETE RESTRICT;

-- حظر حذف الحساب المالي المرتبط بحساب المستودع
ALTER TABLE public.warehouses
    DROP CONSTRAINT IF EXISTS warehouses_account_id_fkey,
    ADD CONSTRAINT warehouses_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES public.chart_of_accounts(id) 
    ON DELETE RESTRICT;

-- ربط حساب الطرف الآخر في السندات بحسابات شجرة الحسابات مع منع الحذف
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_target_account_id_fkey'
    ) THEN
        ALTER TABLE public.payments
            ADD CONSTRAINT payments_target_account_id_fkey 
            FOREIGN KEY (target_account_id) REFERENCES public.chart_of_accounts(id) 
            ON DELETE RESTRICT;
    END IF;
END $$;

-- 4. مشغلات حماية حذف العملاء والموظفين المرتبطين بحركات وسجلات
CREATE OR REPLACE FUNCTION public.fn_guard_customer_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.orders WHERE customer_id = OLD.id) THEN
        RAISE EXCEPTION 'المخالفة التشغيلية: لا يمكن حذف العميل (%) لوجود طلبات تجارية مرتبطة به في النظام.', OLD.name
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF EXISTS (SELECT 1 FROM public.payments WHERE customer_id = OLD.id) THEN
        RAISE EXCEPTION 'المخالفة التشغيلية: لا يمكن حذف العميل (%) لوجود سندات مالية مرتبطة به في النظام.', OLD.name
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_customer_deletion ON public.customers;
CREATE TRIGGER trg_guard_customer_deletion
    BEFORE DELETE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_guard_customer_deletion();

CREATE OR REPLACE FUNCTION public.fn_guard_employee_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.piece_rate_logs WHERE worker_id = OLD.id) THEN
        RAISE EXCEPTION 'المخالفة التشغيلية: لا يمكن حذف الموظف (%) لوجود سجلات أجور قطع مسجلة له.', OLD.name
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF EXISTS (SELECT 1 FROM public.tailor_commissions WHERE employee_id = OLD.id) THEN
        RAISE EXCEPTION 'المخالفة التشغيلية: لا يمكن حذف الموظف (%) لوجود عمولات مسجلة له.', OLD.name
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    IF EXISTS (SELECT 1 FROM public.payroll WHERE employee_id = OLD.id) THEN
        RAISE EXCEPTION 'المخالفة التشغيلية: لا يمكن حذف الموظف (%) لوجود مسيرات رواتب مرتبطة به.', OLD.name
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_employee_deletion ON public.employees;
CREATE TRIGGER trg_guard_employee_deletion
    BEFORE DELETE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_guard_employee_deletion();
