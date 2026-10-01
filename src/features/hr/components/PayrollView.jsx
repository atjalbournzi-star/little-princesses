// PayrollView.jsx - واجهة مسير الرواتب الشهري

function PayrollView({
  payrollMonth, setPayrollMonth,
  currentPayroll,
  bonus, setBonus,
  currencyDisplay,
  handleGeneratePayroll,
  handleAddAdvance,
  handlePaySalary,
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] min-h-[450px] space-y-5">
      {/* شريط التحكم بالشهر */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA]">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="font-bold text-xs text-[#25232A]">شهر مسير الرواتب:</label>
          <input type="month" lang="en-GB" dir="ltr" value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
            className="h-10 px-3 border border-[#E8E5EA] rounded-xl font-bold bg-white text-[#8F2A87] text-xs outline-none" />
        </div>
        <button onClick={handleGeneratePayroll}
          className="w-full md:w-auto px-6 py-2.5 bg-[#8F2A87] hover:bg-[#73216C] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer">
          <span>⚙️</span> احتساب وإصدار مسير الرواتب ({payrollMonth})
        </button>
      </div>

      {!currentPayroll ? (
        <div className="text-center p-12 text-[#6F6B75]">
          <span className="text-5xl block mb-3">🧾</span>
          <h3 className="text-sm font-bold text-[#25232A]">لم يتم إصدار مسير رواتب لهذا الشهر بعد</h3>
          <p className="text-xs mt-1">اضغط على الزر أعلاه لتوليد الرواتب واحتساب مستحقات الورشة تلقائياً.</p>
        </div>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#25232A]">
                كشف رواتب شهر <span className="text-[#8F2A87] font-mono">{currentPayroll.month}</span>
              </h3>
              <span className={`text-[10.5px] px-2.5 py-0.5 rounded-full font-bold ${
                currentPayroll.status === 'مكتمل' ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-[#FFF1DC] text-[#C97300]'
              }`}>
                الحالة: {currentPayroll.status}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                <tr>
                  <th className="p-3">اسم الموظف</th>
                  <th className="p-3">الوظيفة</th>
                  <th className="p-3">القطع المنجزة</th>
                  <th className="p-3">إجمالي الاستحقاق</th>
                  <th className="p-3 text-[#D64545]">سلف وخصميات</th>
                  <th className="p-3 text-[#007F8C]">مكافآت إضافية</th>
                  <th className="p-3 text-[#8F2A87]">الصافي المستحق</th>
                  <th className="p-3 text-center">إجراءات الصرف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white font-medium">
                {currentPayroll.records.map(r => (
                  <tr key={r.empId} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="p-3 font-bold text-[#25232A]">{r.name}</td>
                    <td className="p-3 text-[11px] text-[#6F6B75]">{r.role} • {r.type}</td>
                    <td className="p-3">
                      {r.type === 'بالقطعة' ? (
                        <span className="text-[#8F2A87] font-bold cursor-help border-b border-dashed border-[#E5CEE7] w-fit flex items-center gap-1 font-mono">
                          {r.piecesCount} قطعة
                        </span>
                      ) : (
                        <span className="text-[#6F6B75] text-[10px]">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#25232A] font-mono tabular-nums">
                        {(r.type === 'بالقطعة' ? r.pieceWages : r.baseSalary).toLocaleString('en-US')} <span className="text-[10px] font-medium text-[#6F6B75] font-sans">{currencyDisplay}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[#D64545] font-bold font-mono tabular-nums">{r.deduction > 0 ? `-${r.deduction.toLocaleString('en-US')}` : '0'}</span>
                        {!r.status.includes('تم الصرف') && (
                          <button onClick={() => handleAddAdvance(r)} title="تسجيل سلفة نقدية"
                            className="bg-rose-50 hover:bg-rose-100 text-[#D64545] px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200 cursor-pointer">
                            سلفة
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {!r.status.includes('تم الصرف') ? (
                        <input type="number" placeholder="0"
                          className="w-16 p-1 border border-[#E8E5EA] rounded-lg bg-[#FAFAFB] text-[#007F8C] outline-none text-center font-bold font-mono tabular-nums"
                          value={bonus[r.empId] || ''}
                          onChange={e => setBonus({ ...bonus, [r.empId]: e.target.value })}
                        />
                      ) : (
                        <span className="text-[#007F8C] font-bold font-mono tabular-nums">{r.bonus > 0 ? `+${r.bonus.toLocaleString('en-US')}` : '0'}</span>
                      )}
                    </td>
                    <td className="p-3 font-bold font-mono tabular-nums text-[#8F2A87]">
                      {r.netSalary.toLocaleString('en-US')} <span className="text-[10px] font-medium text-[#6F6B75] font-sans">{currencyDisplay}</span>
                    </td>
                    <td className="p-3 text-center">
                      {!r.status.includes('تم الصرف') ? (
                        <button onClick={() => handlePaySalary(r)}
                          className="bg-[#009FAE] hover:bg-[#007F8C] text-white px-3 py-1.5 rounded-lg shadow-xs transition text-[11px] font-bold cursor-pointer">
                          صرف الراتب 💸
                        </button>
                      ) : (
                        <span className="text-[#007F8C] bg-[#E2F5F7] px-2 py-1 rounded-md text-[10.5px] font-bold border border-[#C5ECF0]">تم الصرف ✅</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#FAFAFB] border-t-2 border-[#E8E5EA]">
                <tr>
                  <td colSpan="6" className="p-3 text-left font-bold text-[#25232A]">إجمالي الرواتب الصافية لهذا الشهر:</td>
                  <td colSpan="2" className="p-3 font-bold font-mono tabular-nums text-[#8F2A87] text-sm">
                    {currentPayroll.records.reduce((sum, r) => sum + r.netSalary, 0).toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75] font-sans">{currencyDisplay}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
