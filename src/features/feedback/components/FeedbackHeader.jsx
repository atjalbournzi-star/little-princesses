// src/features/feedback/components/FeedbackHeader.jsx
// رأس الصفحة وبطاقات مؤشرات الأداء السريعة وأزرار العمليات

function FeedbackHeader({
  metrics,
  purchases = [],
  currencyDisplay = "YER ريال",
  timeframe = "all",
  setTimeframe,
  onOpenModal,
  onShowFormula,
  onShowLineage
}) {
  const Icons = window.Icons || {};

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="p-6 border-b border-[#E8E5EA] flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB] flex items-center justify-center text-2xl font-bold shadow-xs">
            {Icons.Star ? <Icons.Star className="w-7 h-7" /> : <span>⭐</span>}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-[#25232A]">
                منظومة إدارة الجودة والمعلومات الذكية (Quality & Intelligence Studio)
              </h1>
              <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] font-bold px-2 py-0.5 rounded-full border border-[#C5ECF0]">
                Master Ledger Active 🗄️
              </span>
            </div>
            <p className="text-xs text-[#6F6B75] mt-1">
              مركز قياس وموثوقية المؤسسة بالكامل • متصل بقاعدة بيانات PostgreSQL السحابية الموحدة (سوبابيز) 👑
            </p>
          </div>
        </div>

        {/* أزرار العمليات الحقيقية */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-[#FAFAFB] border border-[#E8E5EA] p-1 rounded-xl">
            {[
              { id: '30d', label: 'آخر 30 يوم' },
              { id: '90d', label: 'آخر 3 أشهر' },
              { id: 'all', label: 'جميع الفترات' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeframe === t.id ? 'bg-white text-[#B0005A] shadow-xs' : 'text-[#6F6B75] hover:text-[#25232A]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => onOpenModal('eval')}
            className="h-11 px-4 rounded-xl bg-[#8F2A87] hover:bg-[#73216C] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>➕ إنشاء تقييم جودة</span>
          </button>
          <button
            onClick={() => onOpenModal('inspection')}
            className="h-11 px-4 rounded-xl bg-[#B0005A] hover:bg-[#8E0049] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔍 فحص جديد</span>
          </button>
          <button
            onClick={() => onOpenModal('defect')}
            className="h-11 px-4 rounded-xl bg-[#F28A00] hover:bg-[#C97300] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>⚠️ تسجيل عيب</span>
          </button>
          <button
            onClick={() => onOpenModal('feedback')}
            className="h-11 px-4 rounded-xl bg-[#009FAE] hover:bg-[#007F8C] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>⭐ تقييم عميل</span>
          </button>
          <button
            onClick={() => onOpenModal('complaint')}
            className="h-11 px-4 rounded-xl bg-[#D64545] hover:bg-[#B53535] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>📢 شكوى جديدة</span>
          </button>
          <button
            onClick={() => onOpenModal('return')}
            className="h-11 px-4 rounded-xl bg-[#6B21A8] hover:bg-[#581C87] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔄 مرتجع فستان</span>
          </button>
        </div>
      </div>

      {/* ── شريط مؤشرات الأداء الحقيقية والربط التحليلي ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
        {/* OQS */}
        <div className="p-4.5 text-center bg-gradient-to-b from-white to-[#FCE8F2]/30 cursor-pointer hover:bg-[#FCE8F2]/50 transition" onClick={onShowFormula}>
          <div className="flex items-center justify-center gap-1">
            <span className="text-[11px] font-bold text-[#B0005A]">مؤشر الجودة العام OQS</span>
            <span className="text-[10px] text-[#B0005A] border border-[#F2A4CB] rounded-full w-4 h-4 inline-flex items-center justify-center font-bold">ℹ️</span>
          </div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-[#B0005A] mt-1 flex items-baseline justify-center gap-1">
            <span>{metrics?.oqs !== null && metrics?.oqs !== undefined ? metrics.oqs : '--'}</span>
            <span className="text-xs text-[#6F6B75] font-normal font-sans">/ 100</span>
          </div>
          <span className="text-[10px] text-[#007F8C] font-bold block mt-0.5">
            {metrics?.oqs !== null && metrics?.oqs !== undefined ? 'انقر لمعرفة طريقة الحساب' : 'بانتظار البيانات'}
          </span>
        </div>

        {/* معدل العيوب */}
        <div className="p-4.5 text-center cursor-pointer hover:bg-white transition" onClick={() => onShowLineage({ title: 'سجل العيوب والتعديلات المسجلة', records: metrics?.rawDefects || [], type: 'defects' })}>
          <span className="text-[11px] font-semibold text-[#6F6B75] block">معدل العيوب (Defect Rate)</span>
          <div className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1">
            {metrics?.defectRate !== null && metrics?.defectRate !== undefined ? `${metrics.defectRate}%` : '--'}
          </div>
          <span className="text-[10px] text-[#6F6B75] block mt-0.5">{metrics?.totalDefectsCount || 0} عيوب مسجلة 🔍</span>
        </div>

        {/* تكلفة الجودة COPQ */}
        <div className="p-4.5 text-center cursor-pointer hover:bg-white transition" onClick={() => onShowLineage({ title: 'تفاصيل التكلفة المالية للجودة الرديئة (COPQ)', records: metrics?.rawMaintenanceExpenses || [], type: 'copq' })}>
          <span className="text-[11px] font-semibold text-[#6F6B75] block">تكلفة الجودة الرديئة (COPQ)</span>
          <div className="text-xl font-extrabold font-mono tabular-nums text-[#D64545] mt-1">
            {(metrics?.totalCOPQ || 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75] mr-1 font-sans">{currencyDisplay}</span>
          </div>
          <span className="text-[10px] text-[#D64545] font-semibold block mt-0.5">{metrics?.copqPercentage || '0.0'}% من المبيعات 💸</span>
        </div>

        {/* صافي الترويج NPS */}
        <div className="p-4.5 text-center cursor-pointer hover:bg-white transition" onClick={() => onShowLineage({ title: 'سجل استبيانات ورضا العملاء', records: metrics?.rawFeedback || [], type: 'nps' })}>
          <span className="text-[11px] font-semibold text-[#6F6B75] block">صافي الترويج (NPS)</span>
          <div className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1">
            {metrics?.nps !== null && metrics?.nps !== undefined ? `+${metrics.nps}` : '--'}
          </div>
          <span className="text-[10px] text-[#007F8C] font-semibold block mt-0.5">
            {metrics?.csat !== null && metrics?.csat !== undefined ? `CSAT: ${metrics.csat} / 5.0 ⭐` : 'لا توجد تقييمات بعد'}
          </span>
        </div>

        {/* نسبة النجاح من الفحص الأول FPY */}
        <div className="p-4.5 text-center cursor-pointer hover:bg-white transition" onClick={() => onShowLineage({ title: 'سجل عمليات فحص الجودة (Inspections)', records: metrics?.rawInspections || [], type: 'inspections' })}>
          <span className="text-[11px] font-semibold text-[#6F6B75] block">نسبة نجاح الفحص (FPY)</span>
          <div className="text-xl font-extrabold font-mono tabular-nums text-[#8F2A87] mt-1">
            {metrics?.firstPassYield !== null && metrics?.firstPassYield !== undefined ? `${metrics.firstPassYield}%` : '--'}
          </div>
          <span className="text-[10px] text-[#8F2A87] font-semibold block mt-0.5">{metrics?.totalInspectionsCount || 0} عمليات فحص 🔍</span>
        </div>

        {/* جودة الموردين SQS */}
        <div className="p-4.5 text-center">
          <span className="text-[11px] font-semibold text-[#6F6B75] block">جودة الموردين (SQS)</span>
          <div className="text-xl font-extrabold font-mono tabular-nums text-[#C97300] mt-1">
            {metrics?.suppScore !== null && metrics?.suppScore !== undefined ? `${metrics.suppScore} / 100` : '-- / 100'}
          </div>
          <span className="text-[10px] text-[#6F6B75] block mt-0.5">{(purchases || []).length} فواتير توريد 📦</span>
        </div>
      </div>
    </div>
  );
}

window.FeedbackHeader = FeedbackHeader;
