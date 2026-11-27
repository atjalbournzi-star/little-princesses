# CONCURRENCY_AUDIT.md — تقرير تدقيق موثوقية الأنظمة المالية والتزامن (ACID & Concurrency Hardening)

**النظام:** Little Princesses ERP (Flask + `db_pool` [max=10] + Cloud Supabase PostgreSQL)  
**تاريخ التدقيق:** 2026-11-27  
**الحالة:** ✅ مكتمل ومُثبت باختبارات تزامن حية مع عودة قاعدة البيانات للحالة النظيفة (`0` صفوف حركات، `0.0000` مجموع الأرصدة، `MAX(current_number) = 0`).

---

## 1. ملخص نتائج التدقيق والإصلاح حسب المحاور الخمسة

### المحور 1: ذرية المعاملات عبر اتصال واحد (True Single-Connection ACID Transactions)
- **نتيجة التدقيق:** كافة العمليات المركبة (`add_order`, `process_pos_sale_atomic`, `deliver_and_settle_order`, `update_factory`, `add_purchase`, `add_expense`, `approve_expense_atomic`, `post_payroll`, `disburse_payroll_run_atomic`, `liquidate_worker_pieces_atomic`, `post_tailor_payout_voucher`, `add_advance`, `add_journal_entry`, `add_voucher`, `reverse_voucher`, `exchange_pos_size_atomic`, `return_pos_order_atomic`) تعمل داخل كتلة `with get_db_cursor(commit=True) as cur:` واحدة تضمن `COMMIT` عند النجاح و`ROLLBACK` + إرجاع الاتصال للـ Pool في `finally`.
- **الثغرات المكتشفة والمُصلحة:**
  1. `services/pg/pg_advances.py`: إزالة التعديل اليدوي المزدوج على `chart_of_accounts.current_balance` (الذي كان يتضاعف مع مشغل `trg_journal_line_balance`) واستبداله بـ `refresh_chart_balances_atomic(cur)`.
  2. `services/pg/pg_factory_payout.py`: إزالة التعديلات اليدوية على `chart_of_accounts.current_balance` واستبدالها بـ `refresh_chart_balances_atomic(cur)`.
  3. `services/pg/pg_vouchers_reverse.py`: إضافة `refresh_chart_balances_atomic(cur)` بعد إدراج أسطر القيد العكسي لتحديث الحسابات التجميعية.

### المحور 2: منع السحب السالب والتصادم على المخزون (`POS` و`خطوط التصنيع`)
- **نتيجة التدقيق:**
  - `pg_pos.py` و`pg_factory_fabric.py` يطبقان `SELECT ... FOR UPDATE` على `product_variants` و`inventory` و`warehouse_stock` قبل التحقق والخصم.
  - **تحسينات التزامن:**
    - `services/pg/pg_factory_fabric.py`: فرز قائمة الأقمشة في `deduct_fabrics_batch` تصاعدياً حسب `(fabric_id, fabric_name)` لمنع التعليق المتبادل عند خصم عدة أصناف بالتوازي.
    - `services/pg/pg_factory_payout.py`: إضافة `FOR UPDATE OF prl` عند قفل سجلات `piece_rate_logs` لمنع صرف نفس القطع مرتين تحت التزامن.
    - `services/security/error_translator.py`: إرجاع رمز `409 Conflict` مع رسالة عربية واضحة عند نفاد الرصيد أو رفض السحب السالب.

### المحور 3: ذرية عدّادات الترقيم (`number_sequences`) ومنع التعليق المتبادل (`Deadlock`)
- **عدّادات الترقيم:** `pg_sequences.py::get_next_sequence_number()` يستخدم تحديثاً ذرياً بسطر واحد (`UPDATE number_sequences SET current_number = current_number + 1 ... RETURNING`).
  - **إصلاح:** استبدال التوليد المعتمد على `time.time()` في `services/pg/pg_advances.py` بـ `get_next_sequence_number(cur, 'PV')` و`get_next_sequence_number(cur, 'JV')`.
- **منع التعليق المتبادل على `trg_journal_line_balance`:**
  - إنشاء المساعد المركزي [`services/pg/journal_lines_helper.py`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/services/pg/journal_lines_helper.py) (`insert_sorted_journal_lines`) الذي يفرز سطور `journal_entry_lines` تصاعدياً حسب `account_id` قبل الإدراج.
  - تطبيقه في كافة وحدات الترحيل المحاسبي (`pg_journal.py`, `pg_vouchers.py`, `pg_vouchers_reverse.py`, `pg_expenses_post.py`, `pg_purchases_posting.py`, `pg_pos_accounting.py`, `pg_pos_exchange.py`, `pg_pos_return.py`, `pg_factory_delivery.py`, `pg_wip_accounting.py`, `pg_payroll_post.py`, `pg_advances.py`, `pg_factory_payout.py`, `pg_piece_rates.py`).

### المحور 4: تفعيل منع التكرار الدائم عبر جدول `idempotency_keys`
- **الثغرة الحرجة المُصلحة في `services/security/idempotency.py`:**
  - كان التنفيذ السابق يستخدم `ON CONFLICT (idempotency_key) DO UPDATE ... WHERE state = 'failed'` دون التحقق من نجاح الحجز (`rowcount / RETURNING`), مما يسمح بمرور الطلب المتزامن الثاني عند وصوله في نفس اللحظة.
  - تم استبداله بآلية حجز ذرية: `INSERT INTO public.idempotency_keys (...) VALUES (...) ON CONFLICT (idempotency_key) DO NOTHING RETURNING idempotency_key;` وعند التعارض يتم فحص الحالة في القاعدة (`409` إذا كانت `processing` أو اختلف `request_hash`، وإرجاع الاستجابة المخزنة إذا كانت `completed`).
  - تفعيل `@idempotent_op('gas_proxy')` على مسار `/api/gas` و`/save` في `routes/system_bp.py` (لطلبات `POST` فقط).
  - التحقق من تفعيل `RLS = True` على جدولي `idempotency_keys` و`fiscal_periods`.

### المحور 5: نتائج اختبارات التزامن الحية (`tests/test_concurrency_hardening.py`)
تم تنفيذ الاختبارات باستخدام `ThreadPoolExecutor` (ضمن حد `db_pool` = 10) على قاعدة البيانات الحية مع تنظيف ذري داخل `finally`:
1. **اختبار تصادم المخزون (`POS`):** طلبان متزامنان على صنف رصيده `1` -> نجاح طلب واحد ورفض الآخر برسالة عربية (`نفد الرصيد المطلوب...`) وبقاء الرصيد `0.0000`.
2. **اختبار التراجع الكامل (`ROLLBACK`):** محاكاة فشل منتصف معاملة مركبة -> `0` صفوف متبقية وثبات الأرصدة بنسبة 100%.
3. **اختبار منع التكرار (`Idempotency-Key`):** طلبان متزامنان بنفس المفتاح على `/api/journal` -> استجابة `[409, 200]` وإنشاء قيد محاسبي واحد فقط.
4. **اختبار عدادات الترقيم المتزامنة:** 4 خيوط متزامنة -> `['ORD-000001', 'ORD-000002', 'ORD-000003', 'ORD-000004']` بلا أي تصادم.
5. **اختبار منع `Deadlock`:** قيدان متزامنان بترتيب حسابات متعاكس -> نجاح القيدين بدون أي تعليق متبادل.
6. **التحقق بعد التنظيف (`Post-cleanup`):** `0` صفوف في كافة جداول الحركات، `SUM(current_balance) = 0.0000`، `MAX(current_number) = 0`.

---

## 2. قائمة الملفات المُنشأة والمُعدّلة (جميعها <= 220 سطراً)
- `services/pg/journal_lines_helper.py` (جديد - 22 سطراً)
- `services/security/idempotency.py` (210 سطراً)
- `services/security/error_translator.py` (154 سطراً)
- `routes/system_bp.py` (213 سطراً)
- `services/pg/pg_advances.py` (206 سطراً)
- `services/pg/pg_factory_payout.py` (158 سطراً)
- `services/pg/pg_factory_fabric.py` (168 سطراً)
- `services/pg/pg_vouchers_reverse.py` (91 سطراً)
- `services/pg/pg_journal.py` (218 سطراً)
- `services/pg/pg_vouchers.py` (213 سطراً)
- `services/pg/pg_expenses_post.py` (102 سطراً)
- `services/pg/pg_purchases_posting.py` (95 سطراً)
- `services/pg/pg_pos_accounting.py` (119 سطراً)
- `services/pg/pg_pos_exchange.py` (189 سطراً)
- `services/pg/pg_pos_return.py` (210 سطراً)
- `services/pg/pg_factory_delivery.py` (213 سطراً)
- `services/pg/pg_wip_accounting.py` (150 سطراً)
- `services/pg/pg_payroll_post.py` (219 سطراً)
- `services/pg/pg_piece_rates.py` (168 سطراً)
- `tests/test_concurrency_hardening.py` (جديد - 165 سطراً)
- `CONCURRENCY_AUDIT.md` (جديد)
