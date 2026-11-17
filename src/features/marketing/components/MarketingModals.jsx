// src/features/marketing/components/MarketingModals.jsx
// ====================================================================
// Component: MarketingModals — نوافذ التصدير + تحليل المحادثة + تفاصيل المنتج
// ====================================================================

function MarketingModals({
  showExportModal, setShowExportModal,
  selectedCustomerDetail, setSelectedCustomerDetail,
  selectedProductDetail, setSelectedProductDetail,
  showToast, currLabel
}) {
  return (
    <>
      {/* ── مودال تصدير التقارير ── */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-fadeIn select-none">
          <div className="bg-white dark:bg-[#111C38] rounded-xl p-4 max-w-md w-full space-y-3 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">تصدير التقارير التسويقية</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm cursor-pointer">✕</button>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">اختر صيغة التصدير المطلوبة مع الحفاظ على دقة الأرقام المحاسبية:</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { fmt: 'sheets', label: 'Google Sheets' },
                { fmt: 'excel', label: 'Excel (.xlsx)' },
                { fmt: 'pdf', label: 'PDF Report' }
              ].map(opt => (
                <button
                  key={opt.fmt}
                  onClick={async () => {
                    const res = await window.marketingAPI.exportReport(opt.fmt, 'executive');
                    if (showToast) showToast(res.message);
                    setShowExportModal(false);
                  }}
                  className="p-2.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer"
                >
                  <span className="text-[11px] font-bold text-slate-800 dark:text-white block">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── مودال تحليل المحادثة (Customer Intelligence) ── */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-fadeIn select-none">
          <div className="bg-white dark:bg-[#111C38] rounded-xl p-4 max-w-lg w-full space-y-3 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">تحليل محادثة - {selectedCustomerDetail.name}</h3>
                <p className="text-[10px] text-slate-400 font-mono">هاتف: {selectedCustomerDetail.phone}</p>
              </div>
              <button onClick={() => setSelectedCustomerDetail(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm cursor-pointer">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-1">
                <p className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">درجة النية الحالية: {selectedCustomerDetail.intent_score}/100</p>
                <p className="text-slate-700 dark:text-slate-200 text-[10.5px]">{selectedCustomerDetail.notes}</p>
              </div>
              <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1">
                <p className="font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">الرد المقترح من AI:</p>
                <p className="text-slate-700 dark:text-slate-200 text-[10.5px] leading-relaxed">
                  {selectedCustomerDetail.suggested_reply || `أهلاً بك يا ${selectedCustomerDetail.name}! يسعدنا خدمتك وتلبية استفساراتك حول كافة منتجاتنا وخدماتنا المتميزة.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCustomerDetail(null)}
              className="w-full h-7 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs transition cursor-pointer"
            >إغلاق</button>
          </div>
        </div>
      )}

      {/* ── مودال تفاصيل المنتج ── */}
      {selectedProductDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-fadeIn select-none">
          <div className="bg-white dark:bg-[#111C38] rounded-xl p-4 max-w-xl w-full space-y-3 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs">تفاصيل المنتج - {selectedProductDetail.model_name}</h3>
                <p className="text-[10px] text-slate-400 font-mono">ROAS: {selectedProductDetail.roas}x • الربح: {selectedProductDetail.profit} {currLabel}</p>
              </div>
              <button onClick={() => setSelectedProductDetail(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-sm cursor-pointer">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 dark:bg-[#0F172A] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h4 className="font-bold text-slate-900 dark:text-white text-[11px]">تشخيص الذكاء الاصطناعي:</h4>
                <p className="text-slate-700 dark:text-slate-200 text-[10.5px]"><strong className="text-emerald-600 dark:text-emerald-400">سبب النجاح:</strong> {selectedProductDetail.ai_diagnosis?.why_success || 'دقة التطريز العالية والطلب في الموسم'}</p>
                <p className="text-slate-700 dark:text-slate-200 text-[10.5px]"><strong className="text-indigo-600 dark:text-indigo-400">تفضيلات العملاء:</strong> {selectedProductDetail.ai_diagnosis?.customer_likes || 'التصميم الملكي والفخامة'}</p>
                <p className="text-slate-700 dark:text-slate-200 text-[10.5px]"><strong className="text-rose-600 dark:text-rose-400">الاعتراض الرئيس:</strong> {selectedProductDetail.ai_diagnosis?.top_objections || 'السعر والتخوف من التوصيل'}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedProductDetail(null)}
              className="w-full h-7 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs transition cursor-pointer"
            >إغلاق</button>
          </div>
        </div>
      )}
    </>
  );
}

if (typeof window !== 'undefined') {
  window.MarketingModals = MarketingModals;
}
