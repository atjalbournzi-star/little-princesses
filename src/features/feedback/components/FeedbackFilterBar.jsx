// src/features/feedback/components/FeedbackFilterBar.jsx
// شريط التبويبات التشغيلية الأربعة الرئيسية وفلاتر البحث

function FeedbackFilterBar({
  activeTab = 'qc_station',
  setActiveTab,
  search = '',
  setSearch,
  filterStatus = 'all',
  setFilterStatus
}) {
  const tabs = [
    { id: 'qc_station', icon: '👑', label: 'محطة الفحص الفني' },
    { id: 'inspections', icon: '🔍', label: 'سجل عمليات الفحص والعيوب' },
    { id: 'team', icon: '👥', label: 'أداء الكادر ومراحل الورشة' },
    { id: 'materials', icon: '🧵', label: 'جودة الخامات والموردين' }
  ];

  return (
    <div className="space-y-2.5">
      {/* التبويبات الأربعة الرئيسية بكامل العرض بدون أي قص أو تزاحم */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 border-b border-slate-700/80 pb-2.5">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 text-center whitespace-nowrap shadow-xs ${
              activeTab === t.id 
                ? 'bg-pink-600 text-white ring-2 ring-pink-500/40 shadow-pink-600/20' 
                : 'bg-[#111C38] text-slate-300 hover:bg-[#1E293B] hover:text-white border border-slate-700/80'
            }`}
          >
            <span className="text-sm shrink-0 leading-none">{t.icon}</span>
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* شريط البحث الموحد للجداول النشطة الأخرى (مستثنى من محطة الفحص لوجود شريطه المدمج الخاص) */}
      {setSearch && activeTab !== 'qc_station' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111C38] p-3 rounded-xl border border-slate-700/80 shadow-md">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-8.5 pr-8 pl-3 rounded-lg border border-slate-700/80 bg-[#0B132B] text-white text-xs focus:border-pink-500 outline-none transition"
            />
            <span className="absolute right-2.5 top-2 text-slate-400 text-xs">🔍</span>
          </div>

          {setFilterStatus && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-slate-400 font-medium">الحالة:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="h-8.5 px-2.5 rounded-lg border border-slate-700/80 bg-[#0B132B] text-xs text-slate-200 outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط / معتمد</option>
                <option value="pending">قيد المعالجة</option>
                <option value="closed">مغلق / مكتمل</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

window.FeedbackFilterBar = FeedbackFilterBar;
