// AccountsTable.jsx - العرض الجدولي للحسابات مع الأرصدة المدينة والدائنة والرصيد الحالي
// الهوية البصرية المطابقة لشاشة السندات والمعاملات المالية | Standard Compliant (< 220 lines)

function AccountsTable({
  accountsWithRollupBalances = [],
  isBaseCurrency, activeTargetCurr, currDef = { display: 'YER ﷼', decimals: 0 },
  onOpenEditModal, onToggleStatus, onDeleteAccount, onViewDetail
}) {
  const postingAccounts = accountsWithRollupBalances.filter(a => !a.hasChildren);

  const fmt = (val) => {
    const v = isBaseCurrency ? val : (window.CurrencyService ? window.CurrencyService.fromBase(val, activeTargetCurr) : val);
    return Number(v || 0).toLocaleString('en-US', {
      minimumFractionDigits: isBaseCurrency ? 0 : (currDef.decimals || 2),
      maximumFractionDigits: currDef.decimals !== undefined ? currDef.decimals : 2
    });
  };

  const typeBadgeClass = (t) => {
    switch (t) {
      case 'أصول': return 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60';
      case 'خصوم': return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
      case 'حقوق ملكية': return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60';
      case 'إيرادات': return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
      default: return 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/60';
    }
  };

  if (postingAccounts.length === 0) {
    return (
      <div className="bg-white dark:bg-[#111C38] rounded-xl p-8 border border-slate-200 dark:border-slate-800 text-center text-slate-400 select-none">
        <svg className="w-7 h-7 mx-auto mb-1 text-slate-400 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">لا توجد حسابات حركة لعرضها في الجدول</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 select-none">
      <div className="p-2 px-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0F172A]">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100">قائمة الحسابات الجدولية (حسابات الحركة)</h3>
        </div>
        <span className="text-[9.5px] bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 font-bold px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800/50 font-mono">
          {postingAccounts.length} حساب
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shadow-xs">
            <tr className="h-7.5">
              <th className="h-7.5 py-1.5 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden">كود الحساب</th>
              <th className="h-7.5 py-1.5 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden">اسم الحساب</th>
              <th className="h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden text-center">النوع</th>
              <th className="h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden text-center">الطبيعة</th>
              <th className="h-7.5 py-1.5 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden text-left">إجمالي المدين</th>
              <th className="h-7.5 py-1.5 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden text-left">إجمالي الدائن</th>
              <th className="h-7.5 py-1.5 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden text-left">الرصيد الحالي ({activeTargetCurr})</th>
              <th className="h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden text-center">الحالة</th>
              <th className="h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
            {postingAccounts.map((acc, idx) => {
              const balance = parseFloat(acc.balance) || 0;
              const totalDebit = parseFloat(acc.total_debit) || 0;
              const totalCredit = parseFloat(acc.total_credit) || 0;
              const isCredit = acc.nature === 'credit';
              const cannotDelete = Math.abs(balance) > 0.001 || acc.hasChildren;

              return (
                <tr key={acc.id || acc.code || idx}
                  className={`h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors ${acc.is_active === 0 ? 'opacity-50' : ''}`}>

                  <td className="py-1.5 px-2.5 text-right whitespace-nowrap" dir="ltr">
                    <span className="font-mono text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                      {acc.code}
                    </span>
                  </td>

                  <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-[11px]">{acc.name}</span>
                    {acc.name_en && (
                      <span className="block text-[9.5px] text-slate-400 dark:text-slate-500 font-mono font-medium">{acc.name_en}</span>
                    )}
                  </td>

                  <td className="py-1.5 px-2 text-center whitespace-nowrap">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${typeBadgeClass(acc.account_type)}`}>
                      {acc.account_type}
                    </span>
                  </td>

                  <td className="py-1.5 px-2 text-center whitespace-nowrap">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${
                      isCredit ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                    }`}>
                      {isCredit ? 'دائن' : 'مدين'}
                    </span>
                  </td>

                  <td className="py-1.5 px-2.5 text-left font-mono tabular-nums text-slate-700 dark:text-slate-200 font-bold text-xs whitespace-nowrap">
                    {fmt(totalDebit)}
                    <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-normal mr-1">YER</span>
                  </td>

                  <td className="py-1.5 px-2.5 text-left font-mono tabular-nums text-slate-700 dark:text-slate-200 font-bold text-xs whitespace-nowrap">
                    {fmt(totalCredit)}
                    <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-normal mr-1">YER</span>
                  </td>

                  <td className="py-1.5 px-2.5 text-left font-mono tabular-nums whitespace-nowrap">
                    <span dir="ltr" className={`inline-block font-bold text-xs ${
                      balance > 0 ? 'text-slate-900 dark:text-white' : balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {fmt(balance)}
                    </span>
                    <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-normal mr-1">{currDef.display}</span>
                  </td>

                  <td className="py-1.5 px-2 text-center whitespace-nowrap">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                      acc.is_active === 1 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}>
                      {acc.is_active === 1 ? 'نشط' : 'معطل'}
                    </span>
                  </td>

                  <td className="py-1.5 px-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onViewDetail(acc)} title="عرض التفاصيل"
                        className="w-5.5 h-5.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center transition cursor-pointer shrink-0">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button onClick={() => onOpenEditModal(acc)} title="تعديل"
                        className="w-5.5 h-5.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center transition cursor-pointer shrink-0">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={() => onToggleStatus(acc)} title={acc.is_active === 1 ? 'تعطيل' : 'تفعيل'}
                        className="w-5.5 h-5.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center transition cursor-pointer shrink-0">
                        {acc.is_active === 1 ? (
                          <svg className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => !cannotDelete && onDeleteAccount(acc)}
                        disabled={cannotDelete}
                        title={cannotDelete ? "لا يمكن حذف حساب يحتوي على رصيد مالي أو حسابات فرعية" : "حذف"}
                        className={`w-5.5 h-5.5 rounded border border-slate-200 dark:border-slate-700/60 flex items-center justify-center transition shrink-0 ${
                          cannotDelete
                            ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-40'
                            : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60 cursor-pointer'
                        }`}
                      >
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.AccountsTable = AccountsTable;
