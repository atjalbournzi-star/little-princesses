function FactoryFilterBar({
  filteredCount = 0,
  totalFiltered = 0,
  stageFilter = 'الكل',
  setStageFilter,
  stages = [],
  search = '',
  setSearch
}) {
  const count = filteredCount || totalFiltered || 0;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800 shrink-0 select-none text-right" dir="rtl">
      {/* Right: عنوان شريط لوحة التتبع الحية وشارة النبض الحي */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-80 duration-1000"></span>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-300 opacity-40 duration-700"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500 animate-pulse"></span>
          </span>
          <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100 whitespace-nowrap">
            لوحة التتبع الحية للورشة
          </h3>
        </div>
        <span className="text-[9.5px] bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800/50 font-mono animate-pulse">
          {count}
        </span>
      </div>

      {/* Left: أدوات التصفية والبحث في نسق مدمج ورشيق */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="h-6 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer transition hover:border-slate-300 dark:hover:border-slate-700"
        >
          <option value="الكل">جميع المراحل</option>
          {(stages || []).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="relative flex-1 sm:w-56">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث في الطلبات..."
            className="pl-5 pr-6 h-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium w-full text-slate-900 dark:text-white focus:border-teal-600 dark:focus:border-teal-500 outline-none transition"
          />
          <svg className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

window.FactoryFilterBar = FactoryFilterBar;

