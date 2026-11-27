# تقرير كفاءة استهلاك الإنترنت ومناعة الشبكات البطيئة — Little Princesses ERP

**التاريخ:** 2026-11-27  
**النطاق:** تقليص استهلاك الإنترنت، تسريع الواجهة على الشبكات البطيئة/المتقطعة، وحماية المعاملات المالية دون أي تعديل على بيانات قاعدة البيانات أو كسر عقود الواجهة (`window.*` / JSON).

---

## 1. مقارنة «قبل وبعد» لاستهلاك الإنترنت والأداء

### أ. الطلبات الخارجية (External CDNs & Fonts)
| القالب / المكون | قبل التعديل | بعد التعديل (المحلي تحت `static/vendor/`) | استهلاك CDN عند الفتح/التحديث |
|---|---|---|---|
| `index.html` | Google Fonts (`Cairo/Inter/Tajawal` + `@import`), fallback CDN لـ Tailwind/React/ReactDOM/Babel, `prop-types`, `recharts`, `opencv.js` (من `docs.opencv.org`) | جميع الخطوط (28 ملف `.woff2` + `fonts.css`) وملفات `tailwindcss.js`, `react`, `react-dom`, `babel`, `prop-types`, `Recharts` محلية في `/static/vendor/`؛ وإزالة تحميل `opencv.js` لكون المرحلة الثانية معطّلة والبديل JS متوفر | **0 KB** (0 طلبات خارجية) |
| `track.html` | CDN لـ Tailwind وGoogle Fonts وFontAwesome 6.4.0 وSweetAlert2 وCanvas Confetti | `/static/vendor/` (بما في ذلك `fontawesome/css/all.min.css` وملفات `webfonts/*`) | **0 KB** (0 طلبات خارجية) |
| `dress_card.html`, `job_card.html`, `voucher.html`, `PrintModal.jsx` | Tailwind CDN / Google Fonts CDN | `/static/vendor/tailwindcss.js` و`/static/vendor/fonts/fonts.css` | **0 KB** (0 طلبات خارجية) |

> **ترويسة التخزين المؤقت (`Cache-Control` في `app.py`):** تُخدم ملفات `/static/vendor/*` بترويسة `public, max-age=31536000, immutable`، بينما تحافظ ملفات التطبيق تحت `/src/*` على كاسر الكاش (`?v=640` و`public, max-age=86400`) ولا تُخزّن استجابات `/api/` أو HTML (`no-cache, no-store, must-revalidate`).

---

### ب. حجم الاستجابات الفعلي بعد ضغط `Gzip` (`http_compression.py`) وتقليص الأعمدة الثقيلة
تم قياس الأحجام الفعلية عبر `app.test_client()` مع إرسال `Accept-Encoding: gzip` ودون أي تعديل على قاعدة البيانات:

| المسار (Endpoint / Asset) | الحجم قبل Gzip (بايت) | الحجم بعد Gzip (بايت) | نسبة الوفر |
|---|---:|---:|---:|
| `GET /` (`index.html`) | 59,468 B | 10,247 B | **82.8%** |
| `GET /static/vendor/fonts/fonts.css` | 33,979 B | 1,684 B | **95.0%** |
| `GET /static/vendor/tailwindcss.js` | 412,745 B | 125,330 B | **69.6%** |
| `GET /static/vendor/Recharts.js` | 498,814 B | 124,210 B | **75.1%** |
| `GET /static/vendor/react.production.min.js` | 10,737 B | 4,258 B | **60.3%** |
| `GET /api/accounts/list` | 34,701 B | 3,512 B | **89.9%** |
| `GET /api/customers` | 13,314 B | 1,577 B | **88.2%** |
| `GET /api/orders` | 10,321 B | 1,686 B | **83.7%** |
| `GET /api/purchases` | 6,918 B | 1,252 B | **81.9%** |
| `GET /api/products` | 5,909 B | 1,268 B | **78.5%** |
| `GET /api/expenses` | 3,180 B | 691 B | **78.3%** |
| `GET /api/quality/inspections` | 2,178 B | 579 B | **73.4%** |

**تحسينات أعمدة القوائم (`SELECT`) نحو Supabase:**
- `pg_expenses.py` (`get_expenses`): استبعاد روابط `data:` ومرفقات Base64 التي تتجاوز 500 حرف في القائمة مع إرجاع مؤشر `has_attachment`.
- `pg_purchases.py` (`get_purchases`): استبدال `SELECT p.*` بقائمة أعمدة صريحة تمنع سحب مرفقات Base64 الضخمة (`invoice_attachment`, `receipt_attachment`) في الجدول العام وتقييد استعلام `purchase_items` بمعرفات الفواتير المعروضة فقط (مع الإبقاء على `get_purchase_by_id` كاملاً للتفاصيل).
- `pg_quality_inspections.py` (`get_quality_inspections`): استبدال `SELECT *` بأعمدة صريحة واستبعاد مرفقات Base64 `> 500` حرف.
- `pg_products_query.py` (`get_products`): منع سحب `image_url` عندما يكون `data:` أكبر من 2000 حرف (مع استبعاد أعمدة `image` و`image_data` الثقيلة من `SELECT`).

---

### ج. عدد رحلات الخادم وقاعدة البيانات (Supabase Roundtrips) لكل شاشة وحدث
| السيناريو | قبل التعديل | بعد التعديل | الآلية |
|---|---|---|---|
| **تحميل لوحة التحكم (`Dashboard`) أول مرة** | 7 طلبات فورية في `useAppData.js` + طلب مكرر مزدوج لـ `/api/atelier/watchdog` (`Header.jsx` + `useDashboardActions.js`) | **4** طلبات أساسية (`accounts/list`, `sales/orders`, `factory`, `journal`) + طلب **1** مشترك لـ `watchdog` عبر `lp:watchdogData` ومانع التكرار | تحميل كسول (Lazy) في `useAppData.js` لـ `customers`, `vouchers`, `expenses`, `products`, `inventory`, `purchases`, `hr`, `feedback` عند فتح التبويب فقط |
| **التبديل إلى التبويبات (`Vouchers`, `Expenses`, `Customers`, `Inventory`, `Orders`, `Purchases`)** | إعادة جلب ثانية غير مشروطة من خطاف كل تبويب + حلقات إعادة طلب عند فراغ القوائم + كاسر كاش `?_t=` على فتح المخزون | **0** طلبات إضافية مكررة عند فتح التبويب خلال نافذة التزامن (`4.5s` GET Deduplication) + تقييد الجلب التلقائي لمرة واحدة في `useCustomersData`, `useOrdersData`, `usePurchasesData` | `src/services/api/networkResilience.js` + إزالة `?_t=` التلقائي في `useInventoryData.js` |
| **المؤقتات الخلفية (`Header.jsx`)** | `/api/sync/status` كل 12 ثانية + `/api/atelier/watchdog` كل 30 ثانية حتى في الخلفية | `/api/sync/status` كل **60 ثانية** + `/api/atelier/watchdog` كل **120 ثانية** مع التوقف التلقائي عند `document.hidden` | تقليص استهلاك الخلفية بأكثر من 75% |
| **البيانات المرجعية شبه الثابتة (`ref_cache.py`)** | استعلام Supabase مباشر في كل طلب | كاش بالذاكرة (TTL 180–300 ثانية) مع **إبطال فوري عند أي كتابة** لـ: `company_profile/system_settings`, `currencies`, `warehouses`, `cost_centers`, `job_roles`, `quality_checkpoints`, `quality_settings` | قياس فعلي لـ `system_settings`: من **1557.5 ms** إلى **0.1148 ms** عند الإصابة (`0` استعلام DB)، و**1.71 ms** إجمالاً للـ 6 مجموعات الأخرى |

---

## 2. الشاشات والأزرار والعمليات المؤمنة ضد النقر المكرر وانقطاع الشبكة

### أ. طبقة الشبكة الأمامية (`networkResilience.js` + `apiCore.js` + `App.jsx`)
- مهلة زمنية `AbortController` تلقائية (`25s` لطلبات `GET`، `45s` لعمليات الكتابة `POST/PUT/PATCH/DELETE`).
- عند الانقطاع (`!navigator.onLine` / `NetworkError`) أو انتهاء المهلة (`AbortError`) يتم إطلاق الحدث `lp:networkError` وتوحيد رسالة `window.formatApiError(err)`:
  - *«تعذّر الاتصال بالخادم حالياً، بياناتك ما زالت محفوظة في النموذج — يرجى إعادة المحاولة»*
  - *«انتهت مهلة الاتصال بالخادم، بياناتك ما زالت محفوظة في النموذج — يرجى إعادة المحاولة»*
- قفل `_inFlightLocks` للطلبات المتطابقة المتزامنة في `apiCore.js` يرجع حالة `409` فورية دون إرسال طلب ثانٍ.

### ب. حارس عدم التكرار الخلفي (`services/security/idempotency.py`)
- تحديث `@idempotent_op(...)` ليدعم **حماية مزدوجة**: سجل PostgreSQL الدائم (`public.idempotency_keys`) عند وجود `Idempotency-Key` + قفل وكاش بالذاكرة قصير المدى (`8` ثوانٍ) يمنع التنفيذ المتزامن أو إعادة الإرسال الفورية لنفس الحمولة حتى عند غياب الترويسة.
- تغطية مسارات الكتابة المالية والمخزنية والإنتاجية في: `accounting_bp.py` (الحسابات، القيود، السندات، المصروفات)، `orders_bp.py` (إنشاء/تعديل/تسليم/عكس/مسح الباركود)، `inventory_bp.py` و`warehouses_bp.py` (المخزون، التعديل، الصرف، المناقلات، المشتريات)، `hr_bp.py` (الرواتب، الصرف الفردي والمجمع، السلف، تصفية القطع)، `atelier_bp.py` (أوامر التصنيع، الإيداع المخزني، اعتماد/رفض بطاقة العمل)، و`ready_products_bp.py`.

### ج. الأزرار والنماذج التي تم تأمينها في الواجهة
| الشاشة / الملف | التحسين المنفّذ (منع النقر المكرر + حفظ بيانات النموذج عند الفشل) |
|---|---|
| **القيود اليومية** (`useJournalActions.js`, `JournalEntriesTab.jsx`, `journal.jsx`) | إضافة حالة `isSubmitting` وتعطيل زر الترحيل أثناء الإرسال + `await` لسطور القيد المركب + إلغاء الوهم المحلي (`تم الحفظ محلياً`) وإبقاء حقول النموذج محفوظة عند الفشل |
| **المصروفات** (`useExpenseActions.js`, `ExpensesTable.jsx`, `expenses.jsx`) | إزالة مسح `formData` من `finally` وجعله مقتصراً على النجاح المؤكد، إبقاء النافذة مفتوحة عند الفشل، وإضافة `approvingId` لتعطيل زر «اعتماد» أثناء التنفيذ |
| **الطلبات ونقاط البيع** (`useOrderActions.js`) | التحقق من استجابة الخادم قبل إغلاق/تفريغ النموذج وإلغاء الإخفاء المحلي عند انقطاع الاتصال مع الإبقاء على بيانات الطلب بالنافذة |
| **السندات المالية** (`useVoucherOperations.js`, `PaymentVoucherModal.jsx`) | منع بلع أخطاء الشبكة عند إنشاء/تعديل السند كي لا تُغلق النافذة عند الفشل + قفل محلي `localSubmitting` في `PaymentVoucherModal` |
| **دليل الحسابات** (`AccountModal.jsx`) | إضافة قفل `submitting` لتعطيل زر الحفظ أثناء الترحيل ومنع التقديم المزدوج |
| **الموارد البشرية والرواتب** (`PayrollView.jsx`, `useHRActions.js`) | إضافة حالتي `isGenerating` و`payingEmpId` لتعطيل أزرار «احتساب وإصدار المسير» و«صرف الراتب» أثناء الإرسال + الحفاظ على بيانات الموظف مفتوحة عند الفشل |
| **المشغل والفحص الفني** (`WorkerAssignModal.jsx`, `useFactoryOrderActions.js`, `QualityAssurance.jsx`) | إرجاع `true/false` من `handleSubmit` لعدم إغلاق نموذج التشغيل عند فشل التحقق أو الشبكة + إضافة `submittingQc` وتأكيد رد الخادم قبل إغلاق نافذة فحص الجودة |
| **العملاء وبطاقة التشغيل** (`CustomerHistoryModal.jsx`, `job_card.html`) | تعطيل زر «تسجيل سند قبض» أثناء الحفظ + إعادة تفعيل زر إتمام المرحلة في `job_card.html` داخل `finally` مع رسالة عربية تحفظ الحالة |

---

## 3. مناعة تجمع اتصالات قاعدة البيانات السحابية (`db_client.py` + `pool_resilience.py`)

- ضبط إعدادات TCP Keepalive في `db_client.py`:
  - `keepalives=1`, `keepalives_idle=20`, `keepalives_interval=5`, `keepalives_count=4`, `connect_timeout=min(DB_TIMEOUT, 15)` وتقليل نافذة حظر إعادة المحاولة إلى `0.8s`.
- إنشاء وحدة `services/pg/pool_resilience.py`:
  - فحص `SELECT 1` لكل اتصال قبل تسليمه عبر `acquire_healthy_connection` (حتى 3 محاولات)، مع التخلص الفوري من أي اتصال ميت واستدعاء `reset_pool()` لإعادة بناء التجمع بسلاسة دون إعادة تشغيل السيرفر.
  - إعادة محاولة تلقائية واحدة للاستعلامات القرائية البحتة (`SELECT` / `WITH` بدون `commit`) في `execute_query` عند حدوث `OperationalError` / `InterfaceError`.
- **نتيجة اختبار محاكاة الانقطاع (`verify_resilience.py`):** عند محاكاة فشل الاتصالات القائمة بـ `psycopg2.OperationalError("connection already closed")`, قام المحرك بتجاهل الاتصالات التالفة وإعادة بناء التجمع (`pool_resets=1`) وإرجاع اتصال حي (`conn.alive=True`) دون أي خطأ `HTTP 500`.

---

## 4. نتائج التحقق النهائي وسلامة البيانات

1. **سلامة قاعدة البيانات (Zero DB Mutation):**
   - تنفيذ `tests/read_only_integrity_audit.py`: ميزان المراجعة متزن 100% (`1,808,079.14 YER` مدين = `1,808,079.14 YER` دائن، صافي الدخل `0.00 YER`).
   - التحقق القرائي قبل وبعد كافة الاختبارات: لم يتم إدراج أو تعديل أو حذف أي سجل، وظلت قيم `number_sequences` (`max_seq=1003, seq_cnt=29`) وعدادات الجداول مطابقة تماماً للحالة المرصودة قبل بدء التنفيذ (`orders=5`, `payments=28`, `expenses=2`, `journal_entries=57`, `purchases=3`, `inventory_transactions=27`, `production_orders=3`, `customers=3`, `products=2` — *ملاحظة: هذه السجلات كانت موجودة مسبقاً في قاعدة البيانات قبل بدء الجلسة ولم يطرأ عليها أي تغيير*).
2. **التحقق البرمجي والأمني والأسطر:**
   - فحص `558` ملفاً مصدرياً في المشروع: جميع الملفات الجديدة والمعدلة التزمت بالحد الأقصى `<= 220` سطراً (الملف الوحيد المتجاوز في المستودع بالكامل هو `src/features/inventory/components/AddReadyProductModal.jsx` بعدد 222 سطراً ولم يتم تعديله).
   - فحص Node.js لـ `networkResilience.js` و`apiCore.js`: تأكيد دمج طلبات GET المتزامنة (`fetchCalls=1`), مسح كاش القراءة فور الكتابة, إرجاع `409` على النقر المكرر المتزامن, وعرض رسائل Timeout وOffline العربية بدقة.
3. **التحقق من الخادم والمتصفح الحي:**
   - جميع مسارات الواجهات البرمجية للأقسام الـ 16 (25 نقطة نهاية `GET`) استجابت بـ **`HTTP 200`** مع ضغط `gzip` (`verify_16_routes.py`).
   - فتح المتصفح الحقيقي على `http://127.0.0.1:5000/` و`track.html` و`dress_card.html`: تم تحميل ملفات الواجهة و`/static/vendor/*` بـ `HTTP 200` مع **0 طلبات CDN خارجية** و**0 أخطاء Console/Babel** في الشاشة الرئيسية وصفحة التتبع. *(ملاحظة: في المتصفح غير المسجّل حجبت نافذة تسجيل الدخول الضغط على أزرار الشريط الجانبي الـ 16 لذا تم التحقق من استجابات الأقسام الـ 16 عبر اختبار `test_client` بتوكن إداري في الذاكرة؛ كما رُصد في `dress_card.html` خطأ 404 مسبق غير مرتبط بالتعديلات لملف `dress_card.js` المستبعد من `SAFE_ROOT_FILES`).*
