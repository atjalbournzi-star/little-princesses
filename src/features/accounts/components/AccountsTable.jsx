// AccountsTable.jsx - العرض الجدولي للحسابات مع الأرصدة المدينة والدائنة والرصيد الحالي
// يعتمد على: cleanCode (accountHelpers.js)

function AccountsTable({
  accountsWithRollupBalances,
  isBaseCurrency, activeTargetCurr, currDef,
  onOpenEditModal, onToggleStatus, onDeleteAccount, onViewDetail
}) {
  // نعرض فقط حسابات الحركة (غير التجميعية) في الجدول بصورة افتراضية
  const postingAccounts = accountsWithRollupBalances.filter(a => !a.hasChildren);

  const fmt = (val) => {
    const v = isBaseCurrency ? val : (window.CurrencyService ? window.CurrencyService.fromBase(val, activeTargetCurr) : val);
    return Number(v || 0).toLocaleString('en-US', {
      minimumFractionDigits: isBaseCurrency ? 0 : (currDef.decimals || 2),
      maximumFractionDigits: currDef.decimals !== undefined ? currDef.decimals : 2
    });
  };

  if (postingAccounts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E5EA] text-center text-[#6F6B75]">
        <p className="text-3xl mb-2">📋</p>
        <p className="text-sm font-bold">لا توجد حسابات حركة لعرضها في الجدول</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E5EA] overflow-hidden">
      <div className="p-4 border-b border-[#E8E5EA] flex items-center justify-between bg-[#FAFAFB]">
        <h3 className="text-sm font-bold text-[#25232A]">📋 قائمة الحسابات الجدولية (حسابات الحركة)</h3>
        <span className="text-[11px] text-[#6F6B75] font-medium">{postingAccounts.length} حساب</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-[#FAFAFB] border-b border-[#E8E5EA]">
              <th className="p-3 text-[#6F6B75] font-bold">كود الحساب</th>
              <th className="p-3 text-[#6F6B75] font-bold">اسم الحساب</th>
              <th className="p-3 text-[#6F6B75] font-bold">النوع</th>
              <th className="p-3 text-[#6F6B75] font-bold">الطبيعة</th>
              <th className="p-3 text-[#6F6B75] font-bold text-left">إجمالي المدين</th>
              <th className="p-3 text-[#6F6B75] font-bold text-left">إجمالي الدائن</th>
              <th className="p-3 text-[#6F6B75] font-bold text-left">الرصيد الحالي ({activeTargetCurr})</th>
              <th className="p-3 text-[#6F6B75] font-bold">الحالة</th>
              <th className="p-3 text-[#6F6B75] font-bold text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {postingAccounts.map((acc, idx) => {
              const balance = parseFloat(acc.balance) || 0;
              const totalDebit = parseFloat(acc.total_debit) || 0;
              const totalCredit = parseFloat(acc.total_credit) || 0;
              const presentBalance = isBaseCurrency
                ? balance
                : (window.CurrencyService ? window.CurrencyService.fromBase(balance, activeTargetCurr) : balance);
              const isCredit = acc.nature === 'credit';

              return (
                <tr key={acc.id || acc.code || idx}
                  className={`border-b border-[#E8E5EA] hover:bg-[#FAFAFB] transition ${acc.is_active === 0 ? 'opacity-50' : ''}`}>

                  <td className="p-3">
                    <span className="font-mono bg-[#F2E7F3] text-[#8F2A87] px-2 py-0.5 rounded-md text-[11px] font-bold">
                      {acc.code}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className="font-medium text-[#25232A] text-xs">{acc.name}</span>
                    {acc.name_en && (
                      <span className="block text-[10px] text-[#6F6B75] font-mono">{acc.name_en}</span>
                    )}
                  </td>

                  <td className="p-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                      acc.account_type === 'أصول' ? 'bg-[#E2F5F7] text-[#007F8C]' :
                      acc.account_type === 'خصوم' ? 'bg-[#FFF1DC] text-[#C97300]' :
                      acc.account_type === 'حقوق ملكية' ? 'bg-[#F2E7F3] text-[#8F2A87]' :
                      acc.account_type === 'إيرادات' ? 'bg-[#E2F5F7] text-[#007F8C]' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {acc.account_type}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${isCredit ? 'bg-[#F2E7F3] text-[#8F2A87]' : 'bg-[#E2F5F7] text-[#007F8C]'}`}>
                      {isCredit ? 'دائن' : 'مدين'}
                    </span>
                  </td>

                  <td className="p-3 text-left font-mono tabular-nums text-[#007F8C] font-bold text-[11px]">
                    {fmt(totalDebit)}
                    <span className="text-[9px] text-[#6F6B75] font-normal mr-1">YER</span>
                  </td>

                  <td className="p-3 text-left font-mono tabular-nums text-[#8F2A87] font-bold text-[11px]">
                    {fmt(totalCredit)}
                    <span className="text-[9px] text-[#6F6B75] font-normal mr-1">YER</span>
                  </td>

                  <td className="p-3 text-left font-mono tabular-nums">
                    <span className={`font-extrabold text-[11px] ${presentBalance > 0 ? 'text-[#007F8C]' : presentBalance < 0 ? 'text-[#D64545]' : 'text-[#6F6B75]'}`}>
                      {fmt(balance)}
                    </span>
                    <span className="text-[9px] text-[#6F6B75] font-normal mr-1">{currDef.display}</span>
                  </td>

                  <td className="p-3 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${acc.is_active === 1 ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-rose-50 text-[#D64545]'}`}>
                      {acc.is_active === 1 ? 'نشط' : 'معطل'}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onViewDetail(acc)} title="عرض التفاصيل"
                        className="w-6 h-6 bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] rounded-lg text-[10px] flex items-center justify-center cursor-pointer">👁️</button>
                      <button onClick={() => onOpenEditModal(acc)} title="تعديل"
                        className="w-6 h-6 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg text-[10px] border border-[#E8E5EA] flex items-center justify-center cursor-pointer">✏️</button>
                      <button onClick={() => onToggleStatus(acc)} title={acc.is_active === 1 ? 'تعطيل' : 'تفعيل'}
                        className={`w-6 h-6 rounded-lg text-[10px] flex items-center justify-center cursor-pointer ${acc.is_active === 1 ? 'bg-[#FFF1DC] hover:bg-[#FFE4B9] text-[#C97300]' : 'bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C]'}`}>
                        {acc.is_active === 1 ? '🚫' : '✅'}
                      </button>
                      <button onClick={() => onDeleteAccount(acc)} title="حذف"
                        className="w-6 h-6 bg-rose-50 hover:bg-rose-100 text-[#D64545] rounded-lg text-[10px] border border-rose-200 flex items-center justify-center cursor-pointer">🗑️</button>
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
