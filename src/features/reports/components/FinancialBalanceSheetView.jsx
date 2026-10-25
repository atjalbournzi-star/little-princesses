// src/features/reports/components/FinancialBalanceSheetView.jsx

function FinancialBalanceSheetView({ subTab, balanceSheetData, trialBalanceData, reportCurrency, fmtMoney, targetCode, isTBLoading }) {
  if (subTab === 'trial_balance') {
    return (
      <div className="bg-[#111C38] rounded-xl border border-slate-800 shadow-2xs overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-800 bg-[#0F172A] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-xs text-white">ميزان المراجعة بالمجاميع والأرصدة الختامية</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">فحص توازن كافة الحركات المحاسبية المدينة والدائنة في دليل الحسابات</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${trialBalanceData.isBalanced ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-rose-950/80 text-rose-300 border-rose-800'}`}>
            {trialBalanceData.isBalanced ? '✅ متزن محاسبياً 100%' : '⚠️ غير متزن'}
          </span>
        </div>
        {isTBLoading && (
          <div className="p-2 bg-pink-950/40 border-b border-pink-900/60 flex items-center justify-center gap-2 text-xs text-pink-300 font-bold">
            <span className="w-3 h-3 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></span>
            <span>جاري تحديث بيانات ميزان المراجعة من السيرفر...</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-[#0F172A] text-slate-300 font-semibold border-b border-slate-800">
                <th className="px-3 py-2 text-right whitespace-nowrap min-w-[90px] text-[10.5px]">كود الحساب</th>
                <th className="px-3 py-2 text-right whitespace-nowrap min-w-[180px] text-[10.5px]">اسم الحساب</th>
                <th className="px-2 py-2 text-center whitespace-nowrap min-w-[70px] text-[10.5px]">النوع</th>
                <th className="px-2 py-2 text-center whitespace-nowrap min-w-[70px] text-[10.5px]">الطبيعة</th>
                <th className="px-3 py-2 text-left font-mono whitespace-nowrap min-w-[110px] text-[10.5px]">رصيد سابق / افتتاحي</th>
                <th className="px-3 py-2 text-left font-mono whitespace-nowrap min-w-[125px] text-[10.5px]">مجموع المدين ({targetCode})</th>
                <th className="px-3 py-2 text-left font-mono whitespace-nowrap min-w-[125px] text-[10.5px]">مجموع الدائن ({targetCode})</th>
                <th className="px-3 py-2 text-left font-mono whitespace-nowrap min-w-[125px] text-[10.5px]">رصيد ختامي مدين</th>
                <th className="px-3 py-2 text-left font-mono whitespace-nowrap min-w-[125px] text-[10.5px]">رصيد ختامي دائن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#111C38]">
              {trialBalanceData.rows.map(r => (
                <tr key={r.code} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 font-bold font-mono text-pink-300 whitespace-nowrap">{r.code}</td>
                  <td className="px-3 py-2 font-medium text-white whitespace-nowrap">{r.name}</td>
                  <td className="px-2 py-2 text-center whitespace-nowrap"><span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] text-slate-300">{r.type}</span></td>
                  <td className="px-2 py-2 text-center whitespace-nowrap"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${String(r.nature || '').toLowerCase() === 'debit' ? 'bg-sky-950/60 text-sky-300 border border-sky-800' : 'bg-rose-950/60 text-rose-300 border border-rose-800'}`}>{String(r.nature || '').toLowerCase() === 'debit' ? 'مدين' : 'دائن'}</span></td>
                  <td className="px-3 py-2 text-left font-mono text-slate-400 whitespace-nowrap tabular-nums">{r.opening_target !== 0 ? `${fmtMoney(r.opening_target)} ${targetCode}` : `0 ${targetCode}`}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-sky-400 whitespace-nowrap tabular-nums">{fmtMoney(r.total_debit_target)} {targetCode}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-rose-400 whitespace-nowrap tabular-nums">{fmtMoney(r.total_credit_target)} {targetCode}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-white whitespace-nowrap tabular-nums">{fmtMoney(r.debit_balance_target)} {targetCode}</td>
                  <td className="px-3 py-2 text-left font-mono font-bold text-white whitespace-nowrap tabular-nums">{fmtMoney(r.credit_balance_target)} {targetCode}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#0F172A] font-extrabold border-t border-slate-700 text-xs text-white">
                <td colSpan="4" className="px-3 py-2.5 text-right text-slate-200 whitespace-nowrap font-bold">المجاميع الإجمالية وتأكيد التوازن:</td>
                <td className="px-3 py-2.5 text-left font-mono text-slate-400 text-xs whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandOpening)} {targetCode}</td>
                <td className="px-3 py-2.5 text-left font-mono text-sky-400 text-xs whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandDebit)} {targetCode}</td>
                <td className="px-3 py-2.5 text-left font-mono text-rose-400 text-xs whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandCredit)} {targetCode}</td>
                <td className="px-3 py-2.5 text-left font-mono text-white text-xs whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandDebitBal)} {targetCode}</td>
                <td className="px-3 py-2.5 text-left font-mono text-white text-xs whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandCreditBal)} {targetCode}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // default: balance_sheet
  return (
    <div className="space-y-2.5 animate-fadeIn">
      <div className={`p-2.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-2 transition-all ${balanceSheetData.isBalanced ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-rose-950/40 border-rose-800 text-rose-300'}`}>
        <div className="flex items-center gap-2 font-bold text-xs">
          <span className="text-sm">{balanceSheetData.isBalanced ? '✅' : '⚠️'}</span>
          <div>
            <div className="font-extrabold text-xs text-white">
              {balanceSheetData.isBalanced ? 'الميزانية العمومية متزنة ومطابقة تماماً' : 'تنبيه: يوجد فارق غير متزن في الميزانية'}
            </div>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">
              معادلة الميزانية: الأصول ({fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}) = الخصوم وحقوق الملكية ({fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency})
              {!balanceSheetData.isBalanced && ` | الفارق: ${fmtMoney(balanceSheetData.diff)} ${reportCurrency}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-center font-mono text-xs font-bold bg-[#0F172A] px-2.5 py-1 rounded-lg border border-slate-700 shadow-2xs">
          <span className="text-sky-400">الأصول: {fmtMoney(balanceSheetData.totalAssets)}</span>
          <span className="text-slate-500">≡</span>
          <span className="text-pink-300">الخصوم والملكية: {fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)}</span>
          <span className="text-slate-300 font-sans font-semibold mr-1">{reportCurrency}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {/* جانب الأصول */}
        <div className="bg-[#111C38] rounded-xl border border-slate-800 shadow-2xs overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between font-bold text-xs text-sky-400">
            <span>1. جانب الأصول (Assets)</span>
            <span className="font-mono">{fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}</span>
          </div>
          <div className="p-3 space-y-2.5">
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#111C38]">
              <div className="bg-[#0F172A] px-3 py-1.5 font-bold text-xs text-slate-200 border-b border-slate-800 flex justify-between">
                <span>الأصول المتداولة (Current Assets)</span>
                <span className="font-mono text-sky-400">{fmtMoney(balanceSheetData.totalCurrentAssets)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-800/80 bg-[#111C38]">
                  {balanceSheetData.currentAssets.map(a => (
                    <tr key={a.code} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-pink-300 w-20">{a.code}</td>
                      <td className="px-3 py-1.5 text-slate-200 font-medium">{a.name}</td>
                      <td className="px-3 py-1.5 text-left font-mono font-bold text-white">{fmtMoney(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#111C38]">
              <div className="bg-[#0F172A] px-3 py-1.5 font-bold text-xs text-slate-200 border-b border-slate-800 flex justify-between">
                <span>الأصول الثابتة (Fixed Assets)</span>
                <span className="font-mono text-sky-400">{fmtMoney(balanceSheetData.totalFixedAssets)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-800/80 bg-[#111C38]">
                  {balanceSheetData.fixedAssets.map(a => (
                    <tr key={a.code} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-pink-300 w-20">{a.code}</td>
                      <td className="px-3 py-1.5 text-slate-200 font-medium">{a.name}</td>
                      <td className="px-3 py-1.5 text-left font-mono font-bold text-white">{fmtMoney(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-[#0F172A] p-2.5 rounded-lg font-bold text-xs text-sky-400 flex justify-between border border-sky-800/60">
              <span>إجمالي الأصول (Total Assets)</span>
              <span className="font-mono text-sm">{fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}</span>
            </div>
          </div>
        </div>

        {/* جانب الخصوم وحقوق الملكية */}
        <div className="bg-[#111C38] rounded-xl border border-slate-800 shadow-2xs overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between font-bold text-xs text-pink-300">
            <span>2. الخصوم وحقوق الملكية (Liabilities & Equity)</span>
            <span className="font-mono">{fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency}</span>
          </div>
          <div className="p-3 space-y-2.5">
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#111C38]">
              <div className="bg-[#0F172A] px-3 py-1.5 font-bold text-xs text-rose-300 border-b border-slate-800 flex justify-between">
                <span>الخصوم والالتزامات المتداولة (Liabilities)</span>
                <span className="font-mono text-rose-400">{fmtMoney(balanceSheetData.totalLiabilities)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-800/80 bg-[#111C38]">
                  {balanceSheetData.currentLiabilities.map(l => (
                    <tr key={l.code} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-pink-300 w-20">{l.code}</td>
                      <td className="px-3 py-1.5 text-slate-200 font-medium">{l.name}</td>
                      <td className="px-3 py-1.5 text-left font-mono font-bold text-rose-400">{fmtMoney(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#111C38]">
              <div className="bg-[#0F172A] px-3 py-1.5 font-bold text-xs text-pink-300 border-b border-slate-800 flex justify-between">
                <span>حقوق الملكية ورأس المال (Equity)</span>
                <span className="font-mono text-pink-300">{fmtMoney(balanceSheetData.totalEquity)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-800/80 bg-[#111C38]">
                  {balanceSheetData.equityAccounts.map(e => (
                    <tr key={e.code} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-pink-300 w-20">{e.code}</td>
                      <td className="px-3 py-1.5 text-slate-200 font-medium">{e.name}</td>
                      <td className="px-3 py-1.5 text-left font-mono font-bold text-white">{fmtMoney(e.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#0F172A]/60 font-bold">
                    <td className="px-3 py-1.5 font-mono text-sky-400 w-20">P&L</td>
                    <td className="px-3 py-1.5 text-slate-200">صافي أرباح / (خسائر) الفترة المحققة</td>
                    <td className={`px-3 py-1.5 text-left font-mono font-bold ${balanceSheetData.periodProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtMoney(balanceSheetData.periodProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#0F172A] p-2.5 rounded-lg font-bold text-xs text-pink-300 flex justify-between border border-pink-800/60">
              <span>إجمالي الخصوم وحقوق الملكية</span>
              <span className="font-mono text-sm">{fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency}</span>
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
