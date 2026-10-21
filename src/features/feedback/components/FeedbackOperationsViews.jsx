// src/features/feedback/components/FeedbackOperationsViews.jsx
// جداول عمليات فحص الجودة الميدانية وعيوب التصنيع

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
    <div className="space-y-3.5 select-none text-right" dir="rtl">
      {/* شريط التحويل بين سجل الفحوصات وسجل العيوب */}
      <div className="flex items-center justify-between gap-3 bg-[#111C38] p-3 rounded-2xl border border-slate-700/80 shadow-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView('inspections')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              subView === 'inspections' ? 'bg-pink-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <span>🔍 عمليات الفحص</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-mono">{inspections.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('defects')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              subView === 'defects' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <span>⚠️ سجل العيوب والتكاليف</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full font-mono">{defects.length}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenModal(subView === 'inspections' ? 'inspection' : 'defect')}
          className={`h-8 px-3 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs text-white ${
            subView === 'inspections' ? 'bg-pink-600 hover:bg-pink-500' : 'bg-amber-600 hover:bg-amber-500'
          }`}
        >
          <span>➕</span>
          <span>{subView === 'inspections' ? 'فحص جودة جديد' : 'تسجيل عيب'}</span>
        </button>
      </div>

      {/* 1. جدول عمليات الفحص */}
      {subView === 'inspections' && (
        <div className="bg-[#111C38] rounded-2xl border border-slate-700/80 shadow-xl p-4 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-700/60 custom-scrollbar">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#0B132B] text-slate-300 font-bold border-b border-slate-700/80">
                <tr>
                  <th className="py-2.5 px-3">كود الفحص والتاريخ</th>
                  <th className="py-2.5 px-3">المنتج / الطلب</th>
                  <th className="py-2.5 px-3">مرحلة الإنتاج</th>
                  <th className="py-2.5 px-3 text-center">المفحوص</th>
                  <th className="py-2.5 px-3 text-center">الناجح</th>
                  <th className="py-2.5 px-3 text-center">المعيب</th>
                  <th className="py-2.5 px-3 text-center">النتيجة</th>
                  <th className="py-2.5 px-3">الملاحظات</th>
                  <th className="py-2.5 px-3 text-center">شهادة الجودة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {inspections.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400 bg-[#0B132B]/60">
                      <span className="block text-xl mb-1">🔍</span>
                      لا توجد عمليات فحص مسجلة حتى الآن في النظام
                    </td>
                  </tr>
                ) : (
                  inspections.map((insp, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3">
                        <span className="font-bold font-mono text-pink-400 block">#{insp.inspection_id || insp.id}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{String(insp.inspection_date || '').split('T')[0]}</span>
                      </td>
                      <td className="py-2 px-3 font-bold text-white">{insp.product_name || 'طلب عام'}</td>
                      <td className="py-2 px-3 text-slate-300">{insp.production_stage || '—'}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-200">{insp.quantity_checked || 1}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-emerald-400">{insp.quantity_passed || 1}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-rose-400">{insp.quantity_failed || 0}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${
                          String(insp.inspection_result || '').toUpperCase() === 'PASS'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}>
                          {insp.inspection_result || 'PASS'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 max-w-xs truncate">{insp.notes || '—'}</td>
                      <td className="py-2 px-3 text-center">
                        {String(insp.inspection_result || '').toUpperCase() === 'PASS' && onOpenCertModal ? (
                          <button
                            type="button"
                            onClick={() => onOpenCertModal(insp)}
                            className="px-2.5 py-1 bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>🎖️ كرت الفحص</span>
                          </button>
                        ) : <span className="text-slate-500">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. جدول عيوب التصنيع */}
      {subView === 'defects' && (
        <div className="bg-[#111C38] rounded-2xl border border-slate-700/80 shadow-xl p-4 space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-700/60 custom-scrollbar">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#0B132B] text-slate-300 font-bold border-b border-slate-700/80">
                <tr>
                  <th className="py-2.5 px-3">كود العيب والتاريخ</th>
                  <th className="py-2.5 px-3">المنتج والمرحلة</th>
                  <th className="py-2.5 px-3">نوع العيب</th>
                  <th className="py-2.5 px-3 text-center">الدرجة</th>
                  <th className="py-2.5 px-3 text-center">تكلفة الإصلاح</th>
                  <th className="py-2.5 px-3">السبب المباشر</th>
                  <th className="py-2.5 px-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {defects.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400 bg-[#0B132B]/60">
                      <span className="block text-xl mb-1">✅</span>
                      لا توجد عيوب تشغيلية مسجلة حالياً
                    </td>
                  </tr>
                ) : (
                  defects.map((def, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3">
                        <span className="font-bold font-mono text-rose-400 block">#{def.defect_id || def.id}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{String(def.defect_date || '').split('T')[0]}</span>
                      </td>
                      <td className="py-2 px-3 font-bold text-white">{def.product_name || 'فستان'} • {def.production_stage || '—'}</td>
                      <td className="py-2 px-3 text-slate-300">{def.defect_type || '—'}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          (def.severity || '') === 'Critical' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {def.severity || 'Medium'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-rose-400">
                        {(parseFloat(def.rework_cost || 0)).toLocaleString('en-US')} {formattedCurrency}
                      </td>
                      <td className="py-2 px-3 text-slate-400 max-w-xs truncate">{def.root_cause || '—'}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10.5px] font-bold">
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
