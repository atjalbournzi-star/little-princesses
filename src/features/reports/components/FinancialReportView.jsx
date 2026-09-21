// src/features/reports/components/FinancialReportView.jsx

function FinancialReportView({
  financialSubTab, setFinancialSubTab,
  pnlData, balanceSheetData, trialBalanceData,
  generalLedgerRows, cashBankReconciliation, statementData, statementType,
  reportCurrency, fmtMoney, targetCode
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
      {/* شريط التبويبات الفرعية للقوائم والتقارير المالية */}
      <div className="print-hidden flex items-center gap-2 overflow-x-auto bg-white p-2 rounded-2xl border border-[#E8E5EA] shadow-2xs">
        {subTabs.map(tab => {
          const isActive = financialSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFinancialSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#E2F5F7] text-[#007F8C] shadow-xs'
                  : 'text-[#6F6B75] hover:text-[#25232A] hover:bg-[#FAFAFB]'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── عرض قائمة الدخل والأرباح (P&L) ── */}
      {financialSubTab === 'pnl' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
              <p className="text-xs text-[#6F6B75] font-semibold mb-1">إجمالي الإيرادات والمبيعات</p>
              <h3 className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] flex items-baseline">
                <span>{fmtMoney(pnlData.totalRevenue)}</span> <span className="text-xs font-medium text-[#6F6B75] mr-1.5 font-sans">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
              <p className="text-xs text-[#6F6B75] font-semibold mb-1">تكلفة المبيعات المباشرة (COGS)</p>
              <h3 className="text-xl font-extrabold font-mono tabular-nums text-[#C97300] flex items-baseline">
                <span>{fmtMoney(pnlData.totalCOGS)}</span> <span className="text-xs font-medium text-[#6F6B75] mr-1.5 font-sans">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs">
              <p className="text-xs text-[#6F6B75] font-semibold mb-1 flex justify-between">
                <span>مجمل الربح (Gross Profit)</span>
                <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] font-bold px-2 py-0.5 rounded-full font-mono">{pnlData.grossMarginPct.toFixed(1)}%</span>
              </p>
              <h3 className="text-xl font-extrabold font-mono tabular-nums text-[#8F2A87] flex items-baseline">
                <span>{fmtMoney(pnlData.grossProfit)}</span> <span className="text-xs font-medium text-[#6F6B75] mr-1.5 font-sans">{reportCurrency}</span>
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-2xs bg-[#FAFAFB]">
              <p className="text-xs font-bold mb-1 flex justify-between">
                <span className="text-[#25232A]">صافي الربح الفعلي (Net Profit)</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${pnlData.netProfit >= 0 ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-rose-100 text-[#D64545]'}`}>{pnlData.netMarginPct.toFixed(1)}%</span>
              </p>
              <h3 className={`text-xl font-extrabold font-mono tabular-nums flex items-baseline ${pnlData.netProfit >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}`}>
                <span>{fmtMoney(pnlData.netProfit)}</span> <span className="text-xs font-medium text-[#6F6B75] mr-1.5 font-sans">{reportCurrency}</span>
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8E5EA] bg-[#FAFAFB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#25232A] flex items-center gap-2">
                <span>📑</span>
                <span>قائمة الدخل المفصلة (Statement of Profit or Loss)</span>
              </h3>
              <span className="text-xs text-[#6F6B75] font-mono">العملة: {reportCurrency}</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
                <div className="bg-[#FAFAFB] px-4 py-2.5 font-bold text-xs text-[#007F8C] border-b border-[#E8E5EA] flex justify-between">
                  <span>1. الإيرادات التشغيلية (Revenues)</span>
                  <span className="font-mono">{fmtMoney(pnlData.totalRevenue)}</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-[#E8E5EA]">
                    {pnlData.revAccounts.map(r => (
                      <tr key={r.code} className="hover:bg-[#FAFAFB]">
                        <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{r.code}</td>
                        <td className="px-4 py-2.5 font-medium text-[#25232A]">{r.name}</td>
                        <td className="px-4 py-2.5 text-left font-mono font-bold text-[#007F8C]">{fmtMoney(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
                <div className="bg-[#FAFAFB] px-4 py-2.5 font-bold text-xs text-[#C97300] border-b border-[#E8E5EA] flex justify-between">
                  <span>2. تكلفة المبيعات المباشرة (Cost of Goods Sold - COGS)</span>
                  <span className="font-mono">({fmtMoney(pnlData.totalCOGS)})</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-[#E8E5EA]">
                    {pnlData.cogsAccounts.map(c => (
                      <tr key={c.code} className="hover:bg-[#FAFAFB]">
                        <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{c.code}</td>
                        <td className="px-4 py-2.5 font-medium text-[#25232A]">{c.name}</td>
                        <td className="px-4 py-2.5 text-left font-mono font-bold text-[#C97300]">{fmtMoney(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-[#E2F5F7] p-4 rounded-xl border border-[#C5ECF0] flex items-center justify-between font-bold text-sm text-[#007F8C]">
                <div className="flex items-center gap-2">
                  <span>✨ مجمل الربح التجاري (Gross Profit)</span>
                  <span className="text-xs bg-white px-2.5 py-0.5 rounded-full font-mono">هامش: {pnlData.grossMarginPct.toFixed(1)}%</span>
                </div>
                <span className="font-mono text-base">{fmtMoney(pnlData.grossProfit)} {reportCurrency}</span>
              </div>

              <div className="border border-[#E8E5EA] rounded-xl overflow-hidden">
                <div className="bg-[#FAFAFB] px-4 py-2.5 font-bold text-xs text-[#D64545] border-b border-[#E8E5EA] flex justify-between">
                  <span>3. المصروفات التشغيلية والإدارية والعمومية (Operating Expenses - OPEX)</span>
                  <span className="font-mono">({fmtMoney(pnlData.totalOPEX)})</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-[#E8E5EA]">
                    {pnlData.opexAccounts.map(o => (
                      <tr key={o.code} className="hover:bg-[#FAFAFB]">
                        <td className="px-4 py-2.5 font-mono text-[#8F2A87] w-20">{o.code}</td>
                        <td className="px-4 py-2.5 font-medium text-[#25232A]">{o.name}</td>
                        <td className="px-4 py-2.5 text-left font-mono font-bold text-[#D64545]">{fmtMoney(o.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`p-5 rounded-2xl border flex items-center justify-between font-extrabold text-base ${pnlData.netProfit >= 0 ? 'bg-[#E2F5F7] border-[#C5ECF0] text-[#007F8C]' : 'bg-rose-50 border-rose-200 text-[#D64545]'}`}>
                <div className="flex items-center gap-3">
                  <span>💹 صافي الربح الفعلي للفترة (Net Profit / Loss)</span>
                  <span className="text-xs bg-white px-3 py-1 rounded-full font-mono shadow-2xs">هامش الصافي: {pnlData.netMarginPct.toFixed(1)}%</span>
                </div>
                <span className="font-mono text-xl">{fmtMoney(pnlData.netProfit)} {reportCurrency}</span>
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
        />
      )}
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.FinancialReportView = FinancialReportView;
}
