# 🏛️ خريطة التدقيق المعماري — ARCHITECTURE AUDIT REPORT
**المشروع:** Little Princesses ERP | **المعمار:** Senior Software Architect  
**تاريخ الفحص:** 2026-09-17 | **الحالة العامة:** يحتاج إعادة هيكلة معمارية موجهة

---

## 1. المعمارية الحالية (Current Architecture)
- **الواجهة الأمامية (Presentation):** React 18 + Tailwind عبر متصفح مباشر (Babel runtime) بدون Bundler.
- **خادم التطبيق (Application/Routing):** خادم بايثون أحادي ضخم (`unified_server.py` ~5,754 سطر).
- **طبقة البيانات (Persistence):** معمارية مشتتة (Split-Brain) تجمع بين Cloud PostgreSQL عبر (`pg_service.py` ~6,740 سطر) ومحلياً SQLite (`database.db`) مع مزامنة Google Apps Script.

---

## 2. جدول المشاكل المعمارية المكتشفة وتصنيف خطورتها

| المعرف | المشكلة المعمارية | الخطورة | الملفات المتأثرة | سبب المشكلة | الإصلاح المقترح |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **ARCH-01** | تشتت قاعدة البيانات (Split-Brain Persistence) | **Critical** | `unified_server.py`, `pg_service.py`, `database.db` | خادم الويب ينفذ استعلامات SQLite محلية مباشرة في بعض المسارات بينما بقية النظام يكتب في Cloud PostgreSQL. | توحيد منفذ البيانات عبر مستودع مركزي وموجه (Repository / DB Gateway) يمنع تجاوز `pg_service` وتزامن البيانات. |
| **ARCH-02** | الملفات العملاقة (God Objects & God Services) | **Critical** | `unified_server.py`, `pg_service.py`, `Factory.jsx`, `Vouchers.jsx` | تجميع الراوتر، منطق الأعمال، الاستعلامات، والتحقق داخل ملفين ضخمين يفوق كل منهما 5500 سطر. | تفكيك الخدمات إلى Domain Modules متخصصة (accounting, tailoring, customers, inventory) ذات واجهات واضحة. |
| **ARCH-03** | خلط واجهة المستخدم مع منطق الأعمال والمحاسبة | **High** | `src/features/Vouchers.jsx`, `src/features/Orders.jsx`, `accountingEngine.js` | الواجهة تولد أسطر القيود المحاسبية وتحسب الأرصدة المتأثرة محلياً قبل إرسالها للخادم. | نقل توليد القيود وحساب الأرصدة إلى Application/Domain Layer في الخادم، واقتصار الواجهة على إرسال الأمر المالي. |
| **ARCH-04** | تعدد مصادر الحقيقة لحالات الطلبات (State Machine) | **High** | `Orders.jsx`, `Factory.jsx`, `pg_service.py`, `constants.js` | حالات طلبات الخياطة موزعة كنصوص متباينة تحوي إيموجيات أحياناً وبدونها أحياناً أخرى عبر 10 ملفات. | بناء State Machine موحدة مركزية تحدد الحالات والانتقالات المسموحة وتكون المصدر الأوحد للحقيقة (Source of Truth). |
| **ARCH-05** | الوصول المباشر غير المنظم لقاعدة البيانات داخل المتحكمات | **Medium** | `unified_server.py` | معالجات HTTP (Controllers) تفتح المؤشر وتنفذ Raw SQL مباشرة دون وجود Repository Abstraction. | عزل استدعاءات البيانات خلف واجهات استخدام ومستودعات (Repositories / Application Services). |
| **ARCH-06** | تكرار محركات التحويل المالي وحساب العملات | **Medium** | `currencyService.js`, `update_currency.py`, `pg_service.py` | أسعار الصرف وقواعد التحويل مكررة ومشتتة بين الواجهة، وسكربتات المزامنة، والخلفية. | اعتماد مزود عملات موحد ذي مسار وحيد للقاعدة النقدية (Base Currency Engine). |
| **ARCH-07** | وجود كود قديم ميت يزاحم بيئة العمل (Legacy Clutter) | **Low** | `app.py`, `dual_inventory_module.py`, `products_module.py` | ملفات تطبيق Tkinter القديم ووحدات مساعدة منفصلة لا تُستخدم في خادم الويب الأساسي. | عزل الكود المكتبي في مجلد أرشيفي `legacy/` لمنع التداخل والخلط. |

---

## 3. المعمارية المستهدفة وخطة الفصل النطاقي (Domain-Driven Structure)

```
Presentation Layer (index.html, React Feature Views, Controllers)
         │  (HTTP / JSON Data Contracts)
         ▼
Application Layer (Use Cases, Commands, Queries, Orchestration)
         │  (Domain Interfaces)
         ▼
Domain Layer (Entities, Value Objects, State Machine, Accounting Rules)
         │  (Repository Contracts)
         ▼
Infrastructure Layer (PostgreSQL Pool, SQLite Fallback, GAS Gateway)
```

---

## 4. خطة التدخل والإصلاح المعماري المتدرج
1. **المرحلة 1 (Critical):** إنشاء نواة الـ Domains وتوحيد الوصول لقاعدة البيانات وعزل SQLite العشوائي.
2. **المرحلة 2 (High):** توحيد آلة الحالات (Tailoring State Machine) وعزل القيود المحاسبية في الخادم.
3. **المرحلة 3 (Medium):** توحيد إدارة العملات وتنظيم مسارات الاستيراد والعقود.
4. **المرحلة 4 (Verification):** التحقق من تشغيل الخادم، ثبات البيانات، وخلو النظام من أخطاء الانهيار.
