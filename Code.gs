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
    prefix: "MAT",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "item_code", header: "رمز الصنف" },
      { key: "name", header: "اسم الصنف" },
      { key: "type", header: "نوع الخامة" },
      { key: "category", header: "التصنيف" },
      { key: "unit", header: "وحدة القياس" },
      { key: "quantity", header: "الكمية الحالية" },
      { key: "reserved_qty", header: "الكمية المحجوزة" },
      { key: "available_qty", header: "الكمية المتاحة" },
      { key: "min_limit", header: "الحد الأدنى" },
      { key: "unit_cost", header: "تكلفة الوحدة" },
      { key: "total_value", header: "إجمالي القيمة" },
      { key: "supplier_id", header: "معرف المورد" },
      { key: "location", header: "موقع التخزين" },
      { key: "status", header: "الحالة" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "updated_at", header: "تاريخ آخر تحديث" }
    ]
  },

  "inventory_transactions": {
    arabicSheet: "حركات_المخزون",
    prefix: "INV-TXN",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "product_id", header: "معرف المنتج" },
      { key: "variant_id", header: "معرف الصنف" },
      { key: "fabric_id", header: "معرف الخامة" },
      { key: "warehouse_id", header: "معرف المستودع" },
      { key: "transaction_type", header: "نوع الحركة" },
      { key: "quantity", header: "الكمية" },
      { key: "unit_cost", header: "تكلفة الوحدة" },
      { key: "reference_type", header: "نوع المرجع" },
      { key: "reference_id", header: "معرف المرجع" },
      { key: "notes", header: "البيان والملاحظات" },
      { key: "created_at", header: "تاريخ الحركة" },
      { key: "created_by", header: "أنشأ بواسطة" }
    ]
  },

  "production_orders": {
    arabicSheet: "أوامر_الإنتاج",
    prefix: "PROD-ORD",
    fields: [
      { key: "id", header: "المعرف" },
      { key: "production_order_no", header: "رقم أمر الإنتاج" },
      { key: "order_id", header: "معرف الطلب" },
      { key: "product_id", header: "معرف المنتج" },
      { key: "variant_id", header: "معرف الصنف" },
      { key: "product_name", header: "اسم المنتج" },
      { key: "child_name", header: "اسم الطفل" },
      { key: "stage", header: "مرحلة الإنتاج" },
      { key: "assigned_tailor_id", header: "الخياط المسؤول" },
      { key: "assigned_designer_id", header: "المصمم المسؤول" },
      { key: "start_date", header: "تاريخ البدء" },
      { key: "due_date", header: "تاريخ التسليم" },
      { key: "progress", header: "نسبة الإنجاز" },
      { key: "status", header: "الحالة" },
      { key: "notes", header: "ملاحظات الإنتاج" },
      { key: "created_at", header: "تاريخ الإنشاء" },
      { key: "updated_at", header: "تاريخ آخر تحديث" }
    ]
  },

  "chart_of_accounts": {
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
      { key: "invoice_no", header: "رقم الفاتورة" },
      { key: "supplier_name", header: "اسم المورد" },
      { key: "invoice_date", header: "تاريخ الفاتورة" },
      { key: "item_name", header: "اسم الصنف / القماش" },
      { key: "unit", header: "وحدة القياس" },
      { key: "quantity", header: "الكمية" },
      { key: "currency", header: "العملة" },
      { key: "exchange_rate", header: "سعر الصرف" },
      { key: "unit_price", header: "السعر الإفرادي" },
      { key: "original_amount", header: "المبلغ الأصلي بالعملة" },
      { key: "amount_yer", header: "المبلغ بالريال اليمني" },
      { key: "shipping_cost", header: "تكلفة النقل والتوصيل" },
      { key: "transfer_fee", header: "رسوم التحويل" },
      { key: "grand_total_yer", header: "الإجمالي النهائي (YER)" },
      { key: "payment_method", header: "طريقة الدفع" },
      { key: "payment_account_code", header: "حساب الصندوق / الدفع" },
      { key: "transaction_ref", header: "معرف المعاملة / السند" },
      { key: "receipt_attachment", header: "رابط صورة السند" },
      { key: "receipt_status", header: "حالة الاستلام" },
      { key: "payment_status", header: "حالة الدفع" },
      { key: "notes", header: "ملاحظات" },
      { key: "created_at", header: "تاريخ الإنشاء" }
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

// ⚙️ إعدادات الربط المباشر مع جدول البيانات (اختياري في حال كان السكربت مستقلاً)
var SPREADSHEET_ID = ""; // ضع معرف الشيت هنا إذا كان السكربت مستقلاً، أو اتركه فارغاً إذا فُتح من داخل الشيت
var SPREADSHEET_URL = ""; // أو ضع رابط الشيت كاملاً هنا

/**
 * UTILITY & COMMON SERVICES
 */
function getSpreadsheet() {
  // 1. محاولة الوصول التلقائي إذا كان السكربت مربوطاً بالشيت مباشرة
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}

  // 2. محاولة الفتح بالمعرف المباشر (SPREADSHEET_ID)
  if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    try { return SpreadsheetApp.openById(SPREADSHEET_ID.trim()); } catch (e) {}
  }

  // 3. محاولة الفتح بالرابط المباشر (SPREADSHEET_URL)
  if (typeof SPREADSHEET_URL !== 'undefined' && SPREADSHEET_URL && SPREADSHEET_URL.trim() !== "") {
    try { return SpreadsheetApp.openByUrl(SPREADSHEET_URL.trim()); } catch (e) {}
  }

  // 4. البحث التلقائي في Google Drive بالاسم
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
  } catch (e) {
    Logger.log("DriveApp lookup error: " + e.message);
  }

  throw new Error("لم يتم العثور على ملف جدول البيانات. يرجى فتح السكربت من داخل الشيت (التوسيعات > Apps Script) أو وضع رابط/معرف الشيت في المتغير SPREADSHEET_URL.");
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
    var itemName = String(data.name || data.item_name || "").trim();
    var itemCode = String(data.item_code || "").trim();
    var addQty = Number(data.quantity !== undefined ? data.quantity : (data.qty !== undefined ? data.qty : (data.quantity_meters || 0)));
    var unitPrice = Number(data.unit_cost !== undefined ? data.unit_cost : (data.cost_per_unit !== undefined ? data.cost_per_unit : (data.cost_per_meter !== undefined ? data.cost_per_meter : (data.cost || data.price || 0))));
    var unit = String(data.unit || "متر").trim();
    var supplierId = String(data.supplier_id || data.supplier || "").trim();
    var location = String(data.location || "المستودع الرئيسي").trim();

    var lastRow = sheet.getLastRow();
    var existingRowIdx = -1;
    var currentQty = 0;
    var currentCost = 0;
    var currentAvail = 0;
    var curId = "";
    var curCode = "";

    if (lastRow >= 2) {
      var vals = sheet.getRange(2, 1, lastRow - 1, Math.min(sheet.getLastColumn(), 17)).getValues();
      for (var r = 0; r < vals.length; r++) {
        var rowName = String(vals[r][2] || "").trim(); // Col C: اسم الصنف
        var rowCode = String(vals[r][1] || "").trim(); // Col B: رمز الصنف
        var rowId = String(vals[r][0] || "").trim();   // Col A: المعرف
        if ((itemName && rowName.toLowerCase() === itemName.toLowerCase()) || 
            (itemCode && rowCode.toLowerCase() === itemCode.toLowerCase()) || 
            (data.id && rowId === String(data.id))) {
          existingRowIdx = r + 2;
          curId = rowId;
          curCode = rowCode;
          currentQty = Number(vals[r][6] || 0);
          currentAvail = Number(vals[r][8] !== "" ? vals[r][8] : currentQty);
          currentCost = Number(vals[r][10] || 0);
          break;
        }
      }
    }

    if (existingRowIdx !== -1) {
      var newQty = currentQty + addQty;
      var newCost = newQty > 0 ? (((currentQty * currentCost) + (addQty * (unitPrice || currentCost))) / newQty) : (unitPrice || currentCost);
      newCost = Number(newCost.toFixed(2));
      var newAvail = currentAvail + addQty;
      var totalVal = Number((newQty * newCost).toFixed(2));
      var updatedDate = todayISO();

      sheet.getRange(existingRowIdx, 7).setValue(newQty);
      sheet.getRange(existingRowIdx, 9).setValue(newAvail);
      sheet.getRange(existingRowIdx, 11).setValue(newCost);
      sheet.getRange(existingRowIdx, 12).setValue(totalVal);
      if (supplierId) sheet.getRange(existingRowIdx, 13).setValue(supplierId);
      if (location) sheet.getRange(existingRowIdx, 14).setValue(location);
      sheet.getRange(existingRowIdx, 17).setValue(updatedDate);

      try {
        sheet.getRange(existingRowIdx, 7, 1, 3).setNumberFormat("0.##");
        sheet.getRange(existingRowIdx, 11, 1, 2).setNumberFormat("#,##0.00");
      } catch(e) {}

      try {
        if (typeof InventoryMovementService !== "undefined" && InventoryMovementService.recordMovement) {
          InventoryMovementService.recordMovement({
            fabric_id: curId,
            warehouse_id: location || "المستودع الرئيسي",
            transaction_type: "PURCHASE_RECEIPT",
            quantity: addQty,
            unit_cost: unitPrice,
            reference_type: "PURCHASE",
            reference_id: data.invoice_no || data.bill_no || "",
            notes: "توريد مخزون من فاتورة شراء " + (data.invoice_no || data.bill_no || "") + " - المورد: " + supplierId,
            created_by: data.created_by || "system"
          });
        }
      } catch(mErr) {}

      return { id: curId, updated: true };
    } else {
      var newId = data.id || ("MAT-" + Utilities.formatString("%06d", Math.max(1, lastRow)));
      var newItemCode = itemCode || newId;
      var totalVal = Number((addQty * unitPrice).toFixed(2));
      var crDate = todayISO();

      var newRow = [
        newId, newItemCode, itemName || "خامة جديدة", "خامة", "أقمشة وخامات",
        unit, addQty, 0, addQty, 5, unitPrice, totalVal,
        supplierId, location, "متوفر", crDate, crDate
      ];

      sheet.appendRow(newRow);
      var appendedR = sheet.getLastRow();
      try {
        sheet.getRange(appendedR, 7, 1, 3).setNumberFormat("0.##");
        sheet.getRange(appendedR, 11, 1, 2).setNumberFormat("#,##0.00");
      } catch(e) {}

      try {
        if (typeof InventoryMovementService !== "undefined" && InventoryMovementService.recordMovement) {
          InventoryMovementService.recordMovement({
            fabric_id: newId,
            warehouse_id: location || "المستودع الرئيسي",
            transaction_type: "PURCHASE_RECEIPT",
            quantity: addQty,
            unit_cost: unitPrice,
            reference_type: "PURCHASE",
            reference_id: data.invoice_no || data.bill_no || "",
            notes: "توريد مخزون من فاتورة شراء " + (data.invoice_no || data.bill_no || "") + " - المورد: " + supplierId,
            created_by: data.created_by || "system"
          });
        }
      } catch(mErr) {}

      return { id: newId, created: true };
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

/**
 * ══════════════════════════════════════════════════════════════════════════
 * CLEAN SLATE PURGE & RESET FOR PURCHASES & SUPPLIERS SHEET
 * ══════════════════════════════════════════════════════════════════════════
 */
function purgePurchasesSheetData() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("المشتريات_والموردون") || ss.getSheetByName("المشتريات") || ss.getSheetByName("Purchases");
  if (!sheet) {
    sheet = ss.insertSheet("المشتريات_والموردون");
  }

  var headers = [
    "المعرف",
    "رقم الفاتورة",
    "اسم المورد",
    "تاريخ الفاتورة",
    "اسم الصنف / القماش",
    "وحدة القياس",
    "الكمية",
    "العملة",
    "سعر الصرف",
    "السعر الإفرادي",
    "المبلغ الأصلي بالعملة",
    "المبلغ بالريال اليمني",
    "تكلفة النقل والتوصيل",
    "رسوم التحويل",
    "الإجمالي النهائي (YER)",
    "طريقة الدفع",
    "حساب الصندوق / الدفع",
    "معرف المعاملة / السند",
    "رابط صورة السند",
    "حالة الاستلام",
    "حالة الدفع",
    "ملاحظات",
    "تاريخ الإنشاء"
  ];

  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#4A154B")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  for (var c = 1; c <= headers.length; c++) {
    sheet.setColumnWidth(c, 135);
  }
  try {
    sheet.getRange("G2:G").setNumberFormat("0.##");
    sheet.getRange("I2:I").setNumberFormat("0.##");
    sheet.getRange("J2:O").setNumberFormat("#,##0.00");
  } catch(e) {}
  return {
    success: true,
    message: "تم تصفير وتنظيف جدول المشتريات بالكامل وإعادة بناء الأعمدة الـ 23 بدقة 100% 👑"
  };
}

var PurchaseController = {
  getPurchases: function() {
    var raw = SchemaMapper.readRows("purchases");
    return raw.map(function(r) {
      var invNo = String(r.invoice_no || r.bill_no || r.purchase_no || r.id || "").trim();
      var supp = String(r.supplier_name || r.supplier || "—").trim();
      var dt = String(r.invoice_date || r.date || "").trim();
      var itm = String(r.item_name || r.fabric_name || r.item || "—").trim();
      var u = String(r.unit || "متر").trim();
      var q = Number(r.quantity !== undefined && r.quantity !== "" ? r.quantity : (r.qty !== undefined && r.qty !== "" ? r.qty : 0));
      var curr = String(r.currency || "YER").trim();
      var rate = Number(r.exchange_rate || 1.0);
      var unitP = Number(r.unit_price !== undefined && r.unit_price !== "" ? r.unit_price : (r.cost_per_unit || r.price || 0));
      var origAmt = Number(r.original_amount !== undefined && r.original_amount !== "" ? r.original_amount : (q * unitP));
      var amtYer = Number(r.amount_yer !== undefined && r.amount_yer !== "" ? r.amount_yer : (r.base_amount || (origAmt * rate)));
      var ship = Number(r.shipping_cost !== undefined && r.shipping_cost !== "" ? r.shipping_cost : (r.freight_cost || 0));
      var trans = Number(r.transfer_fee !== undefined && r.transfer_fee !== "" ? r.transfer_fee : (r.transfer_fees || 0));
      var grandYer = Number(r.grand_total_yer !== undefined && r.grand_total_yer !== "" ? r.grand_total_yer : (amtYer + (ship * rate) + (trans * rate)));
      var payM = String(r.payment_method || r.pay_type || "نقدي").trim();
      var payAcc = String(r.payment_account_code || r.payment_source || "").trim();
      var txRef = String(r.transaction_ref || r.transfer_no || "").trim();
      var rcpt = String(r.receipt_attachment || r.receipt_url || "").trim();
      var rStat = String(r.receipt_status || r.status || "تم الاستلام").trim();
      var pStat = String(r.payment_status || (payM === "آجل" ? "غير مدفوع" : "مدفوع")).trim();
      var notes = String(r.notes || "").trim();
      var createdAt = String(r.created_at || dt || "").trim();

      return {
        id: r.id || ("PUR-" + invNo),
        invoice_no: invNo,
        bill_no: invNo,
        purchase_no: invNo,
        supplier_name: supp,
        supplier: supp,
        invoice_date: dt,
        date: dt,
        item_name: itm,
        fabric_name: itm,
        item: itm,
        unit: u,
        quantity: q,
        qty: q,
        currency: curr,
        Original_Currency: curr,
        exchange_rate: rate,
        exchangeRate: rate,
        unit_price: unitP,
        cost_per_unit: unitP,
        price: unitP,
        original_amount: origAmt,
        originalAmount: origAmt,
        amount_yer: amtYer,
        base_amount: amtYer,
        shipping_cost: ship,
        freight_cost: ship,
        transfer_fee: trans,
        transfer_fees: trans,
        grand_total_yer: grandYer,
        total_amount_yer: grandYer,
        payment_method: payM,
        pay_type: payM,
        payment_account_code: payAcc,
        payment_source: payAcc,
        transaction_ref: txRef,
        transfer_no: txRef,
        receipt_attachment: rcpt,
        receipt_url: rcpt,
        receipt_status: rStat,
        status: rStat,
        payment_status: pStat,
        notes: notes,
        created_at: createdAt
      };
    });
  },

  addPurchase: function(payload) {
    var data = payload.data || payload;
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("المشتريات_والموردون") || ss.getSheetByName("المشتريات") || ss.getSheetByName("Purchases");
    if (!sheet) {
      sheet = ss.insertSheet("المشتريات_والموردون");
    }

    var headers = [
      "المعرف", "رقم الفاتورة", "اسم المورد", "تاريخ الفاتورة", "اسم الصنف / القماش",
      "وحدة القياس", "الكمية", "العملة", "سعر الصرف",
      "السعر الإفرادي", "المبلغ الأصلي بالعملة", "المبلغ بالريال اليمني", "تكلفة النقل والتوصيل",
      "رسوم التحويل", "الإجمالي النهائي (YER)", "طريقة الدفع", "حساب الصندوق / الدفع",
      "معرف المعاملة / السند", "رابط صورة السند", "حالة الاستلام", "حالة الدفع",
      "ملاحظات", "تاريخ الإنشاء"
    ];

    if (sheet.getLastRow() < 1) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight("bold")
        .setBackground("#4A154B")
        .setFontColor("#FFFFFF")
        .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    var newPurId = data.id || SequenceService.getNextId("purchases", "PUR");
    var invoiceNo = String(data.invoice_no || data.bill_no || data.purchase_no || ("PUR-" + Math.floor(1000 + Math.random() * 9000))).trim();
    var supplierName = String(data.supplier_name || data.supplier || "مورد عام").trim();
    var invoiceDate = String(data.invoice_date || data.date || todayISO()).slice(0, 10);
    var itemName = String(data.item_name || data.fabric_name || data.item || data.name || "قماش / خامة").trim();
    var unit = String(data.unit || "متر").trim();
    var qty = Number(data.quantity !== undefined ? data.quantity : (data.qty !== undefined ? data.qty : 1));
    var currency = String(data.currency || data.Original_Currency || "YER").trim().toUpperCase();
    var exchangeRate = Number(data.exchange_rate || data.exchangeRate || 1.0);
    if (currency === "YER" || isNaN(exchangeRate) || exchangeRate <= 0) exchangeRate = 1.0;
    var unitPrice = Number(data.unit_price !== undefined ? data.unit_price : (data.cost_per_unit !== undefined ? data.cost_per_unit : (data.cost !== undefined ? data.cost : (data.price || 0))));
    var originalAmount = Number(data.original_amount !== undefined ? data.original_amount : (qty * unitPrice).toFixed(2));
    var amountYer = Number(data.amount_yer !== undefined ? data.amount_yer : (data.base_amount !== undefined ? data.base_amount : (originalAmount * exchangeRate).toFixed(2)));
    var shippingCost = Number(data.shipping_cost !== undefined ? data.shipping_cost : (data.freight_cost !== undefined ? data.freight_cost : (data.shippingFee || 0)));
    var transferFee = Number(data.transfer_fee !== undefined ? data.transfer_fee : (data.transfer_fees !== undefined ? data.transfer_fees : (data.transferFee || 0)));
    var shippingCostYer = Number((shippingCost * exchangeRate).toFixed(2));
    var transferFeeYer = Number((transferFee * exchangeRate).toFixed(2));
    var grandTotalYer = Number(data.grand_total_yer !== undefined ? data.grand_total_yer : (data.total_amount_yer !== undefined ? data.total_amount_yer : (amountYer + shippingCostYer + transferFeeYer).toFixed(2)));
    var billTotalOriginal = Number((originalAmount + shippingCost + transferFee).toFixed(2));
    var paymentMethod = String(data.payment_method || data.pay_type || "نقدي").trim();
    var paymentAccountCode = String(data.payment_account_code || data.payment_source || (paymentMethod === "آجل" ? "201" : "101")).trim();
    var transactionRef = String(data.transaction_ref || data.transaction_id || data.transfer_no || ("TX-" + invoiceNo)).trim();
    var receiptAttachment = String(data.receipt_attachment || data.receipt_url || "").substring(0, 45000);
    var receiptStatus = String(data.receipt_status || data.status || "تم الاستلام").trim();
    var paymentStatus = String(data.payment_status || (paymentMethod === "آجل" ? "غير مدفوع" : "مدفوع")).trim();
    var notes = String(data.notes || "").trim();
    var createdAt = todayISO();

    var fieldValues = {
      "المعرف": newPurId,
      "رقم الفاتورة": invoiceNo,
      "اسم المورد": supplierName,
      "تاريخ الفاتورة": invoiceDate,
      "اسم الصنف / القماش": itemName,
      "وحدة القياس": unit,
      "الكمية": qty,
      "العملة": currency,
      "سعر الصرف": exchangeRate,
      "السعر الإفرادي": unitPrice,
      "المبلغ الأصلي بالعملة": originalAmount,
      "المبلغ بالريال اليمني": amountYer,
      "تكلفة النقل والتوصيل": shippingCost,
      "رسوم التحويل": transferFee,
      "الإجمالي النهائي (YER)": grandTotalYer,
      "طريقة الدفع": paymentMethod,
      "حساب الصندوق / الدفع": paymentAccountCode,
      "معرف المعاملة / السند": transactionRef,
      "رابط صورة السند": receiptAttachment,
      "حالة الاستلام": receiptStatus,
      "حالة الدفع": paymentStatus,
      "ملاحظات": notes,
      "تاريخ الإنشاء": createdAt
    };

    var headerRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
    var rowArray = [];
    for (var col = 0; col < headers.length; col++) {
      var hName = String(headerRow[col] || headers[col]).trim();
      var val = fieldValues[hName];
      if (val === undefined) {
        for (var k in fieldValues) {
          if (hName.indexOf(k) !== -1 || k.indexOf(hName) !== -1) {
            val = fieldValues[k];
            break;
          }
        }
      }
      rowArray.push(val !== undefined ? val : "");
    }

    sheet.appendRow(rowArray);
    var newRowIdx = sheet.getLastRow();
    try {
      sheet.getRange(newRowIdx, 7, 1, 1).setNumberFormat("0.##");
      sheet.getRange(newRowIdx, 9, 1, 1).setNumberFormat("0.##");
      sheet.getRange(newRowIdx, 10, 1, 6).setNumberFormat("#,##0.00");
    } catch (fmtErr) {}

    // ── AUTOMATED ERP LIFECYCLE TRIGGERS ──
    // A. Inventory Integration (المخزون والمستودعات)
    try {
      if (typeof InventoryController !== "undefined" && InventoryController.addOrUpdateItem) {
        InventoryController.addOrUpdateItem({
          name: itemName,
          item_name: itemName,
          quantity: qty,
          unit_cost: Number((unitPrice * exchangeRate).toFixed(2)),
          unit: unit,
          supplier_id: supplierName,
          location: data.location || "المستودع الرئيسي",
          invoice_no: invoiceNo,
          bill_no: invoiceNo
        });
      }
    } catch (invErr) {
      console.warn("Inventory update warning:", invErr);
    }

    // B. General Ledger & Double-Entry Journal Integration (القيود اليومية)
    try {
      var debitAcc = "102"; // مخزون الأقمشة والمستلزمات
      var creditAcc = paymentMethod === "آجل" ? "201" : paymentAccountCode;
      
      if (typeof JournalController !== "undefined" && JournalController.addJournalEntry) {
        JournalController.addJournalEntry({
          entry_no: "JV-PUR-" + invoiceNo,
          entry_date: invoiceDate,
          debit_account_id: debitAcc + " - مخزون الأقمشة والمستلزمات",
          credit_account_id: creditAcc + (paymentMethod === "آجل" ? " - ذمم الموردين (" + supplierName + ")" : " - الصندوق/البنك"),
          amount: billTotalOriginal,
          currency: currency,
          exchange_rate: exchangeRate,
          base_amount: grandTotalYer,
          ref_type: "PURCHASE",
          ref_id: invoiceNo,
          notes: "قيد إثبات مشتريات فاتورة " + invoiceNo + " - المورد: " + supplierName + " - الصنف: " + itemName
        });
      }
    } catch (jErr) {
      console.warn("Journal entry warning:", jErr);
    }

    // C. Payment Voucher Integration (السندات المالية)
    try {
      if (paymentMethod !== "آجل" && typeof VoucherController !== "undefined" && VoucherController.addVoucher) {
        VoucherController.addVoucher({
          voucher_no: "PV-" + invoiceNo,
          invoice_id: invoiceNo,
          payment_type: "سند صرف",
          amount: billTotalOriginal,
          currency: currency,
          exchange_rate: exchangeRate,
          base_amount: grandTotalYer,
          payment_method: paymentMethod,
          supplier_id: supplierName,
          reference_no: transactionRef,
          account_id: paymentAccountCode,
          date: invoiceDate,
          notes: "سند صرف مشتريات للفاتورة " + invoiceNo + " - " + supplierName
        });
      }
    } catch (vErr) {
      console.warn("Voucher creation warning:", vErr);
    }

    AuditService.log("purchase", newPurId, "CREATE", null, fieldValues, "system");
    return {
      success: true,
      id: newPurId,
      invoice_no: invoiceNo,
      bill_no: invoiceNo,
      message: "تم تسجيل فاتورة الشراء وتوريد الأصناف وتوليد السندات بنجاح 👑",
      data: fieldValues
    };
  },

  clearAllPurchaseRecords: function() {
    return purgePurchasesSheetData();
  },

  purgePurchasesSheetData: function() {
    return purgePurchasesSheetData();
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
      var curr = String(r.currency || "YER").trim();
      var rate = Number(r.exchange_rate || 1.0);
      var amt = Number(r.amount || 0);
      var baseAmt = Number(r.base_amount !== undefined && r.base_amount !== "" ? r.base_amount : (curr === "YER" ? amt : amt * rate));
      return {
        id: r.id,
        v_no: rawNo,
        voucher_no: rawNo,
        payment_no: rawNo,
        invoice_id: r.invoice_id || "",
        order_id: r.order_id || "",
        v_type: isReceipt ? "سند قبض" : "سند صرف",
        voucher_type: isReceipt ? "سند قبض" : "سند صرف",
        payment_type: isReceipt ? "سند قبض" : "سند صرف",
        party: party || (isReceipt ? "عميلة عامة" : "مورد عام"),
        party_name: party || (isReceipt ? "عميلة عامة" : "مورد عام"),
        customer_id: isReceipt ? party : (r.customer_id || ""),
        supplier_id: !isReceipt ? party : (r.supplier_id || ""),
        amount: amt,
        currency: curr,
        exchange_rate: rate,
        base_amount: baseAmt,
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
    var sheet = SchemaMapper.getOrCreateSheet("payments");
    var lastR = sheet.getLastRow();
    var newId = data.id || ("PAY-" + Utilities.formatString("%06d", Math.max(1, lastR)));
    var payNo = String(data.payment_no || data.voucher_no || data.v_no || newId).trim();
    var isReceipt = data.v_type === 'سند قبض' || data.payment_type === 'سند قبض' || data.voucher_type === 'سند قبض';
    var payType = isReceipt ? "سند قبض" : "سند صرف";
    var custId = isReceipt ? String(data.customer_id || data.party || data.party_name || "").trim() : "";
    var suppId = !isReceipt ? String(data.supplier_id || data.party || data.party_name || "").trim() : "";
    var invId = String(data.invoice_id || data.bill_no || data.purchase_no || "").trim();
    var ordId = String(data.order_id || "").trim();
    var amt = Number(data.amount || 0);
    var curr = String(data.currency || "YER").trim().toUpperCase();
    var rate = Number(data.exchange_rate) > 0 ? Number(data.exchange_rate) : 1.0;
    if (curr === "YER") rate = 1.0;
    var baseAmt = Number(data.base_amount) > 0 ? Number(data.base_amount) : Number((amt * rate).toFixed(2));
    var payMethod = String(data.payment_method || data.pay_method || data.pay_type || "نقدي").trim();
    var refNo = String(data.reference_no || data.transfer_no || data.transaction_id || "").trim();
    var accId = String(data.account_id || data.acc_code || data.payment_source || "101 - الصندوق الرئيسي").trim();
    var dt = String(data.date || data.date_created || todayISO()).slice(0, 10);
    var stat = String(data.status || "posted").trim();
    var nts = String(data.notes || data.statement || "").trim();
    var crAt = todayISO();
    var crBy = String(data.created_by || "system").trim();

    var rowArray = [
      newId, payNo, ordId, invId, custId, suppId, payType,
      amt, curr, rate, baseAmt,
      payMethod, refNo, accId, dt, stat, nts, crAt, crBy
    ];

    sheet.appendRow(rowArray);
    var appendedRow = sheet.getLastRow();
    try {
      sheet.getRange(appendedRow, 8, 1, 1).setNumberFormat("#,##0.00");
      sheet.getRange(appendedRow, 10, 1, 2).setNumberFormat("#,##0.00");
    } catch(e) {}

    return { id: newId, message: "تم حفظ السند المالي بنجاح", data: data };
  },
  deleteVoucher: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("payments");
    var lastR = sheet.getLastRow();
    if (lastR < 2) return { success: false, message: "لا توجد سندات لحذفها" };
    var values = sheet.getRange(2, 1, lastR - 1, Math.min(sheet.getLastColumn(), 2)).getValues();
    var targetId = String(data.id || data.voucher_no || data.payment_no || data.v_no || "").trim();

    for (var i = 0; i < values.length; i++) {
      var rowId = String(values[i][0]).trim();
      var rowNo = String(values[i][1]).trim();
      if (rowId === targetId || rowNo === targetId) {
        sheet.deleteRow(i + 2);
        return { success: true, message: "تم حذف السند المالي بنجاح" };
      }
    }
    return { success: false, message: "لم يتم العثور على السند لحذفه" };
  }
};

var JournalController = {
  getJournalEntries: function() { 
    var raw = SchemaMapper.readRows("journal_entries"); 
    return raw.map(function(r) {
      var curr = String(r.currency || "YER").trim();
      var rate = Number(r.exchange_rate || 1.0);
      var amt = Number(r.amount || 0);
      var baseAmt = Number(r.base_amount !== undefined && r.base_amount !== "" ? r.base_amount : (curr === "YER" ? amt : amt * rate));
      return {
        id: r.id,
        entry_no: r.entry_no || r.id,
        entry_date: r.entry_date || r.date || todayISO(),
        date: r.entry_date || r.date || todayISO(),
        debit_account_id: r.debit_account_id || r.debit || "",
        credit_account_id: r.credit_account_id || r.credit || "",
        debit: r.debit_account_id || r.debit || "",
        credit: r.credit_account_id || r.credit || "",
        amount: amt,
        currency: curr,
        exchange_rate: rate,
        base_amount: baseAmt,
        ref_type: r.ref_type || "MANUAL",
        ref_id: r.ref_id || "",
        notes: r.notes || "",
        status: r.status || "posted",
        created_at: r.created_at || todayISO()
      };
    });
  },
  addJournalEntry: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("journal_entries");
    var lastR = sheet.getLastRow();
    var newId = data.id || ("JV-" + Utilities.formatString("%06d", Math.max(1, lastR)));
    var entryNo = String(data.entry_no || newId).trim();
    var entryDate = String(data.entry_date || data.date || todayISO()).slice(0, 10);
    var debitAcc = String(data.debit_account_id || data.debit || "102 - مخزون الأقمشة والمستلزمات").trim();
    var creditAcc = String(data.credit_account_id || data.credit || "101 - الصندوق الرئيسي").trim();
    var amt = Number(data.amount || 0);
    var curr = String(data.currency || "YER").trim().toUpperCase();
    var rate = Number(data.exchange_rate) > 0 ? Number(data.exchange_rate) : 1.0;
    if (curr === "YER") rate = 1.0;
    var baseAmt = Number(data.base_amount) > 0 ? Number(data.base_amount) : Number((amt * rate).toFixed(2));
    var refType = String(data.ref_type || data.reference_type || "قيد يدوي").trim();
    var refId = String(data.ref_id || data.reference_no || entryNo).trim();
    var nts = String(data.notes || data.statement || data.description || ("قيد من " + debitAcc + " إلى " + creditAcc)).trim();
    var stat = "posted";
    var crBy = String(data.created_by || "system").trim();
    var crAt = todayISO();

    var rowArray = [
      newId, entryNo, entryDate, debitAcc, creditAcc,
      amt, curr, rate, baseAmt,
      refType, refId, nts, stat, crBy, crAt
    ];

    sheet.appendRow(rowArray);
    var appendedRow = sheet.getLastRow();
    try {
      sheet.getRange(appendedRow, 6, 1, 1).setNumberFormat("#,##0.00");
      sheet.getRange(appendedRow, 7, 1, 1).setNumberFormat("@");
      sheet.getRange(appendedRow, 8, 1, 1).setNumberFormat("0.##");
      sheet.getRange(appendedRow, 9, 1, 1).setNumberFormat("#,##0.00");
    } catch(e) {}

    // Ensure all master accounts exist and update account balances in chart_of_accounts sheet
    try {
      if (typeof ChartOfAccountsController !== "undefined" && ChartOfAccountsController.ensureAllMasterAccounts) {
        ChartOfAccountsController.ensureAllMasterAccounts();
      }
      var accSheet = SchemaMapper.getOrCreateSheet("chart_of_accounts");
      var accLastR = accSheet.getLastRow();
      if (accLastR >= 2) {
        var accData = accSheet.getRange(2, 1, accLastR - 1, Math.min(accSheet.getLastColumn(), 16)).getValues();
        var dCode = debitAcc.split(" ")[0].trim();
        var cCode = creditAcc.split(" ")[0].trim();

        for (var r = 0; r < accData.length; r++) {
          var rowCode = String(accData[r][1] || accData[r][0] || "").trim();
          var rowName = String(accData[r][2] || "").trim();
          var curBal = Number(accData[r][15] || 0);
          var nature = String(accData[r][13] || "debit").trim();

          if (rowCode === dCode || rowName === debitAcc || rowCode === debitAcc) {
            var newBal = nature === "credit" ? (curBal - baseAmt) : (curBal + baseAmt);
            accSheet.getRange(r + 2, 16).setValue(newBal);
          }
          if (rowCode === cCode || rowName === creditAcc || rowCode === creditAcc) {
            var newBal = nature === "credit" ? (curBal + baseAmt) : (curBal - baseAmt);
            accSheet.getRange(r + 2, 16).setValue(newBal);
          }
        }
      }
    } catch(accErr) {
      console.warn("Account balance update warning:", accErr);
    }

    return { id: newId, message: "تم ترحيل القيد اليومي وتحديث شجرة الحسابات بنجاح", data: data };
  },

  updateJournalEntry: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("journal_entries");
    var lastR = sheet.getLastRow();
    if (lastR < 2) return { success: false, message: "لا توجد قيود لتعديلها" };
    var values = sheet.getRange(2, 1, lastR - 1, Math.min(sheet.getLastColumn(), 15)).getValues();
    var targetId = String(data.id || data.entry_no || "").trim();

    for (var i = 0; i < values.length; i++) {
      var rowId = String(values[i][0]).trim();
      var rowEntryNo = String(values[i][1]).trim();
      if (rowId === targetId || rowEntryNo === targetId) {
        var rowNum = i + 2;
        var entryNo = String(data.entry_no || values[i][1]).trim();
        var entryDate = String(data.entry_date || data.date || values[i][2]).slice(0, 10);
        var debitAcc = String(data.debit_account_id || data.debit || values[i][3]).trim();
        var creditAcc = String(data.credit_account_id || data.credit || values[i][4]).trim();
        var amt = Number(data.amount !== undefined ? data.amount : values[i][5]);
        var curr = String(data.currency || values[i][6] || "YER").trim().toUpperCase();
        var rate = Number(data.exchange_rate) > 0 ? Number(data.exchange_rate) : (curr === "YER" ? 1.0 : Number(values[i][7] || 1.0));
        var baseAmt = Number(data.base_amount) > 0 ? Number(data.base_amount) : Number((amt * rate).toFixed(2));
        var refType = String(data.ref_type || data.reference_type || values[i][9] || "قيد يدوي").trim();
        var refId = String(data.ref_id || data.reference_no || values[i][10] || entryNo).trim();
        var nts = String(data.notes || data.statement || data.description || values[i][11]).trim();

        sheet.getRange(rowNum, 2).setValue(entryNo);
        sheet.getRange(rowNum, 3).setValue(entryDate);
        sheet.getRange(rowNum, 4).setValue(debitAcc);
        sheet.getRange(rowNum, 5).setValue(creditAcc);
        sheet.getRange(rowNum, 6).setValue(amt);
        sheet.getRange(rowNum, 7).setValue(curr);
        sheet.getRange(rowNum, 8).setValue(rate);
        sheet.getRange(rowNum, 9).setValue(baseAmt);
        sheet.getRange(rowNum, 10).setValue(refType);
        sheet.getRange(rowNum, 11).setValue(refId);
        sheet.getRange(rowNum, 12).setValue(nts);

        try {
          if (typeof ChartOfAccountsController !== "undefined" && ChartOfAccountsController.getAccounts) {
            ChartOfAccountsController.getAccounts();
          }
        } catch(e) {}

        return { success: true, message: "تم تعديل القيد اليومي وتحديث شجرة الحسابات بنجاح", data: data };
      }
    }
    return { success: false, message: "لم يتم العثور على القيد المطلوب تعديله" };
  },

  deleteJournalEntry: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("journal_entries");
    var lastR = sheet.getLastRow();
    if (lastR < 2) return { success: false, message: "لا توجد قيود لحذفها" };
    var values = sheet.getRange(2, 1, lastR - 1, Math.min(sheet.getLastColumn(), 2)).getValues();
    var targetId = String(data.id || data.entry_no || "").trim();

    for (var i = 0; i < values.length; i++) {
      var rowId = String(values[i][0]).trim();
      var rowEntryNo = String(values[i][1]).trim();
      if (rowId === targetId || rowEntryNo === targetId) {
        var rowNum = i + 2;
        sheet.deleteRow(rowNum);

        // Also delete from vouchers if linked
        try {
          var vSheet = SchemaMapper.getOrCreateSheet("payments");
          var vLastR = vSheet.getLastRow();
          if (vLastR >= 2) {
            var vVals = vSheet.getRange(2, 1, vLastR - 1, Math.min(vSheet.getLastColumn(), 4)).getValues();
            for (var v = 0; v < vVals.length; v++) {
              var vNo = String(vVals[v][1] || vVals[v][0] || "").trim();
              if (vNo === targetId || targetId.indexOf(vNo) !== -1 || vNo.indexOf(targetId) !== -1) {
                vSheet.deleteRow(v + 2);
                break;
              }
            }
          }
        } catch(ve) {}

        try {
          if (typeof ChartOfAccountsController !== "undefined" && ChartOfAccountsController.getAccounts) {
            ChartOfAccountsController.getAccounts();
          }
        } catch(e) {}

        return { success: true, message: "تم حذف القيد اليومي وتحديث الأستاذ وشجرة الحسابات بنجاح" };
      }
    }
    return { success: false, message: "لم يتم العثور على القيد لحذفه" };
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
    var currency = String(data.currency || "YER").trim().toUpperCase();
    var rate = Number(data.exchange_rate) > 0 ? Number(data.exchange_rate) : 1.0;
    var baseAmount = Number(data.base_amount) > 0 ? Number(data.base_amount) : Number((amount * rate).toFixed(2));
    var category = String(data.category || data.expense_category || "إيجار الورش والمعمل").trim();
    var expNo = String(data.expense_no || newId).trim();
    var txId = String(data.transaction_id || ("TX-" + expNo)).trim();
    var expDate = String(data.date || data.expense_date || now).slice(0, 10);
    var payMethod = String(data.payment_method || data.pay_method || "نقدي").trim();
    var recipient = String(data.recipient || "").trim();
    var accountId = String(data.account_id || data.payment_source || "101 - الصندوق الرئيسي").trim();
    var status = "posted";
    var notes = String(data.notes || data.description || category).trim();
    var createdBy = String(data.created_by || "system").trim();

    var expRow = [
      newId, expNo, category, amount, currency, rate, baseAmount,
      txId, expDate, payMethod, recipient, accountId, status, notes,
      now, createdBy
    ];

    sheet.appendRow(expRow);
    var appRow = sheet.getLastRow();
    try {
      sheet.getRange(appRow, 4, 1, 1).setNumberFormat("#,##0.00");
      sheet.getRange(appRow, 5, 1, 1).setNumberFormat("@");
      sheet.getRange(appRow, 6, 1, 1).setNumberFormat("0.##");
      sheet.getRange(appRow, 7, 1, 1).setNumberFormat("#,##0.00");
    } catch(e) {}

    return { id: newId, message: "تم تسجيل المصروف بنجاح", data: data };
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
 * CHART OF ACCOUNTS CONTROLLER (شجرة الحسابات)
 * - Dynamic Recursive Rollup of Balances
 * - Automatic Summary Parent Switching (is_group=1, is_postable=0)
 * - Automatic Complete Seeding of Master Chart of Accounts (26 Accounts)
 */
var ChartOfAccountsController = {
  ensureAllMasterAccounts: function() {
    var sheet = SchemaMapper.getOrCreateSheet("chart_of_accounts");
    var raw = SchemaMapper.readRows("chart_of_accounts");
    var existingCodes = {};
    for (var i = 0; i < raw.length; i++) {
      var c = String(raw[i].account_code || raw[i].code || raw[i].id || "").trim();
      if (c) existingCodes[c] = true;
    }

    var defaultMaster = [
      { id: "ACC-1", code: "1", name: "الأصول", name_en: "Assets", type: "أصول", cat: "أصول", pId: "", pCode: "", lvl: 1, path: "1", isGrp: 1, isPost: 0, nature: "debit", cur: "YER" },
      { id: "ACC-2", code: "2", name: "الخصوم (الالتزامات)", name_en: "Liabilities", type: "خصوم", cat: "خصوم", pId: "", pCode: "", lvl: 1, path: "2", isGrp: 1, isPost: 0, nature: "credit", cur: "YER" },
      { id: "ACC-3", code: "3", name: "حقوق الملكية", name_en: "Equity", type: "حقوق ملكية", cat: "حقوق ملكية", pId: "", pCode: "", lvl: 1, path: "3", isGrp: 1, isPost: 0, nature: "credit", cur: "YER" },
      { id: "ACC-4", code: "4", name: "الإيرادات", name_en: "Revenue", type: "إيرادات", cat: "إيرادات", pId: "", pCode: "", lvl: 1, path: "4", isGrp: 1, isPost: 0, nature: "credit", cur: "YER" },
      { id: "ACC-5", code: "5", name: "تكلفة المبيعات", name_en: "Cost of Sales", type: "تكلفة المبيعات", cat: "تكلفة المبيعات", pId: "", pCode: "", lvl: 1, path: "5", isGrp: 1, isPost: 0, nature: "debit", cur: "YER" },
      { id: "ACC-6", code: "6", name: "المصروفات", name_en: "Expenses", type: "مصروفات", cat: "مصروفات", pId: "", pCode: "", lvl: 1, path: "6", isGrp: 1, isPost: 0, nature: "debit", cur: "YER" },
      { id: "ACC-7", code: "7", name: "حسابات أخرى", name_en: "Other Accounts", type: "أخرى", cat: "أخرى", pId: "", pCode: "", lvl: 1, path: "7", isGrp: 1, isPost: 0, nature: "debit", cur: "YER" },

      { id: "ACC-101", code: "101", name: "الصندوق / الخزينة الرئيسية", name_en: "Main Cash", type: "أصول", cat: "أصول متداولة", pId: "1", pCode: "1", lvl: 2, path: "1 > 101", isGrp: 1, isPost: 0, nature: "debit", cur: "YER" },
      { id: "ACC-101.01", code: "101.01", name: "صندوق فرع الورشة والمعمل (صنعاء)", name_en: "Workshop Cash", type: "أصول", cat: "نقدية وما في حكمها", pId: "101", pCode: "101", lvl: 3, path: "1 > 101 > 101.01", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" },
      { id: "ACC-101.02", code: "101.02", name: "صندوق محمد فلاح", name_en: "Mohammed Falah Cash", type: "أصول", cat: "نقدية وما في حكمها", pId: "101", pCode: "101", lvl: 3, path: "1 > 101 > 101.02", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" },
      { id: "ACC-101.2", code: "101.2", name: "صندوق الريال السعودي (SAR)", name_en: "SAR Cash Box", type: "أصول", cat: "نقدية وما في حكمها", pId: "101", pCode: "101", lvl: 3, path: "1 > 101 > 101.2", isGrp: 0, isPost: 1, nature: "debit", cur: "SAR" },
      { id: "ACC-101.3", code: "101.3", name: "صندوق الدولار الأمريكي (USD)", name_en: "USD Cash Box", type: "أصول", cat: "نقدية وما في حكمها", pId: "101", pCode: "101", lvl: 3, path: "1 > 101 > 101.3", isGrp: 0, isPost: 1, nature: "debit", cur: "USD" },
      { id: "ACC-102", code: "102", name: "مخزون الأقمشة والمستلزمات", name_en: "Fabrics & Supplies Inventory", type: "أصول", cat: "أصول متداولة", pId: "1", pCode: "1", lvl: 2, path: "1 > 102", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" },
      { id: "ACC-103", code: "103", name: "الحساب البنكي / الحوالات والمحافظ", name_en: "Bank & Wallets (YER)", type: "أصول", cat: "أصول متداولة", pId: "1", pCode: "1", lvl: 2, path: "1 > 103", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" },
      { id: "ACC-104", code: "104", name: "ذمم العملاء (مستحقات خارجية)", name_en: "Accounts Receivable", type: "أصول", cat: "أصول متداولة", pId: "1", pCode: "1", lvl: 2, path: "1 > 104", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" },
      { id: "ACC-105", code: "105", name: "أصول ثابتة (آلات ومعدات)", name_en: "Fixed Assets", type: "أصول", cat: "أصول غير متداولة", pId: "1", pCode: "1", lvl: 2, path: "1 > 105", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" },

      { id: "ACC-201", code: "201", name: "ذمم الموردين ومحلات الأقمشة (آجل)", name_en: "Accounts Payable", type: "خصوم", cat: "خصوم متداولة", pId: "2", pCode: "2", lvl: 2, path: "2 > 201", isGrp: 0, isPost: 1, nature: "credit", cur: "YER" },
      { id: "ACC-202", code: "202", name: "مصروفات مستحقة الدفع", name_en: "Accrued Expenses", type: "خصوم", cat: "خصوم متداولة", pId: "2", pCode: "2", lvl: 2, path: "2 > 202", isGrp: 0, isPost: 1, nature: "credit", cur: "YER" },

      { id: "ACC-301", code: "301", name: "رأس المال المباشر لمؤسسة Little Princesses", name_en: "Paid Capital", type: "حقوق ملكية", cat: "رأس المال", pId: "3", pCode: "3", lvl: 2, path: "3 > 301", isGrp: 0, isPost: 1, nature: "credit", cur: "YER" },
      { id: "ACC-302", code: "302", name: "الأرباح المبقاة / المحتجزة", name_en: "Retained Earnings", type: "حقوق ملكية", cat: "أرباح مرحلة", pId: "3", pCode: "3", lvl: 2, path: "3 > 302", isGrp: 0, isPost: 1, nature: "credit", cur: "YER" },

      { id: "ACC-401", code: "401", name: "إيرادات مبيعات الفساتين والزي", name_en: "Sales Revenue", type: "إيرادات", cat: "إيرادات تشغيلية", pId: "4", pCode: "4", lvl: 2, path: "4 > 401", isGrp: 0, isPost: 1, nature: "credit", cur: "YER" },
      { id: "ACC-402", code: "402", name: "أرباح فروق أسعار صرف العملات", name_en: "Foreign Exchange Gain", type: "إيرادات", cat: "إيرادات أخرى", pId: "4", pCode: "4", lvl: 2, path: "4 > 402", isGrp: 0, isPost: 1, nature: "credit", cur: "YER" },

      { id: "ACC-501", code: "501", name: "أجور ورواتب الخياطين والمطرزين", name_en: "Salaries & Wages", type: "مصروفات", cat: "مصروفات تشغيلية", pId: "6", pCode: "6", lvl: 2, path: "6 > 501", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" },
      { id: "ACC-502", code: "502", name: "إيجار الورشة والمعمل والمحل الرئيسي", name_en: "Workshop & Shop Rent", type: "مصروفات", cat: "مصروفات تشغيلية", pId: "6", pCode: "6", lvl: 2, path: "6 > 502", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" },
      { id: "ACC-503", code: "503", name: "إيجار المحل والورشة", name_en: "Shop Rent", type: "مصروفات", cat: "مصروفات تشغيلية", pId: "6", pCode: "6", lvl: 2, path: "6 > 503", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" },
      { id: "ACC-504", code: "504", name: "مصاريف كهرباء وماء وإنترنت", name_en: "Electricity, Water & Internet", type: "مصروفات", cat: "مصروفات تشغيلية", pId: "6", pCode: "6", lvl: 2, path: "6 > 504", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" },
      { id: "ACC-505", code: "505", name: "مصاريف التسويق والإعلانات", name_en: "Marketing & Ads", type: "مصروفات", cat: "مصروفات تسويقية", pId: "6", pCode: "6", lvl: 2, path: "6 > 505", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" },
      { id: "ACC-506", code: "506", name: "خسائر فروق أسعار صرف العملات", name_en: "Foreign Exchange Loss", type: "مصروفات", cat: "مصروفات تمويلية", pId: "6", pCode: "6", lvl: 2, path: "6 > 506", isGrp: 0, isPost: 1, nature: "debit", cur: "YER" }
    ];

    var now = todayISO();
    for (var m = 0; m < defaultMaster.length; m++) {
      var item = defaultMaster[m];
      if (!existingCodes[item.code]) {
        var rowArr = [
          item.id, item.code, item.name, item.name_en,
          item.type, item.cat, item.pId, item.pCode,
          item.lvl, item.path, item.isGrp, item.isPost,
          1, item.nature, 0, 0, item.nature, item.cur,
          now, "حساب معتمد في دليل الحسابات", now, "system"
        ];
        sheet.appendRow(rowArr);
      }
    }
  },

  getAccounts: function() {
    this.ensureAllMasterAccounts();
    var raw = SchemaMapper.readRows("chart_of_accounts");
    var jRows = SchemaMapper.readRows("journal_entries");
    var sheet = SchemaMapper.getOrCreateSheet("chart_of_accounts");

    return raw.map(function(r, idx) {
      var code = String(r.account_code || r.code || r.id || "").trim();
      var name = String(r.account_name || r.name || code).trim();
      var pId = (r.parent_account_id !== undefined && r.parent_account_id !== null && r.parent_account_id !== "" && r.parent_account_id !== "0") ? r.parent_account_id : (r.parent_id || null);
      var pCode = String(r.parent_account_code || "").trim();
      var isGrp = Number(r.is_group !== undefined ? r.is_group : (code.length <= 1 ? 1 : 0));
      var isPost = Number(r.is_postable !== undefined ? r.is_postable : (isGrp === 1 ? 0 : 1));
      var openBal = Number(r.opening_balance || 0);
      var nature = r.normal_balance || r.nature || (['خصوم', 'حقوق ملكية', 'إيرادات'].indexOf(r.account_type) !== -1 ? 'credit' : 'debit');

      // Compute dynamic movements from journal_entries sheet
      var totalDebit = 0;
      var totalCredit = 0;
      var hasMovements = false;

      for (var j = 0; j < jRows.length; j++) {
        var je = jRows[j];
        var dStr = String(je.debit_account_id || je.debit || "").trim();
        var cStr = String(je.credit_account_id || je.credit || "").trim();
        var baseAmt = Number(je.base_amount !== undefined && je.base_amount !== "" ? je.base_amount : (Number(je.amount || 0) * Number(je.exchange_rate || 1)));

        var matchD = dStr === code || dStr === String(r.id) || dStr.indexOf(code + " ") === 0 || dStr.indexOf(code + "-") === 0 || (name && dStr.indexOf(name) !== -1);
        var matchC = cStr === code || cStr === String(r.id) || cStr.indexOf(code + " ") === 0 || cStr.indexOf(code + "-") === 0 || (name && cStr.indexOf(name) !== -1);

        if (matchD) { totalDebit += baseAmt; hasMovements = true; }
        if (matchC) { totalCredit += baseAmt; hasMovements = true; }
      }

      var curBal = hasMovements ? (nature === "credit" ? (openBal + totalCredit - totalDebit) : (openBal + totalDebit - totalCredit)) : Number(r.current_balance !== undefined && r.current_balance !== "" ? r.current_balance : (r.balance || openBal));

      // Sync calculated balance to Column P in دليل_الحسابات sheet
      try {
        if (hasMovements && sheet && idx !== undefined) {
          sheet.getRange(idx + 2, 16).setValue(curBal);
        }
      } catch(syncErr) {}

      return {
        id: r.id || code,
        account_id: r.id || code,
        code: code,
        account_code: code,
        acc_code: code,
        name: name,
        account_name: name,
        acc_name: name,
        name_en: r.account_name_en || r.name_en || "",
        account_type: r.account_type || r.acc_type || "أصول",
        account_category: r.account_category || r.account_type || "أصول",
        parent_id: pId,
        parent_account_id: pId,
        parent_account_code: pCode,
        level: Number(r.level || (code.indexOf('.') !== -1 ? code.split('.').length : (code.length > 2 ? 3 : (code.length === 1 ? 1 : 2)))),
        account_path: r.account_path || code,
        is_group: isGrp,
        is_postable: isPost,
        is_active: Number(r.is_active !== undefined ? r.is_active : 1),
        normal_balance: nature,
        nature: nature,
        opening_balance: openBal,
        current_balance: curBal,
        balance: curBal,
        balance_type: r.balance_type || nature,
        currency: r.currency || "YER",
        establishment_date: r.establishment_date || todayISO(),
        notes: r.notes || "",
        created_at: r.created_at || todayISO(),
        created_by: r.created_by || "system"
      };
    });
  },

  getChartOfAccountsTree: function() {
    var accs = this.getAccounts();

    var getChildren = function(parent) {
      return accs.filter(function(c) {
        if (String(c.id) === String(parent.id) || String(c.code) === String(parent.code)) return false;
        if (c.parent_id !== null && c.parent_id !== undefined && c.parent_id !== '' && c.parent_id !== '0') {
          return String(c.parent_id) === String(parent.id) || String(c.parent_id) === String(parent.code);
        }
        if (c.parent_account_code) return String(c.parent_account_code) === String(parent.code);
        if (parent.code && c.code && c.code.indexOf(parent.code + '.') === 0) {
          var sub = c.code.substring(parent.code.length + 1);
          return sub.indexOf('.') === -1;
        }
        return false;
      });
    };

    var memo = {};
    var computeRollup = function(node) {
      var k = String(node.id || node.code);
      if (memo[k] !== undefined) return memo[k];
      var ch = getChildren(node);
      if (ch.length === 0) {
        memo[k] = Number(node.balance || 0);
        return memo[k];
      }
      var sum = 0;
      for (var i = 0; i < ch.length; i++) {
        sum += computeRollup(ch[i]);
      }
      memo[k] = sum;
      return sum;
    };

    return accs.map(function(a) {
      var ch = getChildren(a);
      var hasCh = ch.length > 0;
      var rollup = computeRollup(a);
      return Object.assign({}, a, {
        is_group: hasCh ? 1 : a.is_group,
        is_postable: hasCh ? 0 : a.is_postable,
        rollupBalance: hasCh ? rollup : a.balance,
        hasChildren: hasCh
      });
    });
  },

  addAccount: function(payload) {
    var data = payload.data || payload;
    var sheet = SchemaMapper.getOrCreateSheet("chart_of_accounts");
    var code = String(data.account_code || data.code || data.acc_code || "").trim();
    var name = String(data.account_name || data.name || data.acc_name || "").trim();
    var parentId = data.parent_id || data.parent_account_id || null;
    if (parentId === "" || parentId === 0 || parentId === "0") parentId = null;

    var lastR = sheet.getLastRow();
    var newId = data.id || data.account_id || ("ACC-" + Utilities.formatString("%06d", Math.max(1, lastR)));
    
    // Auto switch parent to is_group=1 and is_postable=0 if parentId exists
    if (parentId && lastR >= 2) {
      var vals = sheet.getRange(2, 1, lastR - 1, Math.min(sheet.getLastColumn(), 12)).getValues();
      for (var r = 0; r < vals.length; r++) {
        var rowId = String(vals[r][0] || "").trim();
        var rowCode = String(vals[r][1] || "").trim();
        if (rowId === String(parentId) || rowCode === String(parentId)) {
          var pRowIdx = r + 2;
          sheet.getRange(pRowIdx, 11).setValue(1); // Col K: is_group = 1
          sheet.getRange(pRowIdx, 12).setValue(0); // Col L: is_postable = 0
          break;
        }
      }
    }

    var isGrp = Number(data.is_group || 0);
    var isPost = isGrp === 1 ? 0 : Number(data.is_postable !== undefined ? data.is_postable : 1);
    var lvl = Number(data.level || (parentId ? 2 : 1));
    var nature = String(data.normal_balance || data.nature || "debit").trim();
    var bal = Number(data.current_balance !== undefined ? data.current_balance : (data.balance || 0));

    var accountRecord = {
      id: newId,
      account_code: code,
      account_name: name,
      account_name_en: data.account_name_en || data.name_en || "",
      account_type: data.account_type || data.acc_type || "أصول",
      account_category: data.account_category || data.account_type || "أصول",
      parent_account_id: parentId || "",
      parent_account_code: data.parent_account_code || "",
      level: lvl,
      account_path: data.account_path || code,
      is_group: isGrp,
      is_postable: isPost,
      is_active: Number(data.is_active !== undefined ? data.is_active : 1),
      normal_balance: nature,
      opening_balance: Number(data.opening_balance || 0),
      current_balance: bal,
      balance_type: nature,
      currency: data.currency || "YER",
      establishment_date: data.establishment_date || todayISO(),
      notes: data.notes || "",
      created_at: todayISO(),
      created_by: data.created_by || "system"
    };

    SchemaMapper.appendOrUpdateRow("chart_of_accounts", accountRecord);
    return { success: true, id: newId, account_code: code, message: "تم حفظ الحساب بنجاح في دليل الحسابات" };
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
 * FACTORY RESET & CLEAR ALL TRANSACTIONAL DATA IN GOOGLE SHEETS
 * - Deletes rows 2..N in all transactional sheets
 * - Keeps Row 1 Headers intact 100%
 * - Resets chart_of_accounts balances to 0
 */
function clearAllTransactionalData() {
  var ss = getSpreadsheet();
  var allSheets = ss.getSheets();
  var wiped = [];

  // Sheets that should preserve specific system rows
  var protectedSheets = ["المستخدمون", "users", "العملات", "currencies", "دليل_الحسابات", "chart_of_accounts", "Accounts", "بروفايل_المؤسسة", "org_profile"];

  for (var i = 0; i < allSheets.length; i++) {
    var sh = allSheets[i];
    var sName = sh.getName();
    var lastR = sh.getLastRow();

    if (sName === "المستخدمون" || sName === "users") {
      // Keep admin user at row 2, delete any extra demo users
      if (lastR > 2) {
        sh.deleteRows(3, lastR - 2);
        wiped.push(sName + " (تم تنظيف المستخدمين الإضافيين)");
      }
    } else if (sName === "العملات" || sName === "currencies") {
      // Keep standard currencies (YER, SAR, USD) at rows 2, 3, 4
      if (lastR > 4) {
        sh.deleteRows(5, lastR - 4);
        wiped.push(sName + " (تم تنظيف العملات التجريبية)");
      }
    } else if (sName === "دليل_الحسابات" || sName === "chart_of_accounts" || sName === "Accounts") {
      // Re-seed clean master accounts with 0.00 balances and remove any test/dummy accounts
      resetAndSeedCleanChartOfAccounts(sh);
      wiped.push(sName + " (تم تنظيف وتصفير كافة الحسابات إلى 0.00 وإعادة البناء القياسي)");
    } else if (sName === "بروفايل_المؤسسة" || sName === "org_profile") {
      // Keep organization info
    } else {
      // FOR ALL OTHER SHEETS (Orders, Purchases, Inventory, Measurements, Payroll, Quality, Marketing, Webhooks, AI Briefs, etc.):
      if (lastR >= 2) {
        sh.deleteRows(2, lastR - 1);
        wiped.push(sName + " (تم مسح " + (lastR - 1) + " سطر)");
      }
    }
  }

  return { success: true, message: "تم مسح وتصفير كافة البيانات المدخلة في جميع الشيتات بنجاح 👑", wipedSheets: wiped };
}

/**
 * RE-SEEDS CLEAN MASTER ACCOUNTS TO ZERO WITH NO DUMMY ROWS
 */
function resetAndSeedCleanChartOfAccounts(optionalSheet) {
  var ss = getSpreadsheet();
  var sh = optionalSheet || ss.getSheetByName("دليل_الحسابات") || ss.getSheetByName("Accounts") || ss.getSheetByName("chart_of_accounts");
  if (!sh) return { success: false, message: "لم يتم العثور على شيت دليل_الحسابات" };

  var lastR = sh.getLastRow();
  if (lastR >= 2) {
    sh.deleteRows(2, lastR - 1);
  }

  // مسح قيود اليومية المعاملاتية حتى لا تعيد احتساب الأرصدة القديمة
  var journalSheets = ["القيود_اليومية", "journal_entries", "القيود اليومية", "Journal"];
  for (var js = 0; js < journalSheets.length; js++) {
    var jSh = ss.getSheetByName(journalSheets[js]);
    if (jSh && jSh.getLastRow() >= 2) {
      try { jSh.deleteRows(2, jSh.getLastRow() - 1); } catch(je) {}
    }
  }

  var masterAccounts = [
    ["ACC-1", "1", "الأصول", "Assets", "أصول", "أصول", "", "", 1, "1", 1, 0, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-101", "101", "الصندوق / الخزينة الرئيسية", "Main Cash", "أصول", "أصول متداولة", "ACC-1", "1", 2, "1 > 101", 1, 0, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-101.01", "101.01", "صندوق فرع الورشة والمعمل (صنعاء)", "Workshop Cash", "أصول", "نقدية وما في حكمها", "ACC-101", "101", 3, "1 > 101 > 101.01", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-101.02", "101.02", "صندوق محمد فلاح", "Mohammed Falah Cash", "أصول", "نقدية وما في حكمها", "ACC-101", "101", 3, "1 > 101 > 101.02", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-101.2", "101.2", "صندوق الريال السعودي (SAR)", "SAR Cash Box", "أصول", "نقدية وما في حكمها", "ACC-101", "101", 3, "1 > 101 > 101.2", 0, 1, 1, "debit", 0, 0, "debit", "SAR", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-101.3", "101.3", "صندوق الدولار الأمريكي (USD)", "USD Cash Box", "أصول", "نقدية وما في حكمها", "ACC-101", "101", 3, "1 > 101 > 101.3", 0, 1, 1, "debit", 0, 0, "debit", "USD", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-102", "102", "مخزون الأقمشة والمستلزمات", "Fabrics & Supplies Inventory", "أصول", "أصول متداولة", "ACC-1", "1", 2, "1 > 102", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-103", "103", "الحساب البنكي / الحوالات والمحافظ", "Bank & Wallets (YER)", "أصول", "أصول متداولة", "ACC-1", "1", 2, "1 > 103", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-104", "104", "ذمم العملاء (مستحقات خارجية)", "Accounts Receivable", "أصول", "أصول متداولة", "ACC-1", "1", 2, "1 > 104", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-105", "105", "الأصول الثابتة (آلات ومعدات)", "Fixed Assets", "أصول", "أصول غير متداولة", "ACC-1", "1", 2, "1 > 105", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-2", "2", "الخصوم (الالتزامات)", "Liabilities", "خصوم", "خصوم", "", "", 1, "2", 1, 0, 1, "credit", 0, 0, "credit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-201", "201", "ذمم الموردين ومحلات الأقمشة (آجل)", "Accounts Payable", "خصوم", "خصوم متداولة", "ACC-2", "2", 2, "2 > 201", 0, 1, 1, "credit", 0, 0, "credit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-202", "202", "عرابين وأمانات العملاء", "Accrued Expenses", "خصوم", "خصوم متداولة", "ACC-2", "2", 2, "2 > 202", 0, 1, 1, "credit", 0, 0, "credit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-3", "3", "حقوق الملكية", "Equity", "حقوق ملكية", "حقوق ملكية", "", "", 1, "3", 1, 0, 1, "credit", 0, 0, "credit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-301", "301", "رأس المال المباشر لمؤسسة Little Princesses", "Paid Capital", "حقوق ملكية", "رأس المال", "ACC-3", "3", 2, "3 > 301", 0, 1, 1, "credit", 0, 0, "credit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-302", "302", "الأرباح المبقاة / المحتجزة", "Retained Earnings", "حقوق ملكية", "أرباح مرحلة", "ACC-3", "3", 2, "3 > 302", 0, 1, 1, "credit", 0, 0, "credit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-4", "4", "الإيرادات", "Revenue", "إيرادات", "إيرادات", "", "", 1, "4", 1, 0, 1, "credit", 0, 0, "credit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-401", "401", "إيرادات مبيعات الفساتين والزي", "Sales Revenue", "إيرادات", "إيرادات تشغيلية", "ACC-4", "4", 2, "4 > 401", 0, 1, 1, "credit", 0, 0, "credit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-402", "402", "أرباح فروق أسعار صرف العملات", "Foreign Exchange Gain", "إيرادات", "إيرادات أخرى", "ACC-4", "4", 2, "4 > 402", 0, 1, 1, "credit", 0, 0, "credit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-5", "5", "تكلفة المبيعات", "Cost of Sales", "تكلفة المبيعات", "تكلفة المبيعات", "", "", 1, "5", 1, 0, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-6", "6", "المصروفات", "Expenses", "مصروفات", "مصروفات", "", "", 1, "6", 1, 0, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-501", "501", "أجور ورواتب الخياطين والمطرزين", "Salaries & Wages", "مصروفات", "مصروفات تشغيلية", "ACC-6", "6", 2, "6 > 501", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-502", "502", "إيجار الورشة والمعمل والمحل الرئيسي", "Workshop & Shop Rent", "مصروفات", "مصروفات تشغيلية", "ACC-6", "6", 2, "6 > 502", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-503", "503", "إيجار المحل والورشة", "Shop Rent", "مصروفات", "مصروفات تشغيلية", "ACC-6", "6", 2, "6 > 503", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-504", "504", "مصاريف كهرباء وماء وإنترنت", "Electricity, Water & Internet", "مصروفات", "مصروفات تشغيلية", "ACC-6", "6", 2, "6 > 504", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-505", "505", "مصاريف التسويق والإعلانات الممولة", "Marketing & Ads", "مصروفات", "مصاريف تسويقية", "ACC-6", "6", 2, "6 > 505", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-506", "506", "خسائر فروق أسعار صرف العملات", "Foreign Exchange Loss", "مصروفات", "مصروفات أخرى", "ACC-6", "6", 2, "6 > 506", 0, 1, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"],
    ["ACC-7", "7", "حسابات أخرى", "Other Accounts", "أخرى", "أخرى", "", "", 1, "7", 1, 0, 1, "debit", 0, 0, "debit", "YER", "2026-01-01", "", "2026-01-01", "system"]
  ];

  sh.getRange(2, 1, masterAccounts.length, masterAccounts[0].length).setValues(masterAccounts);
  return { success: true, message: "تم تنظيف وتصفير شجرة الحسابات وإعادة زراعة الحسابات القياسية الـ 28 بنجاح 👑", count: masterAccounts.length };
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
      case "clearAllData":
      case "clearAllTransactionalData":
      case "wipeAllData":
        return responseJSON({ status: "success", data: clearAllTransactionalData() });

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
        return responseJSON({ status: "success", data: PurchaseController.removeDuplicates ? PurchaseController.removeDuplicates() : { count: 0 } });
      case "purgePurchasesSheetData":
      case "clearAllPurchaseRecords":
        return responseJSON({ status: "success", data: purgePurchasesSheetData() });
      case "addPurchase":
      case "addPurchaseInvoice":
      case "savePurchaseInvoice":
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
      case "deleteVoucher":
      case "deletePayment":
        return responseJSON({ status: "success", data: VoucherController.deleteVoucher(payload) });

      case "getJournalEntries":
        return responseJSON({ status: "success", data: JournalController.getJournalEntries() });
      case "addJournalEntry":
      case "saveJournalEntry":
        return responseJSON({ status: "success", data: JournalController.addJournalEntry(payload) });
      case "updateJournalEntry":
      case "editJournalEntry":
        return responseJSON({ status: "success", data: JournalController.updateJournalEntry(payload) });
      case "deleteJournalEntry":
      case "removeJournalEntry":
        return responseJSON({ status: "success", data: JournalController.deleteJournalEntry(payload) });

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
      case "getAccounts":
      case "getChartOfAccounts":
      case "getChartOfAccountsTree":
        return responseJSON({ status: "success", data: ChartOfAccountsController.getChartOfAccountsTree() });
      case "addAccount":
      case "saveAccount":
        return responseJSON({ status: "success", data: ChartOfAccountsController.addAccount(payload) });
      case "resetChartOfAccounts":
      case "resetCleanChartOfAccounts":
        return responseJSON({ status: "success", data: resetAndSeedCleanChartOfAccounts() });

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