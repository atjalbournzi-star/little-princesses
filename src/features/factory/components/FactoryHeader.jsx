function FactoryHeader({
  factory = [],
  stages = [],
  activeMainTab = 'pipeline',
  setActiveMainTab,
  alterationsList = [],
  fetchAlterations,
  onOpenScanModal
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xl font-bold shadow-xs">
            {window.Icons && window.Icons.Scissors ? <window.Icons.Scissors className="w-6 h-6" /> : <span>✂️</span>}
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-[#25232A]">
              إدارة المعمل والمشغل وخطوط الإنتاج (Production Pipeline)
            </h1>
            <p className="text-xs text-[#6F6B75] mt-0.5">
              تتبع مراحل القص، الخياطة، التطريز، والتشطيب، وإسناد الطلبات للفنيين
            </p>
          </div>
        </div>

        {/* أزرار التبديل الرئيسية */}
        <div className="flex items-center bg-[#FAFAFB] p-1 rounded-2xl border border-[#E8E5EA] shadow-2xs self-start sm:self-auto flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveMainTab('pipeline')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMainTab === 'pipeline'
                ? 'bg-[#8F2A87] text-white shadow-xs'
                : 'text-[#6F6B75] hover:text-[#25232A]'
            }`}
          >
            <span>🧵 خطوط الإنتاج والتشغيل</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeMainTab === 'pipeline' ? 'bg-white/20 text-white' : 'bg-[#E8E5EA] text-[#25232A]'
            }`}>
              {factory.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMainTab === 'analytics'
                ? 'bg-[#8F2A87] text-white shadow-xs'
                : 'text-[#6F6B75] hover:text-[#25232A]'
            }`}
          >
            <span>📊 تحليلات التكاليف والربحية (KPIs)</span>
            <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">جديد ✨</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMainTab('alterations');
              if (typeof fetchAlterations === 'function') fetchAlterations();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMainTab === 'alterations'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-[#6F6B75] hover:text-[#25232A]'
            }`}
          >
            <span>✂️ تذاكر تعديل البروفات (Alterations)</span>
            {alterationsList.filter(a => a.status !== 'completed').length > 0 && (
              <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold animate-pulse">
                {alterationsList.filter(a => a.status !== 'completed').length}
              </span>
            )}
          </button>
        </div>

        {/* زر مسح باركود الفستان السريع */}
        <button
          type="button"
          onClick={onOpenScanModal}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-700 via-[#8F2A87] to-pink-600 hover:opacity-95 text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
          title="مسح باركود بطاقة الفستان وترقية المرحلة لحظياً (Scan-to-Progress)"
        >
          <span>📷🏷️</span>
          <span>مسح باركود الفستان (Scan-to-Progress)</span>
        </button>
      </div>

      {/* 5 Stage Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
        {(stages || []).map((stg) => {
          const count = factory.filter(f => f.stage === stg).length;
          return (
            <div key={stg} className="p-4 text-center">
              <span className="text-[11px] font-semibold text-[#6F6B75] block truncate">{stg}</span>
              <span className="text-base font-bold font-mono text-[#8F2A87] mt-0.5 block">{count} طلب</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.FactoryHeader = FactoryHeader;
