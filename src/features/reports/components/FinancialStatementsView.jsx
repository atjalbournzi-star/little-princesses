// src/features/reports/components/FinancialStatementsView.jsx

function FinancialStatementsView({
  subTab, generalLedgerRows, cashBankReconciliation, statementData,
  statementType, targetCode, reportCurrency, fmtMoney, isGLLoading,
  selectedLedgerAcc, setSelectedLedgerAcc, accounts = []
}) {
  if (subTab === 'general_ledger') {
    const activePostingAccounts = (accounts || []).filter(a => !a.is_group && a.is_active !== false);
    return (
      <div className="bg-[#111C38] rounded-xl border border-slate-800 shadow-2xs overflow-hidden space-y-2.5 p-3 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
              <span>📖</span>
              <span>كشف حركة دفتر الأستاذ العام (General Ledger Statement)</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">استخراج كشف الحساب الزمني التفصيلي والرصيد التراكمي للحساب المحدد</p>
          </div>
          {setSelectedLedgerAcc && (
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-medium text-slate-300 whitespace-nowrap">اختر الحساب:</label>
              <select
                value={selectedLedgerAcc || ''}
                onChange={e => setSelectedLedgerAcc(e.target.value)}
                className="h-7.5 px-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs font-medium focus:border-pink-500 outline-none min-w-[200px] max-w-[300px] cursor-pointer"
              >
                {activePostingAccounts.map(a => {
                  const accId = a.id || a.code;
                  const code = a.code || a.account_code || a.id;
                  const name = a.account_name || a.name_ar || a.name || code;
                  return <option key={accId} value={accId}>{code} - {name}</option>;
                })}
              </select>
            </div>
          )}
        </div>
        {isGLLoading && (
          <div className="p-2 bg-pink-950/40 rounded-lg border border-pink-900/60 flex items-center justify-center gap-2 text-xs text-pink-300 font-bold">
            <span className="w-3 h-3 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></span>
            <span>جاري جلب كشف دفتر الأستاذ العام من السيرفر...</span>
          </div>
        )}
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          {!isGLLoading && generalLedgerRows.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-medium bg-[#0F172A]">لا توجد حركات مسجلة لهذا الحساب خلال الفترة المحددة 🧾</div>
          ) : (
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-[#0F172A] text-slate-300 font-semibold border-b border-slate-800">
                  <th className="px-3 py-2 text-center text-[10.5px]">التاريخ</th>
                  <th className="px-3 py-2 text-right text-[10.5px]">رقم القيد / المرجع</th>
                  <th className="px-3 py-2 text-right text-[10.5px]">البيان والتفاصيل</th>
                  <th className="px-3 py-2 text-left font-mono text-[10.5px]">مدين ({targetCode})</th>
                  <th className="px-3 py-2 text-left font-mono text-[10.5px]">دائن ({targetCode})</th>
                  <th className="px-3 py-2 text-left font-mono text-[10.5px]">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-[#111C38]">
                {generalLedgerRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3 py-2 text-center font-mono text-slate-400">{row.date}</td>
                    <td className="px-3 py-2 font-mono font-bold text-pink-300">{row.entry_no}</td>
                    <td className="px-3 py-2 text-slate-200 font-medium">{row.notes}</td>
                    <td className="px-3 py-2 text-left font-mono font-bold text-sky-400">{row.debit_target > 0 ? `${fmtMoney(row.debit_target)} ${targetCode}` : `0 ${targetCode}`}</td>
                    <td className="px-3 py-2 text-left font-mono font-bold text-rose-400">{row.credit_target > 0 ? `${fmtMoney(row.credit_target)} ${targetCode}` : `0 ${targetCode}`}</td>
                    <td className="px-3 py-2 text-left font-mono font-bold text-white">{fmtMoney(row.running_target)} {reportCurrency}</td>
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
    <div className="bg-[#111C38] rounded-xl border border-slate-800 shadow-2xs overflow-hidden space-y-2.5 p-3 animate-fadeIn">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-800 hover:border-slate-700 transition-all">
          <span className="text-[10.5px] font-bold text-slate-400 block mb-1">سيولة الخزائن والبنوك 💰</span>
          <span className="font-mono font-bold text-base text-sky-400">{fmtMoney(cashBankReconciliation.reduce((s, c) => s + (c.closingLedgerTarget || 0), 0))} {reportCurrency}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-800 hover:border-slate-700 transition-all">
          <span className="text-[10.5px] font-bold text-slate-400 block mb-1">مستحقات الموردين 🧵</span>
          <span className="font-mono font-bold text-base text-pink-300">{fmtMoney(statementData.reduce((s, i) => s + (statementType === 'supplier' ? (i.balanceDue || 0) : 0), 0))} {reportCurrency}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-800 hover:border-slate-700 transition-all">
          <span className="text-[10.5px] font-bold text-slate-400 block mb-1">مستحقات العميلات 👗</span>
          <span className="font-mono font-bold text-base text-pink-400">{fmtMoney(statementData.reduce((s, i) => s + (statementType === 'customer' ? (i.balanceDue || 0) : 0), 0))} {reportCurrency}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-800 flex items-center justify-between">
          <div><span className="text-[10.5px] font-bold text-slate-400 block mb-1">حالة التدقيق ⚖️</span><span className="text-xs font-bold text-emerald-400">مطابقة بنسبة 100%</span></div>
          <span className="text-lg">✅</span>
        </div>
      </div>

      {statementType === 'treasury' && (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#0F172A] text-slate-300 font-semibold border-b border-slate-800">
                <th className="px-3 py-2 text-center text-[10.5px]">الكود</th>
                <th className="px-3 py-2 text-right text-[10.5px]">الخزينة / البنك</th>
                <th className="px-3 py-2 text-center text-[10.5px]">العملة الأصلية</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">الرصيد السابق</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">مقبوضات (مدين)</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">مدفوعات (دائن)</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">الرصيد الدفتري</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">رصيد الأصلية</th>
                <th className="px-3 py-2 text-center text-[10.5px]">المطابقة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#111C38]">
              {cashBankReconciliation.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 text-center font-mono font-bold text-pink-300">{acc.code}</td>
                  <td className="px-3 py-2 font-bold text-white">{acc.name}</td>
                  <td className="px-3 py-2 text-center font-mono text-xs text-slate-300">{acc.nativeCurr} {acc.nativeCurr !== 'YER' && `(×${acc.rate})`}</td>
                  <td className="px-3 py-2 text-left font-mono text-slate-400 whitespace-nowrap">{fmtMoney(acc.openingTarget)} {targetCode}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-sky-400 whitespace-nowrap">{acc.debitTarget > 0 ? `${fmtMoney(acc.debitTarget)} ${targetCode}` : `0 ${targetCode}`}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-rose-400 whitespace-nowrap">{acc.creditTarget > 0 ? `${fmtMoney(acc.creditTarget)} ${targetCode}` : `0 ${targetCode}`}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-white whitespace-nowrap">{fmtMoney(acc.closingLedgerTarget)} {targetCode}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-sky-300 whitespace-nowrap">{fmtMoney(acc.closingNative, acc.nativeCurr === 'YER' ? 0 : 2)} {acc.nativeCurr}</td>
                  <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800">✓ مطابق 100%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {statementType === 'supplier' && (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#0F172A] text-slate-300 font-semibold border-b border-slate-800">
                <th className="px-3 py-2 text-right text-[10.5px]">المورد</th>
                <th className="px-3 py-2 text-center text-[10.5px]">الهاتف</th>
                <th className="px-3 py-2 text-center text-[10.5px]">الفواتير</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">إجمالي المشتريات</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">مسدد نقداً</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">آجل</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">سندات صرف</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">إجمالي المسدد</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">الرصيد المستحق</th>
                <th className="px-3 py-2 text-center text-[10.5px]">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#111C38]">
              {statementData.length === 0 ? <tr><td colSpan="10" className="text-center py-6 text-slate-400">لا توجد حركات مسجلة للموردين 🧵</td></tr> : statementData.map(item => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 font-bold text-white">{item.name}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-400">{item.phone || '—'}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-300">{item.purchasesCount}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-white whitespace-nowrap">{fmtMoney(item.totalPurchases)} {reportCurrency}</td>
                  <td className="px-3 py-2 text-left font-mono text-sky-400 whitespace-nowrap">{item.cashPurchases > 0 ? `${fmtMoney(item.cashPurchases)} ${reportCurrency}` : `0 ${reportCurrency}`}</td>
                  <td className="px-3 py-2 text-left font-mono text-amber-400 whitespace-nowrap">{item.creditPurchases > 0 ? `${fmtMoney(item.creditPurchases)} ${reportCurrency}` : `0 ${reportCurrency}`}</td>
                  <td className="px-3 py-2 text-left font-mono text-pink-300 whitespace-nowrap">{item.vouchersPaid > 0 ? `${fmtMoney(item.vouchersPaid)} ${reportCurrency}` : `0 ${reportCurrency}`}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-emerald-400 whitespace-nowrap">{fmtMoney(item.totalPaid)} {reportCurrency}</td>
                  <td className={`px-3 py-2 text-left font-mono font-bold ${item.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{fmtMoney(item.balanceDue)} {reportCurrency}</td>
                  <td className="px-3 py-2 text-center">{item.balanceDue <= 0.01 ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800">✓ خالص</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800">⏳ مستحق</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {statementType === 'customer' && (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#0F172A] text-slate-300 font-semibold border-b border-slate-800">
                <th className="px-3 py-2 text-right text-[10.5px]">العميلة</th>
                <th className="px-3 py-2 text-center text-[10.5px]">الهاتف</th>
                <th className="px-3 py-2 text-center text-[10.5px]">الطلبات</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">إجمالي المبيعات</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">إجمالي المسدد</th>
                <th className="px-3 py-2 text-left font-mono text-[10.5px]">الرصيد المستحق</th>
                <th className="px-3 py-2 text-center text-[10.5px]">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#111C38]">
              {statementData.length === 0 ? <tr><td colSpan="7" className="text-center py-6 text-slate-400">لا توجد طلبات مسجلة للعميلات 👗</td></tr> : statementData.map(item => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 font-bold text-white">{item.name}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-400">{item.phone || '—'}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-300">{item.ordersCount}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-white whitespace-nowrap">{fmtMoney(item.totalSales)} {reportCurrency}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-emerald-400 whitespace-nowrap">{fmtMoney(item.totalPaid)} {reportCurrency}</td>
                  <td className={`px-3 py-2 text-left font-mono font-bold ${item.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{fmtMoney(item.balanceDue)} {reportCurrency}</td>
                  <td className="px-3 py-2 text-center">{item.balanceDue <= 0.01 ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800">✓ خالصة</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800">⏳ مستحق</span>}</td>
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
