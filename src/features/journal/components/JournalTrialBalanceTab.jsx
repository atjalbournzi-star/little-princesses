// src/features/journal/components/JournalTrialBalanceTab.jsx
// Trial Balance tab: standard 5-column accounting table with totals footer

function JournalTrialBalanceTab({ trialBalance, isTrialLoading }) {
  const tb = trialBalance || { rows: [], grand_total_debit: 0, grand_total_credit: 0, is_balanced: true, diff: 0 };

  const processedRows = React.useMemo(() => {
    return (tb.rows || []).map(r => {
      const isCredit = String(r.nature || '').toLowerCase() === 'credit' ||
        ['خصوم', 'حقوق', 'إيراد', 'liab', 'equity', 'rev', 'شريك', 'شركاء', 'رأس المال'].some(k => String(r.type || '').toLowerCase().includes(k) || String(r.name || '').toLowerCase().includes(k)) ||
        (r.code && (String(r.code).startsWith('2') || String(r.code).startsWith('3') || String(r.code).startsWith('4')));

      let closingDebit = 0;
      let closingCredit = 0;

      const debBal = Number(r.debit_balance_base) || 0;
      const crdBal = Number(r.credit_balance_base) || 0;

      if (debBal > 0.0001) {
        closingDebit = debBal;
        closingCredit = 0;
      } else if (crdBal > 0.0001) {
        closingDebit = 0;
        closingCredit = crdBal;
      } else {
        const openDeb = (!isCredit && Number(r.opening_balance_base) > 0) ? Number(r.opening_balance_base) : 0;
        const openCrd = (isCredit && Number(r.opening_balance_base) > 0) ? Number(r.opening_balance_base) : 0;
        const totDeb = openDeb + (Number(r.total_debit_base) || 0);
        const totCrd = openCrd + (Number(r.total_credit_base) || 0);
        const net = totDeb - totCrd;

        if (net > 0.0001) {
          closingDebit = net;
          closingCredit = 0;
        } else if (net < -0.0001) {
          closingDebit = 0;
          closingCredit = Math.abs(net);
        } else if (r.net_balance_base) {
          const absNet = Math.abs(Number(r.net_balance_base));
          if (isCredit) {
            closingCredit = absNet;
            closingDebit = 0;
          } else {
            closingDebit = absNet;
            closingCredit = 0;
          }
        } else if (isCredit && (totCrd > 0 || Number(r.opening_balance_base) > 0)) {
          closingCredit = Math.abs(totCrd - totDeb) || Number(r.opening_balance_base) || 0;
          closingDebit = 0;
        }
      }

      if (isCredit) {
        if (closingCredit === 0 && closingDebit > 0) {
          closingCredit = closingDebit;
        }
        closingDebit = 0;
      } else {
        if (closingDebit === 0 && closingCredit > 0) {
          closingDebit = closingCredit;
        }
        closingCredit = 0;
      }

      return {
        ...r,
        isCredit,
        closingDebit,
        closingCredit
      };
    });
  }, [tb.rows]);

  const grandDebitMovements = tb.grand_total_debit || processedRows.reduce((s, r) => s + (Number(r.total_debit_base) || 0), 0);
  const grandCreditMovements = tb.grand_total_credit || processedRows.reduce((s, r) => s + (Number(r.total_credit_base) || 0), 0);

  const calcClosingDebit = processedRows.reduce((s, r) => s + (r.closingDebit || 0), 0);
  const calcClosingCredit = processedRows.reduce((s, r) => s + (r.closingCredit || 0), 0);

  const grandClosingDebit = (tb.grand_total_debit_balance && tb.grand_total_debit_balance > 0)
    ? tb.grand_total_debit_balance
    : calcClosingDebit;

  const grandClosingCredit = (tb.grand_total_credit_balance && tb.grand_total_credit_balance > 0)
    ? tb.grand_total_credit_balance
    : calcClosingCredit;

  const balanceDiff = Math.abs(grandClosingDebit - grandClosingCredit);
  const isBalanced = balanceDiff < 0.05 && Math.abs(grandDebitMovements - grandCreditMovements) < 0.05;

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

        {/* الجدول أو حالة التحميل */}
        {isTrialLoading ? (
          <div className="text-center py-12 text-[#8F2A87] text-xs font-bold flex items-center justify-center gap-2">
            <span className="animate-spin text-base">⏳</span>
            <span>جاري احتساب مجاميع وأرصدة ميزان المراجعة من السيرفر وقاعدة البيانات...</span>
          </div>
        ) : processedRows.length === 0 ? (
          <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد حركات مسجلة في ميزان المراجعة للفترة المحددة ⚖️</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-xs table-fixed border-collapse min-w-[850px]">
              <thead className="bg-[#FAFAFB] text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
                <tr>
                  <th className="px-4 py-3 text-right w-[28%] whitespace-nowrap">كود واسم الحساب</th>
                  <th className="px-4 py-3 text-left w-[18%] whitespace-nowrap">مجموع حركات مدين (YER)</th>
                  <th className="px-4 py-3 text-left w-[18%] whitespace-nowrap">مجموع حركات دائن (YER)</th>
                  <th className="px-4 py-3 text-left w-[18%] whitespace-nowrap">رصيد ختامي مدين (YER)</th>
                  <th className="px-4 py-3 text-left w-[18%] whitespace-nowrap">رصيد ختامي دائن (YER)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedRows.map(r => (
                  <tr key={r.code} className="hover:bg-[#FAFAFB] transition-colors border-b border-[#E8E5EA]/60">
                    <td className="px-4 py-3 text-right align-middle">
                      <div className="font-bold text-xs text-[#25232A] truncate">
                        <span className="font-mono font-bold text-[#8F2A87] ml-1.5">{r.code}</span>
                        <span>{r.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAFAFB] border border-[#E8E5EA] text-[#6F6B75] font-medium inline-block">{r.type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${r.isCredit ? 'bg-[#F2E7F3] text-[#8F2A87]' : 'bg-[#E2F5F7] text-[#007F8C]'}`}>
                          {r.isCredit ? 'دائن' : 'مدين'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left align-middle whitespace-nowrap">
                      <span className="font-mono font-bold text-xs text-[#007F8C] tabular-nums">
                        {(Number(r.total_debit_base) || 0) > 0 ? `${(Number(r.total_debit_base) || 0).toLocaleString('en-US',{minimumFractionDigits:2})} YER` : '0.00 YER'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left align-middle whitespace-nowrap">
                      <span className="font-mono font-bold text-xs text-[#D64545] tabular-nums">
                        {(Number(r.total_credit_base) || 0) > 0 ? `${(Number(r.total_credit_base) || 0).toLocaleString('en-US',{minimumFractionDigits:2})} YER` : '0.00 YER'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left align-middle whitespace-nowrap">
                      <span className={`font-mono font-bold text-xs tabular-nums ${r.closingDebit > 0 ? 'text-[#007F8C]' : 'text-[#9E9AA4]'}`}>
                        {r.closingDebit > 0 ? `${r.closingDebit.toLocaleString('en-US',{minimumFractionDigits:2})} YER` : '0.00 YER'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left align-middle whitespace-nowrap">
                      <span className={`font-mono font-bold text-xs tabular-nums ${r.closingCredit > 0 ? 'text-[#D64545]' : 'text-[#9E9AA4]'}`}>
                        {r.closingCredit > 0 ? `${r.closingCredit.toLocaleString('en-US',{minimumFractionDigits:2})} YER` : '0.00 YER'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            <tfoot>
              <tr className="bg-[#FAFAFB] border-t-2 border-[#E8E5EA] font-extrabold text-[#25232A]">
                <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                  <div className="font-bold text-sm text-[#25232A]">الإجمالي العام وتأكيد التوازن</div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold ${isBalanced ? 'bg-emerald-100 text-[#137333]' : 'bg-rose-100 text-[#D64545]'}`}>
                      {isBalanced ? 'الميزان متوازن ✅' : `⚠️ غير متوازن (فرق: ${balanceDiff.toLocaleString('en-US',{minimumFractionDigits:2})})`}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-left align-middle whitespace-nowrap"><span className="font-mono font-bold text-xs sm:text-sm text-[#007F8C] tabular-nums">{grandDebitMovements.toLocaleString('en-US',{minimumFractionDigits:2})} YER</span></td>
                <td className="px-4 py-3.5 text-left align-middle whitespace-nowrap"><span className="font-mono font-bold text-xs sm:text-sm text-[#D64545] tabular-nums">{grandCreditMovements.toLocaleString('en-US',{minimumFractionDigits:2})} YER</span></td>
                <td className="px-4 py-3.5 text-left align-middle whitespace-nowrap"><span className="font-mono font-bold text-xs sm:text-sm text-[#007F8C] tabular-nums">{grandClosingDebit.toLocaleString('en-US',{minimumFractionDigits:2})} YER</span></td>
                <td className="px-4 py-3.5 text-left align-middle whitespace-nowrap"><span className="font-mono font-bold text-xs sm:text-sm text-[#D64545] tabular-nums">{grandClosingCredit.toLocaleString('en-US',{minimumFractionDigits:2})} YER</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}

window.JournalTrialBalanceTab = JournalTrialBalanceTab;
