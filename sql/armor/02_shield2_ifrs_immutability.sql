-- ==============================================================================
-- Little Princesses ERP - Layer 1 Hard Armor: Shield 2
-- File: sql/armor/02_shield2_ifrs_immutability.sql
-- Description: IFRS Immutability Triggers (Posted Entries, Lines & Piece Rates)
-- Standard: Strictly < 220 lines per file
-- ==============================================================================

-- 1. حارس عدم قابلية التعديل لرؤوس القيود المحاسبية (journal_entries)
CREATE OR REPLACE FUNCTION public.fn_guard_journal_entries_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('Posted', 'Reversed') THEN
            RAISE EXCEPTION 'المخالفة المحاسبية (IFRS Immutability): محظور نهائياً حذف القيد المحاسبي المرحّل أو المعكوس رقم % (المعرف: %). السجلات المالية غير قابلة للحذف.',
                OLD.entry_no, OLD.id
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'Reversed' THEN
            IF NEW.status IS DISTINCT FROM 'Reversed' THEN
                RAISE EXCEPTION 'المخالفة المحاسبية (IFRS Immutability): لا يمكن إعادة فتح القيد المعكوس رقم %',
                    OLD.entry_no
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;
            IF (OLD.amount IS DISTINCT FROM NEW.amount) OR
               (OLD.total_amount IS DISTINCT FROM NEW.total_amount) OR
               (OLD.base_amount IS DISTINCT FROM NEW.base_amount) OR
               (OLD.currency IS DISTINCT FROM NEW.currency) OR
               (OLD.exchange_rate IS DISTINCT FROM NEW.exchange_rate) OR
               (OLD.debit_account_id IS DISTINCT FROM NEW.debit_account_id) OR
               (OLD.credit_account_id IS DISTINCT FROM NEW.credit_account_id) OR
               (OLD.entry_date IS DISTINCT FROM NEW.entry_date) OR
               (OLD.entry_no IS DISTINCT FROM NEW.entry_no) THEN
                RAISE EXCEPTION 'المخالفة المحاسبية (IFRS Immutability): القيد المعكوس % مجمد تماماً ولا يقبل أي تعديل مالي.',
                    OLD.entry_no
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;

        ELSIF OLD.status = 'Posted' THEN
            IF OLD.entry_no IS DISTINCT FROM NEW.entry_no THEN
                RAISE EXCEPTION 'المخالفة المحاسبية (IFRS Immutability): محظور تعديل رقم القيد المرحّل % إلى %',
                    OLD.entry_no, NEW.entry_no
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;

            IF OLD.entry_date IS DISTINCT FROM NEW.entry_date THEN
                RAISE EXCEPTION 'المخالفة المحاسبية (IFRS Immutability): محظور تعديل تاريخ القيد المرحّل % (تاريخه: %)',
                    OLD.entry_no, OLD.entry_date
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;

            IF (OLD.debit_account_id IS DISTINCT FROM NEW.debit_account_id) OR
               (OLD.credit_account_id IS DISTINCT FROM NEW.credit_account_id) THEN
                RAISE EXCEPTION 'المخالفة المحاسبية (IFRS Immutability): محظور تعديل الحسابات للقيد المرحّل %. يجب إجراء قيد عكسي.',
                    OLD.entry_no
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;

            IF (OLD.amount IS DISTINCT FROM NEW.amount) OR
               (OLD.total_amount IS DISTINCT FROM NEW.total_amount) OR
               (OLD.base_amount IS DISTINCT FROM NEW.base_amount) OR
               (OLD.currency IS DISTINCT FROM NEW.currency) OR
               (OLD.exchange_rate IS DISTINCT FROM NEW.exchange_rate) THEN
                RAISE EXCEPTION 'المخالفة المحاسبية (IFRS Immutability): محظور تعديل مبالغ أو عملة القيد المرحّل %. يجب استخدام القيد العكسي الرسمي.',
                    OLD.entry_no
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;
        END IF;

        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_journal_entries_immutability ON public.journal_entries;
CREATE TRIGGER trg_guard_journal_entries_immutability
    BEFORE UPDATE OR DELETE ON public.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_guard_journal_entries_immutability();

-- 2. حارس عدم قابلية التعديل لأسطر القيود المحاسبية (journal_entry_lines)
CREATE OR REPLACE FUNCTION public.fn_guard_journal_lines_immutability()
RETURNS TRIGGER AS $$
DECLARE
    v_status text;
    v_entry_no text;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT status, entry_no INTO v_status, v_entry_no
        FROM public.journal_entries
        WHERE id = OLD.entry_id;

        IF v_status IN ('Posted', 'Reversed') THEN
            RAISE EXCEPTION 'المخالفة المحاسبية (IFRS Immutability): محظور نهائياً حذف أسطر القيد المرحّل أو المعكوس رقم % (معرف القيد: %).',
                v_entry_no, OLD.entry_id
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        SELECT status, entry_no INTO v_status, v_entry_no
        FROM public.journal_entries
        WHERE id = OLD.entry_id;

        IF v_status IN ('Posted', 'Reversed') THEN
            IF (OLD.account_id IS DISTINCT FROM NEW.account_id) OR
               (OLD.debit IS DISTINCT FROM NEW.debit) OR
               (OLD.credit IS DISTINCT FROM NEW.credit) OR
               (OLD.debit_base IS DISTINCT FROM NEW.debit_base) OR
               (OLD.credit_base IS DISTINCT FROM NEW.credit_base) OR
               (OLD.entry_id IS DISTINCT FROM NEW.entry_id) THEN
                RAISE EXCEPTION 'المخالفة المحاسبية (IFRS Immutability): محظور تعديل مبالغ أو حسابات أسطر القيد المرحّل رقم %. يجب إجراء قيد عكسي.',
                    v_entry_no
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_journal_lines_immutability ON public.journal_entry_lines;
CREATE TRIGGER trg_guard_journal_lines_immutability
    BEFORE UPDATE OR DELETE ON public.journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_guard_journal_lines_immutability();

-- 3. حارس أجور القطع المسددة والمصروفة (piece_rate_logs)
CREATE OR REPLACE FUNCTION public.fn_guard_piece_rate_immutability()
RETURNS TRIGGER AS $$
DECLARE
    v_is_paid boolean;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_is_paid := (OLD.paid_at IS NOT NULL) OR (LOWER(COALESCE(OLD.payment_status, '')) = 'paid');
        IF v_is_paid THEN
            RAISE EXCEPTION 'المخالفة التشغيلية والمالية: محظور نهائياً حذف سجل أجر القطعة رقم % لأنه مسدد ومصروف فعلياً بموجب السند % بتاريخ %',
                OLD.id, OLD.voucher_no, OLD.paid_at
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        v_is_paid := (OLD.paid_at IS NOT NULL) OR (LOWER(COALESCE(OLD.payment_status, '')) = 'paid');
        IF v_is_paid THEN
            IF (OLD.worker_id IS DISTINCT FROM NEW.worker_id) OR
               (OLD.piece_rate_amount IS DISTINCT FROM NEW.piece_rate_amount) OR
               (OLD.pieces_count IS DISTINCT FROM NEW.pieces_count) OR
               (OLD.production_order_id IS DISTINCT FROM NEW.production_order_id) OR
               (OLD.stage_id IS DISTINCT FROM NEW.stage_id) OR
               (NEW.paid_at IS NULL) OR
               (LOWER(COALESCE(NEW.payment_status, '')) != 'paid') THEN
                RAISE EXCEPTION 'المخالفة التشغيلية والمالية: محظور التلاعب في بيانات أو مبالغ أجر القطعة المسدد رقم % (العامل: %, المبلغ: %) أو إلغاء حالة الصرف.',
                    OLD.id, OLD.worker_id, OLD.piece_rate_amount
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_piece_rate_immutability ON public.piece_rate_logs;
CREATE TRIGGER trg_guard_piece_rate_immutability
    BEFORE UPDATE OR DELETE ON public.piece_rate_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_guard_piece_rate_immutability();
