// src/features/reports/components/ReportsFilterBar.jsx
// شريط الفلاتر والتحويل الزمني والعملات (Compact Reports Filter Bar)

function ReportsFilterBar({
  periodPreset, setPeriodPreset,
  dateRange, setDateRange,
  reportCurrency, setReportCurrency,
  testedCount = 0,
  activeTab,
  financialSubTab,
  selectedLedgerAcc, setSelectedLedgerAcc,
  accounts = [],
  statementType, setStatementType,
  selectedPartyId, setSelectedPartyId,
  purchases = [], customers = []
}) {
  const inputCls = "h-7.5 px-2.5 rounded-lg border border-slate-700/80 bg-slate-900 text-white text-xs font-medium placeholder:text-slate-500 focus:border-pink-500 outline-none transition";

  return (
    <div className="print-hidden p-2.5 bg-[#111C38] rounded-xl border border-slate-800 space-y-2 text-white select-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
        <div>
          <label className="block text-[10.5px] font-medium text-slate-300 mb-1">الفترة الزمنية السريعة</label>
          <select
            value={periodPreset}
            onChange={e => setPeriodPreset(e.target.value)}
            className={`w-full ${inputCls} cursor-pointer`}
          >
            <option value="this_month">الشهر الحالي (افتراضي)</option>
            <option value="today">اليوم فقط</option>
            <option value="this_quarter">الربع المالي الحالي</option>
            <option value="this_year">السنة المالية الحالية</option>
            <option value="all">كافة الفترات (شامل)</option>
            <option value="custom">فترة مخصصة 🗓️</option>
          </select>
        </div>

        <div>
          <label className="block text-[10.5px] font-medium text-slate-300 mb-1">من تاريخ 📅</label>
          <input
            type="date"
            lang="en-GB"
            dir="ltr"
            value={dateRange.start}
            onChange={e => { setPeriodPreset('custom'); setDateRange({ ...dateRange, start: e.target.value }); }}
            className={`w-full ${inputCls} font-mono`}
          />
        </div>

        <div>
          <label className="block text-[10.5px] font-medium text-slate-300 mb-1">إلى تاريخ 📅</label>
          <input
            type="date"
            lang="en-GB"
            dir="ltr"
            value={dateRange.end}
            onChange={e => { setPeriodPreset('custom'); setDateRange({ ...dateRange, end: e.target.value }); }}
            className={`w-full ${inputCls} font-mono`}
          />
        </div>

        <div>
          <label className="block text-[10.5px] font-medium text-slate-300 mb-1">عملة العرض والتقارير</label>
          <select
            value={reportCurrency}
            onChange={e => setReportCurrency(e.target.value)}
            className={`w-full ${inputCls} font-bold text-white cursor-pointer`}
          >
            {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* فلاتر إضافية سياقية خاصة بدفتر الأستاذ والمطابقات في التقارير المالية */}
      {activeTab === 'financial' && financialSubTab === 'general_ledger' && (
        <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
          <label className="text-[10.5px] font-medium text-slate-300 shrink-0">اختر الحساب لدفتر الأستاذ:</label>
          <select
            value={selectedLedgerAcc}
            onChange={e => setSelectedLedgerAcc(e.target.value)}
            className={`w-full sm:w-72 ${inputCls} font-bold text-white cursor-pointer`}
          >
            {(accounts || []).filter(a => !a.is_group).map(a => {
              const accId = a.id || a.code;
              const code = a.code || a.account_code || a.id;
              const name = a.account_name || a.name_ar || a.name || code;
              return <option key={accId} value={accId}>{code} - {name}</option>;
            })}
          </select>
        </div>
      )}

      {activeTab === 'financial' && financialSubTab === 'statements' && (
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-900/90 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => { setStatementType('treasury'); setSelectedPartyId(''); }}
              className={`px-2.5 py-1 rounded-md text-[10.5px] font-medium transition cursor-pointer flex items-center gap-1 ${statementType === 'treasury' ? 'bg-pink-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'}`}
            >
              <span>🏦</span>
              <span>مطابقة الصناديق والبنوك</span>
            </button>
            <button
              type="button"
              onClick={() => { setStatementType('supplier'); setSelectedPartyId(''); }}
              className={`px-2.5 py-1 rounded-md text-[10.5px] font-medium transition cursor-pointer flex items-center gap-1 ${statementType === 'supplier' ? 'bg-pink-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'}`}
            >
              <span>🧵</span>
              <span>كشف حساب الموردين</span>
            </button>
            <button
              type="button"
              onClick={() => { setStatementType('customer'); setSelectedPartyId(''); }}
              className={`px-2.5 py-1 rounded-md text-[10.5px] font-medium transition cursor-pointer flex items-center gap-1 ${statementType === 'customer' ? 'bg-pink-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'}`}
            >
              <span>👗</span>
              <span>كشف حساب العميلات</span>
            </button>
          </div>

          {statementType === 'supplier' && (
            <select
              value={selectedPartyId}
              onChange={e => setSelectedPartyId(e.target.value)}
              className={`${inputCls} text-xs font-bold w-48 text-white cursor-pointer`}
            >
              <option value="">كافة الموردين (عرض شامل)</option>
              {[...new Set((purchases || []).map(p => p.supplier || p.supplier_name || p.vendor_name).filter(Boolean))].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          )}

          {statementType === 'customer' && (
            <select
              value={selectedPartyId}
              onChange={e => setSelectedPartyId(e.target.value)}
              className={`${inputCls} text-xs font-bold w-48 text-white cursor-pointer`}
            >
              <option value="">كافة العميلات (عرض شامل)</option>
              {(customers || []).map(c => (
                <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.ReportsFilterBar = ReportsFilterBar;
}
