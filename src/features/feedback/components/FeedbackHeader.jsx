// src/features/feedback/components/FeedbackHeader.jsx
// رأس الصفحة وبطاقات مؤشرات الأداء السريعة وأزرار العمليات

function FeedbackHeader({
  metrics,
  purchases = [],
  currencyDisplay = "ريال",
  timeframe = "all",
  setTimeframe,
  onOpenModal,
  onShowFormula,
  onShowLineage
}) {
  const Icons = window.Icons || {};
  const formattedCurrency = (String(currencyDisplay || 'ريال').includes('ريال') ? 'ريال' : currencyDisplay).replace(/YER/gi, '').trim() || 'ريال';
  const hasCopq = Number(metrics?.totalCOPQ || 0) > 0;
  const hasInspections = Number(metrics?.totalInspectionsCount || 0) > 0 && metrics?.oqs !== null && metrics?.oqs !== undefined;

  return (
    <div className="bg-[#111C38] rounded-2xl border border-slate-700/80 shadow-xl overflow-hidden select-none">
      <div className="p-3.5 lg:p-4 border-b border-slate-700/80 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 bg-[#111C38]">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-pink-500/15 text-pink-400 border border-pink-500/30 flex items-center justify-center text-lg lg:text-xl font-bold shrink-0 shadow-xs">
            {Icons.Star ? <Icons.Star className="w-5 h-5 lg:w-6 lg:h-6" /> : <span>⭐</span>}
          </div>
          <div>
            <h1 className="text-sm sm:text-base lg:text-[17px] font-bold text-white tracking-wide whitespace-nowrap">
              منظومة إدارة الجودة والمعلومات الذكية (Quality & Intelligence Studio)
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 whitespace-nowrap">
              مركز قياس وموثوقية المؤسسة بالكامل وتقييمات العملاء والأزياء الفاخرة
            </p>
          </div>
        </div>

        {/* أزرار العمليات والفترات المدمجة بمحاذاة واحدة نظيفة دون تكرار */}
        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap justify-start xl:justify-end shrink-0">
          <div className="flex bg-slate-900 border border-slate-700/80 p-0.5 rounded-lg shrink-0">
            {[
              { id: '30d', label: 'آخر 30 يوم' },
              { id: '90d', label: 'آخر 3 أشهر' },
              { id: 'all', label: 'جميع الفترات' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeframe(t.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  timeframe === t.id ? 'bg-[#111C38] text-pink-400 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onOpenModal('inspection')}
              className="h-8 px-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <span>🔍</span><span>فحص جديد</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenModal('defect')}
              className="h-8 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <span>⚠️</span><span>تسجيل عيب</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenModal('feedback')}
              className="h-8 px-2.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <span>⭐</span><span>تقييم عميل</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenModal('complaint')}
              className="h-8 px-2.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <span>📢</span><span>شكوى</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenModal('return')}
              className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <span>🔄</span><span>مرتجع</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── شريط مؤشرات الأداء الحقيقية والربط التحليلي ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-b border-slate-700/80 bg-[#0F172A] divide-x divide-x-reverse divide-slate-800/80">
        {/* OQS */}
        <div className="p-3 text-center bg-[#111C38] hover:bg-[#162447] cursor-pointer transition border-b sm:border-b-0 border-slate-800/80" onClick={onShowFormula}>
          <div className="flex items-center justify-center gap-1">
            <span className="text-[11px] font-bold text-pink-400">مؤشر الجودة العام OQS</span>
            <span className="text-[10px] text-pink-400 border border-pink-500/40 rounded-full w-4 h-4 inline-flex items-center justify-center font-bold">ℹ️</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-white mt-1 flex items-baseline justify-center gap-1">
            <span>{hasInspections ? metrics.oqs : '--'}</span>
            <span className="text-xs text-slate-400 font-normal font-sans">/ 100</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
            {hasInspections ? 'انقر لمعرفة طريقة الحساب' : 'بانتظار الفحص الفني'}
          </span>
        </div>

        {/* معدل العيوب */}
        <div className="p-3 text-center cursor-pointer hover:bg-[#111C38] transition border-b sm:border-b-0 border-slate-800/80" onClick={() => onShowLineage({ title: 'سجل العيوب والتعديلات المسجلة', records: metrics?.rawDefects || [], type: 'defects' })}>
          <span className="text-[11px] font-medium text-slate-300 block">معدل العيوب (Defect Rate)</span>
          <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
            {hasInspections && metrics?.defectRate !== null && metrics?.defectRate !== undefined ? `${metrics.defectRate}%` : '--'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {hasInspections ? `${metrics?.totalDefectsCount || 0} عيوب مسجلة 🔍` : 'بانتظار الفحص الفني 🔍'}
          </span>
        </div>

        {/* تكلفة الجودة COPQ */}
        <div className="p-3 text-center cursor-pointer hover:bg-[#111C38] transition border-b sm:border-b-0 border-slate-800/80" onClick={() => onShowLineage({ title: 'تفاصيل التكلفة المالية للجودة الرديئة (COPQ)', records: metrics?.rawMaintenanceExpenses || [], type: 'copq' })}>
          <span className="text-[11px] font-medium text-slate-300 block">تكلفة الجودة الرديئة (COPQ)</span>
          <div className={`text-xl font-bold font-mono tabular-nums mt-1 flex items-baseline justify-center gap-1 ${hasCopq ? 'text-rose-400' : 'text-white'}`}>
            <span>{(metrics?.totalCOPQ || 0).toLocaleString('en-US')}</span>
            <span className="text-xs font-normal text-slate-400 font-sans mr-0.5">{formattedCurrency}</span>
          </div>
          <span className={`text-[10px] font-semibold block mt-0.5 ${hasCopq ? 'text-rose-300' : 'text-slate-400'}`}>
            {hasCopq ? `${metrics?.copqPercentage || '0.0'}% من المبيعات 💸` : 'لا توجد تكاليف جودة مسجلة'}
          </span>
        </div>

        {/* صافي الترويج NPS */}
        <div className="p-3 text-center cursor-pointer hover:bg-[#111C38] transition" onClick={() => onShowLineage({ title: 'سجل استبيانات ورضا العملاء', records: metrics?.rawFeedback || [], type: 'nps' })}>
          <span className="text-[11px] font-medium text-slate-300 block">صافي الترويج (NPS)</span>
          <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
            {metrics?.nps !== null && metrics?.nps !== undefined ? `+${metrics.nps}` : '--'}
          </div>
          <span className="text-[10px] text-cyan-300 font-semibold block mt-0.5">
            {metrics?.csat !== null && metrics?.csat !== undefined ? `CSAT: ${metrics.csat} / 5.0 ⭐` : 'لا توجد تقييمات بعد'}
          </span>
        </div>

        {/* نسبة النجاح من الفحص الأول FPY */}
        <div className="p-3 text-center cursor-pointer hover:bg-[#111C38] transition" onClick={() => onShowLineage({ title: 'سجل عمليات فحص الجودة (Inspections)', records: metrics?.rawInspections || [], type: 'inspections' })}>
          <span className="text-[11px] font-medium text-slate-300 block">نسبة نجاح الفحص (FPY)</span>
          <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
            {metrics?.firstPassYield !== null && metrics?.firstPassYield !== undefined ? `${metrics.firstPassYield}%` : '--'}
          </div>
          <span className="text-[10px] text-purple-300 font-semibold block mt-0.5">{metrics?.totalInspectionsCount || 0} عمليات فحص 🔍</span>
        </div>

        {/* جودة الموردين SQS */}
        <div className="p-3 text-center hover:bg-[#111C38] transition">
          <span className="text-[11px] font-medium text-slate-300 block">جودة الموردين (SQS)</span>
          <div className="text-xl font-bold font-mono tabular-nums text-white mt-1 flex items-baseline justify-center gap-1">
            <span>{metrics?.suppScore !== null && metrics?.suppScore !== undefined ? metrics.suppScore : '--'}</span>
            <span className="text-xs text-slate-400 font-normal font-sans">/ 100</span>
          </div>
          <span className="text-[10px] text-amber-300 font-semibold block mt-0.5">
            {metrics?.totalSupplierRecords > 0
              ? `${metrics.totalSupplierRecords} فحص توريد 📦`
              : 'بانتظار فحص التوريد 📦'}
          </span>
        </div>
      </div>
    </div>
  );
}

window.FeedbackHeader = FeedbackHeader;
