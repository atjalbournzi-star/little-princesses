// src/features/reports/components/FinancialStatementsView.jsx

function FinancialStatementsView({
  subTab, generalLedgerRows, cashBankReconciliation, statementData,
  statementType, targetCode, reportCurrency, fmtMoney, isGLLoading,
  selectedLedgerAcc, setSelectedLedgerAcc, accounts = []
}) {
  const [actualBalances, setActualBalances] = React.useState({});

  if (subTab === 'general_ledger') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 shadow-xs overflow-hidden space-y-1.5 p-2 animate-fadeIn select-none">
        <div className="h-7.5 flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            <span>كشف حركة دفتر الأستاذ العام (General Ledger Statement)</span>
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-slate-400">الحساب المحدد:</span>
            <span className="px-2 py-0.5 rounded bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 text-[10.5px] font-bold font-mono">
              {(() => {
                const cur = (accounts || []).find(a => a.id === selectedLedgerAcc || a.code === selectedLedgerAcc);
                return cur ? `${cur.code || cur.account_code || cur.id} - ${cur.account_name || cur.name || cur.id}` : (selectedLedgerAcc || '—');
              })()}
            </span>
          </div>
        </div>
        {isGLLoading && (
          <div className="p-1.5 bg-pink-500/10 dark:bg-pink-950/40 rounded-md border border-pink-200 dark:border-pink-900/60 flex items-center justify-center gap-2 text-[11px] text-pink-600 dark:text-pink-300 font-bold">
            <span className="w-3 h-3 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></span>
            <span>جاري جلب كشف دفتر الأستاذ العام من السيرفر...</span>
          </div>
        )}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          {!isGLLoading && generalLedgerRows.length === 0 ? (
            <div className="text-center py-5 text-slate-500 dark:text-slate-400 text-[11px] font-medium bg-slate-50 dark:bg-[#0F172A]">لا توجد حركات مسجلة لهذا الحساب خلال الفترة المحددة 🧾</div>
          ) : (
            <table className="w-full text-[11px] text-right border-collapse">
              <thead>
                <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="px-2.5 py-1 text-center">التاريخ</th>
                  <th className="px-2.5 py-1 text-right">رقم القيد / المرجع</th>
                  <th className="px-2.5 py-1 text-right">البيان والتفاصيل</th>
                  <th className="px-2.5 py-1 text-left font-mono">مدين ({targetCode})</th>
                  <th className="px-2.5 py-1 text-left font-mono">دائن ({targetCode})</th>
                  <th className="px-2.5 py-1 text-left font-mono">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
                {generalLedgerRows.map(row => (
                  <tr key={row.id} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-2.5 py-1 text-center font-mono text-slate-500 dark:text-slate-400 tabular-nums">{row.date}</td>
                    <td className="px-2.5 py-1 font-mono font-bold text-pink-600 dark:text-pink-300">{row.entry_no}</td>
                    <td className="px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium">{row.notes}</td>
                    <td className="px-2.5 py-1 text-left font-mono font-bold text-sky-600 dark:text-sky-400 tabular-nums">{row.debit_target > 0 ? `${fmtMoney(row.debit_target)} ${targetCode}` : `0 ${targetCode}`}</td>
                    <td className="px-2.5 py-1 text-left font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">{row.credit_target > 0 ? `${fmtMoney(row.credit_target)} ${targetCode}` : `0 ${targetCode}`}</td>
                    <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white tabular-nums">{fmtMoney(row.running_target)} {reportCurrency}</td>
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
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 shadow-xs overflow-hidden space-y-1.5 p-2 animate-fadeIn select-none">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 my-0.5 shrink-0">
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">سيولة الخزائن والبنوك</span>
          <span className="font-mono font-bold text-[11px] text-sky-600 dark:text-sky-400 tabular-nums">{fmtMoney(cashBankReconciliation.reduce((s, c) => s + (c.closingLedgerTarget || 0), 0))} {reportCurrency}</span>
        </div>
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">مستحقات الموردين</span>
          <span className="font-mono font-bold text-[11px] text-pink-600 dark:text-pink-300 tabular-nums">{fmtMoney(statementData.reduce((s, i) => s + (statementType === 'supplier' ? (i.balanceDue || 0) : 0), 0))} {reportCurrency}</span>
        </div>
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">مستحقات العملاء</span>
          <span className="font-mono font-bold text-[11px] text-pink-600 dark:text-pink-400 tabular-nums">{fmtMoney(statementData.reduce((s, i) => s + (statementType === 'customer' ? (i.balanceDue || 0) : 0), 0))} {reportCurrency}</span>
        </div>
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">حالة التدقيق والتسوية</span>
          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
            {Object.keys(actualBalances).length > 0 ? `${Object.keys(actualBalances).length} خزائن مسواة` : 'جاهز للمطابقة'}
          </span>
        </div>
      </div>

      {statementType === 'treasury' && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-[11px] text-right border-collapse">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="px-2.5 py-1 text-center">الكود</th>
                <th className="px-2.5 py-1 text-right">الخزينة / البنك</th>
                <th className="px-2.5 py-1 text-center">العملة الأصلية</th>
                <th className="px-2.5 py-1 text-left font-mono">الرصيد السابق</th>
                <th className="px-2.5 py-1 text-left font-mono">مقبوضات (مدين)</th>
                <th className="px-2.5 py-1 text-left font-mono">مدفوعات (دائن)</th>
                <th className="px-2.5 py-1 text-left font-mono">الرصيد الدفتري</th>
                <th className="px-2.5 py-1 text-center font-mono">الرصيد الفعلي</th>
                <th className="px-2.5 py-1 text-center">التسوية والفارق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {cashBankReconciliation.map(acc => {
                const act = actualBalances[acc.id];
                const hasAct = act !== undefined && act !== '';
                const actNum = hasAct ? (parseFloat(act) || 0) : null;
                const bookNum = parseFloat(acc.closingLedgerTarget) || 0;
                const diff = hasAct ? (actNum - bookNum) : 0;
                return (
                  <tr key={acc.id} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-2.5 py-1 text-center font-mono font-bold text-pink-600 dark:text-pink-300">{acc.code}</td>
                    <td className="px-2.5 py-1 font-bold text-slate-800 dark:text-white">{acc.name}</td>
                    <td className="px-2.5 py-1 text-center font-mono text-[11px] text-slate-600 dark:text-slate-300">{acc.nativeCurr} {acc.nativeCurr !== 'YER' && `(×${acc.rate})`}</td>
                    <td className="px-2.5 py-1 text-left font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">{fmtMoney(acc.openingTarget)} {targetCode}</td>
                    <td className="px-2.5 py-1 text-left font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap tabular-nums">{acc.debitTarget > 0 ? `${fmtMoney(acc.debitTarget)} ${targetCode}` : `0 ${targetCode}`}</td>
                    <td className="px-2.5 py-1 text-left font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap tabular-nums">{acc.creditTarget > 0 ? `${fmtMoney(acc.creditTarget)} ${targetCode}` : `0 ${targetCode}`}</td>
                    <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">{fmtMoney(acc.closingLedgerTarget)} {targetCode}</td>
                    <td className="px-1.5 py-1 text-center">
                      <input
                        type="number"
                        value={actualBalances[acc.id] ?? ''}
                        onChange={e => setActualBalances({ ...actualBalances, [acc.id]: e.target.value })}
                        className="w-20 h-5 px-1 text-center font-mono font-bold text-[10.5px] bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-slate-700 rounded outline-none focus:border-pink-500"
                      />
                    </td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {!hasAct ? <span className="text-slate-400 text-[10px]">قيد المطابقة</span> : Math.abs(diff) < 0.01 ? (
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">مطابق ✓</span>
                      ) : diff < 0 ? (
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">عجز: {fmtMoney(Math.abs(diff))}</span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800">زيادة: {fmtMoney(diff)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {statementType === 'supplier' && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-[11px] text-right border-collapse">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                {['المورد', 'الهاتف', 'الفواتير', 'إجمالي المشتريات', 'مسدد نقداً', 'آجل', 'سندات صرف', 'إجمالي المسدد', 'الرصيد المستحق', 'الحالة'].map((h, i) => (
                  <th key={h} className={`px-2.5 py-1 ${i === 0 ? 'text-right' : [1, 2, 9].includes(i) ? 'text-center' : 'text-left font-mono'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {statementData.length === 0 ? <tr><td colSpan="10" className="text-center py-5 text-slate-500 dark:text-slate-400">لا توجد حركات مسجلة للموردين 🧵</td></tr> : statementData.map(item => (
                <tr key={item.id} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-2.5 py-1 font-bold text-slate-800 dark:text-white">{item.name}</td>
                  <td className="px-2.5 py-1 text-center font-mono text-slate-500 dark:text-slate-400 tabular-nums">{item.phone || '—'}</td>
                  <td className="px-2.5 py-1 text-center font-mono text-slate-600 dark:text-slate-300 tabular-nums">{item.purchasesCount}</td>
                  <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">{fmtMoney(item.totalPurchases)} {reportCurrency}</td>
                  <td className="px-2.5 py-1 text-left font-mono text-sky-600 dark:text-sky-400 whitespace-nowrap tabular-nums">{item.cashPurchases > 0 ? `${fmtMoney(item.cashPurchases)} ${reportCurrency}` : `0 ${reportCurrency}`}</td>
                  <td className="px-2.5 py-1 text-left font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap tabular-nums">{item.creditPurchases > 0 ? `${fmtMoney(item.creditPurchases)} ${reportCurrency}` : `0 ${reportCurrency}`}</td>
                  <td className="px-2.5 py-1 text-left font-mono text-pink-600 dark:text-pink-300 whitespace-nowrap tabular-nums">{item.vouchersPaid > 0 ? `${fmtMoney(item.vouchersPaid)} ${reportCurrency}` : `0 ${reportCurrency}`}</td>
                  <td className="px-2.5 py-1 text-left font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums">{fmtMoney(item.totalPaid)} {reportCurrency}</td>
                  <td className={`px-2.5 py-1 text-left font-mono font-bold tabular-nums ${item.balanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtMoney(item.balanceDue)} {reportCurrency}</td>
                  <td className="px-2.5 py-1 text-center">{item.balanceDue <= 0.01 ? <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">خالص</span> : <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">مستحق</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {statementType === 'customer' && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-[11px] text-right border-collapse">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                {['العميل', 'الهاتف', 'الطلبات', 'إجمالي المبيعات', 'إجمالي المسدد', 'الرصيد المستحق', 'الحالة'].map((h, i) => (
                  <th key={h} className={`px-2.5 py-1 ${i === 0 ? 'text-right' : [1, 2, 6].includes(i) ? 'text-center' : 'text-left font-mono'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {statementData.length === 0 ? <tr><td colSpan="7" className="text-center py-5 text-slate-500 dark:text-slate-400">لا توجد طلبات مسجلة للعملاء 👗</td></tr> : statementData.map(item => (
                <tr key={item.id} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-2.5 py-1 font-bold text-slate-800 dark:text-white">{item.name}</td>
                  <td className="px-2.5 py-1 text-center font-mono text-slate-500 dark:text-slate-400 tabular-nums">{item.phone || '—'}</td>
                  <td className="px-2.5 py-1 text-center font-mono text-slate-600 dark:text-slate-300 tabular-nums">{item.ordersCount}</td>
                  <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">{fmtMoney(item.totalSales)} {reportCurrency}</td>
                  <td className="px-2.5 py-1 text-left font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums">{fmtMoney(item.totalPaid)} {reportCurrency}</td>
                  <td className={`px-2.5 py-1 text-left font-mono font-bold tabular-nums ${item.balanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtMoney(item.balanceDue)} {reportCurrency}</td>
                  <td className="px-2.5 py-1 text-center">{item.balanceDue <= 0.01 ? <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">خالصة</span> : <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800">مستحق</span>}</td>
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
