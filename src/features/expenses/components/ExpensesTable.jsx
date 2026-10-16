/**
 * ExpensesTable.jsx
 * جدول استعراض بنود المصاريف التشغيلية والإجراءات المالية وحالة الاعتماد
 * Little Princesses ERP - Architectural Standards Compliant
 */

function ExpensesTable({
  expenses = [],
  currencyDisplay = "YER ﷼",
  onDeleteExpense,
  onPrintExpense,
  onApproveExpense
}) {
  const PrinterIcon = (window.Icons && window.Icons.Printer) || (({ className = "w-3 h-3" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ));
  const TrashIcon = (window.Icons && window.Icons.Trash) || (() => <span>🗑️</span>);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#111C38] shadow-xs select-none pb-10">
      {(!expenses || expenses.length === 0) ? (
        <div className="text-center py-8 text-slate-400 text-[11px] font-medium bg-[#111C38]">
          <span className="text-xl block mb-1.5">💸</span>
          <span>لا توجد مصروفات تطابق شروط البحث الحالية</span>
        </div>
      ) : (
        <table className="w-full text-right table-auto" dir="rtl">
          <thead>
            <tr className="bg-slate-900/70 text-slate-400 font-bold border-b border-slate-800">
              <th className="py-1 px-1.5 text-right text-[10px] font-bold text-slate-400">البند / التصنيف</th>
              <th className="py-1 px-1.5 text-right text-[10px] font-bold text-slate-400">البيان / الشرح</th>
              <th className="py-1 px-1.5 text-right text-[10px] font-bold text-slate-400">المبلغ الصافي</th>
              <th className="py-1 px-1.5 text-right text-[10px] font-bold text-slate-400">حساب الصرف</th>
              <th className="py-1 px-1.5 text-right text-[10px] font-bold text-slate-400">طريقة الدفع</th>
              <th className="py-1 px-1.5 text-center text-[10px] font-bold text-slate-400">حالة الاعتماد</th>
              <th className="py-1 px-1.5 text-center text-[10px] font-bold text-slate-400">التاريخ</th>
              <th className="py-1 px-1.5 text-center text-[10px] font-bold text-slate-400">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-[#111C38]">
            {expenses.map(e => {
              const rowKey = e.id || e.expense_no || Math.random();
              const amtNum = parseFloat(e.net_amount || e.amount || 0);
              const currText = e.currency || currencyDisplay;
              const isDraft = (e.status || '').toLowerCase() === 'draft';

              return (
                <tr key={rowKey} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-0.5 px-1.5 font-bold text-white text-[11px] leading-tight">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{e.exp_category || e.category || 'مصروف تشغيلي'}</span>
                      {e.isVoucher && (
                        <span className="text-[9px] bg-amber-950/40 text-amber-400 font-bold px-1 py-0.2 rounded border border-amber-600/30">
                          سند صرف
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-0.5 px-1.5 text-slate-200 text-[11px] leading-tight max-w-xs truncate" title={e.notes || '—'}>
                    {e.notes || '—'}
                  </td>

                  <td className="py-0.5 px-1.5 font-bold font-mono text-[11px] tabular-nums text-rose-400 leading-tight">
                    {amtNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-[9px] font-sans text-slate-400">{currText}</span>
                  </td>

                  <td className="py-0.5 px-1.5 text-slate-300 font-mono text-[10px] leading-tight">
                    {e.account_id || e.payment_source || '—'}
                  </td>

                  <td className="py-0.5 px-1.5 text-slate-200 text-[11px] leading-tight">
                    {e.payment_method || e.pay_method || 'نقد (كاش)'}
                  </td>

                  <td className="py-0.5 px-1.5 text-center leading-tight">
                    {isDraft ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        مسودة 📝
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        مرحل ومعتمد ✓
                      </span>
                    )}
                  </td>

                  <td className="py-0.5 px-1.5 text-center text-slate-400 font-mono text-[10px] leading-tight">
                    {e.date || e.expense_date || '—'}
                  </td>

                  <td className="py-0.5 px-1.5 text-center leading-tight">
                    <div className="flex items-center justify-center gap-1">
                      {isDraft && onApproveExpense && (
                        <button
                          type="button"
                          onClick={() => onApproveExpense(e)}
                          title="اعتماد المصروف وترحيله لدفتر الأستاذ وسندات الصرف"
                          className="h-5 px-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold inline-flex items-center gap-0.5 transition shadow-xs cursor-pointer"
                        >
                          <span>⚡</span>
                          <span>اعتماد</span>
                        </button>
                      )}

                      {onPrintExpense && (
                        <button
                          type="button"
                          onClick={() => onPrintExpense(e)}
                          title="طباعة سند صرف المصروف"
                          className="h-5 px-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white rounded text-[10px] font-bold border border-slate-700 inline-flex items-center justify-center cursor-pointer transition"
                        >
                          <PrinterIcon className="w-3 h-3" />
                        </button>
                      )}

                      {onDeleteExpense && (
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(e)}
                          title="حذف المصروف وإلغاء القيد المالي"
                          className="h-5 px-1.5 bg-slate-800 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 rounded text-[10px] font-bold border border-slate-700 inline-flex items-center justify-center cursor-pointer transition"
                        >
                          <TrashIcon className="w-3 h-3" />
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
window.ExpenseTable = ExpensesTable;