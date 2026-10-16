// AdvancesView.jsx - واجهة حركة السلف والعهد النقدية للعاملين (نمط CRM المدمج)
function AdvancesView({
  advances = [],
  loadingAdvances = false,
  payrollMonth = "2026-10",
  setPayrollMonth,
  loadAdvances,
  onOpenNewAdvanceModal,
  onPrintVoucher,
  currencyDisplay = "SAR",
}) {
  const formatMonthLabel = (m) => {
    if (!m) return "";
    const [year, month] = m.split("-");
    const months = {
      "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
      "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
      "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر"
    };
    return `${months[month] || month} ${year}`;
  };

  const formatTag = (code, prefix = "ADV") => {
    if (!code) return "—";
    const m = String(code).match(/(\d{4,})$/);
    if (m) return `#${prefix}-${m[1].slice(-4)}`;
    return code.length > 8 ? `#${prefix}-${code.slice(-4)}` : `#${code}`;
  };

  const totalAdvancesAmount = advances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

  return (
    <div className="h-full min-h-0 flex flex-col gap-2 animate-fadeIn select-none text-right" dir="rtl">
      {/* شريط الإجراءات المدمج أحادي السطر */}
      <div className="h-9 shrink-0 flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 px-3 rounded-xl select-none">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" />
          </svg>
          <h3 className="text-xs font-bold text-white">السلف والعهد النقدية للعاملين</h3>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.2 rounded-full font-mono">
            {advances.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* محدد الشهر النظيف بالأرقام اللاتينية الغربية */}
          <div className="relative flex items-center">
            <span className="h-7 px-2.5 border border-slate-700 rounded-lg font-bold bg-[#0F172A] text-white text-xs flex items-center gap-1.5 cursor-pointer hover:border-slate-600 transition">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatMonthLabel(payrollMonth)}</span>
            </span>
            <input
              type="month"
              value={payrollMonth}
              onChange={(e) => setPayrollMonth && setPayrollMonth(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          <button
            type="button"
            onClick={() => loadAdvances && loadAdvances(payrollMonth)}
            className="h-7 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            title="تحديث قائمة السلف"
          >
            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>تحديث</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewAdvanceModal}
            className="h-7 px-3 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>صرف سلفة نقدية</span>
          </button>
        </div>
      </div>

      {/* جدول كشف السلف والحركات */}
      <div className="flex-1 min-h-0 flex flex-col bg-[#111C38] p-3 rounded-xl border border-slate-800 shadow-xs gap-0 overflow-hidden">
        {loadingAdvances ? (
          <div className="p-12 text-center text-slate-400 text-xs">جاري تحميل كشف السلف... ⏳</div>
        ) : advances.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-dashed border-slate-800 my-auto">
            <svg className="w-8 h-8 text-slate-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" />
            </svg>
            <p className="text-xs font-bold text-white">لا توجد سلف نقدية مسجلة لشهر {formatMonthLabel(payrollMonth)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">اضغط على زر "صرف سلفة نقدية" لتسجيل سلفة وترحيل القيد المحاسبي فورياً.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-700/80 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead className="sticky top-0 z-10 bg-slate-900/95 text-white/90 font-bold border-b border-slate-700">
                  <tr>
                    <th className="py-2 px-2.5 text-[11px]">تاريخ الصرف</th>
                    <th className="py-2 px-2.5 text-[11px]">اسم الموظف</th>
                    <th className="py-2 px-2.5 text-[11px]">المبلغ المنصرف</th>
                    <th className="py-2 px-2.5 text-[11px]">الصندوق / الخزينة</th>
                    <th className="py-2 px-2.5 text-[11px]">رقم السند / القيد</th>
                    <th className="py-2 px-2.5 text-[11px]">البيان والملاحظات</th>
                    <th className="py-2 px-2.5 text-[11px] text-center">الحالة</th>
                    <th className="py-2 px-2.5 text-[11px] text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#111C38] font-medium">
                  {advances.map((adv, idx) => {
                    const isSettled = adv.status === 'settled' || adv.status === 'تسوية' || adv.is_settled;
                    return (
                      <tr key={adv.id || idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-1.5 px-2.5 font-mono text-xs text-slate-300">
                          {adv.date ? adv.date.slice(0, 10) : "—"}
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span className="font-bold text-white text-xs block">{adv.employee_name}</span>
                          {adv.employee_id && (
                            <span className="text-[10px] text-slate-400 font-mono">{adv.employee_id}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 font-bold font-mono text-rose-400 text-xs tabular-nums">
                          {parseFloat(adv.amount || 0).toLocaleString("en-US")}{" "}
                          <span className="text-[10px] font-sans font-medium text-slate-400">
                            {adv.currency || currencyDisplay}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5">
                          <span className="text-[11px] font-bold text-slate-200 block">
                            {adv.account_name || adv.box_name || adv.account_id || "الصندوق الرئيسي"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {adv.account_id || "ACC-101"}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5">
                          <div className="flex flex-col gap-0.5 font-mono text-[10px]">
                            <span className="text-pink-400 font-bold" title={adv.payment_no}>
                              {formatTag(adv.payment_no || adv.id, "ADV")}
                            </span>
                            <span className="text-cyan-400" title={adv.entry_no || adv.jv_no}>
                              {formatTag(adv.entry_no || adv.jv_no, "JV")}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2.5 text-xs text-slate-300 max-w-xs truncate" title={adv.notes}>
                          {adv.notes || "سلفة تحت حساب الراتب"}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border inline-block whitespace-nowrap ${
                            isSettled
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {isSettled ? 'تمت التسوية ✓' : 'جارية (بانتظار الخصم)'}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => onPrintVoucher && onPrintVoucher(adv)}
                            className="h-6 px-2 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer mx-auto"
                            title="طباعة سند الصرف الرسمي"
                          >
                            <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>طباعة</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* شريط الإجمالي السفلي الثابت */}
            <div className="sticky bottom-0 z-10 h-8 px-4 bg-[#0F172A] border-t border-slate-700 flex items-center justify-between text-xs font-bold text-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium text-[11px]">عدد السلف المسجلة:</span>
                <span className="text-white font-mono text-xs">{advances.length} سلفة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-medium text-[11px]">إجمالي سلف الشهر:</span>
                <span className="text-rose-400 font-mono font-bold text-xs tracking-wide">
                  {totalAdvancesAmount.toLocaleString("en-US")} YER
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.AdvancesView = AdvancesView;
window.AdvancesLoansLedger = AdvancesView;
