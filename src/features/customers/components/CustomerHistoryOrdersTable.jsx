// src/features/customers/components/CustomerHistoryOrdersTable.jsx
function CustomerHistoryOrdersTable({ customerOrders = [], voucherCurr = 'YER' }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
        <span>🛍️ سجل الطلبات السابقة ({customerOrders.length})</span>
      </h4>
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#0F172A]/40">
        {customerOrders.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400 font-medium">لا توجد طلبات سابقة مسجلة لهذا العميل حتى الآن</div>
        ) : (
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="h-6 bg-[#0F172A] text-slate-400 font-bold text-[10px] uppercase border-b border-slate-800">
                <th className="px-2 py-0.5">رقم الطلب</th>
                <th className="px-2 py-0.5">التاريخ</th>
                <th className="px-2 py-0.5">الموديل / الفستان</th>
                <th className="px-2 py-0.5">الاسم</th>
                <th className="px-2 py-0.5 text-center">الإجمالي</th>
                <th className="px-2 py-0.5 text-center">المدفوع</th>
                <th className="px-2 py-0.5 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {customerOrders.map(o => (
                <tr key={o.id || o.order_no} className="h-6 max-h-6 hover:bg-slate-800/40 text-[10px] text-white">
                  <td className="px-2 py-0.5 font-mono font-bold text-pink-400">{o.order_no || ('ORD-' + o.id)}</td>
                  <td className="px-2 py-0.5 font-mono text-slate-400 text-[9.5px]">{o.order_date || o.created_at || '—'}</td>
                  <td className="px-2 py-0.5 font-semibold text-white">{o.product_name || o.product || 'فستان مناسبات'}</td>
                  <td className="px-2 py-0.5 text-slate-300">{o.child_name || 'الأميرة'}</td>
                  <td className="px-2 py-0.5 font-mono font-bold text-center text-white">{parseFloat(o.total || o.total_amount || 0).toLocaleString()} {voucherCurr}</td>
                  <td className="px-2 py-0.5 font-mono text-emerald-400 font-bold text-center">{parseFloat(o.paid || o.paid_amount || 0).toLocaleString()} {voucherCurr}</td>
                  <td className="px-2 py-0.5 text-center"><span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/40">{o.status || 'قيد التنفيذ'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

window.CustomerHistoryOrdersTable = CustomerHistoryOrdersTable;
