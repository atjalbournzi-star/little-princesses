// src/features/quality/components/QualityActionModal.jsx
// نافذة الفحص الفني ومحطة التفتيش الكوتور وإصدار تذاكر التعديل المتوافقة مع هوية السندات المالية

const { useState } = React;

function QualityActionModal({
  item,
  onClose,
  isSubmitting,
  showReworkDrawer, setShowReworkDrawer,
  defectReason, setDefectReason,
  reworkAction, setReworkAction,
  reworkHours, setReworkHours,
  onApprove,
  onRework
}) {
  if (!item) return null;
  const specs = window.QC_CHECKLIST_SPECS || [];
  const defectOptions = window.DEFECT_REASONS || [];

  const [checklist, setChecklist] = useState({
    measurements: 'pass',
    stitching: 'pass',
    embellishment: 'pass',
    finishing: 'pass'
  });

  const setItemStatus = (id, val) => {
    setChecklist(prev => ({ ...prev, [id]: val }));
    if (val === 'fail') setShowReworkDrawer(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-fadeIn select-none" dir="rtl">
      <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full p-4 shadow-2xl text-right max-h-[92vh] overflow-y-auto space-y-3">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-amber-600 dark:text-amber-400 font-mono font-bold text-xs">#{item.order_no}</span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-900 dark:text-white font-bold text-xs">{item.product_name}</span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold text-xs">{item.child_name}</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-600 dark:text-slate-400">
                <span>الخياط:</span>
                <strong className="text-slate-900 dark:text-white font-bold">{item.tailor_name || item.tailor || '—'}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                قيد الفحص الفني قبل التسليم
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs cursor-pointer transition shrink-0"
          >✕</button>
        </div>

        {/* قائمة معايير الفحص الفني الأربعة */}
        <div className="space-y-1.5">
          {specs.map(spec => {
            const isPass = checklist[spec.id] === 'pass';
            return (
              <div key={spec.id} className="p-2 rounded-lg bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-slate-900 dark:text-white font-bold text-[11px]">{spec.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] truncate">{spec.desc}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setItemStatus(spec.id, 'pass')}
                    className={`h-6 px-2.5 rounded-md text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1 ${
                      isPass ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                    }`}
                  >✓ Pass</button>
                  <button
                    type="button"
                    onClick={() => setItemStatus(spec.id, 'fail')}
                    className={`h-6 px-2.5 rounded-md text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1 ${
                      !isPass ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                    }`}
                  >⚠ Fail</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* درج تفاصيل تذكرة التعديل */}
        {showReworkDrawer && (
          <div className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 space-y-2 animate-fadeIn">
            <span className="text-slate-900 dark:text-white font-bold text-xs block">
              تفاصيل تذكرة التعديل وإرجاع الفستان للورشة
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <label className="text-slate-700 dark:text-slate-300 font-bold text-[10.5px] block mb-1">نوع العيب المرصود</label>
                <select
                  value={defectReason}
                  onChange={e => setDefectReason(e.target.value)}
                  className="w-full h-7 px-2 rounded-md bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[10.5px] outline-none"
                >
                  {defectOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="text-slate-700 dark:text-slate-300 font-bold text-[10.5px] block mb-1">ساعات التعديل المتوقعة</label>
                <input
                  type="number"
                  step="0.5"
                  value={reworkHours}
                  onChange={e => setReworkHours(e.target.value)}
                  className="w-full h-7 px-2 rounded-md bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[10.5px] outline-none"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-slate-700 dark:text-slate-300 font-bold text-[10.5px] block mb-1">الإجراء المطلوب من الخياط</label>
                <input
                  type="text"
                  value={reworkAction}
                  onChange={e => setReworkAction(e.target.value)}
                  placeholder="مثال: ضبط الصدر 2 سم"
                  className="w-full h-7 px-2 rounded-md bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-[10.5px] outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* أزرار الإجراء الفعلي */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={isSubmitting}
            className={`flex-1 h-7.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>جاري الاعتماد...</span>
              </span>
            ) : (
              <>
                <span>✓</span>
                <span>اعتماد ومطابق للمواصفات</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={e => {
              if (!showReworkDrawer) setShowReworkDrawer(true);
              else onRework(e);
            }}
            disabled={isSubmitting}
            className={`flex-1 h-7.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <span>⚠</span>
            <span>{showReworkDrawer ? 'تأكيد تذكرة التعديل' : 'إصدار تذكرة تعديل للخياط'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

window.QualityActionModal = QualityActionModal;
