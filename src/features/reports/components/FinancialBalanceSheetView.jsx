// src/features/reports/components/FinancialBalanceSheetView.jsx

function FinancialBalanceSheetView({ subTab, balanceSheetData, trialBalanceData, reportCurrency, fmtMoney, targetCode, isTBLoading }) {
  if (subTab === 'trial_balance') {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-white">ميزان المراجعة بالمجاميع والأرصدة الختامية</h3>
            <p className="text-[11px] text-white">فحص توازن كافة الحركات المحاسبية المدينة والدائنة في دليل الحسابات</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${trialBalanceData.isBalanced ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-rose-950/80 text-[#D64545] border-rose-800'}`}>
            {trialBalanceData.isBalanced ? '✅ متزن محاسبياً 100%' : '⚠️ غير متزن'}
          </span>
        </div>
        {isTBLoading && (
          <div className="p-3 bg-sky-50 border-b border-sky-100 flex items-center justify-center gap-2 text-xs text-[#007F8C] font-bold">
            <span className="w-3.5 h-3.5 border-2 border-[#007F8C] border-t-transparent rounded-full animate-spin"></span>
            <span>جاري تحديث بيانات ميزان المراجعة من السيرفر...</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-slate-900 text-white font-medium border-b border-slate-800">
                <th className="px-3.5 py-3 text-right whitespace-nowrap min-w-[90px] font-medium text-white">كود الحساب</th>
                <th className="px-3.5 py-3 text-right whitespace-nowrap min-w-[180px] font-medium text-white">اسم الحساب</th>
                <th className="px-2.5 py-3 text-center whitespace-nowrap min-w-[70px] font-medium text-white">النوع</th>
                <th className="px-2.5 py-3 text-center whitespace-nowrap min-w-[70px] font-medium text-white">الطبيعة</th>
                <th className="px-3.5 py-3 text-left font-mono whitespace-nowrap min-w-[110px] font-medium text-white">رصيد سابق / افتتاحي</th>
                <th className="px-3.5 py-3 text-left font-mono whitespace-nowrap min-w-[125px] font-medium text-white">مجموع المدين ({targetCode})</th>
                <th className="px-3.5 py-3 text-left font-mono whitespace-nowrap min-w-[125px] font-medium text-white">مجموع الدائن ({targetCode})</th>
                <th className="px-3.5 py-3 text-left font-mono whitespace-nowrap min-w-[125px] font-medium text-white">رصيد ختامي مدين</th>
                <th className="px-3.5 py-3 text-left font-mono whitespace-nowrap min-w-[125px] font-medium text-white">رصيد ختامي دائن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA] bg-white">
              {trialBalanceData.rows.map(r => (
                <tr key={r.code} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="px-3.5 py-2.5 font-bold font-mono text-[#8F2A87] whitespace-nowrap">{r.code}</td>
                  <td className="px-3.5 py-2.5 font-medium text-[#25232A] whitespace-nowrap">{r.name}</td>
                  <td className="px-2.5 py-2.5 text-center whitespace-nowrap"><span className="px-2 py-0.5 rounded-md bg-[#FAFAFB] border border-[#E8E5EA] text-[10px] text-[#6F6B75]">{r.type}</span></td>
                  <td className="px-2.5 py-2.5 text-center whitespace-nowrap"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${String(r.nature || '').toLowerCase() === 'debit' ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-rose-50 text-[#D64545]'}`}>{String(r.nature || '').toLowerCase() === 'debit' ? 'مدين' : 'دائن'}</span></td>
                  <td className="px-3.5 py-2.5 text-left font-mono text-[#6F6B75] whitespace-nowrap tabular-nums">{r.opening_target !== 0 ? `${fmtMoney(r.opening_target)} ${targetCode}` : `0 ${targetCode}`}</td>
                  <td className="px-3.5 py-2.5 text-left font-mono font-bold text-[#007F8C] whitespace-nowrap tabular-nums">{fmtMoney(r.total_debit_target)} {targetCode}</td>
                  <td className="px-3.5 py-2.5 text-left font-mono font-bold text-[#D64545] whitespace-nowrap tabular-nums">{fmtMoney(r.total_credit_target)} {targetCode}</td>
                  <td className="px-3.5 py-2.5 text-left font-mono font-bold text-[#25232A] whitespace-nowrap tabular-nums">{fmtMoney(r.debit_balance_target)} {targetCode}</td>
                  <td className="px-3.5 py-2.5 text-left font-mono font-bold text-[#25232A] whitespace-nowrap tabular-nums">{fmtMoney(r.credit_balance_target)} {targetCode}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#FAFAFB] font-extrabold border-t-2 border-[#E8E5EA] text-xs">
                <td colSpan="4" className="px-3.5 py-3.5 text-right text-[#25232A] whitespace-nowrap font-bold">المجاميع الإجمالية وتأكيد التوازن:</td>
                <td className="px-3.5 py-3.5 text-left font-mono text-[#6F6B75] text-xs sm:text-sm whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandOpening)} {targetCode}</td>
                <td className="px-3.5 py-3.5 text-left font-mono text-[#007F8C] text-xs sm:text-sm whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandDebit)} {targetCode}</td>
                <td className="px-3.5 py-3.5 text-left font-mono text-[#D64545] text-xs sm:text-sm whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandCredit)} {targetCode}</td>
                <td className="px-3.5 py-3.5 text-left font-mono text-[#25232A] text-xs sm:text-sm whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandDebitBal)} {targetCode}</td>
                <td className="px-3.5 py-3.5 text-left font-mono text-[#25232A] text-xs sm:text-sm whitespace-nowrap tabular-nums">{fmtMoney(trialBalanceData.grandCreditBal)} {targetCode}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // default: balance_sheet
  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${balanceSheetData.isBalanced ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50/80 border-rose-200 text-[#D64545]'}`}>
        <div className="flex items-center gap-2.5 font-bold text-xs">
          <span className="text-lg">{balanceSheetData.isBalanced ? '✅' : '⚠️'}</span>
          <div>
            <div className="font-extrabold text-sm">
              {balanceSheetData.isBalanced ? 'الميزانية العمومية متزنة ومطابقة تماماً' : 'تنبيه: يوجد فارق غير متزن في الميزانية'}
            </div>
            <p className="text-[11px] font-medium opacity-85 mt-0.5">
              معادلة الميزانية: الأصول ({fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}) = الخصوم وحقوق الملكية ({fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency})
              {!balanceSheetData.isBalanced && ` | الفارق: ${fmtMoney(balanceSheetData.diff)} ${reportCurrency}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-center font-mono text-xs font-bold bg-white/80 px-3.5 py-1.5 rounded-xl border border-current/20 shadow-2xs">
          <span className="text-[#007F8C]">الأصول: {fmtMoney(balanceSheetData.totalAssets)}</span>
          <span className="text-[#6F6B75]">≡</span>
          <span className="text-[#8F2A87]">الخصوم والملكية: {fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)}</span>
          <span className="text-[#25232A] font-sans font-semibold mr-1">{reportCurrency}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* جانب الأصول */}
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E5EA] bg-[#FAFAFB] flex items-center justify-between font-bold text-sm text-[#007F8C]">
            <span>1. جانب الأصول (Assets)</span>
            <span className="font-mono">{fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
              <div className="bg-[#FAFAFB] px-4 py-2 font-bold text-xs text-[#25232A] border-b border-[#E8E5EA] flex justify-between">
                <span>الأصول المتداولة (Current Assets)</span>
                <span className="font-mono">{fmtMoney(balanceSheetData.totalCurrentAssets)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#E8E5EA]">
                  {balanceSheetData.currentAssets.map(a => (
                    <tr key={a.code} className="hover:bg-[#FAFAFB]">
                      <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{a.code}</td>
                      <td className="px-4 py-2.5 text-[#25232A] font-medium">{a.name}</td>
                      <td className="px-4 py-2.5 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
              <div className="bg-[#FAFAFB] px-4 py-2 font-bold text-xs text-[#25232A] border-b border-[#E8E5EA] flex justify-between">
                <span>الأصول الثابتة (Fixed Assets)</span>
                <span className="font-mono">{fmtMoney(balanceSheetData.totalFixedAssets)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#E8E5EA]">
                  {balanceSheetData.fixedAssets.map(a => (
                    <tr key={a.code} className="hover:bg-[#FAFAFB]">
                      <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{a.code}</td>
                      <td className="px-4 py-2.5 text-[#25232A] font-medium">{a.name}</td>
                      <td className="px-4 py-2.5 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-[#E2F5F7] p-4 rounded-xl font-bold text-xs text-[#007F8C] flex justify-between border border-[#C5ECF0]">
              <span>إجمالي الأصول (Total Assets)</span>
              <span className="font-mono text-sm">{fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}</span>
            </div>
          </div>
        </div>

        {/* جانب الخصوم وحقوق الملكية */}
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E5EA] bg-[#FAFAFB] flex items-center justify-between font-bold text-sm text-[#8F2A87]">
            <span>2. الخصوم وحقوق الملكية (Liabilities & Equity)</span>
            <span className="font-mono">{fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency}</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
              <div className="bg-[#FAFAFB] px-4 py-2 font-bold text-xs text-[#D64545] border-b border-[#E8E5EA] flex justify-between">
                <span>الخصوم والالتزامات المتداولة (Liabilities)</span>
                <span className="font-mono">{fmtMoney(balanceSheetData.totalLiabilities)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#E8E5EA]">
                  {balanceSheetData.currentLiabilities.map(l => (
                    <tr key={l.code} className="hover:bg-[#FAFAFB]">
                      <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{l.code}</td>
                      <td className="px-4 py-2.5 text-[#25232A] font-medium">{l.name}</td>
                      <td className="px-4 py-2.5 text-left font-mono font-bold text-[#D64545]">{fmtMoney(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
              <div className="bg-[#FAFAFB] px-4 py-2 font-bold text-xs text-[#8F2A87] border-b border-[#E8E5EA] flex justify-between">
                <span>حقوق الملكية ورأس المال (Equity)</span>
                <span className="font-mono">{fmtMoney(balanceSheetData.totalEquity)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#E8E5EA]">
                  {balanceSheetData.equityAccounts.map(e => (
                    <tr key={e.code} className="hover:bg-[#FAFAFB]">
                      <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{e.code}</td>
                      <td className="px-4 py-2.5 text-[#25232A] font-medium">{e.name}</td>
                      <td className="px-4 py-2.5 text-left font-mono font-bold text-[#8F2A87]">{fmtMoney(e.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#FAFAFB] font-bold">
                    <td className="px-4 py-2.5 font-mono text-[#007F8C] w-20">P&L</td>
                    <td className="px-4 py-2.5 text-[#007F8C]">صافي أرباح / (خسائر) الفترة المحققة</td>
                    <td className={`px-4 py-2.5 text-left font-mono font-bold ${balanceSheetData.periodProfit >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}`}>{fmtMoney(balanceSheetData.periodProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#F2E7F3] p-4 rounded-xl font-bold text-xs text-[#8F2A87] flex justify-between border border-[#E5CEE7]">
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
