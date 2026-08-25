const { useState, useEffect, useMemo, useCallback } = React;

function UsersModal({ isOpen, onClose, showToast, currentRole }) {
  if (!isOpen) return null;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    username: '',
    full_name: '',
    password: '',
    role: 'data_entry',
    is_active: 1
  });

  const rolesList = [
    { value: 'admin', label: 'المدير العام (Admin) 👑', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
    { value: 'accountant', label: 'محاسب مالي (Accountant) 💼', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { value: 'workshop_manager', label: 'مدير ورشة وإنتاج (Workshop) ✂️', badge: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
    { value: 'data_entry', label: 'مدخل بيانات وكاشير (Data Entry) 📝', badge: 'bg-pink-100 text-pink-900 border-pink-300' }
  ];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await window.usersAPI.getUsers();
      setUsers(list || []);
    } catch (e) {
      console.error(e);
      if (showToast) showToast('تعذر تحميل قائمة المستخدمين', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      id: null,
      username: '',
      full_name: '',
      password: '',
      role: 'data_entry',
      is_active: 1
    });
    setShowAddForm(true);
  };

  const handleEdit = (u) => {
    setEditingUser(u);
    setFormData({
      id: u.id,
      username: u.username,
      full_name: u.full_name || '',
      password: u.password || '',
      role: u.role || 'data_entry',
      is_active: u.is_active !== undefined ? u.is_active : 1
    });
    setShowAddForm(true);
  };

  const handleDelete = async (u) => {
    if (u.username === 'admin') {
      alert('لا يمكن حذف حساب المدير العام الرئيسي (admin)');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف حساب المستخدم "${u.full_name || u.username}"؟`)) {
      return;
    }
    try {
      const res = await window.usersAPI.deleteUser(u.id);
      if (res && res.success) {
        if (showToast) showToast(`✅ ${res.message}`);
        fetchUsers();
      } else {
        alert(res?.message || 'حدث خطأ أثناء الحذف');
      }
    } catch (e) {
      alert('تعذر الاتصال بالخادم');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      alert('اسم المستخدم مطلوب');
      return;
    }
    try {
      const res = await window.usersAPI.saveUser(formData);
      if (res && res.success) {
        if (showToast) showToast(`✅ ${res.message}`);
        setShowAddForm(false);
        fetchUsers();
      } else {
        alert(res?.message || 'حدث خطأ أثناء الحفظ');
      }
    } catch (e) {
      alert('تعذر حفظ بيانات المستخدم');
    }
  };

  const handleSyncGAS = async () => {
    try {
      if (showToast) showToast('جاري المزامنة السحابية مع Google Sheets... ⏳');
      const res = await window.usersAPI.syncUsers();
      if (showToast) showToast('✅ تم إرسال طلب المزامنة السحابية لشيت المستخدمين');
      fetchUsers();
    } catch (e) {
      if (showToast) showToast('تمت المزامنة محلياً');
    }
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase().trim();
    return users.filter(u => 
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.role_label && u.role_label.toLowerCase().includes(q))
    );
  }, [users, search]);

  const getRoleBadge = (role) => {
    const r = rolesList.find(item => item.value === role);
    if (!r) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{role}</span>;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${r.badge}`}>
        {r.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0F172A] border-b-2 border-[#D81B60] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D81B60] via-[#C2185B] to-[#00ACC1] flex items-center justify-center text-xl text-white shadow-md border border-pink-400/40">
              👥
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                إدارة المستخدمين وتوزيع الصلاحيات (RBAC)
                <span className="text-[11px] bg-pink-900/60 text-[#F48FB1] border border-pink-700/60 px-2 py-0.5 rounded-md font-mono font-bold">
                  Security Module
                </span>
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">التحكم بالمستخدمين، الأدوار الوظيفية، والربط مع Google Sheets</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncGAS}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="مزامنة مع Google Sheets"
            >
              <span>☁️</span>
              <span className="hidden sm:inline">مزامنة سحابية</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Top Action Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                placeholder="بحث بالاسم أو اسم المستخدم أو الدور..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pr-9 pl-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:border-[#00ACC1] focus:ring-4 focus:ring-cyan-100/80 transition outline-none"
              />
              <span className="absolute right-3 top-2.5 text-slate-400 text-sm">🔍</span>
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="h-10 px-5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#D81B60] via-[#C2185B] to-[#AD1457] hover:from-[#C2185B] hover:to-[#880E4F] shadow-sm hover:shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <span>➕</span>
              <span>إضافة مستخدم جديد</span>
            </button>
          </div>

          {/* Add / Edit Form Card */}
          {showAddForm && (
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
          )}

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">المستخدم والاسم</th>
                  <th className="p-3.5">اسم الدخول</th>
                  <th className="p-3.5">الدور الوظيفي</th>
                  <th className="p-3.5 text-center">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      جاري تحميل المستخدمين... ⏳
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      لا يوجد مستخدمين مطابقين للبحث
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <tr key={u.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono text-slate-400 font-bold">{u.id}</td>
                      <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                          {u.username ? u.username.slice(0, 2).toUpperCase() : 'U'}
                        </div>
                        <span>{u.full_name || u.username}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 font-bold">@{u.username}</td>
                      <td className="p-3.5">{getRoleBadge(u.role)}</td>
                      <td className="p-3.5 text-center">
                        {u.is_active ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            نشط ✅
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            معطّل ⛔
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(u)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 text-slate-600 border border-slate-200 transition cursor-pointer"
                            title="تعديل"
                          >
                            ✏️
                          </button>
                          {u.username !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 transition cursor-pointer"
                              title="حذف"
                            >
                              🗑️
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
        </div>
      </div>
    </div>
  );
}

window.UsersModal = UsersModal;
