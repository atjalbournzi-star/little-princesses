// src/features/feedback/components/FeedbackFilterBar.jsx
// شريط التبويبات التشغيلية الأربعة الرئيسية وفلاتر البحث المتوافقة مع هوية السندات المالية

function FeedbackFilterBar({
  activeTab = 'qc_station',
  setActiveTab,
  search = '',
  setSearch,
  filterStatus = 'all',
  setFilterStatus
}) {
  const tabs = [
    {
      id: 'qc_station',
      label: 'محطة الفحص الفني',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      id: 'inspections',
      label: 'سجل عمليات الفحص والعيوب',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      id: 'team',
      label: 'أداء الكادر ومراحل الورشة',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'materials',
      label: 'جودة الخامات والموردين',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-1.5 select-none" dir="rtl">
      {/* التبويبات الأربعة الرئيسية بارتفاع مدمج وتصميم مطابق للسندات المالية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`h-7.5 px-2.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer ${
              activeTab === t.id
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#111C38] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* شريط البحث الموحد للجداول النشطة الأخرى عند الانتقال من محطة الفحص */}
      {setSearch && activeTab !== 'qc_station' && (
        <div className="h-8 px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 shadow-xs">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="البحث في السجلات..."
              className="w-full h-6 pr-7 pl-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-slate-900 dark:text-white text-[11px] focus:border-pink-500 outline-none transition"
            />
            <svg className="w-3 h-3 text-slate-400 absolute right-2 top-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {setFilterStatus && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10.5px] text-slate-600 dark:text-slate-400 font-medium">الحالة:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="h-6 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-[10.5px] text-slate-800 dark:text-slate-200 outline-none"
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
