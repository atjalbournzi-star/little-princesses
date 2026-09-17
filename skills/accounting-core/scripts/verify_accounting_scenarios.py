# -*- coding: utf-8 -*-
"""
Test suite for Accounting Core Skill
Verifying the 6 mandatory financial scenarios with Decimal precision
and strict double-entry balance validation.
"""

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from decimal import Decimal, ROUND_HALF_UP

class AccountingError(Exception):
    pass

class JournalLine:
    def __init__(self, account_id, account_name, debit=Decimal('0.00'), credit=Decimal('0.00'), currency='YER'):
        self.account_id = str(account_id)
        self.account_name = str(account_name)
        self.debit = Decimal(str(debit)).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
        self.credit = Decimal(str(credit)).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
        self.currency = currency

class JournalEntry:
    def __init__(self, entry_no, description, date, lines):
        self.entry_no = entry_no
        self.description = description
        self.date = date
        self.lines = lines
        self.validate_balance()

    def validate_balance(self):
        total_debit = sum((line.debit for line in self.lines), Decimal('0.00'))
        total_credit = sum((line.credit for line in self.lines), Decimal('0.00'))
        diff = abs(total_debit - total_credit)
        if diff > Decimal('0.0000'):
            raise AccountingError(
                f"Unbalanced Entry {self.entry_no}! Total Debit: {total_debit} != Total Credit: {total_credit} (Diff: {diff})"
            )
        return total_debit, total_credit

def run_accounting_scenarios():
    print("===============================================================")
    print("[LP-ERP] RUNNING ACCOUNTING CORE SKILL VERIFICATION TEST SUITE")
    print("===============================================================")
    
    scenarios = []

    # 1. بيع نقدي (Cash Sale)
    e1 = JournalEntry(
        entry_no="JV-TEST-001",
        description="Cash Sale - بيع نقدي فستان سهرة",
        date="2026-09-17",
        lines=[
            JournalLine("101", "الصندوق الرئيسي", debit=Decimal("85000.00"), credit=Decimal("0.00")),
            JournalLine("401", "إيرادات مبيعات فساتين", debit=Decimal("0.00"), credit=Decimal("85000.00"))
        ]
    )
    scenarios.append(("1. بيع نقدي (Cash Sale)", e1))

    # 2. بيع آجل (Credit Sale)
    e2 = JournalEntry(
        entry_no="JV-TEST-002",
        description="Credit Sale - بيع آجل تفصيل فستان زفاف",
        date="2026-09-17",
        lines=[
            JournalLine("104", "ذمم العملاء", debit=Decimal("120000.00"), credit=Decimal("0.00")),
            JournalLine("401", "إيرادات مبيعات وتفصيل", debit=Decimal("0.00"), credit=Decimal("120000.00"))
        ]
    )
    scenarios.append(("2. بيع آجل (Credit Sale)", e2))

    # 3. قبض دين عميل (Receipt on Account)
    e3 = JournalEntry(
        entry_no="JV-TEST-003",
        description="Receipt on Account - تحصيل دفعة من حساب عميل",
        date="2026-09-17",
        lines=[
            JournalLine("101", "الصندوق الرئيسي", debit=Decimal("70000.00"), credit=Decimal("0.00")),
            JournalLine("104", "ذمم العملاء", debit=Decimal("0.00"), credit=Decimal("70000.00"))
        ]
    )
    scenarios.append(("3. قبض دين عميل (Receipt on Account)", e3))

    # 4. شراء آجل (Credit Purchase)
    e4 = JournalEntry(
        entry_no="JV-TEST-004",
        description="Credit Purchase - شراء أقمشة وخامات بالآجل",
        date="2026-09-17",
        lines=[
            JournalLine("103", "مخزون الأقمشة والخامات", debit=Decimal("150000.00"), credit=Decimal("0.00")),
            JournalLine("201", "ذمم الموردين", debit=Decimal("0.00"), credit=Decimal("150000.00"))
        ]
    )
    scenarios.append(("4. شراء آجل (Credit Purchase)", e4))

    # 5. سداد مورد (Payment to Supplier)
    e5 = JournalEntry(
        entry_no="JV-TEST-005",
        description="Payment to Supplier - سداد دفعة لمورد أقمشة",
        date="2026-09-17",
        lines=[
            JournalLine("201", "ذمم الموردين", debit=Decimal("90000.00"), credit=Decimal("0.00")),
            JournalLine("101", "الصندوق الرئيسي", debit=Decimal("0.00"), credit=Decimal("90000.00"))
        ]
    )
    scenarios.append(("5. سداد مورد (Payment to Supplier)", e5))

    # 6. مصروف نقدي (Cash Expense)
    e6 = JournalEntry(
        entry_no="JV-TEST-006",
        description="Cash Expense - مصروفات تشغيلية وصيانة نقداً",
        date="2026-09-17",
        lines=[
            JournalLine("501", "مصروفات تشغيلية وصيانة", debit=Decimal("25000.00"), credit=Decimal("0.00")),
            JournalLine("101", "الصندوق الرئيسي", debit=Decimal("0.00"), credit=Decimal("25000.00"))
        ]
    )
    scenarios.append(("6. مصروف نقدي (Cash Expense)", e6))

    total_all_debit = Decimal("0.00")
    total_all_credit = Decimal("0.00")

    for name, entry in scenarios:
        d, c = entry.validate_balance()
        total_all_debit += d
        total_all_credit += c
        print(f"[PASS] {name}:")
        print(f"   رقم القيد: {entry.entry_no} | البيان: {entry.description}")
        for l in entry.lines:
            print(f"   - [{l.account_id}] {l.account_name}: مدين = {l.debit} | دائن = {l.credit}")
        print(f"   ==> إجمالي المدين = {d} | إجمالي الدائن = {c} | الفارق = 0.0000 (متوازن تماماً)\n")

    print("---------------------------------------------------------------")
    print("📊 ميزان المراجعة لكافة السيناريوهات:")
    print(f"   إجمالي كافة الحركات المدينة : {total_all_debit}")
    print(f"   إجمالي كافة الحركات الدائنة : {total_all_credit}")
    assert total_all_debit == total_all_credit, "خلل في توازن ميزان المراجعة!"
    print("   تطابق تام: مجموع المدين == مجموع الدائن بنسبة 100%")

    print("---------------------------------------------------------------")
    print("🧪 اختبار الرفض الإجباري للقيد غير المتوازن (Negative Test):")
    try:
        JournalEntry(
            entry_no="JV-INVALID",
            description="قيد غير متوازن وهمي للاختبار",
            date="2026-09-17",
            lines=[
                JournalLine("101", "الصندوق", debit=Decimal("100.00"), credit=Decimal("0.00")),
                JournalLine("401", "الإيراد", debit=Decimal("0.00"), credit=Decimal("99.99"))
            ]
        )
        print("❌ خطأ: قبل النظام قيداً غير متوازن!")
        sys.exit(1)
    except AccountingError as err:
        print(f"✅ نجح الاختبار: تم رفض القيد غير المتوازن بنجاح مع إطلاق الخطأ:")
        print(f"   {err}")

    print("===============================================================")
    print("🎉 ALL 6 SCENARIOS & FINANCIAL INTEGRITY TESTS PASSED SUCCESSFULLY!")
    print("===============================================================")

if __name__ == '__main__':
    run_accounting_scenarios()
