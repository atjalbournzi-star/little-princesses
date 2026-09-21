function FactoryFilterBar({
  totalFiltered = 0,
  stageFilter = 'الكل',
  setStageFilter,
  stages = [],
  search = '',
  setSearch
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        <h3 className="font-bold text-sm text-[#25232A]">لوحة التتبع الحية للورشة (Live Pipeline)</h3>
        <span className="text-xs bg-[#F2E7F3] text-[#8F2A87] font-bold px-2.5 py-0.5 rounded-full font-mono">{totalFiltered}</span>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <select
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none"
        >
          <option value="الكل">جميع المراحل</option>
          {(stages || []).map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="relative flex-1 sm:w-64">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#8F2A87] outline-none"
            placeholder="بحث برقم الطلب، العميلة، أو الخياط..."
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
        </div>
      </div>
    </div>
  );
}

window.FactoryFilterBar = FactoryFilterBar;
