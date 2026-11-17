// src/features/feedback/components/QualityDrawerAndFormula.jsx
// نافذة معادلة احتساب مؤشر الجودة OQS ودرج تتبع السجلات والبيانات الحقيقية المتوافقة مع هوية السندات المالية

function QualityDrawerAndFormula({
  showFormulaModal,
  onCloseFormula,
  metrics,
  lineageDrawer,
  onCloseLineage,
  currencyDisplay = "YER ريال"
}) {
  return (
    <>
      {/* Modal: OQS Mathematical Formula */}
      {showFormulaModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 select-none" dir="rtl" onClick={onCloseFormula}>
          <div className="bg-white dark:bg-[#111C38] rounded-xl max-w-xl w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>معادلة احتساب مؤشر الجودة العام OQS ({metrics?.oqs !== null && metrics?.oqs !== undefined ? metrics.oqs : '--'}/100)</span>
              </h3>
              <button onClick={onCloseFormula} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            <div className="space-y-2 text-xs text-slate-800 dark:text-slate-200">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                يُحسب المؤشر محلياً داخل المتصفح من البيانات الحقيقية فقط بدون أي APIs مدفوعة:
              </p>
              <div className="space-y-1.5 bg-slate-50 dark:bg-[#0B132B] p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                <div className="flex justify-between">
                  <span>1. جودة الإنتاج والمعمل (وزن 25%):</span>
                  <span className="font-bold font-mono text-pink-600 dark:text-pink-400">{metrics?.prodScore || 100} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>2. موثوقية المنتجات (وزن 25%):</span>
                  <span className="font-bold font-mono text-pink-600 dark:text-pink-400">{metrics?.reliabScore || 100} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>3. رضا العملاء ومؤشر NPS (وزن 20%):</span>
                  <span className="font-bold font-mono text-cyan-600 dark:text-cyan-400">{metrics?.custScore || 100} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>4. جودة خامات الموردين SQS (وزن 15%):</span>
                  <span className="font-bold font-mono text-cyan-600 dark:text-cyan-400">{metrics?.suppScore || 100} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>5. دقة المقاسات (وزن 15%):</span>
                  <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{metrics?.sizingFitScore || 100} / 100</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={onCloseFormula} className="h-6.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-md font-bold text-xs cursor-pointer">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Data Lineage Drawer */}
      {lineageDrawer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 select-none" dir="rtl" onClick={onCloseLineage}>
          <div className="bg-white dark:bg-[#111C38] rounded-xl max-w-xl w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-xs text-slate-900 dark:text-white">{lineageDrawer.title} ({lineageDrawer.records?.length || 0} سجل حقيقي)</h3>
              <button onClick={onCloseLineage} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            <div className="overflow-y-auto space-y-1.5 flex-1 custom-scrollbar">
              {(!lineageDrawer.records || lineageDrawer.records.length === 0) ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">لا توجد سجلات تفصيلية مسجلة لهذه الفئة حتى الآن.</div>
              ) : (
                lineageDrawer.records.map((rec, idx) => (
                  <div key={idx} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B132B] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-[11px]">
                        {rec.inspection_id ? `فحص #${rec.inspection_id}` : rec.defect_id ? `عيب #${rec.defect_id}` : rec.order_no ? `طلب #${rec.order_no}` : (rec.exp_no || `سجل #${idx+1}`)}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                        {rec.product_name || rec.defect_type || rec.customer_name || rec.notes || '--'}
                      </div>
                    </div>
                    <div className="text-left font-mono font-bold text-rose-600 dark:text-rose-400 text-[11px]">
                      {rec.rework_cost ? `${parseFloat(rec.rework_cost).toLocaleString('en-US')} ${currencyDisplay}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button onClick={onCloseLineage} className="h-6.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-md font-bold text-xs cursor-pointer">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

window.QualityDrawerAndFormula = QualityDrawerAndFormula;
