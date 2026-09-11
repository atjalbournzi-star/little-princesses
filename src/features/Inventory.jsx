const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Inventory({ inventory = [], setInventory, purchases = [], orders = [], showToast, currency }) {
  const currencyDisplay = currency?.display || "YER ﷼";

  const [activeSubTab, setActiveSubTab] = useState('stock'); // 'stock' | 'purchases' | 'movements'
  const [formData, setFormData] = useState({
    item_name: '', category: typeof FABRIC_CATEGORIES !== 'undefined' ? FABRIC_CATEGORIES[0] : 'أقمشة', qty: '', cost: '', total_value: '', currency: currency?.code || (typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : 'YER'), supply_date: TODAY_STR_ISO, location: 'المستودع الرئيسي'
  });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');

  // ── حالات تسوية فوارق الجرد وتالف الأقمشة ──
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustType, setAdjustType] = useState('wastage'); // 'wastage' | 'gain'
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

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
      item_code: `MAT-${Math.floor(100 + Math.random() * 900)}`,
      cost_per_unit: parseFloat(formData.cost) || 0,
      unit_cost: parseFloat(formData.cost) || 0,
      cost_per_meter: parseFloat(formData.cost) || 0,
      total_value: parseFloat(formData.total_value) || 0,
      location: formData.location || 'المستودع الرئيسي',
      available_qty: parseFloat(formData.qty) || 0,
      quantity_meters: parseFloat(formData.qty) || 0,
      quantity: parseFloat(formData.qty) || 0,
      qty: parseFloat(formData.qty) || 0
    };
    
    try {
      if (window.inventoryAPI && window.inventoryAPI.createItem) {
        const res = await window.inventoryAPI.createItem(newItem);
        if (res && res.success) {
          const savedItem = { ...newItem, id: res.id || newItem.id };
          if (setInventory) setInventory(prev => [savedItem, ...(prev || []).filter(i => i.id !== savedItem.id)]);
          showToast(res.message || 'تمت إضافة الصنف للمخزون بنجاح 📦');
          return;
        }
      }
      const res = await callGAS('addInventory', newItem);
      if (res.status === 'success' || res.id) {
        if (setInventory) setInventory(prev => [newItem, ...(prev || [])]);
        showToast('تمت إضافة الصنف للمخزون بنجاح 📦');
      } else showToast('حدث خطأ أثناء الحفظ', 'error');
    } catch (err) {
      if (setInventory) setInventory(prev => [newItem, ...(prev || [])]);
      showToast(err.message || 'تم الحفظ محلياً ⚡');
    } finally {
      setFormData({
        item_name: '', category: typeof FABRIC_CATEGORIES !== 'undefined' ? FABRIC_CATEGORIES[0] : 'أقمشة', qty: '', cost: '', total_value: '', currency: typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : (currency?.display || 'YER ﷼'), supply_date: TODAY_STR_ISO, location: 'المستودع الرئيسي'
      });
    }
  };

  // ── تنفيذ تسوية فوارق الجرد أو إهلاك التالف ──
  const handleExecuteAdjust = async (e) => {
    e.preventDefault();
    if (!adjustingItem) return;
    const vQty = parseFloat(adjustQty);
    if (!vQty || vQty <= 0) {
      return showToast('الكمية المراد تسويتها يجب أن تكون أكبر من الصفر ⚠️', 'error');
    }

    setIsSubmittingAdjust(true);
    try {
      if (window.inventoryAPI && window.inventoryAPI.adjustInventory) {
        const payload = {
          item_id: adjustingItem.id,
          item_name: getItemName(adjustingItem),
          adj_type: adjustType,
          variance_qty: vQty,
          reason: adjustReason || (adjustType === 'wastage' ? 'إهلاك تالف وهالك أقمشة خياطة' : 'تسوية فائض جردي')
        };
        const res = await window.inventoryAPI.adjustInventory(payload);
        if (res && res.success) {
          showToast(res.message || 'تم ترحيل قيد التسوية الجردية بنجاح ⚖️');
          if (setInventory) {
            setInventory(prev => (prev || []).map(item => {
              if (item.id === adjustingItem.id) {
                return { ...item, qty: res.new_qty, quantity_meters: res.new_qty, quantity: res.new_qty };
              }
              return item;
            }));
          }
          setAdjustingItem(null);
          setAdjustQty('');
          setAdjustReason('');
        } else {
          showToast(res?.message || 'فشلت عملية التسوية', 'error');
        }
      }
    } catch(err) {
      showToast(err.message || 'خطأ أثناء تنفيذ التسوية', 'error');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const getItemName = (i) => i.item_name || i.name || '';
  const getItemQty = (i) => parseFloat(i.qty !== undefined && i.qty !== null && i.qty !== '' ? i.qty : (i.quantity !== undefined && i.quantity !== null && i.quantity !== '' ? i.quantity : (i.quantity_meters || 0))) || 0;
  const getItemCost = (i) => parseFloat(i.cost_per_meter !== undefined && i.cost_per_meter !== null && i.cost_per_meter !== '' ? i.cost_per_meter : (i.cost_per_unit !== undefined && i.cost_per_unit !== null && i.cost_per_unit !== '' ? i.cost_per_unit : (i.unit_cost !== undefined && i.unit_cost !== null && i.unit_cost !== '' ? i.unit_cost : (i.cost || 0)))) || 0;

  const filteredInventory = useMemo(() => {
    return (inventory || []).filter(i => {
      const name = getItemName(i);
      const category = i.category || 'أقمشة وخامات';
      const supplier = i.supplier_id || i.supplier || '';
      const matchSearch = !search || 
        name.toLowerCase().includes(search.toLowerCase()) || 
        category.toLowerCase().includes(search.toLowerCase()) ||
        supplier.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'الكل' || category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [inventory, search, categoryFilter]);

  const filteredPurchases = useMemo(() => {
    return (purchases || []).filter(p => {
      const bill = String(p.purchase_no || p.bill_no || '').toLowerCase();
      const sup = String(p.supplier_name || p.supplier || '').toLowerCase();
      const itm = String(p.fabric_name || p.item_name || p.item || '').toLowerCase();
      const q = search.toLowerCase();
      return !search || bill.includes(q) || sup.includes(q) || itm.includes(q);
    });
  }, [purchases, search]);

  const totalInventoryValue = useMemo(() => {
    return (inventory || []).reduce((acc, i) => {
      const qty = getItemQty(i);
      const cost = getItemCost(i);
      return acc + (parseFloat(i.total_value) || (qty * cost) || 0);
    }, 0);
  }, [inventory]);

  const totalPurchasedQty = useMemo(() => {
    return (purchases || []).reduce((acc, p) => acc + (parseFloat(p.quantity || p.qty || 0) || 0), 0);
  }, [purchases]);

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#009FAE] focus:ring-2 focus:ring-[#E2F5F7] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── Studio Header & KPI Strip ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-xl font-bold shadow-xs">
              <Icons.Purchases className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                المخزون والمستودعات والتوريدات (Inventory, Warehouses & Supplies)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                إدارة أرصدة الأقمشة والخامات، فواتير التوريد من المشتريات، وحركات الصرف للورشة
              </p>
            </div>
          </div>

          {/* ── Sub Tabs Navigation ── */}
          <div className="flex items-center bg-[#FAFAFB] p-1.5 rounded-xl border border-[#E8E5EA] gap-1 shrink-0">
            <button
              onClick={() => setActiveSubTab('stock')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'stock' ? 'bg-[#009FAE] text-white shadow-xs' : 'text-[#6F6B75] hover:text-[#25232A]'}`}
            >
              <span>📦</span>
              <span>أرصدة المخزون</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${activeSubTab === 'stock' ? 'bg-white/20 text-white' : 'bg-[#E8E5EA] text-[#25232A]'}`}>
                {(inventory || []).length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('purchases')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${activeSubTab === 'purchases' ? 'bg-[#009FAE] text-white shadow-xs' : 'text-[#6F6B75] hover:text-[#25232A]'}`}
            >
              <span>🧾</span>
              <span>فواتير التوريد والمشتريات</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${activeSubTab === 'purchases' ? 'bg-white/20 text-white' : 'bg-[#E8E5EA] text-[#25232A]'}`}>
                {(purchases || []).length}
              </span>
            </button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي أصناف المخزون</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1 block">
              {(inventory || []).length.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">صنف</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي أمتار الأقمشة</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
              {((inventory || []).reduce((acc, i) => acc + getItemQty(i), 0)).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs font-medium text-[#6F6B75]">متر</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي قيمة المخزون التقديرية</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#8F2A87] mt-1 block">
              {totalInventoryValue.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">فواتير الشراء الموردة</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#C97300] mt-1 block">
              {(purchases || []).length.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">فاتورة</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── TAB 1: أرصدة المخزون وإضافة صنف ── */}
      {activeSubTab === 'stock' && (
        <div className="space-y-6">
          {/* بطاقة إضافة صنف */}
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
              <h2 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
                <span className="text-[#009FAE]">📦</span>
                إضافة صنف وخامة يدوية للمخزون
              </h2>
              <span className="text-xs text-[#6F6B75]">
                <span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية
              </span>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
                <div>
                  <label className={labelCls}>اسم الصنف / القماش <span className="text-[#D64545] font-bold">*</span></label>
                  <input type="text" className={inputCls} placeholder="" value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} required />
                </div>
                <div>
                  <label className={labelCls}>التصنيف</label>
                  <select className={inputCls} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {(typeof FABRIC_CATEGORIES !== 'undefined' ? FABRIC_CATEGORIES : ['أقمشة','بطانات','كلف وتطريز','إكسسوارات']).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>الكمية المتوفرة (أمتار / قطع)</label>
                  <input type="number" step="0.1" className={inputCls + " font-mono font-bold"} placeholder="" value={formData.qty} onChange={handleQtyChange} />
                </div>
                <div>
                  <label className={labelCls}>التكلفة (للوحدة / للمتر)</label>
                  <input type="number" step="0.01" className={inputCls + " font-mono font-bold"} placeholder="" value={formData.cost} onChange={handleCostChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5 pt-1">
                <div>
                  <label className={labelCls}>إجمالي القيمة التقديرية</label>
                  <input type="number" step="0.01" className={inputCls + " font-mono font-bold bg-[#FAFAFB] text-[#007F8C]"} placeholder="" value={formData.total_value} onChange={handleTotalChange} />
                </div>
                <div>
                  <label className={labelCls}>العملة</label>
                  <select className={inputCls} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                    {(typeof CURRENCIES !== 'undefined' ? CURRENCIES : ['YER ﷼', 'SAR ﷼', 'USD $']).map(c => <option key={typeof c === "object" ? c.value : c} value={typeof c === "object" ? c.value : c}>{typeof c === "object" ? c.label : c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>موقع التخزين</label>
                  <input type="text" className={inputCls} placeholder="" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#009FAE] hover:bg-[#007F8C] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer">
                  <Icons.Check className="w-4 h-4" />
                  <span>حفظ الصنف في المخزون 💾</span>
                </button>
              </div>
            </form>
          </div>

          {/* جدول سجل المخزون */}
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <h3 className="font-bold text-sm text-[#25232A]">سجل أصناف ومواد المخزون</h3>
                <span className="text-xs bg-[#E2F5F7] text-[#007F8C] font-bold px-2.5 py-0.5 rounded-full font-mono">{filteredInventory.length}</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none"
                >
                  <option value="الكل">جميع التصنيفات</option>
                  {(typeof FABRIC_CATEGORIES !== 'undefined' ? FABRIC_CATEGORIES : ['أقمشة','بطانات','كلف وتطريز','إكسسوارات']).map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="relative flex-1 sm:w-64">
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#009FAE] outline-none"
                    placeholder="بحث باسم الصنف أو المورد..."
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#E8E5EA] overflow-hidden bg-white">
              {filteredInventory.length === 0 ? (
                <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">
                  لا توجد أصناف مسجلة في المخزون تطابق البحث 📦
                </div>
              ) : (
                <table className="w-full text-xs table-fixed border-collapse">
                  <thead>
                    <tr className="bg-[#FAFAFB] text-[#6F6B75] font-bold border-b border-[#E8E5EA]">
                      <th className="px-2 py-3 text-right w-[6%]">رمز الصنف</th>
                      <th className="px-2.5 py-3 text-right w-[17%]">اسم الخامة / الصنف</th>
                      <th className="px-2 py-3 text-right w-[9%]">التصنيف</th>
                      <th className="px-2 py-3 text-left w-[9%]">الكمية الحالية</th>
                      <th className="px-2 py-3 text-left w-[12%]">التكلفة (متوسط)</th>
                      <th className="px-2 py-3 text-left w-[13%]">إجمالي القيمة</th>
                      <th className="px-2 py-3 text-right w-[10%]">المورد</th>
                      <th className="px-2 py-3 text-right w-[9%]">الموقع</th>
                      <th className="px-2 py-3 text-center w-[7%]">التوريد</th>
                      <th className="px-2 py-3 text-center w-[8%]">تسوية الجرد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA] bg-white">
                    {filteredInventory.map((i, idx) => {
                      const name = getItemName(i);
                      const code = i.item_code || i.code || i.id || (idx + 1);
                      const qty = getItemQty(i);
                      const cost = getItemCost(i);
                      const totalValue = parseFloat(i.total_value) || (qty * cost) || 0;
                      let dateStr = i.supply_date || i.created_at || '—';
                      if (dateStr && dateStr.includes('T')) {
                        dateStr = dateStr.split('T')[0];
                      }
                      const curr = i.currency || currencyDisplay;
                      const isLow = qty < 5;
                      const supplier = i.supplier_id || i.supplier || i.supplier_name || 'مورد عام';
                      const loc = i.location || 'المستودع الرئيسي';
                      return (
                        <tr key={i.id || name || idx} className="hover:bg-[#FAFAFB] transition-colors border-b border-[#E8E5EA]/60">
                          {/* الخلية 1: رمز الصنف */}
                          <td className="px-2 py-2.5 font-mono text-[#8F2A87] font-bold text-xs text-right align-middle truncate" title={String(code)}>
                            {code}
                          </td>

                          {/* الخلية 2: اسم الخامة / الصنف */}
                          <td className="px-2.5 py-2.5 font-bold text-[#25232A] text-right align-middle truncate" title={name}>
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="truncate">{name}</span>
                              {isLow && <span className="text-[9px] bg-[#FFF1DC] text-[#C97300] border border-[#FFE4B9] px-1 py-0.2 rounded font-bold shrink-0">منخفض ⚠️</span>}
                            </div>
                          </td>

                          {/* الخلية 3: التصنيف */}
                          <td className="px-2 py-2.5 text-right align-middle truncate">
                            <span className="bg-[#FAFAFB] text-[#25232A] border border-[#E8E5EA] px-1.5 py-0.5 rounded text-[10px] font-semibold inline-block truncate max-w-full">
                              {i.category || 'أقمشة وخامات'}
                            </span>
                          </td>

                          {/* الخلية 4: الكمية الحالية */}
                          <td className="px-2 py-2.5 text-left align-middle truncate">
                            <span className="font-bold font-mono text-[#25232A] tabular-nums dir-ltr">
                              {qty.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            </span>
                            <span className="text-[10px] font-normal text-[#6F6B75] font-sans mr-0.5">
                              {i.unit || 'متر'}
                            </span>
                          </td>

                          {/* الخلية 5: التكلفة متوسط مرجح */}
                          <td className="px-2 py-2.5 text-left align-middle truncate">
                            <span className="font-mono text-[#6F6B75] font-semibold tabular-nums dir-ltr">
                              {cost > 0 ? cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </span>
                            <span className="text-[9.5px] font-normal font-sans text-[#6F6B75] mr-0.5">
                              {curr}
                            </span>
                          </td>

                          {/* الخلية 6: إجمالي القيمة */}
                          <td className="px-2 py-2.5 text-left align-middle truncate">
                            <span className="font-bold font-mono text-[#007F8C] tabular-nums dir-ltr">
                              {totalValue > 0 ? totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </span>
                            <span className="text-[9.5px] font-normal font-sans text-[#007F8C] mr-0.5">
                              {curr}
                            </span>
                          </td>

                          {/* الخلية 7: المورد */}
                          <td className="px-2 py-2.5 text-[#25232A] font-medium text-right align-middle truncate text-[11px]" title={supplier}>
                            {supplier}
                          </td>

                          {/* الخلية 8: موقع التخزين */}
                          <td className="px-2 py-2.5 text-[#6F6B75] text-[11px] text-right align-middle truncate" title={loc}>
                            {loc}
                          </td>

                          {/* الخلية 9: تاريخ التوريد */}
                          <td className="px-2 py-2.5 text-[#6F6B75] font-mono text-[11px] text-center tabular-nums align-middle truncate">
                            {dateStr}
                          </td>

                          {/* الخلية 10: إجراء التسوية الجردية */}
                          <td className="px-2 py-2.5 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingItem(i);
                                setAdjustType('wastage');
                                setAdjustQty('');
                                setAdjustReason('');
                              }}
                              className="px-2 py-1 bg-[#FAFAFB] hover:bg-[#FCE8F2] text-[#B0005A] border border-[#E8E5EA] hover:border-[#F2A4CB] rounded-lg text-[10.5px] font-bold transition shadow-2xs flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              title="تسوية فروقات جردية أو إهلاك تالف بقيد محاسبي آلي"
                            >
                              <span>⚖️</span>
                              <span>تسوية</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── نافذة تسوية فوارق الجرد وتالف الأقمشة (Modal) ── */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-[#0F172A] border-b-2 border-[#B0005A] p-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FCE8F2] text-[#B0005A] flex items-center justify-center text-lg font-bold">
                  ⚖️
                </div>
                <div>
                  <h3 className="text-sm font-bold">تسوية فروقات الجرد وتالف الأقمشة</h3>
                  <p className="text-[11px] text-slate-300">توليد قيد محاسبي مزدوج تلقائي في حسابات المخزون والتوالف</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleExecuteAdjust} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#6F6B75] block">الصنف المستهدف:</span>
                  <span className="font-bold text-[#25232A] text-sm">{getItemName(adjustingItem)}</span>
                </div>
                <div className="text-left">
                  <span className="text-[11px] text-[#6F6B75] block">الرصيد المخزني الحالي:</span>
                  <span className="font-mono font-extrabold text-[#007F8C] text-sm">
                    {getItemQty(adjustingItem)} {adjustingItem.unit || 'متر'}
                  </span>
                </div>
              </div>

              {/* نوع التسوية */}
              <div>
                <label className="block font-bold text-[#25232A] mb-1.5">نوع التسوية الجردية:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAdjustType('wastage')}
                    className={`p-3 rounded-xl border text-right font-bold transition flex items-center gap-2 cursor-pointer ${
                      adjustType === 'wastage'
                        ? 'bg-[#FCE8F2] text-[#B0005A] border-[#F2A4CB] ring-2 ring-[#B0005A]/30'
                        : 'bg-white text-[#6F6B75] border-[#E8E5EA] hover:bg-[#FAFAFB]'
                    }`}
                  >
                    <span>🗑️</span>
                    <div>
                      <div className="text-xs">إهلاك تالف / عجز جردي (Wastage)</div>
                      <div className="text-[10px] font-normal opacity-80">مدين: 5113 تالف / دائن: 1151 مخزون</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('gain')}
                    className={`p-3 rounded-xl border text-right font-bold transition flex items-center gap-2 cursor-pointer ${
                      adjustType === 'gain'
                        ? 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0] ring-2 ring-[#007F8C]/30'
                        : 'bg-white text-[#6F6B75] border-[#E8E5EA] hover:bg-[#FAFAFB]'
                    }`}
                  >
                    <span>📈</span>
                    <div>
                      <div className="text-xs">تسوية فائض جردي (Gain)</div>
                      <div className="text-[10px] font-normal opacity-80">مدين: 1151 مخزون / دائن: 4119 تسويات</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* كمية التسوية */}
              <div>
                <label className="block font-bold text-[#25232A] mb-1">الكمية المراد تسويتها (متر / وحدة) *:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="مثال: 2.5"
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-mono font-bold focus:bg-white focus:border-[#B0005A] outline-none"
                />
              </div>

              {/* القيمة الإجمالية المقدرة للتسوية */}
              {parseFloat(adjustQty) > 0 && (
                <div className="p-3 bg-[#F2E7F3] border border-[#E5CEE7] rounded-xl flex items-center justify-between">
                  <span className="font-bold text-[#8F2A87]">القيمة المحاسبية للقيد:</span>
                  <span className="font-mono font-extrabold text-[#8F2A87] text-sm">
                    {(parseFloat(adjustQty) * getItemCost(adjustingItem)).toLocaleString('en-US', { minimumFractionDigits: 2 })} {adjustingItem.currency || currencyDisplay}
                  </span>
                </div>
              )}

              {/* سبب التسوية */}
              <div>
                <label className="block font-bold text-[#25232A] mb-1">سبب ومبرر التسوية الجردية:</label>
                <input
                  type="text"
                  placeholder="مثال: فاقد قص وتطريز، تلف في القماش، جرد فعلي دوري..."
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium focus:bg-white focus:border-[#B0005A] outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E5EA]">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-5 py-2.5 rounded-xl border border-[#E8E5EA] text-[#6F6B75] hover:bg-[#FAFAFB] font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="px-6 py-2.5 rounded-xl bg-[#B0005A] hover:bg-[#8E0049] text-white font-extrabold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>⚖️</span>
                  <span>{isSubmittingAdjust ? 'جارٍ ترحيل القيد...' : 'اعتماد وترحيل القيد المحاسبي المزدوج ⚡'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 2: فواتير التوريد والمشتريات المخزنية ── */}
      {activeSubTab === 'purchases' && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="w-8 h-8 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center font-bold">🧾</div>
              <div>
                <h3 className="font-bold text-sm text-[#25232A]">سجل فواتير الشراء والتوريد المخزني</h3>
                <p className="text-[11px] text-[#6F6B75]">جميع فواتير المشتريات وتفاصيل توريد الأصناف للمستودعات</p>
              </div>
              <span className="text-xs bg-[#E2F5F7] text-[#007F8C] font-bold px-2.5 py-0.5 rounded-full font-mono">{filteredPurchases.length}</span>
            </div>

            <div className="relative flex-1 sm:w-72">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#009FAE] outline-none"
                placeholder="بحث برقم الفاتورة، المورد، أو الصنف..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            {filteredPurchases.length === 0 ? (
              <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">
                لا توجد فواتير توريد مسجلة حالياً 🧾
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    <th className="px-4 py-3 text-right">رقم الفاتورة</th>
                    <th className="px-4 py-3 text-right">المورد</th>
                    <th className="px-4 py-3 text-right">الصنف / الخامة الموردة</th>
                    <th className="px-4 py-3 text-right">الكمية الموردة</th>
                    <th className="px-4 py-3 text-right">سعر الوحدة</th>
                    <th className="px-4 py-3 text-right">إجمالي الفاتورة</th>
                    <th className="px-4 py-3 text-right">طريقة الدفع</th>
                    <th className="px-4 py-3 text-right">تاريخ التوريد</th>
                    <th className="px-4 py-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA] bg-white">
                  {filteredPurchases.map((p, idx) => {
                    const pBill = p.purchase_no || p.bill_no || `PUR-${idx+1}`;
                    const pSup = p.supplier_name || p.supplier || 'مورد عام';
                    const pItem = p.fabric_name || p.item_name || p.item || 'صنف مشتريات';
                    const pQty = parseFloat(p.quantity || p.qty || 0);
                    const pCost = parseFloat(p.cost_per_unit || p.cost || p.price || 0);
                    const pTotal = parseFloat(p.total || (pQty * pCost));
                    const pDate = p.date || p.created_at || '—';
                    const pPay = p.pay_type || 'نقدي';
                    const pStatus = p.status || 'تم الاستلام';
                    return (
                      <tr key={p.id || idx} className="hover:bg-[#FAFAFB] transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#007F8C]">{pBill}</td>
                        <td className="px-4 py-3 font-bold text-[#25232A]">{pSup}</td>
                        <td className="px-4 py-3 font-semibold text-[#25232A]">{pItem}</td>
                        <td className="px-4 py-3 font-bold font-mono text-[#25232A]">
                          {pQty.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[10px] font-normal text-[#6F6B75]">{p.unit || 'متر'}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#6F6B75]">{pCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 font-bold font-mono text-[#8F2A87]">{pTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {p.currency || currencyDisplay}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold border ${pPay === 'آجل' ? 'bg-[#FFF1DC] text-[#C97300] border-[#FFE4B9]' : 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]'}`}>
                            {pPay}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#6F6B75] text-[11px]">{pDate.split('T')[0]}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] px-2 py-0.5 rounded-full text-[10.5px] font-bold">
                            ✅ {pStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

