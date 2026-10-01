/**
 * ExpensesTable.jsx
 * جدول استعراض بنود المصاريف التشغيلية والإجراءات المالية
 * Little Princesses ERP - Architectural Standards Compliant
 */

function ExpensesTable({
  expenses = [],
  currencyDisplay = "YER ﷼",
  onDeleteExpense,
  onPrintExpense
}) {
  const PrintIcon = (window.Icons && window.Icons.Printer) || (() => <span>🖨️</span>);
  const TrashIcon = (window.Icons && window.Icons.Trash) || (() => <span>🗑️</span>);

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
      {(!expenses || expenses.length === 0) ? (
        <div className="text-center py-12 text-[#6F6B75] text-xs font-medium bg-[#FAFAFB]">
          <span className="text-2xl block mb-2">💸</span>
          <span>لا توجد مصروفات تطابق شروط البحث الحالية</span>
        </div>
      ) : (
        <table className="w-full text-xs text-right" dir="rtl">
          <thead>
            <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
              <th className="px-4 py-3 text-right">البند / التصنيف</th>
              <th className="px-4 py-3 text-right">البيان / الشرح</th>
              <th className="px-4 py-3 text-right">المبلغ</th>
              <th className="px-4 py-3 text-right">حساب الصرف</th>
              <th className="px-4 py-3 text-right">طريقة الدفع</th>
              <th className="px-4 py-3 text-right">التاريخ</th>
              <th className="px-4 py-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E5EA] bg-white">
            {expenses.map(e => {
              const rowKey = e.id || e.expense_no || Math.random();
              const amtNum = parseFloat(e.amount) || 0;
              const currText = e.currency || currencyDisplay;

              return (
                <tr key={rowKey} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="px-4 py-3 font-bold text-[#25232A]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{e.exp_category || e.category || 'مصروف تشغيلي'}</span>
                      {e.isVoucher && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                          سند صرف
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-[#6F6B75] max-w-xs truncate" title={e.notes || '—'}>
                    {e.notes || '—'}
                  </td>

                  <td className="px-4 py-3 font-bold font-mono tabular-nums text-[#D64545]">
                    {amtNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-[10px] font-medium text-[#6F6B75] font-sans">{currText}</span>
                  </td>

                  <td className="px-4 py-3 text-[#6F6B75] font-mono text-[11px]">
                    {e.account_id || e.payment_source || '—'}
                  </td>

                  <td className="px-4 py-3 text-[#6F6B75]">
                    {e.payment_method || e.pay_method || 'نقدي'}
                  </td>

                  <td className="px-4 py-3 text-[#6F6B75] font-mono text-[11px]">
                    {e.date || '—'}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {onPrintExpense && (
                        <button
                          type="button"
                          onClick={() => onPrintExpense(e)}
                          title="طباعة سند صرف المصروف"
                          className="w-7 h-7 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 inline-flex items-center justify-center cursor-pointer transition"
                        >
                          <PrintIcon className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onDeleteExpense && (
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(e)}
                          title="حذف المصروف وإلغاء القيد المالي"
                          className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-[#D64545] rounded-lg text-xs font-bold border border-rose-200 inline-flex items-center justify-center cursor-pointer transition"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

window.ExpensesTable = ExpensesTable;
