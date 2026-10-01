/**
 * ============================================================================
 * UserPermissionsTable.jsx — Users & RBAC Permissions Table
 * Architecture: Modular Users Module | Little Princesses ERP
 * ============================================================================
 */

function UserPermissionsTable({
  loading,
  filteredUsers,
  getRoleBadge,
  handleEdit,
  handleDelete
}) {
  return (
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
  );
}

window.UserPermissionsTable = UserPermissionsTable;
