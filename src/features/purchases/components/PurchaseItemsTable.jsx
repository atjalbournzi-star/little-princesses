function PurchaseItemsTable({
  itemData,
  setItemData,
  emptyItem,
  editingIndex,
  setEditingIndex,
  billItems,
  setBillItems,
  headerData,
  grandTotal,
  isSaving,
  handleSaveFullBill,
  showToast,
  UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)'],
  inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none",
  labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5"
}) {
  const handleQtyChange = (val) => {
    const q = parseFloat(val) || 0, p = parseFloat(itemData.price) || 0;
    setItemData(prev => ({ ...prev, qty: val, total: q > 0 && p > 0 ? String((q * p).toFixed(2)) : prev.total }));
  };
  const handlePriceChange = (val) => {
    const p = parseFloat(val) || 0, q = parseFloat(itemData.qty) || 0;
    setItemData(prev => ({ ...prev, price: val, total: q > 0 && p > 0 ? String((q * p).toFixed(2)) : prev.total }));
  };
  const handleTotalChange = (val) => {
    const tot = parseFloat(val) || 0, q = parseFloat(itemData.qty) || 0;
    setItemData(prev => ({ ...prev, total: val, price: q > 0 && tot > 0 ? String((tot / q).toFixed(2)) : prev.price }));
  };

  const handleAddOrUpdateItem = (e) => {
    e.preventDefault();
    if (!itemData.item.trim()) return showToast('اسم الصنف مطلوب ⚠️', 'error');
    const q = parseFloat(itemData.qty);
    if (!q || q <= 0) return showToast('الكمية مطلوبة ⚠️', 'error');
    let p = parseFloat(itemData.price) || 0, tot = parseFloat(itemData.total) || 0;
    if (tot > 0 && p <= 0) p = tot / q;
    else if (p > 0 && tot <= 0) tot = q * p;
    if (p <= 0 && tot <= 0) return showToast('السعر أو الإجمالي مطلوب ⚠️', 'error');

    const obj = { item: itemData.item.trim(), unit: itemData.unit || 'متر', qty: q, price: parseFloat(p.toFixed(2)), total: parseFloat(tot.toFixed(2)) };
    if (editingIndex !== null) {
      const u = [...billItems];
      u[editingIndex] = obj;
      setBillItems(u);
      setEditingIndex(null);
      showToast('تم تحديث الصنف ✏️');
    } else {
      setBillItems(prev => [...prev, obj]);
      showToast('تمت إضافة الصنف ➕');
    }
    setItemData(emptyItem());
  };

  return (
    <div className="space-y-4">
      {/* نموذج الصنف */}
      <form onSubmit={handleAddOrUpdateItem} className="p-5 bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl space-y-3.5">
        <div className="flex justify-between items-center border-b border-[#E8E5EA] pb-2">
          <span className="font-bold text-[#25232A]">{editingIndex !== null ? '✏️ تعديل بيانات الصنف' : '➕ إضافة صنف جديد للفاتورة'}</span>
          {editingIndex !== null && (
            <button type="button" onClick={() => { setEditingIndex(null); setItemData(emptyItem()); }} className="text-[#D64545] font-bold underline cursor-pointer">
              إلغاء
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
          <div className="col-span-2 sm:col-span-2">
            <label className={labelCls}>اسم الصنف / القماش *</label>
            <input type="text" required className={inputCls} placeholder="" value={itemData.item} onChange={e => setItemData(p => ({ ...p, item: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>وحدة القياس</label>
            <select className={inputCls} value={itemData.unit} onChange={e => setItemData(p => ({ ...p, unit: e.target.value }))}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>الكمية</label>
            <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold"} placeholder="" value={itemData.qty} onChange={e => handleQtyChange(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>السعر الإفرادي</label>
            <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-[#8F2A87]"} placeholder="" value={itemData.price} onChange={e => handlePriceChange(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>الإجمالي</label>
            <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-[#007F8C] bg-[#E2F5F7]"} placeholder="" value={itemData.total} onChange={e => handleTotalChange(e.target.value)} />
          </div>
        </div>
        <button
          type="submit"
          className={`w-full py-3 font-bold text-xs rounded-xl transition shadow-xs cursor-pointer ${editingIndex !== null ? 'bg-[#F28A00] hover:bg-[#D97706] text-white' : 'bg-[#8F2A87] hover:bg-[#73216C] text-white'}`}
        >
          {editingIndex !== null ? '💾 تحديث الصنف' : '➕ إضافة الصنف إلى الفاتورة'}
        </button>
      </form>

      {/* مسودة الأصناف وزر الحفظ النهائي */}
      {billItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#25232A]">📋 أصناف الفاتورة الحالية ({billItems.length} صنف)</span>
            <span className="font-bold text-[#8F2A87] font-mono">إجمالي الفاتورة: {grandTotal.toLocaleString('en-US')} {headerData.currency}</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="p-3">#</th>
                  <th className="p-3">الصنف</th>
                  <th className="p-3 text-center">الوحدة</th>
                  <th className="p-3 text-center">الكمية</th>
                  <th className="p-3 text-center">السعر</th>
                  <th className="p-3 text-center">الإجمالي</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {billItems.map((bi, idx) => (
                  <tr key={idx} className={editingIndex === idx ? 'bg-[#FFF1DC]' : 'hover:bg-[#FAFAFB]'}>
                    <td className="p-3 text-[#6F6B75]">{idx + 1}</td>
                    <td className="p-3 font-bold text-[#25232A]">{bi.item}</td>
                    <td className="p-3 text-center"><span className="bg-[#F2E7F3] text-[#8F2A87] px-2 py-0.5 rounded-md text-[10.5px] font-semibold">{bi.unit}</span></td>
                    <td className="p-3 text-center font-bold font-mono">{bi.qty}</td>
                    <td className="p-3 text-center text-[#8F2A87] font-bold font-mono">{bi.price} {headerData.currency}</td>
                    <td className="p-3 text-center font-bold font-mono text-[#007F8C]">{parseFloat(bi.total).toLocaleString('en-US')} {headerData.currency}</td>
                    <td className="p-3 text-center space-x-1 space-x-reverse">
                      <button type="button" onClick={() => { setItemData({ item: bi.item, unit: bi.unit || 'متر', qty: String(bi.qty), price: String(bi.price), total: String(bi.total) }); setEditingIndex(idx); }} className="w-7 h-7 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg font-bold border border-[#E8E5EA] cursor-pointer">✏️</button>
                      <button type="button" onClick={() => { setBillItems(prev => prev.filter((_, i) => i !== idx)); if (editingIndex === idx) { setEditingIndex(null); setItemData(emptyItem()); } }} className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-[#D64545] rounded-lg font-bold border border-rose-200 cursor-pointer">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={handleSaveFullBill}
            disabled={isSaving}
            className={`w-full py-3.5 ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#009FAE] hover:bg-[#007F8C] cursor-pointer'} text-white font-bold text-xs rounded-xl shadow-xs transition`}
          >
            {isSaving ? '⏳ جاري حفظ الفاتورة وتوريد الأصناف للمخزون...' : `☁️ حفظ الفاتورة وتوريد الأصناف للمخزون (${billItems.length} أصناف) — الإجمالي: ${grandTotal.toLocaleString('en-US')} ${headerData.currency}`}
          </button>
        </div>
      )}
    </div>
  );
}

window.PurchaseItemsTable = PurchaseItemsTable;
