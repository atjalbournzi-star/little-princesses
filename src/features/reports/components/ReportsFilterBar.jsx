// src/features/reports/components/ReportsFilterBar.jsx

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
  const inputCls = "h-10 px-3 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-semibold placeholder:text-[#6F6B75] focus:border-[#009FAE] outline-none transition";

  return (
    <div className="print-hidden p-6 bg-[#FAFAFB] rounded-2xl border border-[#E8E5EA] space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
        <div>
          <label className="block text-[11px] font-bold text-[#6F6B75] mb-1.5">الفترة الزمنية السريعة</label>
          <select
            value={periodPreset}
            onChange={e => setPeriodPreset(e.target.value)}
            className={`w-full ${inputCls}`}
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
          <label className="block text-[11px] font-bold text-[#6F6B75] mb-1.5">من تاريخ 📅</label>
          <input
            type="date"
            lang="en-GB"
            dir="ltr"
            value={dateRange.start}
            onChange={e => { setPeriodPreset('custom'); setDateRange({ ...dateRange, start: e.target.value }); }}
            className={`w-full ${inputCls}`}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#6F6B75] mb-1.5">إلى تاريخ 📅</label>
          <input
            type="date"
            lang="en-GB"
            dir="ltr"
            value={dateRange.end}
            onChange={e => { setPeriodPreset('custom'); setDateRange({ ...dateRange, end: e.target.value }); }}
            className={`w-full ${inputCls}`}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#6F6B75] mb-1.5">عملة العرض والتقارير</label>
          <select
            value={reportCurrency}
            onChange={e => setReportCurrency(e.target.value)}
            className={`w-full ${inputCls} font-bold text-[#8F2A87]`}
          >
            {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <div className="bg-white px-3 h-10 rounded-xl border border-[#E8E5EA] flex items-center justify-between text-xs">
            <span className="text-[#6F6B75] text-[11px]">القيود والسجلات المفحوصة:</span>
            <span className="font-mono font-bold text-[#007F8C]">{testedCount}</span>
          </div>
        </div>
      </div>

      {/* فلاتر إضافية سياقية خاصة بدفتر الأستاذ والمطابقات في التقارير المالية */}
      {activeTab === 'financial' && financialSubTab === 'general_ledger' && (
        <div className="pt-3 border-t border-[#E8E5EA] flex items-center gap-3">
          <label className="text-xs font-bold text-[#6F6B75] shrink-0">اختر الحساب لدفتر الأستاذ:</label>
          <select
            value={selectedLedgerAcc}
            onChange={e => setSelectedLedgerAcc(e.target.value)}
            className={`w-full sm:w-80 ${inputCls} font-bold text-[#8F2A87]`}
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
        <div className="pt-3 border-t border-[#E8E5EA] flex flex-wrap items-center gap-3">
          <div className="flex bg-white p-1 rounded-xl border border-[#E8E5EA]">
            <button
              type="button"
              onClick={() => { setStatementType('treasury'); setSelectedPartyId(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${statementType === 'treasury' ? 'bg-[#E2F5F7] text-[#007F8C]' : 'text-[#6F6B75]'}`}
            >
              <span>🏦</span>
              <span>مطابقة الصناديق والبنوك</span>
            </button>
            <button
              type="button"
              onClick={() => { setStatementType('supplier'); setSelectedPartyId(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${statementType === 'supplier' ? 'bg-[#F2E7F3] text-[#8F2A87]' : 'text-[#6F6B75]'}`}
            >
              <span>🧵</span>
              <span>كشف حساب الموردين</span>
            </button>
            <button
              type="button"
              onClick={() => { setStatementType('customer'); setSelectedPartyId(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${statementType === 'customer' ? 'bg-pink-50 text-[#B0005A]' : 'text-[#6F6B75]'}`}
            >
              <span>👗</span>
              <span>كشف حساب العميلات</span>
            </button>
          </div>

          {statementType === 'supplier' && (
            <select
              value={selectedPartyId}
              onChange={e => setSelectedPartyId(e.target.value)}
              className={`${inputCls} text-xs font-bold w-52 text-[#8F2A87]`}
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
              className={`${inputCls} text-xs font-bold w-52 text-[#B0005A]`}
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
