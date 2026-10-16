// AdvancesModal.jsx - نافذة إدارة وتسجيل السلف وتفاصيل أقساطها المقتطعة
function AdvancesModal({
  isOpen, onClose, onSubmitAdvance, employees = [],
  advanceEmp, setAdvanceEmp, advanceAmount, setAdvanceAmount,
  advanceBox, setAdvanceBox, advanceNotes, setAdvanceNotes, submittingAdvance, onSuccess
}) {
  const [loading, setLoading] = React.useState(false);
  if (!isOpen) return null;

  const inputCls = "w-full h-7 px-2.5 rounded-lg border border-slate-700 bg-[#0F172A] text-white text-xs font-medium placeholder:text-slate-500 focus:border-pink-500 outline-none transition";
  const labelCls = "block text-[11px] font-semibold text-slate-300 mb-0.5";

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(advanceAmount);
    if (!advanceEmp || !amt || amt <= 0) {
      if (typeof window.showToast === 'function') window.showToast('يرجى تحديد الموظف وإدخال مبلغ سلفة صحيح ⚠️', 'error');
      return;
    }
    setLoading(true);
    try {
      const empObj = employees.find(emp => emp.id === advanceEmp || emp.name === advanceEmp);
      const selectedEmployeeId = empObj ? empObj.id : advanceEmp;
      const employeeName = empObj ? empObj.name : advanceEmp;
      const notes = advanceNotes || `سلفة نقدية للموظف ${employeeName}`;
      
      let ok = false;
      if (typeof onSubmitAdvance === 'function') {
        ok = await onSubmitAdvance(e);
      } else {
        const res = await fetch('/api/hr/employees/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emp_id: selectedEmployeeId, emp_name: employeeName, amount: amt,
            currency: 'YER', account_id: advanceBox || 'ACC-101-1', notes: notes
          })
        }).then(r => r.json());
        if (res?.success) {
          ok = true;
          if (typeof window.showToast === 'function') window.showToast(res.message || 'تم صرف السلفة وتقييدها بنجاح ✅', 'success');
        } else {
          throw new Error(res?.error || 'فشل في حفظ السلفة');
        }
      }

      if (ok !== false) {
        if (typeof setAdvanceAmount === 'function') setAdvanceAmount('');
        if (typeof setAdvanceNotes === 'function') setAdvanceNotes('');
        if (typeof onClose === 'function') onClose();
      }
    } catch (error) {
      if (typeof window.showToast === 'function') window.showToast(error.message || 'فشل في حفظ السلفة النقدية ⚠️', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || submittingAdvance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm select-none" dir="rtl">
      <div className="w-full max-w-lg bg-[#111C38] border border-slate-700 rounded-xl shadow-2xl overflow-hidden p-0 flex flex-col select-none text-right animate-scaleUp">
        {/* ترويسة داكنة مدمجة */}
        <div className="h-8 px-3.5 flex items-center justify-between border-b border-slate-800 bg-[#0F172A] shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" />
            </svg>
            <h3 className="font-bold text-xs text-white">صرف سلفة نقدية للعاملين (Cash Advance)</h3>
          </div>
          <button type="button" onClick={onClose} className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* نموذج تسجيل السلفة المدمج */}
        <form onSubmit={handleAdvanceSubmit} className="p-3 space-y-2 text-right">
          <div>
            <label className={labelCls}>الموظف المستفيد <span className="text-rose-400 font-bold">*</span></label>
            <select value={advanceEmp} onChange={(e) => setAdvanceEmp(e.target.value)} className={inputCls} required>
              <option value="">-- اختر الموظف --</option>
              {employees.filter((e) => e.status === "نشط").map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.role} • {emp.type || "راتب شهري"})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>مبلغ السلفة <span className="text-rose-400 font-bold">*</span></label>
              <input type="number" min="1" step="any" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} required placeholder="0.00" className={`${inputCls} font-mono font-bold text-emerald-400`} />
            </div>
            <div>
              <label className={labelCls}>الخزينة المنصرف منها <span className="text-rose-400 font-bold">*</span></label>
              <select value={advanceBox} onChange={(e) => setAdvanceBox(e.target.value)} className={inputCls} required>
                <option value="ACC-101-1">الصندوق الرئيسي (ريال يمني - YER)</option>
                <option value="ACC-101-2">الصندوق الرئيسي (ريال سعودي - SAR)</option>
                <option value="ACC-101-3">الصندوق الرئيسي (دولار - USD)</option>
                <option value="ACC-102-2">حساب بنك الكريمي / المحافظ (YER)</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>البيان وملاحظات السلفة</label>
            <input type="text" value={advanceNotes} onChange={(e) => setAdvanceNotes(e.target.value)} placeholder="مثال: سلفة نقدية تحت حساب الراتب..." className={inputCls} />
          </div>

          {/* بوكس الأثر المحاسبي الأنيق */}
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[10.5px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">الأثر المحاسبي:</span>
              <span className="font-bold text-white">من حـ/ سلف وذمم العاملين (ACC-107)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">إلى حـ/:</span>
              <span className="font-bold text-white">الصندوق المنصرف منه ({advanceBox})</span>
            </div>
            <div className="text-[9.5px] text-emerald-400 font-semibold pt-0.5 border-t border-slate-800 flex items-center gap-1">
              <span>✓</span><span>تُخصم السلفة آلياً عند إصدار مسير رواتب الشهر المحدد.</span>
            </div>
          </div>

          {/* شريط الأزرار السفلي */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="h-6.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-md transition cursor-pointer">
              إلغاء
            </button>
            <button type="submit" disabled={isBusy} className="h-6.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
              <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" />
              </svg>
              <span>{isBusy ? "جاري ترحيل السند..." : "صرف السلفة وإصدار السند"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.AdvancesModal = AdvancesModal;
window.AdvanceModal = AdvancesModal;
