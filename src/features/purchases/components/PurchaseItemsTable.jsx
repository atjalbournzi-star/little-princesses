function PurchaseItemsTable({
  itemData,
  setItemData,
  emptyItem,
  editingIndex,
  setEditingIndex,
  billItems,
  setBillItems,
  headerData,
  setHeaderData,
  rawItemsSum,
  grandTotal,
  isSaving,
  handleSaveFullBill,
  showToast,
  UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)'],
  inputCls = "w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs font-medium focus:border-pink-500 transition-all outline-none",
  labelCls = "block text-[11px] font-medium text-slate-300 mb-1"
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

  const currentSubtotal = rawItemsSum || billItems.reduce((acc, it) => acc + (parseFloat(it.total) || 0), 0);

  return (
    <div className="space-y-4">
      {/* نموذج الصنف */}
      <form onSubmit={handleAddOrUpdateItem} className="p-3.5 bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
            {editingIndex !== null ? 'تعديل بيانات الصنف' : 'إضافة صنف للفاتورة'}
          </span>
          {editingIndex !== null && (
            <button type="button" onClick={() => { setEditingIndex(null); setItemData(emptyItem()); }} className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold underline cursor-pointer">
              إلغاء التعديل
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-2.5 items-end">
          <div className="col-span-2 sm:col-span-3 lg:col-span-3">
            <label className={labelCls}>اسم الصنف / القماش *</label>
            <input type="text" required className={inputCls} value={itemData.item} onChange={e => setItemData(p => ({ ...p, item: e.target.value }))} />
          </div>
          <div className="col-span-1 sm:col-span-1 lg:col-span-2">
            <label className={labelCls}>وحدة القياس</label>
            <select className={inputCls} value={itemData.unit} onChange={e => setItemData(p => ({ ...p, unit: e.target.value }))}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="col-span-1 sm:col-span-1 lg:col-span-1">
            <label className={labelCls}>الكمية</label>
            <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold"} value={itemData.qty} onChange={e => handleQtyChange(e.target.value)} />
          </div>
          <div className="col-span-1 sm:col-span-1 lg:col-span-2">
            <label className={labelCls}>السعر الإفرادي</label>
            <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-pink-300"} value={itemData.price} onChange={e => handlePriceChange(e.target.value)} />
          </div>
          <div className="col-span-1 sm:col-span-1 lg:col-span-2">
            <label className={labelCls}>الإجمالي (محسوب آلياً)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-emerald-400 text-xs font-bold font-mono text-center shadow-inner cursor-default outline-none transition"
              value={itemData.total}
              onChange={e => handleTotalChange(e.target.value)}
            />
          </div>
          <div className="col-span-2 sm:col-span-1 lg:col-span-2">
            <button
              type="submit"
              className={`w-full h-8 px-3 font-semibold text-xs rounded-lg transition shadow-xs flex items-center justify-center cursor-pointer ${editingIndex !== null ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-pink-600 hover:bg-pink-700 text-white'}`}
            >
              {editingIndex !== null ? 'تحديث الصنف' : '+ إضافة الصنف'}
            </button>
          </div>
        </div>
      </form>

      {/* مسودة الأصناف وبطاقة التسويات والملخص المالي */}
      {billItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">أصناف الفاتورة الحالية ({billItems.length} صنف)</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              مجموع الأصناف: <strong className="font-mono text-slate-800 dark:text-slate-200">{currentSubtotal.toLocaleString('en-US')}</strong> {headerData.currency}
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">#</th>
                  <th className="p-3">الصنف</th>
                  <th className="p-3 text-center">الوحدة</th>
                  <th className="p-3 text-center">الكمية</th>
                  <th className="p-3 text-center">السعر</th>
                  <th className="p-3 text-center">الإجمالي</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {billItems.map((bi, idx) => (
                  <tr key={idx} className={editingIndex === idx ? 'bg-amber-50/60 dark:bg-amber-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}>
                    <td className="p-3 text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{bi.item}</td>
                    <td className="p-3 text-center"><span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10.5px] font-semibold">{bi.unit}</span></td>
                    <td className="p-3 text-center font-bold font-mono text-slate-800 dark:text-slate-200">{bi.qty}</td>
                    <td className="p-3 text-center text-fuchsia-700 dark:text-fuchsia-400 font-bold font-mono">{bi.price} {headerData.currency}</td>
                    <td className="p-3 text-center font-bold font-mono text-teal-700 dark:text-teal-400">{parseFloat(bi.total).toLocaleString('en-US')} {headerData.currency}</td>
                    <td className="p-3 text-center space-x-1 space-x-reverse">
                      <button type="button" onClick={() => { setItemData({ item: bi.item, unit: bi.unit || 'متر', qty: String(bi.qty), price: String(bi.price), total: String(bi.total) }); setEditingIndex(idx); }} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer" title="تعديل">✏️</button>
                      <button type="button" onClick={() => { setBillItems(prev => prev.filter((_, i) => i !== idx)); if (editingIndex === idx) { setEditingIndex(null); setItemData(emptyItem()); } }} className="w-7 h-7 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold transition cursor-pointer" title="حذف">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* بطاقة ملخص الإجماليات والتسويات المالية */}
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">التسويات المالية للفاتورة</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className={labelCls}>الخصم التجاري ({headerData.currency})</label>
                <input type="number" step="0.01" min="0" className={inputCls} value={headerData.discount || ''} onChange={e => setHeaderData && setHeaderData(p => ({ ...p, discount: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>تكلفة الشحن والنقل ({headerData.currency})</label>
                <input type="number" step="0.01" min="0" className={inputCls} value={headerData.freight_cost || ''} onChange={e => setHeaderData && setHeaderData(p => ({ ...p, freight_cost: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>رسوم التحويل ({headerData.currency})</label>
                <input type="number" step="0.01" min="0" className={inputCls} value={headerData.transfer_fees || ''} onChange={e => setHeaderData && setHeaderData(p => ({ ...p, transfer_fees: e.target.value }))} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-3.5 text-slate-600 dark:text-slate-400">
                <span>المجموع: <strong className="font-mono text-slate-800 dark:text-slate-200">{currentSubtotal.toLocaleString('en-US')}</strong> {headerData.currency}</span>
                <span>الخصم: <strong className="font-mono text-amber-600 dark:text-amber-400">{(parseFloat(headerData.discount) || 0).toLocaleString('en-US')}</strong> {headerData.currency}</span>
                <span>تكاليف إضافية: <strong className="font-mono text-slate-800 dark:text-slate-200">{((parseFloat(headerData.freight_cost) || 0) + (parseFloat(headerData.transfer_fees) || 0)).toLocaleString('en-US')}</strong> {headerData.currency}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">الصافي الإجمالي:</span>
                <span className="text-sm font-extrabold font-mono text-pink-400">
                  {grandTotal.toLocaleString('en-US')} {headerData.currency}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveFullBill}
            disabled={isSaving}
            className={`w-full py-2.5 ${isSaving ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-pink-600 hover:bg-pink-700 text-white cursor-pointer'} font-bold text-xs rounded-xl shadow-xs transition`}
          >
            {isSaving ? 'جاري حفظ الفاتورة وتوريد الأصناف للمخزون...' : `حفظ الفاتورة وتوريد الأصناف (${billItems.length} صنف) — الإجمالي: ${grandTotal.toLocaleString('en-US')} ${headerData.currency}`}
          </button>
        </div>
      )}
    </div>
  );
}

window.PurchaseItemsTable = PurchaseItemsTable;
