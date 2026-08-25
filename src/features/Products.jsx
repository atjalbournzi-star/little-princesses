const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Products({ products = [], setProducts, inventory = [], showToast, currency }) {
  const currencyDisplay = currency?.display || "YER ﷼";

  const [modelName, setModelName] = useState("");
  const [category, setCategory] = useState("(Princess) فستان أميرة");
  const [editId, setEditId] = useState(null);
  const [activeTab, setActiveTab] = useState("calculator"); // 'calculator' | 'catalog'
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  
  // Dynamic Fabric Array Matrix
  const [fabricsList, setFabricsList] = useState([
    { id: Date.now(), name: "", meters_1_2: "", meters_3_5: "", meters_6_9: "", meters_10_13: "", cost: 0 }
  ]);

  const [laborCost, setLaborCost] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [pricesMatrix, setPricesMatrix] = useState({
    '1-2 سنة': "",
    '3-5 سنوات': "",
    '6-9 سنوات': "",
    '10-13 سنة': ""
  });

  const handlePriceChange = (bracket, value) => {
    setPricesMatrix(prev => ({ ...prev, [bracket]: value }));
  };
  const [formCurrency, setFormCurrency] = useState(currencyDisplay);
  const [calcDate, setCalcDate] = useState(TODAY_STR_ISO);

  // Age Chart Configuration
  const [ageChart, setAgeChart] = useState([
    { id: 1, age: '1-2 سنوات', min: '', max: '' },
    { id: 2, age: '2-3 سنوات', min: '', max: '' },
    { id: 3, age: '4-5 سنوات', min: '', max: '' },
    { id: 4, age: '6-7 سنوات', min: '', max: '' },
    { id: 5, age: '8-10 سنوات', min: '', max: '' },
    { id: 6, age: '10-12 سنة', min: '', max: '' },
    { id: 7, age: '12-14 سنة', min: '', max: '' }
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
    setFabricsList([...fabricsList, { id: Date.now(), name: "", meters_1_2: "", meters_3_5: "", meters_6_9: "", meters_10_13: "", cost: 0 }]);
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
    setActiveTab("catalog");
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
    
    setActiveTab("calculator");
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

  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => {
      const matchesSearch = !search || 
        (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (p.fabric_name || '').toLowerCase().includes(search.toLowerCase()) ||
        String(p.id).includes(search);
      const matchesCategory = categoryFilter === "الكل" || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── Studio Header & KPI Summary ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xl font-bold shadow-xs">
              <Icons.Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                استوديو وهندسة تكلفة الموديلات (Fashion BOM Studio)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                حساب استهلاك الأقمشة، مصفوفة التكاليف والأسعار، وجداول المقاسات والأعمار
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => { setActiveTab("calculator"); setEditId(null); setModelName(""); }}
              className={`h-10 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "calculator"
                  ? "bg-[#8F2A87] text-white shadow-xs"
                  : "bg-[#FAFAFB] text-[#25232A] border border-[#E8E5EA] hover:bg-[#F2E7F3]"
              }`}
            >
              <Icons.Plus className="w-4 h-4" />
              <span>{editId ? "تعديل الموديل" : "إضافة موديل جديد"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`h-10 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-[#8F2A87] text-white shadow-xs"
                  : "bg-[#FAFAFB] text-[#25232A] border border-[#E8E5EA] hover:bg-[#F2E7F3]"
              }`}
            >
              <Icons.Scissors className="w-4 h-4" />
              <span>كتالوج الموديلات ({products.length})</span>
            </button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي الموديلات</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1 block">
              {products.length.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">موديل</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">متوسط تكلفة التصنيع</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
              {((products.reduce((acc, p) => acc + (parseFloat(p.total_cost) || 0), 0) / (products.length || 1))).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">متوسط سعر البيع</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#B0005A] mt-1 block">
              {((products.reduce((acc, p) => acc + (parseFloat(p.sell_price) || 0), 0) / (products.length || 1))).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">متوسط هامش الربح</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#8F2A87] mt-1 block">
              {((products.reduce((acc, p) => acc + (parseFloat(p.profit) || 0), 0) / (products.length || 1))).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── TAB 1: الحاسبة ومصفوفة الـ BOM ── */}
      {activeTab === "calculator" && (
        <form onSubmit={handleAddProduct} className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-6 space-y-6 animate-fadeIn">
          
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
            <h2 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
              <span className="text-[#8F2A87]">🧮</span>
              {editId ? `تعديل بيانات وتكلفة: ${modelName}` : "تسجيل موديل جديد وهندسة التكاليف (BOM)"}
            </h2>
            <span className="text-xs text-[#6F6B75]">
              <span className="text-[#D64545] font-bold">*</span> الحقول الإلزامية
            </span>
          </div>

          {/* Basic Model Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5">
            <div>
              <label className={labelCls}>اسم الموديل <span className="text-[#D64545] font-bold">*</span></label>
              <input required type="text" value={modelName} onChange={e=>setModelName(e.target.value)} className={inputCls} placeholder="" />
            </div>
            <div>
              <label className={labelCls}>التصنيف الفني</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} className={inputCls}>
                {(PRODUCT_CATEGORIES || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>تاريخ الحساب والتسعير</label>
              <input type="date" value={calcDate} onChange={e=>setCalcDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Dynamic Fabrics Matrix Grid */}
          <div className="p-5 bg-[#FAFAFB] rounded-2xl border border-[#E8E5EA] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-[#25232A]">
                  🧵 مصفوفة استهلاك الأقمشة والبطانات (BOM Material Consumption)
                </label>
                <p className="text-[11px] text-[#6F6B75] mt-0.5">حدد أمتار القماش المطلوبة لكل شريحة عمرية بدقة</p>
              </div>
              <button type="button" onClick={addFabricRow} className="h-9 px-3.5 bg-white hover:bg-[#F2E7F3] text-[#8F2A87] text-xs font-bold rounded-xl border border-[#E5CEE7] shadow-2xs flex items-center gap-1.5 transition cursor-pointer">
                <Icons.Plus className="w-3.5 h-3.5" />
                <span>إضافة قماش / بطانة</span>
              </button>
            </div>
            
            <div className="space-y-3 overflow-x-auto">
              {fabricsList.map((fab) => (
                <div key={fab.id} className="flex flex-col md:flex-row gap-3 items-center bg-white p-3.5 rounded-xl border border-[#E8E5EA] shadow-2xs min-w-[620px]">
                  <div className="w-full md:w-1/3">
                    <span className="text-[11px] text-[#6F6B75] font-semibold block mb-1">نوع القماش / البطانة</span>
                    <select value={fab.name} onChange={e => handleFabricChange(fab.id, 'name', e.target.value)} className={inputCls}>
                      <option value="">-- اختر من المخزون --</option>
                      {(inventory || []).map(inv => (
                        <option key={inv.id} value={inv.item_name}>{inv.item_name} ({inv.cost || inv.cost_per_meter || 0} {currencyDisplay}/متر)</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-full md:w-2/3 grid grid-cols-5 gap-2 items-center">
                    <div>
                      <span className="text-[10px] text-[#6F6B75] font-semibold block mb-1 text-center">1-2 سنة (متر)</span>
                      <input type="number" step="0.1" value={fab.meters_1_2} onChange={e => handleFabricChange(fab.id, 'meters_1_2', e.target.value)} className={inputCls + " text-center font-mono font-bold"} />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6F6B75] font-semibold block mb-1 text-center">3-5 سنوات (متر)</span>
                      <input type="number" step="0.1" value={fab.meters_3_5} onChange={e => handleFabricChange(fab.id, 'meters_3_5', e.target.value)} className={inputCls + " text-center font-mono font-bold"} />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6F6B75] font-semibold block mb-1 text-center">6-9 سنوات (متر)</span>
                      <input type="number" step="0.1" value={fab.meters_6_9} onChange={e => handleFabricChange(fab.id, 'meters_6_9', e.target.value)} className={inputCls + " text-center font-mono font-bold"} />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6F6B75] font-semibold block mb-1 text-center">10-13 سنة (متر)</span>
                      <input type="number" step="0.1" value={fab.meters_10_13} onChange={e => handleFabricChange(fab.id, 'meters_10_13', e.target.value)} className={inputCls + " text-center font-mono font-bold"} />
                    </div>
                    
                    <div className="text-center pt-3">
                      <button type="button" onClick={() => removeFabricRow(fab.id)} disabled={fabricsList.length === 1} className="w-9 h-9 flex items-center justify-center text-[#D64545] hover:bg-rose-50 rounded-xl disabled:opacity-20 transition cursor-pointer mx-auto" title="حذف القماش">
                        <Icons.Close className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Cost Summary per Bracket */}
            <div className="pt-3 border-t border-[#E8E5EA]">
              <span className="text-xs font-bold text-[#25232A] block mb-2">📊 تكلفة الأقمشة التلقائية لكل شريحة عمرية:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {['1-2 سنة', '3-5 سنوات', '6-9 سنوات', '10-13 سنة'].map(brk => (
                  <div key={brk} className="bg-white p-3 rounded-xl border border-[#E8E5EA]">
                    <span className="text-[11px] text-[#6F6B75] font-semibold block">{brk}</span>
                    <span className="text-xs font-bold text-[#8F2A87] font-mono mt-0.5 block">{costsPerBracket[brk].toFixed(1)} {currencyDisplay}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Age-to-Length Chart Grid */}
          <div className="p-5 bg-[#FAFAFB] rounded-2xl border border-[#E8E5EA] space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#25232A]">
                📏 نطاق الأطوال القياسية للموديل (جدول الأعمار والأطوال)
              </label>
              <p className="text-[11px] text-[#6F6B75] mt-0.5">يُستخدم لاستنتاج العمر التقديري تلقائياً عند أخذ المقاس في شاشة العملاء</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ageChart.map((row) => (
                <div key={row.id} className="bg-white p-3 rounded-xl border border-[#E8E5EA]">
                  <span className="text-xs font-bold text-[#25232A] block mb-2">{row.age}</span>
                  <div className="flex items-center gap-1.5">
                    <input type="number" value={row.min} onChange={e => updateAgeChart(row.id, 'min', parseFloat(e.target.value))} className={inputCls + " text-center p-1 font-mono text-[11px] h-9"} placeholder="من" />
                    <span className="text-[#6F6B75] text-xs font-bold">-</span>
                    <input type="number" value={row.max} onChange={e => updateAgeChart(row.id, 'max', parseFloat(e.target.value))} className={inputCls + " text-center p-1 font-mono text-[11px] h-9"} placeholder="إلى" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Direct Costs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4.5">
            <div>
              <label className={labelCls}>متوسط تكلفة الأقمشة ({currencyDisplay})</label>
              <input readOnly type="number" value={computedFabricTotal.toFixed(1)} className={inputCls + " bg-[#FAFAFB] font-mono font-bold text-[#8F2A87]"} />
            </div>
            <div>
              <label className={labelCls}>أجرة الخياطة والعمالة ({currencyDisplay})</label>
              <input type="number" value={laborCost} onChange={e=>setLaborCost(e.target.value)} className={inputCls + " font-mono font-bold"} />
            </div>
            <div>
              <label className={labelCls}>التغليف والإكسسوارات ({currencyDisplay})</label>
              <input type="number" value={packagingCost} onChange={e=>setPackagingCost(e.target.value)} className={inputCls + " font-mono font-bold"} />
            </div>
          </div>

          {/* Pricing Summary Matrix Card */}
          <div className="bg-[#25232A] text-white p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-white text-center text-xs font-bold flex items-center justify-center gap-2">
              <span className="text-[#F28A00]">💎</span> مصفوفة التكلفة، أسعار البيع، وصافي الأرباح لكل شريحة عمرية
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-center">
              {['1-2 سنة', '3-5 سنوات', '6-9 سنوات', '10-13 سنة'].map(bracket => {
                const totalCostForBracket = costsPerBracket[bracket] + parseFloat(laborCost || 0) + parseFloat(packagingCost || 0);
                const bracketPrice = parseFloat(pricesMatrix[bracket] || 0);
                const bracketProfit = bracketPrice - totalCostForBracket;
                
                return (
                  <div key={bracket} className="bg-white/10 p-4 rounded-xl border border-white/15 backdrop-blur-xs">
                    <span className="block text-[#F2A4CB] mb-2.5 text-xs font-bold">{bracket}</span>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg font-mono">
                        <span className="text-[10px] text-slate-300">إجمالي التكلفة:</span>
                        <span className="font-bold text-white">{totalCostForBracket.toFixed(1)} {currencyDisplay}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-1.5 rounded-lg text-[#25232A]">
                        <span className="text-[10px] font-semibold text-[#6F6B75]">سعر البيع:</span>
                        <input type="number" value={pricesMatrix[bracket]} onChange={e => handlePriceChange(bracket, e.target.value)} className="w-18 p-1 text-[#25232A] rounded-md text-center font-bold bg-slate-100 text-xs font-mono outline-none" />
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/15">
                        <span className="text-[10px] text-slate-300">الربح الصافي:</span>
                        <span className="text-[#009FAE] font-bold font-mono">+{bracketProfit.toFixed(1)} {currencyDisplay}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#8F2A87] hover:bg-[#73216C] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <Icons.Check className="w-4 h-4" />
              <span>{editId ? "حفظ تعديلات الموديل" : "حفظ الموديل والتكلفة سحابياً"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ── TAB 2: كتالوج الموديلات ── */}
      {activeTab === "catalog" && (
        <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden animate-fadeIn space-y-4 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <h3 className="font-bold text-sm text-[#25232A]">دليل الموديلات والفساتين</h3>
              <span className="text-xs bg-[#F2E7F3] text-[#8F2A87] font-bold px-2.5 py-0.5 rounded-full font-mono">{filteredProducts.length}</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none"
              >
                <option value="الكل">جميع التصنيفات</option>
                {(PRODUCT_CATEGORIES || []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="relative flex-1 sm:w-64">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#8F2A87] outline-none"
                  placeholder="بحث بالموديل أو القماش..."
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">
                لا توجد موديلات تطابق البحث 👗
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                    {['الكود','اسم الموديل','التصنيف','قائمة الأقمشة (BOM)','الأمتار','تكلفة القماش','الخياطة','التغليف','إجمالي التكلفة','سعر البيع','الربح','الإجراءات'].map(h => (
                      <th key={h} className="px-4 py-3 text-right whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E5EA] bg-white">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-[#FAFAFB] transition-colors">
                      <td className="px-4 py-3 font-mono text-[11.5px] text-[#8F2A87] font-bold whitespace-nowrap">#{p.id}</td>
                      <td className="px-4 py-3 font-bold text-[#25232A] whitespace-nowrap">{p.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold">{p.category}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-[#6F6B75]" title={p.fabric_name}>{p.fabric_name}</td>
                      <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">{parseFloat(p.yards_used || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} م</td>
                      <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">{(parseFloat(p.fabric_cost) || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                      <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">{(parseFloat(p.labor_cost) || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                      <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">{(parseFloat(p.packaging_cost) || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                      <td className="px-4 py-3 font-bold font-mono tabular-nums text-[#25232A] whitespace-nowrap">{(parseFloat(p.total_cost) || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[10px] font-medium text-[#6F6B75] font-sans">{p.currency || currencyDisplay}</span></td>
                      <td className="px-4 py-3 font-bold font-mono tabular-nums text-[#007F8C] whitespace-nowrap">{(parseFloat(p.sell_price) || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                      <td className="px-4 py-3 font-bold font-mono tabular-nums text-[#8F2A87] whitespace-nowrap">+{(parseFloat(p.profit) || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                      <td className="px-4 py-3 flex items-center gap-1.5 justify-center whitespace-nowrap">
                        <button onClick={() => handleEditProduct(p)} className="w-8 h-8 rounded-xl bg-white hover:bg-[#F2E7F3] text-[#6F6B75] hover:text-[#8F2A87] border border-[#E8E5EA] transition-all flex items-center justify-center cursor-pointer" title="تعديل">
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 text-[#6F6B75] hover:text-[#D64545] border border-[#E8E5EA] transition-all flex items-center justify-center cursor-pointer" title="حذف">
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
      )}
    </div>
  );
}
