# 🛡️ تقرير التدقيق الأمني الدفاعي — Little Princesses ERP
**الوضع:** تدقيق قراءة فقط (Read-Only Defensive AppSec Audit) — لم يتم تعديل أي كود أو تعطيل أي درع أو حذف أي بيانات.  
**تاريخ الفحص:** 2026-11-27  
**بيئة التشغيل المفحوصة:** محلية `http://127.0.0.1:5000` (Flask) + قاعدة بيانات PostgreSQL السحابية (Supabase) + SQLite محلي (`little_princesses.db`).

---

## 📊 ملخص تنفيذي (Executive Summary)

| مستوى الخطورة | العدد | أبرز المحاور المتأثرة |
| :--- | :---: | :--- |
| 🔴 **Critical (حرج)** | **7** | تسريب `.env` وقاعدة `little_princesses.db` عبر SPA Catch-All، تجاوز RBAC الكامل عبر `/api/gas`، رموز مصادقة غير موقعة + Fallback إلى `admin`، إدارة المستخدمين بدون صلاحيات، حقن SQL في `restore_backup_data`، تخزين كلمات المرور بنص صريح + Backdoor، كشف سياسة RLS العامة على `garment_measurements_studio` |
| 🟠 **High (مرتفع)** | **7** | ثغرات Zero-Trust المالي (الأسعار/الخصومات/أسعار الصرف/اعتماد المصروفات)، ثغرات RBAC على مسارات مالية وتشغيلية وتقارير (207 مساراً من أصل 305 بلا `@require_roles`)، IDOR في تتبع الطلبات وبطاقة الفستان والسندات، XSS في قوالب الطباعة، تعطيل قفل الفترة المالية في بعض العمليات وتجاوز Idempotency، مسح `audit_logs` في `clear_all_transactional_data` |
| 🟡 **Medium (متوسط)** | **6** | تسريب رسائل الأخطاء الداخلية (`detail: str(e)`) في `app.py` وعدة Blueprints، سياسة `CORS` المفتوحة مع `supports_credentials=True`، غياب Rate Limiting، فجوات التوثيق وتزوير الهوية في `audit_logs`، فحص Magic Bytes وحد `MAX_CONTENT_LENGTH` عند رفع الصور، غياب ترويسات الأمان (`X-Content-Type-Options`, `X-Frame-Options`, `CSP`) |
| 🔵 **Low (منخفض)** | **4** | استخدام `eval()` في `AppRouter.jsx`، حفظ النسخ الاحتياطية بمسار محلي ثابت أو داخل مجلد المشروع، تعداد المستخدمين (User Enumeration) في `/api/auth/login`، ترويسة `X-Powered-By` + وجود قواعد `.db` متعقبة في Git |

---

## ✅ جرد الدروع الأمنية القائمة والفعّالة (ما لا يحتاج إعادة بناء)

تم فحص الدروع الموجودة فعلياً في الكود وقاعدة البيانات PostgreSQL قبل تحديد الفجوات، وثبت أن الأساسات التالية مطبّقة وتعمل بكفاءة:

1. **الطبقة الأولى (PostgreSQL Layer 1 Armor — فُحصت مباشرة من القاعدة):**
   - **تفعيل RLS على 67 جدولاً** في مخطط `public` مع تقييد الوصول لدوري `postgres` و`service_role` (باستثناء جدول واحد به فجوة مفصّلة في `C-07`).
   - **درع توازن القيد المزدوج ومنع التلاعب (IFRS Immutability Triggers):**
     - `trg_defer_guard_journal_entries_parent` و`trg_defer_guard_journal_entry_balance` على `journal_entries` و`journal_entry_lines`.
     - `trg_guard_journal_entries_immutability` و`trg_guard_journal_lines_immutability` لمنع تعديل أو حذف القيود المرحلة.
     - `trg_guard_piece_rate_immutability` لحماية أجور القطع المسددة.
     - `trg_guard_customer_deletion` و`trg_guard_employee_deletion` لمنع الحذف المرجعي.
   - **قيود CHECK لمنع القيم السالبة (15 قيداً نشطاً):** `chk_inventory_quantity_non_negative`، `chk_warehouse_stock_quantity_non_negative`، `chk_journal_entries_amounts_non_negative`، `chk_payments_amounts_non_negative`، `chk_piece_rate_amount_non_negative`، وغيرها.
2. **الطبقة الثانية (Backend Security Layer — `services/security/`):**
   - `services/security/period_lock.py`: حارس قفل الفترات المالية `assert_period_open` مُستدعى في 19 موضعاً حرجاً (اليومية، السندات، المشتريات، POS، الرواتب، الجرد، التحويلات المخزنية، الإرجاع والاستبدال).
   - `services/security/error_translator.py`: مترجم أخطاء PostgreSQL والقيود إلى رسائل عربية واضحة وأكواد HTTP مناسبة (`403`, `409`, `422`, `423`).
   - `services/security/idempotency.py`: بنية منع التكرار `@idempotent_op` باستخدام جدول `public.idempotency_keys`.
   - **أقفال التزامن (`SELECT ... FOR UPDATE`):** مطبّقة في أكثر من 60 استعلاماً حرجاً (المخزون، المتغيرات، السندات، الرواتب، السلف، أوامر الإنتاج).
   - **الاستعلامات المعلمية (Parameterized Queries):** الغالبية العظمى من استعلامات `services/pg/*.py` تستخدم `%s` بشكل سليم.
   - **حماية المسار في النسخ الاحتياطي ورفع الصور:** استخدام `os.path.basename()` في `services/pg/pg_backup_service.py` (أسطر 71، 90) و`secure_filename` + قائمة امتدادات محددة + أسماء UUID عشوائية في `routes/ready_products_bp.py` (أسطر 30–43).
   - **سلامة `barcodeSvg.js`:** المولّد `generateCode128SvgMarkup` في `src/features/orders/utils/barcodeSvg.js:36-48` يُخرج عناصر `<rect>` رقمية فقط، مما يجعل `dangerouslySetInnerHTML` في `HangtagPrintModal.jsx:102` آمناً من الحقن (بعكس نافذة الطباعة `document.write` الموضحة في `H-04`).

---

## 🔴 الثغرات الحرجة (Critical)

### [C-01] تسريب كامل لملف `.env` وقاعدة البيانات `little_princesses.db` والكود المصدري عبر المسار العام للـ SPA
- **الملف ورقم السطر:** `app.py:62-66`
- **الدليل الفعلي (تم التحقق منه عبر Flask Test Client):**
  ```python
  @flask_app.route('/', defaults={'path': ''}, methods=['GET'])
  @flask_app.route('/<path:path>', methods=['GET'])
  def serve_spa(path):
      if path and os.path.exists(os.path.join(root_dir, path)):
          return send_from_directory(root_dir, path)
  ```
  نتائج الفحص الفعلي (قراءة فقط):
  - `GET /.env` → **HTTP 200** (`1,340 bytes` — يحتوي `DATABASE_URL` وكلمة مرور Supabase PostgreSQL!)
  - `GET /little_princesses.db` → **HTTP 200** (`7,450,624 bytes` — يحتوي جدول `users` مع 10 كلمات مرور بنص صريح!)
  - `GET /.git/config` → **HTTP 200** (`480 bytes`)
  - `GET /app.py` → **HTTP 200** (`6,134 bytes`)، `GET /error.log` → **HTTP 200** (`742 bytes`)، `GET /schema.sql` → **HTTP 200** (`13,340 bytes`).
  - بالإضافة إلى ذلك، عند تشغيل الخادم على `host='0.0.0.0'` (`app.py:148`) يصبح متاحاً لأي جهاز على الشبكة المحلية (LAN).
- **الأثر:** اختراق فوري وكامل للنظام وقاعدة البيانات السحابية والمحلية بدون أي مصادقة.
- **التوصية الدفاعية:** حصر تقديم الملفات الثابتة في قائمة بيضاء صريحة (`index.html`, `track.html`, `logo.svg`, ومجلدات `src/`, `static/` فقط) وحظر أي ملف يبدأ بنقطة (`.env`, `.git`) أو ينتهي بـ `.py`, `.db`, `.sql`, `.log`, `.json`, `.md`. وربط الخادم محلياً بـ `127.0.0.1` بدلاً من `0.0.0.0` ما لم يُطلب غير ذلك.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [C-02] رموز مصادقة غير موقّعة وقابلة للتزوير + الرجوع التلقائي لصلاحية المدير العام (`admin`)
- **الملف ورقم السطر:**
  - `routes/auth_bp.py:46` (توليد الرمز: `token = f"erp_{user_dict['username']}_{user_dict['id']}_{user_dict['role']}"`)
  - `services/security/rbac.py:58-72, 94-113` (قبول الرمز غير الموقّع وترويسات `X-User-Role`/`X-User-Id` والرجوع الافتراضي إلى `admin`)
  - `routes/auth_bp.py:56-83` (`/api/auth/me` يرجع أول مستخدم نشط أو `admin` بدون رمز)
- **التفاصيل:**
  1. أي مستخدم يمكنه إرسال `Authorization: Bearer erp_x_0_admin` أو `X-User-Role: admin` أو **حذف ترويسة المصادقة تماماً** فيحصل فوراً على صلاحية `ROLE_ADMIN` (`USR-000001`).
  2. عند العثور على المستخدم في `public.users` (`rbac.py:79-89`) لا يتم التحقق من `is_active`، أي أن الحسابات المعطّلة تظل قادرة على تنفيذ العمليات!
  3. لا يوجد انتهاء صلاحية (Expiration) أو توقيع تشفيري (HMAC/JWT) أو إبطال جلسة (Logout/Revocation).
- **الأثر:** إبطال كامل لنظام الصلاحيات (Authentication & Authorization Bypass) على جميع المسارات المحمية بـ `@require_roles`.
- **التوصية الدفاعية:**
  - استبدال الرمز النصي برمز موقّع (`itsdangerous` أو JWT بتوقيع `HS256` ومفتاح `SECRET_KEY` من `.env`) أو Flask Session Cookie بـ `HttpOnly` و`SameSite=Lax` (ومع `Secure=True` في الإنتاج).
  - إزالة `Local Dev Fallback` إلى `admin` في `rbac.py:105-113` وإزالة الثقة بترويسات `X-User-Role` / `X-User-Id`.
  - التحقق من `is_active = TRUE` وإرجاع `401 Unauthorized` عند غياب أو تلف الرمز.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)** (مع تفعيل `Cookie Secure` وHTTPS في الإنتاج فقط).

---

### [C-03] بوابة `/api/gas` و `/save` تتجاوز بالكامل جميع دروع `@require_roles` و`@idempotent_op`
- **الملف ورقم السطر:** `routes/system_bp.py:192-204` و `services/pg/action_map.py:16-198`
- **التفاصيل:** المساران `GET/POST /api/gas` و`POST /save` غير محميين بأي صلاحيات، ويمرران معامل `action` مباشرة إلى `ACTION_HANDLERS` الذي يتيح استدعاء إجراءات سيادية وخطرة مباشرة مثل:
  - `clearAllData` / `wipeAllData` (`action_map.py:164-166`) ← مسح قاعدة البيانات بالكامل (`TRUNCATE TABLE ... CASCADE`)!
  - `restoreBackup` / `createSnapshot` (`action_map.py:178-181`)
  - `resetCleanChartOfAccounts`, `deleteAccount`, `deleteOrder`, `deletePurchase`, `purgePurchasesSheetData`, `postPayroll`, `saveUser`, `saveSettings`, `updateExchangeRate`.
- **الأثر:** أي مستخدم (حتى بدون تسجيل دخول أو بدور `tailor` / `data_entry`) يمكنه مسح النظام بالكامل أو ترحيل رواتب أو إنشاء مستخدمين أو استعادة بيانات عبر طلب واحد إلى `/api/gas`.
- **التوصية الدفاعية:** إما إيقاف `/api/gas` و`/save` نهائياً بعد اكتمال الانتقال للـ Blueprints، أو فرض جدول صلاحيات صريح (Per-Action RBAC Whitelist) وحذف الإجراءات السيادية/التدميرية (`clearAllData`, `restoreBackup`, `saveUser`, `saveSettings`, إلخ) من `ACTION_HANDLERS`.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [C-04] مسارات إدارة المستخدمين (`/api/users/*`) بلا أي حماية صلاحيات (Privilege Escalation)
- **الملف ورقم السطر:** `routes/auth_bp.py:86-173`
- **التفاصيل:** جميع مسارات المستخدمين تفتقر إلى `@require_roles(ROLE_ADMIN)`:
  - `GET /api/users` و`/api/users/list` (`auth_bp.py:86-105`)
  - `POST /api/users` و`/api/users/save` (`auth_bp.py:108-148`) — تتيح لأي شخص إنشاء مستخدم بدور `admin` أو تغيير كلمة مرور `admin` الحالي عبر تمرير `id`!
  - `POST /api/users/delete` و`DELETE /api/users/<id>` (`auth_bp.py:151-173`) — حذف حسابات الموظفين (وبالحذف النهائي `DELETE FROM users` بدلاً من التعطيل `is_active=0`).
- **الأثر:** تصعيد فوري للصلاحيات إلى المدير العام والاستيلاء الكامل على الحسابات.
- **التوصية الدفاعية:** إضافة `@require_roles(ROLE_ADMIN)` على كافة مسارات إدارة المستخدمين، وتحويل الحذف إلى تعطيل (`is_active = FALSE`) حفاظاً على سلامة سجل التدقيق والمراجع.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [C-05] حقن SQL مباشر عبر أسماء الأعمدة في `restore_backup_data`
- **الملف ورقم السطر:** `services/pg/pg_backup.py:131-142`
- **التفاصيل:**
  ```python
  cols = list(r.keys())
  col_names = ", ".join([f'"{c}"' for c in cols])
  update_clause = ", ".join([f'"{c}" = EXCLUDED."{c}"' for c in cols if c != 'id'])
  sql = f'INSERT INTO "{tbl}" ({col_names}) VALUES ({placeholders}) ON CONFLICT (id) DO UPDATE SET {update_clause};'
  cur.execute(sql, vals)
  ```
  الدالة تدمج مفاتيح JSON القادمة من المستخدم مباشرة داخل جملة SQL بدون التحقق منها ضد أعمدة الجدول الفعلية أو تمريرها عبر `psycopg2.sql.Identifier`. وبسبب `[C-03]` فإنها قابلة للاستدعاء مباشرة عبر `POST /api/gas` بـ `action: "restoreBackup"`.
- **الأثر:** تنفيذ أوامر SQL اعتباطية بصلاحية دور `postgres` (الذي يملك `rolbypassrls = True` و`rolcreaterole = True` كما ثبت من فحص القاعدة).
- **التوصية الدفاعية:** استخدام `psycopg2.sql.Identifier` للجدول والأعمدة، والتحقق من كل عمود مقابل `information_schema.columns` للجدول المسموح، مع حصر الاستعادة في `ROLE_ADMIN` فقط.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [C-06] ضعف تشفير كلمات المرور + تخزينها بنص صريح + باب خلفي (Backdoor) في التحقق + انقسام مخزن الهوية
- **الملف ورقم السطر:**
  - `domains/auth/db_init.py:7-20` (SHA-256 بملح ثابت `little_princesses_erp_salt_2026` + مقارنة نص صريح سطر 18 + شرط سطر 16 يقبل `'1234'` ككلمة مرور لحساب `admin`!)
  - `routes/auth_bp.py:127-137` (حفظ العمود `password` بنص صريح في SQLite، وافتراضي `'1234'` عند عدم التمرير سطر 134)
  - `services/pg/db_pool.py:95-99` (غرس مستخدم `admin` بكلمة مرور صريحة `'admin123'` في `public.users.password_hash`)
  - `routes/auth_bp.py:28-32` مقابل `services/security/rbac.py:79-83` (تسجيل الدخول يقرأ من SQLite بينما RBAC يقرأ من PostgreSQL!)
- **الدليل الفعلي:** فحص `little_princesses.db` أثبت وجود **10 مستخدمين** جميعهم بعمود `password` غير فارغ (نص صريح)، وملف `little_princesses.db` قابل للتحميل عبر HTTP (`[C-01]`).
- **الأثر:** كشف فوري لكلمات المرور، وإمكانية الدخول لحساب `admin` بكلمة مرور `'1234'`، وعدم تطابق تعطيل المستخدم بين SQLite وPostgreSQL.
- **التوصية الدفاعية:**
  - اعتماد `werkzeug.security.generate_password_hash` (`scrypt`/`pbkdf2:sha256`) أو `bcrypt`/`argon2` بملح عشوائي لكل مستخدم.
  - حذف العمود النصي `password` وحذف السطرين 16–19 من `verify_password`.
  - توحيد المصادقة في مصدر حقيقة واحد (`public.users` في PostgreSQL) وإزالة غرس كلمة المرور الصريحة `'admin123'` من `db_pool.py:97`.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [C-07] سياسة RLS مفتوحة للعموم (`{public}` — `ALL` — `true`) على جدول `garment_measurements_studio`
- **المصدر والدليل الفعلي (فحص مباشر لـ `pg_policies` في Supabase):**
  ```
  tablename: garment_measurements_studio
  policyname: 'Allow all studio measurements'
  roles: {public} | cmd: ALL | qual: true
  ```
  بالإضافة إلى أن `anon` يملك منحاً (`role_table_grants`) على الجداول في `public` (274 منحة)، ووجود `SUPABASE_URL` في `src/supabaseClient.js:9`. (ملاحظة: المفتاح الموجود في `src/supabaseClient.js:10` طوله 57 حرفاً فقط وهو Placeholder غير صالح حالياً، لكن السياسة في Supabase نفسها مفتوحة فعلياً لأي مستخدم يحصل على مفتاح `anon`).
- **الأثر:** إمكانية قراءة أو تعديل أو حذف كافة سجلات قياسات استوديو التفصيل عبر واجهة Supabase REST مباشرة بدون مصادقة إذا توفّر مفتاح `anon`.
- **التوصية الدفاعية:** حذف السياسة `Allow all studio measurements` على `public.garment_measurements_studio` والإبقاء فقط على سياسات `service_role` و`postgres` مثل باقي الجداول الـ 66، وتقليص صلاحيات `anon`/`authenticated` عبر `REVOKE ALL` على الجداول غير العامة.
- **التصنيف:** **إنتاجي + سحابي الآن (Cloud DB Now & Production)** — لأن القاعدة السحابية متصلة بالإنترنت فعلياً الآن.

---

## 🟠 الثغرات المرتفعة (High)

### [H-01] إخلال بمبدأ Zero-Trust المالي في الباك إند (الأسعار، الخصومات، الإجماليات، أسعار الصرف، واعتماد المصروفات)
- **الملفات وأرقام الأسطر:**
  1. **نقطة البيع (`services/pg/pg_pos.py:99, 101-103, 109-111, 142-143`):**
     - الباك إند يقبل `unit_price`, `total_price`, `subtotal`, `total_amount`, `discount`, `gift_wrap_fee`, `exchange_rate` مباشرة من الواجهة دون مطابقتها مع `product_variants.selling_price` أو `products.selling_price` أو `currencies.exchange_rate`. يمكن تمرير `total_amount: 0` أو `discount` مساوٍ للفاتورة أو `unit_price: 1` وإتمام بيع وخصم مخزون حقيقي!
  2. **المصروفات (`services/pg/pg_expenses.py:47-54, 64-65, 114-147`):**
     - يقبل `status: 'posted'` مباشرة من الواجهة في `POST /api/expenses` (غير محمي بـ `@require_roles`!) فيرحّل المصروف فوراً لدفتر الأستاذ، متجاوزاً بالكامل مسار الاعتماد المحمي `/api/expenses/approve` (`@require_roles(ROLE_ADMIN, ROLE_ACCOUNTANT)`).
     - لا يتحقق من عدم سالبية `subtotal_amount`, `discount_amount`, `tax_amount`, `net_amount` ويقبل `net_amount` كما هو دون إعادة حساب `subtotal - discount + tax`.
  3. **إنشاء وتحديث الطلبات (`services/pg/pg_orders_write.py:45-50` و `services/pg/pg_orders.py:154-165`):**
     - `add_order` يقبل قيماً سالبة في `total_amount`, `paid_amount`, `discount`, `tax`, `delivery_fee`.
     - `update_order` يسمح بتعديل `subtotal`, `total_amount`, `paid_amount`, `payment_status` مباشرة من الطلب دون قيود محاسبية أو منع القيم السالبة.
  4. **التسليم والتحصيل (`services/pg/pg_factory_delivery.py:23-24, 78-80`):**
     - لا يمنع `discount_amt < 0` (يرفع قيمة الفاتورة) أو `discount_amt > tot_amount` (ينتج `new_total` سالباً) أو `collected_amt < 0`.
  5. **سعر الصرف (`services/pg/account_resolver.py:18-28` و `services/pg/pg_vouchers.py:51-52, 64-66`):**
     - `resolve_exchange_rate` يثق بسعر الصرف القادم من العميل طالما `provided_rate > 1.0` بدلاً من إلزامه بالسعر المعتمد في جدول `currencies` (أو تقييد التجاوز بدور `admin`/`accountant` فقط).
- **الأثر:** تلاعب مباشر بالإيرادات والخصومات وأسعار الصرف وترحيل مصروفات غير معتمدة وإفساد المطابقة المالية.
- **التوصية الدفاعية:**
  - في POS: جلب `selling_price` من `product_variants`/`products` وحساب `subtotal` و`total_amount` بالكامل في الباك إند بـ `Decimal`، وتقييد سقف الخصم حسب الدور.
  - في المصروفات: إجبار `status = 'draft'` لغير `admin`/`accountant`، وإعادة حساب `net_amount` ورفض القيم السالبة.
  - في الطلبات والتسليم: التحقق الصارم `>= 0` و`discount <= subtotal` ومنع تعديل المبالغ بعد الترحيل المالي إلا عبر إشعار دائن/قيد عكسي.
  - في أسعار الصرف: قراءة السعر دائماً من `public.currencies` ما لم يكن المستخدم `admin`/`accountant` بتفويض صريح.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [H-02] تغطية RBAC ناقصة على مسارات كتابة وقراءة حساسة (207 مساراً من أصل 305 بلا `@require_roles`)
- **الملفات وأرقام الأسطر (من جرد `app.url_map` الفعلي):**
  - **مسارات كتابة مالية وتشغيلية بلا `@require_roles`:**
    - `routes/accounting_bp.py:118-123` (`POST /api/vouchers`, `/api/finance/vouchers`) و `172-177` (`POST /api/expenses`, `/api/finance/expenses`)
    - `routes/orders_bp.py:29-55, 111-125, 140-147` (إنشاء/تعديل/تسليم/مسح للتسليم للطلبات)
    - `routes/ready_products_bp.py:103-124` (`POST /api/pos/exchange-size`, `POST /api/pos/orders/<order_id>/return`)
    - `routes/atelier_bp.py:50, 58, 66-125, 136, 187` (تحديث وحذف أوامر الإنتاج، صرف واسترجاع مخزون المصنع، اعتماد وإعادة عمل بطاقات العمل وعمولات الخياطين، وإعدادات الجودة)
    - `routes/inventory_bp.py:110-125` (`POST /api/inventory/issue`, `POST /api/inventory/reconcile`)
    - `routes/customers_bp.py:19, 68` و `routes/measurement_bp.py:11, 61` و `routes/marketing_bp.py:50, 104, 124`
  - **مسارات قراءة بيانات مالية وإدارية حساسة بلا `@require_roles`:**
    - `routes/accounting_reports_bp.py:14-54` (الميزانية، ميزان المراجعة، قائمة الدخل، الأستاذ العام، التسويات)
    - `routes/hr_bp.py:15, 62, 73, 120, 145-186` (الرواتب، السلف، الموظفون، العمولات)
    - `routes/system_bp.py:30, 85, 128` (`GET /api/settings`, `GET /api/audit-logs`, `GET /api/backup/status`) و `routes/accounting_bp.py:39` (`GET /api/accounts/audit-log`) و `routes/periods_bp.py:18` (`GET /api/audit/integrity`).
- **الأثر:** تمكّن أي دور منخفض (مثل `tailor` أو `data_entry`) من الاطلاع على الرواتب والقوائم المالية وسجل التدقيق أو تنفيذ عمليات حذف/صرف/اعتماد عمولات غير مصرح بها.
- **التوصية الدفاعية:** تطبيق مبدأ الرفض الافتراضي (Default-Deny) عبر `before_request` يشترط مصادقة صالحة لكل مسار تحت `/api/*` (باستثناء قائمة بيضاء صريحة مثل `/api/auth/login` و`/api/health` و`/api/customer/track` المحمي برمز)، ثم إضافة `@require_roles(...)` لكل مسار حسب مصفوفة الصلاحيات.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [H-03] ثغرات IDOR وكشف بيانات شخصية ومالية عبر معرّفات متسلسلة قابلة للتخمين
- **الملفات وأرقام الأسطر:**
  - `routes/orders_bp.py:86-108` (`GET /api/customer/track`, `/api/track`, `/api/orders/dress-card`)
  - `services/pg/pg_customer_tracking.py:14-60`
  - `routes/customers_bp.py:58-76` (`GET /api/crm/customers/<customer_id>/tracking`, `POST /api/crm/customers/confirm-fitting`)
  - `routes/accounting_bp.py:157-162` (`GET /api/vouchers/card-data?id=...`)
  - `routes/ready_products_bp.py:93-100` (`GET /api/pos/orders/<order_ref>/items`)
- **التفاصيل:** تمرير رقم طلب متسلسل (`ORD-0001`, `ORD-0002`, ...) إلى `/api/customer/track` يعيد كائن الطلب بالكامل (`SELECT o.*`) بالإضافة إلى اسم العميل الكامل، **رقم الهاتف (`customer_phone`)**، اسم الطفلة وعمرها، مقاسات الجسم الكاملة، والمبالغ المالية المدفوعة والمتبقية! كما يسمح `/api/crm/customers/confirm-fitting` بتأكيد البروفة لأي طلب بمجرد تخمين رقمه.
- **الأثر:** إمكانية استخراج (Scraping) قاعدة بيانات العملاء وأرقام هواتفهم ومقاسات أطفالهم ومبالغ طلباتهم بالكامل.
- **التوصية الدفاعية:**
  - ربط بوابة تتبع العميل (`track.html`) برمز تتبع عشوائي غير قابل للتخمين (`tracking_token` بطول 128-bit UUID/hex) أو التحقق من آخر 4 أرقام من هاتف العميل.
  - استبدال `SELECT o.*` بقائمة أعمدة محددة لا تكشف `customer_phone` أو البيانات الداخلية.
  - حماية `/api/orders/dress-card` و`/api/vouchers/card-data` و`/api/pos/orders/<ref>/items` بالمصادقة وRBAC.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)** (حرج جداً فور إتاحة `track.html` للعملاء عبر الإنترنت).

---

### [H-04] ثغرة XSS في نوافذ الطباعة عبر `document.write()` دون ترميز HTML
- **الملفات وأرقام الأسطر:**
  - `src/features/orders/components/HangtagPrintModal.jsx:36-57`
  - `src/components/PrintModal.jsx:108-138`
- **التفاصيل:**
  - في `HangtagPrintModal.jsx:37, 53-56` يتم دمج `skuVal`, `brandName`, `activeVar.age_size`, `activeVar.color_name`, `product.name`, `barcodeVal`, `curr` مباشرة داخل `win.document.write(...)` بدون أي `escapeHtml`. إدخال اسم منتج أو لون يحتوي `<img src=x onerror=...>` ينفّذ JavaScript في نفس أصل التطبيق (Same-Origin) عند الضغط على الطباعة.
  - في `PrintModal.jsx:113` يتم دمج `orderNo` مباشرة في `<title>طباعة - ${orderNo}</title>` داخل `printWindow.document.write(...)`.
- **الأثر:** تنفيذ شيفرة JavaScript خبيثة في متصفح المحاسب أو المدير (Stored XSS) وسرقة الجلسة أو تنفيذ عمليات مالية باسمه.
- **التوصية الدفاعية:** إنشاء دالة مركزية `escapeHtml(str)` وتمرير جميع المتغيرات النصية عبرها قبل `document.write`، أو استخدام `DOM` APIs (`textContent`) بدلاً من بناء HTML نصي.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [H-05] فجوات في قفل الفترة المالية (`assert_period_open`) وتجاوز درع منع التكرار (`@idempotent_op`)
- **الملفات وأرقام الأسطر:**
  - `services/pg/pg_advances.py:64-100` (`add_advance` — صرف سلفة موظف وترحيل قيد دون استدعاء `assert_period_open`)
  - `services/pg/pg_expenses.py:38-147` (`add_expense` — حفظ المسودة أو تعديلها لا يتحقق من قفل الفترة إلا عند الترحيل؛ و`delete_expense` أسطر 167–185 ينفذ **حذفاً نهائياً `DELETE FROM expenses/payments/journal_entries`** بدون `assert_period_open` وبالمخالفة لقاعدة منع الحذف النهائي!)
  - `services/security/idempotency.py:53-55, 73-84`
- **التفاصيل:**
  1. في `idempotency.py:53-55`: إذا حذف العميل ترويسة `Idempotency-Key` تمر العملية بدون أي حماية من التكرار (`return fn(*args, **kwargs)`).
  2. في `idempotency.py:81-84`: عند إعادة استخدام نفس `Idempotency-Key` مع Payload مختلف (`request_hash` مختلف)، يُعيد الديكوريتور النتيجة المخزّنة بدلاً من رفض الطلب بـ `409 Conflict` / `422`.
  3. في `pg_vouchers.py:122-186`: يسمح بتعديل سند `Confirmed` موجود وتحديث أرصدة العميل/المورد ثم محاولة `DELETE FROM journal_entry_lines` (وهو ما يصطدم بـ Trigger منع الحذف على القيود المرحلة ويُظهر تعارض تصميم مع IFRS).
- **الأثر:** ترحيل سلف في فترة محاسبية مغلقة، إمكانية تكرار صرف سندات أو طلبات بتجاهل الترويسة، ومحاولة حذف قيود/سندات مصروفات نهائياً.
- **التوصية الدفاعية:** إضافة `assert_period_open` إلى `add_advance` وجميع نقاط الكتابة المالية؛ تحويل `delete_expense` إلى إلغاء/عكس آمن؛ فرض مقارنة `request_hash` في `idempotency.py` وإلزامية `Idempotency-Key` على المسارات المالية الحرجة.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [H-06] تدمير سجل التدقيق (`audit_logs`) و`idempotency_keys` ضمن `clear_all_transactional_data` وغياب حصانة السجل
- **الملف ورقم السطر:** `services/pg/pg_system.py:101-119` (تحديداً سطر 111: `"audit_logs", "idempotency_keys"`) + `routes/system_bp.py:181-190`.
- **التفاصيل:** وظيفة تصفير البيانات التشغيلية تقوم بعمل `TRUNCATE TABLE ... "audit_logs", "idempotency_keys" RESTART IDENTITY CASCADE`، مما يمحو الأدلة الجنائية بالكامل. كما أن جدول `audit_logs` لا يملك Trigger منع التعديل/الحذف (`BEFORE UPDATE OR DELETE`) كما هو مطبّق في `journal_entries`.
- **الأثر:** إمكانية إخفاء آثار أي تلاعب مالي أو اختراق بمسح سجل التدقيق نهائياً.
- **التوصية الدفاعية:** إزالة `audit_logs` من `tables_to_truncate`، وإضافة PostgreSQL Immutability Trigger يمنع `UPDATE`/`DELETE` على `audit_logs`، وتعطيل مسار `/api/system/clear-all-data` تماماً في وضع الإنتاج (أو تقييده بمتغير بيئة صريح).
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [H-07] حفظ لقطات النسخ الاحتياطي JSON (شاملة جدول `users`) داخل جذر المشروع القابل للتحميل عبر HTTP
- **الملف ورقم السطر:** `services/pg/pg_backup.py:66-107` (سطر 71 يشمل `"users"`, وسطر 92 يكتب في `backups/snapshot_*.json` داخل جذر المشروع).
- **التفاصيل:** الجمع بين حفظ النسخة داخل مجلد المشروع وثغرة `[C-01]` يعني أن أي لقطة احتياطية تُنشأ تصبح متاحة للتحميل المباشر عبر `GET /backups/snapshot_YYYYMMDD_HHMMSS.json`، وتحتوي على كامل قاعدة البيانات بما فيها `users.password_hash`.
- **الأثر:** تسريب كامل لجميع بيانات العملاء والقيود المحاسبية والمستخدمين في ملف واحد.
- **التوصية الدفاعية:** حفظ اللقطات خارج جذر الويب (في مسار مُعرّف بمتغير بيئة `BACKUP_DIR` في `.env`)، واستبعاد الأعمدة الحساسة أو تشفير ملف النسخة، إلى جانب إغلاق `[C-01]`.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

## 🟡 الثغرات المتوسطة (Medium)

### [M-01] تسريب تفاصيل الأخطاء الداخلية وبنية قاعدة البيانات في ردود الـ API
- **الملفات وأرقام الأسطر:**
  - `app.py:110, 116` (`'detail': str(orig_err)` و `'detail': str(e)`)
  - `services/pg/dispatcher.py:41-42` (`"message": str(e), "error": str(e)`)
  - `routes/atelier_bp.py:19, 28, 37, 47, 55, 63, 79, 88, 97, 106, 115, 124, 133, 142, 151, 161, 182, 191`
  - `routes/accounting_reports_bp.py:20, 28, 36, 44, 54`
  - `routes/marketing_bp.py:19, 30, 47, 72, 89, 101`
  - `routes/measurement_bp.py:23, 33, 44, 58, 73, 90`
  - `routes/orders_bp.py:54, 108, 147`
- **الأثر:** كشف أسماء الجداول والأعمدة والقيود ومسارات الملفات للمهاجمين عند حدوث استثناءات PostgreSQL أو Python.
- **التوصية الدفاعية:** حذف مفتاح `'detail': str(e)` من `app.py:110, 116` وتمرير كافة الاستثناءات في جميع الـ Blueprints عبر `translate_shield_error(e)` مع تسجيل الخطأ التفصيلي فقط في `logger.exception(...)` على الخادم.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [M-02] سياسة CORS مفتوحة للجميع (`origins: "*"`) مع تفعيل `supports_credentials=True`
- **الملف ورقم السطر:** `app.py:44`
  ```python
  CORS(flask_app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
  ```
- **الأثر:** في `flask-cors` يؤدي هذا الضبط إلى عكس أي `Origin` قادم في الطلب داخل `Access-Control-Allow-Origin` مع `Access-Control-Allow-Credentials: true`، مما يسمح لأي موقع خارجي يفتحه المستخدم في نفس المتصفح بإرسال طلبات مصادق عليها إلى `http://127.0.0.1:5000` وسرقة البيانات أو تنفيذ عمليات مالية (Cross-Site Request Forgery / Data Exfiltration).
- **التوصية الدفاعية:** حصر `origins` في قائمة بيضاء من متغير بيئة `ALLOWED_ORIGINS` (محلياً: `["http://127.0.0.1:5000", "http://localhost:5000"]`، وإنتاجياً: النطاق الرسمي عبر HTTPS فقط).
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)** (قيمة النطاقات تختلف بين المحلي والإنتاجي).

---

### [M-03] غياب تام لحدود الطلبات (Rate Limiting) على الدخول والمسارات الحساسة
- **الملف ورقم السطر:** `app.py` و `routes/auth_bp.py:18-53` و `routes/orders_bp.py:86-94` و `routes/ready_products_bp.py:22-50`.
- **الأثر:** قابلية تنفيذ هجمات التخمين العنيف (Brute-Force) على `/api/auth/login` (خاصة مع كلمات المرور القصيرة مثل `1234` و`admin`)، أو سحب كافة الطلبات من `/api/customer/track`، أو إغراق القرص برفع الصور على `/api/uploads/product-image`.
- **التوصية الدفاعية:** إضافة `Flask-Limiter` (بحد مثلاً `5/minute` لمسار الدخول، `20/minute` لمسار التتبع ورفع الصور، وقفل مؤقت بعد محاولات فاشلة متكررة).
- **التصنيف:** **محلي الآن (لمسار الدخول) + إنتاجي إلزامي (Local Recommended & Production Mandatory)**.

---

### [M-04] فجوات التوثيق وقابلية تزوير هوية المنفّذ في سجل التدقيق (`audit_logs`)
- **الملفات وأرقام الأسطر:**
  - `services/pg/pg_audit.py:53-60`: الدالة `get_active_user_context()` تقرأ هوية المستخدم من ترويسات غير موثوقة (`X-User-Id`, `X-Username`, `X-Current-User`, `X-User`) بل وحتى من معامل الاستعلام `request.args.get('user_id')`!
  - `routes/auth_bp.py:18-53, 108-173`: عمليات تسجيل الدخول (الناجح والفاشل) وإنشاء/تعديل/حذف المستخدمين لا تُوثّق في `audit_logs`.
  - `services/security/period_lock.py:67-96`: قفل وفتح الفترات المالية (`toggle_fiscal_period`) لا يُوثّق في `audit_logs` رغم أن الوصف ينص على وجود أثر تدقيقي (`with audit trail`).
- **الأثر:** قدرة المستخدم على نسب عملياته لمستخدم آخر في سجل التدقيق، وغياب سجل محاولات الدخول وتغييرات الصلاحيات وفتح الفترات المغلقة.
- **التوصية الدفاعية:** استخلاص `user_id` حصراً من الكائن المصادق عليه على الخادم (`request.active_user` / `g.user`)، وإضافة `log_audit_event` لأحداث المصادقة وإدارة المستخدمين وقفل/فتح الفترات المالية.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [M-05] نقص التحقق من المحتوى الفعلي للصور (Magic Bytes) وغياب `MAX_CONTENT_LENGTH` في Flask
- **الملفات وأرقام الأسطر:** `routes/ready_products_bp.py:22-50` و `app.py:40`.
- **التفاصيل:**
  - التحقق في `upload_product_image` يعتمد على الامتداد فقط (`ext in ALLOWED_EXTENSIONS`) ولا يفحص التوقيع الثنائي للملف (Magic Bytes) أو يعيد ترميز الصورة عبر Pillow (`Image.open().verify()`).
  - السطر 35 يقرأ الملف كاملاً إلى الذاكرة (`file_obj.read()`) قبل فحص الحجم، ولا يوجد `app.config['MAX_CONTENT_LENGTH']` لمنع استهلاك الذاكرة (DoS) برفع ملفات ضخمة.
- **الأثر:** إمكانية رفع ملفات غير صورية (مثل HTML/SVG/Polyglot) بامتداد `.png` أو إرسال طلبات ضخمة لإسقاط الخادم.
- **التوصية الدفاعية:** ضبط `flask_app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024`، والتحقق من الصورة فعلياً عبر `PIL.Image` مع إعادة حفظها لتجريد أي بيانات خبيثة، وإضافة `X-Content-Type-Options: nosniff` عند التقديم.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [M-06] غياب ترويسات أمان HTTP الأساسية (Security Headers)
- **الملف ورقم السطر:** `app.py:51-55`
- **التفاصيل:** `set_custom_headers` يضبط `Cache-Control` و`X-Powered-By` فقط، ويفتقر إلى:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy` (مضبوطة لتشغيل React/Babel محلياً ثم تضييقها في الإنتاج بعد البناء المسبق للـ Bundle)
  - `Strict-Transport-Security` (للإنتاج عبر HTTPS فقط).
- **الأثر:** زيادة قابلية الاستغلال لثغرات Clickjacking وMIME-Sniffing وXSS.
- **التوصية الدفاعية:** إضافة الترويسات المذكورة في `after_request` وإزالة `X-Powered-By`.
- **التصنيف:** **محلي الآن (`nosniff`, `X-Frame-Options`, `Referrer-Policy`) + إنتاجي (`HSTS` و`CSP` صارمة)**.

---

## 🔵 الثغرات المنخفضة والملاحظات التحسينية (Low)

### [L-01] استخدام `eval()` في `AppRouter.jsx`
- **الملف ورقم السطر:** `src/components/app/AppRouter.jsx:64, 66`
- **الأثر:** يمنع تفعيل سياسة `Content-Security-Policy` صارمة (يتطلب `unsafe-eval`) ويُعد ممارسة خطرة معمارياً.
- **التوصية الدفاعية:** استبدال `eval` بالبحث المباشر في كائن `window[name]`.
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [L-02] مسار النسخ الاحتياطي الثابت (`Hardcoded`) وملفات `.db` المتعقبة في Git
- **الملفات وأرقام الأسطر:**
  - `services/pg/pg_backup_service.py:12` (`BACKUP_DIR = r"C:\Users\Mohammed Falah\ERP_Backups_Daily"`)
  - ملفات متعقبة في Git (عبر `git ls-files`): `erp_system.db` و`little_princesses_mobile.db` (رغم وجود `*.db` في `.gitignore`).
- **الأثر:** كشف اسم مستخدم نظام التشغيل وعدم قابلية النقل بين البيئات، وخطر رفع بيانات محلية إلى المستودع.
- **التوصية الدفاعية:** نقل `BACKUP_DIR` إلى `.env` وإزالة ملفات `.db` من فهرس Git (`git rm --cached`).
- **التصنيف:** **محلي الآن + إنتاجي (Local Now & Production)**.

---

### [L-03] تعداد المستخدمين (Username Enumeration) وأكواد حالة HTTP غير قياسية في تسجيل الدخول
- **الملف ورقم السطر:** `routes/auth_bp.py:25-43`
- **التفاصيل:** يُرجع المسار رسائل مختلفة بين `'اسم المستخدم غير مسجل في النظام'` و`'كلمة المرور غير صحيحة'` وبكود `200 OK` بدلاً من `401 Unauthorized`.
- **الأثر:** يسهّل على المهاجم اكتشاف أسماء الحسابات الصالحة قبل الهجوم على كلمات المرور.
- **التوصية الدفاعية:** توحيد الرسالة إلى `'بيانات الدخول غير صحيحة'` وإرجاع كود `401 Unauthorized` (مع مراعاة توافق الواجهة الأمامية).
- **التصنيف:** **إنتاجي أساساً (Production Priority)**.

---

### [L-04] توصيات خاصة بالنشر الإنتاجي (Production-Only Checklist)
عند الانتقال من التشغيل المحلي `http://127.0.0.1:5000` إلى الإنتاج (HTTPS / Public Network)، يجب استكمال الآتي:
1. تشغيل Flask خلف خادم WSGI إنتاجي (Gunicorn / Waitress) ووكيل عكسي (Nginx / Caddy) بشهادة TLS/HTTPS مع تفعيل `HSTS`.
2. إزالة Babel In-Browser (`@babel/standalone` في `index.html`) وبناء حزمة إنتاجية مسبقاً لتفعيل `Content-Security-Policy` بدون `unsafe-inline` / `unsafe-eval`.
3. إنشاء مستخدم PostgreSQL تطبيقي بأقل صلاحيات (Least Privilege — بدون `rolbypassrls` وبدون `rolcreaterole`) بدلاً من الاتصال بدور `postgres` ذي الصلاحيات الواسعة.
4. تدوير (Rotate) كلمة مرور `DATABASE_URL` في Supabase فور إغلاق `[C-01]` إذا كان الخادم قد عمل سابقاً على شبكة مشتركة (`0.0.0.0`).
5. التحقق من توقيع Webhook في `routes/marketing_bp.py:104-107` (`/api/social/webhook`) قبل ربطه بمنصات التواصل الفعلية.

---

## 🗺️ أولويات التنفيذ المقترحة (Remediation Roadmap)

1. **المرحلة 1 — فوري للتشغيل المحلي الآن (قبل أي استخدام شبكي):**
   - إغلاق `[C-01]` (تقييد `serve_spa` في `app.py`) + ربط الخادم بـ `127.0.0.1` + حذف سياسة `public` على `garment_measurements_studio` (`[C-07]`).
   - إغلاق `[C-02]` و`[C-03]` و`[C-04]` و`[C-05]` و`[C-06]` (مصادقة موقّعة، إزالة Fallback المدير، إغلاق/تقييد `/api/gas`، حماية `/api/users`، إصلاح حقن SQL في `restore_backup_data`، وترقية تشفير كلمات المرور).
2. **المرحلة 2 — تحصين المنطق المالي والصلاحيات (محلي + إنتاجي):**
   - معالجة `[H-01]` حتى `[H-07]` (Zero-Trust في POS والمصروفات والطلبات وأسعار الصرف، استكمال `@require_roles`، حماية IDOR في `track.html`، ترميز XSS في الطباعة، وحصانة `audit_logs`).
3. **المرحلة 3 — التصلب العام وتجهيز الإنتاج:**
   - معالجة `[M-01]` حتى `[M-06]` و`[L-01]` حتى `[L-04]` (منع تسريب الأخطاء، ضبط CORS، Rate Limiting، فحص Magic Bytes للصور، Security Headers، وإعدادات الإنتاج).
