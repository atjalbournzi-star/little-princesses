/**
 * ==========================================================================
 * 👑 LITTLE PRINCESSES ERP — MASTER CLOUD GOOGLE APPS SCRIPT BACKEND v6.0
 * 100% STANDARDIZED ARABIC DATABASE SCHEMA & BIDIRECTIONAL RELATIONAL ENGINE
 * ==========================================================================
 */

var MASTER_SCHEMA_MAP = {
  "customers": {
    arabicSheet: "العملاء",
    prefix: "CUST",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "name", header: "اسم العميل" },
      { key: "phone", header: "رقم الهاتف" },
      { key: "phone_alt", header: "هاتف بديل" },
      { key: "platform", header: "منصة التواصل" },
      { key: "handle", header: "معرف الحساب" },
      { key: "category", header: "تصنيف العميل" },
      { key: "city", header: "المدينة" },
      { key: "street", header: "العنوان التفصيلي" },
      { key: "children_count", header: "عدد الأطفال" },
      { key: "notes", header: "ملاحظات" },
      { key: "status", header: "الحالة" },
      { key: "created_at", header: "تاريخ التسجيل" },
      { key: "updated_at", header: "تاريخ التحديث" },
      { key: "created_by", header: "أنشأ بواسطة" }
    ]
  },

  "children": {
    arabicSheet: "الأطفال",
    prefix: "CHLD",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "customer_id", header: "معرف العميل" },
      { key: "child_name", header: "اسم الطفل" },
      { key: "gender", header: "الجنس" },
      { key: "birth_date", header: "تاريخ الميلاد" },
      { key: "age", header: "العمر" },
      { key: "notes", header: "ملاحظات الطفل" },
      { key: "status", header: "الحالة" },
      { key: "created_at", header: "تاريخ الإضافة" },
      { key: "updated_at", header: "تاريخ التحديث" }
    ]
  },

  "measurements": {
    arabicSheet: "المقاسات",
    prefix: "MEAS",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "customer_id", header: "معرف العميل" },
      { key: "child_id", header: "معرف الطفل" },
      { key: "child_name", header: "اسم الطفل" },
      { key: "date", header: "تاريخ أخذ القياس" },
      { key: "unit", header: "وحدة القياس" },
      { key: "total_len", header: "الطول الكلي" },
      { key: "dress_len", header: "طول الفستان" },
      { key: "chest_len", header: "طول الصدر" },
      { key: "skirt_len", header: "طول التنورة" },
      { key: "sleeve_len", header: "طول الكم" },
      { key: "chest_circ", header: "محيط الصدر" },
      { key: "waist_circ", header: "محيط الخصر" },
      { key: "shoulder_w", header: "عرض الكتف" },
      { key: "armpit_circ", header: "محيط الإبط" },
      { key: "neck_circ", header: "محيط الرقبة" },
      { key: "model_name", header: "اسم الموديل المطلوب" },
      { key: "model_img", header: "صورة الموديل" },
      { key: "comfort_profile", header: "مستوى الراحة والتوسيع" },
      { key: "notes", header: "ملاحظات الخياطة" },
      { key: "status", header: "الحالة" },
      { key: "created_at", header: "تاريخ التسجيل" },
      { key: "updated_at", header: "تاريخ آخر تحديث" }
    ]
  },

  "products": {
    arabicSheet: "المنتجات",
    prefix: "PROD",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "sku", header: "رمز المنتج" },
      { key: "model_name", header: "اسم الموديل" },
      { key: "model_no", header: "رقم الموديل" },
      { key: "category", header: "التصنيف" },
      { key: "subcategory", header: "التصنيف الفرعي" },
      { key: "collection", header: "المجموعة" },
      { key: "design_code", header: "رمز التصميم" },
      { key: "designer_id", header: "معرف المصمم" },
      { key: "fabric_id", header: "معرف القماش" },
      { key: "base_price", header: "سعر البيع" },
      { key: "cost_price", header: "تكلفة الإنتاج" },
      { key: "currency", header: "العملة" },
      { key: "image_url", header: "الصورة" },
      { key: "description", header: "الوصف" },
      { key: "min_stock", header: "الحد الأدنى للمخزون" },
      { key: "status", header: "الحالة" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "updated_at", header: "تاريخ آخر تحديث" },
      { key: "created_by", header: "أنشأ بواسطة" }
    ]
  },

  "orders": {
    arabicSheet: "الطلبات",
    prefix: "ORD",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "order_no", header: "رقم الفاتورة" },
      { key: "customer_id", header: "معرف العميل" },
      { key: "child_id", header: "معرف الطفل" },
      { key: "product_id", header: "معرف المنتج" },
      { key: "variant_id", header: "معرف الصنف" },
      { key: "quantity", header: "الكمية" },
      { key: "order_date", header: "تاريخ الطلب" },
      { key: "delivery_date", header: "تاريخ التسليم المتوقع" },
      { key: "total_amount", header: "الإجمالي" },
      { key: "discount", header: "الخصم" },
      { key: "tax", header: "الضريبة" },
      { key: "paid_amount", header: "المبلغ المدفوع" },
      { key: "remaining_amount", header: "المبلغ المتبقي" },
      { key: "currency", header: "العملة" },
      { key: "exchange_rate", header: "سعر الصرف" },
      { key: "base_amount", header: "المبلغ بالريال اليمني" },
      { key: "payment_status", header: "حالة الدفع" },
      { key: "production_status", header: "حالة الإنتاج" },
      { key: "payment_method", header: "طريقة الدفع" },
      { key: "status", header: "الحالة" },
      { key: "notes", header: "ملاحظات" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "updated_at", header: "تاريخ آخر تحديث" },
      { key: "created_by", header: "أنشأ بواسطة" }
    ]
  },

  "payments": {
    arabicSheet: "السندات_المالية",
    prefix: "PAY",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "payment_no", header: "رقم السند" },
      { key: "order_id", header: "معرف الطلب" },
      { key: "invoice_id", header: "معرف الفاتورة" },
      { key: "customer_id", header: "معرف العميل" },
      { key: "supplier_id", header: "معرف المورد" },
      { key: "payment_type", header: "نوع السند" },
      { key: "amount", header: "المبلغ" },
      { key: "currency", header: "العملة" },
      { key: "exchange_rate", header: "سعر الصرف" },
      { key: "base_amount", header: "المبلغ بالريال اليمني" },
      { key: "payment_method", header: "طريقة الدفع" },
      { key: "reference_no", header: "رقم المرجع" },
      { key: "account_id", header: "الحساب المالي" },
      { key: "date", header: "تاريخ الدفع" },
      { key: "status", header: "الحالة" },
      { key: "notes", header: "ملاحظات" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "created_by", header: "أنشأ بواسطة" }
    ]
  },

  "inventory": {
    arabicSheet: "المخزون_والمستودعات",
    prefix: "INV",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "item_code", header: "رمز الصنف" },
      { key: "item_name", header: "اسم الصنف / القماش" },
      { key: "category", header: "التصنيف" },
      { key: "unit", header: "وحدة القياس" },
      { key: "stock_qty", header: "الكمية المتوفرة" },
      { key: "reserved_qty", header: "الكمية المحجوزة" },
      { key: "available_qty", header: "الكمية القابلة للاستخدام" },
      { key: "min_limit", header: "حد إعادة الطلب" },
      { key: "unit_cost", header: "سعر التكلفة" },
      { key: "total_cost", header: "إجمالي التكلفة" },
      { key: "selling_price", header: "سعر البيع" },
      { key: "location", header: "موقع التخزين" },
      { key: "color", header: "اللون" },
      { key: "pattern", header: "النقشة" },
      { key: "material_type", header: "نوع الخامة" },
      { key: "barcode", header: "الباركود" },
      { key: "image_url", header: "رابط الصورة" },
      { key: "status", header: "الحالة" },
      { key: "notes", header: "ملاحظات" },
      { key: "created_at", header: "تاريخ الإضافة" },
      { key: "updated_at", header: "تاريخ آخر تحديث" }
    ]
  },

  "inventory_movements": {
    arabicSheet: "حركات_المخزون",
    prefix: "MOV",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "movement_no", header: "رقم الحركة" },
      { key: "movement_type", header: "نوع الحركة" },
      { key: "item_id", header: "معرف الصنف" },
      { key: "quantity", header: "الكمية" },
      { key: "unit_cost", header: "سعر الوحدة" },
      { key: "total_cost", header: "التكلفة الإجمالية" },
      { key: "source_location", header: "من موقع" },
      { key: "destination_location", header: "إلى موقع" },
      { key: "reference_type", header: "نوع المرجع" },
      { key: "reference_id", header: "معرف المرجع" },
      { key: "date", header: "تاريخ الحركة" },
      { key: "notes", header: "ملاحظات" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "created_by", header: "أنشأ بواسطة" }
    ]
  },

  "production_orders": {
    arabicSheet: "أوامر_الإنتاج",
    prefix: "PRD",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "order_no", header: "رقم أمر الإنتاج" },
      { key: "sales_order_id", header: "معرف طلب المبيعات" },
      { key: "product_id", header: "معرف المنتج" },
      { key: "quantity", header: "الكمية" },
      { key: "current_stage", header: "المرحلة الحالية" },
      { key: "tailor_id", header: "معرف الخياط" },
      { key: "priority", header: "الأولوية" },
      { key: "start_date", header: "تاريخ البدء" },
      { key: "due_date", header: "تاريخ التسليم" },
      { key: "actual_finish_date", header: "تاريخ الانتهاء الفعلي" },
      { key: "status", header: "الحالة" },
      { key: "notes", header: "ملاحظات" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "updated_at", header: "تاريخ التحديث" }
    ]
  },

  "accounts": {
    arabicSheet: "دليل_الحسابات",
    prefix: "ACC",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "account_code", header: "رمز الحساب" },
      { key: "account_name", header: "اسم الحساب" },
      { key: "account_name_en", header: "اسم الحساب بالإنجليزية" },
      { key: "account_type", header: "نوع الحساب" },
      { key: "account_category", header: "تصنيف الحساب" },
      { key: "parent_account_id", header: "معرف الحساب الرئيسي" },
      { key: "parent_account_code", header: "رمز الحساب الرئيسي" },
      { key: "level", header: "المستوى" },
      { key: "account_path", header: "المسار الهيكلي" },
      { key: "is_group", header: "حساب تجميعي" },
      { key: "is_postable", header: "يقبل الترحيل" },
      { key: "is_active", header: "الحالة" },
      { key: "normal_balance", header: "طبيعة الحساب" },
      { key: "opening_balance", header: "الرصيد الافتتاحي" },
      { key: "current_balance", header: "الرصيد الحالي" },
      { key: "balance_type", header: "نوع الرصيد" },
      { key: "currency", header: "العملة" },
      { key: "establishment_date", header: "تاريخ التأسيس" },
      { key: "notes", header: "ملاحظات" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "created_by", header: "أنشأ بواسطة" }
    ]
  },

  "journal_entries": {
    arabicSheet: "القيود_اليومية",
    prefix: "JV",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "entry_no", header: "رقم القيد" },
      { key: "entry_date", header: "تاريخ القيد" },
      { key: "debit_account_id", header: "معرف حساب المدين" },
      { key: "credit_account_id", header: "معرف حساب الدائن" },
      { key: "amount", header: "المبلغ" },
      { key: "currency", header: "العملة" },
      { key: "exchange_rate", header: "سعر الصرف" },
      { key: "base_amount", header: "المبلغ بالريال اليمني" },
      { key: "ref_type", header: "نوع المرجع" },
      { key: "ref_id", header: "معرف المرجع" },
      { key: "notes", header: "البيان والوصف" },
      { key: "status", header: "الحالة" },
      { key: "created_by", header: "أنشأ بواسطة" },
      { key: "created_at", header: "تاريخ الإنشاء" }
    ]
  },

  "purchases": {
    arabicSheet: "المشتريات_والموردون",
    prefix: "PUR",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "purchase_no", header: "رقم فاتورة الشراء" },
      { key: "supplier_name", header: "اسم المورد" },
      { key: "currency", header: "العملة" },
      { key: "exchange_rate", header: "سعر الصرف" },
      { key: "base_amount", header: "المبلغ بالريال اليمني" },
      { key: "transaction_id", header: "معرف المعاملة" },
      { key: "pay_type", header: "طريقة الدفع" },
      { key: "payment_source", header: "حساب الدفع" },
      { key: "date", header: "تاريخ الفاتورة" },
      { key: "transfer_no", header: "رقم الحوالة" },
      { key: "freight_cost", header: "تكلفة النقل والتوصيل" },
      { key: "transfer_fees", header: "رسوم التحويل" },
      { key: "receipt_url", header: "رابط صورة السند" },
      { key: "fabric_name", header: "اسم الصنف / القماش" },
      { key: "unit", header: "وحدة القياس" },
      { key: "quantity", header: "الكمية" },
      { key: "cost_per_unit", header: "السعر الإفرادي" },
      { key: "total", header: "الإجمالي" },
      { key: "payment_status", header: "حالة الدفع" },
      { key: "status", header: "حالة الاستلام" },
      { key: "notes", header: "ملاحظات" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "created_by", header: "أُنشئ بواسطة" }
    ]
  },

  "expenses": {
    arabicSheet: "المصروفات",
    prefix: "EXP",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "expense_no", header: "رقم السند" },
      { key: "category", header: "بند المصروف" },
      { key: "amount", header: "المبلغ" },
      { key: "currency", header: "العملة" },
      { key: "exchange_rate", header: "سعر الصرف" },
      { key: "base_amount", header: "المبلغ بالريال اليمني" },
      { key: "transaction_id", header: "معرف المعاملة" },
      { key: "date", header: "تاريخ الصرف" },
      { key: "payment_method", header: "طريقة الدفع" },
      { key: "recipient", header: "المستلم" },
      { key: "account_id", header: "الحساب المالي" },
      { key: "status", header: "الحالة" },
      { key: "notes", header: "البيان" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "created_by", header: "أنشأ بواسطة" }
    ]
  },

  "employees": {
    arabicSheet: "الموظفون",
    prefix: "EMP",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "name", header: "اسم الموظف" },
      { key: "role", header: "المسمى الوظيفي" },
      { key: "phone", header: "رقم الهاتف" },
      { key: "salary", header: "الراتب الأساسي" },
      { key: "currency", header: "العملة" },
      { key: "hire_date", header: "تاريخ التعيين" },
      { key: "status", header: "الحالة" },
      { key: "notes", header: "ملاحظات" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "updated_at", header: "تاريخ آخر تحديث" }
    ]
  },

  "payroll": {
    arabicSheet: "الرواتب",
    prefix: "PAYROLL",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "payroll_no", header: "رقم المسير" },
      { key: "employee_id", header: "معرف الموظف" },
      { key: "employee_name", header: "اسم الموظف" },
      { key: "month", header: "الشهر" },
      { key: "basic_salary", header: "الراتب الأساسي" },
      { key: "allowances", header: "البدلات" },
      { key: "deductions", header: "الخصومات" },
      { key: "net_salary", header: "صافي الراتب" },
      { key: "currency", header: "العملة" },
      { key: "payment_date", header: "تاريخ الصرف" },
      { key: "status", header: "الحالة" },
      { key: "notes", header: "ملاحظات" },
      { key: "created_at", header: "تاريخ الإنشاء" }
    ]
  },

  "users": {
    arabicSheet: "المستخدمون",
    prefix: "USR",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "username", header: "اسم المستخدم" },
      { key: "password_hash", header: "كلمة المرور المشفرة" },
      { key: "role", header: "الدور الوظيفي" },
      { key: "full_name", header: "الاسم الكامل" },
      { key: "is_active", header: "حالة التفعيل" },
      { key: "created_at", header: "تاريخ الإنشاء" }
    ]
  },

  "audit_logs": {
    arabicSheet: "سجل_التدقيق",
    prefix: "AUD",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "entity_type", header: "نوع الكيان" },
      { key: "entity_id", header: "معرف الكيان" },
      { key: "action", header: "الإجراء" },
      { key: "old_values", header: "القيم السابقة" },
      { key: "new_values", header: "القيم الجديدة" },
      { key: "user_id", header: "معرف المستخدم" },
      { key: "timestamp", header: "التوقيت الزمني" }
    ]
  },

  "number_sequences": {
    arabicSheet: "تسلسلات_الأرقام",
    prefix: "SEQ",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "entity", header: "اسم الكيان" },
      { key: "prefix", header: "البادئة" },
      { key: "current_number", header: "الرقم الحالي" },
      { key: "padding", header: "طول التعبئة" },
      { key: "updated_at", header: "تاريخ آخر تحديث" }
    ]
  },

  // --- QUALITY SUITE SCHEMAS ---
  "quality_inspections": {
    arabicSheet: "فحوصات_الجودة",
    prefix: "INSP",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "inspection_date", header: "تاريخ الفحص" },
      { key: "product_id", header: "معرف المنتج" },
      { key: "product_name", header: "اسم المنتج" },
      { key: "sku", header: "رمز المنتج" },
      { key: "model_id", header: "رقم الموديل" },
      { key: "color", header: "اللون" },
      { key: "size", header: "المقاس" },
      { key: "production_order_id", header: "معرف أمر الإنتاج" },
      { key: "production_stage", header: "مرحلة الإنتاج" },
      { key: "batch_id", header: "رقم الدفعة" },
      { key: "quantity_checked", header: "الكمية المفحوصة" },
      { key: "quantity_passed", header: "الكمية المقبولة" },
      { key: "quantity_failed", header: "الكمية المرفوضة" },
      { key: "inspection_result", header: "نتيجة الفحص" },
      { key: "inspector_id", header: "معرف الفاحص" },
      { key: "inspector_name", header: "اسم الفاحص" },
      { key: "notes", header: "ملاحظات" },
      { key: "attachment_url", header: "رابط المرفقات" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "updated_at", header: "تاريخ آخر تحديث" }
    ]
  },

  "quality_defects": {
    arabicSheet: "عيوب_الجودة",
    prefix: "DEF",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "defect_date", header: "تاريخ تسجيل العيب" },
      { key: "inspection_id", header: "معرف الفحص" },
      { key: "product_id", header: "معرف المنتج" },
      { key: "sku", header: "رمز المنتج" },
      { key: "model_id", header: "رقم الموديل" },
      { key: "color", header: "اللون" },
      { key: "size", header: "المقاس" },
      { key: "production_order_id", header: "معرف أمر الإنتاج" },
      { key: "production_stage", header: "مرحلة الإنتاج" },
      { key: "defect_type", header: "نوع العيب" },
      { key: "defect_category", header: "تصنيف العيب" },
      { key: "severity", header: "درجة الخطورة" },
      { key: "affected_quantity", header: "الكمية المتأثرة" },
      { key: "root_cause", header: "السبب الجذري" },
      { key: "corrective_action", header: "الإجراء التصحيحي" },
      { key: "preventive_action", header: "الإجراء الوقائي" },
      { key: "status", header: "الحالة" },
      { key: "assigned_to", header: "المسؤول عن المعالجة" },
      { key: "due_date", header: "تاريخ الاستحقاق" },
      { key: "resolved_date", header: "تاريخ الحل" },
      { key: "rework_cost", header: "تكلفة إعادة العمل" },
      { key: "waste_cost", header: "تكلفة الهدر" },
      { key: "return_cost", header: "تكلفة المرتجع" },
      { key: "total_cost", header: "إجمالي التكلفة" },
      { key: "notes", header: "ملاحظات" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "updated_at", header: "تاريخ آخر تحديث" }
    ]
  },

  "quality_feedback": {
    arabicSheet: "تقييمات_واستبيانات_العملاء",
    prefix: "FB",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "feedback_date", header: "تاريخ التقييم" },
      { key: "customer_id", header: "معرف العميل" },
      { key: "customer_name", header: "اسم العميل" },
      { key: "order_id", header: "معرف الطلب" },
      { key: "product_id", header: "معرف المنتج" },
      { key: "rating", header: "التقييم" },
      { key: "csat_score", header: "مؤشر الرضا" },
      { key: "nps_score", header: "مؤشر صافي الترويج" },
      { key: "feedback_category", header: "تصنيف التقييم" },
      { key: "feedback_comment", header: "تعليق العميل" },
      { key: "channel", header: "قناة التقييم" },
      { key: "status", header: "الحالة" },
      { key: "created_at", header: "تاريخ الإنشاء" }
    ]
  },

  "quality_complaints": {
    arabicSheet: "شكاوى_الجودة",
    prefix: "CMPL",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "complaint_date", header: "تاريخ الشكوى" },
      { key: "customer_id", header: "معرف العميل" },
      { key: "order_id", header: "معرف الطلب" },
      { key: "complaint_type", header: "نوع الشكوى" },
      { key: "severity", header: "درجة الخطورة" },
      { key: "description", header: "تفاصيل الشكوى" },
      { key: "assigned_to", header: "المسؤول عن المتابعة" },
      { key: "response_date", header: "تاريخ الرد" },
      { key: "compensation_cost", header: "تكلفة التعويض" },
      { key: "status", header: "الحالة" },
      { key: "created_at", header: "تاريخ الإنشاء" }
    ]
  },

  "quality_returns": {
    arabicSheet: "مرتجعات_الجودة",
    prefix: "RET",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "return_date", header: "تاريخ الإرجاع" },
      { key: "order_id", header: "معرف الطلب" },
      { key: "customer_id", header: "معرف العميل" },
      { key: "product_id", header: "معرف المنتج" },
      { key: "return_reason", header: "سبب الإرجاع" },
      { key: "condition", header: "حالة الفستان المرتجع" },
      { key: "action_taken", header: "الإجراء المتخذ" },
      { key: "refund_amount", header: "المبلغ المسترد" },
      { key: "replacement_cost", header: "تكلفة الاستبدال" },
      { key: "status", header: "الحالة" },
      { key: "created_at", header: "تاريخ الإنشاء" }
    ]
  },

  "quality_actions": {
    arabicSheet: "الإجراءات_التصحيحية_والوقائية",
    prefix: "CAPA",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "action_type", header: "نوع الإجراء" },
      { key: "defect_id", header: "معرف العيب" },
      { key: "complaint_id", header: "معرف الشكوى" },
      { key: "problem_statement", header: "المشكلة" },
      { key: "root_cause", header: "السبب الجذري" },
      { key: "action_description", header: "وصف الإجراء" },
      { key: "responsible_person", header: "المسؤول" },
      { key: "due_date", header: "تاريخ الاستحقاق" },
      { key: "completion_date", header: "تاريخ الإنجاز" },
      { key: "priority", header: "الأولوية" },
      { key: "status", header: "الحالة" },
      { key: "created_at", header: "تاريخ الإنشاء" }
    ]
  },

  "quality_checkpoints": {
    arabicSheet: "نقاط_ومعايير_الفحص",
    prefix: "CHK",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "checkpoint_name", header: "اسم نقطة الفحص" },
      { key: "production_stage", header: "مرحلة الإنتاج" },
      { key: "description", header: "الوصف" },
      { key: "required", header: "إلزامي" },
      { key: "criteria", header: "معايير القبول" },
      { key: "tolerance", header: "نسبة التفاوت المسموحة" },
      { key: "active", header: "الحالة" },
      { key: "created_at", header: "تاريخ الإنشاء" }
    ]
  },

  "quality_settings": {
    arabicSheet: "إعدادات_ومعايير_الجودة",
    prefix: "QSET",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "metric_name", header: "اسم المؤشر" },
      { key: "metric_code", header: "رمز المؤشر" },
      { key: "formula", header: "طريقة الحساب" },
      { key: "target", header: "الهدف المطلوب" },
      { key: "warning_threshold", header: "حد التحذير" },
      { key: "critical_threshold", header: "الحد الحرج" },
      { key: "weight", header: "الوزن النسبي" },
      { key: "active", header: "الحالة" },
      { key: "created_at", header: "تاريخ الإنشاء" }
    ]
  },

  "currencies": {
    arabicSheet: "العملات",
    prefix: "CURR",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "currency_code", header: "رمز العملة" },
      { key: "name", header: "اسم العملة" },
      { key: "symbol", header: "الرمز" },
      { key: "exchange_rate", header: "سعر الصرف" },
      { key: "is_base", header: "عملة أساسية" },
      { key: "is_active", header: "الحالة" },
      { key: "last_updated", header: "آخر تحديث" }
    ]
  }
};

/**
 * UTILITY & COMMON SERVICES
 */
function getSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;

  try {
    var files = DriveApp.getFilesByName("Little Princesses ERP Database");
    if (files.hasNext()) {
      return SpreadsheetApp.open(files.next());
    }
    var allSheets = DriveApp.getFilesByType(MimeType.GOOGLE_SHEETS);
    while (allSheets.hasNext()) {
      var f = allSheets.next();
      if (f.getName().indexOf("Little Princesses") !== -1) {
        return SpreadsheetApp.open(f);
      }
    }
  } catch(e) {
    Logger.log("DriveApp lookup error: " + e.message);
  }

  throw new Error("لم يتم العثور على ملف جدول بيانات Little Princesses ERP Database.");
}

function todayISO() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * SCHEMA MAPPER ENGINE
 */
var SchemaMapper = {
  getOrCreateSheet: function(entityKey) {
    var ss = getSpreadsheet();
    var schema = MASTER_SCHEMA_MAP[entityKey];
    if (!schema) throw new Error("Entity schema not found for: " + entityKey);

    var sheet = ss.getSheetByName(schema.arabicSheet);
    if (!sheet) {
      sheet = ss.insertSheet(schema.arabicSheet);
      var headers = schema.fields.map(function(f) { return f.header; });
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#2B0024").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);
    }
    return sheet;
  },

  readRows: function(entityKey) {
    var sheet = this.getOrCreateSheet(entityKey);
    var schema = MASTER_SCHEMA_MAP[entityKey];
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return [];

    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headerRow = values[0];
    var fieldMap = {};

    schema.fields.forEach(function(f) {
      var colIdx = -1;
      for (var c = 0; c < headerRow.length; c++) {
        var h = String(headerRow[c]).trim();
        if (h === f.header || h === f.key || h === f.header.replace(/\s+/g, '_') || h.indexOf(f.header) !== -1) {
          colIdx = c;
          break;
        }
      }
      if (colIdx !== -1) {
        fieldMap[f.key] = colIdx;
      }
    });

    if (fieldMap["id"] === undefined && headerRow.length > 0) {
      fieldMap["id"] = 0;
    }

    var records = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var empty = row.every(function(val) { return val === "" || val === null || val === undefined; });
      if (empty) continue;

      var obj = {};
      schema.fields.forEach(function(f) {
        var idx = fieldMap[f.key];
        var cellVal = (idx !== undefined && idx < row.length) ? row[idx] : "";
        if (cellVal instanceof Date) {
          cellVal = Utilities.formatDate(cellVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
        }
        obj[f.key] = cellVal;
      });

      if (!obj.id) {
        obj.id = String(row[0] || (schema.prefix + "-" + (r)));
      }
      records.push(obj);
    }
    return records;
  },

  buildRowArray: function(entityKey, dataObj) {
    var schema = MASTER_SCHEMA_MAP[entityKey];
    if (!schema) throw new Error("Entity schema not found for: " + entityKey);

    return schema.fields.map(function(f) {
      var val = dataObj[f.key];
      if (val === undefined || val === null) {
        val = dataObj[f.header] !== undefined ? dataObj[f.header] : "";
      }
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      // 🛡️ Google Sheets 50,000 character limit protection (e.g. large base64 images)
      if (typeof val === "string" && val.length > 45000) {
        val = val.substring(0, 45000);
      }
      return val;
    });
  },

  findRowIndexById: function(sheet, idVal) {
    if (!idVal) return -1;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(idVal).trim()) {
        return i + 2;
      }
    }
    return -1;
  },

  appendOrUpdateRow: function(entityKey, dataObj) {
    var sheet = this.getOrCreateSheet(entityKey);
    var idVal = dataObj.id || dataObj.transaction_id || dataObj.entry_no || dataObj.payment_no || dataObj.purchase_no || dataObj.order_no;
    var rowIdx = this.findRowIndexById(sheet, idVal);
    var rowArray = this.buildRowArray(entityKey, dataObj);
    
    if (rowIdx !== -1) {
      // Row already exists -> Update row to prevent duplicates (Idempotent Zero-Duplicate)
      sheet.getRange(rowIdx, 1, 1, rowArray.length).setValues([rowArray]);
      return { isUpdate: true, rowIndex: rowIdx };
    } else {
      // Row does not exist -> Append new row
      sheet.appendRow(rowArray);
      return { isUpdate: false, rowIndex: sheet.getLastRow() };
    }
  }
};

/**
 * NUMBER SEQUENCES SERVICE
 */
var SequenceService = {
  getNextId: function(entityKey, prefixOverride) {
    var schema = MASTER_SCHEMA_MAP[entityKey];
    var prefix = prefixOverride || (schema ? schema.prefix : "REC");
    var sheet = SchemaMapper.getOrCreateSheet("number_sequences");
    var records = SchemaMapper.readRows("number_sequences");

    var seqRecord = null;
    var rowIndex = -1;
    for (var i = 0; i < records.length; i++) {
      if (records[i].entity === entityKey || records[i].prefix === prefix) {
        seqRecord = records[i];
        rowIndex = SchemaMapper.findRowIndexById(sheet, seqRecord.id);
        break;
      }
    }

    var nextNum = 1;
    var padding = 6;
    if (seqRecord) {
      nextNum = Number(seqRecord.current_number || 0) + 1;
      padding = Number(seqRecord.padding || 6);
      seqRecord.current_number = nextNum;
      seqRecord.updated_at = todayISO();
      var rowArray = SchemaMapper.buildRowArray("number_sequences", seqRecord);
      sheet.getRange(rowIndex, 1, 1, rowArray.length).setValues([rowArray]);
    } else {
      var newSeqId = "SEQ-" + prefix;
      var newSeq = {
        id: newSeqId,
        entity: entityKey,
        prefix: prefix,
        current_number: 1,
        padding: 6,
        updated_at: todayISO()
      };
      sheet.appendRow(SchemaMapper.buildRowArray("number_sequences", newSeq));
    }

    var numStr = String(nextNum);
    while (numStr.length < padding) {
      numStr = "0" + numStr;
    }
    return prefix + "-" + numStr;
  }
};

/**
 * AUDIT LOGGING SERVICE
 */
var AuditService = {
  log: function(entityType, entityId, action, oldVal, newVal, userId) {
    try {
      var sheet = SchemaMapper.getOrCreateSheet("audit_logs");
      var newId = SequenceService.getNextId("audit_logs", "AUD");
      var auditRecord = {
        id: newId,
        entity_type: entityType,
        entity_id: entityId,
        action: action,
        old_values: typeof oldVal === "object" ? JSON.stringify(oldVal) : String(oldVal || ""),
        new_values: typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal || ""),
        user_id: userId || "system",
        timestamp: new Date().toISOString()
      };
      sheet.appendRow(SchemaMapper.buildRowArray("audit_logs", auditRecord));
    } catch (e) {
      Logger.log("Audit log warning: " + e.message);
    }
  }
};

/**
 * INVENTORY MOVEMENT SERVICE
 */
var InventoryMovementService = {
  recordMovement: function(params) {
    try {
      var sheet = SchemaMapper.getOrCreateSheet("inventory_transactions");
      var newId = SequenceService.getNextId("inventory_transactions", "INV-TXN");
      var txn = {
        id: newId,
        product_id: params.product_id || "",
        variant_id: params.variant_id || "",
        fabric_id: params.fabric_id || "",
        warehouse_id: params.warehouse_id || "WH-MAIN",
        transaction_type: params.transaction_type || "PURCHASE_RECEIPT",
        quantity: Number(params.quantity || 0),
        unit_cost: Number(params.unit_cost || 0),
        reference_type: params.reference_type || "PURCHASE",
        reference_id: params.reference_id || "",
        notes: params.notes || "",
        created_at: todayISO(),
        created_by: params.created_by || "system"
      };
      sheet.appendRow(SchemaMapper.buildRowArray("inventory_transactions", txn));
    } catch (e) {
      Logger.log("Inventory Movement warning: " + e.message);
    }
  }
};

/**
 * CONTROLLERS
 */
var CustomerController = {
  getCustomers: function() { return SchemaMapper.readRows("customers"); },
  addCustomer: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("customers");
    var newId = data.id || SequenceService.getNextId("customers", "CUST");
    data.id = newId;
    data.created_at = data.created_at || todayISO();
    data.updated_at = todayISO();
    sheet.appendRow(SchemaMapper.buildRowArray("customers", data));
    AuditService.log("customer", newId, "CREATE", null, data, data.created_by);
    return { id: newId, message: "تم تسجيل العميل بنجاح", data: data };
  }
};

var OrderController = {
  getOrders: function() { return SchemaMapper.readRows("orders"); },
  addOrder: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("orders");
    var newId = data.id || SequenceService.getNextId("orders", "ORD");
    data.id = newId;
    data.order_no = data.order_no || ("INV-" + newId.replace("ORD-", ""));
    data.order_date = data.order_date || todayISO();
    data.created_at = todayISO();
    data.updated_at = todayISO();
    sheet.appendRow(SchemaMapper.buildRowArray("orders", data));
    AuditService.log("sales_order", newId, "CREATE", null, data, data.created_by);
    return { id: newId, order_no: data.order_no, message: "تم إصدار الفاتورة بنجاح", data: data };
  }
};

var InventoryController = {
  getInventory: function() {
    var raw = SchemaMapper.readRows("inventory");
    return raw.map(function(r) {
      var q = Number(r.quantity !== undefined && r.quantity !== "" ? r.quantity : (r.qty !== undefined && r.qty !== "" ? r.qty : 0));
      var c = Number(r.unit_cost !== undefined && r.unit_cost !== "" ? r.unit_cost : (r.cost !== undefined && r.cost !== "" ? r.cost : 0));
      var tot = Number(r.total_value || (q * c));
      var name = r.name || r.item_name || "";
      return {
        id: r.id,
        item_code: r.item_code || r.id,
        name: name,
        item_name: name,
        category: r.category || "أقمشة وخامات",
        type: r.type || "خامة",
        unit: r.unit || "متر",
        quantity: q,
        quantity_meters: q,
        qty: q,
        unit_cost: c,
        cost_per_meter: c,
        cost: c,
        cost_per_unit: c,
        total_value: tot,
        min_limit: Number(r.min_limit || 5),
        status: r.status || "متوفر",
        supplier_id: r.supplier_id || "",
        location: r.location || "المستودع الرئيسي",
        created_at: r.created_at || todayISO(),
        updated_at: r.updated_at || todayISO()
      };
    });
  },

  addOrUpdateItem: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("inventory");
    var records = SchemaMapper.readRows("inventory");
    var itemName = String(data.name || data.item_name || "").trim();
    var itemCode = String(data.item_code || "").trim();
    var existing = null;
    var existingRowIdx = -1;

    for (var i = 0; i < records.length; i++) {
      var rName = String(records[i].name || records[i].item_name || "").trim();
      var rCode = String(records[i].item_code || "").trim();
      if ((itemName && rName === itemName) || (itemCode && rCode === itemCode) || (data.id && String(records[i].id) === String(data.id))) {
        existing = records[i];
        existingRowIdx = SchemaMapper.findRowIndexById(sheet, existing.id);
        break;
      }
    }

    var addQty = Number(data.quantity !== undefined ? data.quantity : (data.qty !== undefined ? data.qty : (data.quantity_meters || 0)));
    var unitPrice = Number(data.unit_cost !== undefined ? data.unit_cost : (data.cost_per_unit !== undefined ? data.cost_per_unit : (data.cost_per_meter !== undefined ? data.cost_per_meter : (data.cost || data.price || 0))));

    if (existing && existingRowIdx !== -1) {
      var currentQty = Number(existing.quantity !== undefined ? existing.quantity : (existing.qty || 0));
      var currentCost = Number(existing.unit_cost !== undefined ? existing.unit_cost : (existing.cost || 0));
      var newQty = currentQty + addQty;
      var newCost = newQty > 0 ? (((currentQty * currentCost) + (addQty * (unitPrice || currentCost))) / newQty) : (unitPrice || currentCost);
      var curAvail = Number(existing.available_qty !== undefined ? existing.available_qty : currentQty);
      existing.name = itemName || existing.name;
      existing.quantity = newQty;
      existing.available_qty = curAvail + addQty;
      existing.unit_cost = Number(newCost.toFixed(2));
      existing.total_value = Number((newQty * newCost).toFixed(2));
      if (data.supplier_id) existing.supplier_id = data.supplier_id;
      if (data.location) existing.location = data.location;
      existing.updated_at = todayISO();

      var rowArray = SchemaMapper.buildRowArray("inventory", existing);
      sheet.getRange(existingRowIdx, 1, 1, rowArray.length).setValues([rowArray]);
      try {
        sheet.getRange(existingRowIdx, 7, 1, 3).setNumberFormat("0.##");
        sheet.getRange(existingRowIdx, 11, 1, 2).setNumberFormat("0.##");
      } catch(e) {}
      return { id: existing.id, updated: true, data: existing };
    } else {
      var newId = data.id || SequenceService.getNextId("inventory", "MAT");
      var newItem = {
        id: newId,
        item_code: itemCode || newId,
        name: itemName || "خامة جديدة",
        type: data.type || "خامة",
        category: data.category || "أقمشة وخامات",
        unit: data.unit || "متر",
        quantity: addQty,
        available_qty: addQty,
        reserved_qty: 0,
        min_limit: Number(data.min_limit || 5),
        unit_cost: unitPrice,
        total_value: Number((addQty * unitPrice).toFixed(2)),
        supplier_id: data.supplier_id || "",
        location: data.location || "المستودع الرئيسي",
        status: "متوفر",
        created_at: todayISO(),
        updated_at: todayISO()
      };

      sheet.appendRow(SchemaMapper.buildRowArray("inventory", newItem));
      try {
        var lastRow = sheet.getLastRow();
        sheet.getRange(lastRow, 7, 1, 3).setNumberFormat("0.##");
        sheet.getRange(lastRow, 11, 1, 2).setNumberFormat("0.##");
      } catch(e) {}
      return { id: newId, created: true, data: newItem };
    }
  },

  updateInventoryQty: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("inventory");
    var itemName = String(data.item_name || data.name || "").trim();
    var qtyToDeduct = Number(data.qty_to_deduct || data.quantity || 0);

    if (!itemName || qtyToDeduct <= 0) return { success: false, error: "اسم الخامة والكمية مطلوبان" };

    var records = SchemaMapper.readRows("inventory");
    for (var i = 0; i < records.length; i++) {
      var rName = String(records[i].name || records[i].item_name || "").trim();
      if (rName === itemName) {
        var existing = records[i];
        var rowIdx = SchemaMapper.findRowIndexById(sheet, existing.id);
        var currentQty = Number(existing.quantity || 0);
        var currentAvail = Number(existing.available_qty !== undefined ? existing.available_qty : currentQty);
        var newQty = Math.max(0, currentQty - qtyToDeduct);
        var newAvail = Math.max(0, currentAvail - qtyToDeduct);
        var unitCost = Number(existing.unit_cost || 0);

        existing.quantity = newQty;
        existing.available_qty = newAvail;
        existing.total_value = Number((newQty * unitCost).toFixed(2));
        existing.updated_at = todayISO();

        var rowArray = SchemaMapper.buildRowArray("inventory", existing);
        sheet.getRange(rowIdx, 1, 1, rowArray.length).setValues([rowArray]);
        try {
          sheet.getRange(rowIdx, 7, 1, 3).setNumberFormat("0.##");
          sheet.getRange(rowIdx, 11, 1, 2).setNumberFormat("0.##");
        } catch(e) {}
        return { success: true, id: existing.id, new_quantity: newQty };
      }
    }
    return { success: false, error: "لم يتم العثور على الخامة في المخزون" };
  },

  deleteItem: function(payload) {
    var data = payload.data || payload;
    return SchemaMapper.softDelete("inventory", data.id);
  }
};

var PurchaseController = {
  getPurchases: function() { return SchemaMapper.readRows("purchases"); },

  removeDuplicates: function() {
    var sheet = SchemaMapper.getOrCreateSheet("purchases");
    var records = SchemaMapper.readRows("purchases");
    var seen = {};
    var uniqueRows = [];
    var removedCount = 0;

    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var purNo = String(r.purchase_no || "").trim();
      var fabric = String(r.fabric_name || r.item_name || r.item || "").trim();
      var q = String(r.quantity || r.qty || "");
      var key = purNo && fabric ? (purNo + "___" + fabric + "___" + q) : r.id;

      if (!seen[key]) {
        seen[key] = true;
        uniqueRows.push(SchemaMapper.buildRowArray("purchases", r));
      } else {
        removedCount++;
      }
    }

    if (removedCount > 0 && uniqueRows.length > 0) {
      for (var rIdx = 0; rIdx < uniqueRows.length; rIdx++) {
        for (var cIdx = 0; cIdx < uniqueRows[rIdx].length; cIdx++) {
          if (typeof uniqueRows[rIdx][cIdx] === "string" && uniqueRows[rIdx][cIdx].length > 45000) {
            uniqueRows[rIdx][cIdx] = uniqueRows[rIdx][cIdx].substring(0, 45000);
          }
        }
      }
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      sheet.getRange(2, 1, uniqueRows.length, uniqueRows[0].length).setValues(uniqueRows);
    }
    return { count: uniqueRows.length, removed: removedCount };
  },

  addPurchase: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("purchases");
    var purchaseNo = String(data.purchase_no || data.bill_no || "").trim();
    var fabricName = String(data.fabric_name || data.item || data.item_name || data.name || "").trim();
    var qty = Number(data.quantity || data.qty || 1);
    var cost = Number(data.cost_per_unit || data.cost || data.price || 0);

    // 🛡️ Deduplication Guard
    if (purchaseNo && fabricName) {
      var records = SchemaMapper.readRows("purchases");
      for (var i = 0; i < records.length; i++) {
        var rPurNo = String(records[i].purchase_no || "").trim();
        var rFabric = String(records[i].fabric_name || records[i].item_name || records[i].item || "").trim();
        var rQty = Number(records[i].quantity || records[i].qty || 0);
        if (rPurNo === purchaseNo && rFabric === fabricName && Math.abs(rQty - qty) < 0.001) {
          return { id: records[i].id, duplicate: true, message: "تم تسجيل الصنف مسبقاً في هذه الفاتورة", data: records[i] };
        }
      }
    }

    var newId = data.id || SequenceService.getNextId("purchases", "PUR");
    var now = todayISO();
    var total = Number(data.total || (qty * cost));
    var freight = Number(data.freight_cost || 0);
    var fees = Number(data.transfer_fees || 0);
    var grandPayTotal = total + freight + fees;

    data.id = newId;
    data.purchase_no = purchaseNo || newId;
    data.supplier_name = data.supplier_name || data.supplier || "مورد عام";
    data.currency = data.currency || "YER ﷼";
    data.exchange_rate = Number(data.exchange_rate) > 0 ? Number(data.exchange_rate) : 1.0;
    data.base_amount = Number(data.base_amount) > 0 ? Number(data.base_amount) : Number((total * data.exchange_rate).toFixed(2));
    data.transaction_id = data.transaction_id || ("TX-" + (purchaseNo || newId));
    data.pay_type = data.pay_type || "نقدي";
    data.payment_source = data.payment_source || "101 - الصندوق الرئيسي";
    data.date = data.date || now;
    data.transfer_no = data.transfer_no || "";
    data.freight_cost = freight;
    data.transfer_fees = fees;
    data.receipt_url = data.receipt_url || "";
    data.fabric_name = fabricName || "قماش / خامة";
    data.unit = data.unit || "متر";
    data.quantity = qty;
    data.cost_per_unit = cost;
    data.total = total;
    data.payment_status = data.payment_status || "مدفوع";
    data.status = data.status || "تم الاستلام";
    data.notes = data.notes || "";
    data.created_at = now;
    data.created_by = data.created_by || "system";

    var newRow = SchemaMapper.buildRowArray("purchases", data);
    sheet.appendRow(newRow);
    try {
      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 14, 1, 3).setNumberFormat("0.##");
    } catch(e) {}

    // 1. Inventory Auto-increment & Weighted Average Costing & Warehouses location
    InventoryController.addOrUpdateItem({
      name: data.fabric_name,
      quantity: qty,
      unit_cost: cost,
      unit: data.unit,
      supplier_id: data.supplier_name,
      location: data.location || "المستودع الرئيسي"
    });

    // 2. Record inventory movement
    InventoryMovementService.recordMovement({
      fabric_id: data.fabric_name,
      transaction_type: "PURCHASE_RECEIPT",
      quantity: qty,
      unit_cost: cost,
      reference_type: "PURCHASE",
      reference_id: data.purchase_no,
      notes: "توريد مخزون من فاتورة شراء " + data.purchase_no + " - " + data.supplier_name,
      created_by: data.created_by
    });

    // 3. Generate Payment Voucher if cash/bank
    if (data.pay_type !== "آجل") {
      var grandPayTotal = total + freight + fees;
      VoucherController.addVoucher({
        voucher_no: "PV-" + data.purchase_no,
        payment_type: "سند صرف",
        amount: grandPayTotal,
        currency: data.currency,
        payment_method: data.pay_type,
        supplier_id: data.supplier_name,
        reference_no: data.transfer_no || data.purchase_no,
        account_id: data.payment_source,
        date: data.date,
        notes: "سند صرف مشتريات للفاتورة " + data.purchase_no + " - " + data.supplier_name
      });

      // 4. Balanced Journal Entry (Cash/Bank)
      JournalController.addJournalEntry({
        entry_no: "JV-PUR-" + data.purchase_no,
        debit_account_id: "1103 - مخزون خامات وأقمشة",
        credit_account_id: data.payment_source || "1101 - الصندوق الرئيسي",
        amount: grandPayTotal,
        currency: data.currency,
        ref_type: "PURCHASE",
        ref_id: data.purchase_no,
        notes: "قيد إثبات مشتريات نقداً للفاتورة " + data.purchase_no + " - " + data.supplier_name
      });
    } else {
      // 4. Balanced Journal Entry (Credit / آجل)
      JournalController.addJournalEntry({
        entry_no: "JV-PUR-" + data.purchase_no,
        debit_account_id: "1103 - مخزون خامات وأقمشة",
        credit_account_id: "2101 - ذمم الموردين ومحلات الأقمشة (" + data.supplier_name + ")",
        amount: grandPayTotal,
        currency: data.currency,
        ref_type: "PURCHASE",
        ref_id: data.purchase_no,
        notes: "قيد إثبات مشتريات آجلة للفاتورة " + data.purchase_no + " - المورد: " + data.supplier_name
      });
    }

    AuditService.log("purchase", newId, "CREATE", null, data, data.created_by);
    return { id: newId, message: "تم تسجيل فاتورة الشراء وتوريد الأصناف وتوليد السندات بنجاح", data: data };
  }
};

var VoucherController = {
  getVouchers: function() { 
    var raw = SchemaMapper.readRows("payments"); 
    return raw.map(function(r) {
      var rawNo = r.payment_no || r.voucher_no || r.v_no || r.id || "";
      var rawType = r.payment_type || r.voucher_type || r.v_type || (String(rawNo).indexOf("PV") !== -1 ? "سند صرف" : "سند قبض");
      var isReceipt = rawType === "سند قبض" || rawType === "RECEIPT" || rawType === "قبض";
      var party = r.customer_id || r.supplier_id || r.party_name || r.party || "";
      return {
        id: r.id,
        v_no: rawNo,
        voucher_no: rawNo,
        payment_no: rawNo,
        v_type: isReceipt ? "سند قبض" : "سند صرف",
        voucher_type: isReceipt ? "سند قبض" : "سند صرف",
        payment_type: isReceipt ? "سند قبض" : "سند صرف",
        party: party || (isReceipt ? "عميلة عامة" : "مورد عام"),
        party_name: party || (isReceipt ? "عميلة عامة" : "مورد عام"),
        customer_id: isReceipt ? party : (r.customer_id || ""),
        supplier_id: !isReceipt ? party : (r.supplier_id || ""),
        amount: Number(r.amount || 0),
        currency: r.currency || "YER ﷼",
        pay_method: r.payment_method || r.pay_method || "نقدي",
        payment_method: r.payment_method || r.pay_method || "نقدي",
        reference_no: r.reference_no || r.order_id || r.invoice_id || "",
        account_id: r.account_id || "101 - الصندوق الرئيسي",
        date: r.date || r.created_at || todayISO(),
        date_created: r.date || r.created_at || todayISO(),
        status: r.status || "posted",
        notes: r.notes || ""
      };
    });
  },
  addVoucher: function(payload) {
    var data = payload.data || payload;
    var newId = data.id || SequenceService.getNextId("payments", "PAY");
    data.id = newId;
    data.payment_no = data.payment_no || data.voucher_no || data.v_no || newId;
    var isReceipt = data.v_type === 'سند قبض' || data.payment_type === 'سند قبض' || data.voucher_type === 'سند قبض';
    data.payment_type = isReceipt ? "سند قبض" : "سند صرف";
    data.voucher_type = data.payment_type;
    data.customer_id = data.customer_id || (isReceipt ? (data.party || data.party_name || "") : "");
    data.supplier_id = data.supplier_id || (!isReceipt ? (data.party || data.party_name || "") : "");
    data.party_name = data.party || data.party_name || data.supplier_id || data.customer_id || "";
    data.payment_method = data.payment_method || data.pay_method || data.pay_type || "نقدي";
    data.account_id = data.account_id || data.acc_code || data.payment_source || "101 - الصندوق الرئيسي";
    data.date = data.date || data.date_created || todayISO();
    data.status = "posted";
    data.created_at = data.created_at || todayISO();
    data.created_by = data.created_by || "system";
    var result = SchemaMapper.appendOrUpdateRow("payments", data);
    AuditService.log("voucher", newId, result.isUpdate ? "UPDATE" : "CREATE", null, data, data.created_by);
    return { id: newId, message: result.isUpdate ? "تم تحديث السند المالي بنجاح" : "تم حفظ السند المالي بنجاح", data: data };
  }
};

var JournalController = {
  getJournalEntries: function() { return SchemaMapper.readRows("journal_entries"); },
  addJournalEntry: function(payload) {
    var data = payload.data || payload;
    var newId = data.id || SequenceService.getNextId("journal_entries", "JV");
    data.id = newId;
    data.entry_no = data.entry_no || newId;
    data.entry_date = data.entry_date || data.date || todayISO();
    data.status = "posted";
    data.created_at = data.created_at || todayISO();
    data.created_by = data.created_by || "system";
    var result = SchemaMapper.appendOrUpdateRow("journal_entries", data);
    AuditService.log("journal_entry", newId, result.isUpdate ? "UPDATE" : "POST", null, data, data.created_by);
    return { id: newId, message: result.isUpdate ? "تم تحديث القيد اليومي بنجاح" : "تم ترحيل القيد اليومي بنجاح", data: data };
  }
};

var ProductController = {
  getProducts: function() { return SchemaMapper.readRows("products"); },
  addProduct: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("products");
    var newId = data.id || SequenceService.getNextId("products", "PROD");
    data.id = newId;
    data.sku = data.sku || ("DRS-" + newId.replace("PROD-", ""));
    data.created_at = todayISO();
    data.updated_at = todayISO();
    sheet.appendRow(SchemaMapper.buildRowArray("products", data));
    AuditService.log("product", newId, "CREATE", null, data, data.created_by);
    return { id: newId, sku: data.sku, message: "تم إضافة المنتج بنجاح", data: data };
  }
};

var ExpenseController = {
  getExpenses: function() { return SchemaMapper.readRows("expenses"); },
  addExpense: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("expenses");
    var newId = data.id || SequenceService.getNextId("expenses", "EXP");
    var now = todayISO();
    var amount = Number(data.amount || 0);
    var rate = Number(data.exchange_rate) > 0 ? Number(data.exchange_rate) : 1.0;
    var baseAmount = Number(data.base_amount) > 0 ? Number(data.base_amount) : Number((amount * rate).toFixed(2));

    data.id = newId;
    data.expense_no = data.expense_no || newId;
    data.category = data.category || "مصروفات عامة";
    data.amount = amount;
    data.currency = data.currency || "YER ﷼";
    data.exchange_rate = rate;
    data.base_amount = baseAmount;
    data.transaction_id = data.transaction_id || ("TX-" + (data.expense_no || newId));
    data.date = data.date || now;
    data.payment_method = data.payment_method || data.pay_method || "نقدي";
    data.recipient = data.recipient || "";
    data.account_id = data.account_id || "501 - مصروفات تشغيلية";
    data.status = "posted";
    data.notes = data.notes || "";
    data.created_at = now;
    data.created_by = data.created_by || "system";

    var result = SchemaMapper.appendOrUpdateRow("expenses", data);
    AuditService.log("expense", newId, result.isUpdate ? "UPDATE" : "CREATE", null, data, data.created_by);
    return { id: newId, message: result.isUpdate ? "تم تحديث المصروف بنجاح" : "تم تسجيل المصروف بنجاح", data: data };
  }
};

var QualityController = {
  getInspections: function() { return SchemaMapper.readRows("quality_inspections"); },
  getDefects: function() { return SchemaMapper.readRows("quality_defects"); },
  getFeedback: function() { return SchemaMapper.readRows("quality_feedback"); },
  getComplaints: function() { return SchemaMapper.readRows("quality_complaints"); },
  getReturns: function() { return SchemaMapper.readRows("quality_returns"); },
  getCorrectiveActions: function() { return SchemaMapper.readRows("quality_actions"); },
  getCheckpoints: function() { return SchemaMapper.readRows("quality_checkpoints"); },
  getSettings: function() { return SchemaMapper.readRows("quality_settings"); },

  addInspection: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("quality_inspections");
    var newId = data.id || SequenceService.getNextId("quality_inspections", "INSP");
    data.id = newId;
    data.inspection_date = data.inspection_date || todayISO();
    data.created_at = todayISO();
    data.updated_at = todayISO();
    sheet.appendRow(SchemaMapper.buildRowArray("quality_inspections", data));
    return { id: newId, message: "تم حفظ فحص الجودة بنجاح", data: data };
  }
};

/**
 * CURRENCY CONTROLLER & EXCHANGE RATE SERVICE
 */
var CurrencyController = {
  getCurrencies: function() {
    var sheet = SchemaMapper.getOrCreateSheet("currencies");
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      var now = todayISO();
      var defaultRows = [
        { id: "CURR-YER", currency_code: "YER", name: "ريال يمني", symbol: "﷼", exchange_rate: 1.0, is_base: true, is_active: true, last_updated: now },
        { id: "CURR-SAR", currency_code: "SAR", name: "ريال سعودي", symbol: "﷼", exchange_rate: 142.5, is_base: false, is_active: true, last_updated: now },
        { id: "CURR-USD", currency_code: "USD", name: "دولار أمريكي", symbol: "$", exchange_rate: 535.0, is_base: false, is_active: true, last_updated: now }
      ];
      defaultRows.forEach(function(r) {
        sheet.appendRow(SchemaMapper.buildRowArray("currencies", r));
      });
    }
    return SchemaMapper.readRows("currencies");
  },

  updateExchangeRate: function(payload) {
    var data = payload.data || payload;
    var code = String(data.currency_code || data.code || "").trim().toUpperCase();
    var rate = parseFloat(data.exchange_rate || data.rate);
    if (!code) throw new Error("Missing currency_code.");
    if (isNaN(rate) || rate <= 0) throw new Error("Invalid exchange rate value.");
    if (code === "YER") throw new Error("Base currency (YER) rate is locked to 1.0.");

    var sheet = SchemaMapper.getOrCreateSheet("currencies");
    var rows = SchemaMapper.readRows("currencies");
    var target = rows.find(function(r) { return String(r.currency_code).trim().toUpperCase() === code; });
    var now = todayISO();

    var updatedObj = {
      id: target ? target.id : ("CURR-" + code),
      currency_code: code,
      name: target ? target.name : (code === "SAR" ? "ريال سعودي" : "دولار أمريكي"),
      symbol: target ? target.symbol : (code === "SAR" ? "﷼" : "$"),
      exchange_rate: rate,
      is_base: false,
      is_active: true,
      last_updated: now
    };

    SchemaMapper.appendOrUpdateRow("currencies", updatedObj);
    return { success: true, currency_code: code, exchange_rate: rate, last_updated: now };
  }
};

/**
 * APPENDS EXCHANGE GAIN / LOSS ACCOUNTS SAFELY
 */
function appendExchangeDiffAccounts() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("دليل_الحسابات") || ss.getSheetByName("Accounts") || ss.getSheetByName("chart_of_accounts");
  if (!sheet) return { success: false, message: "Accounts sheet not found" };

  var lastRow = sheet.getLastRow();
  var existingData = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 3).getValues() : [];
  var hasGain = false;
  var hasLoss = false;

  for (var i = 0; i < existingData.length; i++) {
    var code = String(existingData[i][1] || existingData[i][0]);
    var name = String(existingData[i][2] || existingData[i][1]);
    if (code === "402" || name.indexOf("أرباح فروق") !== -1) hasGain = true;
    if (code === "506" || name.indexOf("خسائر فروق") !== -1) hasLoss = true;
  }

  var now = todayISO();
  if (!hasGain) {
    sheet.appendRow([
      "ACC-402", "402", "أرباح فروق أسعار صرف العملات", "Foreign Exchange Gain",
      "إيرادات", "إيرادات أخرى", "4", "4", 2, "4 > 402",
      0, 1, 1, "credit", 0, 0, "credit", "YER", now, "حساب آلي لفروق العملات الإيجابية", now, "system"
    ]);
  }
  if (!hasLoss) {
    sheet.appendRow([
      "ACC-506", "506", "خسائر فروق أسعار صرف العملات", "Foreign Exchange Loss",
      "مصروفات", "مصروفات أخرى", "6", "6", 2, "6 > 506",
      0, 1, 1, "debit", 0, 0, "debit", "YER", now, "حساب آلي لفروق العملات السلبية", now, "system"
    ]);
  }
  return { success: true, message: "تم إضافة وتحديث حسابات فروق العملات بنجاح" };
}

/**
 * AUTOMATED DATABASE MIGRATION ENGINE
 */
function migrateToMasterArabicDatabase() {
  var ss = getSpreadsheet();
  var legacyToCanonicalMap = {
    "customers": "العملاء",
    "children": "الأطفال",
    "measurements": "المقاسات",
    "measurement_profiles": "المقاسات",
    "products": "المنتجات",
    "orders": "الطلبات",
    "sales_orders": "الطلبات",
    "invoices": "الطلبات",
    "payments": "السندات_المالية",
    "vouchers": "السندات_المالية",
    "السندات المالية": "السندات_المالية",
    "inventory": "المخزون_والمستودعات",
    "المخزون": "المخزون_والمستودعات",
    "inventory_transactions": "حركات_المخزون",
    "حركات المخزون": "حركات_المخزون",
    "production_orders": "أوامر_الإنتاج",
    "أوامر الإنتاج": "أوامر_الإنتاج",
    "chart_of_accounts": "دليل_الحسابات",
    "شجرة الحسابات": "دليل_الحسابات",
    "دليل الحسابات": "دليل_الحسابات",
    "journal_entries": "القيود_اليومية",
    "القيود اليومية": "القيود_اليومية",

    // 🛒 PURCHASES CANONICAL MAPPING
    "purchases": "المشتريات_والموردون",
    "Purchases": "المشتريات_والموردون",
    "المشتريات": "المشتريات_والموردون",
    "المشتريات والموردون": "المشتريات_والموردون",
    "طلبات الشراء": "المشتريات_والموردون",
    "طلبات_الشراء": "المشتريات_والموردون",

    "expenses": "المصروفات",
    "employees": "الموظفون",
    "payroll": "الرواتب",
    "users": "المستخدمون",
    "audit_logs": "سجل_التدقيق",
    "number_sequences": "تسلسلات_الأرقام",

    // QUALITY SUITE
    "quality_inspections": "فحوصات_الجودة",
    "فحوصات الجودة": "فحوصات_الجودة",
    "quality_defects": "عيوب_الجودة",
    "عيوب الجودة": "عيوب_الجودة",
    "quality_feedback": "تقييمات_واستبيانات_العملاء",
    "تقييمات واستبيانات العملاء": "تقييمات_واستبيانات_العملاء",
    "quality_complaints": "شكاوى_الجودة",
    "شكاوى الجودة": "شكاوى_الجودة",
    "quality_returns": "مرتجعات_الجودة",
    "مرتجعات الجودة": "مرتجعات_الجودة",
    "quality_actions": "الإجراءات_التصحيحية_والوقائية",
    "الإجراءات التصحيحية والوقائية": "الإجراءات_التصحيحية_والوقائية",
    "quality_checkpoints": "نقاط_ومعايير_الفحص",
    "نقاط ومعايير الفحص": "نقاط_ومعايير_الفحص",
    "quality_settings": "إعدادات_ومعايير_الجودة",
    "إعدادات ومعايير الجودة": "إعدادات_ومعايير_الجودة"
  };

  // 1. Rename existing legacy sheets safely
  for (var legacyName in legacyToCanonicalMap) {
    var targetName = legacyToCanonicalMap[legacyName];
    var sheet = ss.getSheetByName(legacyName);
    if (sheet && legacyName !== targetName) {
      var existingTarget = ss.getSheetByName(targetName);
      if (!existingTarget) {
        sheet.setName(targetName);
        Logger.log("Renamed sheet: " + legacyName + " -> " + targetName);
      }
    }
  }

  // 2. Standardize headers and Column A = المعرف
  for (var entityKey in MASTER_SCHEMA_MAP) {
    var schema = MASTER_SCHEMA_MAP[entityKey];
    var sheet = ss.getSheetByName(schema.arabicSheet);
    if (sheet) {
      var headers = schema.fields.map(function(f) { return f.header; });
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#2B0024").setFontColor("#FFFFFF");
      sheet.setFrozenRows(1);

      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var idColValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        var needsIdUpdate = false;
        for (var r = 0; r < idColValues.length; r++) {
          if (!idColValues[r][0] || String(idColValues[r][0]).trim() === "") {
            var num = String(r + 1);
            while (num.length < 6) num = "0" + num;
            idColValues[r][0] = schema.prefix + "-" + num;
            needsIdUpdate = true;
          }
        }
        if (needsIdUpdate) {
          sheet.getRange(2, 1, lastRow - 1, 1).setValues(idColValues);
        }
      }
    } else {
      SchemaMapper.getOrCreateSheet(entityKey);
    }
  }

  // 3. Deduplicate purchases sheet if any duplicates exist
  try {
    var purSheet = ss.getSheetByName("المشتريات_والموردون");
    if (purSheet && purSheet.getLastRow() > 2) {
      var purRows = purSheet.getRange(2, 1, purSheet.getLastRow() - 1, purSheet.getLastColumn()).getValues();
      var seenKeys = {};
      var uniqueRows = [];
      for (var pIdx = 0; pIdx < purRows.length; pIdx++) {
        var row = purRows[pIdx];
        var pBill = String(row[1] || "").trim(); // purchase_no
        var pItem = String(row[11] || row[2] || "").trim(); // fabric_name
        var pQty = String(row[13] || "").trim();
        var key = pBill + "_" + pItem + "_" + pQty;
        if (!key || key === "__" || !seenKeys[key]) {
          if (key && key !== "__") seenKeys[key] = true;
          uniqueRows.push(row);
        }
      }
      if (uniqueRows.length <= purRows.length && uniqueRows.length > 0) {
        // 🛡️ Sanitize cells against Google Sheets 50,000 character limit (base64 image URLs)
        for (var rIdx = 0; rIdx < uniqueRows.length; rIdx++) {
          for (var cIdx = 0; cIdx < uniqueRows[rIdx].length; cIdx++) {
            if (typeof uniqueRows[rIdx][cIdx] === "string" && uniqueRows[rIdx][cIdx].length > 45000) {
              uniqueRows[rIdx][cIdx] = uniqueRows[rIdx][cIdx].substring(0, 45000);
            }
          }
        }
        var totalRowsToClear = purSheet.getLastRow() - 1;
        if (totalRowsToClear > 0) {
          purSheet.getRange(2, 1, totalRowsToClear, purSheet.getLastColumn()).clearContent();
        }
        purSheet.getRange(2, 1, uniqueRows.length, uniqueRows[0].length).setValues(uniqueRows);
        Logger.log("Cleaned up " + (purRows.length - uniqueRows.length) + " duplicate purchase rows and sanitized cells.");
      }
    }
  } catch(e) { Logger.log("Deduplicate warning: " + e.message); }

  // 3. Ensure Currencies Sheet & Exchange Difference Accounts Exist
  try {
    CurrencyController.getCurrencies();
    appendExchangeDiffAccounts();
    Logger.log("Currencies sheet and exchange accounts verified.");
  } catch(e) {
    Logger.log("Currency migration warning: " + e.message);
  }

  return { success: true, message: "تمت الهيكلة والتعريب وإنشاء جدول العملات وحسابات فروق الصرف بنجاح 100% 👑" };
}

/**
 * HTTP HANDLERS
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getDashboardStats";
  return handleAction(action, e ? e.parameter : {});
}

function doPost(e) {
  var requestData = {};
  if (e && e.postData && e.postData.contents) {
    try { requestData = JSON.parse(e.postData.contents); } catch (err) { requestData = {}; }
  }
  var action = requestData.action || (e && e.parameter && e.parameter.action) || "getDashboardStats";
  return handleAction(action, requestData);
}

function handleAction(action, payload) {
  try {
    switch (action) {
      case "migrateToMasterArabicDatabase":
        return responseJSON({ status: "success", data: migrateToMasterArabicDatabase() });

      case "getCustomers":
        return responseJSON({ status: "success", data: CustomerController.getCustomers() });
      case "addCustomer":
        return responseJSON({ status: "success", data: CustomerController.addCustomer(payload) });

      case "getOrders":
        return responseJSON({ status: "success", data: OrderController.getOrders() });
      case "addOrder":
        return responseJSON({ status: "success", data: OrderController.addOrder(payload) });

      case "getProducts":
        return responseJSON({ status: "success", data: ProductController.getProducts() });
      case "addProduct":
        return responseJSON({ status: "success", data: ProductController.addProduct(payload) });

      case "getPurchases":
        return responseJSON({ status: "success", data: PurchaseController.getPurchases() });
      case "deduplicatePurchases":
        return responseJSON({ status: "success", data: PurchaseController.deduplicatePurchases() });
      case "addPurchase":
        return responseJSON({ status: "success", data: PurchaseController.addPurchase(payload) });

      case "getInventory":
        return responseJSON({ status: "success", data: InventoryController.getInventory() });
      case "addOrUpdateItem":
      case "addInventory":
        return responseJSON({ status: "success", data: InventoryController.addOrUpdateItem(payload) });
      case "updateInventoryQty":
        return responseJSON({ status: "success", data: InventoryController.updateInventoryQty(payload) });

      case "getVouchers":
      case "getPayments":
        return responseJSON({ status: "success", data: VoucherController.getVouchers() });
      case "addVoucher":
      case "addPayment":
        return responseJSON({ status: "success", data: VoucherController.addVoucher(payload) });

      case "getJournalEntries":
        return responseJSON({ status: "success", data: JournalController.getJournalEntries() });
      case "addJournalEntry":
        return responseJSON({ status: "success", data: JournalController.addJournalEntry(payload) });

      case "getExpenses":
        return responseJSON({ status: "success", data: ExpenseController.getExpenses() });
      case "addExpense":
        return responseJSON({ status: "success", data: ExpenseController.addExpense(payload) });

      case "getQualityInspections":
        return responseJSON({ status: "success", data: QualityController.getInspections() });
      case "addQualityInspection":
        return responseJSON({ status: "success", data: QualityController.addInspection(payload) });
      case "getQualityDefects":
        return responseJSON({ status: "success", data: QualityController.getDefects() });
      case "getQualityFeedback":
        return responseJSON({ status: "success", data: QualityController.getFeedback() });
      case "getQualityComplaints":
        return responseJSON({ status: "success", data: QualityController.getComplaints() });
      case "getQualityReturns":
        return responseJSON({ status: "success", data: QualityController.getReturns() });
      case "getQualityCorrectiveActions":
        return responseJSON({ status: "success", data: QualityController.getCorrectiveActions() });
      case "getQualityCheckpoints":
        return responseJSON({ status: "success", data: QualityController.getCheckpoints() });
      case "getCurrencies":
        return responseJSON({ status: "success", data: CurrencyController.getCurrencies() });
      case "updateExchangeRate":
        return responseJSON({ status: "success", data: CurrencyController.updateExchangeRate(payload) });
      case "appendExchangeDiffAccounts":
        return responseJSON(appendExchangeDiffAccounts());

      case "getDashboardStats":
      default:
        var custs = CustomerController.getCustomers();
        var ords = OrderController.getOrders();
        var prods = ProductController.getProducts();
        var purs = PurchaseController.getPurchases();
        var invs = InventoryController.getInventory();
        var voucs = VoucherController.getVouchers();
        return responseJSON({
          status: "success",
          data: {
            customersCount: custs.length,
            ordersCount: ords.length,
            productsCount: prods.length,
            purchasesCount: purs.length,
            inventoryCount: invs.length,
            vouchersCount: voucs.length,
            systemHealth: "Optimal 100% 👑"
          }
        });
    }
  } catch (err) {
    return responseJSON({ status: "error", message: err.message, stack: err.stack });
  }
}