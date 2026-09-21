// src/features/reports/components/FinancialBalanceSheetView.jsx

function FinancialBalanceSheetView({ subTab, balanceSheetData, trialBalanceData, reportCurrency, fmtMoney, targetCode }) {
  if (subTab === 'trial_balance') {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E5EA] bg-[#FAFAFB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-[#25232A]">ميزان المراجعة بالمجاميع والأرصدة الختامية</h3>
            <p className="text-[11px] text-[#6F6B75]">فحص توازن كافة الحركات المحاسبية المدينة والدائنة في دليل الحسابات</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${trialBalanceData.isBalanced ? 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]' : 'bg-rose-50 text-[#D64545] border-rose-200'}`}>
            {trialBalanceData.isBalanced ? '✅ متزن محاسبياً 100%' : '⚠️ غير متزن'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                <th className="px-4 py-3 text-right">كود الحساب</th>
                <th className="px-4 py-3 text-right">اسم الحساب</th>
                <th className="px-4 py-3 text-center">النوع</th>
                <th className="px-4 py-3 text-center">الطبيعة</th>
                <th className="px-4 py-3 text-left font-mono">رصيد سابق / افتتاحي</th>
                <th className="px-4 py-3 text-left font-mono">مجموع المدين ({targetCode})</th>
                <th className="px-4 py-3 text-left font-mono">مجموع الدائن ({targetCode})</th>
                <th className="px-4 py-3 text-left font-mono">رصيد ختامي مدين</th>
                <th className="px-4 py-3 text-left font-mono">رصيد ختامي دائن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA] bg-white">
              {trialBalanceData.rows.map(r => (
                <tr key={r.code} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="px-4 py-2.5 font-bold font-mono text-[#8F2A87]">{r.code}</td>
                  <td className="px-4 py-2.5 font-medium text-[#25232A]">{r.name}</td>
                  <td className="px-4 py-2.5 text-center"><span className="px-2 py-0.5 rounded-md bg-[#FAFAFB] border border-[#E8E5EA] text-[10px] text-[#6F6B75]">{r.type}</span></td>
                  <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${r.nature === 'debit' ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-rose-50 text-[#D64545]'}`}>{r.nature === 'debit' ? 'مدين' : 'دائن'}</span></td>
                  <td className="px-4 py-2.5 text-left font-mono text-[#6F6B75]">{r.opening_target !== 0 ? fmtMoney(r.opening_target) : '0'}</td>
                  <td className="px-4 py-2.5 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(r.total_debit_target)}</td>
                  <td className="px-4 py-2.5 text-left font-mono font-bold text-[#D64545]">{fmtMoney(r.total_credit_target)}</td>
                  <td className="px-4 py-2.5 text-left font-mono font-bold text-[#25232A]">{fmtMoney(r.debit_balance_target)}</td>
                  <td className="px-4 py-2.5 text-left font-mono font-bold text-[#25232A]">{fmtMoney(r.credit_balance_target)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#FAFAFB] font-extrabold border-t-2 border-[#E8E5EA] text-xs">
                <td colSpan="4" className="px-4 py-3.5 text-right text-[#25232A]">المجاميع الإجمالية وتأكيد التوازن:</td>
                <td className="px-4 py-3.5 text-left font-mono text-[#6F6B75] text-sm">{fmtMoney(trialBalanceData.grandOpening)}</td>
                <td className="px-4 py-3.5 text-left font-mono text-[#007F8C] text-sm">{fmtMoney(trialBalanceData.grandDebit)}</td>
                <td className="px-4 py-3.5 text-left font-mono text-[#D64545] text-sm">{fmtMoney(trialBalanceData.grandCredit)}</td>
                <td className="px-4 py-3.5 text-left font-mono text-[#25232A] text-sm">{fmtMoney(trialBalanceData.grandDebitBal)}</td>
                <td className="px-4 py-3.5 text-left font-mono text-[#25232A] text-sm">{fmtMoney(trialBalanceData.grandCreditBal)}</td>
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
      <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${balanceSheetData.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-[#D64545]'}`}>
        <div className="flex items-center gap-2.5 font-bold text-xs">
          <span className="text-base">{balanceSheetData.isBalanced ? '✅' : '⚠️'}</span>
          <span>حالة الميزانية العمومية: {balanceSheetData.isBalanced ? 'الميزانية العمومية متزنة ومطابقة تماماً (الأصول = الخصوم + حقوق الملكية + صافي ربح الفترة)' : `يوجد فارق غير متزن (${fmtMoney(balanceSheetData.diff)} ${reportCurrency})`}</span>
        </div>
        <div className="font-mono text-xs font-bold">
          <span>الأصول: {fmtMoney(balanceSheetData.totalAssets)} {reportCurrency}</span> | <span>الخصوم والملكية: {fmtMoney(balanceSheetData.totalLiabilitiesAndEquity)} {reportCurrency}</span>
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
