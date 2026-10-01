const { useState } = React;

function UsersPermissionsTab({
  usersList = [],
  loadingUsers,
  onSaveUser,
  onDeleteUser,
  showToast
}) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ id: null, username: '', full_name: '', password: '', role: 'data_entry', is_active: 1 });

  const roles = [
    { value: 'admin', label: 'المدير العام 🛡️', desc: 'صلاحيات كاملة وغير مقيدة على كامل مفاصل النظام' },
    { value: 'accountant', label: 'المحاسب المالي 💼', desc: 'القيود، السندات، شجرة الحسابات، والتقارير المالية' },
    { value: 'data_entry', label: 'مسؤولة المعرض والمبيعات 🛍️', desc: 'إدارة الطلبات، نقاط البيع، العملاء، ومتابعة العربون' },
    { value: 'workshop_manager', label: 'مدير الورشة والمعمل 🧵', desc: 'أوامر التشغيل، مراحل التفصيل، المخزون، والخياطين' }
  ];

  const filteredUsers = usersList.filter(u => {
    const q = search.toLowerCase();
    return (u.username || '').toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q);
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ id: null, username: '', full_name: '', password: '', role: 'data_entry', is_active: 1 });
    setShowModal(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({ id: u.id, username: u.username, full_name: u.full_name || '', password: '', role: u.role || 'data_entry', is_active: u.is_active !== undefined ? u.is_active : 1 });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username.trim()) return showToast && showToast('اسم المستخدم مطلوب', 'error');
    if (!editingUser && !formData.password) return showToast && showToast('كلمة المرور مطلوبة للمستخدم الجديد', 'error');
    onSaveUser(formData, () => setShowModal(false));
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-5 p-6">
      {/* الترويسة وأزرار التحكم */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5EA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-lg font-bold">
            👥
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#25232A] flex items-center gap-2">
              إدارة المستخدمين وصلاحيات الأدوار (RBAC Governance)
            </h3>
            <p className="text-xs text-[#6F6B75]">التحكم في وصول الموظفين حسب المسؤولية، وتأمين كلمات المرور</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="h-10 px-5 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <span>➕</span>
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* شريط البحث السريع */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالاسم، اسم المستخدم، أو الدور..."
          className="w-full sm:w-80 h-10 px-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs outline-none focus:border-[#B0005A]"
        />
        <span className="text-xs text-[#6F6B75] font-mono">({filteredUsers.length} مستخدم)</span>
      </div>

      {/* جدول الحسابات والمستخدمين */}
      <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
              <th className="px-4 py-3 text-right">المستخدم</th>
              <th className="px-4 py-3 text-right">الاسم الكامل</th>
              <th className="px-4 py-3 text-right">الدور الوظيفي (Role)</th>
              <th className="px-4 py-3 text-center">الحالة</th>
              <th className="px-4 py-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E5EA] bg-white">
            {loadingUsers ? (
              <tr><td colSpan="5" className="text-center py-8 text-[#6F6B75]">جارٍ تحميل المستخدمين...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-[#6F6B75]">لا يوجد مستخدمين مطابقين للبحث.</td></tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id || u.username} className="hover:bg-[#FAFAFB] transition">
                  <td className="px-4 py-3 font-mono font-bold text-[#25232A]">{u.username}</td>
                  <td className="px-4 py-3 font-medium text-[#25232A]">{u.full_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-md text-[10.5px] font-bold border bg-[#FCE8F2] text-[#B0005A] border-[#F2A4CB]">
                      {roles.find(r => r.value === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.is_active !== 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {u.is_active !== 0 ? 'نشط 🟢' : 'معطل 🔴'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => handleOpenEdit(u)} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#25232A] text-[11px] font-bold transition cursor-pointer">
                        تعديل ✏️
                      </button>
                      {u.username !== 'admin' && (
                        <button type="button" onClick={() => onDeleteUser(u)} className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition cursor-pointer">
                          حذف 🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* نافذة إضافة / تعديل مستخدم */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E8E5EA] shadow-xl overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 border-b border-[#E8E5EA] flex justify-between items-center bg-[#FAFAFB]">
              <span className="font-bold text-sm text-[#25232A]">{editingUser ? 'تعديل المستخدم وصلاحياته' : 'إضافة مستخدم جديد'}</span>
              <button type="button" onClick={() => setShowModal(false)} className="text-[#6F6B75] hover:text-black font-bold">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#25232A] mb-1">اسم المستخدم *</label>
                <input type="text" required disabled={editingUser && editingUser.username === 'admin'} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-[#E8E5EA] bg-white outline-none font-mono" />
              </div>
              <div>
                <label className="block font-bold text-[#25232A] mb-1">الاسم الكامل للموظف</label>
                <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-[#E8E5EA] bg-white outline-none" />
              </div>
              <div>
                <label className="block font-bold text-[#25232A] mb-1">كلمة المرور {editingUser && '(اتركها فارغة إذا لم ترغب في التغيير)'}</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingUser ? '••••••••' : 'كلمة المرور'} className="w-full h-10 px-3 rounded-xl border border-[#E8E5EA] bg-white outline-none font-mono" />
              </div>
              <div>
                <label className="block font-bold text-[#25232A] mb-1">الدور الوظيفي والصلاحيات *</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-[#E8E5EA] bg-white outline-none font-bold">
                  {roles.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E5EA]">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-[#25232A] font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-[#B0005A] text-white font-bold hover:bg-[#8E0049]">حفظ المستخدم</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

window.UsersPermissionsTab = UsersPermissionsTab;
