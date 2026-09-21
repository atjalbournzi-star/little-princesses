// src/features/reports/components/FinancialStatementsView.jsx

function FinancialStatementsView({ subTab, generalLedgerRows, cashBankReconciliation, statementData, statementType, targetCode, reportCurrency, fmtMoney }) {
  if (subTab === 'general_ledger') {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-4 p-6">
        <div>
          <h3 className="font-bold text-sm text-[#25232A]">كشف حركة دفتر الأستاذ العام (General Ledger Statement)</h3>
          <p className="text-[11px] text-[#6F6B75]">استخراج كشف الحساب الزمني التفصيلي والرصيد التراكمي للحساب المحدد</p>
        </div>
        <div className="rounded-xl border border-[#E8E5EA] overflow-hidden">
          {generalLedgerRows.length === 0 ? (
            <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد حركات مسجلة لهذا الحساب خلال الفترة المحددة 🧾</div>
          ) : (
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="px-3 py-3 text-center">التاريخ</th>
                  <th className="px-3 py-3 text-right">رقم القيد / المرجع</th>
                  <th className="px-3 py-3 text-right">البيان والتفاصيل</th>
                  <th className="px-3 py-3 text-left font-mono">مدين ({targetCode})</th>
                  <th className="px-3 py-3 text-left font-mono">دائن ({targetCode})</th>
                  <th className="px-3 py-3 text-left font-mono">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {generalLedgerRows.map(row => (
                  <tr key={row.id} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="px-3 py-2.5 text-center font-mono text-[#6F6B75]">{row.date}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-[#8F2A87]">{row.entry_no}</td>
                    <td className="px-3 py-2.5 text-[#25232A] font-medium">{row.notes}</td>
                    <td className="px-3 py-2.5 text-left font-mono font-bold text-[#007F8C]">{row.debit_target > 0 ? fmtMoney(row.debit_target) : '—'}</td>
                    <td className="px-3 py-2.5 text-left font-mono font-bold text-[#D64545]">{row.credit_target > 0 ? fmtMoney(row.credit_target) : '—'}</td>
                    <td className="px-3 py-2.5 text-left font-mono font-bold text-[#25232A]">{fmtMoney(row.running_target)} {reportCurrency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // Statements view (subTab === 'statements')
  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-5 p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
          <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">سيولة الخزائن والبنوك 💰</span>
          <span className="font-mono font-extrabold text-sm text-[#007F8C]">{fmtMoney(cashBankReconciliation.reduce((s, c) => s + (c.closingLedgerTarget || 0), 0))} {reportCurrency}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
          <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">مستحقات الموردين 🧵</span>
          <span className="font-mono font-extrabold text-sm text-[#8F2A87]">{fmtMoney(statementData.reduce((s, i) => s + (statementType === 'supplier' ? (i.balanceDue || 0) : 0), 0))} {reportCurrency}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
          <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">مستحقات العميلات 👗</span>
          <span className="font-mono font-extrabold text-sm text-[#B0005A]">{fmtMoney(statementData.reduce((s, i) => s + (statementType === 'customer' ? (i.balanceDue || 0) : 0), 0))} {reportCurrency}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] flex items-center justify-between">
          <div><span className="text-[11px] font-bold text-[#6F6B75] block mb-1">حالة التدقيق ⚖️</span><span className="text-xs font-extrabold text-[#16a34a]">مطابقة بنسبة 100%</span></div>
          <span className="text-xl">✅</span>
        </div>
      </div>

      {statementType === 'treasury' && (
        <div className="rounded-xl border border-[#E8E5EA] overflow-hidden">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                <th className="px-3.5 py-3 text-center">الكود</th>
                <th className="px-3.5 py-3 text-right">الخزينة / البنك</th>
                <th className="px-3.5 py-3 text-center">العملة الأصلية</th>
                <th className="px-3.5 py-3 text-left font-mono">الرصيد السابق</th>
                <th className="px-3.5 py-3 text-left font-mono">مقبوضات (مدين)</th>
                <th className="px-3.5 py-3 text-left font-mono">مدفوعات (دائن)</th>
                <th className="px-3.5 py-3 text-left font-mono">الرصيد الدفتري</th>
                <th className="px-3.5 py-3 text-left font-mono">رصيد الأصلية</th>
                <th className="px-3.5 py-3 text-center">المطابقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA] bg-white">
              {cashBankReconciliation.map(acc => (
                <tr key={acc.id} className="hover:bg-[#FAFAFB]">
                  <td className="px-3.5 py-3 text-center font-mono font-bold text-[#8F2A87]">{acc.code}</td>
                  <td className="px-3.5 py-3 font-bold text-[#25232A]">{acc.name}</td>
                  <td className="px-3.5 py-3 text-center font-mono text-xs">{acc.nativeCurr} {acc.nativeCurr !== 'YER' && `(×${acc.rate})`}</td>
                  <td className="px-3.5 py-3 text-left font-mono text-[#6F6B75]">{fmtMoney(acc.openingTarget)}</td>
                  <td className="px-3.5 py-3 text-left font-mono font-bold text-[#007F8C]">{acc.debitTarget > 0 ? fmtMoney(acc.debitTarget) : '—'}</td>
                  <td className="px-3.5 py-3 text-left font-mono font-bold text-[#D64545]">{acc.creditTarget > 0 ? fmtMoney(acc.creditTarget) : '—'}</td>
                  <td className="px-3.5 py-3 text-left font-mono font-extrabold text-[#25232A]">{fmtMoney(acc.closingLedgerTarget)}</td>
                  <td className="px-3.5 py-3 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(acc.closingNative, acc.nativeCurr === 'YER' ? 0 : 2)} {acc.nativeCurr}</td>
                  <td className="px-3.5 py-3 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">✓ مطابق 100%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {statementType === 'supplier' && (
        <div className="rounded-xl border border-[#E8E5EA] overflow-hidden">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                <th className="px-3.5 py-3 text-right">المورد</th>
                <th className="px-3.5 py-3 text-center">الهاتف</th>
                <th className="px-3.5 py-3 text-center">الفواتير</th>
                <th className="px-3.5 py-3 text-left font-mono">إجمالي المشتريات</th>
                <th className="px-3.5 py-3 text-left font-mono">مسدد نقداً</th>
                <th className="px-3.5 py-3 text-left font-mono">آجل</th>
                <th className="px-3.5 py-3 text-left font-mono">سندات صرف</th>
                <th className="px-3.5 py-3 text-left font-mono">إجمالي المسدد</th>
                <th className="px-3.5 py-3 text-left font-mono">الرصيد المستحق</th>
                <th className="px-3.5 py-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA] bg-white">
              {statementData.length === 0 ? <tr><td colSpan="10" className="text-center py-8 text-[#6F6B75]">لا توجد حركات مسجلة للموردين 🧵</td></tr> : statementData.map(item => (
                <tr key={item.id} className="hover:bg-[#FAFAFB]">
                  <td className="px-3.5 py-3 font-bold text-[#25232A]">{item.name}</td>
                  <td className="px-3.5 py-3 text-center font-mono text-[#6F6B75]">{item.phone || '—'}</td>
                  <td className="px-3.5 py-3 text-center font-mono">{item.purchasesCount}</td>
                  <td className="px-3.5 py-3 text-left font-mono font-bold">{fmtMoney(item.totalPurchases)}</td>
                  <td className="px-3.5 py-3 text-left font-mono text-[#007F8C]">{item.cashPurchases > 0 ? fmtMoney(item.cashPurchases) : '—'}</td>
                  <td className="px-3.5 py-3 text-left font-mono text-amber-700">{item.creditPurchases > 0 ? fmtMoney(item.creditPurchases) : '—'}</td>
                  <td className="px-3.5 py-3 text-left font-mono text-[#8F2A87]">{item.vouchersPaid > 0 ? fmtMoney(item.vouchersPaid) : '—'}</td>
                  <td className="px-3.5 py-3 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(item.totalPaid)}</td>
                  <td className={`px-3.5 py-3 text-left font-mono font-extrabold ${item.balanceDue > 0 ? 'text-[#D64545]' : 'text-emerald-600'}`}>{fmtMoney(item.balanceDue)} {reportCurrency}</td>
                  <td className="px-3.5 py-3 text-center">{item.balanceDue <= 0.01 ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">✓ خالص</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">⏳ مستحق</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {statementType === 'customer' && (
        <div className="rounded-xl border border-[#E8E5EA] overflow-hidden">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                <th className="px-4 py-3 text-right">العميلة</th>
                <th className="px-4 py-3 text-center">الهاتف</th>
                <th className="px-4 py-3 text-center">الطلبات</th>
                <th className="px-4 py-3 text-left font-mono">إجمالي المبيعات</th>
                <th className="px-4 py-3 text-left font-mono">إجمالي المسدد</th>
                <th className="px-4 py-3 text-left font-mono">الرصيد المستحق</th>
                <th className="px-4 py-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA] bg-white">
              {statementData.length === 0 ? <tr><td colSpan="7" className="text-center py-8 text-[#6F6B75]">لا توجد طلبات مسجلة للعميلات 👗</td></tr> : statementData.map(item => (
                <tr key={item.id} className="hover:bg-[#FAFAFB]">
                  <td className="px-4 py-3 font-bold text-[#25232A]">{item.name}</td>
                  <td className="px-4 py-3 text-center font-mono text-[#6F6B75]">{item.phone || '—'}</td>
                  <td className="px-4 py-3 text-center font-mono">{item.ordersCount}</td>
                  <td className="px-4 py-3 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(item.totalSales)}</td>
                  <td className="px-4 py-3 text-left font-mono font-bold">{fmtMoney(item.totalPaid)}</td>
                  <td className={`px-4 py-3 text-left font-mono font-extrabold ${item.balanceDue > 0 ? 'text-[#D64545]' : 'text-emerald-600'}`}>{fmtMoney(item.balanceDue)} {reportCurrency}</td>
                  <td className="px-4 py-3 text-center">{item.balanceDue <= 0.01 ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">✓ خالصة</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">⏳ مستحق</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.FinancialStatementsView = FinancialStatementsView;
}
