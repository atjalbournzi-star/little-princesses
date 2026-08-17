const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Products({ products = [], setProducts, inventory = [], showToast, currency }) {
  const currencyDisplay = currency?.display || "USD $";

  const [modelName, setModelName] = useState("");
  const [category, setCategory] = useState("(Princess) فستان أميرة");
  const [editId, setEditId] = useState(null);
  
  // Dynamic Fabric Array Matrix
  const [fabricsList, setFabricsList] = useState([
    { id: Date.now(), name: "", meters_1_2: "1.0", meters_3_5: "1.5", meters_6_9: "2.0", meters_10_13: "2.5", cost: 12.0 }
  ]);

  const [laborCost, setLaborCost] = useState("70.0");
  const [packagingCost, setPackagingCost] = useState("10.0");
  const [pricesMatrix, setPricesMatrix] = useState({
    '1-2 سنة': "120.0",
    '3-5 سنوات': "150.0",
    '6-9 سنوات': "180.0",
    '10-13 سنة': "210.0"
  });

  const handlePriceChange = (bracket, value) => {
    setPricesMatrix(prev => ({ ...prev, [bracket]: value }));
  };
  const [formCurrency, setFormCurrency] = useState(currencyDisplay);
  const [calcDate, setCalcDate] = useState(TODAY_STR_ISO);

  // Age Chart Configuration
  const [ageChart, setAgeChart] = useState([
    { id: 1, age: '1-2 سنوات', min: 40, max: 45 },
    { id: 2, age: '2-3 سنوات', min: 50, max: 55 },
    { id: 3, age: '4-5 سنوات', min: 60, max: 65 },
    { id: 4, age: '6-7 سنوات', min: 70, max: 75 },
    { id: 5, age: '8-10 سنوات', min: 80, max: 90 },
    { id: 6, age: '10-12 سنة', min: 95, max: 105 },
    { id: 7, age: '12-14 سنة', min: 110, max: 120 }
  ]);

  const updateAgeChart = (id, field, value) => {
    setAgeChart(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  useEffect(() => {
    if (currency?.display) {
      setFormCurrency(currency.display);
    }
  }, [currency]);

  // Sync fabric costs from inventory when dropdown changes
  const handleFabricChange = (id, field, value) => {
    const newList = fabricsList.map(fab => {
      if (fab.id === id) {
        let updatedFab = { ...fab, [field]: value };
        if (field === 'name') {
          const invItem = (inventory || []).find(inv => inv.item_name === value);
          updatedFab.cost = invItem ? (parseFloat(invItem.cost || invItem.cost_per_meter) || 0) : 0;
        }
        return updatedFab;
      }
      return fab;
    });
    setFabricsList(newList);
  };

  const addFabricRow = () => {
    setFabricsList([...fabricsList, { id: Date.now(), name: "", meters_1_2: "1.0", meters_3_5: "1.5", meters_6_9: "2.0", meters_10_13: "2.5", cost: 12.0 }]);
  };

  const removeFabricRow = (id) => {
    if (fabricsList.length > 1) {
      setFabricsList(fabricsList.filter(f => f.id !== id));
    }
  };

  // Calculations (Matrix based)
  const costsPerBracket = {
    '1-2 سنة': fabricsList.reduce((acc, f) => acc + (parseFloat(f.meters_1_2 || 0) * (f.cost || 0)), 0),
    '3-5 سنوات': fabricsList.reduce((acc, f) => acc + (parseFloat(f.meters_3_5 || 0) * (f.cost || 0)), 0),
    '6-9 سنوات': fabricsList.reduce((acc, f) => acc + (parseFloat(f.meters_6_9 || 0) * (f.cost || 0)), 0),
    '10-13 سنة': fabricsList.reduce((acc, f) => acc + (parseFloat(f.meters_10_13 || 0) * (f.cost || 0)), 0),
  };

  // Use average or 6-9 as baseline for general display
  const computedFabricTotal = costsPerBracket['6-9 سنوات'];
  const computedTotalCost = computedFabricTotal + parseFloat(laborCost || 0) + parseFloat(packagingCost || 0);
  const computedProfit = parseFloat(pricesMatrix['6-9 سنوات'] || 0) - computedTotalCost;

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!modelName.trim()) return showToast("اسم الموديل مطلوب ⚠️", "error");

    const fabricNamesString = fabricsList.map(f => `${f.name || 'قماش جديد'} (${f.meters_6_9}م متوسط)`).join(" + ");
    const totalMeters = fabricsList.reduce((acc, f) => acc + parseFloat(f.meters_6_9 || 0), 0);
    
    const bomArray = fabricsList.map(f => ({
       fabric_name: f.name || 'قماش جديد',
       unit_cost: f.cost,
       brackets: {
         '1-2 سنة': parseFloat(f.meters_1_2 || 0),
         '3-5 سنوات': parseFloat(f.meters_3_5 || 0),
         '6-9 سنوات': parseFloat(f.meters_6_9 || 0),
         '10-13 سنة': parseFloat(f.meters_10_13 || 0)
       }
    }));

    const newP = {
      id: editId || Date.now(),
      name: modelName.trim(),
      category,
      fabric_name: fabricNamesString,
      yards_used: totalMeters,
      fabric_cost: computedFabricTotal,
      labor_cost: parseFloat(laborCost || 0),
      packaging_cost: parseFloat(packagingCost || 0),
      total_cost: computedTotalCost,
      sell_price: parseFloat(pricesMatrix['6-9 سنوات'] || 0),
      price_matrix: {
        '1-2 سنة': parseFloat(pricesMatrix['1-2 سنة'] || 0),
        '3-5 سنوات': parseFloat(pricesMatrix['3-5 سنوات'] || 0),
        '6-9 سنوات': parseFloat(pricesMatrix['6-9 سنوات'] || 0),
        '10-13 سنة': parseFloat(pricesMatrix['10-13 سنة'] || 0)
      },
      currency: formCurrency,
      profit: computedProfit,
      calc_date: calcDate,
      bom: bomArray,
      age_chart: ageChart
    };

    if (editId) {
      if (setProducts) setProducts(products.map(p => p.id === editId ? newP : p));
      try {
        await callGAS("updateProduct", newP);
        showToast("تم تحديث الموديل سحابياً ☁️🧮");
      } catch (err) {
        showToast("تم التحديث محلياً 🧮");
      }
      setEditId(null);
    } else {
      if (setProducts) setProducts([newP, ...(products || [])]);
      try {
        await callGAS("addProduct", newP);
        showToast("تم إضافة وتوثيق الموديل وحساب التكلفة سحابياً ☁️🧮");
      } catch (err) {
        showToast("تم الحفظ محلياً 🧮");
      }
    }

    setModelName("");
    setFabricsList([{ id: Date.now(), name: "", meters_1_2: "1.0", meters_3_5: "1.5", meters_6_9: "2.0", meters_10_13: "2.5", cost: 12.0 }]);
  };

  const handleEditProduct = (p) => {
    setEditId(p.id);
    setModelName(p.name);
    setCategory(p.category || "(Princess) فستان أميرة");
    setLaborCost(p.labor_cost);
    setPackagingCost(p.packaging_cost);
    
    if (p.price_matrix) {
       setPricesMatrix({
         '1-2 سنة': (p.price_matrix['1-2 سنة'] ?? p.sell_price).toString(),
         '3-5 سنوات': (p.price_matrix['3-5 سنوات'] ?? p.sell_price).toString(),
         '6-9 سنوات': (p.price_matrix['6-9 سنوات'] ?? p.sell_price).toString(),
         '10-13 سنة': (p.price_matrix['10-13 سنة'] ?? p.sell_price).toString()
       });
    } else {
       setPricesMatrix({
         '1-2 سنة': (p.sell_price || 120).toString(),
         '3-5 سنوات': (p.sell_price || 150).toString(),
         '6-9 سنوات': (p.sell_price || 180).toString(),
         '10-13 سنة': (p.sell_price || 210).toString()
       });
    }
    
    if (p.bom && p.bom.length > 0) {
      setFabricsList(p.bom.map((b, i) => {
        const br = b.brackets || {};
        return {
          id: Date.now() + i,
          name: b.fabric_name,
          cost: b.unit_cost,
          meters_1_2: (br['1-2 سنة'] ?? (b.meters || 0)).toString(),
          meters_3_5: (br['3-5 سنوات'] ?? (b.meters || 0)).toString(),
          meters_6_9: (br['6-9 سنوات'] ?? (b.meters || 0)).toString(),
          meters_10_13: (br['10-13 سنة'] ?? (b.meters || 0)).toString()
        };
      }));
    }
    
    if (p.age_chart) {
      setAgeChart(p.age_chart);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الموديل؟")) return;
    
    if (setProducts) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
    
    try {
      await callGAS("deleteProduct", { id });
      showToast("تم الحذف سحابياً 🗑️");
    } catch (e) {
      showToast("تم الحذف محلياً 🗑️");
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none min-h-[42px]";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── بطاقة الإضافة والحاسبة ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-sm font-bold">
              🧮
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {editId ? "تعديل بيانات الموديل والتكلفة" : "حاسبة وتكلفة موديلات أزياء الأطفال (BOM Matrix)"}
              </h2>
              <p className="text-[11px] text-slate-500 font-normal">تسجيل الموديل وقائمة الأقمشة ومصفوفة الأسعار والشرائح العمرية</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            <span className="text-rose-500 font-bold">*</span> الحقول الإلزامية
          </span>
        </div>

        <form onSubmit={handleAddProduct} className="p-6 space-y-5">
          {/* معلومات الموديل الأساسية */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>اسم الموديل <span className="text-rose-500 font-bold">*</span></label>
              <input required type="text" value={modelName} onChange={e=>setModelName(e.target.value)} className={inputCls} placeholder="مثال: فستان سندريلا الملكي" />
            </div>
            <div>
              <label className={labelCls}>التصنيف</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} className={inputCls}>
                {(PRODUCT_CATEGORIES || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>تاريخ الحساب 📅</label>
              <input type="date" value={calcDate} onChange={e=>setCalcDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Dynamic Fabrics Matrix Grid */}
          <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-100 space-y-3 overflow-x-auto">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-purple-950">
                🧵 مصفوفة استهلاك الأقمشة التفصيلية حسب العمر (BOM Matrix)
              </label>
              <button type="button" onClick={addFabricRow} className="text-xs text-purple-700 font-bold hover:text-purple-900 bg-white px-3 py-1 rounded-lg border border-purple-200 shadow-2xs flex items-center gap-1 transition">
                <span>➕</span> إضافة قماش / بطانة
              </button>
            </div>
            
            {fabricsList.map((fab) => (
              <div key={fab.id} className="flex flex-col md:flex-row gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs min-w-[600px]">
                <div className="w-full md:w-1/4">
                  <span className="text-[11px] text-slate-500 font-semibold block mb-1">اسم القماش من المخزون</span>
                  <select value={fab.name} onChange={e => handleFabricChange(fab.id, 'name', e.target.value)} className={inputCls}>
                    <option value="">-- اختر القماش --</option>
                    {(inventory || []).map(inv => (
                      <option key={inv.id} value={inv.item_name}>{inv.item_name} ({inv.cost || inv.cost_per_meter || 0} {currencyDisplay}/متر)</option>
                    ))}
                  </select>
                </div>
                
                <div className="w-full md:w-3/4 grid grid-cols-5 gap-2 items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1 text-center">1-2 سنة (متر)</span>
                    <input type="number" step="0.1" value={fab.meters_1_2} onChange={e => handleFabricChange(fab.id, 'meters_1_2', e.target.value)} className={inputCls + " text-center font-mono"} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1 text-center">3-5 سنوات (متر)</span>
                    <input type="number" step="0.1" value={fab.meters_3_5} onChange={e => handleFabricChange(fab.id, 'meters_3_5', e.target.value)} className={inputCls + " text-center font-mono"} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1 text-center">6-9 سنوات (متر)</span>
                    <input type="number" step="0.1" value={fab.meters_6_9} onChange={e => handleFabricChange(fab.id, 'meters_6_9', e.target.value)} className={inputCls + " text-center font-mono"} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block mb-1 text-center">10-13 سنة (متر)</span>
                    <input type="number" step="0.1" value={fab.meters_10_13} onChange={e => handleFabricChange(fab.id, 'meters_10_13', e.target.value)} className={inputCls + " text-center font-mono"} />
                  </div>
                  
                  <div className="text-center pt-4">
                    <button type="button" onClick={() => removeFabricRow(fab.id)} disabled={fabricsList.length === 1} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-30 transition-colors" title="حذف القماش">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Dynamic Cost Summary per Bracket */}
            <div className="pt-3 border-t border-purple-100">
              <span className="text-xs font-bold text-slate-800 block mb-2">📊 تكلفة الأقمشة أوتوماتيكياً لكل شريحة عمرية:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                {['1-2 سنة', '3-5 سنوات', '6-9 سنوات', '10-13 سنة'].map(brk => (
                  <div key={brk} className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium block">{brk}</span>
                    <span className="text-xs font-bold text-purple-900 font-mono">{costsPerBracket[brk].toFixed(1)} {currencyDisplay}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Age-to-Length Chart Grid */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              📏 نطاق الأطوال القياسية للموديل (استنتاج العمر الآلي)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {ageChart.map((row) => (
                <div key={row.id} className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-purple-900 block mb-1.5">{row.age}</span>
                  <div className="flex items-center gap-1.5">
                    <input type="number" value={row.min} onChange={e => updateAgeChart(row.id, 'min', parseFloat(e.target.value))} className={inputCls + " text-center p-1 font-mono text-[11px] min-h-[34px]"} placeholder="من" />
                    <span className="text-slate-400 text-xs">-</span>
                    <input type="number" value={row.max} onChange={e => updateAgeChart(row.id, 'max', parseFloat(e.target.value))} className={inputCls + " text-center p-1 font-mono text-[11px] min-h-[34px]"} placeholder="إلى" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Direct Costs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>متوسط تكلفة الأقمشة ({currencyDisplay})</label>
              <input readOnly type="number" value={computedFabricTotal.toFixed(1)} className={inputCls + " bg-slate-100 font-mono font-bold text-purple-900"} />
            </div>
            <div>
              <label className={labelCls}>أجرة الخياطة والعمالة ({currencyDisplay})</label>
              <input type="number" value={laborCost} onChange={e=>setLaborCost(e.target.value)} className={inputCls + " font-mono"} />
            </div>
            <div>
              <label className={labelCls}>التغليف والإكسسوارات ({currencyDisplay})</label>
              <input type="number" value={packagingCost} onChange={e=>setPackagingCost(e.target.value)} className={inputCls + " font-mono"} />
            </div>
          </div>

          {/* Pricing Summary Matrix */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-slate-300 text-center text-xs font-bold">💎 مصفوفة التكلفة وأسعار البيع والأرباح لكل شريحة عمرية</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-center">
              {['1-2 سنة', '3-5 سنوات', '6-9 سنوات', '10-13 سنة'].map(bracket => {
                const totalCostForBracket = costsPerBracket[bracket] + parseFloat(laborCost || 0) + parseFloat(packagingCost || 0);
                const bracketPrice = parseFloat(pricesMatrix[bracket] || 0);
                const bracketProfit = bracketPrice - totalCostForBracket;
                
                return (
                  <div key={bracket} className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700">
                    <span className="block text-purple-300 mb-2.5 text-xs font-bold">{bracket}</span>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between items-center text-slate-300 bg-slate-900/60 p-1.5 rounded-lg font-mono">
                        <span className="text-[10px]">إجمالي التكلفة:</span>
                        <span className="font-bold">{totalCostForBracket.toFixed(1)} {currencyDisplay}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/10 p-1.5 rounded-lg">
                        <span className="text-slate-200 text-[10px]">سعر البيع:</span>
                        <input type="number" value={pricesMatrix[bracket]} onChange={e => handlePriceChange(bracket, e.target.value)} className="w-16 p-1 text-slate-900 rounded-md text-center font-bold bg-white text-xs font-mono" />
                      </div>
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-700/80">
                        <span className="text-slate-400 text-[10px]">الربح الصافي:</span>
                        <span className="text-emerald-400 font-bold font-mono">+{bracketProfit.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              {editId ? "💾 حفظ التعديلات" : "➕ حفظ الموديل والتكلفة سحابياً"}
            </button>
          </div>
        </form>
      </div>

      {/* ── جدول المنتجات والموديلات ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">سجل الموديلات والمنتجات</h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-semibold">{products.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {(!products || products.length === 0) ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              لا توجد موديلات مسجلة بعد 👗
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  {['الكود','اسم الموديل','التصنيف','قائمة الأقمشة (BOM)','الأمتار','تكلفة القماش','الخياطة','التغليف','إجمالي التكلفة','سعر البيع','الربح','الإجراءات'].map(h => (
                    <th key={h} className="px-3.5 py-3 text-right whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-3.5 py-3 font-mono text-[11px] text-purple-700 font-bold whitespace-nowrap">#{p.id}</td>
                    <td className="px-3.5 py-3 font-bold text-slate-900 whitespace-nowrap">{p.name}</td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md text-[10px] font-semibold">{p.category}</span>
                    </td>
                    <td className="px-3.5 py-3 max-w-[200px] truncate text-slate-600" title={p.fabric_name}>{p.fabric_name}</td>
                    <td className="px-3.5 py-3 font-mono whitespace-nowrap">{p.yards_used} م</td>
                    <td className="px-3.5 py-3 font-mono whitespace-nowrap">{p.fabric_cost}</td>
                    <td className="px-3.5 py-3 font-mono whitespace-nowrap">{p.labor_cost}</td>
                    <td className="px-3.5 py-3 font-mono whitespace-nowrap">{p.packaging_cost}</td>
                    <td className="px-3.5 py-3 font-bold font-mono text-slate-900 whitespace-nowrap">{p.total_cost} {p.currency || currencyDisplay}</td>
                    <td className="px-3.5 py-3 font-bold font-mono text-emerald-700 whitespace-nowrap">{p.sell_price}</td>
                    <td className="px-3.5 py-3 font-bold font-mono text-purple-800 whitespace-nowrap">+{p.profit}</td>
                    <td className="px-3.5 py-3 flex items-center gap-1.5 justify-center whitespace-nowrap">
                      <button onClick={() => handleEditProduct(p)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition" title="تعديل">
                        ✏️
                      </button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition" title="حذف">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
