-- ==============================================================================
-- Little Princesses ERP - Layer 1 Hard Armor: Shield 1
-- File: sql/armor/01_shield1_double_entry_guard.sql
-- Description: Deferred Constraint Trigger for Double-Entry Balance Verification
-- Standard: Strictly < 220 lines per file
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_guard_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_entry_ids text[] := ARRAY[]::text[];
    v_eid text;
    v_status text;
    v_entry_no text;
    v_count int;
    v_deb numeric;
    v_crd numeric;
    v_deb_base numeric;
    v_crd_base numeric;
BEGIN
    IF TG_TABLE_NAME = 'journal_entry_lines' THEN
        IF TG_OP = 'INSERT' THEN
            v_entry_ids := ARRAY[NEW.entry_id];
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.entry_id IS DISTINCT FROM OLD.entry_id THEN
                v_entry_ids := ARRAY[NEW.entry_id, OLD.entry_id];
            ELSE
                v_entry_ids := ARRAY[NEW.entry_id];
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            v_entry_ids := ARRAY[OLD.entry_id];
        END IF;
    ELSIF TG_TABLE_NAME = 'journal_entries' THEN
        v_entry_ids := ARRAY[NEW.id];
    END IF;

    FOREACH v_eid IN ARRAY v_entry_ids
    LOOP
        IF v_eid IS NULL THEN
            CONTINUE;
        END IF;

        -- فحص وجود القيد المحاسبي الرئيسي
        SELECT status, entry_no INTO v_status, v_entry_no
        FROM public.journal_entries
        WHERE id = v_eid;

        -- في حال تم حذف القيد المحاسبي الرئيسي بالكامل يُستثنى من الفحص
        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        -- التحقق ينطبق على القيود المرحلة والمعتمدة وغير المسودة
        IF v_status IS NULL OR v_status NOT IN ('Draft', 'Cancelled') THEN
            SELECT 
                COUNT(*),
                COALESCE(SUM(debit), 0.0000),
                COALESCE(SUM(credit), 0.0000),
                COALESCE(SUM(debit_base), 0.0000),
                COALESCE(SUM(credit_base), 0.0000)
            INTO
                v_count, v_deb, v_crd, v_deb_base, v_crd_base
            FROM public.journal_entry_lines
            WHERE entry_id = v_eid;

            -- 1. شرط الحد الأدنى لأسطر القيد (سطران على الأقل)
            IF v_count < 2 THEN
                RAISE EXCEPTION 'المخالفة المحاسبية (Double-Entry Guard): القيد % (%) يجب أن يتضمن سطرين محاسبيين على الأقل (العدد الحالي: %)',
                    v_entry_no, v_eid, v_count
                    USING ERRCODE = 'check_violation';
            END IF;

            -- 2. شرط توازن المدين والدائن بدقة 0.001 بالعملة المعاملاتية
            IF ABS(v_deb - v_crd) > 0.001 THEN
                RAISE EXCEPTION 'المخالفة المحاسبية (Double-Entry Guard): القيد % (%) غير متزن! المدين (%) != الدائن (%). الفارق: %',
                    v_entry_no, v_eid, v_deb, v_crd, (v_deb - v_crd)
                    USING ERRCODE = 'check_violation';
            END IF;

            -- 3. شرط توازن المدين والدائن بدقة 0.001 بالعملة الأساسية (YER)
            IF ABS(v_deb_base - v_crd_base) > 0.001 THEN
                RAISE EXCEPTION 'المخالفة المحاسبية (Double-Entry Guard): القيد % (%) غير متزن بالعملة الأساسية! المدين (%) != الدائن (%). الفارق: %',
                    v_entry_no, v_eid, v_deb_base, v_crd_base, (v_deb_base - v_crd_base)
                    USING ERRCODE = 'check_violation';
            END IF;
        END IF;
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ربط الـ Constraint Trigger المؤجل بأسطر القيود
DROP TRIGGER IF EXISTS trg_defer_guard_journal_entry_balance ON public.journal_entry_lines;
CREATE CONSTRAINT TRIGGER trg_defer_guard_journal_entry_balance
    AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_guard_journal_entry_balance();

-- ربط الـ Constraint Trigger المؤجل برأس القيد لضمان عدم حفظ قيد مرحل بلا أسطر
DROP TRIGGER IF EXISTS trg_defer_guard_journal_entries_parent ON public.journal_entries;
CREATE CONSTRAINT TRIGGER trg_defer_guard_journal_entries_parent
    AFTER INSERT OR UPDATE ON public.journal_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_guard_journal_entry_balance();
