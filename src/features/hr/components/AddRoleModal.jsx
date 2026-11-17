// AddRoleModal.jsx - نافذة منبثقة سريعة لإضافة مسمى وظيفي أو تخصص إنتاجي جديد
const { useState: useAddRoleState } = React;

function AddRoleModal({ isOpen, onClose, onRoleAdded, showToast }) {
  const [roleName, setRoleName] = useAddRoleState("");
  const [deptName, setDeptName] = useAddRoleState("المعمل والإنتاج");
  const [isProduction, setIsProduction] = useAddRoleState(true);
  const [isSaving, setIsSaving] = useAddRoleState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) return;
    setIsSaving(true);
    try {
      const api = window.JobRolesService || window.jobRolesAPI;
      const res = await api.addJobRole({
        role_name: roleName.trim(),
        department: deptName.trim() || "المعمل والإنتاج",
        is_production: Boolean(isProduction)
      });
      if (showToast) showToast(`تمت إضافة المسمى الوظيفي (${roleName}) بنجاح 👑`, "success");
      if (onRoleAdded) onRoleAdded(res);
      setRoleName("");
      onClose();
    } catch (err) {
      if (showToast) showToast(err.message || "حدث خطأ أثناء حفظ المسمى الوظيفي ⚠️", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls = "w-full h-7 px-2.5 rounded-lg border border-slate-700 bg-[#0F172A] text-white text-xs font-medium focus:border-pink-500 outline-none transition";
  const labelCls = "block text-[11px] font-semibold text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm select-none" dir="rtl">
      <div className="w-full max-w-sm bg-[#111C38] border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-right animate-scaleUp">
        <div className="h-8 px-3.5 flex items-center justify-between border-b border-slate-800 bg-[#0F172A]">
          <div className="flex items-center gap-1.5">
            <span className="text-pink-400 text-xs">✨</span>
            <h4 className="font-bold text-xs text-white">إضافة مسمى وظيفي أو تخصص إنتاجي</h4>
          </div>
          <button type="button" onClick={onClose} className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer text-xs">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2.5">
          <div>
            <label className={labelCls}>
              اسم المسمى الوظيفي <span className="text-rose-400 font-bold">*</span>
            </label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="مثال: فني طباعة حرارية، مصممة باترون..."
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>القسم التابع له</label>
            <input
              type="text"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="مثال: المعمل والإنتاج، الإدارة، المستودع..."
              className={inputCls}
            />
          </div>

          <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
            <label className={labelCls + " mb-0"}>تصنيف طبيعة العمل:</label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setIsProduction(true)}
                className={`p-1.5 rounded-lg border text-right transition cursor-pointer flex flex-col gap-0.5 ${
                  isProduction
                    ? "bg-pink-950/60 border-pink-500 text-pink-200"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-[11px]">
                  <span>⚡</span><span>تخصص إنتاجي</span>
                </div>
                <span className="text-[9.5px] opacity-75">مرتبط بتسعيرة BOM والتصنيع</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProduction(false)}
                className={`p-1.5 rounded-lg border text-right transition cursor-pointer flex flex-col gap-0.5 ${
                  !isProduction
                    ? "bg-cyan-950/60 border-cyan-500 text-cyan-200"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-1 font-bold text-[11px]">
                  <span>🏢</span><span>وظيفة إدارية</span>
                </div>
                <span className="text-[9.5px] opacity-75">وظيفة إشرافية ومساندة</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="h-6.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-md cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving || !roleName.trim()}
              className="h-6.5 px-3.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-md transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "جارٍ الحفظ..." : "إضافة وتفعيل 👑"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.AddRoleModal = AddRoleModal;
