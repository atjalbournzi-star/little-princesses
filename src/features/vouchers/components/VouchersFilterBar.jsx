// src/features/vouchers/components/VouchersFilterBar.jsx
// شريط البحث والتصفية المدمج لسجل السندات والمعاملات المالية
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-800 shrink-0 select-none">
      {/* Right: عنوان شريط السجل والعدد المصفى */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto">
        <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100 whitespace-nowrap">
          سجل السندات المالية
        </h3>
        <span className="text-[9.5px] bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800/50 font-mono">
          {filteredCount}
        </span>
      </div>

      {/* Left: أدوات التصفية والبحث والتحديث في نسق مدمج ورشيق */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="h-6 px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer transition hover:border-slate-300 dark:hover:border-slate-700"
        >
          <option value="الكل">جميع السندات والمعاملات</option>
          <option value="سند قبض">سندات القبض (مقبوضات)</option>
          <option value="سند صرف">سندات الصرف (مدفوعات)</option>
          <option value="إيداع رأس مال">إيداعات رأس المال</option>
          <option value="قيود يومية">القيود المحاسبية والتسويات</option>
        </select>

        <div className="relative flex-1 sm:w-48">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-2 pr-6 h-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-[11px] font-medium w-full text-slate-900 dark:text-white focus:border-teal-600 dark:focus:border-teal-500 outline-none transition"
          />
          <svg className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="تحديث ومزامنة السندات من السحابة"
          className="h-6 px-2 bg-white hover:bg-slate-50 dark:bg-[#0F172A] dark:hover:bg-slate-800 text-teal-600 dark:text-teal-400 border border-slate-200 dark:border-slate-800 rounded-md text-[10.5px] font-medium flex items-center gap-1 transition cursor-pointer disabled:opacity-50 shrink-0"
        >
          <svg className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">{isRefreshing ? 'جاري التحديث...' : 'تحديث'}</span>
        </button>
      </div>
    </div>
  );
}

window.VouchersFilterBar = VouchersFilterBar;
