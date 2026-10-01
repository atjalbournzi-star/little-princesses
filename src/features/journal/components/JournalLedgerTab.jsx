// src/features/journal/components/JournalLedgerTab.jsx
// General Ledger tab: account filter bar + grouped account cards with transactions table

function JournalLedgerTab({ postingAccounts, ledgerAccount, setLedgerAccount, ledgerDateRange, setLedgerDateRange, ledgerSearch, setLedgerSearch, groupedLedgerAccounts }) {
  const { inputCls, labelCls } = window.JournalUtils || {};

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
        {/* رأس القسم */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📖</span>
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">دفتر الأستاذ العام (General Ledger)</h3>
              <p className="text-[11px] text-[#6F6B75]">عرض وتتبع الحركات والرصيد التراكمي لكل حساب</p>
            </div>
          </div>
          <button onClick={() => window.print()} className="px-4 py-2 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            🖨️ <span>طباعة كشف الأستاذ</span>
          </button>
        </div>

        {/* فلاتر */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className={labelCls}>تصفية بالحساب</label>
            <select value={ledgerAccount} onChange={e => setLedgerAccount(e.target.value)} className={inputCls}>
              <option value="ALL">-- جميع الحسابات --</option>
              {postingAccounts.map(a => { const code = a.code || a.acc_code || a.id; const rawName = a.name || a.account_name || a.acc_name || ''; const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code); return <option key={code} value={code}>{code} - {name}</option>; })}
            </select>
          </div>
          <div>
            <label className={labelCls}>من تاريخ</label>
            <input type="date" lang="en-GB" dir="ltr" value={ledgerDateRange.start} onChange={e => setLedgerDateRange({...ledgerDateRange, start: e.target.value})} className={inputCls + " font-mono text-center tabular-nums"} />
          </div>
          <div>
            <label className={labelCls}>إلى تاريخ</label>
            <input type="date" lang="en-GB" dir="ltr" value={ledgerDateRange.end} onChange={e => setLedgerDateRange({...ledgerDateRange, end: e.target.value})} className={inputCls + " font-mono text-center tabular-nums"} />
          </div>
        </div>

        {/* بطاقات الحسابات */}
        {groupedLedgerAccounts.length === 0 ? (
          <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد حركات في دفتر الأستاذ للفترة أو الحساب المختار 📖</div>
        ) : (
          <div className="space-y-6">
            {groupedLedgerAccounts.map(accGroup => (
              <div key={accGroup.account_code} className="rounded-2xl border border-[#E8E5EA] overflow-hidden bg-white shadow-xs">
                <div className="bg-[#FAFAFB] px-5 py-3.5 border-b border-[#E8E5EA] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8F2A87]"></span>
                    <h4 className="font-bold text-xs sm:text-sm text-[#25232A]">
                      حساب: <span className="font-mono text-[#8F2A87] font-bold">{accGroup.account_code}</span> - {accGroup.account_name}
                    </h4>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${accGroup.account_nature === 'credit' ? 'bg-[#F2E7F3] text-[#8F2A87]' : 'bg-[#E2F5F7] text-[#007F8C]'}`}>
                      طبيعة: {accGroup.account_nature === 'credit' ? 'دائن' : 'مدين'}
                    </span>
                  </div>
                  <div className="text-left font-mono font-bold text-xs">
                    <span className="text-[#6F6B75] ml-1.5 font-sans">الرصيد التراكمي:</span>
                    <span className={accGroup.final_balance_base >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}>
                      {accGroup.final_balance_base.toLocaleString('en-US',{minimumFractionDigits:2})} YER ﷼
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs table-fixed border-collapse">
                    <thead>
                      <tr className="bg-white text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
                        <th className="px-3.5 py-3 text-right w-[20%]">التاريخ ورقم القيد</th>
                        <th className="px-3.5 py-3 text-right w-[30%]">البيان</th>
                        <th className="px-3.5 py-3 text-left w-[15%]">العملة وسعر الصرف</th>
                        <th className="px-3.5 py-3 text-left w-[20%]">مدين / دائن (YER)</th>
                        <th className="px-3.5 py-3 text-left w-[15%]">الرصيد التراكمي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E5EA]">
                      {accGroup.rows.map(r => {
                        const origVal = r.debit_orig > 0 ? r.debit_orig : (r.credit_orig > 0 ? r.credit_orig : 0);
                        const isForeignRow = r.currency && !String(r.currency).includes('YER');
                        return (
                          <tr key={r.id} className="hover:bg-[#FAFAFB] transition-colors border-b border-[#E8E5EA]/60">
                            <td className="px-3.5 py-2.5 text-right">
                              <div className="font-mono text-[#6F6B75] text-[11px] tabular-nums flex items-center gap-1"><span>📅</span><span>{r.date}</span></div>
                              <div className="font-mono font-bold text-xs text-[#8F2A87] mt-0.5 truncate">{r.entry_no}</div>
                            </td>
                            <td className="px-3.5 py-2.5 text-right"><div className="font-medium text-[#25232A] text-xs truncate">{r.notes || '—'}</div></td>
                            <td className="px-3.5 py-2.5 text-left">
                              <div className="font-mono font-bold text-xs text-[#25232A] tabular-nums">{origVal.toLocaleString('en-US',{minimumFractionDigits:2})} <span className="text-[10px] text-[#6F6B75] font-normal">{r.currency}</span></div>
                              <div className="text-[10.5px] font-mono text-[#6F6B75] mt-0.5">سعر: {r.exchange_rate > 1 ? r.exchange_rate.toLocaleString('en-US') : '1.0'}</div>
                            </td>
                            <td className="px-3.5 py-2.5 text-left">
                              <div className="flex items-center gap-2"><span className="text-[10.5px] font-bold text-[#007F8C] bg-[#E2F5F7] px-1.5 py-0.5 rounded">مدين</span><span className="font-mono font-bold text-xs text-[#007F8C] tabular-nums">{r.debit_base > 0 ? r.debit_base.toLocaleString('en-US',{minimumFractionDigits:2}) : '0.00'}</span></div>
                              <div className="flex items-center gap-2 mt-1"><span className="text-[10.5px] font-bold text-[#D64545] bg-rose-50 px-1.5 py-0.5 rounded">دائن</span><span className="font-mono font-bold text-xs text-[#D64545] tabular-nums">{r.credit_base > 0 ? r.credit_base.toLocaleString('en-US',{minimumFractionDigits:2}) : '0.00'}</span></div>
                            </td>
                            <td className="px-3.5 py-2.5 text-left">
                              <div className={`font-mono font-extrabold text-xs tabular-nums ${r.running_balance_base >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}`}>
                                {isForeignRow ? `${r.running_balance_orig.toLocaleString('en-US',{minimumFractionDigits:2})} ${r.currency}` : r.running_balance_base.toLocaleString('en-US',{minimumFractionDigits:2})}
                              </div>
                              <div className="text-[10px] text-[#6F6B75] font-sans mt-0.5">YER ﷼</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

window.JournalLedgerTab = JournalLedgerTab;
