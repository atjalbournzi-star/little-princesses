// src/features/settings/components/AuditLogsModal.jsx
// نافذة سجلات تدقيق الأمان والعمليات المتوافقة مع هوية السندات المالية

const { useState, useEffect } = React;

function AuditLogsModal({
  isOpen,
  onClose,
  auditLogs = [],
  totalLogs = 0,
  loadingAudit,
  auditFilter,
  setAuditFilter,
  fetchAuditLogs
}) {
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    if (isOpen) fetchAuditLogs(auditFilter);
  }, [isOpen, auditFilter, fetchAuditLogs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-xs animate-fadeIn select-none" dir="rtl">
      <div className="bg-white dark:bg-[#111C38] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl text-right">
        {/* Header */}
        <div className="h-8 px-2.5 bg-slate-50 dark:bg-[#0B132B] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>سجلات تدقيق الأمان والعمليات (Audit Logs)</span>
              {totalLogs > 0 && (
                <span className="text-[9.5px] bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-mono px-1.5 py-0.2 rounded font-bold border border-pink-200 dark:border-pink-800/60">
                  {totalLogs} سجل
                </span>
              )}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white font-bold text-xs cursor-pointer">✕</button>
        </div>

        {/* Filter Bar */}
        <div className="p-2 bg-slate-50 dark:bg-[#0B132B] border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={auditFilter.search}
            onChange={e => setAuditFilter(p => ({ ...p, search: e.target.value }))}
            placeholder="بحث بالمستخدم، رقم السجل، أو الإجراء..."
            className="flex-1 min-w-[180px] h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] text-slate-900 dark:text-white text-[11px] outline-none focus:border-pink-500"
          />
          <select
            value={auditFilter.action}
            onChange={e => setAuditFilter(p => ({ ...p, action: e.target.value }))}
            className="h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="">جميع الإجراءات (All)</option>
            <option value="CREATE">إنشاء (CREATE)</option>
            <option value="UPDATE">تعديل (UPDATE)</option>
            <option value="DELETE">حذف (DELETE)</option>
            <option value="SNAPSHOT">نسخ احتياطي (SNAPSHOT)</option>
            <option value="RESTORE">استعادة (RESTORE)</option>
          </select>
          <select
            value={auditFilter.entity_type}
            onChange={e => setAuditFilter(p => ({ ...p, entity_type: e.target.value }))}
            className="h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="">كافة الكيانات</option>
            <option value="SETTINGS">إعدادات (SETTINGS)</option>
            <option value="ORDERS">المبيعات (ORDERS)</option>
            <option value="EXPENSES">المصروفات (EXPENSES)</option>
            <option value="PAYMENTS">السندات (PAYMENTS)</option>
            <option value="BACKUP">النسخ الاحتياطي (BACKUP)</option>
          </select>
          <button type="button" onClick={() => fetchAuditLogs(auditFilter)} className="px-2.5 h-7 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            🔄 تحديث
          </button>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800">
              <tr className="h-7.5">
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">#</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">الوقت والتاريخ</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">الإجراء</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">الكيان</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">المستخدم</th>
                <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">البيانات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
              {loadingAudit ? (
                <tr><td colSpan="6" className="text-center py-6 text-slate-500 text-xs">جارٍ جلب السجلات...</td></tr>
              ) : auditLogs.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-6 text-slate-500 text-xs">لا توجد سجلات تدقيق مطابقة.</td></tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.id} className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors">
                    <td className="py-1 px-2.5 font-mono font-bold text-slate-500">{log.id}</td>
                    <td className="py-1 px-2.5 font-mono text-slate-800 dark:text-slate-200" dir="ltr" style={{textAlign: 'right'}}>{log.created_at || log.timestamp}</td>
                    <td className="py-1 px-2.5 font-bold font-mono"><span className="px-1.5 py-0.2 rounded text-[9.5px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">{log.action}</span></td>
                    <td className="py-1 px-2.5 font-bold text-slate-900 dark:text-white">{log.entity_type} <span className="font-mono text-[10px] text-slate-500">({log.entity_id})</span></td>
                    <td className="py-1 px-2.5 font-bold text-pink-600 dark:text-pink-400">{log.user_id || 'System'}</td>
                    <td className="py-1 px-2.5 text-center">
                      {(log.new_values || log.old_values) ? (
                        <button type="button" onClick={() => setSelectedLog(log)} className="h-5 px-1.5 rounded bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 text-[10px] font-bold border border-pink-200 dark:border-pink-800/60 cursor-pointer">عرض</button>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Log Details Modal */}
        {selectedLog && (
          <div className="p-2.5 bg-slate-50 dark:bg-[#0B132B] border-t border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto space-y-1 text-xs custom-scrollbar">
            <div className="flex justify-between items-center font-bold">
              <span className="text-slate-900 dark:text-white text-[11px]">تفاصيل حركة التدقيق #{selectedLog.id} ({selectedLog.action})</span>
              <button type="button" onClick={() => setSelectedLog(null)} className="text-rose-600 text-xs font-bold cursor-pointer">إغلاق ✕</button>
            </div>
            {selectedLog.old_values && (
              <pre className="p-1.5 rounded bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 font-mono text-[10px] overflow-x-auto" dir="ltr">
                {JSON.stringify(selectedLog.old_values, null, 2)}
              </pre>
            )}
            {selectedLog.new_values && (
              <pre className="p-1.5 rounded bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] overflow-x-auto" dir="ltr">
                {JSON.stringify(selectedLog.new_values, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

window.AuditLogsModal = AuditLogsModal;
