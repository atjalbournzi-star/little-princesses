// src/features/inventory/components/ItemMovementModal.jsx
// نافذة كارت الصنف وسجل الحركات التاريخية للوارد والمنصرف والمناقلات

function ItemMovementModal({
  item,
  onClose,
  transactions = [],
  currencyDisplay = 'YER ﷼'
}) {
  if (!item) return null;

  const u = window.inventoryUtils || {};
  const getItemName = u.getItemName || (i => i?.item_name || i?.name || '');
  const getItemQty = u.getItemQty || (i => parseFloat(i?.qty || i?.quantity || 0) || 0);
  const getItemCost = u.getItemCost || (i => parseFloat(i?.unit_cost || i?.cost || 0) || 0);
  const getItemUnit = u.getItemUnit || (i => i?.unit || 'متر');

  const itemName = getItemName(item);
  const curQty = getItemQty(item);
  const curCost = getItemCost(item);
  const unit = getItemUnit(item);
  const itemId = String(item.id || '');
  const itemCode = String(item.item_code || item.code || '');

  // تصفية الحركات الخاصة بهذا الصنف
  const itemTxns = (transactions || []).filter(t => {
    const tInvId = String(t.inventory_id || '');
    const tRef = String(t.reference_id || '');
    const tNotes = String(t.notes || '');
    return tInvId === itemId || tRef.includes(itemCode) || tNotes.includes(itemName);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* رأس النافذة */}
        <div className="bg-[#25232A] p-5 flex items-center justify-between text-white border-b-2 border-[#8F2A87]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center text-lg font-bold">
              📋
            </div>
            <div>
              <h3 className="text-sm font-bold">كارت الصنف وسجل الحركات المخزنية (Item Ledger Card)</h3>
              <p className="text-[11px] text-slate-300">سجل تدقيق كامل للوارد، المنصرف، التسويات الجردية، والمناقلات</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* بطاقة معلومات الصنف */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl">
            <div>
              <span className="text-[10.5px] text-[#6F6B75] block">اسم الصنف:</span>
              <span className="font-bold text-xs text-[#25232A] truncate block">{itemName}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-[#6F6B75] block">الرصيد الفعلي الحالي:</span>
              <span className="font-mono font-bold text-xs text-[#007F8C]">
                {curQty} {unit}
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-[#6F6B75] block">متوسط التكلفة:</span>
              <span className="font-mono font-bold text-xs text-[#25232A]">
                {curCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currencyDisplay}
              </span>
            </div>
            <div>
              <span className="text-[10.5px] text-[#6F6B75] block">الموقع الحالي:</span>
              <span className="font-bold text-xs text-[#6F6B75]">{item.location || 'المستودع الرئيسي'}</span>
            </div>
          </div>

          {/* جدول الحركات التاريخية */}
          <div className="rounded-xl border border-[#E8E5EA] overflow-hidden max-h-72 overflow-y-auto">
            {itemTxns.length === 0 ? (
              <div className="text-center py-8 text-[#6F6B75] text-xs">
                لا توجد حركات سابقة مسجلة في كارت الصنف 📋
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#FAFAFB] text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
                    <th className="px-3 py-2.5 text-right">التاريخ</th>
                    <th className="px-3 py-2.5 text-right">نوع الحركة</th>
                    <th className="px-3 py-2.5 text-left">الكمية</th>
                    <th className="px-3 py-2.5 text-right">رقم المرجع / السند</th>
                    <th className="px-3 py-2.5 text-right">البيان / الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA] bg-white">
                  {itemTxns.map((t, idx) => {
                    const tQty = parseFloat(t.quantity || 0);
                    const isPositive = tQty > 0;
                    const dateStr = t.created_at ? t.created_at.split('T')[0] : '—';
                    return (
                      <tr key={t.id || idx} className="hover:bg-[#FAFAFB]">
                        <td className="px-3 py-2 font-mono text-[#6F6B75] text-[11px]">{dateStr}</td>
                        <td className="px-3 py-2 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            t.transaction_type === 'WASTAGE' ? 'bg-rose-50 text-rose-600' :
                            t.transaction_type === 'GAIN' ? 'bg-emerald-50 text-emerald-600' :
                            t.transaction_type === 'TRANSFER' ? 'bg-amber-50 text-amber-600' : 'bg-[#E2F5F7] text-[#007F8C]'
                          }`}>
                            {t.transaction_type || 'حركة مخزنية'}
                          </span>
                        </td>
                        <td className={`px-3 py-2 font-mono font-bold text-left dir-ltr ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? `+${tQty}` : tQty} {unit}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-[#6F6B75]">{t.reference_id || t.id || '—'}</td>
                        <td className="px-3 py-2 text-[#6F6B75] text-[11px]">{t.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-[#E8E5EA]">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-[#25232A] hover:bg-black text-white font-bold text-xs cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ItemMovementModal = ItemMovementModal;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ItemMovementModal;
}
