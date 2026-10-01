// AdvancesModal.jsx - نافذة إدارة وتسجيل السلف وتفاصيل أقساطها المقتطعة
function AdvancesModal({
  isOpen,
  onClose,
  onSubmitAdvance,
  employees = [],
  advanceEmp,
  setAdvanceEmp,
  advanceAmount,
  setAdvanceAmount,
  advanceBox,
  setAdvanceBox,
  advanceNotes,
  setAdvanceNotes,
  submittingAdvance,
}) {
  if (!isOpen) return null;

  const inputCls =
    "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-[#E8E5EA] shadow-2xl overflow-hidden animate-scaleUp">
        <div className="p-5 border-b border-[#E8E5EA] flex justify-between items-center bg-gradient-to-r from-[#F2E7F3] via-white to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8F2A87] text-white flex items-center justify-center text-lg font-bold">
              💸
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">
                صرف سلفة نقدية للعاملين (Cash Advance)
              </h3>
              <p className="text-xs text-[#6F6B75]">
                تقييد مدين بحساب (ACC-107) وخصم من الخزينة المحددة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E8E5EA] flex items-center justify-center text-sm font-bold text-[#6F6B75] hover:bg-[#E8E5EA] transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmitAdvance} className="p-6 space-y-4 text-right">
          <div>
            <label className={labelCls}>
              الموظف المستفيد <span className="text-[#D64545]">*</span>
            </label>
            <select
              value={advanceEmp}
              onChange={(e) => setAdvanceEmp(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">-- اختر الموظف --</option>
              {employees
                .filter((e) => e.status === "نشط")
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role} • {emp.type || "راتب شهري"})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                مبلغ السلفة <span className="text-[#D64545]">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                required
                placeholder="0.00"
                className={`${inputCls} font-mono font-bold text-[#8F2A87]`}
              />
            </div>
            <div>
              <label className={labelCls}>
                الخزينة المنصرف منها <span className="text-[#D64545]">*</span>
              </label>
              <select
                value={advanceBox}
                onChange={(e) => setAdvanceBox(e.target.value)}
                className={inputCls}
                required
              >
                <option value="ACC-101-1">الصندوق الرئيسي (ريال يمني - YER)</option>
                <option value="ACC-101-2">الصندوق الرئيسي (ريال سعودي - SAR)</option>
                <option value="ACC-101-3">الصندوق الرئيسي (دولار - USD)</option>
                <option value="ACC-103">حساب بنك الكريمي (YER)</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>البيان وسبب السلفة</label>
            <textarea
              rows="2"
              value={advanceNotes}
              onChange={(e) => setAdvanceNotes(e.target.value)}
              placeholder="مثال: سلفة نقدية تحت حساب الراتب لشهر..."
              className={`${inputCls} h-auto py-2`}
            />
          </div>

          <div className="bg-[#FAFAFB] p-3.5 rounded-xl border border-[#E8E5EA] text-[11px] text-[#6F6B75] space-y-1">
            <div className="flex justify-between">
              <span>الأثر المحاسبي:</span>
              <span className="font-bold text-[#25232A]">
                من حـ/ سلف وذمم العاملين (ACC-107)
              </span>
            </div>
            <div className="flex justify-between">
              <span>إلى حـ/:</span>
              <span className="font-bold text-[#25232A]">
                الصندوق المنصرف منه ({advanceBox})
              </span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold pt-1 border-t border-[#E8E5EA]">
              ✓ سيتم خصم هذه السلفة آلياً عند احتساب وإصدار مسير رواتب الشهر المحدد.
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold text-xs rounded-xl border border-[#E8E5EA] transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submittingAdvance}
              className="flex-2 py-3 bg-[#8F2A87] hover:bg-[#73216C] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>💸</span>
              <span>
                {submittingAdvance ? "جاري ترحيل السند..." : "صرف السلفة وإصدار السند"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
