// PayrollView.jsx - واجهة مسير الرواتب الشهري مع الفلاتر متعددة المعايير والصرف المجمع
const { useState, useMemo } = React;

function PayrollView({
  payrollMonth, setPayrollMonth, currentPayroll, bonus, setBonus, currencyDisplay,
  handleGeneratePayroll, handleAddAdvance, handlePaySalary, handleConsolidatedPayrollPay, onOpenPiecesModal
}) {
  const [filterType, setFilterType] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  const FilterBarComp = window.PayrollFilterBar || (typeof PayrollFilterBar !== 'undefined' ? PayrollFilterBar : null);

  const distinctRoles = useMemo(() => {
    if (!currentPayroll?.records) return [];
    return Array.from(new Set(currentPayroll.records.map(r => r.role).filter(Boolean)));
  }, [currentPayroll]);

  const filteredRecords = useMemo(() => {
    if (!currentPayroll?.records) return [];
    return currentPayroll.records.filter(r => {
      const matchType = filterType === 'all' || r.type === filterType || (filterType === 'piece_rate' && r.type === 'بالقطعة') || (filterType === 'monthly_salary' && r.type === 'راتب شهري');
      const matchRole = filterRole === 'all' || r.role === filterRole;
      const matchStatus = filterStatus === 'all' ? true : filterStatus === 'تم الصرف' ? r.status?.includes('تم الصرف') : !r.status?.includes('تم الصرف');
      return matchType && matchRole && matchStatus;
    });
  }, [currentPayroll, filterType, filterRole, filterStatus]);

  const pendingRecords = useMemo(() => filteredRecords.filter(r => !r.status?.includes('تم الصرف')), [filteredRecords]);

  const onDisburseBulk = async () => {
    if (!handleConsolidatedPayrollPay || pendingRecords.length === 0) return;
    setIsSubmittingBulk(true);
    try { await handleConsolidatedPayrollPay(pendingRecords); } finally { setIsSubmittingBulk(false); }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-2 bg-[#111C38] p-3 rounded-xl border border-slate-800 shadow-xs select-none">
      {/* شريط التحكم بالشهر */}
      <div className="shrink-0 flex items-center justify-between gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <label className="font-bold text-xs text-white">شهر مسير الرواتب:</label>
          <input type="month" lang="en-GB" dir="ltr" value={payrollMonth} onChange={(e) => setPayrollMonth(e.target.value)}
            className="h-7 px-2 border border-slate-700 rounded-lg font-bold bg-[#0F172A] text-white text-xs outline-none cursor-pointer" />
        </div>
        <button type="button" onClick={handleGeneratePayroll}
          className="h-7 px-3 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
          <span>⚙️</span><span>احتساب وإصدار المسير ({payrollMonth})</span>
        </button>
      </div>

      {!currentPayroll ? (
        <div className="text-center p-12 text-slate-400 my-auto">
          <span className="text-4xl block mb-2">🧾</span>
          <h3 className="text-xs font-bold text-white">لم يتم إصدار مسير رواتب لهذا الشهر بعد</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">اضغط على الزر أعلاه لتوليد الرواتب واحتساب مستحقات الورشة تلقائياً.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-2 animate-fadeIn">
          {FilterBarComp && (
            <FilterBarComp
              filterType={filterType} setFilterType={setFilterType} filterRole={filterRole} setFilterRole={setFilterRole}
              filterStatus={filterStatus} setFilterStatus={setFilterStatus} roles={distinctRoles} pendingCount={pendingRecords.length}
              isSubmitting={isSubmittingBulk} onDisburseBulk={onDisburseBulk}
            />
          )}

          <div className="shrink-0 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs text-white">كشف رواتب شهر <span className="text-pink-400 font-mono">{currentPayroll.month}</span></h3>
              <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${currentPayroll.status === 'مكتمل' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40' : 'bg-amber-950/60 text-amber-300 border-amber-800/40'}`}>
                الحالة: {currentPayroll.status}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">عرض {filteredRecords.length} من أصل {currentPayroll.records?.length || 0} موظف</span>
          </div>

          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar rounded-xl border border-slate-800 flex flex-col justify-between">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 z-10 bg-slate-900/90 text-white font-bold border-b border-slate-800">
                <tr>
                  <th className="py-1.5 px-2 text-[11px] text-white font-bold">اسم الموظف</th>
                  <th className="py-1.5 px-2 text-[11px] text-white font-bold">الوظيفة</th>
                  <th className="py-1.5 px-2 text-[11px] text-white font-bold">القطع المنجزة</th>
                  <th className="py-1.5 px-2 text-[11px] text-white font-bold">إجمالي الاستحقاق</th>
                  <th className="py-1.5 px-2 text-[11px] text-rose-400 font-bold">سلف وخصميات</th>
                  <th className="py-1.5 px-2 text-[11px] text-cyan-400 font-bold">مكافآت إضافية</th>
                  <th className="py-1.5 px-2 text-[11px] text-emerald-400 font-bold">الصافي المستحق</th>
                  <th className="py-1.5 px-2 text-[11px] text-center text-white font-bold">إجراءات الصرف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#111C38] font-medium">
                {filteredRecords.length === 0 ? (
                  <tr><td colSpan="8" className="p-8 text-center text-slate-400 font-bold text-xs">لا توجد سجلات رواتب تطابق معايير الفلترة 🔍</td></tr>
                ) : (
                  filteredRecords.map(r => (
                    <tr key={r.empId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-1 px-2 font-bold text-white text-xs">{r.name}</td>
                      <td className="py-1 px-2 text-[11px] text-slate-300 font-medium">{r.role} • {r.type}</td>
                      <td className="py-1 px-2">
                        {r.type === 'بالقطعة' ? (
                          <button type="button" onClick={() => onOpenPiecesModal && onOpenPiecesModal(r)} title="عرض كشف القطع التفصيلي"
                            className="h-5 px-1.5 bg-pink-950/60 hover:bg-pink-900/80 text-pink-300 font-bold text-[10.5px] rounded border border-pink-800/40 transition flex items-center gap-1 cursor-pointer font-mono">
                            <span>{r.piecesCount} قطعة</span><span className="text-[9.5px]">🔍</span>
                          </button>
                        ) : (<span className="text-slate-500 text-[10px]">-</span>)}
                      </td>
                      <td className="py-1 px-2">
                        <span className="font-bold text-white font-mono tabular-nums text-xs block">
                          {(r.type === 'بالقطعة' ? r.pieceWages : r.baseSalary).toLocaleString('en-US')} <span className="text-[9.5px] font-medium text-slate-300 font-sans">{currencyDisplay}</span>
                        </span>
                        {r.piecesStatement && (
                          <div className="text-[9px] text-pink-300 font-mono bg-pink-950/40 border border-pink-800/40 px-1 py-0.2 rounded mt-0.5 max-w-[200px] truncate" title={r.piecesStatement}>
                            {r.piecesStatement.split('\n').join(' • ')}
                          </div>
                        )}
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-rose-400 font-bold font-mono text-xs tabular-nums">{r.deduction > 0 ? `-${r.deduction.toLocaleString('en-US')}` : '0'}</span>
                          {!r.status.includes('تم الصرف') && (
                            <button type="button" onClick={() => handleAddAdvance(r)} title="تسجيل سلفة نقدية"
                              className="h-5 px-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded text-[10px] font-bold border border-rose-800/40 cursor-pointer">سلفة</button>
                          )}
                        </div>
                      </td>
                      <td className="py-1 px-2">
                        {!r.status.includes('تم الصرف') ? (
                          <input type="number" placeholder="0" className="w-14 h-5 px-1 border border-slate-700 rounded bg-[#0F172A] text-cyan-300 outline-none text-center font-bold font-mono text-xs tabular-nums"
                            value={bonus[r.empId] || ''} onChange={e => setBonus({ ...bonus, [r.empId]: e.target.value })} />
                        ) : (
                          <span className="text-cyan-300 font-bold font-mono text-xs tabular-nums">{r.bonus > 0 ? `+${r.bonus.toLocaleString('en-US')}` : '0'}</span>
                        )}
                      </td>
                      <td className="py-1 px-2 font-bold font-mono text-xs tabular-nums text-emerald-400">
                        {r.netSalary.toLocaleString('en-US')} <span className="text-[9.5px] font-medium text-slate-300 font-sans">{currencyDisplay}</span>
                      </td>
                      <td className="py-1 px-2 text-center">
                        {!r.status.includes('تم الصرف') ? (
                          <button type="button" onClick={() => handlePaySalary(r)}
                            className="h-5.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-xs transition text-[10px] font-bold cursor-pointer mx-auto flex items-center justify-center gap-1">
                            <span>صرف الراتب 💸</span>
                          </button>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-800/40">تم الصرف ✅</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="sticky bottom-0 z-10 h-7 px-3 bg-[#0B132B]/95 border-t border-slate-700 backdrop-blur-sm flex items-center justify-between text-xs font-bold text-white rounded-b-lg shrink-0">
              <span className="text-white font-bold">إجمالي الرواتب الصافية (المحددة):</span>
              <span className="text-emerald-400 font-mono font-bold text-xs tracking-wider">
                {currencyDisplay} {filteredRecords.reduce((sum, r) => sum + r.netSalary, 0).toLocaleString('en-US')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.PayrollView = PayrollView;
window.PayrollTable = PayrollView;
