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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">📥 تصدير التقارير والتنسيقات المعتمدة</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 font-black text-base">✕</button>
            </div>
            <p className="text-xs text-slate-600 font-bold">اختر صيغة التصدير المطلوبة مع الحفاظ الصارم على سلامة البيانات التاريخية:</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { fmt: 'sheets', label: 'Google Sheets 🟢', icon: '📊' },
                { fmt: 'excel', label: 'Excel (.xlsx)', icon: '📗' },
                { fmt: 'pdf', label: 'PDF Report 📕', icon: '📄' }
              ].map(opt => (
                <button
                  key={opt.fmt}
                  onClick={async () => {
                    const res = await window.marketingAPI.exportReport(opt.fmt, 'executive');
                    if (showToast) showToast(res.message);
                    setShowExportModal(false);
                  }}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center hover:bg-rose-50 hover:border-rose-300 transition space-y-1"
                >
                  <span className="text-xl block">{opt.icon}</span>
                  <span className="text-[10px] font-black text-slate-800 block">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── مودال تحليل المحادثة (Customer Intelligence) ── */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">💬 Conversation Intelligence - {selectedCustomerDetail.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold">هاتف: {selectedCustomerDetail.phone}</p>
              </div>
              <button onClick={() => setSelectedCustomerDetail(null)} className="text-slate-400 hover:text-slate-600 font-black text-base">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 space-y-1">
                <p className="font-black text-indigo-900">درجة النية الحالية: {selectedCustomerDetail.intent_score}/100 🎯</p>
                <p className="text-slate-700 text-[11px]">{selectedCustomerDetail.notes}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 space-y-1">
                <p className="font-black text-emerald-900">🤖 الرد الذكي المقترح مقدماً من AI:</p>
                <p className="text-emerald-800 text-[11px] leading-relaxed">
                  {selectedCustomerDetail.suggested_reply || `أهلاً بك يا ${selectedCustomerDetail.name}! يسعدنا خدمتك وتلبية استفساراتك حول كافة منتجاتنا وخدماتنا المتميزة.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCustomerDetail(null)}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition"
            >إغلاق</button>
          </div>
        </div>
      )}

      {/* ── مودال تفاصيل المنتج ── */}
      {selectedProductDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">📈 Product Marketing Lifecycle - {selectedProductDetail.model_name}</h3>
                <p className="text-[10px] text-slate-400 font-bold">ROAS: {selectedProductDetail.roas}x • الربح: {selectedProductDetail.profit} {currLabel}</p>
              </div>
              <button onClick={() => setSelectedProductDetail(null)} className="text-slate-400 hover:text-slate-600 font-black text-base">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900">💡 تشخيص الذكاء الاصطناعي الكامل للمنتج:</h4>
                <p className="text-slate-700"><strong className="text-emerald-700">سبب النجاح:</strong> {selectedProductDetail.ai_diagnosis?.why_success || 'دقة التطريز العالية والطلب في الموسم'}</p>
                <p className="text-slate-700"><strong className="text-indigo-700">تفضيلات العملاء:</strong> {selectedProductDetail.ai_diagnosis?.customer_likes || 'التصميم الملكي والفخامة'}</p>
                <p className="text-slate-700"><strong className="text-rose-700">الاعتراض الرئيس:</strong> {selectedProductDetail.ai_diagnosis?.top_objections || 'السعر والتخوف من التوصيل'}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedProductDetail(null)}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition"
            >إغلاق</button>
          </div>
        </div>
      )}
    </>
  );
}

window.MarketingModals = MarketingModals;
