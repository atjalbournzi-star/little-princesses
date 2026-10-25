// src/features/reports/components/FinancialReportView.jsx
// عرض التقارير المالية والمحاسبية وقائمة الدخل والأرباح (Financial Views)

function FinancialReportView({
  financialSubTab, setFinancialSubTab,
  pnlData, balanceSheetData, trialBalanceData,
  generalLedgerRows, cashBankReconciliation, statementData, statementType,
  reportCurrency, fmtMoney, targetCode, isTBLoading, isGLLoading,
  selectedLedgerAcc, setSelectedLedgerAcc, accounts = []
}) {
  const subTabs = [
    { id: 'pnl', label: 'قائمة الدخل والأرباح (P&L)', icon: '📑' },
    { id: 'balance_sheet', label: 'الميزانية العمومية والمركز المالي', icon: '⚖️' },
    { id: 'trial_balance', label: 'ميزان المراجعة بالمجاميع والأرصدة', icon: '📊' },
    { id: 'general_ledger', label: 'دفتر الأستاذ العام', icon: '📖' },
    { id: 'statements', label: 'كشوفات المطابقات والذمم', icon: '👥' },
  ];

  const BSView = typeof FinancialBalanceSheetView !== 'undefined' ? FinancialBalanceSheetView : (window.FinancialBalanceSheetView || null);
  const FSView = typeof FinancialStatementsView !== 'undefined' ? FinancialStatementsView : (window.FinancialStatementsView || null);

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* شريط التبويبات الفرعية للقوائم والتقارير المالية */}
      <div className="print-hidden flex items-center gap-1.5 overflow-x-auto bg-[#111C38] p-1 rounded-xl border border-slate-800 shadow-2xs select-none">
        {subTabs.map(tab => {
          const isActive = financialSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFinancialSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] transition-all duration-200 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-pink-600 text-white font-bold shadow-xs'
                  : 'text-slate-300 font-medium hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── عرض قائمة الدخل والأرباح (P&L) ── */}
      {financialSubTab === 'pnl' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
              <p className="text-[10.5px] text-slate-300 font-medium mb-1">إجمالي الإيرادات والمبيعات</p>
              <h3 className="text-base sm:text-lg font-bold font-mono tabular-nums text-white flex items-baseline">
                <span>{fmtMoney(pnlData.totalRevenue)}</span> <span className="text-[10px] font-sans text-slate-400 mr-1">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
              <p className="text-[10.5px] text-slate-300 font-medium mb-1">تكلفة المبيعات المباشرة (COGS)</p>
              <h3 className="text-base sm:text-lg font-bold font-mono tabular-nums text-white flex items-baseline">
                <span>{fmtMoney(pnlData.totalCOGS)}</span> <span className="text-[10px] font-sans text-slate-400 mr-1">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
              <p className="text-[10.5px] text-slate-300 font-medium mb-1 flex justify-between">
                <span>مجمل الربح (Gross Profit)</span>
                <span className="text-[9.5px] bg-pink-950/60 text-pink-300 border border-pink-700/60 font-semibold px-1.5 py-0.2 rounded-full font-mono">{pnlData.grossMarginPct.toFixed(1)}%</span>
              </p>
              <h3 className="text-base sm:text-lg font-bold font-mono tabular-nums text-white flex items-baseline">
                <span>{fmtMoney(pnlData.grossProfit)}</span> <span className="text-[10px] font-sans text-slate-400 mr-1">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-[#111C38] p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:shadow-md transition-all duration-200 group">
              <p className="text-[10.5px] text-slate-300 font-medium mb-1 flex justify-between">
                <span>صافي الربح الفعلي (Net Profit)</span>
                <span className="text-[9.5px] bg-emerald-950/60 text-emerald-300 border border-emerald-800 font-semibold px-1.5 py-0.2 rounded-full font-mono">{pnlData.netMarginPct.toFixed(1)}%</span>
              </p>
              <h3 className="text-base sm:text-lg font-bold font-mono tabular-nums text-white flex items-baseline">
                <span>{fmtMoney(pnlData.netProfit)}</span> <span className="text-[10px] font-sans text-slate-400 mr-1">{reportCurrency}</span>
              </h3>
            </div>
          </div>

          <div className="bg-[#111C38] rounded-xl border border-slate-800 shadow-xs overflow-hidden">
            <div className="px-3.5 py-2 border-b border-slate-800 bg-[#0F172A] text-white flex items-center justify-between">
              <h3 className="font-bold text-xs sm:text-[13px] text-white flex items-center gap-2">
                <span>📑</span>
                <span>قائمة الدخل المفصلة (Statement of Profit or Loss)</span>
              </h3>
              <span className="text-[10.5px] text-slate-400 font-mono">العملة: {reportCurrency}</span>
            </div>

            <div className="p-3 space-y-2.5">
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-900/90 px-3 py-1.5 font-semibold text-xs text-white border-b border-slate-800 flex justify-between">
                  <span>1. الإيرادات التشغيلية (Revenues)</span>
                  <span className="font-mono text-white">{fmtMoney(pnlData.totalRevenue)}</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-800/60 bg-[#111C38]/90">
                    {pnlData.revAccounts.map(r => (
                      <tr key={r.code} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-1.5 font-mono text-pink-300 w-20">{r.code}</td>
                        <td className="px-3 py-1.5 font-medium text-white">{r.name}</td>
                        <td className="px-3 py-1.5 text-left font-mono font-bold text-white">{fmtMoney(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-900/90 px-3 py-1.5 font-semibold text-xs text-white border-b border-slate-800 flex justify-between">
                  <span>2. تكلفة المبيعات المباشرة (Cost of Goods Sold - COGS)</span>
                  <span className="font-mono text-white">({fmtMoney(pnlData.totalCOGS)})</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-800/60 bg-[#111C38]/90">
                    {pnlData.cogsAccounts.map(c => (
                      <tr key={c.code} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-1.5 font-mono text-pink-300 w-20">{c.code}</td>
                        <td className="px-3 py-1.5 font-medium text-white">{c.name}</td>
                        <td className="px-3 py-1.5 text-left font-mono font-bold text-white">{fmtMoney(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-700/80 flex items-center justify-between font-bold text-xs text-white">
                <div className="flex items-center gap-2">
                  <span>✨ مجمل الربح التجاري (Gross Profit)</span>
                  <span className="text-[10px] bg-pink-950/60 border border-pink-700/60 text-pink-300 px-2 py-0.5 rounded-full font-mono">هامش: {pnlData.grossMarginPct.toFixed(1)}%</span>
                </div>
                <span className="font-mono text-xs sm:text-sm text-white">{fmtMoney(pnlData.grossProfit)} {reportCurrency}</span>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-900/90 px-3 py-1.5 font-semibold text-xs text-white border-b border-slate-800 flex justify-between">
                  <span>3. المصروفات التشغيلية والإدارية والعمومية (Operating Expenses - OPEX)</span>
                  <span className="font-mono text-white">({fmtMoney(pnlData.totalOPEX)})</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-800/60 bg-[#111C38]/90">
                    {pnlData.opexAccounts.map(o => (
                      <tr key={o.code} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-1.5 font-mono text-pink-300 w-20">{o.code}</td>
                        <td className="px-3 py-1.5 font-medium text-white">{o.name}</td>
                        <td className="px-3 py-1.5 text-left font-mono font-bold text-white">{fmtMoney(o.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-xl border border-pink-700/50 bg-[#0F172A] flex items-center justify-between font-bold text-xs sm:text-sm text-white">
                <div className="flex items-center gap-2">
                  <span>💹 صافي الربح الفعلي للفترة (Net Profit / Loss)</span>
                  <span className="text-[10px] bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-mono">هامش الصافي: {pnlData.netMarginPct.toFixed(1)}%</span>
                </div>
                <span className="font-mono text-sm sm:text-base text-emerald-400">{fmtMoney(pnlData.netProfit)} {reportCurrency}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* عروض الميزانية العمومية وميزان المراجعة */}
      {(financialSubTab === 'balance_sheet' || financialSubTab === 'trial_balance') && BSView && (
        <BSView
          subTab={financialSubTab}
          balanceSheetData={balanceSheetData}
          trialBalanceData={trialBalanceData}
          reportCurrency={reportCurrency}
          fmtMoney={fmtMoney}
          targetCode={targetCode}
          isTBLoading={isTBLoading}
        />
      )}

      {/* عروض دفتر الأستاذ والمطابقات */}
      {(financialSubTab === 'general_ledger' || financialSubTab === 'statements') && FSView && (
        <FSView
          subTab={financialSubTab}
          generalLedgerRows={generalLedgerRows}
          cashBankReconciliation={cashBankReconciliation}
          statementData={statementData}
          statementType={statementType}
          targetCode={targetCode}
          reportCurrency={reportCurrency}
          fmtMoney={fmtMoney}
          isGLLoading={isGLLoading}
          selectedLedgerAcc={selectedLedgerAcc}
          setSelectedLedgerAcc={setSelectedLedgerAcc}
          accounts={accounts}
        />
      )}
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.FinancialReportView = FinancialReportView;
}
