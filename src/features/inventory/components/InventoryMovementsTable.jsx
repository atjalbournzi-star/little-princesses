// src/features/inventory/components/InventoryMovementsTable.jsx
// جدول استعراض سجل حركات وتدقيق المخزون والمناقلات العامة

function InventoryMovementsTable({ transactions = [] }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-12 text-center text-[#6F6B75] text-xs font-medium">
        لا توجد حركات مخزنية مسجلة في السجل العام 📊
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E8E5EA]">
        <span className="text-base font-bold text-[#25232A]">سجل حركات وتدقيق المخزون والمناقلات 📊</span>
        <span className="text-xs bg-[#E2F5F7] text-[#007F8C] px-2.5 py-0.5 rounded-full font-mono font-bold">
          {transactions.length} حركة
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#FAFAFB] text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
              <th className="px-3 py-2.5 text-right">التاريخ</th>
              <th className="px-3 py-2.5 text-right">نوع الحركة</th>
              <th className="px-3 py-2.5 text-right">الصنف والمستودع</th>
              <th className="px-3 py-2.5 text-left">الكمية</th>
              <th className="px-3 py-2.5 text-left">التكلفة (ر.ي)</th>
              <th className="px-3 py-2.5 text-right">المرجع</th>
              <th className="px-3 py-2.5 text-right">المستخدم</th>
              <th className="px-3 py-2.5 text-right">البيان</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E5EA] bg-white">
            {transactions.map((t, idx) => {
              const tQty = parseFloat(t.quantity || 0);
              const isPositive = tQty > 0;
              const dateStr = t.created_at ? t.created_at.split('T')[0] : '—';
              const uCost = parseFloat(t.unit_cost || 0);
              const typeLabel = t.transaction_type === 'PURCHASE_RECEIPT' ? 'توريد مشتريات 📥' :
                t.transaction_type === 'PRODUCTION_CONSUMPTION' ? 'صرف إنتاجي ✂️' :
                t.transaction_type === 'SALE_OUT' ? 'صرف مبيعات 🛍️' :
                t.transaction_type === 'TRANSFER' ? 'مناقلة مستودعية 🔄' :
                t.transaction_type === 'WASTAGE' ? 'تالف وهدر ⚠️' :
                (t.transaction_type || 'حركة مخزنية');
              return (
                <tr key={t.id || idx} className="hover:bg-[#FAFAFB]">
                  <td className="px-3 py-2 font-mono text-[#6F6B75] text-[11px]">{dateStr}</td>
                  <td className="px-3 py-2 font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      t.transaction_type === 'WASTAGE' ? 'bg-rose-50 text-rose-600' :
                      t.transaction_type === 'GAIN' || isPositive ? 'bg-emerald-50 text-emerald-600' :
                      t.transaction_type === 'TRANSFER' ? 'bg-amber-50 text-amber-600' : 'bg-[#E2F5F7] text-[#007F8C]'
                    }`}>
                      {typeLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] font-bold text-slate-800">
                    <div>{t.item_name || t.fabric_id || t.inventory_id || '—'}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{t.warehouse_name || 'المستودع الرئيسي'}</div>
                  </td>
                  <td className={`px-3 py-2 font-mono font-bold text-left dir-ltr ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isPositive ? `+${tQty}` : tQty}
                  </td>
                  <td className="px-3 py-2 font-mono text-left text-[11px] text-[#6F6B75]">
                    {uCost > 0 ? uCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[#6F6B75]">{t.reference_id || t.id || '—'}</td>
                  <td className="px-3 py-2 text-[11px] text-[#6F6B75]">{t.user_name || t.created_by || 'النظام'}</td>
                  <td className="px-3 py-2 text-[#6F6B75] text-[11px]">{t.notes || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.InventoryMovementsTable = InventoryMovementsTable;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InventoryMovementsTable;
}
