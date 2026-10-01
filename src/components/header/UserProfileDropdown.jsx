/**
 * ============================================================================
 * UserProfileDropdown.jsx — User Profile Card & Role Switcher Menu
 * Architecture: Modular Header Component | Little Princesses ERP
 * ============================================================================
 */

function UserProfileDropdown({
  user,
  userRole,
  getRoleBadgeColor,
  sanitizeDisplayName,
  onOpenLogin,
  onOpenUsersModal,
  onLogout
}) {
  const [userDropdown, setUserDropdown] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setUserDropdown(!userDropdown)}
        className="flex items-center gap-2 py-1 px-2 rounded-xl bg-[#FAFAFB] dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 border border-[#E8E5EA] dark:border-slate-800 transition cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#B0005A] via-[#8F2A87] to-[#009FAE] text-white flex items-center justify-center text-xs font-bold shadow-xs">
          {user.username ? user.username.slice(0, 2).toUpperCase() : 'ERP'}
        </div>
        <div className="flex flex-col text-right hidden sm:flex">
          <span className="text-xs font-bold text-[#25232A] dark:text-slate-100 leading-tight">
            {sanitizeDisplayName(user.full_name || user.username)}
          </span>
          <span className="text-[10.5px] text-[#6F6B75] dark:text-slate-400">
            {userRole === 'admin' ? 'المدير التنفيذي' : (user.role_label || user.role)}
          </span>
        </div>
        <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-md border ${getRoleBadgeColor(userRole)}`}>
          {userRole === 'admin' ? '🛡️ تنفيذي' : userRole === 'accountant' ? '💼 محاسب' : userRole === 'workshop_manager' ? '⚙️ تشغيل' : 'مدخل'}
        </span>
        <Icons.ChevronDown className="w-3.5 h-3.5 text-[#6F6B75] dark:text-slate-400" />
      </button>

      {userDropdown && (
        <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-[#E8E5EA] dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-fadeIn space-y-1.5">
          <div className="p-3 bg-[#FAFAFB] dark:bg-slate-800/60 rounded-xl border border-[#E8E5EA] dark:border-slate-700/60 text-right">
            <div className="font-bold text-sm text-[#25232A] dark:text-slate-100">{sanitizeDisplayName(user.full_name || user.username)}</div>
            <div className="text-xs text-[#6F6B75] dark:text-slate-400 font-mono">@{user.username}</div>
            <div className={`mt-2 inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeColor(userRole)}`}>
              {userRole === 'admin' ? '🛡️ المدير التنفيذي (Executive Admin)' : (user.role_label || userRole)}
            </div>
          </div>

          {userRole === 'admin' && (
            <button
              type="button"
              onClick={() => { setUserDropdown(false); if (onOpenUsersModal) onOpenUsersModal(); }}
              className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#25232A] dark:text-slate-200 hover:bg-[#FCE8F2] dark:hover:bg-purple-950/40 hover:text-[#B0005A] dark:hover:text-purple-300 flex items-center gap-2 transition cursor-pointer"
            >
              <Icons.Users className="w-4 h-4 text-[#B0005A] dark:text-purple-400" />
              <span>إدارة المستخدمين والصلاحيات (RBAC)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => { setUserDropdown(false); if (onOpenLogin) onOpenLogin(); }}
            className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#25232A] dark:text-slate-200 hover:bg-[#E2F5F7] dark:hover:bg-cyan-950/40 hover:text-[#007F8C] dark:hover:text-cyan-300 flex items-center gap-2 transition cursor-pointer"
          >
            <span>🔄</span>
            <span>تبديل المستخدم (Switch Role)</span>
          </button>

          <div className="border-t border-[#E8E5EA] dark:border-slate-800 pt-1">
            <button
              type="button"
              onClick={() => { setUserDropdown(false); if (onLogout) onLogout(); }}
              className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#D64545] hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition cursor-pointer"
            >
              <span>🚪</span>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

window.UserProfileDropdown = UserProfileDropdown;
