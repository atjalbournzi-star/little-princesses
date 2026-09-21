function PurchasesFilterBar({
  isHistoryOpen,
  setIsHistoryOpen,
  filteredPurchasesCount = 0,
  search,
  setSearch
}) {
  return (
    <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white border-b border-[#E8E5EA]">
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button
          type="button"
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="flex items-center gap-2.5 text-right cursor-pointer group focus:outline-none"
        >
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-transform duration-300 ${
            isHistoryOpen ? 'bg-[#8F2A87] text-white rotate-180' : 'bg-[#F2E7F3] text-[#8F2A87]'
          }`}>
            ▼
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#25232A] group-hover:text-[#8F2A87] transition-colors">
                سجل المشتريات والفواتير السحابية
              </h3>
              <span className="text-xs bg-[#F2E7F3] text-[#8F2A87] font-bold px-2.5 py-0.5 rounded-full font-mono">
                {filteredPurchasesCount} فاتورة
              </span>
            </div>
            <p className="text-[11px] text-[#6F6B75]">
              {isHistoryOpen ? 'انقر لطي وإخفاء جدول السجل' : 'انقر لتوسيع واستعراض سجل الفواتير والموردين'}
            </p>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 md:w-72">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); if (!isHistoryOpen) setIsHistoryOpen(true); }}
            className="pl-3 pr-9 h-10 rounded-xl border border-[#E8E5EA] bg-white text-xs font-medium w-full focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] outline-none shadow-2xs transition-all"
            placeholder="بحث برقم الفاتورة، المورد، الصنف..."
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
        </div>

        {/* Toggle Accordion Button */}
        <button
          type="button"
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <span>{isHistoryOpen ? 'إخفاء' : 'عرض السجل'}</span>
          <span>{isHistoryOpen ? '▲' : '▼'}</span>
        </button>
      </div>
    </div>
  );
}

window.PurchasesFilterBar = PurchasesFilterBar;
