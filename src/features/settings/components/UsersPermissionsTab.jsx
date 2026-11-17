// src/features/settings/components/UsersPermissionsTab.jsx
// تبويب إدارة المستخدمين وصلاحيات الأدوار المتوافق مع هوية السندات المالية

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
    { value: 'admin', label: 'المدير العام', desc: 'صلاحيات كاملة وغير مقيدة على كامل مفاصل النظام' },
    { value: 'accountant', label: 'المحاسب المالي', desc: 'القيود، السندات، شجرة الحسابات، والتقارير المالية' },
    { value: 'data_entry', label: 'مسؤولة المعرض والمبيعات', desc: 'إدارة الطلبات، نقاط البيع، العملاء، ومتابعة العربون' },
    { value: 'workshop_manager', label: 'مدير الورشة والمعمل', desc: 'أوامر التشغيل، مراحل التفصيل، المخزون، والخياطين' }
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
    <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs space-y-2 select-none text-right" dir="rtl">
      {/* الترويسة وأزرار التحكم */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <div>
            <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>المستخدمين وصلاحيات الأدوار (RBAC)</span>
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="h-6 px-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-md font-medium text-[10.5px] shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>إضافة مستخدم</span>
        </button>
      </div>

      {/* شريط البحث السريع */}
      <div className="flex items-center gap-2">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، اسم المستخدم، أو الدور..."
            className="w-full h-6 pr-6 pl-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B132B] text-slate-900 dark:text-white text-[10.5px] outline-none focus:border-pink-500 transition"
          />
          <svg className="w-3 h-3 text-slate-400 absolute right-2 top-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">({filteredUsers.length} مستخدم)</span>
      </div>

      {/* جدول الحسابات والمستخدمين */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 custom-scrollbar">
        <table className="w-full text-right border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800">
            <tr className="h-7.5">
              <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">المستخدم</th>
              <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">الاسم الكامل</th>
              <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">الدور الوظيفي</th>
              <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">الحالة</th>
              <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
            {loadingUsers ? (
              <tr><td colSpan="5" className="text-center py-6 text-slate-500 text-xs">جارٍ جلب المستخدمين...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-6 text-slate-500 text-xs">لا يوجد مستخدمين مطابقين للبحث.</td></tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id || u.username} className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors">
                  <td className="py-1 px-2.5 font-mono font-bold text-slate-900 dark:text-white">{u.username}</td>
                  <td className="py-1 px-2.5 font-medium text-slate-800 dark:text-slate-200">{u.full_name || '—'}</td>
                  <td className="py-1 px-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/60">
                      {roles.find(r => r.value === u.role)?.label || u.role}
                    </span>
                  </td>
                  <td className="py-1 px-2.5 text-center">
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${u.is_active !== 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'}`}>
                      {u.is_active !== 0 ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className="py-1 px-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button" onClick={() => handleOpenEdit(u)} className="h-5 px-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold transition cursor-pointer">
                        تعديل
                      </button>
                      {u.username !== 'admin' && (
                        <button type="button" onClick={() => onDeleteUser(u)} className="h-5 px-2 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-[10px] font-bold transition cursor-pointer">
                          حذف
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
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-xs select-none" dir="rtl">
          <div className="bg-white dark:bg-[#111C38] rounded-xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fadeIn">
            <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0B132B]">
              <span className="font-bold text-xs text-slate-900 dark:text-white">{editingUser ? 'تعديل المستخدم وصلاحياته' : 'إضافة مستخدم جديد'}</span>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white font-bold text-xs cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-3.5 space-y-2 text-xs">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">اسم المستخدم *</label>
                <input type="text" required disabled={editingUser && editingUser.username === 'admin'} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B132B] text-slate-900 dark:text-white text-[11px] outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">الاسم الكامل للموظف</label>
                <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B132B] text-slate-900 dark:text-white text-[11px] outline-none" />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">كلمة المرور {editingUser && '(اتركها فارغة بدون تغيير)'}</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingUser ? '••••••••' : 'كلمة المرور'} className="w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B132B] text-slate-900 dark:text-white text-[11px] outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">الدور الوظيفي والصلاحيات *</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B132B] text-slate-900 dark:text-white text-[11px] outline-none font-bold">
                  {roles.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="h-6.5 px-3 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer">إلغاء</button>
                <button type="submit" className="h-6.5 px-3 rounded-md bg-pink-600 text-white text-xs font-bold hover:bg-pink-700 cursor-pointer">حفظ المستخدم</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

window.UsersPermissionsTab = UsersPermissionsTab;
