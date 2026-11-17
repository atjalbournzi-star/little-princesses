// src/features/feedback/components/FeedbackHeader.jsx
// ترويسة إدارة الجودة الشاملة وبطاقات مؤشرات الأداء المدمجة المتوافقة مع هوية السندات المالية

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
  const formattedCurrency = (String(currencyDisplay || 'ريال').includes('ريال') ? 'ريال' : currencyDisplay).replace(/YER/gi, '').trim() || 'ريال';
  const hasCopq = Number(metrics?.totalCOPQ || 0) > 0;
  const hasInspections = Number(metrics?.totalInspectionsCount || 0) > 0 && metrics?.oqs !== null && metrics?.oqs !== undefined;

  return (
    <div className="shrink-0 space-y-1 select-none text-right" dir="rtl">
      {/* 1. ترويسة مدمجة ورشيقة في سطر واحد مع أزرار الإجراءات المصغرة */}
      <div className="h-8 min-h-[32px] px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 shrink-0 select-none">
        {/* Right: عنوان الشاشة المدمج في سطر واحد بدون شارات أو نصوص زائدة */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>إدارة الجودة الشاملة (QA)</span>
          </div>
        </div>

        {/* Left: أزرار الفترات والإجراءات المصغرة في صف أفقي واحد مدمج يمنع القص والتزاحم */}
        <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
          {/* فلاتر الفترة الزمنية المدمجة */}
          <div className="flex items-center bg-slate-100 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 p-0.5 rounded-md shrink-0">
            {[
              { id: '30d', label: '30 يوم' },
              { id: '90d', label: '3 أشهر' },
              { id: 'all', label: 'الكل' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeframe(t.id)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer whitespace-nowrap ${
                  timeframe === t.id
                    ? 'bg-white dark:bg-[#111C38] text-pink-600 dark:text-pink-400 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* زر فحص جديد الرئيسي */}
          <button
            type="button"
            onClick={() => onOpenModal('inspection')}
            className="h-6 px-2 text-[10.5px] font-medium bg-pink-600 hover:bg-pink-700 text-white rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="فحص فني جديد"
          >
            <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>فحص جديد</span>
          </button>

          {/* زر تسجيل عيب */}
          <button
            type="button"
            onClick={() => onOpenModal('defect')}
            className="h-6 px-2 text-[10.5px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/60 rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="تسجيل عيب تشغيلي"
          >
            <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>تسجيل عيب</span>
          </button>

          {/* زر تقييم عميل */}
          <button
            type="button"
            onClick={() => onOpenModal('feedback')}
            className="h-6 px-2 text-[10.5px] font-medium bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800/60 rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="تقييم عميل"
          >
            <svg className="w-2.5 h-2.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>تقييم عميل</span>
          </button>

          {/* زر شكوى */}
          <button
            type="button"
            onClick={() => onOpenModal('complaint')}
            className="h-6 px-2 text-[10.5px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="تسجيل شكوى"
          >
            <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <span>شكوى</span>
          </button>

          {/* زر مرتجع */}
          <button
            type="button"
            onClick={() => onOpenModal('return')}
            className="h-6 px-2 text-[10.5px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="تسجيل مرتجع"
          >
            <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>مرتجع</span>
          </button>
        </div>
      </div>

      {/* 2. شريط المؤشرات الإحصائية الستة المدمج - صف أفقي واحد متناسق تماماً */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 my-0.5 shrink-0">
        {/* 1. OQS */}
        <div
          onClick={onShowFormula}
          className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap cursor-pointer hover:border-pink-400 dark:hover:border-pink-600 transition"
          title="مؤشر الجودة العام OQS - انقر لمعرفة طريقة الحساب"
        >
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">مؤشر الجودة OQS</span>
          <span className="text-[11px] font-bold text-pink-600 dark:text-pink-400 font-mono tracking-tight">
            {hasInspections ? `${metrics.oqs}/100` : '--'}
          </span>
        </div>

        {/* 2. معدل العيوب */}
        <div
          onClick={() => onShowLineage?.({ title: 'سجل العيوب والتعديلات المسجلة', records: metrics?.rawDefects || [], type: 'defects' })}
          className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap cursor-pointer hover:border-slate-400 dark:hover:border-slate-700 transition"
          title="معدل العيوب - انقر لعرض التفاصيل"
        >
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">معدل العيوب</span>
          <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
            {hasInspections && metrics?.defectRate !== null && metrics?.defectRate !== undefined ? `${metrics.defectRate}%` : '--'}
          </span>
        </div>

        {/* 3. تكلفة COPQ */}
        <div
          onClick={() => onShowLineage?.({ title: 'تفاصيل التكلفة المالية للجودة الرديئة (COPQ)', records: metrics?.rawMaintenanceExpenses || [], type: 'copq' })}
          className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap cursor-pointer hover:border-slate-400 dark:hover:border-slate-700 transition"
          title="تكلفة الجودة الرديئة COPQ"
        >
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">تكلفة الرديئة COPQ</span>
          <span dir="ltr" className={`text-[11px] font-bold font-mono tracking-tight ${hasCopq ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
            {(metrics?.totalCOPQ || 0).toLocaleString('en-US')} {formattedCurrency}
          </span>
        </div>

        {/* 4. NPS */}
        <div
          onClick={() => onShowLineage?.({ title: 'سجل استبيانات ورضا العملاء', records: metrics?.rawFeedback || [], type: 'nps' })}
          className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap cursor-pointer hover:border-slate-400 dark:hover:border-slate-700 transition"
          title="صافي الترويج NPS"
        >
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">صافي الترويج NPS</span>
          <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 font-mono tracking-tight">
            {metrics?.nps !== null && metrics?.nps !== undefined ? `+${metrics.nps}` : '--'}
          </span>
        </div>

        {/* 5. FPY */}
        <div
          onClick={() => onShowLineage?.({ title: 'سجل عمليات فحص الجودة (Inspections)', records: metrics?.rawInspections || [], type: 'inspections' })}
          className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap cursor-pointer hover:border-slate-400 dark:hover:border-slate-700 transition"
          title="نسبة نجاح الفحص من المرة الأولى FPY"
        >
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">نجاح الفحص FPY</span>
          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 font-mono tracking-tight">
            {metrics?.firstPassYield !== null && metrics?.firstPassYield !== undefined ? `${metrics.firstPassYield}%` : '--'}
          </span>
        </div>

        {/* 6. SQS */}
        <div
          className="py-1 px-2.5 rounded-lg bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 flex items-center justify-between whitespace-nowrap"
          title="جودة الموردين والخامات SQS"
        >
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">جودة الموردين SQS</span>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {metrics?.suppScore !== null && metrics?.suppScore !== undefined ? `${metrics.suppScore}/100` : '--'}
          </span>
        </div>
      </div>
    </div>
  );
}

window.FeedbackHeader = FeedbackHeader;
