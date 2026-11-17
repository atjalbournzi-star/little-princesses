// src/features/reports/components/FinancialBalanceSheetView.jsx

function FinancialBalanceSheetView({ subTab, balanceSheetData, trialBalanceData, reportCurrency, fmtMoney, targetCode, isTBLoading }) {
  if (subTab === 'trial_balance') {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 shadow-xs overflow-hidden select-none">
        <div className="h-7.5 px-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] flex items-center justify-between">
          <h3 className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span>ميزان المراجعة بالمجاميع والأرصدة الختامية</span>
          </h3>
          <span className={`px-2 py-0.2 rounded-md text-[10px] font-bold font-mono border ${trialBalanceData.isBalanced ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'}`}>
            {trialBalanceData.isBalanced ? 'متزن محاسبياً 100%' : 'غير متزن'}
          </span>
        </div>
        {isTBLoading && (
          <div className="p-1.5 bg-pink-500/10 dark:bg-pink-950/40 border-b border-pink-200 dark:border-pink-900/60 flex items-center justify-center gap-2 text-[11px] text-pink-600 dark:text-pink-300 font-bold">
            <span className="w-3 h-3 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></span>
            <span>جاري تحديث بيانات ميزان المراجعة من السيرفر...</span>
          </div>
        )}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-[11px] text-right border-collapse min-w-[920px]">
            <thead>
              <tr className="h-7.5 bg-slate-50 dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="px-2.5 py-1 text-right whitespace-nowrap min-w-[85px]">كود الحساب</th>
                <th className="px-2.5 py-1 text-right whitespace-nowrap min-w-[170px]">اسم الحساب</th>
                <th className="px-2 py-1 text-center whitespace-nowrap min-w-[65px]">النوع</th>
                <th className="px-2 py-1 text-center whitespace-nowrap min-w-[65px]">الطبيعة</th>
                <th className="px-2.5 py-1 text-left font-mono whitespace-nowrap min-w-[105px]">رصيد سابق</th>
                <th className="px-2.5 py-1 text-left font-mono whitespace-nowrap min-w-[115px]">مجموع المدين ({targetCode})</th>
                <th className="px-2.5 py-1 text-left font-mono whitespace-nowrap min-w-[115px]">مجموع الدائن ({targetCode})</th>
                <th className="px-2.5 py-1 text-left font-mono whitespace-nowrap min-w-[115px]">رصيد ختامي مدين</th>
                <th className="px-2.5 py-1 text-left font-mono whitespace-nowrap min-w-[115px]">رصيد ختامي دائن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
              {trialBalanceData.rows.map(r => (
                <tr key={r.code} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-2.5 py-1 font-bold font-mono text-pink-600 dark:text-pink-300 whitespace-nowrap">{r.code}</td>
                  <td className="px-2.5 py-1 font-medium text-slate-800 dark:text-white whitespace-nowrap">{r.name}</td>
                  <td className="px-2 py-1 text-center whitespace-nowrap"><span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300">{r.type}</span></td>
                  <td className="px-2 py-1 text-center whitespace-nowrap"><span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${String(r.nature || '').toLowerCase() === 'debit' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800' : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}`}>{String(r.nature || '').toLowerCase() === 'debit' ? 'مدين' : 'دائن'}</span></td>
                  <td className="px-2.5 py-1 text-left font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">{r.opening_target !== 0 ? `${fmtMoney(r.opening_target)} ${targetCode}` : `0 ${targetCode}`}</td>
                  <td className="px-2.5 py-1 text-left font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap tabular-nums">{fmtMoney(r.total_debit_target)} {targetCode}</td>
                  <td className="px-2.5 py-1 text-left font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap tabular-nums">{fmtMoney(r.total_credit_target)} {targetCode}</td>
                  <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">{fmtMoney(r.debit_balance_target)} {targetCode}</td>
                  <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">{fmtMoney(r.credit_balance_target)} {targetCode}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="h-8 bg-slate-50 dark:bg-[#0F172A] font-extrabold border-t border-slate-300 dark:border-slate-700 text-[11px] text-slate-900 dark:text-white">
                <td colSpan="4" className="px-2.5 py-1 text-right text-slate-800 dark:text-slate-200 whitespace-nowrap font-bold">المجاميع الإجمالية وتأكيد التوازن:</td>
                <td className="px-2.5 py-1 text-left font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandOpening)} {targetCode}</td>
                <td className="px-2.5 py-1 text-left font-mono text-sky-600 dark:text-sky-400 whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandDebit)} {targetCode}</td>
                <td className="px-2.5 py-1 text-left font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandCredit)} {targetCode}</td>
                <td className="px-2.5 py-1 text-left font-mono text-slate-900 dark:text-white whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandDebitBal)} {targetCode}</td>
                <td className="px-2.5 py-1 text-left font-mono text-slate-900 dark:text-white whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandCreditBal)} {targetCode}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // default: balance_sheet
  return (
    <div className="space-y-1.5 animate-fadeIn select-none">
      <div className={`px-2.5 py-1.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-1.5 transition-all ${balanceSheetData.isBalanced ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'}`}>
        <div className="flex items-center gap-2 font-bold text-xs">
          <div>
            <div className="font-extrabold text-[11.5px] text-slate-900 dark:text-white">
              {balanceSheetData.isBalanced ? 'الميزانية العمومية متزنة ومطابقة تماماً' : 'تنبيه: يوجد فارق غير متزن في الميزانية'}
            </div>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.2">
              معادلة الميزانية: الأصول ({fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}) = الخصوم وحقوق الملكية ({fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency})
              {!balanceSheetData.isBalanced && ` | الفارق: ${fmtMoney(balanceSheetData.diff)} ${reportCurrency}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-center font-mono text-[11px] font-bold bg-white dark:bg-[#0F172A] px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
          <span className="text-sky-600 dark:text-sky-400">الأصول: {fmtMoney(balanceSheetData.totalAssets)}</span>
          <span className="text-slate-400">≡</span>
          <span className="text-pink-600 dark:text-pink-300">الخصوم والملكية: {fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)}</span>
          <span className="text-slate-500 dark:text-slate-400 font-sans font-semibold mr-1">{reportCurrency}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        {/* جانب الأصول */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38] shadow-xs overflow-hidden">
          <div className="h-7.5 px-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] flex items-center justify-between font-bold text-[11px] text-sky-600 dark:text-sky-400">
            <span>1. جانب الأصول (Assets)</span>
            <span className="font-mono tabular-nums">{fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}</span>
          </div>
          <div className="p-2 space-y-2">
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#111C38]">
              <div className="bg-slate-100 dark:bg-[#0F172A] px-2.5 py-1 font-bold text-[11px] text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                <span>الأصول المتداولة (Current Assets)</span>
                <span className="font-mono text-sky-600 dark:text-sky-400 tabular-nums">{fmtMoney(balanceSheetData.totalCurrentAssets)}</span>
              </div>
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
                  {balanceSheetData.currentAssets.map(a => (
                    <tr key={a.code} className="h-7 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-2.5 py-1 font-mono text-pink-600 dark:text-pink-300 w-20">{a.code}</td>
                      <td className="px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium">{a.name}</td>
                      <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white tabular-nums">{fmtMoney(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#111C38]">
              <div className="bg-slate-100 dark:bg-[#0F172A] px-2.5 py-1 font-bold text-[11px] text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                <span>الأصول الثابتة (Fixed Assets)</span>
                <span className="font-mono text-sky-600 dark:text-sky-400 tabular-nums">{fmtMoney(balanceSheetData.totalFixedAssets)}</span>
              </div>
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
                  {balanceSheetData.fixedAssets.map(a => (
                    <tr key={a.code} className="h-7 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-2.5 py-1 font-mono text-pink-600 dark:text-pink-300 w-20">{a.code}</td>
                      <td className="px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium">{a.name}</td>
                      <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white tabular-nums">{fmtMoney(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-100 dark:bg-[#0F172A] px-2.5 py-1.5 rounded-lg font-bold text-[11px] text-sky-600 dark:text-sky-400 flex justify-between border border-sky-300 dark:border-sky-800/60">
              <span>إجمالي الأصول (Total Assets)</span>
              <span className="font-mono text-xs tabular-nums">{fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}</span>
            </div>
          </div>
        </div>

        {/* جانب الخصوم وحقوق الملكية */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38] shadow-xs overflow-hidden">
          <div className="h-7.5 px-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] flex items-center justify-between font-bold text-[11px] text-pink-600 dark:text-pink-300">
            <span>2. الخصوم وحقوق الملكية (Liabilities & Equity)</span>
            <span className="font-mono tabular-nums">{fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency}</span>
          </div>
          <div className="p-2 space-y-2">
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#111C38]">
              <div className="bg-slate-100 dark:bg-[#0F172A] px-2.5 py-1 font-bold text-[11px] text-rose-600 dark:text-rose-300 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                <span>الخصوم والالتزامات المتداولة (Liabilities)</span>
                <span className="font-mono text-rose-600 dark:text-rose-400 tabular-nums">{fmtMoney(balanceSheetData.totalLiabilities)}</span>
              </div>
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
                  {balanceSheetData.currentLiabilities.map(l => (
                    <tr key={l.code} className="h-7 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-2.5 py-1 font-mono text-pink-600 dark:text-pink-300 w-20">{l.code}</td>
                      <td className="px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium">{l.name}</td>
                      <td className="px-2.5 py-1 text-left font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">{fmtMoney(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#111C38]">
              <div className="bg-slate-100 dark:bg-[#0F172A] px-2.5 py-1 font-bold text-[11px] text-pink-600 dark:text-pink-300 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                <span>حقوق الملكية ورأس المال (Equity)</span>
                <span className="font-mono text-pink-600 dark:text-pink-300 tabular-nums">{fmtMoney(balanceSheetData.totalEquity)}</span>
              </div>
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-[#111C38]">
                  {balanceSheetData.equityAccounts.map(e => (
                    <tr key={e.code} className="h-7 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-2.5 py-1 font-mono text-pink-600 dark:text-pink-300 w-20">{e.code}</td>
                      <td className="px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium">{e.name}</td>
                      <td className="px-2.5 py-1 text-left font-mono font-bold text-slate-900 dark:text-white tabular-nums">{fmtMoney(e.amount)}</td>
                    </tr>
                  ))}
                  <tr className="h-7 bg-slate-50 dark:bg-[#0F172A]/60 font-bold">
                    <td className="px-2.5 py-1 font-mono text-sky-600 dark:text-sky-400 w-20">P&L</td>
                    <td className="px-2.5 py-1 text-slate-800 dark:text-slate-200">صافي أرباح / (خسائر) الفترة المحققة</td>
                    <td className={`px-2.5 py-1 text-left font-mono font-bold tabular-nums ${balanceSheetData.periodProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmtMoney(balanceSheetData.periodProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-100 dark:bg-[#0F172A] px-2.5 py-1.5 rounded-lg font-bold text-[11px] text-pink-600 dark:text-pink-300 flex justify-between border border-pink-300 dark:border-pink-800/60">
              <span>إجمالي الخصوم وحقوق الملكية</span>
              <span className="font-mono text-xs tabular-nums">{fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.FinancialBalanceSheetView = FinancialBalanceSheetView;
}
