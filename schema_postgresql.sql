-- ====================================================================================
-- 👑 LITTLE PRINCESSES ERP — COMPLETE PRODUCTION-GRADE POSTGRESQL ARCHITECTURE
-- 👑 المخطط الشامل لقاعدة بيانات ليتل برنسيس: الجداول، العلاقات، الفهارس، الدوال، والتريجرز
-- ====================================================================================

-- تفعيل الامتدادات المطلوبة لمعالجة المعرفات والتشفير
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================================
-- القسم 1: جداول النظام الأساسية، العملات، المستخدمين، وسجل التدقيق
-- ====================================================================================

-- 1.1 جدول العملات وأسعار الصرف (Currencies)
CREATE TABLE IF NOT EXISTS currencies (
    id VARCHAR(64),
    currency_code VARCHAR(10),
    code VARCHAR(10) PRIMARY KEY, -- 'YER', 'SAR', 'USD'
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000, -- سعر الصرف مقابل الريال اليمني
    is_base BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 جدول المستخدمين والصلاحيات (Users)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY, -- 'USR-000001'
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'tailor', 'accountant', 'sales', 'quality'
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 جدول الترقيم التسلسلي الذري (Atomic Number Sequences)
CREATE TABLE IF NOT EXISTS number_sequences (
    id VARCHAR(64),
    entity VARCHAR(50),
    sequence_key VARCHAR(50) PRIMARY KEY, -- 'CUST', 'ORD', 'PAY', 'JV', 'PUR', 'EXP', etc.
    prefix VARCHAR(20) NOT NULL,
    current_number BIGINT NOT NULL DEFAULT 0,
    padding INT NOT NULL DEFAULT 6,
    description VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 جدول سجل التدقيق والمراقبة الشامل (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- 'orders', 'payments', 'customers', etc.
    entity_id VARCHAR(64) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- القسم 2: إدارة علاقات العملاء، الأطفال، والمقاسات التفصيلية
-- ====================================================================================

-- 2.1 جدول العملاء (Customers)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY, -- 'CUST-000001'
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    phone_alt VARCHAR(30),
    platform VARCHAR(50), -- 'WhatsApp', 'Instagram', 'Snapchat', 'Walk-in'
    handle VARCHAR(100),
    category VARCHAR(50) DEFAULT 'Normal', -- 'VIP', 'Loyal', 'Normal'
    city VARCHAR(50),
    street TEXT,
    children_count INT DEFAULT 0,
    current_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000, -- رصيد حساب العميل
    notes TEXT,
    status VARCHAR(30) DEFAULT 'Active',
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 جدول الأطفال (Children)
CREATE TABLE IF NOT EXISTS children (
    id VARCHAR(64) PRIMARY KEY, -- 'CHLD-000001'
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    child_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'ذكر', 'أنثى')),
    birth_date DATE,
    age INT,
    notes TEXT,
    status VARCHAR(30) DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.3 جدول قياسات الخياطة التفصيلية (Measurements)
CREATE TABLE IF NOT EXISTS measurements (
    id VARCHAR(64) PRIMARY KEY, -- 'MEAS-000001'
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    child_id VARCHAR(64) REFERENCES children(id) ON DELETE SET NULL,
    child_name VARCHAR(100),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    unit VARCHAR(10) DEFAULT 'cm',
    total_len NUMERIC(6, 2),    -- الطول الكلي
    dress_len NUMERIC(6, 2),    -- طول الفستان
    chest_len NUMERIC(6, 2),    -- طول الصدر
    skirt_len NUMERIC(6, 2),    -- طول التنورة
    sleeve_len NUMERIC(6, 2),   -- طول الكم
    chest_circ NUMERIC(6, 2),   -- محيط الصدر
    waist_circ NUMERIC(6, 2),   -- محيط الخصر
    shoulder_w NUMERIC(6, 2),   -- عرض الكتف
    armpit_circ NUMERIC(6, 2),  -- محيط الإبط
    neck_circ NUMERIC(6, 2),    -- محيط الرقبة
    model_name VARCHAR(150),
    model_img TEXT,
    comfort_profile VARCHAR(50), -- 'مريح', 'ضيق', 'فضفاض'
    notes TEXT,
    status VARCHAR(30) DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- القسم 3: كتالوج الموديلات، الطلبات، وبنود البيع، والتصنيع
-- ====================================================================================

-- 3.1 جدول الموديلات والمنتجات (Products)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY, -- 'PROD-000001'
    sku VARCHAR(100) UNIQUE NOT NULL,
    model_name VARCHAR(150) NOT NULL,
    model_no VARCHAR(50),
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    collection VARCHAR(100),
    design_code VARCHAR(50),
    designer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    fabric_id VARCHAR(64),
    base_price NUMERIC(18, 4) NOT NULL DEFAULT 0.0000, -- سعر البيع الأساسي
    cost_price NUMERIC(18, 4) NOT NULL DEFAULT 0.0000, -- تكلفة الإنتاج التقديرية
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
    image_url TEXT,
    description TEXT,
    min_stock INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'Active',
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 جدول فواتير وطلبات المبيعات (Orders Header)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY, -- 'ORD-000001'
    order_no VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    child_id VARCHAR(64) REFERENCES children(id) ON DELETE SET NULL,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    variant_id VARCHAR(64),
    quantity NUMERIC(12, 2) DEFAULT 1.00,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    subtotal NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    discount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    tax NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    total_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    paid_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    remaining_amount NUMERIC(18, 4) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    base_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000, -- المقابل بالريال اليمني
    payment_status VARCHAR(30) DEFAULT 'Unpaid',     -- 'Paid', 'Partial', 'Unpaid'
    production_status VARCHAR(30) DEFAULT 'Pending', -- 'Pending', 'Cutting', 'Sewing', 'Quality', 'Ready', 'Delivered'
    payment_method VARCHAR(50),
    status VARCHAR(30) DEFAULT 'Active',             -- 'Active', 'Completed', 'Cancelled'
    notes TEXT,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.3 جدول بنود الطلبات التفصيلية (Order Items - 3NF)
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    measurement_id VARCHAR(64) REFERENCES measurements(id) ON DELETE SET NULL,
    variant_id VARCHAR(64),
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(18, 4) NOT NULL,
    total_price NUMERIC(18, 4) NOT NULL,
    notes TEXT
);

-- 3.4 جدول أوامر الإنتاج والتفصيل المعملية (Production Orders)
CREATE TABLE IF NOT EXISTS production_orders (
    id VARCHAR(64) PRIMARY KEY, -- 'PROD-ORD-000001'
    production_order_no VARCHAR(50) UNIQUE NOT NULL,
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE RESTRICT,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id VARCHAR(64),
    product_name VARCHAR(150),
    child_name VARCHAR(100),
    stage VARCHAR(50) DEFAULT 'Preparation', -- 'Cutting', 'Sewing', 'Embroidery', 'Fitting', 'Quality', 'Finished'
    assigned_tailor_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    assigned_designer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    start_date DATE,
    due_date DATE,
    progress NUMERIC(5, 2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'In Progress',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- القسم 4: الموردون، المستودعات، المخزون، والمشتريات
-- ====================================================================================

-- 4.1 جدول الموردين (Suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(64) PRIMARY KEY, -- 'SUP-000001'
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    phone_alt VARCHAR(30),
    email VARCHAR(100),
    city VARCHAR(50),
    address TEXT,
    current_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000, -- رصيد المورد المستحق
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4.2 جدول خامات ومواد المخزون (Inventory / Materials)
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(64) PRIMARY KEY, -- 'MAT-000001'
    item_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50),      -- 'Fabric', 'Accessory', 'Threads', 'Packaging'
    category VARCHAR(50),  -- 'Silk', 'Cotton', 'Tulle', 'Lace'
    unit VARCHAR(20) NOT NULL DEFAULT 'meter',
    quantity NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    reserved_qty NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    available_qty NUMERIC(14, 4) GENERATED ALWAYS AS (quantity - reserved_qty) STORED,
    min_limit NUMERIC(14, 4) DEFAULT 5.0000,
    unit_cost NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    total_value NUMERIC(18, 4) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE SET NULL,
    location VARCHAR(100),
    status VARCHAR(30) DEFAULT 'Available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4.3 جدول فواتير المشتريات (Purchases Header)
CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(64) PRIMARY KEY, -- 'PUR-000001'
    invoice_no VARCHAR(50) UNIQUE NOT NULL,
    supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(150) NOT NULL,
    supplier_phone VARCHAR(30),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    item_name VARCHAR(150),
    unit VARCHAR(20),
    quantity NUMERIC(14, 4) DEFAULT 0.0000,
    unit_price NUMERIC(18, 4) DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    original_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    discount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    amount_yer NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    shipping_cost NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    transfer_fee NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    grand_total_yer NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    payment_method VARCHAR(50),
    payment_account_code VARCHAR(64),
    transaction_ref VARCHAR(100),
    invoice_attachment TEXT,
    receipt_attachment TEXT,
    receipt_status VARCHAR(30) DEFAULT 'Received',
    payment_status VARCHAR(30) DEFAULT 'Unpaid',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4.4 جدول بنود فواتير المشتريات (Purchase Items)
CREATE TABLE IF NOT EXISTS purchase_items (
    id VARCHAR(64) PRIMARY KEY,
    purchase_id VARCHAR(64) NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    inventory_id VARCHAR(64) REFERENCES inventory(id) ON DELETE RESTRICT,
    item_name VARCHAR(150) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quantity NUMERIC(14, 4) NOT NULL,
    unit_price NUMERIC(18, 4) NOT NULL,
    total_price NUMERIC(18, 4) NOT NULL,
    notes TEXT
);

-- 4.5 جدول حركات المخزون التفصيلية (Stock Ledger Transactions)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id VARCHAR(64) PRIMARY KEY, -- 'INV-TXN-000001'
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    inventory_id VARCHAR(64) REFERENCES inventory(id) ON DELETE RESTRICT,
    variant_id VARCHAR(64),
    fabric_id VARCHAR(64),
    warehouse_id VARCHAR(64) DEFAULT 'WH-MAIN',
    transaction_type VARCHAR(30) NOT NULL, -- 'IN_PURCHASE', 'OUT_PRODUCTION', 'WASTE', 'ADJUSTMENT'
    quantity NUMERIC(14, 4) NOT NULL,
    unit_cost NUMERIC(18, 4) NOT NULL,
    total_cost NUMERIC(18, 4) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    reference_type VARCHAR(50),
    reference_id VARCHAR(64),
    notes TEXT,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- القسم 5: الحسابات المالية، شجرة الحسابات، القيود المزدوجة، والسندات
-- ====================================================================================

-- 5.1 دليل وشجرة الحسابات المحاسبية (Chart of Accounts)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id VARCHAR(64) PRIMARY KEY, -- 'ACC-1111'
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_name_en VARCHAR(150),
    account_type VARCHAR(50) NOT NULL, -- 'Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses'
    account_category VARCHAR(50) NOT NULL, -- 'Cash', 'Banks', 'Customers', 'Suppliers', etc.
    parent_account_id VARCHAR(64) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    parent_account_code VARCHAR(50),
    level INT NOT NULL DEFAULT 1,
    account_path VARCHAR(255),
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    is_postable BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('Debit', 'Credit')),
    opening_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    current_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    balance_type VARCHAR(10) DEFAULT 'Debit',
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
    establishment_date DATE,
    notes TEXT,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5.2 القيود اليومية المحاسبية العامة (Journal Entries Header)
CREATE TABLE IF NOT EXISTS journal_entries (
    id VARCHAR(64) PRIMARY KEY, -- 'JV-000001'
    entry_no VARCHAR(50) UNIQUE NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    debit_account_id VARCHAR(64) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    credit_account_id VARCHAR(64) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    ref_type VARCHAR(50), -- 'Order', 'Payment', 'Expense', 'Purchase', 'Manual'
    ref_id VARCHAR(64),
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    total_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    base_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    notes TEXT,
    status VARCHAR(30) DEFAULT 'Posted',
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5.3 أسطر القيود اليومية (Journal Entry Lines - True Double Entry)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id VARCHAR(64) PRIMARY KEY,
    entry_id VARCHAR(64) NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id VARCHAR(64) NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    line_description TEXT,
    debit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    credit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    debit_base NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    credit_base NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    CHECK (debit >= 0 AND credit >= 0),
    CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

-- 5.4 السندات المالية (قبض / صرف) (Payments & Vouchers)
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY, -- 'PAY-000001'
    payment_no VARCHAR(50) UNIQUE NOT NULL,
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
    invoice_id VARCHAR(64) REFERENCES purchases(id) ON DELETE SET NULL,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE RESTRICT,
    supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE RESTRICT,
    payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('Receipt', 'Payment', 'سند_قبض', 'سند_صرف')),
    amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    base_amount NUMERIC(18, 4) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_no VARCHAR(100),
    account_id VARCHAR(64) NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) DEFAULT 'Confirmed',
    notes TEXT,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5.5 جدول المصروفات التشغيلية (Expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(64) PRIMARY KEY, -- 'EXP-000001'
    expense_no VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
    exchange_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    base_amount NUMERIC(18, 4) NOT NULL,
    transaction_id VARCHAR(100),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL,
    recipient VARCHAR(150),
    account_id VARCHAR(64) NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    status VARCHAR(30) DEFAULT 'Paid',
    notes TEXT,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- القسم 6: الموارد البشرية، الموظفون، ومسير الرواتب
-- ====================================================================================

-- 6.1 جدول الموظفين (Employees)
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(64) PRIMARY KEY, -- 'EMP-000001'
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(30),
    salary NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
    hire_date DATE,
    status VARCHAR(30) DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6.2 جدول مسير الرواتب (Payroll)
CREATE TABLE IF NOT EXISTS payroll (
    id VARCHAR(64) PRIMARY KEY, -- 'PAYROLL-000001'
    payroll_no VARCHAR(50) UNIQUE NOT NULL,
    employee_id VARCHAR(64) NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    employee_name VARCHAR(150),
    month VARCHAR(20) NOT NULL,
    basic_salary NUMERIC(18, 4) NOT NULL,
    allowances NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    deductions NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    net_salary NUMERIC(18, 4) GENERATED ALWAYS AS (basic_salary + allowances - deductions) STORED,
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code) ON DELETE RESTRICT,
    payment_date DATE,
    status VARCHAR(30) DEFAULT 'Draft',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- القسم 7: منظومة إدارة وضمان الجودة الشاملة (Quality Assurance Suite)
-- ====================================================================================

-- 7.1 نقاط ومعايير الفحص (Quality Checkpoints)
CREATE TABLE IF NOT EXISTS quality_checkpoints (
    id VARCHAR(64) PRIMARY KEY,
    checkpoint_name VARCHAR(150) NOT NULL,
    production_stage VARCHAR(50) NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT TRUE,
    criteria TEXT,
    tolerance NUMERIC(5, 2) DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7.2 إعدادات ومؤشرات الجودة (Quality Settings)
CREATE TABLE IF NOT EXISTS quality_settings (
    id VARCHAR(64) PRIMARY KEY,
    metric_name VARCHAR(150) NOT NULL,
    metric_code VARCHAR(50) UNIQUE NOT NULL,
    formula TEXT,
    target NUMERIC(10, 2),
    warning_threshold NUMERIC(10, 2),
    critical_threshold NUMERIC(10, 2),
    weight NUMERIC(5, 2) DEFAULT 1.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7.3 فحوصات الجودة المخبرية والمعملية (Quality Inspections)
CREATE TABLE IF NOT EXISTS quality_inspections (
    id VARCHAR(64) PRIMARY KEY,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(150),
    sku VARCHAR(100),
    model_id VARCHAR(50),
    color VARCHAR(50),
    size VARCHAR(50),
    production_order_id VARCHAR(64) REFERENCES production_orders(id) ON DELETE SET NULL,
    production_stage VARCHAR(50),
    batch_id VARCHAR(50),
    quantity_checked INT NOT NULL DEFAULT 1,
    quantity_passed INT NOT NULL DEFAULT 1,
    quantity_failed INT NOT NULL DEFAULT 0,
    inspection_result VARCHAR(30) NOT NULL,
    inspector_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    inspector_name VARCHAR(100),
    notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7.4 عيوب الجودة ومشاكل التصنيع (Quality Defects)
CREATE TABLE IF NOT EXISTS quality_defects (
    id VARCHAR(64) PRIMARY KEY,
    defect_date DATE NOT NULL DEFAULT CURRENT_DATE,
    inspection_id VARCHAR(64) REFERENCES quality_inspections(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(150),
    sku VARCHAR(100),
    model_id VARCHAR(50),
    color VARCHAR(50),
    size VARCHAR(50),
    production_order_id VARCHAR(64) REFERENCES production_orders(id) ON DELETE SET NULL,
    production_stage VARCHAR(50),
    defect_type VARCHAR(50) NOT NULL,
    defect_category VARCHAR(50),
    severity VARCHAR(30),
    affected_quantity INT DEFAULT 1,
    root_cause TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    status VARCHAR(30) DEFAULT 'Open',
    assigned_to VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    resolved_date DATE,
    rework_cost NUMERIC(18, 4) DEFAULT 0.0000,
    waste_cost NUMERIC(18, 4) DEFAULT 0.0000,
    return_cost NUMERIC(18, 4) DEFAULT 0.0000,
    total_cost NUMERIC(18, 4) GENERATED ALWAYS AS (rework_cost + waste_cost + return_cost) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7.5 شكاوى وملاحظات العملاء (Quality Complaints)
CREATE TABLE IF NOT EXISTS quality_complaints (
    id VARCHAR(64) PRIMARY KEY,
    complaint_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(150),
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
    complaint_type VARCHAR(50) NOT NULL,
    severity VARCHAR(30),
    description TEXT NOT NULL,
    assigned_to VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    response_date DATE,
    compensation_cost NUMERIC(18, 4) DEFAULT 0.0000,
    status VARCHAR(30) DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7.6 مرتجعات المنتجات والفساتين (Quality Returns)
CREATE TABLE IF NOT EXISTS quality_returns (
    id VARCHAR(64) PRIMARY KEY,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE RESTRICT,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE RESTRICT,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    return_reason TEXT NOT NULL,
    condition VARCHAR(50),
    action_taken VARCHAR(50),
    refund_amount NUMERIC(18, 4) DEFAULT 0.0000,
    replacement_cost NUMERIC(18, 4) DEFAULT 0.0000,
    status VARCHAR(30) DEFAULT 'Processing',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7.7 خطط الإجراءات التصحيحية والوقائية (CAPA Actions)
CREATE TABLE IF NOT EXISTS quality_actions (
    id VARCHAR(64) PRIMARY KEY,
    action_type VARCHAR(30) NOT NULL,
    defect_id VARCHAR(64) REFERENCES quality_defects(id) ON DELETE SET NULL,
    complaint_id VARCHAR(64) REFERENCES quality_complaints(id) ON DELETE SET NULL,
    problem_statement TEXT NOT NULL,
    root_cause TEXT,
    action_description TEXT NOT NULL,
    responsible_person VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    completion_date DATE,
    priority VARCHAR(20) DEFAULT 'Medium',
    status VARCHAR(30) DEFAULT 'Planned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7.8 تقييمات واستبيانات الرضا (Quality Feedback)
CREATE TABLE IF NOT EXISTS quality_feedback (
    id VARCHAR(64) PRIMARY KEY,
    feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(150),
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    csat_score NUMERIC(5, 2),
    nps_score INT,
    feedback_category VARCHAR(50),
    feedback_comment TEXT,
    channel VARCHAR(50),
    status VARCHAR(30) DEFAULT 'Reviewed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- القسم 8: ملف المؤسسة، الإعدادات العامة، وتعدد الفروع والمستأجرين (Tenants & Profile)
-- ====================================================================================

-- 8.1 جدول المؤسسات والفروع والمستأجرين (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    gas_url TEXT,
    plan VARCHAR(50) DEFAULT 'Enterprise',
    currency VARCHAR(3) DEFAULT 'YER',
    status VARCHAR(30) DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8.2 جدول بروفايل وهوية المؤسسة (Company Profile)
CREATE TABLE IF NOT EXISTS company_profile (
    id INT PRIMARY KEY DEFAULT 1,
    company_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    address TEXT,
    email VARCHAR(100),
    base_currency VARCHAR(3) DEFAULT 'YER',
    logo_url TEXT,
    establishment_date DATE,
    notes TEXT
);

-- 8.3 جدول الإعدادات العامة للنظام (System Settings)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    category VARCHAR(50) DEFAULT 'General',
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8.4 جدول مفاتيح منع التكرار (Idempotency Keys)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    idempotency_key VARCHAR(100) PRIMARY KEY,
    endpoint VARCHAR(150),
    response_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- القسم 9: منصات التسويق، الشبكات الاجتماعية، والأحداث (Marketing Platforms & Events)
-- ====================================================================================

-- 9.1 جدول منصات التواصل والتسويق (Marketing Platforms)
CREATE TABLE IF NOT EXISTS marketing_platforms (
    platform_id VARCHAR(64) PRIMARY KEY,
    platform_name VARCHAR(100) UNIQUE NOT NULL,
    platform_type VARCHAR(50) NOT NULL,
    account_name VARCHAR(100) DEFAULT '',
    account_id VARCHAR(100) DEFAULT '',
    status VARCHAR(50) DEFAULT 'disconnected',
    access_token_reference TEXT DEFAULT '',
    refresh_token_reference TEXT DEFAULT '',
    token_expiry TIMESTAMPTZ,
    permissions JSONB DEFAULT '[]'::jsonb,
    last_sync TIMESTAMPTZ,
    webhook_status VARCHAR(50) DEFAULT 'inactive',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9.2 جدول مصفوفة قدرات المنصات (Capability Matrix)
CREATE TABLE IF NOT EXISTS capability_matrix (
    platform VARCHAR(100) PRIMARY KEY,
    posts INT DEFAULT 0,
    reels INT DEFAULT 0,
    stories INT DEFAULT 0,
    comments INT DEFAULT 0,
    messages INT DEFAULT 0,
    insights INT DEFAULT 0,
    ads INT DEFAULT 0,
    audience INT DEFAULT 0,
    webhooks INT DEFAULT 0,
    notes TEXT DEFAULT ''
);

-- 9.3 جدول أحداث وخطافات الويب الخام (Raw Platform Events / Webhooks)
CREATE TABLE IF NOT EXISTS raw_platform_events (
    event_id VARCHAR(64) PRIMARY KEY,
    platform VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'received',
    error TEXT DEFAULT '',
    retry_count INT DEFAULT 0,
    idempotency_key VARCHAR(100) UNIQUE
);

-- ====================================================================================
-- القسم 10: الحملات الإعلانية، المحتوى، والمحادثات الذكية (Campaigns & Engagement)
-- ====================================================================================

-- 10.1 جدول الحملات الإعلانية والتسويقية (Campaigns)
CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id VARCHAR(64) PRIMARY KEY,
    campaign_code VARCHAR(50),
    campaign_name VARCHAR(150) NOT NULL,
    platform VARCHAR(100) NOT NULL,
    campaign_type VARCHAR(50),
    objective VARCHAR(100) DEFAULT 'مبيعات مباشرة',
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    budget NUMERIC(18, 4) DEFAULT 0.0000,
    actual_spend NUMERIC(18, 4) DEFAULT 0.0000,
    sales_count INT DEFAULT 0,
    revenue_achieved NUMERIC(18, 4) DEFAULT 0.0000,
    roas NUMERIC(8, 2) DEFAULT 0.00,
    start_date DATE,
    end_date DATE,
    status VARCHAR(30) DEFAULT 'نشط',
    payment_account VARCHAR(64) DEFAULT '101 - الصندوق الرئيسي',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10.2 جدول منشورات ومحتوى السوشيال ميديا (Content)
CREATE TABLE IF NOT EXISTS content (
    content_id VARCHAR(64) PRIMARY KEY,
    platform VARCHAR(100) NOT NULL,
    platform_content_id VARCHAR(100) DEFAULT '',
    content_type VARCHAR(50) DEFAULT 'Reel',
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE SET NULL,
    campaign_id VARCHAR(64) REFERENCES campaigns(campaign_id) ON DELETE SET NULL,
    caption TEXT DEFAULT '',
    media_url TEXT DEFAULT '',
    thumbnail_url TEXT DEFAULT '',
    publish_date TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10.3 جدول إحصائيات وتفاعل المحتوى اللحظي (Content Metrics)
CREATE TABLE IF NOT EXISTS content_metrics (
    metric_id BIGSERIAL PRIMARY KEY,
    content_id VARCHAR(64) NOT NULL REFERENCES content(content_id) ON DELETE CASCADE,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reach INT DEFAULT 0,
    impressions INT DEFAULT 0,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    saves INT DEFAULT 0,
    clicks INT DEFAULT 0,
    profile_visits INT DEFAULT 0,
    messages INT DEFAULT 0,
    leads INT DEFAULT 0,
    orders INT DEFAULT 0,
    revenue NUMERIC(18, 4) DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10.4 جدول تعليقات المنشورات (Comments)
CREATE TABLE IF NOT EXISTS comments (
    comment_id VARCHAR(64) PRIMARY KEY,
    platform VARCHAR(100) NOT NULL,
    platform_comment_id VARCHAR(100) DEFAULT '',
    content_id VARCHAR(64) REFERENCES content(content_id) ON DELETE SET NULL,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    parent_comment_id VARCHAR(64) DEFAULT '',
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10.5 جدول محادثات العملاء عبر المنصات (Conversations)
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id VARCHAR(64) PRIMARY KEY,
    platform VARCHAR(100) NOT NULL,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10.6 جدول رسائل المحادثات التفصيلية (Messages)
CREATE TABLE IF NOT EXISTS messages (
    message_id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    platform_message_id VARCHAR(100) DEFAULT '',
    sender_type VARCHAR(30) DEFAULT 'customer',
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB DEFAULT '{}'::jsonb
);

-- 10.7 جدول ربط العميل بمعرفات منصات التواصل (Customer Platform Mappings)
CREATE TABLE IF NOT EXISTS customer_platform_mappings (
    mapping_id BIGSERIAL PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    platform VARCHAR(100) NOT NULL,
    platform_user_id VARCHAR(100) DEFAULT '',
    whatsapp_phone_reference VARCHAR(50) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- القسم 11: ذكاء التسويق، معالجة اللغة الطبيعية، ونماذج الإسناد (Marketing AI & NLP)
-- ====================================================================================

-- 11.1 جدول أوزان التقييم الذكي لتفاعل العملاء (AI Scoring Weights)
CREATE TABLE IF NOT EXISTS ai_scoring_weights (
    id BIGSERIAL PRIMARY KEY,
    weight_name VARCHAR(100) UNIQUE NOT NULL,
    value NUMERIC(10, 4) NOT NULL,
    category VARCHAR(100) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11.2 جدول تحليل المشاعر والنوايا للتعليقات باللهجة اليمنية (AI Comment NLP)
CREATE TABLE IF NOT EXISTS ai_comment_nlp (
    id BIGSERIAL PRIMARY KEY,
    comment_id VARCHAR(64) UNIQUE NOT NULL REFERENCES comments(comment_id) ON DELETE CASCADE,
    sentiment VARCHAR(50) DEFAULT 'Neutral',
    sentiment_cause VARCHAR(100) DEFAULT 'General',
    intent_category VARCHAR(100) DEFAULT 'General Question',
    extracted_product VARCHAR(150) DEFAULT '',
    extracted_color VARCHAR(50) DEFAULT '',
    extracted_size VARCHAR(50) DEFAULT '',
    extracted_age VARCHAR(50) DEFAULT '',
    extracted_location VARCHAR(100) DEFAULT '',
    dialect VARCHAR(50) DEFAULT 'Yemeni',
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11.3 جدول نية الشراء في المحادثات واكتشاف الفرص الصامتة (AI Conversation Intent)
CREATE TABLE IF NOT EXISTS ai_conversation_intent (
    conversation_id VARCHAR(64) PRIMARY KEY REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    intent_score NUMERIC(5, 2) DEFAULT 0.00,
    intent_bracket VARCHAR(100) DEFAULT 'General Interaction',
    silent_high_intent BOOLEAN DEFAULT FALSE,
    lost_opportunity_reason VARCHAR(255) DEFAULT 'None',
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11.4 جدول الملخصات والتقارير التنفيذية اليومية للذكاء الاصطناعي (AI Daily Briefs)
CREATE TABLE IF NOT EXISTS ai_daily_briefs (
    brief_date DATE PRIMARY KEY,
    performance_summary TEXT DEFAULT '',
    top_product VARCHAR(150) DEFAULT '',
    top_content VARCHAR(150) DEFAULT '',
    top_campaign VARCHAR(150) DEFAULT '',
    customer_demand TEXT DEFAULT '',
    negative_signals TEXT DEFAULT '',
    opportunities TEXT DEFAULT '',
    recommended_actions TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11.5 جدول توصيات الذكاء الاصطناعي للحملات والمخزون (AI Recommendations)
CREATE TABLE IF NOT EXISTS ai_recommendations (
    rec_id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    recommendation TEXT NOT NULL,
    reason TEXT NOT NULL,
    expected_impact VARCHAR(200) NOT NULL,
    confidence NUMERIC(5, 2) NOT NULL,
    evidence TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'Campaign Investment',
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11.6 جدول سجلات الإسناد البيعي للحملات (Attribution Records)
CREATE TABLE IF NOT EXISTS attribution_records (
    id BIGSERIAL PRIMARY KEY,
    campaign_id VARCHAR(64) NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    model_type VARCHAR(50) NOT NULL,
    attributed_revenue NUMERIC(18, 4) DEFAULT 0.0000,
    attributed_orders INT DEFAULT 0,
    data_source VARCHAR(50) DEFAULT 'Actual',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================================
-- القسم 12: الفهارس عالية الأداء (Performance Indexes)
-- ====================================================================================

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_children_customer ON children(customer_id);
CREATE INDEX IF NOT EXISTS idx_meas_customer ON measurements(customer_id);
CREATE INDEX IF NOT EXISTS idx_meas_child ON measurements(child_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_prod ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_prod_orders_order ON production_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory(item_code);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(invoice_date);
CREATE INDEX IF NOT EXISTS idx_purchase_items_pur ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_inv_txn_inv ON inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_coa_code ON chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_jv_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_account ON expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_content_campaign ON content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_metrics_content ON content_metrics(content_id);
CREATE INDEX IF NOT EXISTS idx_comments_content ON comments(content_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_plat_map_cust ON customer_platform_mappings(customer_id);
CREATE INDEX IF NOT EXISTS idx_attribution_camp ON attribution_records(campaign_id);

-- ====================================================================================
-- القسم 13: الدوال المخزنة والمحركات البرمجية (Stored Procedures & Functions)
-- ====================================================================================

-- 9.1 دالة التحديث التلقائي لتوقيت التعديل (Updated_At Auto-Trigger Function)
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9.2 دالة توليد الأرقام التسلسلية الذرية (Atomic Code Generator Function)
CREATE OR REPLACE FUNCTION fn_generate_next_code(p_key VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR(20);
    v_cur BIGINT;
    v_pad INT;
    v_result VARCHAR(64);
BEGIN
    UPDATE number_sequences
    SET current_number = current_number + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE sequence_key = p_key
    RETURNING prefix, current_number, padding INTO v_prefix, v_cur, v_pad;

    IF NOT FOUND THEN
        -- إنشاء تسلسل تلقائي افتراضي في حال عدم وجوده مسبقاً
        v_prefix := p_key || '-';
        v_cur := 1;
        v_pad := 6;
        INSERT INTO number_sequences (sequence_key, prefix, current_number, padding)
        VALUES (p_key, v_prefix, v_cur, v_pad);
    END IF;

    v_result := v_prefix || LPAD(v_cur::TEXT, v_pad, '0');
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 9.3 دالة تحويل العملات وحساب المعادل بالعملة الأساسية YER
CREATE OR REPLACE FUNCTION fn_convert_to_base(
    p_amount NUMERIC,
    p_currency VARCHAR,
    p_rate NUMERIC DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC(12, 6);
BEGIN
    IF p_currency = 'YER' THEN
        RETURN p_amount;
    END IF;

    IF p_rate IS NOT NULL AND p_rate > 0 THEN
        v_rate := p_rate;
    ELSE
        SELECT exchange_rate INTO v_rate FROM currencies WHERE code = p_currency;
        IF v_rate IS NULL OR v_rate <= 0 THEN
            v_rate := 1.0;
        END IF;
    END IF;

    RETURN ROUND(p_amount * v_rate, 4);
END;
$$ LANGUAGE plpgsql;

-- 9.4 دالة التحقق وتحديث أرصدة شجرة الحسابات آلياً عند ترحيل القيود
CREATE OR REPLACE FUNCTION fn_update_account_balances()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كان القيد مدين
    IF NEW.debit > 0 THEN
        UPDATE chart_of_accounts
        SET current_balance = CASE
            WHEN normal_balance = 'Debit' THEN current_balance + NEW.debit
            ELSE current_balance - NEW.debit
        END
        WHERE id = NEW.account_id;
    END IF;

    -- إذا كان القيد دائن
    IF NEW.credit > 0 THEN
        UPDATE chart_of_accounts
        SET current_balance = CASE
            WHEN normal_balance = 'Credit' THEN current_balance + NEW.credit
            ELSE current_balance - NEW.credit
        END
        WHERE id = NEW.account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9.5 دالة التحديث اللحظي لكميات المخزون عند حدوث حركة مستودعية
CREATE OR REPLACE FUNCTION fn_update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type IN ('IN_PURCHASE', 'IN_ADJUSTMENT', 'RETURN') THEN
        UPDATE inventory
        SET quantity = quantity + NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.inventory_id;
    ELSIF NEW.transaction_type IN ('OUT_PRODUCTION', 'OUT_SALE', 'OUT_WASTE', 'OUT_ADJUSTMENT') THEN
        UPDATE inventory
        SET quantity = quantity - NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.inventory_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9.6 دالة تسجيل التغييرات في سجل التدقيق التلقائي (Auto Audit Logger)
CREATE OR REPLACE FUNCTION fn_audit_logger()
RETURNS TRIGGER AS $$
DECLARE
    v_user VARCHAR(64) := NULL;
    v_ent_id VARCHAR(64);
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_ent_id := OLD.id;
        INSERT INTO audit_logs (entity_type, entity_id, action, old_values, created_at)
        VALUES (TG_TABLE_NAME, v_ent_id, 'DELETE', to_jsonb(OLD), CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_ent_id := NEW.id;
        INSERT INTO audit_logs (entity_type, entity_id, action, old_values, new_values, created_at)
        VALUES (TG_TABLE_NAME, v_ent_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        v_ent_id := NEW.id;
        INSERT INTO audit_logs (entity_type, entity_id, action, new_values, created_at)
        VALUES (TG_TABLE_NAME, v_ent_id, 'INSERT', to_jsonb(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================================
-- القسم 10: المحفزات التلقائية (Triggers)
-- ====================================================================================

-- 10.1 محفزات تحديث updated_at تلقائياً
CREATE OR REPLACE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_children_updated_at BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_measurements_updated_at BEFORE UPDATE ON measurements FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_production_orders_updated_at BEFORE UPDATE ON production_orders FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE OR REPLACE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 10.2 محفز التحديث التلقائي لرصيد الحسابات عند إضافة سطر قيد محاسبي
DROP TRIGGER IF EXISTS trg_journal_line_balance ON journal_entry_lines;
CREATE TRIGGER trg_journal_line_balance
AFTER INSERT ON journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION fn_update_account_balances();

-- 10.3 محفز التحديث التلقائي للمخزون عند إضافة حركة مستودعية
DROP TRIGGER IF EXISTS trg_inventory_txn_stock ON inventory_transactions;
CREATE TRIGGER trg_inventory_txn_stock
AFTER INSERT ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION fn_update_inventory_stock();

-- ====================================================================================
-- القسم 11: العروض المحاسبية والتقارير التنفيذية (Views & Executive Reports)
-- ====================================================================================

-- 11.1 عرض ميزان المراجعة بالمجاميع والأرصدة (Trial Balance View)
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT 
    a.account_code,
    a.account_name,
    a.account_type,
    a.normal_balance,
    a.currency,
    COALESCE(SUM(l.debit_base), 0.0000) AS total_debit_base,
    COALESCE(SUM(l.credit_base), 0.0000) AS total_credit_base,
    CASE 
        WHEN a.normal_balance = 'Debit' THEN (COALESCE(SUM(l.debit_base), 0.0000) - COALESCE(SUM(l.credit_base), 0.0000))
        ELSE (COALESCE(SUM(l.credit_base), 0.0000) - COALESCE(SUM(l.debit_base), 0.0000))
    END AS net_balance_base
FROM chart_of_accounts a
LEFT JOIN journal_entry_lines l ON a.id = l.account_id
WHERE a.is_postable = TRUE
GROUP BY a.account_code, a.account_name, a.account_type, a.normal_balance, a.currency;

-- 11.2 عرض كشف حساب دفتر الأستاذ العام (General Ledger View)
CREATE OR REPLACE VIEW v_general_ledger AS
SELECT 
    j.entry_date,
    j.entry_no,
    j.ref_type,
    j.ref_id,
    a.account_code,
    a.account_name,
    l.line_description,
    l.debit,
    l.credit,
    j.currency,
    j.exchange_rate,
    l.debit_base,
    l.credit_base
FROM journal_entry_lines l
JOIN journal_entries j ON l.entry_id = j.id
JOIN chart_of_accounts a ON l.account_id = a.id
ORDER BY j.entry_date DESC, j.entry_no DESC;

-- 11.3 عرض حالة المخزون وتنبيهات إعادة الطلب (Inventory Status & Reorder Alerts)
CREATE OR REPLACE VIEW v_inventory_status AS
SELECT 
    i.id,
    i.item_code,
    i.name,
    i.type,
    i.category,
    i.unit,
    i.quantity,
    i.reserved_qty,
    i.available_qty,
    i.min_limit,
    i.unit_cost,
    i.total_value,
    CASE 
        WHEN i.available_qty <= 0 THEN 'نفد المخزون'
        WHEN i.available_qty <= i.min_limit THEN 'تنبيه: وصل للحد الأدنى'
        ELSE 'متوفر'
    END AS stock_status,
    s.name AS supplier_name,
    s.phone AS supplier_phone
FROM inventory i
LEFT JOIN suppliers s ON i.supplier_id = s.id;

-- 11.4 عرض تفاصيل الطلبات الشامل مع اسم العميل والطفل والموديل (Orders Master View)
CREATE OR REPLACE VIEW v_orders_detailed AS
SELECT 
    o.id AS order_id,
    o.order_no,
    o.order_date,
    o.delivery_date,
    c.name AS customer_name,
    c.phone AS customer_phone,
    ch.child_name,
    ch.gender AS child_gender,
    o.total_amount,
    o.paid_amount,
    o.remaining_amount,
    o.currency,
    o.exchange_rate,
    o.base_amount,
    o.payment_status,
    o.production_status,
    o.status AS order_status
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN children ch ON o.child_id = ch.id;

-- ====================================================================================
-- القسم 12: البيانات التأسيسية الافتراضية (Seed Defaults)
-- ====================================================================================

-- 12.1 العملات الأساسية
INSERT INTO currencies (code, name, symbol, exchange_rate, is_base, is_active)
VALUES 
    ('YER', 'ريال يمني', 'ر.ي', 1.000000, TRUE, TRUE),
    ('SAR', 'ريال سعودي', 'ر.س', 142.500000, FALSE, TRUE),
    ('USD', 'دولار أمريكي', '$', 535.000000, FALSE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 12.2 تسلسلات الترقيم الأولية
INSERT INTO number_sequences (sequence_key, prefix, current_number, padding, description)
VALUES 
    ('CUST', 'CUST-', 0, 6, 'تسلسل أرقام العملاء'),
    ('CHLD', 'CHLD-', 0, 6, 'تسلسل أرقام الأطفال'),
    ('MEAS', 'MEAS-', 0, 6, 'تسلسل أرقام المقاسات'),
    ('PROD', 'PROD-', 0, 6, 'تسلسل أرقام المنتجات والموديلات'),
    ('ORD', 'ORD-', 0, 6, 'تسلسل أرقام الطلبات والفواتير'),
    ('PROD-ORD', 'PROD-ORD-', 0, 6, 'تسلسل أوامر الإنتاج المعملية'),
    ('SUP', 'SUP-', 0, 6, 'تسلسل أرقام الموردين'),
    ('MAT', 'MAT-', 0, 6, 'تسلسل خامات ومواد المخزون'),
    ('PUR', 'PUR-', 0, 6, 'تسلسل فواتير المشتريات'),
    ('INV-TXN', 'INV-TXN-', 0, 6, 'تسلسل حركات المخزون'),
    ('ACC', 'ACC-', 0, 4, 'تسلسل حسابات الدليل المحاسبي'),
    ('JV', 'JV-', 0, 6, 'تسلسل القيود اليومية المحاسبية'),
    ('PAY', 'PAY-', 0, 6, 'تسلسل سندات القبض والصرف'),
    ('EXP', 'EXP-', 0, 6, 'تسلسل سندات المصروفات'),
    ('EMP', 'EMP-', 0, 6, 'تسلسل أرقام الموظفين'),
    ('PAYROLL', 'PAYROLL-', 0, 6, 'تسلسل مسيرات الرواتب'),
    ('INSP', 'INSP-', 0, 6, 'تسلسل فحوصات الجودة'),
    ('DEF', 'DEF-', 0, 6, 'تسلسل تقارير عيوب الجودة'),
    ('CMPL', 'CMPL-', 0, 6, 'تسلسل شكاوى الجودة'),
    ('RET', 'RET-', 0, 6, 'تسلسل مرتجعات الجودة'),
    ('CAPA', 'CAPA-', 0, 6, 'تسلسل الإجراءات التصحيحية'),
    ('FB', 'FB-', 0, 6, 'تسلسل تقييمات العملاء')
ON CONFLICT (sequence_key) DO NOTHING;

-- 12.3 شجرة الحسابات القياسية التأسيسية
INSERT INTO chart_of_accounts (id, account_code, account_name, account_type, account_category, normal_balance, is_group, is_postable, currency)
VALUES 
    -- 1. الأصول
    ('ACC-1', '1', 'الأصول', 'Assets', 'Assets', 'Debit', TRUE, FALSE, 'YER'),
    ('ACC-101', '101', 'صندوق النقدية الرئيسي (YER)', 'Assets', 'Cash', 'Debit', FALSE, TRUE, 'YER'),
    ('ACC-101-2', '101.2', 'صندوق الريال السعودي (SAR)', 'Assets', 'Cash', 'Debit', FALSE, TRUE, 'SAR'),
    ('ACC-101-3', '101.3', 'صندوق الدولار (USD)', 'Assets', 'Cash', 'Debit', FALSE, TRUE, 'USD'),
    ('ACC-102', '102', 'البنوك والشبكات', 'Assets', 'Banks', 'Debit', TRUE, FALSE, 'YER'),
    ('ACC-103', '103', 'حساب بنك الكريمي (YER)', 'Assets', 'Banks', 'Debit', FALSE, TRUE, 'YER'),
    ('ACC-104', '104', 'ذمم العملاء (حسابات القبض)', 'Assets', 'Receivables', 'Debit', FALSE, TRUE, 'YER'),
    ('ACC-105', '105', 'مخزون الأقمشة والخامات', 'Assets', 'Inventory', 'Debit', FALSE, TRUE, 'YER'),

    -- 2. الخصوم
    ('ACC-2', '2', 'الخصوم والالتزامات', 'Liabilities', 'Liabilities', 'Credit', TRUE, FALSE, 'YER'),
    ('ACC-201', '201', 'ذمم الموردين (حسابات الدفع)', 'Liabilities', 'Payables', 'Credit', FALSE, TRUE, 'YER'),
    ('ACC-202', '202', 'أمانات وعربونات العملاء المقدمة', 'Liabilities', 'Customer_Deposits', 'Credit', FALSE, TRUE, 'YER'),

    -- 3. حقوق الملكية
    ('ACC-3', '3', 'حقوق الملكية', 'Equity', 'Equity', 'Credit', TRUE, FALSE, 'YER'),
    ('ACC-301', '301', 'رأس المال', 'Equity', 'Capital', 'Credit', FALSE, TRUE, 'YER'),
    ('ACC-302', '302', 'الأرباح والخسائر المرحلة', 'Equity', 'Retained_Earnings', 'Credit', FALSE, TRUE, 'YER'),

    -- 4. الإيرادات
    ('ACC-4', '4', 'الإيرادات والمبيعات', 'Revenue', 'Revenue', 'Credit', TRUE, FALSE, 'YER'),
    ('ACC-401', '401', 'إيرادات مبيعات فساتين وتفصيل', 'Revenue', 'Sales', 'Credit', FALSE, TRUE, 'YER'),
    ('ACC-402', '402', 'أرباح فروق أسعار الصرف', 'Revenue', 'Exchange_Gain', 'Credit', FALSE, TRUE, 'YER'),

    -- 5. المصروفات
    ('ACC-5', '5', 'المصروفات والتكاليف', 'Expenses', 'Expenses', 'Debit', TRUE, FALSE, 'YER'),
    ('ACC-501', '501', 'تكلفة خامات الإنتاج والأقمشة', 'Expenses', 'COGS', 'Debit', FALSE, TRUE, 'YER'),
    ('ACC-502', '502', 'أجور ورواتب الخياطين والموظفين', 'Expenses', 'Salaries', 'Debit', FALSE, TRUE, 'YER'),
    ('ACC-503', '503', 'إيجار المعمل والمعرض', 'Expenses', 'Rent', 'Debit', FALSE, TRUE, 'YER'),
    ('ACC-504', '504', 'كهرباء ومياه وتشغيل', 'Expenses', 'Utilities', 'Debit', FALSE, TRUE, 'YER'),
    ('ACC-505', '505', 'مصاريف صيانة وتسويق وضيافة', 'Expenses', 'General_Expenses', 'Debit', FALSE, TRUE, 'YER'),
    ('ACC-506', '506', 'خسائر فروق أسعار الصرف', 'Expenses', 'Exchange_Loss', 'Debit', FALSE, TRUE, 'YER')
ON CONFLICT (id) DO NOTHING;

-- 12.4 بيانات بروفايل المؤسسة الافتراضية
INSERT INTO company_profile (id, company_name, phone, address, email, base_currency, logo_url, establishment_date, notes)
VALUES (1, 'مؤسسة Little Princesses للأزياء الراقية 👑', '771234567', 'اليمن - صنعاء - شارع حدة', 'info@littleprincesses.com', 'YER', 'logo.png', '2025-01-01', 'دار متخصصة في تصميم وخياطة فساتين الأطفال الفاخرة والأعراس')
ON CONFLICT (id) DO NOTHING;

-- 12.5 منصات التواصل الاجتماعي والتسويق الافتراضية
INSERT INTO marketing_platforms (platform_id, platform_name, platform_type, status, permissions)
VALUES 
    ('inst_01', 'Instagram', 'social', 'disconnected', '["posts","reels","stories","comments","messages","insights"]'::jsonb),
    ('fb_01', 'Facebook', 'social', 'disconnected', '["posts","stories","comments","messages","insights","ads"]'::jsonb),
    ('wa_01', 'WhatsApp Business', 'messaging', 'disconnected', '["messages","webhooks"]'::jsonb),
    ('tt_01', 'TikTok', 'social', 'disconnected', '["videos","comments","insights","ads"]'::jsonb),
    ('yt_01', 'YouTube', 'social', 'disconnected', '["videos","insights"]'::jsonb),
    ('ga_01', 'Google Ads', 'ads', 'disconnected', '["ads","insights","audience"]'::jsonb),
    ('sc_01', 'Snapchat', 'social', 'disconnected', '["stories","ads"]'::jsonb),
    ('pin_01', 'Pinterest', 'social', 'disconnected', '["posts","insights"]'::jsonb)
ON CONFLICT (platform_id) DO NOTHING;

-- 12.6 مصفوفة قدرات المنصات
INSERT INTO capability_matrix (platform, posts, reels, stories, comments, messages, insights, ads, audience, webhooks, notes)
VALUES 
    ('Instagram', 1, 1, 1, 1, 1, 1, 1, 1, 1, 'دعم كامل لمنشورات، ريلز، ستوري، تعليقات، رسائل، إعلانات'),
    ('Facebook', 1, 1, 1, 1, 1, 1, 1, 1, 1, 'دعم كامل للمنشورات والصفحات والإعلانات المباشرة'),
    ('WhatsApp Business', 0, 0, 0, 0, 1, 0, 0, 0, 1, 'دعم استقبال وإرسال الرسائل الفورية والـ Webhooks'),
    ('TikTok', 0, 1, 0, 1, 0, 1, 1, 0, 1, 'دعم الفيديوهات القصيرة، التعليقات والتحليلات الإعلانية'),
    ('YouTube', 1, 0, 0, 1, 0, 1, 1, 0, 0, 'دعم الفيديوهات الطويلة والشورتس والتحليلات الرسمية'),
    ('Google Ads', 0, 0, 0, 0, 0, 1, 1, 1, 1, 'دعم كامل للحملات الإعلانية والاستهداف وتتبع التحويلات'),
    ('Snapchat', 0, 0, 1, 0, 0, 1, 1, 0, 1, 'دعم قنوات السناب والإعلانات الموجهة'),
    ('Pinterest', 1, 0, 0, 1, 0, 1, 0, 0, 0, 'دعم لوحات الموضة والأزياء والكتالوج التفاعلي')
ON CONFLICT (platform) DO NOTHING;

-- 12.7 أوزان التقييم الذكي لمحرك الذكاء الاصطناعي
INSERT INTO ai_scoring_weights (weight_name, value, category)
VALUES 
    ('like', 1.0, 'engagement_quality'),
    ('comment', 3.0, 'engagement_quality'),
    ('save', 4.0, 'engagement_quality'),
    ('share', 5.0, 'engagement_quality'),
    ('profile_visit', 2.0, 'engagement_quality'),
    ('message', 4.0, 'engagement_quality'),
    ('lead', 8.0, 'engagement_quality'),
    ('order', 15.0, 'engagement_quality'),
    ('hot_lead_min', 90.0, 'intent_thresholds'),
    ('high_intent_min', 70.0, 'intent_thresholds'),
    ('med_intent_min', 40.0, 'intent_thresholds'),
    ('low_intent_min', 20.0, 'intent_thresholds')
ON CONFLICT (weight_name) DO NOTHING;

-- ====================================================================================
-- نهاية المخطط البرمجي الشامل — Little Princesses ERP PostgreSQL Schema v2.0 (51 Tables)
-- ====================================================================================

