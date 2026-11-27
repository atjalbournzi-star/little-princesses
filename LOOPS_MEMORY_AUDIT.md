# تقرير التدقيق الشامل للأداء وحلقات التكرار وتسرب الذاكرة (Read-Only Audit)
## Little Princesses ERP — Performance, Loops, Fetch Storms & Memory Leaks Report

- **تاريخ الفحص:** 2026-11-27
- **وضع الفحص:** قراءة وتدقيق وتوثيق فقط (**Audit-Only / Read-Only Mode**) — لم يتم تعديل أي ملف كود أو إعادة هيكلة أي Hook أو المساس ببيانات قاعدة البيانات.
- **النطاق المفحوص:** الواجهة الأمامية (`index.html` + `src/` بالكامل)، الخادم الخلفي (`app.py`, `unified_server.py`, `db_client.py`, `routes/*`, `domains/*`, `services/pg/*` — 193 ملف Python)، والبيئة الحية على `http://127.0.0.1:5000` وقاعدة بيانات Supabase PostgreSQL (`pg_stat_activity`).

---

## 📊 الملخص التنفيذي (Executive Summary)

| مستوى الخطورة | عدد الملاحظات | أبرز الأسباب الجذرية المرصودة |
| :--- | :---: | :--- |
| **🔴 Critical (حرج)** | **7** | حلقة حفظ تلقائي لا نهائية بـ Base64 Canvas، تجمّد المتصفح عند التحميل الأولي (No-Cache + Babel Runtime)، 26 إعادة تصيير كاملة عند كل تبديل تبويب، عاصفة 19 طلب متزامن في التسويق، عاصفة أحداث تضرب 8 طلبات مكررة، واستعلامات محاسبية ضخمة بلا `LIMIT` |
| **🟠 High (مرتفع)** | **13** | ازدواجية جلب البيانات بين `useAppData` وHooks الشاشات، إعادة حساب كامل أرصدة دليل الحسابات مع قفل كتابة على كل `GET /api/accounts`، ثغرة تسريب اتصالات في `db_client.py`، 32 استدعاء SQLite غير محمي بـ `try/finally`، استعلامات N+1، وانتهاك قواعد React Hooks في 8 نوافذ منبثقة |
| **🟡 Medium (متوسط)** | **10** | طلبات `fetch` غير ملغاة (`AbortController`)، تسرب مؤقتات `setTimeout`، مراقب DOM دائم `MutationObserver`، خيوط خلفية غير محدودة (`daemon=True` / `ThreadingTCPServer`)، وحلقة `while True` غير مقيدة بسقف تكرار |
| **🟢 Low (منخفض)** | **4** | تنظيف متكرر لـ `localStorage` داخل جسم الدالة في كل Render، `commit=True` غير ضروري لاستعلامات قراءة فقط، ومؤقتات قصيرة غير منظفة في بعض المعالجات |

---

## 🖥️ نتائج الفحص الحي للخادم والعمليات وقاعدة البيانات (Axis 2 & Axis 4 Diagnostics)

### 1. حالة الخادم والعمليات الخلفية على المنفذ `5000` (Axis 4)
- **الحالة:** ✅ **نظيف (نسخة واحدة فقط دون تعارض منافذ)**
- **الدليل المرصود (`Get-CimInstance Win32_Process` + `netstat -ano`):**
  - عملية واحدة فقط تستمع على `0.0.0.0:5000`: **`PID 11168`** — الأمر: `"...\python.exe" app.py`.
  - استهلاك الموارد عند الفحص: **الذاكرة (Working Set):** `35.5 – 47.2 MB` | **المعالج (CPU):** `2.22s` | **عدد الخيوط (ThreadCount):** `2`.
  - إعداد التشغيل (`app.py:148`): `app.run(host='0.0.0.0', port=port, debug=False)` — وضع التصحيح (Reloader/Debug) معطل، مما يمنع ازدواجية العمليات.
  - **ملاحظة شبكية مرصودة:** رُصدت **مئات المقابس في حالة `TIME_WAIT`** على `127.0.0.1:5000` أثناء تحميل الصفحة نتيجة تحميل عشرات/مئات ملفات JSX/JS غير المخزنة مؤقتاً (`Cache-Control: no-cache, no-store, must-revalidate` في `app.py:53`).
  - **فحص العمليات الخلفية الثابتة:** لا يوجد أي استخدام لـ `subprocess` أو `Popen` أو `threading.Timer` أو `APScheduler` في الوحدات النشطة. (يوجد 3 خيوط `threading.Thread(daemon=True)` عند الكتابة موثقة في قسم Medium).

### 2. حالة اتصالات Supabase PostgreSQL الحية (`pg_stat_activity`)
- **الحالة:** ✅ **لا توجد معاملات معلّقة (`Idle in Transaction = 0`) وقت الفحص**
- **الدليل المرصود:**
  - `idle`: `8` اتصالات.
  - `active`: `1` اتصال (استعلام الفحص نفسه).
  - `idle in transaction` / `idle in transaction (aborted)`: **`0` اتصالات**.

### 3. نتيجة الفحص الحي للمتصفح على `http://127.0.0.1:5000` (Axis 2)
- **الدليل المرصود (Browser Live Audit):**
  - استجاب الخادم بـ `HTTP 200` وحجم `index.html = 60.1 KB`، ووصل العنوان (`نظام الإدارة المتكامل الذكي | ERP Master`)، لكن الصفحة **تجمّدت (Renderer Freeze / Main-Thread Hang)** وتجاوزت مهلة التحميل (`OP_TIMEOUT` لمدة 42–47 ثانية، و`InteractiveNodes: 0`).
  - **السبب الجذري المثبت بالكود:** اجتماع 4 عوامل معاً عند كل تحميل:
    1. `app.py:53` يفرض `Cache-Control: no-cache, no-store, must-revalidate` على **جميع** الملفات الثابتة (بما فيها React وTailwind وBabel وكافة ملفات `src/**/*.jsx`).
    2. `index.html` (60.1 KB) يحمّل مئات ملفات `<script type="text/babel">` ويُترجمها داخل الخيط الرئيسي للمتصفح (`@babel/standalone`) عند كل زيارة.
    3. `index.html:143-164` يشغّل `MutationObserver` دائماً على `document.documentElement` بالكامل مع `querySelectorAll`.
    4. `useAppData.js:108-116` يطلق 7 طلبات API غير مفلترة فوراً عند التحميل بينما `AppRouter.jsx:48-56` يجبر 26 إعادة تصيير كاملة.

---

## 🔴 الملاحظات الحرجة (CRITICAL)

### C-1: حلقة حفظ تلقائي لا نهائية مع تصدير صورة Canvas كاملة (Base64) كل 2.5 ثانية
- **المحور:** المحور 1 (React Hooks & Infinite Loops)
- **الملف ورقم السطر:** `src/features/measurement/hooks/useStudioSync.js:18-50, 53-76, 143-152` و `src/features/measurement/hooks/useStudioState.js:199-213`
- **الدليل المرصود:**
  - `useStudioState()` يُرجع كائناً جديداً `{ ... }` في كل Render.
  - في `useStudioSync.js:50` تم وضع `state` الكامل داخل اعتماديات `buildPayload`، ثم `buildPayload` داخل `saveSession` (سطر 76)، ثم `saveSession` داخل `useEffect` الحفظ التلقائي (سطر 152).
  - عند تفعيل `autoSaveEnabled && sessionId`: يطلق المؤقت `saveSession(false)` ← يُحدث `setSyncStatus('saving')` ثم `setSyncStatus('saved')` و`setLastSavedAt(new Date())` ← يُعيد التصيير ← يُنشئ مرجعاً جديداً لـ `state` و`saveSession` ← يُعيد تشغيل `useEffect` ويُجدول طلباً جديداً بعد 2500ms **إلى ما لا نهاية**.
- **الأثر على الأداء/الذاكرة:** حلقة POST لا نهائية كل 2.5 ثانية تقوم في كل دورة بإنشاء Canvas مؤقت واستدعاء `toDataURL('image/jpeg', 0.85)` (مئات الكيلوبايتات Base64)، مما يستهلك المعالج والشبكة والذاكرة ويكدّس الكتابات على قاعدة البيانات.
- **التوصية الجراحية (<= 220 سطراً):**
  - تخزين أحدث مرجع للـ `saveSession` داخل `useRef` (`saveSessionRef.current = saveSession`) وإزالة `saveSession` من مصفوفة اعتماديات `useEffect` (سطر 152) لتعتمد فقط على `[state.a4Corners, state.measurements, autoSaveEnabled, sessionId]`.
  - تغليف الكائن المُرجع من `useStudioState.js` بـ `useMemo` أو تمرير الحقول الأولية (Primitives) المطلوبة فقط إلى `buildPayload`.

---

### C-2: تجمّد المتصفح عند التحميل الأولي بسبب تعطيل الكاش على الملفات الثابتة مع الترجمة الفورية بـ Babel
- **المحور:** المحور 2 (الشاشات الثقيلة وحمولة التحميل)
- **الملف ورقم السطر:** `app.py:51-55` و `index.html` (حجم 60.1 KB)
- **الدليل المرصود:**
  - `app.py:53` يضيف الترويسة `response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'` على **كل** الاستجابات دون التمييز بين `/api/*` والملفات الثابتة (`.js`, `.jsx`, `.css`, مكتبات Vendor).
  - بالتوازي، رُصد في الفحص الحي تجمّد صفحة `http://127.0.0.1:5000/` لمدة >45 ثانية (`OP_TIMEOUT`) ومئات اتصالات `TIME_WAIT` على المنفذ 5000.
- **الأثر على الأداء/الذاكرة:** إعادة تنزيل كافة ملفات الواجهة وترجمتها في الخيط الرئيسي عبر `@babel/standalone` في كل تحديث صفحة، مما يسبب ارتفاعاً حاداً في استهلاك الذاكرة وCPU وتجميد واجهة المستخدم.
- **التوصية الجراحية (<= 220 سطراً):**
  - في `app.py:51-55`: قصر `no-cache, no-store` على مسارات `/api/` و`index.html` فقط، ومنح الملفات الثابتة المزودة بـ `?v=...` ترويسة `public, max-age=31536000, immutable` (مع الحفاظ على `app.py` أقل من 160 سطراً).
  - على المدى المتوسط: استبدال `@babel/standalone` بـ Pre-transpiled build (أو تجميع حزم ESBuild/Vite) لإزالة ترجمة JSX من المتصفح نهائياً.

---

### C-3: إجبار 26 إعادة تصيير كاملة لشجرة التبويب النشط عند كل تنقل بين الشاشات
- **المحور:** المحور 1 و 2 (Excessive Re-renders)
- **الملف ورقم السطر:** `src/components/app/AppRouter.jsx:46-56, 118, 124`
- **الدليل المرصود:**
  - عند كل تغيير في `activeTab`، يشغّل `AppRouter` مؤقت `setInterval(..., 80)` ينفّذ `setTick(t => t + 1)` لمدة **26 مرة متتالية** (`attempts > 25` ≈ 2.08 ثانية) حتى عندما يكون المكوّن محمّلاً وجاهزاً (`hasActiveComp === true`) منذ اللحظة الأولى.
  - بالإضافة إلى تمرير دوال سطرية جديدة (`onClearTargetJob={() => ...}` سطر 124 و`onSendToFactory={(jobData) => ...}` سطر 118) في كل Tick.
- **الأثر على الأداء/الذاكرة:** إعادة تصيير شاشة كاملة ثقيلة (مثل الجداول المالية أو المخزون أو POS) 26 مرة خلال ثانيتين عند كل نقرة تنقل، مما يضاعف عمل React Reconciliation ومراقب `MutationObserver` ويُبطئ الاستجابة بشكل ملحوظ.
- **التوصية الجراحية (<= 220 سطراً):**
  - فحص `hasActiveComp` قبل تشغيل الـ `setInterval` (لا يُشغّل المؤقت إطلاقاً إذا كان المكوّن موجوداً بالفعل في `window`)، وإيقاف الـ `clearInterval` فور تحقق وجود المكوّن.
  - تغليف `onClearTargetJob` و`onSendToFactory` بـ `useCallback` داخل `AppRouter.jsx` (يبقى الملف ~140 سطراً).

---

### C-4: عاصفة جلب في شاشة التسويق (19 طلباً متزامناً عند التحميل وعند كل تغيير لـ `timeframe`)
- **المحور:** المحور 2 (Fetch Storms & Duplicate API Calls)
- **الملف ورقم السطر:** `src/features/marketing/hooks/useMarketingData.js:36-100` و `src/components/app/useAppData.js:152`
- **الدليل المرصود:**
  - `useEffect(() => { fetchAllMarketingData(); }, [timeframe])` يطلق `Promise.allSettled([...])` يحتوي على **19 طلب API متزامناً** دفعة واحدة عند فتح التبويب، ويعيد إطلاق الـ 19 طلباً بالكامل عند كل تغيير في `timeframe` رغم أن دالة واحدة فقط (`getExecutiveKPIs(timeframe)` سطر 55) تستخدم `timeframe`.
  - في الوقت نفسه، `useAppData.js:152` يجلب `/api/marketing/campaigns` بشكل مكرر مع `window.marketingAPI.getCampaigns()` (سطر 43).
- **الأثر على الأداء/الذاكرة:** استنزاف فوري لمجمع اتصالات PostgreSQL (`DB_POOL_MAX=20` في `db_client.py`) من مستخدم واحد فقط، وارتفاع زمن الاستجابة وسباق حالة (Race Conditions) عبر 19 استدعاء `setState`.
- **التوصية الجراحية (<= 220 سطراً):**
  - فصل جلب `getExecutiveKPIs(timeframe)` في `useEffect` مستقل يعتمد على `[timeframe]` فقط، وتحميل تبويبات التسويق الفرعية بآلية Lazy Loading حسب التبويب الفرعي النشط بدلاً من 19 طلباً دفعة واحدة.
  - حذف جلب `/api/marketing/campaigns` المكرر من `useAppData.js:152` أو تمريره كمصدر وحيد.

---

### C-5: عاصفة أحداث (Event Storm) تطلق 8 طلبات مكررة عند اعتماد الجودة و6 عند التسليم
- **المحور:** المحور 2 (Duplicate API Calls / Fetch Storms)
- **الملف ورقم السطر:**
  - `src/features/factory/components/QualityAssurance.jsx:98-99`
  - `src/features/factory/components/DeliveryModal.jsx:75-79`
  - `src/features/factory/hooks/useFactoryData.js:126-156`
- **الدليل المرصود:**
  - عند اعتماد فحص الجودة، يطلق `QualityAssurance.jsx:99` أربعة أحداث متزامنة: `['order_qc_updated', 'orders-updated', 'erp:factoryChanged', 'erp:ordersChanged']`.
  - بينما يستمع `useFactoryData.js:126-156` لجميع الأحداث الخمسة (`order_status_changed`, `order_qc_updated`, `erp:ordersChanged`, `erp:factoryChanged`, `orders-updated`) ويربطها جميعاً بنفس الدالة `handleQcSync` التي تستدعي **كلاً من** `/api/sales/orders` و`/api/factory`.
- **الأثر على الأداء/الذاكرة:** نقرة اعتماد جودة واحدة تطلق `handleQcSync` 4 مرات في نفس الـ Tick ← **4× `/api/sales/orders` + 4× `/api/factory` = 8 طلبات متطابقة متزامنة**؛ وتأكيد التسليم يطلق **6 طلبات مكررة متزامنة**.
- **التوصية الجراحية (<= 220 سطراً):**
  - إضافة حارس `debounce` (مثلاً 150ms عبر `useRef` timer مع تنظيفه في cleanup) داخل `handleQcSync` في `useFactoryData.js`، وتوحيد اسم الحدث المُنطلق إلى حدث واحد دلالي (`erp:factoryChanged`) بدلاً من بث 4-5 أحداث مترادفة.

---

### C-6: استعلامات محاسبية ومشتريات ضخمة بلا `LIMIT` أو ترقيم صفحات (Pagination)
- **المحور:** المحور 3 (Backend & Supabase PostgreSQL — Unfiltered Payloads)
- **الملف ورقم السطر:**
  - `services/pg/pg_journal.py:19-46` (`get_journal_entries`)
  - `services/pg/pg_general_ledger.py:76-108` (`get_general_ledger_pg`)
  - `services/pg/pg_purchases.py:14-33, 115-122` (`get_purchases` & `get_purchase_by_id`)
- **الدليل المرصود:**
  - `pg_journal.py:19-46`: يجلب **كامل** جدول `journal_entries` مدموجاً مع `json_agg` لجميع أسطر `journal_entry_lines` عبر تاريخ الشركة بالكامل بلا `LIMIT` أو فلتر تاريخ إلزامي.
  - `pg_general_ledger.py:76-108`: عند عدم تحديد حساب أو اختيار `'ALL'` بلا نطاق زمني، يجلب كل أسطر الأستاذ العام ويحسب الأرصدة التراكمية في ذاكرة Python.
  - `pg_purchases.py:14-33`: يجلب كل المشتريات (مع 3 استعلامات فرعية مرتبطة لكل صف) + `SELECT * FROM purchase_items` بالكامل. والأسوأ في `get_purchase_by_id` (الأسطر 115-122): يستدعي `get_purchases({'include_cancelled': True})` ويمسح كل السجلات خطياً في Python لإرجاع فاتورة واحدة!
- **الأثر على الأداء/الذاكرة:** نمو خطي في استهلاك RAM بالخادم والمتصفح وزمن الاستجابة حتى الوصول إلى Timeout أو OOM مع تراكم القيود والمشتريات.
- **التوصية الجراحية (<= 220 سطراً):**
  - فرض `LIMIT` افتراضي (مثلاً `limit=200`, `offset=0`) وفلتر تاريخ افتراضي (آخر 90 يوماً) في `pg_journal.py` و`pg_general_ledger.py` و`pg_purchases.py`.
  - تعديل `get_purchase_by_id` لتنفيذ `WHERE p.id = %s` مباشرة في SQL بدلاً من جلب الجدول كاملاً.

---

### C-7: انتهاك قواعد React Hooks (Conditional Early Return Before Hooks) في 8 نوافذ منبثقة
- **المحور:** المحور 1 (React Stability & Leaked Effects)
- **الملف ورقم السطر:**
  - `src/components/UsersModal.jsx:11` (قبل الأسطر 16-46)
  - `src/features/orders/components/OrderDeliveryModal.jsx:13` (قبل الأسطر 21-55)
  - `src/features/factory/components/DeliveryModal.jsx:12` (قبل الأسطر 26-61)
  - `src/features/vouchers/components/JournalVoucherModal.jsx:7` (قبل الأسطر 9-55)
  - `src/features/vouchers/components/PaymentVoucherModal.jsx:9` (قبل الأسطر 11-60)
  - `src/features/vouchers/components/ReceiptVoucherModal.jsx:9` (قبل الأسطر 11-60)
  - `src/features/hr/components/PayoutModal.jsx:17` (قبل سطر 19 `useEffect` + `window.addEventListener('keydown')`)
  - `src/features/hr/components/PayoutVoucher.jsx:3` (قبل سطر 5 `useEffect` + `window.addEventListener('keydown')`)
- **الدليل المرصود:** تنفيذ `if (!isOpen) return null;` أو `if (!order) return null;` **قبل** استدعاء `useState`/`useEffect`/`useMemo`.
- **الأثر على الأداء/الذاكرة:** عند تغيّر حالة الفتح/الإغلاق، يختلف عدد الـ Hooks بين Render وآخر، مما يسبب خطأ React فادحاً (`Rendered more/fewer hooks than during the previous render`) أو تخطي دوال تنظيف `window.addEventListener('keydown')` وتسريب مستمعات الأحداث.
- **التوصية الجراحية (<= 220 سطراً):** نقل شرط `if (!isOpen) return null;` ليكون **بعد** جميع استدعاءات Hooks (مع فحص `if (!isOpen) return;` داخل كل `useEffect`)، أو إخفاء استدعاء المكوّن من الأب `{isOpen && <Modal ... />}`.

---

## 🟠 الملاحظات مرتفعة الخطورة (HIGH)

### H-1: ازدواجية الجلب الممنهجة بين `useAppData.js` وHooks الشاشات الثقيلة
- **المحور:** المحور 2 (Duplicate API Calls)
- **الملف ورقم السطر:**
  - `src/components/app/useAppData.js:108-160` (يجلب 7 مسارات غير مفلترة فور الإقلاع، ويعيد جلب `hr` دون كاش، ويجلب 5 جداول كاملة عند دخول `reports`).
  - **التكرار المرصود شاشةً بشاشة:**
    1. **لوحة التحكم (Dashboard):** `src/features/dashboard/hooks/useDashboardData.js:22-32` يعتمد على `[timeHorizon, journal.length]`، فيطلب `/api/reports/income-statement` عند `journal.length === 0` ثم يطلبه **مرة ثانية** فور وصول `/api/journal`. كذلك `Header.jsx:131` و`useDashboardActions.js:28` يطلبان `/api/atelier/watchdog` معاً عند التحميل.
    2. **شجرة الحسابات (Accounts):** `useAppData.js:109,115` جلب `/api/accounts/list` و`/api/journal`، ثم `src/features/Accounts.jsx:93` (`useAccountActions.js:13-33`) يعيد جلبهما عند فتح الشاشة.
    3. **المخزون (Inventory):** `useAppData.js:138` و`src/features/inventory/hooks/useInventoryData.js:68` يطلبان `/api/inventory` معاً في نفس اللحظة.
    4. **التصنيع (Factory):** `useAppData.js:110,112` و`src/features/factory/hooks/useFactoryData.js:123-125` يطلبان `/api/sales/orders` و`/api/factory` مرتين.
    5. **السندات والمصروفات والعملاء:** `useVouchersData.js:128-136`، `useExpensesData.js:34-36`، `useCustomersData.js:17-18` تعيد جلب نفس بيانات `useAppData`.
    6. **الموارد البشرية (HR):** `useAppData.js:121-147` يتجاوز `loadedTabsRef`، و`src/features/hr/hooks/useHRData.js:74-91` يشغّل `useEffect` مزدوجين عند التحميل يستدعيان `loadCommissions()` و`loadTailorSummaries()` مرتين.
    7. **التقارير المالية (Reports):** `src/features/reports/hooks/useReportsData.js:12,24-32,50-63` يهيئ `dateRange` بـ `start: ''` فيطلق `/api/reports/income-statement` ثم يُعدّل `dateRange` فوراً عبر `periodPreset` فيطلق الطلب **مرة ثانية** على التوالي.
- **الأثر على الأداء/الذاكرة:** مضاعفة طلبات الشبكة وزمن تحميل الشاشات واستهلاك مجمع الاتصالات في Supabase.
- **التوصية الجراحية (<= 220 سطراً):**
  - اعتماد مصدر جلب واحد لكل كيان (إما `useAppData` مع طابع زمني `lastFetchedAt` / TTL قصير، أو ترك الجلب للـ Feature Hook وإزالته من `useAppData`).
  - تهيئة `dateRange` في `useReportsData.js:12` بالقيمة الافتراضية مباشرة بدلاً من تحديثها داخل `useEffect` لاحق.

---

### H-2: إعادة حساب وتحديث كامل شجرة الحسابات مع قفل كتابة (`commit=True`) على كل `GET /api/accounts`
- **المحور:** المحور 3 (Backend & PostgreSQL Performance)
- **الملف ورقم السطر:** `services/pg/pg_accounts.py:41-87`
- **الدليل المرصود:**
  - دالة القراءة `get_accounts()` تفتح معاملة كتابة (`with get_db_cursor(commit=True) as cur:`) في السطر 43 وتنفذ `refresh_chart_balances_atomic(cur)` التي تجمّع **كامل** `journal_entry_lines` وتحدّث جميع الحسابات الفرعية ثم الأبوية مستوىً بمستوى عبر `cascade_account_balances`.
  - يتبعها في الأسطر 56-82 استعلامات فرعية مترابطة (Correlated Subqueries) تمسح `journal_entries` لكل حساب بعملة أجنبية.
- **الأثر على الأداء/الذاكرة:** كل فتح للوحة التحكم أو شجرة الحسابات أو السندات يفرض كتابة كاملة وأقفال صفوف (`Row Locks`) على `chart_of_accounts`، مما يسبب اختناقاً وتضارباً (Lock Contention) مع عمليات الترحيل المتزامنة.
- **التوصية الجراحية (<= 220 سطراً):**
  - إزالة `refresh_chart_balances_atomic(cur)` من مسار القراءة `GET /api/accounts` والاعتماد على التحديث الذري للأرصدة وقت ترحيل القيود فقط (مع إبقاء خيار `?recalculate=true` صريحاً للصيانة عند الحاجة).
  - استبدال الاستعلامات المترابطة (الأسطر 56-82) بـ `LEFT JOIN` مجمّع (CTE) واحد على `journal_entries`.

---

### H-3: ثغرة تسريب اتصالات PostgreSQL في `db_client.py` عند فشل `rollback()` داخل `finally`
- **المحور:** المحور 3 (Connection Pool Leaks)
- **الملف ورقم السطر:** `db_client.py:144-154`
- **الدليل المرصود:**
  ```python
  finally:
      if conn and not p.closed:
          try:
              if is_bad or conn.closed != 0: p.putconn(conn, close=True)
              else:
                  if conn.autocommit: conn.autocommit = False
                  if conn.status != psycopg2.extensions.STATUS_READY: conn.rollback()
                  p.putconn(conn)
          except Exception: pass
      if acquired and sem:
          try: sem.release()
          except Exception: pass
  ```
- **الأثر على الأداء/الذاكرة:** إذا انقطع اتصال TCP فجأة ورمى `conn.rollback()` (سطر 149) أو `conn.autocommit = False` (سطر 148) استثناءً، فإن `except Exception: pass` يتجاوز `p.putconn(conn)` تماماً بينما يُحرر السمافور `sem.release()` (سطر 153). يبقى الاتصال محجوزاً للأبد في `ThreadedConnectionPool._used` حتى ينهار الخادم بـ `PoolError: connection pool exhausted`.
- **التوصية الجراحية (<= 220 سطراً):** فصل `rollback()` في كتلة `try/except` مستقلة تجعل `is_bad = True` عند الفشل، وضمان تنفيذ `p.putconn(conn, close=is_bad)` دائماً داخل `finally` في `db_client.py`.

---

### H-4: 32 استدعاءً لـ SQLite `get_db()` دون `with` أو `try/finally` (تسريب اتصالات وأقفال)
- **المحور:** المحور 3 (Connection & Cursor Leaks)
- **الملف ورقم السطر:**
  - `routes/auth_bp.py:28, 65, 96, 122, 161`
  - `routes/accounting_bp.py:25`
  - `domains/auth/routes.py:22, 53, 89` | `domains/auth/routes_users.py:34, 90` | `domains/auth/db_init.py:46, 94`
  - `domains/accounting/routes_journal.py:24, 61, 115, 160` | `routes_accounts.py:69` | `reversing_service.py:29, 155` | `code_generator.py:15` | `opening_entry_handler.py:21` | `db_schema.py:12`
  - `domains/customers/routes.py:31, 179`
  - `domains/marketing/db_init.py:10` | `db_ai_init.py:10` | `domains/quality/db_init.py:15`
  - `domains/system/relational_db.py:10` | `routes.py:47` | `routes_sync.py:32, 79`
- **الدليل المرصود:** جميع المواضع أعلاه تفتح `conn = get_db()` وتغلق `conn.close()` فقط في المسار السليم (Happy Path) بدون `try/finally` أو Context Manager.
- **الأثر على الأداء/الذاكرة:** عند حدوث أي استثناء (`IntegrityError` أو `OperationalError` أو خطأ شبكة في `sync_users_to_gas_async`)، يبقى الاتصال والمؤشر مفتوحين وتُحتجز أقفال SQLite (`database is locked`) حتى يجمعهما الـ GC.
- **التوصية الجراحية (<= 220 سطراً):** تغليف `get_db()` بـ `@contextmanager` يُغلق الاتصال ويُنفّذ `rollback()` تلقائياً في `finally`، أو استخدام `try ... finally: conn.close()` في المسارات النشطة (`routes/auth_bp.py`, `routes/accounting_bp.py`, `domains/auth/db_init.py`).

---

### H-5: استعلامات N+1 و2N+1 داخل الحلقات في نقاط النهاية الساخنة (GET & Sync)
- **المحور:** المحور 3 (N+1 Queries)
- **الملف ورقم السطر:**
  1. `domains/marketing/routes_ai_analysis.py:72-89`: استعلام `SELECT * FROM messages WHERE conversation_id = %s` داخل `for conv in convs:` (**N+1**).
  2. `domains/marketing/routes_ai_analysis.py:125-148`: استعلامان تجميعيان (`content_metrics` و`campaigns`) داخل `for p in prods:` (**2N+1**).
  3. `domains/marketing/routes_core.py:50-60` و `81-90`: استعلامان N+1 على `content_metrics` و`messages` لكل صف.
  4. `services/pg/pg_factory_analytics.py:79-101`: داخل `for emp in emps:` ينفذ مسحاً لـ `production_orders` بـ 4 شروط `OR` (`cutter_name = %s OR tailor_name = %s ...`) لكل موظف (**N Full Scans**).
  5. `services/pg/pg_financial_sync.py:198-215`: داخل `for cust in customers:` يستدعي `sync_customer_order_from_voucher` (≈10-15 استعلاماً مع `FOR UPDATE`) لكل عميل داخل معاملة واحدة (**O(12N)** مع خطر Deadlock).
  6. `services/pg/pg_warehouse_transfer_post.py:67-113`: 4 استعلامات لكل فاتورة مشتريات داخل `for p in purchases:` (**4N+1+M**).
  7. `domains/auth/db_init.py:96-99`: استدعاء `pg_service.sync_user_to_pg(u)` لكل مستخدم (فتح اتصال PG ومعاملة منفصلة لكل مستخدم عند كل حفظ/حذف).
- **الأثر على الأداء/الذاكرة:** تضاعف زمن الاستجابة خطياً مع نمو البيانات وإشغال مجمع اتصالات PostgreSQL.
- **التوصية الجراحية (<= 220 سطراً):**
  - استبدال الحلقات في `routes_ai_analysis.py` و`routes_core.py` بـ `WHERE id = ANY(%s)` أو `LEFT JOIN` مع `json_agg` في استعلام واحد.
  - في `pg_factory_analytics.py:79-101`: تجميع `production_orders` باستعلام SQL واحد باستخدام `LATERAL (VALUES (cutter_name), (tailor_name), (embroiderer_name), (finisher_name))` مع `GROUP BY`.

---

### H-6: استعلامات ضخمة أخرى غير مقيدة بـ `LIMIT` وعمليات مسح خطي لسجل واحد
- **المحور:** المحور 3 (Large Unfiltered Payloads)
- **الملف ورقم السطر:**
  - `services/pg/pg_products_query.py:9-14, 70-77`: `get_products()` بلا `LIMIT`، و`get_product_by_id()` (الأسطر 70-77) يجلب كل المنتجات ويفك تشفير JSON للجميع لإرجاع منتج واحد!
  - `services/pg/pg_customers.py:13-112`: 5 استعلامات كاملة بلا `LIMIT` في طلب `GET /api/customers` واحد (`customers`, `measurements`, `children`, `orders`, `payments`).
  - `services/pg/pg_orders.py:11-55`: `orders` + 3 CTEs كاملة بلا `LIMIT`.
  - `services/pg/pg_quality_dashboard.py:18-39`: 7 استعلامات `SELECT *` كاملة في طلب لوحة الجودة.
  - `services/pg/pg_expenses.py:13-21` و `services/pg/pg_inventory.py:36-62` و `services/pg/pg_factory_query.py:161-213`: جميعها بلا `LIMIT`.
- **الأثر على الأداء/الذاكرة:** تضخم حمولات JSON المستلمة في المتصفح وتخزينها المتزامن في React State و`localStorage` (`useAppData.js:47-54`).
- **التوصية الجراحية (<= 220 سطراً):** تعديل `get_product_by_id` لاستعلام مباشر `WHERE id = %s`، وإضافة `LIMIT/OFFSET` وفلاتر بحث خادمية لبقية الدوال المذكورة.

---

### H-7: إعادة تسجيل `window.addEventListener('resize')` وإعادة تخصيص GPU Canvas عند كل حركة مؤشر (`pointermove`)
- **المحور:** المحور 1 (Excessive Re-renders & GPU Memory Thrashing)
- **الملف ورقم السطر:** `src/features/measurement/components/StudioCanvas.jsx:49-82, 116-125`
- **الدليل المرصود:** `handlePointerMove` (سطر 119) يستدعي `setCursorPos({ px, mm })` على كل بكسل ← يُبطل `useCallback` للدالة `render` (التي تعتمد على `cursorPos.px` سطر 71) ← يُعيد تشغيل `useEffect([render])` (سطر 82) ← يُزيل ويعيد ربط `window.addEventListener('resize', updateSize)` ويُعيد تعيين `loupeC.width` و`loupeC.height` 60–120 مرة بالثانية!
- **الأثر على الأداء/الذاكرة:** تقطيع شديد (Jank) وإعادة تخصيص متكررة لذاكرة GPU للـ Canvas في كل حركة ماوس.
- **التوصية الجراحية (<= 220 سطراً):** فصل `useEffect` الخاص بـ `resize` ليعمل مرة واحدة (`[]`) ويفحص تغير الأبعاد قبل تعديل `width/height`، والاحتفاظ بموضع المؤشر في `useRef` مع `requestAnimationFrame` للرسم.

---

### H-8: مصفوفة بديلة غير مستقرة `[]` في اعتماديات `useEffect` تُعيد تشغيله في كل Render وتُفسد إدخال المستخدم
- **المحور:** المحور 1 (Unstable Dependencies & Cascading State Updates)
- **الملف ورقم السطر:** `src/features/orders/components/OrderFormModal.jsx:21, 52-68, 70-77`
- **الدليل المرصود:** `const availableChildren = selectedCustomer?.measurements || [];` تنشئ مصفوفة `[]` جديدة في كل Render عند عدم وجود قياسات، ومُدرجة في اعتماديات `useEffect` (سطر 68 و77) الذي يستدعي `setTotal(...)`.
- **الأثر على الأداء/الذاكرة:** إعادة تنفيذ التأثيرين على كل ضغطة مفتاح وإعادة كتابة حقل الإجمالي (Total) فوق تعديل المستخدم.
- **التوصية الجراحية (<= 220 سطراً):** تغليف `availableChildren` بـ `useMemo(() => selectedCustomer?.measurements || EMPTY_ARR, [selectedCustomer?.measurements])` باستخدام ثابت `const EMPTY_ARR = [];` خارج المكوّن.

---

### H-9: بحث غير مخمّد (Un-debounced Fetch) على كل ضغطة مفتاح في نافذة سجل التدقيق
- **المحور:** المحور 2 (Fetch Storms)
- **الملف ورقم السطر:** `src/features/settings/components/AuditLogsModal.jsx:18-20, 47-50`
- **الدليل المرصود:** استدعاء `fetchAuditLogs(auditFilter)` داخل `useEffect` يعتمد مباشرة على `auditFilter` المرتبط بحقل البحث دون Debounce أو `AbortController`.
- **الأثر على الأداء/الذاكرة:** كتابة كلمة من 10 أحرف تطلق 10 استعلامات `audit_logs` متلاحقة مع احتمال عرض نتائج استعلام أقدم فوق الأحدث.
- **التوصية الجراحية (<= 220 سطراً):** إضافة `setTimeout(..., 300)` مع `clearTimeout` و`AbortController` داخل الـ `useEffect`.

---

### H-10: غياب `AbortController` وحارس `isMounted` في الـ Hooks الرئيسية (تسرب تحديثات وسباق حالة)
- **المحور:** المحور 1 (Memory Leaks & Uncancelled Async Fetches)
- **الملف ورقم السطر:**
  - `src/features/marketing/hooks/useMarketingData.js:36-100` (19 طلباً متزامناً بلا إلغاء)
  - `src/components/app/useAppData.js:97-105` (`fetchBackground` بلا إلغاء)
  - `src/features/inventory/hooks/useInventoryData.js:35-77`
  - `src/features/factory/hooks/useFactoryData.js:47-82, 115-125, 158-162`
  - (إضافة إلى `useHRData.js:28-53`, `useVouchersData.js:97-136`, `useAccountActions.js:13-33`, `useExpensesData.js:13-36`, `useReportsData.js:70` حيث `.finally(() => setIsGLLoading(false))` غير محمي بـ `active`, `POS.jsx:47-62`, `POSExchangeModal.jsx:25-37`, `usePurchasesData.js:12-28`, `useFeedbackData.js:35-68`, `useQualityStationData.js:98-115`, `IntegrityRadarTab.jsx:13-43`).
- **الدليل المرصود:** فقط `useJournalData.js` يستخدم `AbortController`؛ بقية الـ Hooks تطلق `fetch` داخل `useEffect` دون إشارة `signal` أو فحص `isMounted`.
- **الأثر على الأداء/الذاكرة:** استمرار تنزيل ومعالجة استجابات ضخمة بعد مغادرة التبويب، وتحديث الحالة ببيانات قديمة (Stale Data Overwrite) عند التنقل السريع أو تغيير الفلاتر.
- **التوصية الجراحية (<= 220 سطراً):** تمرير `const controller = new AbortController()` إلى `fetch(url, { signal: controller.signal })` واستدعاء `controller.abort()` في دالة التنظيف (`return () => controller.abort()`), مع تجاهل `AbortError` في `catch`.

---

## 🟡 الملاحظات متوسطة الخطورة (MEDIUM)

### M-1: خادم `ThreadingTCPServer` بلا حد أقصى للخيوط و3 خيوط `daemon=True` غير مقيدة عند الكتابة
- **المحور:** المحور 4 (Background Threads & Concurrency)
- **الملف ورقم السطر:**
  - `unified_server.py:186-197` (`socketserver.ThreadingTCPServer` + حلقة `while True` لا نهائية)
  - `domains/auth/db_init.py:90-105` (`sync_users_to_gas_async` يُستدعى من `routes/auth_bp.py:142, 172`)
  - `domains/customers/routes.py:124-129` (`_sync_cust_pg`)
  - `domains/quality/db_init.py:35-47` (`sync_quality_to_gas_async`)
- **الدليل المرصود:** إنشاء خيط OS جديد لكل طلب كتابة دون Queue أو Lock أو حد أقصى.
- **الأثر على الأداء/الذاكرة:** تضارب (Race Conditions) عند التعديلات المتتالية السريعة، وضياع أخطاء المزامنة بصمت (تُطبع في `stdout` فقط)، واستهلاك متزايد للخيوط واتصالات PG.
- **التوصية الجراحية (<= 220 سطراً):** استخدام `concurrent.futures.ThreadPoolExecutor(max_workers=2)` مشترك في وحدة خدمية صغيرة (`services/bg_worker.py`) بدلاً من إنشاء `threading.Thread` مباشر في كل طلب.

---

### M-2: حلقة `while True` بلا حد أقصى للتكرار في توليد التسلسل (SQLite)
- **المحور:** المحور 3 (Unbounded Loops / Recursion Check)
- **الملف ورقم السطر:** `domains/system/relational_db.py:39-47` (`get_next_sequence_id`)
- **الدليل المرصود:** `while True:` تزيد `next_num += 1` وتنفذ `SELECT id FROM {entity} WHERE id=?` حتى تجد رقماً فارغاً، بلا سقف تكرار (`MAX_ATTEMPTS`) ومع دمج اسم الجدول نصياً.
- **الأثر على الأداء/الذاكرة:** في حال تأخر العداد `number_sequences.current_number` بآلاف الأرقام، ينفّذ آلاف استعلامات SQLite المتسلسلة داخل طلب HTTP واحد.
- **التوصية الجراحية (<= 220 سطراً):** استبدال الحلقة باستعلام واحد `SELECT MAX(...)` أو فرض حد أقصى للتكرار (`for _ in range(1000)`) مع قائمة بيضاء (`ALLOWLIST`) لأسماء الجداول.

---

### M-3: مراقب `MutationObserver` دائم على مستوى المستند بالكامل (`document.documentElement`)
- **المحور:** المحور 1 (Memory & CPU Overhead)
- **الملف ورقم السطر:** `index.html:143-164`
- **الدليل المرصود:** `observer.observe(document.documentElement, { childList: true, subtree: true })` يُشغّل `node.querySelectorAll('input[type="date"], ...')` لكل عقدة تُضاف في الصفحة دون إيقاف أبداً.
- **الأثر على الأداء/الذاكرة:** استهلاك CPU متكرر عند كل تصيير جدول أو تبديل تبويب (يتضاعف 26 مرة بسبب مشكلة `AppRouter` C-3).
- **التوصية الجراحية (<= 220 سطراً):** استبدال المراقب العام بتفويض أحداث (`document.addEventListener('focusin', ...)` على حقول التاريخ فقط) لإزالة `MutationObserver` بالكامل.

---

### M-4: تسرب مؤقت `setTimeout` غير منظّف في `showToast` الجذري وازدواجية المؤقت في `Toast.jsx`
- **المحور:** المحور 1 (Uncleaned Timers)
- **الملف ورقم السطر:** `src/App.jsx:41-45` و `src/components/Toast.jsx:5`
- **الدليل المرصود:** `setTimeout(() => setToast(null), 3500)` لا يحفظ معرّف المؤقت ولا يلغيه عند استدعاء إشعار جديد أو تفكيك المكوّن، بينما `Toast.jsx:5` يشغّل مؤقتاً ثانياً بـ 4000ms.
- **الأثر على الأداء/الذاكرة:** اختفاء الإشعارات المتتالية مبكراً وبقاء مؤقتات معلّقة بعد التفكيك.
- **التوصية الجراحية (<= 220 سطراً):** حفظ معرّف المؤقت في `toastTimerRef` وإلغاؤه قبل إنشاء مؤقت جديد وفي `useEffect` cleanup داخل `App.jsx`.

---

### M-5: استدعاء `setSyncInfo` دون فحص `isMounted` داخل مؤقت الفحص الدوري (كل 12 ثانية)
- **المحور:** المحور 1 (Polling & Unmounted State Update)
- **الملف ورقم السطر:** `src/components/Header.jsx:88-103, 133-143`
- **الدليل المرصود:** مؤقتا `setInterval(checkSync, 12000)` و`setInterval(fetchWatchdog, 30000)` يُنظفان عند التفكيك، لكن `checkSync` (خارج الـ `useEffect`) يستدعي `setSyncInfo` في السطر 94 دون فحص ما إذا كان المكوّن ما زال مركّباً.
- **الأثر على الأداء/الذاكرة:** تسرب تحديث حالة بعد تسجيل الخروج/التفكيك عند تأخر استجابة الشبكة.
- **التوصية الجراحية (<= 220 سطراً):** استخدام `isMountedRef` داخل `Header.jsx` والتحقق منه قبل `setSyncInfo`.

---

### M-6: مصفوفة `bespokeList` غير محفوظة بـ `useMemo` وإعادة جلب متتالية في `useFactoryData`
- **المحور:** المحور 1 (Excessive Re-renders / Redundant Fetches)
- **الملف ورقم السطر:**
  - `src/features/factory/components/JobOrderFormFields.jsx:44-50` (`bespokeList` تُعاد حسابها وتُوضع في `useEffect` deps).
  - `src/features/factory/hooks/useFactoryData.js:158-162` (دمج 3 مصفوفات `[customers, products, employees]` في `useEffect` واحد يعيد طلب أي قائمة فارغة كلما تغيرت قائمة أخرى).
- **الأثر على الأداء/الذاكرة:** تشغيل متكرر للـ `useEffect` وطلبات مكررة عند كون إحدى القوائم فارغة.
- **التوصية الجراحية (<= 220 سطراً):** تغليف `bespokeList` بـ `useMemo`، وفصل كل استدعاء جلب احتياطي في `useFactoryData.js` أو تقييده بـ `useRef` (مرة واحدة فقط).

---

### M-7: استعلامات N+1 محدودة داخل حفظ مقاسات العميل (Multi-Dress Order)
- **المحور:** المحور 3 (N+1 Queries)
- **الملف ورقم السطر:** `services/pg/pg_customer_financials.py:145-195`
- **الدليل المرصود:** داخل `for idx_m, m_item in enumerate(meas_list):` يتم تنفيذ 5 عمليات SQL منفصلة لكل مقاس (`SELECT measurements`, `UPDATE measurements`, `INSERT production_orders`, `INSERT order_items`, `create_order_stages`).
- **الأثر على الأداء/الذاكرة:** متوسط — يضاعف عدد الرحلات إلى Supabase PostgreSQL مع الطلبات متعددة الفساتين.
- **التوصية الجراحية (<= 220 سطراً):** استخدام `psycopg2.extras.execute_values` لإدراج `production_orders` و`order_items` دفعة واحدة.

---

## 🟢 الملاحظات منخفضة الخطورة (LOW)

### L-1: حلقة `localStorage.removeItem` متزامنة تُنفّذ في كل Render لجذر التطبيق
- **المحور:** المحور 1 (Render-Body Side Effects)
- **الملف ورقم السطر:** `src/components/app/useAppData.js:18-20`
- **الدليل المرصود:** `['lp_cache_vouchers', ...].forEach(k => localStorage.removeItem(k))` مكتوبة مباشرة في جسم الـ Hook وليس داخل `useEffect(..., [])`.
- **الأثر على الأداء/الذاكرة:** 6 عمليات I/O متزامنة على `localStorage` مع كل إعادة تصيير لـ `App` (مئات المرات في الجلسة).
- **التوصية الجراحية (<= 220 سطراً):** نقل الحلقة إلى `useEffect(() => { ... }, [])` لتعمل مرة واحدة فقط عند الإقلاع.

---

### L-2: استخدام `commit=True` (الافتراضي) لاستعلامات `SELECT` قراءة فقط
- **المحور:** المحور 3 (PostgreSQL Roundtrip Overhead)
- **الملف ورقم السطر:** `services/pg/pg_customers.py:12` و `services/pg/pg_audit.py:83, 199`
- **الدليل المرصود:** استخدام `with get_db_cursor() as cur:` (حيث `commit=True` افتراضياً) لاستعلامات قراءة بحتة.
- **الأثر على الأداء/الذاكرة:** إرسال أمر `COMMIT` إضافي عبر الشبكة إلى Supabase في كل طلب قراءة.
- **التوصية الجراحية (<= 220 سطراً):** تمرير `get_db_cursor(commit=False)` صراحةً لاستعلامات القراءة فقط.

---

### L-3: مؤقتات `setTimeout(..., 60)` غير منظفة (ومخاطرة Stale Closure)
- **المحور:** المحور 1 (Timers Cleanup)
- **الملف ورقم السطر:** `src/features/Factory.jsx:32`، `src/features/measurement/MeasurementStudio.jsx:68`، `src/features/customers/components/CustomerHistoryModal.jsx:145`
- **الدليل المرصود:** استدعاء `setTimeout` دون إلغاء عند التفكيك، وفي `CustomerHistoryModal.jsx:145` يقرأ `handleSave(false)` قيمة `deposit` قديمة (Stale Closure).
- **الأثر على الأداء/الذاكرة:** طفيف على الذاكرة، مع خطر منطقي عند إغلاق النافذة سريعاً.
- **التوصية الجراحية (<= 220 سطراً):** حفظ المؤقت في `useRef` وتنظيفه في `useEffect` cleanup، وتمرير القيمة الجديدة مباشرةً كوسيط لـ `handleSave`.

---

## ✅ نقاط الفحص السليمة (Verified Clean Checks)

1. **العودية غير المحمية (Unprotected Recursion):** ✅ لم تُرصد أي دالة عودية (Direct/Indirect Recursion أو `WITH RECURSIVE`) غير محمية في الباك إند (`services/pg/pg_delivery_cogs.py:11-25` يجمع شجرة الحسابات تكرارياً مستوىً بمستوى).
2. **معاملات قاعدة البيانات المعلّقة (`Idle in Transaction`):** ✅ `0` جلسات معلّقة في فحص `pg_stat_activity` الحي.
3. **ازدواجية الخادم على المنفذ 5000:** ✅ نسخة واحدة فقط (`PID 11168`, `app.py`, `debug=False`, 2 Threads, ~40 MB RAM).
4. **استخدام `LIMIT` السليم في بعض المسارات:** ✅ `services/pg/pg_vouchers_query.py:11,114` و`services/pg/pg_audit.py:190,202` تطبق `LIMIT` بشكل صحيح، و`useJournalData.js` يطبق `AbortController` بنجاح.
