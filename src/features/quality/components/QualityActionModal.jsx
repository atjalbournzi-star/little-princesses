// src/features/quality/components/QualityActionModal.jsx
// نافذة الفحص الفني ومحطة التفتيش الكوتور وإصدار تذاكر التعديل (Haute-Couture Garment QC Modal)

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn" dir="rtl">
      <div className="bg-[#111C38] border border-slate-700/90 rounded-2xl max-w-xl w-full p-5 shadow-2xl text-right max-h-[92vh] overflow-y-auto space-y-4">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-amber-400 font-mono font-bold text-sm">#{item.order_no}</span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-white font-bold text-sm">{item.product_name}</span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-white font-bold text-sm">{item.child_name}</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 font-medium">
                <span>الخياط:</span>
                <strong className="text-white font-bold">{item.tailor_name}</strong>
              </span>
              <span className="text-slate-500">•</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                قيد الفحص الفني قبل التسليم
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs cursor-pointer transition">✕</button>
        </div>

        {/* قائمة معايير الفحص الفني الأربعة */}
        <div className="space-y-2">
          {specs.map(spec => {
            const isPass = checklist[spec.id] === 'pass';
            return (
              <div key={spec.id} className="p-2.5 rounded-xl bg-[#0B132B] border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-bold text-xs">{spec.title}</h4>
                  <p className="text-slate-300 text-[11px] mt-0.5 truncate">{spec.desc}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setItemStatus(spec.id, 'pass')}
                    className={`h-7.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      isPass ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >✓ Pass</button>
                  <button
                    type="button"
                    onClick={() => setItemStatus(spec.id, 'fail')}
                    className={`h-7.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      !isPass ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >⚠ Fail</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* درج تفاصيل تذكرة التعديل (Rework Drawer) */}
        {showReworkDrawer && (
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2.5 animate-fadeIn">
            <span className="text-white font-bold text-xs block flex items-center gap-1.5">
              <span>✂️</span>
              <span>تفاصيل تذكرة التعديل وإرجاع الفستان للورشة</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <label className="text-white font-bold text-[11px] block mb-1">نوع العيب المرصود</label>
                <select
                  value={defectReason}
                  onChange={e => setDefectReason(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg bg-[#0B132B] border border-slate-700 text-white text-xs outline-none"
                >
                  {defectOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="text-white font-bold text-[11px] block mb-1">ساعات التعديل المتوقعة</label>
                <input
                  type="number"
                  step="0.5"
                  value={reworkHours}
                  onChange={e => setReworkHours(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#0B132B] border border-slate-700 text-white text-xs outline-none"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="text-white font-bold text-[11px] block mb-1">الإجراء المطلوب من الخياط</label>
                <input
                  type="text"
                  value={reworkAction}
                  onChange={e => setReworkAction(e.target.value)}
                  placeholder="مثال: ضبط الصدر 2 سم وإعادة السحاب"
                  className="w-full h-8 px-2.5 rounded-lg bg-[#0B132B] border border-slate-700 text-white text-xs outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* أزرار الإجراء الفعلي */}
        <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={isSubmitting}
            className={`flex-1 h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>جاري الاعتماد وترحيل العمولة...</span>
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
            className={`flex-1 h-9 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <span>⚠</span>
            <span>{showReworkDrawer ? 'تأكيد تذكرة التعديل وإرجاع للخياط' : 'إصدار تذكرة تعديل للخياط'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

window.QualityActionModal = QualityActionModal;
