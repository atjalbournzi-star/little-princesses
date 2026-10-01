/**
 * ============================================================================
 * BrandHeader.jsx — Mobile Toggle, Breadcrumb, Multi-Tenant & Sync Status
 * Architecture: Modular Header Component | Little Princesses ERP
 * ============================================================================
 */

function BrandHeader({
  onToggleSidebar,
  tabMetadata,
  userRole,
  activeTenant,
  setActiveTenantState,
  tenants,
  syncInfo,
  checkSync
}) {
  const [tenantDropdown, setTenantDropdown] = React.useState(false);
  const [showAddTenantModal, setShowAddTenantModal] = React.useState(false);
  const [newTenantName, setNewTenantName] = React.useState('');
  const [newTenantId, setNewTenantId] = React.useState('');

  return (
    <div className="flex items-center gap-3">
      {/* Sidebar Mobile Toggle */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-xl border border-[#E8E5EA] dark:border-slate-700 text-[#6F6B75] dark:text-slate-400 hover:text-[#B0005A] dark:hover:text-purple-400 hover:bg-[#FCE8F2] dark:hover:bg-slate-800 md:hidden transition cursor-pointer"
        title="القائمة الجانبية"
      >
        <Icons.Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb Info */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5 text-xs text-[#6F6B75] dark:text-slate-400">
          <span className="font-semibold">{tabMetadata.category}</span>
          <Icons.ChevronLeft className="w-3.5 h-3.5 text-[#6F6B75]/40 dark:text-slate-600" />
          <span className="font-bold text-sm text-[#B0005A] dark:text-purple-300 truncate max-w-[200px] sm:max-w-xs">{tabMetadata.title}</span>
        </div>
      </div>

      {/* Multi-Tenant SaaS Switcher Badge */}
      <div className="relative mr-2">
        <button
          type="button"
          onClick={() => setTenantDropdown(!tenantDropdown)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F2E7F3] to-[#FCE8F2] dark:from-slate-800/90 dark:to-slate-800/60 border border-[#E5CEE7] dark:border-slate-700 text-[#8F2A87] dark:text-purple-300 hover:border-[#B0005A] dark:hover:border-purple-500 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          title="تبديل المنشأة أو الشركة (Multi-Tenant Switcher)"
        >
          <span>🏢</span>
          <span className="max-w-[150px] truncate">{activeTenant.name || 'ERP Master'}</span>
          <Icons.ChevronDown className="w-3.5 h-3.5 text-[#8F2A87] dark:text-purple-300" />
        </button>

        {tenantDropdown && (
          <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E8E5EA] rounded-2xl shadow-xl p-2 z-50 animate-fadeIn space-y-1">
            <div className="px-3 py-2 border-b border-[#E8E5EA] flex items-center justify-between">
              <span className="text-xs font-bold text-[#25232A]">المشاغل والمستأجرين (SaaS)</span>
              <span className="text-[10px] font-mono bg-[#E2F5F7] text-[#007F8C] px-1.5 py-0.5 rounded font-bold">{tenants.length} مشغل</span>
            </div>

            <div className="max-h-48 overflow-y-auto py-1 space-y-1">
              {tenants.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={async () => {
                    setTenantDropdown(false);
                    if (window.tenantAPI && window.tenantAPI.switchTenant) {
                      await window.tenantAPI.switchTenant(t.id);
                      window.location.reload();
                    }
                  }}
                  className={`w-full text-right px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                    (activeTenant.id === t.id)
                      ? 'bg-[#FCE8F2] text-[#B0005A] font-bold border border-[#F2A4CB]'
                      : 'text-[#25232A] hover:bg-[#FAFAFB]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🏢</span>
                    <div className="flex flex-col">
                      <span className="leading-tight">{t.name}</span>
                      <span className="text-[10px] opacity-70 font-mono">ID: {t.id}</span>
                    </div>
                  </div>
                  {activeTenant.id === t.id && (
                    <span className="text-[10px] font-bold bg-[#B0005A] text-white px-1.5 py-0.2 rounded-full">النشط</span>
                  )}
                </button>
              ))}
            </div>

            {userRole === 'admin' && (
              <div className="border-t border-[#E8E5EA] pt-1">
                <button
                  type="button"
                  onClick={() => { setTenantDropdown(false); setShowAddTenantModal(true); }}
                  className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#007F8C] hover:bg-[#E2F5F7] flex items-center gap-2 transition cursor-pointer"
                >
                  <Icons.Plus className="w-4 h-4" />
                  <span>تسجيل مشغل / شركة جديدة (+ Tenant)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Tenant Modal */}
      {showAddTenantModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E8E5EA]">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <h3 className="text-base font-bold text-[#25232A] flex items-center gap-2">
                <span>🏢</span>
                <span>تسجيل مشغل أو عميل جديد (New Tenant)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTenantModal(false)}
                className="text-[#6F6B75] hover:text-[#25232A] p-1 rounded-lg hover:bg-[#FAFAFB]"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-[#25232A] mb-1">اسم المشغل / العلامة التجارية *</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="مثال: مشغل الأناقة للأزياء"
                  className="w-full h-10 px-3 border border-[#E8E5EA] rounded-xl text-xs outline-none focus:border-[#B0005A]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#25232A] mb-1">معرف المستأجر الفريد (Tenant Code) *</label>
                <input
                  type="text"
                  value={newTenantId}
                  onChange={(e) => setNewTenantId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="مثال: atelier_elegance"
                  className="w-full h-10 px-3 border border-[#E8E5EA] rounded-xl text-xs font-mono outline-none focus:border-[#B0005A]"
                />
              </div>
              <div className="p-3 bg-[#E2F5F7] rounded-xl border border-[#C5ECF0] text-[#007F8C] text-[11px] leading-relaxed">
                🛡️ سيتم تلقائياً إنشاء قاعدة بيانات وشجرة حسابات قياسية معزولة بالكامل لهذا المشغل لضمان عدم تداخل البيانات.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E5EA]">
              <button
                type="button"
                onClick={() => setShowAddTenantModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6F6B75] hover:bg-[#FAFAFB] border border-[#E8E5EA]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newTenantName || !newTenantId) {
                    alert('يرجى كتابة اسم المشغل ومعرفه الفريد');
                    return;
                  }
                  try {
                    const res = await window.tenantAPI.createTenant({
                      id: newTenantId,
                      name: newTenantName,
                      plan: 'Enterprise'
                    });
                    if (res && res.success) {
                      alert(res.message || 'تم إنشاء المشغل بنجاح!');
                      setShowAddTenantModal(false);
                      setNewTenantName('');
                      setNewTenantId('');
                      await window.tenantAPI.switchTenant(newTenantId);
                      window.location.reload();
                    } else {
                      alert(res.error || 'حدث خطأ أثناء الإنشاء');
                    }
                  } catch(e) {
                    alert('خطأ: ' + e.message);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[#B0005A] hover:bg-[#8E0049] text-white text-xs font-bold shadow-xs"
              >
                تأكيد وإنشاء المشغل 🏢
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.BrandHeader = BrandHeader;
