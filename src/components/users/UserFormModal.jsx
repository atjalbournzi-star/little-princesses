/**
 * ============================================================================
 * UserFormModal.jsx — Add & Edit User Form Card
 * Architecture: Modular Users Module | Little Princesses ERP
 * ============================================================================
 */

function UserFormModal({
  showAddForm,
  setShowAddForm,
  editingUser,
  formData,
  setFormData,
  handleSave,
  rolesList
}) {
  if (!showAddForm) return null;

  return (
    <form onSubmit={handleSave} className="p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-pink-50/20 to-slate-50 border border-slate-200 space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
          <span>{editingUser ? '✏️ تعديل بيانات المستخدم' : '👤 إضافة مستخدم جديد للنظام'}</span>
        </h3>
        <button
          type="button"
          onClick={() => setShowAddForm(false)}
          className="text-xs text-slate-500 hover:text-slate-700 font-bold"
        >
          إلغاء ✕
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم المستخدم (Username) *</label>
          <input
            type="text"
            required
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold focus:border-[#00ACC1] focus:ring-2 focus:ring-cyan-100 outline-none"
            placeholder=""
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكامل (Full Name)</label>
          <input
            type="text"
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:border-[#00ACC1] focus:ring-2 focus:ring-cyan-100 outline-none"
            placeholder=""
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            {editingUser ? 'كلمة المرور (اتركه فارغاً للإبقاء عليها)' : 'كلمة المرور *'}
          </label>
          <input
            type="password"
            required={!editingUser}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold focus:border-[#00ACC1] focus:ring-2 focus:ring-cyan-100 outline-none"
            placeholder={editingUser ? '••••••••' : 'كلمة المرور'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">الدور الوظيفي والصلاحيات *</label>
          <select
            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:border-[#00ACC1] focus:ring-2 focus:ring-cyan-100 outline-none"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            {rolesList.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active === 1}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
            className="w-4 h-4 rounded text-[#D81B60] focus:ring-[#00ACC1]"
          />
          <span>الحساب نشط ومفعّل لتسجيل الدخول</span>
        </label>

        <button
          type="submit"
          className="h-9 px-6 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <span>💾</span>
          <span>{editingUser ? 'تحديث المستخدم' : 'حفظ المستخدم الجديد'}</span>
        </button>
      </div>
    </form>
  );
}

window.UserFormModal = UserFormModal;
