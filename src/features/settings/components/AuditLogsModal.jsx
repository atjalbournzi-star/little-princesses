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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[#E8E5EA] shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB] flex items-center justify-center text-lg font-bold">
              🛡️
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#25232A] flex items-center gap-2">
                سجلات تدقيق الأمان والعمليات (Security Audit Logs)
                {totalLogs > 0 && (
                  <span className="text-[10px] bg-[#FCE8F2] text-[#B0005A] font-mono px-2 py-0.5 rounded-full font-bold">
                    {totalLogs} سجل
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#6F6B75]">تتبع عمليات التعديل والإضافة والحذف في قاعدة البيانات</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#6F6B75] flex items-center justify-center font-bold">✕</button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-[#FAFAFB] border-b border-[#E8E5EA] flex flex-wrap gap-2.5 items-center">
          <input
            type="text"
            value={auditFilter.search}
            onChange={e => setAuditFilter(p => ({ ...p, search: e.target.value }))}
            placeholder="بحث بالمستخدم، رقم السجل، أو نوع الإجراء..."
            className="flex-1 min-w-[200px] h-9 px-3 rounded-lg border border-[#E8E5EA] bg-white text-xs outline-none"
          />
          <select
            value={auditFilter.action}
            onChange={e => setAuditFilter(p => ({ ...p, action: e.target.value }))}
            className="h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-bold text-[#25232A]"
          >
            <option value="">جميع الإجراءات (All Actions)</option>
            <option value="CREATE">إنشاء (CREATE)</option>
            <option value="UPDATE">تعديل (UPDATE)</option>
            <option value="DELETE">حذف (DELETE)</option>
            <option value="SNAPSHOT">نسخ احتياطي (SNAPSHOT)</option>
            <option value="RESTORE">استعادة (RESTORE)</option>
          </select>
          <select
            value={auditFilter.entity_type}
            onChange={e => setAuditFilter(p => ({ ...p, entity_type: e.target.value }))}
            className="h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-white text-xs font-bold text-[#25232A]"
          >
            <option value="">كافة الكيانات (All Entities)</option>
            <option value="SETTINGS">إعدادات (SETTINGS)</option>
            <option value="ORDERS">المبيعات (ORDERS)</option>
            <option value="EXPENSES">المصروفات (EXPENSES)</option>
            <option value="PAYMENTS">السندات (PAYMENTS)</option>
            <option value="BACKUP">النسخ الاحتياطي (BACKUP)</option>
          </select>
          <button type="button" onClick={() => fetchAuditLogs(auditFilter)} className="px-3 h-9 bg-white border border-[#E8E5EA] rounded-lg text-xs font-bold hover:bg-[#FAFAFB]">
            🔄 تحديث
          </button>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 p-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#FAFAFB] text-[#6F6B75] border-b border-[#E8E5EA]">
                <th className="px-3 py-2 text-right">#</th>
                <th className="px-3 py-2 text-right">الوقت والتاريخ</th>
                <th className="px-3 py-2 text-right">الإجراء</th>
                <th className="px-3 py-2 text-right">الكيان</th>
                <th className="px-3 py-2 text-right">المستخدم</th>
                <th className="px-3 py-2 text-center">البيانات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5EA] bg-white">
              {loadingAudit ? (
                <tr><td colSpan="6" className="text-center py-8 text-[#6F6B75]">جارٍ جلب السجلات...</td></tr>
              ) : auditLogs.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-[#6F6B75]">لا توجد سجلات تدقيق مطابقة.</td></tr>
              ) : (
                auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#FAFAFB]">
                    <td className="px-3 py-2 font-mono font-bold text-[#6F6B75]">{log.id}</td>
                    <td className="px-3 py-2 font-mono text-[#25232A]" dir="ltr" style={{textAlign: 'right'}}>{log.created_at || log.timestamp}</td>
                    <td className="px-3 py-2 font-bold font-mono"><span className="px-2 py-0.5 rounded text-[10px] bg-purple-50 text-purple-700 border border-purple-200">{log.action}</span></td>
                    <td className="px-3 py-2 font-bold text-[#25232A]">{log.entity_type} <span className="font-mono text-[10px] text-[#6F6B75]">({log.entity_id})</span></td>
                    <td className="px-3 py-2 font-bold text-[#8F2A87]">{log.user_id || 'System'}</td>
                    <td className="px-3 py-2 text-center">
                      {(log.new_values || log.old_values) ? (
                        <button type="button" onClick={() => setSelectedLog(log)} className="px-2 py-1 rounded bg-[#FCE8F2] text-[#B0005A] text-[10.5px] font-bold">عرض 🔍</button>
                      ) : <span className="text-[#A29EA7]">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Selected Log Details Modal */}
        {selectedLog && (
          <div className="p-4 bg-[#FAFAFB] border-t border-[#E8E5EA] max-h-48 overflow-y-auto space-y-2 text-xs">
            <div className="flex justify-between items-center font-bold">
              <span>تفاصيل حركة التدقيق #{selectedLog.id} ({selectedLog.action})</span>
              <button type="button" onClick={() => setSelectedLog(null)} className="text-rose-600 font-bold">إغلاق المعاينة ✕</button>
            </div>
            {selectedLog.old_values && (
              <pre className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-900 font-mono text-[10px] overflow-x-auto" dir="ltr">
                {JSON.stringify(selectedLog.old_values, null, 2)}
              </pre>
            )}
            {selectedLog.new_values && (
              <pre className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-[10px] overflow-x-auto" dir="ltr">
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
