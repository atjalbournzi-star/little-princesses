// src/features/journal/components/JournalHeader.jsx
// Page header, KPI stats bar, and sub-tab navigation for the Journal feature

function JournalHeader({ journal, trialBalance, activeSubTab, setActiveSubTab }) {
  const tabs = [
    { id: 'entries',       icon: '📑', label: `القيود اليومية (${(journal || []).length})` },
    { id: 'ledger',        icon: '📖', label: 'دفتر الأستاذ العام' },
    { id: 'trial_balance', icon: '⚖️', label: 'ميزان المراجعة' }
  ];

  const tb = trialBalance || { grand_total_debit: 0, grand_total_credit: 0, is_balanced: true, diff: 0 };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* ── رأس الصفحة ── */}
      <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xl font-bold shadow-xs">
            📑
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-[#25232A]">
              نظام المحاسبة والقيود اليومية ودفتر الأستاذ (General Ledger & Double-Entry)
            </h1>
            <p className="text-xs text-[#6F6B75] mt-0.5">
              إدارة القيود المحاسبية المزدوجة المتوازنة بالريال اليمني والعملات الأجنبية
            </p>
          </div>
        </div>

        {/* تبويبات التنقل */}
        <div className="flex bg-[#FAFAFB] p-1 rounded-xl border border-[#E8E5EA] gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === t.id
                  ? 'bg-white text-[#8F2A87] shadow-xs border border-[#E8E5EA]'
                  : 'text-[#6F6B75] hover:text-[#25232A]'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── شريط المؤشرات السريعة (KPIs) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي القيود المرحلة</span>
          <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1 block">
            {(journal || []).length} <span className="text-xs font-medium text-[#6F6B75]">قيد</span>
          </span>
        </div>
        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي مدين ميزان المراجعة</span>
          <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
            {tb.grand_total_debit.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">YER ﷼</span>
          </span>
        </div>
        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي دائن ميزان المراجعة</span>
          <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
            {tb.grand_total_credit.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">YER ﷼</span>
          </span>
        </div>
        <div className="p-4 text-center">
          <span className="text-xs font-semibold text-[#6F6B75] block">حالة توازن النظام المحاسبي</span>
          <span className={`text-sm font-bold mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${
            tb.is_balanced ? 'bg-emerald-50 text-[#137333] border border-emerald-200' : 'bg-rose-50 text-[#D64545] border border-rose-200'
          }`}>
            {tb.is_balanced ? '✓ متوازن تماماً (0.00 فرق)' : `⚠️ غير متوازن (فرق: ${tb.diff})`}
          </span>
        </div>
      </div>
    </div>
  );
}

window.JournalHeader = JournalHeader;
