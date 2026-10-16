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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2.5 w-full sm:w-auto">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">سجل السندات المالية</h3>
        <span className="text-xs bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 font-bold px-2.5 py-0.5 rounded-full font-mono">
          {filteredCount}
        </span>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
        >
          <option value="الكل">جميع السندات والمعاملات</option>
          <option value="سند قبض">سندات القبض (مقبوضات)</option>
          <option value="سند صرف">سندات الصرف (مدفوعات)</option>
          <option value="إيداع رأس مال">إيداعات رأس المال 💼</option>
          <option value="قيود يومية">القيود المحاسبية والتسويات 📑</option>
        </select>

        <div className="relative flex-1 sm:w-64">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-3 pr-8 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium w-full text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-teal-600 outline-none"
            placeholder="بحث برقم السند، الطرف، البيان..."
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs pointer-events-none">🔍</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="تحديث ومزامنة السندات من السحابة"
          className="h-10 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
        >
          <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
          <span className="text-xs hidden sm:inline">{isRefreshing ? 'جاري التحديث...' : 'تحديث'}</span>
        </button>
      </div>
    </div>
  );
}

window.VouchersFilterBar = VouchersFilterBar;
