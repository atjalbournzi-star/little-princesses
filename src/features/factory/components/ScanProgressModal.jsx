function ScanProgressModal({
  scanProgressModalOpen,
  setScanProgressModalOpen,
  scanBarcodeQuery,
  setScanBarcodeQuery,
  scannedProgressJob,
  advancingScanProgress,
  handleSearchScanJob,
  handleAdvanceScannedJob,
  handleOpenDeliveryModal,
  stages = []
}) {
  if (!scanProgressModalOpen) return null;
  const utils = window.FactoryUtils || {};
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E8E5EA] dark:border-slate-800 space-y-4 text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 to-[#8F2A87] text-white flex items-center justify-center text-xl shadow-xs">
              📷
            </div>
            <div>
              <h3 className="text-sm font-black text-[#25232A] dark:text-slate-100">مسح باركود بطاقة الفستان (Scan-to-Progress)</h3>
              <p className="text-[11px] text-[#6F6B75] dark:text-slate-400">امسح كود التعليقة أو بطاقة الفستان لترقية المرحلة لحظياً في صالة الورشة</p>
            </div>
          </div>
          <button 
            onClick={() => setScanProgressModalOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Input Barcode Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSearchScanJob(); }} className="space-y-2">
          <label className={labelCls}>امسح بقارئ الباركود أو ادخل رقم الطلب / الكود:</label>
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={scanBarcodeQuery}
              onChange={e => setScanBarcodeQuery(e.target.value)}
              placeholder="مثال: ORD-1001 أو امسح الباركود..."
              className="flex-1 h-11 px-3.5 rounded-xl border-2 border-dashed border-purple-500/60 bg-purple-50/20 dark:bg-slate-950 text-xs font-mono font-bold text-[#25232A] dark:text-slate-100 outline-none focus:border-purple-600"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              تعرف 🎯
            </button>
          </div>
        </form>

        {/* Matched Garment Card */}
        {scannedProgressJob && (() => {
          const curIdx = stages.indexOf(scannedProgressJob.stage);
          const hasNext = curIdx > -1 && curIdx < stages.length - 1;
          const nextStage = hasNext ? stages[curIdx + 1] : null;
          const isReadyOrDone = scannedProgressJob.stage === 'جاهز للتسليم 📦' || scannedProgressJob.stage === 'جاهز للتسليم 🛍️' || scannedProgressJob.stage === 'تم التسليم ✅' || (curIdx === stages.length - 1);

          return (
            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-black text-purple-800 dark:text-purple-300">#{scannedProgressJob.order_no || ('JOB-' + scannedProgressJob.id)}</span>
                  <h4 className="font-bold text-sm text-[#25232A] dark:text-slate-100">{scannedProgressJob.customer_name || scannedProgressJob.customer}</h4>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300">
                  {scannedProgressJob.stage || 'مرحلة الإنتاج'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-purple-200/60 dark:border-purple-800/60">
                <div>
                  <span className="text-[#6F6B75] dark:text-slate-400 block text-[10.5px]">الموديل / الفستان:</span>
                  <span className="font-bold text-[#25232A] dark:text-slate-200">{scannedProgressJob.product || scannedProgressJob.product_name || 'فستان الأميرات'}</span>
                </div>
                <div>
                  <span className="text-[#6F6B75] dark:text-slate-400 block text-[10.5px]">اسم الأميرة:</span>
                  <span className="font-bold text-pink-600 dark:text-pink-400">👧 {scannedProgressJob.child_name || 'الأميرة'}</span>
                </div>
              </div>

              {/* Pipeline Stage Progression */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-[#25232A] dark:text-slate-100">المرحلة الحالية: <strong>{scannedProgressJob.stage}</strong></span>
                  <span className="font-mono font-bold text-[#8F2A87]">{scannedProgressJob.progress || utils.STAGE_PROGRESS?.[scannedProgressJob.stage] || 20}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2" dir="ltr">
                  <div 
                    className="bg-[#8F2A87] h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${scannedProgressJob.progress || utils.STAGE_PROGRESS?.[scannedProgressJob.stage] || 20}%` }}
                  />
                </div>
                {nextStage && (
                  <div className="text-[11px] text-[#007F8C] pt-1 flex items-center gap-1">
                    <span>المرحلة القادمة:</span>
                    <strong className="font-bold">{nextStage}</strong>
                  </div>
                )}
              </div>

              {hasNext && (
                <button
                  type="button"
                  disabled={advancingScanProgress}
                  onClick={handleAdvanceScannedJob}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-700 via-[#8F2A87] to-pink-600 hover:opacity-95 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{advancingScanProgress ? 'جاري الترقية...' : `⏩ ترقية الفستان إلى [${nextStage}]`}</span>
                </button>
              )}

              {isReadyOrDone && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                  <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 block">✨ الفستان مكتمل وجاهز للتسليم!</span>
                  <button
                    type="button"
                    onClick={() => {
                      setScanProgressModalOpen(false);
                      handleOpenDeliveryModal(scannedProgressJob);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    🛍️ تسليم للأميرة وتحصيل المتبقي الآن
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {!scannedProgressJob && (
          <div className="p-6 text-center text-[#6F6B75] dark:text-slate-400 text-xs border border-dashed rounded-2xl">
            <span className="text-3xl block mb-1">🏷️</span>
            وجه ماسح الباركود لبطاقة تعليقة الفستان للتعرف اللحظي والترقية التلقائية
          </div>
        )}
      </div>
    </div>
  );
}

window.ScanProgressModal = ScanProgressModal;
