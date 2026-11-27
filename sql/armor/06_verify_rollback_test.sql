-- ==============================================================================
-- Little Princesses ERP - Layer 1 Hard Armor: Rollback Verification Suite
-- File: sql/armor/06_verify_rollback_test.sql
-- Description: Comprehensive Verification Suite executing within BEGIN ... ROLLBACK
-- Standard: Strictly < 220 lines per file (Zero persistent test data)
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    v_test_failed boolean := false;
    v_err_msg text;
    v_j_id text := 'TEST-JV-001';
    v_j_no text := 'TEST-JV-NO-001';
    v_deb_acc text;
    v_crd_acc text;
    v_cust_id text := 'TEST-CUST-001';
    v_emp_id text := 'TEST-EMP-001';
    v_inv_id text := 'TEST-INV-001';
    v_po_id text := 'TEST-PO-001';
    v_prl_id text := 'TEST-PRL-001';
BEGIN
    RAISE NOTICE '🚀 Starting Protection Layer 1 Verification Suite...';

    -- تجهيز حسابات الاختبار
    SELECT id INTO v_deb_acc FROM public.chart_of_accounts WHERE is_postable = TRUE LIMIT 1;
    SELECT id INTO v_crd_acc FROM public.chart_of_accounts WHERE is_postable = TRUE AND id != v_deb_acc LIMIT 1;

    -- =========================================================================
    -- اختبار 1: حارس القيد المزدوج (Shield 1)
    -- =========================================================================
    -- تجربة حفظ قيد غير متزن (100 مقابل 50) داخل Savepoint
    BEGIN
        INSERT INTO public.journal_entries (id, entry_no, entry_date, description, amount, total_amount, base_amount, currency, status)
        VALUES (v_j_id, v_j_no, CURRENT_DATE, 'قيد اختبار غير متزن', 100, 100, 100, 'YER', 'Posted');

        INSERT INTO public.journal_entry_lines (id, entry_id, account_id, debit, credit, debit_base, credit_base)
        VALUES ('TEST-L1', v_j_id, v_deb_acc, 100, 0, 100, 0);

        INSERT INTO public.journal_entry_lines (id, entry_id, account_id, debit, credit, debit_base, credit_base)
        VALUES ('TEST-L2', v_j_id, v_crd_acc, 0, 50, 0, 50);

        -- فحص التوازن عبر تفعيل القيود المؤجلة فوراً داخل Savepoint
        EXECUTE 'SET CONSTRAINTS ALL IMMEDIATE';
        RAISE EXCEPTION 'TEST_FAIL: Unbalanced entry succeeded unexpectedly!';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✅ Shield 1 (Unbalanced Entry Rejected by Deferred Constraint): %', SQLERRM;
        EXECUTE 'SET CONSTRAINTS ALL DEFERRED';
    END;

    -- تجربة إدخال قيد متزن نظامي
    INSERT INTO public.journal_entries (id, entry_no, entry_date, description, amount, total_amount, base_amount, currency, status)
    VALUES (v_j_id, v_j_no, CURRENT_DATE, 'قيد اختبار متزن', 100, 100, 100, 'YER', 'Posted');

    INSERT INTO public.journal_entry_lines (id, entry_id, account_id, debit, credit, debit_base, credit_base)
    VALUES ('TEST-L1', v_j_id, v_deb_acc, 100, 0, 100, 0);

    INSERT INTO public.journal_entry_lines (id, entry_id, account_id, debit, credit, debit_base, credit_base)
    VALUES ('TEST-L2', v_j_id, v_crd_acc, 0, 100, 0, 100);

    RAISE NOTICE '✅ Shield 1 (Balanced Entry Saved Successfully)';

    -- =========================================================================
    -- اختبار 2: منع التلاعب بالقيود والأجور المرحّلة (Shield 2)
    -- =========================================================================
    -- محاولة حذف قيد مرحل (يجب أن يفشل)
    BEGIN
        DELETE FROM public.journal_entries WHERE id = v_j_id;
        RAISE EXCEPTION 'TEST_FAIL: Delete posted entry succeeded unexpectedly!';
    EXCEPTION WHEN integrity_constraint_violation THEN
        RAISE NOTICE '✅ Shield 2 (Delete Posted Entry Blocked): %', SQLERRM;
    END;

    -- محاولة حذف سطر من قيد مرحل (يجب أن يفشل)
    BEGIN
        DELETE FROM public.journal_entry_lines WHERE id = 'TEST-L1';
        RAISE EXCEPTION 'TEST_FAIL: Delete posted journal line succeeded unexpectedly!';
    EXCEPTION WHEN integrity_constraint_violation THEN
        RAISE NOTICE '✅ Shield 2 (Delete Posted Journal Line Blocked): %', SQLERRM;
    END;

    -- محاولة تعديل مبالغ قيد مرحل (يجب أن يفشل)
    BEGIN
        UPDATE public.journal_entries SET amount = 200 WHERE id = v_j_id;
        RAISE EXCEPTION 'TEST_FAIL: Update posted entry amount succeeded unexpectedly!';
    EXCEPTION WHEN integrity_constraint_violation THEN
        RAISE NOTICE '✅ Shield 2 (Update Posted Amount Blocked): %', SQLERRM;
    END;

    -- السماح بعكس القيد نظامياً (Reversal)
    UPDATE public.journal_entries SET status = 'Reversed', notes = 'عكس نظامي' WHERE id = v_j_id;
    RAISE NOTICE '✅ Shield 2 (Official Reversal Allowed Successfully)';

    -- اختبار حماية أجور القطع المسددة
    INSERT INTO public.piece_rate_logs (id, worker_id, worker_name, production_order_id, stage_id, piece_rate_amount, pieces_count, payment_status, paid_at, voucher_no)
    VALUES (v_prl_id, v_emp_id, 'عامل تجريبي', v_po_id, 'مرحلة الخياطة 🪡', 500, 1, 'paid', CURRENT_TIMESTAMP, 'PV-TEST-01');

    BEGIN
        DELETE FROM public.piece_rate_logs WHERE id = v_prl_id;
        RAISE EXCEPTION 'TEST_FAIL: Delete paid piece rate succeeded unexpectedly!';
    EXCEPTION WHEN integrity_constraint_violation THEN
        RAISE NOTICE '✅ Shield 2 (Delete Paid Piece Rate Blocked): %', SQLERRM;
    END;

    BEGIN
        UPDATE public.piece_rate_logs SET piece_rate_amount = 700 WHERE id = v_prl_id;
        RAISE EXCEPTION 'TEST_FAIL: Update paid piece rate amount succeeded unexpectedly!';
    EXCEPTION WHEN integrity_constraint_violation THEN
        RAISE NOTICE '✅ Shield 2 (Update Paid Piece Rate Amount Blocked): %', SQLERRM;
    END;

    -- =========================================================================
    -- اختبار 3: منع تضاعف أجور القطع والسندات (Shield 3)
    -- =========================================================================
    BEGIN
        -- محاولة إدخال سجل مكرر لنفس أمر التشغيل والعامل والمرحلة (بمسمى مرادف)
        INSERT INTO public.piece_rate_logs (id, worker_id, worker_name, production_order_id, stage_id, piece_rate_amount, pieces_count, payment_status)
        VALUES ('TEST-PRL-002', v_emp_id, 'عامل تجريبي', v_po_id, 'خياطة وتفصيل', 500, 1, 'Pending');
        RAISE EXCEPTION 'TEST_FAIL: Duplicate piece rate log succeeded unexpectedly!';
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE '✅ Shield 3 (Duplicate Piece Rate Log Prevented by Unique Index): %', SQLERRM;
    END;

    -- =========================================================================
    -- اختبار 4: سلامة المخزون والمراجع (Shield 4)
    -- =========================================================================
    -- تجربة إدخال رصيد مخزون سالب
    INSERT INTO public.inventory (id, item_code, name, unit, quantity, unit_cost)
    VALUES (v_inv_id, 'ITEM-TEST-01', 'صنف تجريبي', 'متر', 10, 100);

    BEGIN
        INSERT INTO public.warehouse_stock (id, warehouse_id, inventory_id, quantity)
        VALUES ('TEST-WS-001', 'WH-MAIN', v_inv_id, -5);
        RAISE EXCEPTION 'TEST_FAIL: Negative warehouse stock succeeded unexpectedly!';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✅ Shield 4 (Negative Stock Blocked by Check Constraint): %', SQLERRM;
    END;

    -- تجربة إدخال سطر قيد بمدين ودائن موجبين معاً
    BEGIN
        INSERT INTO public.journal_entry_lines (id, entry_id, account_id, debit, credit, debit_base, credit_base)
        VALUES ('TEST-L3', v_j_id, v_deb_acc, 50, 50, 50, 50);
        RAISE EXCEPTION 'TEST_FAIL: Dual positive debit and credit succeeded unexpectedly!';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE '✅ Shield 4 (Dual Positive Debit and Credit Blocked): %', SQLERRM;
    END;

    -- تجربة حذف عميل مرتبط بطلب تجاري
    INSERT INTO public.customers (id, name, phone) VALUES (v_cust_id, 'عميل تجريبي', '770000000');
    INSERT INTO public.orders (id, order_no, customer_id, currency, total_amount)
    VALUES ('TEST-ORD-01', 'ORD-TEST-001', v_cust_id, 'YER', 1000);

    BEGIN
        DELETE FROM public.customers WHERE id = v_cust_id;
        RAISE EXCEPTION 'TEST_FAIL: Delete customer with orders succeeded unexpectedly!';
    EXCEPTION WHEN integrity_constraint_violation THEN
        RAISE NOTICE '✅ Shield 4 (Delete Customer with Orders Blocked): %', SQLERRM;
    END;

    -- تجربة حذف موظف مرتبط بأجور قطع
    INSERT INTO public.employees (id, name, role, salary, currency) VALUES (v_emp_id, 'موظف تجريبي', 'خياط', 1000, 'YER');
    BEGIN
        DELETE FROM public.employees WHERE id = v_emp_id;
        RAISE EXCEPTION 'TEST_FAIL: Delete employee with piece rates succeeded unexpectedly!';
    EXCEPTION WHEN integrity_constraint_violation THEN
        RAISE NOTICE '✅ Shield 4 (Delete Employee with Piece Rates Blocked): %', SQLERRM;
    END;

    -- =========================================================================
    -- اختبار 5: التحقق من تفعيل RLS لجميع الجداول (Shield 5)
    -- =========================================================================
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND rowsecurity = false
    ) THEN
        RAISE EXCEPTION 'TEST_FAIL: Some tables in public schema still lack RLS!';
    ELSE
        RAISE NOTICE '✅ Shield 5 (Row Level Security Active on 100%% of Public Tables)';
    END IF;

    RAISE NOTICE '🎉 ALL 5 HARD ARMOR SHIELDS VERIFIED 100%% IN POSTGRESQL!';
END $$;

ROLLBACK;
-- قاعدة البيانات نظيفة 100% بعد التراجع التلقائي
