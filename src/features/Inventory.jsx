const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Inventory({ inventory = [], setInventory, showToast, currency }) {
  const currencyDisplay = currency?.display || "SAR";

  const [formData, setFormData] = React.useState({
    item_name: '', category: typeof FABRIC_CATEGORIES !== 'undefined' ? FABRIC_CATEGORIES[0] : 'أقمشة', qty: '', cost: '', total_value: '', currency: typeof CURRENCIES !== 'undefined' ? CURRENCIES[0] : 'SAR', supply_date: TODAY_STR_ISO
  });

  const handleQtyChange = (e) => {
    const q = e.target.value;
    const c = formData.cost;
    let t = formData.total_value;
    if (c !== '' && !isNaN(parseFloat(c))) t = (parseFloat(q||0) * parseFloat(c)).toFixed(2);
    setFormData({...formData, qty: q, total_value: t});
  };

  const handleCostChange = (e) => {
    const c = e.target.value;
    const q = formData.qty;
    let t = formData.total_value;
    if (q !== '' && !isNaN(parseFloat(q))) t = (parseFloat(q) * parseFloat(c||0)).toFixed(2);
    setFormData({...formData, cost: c, total_value: t});
  };

  const handleTotalChange = (e) => {
    const t = e.target.value;
    const q = formData.qty;
    let c = formData.cost;
    if (q !== '' && parseFloat(q) > 0) c = (parseFloat(t||0) / parseFloat(q)).toFixed(2);
    setFormData({...formData, total_value: t, cost: c});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_name) return showToast('اسم الصنف مطلوب ⚠️', 'error');
    
    const newItem = { 
      id: Date.now(), 
      ...formData,
      cost_per_unit: parseFloat(formData.cost) || 0,
      total_value: parseFloat(formData.total_value) || 0
    };
    
    try {
      const res = await callGAS('addInventory', newItem);
      if (res.status === 'success' || res.id) {
        if (setInventory) setInventory([newItem, ...(inventory || [])]);
        showToast('تمت إضافة الصنف للمخزون بنجاح 📦');
      } else showToast('حدث خطأ أثناء الحفظ', 'error');
    } catch (err) {
      if (setInventory) setInventory([newItem, ...(inventory || [])]);
      showToast('تم الحفظ محلياً ⚡');
    } finally {
      setFormData({
        item_name: '', category: typeof FABRIC_CATEGORIES !== 'undefined' ? FABRIC_CATEGORIES[0] : 'أقمشة', qty: '', cost: '', total_value: '', currency: typeof CURRENCIES !== 'undefined' ? CURRENCIES[0] : 'SAR', supply_date: TODAY_STR_ISO
      });
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none min-h-[42px]";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── بطاقة إضافة صنف للمخزون ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-sm font-bold">
              📦
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                إضافة صنف جديد للمخزون
              </h2>
              <p className="text-[11px] text-slate-500 font-normal">تسجيل الأقمشة والبطانات ومستلزمات الخياطة وتتبع التكاليف</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            <span className="text-rose-500 font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>اسم الصنف / القماش <span className="text-rose-500 font-bold">*</span></label>
              <input type="text" className={inputCls} placeholder="مثال: حرير ياباني فاخر" value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} required />
            </div>
            <div>
              <label className={labelCls}>التصنيف</label>
              <select className={inputCls} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {(typeof FABRIC_CATEGORIES !== 'undefined' ? FABRIC_CATEGORIES : ['أقمشة','بطانات','كلف وتطريز','إكسسوارات']).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>الكمية المتوفرة (أمتار / قطع)</label>
              <input type="number" step="0.1" className={inputCls + " font-mono"} placeholder="0.0" value={formData.qty} onChange={handleQtyChange} />
            </div>
            <div>
              <label className={labelCls}>التكلفة (للوحدة / للمتر)</label>
              <input type="number" step="0.01" className={inputCls + " font-mono"} placeholder="0.00" value={formData.cost} onChange={handleCostChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className={labelCls}>إجمالي القيمة التقديرية</label>
              <input type="number" step="0.01" className={inputCls + " font-mono font-bold bg-purple-50 text-purple-900 border-purple-200"} placeholder="0.00" value={formData.total_value} onChange={handleTotalChange} />
            </div>
            <div>
              <label className={labelCls}>العملة</label>
              <select className={inputCls} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                {(typeof CURRENCIES !== 'undefined' ? CURRENCIES : ['USD $','YER ريال','SAR ريال']).map(c => <option key={typeof c === "object" ? c.value : c} value={typeof c === "object" ? c.value : c}>{typeof c === "object" ? c.label : c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>تاريخ التوريد</label>
              <input type="date" className={inputCls} value={formData.supply_date} onChange={e => setFormData({...formData, supply_date: e.target.value})} />
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <button type="submit" className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <span>💾 حفظ الصنف في المخزون</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── جدول سجل المخزون ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">سجل المخزون الحالي</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-semibold">{inventory.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {(!inventory || inventory.length === 0) ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              لا توجد أصناف مسجلة في المخزون بعد 📦
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="px-3.5 py-3 text-right">الصنف</th>
                  <th className="px-3.5 py-3 text-right">التصنيف</th>
                  <th className="px-3.5 py-3 text-right">الكمية</th>
                  <th className="px-3.5 py-3 text-right">التكلفة (للوحدة)</th>
                  <th className="px-3.5 py-3 text-right">إجمالي القيمة</th>
                  <th className="px-3.5 py-3 text-right">تاريخ التوريد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map(i => {
                  const qty = parseFloat(i.qty) || 0;
                  const cost = parseFloat(i.cost_per_unit || i.cost_per_meter || i.cost) || 0;
                  const totalValue = parseFloat(i.total_value) || (qty * cost) || 0;
                  let dateStr = i.supply_date || '—';
                  if (i.supply_date && i.supply_date.includes('T')) {
                    dateStr = i.supply_date.split('T')[0];
                  }
                  const curr = i.currency || currencyDisplay;
                  return (
                    <tr key={i.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-3.5 py-3 font-bold text-slate-900">{i.item_name}</td>
                      <td className="px-3.5 py-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-semibold">{i.category}</span>
                      </td>
                      <td className="px-3.5 py-3 font-bold font-mono text-slate-800">{qty.toLocaleString()}</td>
                      <td className="px-3.5 py-3 font-mono text-slate-700">{cost > 0 ? `${cost.toLocaleString()} ${curr}` : '0.00'}</td>
                      <td className="px-3.5 py-3 font-bold font-mono text-purple-700">{totalValue > 0 ? `${totalValue.toLocaleString()} ${curr}` : '0.00'}</td>
                      <td className="px-3.5 py-3 text-slate-500 font-mono text-[11px]">{dateStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
