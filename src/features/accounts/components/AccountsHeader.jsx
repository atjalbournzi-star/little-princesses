// AccountsHeader.jsx - رأس صفحة دليل الحسابات: بطاقات المؤشرات وأزرار العمليات الرئيسية
// يعتمد على: cleanCode (accountHelpers.js)

function AccountsHeader({
  accountsWithRollupBalances,
  isSyncing, isResetting,
  onSync, onReset, onAddPartner, onAddExpense, onAddMain, onAuditLog,
  currency, currDef, isBaseCurrency
}) {
  // ── حساب مؤشرات الملخص المالي ──────────────────────────────────────────────
  const totalAssets = accountsWithRollupBalances
    .filter(a => a.account_type === 'أصول' && !a.hasChildren && a.level >= 4)
    .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

  const totalLiabilities = accountsWithRollupBalances
    .filter(a => a.account_type === 'خصوم' && !a.hasChildren && a.level >= 4)
    .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

  const totalEquity = accountsWithRollupBalances
    .filter(a => a.account_type === 'حقوق ملكية' && !a.hasChildren && a.level >= 4)
    .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

  const totalAccounts = accountsWithRollupBalances.length;

  const fmt = (val) => {
    const v = isBaseCurrency ? val : (window.CurrencyService ? window.CurrencyService.fromBase(val, currency) : val);
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: isBaseCurrency ? 0 : (currDef.decimals || 2), maximumFractionDigits: (currDef.decimals !== undefined ? currDef.decimals : 2) });
  };

  const kpiCards = [
    { label: 'إجمالي الأصول', value: fmt(totalAssets), icon: '🏦', color: 'bg-[#E2F5F7] text-[#007F8C]', border: 'border-[#C5ECF0]' },
    { label: 'إجمالي الالتزامات', value: fmt(totalLiabilities), icon: '📋', color: 'bg-[#FFF1DC] text-[#C97300]', border: 'border-[#FFE4B9]' },
    { label: 'حقوق الملكية', value: fmt(totalEquity), icon: '⚖️', color: 'bg-[#F2E7F3] text-[#8F2A87]', border: 'border-[#E5CEE7]' },
    { label: 'عدد الحسابات', value: totalAccounts, icon: '📊', color: 'bg-[#FAFAFB] text-[#25232A]', border: 'border-[#E8E5EA]' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* الترويسة الرئيسية مع الأزرار */}
      <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xl font-bold shadow-xs">
            <Icons.Accounts className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-[#25232A]">
              الدليل المحاسبي وشجرة الحسابات (Chart of Accounts)
            </h1>
            <p className="text-xs text-[#6F6B75] mt-0.5">
              شجرة محاسبية هرمية مرنة مع الترقيم التلقائي وإدارة الأرصدة التجميعية
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onReset}
            disabled={isResetting}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-2.5 rounded-xl border border-rose-200 flex items-center gap-1.5 text-xs cursor-pointer transition shadow-xs disabled:opacity-50"
            title="تصفير ومسح الحسابات والمبالغ التجريبية"
          >
            <span>{isResetting ? '⏳ جاري التصفير...' : '🧹 تصفير دليل الحسابات'}</span>
          </button>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className="bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#8F2A87] font-bold px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] flex items-center gap-1.5 text-xs cursor-pointer transition shadow-xs disabled:opacity-50"
          >
            <span className={isSyncing ? "animate-spin" : ""}>🔄</span>
            <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة دليل الحسابات مع السحابة ☁️'}</span>
          </button>

          <button
            onClick={onAddPartner}
            className="bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] border border-[#C5ECF0] font-bold px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 text-xs cursor-pointer transition"
            title="إضافة حساب شريك جديد تحت رأس المال المباشر (301.xx) بتسلسل تلقائي"
          >
            <span>🤝</span> + إضافة شريك (رأس مال)
          </button>

          <button
            onClick={onAddExpense}
            className="bg-[#FFF1DC] hover:bg-[#FFE4B9] text-[#C97300] border border-[#FFE4B9] font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 text-xs cursor-pointer transition"
            title="إضافة بند مصروف تشغيلي جديد تحت قسم المصروفات في شجرة الحسابات"
          >
            <span>💸</span> + بند مصروف جديد
          </button>

          <button
            onClick={onAddMain}
            className="bg-[#B0005A] hover:bg-[#8E0049] text-white font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 text-xs cursor-pointer"
          >
            <span>+</span> إضافة حساب رئيسي
          </button>

          <button
            onClick={onAuditLog}
            className="bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] flex items-center gap-1.5 text-xs cursor-pointer"
          >
            📋 سجل التعديلات
          </button>
        </div>
      </div>

      {/* بطاقات مؤشرات الملخص المالي */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-x-reverse divide-[#E8E5EA]">
        {kpiCards.map((kpi, i) => (
          <div key={i} className="p-4 text-right">
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">{kpi.icon}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${kpi.color} ${kpi.border}`}>
                {kpi.label}
              </span>
            </div>
            <div className="font-mono font-extrabold text-sm text-[#25232A] tabular-nums text-left">
              {kpi.value}
              {i < 3 && <span className="text-[10px] text-[#6F6B75] font-normal mr-1">{currDef.display}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
