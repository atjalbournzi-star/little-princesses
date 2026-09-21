function VouchersFilterBar({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  isRefreshing,
  onRefresh,
  filteredCount = 0
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        <h3 className="font-bold text-sm text-[#25232A]">سجل السندات المالية</h3>
        <span className="text-xs bg-[#E2F5F7] text-[#007F8C] font-bold px-2.5 py-0.5 rounded-full font-mono">
          {filteredCount}
        </span>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none cursor-pointer"
        >
          <option value="الكل">جميع السندات</option>
          <option value="سند قبض">سندات القبض (مقبوضات)</option>
          <option value="سند صرف">سندات الصرف (مدفوعات)</option>
        </select>

        <div className="relative flex-1 sm:w-64">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#009FAE] outline-none"
            placeholder="بحث برقم السند، الطرف، البيان..."
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="تحديث ومزامنة السندات من السحابة"
          className="h-10 px-3 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#007F8C] border border-[#E8E5EA] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
        >
          <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
          <span className="text-xs hidden sm:inline">{isRefreshing ? 'جاري التحديث...' : 'تحديث'}</span>
        </button>
      </div>
    </div>
  );
}

window.VouchersFilterBar = VouchersFilterBar;
