/**
 * ============================================================================
 * drizzle/schema.ts — Enterprise Multi-Tenant Schema for Little Princesses ERP
 * Drizzle ORM + PostgreSQL / SQLite Architecture Core
 * ============================================================================
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
  index,
  pgEnum,
  foreignKey
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ── 1. ENUMS DEFINITIONS (قوائم الحالات والأنواع المحددة) ──

export const voucherTypeEnum = pgEnum('voucher_type', [
  'RECEIPT_VOUCHER',
  'PAYMENT_VOUCHER',
  'EXPENSE_VOUCHER'
]);

export const accountTypeEnum = pgEnum('account_type', [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE'
]);

export const accountNatureEnum = pgEnum('account_nature', [
  'DEBIT',
  'CREDIT'
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'CASH',
  'BANK_TRANSFER',
  'CARD',
  'CHECK',
  'KURIMI_EXPRESS',
  'JAWALI'
]);

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY',
  'DELIVERED',
  'CANCELLED'
]);

export const productionStageEnum = pgEnum('production_stage', [
  'PATTERN_CUTTING',
  'TAILORING',
  'EMBROIDERY_BEADING',
  'FITTING_REVISION',
  'FINAL_QUALITY_PASS'
]);

export const userRoleEnum = pgEnum('user_role', [
  'ADMIN',
  'ACCOUNTANT',
  'WORKSHOP_MANAGER',
  'TAILOR',
  'DESIGNER',
  'SALES_CASHIER'
]);

// ── 2. TENANTS TABLE (المستأجرين - Multi-Tenancy SaaS Core) ──

export const tenants = pgTable('tenants', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  plan: varchar('plan', { length: 50 }).default('Enterprise').notNull(),
  baseCurrency: varchar('base_currency', { length: 10 }).default('YER').notNull(),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 3. USERS & RBAC TABLE (المستخدمين والصلاحيات) ──

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  username: varchar('username', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('SALES_CASHIER').notNull(),
  roleLabel: varchar('role_label', { length: 100 }).default('كاشير ومبيعات'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantUsernameIdx: uniqueIndex('uq_users_tenant_username').on(table.tenantId, table.username),
}));

// ── 4. LEGAL NUMBER SEQUENCES (الترقيم التسلسلي الذري الخالي من الفجوات) ──

export const legalNumberSequences = pgTable('legal_number_sequences', {
  tenantId: varchar('tenant_id', { length: 50 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  fiscalYear: integer('fiscal_year').notNull(),
  moduleCode: varchar('module_code', { length: 20 }).notNull(), // JE, PV, RV, EXP, INV, ORD
  lastNumber: integer('last_number').default(0).notNull(),
  prefixFormat: varchar('prefix_format', { length: 50 }).default('{MODULE}-{YEAR}-').notNull(),
  paddingLength: integer('padding_length').default(6).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: {
    name: 'pk_legal_sequences',
    columns: [table.tenantId, table.fiscalYear, table.moduleCode],
  }
}));

// ── 5. CHART OF ACCOUNTS (شجرة الحسابات المحاسبية) ──

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  code: varchar('code', { length: 50 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  parentId: uuid('parent_id'),
  accountType: accountTypeEnum('account_type').notNull(),
  nature: accountNatureEnum('nature').notNull(),
  isGroup: boolean('is_group').default(false).notNull(),
  currentBalance: numeric('current_balance', { precision: 15, scale: 2 }).default('0.00').notNull(),
  currency: varchar('currency', { length: 10 }).default('YER').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantCodeIdx: uniqueIndex('uq_accounts_tenant_code').on(table.tenantId, table.code),
  parentIdx: index('idx_accounts_parent').on(table.parentId),
  parentFk: foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
    name: 'fk_accounts_parent'
  }).onDelete('restrict'),
}));

// ── 6. JOURNAL ENTRIES (دفتر اليومية العامة المزدوجة) ──

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  entryNumber: varchar('entry_number', { length: 50 }).notNull(), // JE-2026-000001
  entryDate: timestamp('entry_date', { withTimezone: true }).notNull(),
  description: text('description').notNull(),
  sourceModule: varchar('source_module', { length: 50 }).notNull(), // RECEIPT_VOUCHER, PAYMENT_VOUCHER, EXPENSE, SALES_INVOICE
  sourceId: varchar('source_id', { length: 100 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  isPosted: boolean('is_posted').default(true).notNull(),
  isReversed: boolean('is_reversed').default(false).notNull(),
  reversalEntryId: uuid('reversal_entry_id'),
  createdBy: varchar('created_by', { length: 100 }).default('system').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantEntryIdx: uniqueIndex('uq_journal_tenant_entry_no').on(table.tenantId, table.entryNumber),
  sourceModuleIdx: uniqueIndex('uq_journal_tenant_source').on(table.tenantId, table.sourceModule, table.sourceId),
  dateIdx: index('idx_journal_entries_date').on(table.tenantId, table.entryDate),
  reversalFk: foreignKey({
    columns: [table.reversalEntryId],
    foreignColumns: [table.id],
    name: 'fk_journal_reversal'
  }).onDelete('set null'),
}));

// ── 7. JOURNAL ENTRY LINES (أطراف القيد اليومي: مدين ودائن) ──

export const journalEntryLines = pgTable('journal_entry_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  journalEntryId: uuid('journal_entry_id')
    .notNull()
    .references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'restrict' }),
  debit: numeric('debit', { precision: 15, scale: 2 }).default('0.00').notNull(),
  credit: numeric('credit', { precision: 15, scale: 2 }).default('0.00').notNull(),
  currency: varchar('currency', { length: 10 }).default('YER').notNull(),
  exchangeRate: numeric('exchange_rate', { precision: 10, scale: 6 }).default('1.000000').notNull(),
  baseDebit: numeric('base_debit', { precision: 15, scale: 2 }).default('0.00').notNull(),
  baseCredit: numeric('base_credit', { precision: 15, scale: 2 }).default('0.00').notNull(),
  lineDescription: text('line_description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  entryIdx: index('idx_lines_journal_entry').on(table.journalEntryId),
  accountIdx: index('idx_lines_account').on(table.accountId),
}));

// ── 8. VOUCHERS (السندات المالية: قبض وصرف) ──

export const vouchers = pgTable('vouchers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  voucherNo: varchar('voucher_no', { length: 50 }).notNull(), // RV-2026-000001 or PV-2026-000001
  voucherType: voucherTypeEnum('voucher_type').notNull(),
  partyName: varchar('party_name', { length: 255 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('YER').notNull(),
  exchangeRate: numeric('exchange_rate', { precision: 10, scale: 6 }).default('1.000000').notNull(),
  baseAmount: numeric('base_amount', { precision: 15, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').default('CASH').notNull(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'restrict' }),
  targetAcc: varchar('target_acc', { length: 50 }).default('104'),
  dateCreated: timestamp('date_created', { withTimezone: true }).notNull(),
  notes: text('notes'),
  status: varchar('status', { length: 50 }).default('POSTED').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantVoucherIdx: uniqueIndex('uq_vouchers_tenant_no').on(table.tenantId, table.voucherNo),
  dateIdx: index('idx_vouchers_date').on(table.tenantId, table.dateCreated),
}));

// ── 9. CUSTOMERS & CHILDREN (العميلات والأميرات) ──

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  customerCode: varchar('customer_code', { length: 50 }).notNull(), // CUST-000001
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }).notNull(),
  phoneAlt: varchar('phone_alt', { length: 50 }),
  platform: varchar('platform', { length: 50 }).default('واتساب'),
  handle: varchar('handle', { length: 100 }),
  category: varchar('category', { length: 50 }).default('VIP'),
  city: varchar('city', { length: 100 }).default('صنعاء'),
  street: text('street'),
  notes: text('notes'),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantCustomerIdx: uniqueIndex('uq_customers_tenant_code').on(table.tenantId, table.customerCode),
  phoneIdx: index('idx_customers_phone').on(table.tenantId, table.phone),
}));

export const children = pgTable('children', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  childName: varchar('child_name', { length: 255 }).notNull(),
  gender: varchar('gender', { length: 20 }).default('أنثى'),
  birthDate: varchar('birth_date', { length: 50 }),
  age: varchar('age', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 10. MEASUREMENT PROFILES (بروفايل قياسات فساتين السهرة) ──

export const measurementProfiles = pgTable('measurement_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  childId: uuid('child_id')
    .references(() => children.id, { onDelete: 'set null' }),
  unit: varchar('unit', { length: 20 }).default('cm'),
  totalLength: numeric('total_length', { precision: 8, scale: 2 }),
  dressLength: numeric('dress_length', { precision: 8, scale: 2 }),
  chestCirc: numeric('chest_circ', { precision: 8, scale: 2 }),
  waistCirc: numeric('waist_circ', { precision: 8, scale: 2 }),
  shoulderWidth: numeric('shoulder_width', { precision: 8, scale: 2 }),
  sleeveLength: numeric('sleeve_length', { precision: 8, scale: 2 }),
  armpitCirc: numeric('armpit_circ', { precision: 8, scale: 2 }),
  neckCirc: numeric('neck_circ', { precision: 8, scale: 2 }),
  comfortProfile: text('comfort_profile'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 11. PRODUCTS & INVENTORY (المنتجات والخامات والمخزون) ──

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  sku: varchar('sku', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).default('فساتين سهرة'),
  subcategory: varchar('subcategory', { length: 100 }).default('أميرات'),
  collection: varchar('collection', { length: 100 }).default('تشكيلة 2026'),
  basePrice: numeric('base_price', { precision: 15, scale: 2 }).default('0.00').notNull(),
  costPrice: numeric('cost_price', { precision: 15, scale: 2 }).default('0.00').notNull(),
  currency: varchar('currency', { length: 10 }).default('USD'),
  imageUrl: text('image_url'),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantSkuIdx: uniqueIndex('uq_products_tenant_sku').on(table.tenantId, table.sku),
}));

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  itemCode: varchar('item_code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).default('أقمشة وخامات'),
  quantity: numeric('quantity', { precision: 12, scale: 3 }).default('0.000').notNull(),
  unit: varchar('unit', { length: 20 }).default('متر'),
  unitCost: numeric('unit_cost', { precision: 15, scale: 2 }).default('0.00').notNull(),
  totalValue: numeric('total_value', { precision: 15, scale: 2 }).default('0.00').notNull(),
  minAlertQty: numeric('min_alert_qty', { precision: 12, scale: 3 }).default('5.000').notNull(),
  currency: varchar('currency', { length: 10 }).default('YER'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantItemIdx: uniqueIndex('uq_inventory_tenant_code').on(table.tenantId, table.itemCode),
}));

// ── 12. SALES ORDERS & PRODUCTION (طلبات التفصيل وخطوط الإنتاج) ──

export const salesOrders = pgTable('sales_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  orderNo: varchar('order_no', { length: 50 }).notNull(), // ORD-2026-000001
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'restrict' }),
  childId: uuid('child_id')
    .references(() => children.id, { onDelete: 'set null' }),
  productId: uuid('product_id')
    .references(() => products.id, { onDelete: 'set null' }),
  quantity: integer('quantity').default(1).notNull(),
  orderDate: timestamp('order_date', { withTimezone: true }).defaultNow().notNull(),
  deliveryDate: timestamp('delivery_date', { withTimezone: true }),
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).default('0.00').notNull(),
  paidAmount: numeric('paid_amount', { precision: 15, scale: 2 }).default('0.00').notNull(),
  remainingAmount: numeric('remaining_amount', { precision: 15, scale: 2 }).default('0.00').notNull(),
  currency: varchar('currency', { length: 10 }).default('USD'),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  productionStage: productionStageEnum('production_stage').default('PATTERN_CUTTING').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantOrderIdx: uniqueIndex('uq_sales_orders_tenant_no').on(table.tenantId, table.orderNo),
}));

// ── 13. IDEMPOTENCY KEYS (مفاتيح منع الازدواجية وإعادة المحاولة) ──

export const idempotencyKeys = pgTable('idempotency_keys', {
  idempotencyKey: varchar('idempotency_key', { length: 255 }).primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  requestHash: varchar('request_hash', { length: 64 }).notNull(),
  sourceModule: varchar('source_module', { length: 50 }).notNull(),
  responseCode: integer('response_code').notNull(),
  responseBody: text('response_body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }).notNull(),
});

// ── 14. AUDIT LOGS (سجل التدقيق الجنائي للعمليات) ──

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: varchar('tenant_id', { length: 50 })
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, POST, REVERSE
  oldValues: text('old_values'),
  newValues: text('new_values'),
  userId: varchar('user_id', { length: 100 }).default('system').notNull(),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// 🔗 BI-DIRECTIONAL RELATIONS (العلاقات ثنائية الاتجاه للاستعلامات الذكية)
// ============================================================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  accounts: many(accounts),
  journalEntries: many(journalEntries),
  vouchers: many(vouchers),
  customers: many(customers),
  products: many(products),
  salesOrders: many(salesOrders),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [accounts.tenantId], references: [tenants.id] }),
  parentAccount: one(accounts, {
    fields: [accounts.parentId],
    references: [accounts.id],
    relationName: 'account_hierarchy',
  }),
  subAccounts: many(accounts, { relationName: 'account_hierarchy' }),
  journalLines: many(journalEntryLines),
  vouchers: many(vouchers),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  tenant: one(tenants, { fields: [journalEntries.tenantId], references: [tenants.id] }),
  lines: many(journalEntryLines),
  reversalEntry: one(journalEntries, {
    fields: [journalEntries.reversalEntryId],
    references: [journalEntries.id],
  }),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalEntryLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalEntryLines.accountId],
    references: [accounts.id],
  }),
}));

export const vouchersRelations = relations(vouchers, ({ one }) => ({
  tenant: one(tenants, { fields: [vouchers.tenantId], references: [tenants.id] }),
  account: one(accounts, {
    fields: [vouchers.accountId],
    references: [accounts.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [customers.tenantId], references: [tenants.id] }),
  children: many(children),
  measurements: many(measurementProfiles),
  orders: many(salesOrders),
}));

export const childrenRelations = relations(children, ({ one, many }) => ({
  customer: one(customers, { fields: [children.customerId], references: [customers.id] }),
  measurements: many(measurementProfiles),
  orders: many(salesOrders),
}));

export const salesOrdersRelations = relations(salesOrders, ({ one }) => ({
  tenant: one(tenants, { fields: [salesOrders.tenantId], references: [tenants.id] }),
  customer: one(customers, { fields: [salesOrders.customerId], references: [customers.id] }),
  child: one(children, { fields: [salesOrders.childId], references: [children.id] }),
  product: one(products, { fields: [salesOrders.productId], references: [products.id] }),
}));
