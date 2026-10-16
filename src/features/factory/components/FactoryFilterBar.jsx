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
    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl mb-2.5 text-right text-xs shrink-0 select-none shadow-sm">
      <div className="flex items-center gap-2.5">
        <h3 className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
          <span>لوحة التتبع الحية للورشة</span>
        </h3>
        <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="h-7.5 px-3 rounded-lg border border-slate-700/80 bg-slate-950/80 text-xs font-medium text-slate-200 outline-none cursor-pointer focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all"
        >
          <option value="الكل">جميع المراحل</option>
          {(stages || []).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="relative w-52 sm:w-72">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-7.5 pl-3 pr-8 rounded-lg border border-slate-700/80 bg-slate-950/80 text-xs font-medium text-slate-200 outline-none placeholder:text-slate-500 focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/30 transition-all"
            placeholder="بحث بالطلب، اسم العميلة، اسم الخياط..."
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">🔍</span>
        </div>
      </div>
    </div>
  );
}

window.FactoryFilterBar = FactoryFilterBar;

