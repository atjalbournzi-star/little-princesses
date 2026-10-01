// AdvancesView.jsx - واجهة حركة السلف والعهد النقدية للعاملين وجدولها

function AdvancesView({
  advances = [],
  loadingAdvances = false,
  payrollMonth,
  setPayrollMonth,
  loadAdvances,
  onOpenNewAdvanceModal,
  onPrintVoucher,
  currencyDisplay = "SAR",
}) {
  const totalAdvancesSum = advances.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0
  );
  const uniqueBeneficiaries = new Set(
    advances.map((a) => a.employee_id || a.employee_name)
  ).size;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* الترويسة والأزرار */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center text-lg font-bold">
              💸
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#25232A]">
                إدارة السلف والعهد النقدية للعاملين (Advances & Loans Ledger)
              </h3>
              <p className="text-xs text-[#6F6B75]">
                صرف السلف مع تقييدها فوراً في حساب (ACC-107 سلف وذمم العاملين)
                والخصم التلقائي من مسير الرواتب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <input
              type="month"
              lang="en-GB"
              dir="ltr"
              value={payrollMonth}
              onChange={(e) => setPayrollMonth(e.target.value)}
              className="h-10 px-3 border border-[#E8E5EA] rounded-xl font-bold bg-white text-[#8F2A87] text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => loadAdvances(payrollMonth)}
              className="h-10 px-3.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl border border-[#E8E5EA] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="تحديث قائمة السلف"
            >
              <span>🔄</span>
              <span>تحديث</span>
            </button>
            <button
              type="button"
              onClick={onOpenNewAdvanceModal}
              className="h-10 px-4 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>➕</span>
              <span>صرف سلفة نقدية جديدة</span>
            </button>
          </div>
        </div>

        {/* بطاقات المؤشرات */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA]">
            <span className="text-xs text-[#6F6B75] font-semibold block">
              إجمالي السلف المنصرفة لشهر ({payrollMonth})
            </span>
            <span className="text-xl font-black font-mono text-[#8F2A87] mt-1 block">
              {totalAdvancesSum.toLocaleString("en-US")}{" "}
              <span className="text-xs text-[#6F6B75] font-sans">
                {currencyDisplay}
              </span>
            </span>
          </div>

          <div className="bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA]">
            <span className="text-xs text-[#6F6B75] font-semibold block">
              عدد سندات الصرف المعتمدة
            </span>
            <span className="text-xl font-black font-mono text-[#007F8C] mt-1 block">
              {advances.length}{" "}
              <span className="text-xs font-sans text-[#6F6B75]">سند صرف</span>
            </span>
          </div>

          <div className="bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA]">
            <span className="text-xs text-[#6F6B75] font-semibold block">
              المستفيدون من السلف
            </span>
            <span className="text-xl font-black font-mono text-emerald-700 mt-1 block">
              {uniqueBeneficiaries}{" "}
              <span className="text-xs font-sans text-[#6F6B75]">موظف</span>
            </span>
          </div>
        </div>
      </div>

      {/* جدول السلف */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
        <h4 className="font-bold text-sm text-[#25232A] flex items-center gap-2 border-b border-[#E8E5EA] pb-3">
          <span>📋</span> كشف حركة السلف والعهد النقدية ({advances.length})
        </h4>

        {loadingAdvances ? (
          <div className="p-12 text-center text-[#6F6B75]">
            جاري تحميل كشف السلف... ⏳
          </div>
        ) : advances.length === 0 ? (
          <div className="p-12 text-center text-[#6F6B75] bg-[#FAFAFB] rounded-xl border border-dashed border-[#E8E5EA]">
            <span className="text-4xl block mb-2">💸</span>
            <p className="text-xs font-bold text-[#25232A]">
              لا توجد سلف نقدية مسجلة لشهر {payrollMonth}
            </p>
            <p className="text-[11px] text-[#6F6B75] mt-1">
              اضغط على زر "صرف سلفة نقدية جديدة" لتسجيل سلفة وترحيل القيد المحاسبي فورياً.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                <tr>
                  <th className="p-3">تاريخ الصرف</th>
                  <th className="p-3">اسم الموظف</th>
                  <th className="p-3">المبلغ المنصرف</th>
                  <th className="p-3">الصندوق / الخزينة</th>
                  <th className="p-3">رقم السند</th>
                  <th className="p-3">رقم القيد اليومي</th>
                  <th className="p-3">البيان والملاحظات</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white font-medium">
                {advances.map((adv, idx) => (
                  <tr key={adv.id || idx} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="p-3 font-mono text-[11px] text-[#6F6B75]">
                      {adv.date ? adv.date.slice(0, 10) : "—"}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#25232A] block">
                        {adv.employee_name}
                      </span>
                      {adv.employee_id && (
                        <span className="text-[10px] text-[#6F6B75] font-mono">
                          {adv.employee_id}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold font-mono text-[#D64545] text-sm tabular-nums">
                      {parseFloat(adv.amount || 0).toLocaleString("en-US")}{" "}
                      <span className="text-[10px] font-sans font-medium text-[#6F6B75]">
                        {adv.currency || currencyDisplay}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-[11px] font-bold text-[#25232A] block">
                        {adv.account_name || adv.account_id || "الصندوق الرئيسي"}
                      </span>
                      <span className="text-[10px] text-[#6F6B75] font-mono">
                        {adv.account_id || "ACC-101"}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#8F2A87] text-xs">
                      {adv.payment_no || `PAY-ADV-${adv.id}`}
                    </td>
                    <td className="p-3 font-mono text-xs text-[#007F8C]">
                      {adv.entry_no || "قيد مرحل"}
                    </td>
                    <td className="p-3 text-[11px] text-[#6F6B75] max-w-xs">
                      {adv.notes || "سلفة تحت حساب الراتب"}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => onPrintVoucher(adv)}
                        className="px-2.5 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer mx-auto"
                        title="طباعة سند الصرف الرسمي"
                      >
                        <span>🖨️</span>
                        <span>طباعة السند</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
