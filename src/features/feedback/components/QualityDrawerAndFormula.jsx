// src/features/feedback/components/QualityDrawerAndFormula.jsx
// نافذة معادلة احتساب مؤشر الجودة OQS ودرج تتبع السجلات والبيانات الحقيقية

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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onCloseFormula}>
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#E8E5EA] space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">📐 معادلة احتساب مؤشر الجودة العام OQS ({metrics?.oqs !== null && metrics?.oqs !== undefined ? metrics.oqs : '--'}/100)</h3>
              <button onClick={onCloseFormula} className="text-[#6F6B75] hover:text-[#25232A] font-bold cursor-pointer">✕</button>
            </div>
            <div className="space-y-3 text-xs text-[#25232A]">
              <p className="text-[11.5px] text-[#6F6B75]">
                يُحسب المؤشر محلياً داخل المتصفح من البيانات الحقيقية فقط بدون أي APIs مدفوعة:
              </p>
              <div className="space-y-2 bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA]">
                <div className="flex justify-between">
                  <span>1. جودة الإنتاج والمعمل (وزن 25%):</span>
                  <span className="font-bold font-mono text-[#8F2A87]">{metrics?.prodScore || 100} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>2. موثوقية المنتجات (وزن 25%):</span>
                  <span className="font-bold font-mono text-[#8F2A87]">{metrics?.reliabScore || 100} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>3. رضا العملاء ومؤشر NPS (وزن 20%):</span>
                  <span className="font-bold font-mono text-[#007F8C]">{metrics?.custScore || 100} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>4. جودة خامات الموردين SQS (وزن 15%):</span>
                  <span className="font-bold font-mono text-[#007F8C]">{metrics?.suppScore || 100} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span>5. دقة المقاسات (وزن 15%):</span>
                  <span className="font-bold font-mono text-[#C97300]">{metrics?.sizingFitScore || 100} / 100</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-[#E8E5EA]">
              <button onClick={onCloseFormula} className="px-5 py-2 bg-[#25232A] text-white rounded-xl font-bold text-xs cursor-pointer">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Data Lineage Drawer */}
      {lineageDrawer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onCloseLineage}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E8E5EA] space-y-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-sm text-[#25232A]">{lineageDrawer.title} ({lineageDrawer.records?.length || 0} سجل حقيقي)</h3>
              <button onClick={onCloseLineage} className="text-[#6F6B75] hover:text-[#25232A] font-bold cursor-pointer">✕</button>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1">
              {(!lineageDrawer.records || lineageDrawer.records.length === 0) ? (
                <div className="text-center py-10 text-[#6F6B75] text-xs">لا توجد سجلات تفصيلية مسجلة لهذه الفئة حتى الآن.</div>
              ) : (
                lineageDrawer.records.map((rec, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#25232A]">
                        {rec.inspection_id ? `فحص #${rec.inspection_id}` : rec.defect_id ? `عيب #${rec.defect_id}` : rec.order_no ? `طلب #${rec.order_no}` : (rec.exp_no || `سجل #${idx+1}`)}
                      </div>
                      <div className="text-[#6F6B75] mt-0.5">
                        {rec.product_name || rec.defect_type || rec.customer_name || rec.notes || '--'}
                      </div>
                    </div>
                    <div className="text-left font-mono font-bold text-[#B0005A]">
                      {rec.rework_cost ? `${parseFloat(rec.rework_cost).toLocaleString('en-US')} ${currencyDisplay}` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-[#E8E5EA]">
              <button onClick={onCloseLineage} className="px-5 py-2 bg-[#25232A] text-white rounded-xl font-bold text-xs cursor-pointer">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

window.QualityDrawerAndFormula = QualityDrawerAndFormula;
