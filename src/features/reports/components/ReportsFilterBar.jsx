// src/features/reports/components/ReportsFilterBar.jsx
// شريط الفلاتر والتحويل الزمني والعملات المدمج (Compact Reports Filter Bar)
// الهوية البصرية المطابقة لشاشة السندات والمعاملات المالية | Standard Compliant (< 220 lines)

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
  const selectCls = "h-6 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer transition hover:border-slate-300 dark:hover:border-slate-700";

  return (
    <div className="print-hidden p-1.5 bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 select-none text-slate-800 dark:text-white" dir="rtl">
      {/* 1. الشريط الأفقي المدمج للفلاتر الزمنية والعملة في سطر واحد */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap flex-1 min-w-0">
          <select
            value={periodPreset}
            onChange={e => setPeriodPreset(e.target.value)}
            className={selectCls}
            title="الفترة الزمنية السريعة"
          >
            <option value="this_month">الشهر الحالي (افتراضي)</option>
            <option value="today">اليوم فقط</option>
            <option value="this_quarter">الربع المالي الحالي</option>
            <option value="this_year">السنة المالية الحالية</option>
            <option value="all">كافة الفترات (شامل)</option>
            <option value="custom">فترة مخصصة</option>
          </select>

          {/* حقول التاريخ المدمجة بدون تسميات علوية */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-md px-1.5 h-6">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">من:</span>
              <input
                type="date"
                lang="en-GB"
                dir="ltr"
                value={dateRange.start}
                onChange={e => { setPeriodPreset('custom'); setDateRange({ ...dateRange, start: e.target.value }); }}
                className="bg-transparent text-[11px] font-mono text-slate-900 dark:text-white outline-none cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-md px-1.5 h-6">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">إلى:</span>
              <input
                type="date"
                lang="en-GB"
                dir="ltr"
                value={dateRange.end}
                onChange={e => { setPeriodPreset('custom'); setDateRange({ ...dateRange, end: e.target.value }); }}
                className="bg-transparent text-[11px] font-mono text-slate-900 dark:text-white outline-none cursor-pointer"
              />
            </div>
          </div>

          <select
            value={reportCurrency}
            onChange={e => setReportCurrency(e.target.value)}
            className={`${selectCls} font-bold`}
            title="عملة العرض والتقارير"
          >
            {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <span className="text-[9.5px] bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800/50 font-mono shrink-0">
          {testedCount} سجل
        </span>
      </div>

      {/* 2. فلاتر سياقية إضافية مدمجة للأستاذ العام والمطابقات */}
      {activeTab === 'financial' && financialSubTab === 'general_ledger' && (
        <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-[11px]">
          <span className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 shrink-0">اختر الحساب لدفتر الأستاذ:</span>
          <select
            value={selectedLedgerAcc}
            onChange={e => setSelectedLedgerAcc(e.target.value)}
            className={`${selectCls} font-medium flex-1 sm:max-w-xs`}
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
        <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-[11px]">
          <div className="flex bg-slate-100 dark:bg-[#0F172A] p-0.5 rounded-md border border-slate-200 dark:border-slate-800 gap-0.5">
            <button
              type="button"
              onClick={() => { setStatementType('treasury'); setSelectedPartyId(''); }}
              className={`h-5 px-2 rounded text-[10px] font-medium transition cursor-pointer flex items-center gap-1 ${statementType === 'treasury' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <span>مطابقة الصناديق والبنوك</span>
            </button>
            <button
              type="button"
              onClick={() => { setStatementType('supplier'); setSelectedPartyId(''); }}
              className={`h-5 px-2 rounded text-[10px] font-medium transition cursor-pointer flex items-center gap-1 ${statementType === 'supplier' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <span>كشف حساب الموردين</span>
            </button>
            <button
              type="button"
              onClick={() => { setStatementType('customer'); setSelectedPartyId(''); }}
              className={`h-5 px-2 rounded text-[10px] font-medium transition cursor-pointer flex items-center gap-1 ${statementType === 'customer' ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <span>كشف حساب العملاء</span>
            </button>
          </div>

          {statementType === 'supplier' && (
            <select
              value={selectedPartyId}
              onChange={e => setSelectedPartyId(e.target.value)}
              className={`${selectCls} text-[11px] font-medium flex-1 sm:max-w-xs`}
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
              className={`${selectCls} text-[11px] font-medium flex-1 sm:max-w-xs`}
            >
              <option value="">كافة العملاء (عرض شامل)</option>
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
