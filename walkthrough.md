# توثيق إنجاز تفكيك وهندسة معمارية السندات المالية (Vouchers Modular Architecture)

تم بنجاح تفكيك وإعادة هيكلة ملف السندات والمعاملات المالية [`src/features/Vouchers.jsx`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/Vouchers.jsx) من ملف أحادي ضخم (2819 سطراً) إلى بنية معيارية نموذجية (Modular Architecture) تتبع نفس المعايير المتبعة في قسمي المشتريات والمعمل.

---

## 1. ملخص النتائج والامتثال الحرفي لسقف الأسطر (<= 220 سطراً)

أظهر فحص PowerShell لجميع الملفات المنشأة التزاماً كاملاً وصارماً بالحد الأقصى (كل ملف أقل من 220 سطراً قطعياً):

| الملف | نوع المكون / الخطاف | عدد الأسطر الفعلي | حالة الامتثال (<= 220 سطراً) |
| :--- | :--- | :---: | :---: |
| [`useVouchersData.js`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/vouchers/hooks/useVouchersData.js) | خطاف جلب البيانات وتصفية الحسابات وتنميط السندات وحساب المؤشرات | 186 | ✅ مطابق ومحمي |
| [`useVoucherOperations.js`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/vouchers/hooks/useVoucherOperations.js) | خطاف عمليات الحفظ، الترحيل المزدوج، القيد العكسي، وإشعارات الواتساب | 175 | ✅ مطابق ومحمي |
| [`VouchersHeader.jsx`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/vouchers/components/VouchersHeader.jsx) | بطاقات المؤشرات المالية وأزرار الإصدار السريع | 102 | ✅ مطابق ومحمي |
| [`VouchersFilterBar.jsx`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/vouchers/components/VouchersFilterBar.jsx) | شريط البحث المالي وفلاتر نوع السند والتحديث السحابي | 51 | ✅ مطابق ومحمي |
| [`VouchersTable.jsx`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/vouchers/components/VouchersTable.jsx) | جدول استعراض السندات والمبالغ المحولة وإجراءات الإلغاء والطباعة | 146 | ✅ مطابق ومحمي |
| [`ReceiptVoucherModal.jsx`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/vouchers/components/ReceiptVoucherModal.jsx) | نافذة إصدار وتعديل سندات القبض وتوزيع الصناديق | 194 | ✅ مطابق ومحمي |
| [`PaymentVoucherModal.jsx`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/vouchers/components/PaymentVoucherModal.jsx) | نافذة إصدار وتعديل سندات الصرف وربط مراكز التكلفة والمصروفات | 169 | ✅ مطابق ومحمي |
| [`JournalVoucherModal.jsx`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/vouchers/components/JournalVoucherModal.jsx) | محرر قيد اليومية المركب المتزن وفحص توازن المدين والدائن | 196 | ✅ مطابق ومحمي |
| [`VoucherViewModal.jsx`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/vouchers/components/VoucherViewModal.jsx) | نافذة عرض تفاصيل السند المالي الشاملة | 72 | ✅ مطابق ومحمي |
| [`VoucherReversalModal.jsx`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/vouchers/components/VoucherReversalModal.jsx) | نافذة الإلغاء بقيد عكسي وتوثيق سبب الإلغاء في سجل التدقيق | 88 | ✅ مطابق ومحمي |
| [`Vouchers.jsx`](file:///c:/Users/Mohammed%20Falah/Little_Princesses_ERP/src/features/Vouchers.jsx) | المجمع الرئيسي لتنسيق الخطافات والمكونات | 119 | ✅ مطابق (120-150 سطراً) |

---

## 2. قواعد الأمان المالي والاستقرار (Zero Financial Regressions)

1. **سلامة القيود المحاسبية:**
   - الحفاظ على قواعد القيد المزدوج: $\text{Debit} = \text{Credit}$ في كل قيد يتم توليده.
   - في سند القبض: جعل الصندوق أو البنك مديناً والحساب المقابل (العميل 104 / الإيراد 4111 / رأس المال 301) دائناً.
   - في سند الصرف: جعل الحساب المقابل (المورد 201 / المصروف 5xxx) مديناً والصندوق المسحوب منه دائناً، مع تسجيل حركة المصروف في سجل المصروفات تلقائياً إذا كان الحساب ينتمي للمصروفات.
2. **حوكمة الإلغاء المالي (No Hard Delete):**
   - حظر الحذف المباشر للسندات المعتمدة، وإلزامية الإلغاء بقيد عكسي متزن مع تسجيل سبب الإلغاء الإلزامي واسم المستخدم في سجل التدقيق.
3. **تحديث الأرصدة الحية:**
   - تحديث أرصدة الحسابات المالية في شجرة الحسابات فورياً وديناميكياً وفق طبيعة كل حساب (أصول/مصروفات مقابل التزامات/حقوق ملكية/إيرادات).

---

## 3. التحقق الفعلي وتشغيل الاختبارات

- **اختبارات بايثون القياسية:**
  - تم تشغيل `test_domain_architecture.py` و `test_voucher_reversal.py` بنجاح كامل:
    ```
    Ran 11 tests in 90.930s - OK
    ```
- **اختبار استجابة الخادم المحلي ونقاط النهاية:**
  - `GET /api/vouchers` -> HTTP 200 OK.
  - `GET /api/accounts/list` -> HTTP 200 OK.
  - `GET /index.html` -> HTTP 200 OK.
- **الترتيب الاعتمادي في `index.html`:**
  - تم ترتيب استدعاءات السكربتات بحيث تُحمّل الخطافات أولاً، ثم المكونات الفرعية، ثم المجمع الرئيسي `Vouchers.jsx` لمنع أي خطأ أو شاشة بيضاء.
