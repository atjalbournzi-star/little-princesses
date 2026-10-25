// AccountsTable.jsx - العرض الجدولي للحسابات مع الأرصدة المدينة والدائنة والرصيد الحالي
// يعتمد على: cleanCode (accountHelpers.js)

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
      case 'أصول': return 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50';
      case 'خصوم': return 'bg-amber-950/40 text-amber-300 border-amber-800/50';
      case 'حقوق ملكية': return 'bg-pink-950/40 text-pink-300 border-pink-800/50';
      case 'إيرادات': return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50';
      default: return 'bg-rose-950/40 text-rose-300 border-rose-800/50';
    }
  };

  if (postingAccounts.length === 0) {
    return (
      <div className="bg-[#111C38] rounded-xl p-8 border border-slate-800 text-center text-slate-400">
        <svg className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-xs font-bold text-slate-300">لا توجد حسابات حركة لعرضها في الجدول</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111C38] rounded-xl border border-slate-800 shadow-md overflow-hidden">
      <div className="p-2 px-3 border-b border-slate-800 flex items-center justify-between bg-[#0F172A]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-[13px] font-bold text-white">قائمة الحسابات الجدولية (حسابات الحركة)</h3>
        </div>
        <span className="text-xs bg-slate-900 border border-slate-600 text-pink-200 px-2.5 py-0.5 rounded font-mono font-bold tabular-nums">
          {postingAccounts.length} حساب
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-[#0F172A] border-b border-slate-700 text-slate-200 text-xs font-bold">
              <th className="py-2 px-3">كود الحساب</th>
              <th className="py-2 px-3">اسم الحساب</th>
              <th className="py-2 px-3">النوع</th>
              <th className="py-2 px-3">الطبيعة</th>
              <th className="py-2 px-3 text-left">إجمالي المدين</th>
              <th className="py-2 px-3 text-left">إجمالي الدائن</th>
              <th className="py-2 px-3 text-left">الرصيد الحالي ({activeTargetCurr})</th>
              <th className="py-2 px-3 text-center">الحالة</th>
              <th className="py-2 px-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {postingAccounts.map((acc, idx) => {
              const balance = parseFloat(acc.balance) || 0;
              const totalDebit = parseFloat(acc.total_debit) || 0;
              const totalCredit = parseFloat(acc.total_credit) || 0;
              const isCredit = acc.nature === 'credit';
              const cannotDelete = Math.abs(balance) > 0.001 || acc.hasChildren;

              return (
                <tr key={acc.id || acc.code || idx}
                  className={`hover:bg-slate-800/40 transition-colors h-7.5 ${acc.is_active === 0 ? 'opacity-50' : ''}`}>

                  <td className="py-1.5 px-3">
                    <span className="font-mono bg-slate-900 text-pink-300 border border-slate-600 px-1.5 py-0.5 rounded text-[11px] font-extrabold tabular-nums">
                      {acc.code}
                    </span>
                  </td>

                  <td className="py-1.5 px-3">
                    <span className="font-semibold text-white text-[12.5px]">{acc.name}</span>
                    {acc.name_en && (
                      <span className="block text-[10.5px] text-slate-300 font-mono font-medium">{acc.name_en}</span>
                    )}
                  </td>

                  <td className="py-1.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${typeBadgeClass(acc.account_type)}`}>
                      {acc.account_type}
                    </span>
                  </td>

                  <td className="py-1.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${
                      isCredit ? 'bg-purple-950/70 text-purple-300 border-purple-600/60' : 'bg-cyan-950/70 text-cyan-300 border-cyan-600/60'
                    }`}>
                      {isCredit ? 'دائن' : 'مدين'}
                    </span>
                  </td>

                  <td className="py-1.5 px-3 text-left font-mono tabular-nums text-cyan-300 font-bold text-xs">
                    {fmt(totalDebit)}
                    <span className="text-[10px] text-slate-200 font-bold mr-1">YER</span>
                  </td>

                  <td className="py-1.5 px-3 text-left font-mono tabular-nums text-purple-300 font-bold text-xs">
                    {fmt(totalCredit)}
                    <span className="text-[10px] text-slate-200 font-bold mr-1">YER</span>
                  </td>

                  <td className="py-1.5 px-3 text-left font-mono tabular-nums">
                    <span className={`font-extrabold text-[12.5px] ${
                      balance > 0 ? 'text-white' : balance < 0 ? 'text-rose-300' : 'text-slate-300'
                    }`}>
                      {fmt(balance)}
                    </span>
                    <span className="text-[10.5px] text-slate-200 font-bold mr-1">{currDef.display}</span>
                  </td>

                  <td className="py-1.5 px-3 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${
                      acc.is_active === 1 ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60' : 'bg-rose-950/70 text-rose-300 border-rose-600/60'
                    }`}>
                      {acc.is_active === 1 ? 'نشط' : 'معطل'}
                    </span>
                  </td>

                  <td className="py-1.5 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onViewDetail(acc)} title="عرض التفاصيل"
                        className="w-5.5 h-5.5 rounded bg-slate-900 border border-slate-700/80 hover:border-cyan-500/60 hover:text-cyan-300 text-slate-400 flex items-center justify-center transition cursor-pointer">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button onClick={() => onOpenEditModal(acc)} title="تعديل"
                        className="w-5.5 h-5.5 rounded bg-slate-900 border border-slate-700/80 hover:border-pink-500/60 hover:text-pink-300 text-slate-400 flex items-center justify-center transition cursor-pointer">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={() => onToggleStatus(acc)} title={acc.is_active === 1 ? 'تعطيل' : 'تفعيل'}
                        className={`w-5.5 h-5.5 rounded bg-slate-900 border border-slate-700/80 flex items-center justify-center transition cursor-pointer ${
                          acc.is_active === 1 ? 'hover:border-amber-500/60 hover:text-amber-300 text-slate-400' : 'hover:border-emerald-500/60 hover:text-emerald-300 text-emerald-400'
                        }`}>
                        {acc.is_active === 1 ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => !cannotDelete && onDeleteAccount(acc)}
                        disabled={cannotDelete}
                        title={cannotDelete ? "لا يمكن حذف حساب يحتوي على رصيد مالي أو حسابات فرعية" : "حذف"}
                        className={`w-5.5 h-5.5 rounded border flex items-center justify-center transition ${
                          cannotDelete
                            ? 'bg-slate-950/40 text-slate-600 border-slate-800/80 cursor-not-allowed opacity-40'
                            : 'bg-slate-900 border-slate-700/80 hover:border-rose-500/60 hover:text-rose-400 text-slate-400 cursor-pointer'
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
