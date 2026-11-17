// src/features/feedback/components/FeedbackOperationsViews.jsx
// جداول عمليات فحص الجودة الميدانية وعيوب التصنيع المتوافقة مع هوية السندات المالية

function FeedbackOperationsViews({
  activeTab = 'inspections',
  inspections = [],
  defects = [],
  currencyDisplay = "ريال",
  onOpenModal,
  onOpenCertModal
}) {
  const [subView, setSubView] = React.useState('inspections');
  const formattedCurrency = (String(currencyDisplay || 'ريال').includes('ريال') ? 'ريال' : currencyDisplay).replace(/YER/gi, '').trim() || 'ريال';

  return (
    <div className="space-y-1.5 select-none text-right" dir="rtl">
      {/* 1. شريط التحويل بين سجل الفحوصات وسجل العيوب المدمج */}
      <div className="h-8 px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSubView('inspections')}
            className={`h-6 px-2 rounded-md font-medium text-[10.5px] transition cursor-pointer flex items-center gap-1 ${
              subView === 'inspections'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>عمليات الفحص</span>
            <span className="text-[9.5px] bg-black/20 px-1 py-0.2 rounded font-mono">{inspections.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('defects')}
            className={`h-6 px-2 rounded-md font-medium text-[10.5px] transition cursor-pointer flex items-center gap-1 ${
              subView === 'defects'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>سجل العيوب</span>
            <span className="text-[9.5px] bg-black/20 px-1 py-0.2 rounded font-mono">{defects.length}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenModal(subView === 'inspections' ? 'inspection' : 'defect')}
          className={`h-6 px-2 rounded-md font-medium text-[10.5px] transition flex items-center gap-1 cursor-pointer shadow-xs text-white ${
            subView === 'inspections' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-amber-600 hover:bg-amber-700'
          }`}
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>{subView === 'inspections' ? 'فحص جودة جديد' : 'تسجيل عيب'}</span>
        </button>
      </div>

      {/* 2. جدول عمليات الفحص المدمج */}
      {subView === 'inspections' && (
        <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs">
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 custom-scrollbar">
            <table className="w-full text-right border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800">
                <tr className="h-7.5">
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">كود الفحص والتاريخ</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">المنتج / الطلب</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">مرحلة الإنتاج</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">المفحوص</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">الناجح</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">المعيب</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">النتيجة</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">الملاحظات</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">شهادة الجودة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
                {inspections.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center bg-slate-50/50 dark:bg-[#0B132B]/50">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">لا توجد عمليات فحص مسجلة حتى الآن</p>
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400">ابدأ بتسجيل أول فحص باستخدام الزر أعلاه</span>
                    </td>
                  </tr>
                ) : (
                  inspections.map((insp, idx) => (
                    <tr key={idx} className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors">
                      <td className="py-1 px-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-pink-600 dark:text-pink-400">#{insp.inspection_id || insp.id}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">({String(insp.inspection_date || '').split('T')[0]})</span>
                        </div>
                      </td>
                      <td className="py-1 px-2.5 font-bold text-slate-900 dark:text-white">{insp.product_name || 'طلب عام'}</td>
                      <td className="py-1 px-2.5 text-slate-700 dark:text-slate-300">{insp.production_stage || '—'}</td>
                      <td className="py-1 px-2.5 text-center font-mono text-slate-700 dark:text-slate-300">{insp.quantity_checked || 1}</td>
                      <td className="py-1 px-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{insp.quantity_passed || 1}</td>
                      <td className="py-1 px-2.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400">{insp.quantity_failed || 0}</td>
                      <td className="py-1 px-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          String(insp.inspection_result || '').toUpperCase() === 'PASS'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                        }`}>
                          {insp.inspection_result || 'PASS'}
                        </span>
                      </td>
                      <td className="py-1 px-2.5 text-slate-500 dark:text-slate-400 max-w-xs truncate">{insp.notes || '—'}</td>
                      <td className="py-1 px-2.5 text-center">
                        {String(insp.inspection_result || '').toUpperCase() === 'PASS' && onOpenCertModal ? (
                          <button
                            type="button"
                            onClick={() => onOpenCertModal(insp)}
                            className="h-5 px-2 bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 dark:hover:bg-pink-900/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60 rounded text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>كرت الفحص</span>
                          </button>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. جدول عيوب التصنيع المدمج */}
      {subView === 'defects' && (
        <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs">
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 custom-scrollbar">
            <table className="w-full text-right border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800">
                <tr className="h-7.5">
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">كود العيب والتاريخ</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">المنتج والمرحلة</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">نوع العيب</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">الدرجة</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">تكلفة الإصلاح</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">السبب المباشر</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
                {defects.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center bg-slate-50/50 dark:bg-[#0B132B]/50">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">لا توجد عيوب تشغيلية مسجلة حالياً</p>
                    </td>
                  </tr>
                ) : (
                  defects.map((def, idx) => (
                    <tr key={idx} className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors">
                      <td className="py-1 px-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-rose-600 dark:text-rose-400">#{def.defect_id || def.id}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">({String(def.defect_date || '').split('T')[0]})</span>
                        </div>
                      </td>
                      <td className="py-1 px-2.5 font-bold text-slate-900 dark:text-white">{def.product_name || 'فستان'} • {def.production_stage || '—'}</td>
                      <td className="py-1 px-2.5 text-slate-700 dark:text-slate-300">{def.defect_type || '—'}</td>
                      <td className="py-1 px-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          (def.severity || '') === 'Critical' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                        }`}>
                          {def.severity || 'Medium'}
                        </span>
                      </td>
                      <td className="py-1 px-2.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                        {(parseFloat(def.rework_cost || 0)).toLocaleString('en-US')} {formattedCurrency}
                      </td>
                      <td className="py-1 px-2.5 text-slate-500 dark:text-slate-400 max-w-xs truncate">{def.root_cause || '—'}</td>
                      <td className="py-1 px-2.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                          {def.status || 'Open'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

window.FeedbackOperationsViews = FeedbackOperationsViews;
