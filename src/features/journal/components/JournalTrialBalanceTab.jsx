// src/features/journal/components/JournalTrialBalanceTab.jsx
// Trial Balance tab: standard 5-column accounting table with totals footer

function JournalTrialBalanceTab({ trialBalance }) {
  const tb = trialBalance || { rows: [], grand_total_debit: 0, grand_total_credit: 0, is_balanced: true, diff: 0 };

  return (
    <div className="space-y-6 pb-6">
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-4">
        {/* رأس القسم */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚖️</span>
            <div>
              <h3 className="font-bold text-sm text-[#25232A]">جدول هيكلة ميزان المراجعة (Trial Balance Layout)</h3>
              <p className="text-[11px] text-[#6F6B75]">تقرير ميزان المراجعة بالمجاميع والأرصدة بالريال اليمني (YER)</p>
            </div>
          </div>
          <button onClick={() => window.print()} className="px-4 py-2 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer">
            🖨️ <span>طباعة ميزان المراجعة</span>
          </button>
        </div>

        {/* الجدول */}
        <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
          <table className="w-full text-xs table-fixed border-collapse">
            <thead className="bg-[#FAFAFB] text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
              <tr>
                <th className="px-4 py-3 text-right w-[32%] whitespace-nowrap">كود واسم الحساب</th>
                <th className="px-4 py-3 text-left w-[17%] whitespace-nowrap">مجموع حركات مدين (YER)</th>
                <th className="px-4 py-3 text-left w-[17%] whitespace-nowrap">مجموع حركات دائن (YER)</th>
                <th className="px-4 py-3 text-left w-[17%] whitespace-nowrap">رصيد مدين (YER)</th>
                <th className="px-4 py-3 text-left w-[17%] whitespace-nowrap">رصيد دائن (YER)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tb.rows.map(r => (
                <tr key={r.code} className="hover:bg-[#FAFAFB] transition-colors border-b border-[#E8E5EA]/60">
                  <td className="px-4 py-3 text-right align-middle">
                    <div className="font-bold text-xs text-[#25232A] truncate">
                      <span className="font-mono font-bold text-[#8F2A87] ml-1.5">{r.code}</span>
                      <span>{r.name}</span>
                    </div>
                    <div className="mt-1"><span className="text-[10.5px] px-2 py-0.5 rounded-md bg-[#FAFAFB] border border-[#E8E5EA] text-[#6F6B75] font-medium inline-block">{r.type}</span></div>
                  </td>
                  <td className="px-4 py-3 text-left align-middle">
                    <span className="font-mono font-bold text-xs text-[#007F8C] tabular-nums">{r.total_debit_base > 0 ? r.total_debit_base.toLocaleString('en-US',{minimumFractionDigits:2}) : '0.00'}</span>
                  </td>
                  <td className="px-4 py-3 text-left align-middle">
                    <span className="font-mono font-bold text-xs text-[#D64545] tabular-nums">{r.total_credit_base > 0 ? r.total_credit_base.toLocaleString('en-US',{minimumFractionDigits:2}) : '0.00'}</span>
                  </td>
                  <td className="px-4 py-3 text-left align-middle">
                    {r.debit_balance_base > 0
                      ? <span className="font-mono font-bold text-xs text-[#007F8C] tabular-nums">{r.debit_balance_base.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
                      : <span className="font-mono font-bold text-xs text-[#9E9AA4]">-</span>}
                  </td>
                  <td className="px-4 py-3 text-left align-middle">
                    {r.credit_balance_base > 0
                      ? <span className="font-mono font-bold text-xs text-[#D64545] tabular-nums">{r.credit_balance_base.toLocaleString('en-US',{minimumFractionDigits:2})}</span>
                      : <span className="font-mono font-bold text-xs text-[#9E9AA4]">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#FAFAFB] border-t-2 border-[#E8E5EA] font-extrabold text-[#25232A]">
                <td className="px-4 py-3.5 text-right align-middle">
                  <div className="font-bold text-sm text-[#25232A]">الإجمالي العام</div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold ${tb.is_balanced ? 'bg-emerald-100 text-[#137333]' : 'bg-rose-100 text-[#D64545]'}`}>
                      {tb.is_balanced ? 'الميزان متوازن ✅' : `⚠️ غير متوازن (فرق: ${tb.diff})`}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-left align-middle"><span className="font-mono font-bold text-xs sm:text-sm text-[#007F8C] tabular-nums">{tb.grand_total_debit.toLocaleString('en-US',{minimumFractionDigits:2})}</span></td>
                <td className="px-4 py-3.5 text-left align-middle"><span className="font-mono font-bold text-xs sm:text-sm text-[#D64545] tabular-nums">{tb.grand_total_credit.toLocaleString('en-US',{minimumFractionDigits:2})}</span></td>
                <td className="px-4 py-3.5 text-left align-middle"><span className="font-mono font-bold text-xs sm:text-sm text-[#007F8C] tabular-nums">{(tb.grand_total_debit_balance || tb.grand_total_debit).toLocaleString('en-US',{minimumFractionDigits:2})}</span></td>
                <td className="px-4 py-3.5 text-left align-middle"><span className="font-mono font-bold text-xs sm:text-sm text-[#D64545] tabular-nums">{(tb.grand_total_credit_balance || tb.grand_total_credit).toLocaleString('en-US',{minimumFractionDigits:2})}</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

window.JournalTrialBalanceTab = JournalTrialBalanceTab;
