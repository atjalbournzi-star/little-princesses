// AccountStatementModal.jsx - نافذة تفاصيل الحساب وسجل التعديلات المحاسبية

function AccountStatementModal({
  selectedDetailAcc, setSelectedDetailAcc,
  showAuditModal, setShowAuditModal,
  auditLogs,
  activeTargetCurr, currDef, isBaseCurrency
}) {
  return (
    <>
      {/* ── نافذة تفاصيل الحساب (كشف الحساب) ──────────────────────────────── */}
      {selectedDetailAcc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8E5EA] overflow-hidden animate-fadeIn">
            <div className="bg-[#FAFAFB] p-5 border-b border-[#E8E5EA] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#25232A]">👁️ تفاصيل الحساب المحاسبي</h3>
              <button onClick={() => setSelectedDetailAcc(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">كود الحساب:</span>
                <span className="font-mono font-bold text-[#8F2A87]">{selectedDetailAcc.code}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">اسم الحساب:</span>
                <span className="font-bold text-[#25232A]">{selectedDetailAcc.name}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">نوع الحساب:</span>
                <span>{selectedDetailAcc.account_type}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الفئة:</span>
                <span>{selectedDetailAcc.is_group === 1 ? 'حساب تجميعي (Group)' : 'حساب حركة (Posting)'}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الطبيعة المحاسبية:</span>
                <span>{selectedDetailAcc.nature === 'debit' ? 'مدين (Debit)' : 'دائن (Credit)'}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الرصيد بالعملة المختارة ({activeTargetCurr}):</span>
                <span className="font-bold font-mono text-[#007F8C]">
                  {Number(isBaseCurrency
                    ? (selectedDetailAcc.rollupBalance || selectedDetailAcc.balance || 0)
                    : (window.CurrencyService ? window.CurrencyService.fromBase(selectedDetailAcc.rollupBalance || selectedDetailAcc.balance, activeTargetCurr) : (selectedDetailAcc.rollupBalance || selectedDetailAcc.balance || 0))
                  ).toLocaleString('en-US', { minimumFractionDigits: isBaseCurrency ? 0 : 2, maximumFractionDigits: 2 })} {currDef.display}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الرصيد المحاسبي الأساسي (YER):</span>
                <span className="font-bold font-mono text-[#25232A]">
                  {Number(selectedDetailAcc.rollupBalance || selectedDetailAcc.balance || 0).toLocaleString('en-US')} YER ﷼
                </span>
              </div>

              {/* رصيد العملة الأجنبية إن وجدت */}
              {selectedDetailAcc.currency && selectedDetailAcc.currency !== 'YER' && (
                <>
                  <div className="flex justify-between border-b border-[#E8E5EA] pb-2 bg-amber-50/70 px-2.5 py-1.5 rounded-xl border border-amber-200">
                    <span className="text-amber-800 font-bold">الرصيد الفعلي بعملة الحساب ({selectedDetailAcc.currency}):</span>
                    <span className="font-bold font-mono text-amber-700">
                      {Number(selectedDetailAcc.foreign_balance !== undefined && selectedDetailAcc.foreign_balance !== null
                        ? selectedDetailAcc.foreign_balance
                        : (window.CurrencyService ? window.CurrencyService.fromBase(selectedDetailAcc.rollupBalance || selectedDetailAcc.balance, selectedDetailAcc.currency) : ((selectedDetailAcc.rollupBalance || selectedDetailAcc.balance) / 142))
                      ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedDetailAcc.currency}
                    </span>
                  </div>
                  {Number(selectedDetailAcc.foreign_balance || 0) > 0 && (
                    <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                      <span className="text-[#6F6B75] font-bold">متوسط سعر الصرف الدفتري:</span>
                      <span className="font-bold font-mono text-[#8F2A87]">
                        {(Math.abs(Number(selectedDetailAcc.rollupBalance || selectedDetailAcc.balance || 0) / Number(selectedDetailAcc.foreign_balance || 1))).toFixed(2)} YER / {selectedDetailAcc.currency}
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الحالة:</span>
                <span>{selectedDetailAcc.is_active === 1 ? 'نشط' : 'معطل'}</span>
              </div>
            </div>
            <div className="p-4 bg-[#FAFAFB] border-t border-[#E8E5EA] text-left">
              <button onClick={() => setSelectedDetailAcc(null)} className="px-5 py-2 bg-[#25232A] text-white rounded-xl font-bold text-xs">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ── نافذة سجل التعديلات المحاسبية (Audit Log) ──────────────────────── */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8E5EA] overflow-hidden animate-fadeIn">
            <div className="bg-[#FAFAFB] p-5 border-b border-[#E8E5EA] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#25232A]">📋 سجل التعديلات المحاسبية (Audit Log)</h3>
              <button onClick={() => setShowAuditModal(false)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-center text-[#6F6B75] py-8 font-bold">لا توجد سجلات تعديلات سابقة.</p>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAFAFB] border-b border-[#E8E5EA]">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">المستخدم</th>
                      <th className="p-2.5">كود الحساب</th>
                      <th className="p-2.5">الإجراء</th>
                      <th className="p-2.5">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, idx) => (
                      <tr key={idx} className="border-b border-[#E8E5EA] hover:bg-[#FAFAFB]">
                        <td className="p-2.5 font-mono text-[#6F6B75]">{log.created_at}</td>
                        <td className="p-2.5 font-bold text-[#25232A]">{log.user_name || 'المستخدم'}</td>
                        <td className="p-2.5 font-mono font-bold text-[#8F2A87]">{log.account_code}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.action === 'create' ? 'bg-[#E2F5F7] text-[#007F8C]' :
                            log.action === 'update' ? 'bg-[#F2E7F3] text-[#8F2A87]' : 'bg-rose-100 text-[#D64545]'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2.5 truncate max-w-xs text-[#6F6B75]">{log.new_value || log.old_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 bg-[#FAFAFB] border-t border-[#E8E5EA] text-left">
              <button onClick={() => setShowAuditModal(false)} className="px-5 py-2 bg-[#25232A] text-white rounded-xl font-bold text-xs">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
