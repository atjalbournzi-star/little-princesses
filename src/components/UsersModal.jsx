/**
 * ============================================================================
 * UsersModal.jsx — Users & Permissions (RBAC) Orchestrator
 * Architecture: Modular Component Pattern | Little Princesses ERP
 * ============================================================================
 */

const { useState, useEffect, useMemo, useCallback } = React;

function UsersModal({ isOpen, onClose, showToast, currentRole }) {
  if (!isOpen) return null;

  const FormComp = window.UserFormModal || (() => null);
  const TableComp = window.UserPermissionsTable || (() => null);

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
    { value: 'admin', label: 'المدير العام (وصول كامل) 🛡️', badge: 'bg-[#FCE8F2] text-[#B0005A] border-[#F2A4CB]' },
    { value: 'accountant', label: 'المحاسب المالي (المالية، القيود، والتقارير) 💼', badge: 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]' },
    { value: 'data_entry', label: 'مسؤولة المعرض والمبيعات (الطلبات والعملاء) 🛍️', badge: 'bg-[#FFF1DC] text-[#F28A00] border-[#FFE4B9]' },
    { value: 'workshop_manager', label: 'مدير الورشة والمعمل (الإنتاج والتفصيل) 🧵', badge: 'bg-[#F2E7F3] text-[#8F2A87] border-[#E5CEE7]' }
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
    if (isOpen) fetchUsers();
  }, [isOpen, fetchUsers]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ id: null, username: '', full_name: '', password: '', role: 'data_entry', is_active: 1 });
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
          <FormComp
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            editingUser={editingUser}
            formData={formData}
            setFormData={setFormData}
            handleSave={handleSave}
            rolesList={rolesList}
          />

          {/* Users Table */}
          <TableComp
            loading={loading}
            filteredUsers={filteredUsers}
            getRoleBadge={getRoleBadge}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}

window.UsersModal = UsersModal;
