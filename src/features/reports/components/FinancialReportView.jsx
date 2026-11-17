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
    { id: 'pnl', label: 'قائمة الدخل والأرباح (P&L)' },
    { id: 'balance_sheet', label: 'الميزانية العمومية والمركز المالي' },
    { id: 'trial_balance', label: 'ميزان المراجعة بالمجاميع والأرصدة' },
    { id: 'general_ledger', label: 'دفتر الأستاذ العام' },
    { id: 'statements', label: 'كشوفات المطابقات والذمم' },
  ];

  const BSView = typeof FinancialBalanceSheetView !== 'undefined' ? FinancialBalanceSheetView : (window.FinancialBalanceSheetView || null);
  const FSView = typeof FinancialStatementsView !== 'undefined' ? FinancialStatementsView : (window.FinancialStatementsView || null);

  return (
    <div className="space-y-1.5 animate-fadeIn">
      {/* شريط التبويبات الفرعية للقوائم والتقارير المالية */}
      <div className="print-hidden flex items-center gap-1 overflow-x-auto bg-white dark:bg-[#111C38] px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs select-none shrink-0 h-8">
        {subTabs.map(tab => {
          const isActive = financialSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFinancialSubTab(tab.id)}
              className={`h-6 px-2.5 rounded-md text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-pink-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── عرض قائمة الدخل والأرباح (P&L) ── */}
      {financialSubTab === 'pnl' && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 my-0.5 shrink-0 select-none">
            <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي الإيرادات</span>
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                {fmtMoney(pnlData.totalRevenue)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
              </span>
            </div>

            <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">تكلفة المبيعات (COGS)</span>
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                {fmtMoney(pnlData.totalCOGS)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
              </span>
            </div>

            <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">مجمل الربح</span>
                <span className="text-[9.5px] bg-pink-500/10 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300 border border-pink-200 dark:border-pink-800 px-1 py-0.2 rounded font-mono font-bold">{pnlData.grossMarginPct.toFixed(1)}%</span>
              </div>
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight tabular-nums">
                {fmtMoney(pnlData.grossProfit)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
              </span>
            </div>

            <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">صافي الربح</span>
                <span className="text-[9.5px] bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1 py-0.2 rounded font-mono font-bold">{pnlData.netMarginPct.toFixed(1)}%</span>
              </div>
              <span className={`text-[11px] font-bold font-mono tracking-tight tabular-nums ${pnlData.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {fmtMoney(pnlData.netProfit)} <span className="text-[10px] text-slate-400 font-sans">{reportCurrency}</span>
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 shadow-xs overflow-hidden">
            <div className="h-7.5 px-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] flex items-center justify-between">
              <h3 className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span>قائمة الدخل المفصلة (Statement of Profit or Loss)</span>
              </h3>
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">العملة: {reportCurrency}</span>
            </div>

            <div className="p-2 space-y-2">
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 font-bold text-[11px] text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                  <span>1. الإيرادات التشغيلية (Revenues)</span>
                  <span className="font-mono text-slate-900 dark:text-white tabular-nums">{fmtMoney(pnlData.totalRevenue)}</span>
                </div>
                <table className="w-full text-[11px]">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-[#111C38]/90">
                    {pnlData.revAccounts.map(r => (
                      <tr key={r.code} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-1 font-mono text-pink-600 dark:text-pink-300 w-24 text-[11px]">{r.code}</td>
                        <td className="px-3 py-1 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                        <td className="px-3 py-1 text-left font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">{fmtMoney(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 font-bold text-[11px] text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                  <span>2. تكلفة المبيعات المباشرة (Cost of Goods Sold - COGS)</span>
                  <span className="font-mono text-slate-900 dark:text-white tabular-nums">({fmtMoney(pnlData.totalCOGS)})</span>
                </div>
                <table className="w-full text-[11px]">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-[#111C38]/90">
                    {pnlData.cogsAccounts.map(c => (
                      <tr key={c.code} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-1 font-mono text-pink-600 dark:text-pink-300 w-24 text-[11px]">{c.code}</td>
                        <td className="px-3 py-1 font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                        <td className="px-3 py-1 text-left font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">{fmtMoney(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 flex items-center justify-between font-bold text-[11px] text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <span>مجمل الربح التجاري (Gross Profit)</span>
                  <span className="text-[10px] bg-pink-500/10 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-700/60 text-pink-600 dark:text-pink-300 px-2 py-0.2 rounded font-mono font-bold">هامش: {pnlData.grossMarginPct.toFixed(1)}%</span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums">{fmtMoney(pnlData.grossProfit)} {reportCurrency}</span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 font-bold text-[11px] text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 flex justify-between">
                  <span>3. المصروفات التشغيلية والإدارية والعمومية (Operating Expenses - OPEX)</span>
                  <span className="font-mono text-slate-900 dark:text-white tabular-nums">({fmtMoney(pnlData.totalOPEX)})</span>
                </div>
                <table className="w-full text-[11px]">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-[#111C38]/90">
                    {pnlData.opexAccounts.map(o => (
                      <tr key={o.code} className="h-7.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-1 font-mono text-pink-600 dark:text-pink-300 w-24 text-[11px]">{o.code}</td>
                        <td className="px-3 py-1 font-medium text-slate-800 dark:text-slate-200">{o.name}</td>
                        <td className="px-3 py-1 text-left font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">{fmtMoney(o.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-3 py-2 rounded-lg border border-pink-200 dark:border-pink-700/50 bg-pink-50/40 dark:bg-[#0F172A] flex items-center justify-between font-bold text-xs text-slate-800 dark:text-white">
                <div className="flex items-center gap-2">
                  <span>صافي الربح الفعلي للفترة (Net Profit / Loss)</span>
                  <span className="text-[10px] bg-emerald-500/10 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 px-2 py-0.2 rounded font-mono font-bold">هامش الصافي: {pnlData.netMarginPct.toFixed(1)}%</span>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtMoney(pnlData.netProfit)} {reportCurrency}</span>
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
