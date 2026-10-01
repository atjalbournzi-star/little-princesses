function SettingsHeader({
  activeTab,
  setActiveTab,
  backupStatus,
  usersCount = 0,
  totalLogs = 0,
  onOpenAuditLogs
}) {
  const tabs = [
    { id: 'company', label: 'المؤسسة والمظهر', icon: '🏢' },
    { id: 'users', label: 'المستخدمين والصلاحيات', icon: '👥', badge: usersCount > 0 ? usersCount : null },
    { id: 'currencies', label: 'العملات والصرف', icon: '💱' },
    { id: 'templates', label: 'قوالب الطباعة', icon: '🖨️' },
    { id: 'integrations', label: 'رسائل WhatsApp والتكاملات', icon: '💬' },
    { id: 'backup', label: 'النسخ الاحتياطي والكوارث', icon: '💾', badge: backupStatus?.db_size_formatted || null }
  ];

  return (
    <div className="space-y-4">
      {/* ── البطاقة العلوية التعريفية بالنظام والإصدار ── */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-purple-950 rounded-2xl p-5 text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border border-white/10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center text-2xl font-bold shadow-xs">
            ⚙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg text-amber-300">إدارة الإعدادات والحوكمة والأمان الإداري</h1>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                ERP v2.4 Active
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              تهيئة الهوية المؤسسية، المستخدمين وصلاحيات RBAC، قوالب الطباعة، والنسخ الاحتياطي السحابي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAuditLogs && (
            <button
              type="button"
              onClick={onOpenAuditLogs}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>🛡️</span>
              <span>سجلات تدقيق الأمان</span>
              {totalLogs > 0 && (
                <span className="text-[10px] bg-[#B0005A] text-white px-1.5 py-0.2 rounded-full font-mono">
                  {totalLogs}
                </span>
              )}
            </button>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>PostgreSQL 17 Cloud</span>
          </div>
        </div>
      </div>

      {/* ── شريط التبويبات الإدارية الموحدة ── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl overflow-x-auto shadow-2xs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white text-[#B0005A] shadow-xs border border-[#F2A4CB]'
                  : 'text-[#6F6B75] hover:text-[#25232A] hover:bg-white/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  isActive ? 'bg-[#FCE8F2] text-[#B0005A]' : 'bg-[#E8E5EA] text-[#25232A]'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.SettingsHeader = SettingsHeader;
