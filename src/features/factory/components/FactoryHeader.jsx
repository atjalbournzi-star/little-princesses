function FactoryHeader({
  factory = [],
  stages = [],
  activeMainTab = 'pipeline',
  setActiveMainTab,
  alterationsList = [],
  fetchAlterations,
  onOpenScanModal,
  onToggleOrderForm,
  onOpenNewOrder,
  showOrderForm
}) {
  const activeAlterations = (alterationsList || []).filter(a => a.status !== 'completed').length;

  const activeFactory = (factory || []).filter(f => {
    if (!f) return false;
    const st = String(f.status || f.production_status || '').toLowerCase();
    const sg = String(f.stage || '');
    return st !== 'delivered' && !sg.includes('تم التسليم');
  });

  const countCutter = activeFactory.filter(f => (f.stage || '').includes('قص')).length;
  const countTailor = activeFactory.filter(f => (f.stage || '').includes('خياطة')).length;
  const countEmbroidery = activeFactory.filter(f => (f.stage || '').includes('تطريز') || (f.stage || '').includes('شك')).length;
  const countFinisher = activeFactory.filter(f => (f.stage || '').includes('فحص') || (f.stage || '').includes('تشطيب')).length;
  const countReady = activeFactory.filter(f => ((f.stage || '').includes('جاهز') || (f.stage || '').includes('تسليم') || Number(f.progress) >= 100)).length;

  return (
    <div className="shrink-0 space-y-1 select-none text-right" dir="rtl">
      {/* 1. ترويسة مدمجة ورشيقة في سطر واحد مع أزرار التبويبات والإجراءات المصغرة */}
      <div className="h-8 min-h-[32px] px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between shrink-0">
        {/* Right: عنوان الشاشة المدمج وأيقونة هندسية خطية وشارة الطلبات النشطة */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>خطوط التصنيع والتشغيل</span>
          </div>
          <span className="flex items-center gap-1.5 text-[9.5px] bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800/50 font-mono shrink-0 shadow-2xs">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-80 duration-1000"></span>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-300 opacity-40 duration-700"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500 animate-pulse"></span>
            </span>
            <span>{activeFactory.length} بالورشة</span>
          </span>
        </div>

        {/* Left: التبويبات وأزرار الإجراءات المصغرة المتطابقة مع هيدر السندات */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Segmented Control Tabs */}
          <div className="h-6 p-0.5 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-md flex items-center gap-0.5 text-[10.5px] font-medium">
            <button
              type="button"
              onClick={() => { if (typeof setActiveMainTab === 'function') setActiveMainTab('pipeline'); }}
              className={`h-5 px-1.5 rounded transition flex items-center gap-1 cursor-pointer ${
                activeMainTab === 'pipeline'
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="عرض خطوط التشغيل الحية"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              <span>التشغيل</span>
            </button>

            <button
              type="button"
              onClick={() => { if (typeof setActiveMainTab === 'function') setActiveMainTab('analytics'); }}
              className={`h-5 px-1.5 rounded transition flex items-center gap-1 cursor-pointer ${
                activeMainTab === 'analytics'
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="عرض تحليلات الإنتاج والورشة"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <span>التحليلات</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof setActiveMainTab === 'function') setActiveMainTab('alterations');
                if (typeof fetchAlterations === 'function') fetchAlterations();
              }}
              className={`h-5 px-1.5 rounded transition flex items-center gap-1 cursor-pointer ${
                activeMainTab === 'alterations'
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="عرض بروفات وتعديلات الفساتين"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242L10.5 8.5" /></svg>
              <span>البروفات</span>
              {activeAlterations > 0 && (
                <span className="bg-rose-500 text-white px-1 py-0.1 rounded text-[8.5px] font-mono font-bold">
                  {activeAlterations}
                </span>
              )}
            </button>
          </div>

          {/* مسح باركود */}
          <button
            type="button"
            onClick={onOpenScanModal}
            className="h-6 px-2 text-[10.5px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md flex items-center gap-1 transition cursor-pointer"
            title="مسح باركود بطاقة الفستان"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            <span>مسح باركود</span>
          </button>

          {/* أمر تشغيل فوري */}
          <button
            type="button"
            onClick={() => {
              if (typeof onToggleOrderForm === 'function') onToggleOrderForm();
              else if (typeof onOpenNewOrder === 'function') onOpenNewOrder();
            }}
            className="h-6 px-2 text-[10.5px] font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer"
            title="فتح نموذج أمر التشغيل والتفصيل"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            <span>أمر تشغيل فوري</span>
          </button>
        </div>
      </div>

      {/* 2. شريط عدادات مراحل الورشة المدمج - صف أفقي واحد متناسق بحركات تفاعلية */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 my-0.5 shrink-0">
        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-amber-300 dark:hover:border-amber-800/60 cursor-default group">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-scissor shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242 3 3 0 014.242 0L12 12zm0 0L9.121 9.121a3 3 0 10-4.242 4.242 3 3 0 004.242 0L12 12z" /></svg>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">قص وتحضير</span>
          </div>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {countCutter} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">طلب</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-teal-300 dark:hover:border-teal-800/60 cursor-default group">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400 animate-sewing shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 4v16M8 4v16M4 8h16M4 16h16" /></svg>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">خياطة وتجميع</span>
          </div>
          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 font-mono tracking-tight">
            {countTailor} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">طلب</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800/60 cursor-default group">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 animate-embroidery shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">تطريز وشك</span>
          </div>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
            {countEmbroidery} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">طلب</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-sky-300 dark:hover:border-sky-800/60 cursor-default group">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 animate-finisher shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">تشطيب وفحص</span>
          </div>
          <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 font-mono tracking-tight">
            {countFinisher} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">طلب</span>
          </span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800/60 cursor-default group">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 animate-ready shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">جاهز للتسليم</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {countReady} <span className="text-[9.5px] text-slate-500 dark:text-slate-400">طلب</span>
          </span>
        </div>
      </div>
    </div>
  );
}

window.FactoryHeader = FactoryHeader;

