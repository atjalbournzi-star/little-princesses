// src/features/reports/components/FinancialReportView.jsx

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
    <div className="space-y-6 animate-fadeIn">
      {/* شريط التبويبات الفرعية للقوائم والتقارير المالية بخط أبيض ناصع */}
      <div className="print-hidden flex items-center gap-2 overflow-x-auto bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-2xs">
        {subTabs.map(tab => {
          const isActive = financialSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFinancialSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow-xs'
                  : 'text-white font-medium hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium text-white">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── عرض قائمة الدخل والأرباح (P&L) ── */}
      {financialSubTab === 'pnl' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
              <p className="text-xs text-white font-bold mb-1">إجمالي الإيرادات والمبيعات</p>
              <h3 className="text-2xl font-bold font-mono tabular-nums text-white flex items-baseline">
                <span>{fmtMoney(pnlData.totalRevenue)}</span> <span className="text-xs font-sans text-white mr-1.5">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
              <p className="text-xs text-white font-bold mb-1">تكلفة المبيعات المباشرة (COGS)</p>
              <h3 className="text-2xl font-bold font-mono tabular-nums text-white flex items-baseline">
                <span>{fmtMoney(pnlData.totalCOGS)}</span> <span className="text-xs font-sans text-white mr-1.5">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
              <p className="text-xs text-white font-bold mb-1 flex justify-between">
                <span>مجمل الربح (Gross Profit)</span>
                <span className="text-[10px] bg-slate-800 text-white border border-slate-700 font-bold px-2 py-0.5 rounded-full font-mono">{pnlData.grossMarginPct.toFixed(1)}%</span>
              </p>
              <h3 className="text-2xl font-bold font-mono tabular-nums text-white flex items-baseline">
                <span>{fmtMoney(pnlData.grossProfit)}</span> <span className="text-xs font-sans text-white mr-1.5">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-2xs">
              <p className="text-xs text-white font-bold mb-1 flex justify-between">
                <span>صافي الربح الفعلي (Net Profit)</span>
                <span className="text-[10px] bg-slate-800 text-white border border-slate-700 font-bold px-2 py-0.5 rounded-full font-mono">{pnlData.netMarginPct.toFixed(1)}%</span>
              </p>
              <h3 className="text-2xl font-bold font-mono tabular-nums text-white flex items-baseline">
                <span>{fmtMoney(pnlData.netProfit)}</span> <span className="text-xs font-sans text-white mr-1.5">{reportCurrency}</span>
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>📑</span>
                <span>قائمة الدخل المفصلة (Statement of Profit or Loss)</span>
              </h3>
              <span className="text-xs text-white font-mono">العملة: {reportCurrency}</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-800 px-4 py-2.5 font-bold text-xs text-white border-b border-slate-700 flex justify-between">
                  <span>1. الإيرادات التشغيلية (Revenues)</span>
                  <span className="font-mono text-white">{fmtMoney(pnlData.totalRevenue)}</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {pnlData.revAccounts.map(r => (
                      <tr key={r.code} className="hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-mono text-fuchsia-300 w-20">{r.code}</td>
                        <td className="px-4 py-2.5 font-medium text-white">{r.name}</td>
                        <td className="px-4 py-2.5 text-left font-mono font-bold text-white">{fmtMoney(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-800 px-4 py-2.5 font-bold text-xs text-white border-b border-slate-700 flex justify-between">
                  <span>2. تكلفة المبيعات المباشرة (Cost of Goods Sold - COGS)</span>
                  <span className="font-mono text-white">({fmtMoney(pnlData.totalCOGS)})</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {pnlData.cogsAccounts.map(c => (
                      <tr key={c.code} className="hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-mono text-fuchsia-300 w-20">{c.code}</td>
                        <td className="px-4 py-2.5 font-medium text-white">{c.name}</td>
                        <td className="px-4 py-2.5 text-left font-mono font-bold text-white">{fmtMoney(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between font-bold text-sm text-white">
                <div className="flex items-center gap-2">
                  <span>✨ مجمل الربح التجاري (Gross Profit)</span>
                  <span className="text-xs bg-slate-900 border border-slate-700 text-white px-2.5 py-0.5 rounded-full font-mono">هامش: {pnlData.grossMarginPct.toFixed(1)}%</span>
                </div>
                <span className="font-mono text-base text-white">{fmtMoney(pnlData.grossProfit)} {reportCurrency}</span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-800 px-4 py-2.5 font-bold text-xs text-white border-b border-slate-700 flex justify-between">
                  <span>3. المصروفات التشغيلية والإدارية والعمومية (Operating Expenses - OPEX)</span>
                  <span className="font-mono text-white">({fmtMoney(pnlData.totalOPEX)})</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {pnlData.opexAccounts.map(o => (
                      <tr key={o.code} className="hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-mono text-fuchsia-300 w-20">{o.code}</td>
                        <td className="px-4 py-2.5 font-medium text-white">{o.name}</td>
                        <td className="px-4 py-2.5 text-left font-mono font-bold text-white">{fmtMoney(o.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-5 rounded-2xl border border-slate-700 bg-slate-800 flex items-center justify-between font-extrabold text-base text-white">
                <div className="flex items-center gap-3">
                  <span>💹 صافي الربح الفعلي للفترة (Net Profit / Loss)</span>
                  <span className="text-xs bg-slate-900 border border-slate-700 text-white px-3 py-1 rounded-full font-mono shadow-2xs">هامش الصافي: {pnlData.netMarginPct.toFixed(1)}%</span>
                </div>
                <span className="font-mono text-xl text-white">{fmtMoney(pnlData.netProfit)} {reportCurrency}</span>
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
