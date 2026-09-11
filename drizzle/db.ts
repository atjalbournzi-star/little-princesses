/**
 * ============================================================================
 * drizzle/db.ts — Typed Drizzle Database Connection & Transaction Pipeline
 * Little Princesses ERP
 * ============================================================================
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { eq, sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/little_princesses_erp';

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

/**
 * دالة استخراج الرقم التسلسلي القانوني الذري بدون فجوات
 */
export async function getNextLegalSequence(
  tx: any,
  tenantId: string,
  moduleCode: string,
  fiscalYear: number = new Date().getFullYear()
): Promise<string> {
  const result = await tx.execute(sql`
    INSERT INTO legal_number_sequences (tenant_id, fiscal_year, module_code, last_number, prefix_format, padding_length, updated_at)
    VALUES (${tenantId}, ${fiscalYear}, ${moduleCode}, 1, ${moduleCode + '-' + fiscalYear + '-'}, 6, NOW())
    ON CONFLICT (tenant_id, fiscal_year, module_code)
    DO UPDATE SET 
      last_number = legal_number_sequences.last_number + 1,
      updated_at = NOW()
    RETURNING last_number, prefix_format, padding_length;
  `);

  const row = result.rows[0];
  const lastNum = row.last_number;
  const prefix = row.prefix_format;
  const pad = row.padding_length;

  return `${prefix}${String(lastNum).padStart(pad, '0')}`;
}

/**
 * معالج ترحيل السند المالي والقيد اليومي ذرياً (Atomic Voucher & Journal Posting)
 */
export async function postVoucherWithJournalAtomic(
  database: typeof db,
  payload: {
    tenantId: string;
    voucherType: 'RECEIPT_VOUCHER' | 'PAYMENT_VOUCHER';
    partyName: string;
    amount: number;
    currency: string;
    exchangeRate: number;
    accountId: string;
    targetAccCode: string;
    notes?: string;
    date?: Date;
  }
) {
  return await database.transaction(async (tx) => {
    const isReceipt = payload.voucherType === 'RECEIPT_VOUCHER';
    const vPrefix = isReceipt ? 'RV' : 'PV';
    
    // 1. توليد الأرقام التسلسلية ذرياً
    const voucherNo = await getNextLegalSequence(tx, payload.tenantId, vPrefix);
    const entryNo = await getNextLegalSequence(tx, payload.tenantId, 'JE');
    const baseAmt = (payload.amount * payload.exchangeRate).toFixed(2);
    const dateVal = payload.date || new Date();

    // 2. إدراج السند المالي
    const [voucher] = await tx.insert(schema.vouchers).values({
      tenantId: payload.tenantId,
      voucherNo,
      voucherType: payload.voucherType,
      partyName: payload.partyName,
      amount: payload.amount.toString(),
      currency: payload.currency,
      exchangeRate: payload.exchangeRate.toString(),
      baseAmount: baseAmt,
      accountId: payload.accountId,
      dateCreated: dateVal,
      notes: payload.notes || '',
      status: 'POSTED',
    }).returning();

    // 3. إدراج رأس القيد اليومي
    const [journalEntry] = await tx.insert(schema.journalEntries).values({
      tenantId: payload.tenantId,
      entryNumber: entryNo,
      entryDate: dateVal,
      description: `${isReceipt ? 'سند قبض' : 'سند صرف'}: ${payload.partyName} - ${payload.notes || ''}`,
      sourceModule: payload.voucherType,
      sourceId: voucherNo,
      totalAmount: baseAmt,
      isPosted: true,
    }).returning();

    // 4. جلب الحساب المستهدف
    const targetAccounts = await tx.select().from(schema.accounts)
      .where(sql`${schema.accounts.tenantId} = ${payload.tenantId} AND ${schema.accounts.code} = ${payload.targetAccCode}`);
    
    const targetAccId = targetAccounts[0]?.id || payload.accountId;

    // 5. إدراج خطوط القيد المزدوج
    const debitAcc = isReceipt ? payload.accountId : targetAccId;
    const creditAcc = isReceipt ? targetAccId : payload.accountId;

    await tx.insert(schema.journalEntryLines).values([
      {
        journalEntryId: journalEntry.id,
        accountId: debitAcc,
        debit: payload.amount.toString(),
        credit: '0.00',
        currency: payload.currency,
        exchangeRate: payload.exchangeRate.toString(),
        baseDebit: baseAmt,
        baseCredit: '0.00',
        lineDescription: `طرف مدين: ${payload.partyName}`,
      },
      {
        journalEntryId: journalEntry.id,
        accountId: creditAcc,
        debit: '0.00',
        credit: payload.amount.toString(),
        currency: payload.currency,
        exchangeRate: payload.exchangeRate.toString(),
        baseDebit: '0.00',
        baseCredit: baseAmt,
        lineDescription: `طرف دائن: ${payload.partyName}`,
      }
    ]);

    // 6. تحديث الأرصدة
    if (isReceipt) {
      await tx.update(schema.accounts)
        .set({ currentBalance: sql`${schema.accounts.currentBalance} + ${baseAmt}` })
        .where(eq(schema.accounts.id, payload.accountId));
    } else {
      await tx.update(schema.accounts)
        .set({ currentBalance: sql`${schema.accounts.currentBalance} - ${baseAmt}` })
        .where(eq(schema.accounts.id, payload.accountId));
    }

    return {
      success: true,
      voucherNo,
      entryNo,
      voucher,
      journalEntry,
    };
  });
}
