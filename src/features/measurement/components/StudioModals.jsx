// src/features/measurement/components/StudioModals.jsx
// Modals for adding custom measurement and exporting ERP JSON / WhatsApp formatted text

const { useState } = React;

function StudioModals({
  customModalOpen, onCloseCustomModal, onConfirmAddCustom,
  jsonModalOpen, onCloseJsonModal,
  jsonPayload, whatsappText, onCopyText,
  onApprove, syncStatus
}) {
  const [name, setName] = useState('');
  const [mult, setMult] = useState(1);
  const [color, setColor] = useState('#f43f5e');

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirmAddCustom(name.trim(), mult, color);
    setName('');
    onCloseCustomModal();
  };

  return (
    <React.Fragment>
      {/* 1. Add Custom Measurement Modal */}
      {customModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl text-right">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>➕</span> إضافة خط قياس مخصص للموديل
              </h3>
              <button type="button" onClick={onCloseCustomModal} className="text-slate-400 hover:text-white cursor-pointer text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleAddCustom} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">اسم القياس (بالعربية):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: وسع الرقبة، عرض الذيل..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">طريقة حساب المقاس:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer ${mult === 1 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
                    <input type="radio" name="customMult" value="1" checked={mult === 1} onChange={() => setMult(1)} className="accent-emerald-500" />
                    <span>مباشر (1:1) للأطوال</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer ${mult === 2 ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
                    <input type="radio" name="customMult" value="2" checked={mult === 2} onChange={() => setMult(2)} className="accent-emerald-500" />
                    <span>محيط (×2) للدوران</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">لون خط القياس:</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-9 h-8 rounded bg-transparent border border-slate-700 cursor-pointer" />
                  <span className="text-xs text-slate-400">اختر لوناً مميزاً على القماش</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={onCloseCustomModal} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer">إلغاء</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer shadow">إضافة للوحة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ERP JSON & WhatsApp Modal */}
      {jsonModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl flex flex-col max-h-[85vh] text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>⚡</span> اعتماد وإرسال المقاسات للنظام
              </h3>
              <button type="button" onClick={onCloseJsonModal} className="text-slate-400 hover:text-white cursor-pointer font-bold text-lg">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3 overflow-y-auto flex-1">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-400">كائن JSON المعتمد:</span>
                  <button type="button" onClick={() => onCopyText(JSON.stringify(jsonPayload, null, 2), 'تم نسخ الـ JSON!')} className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-200 cursor-pointer">نسخ</button>
                </div>
                <pre className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-emerald-300 overflow-auto dir-ltr text-left max-h-64">
                  {JSON.stringify(jsonPayload, null, 2)}
                </pre>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-400">نص الواتساب المنسق:</span>
                  <button type="button" onClick={() => onCopyText(whatsappText, 'تم نسخ نص الواتساب!')} className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-200 cursor-pointer">نسخ</button>
                </div>
                <textarea
                  readOnly
                  value={whatsappText}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 leading-relaxed outline-none resize-none max-h-64"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button type="button" onClick={onCloseJsonModal} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer">إغلاق</button>
              {onApprove && (
                <button
                  type="button"
                  onClick={() => { onApprove(); onCloseJsonModal(); }}
                  disabled={syncStatus === 'saving'}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>🚀</span>
                  <span>{syncStatus === 'saving' ? 'جار الاعتماد...' : 'اعتماد وحفظ للمصنع'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

window.StudioModals = StudioModals;
