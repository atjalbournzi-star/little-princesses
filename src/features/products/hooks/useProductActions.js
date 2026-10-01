// src/features/products/hooks/useProductActions.js
// خطاف عمليات وإجراءات الموديلات: إدارة البيانات الشاملة، شجرة الخامات، ومصفوفة التكاليف المرنة

const { useState, useEffect, useMemo } = React;

function useProductActions({ products = [], setProducts, inventory = [], showToast, currency }) {
  const u = window.productUtils || {};
  const getCurrencyCode = u.getCurrencyCode || ((c) => (typeof c === 'object' ? c.code : c) || 'YER');
  const getCurrencyLabel = u.getCurrencyLabel || ((c) => `${getCurrencyCode(c)} ﷼`);

  const [modalOpen, setModalOpen] = useState(false), [activeTab, setActiveTab] = useState("basic");
  const [editId, setEditId] = useState(null), [isSaving, setIsSaving] = useState(false);

  // 1. بيانات الموديل ومواصفاته الكاملة
  const [modelName, setModelName] = useState(""), [smartCode, setSmartCode] = useState("");
  const [targetSegment, setTargetSegment] = useState("kids"), [category, setCategory] = useState("فساتين وبدلات خاصة");
  const [subcategory, setSubcategory] = useState(""), [collection, setCollection] = useState("");
  const [imageUrl, setImageUrl] = useState(""), [description, setDescription] = useState(""), [status, setStatus] = useState("Active");
  const [formCurrency, setFormCurrency] = useState(() => getCurrencyCode(currency) || "YER");
  const [calcDate, setCalcDate] = useState(() => (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().split('T')[0]));
  const [selectedSizes, setSelectedSizes] = useState(() => ['1-2Y', '3-5Y', '6-9Y', '10-13Y']);
  const [selectedColors, setSelectedColors] = useState(() => ['وردي فاتح', 'أبيض ملكي']);

  // 2. مصفوفة الأقمشة والخامات (BOM)
  const [fabricsList, setFabricsList] = useState([u.createDefaultFabricRow ? u.createDefaultFabricRow("YER", "kids") : {
    id: Date.now(), inventory_id: "", name: "", unit: "متر", currency: "YER", brackets: { '1-2Y': 1.0, '3-5Y': 1.5, '6-9Y': 2.0, '10-13Y': 2.5 }, cost: 0
  }]);

  // 3. مراحل التشغيل وتكاليف الأجور
  const [cutterWage, setCutterWage] = useState(""), [tailorWage, setTailorWage] = useState("");
  const [embroidWage, setEmbroidWage] = useState(""), [finisherWage, setFinisherWage] = useState("");
  const [packagingCost, setPackagingCost] = useState(""), [pricesMatrix, setPricesMatrix] = useState({ '1-2Y': "", '3-5Y': "", '6-9Y': "", '10-13Y': "" });
  const [ageChart, setAgeChart] = useState(() => u.DEFAULT_AGE_CHART || []);
  const [womenSizeChart, setWomenSizeChart] = useState(() => u.DEFAULT_WOMEN_SIZE_CHART || []);
  const updateWomenSizeChart = (id, field, v) => setWomenSizeChart(prev => prev.map(w => w.id === id ? { ...w, [field]: v } : w));
  const activeModelCurrency = useMemo(() => getCurrencyCode(formCurrency), [formCurrency, getCurrencyCode]);
  const activeModelCurrencyLabel = useMemo(() => getCurrencyLabel(formCurrency), [formCurrency, getCurrencyLabel]);

  useEffect(() => { if (currency?.code && !editId) setFormCurrency(getCurrencyCode(currency)); }, [currency, editId, getCurrencyCode]);
  const toggleSize = (sz) => setSelectedSizes(prev => prev.includes(sz) ? prev.filter(s => s !== sz) : [...prev, sz]);
  const toggleColor = (col) => setSelectedColors(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  const generateNewSmartCode = () => { setSmartCode(u.generateSmartModelCode ? u.generateSmartModelCode(targetSegment) : `LP-${Date.now().toString().slice(-6)}`); };

  const handleTargetSegmentChange = (newSeg) => {
    setTargetSegment(newSeg);
    if (!editId) {
      const code = u.generateSmartModelCode ? u.generateSmartModelCode(newSeg) : `LP-${Date.now().toString().slice(-6)}`;
      setSmartCode(code);
      const segSizes = u.getSegmentSizes ? u.getSegmentSizes(newSeg) : ['1-2Y', '3-5Y', '6-9Y', '10-13Y'];
      setSelectedSizes(segSizes);
      setFabricsList([u.createDefaultFabricRow ? u.createDefaultFabricRow(activeModelCurrency, newSeg) : {
        id: Date.now(), inventory_id: "", name: "", unit: "متر", currency: activeModelCurrency, brackets: {}, cost: 0
      }]);
      const newPrices = {};
      segSizes.forEach(s => { newPrices[s] = ""; });
      setPricesMatrix(newPrices);
    }
  };

  useEffect(() => {
    if (Array.isArray(inventory) && inventory.length) window.__ACTIVE_INVENTORY__ = inventory;
    else fetch('/api/inventory').then(r => r.json()).then(d => {
      const l = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
      if (l.length) window.__ACTIVE_INVENTORY__ = l;
    }).catch(() => {});
  }, [inventory]);

  const handleFabricChange = (id, field, value, selectedInv) => {
    setFabricsList(prev => prev.map(fab => {
      if (fab.id !== id) return fab;
      const updated = { ...fab, [field]: value };
      if (field === 'name') {
        const invList = (Array.isArray(inventory) && inventory.length) ? inventory : (window.__ACTIVE_INVENTORY__ || []);
        const inv = selectedInv || invList.find(i => (i.item_name || i.name) === value);
        updated.inventory_id = inv?.id || inv?.item_code || "";
        updated.inventory_code = inv?.item_code || inv?.code || inv?.id || "";
        updated.unit = inv?.unit || "متر";
        updated.cost = inv ? parseFloat(inv.unit_cost ?? inv.cost_price ?? inv.cost ?? inv.cost_per_meter ?? 0) : 0;
        updated.available_qty = inv ? parseFloat(inv.available_qty ?? inv.quantity ?? 0) : 0;
        updated.currency = inv ? getCurrencyCode(inv.currency || 'YER') : activeModelCurrency;
      }
      return updated;
    }));
  };

  const handleFabricBracketChange = (id, sz, val) => {
    setFabricsList(prev => prev.map(f => f.id === id ? { ...f, brackets: { ...(f.brackets || {}), [sz]: val } } : f));
  };

  const addFabricRow = () => {
    setFabricsList(prev => [...prev, u.createDefaultFabricRow ? u.createDefaultFabricRow(activeModelCurrency, targetSegment) : { id: Date.now(), inventory_id: "", name: "", unit: "متر", currency: activeModelCurrency, brackets: {}, cost: 0 }]);
  };
  const removeFabricRow = (id) => { if (fabricsList.length > 1) setFabricsList(prev => prev.filter(f => f.id !== id)); };

  const handlePriceChange = (b, v) => setPricesMatrix(prev => ({ ...prev, [b]: v }));
  const updateAgeChart = (id, field, v) => setAgeChart(prev => prev.map(a => a.id === id ? { ...a, [field]: v } : a));

  const costsPerBracket = useMemo(() => {
    if (u.calculateCostsPerBracket) return u.calculateCostsPerBracket(fabricsList, targetSegment, activeModelCurrency);
    return {};
  }, [fabricsList, targetSegment, activeModelCurrency, u]);

  const refSize = useMemo(() => {
    const seg = u.SEGMENTS?.[targetSegment] || u.SEGMENTS?.kids;
    return seg?.referenceSize || '6-9Y';
  }, [targetSegment, u]);

  const computedTotalLabor = (parseFloat(cutterWage || 0) + parseFloat(tailorWage || 0) + parseFloat(embroidWage || 0) + parseFloat(finisherWage || 0));
  const computedFabricTotal = costsPerBracket[refSize] || Object.values(costsPerBracket)[0] || 0;
  const computedTotalCost = computedFabricTotal + computedTotalLabor + parseFloat(packagingCost || 0);
  const computedProfit = parseFloat(pricesMatrix[refSize] || Object.values(pricesMatrix)[0] || 0) - computedTotalCost;

  const handleApplyPresetMargin = (pct = 40) => {
    if (u.calculateSuggestedPrices) {
      const suggested = u.calculateSuggestedPrices(costsPerBracket, computedTotalLabor + parseFloat(packagingCost || 0), pct);
      setPricesMatrix(suggested);
      if (showToast) showToast(`تم تطبيق أسعار مقترحة بهامش ربح +${pct}% ✨`);
    }
  };

  const handleOpenAddModal = () => {
    const code = u.generateSmartModelCode ? u.generateSmartModelCode('kids') : `LP-KID-${Date.now().toString().slice(-4)}`;
    setEditId(null); setModelName(""); setSmartCode(code); setTargetSegment("kids");
    setCategory("فساتين وبدلات خاصة"); setSubcategory(""); setCollection(""); setImageUrl(""); setDescription(""); setStatus("Active");
    setCutterWage(""); setTailorWage(""); setEmbroidWage(""); setFinisherWage(""); setPackagingCost("");
    setPricesMatrix({ '1-2Y': "", '3-5Y': "", '6-9Y': "", '10-13Y': "" });
    setSelectedSizes(['1-2Y', '3-5Y', '6-9Y', '10-13Y']);
    setFabricsList([u.createDefaultFabricRow ? u.createDefaultFabricRow(activeModelCurrency, 'kids') : {
      id: Date.now(), inventory_id: "", name: "", unit: "متر", currency: activeModelCurrency, brackets: { '1-2Y': 1.0, '3-5Y': 1.5, '6-9Y': 2.0, '10-13Y': 2.5 }, cost: 0
    }]);
    setActiveTab("basic"); setModalOpen(true);
  };

  const handleEditProduct = (p) => {
    const seg = p.target_segment || 'kids';
    setEditId(p.id); setModelName(p.name || p.model_name || "");
    setSmartCode(p.sku || p.barcode || p.model_no || `LP-${p.id}`);
    setTargetSegment(seg); setCategory(p.category || "فساتين وبدلات خاصة"); setSubcategory(p.subcategory || "");
    setCollection(p.collection || ""); setImageUrl(p.image_url || p.image || ""); setDescription(p.description || ""); setStatus(p.status || "Active");
    setCutterWage(p.cutter_wage || ""); setTailorWage(p.tailor_wage || (p.labor_cost ? (p.labor_cost * 0.5) : ""));
    setEmbroidWage(p.embroiderer_wage || (p.labor_cost ? (p.labor_cost * 0.3) : "")); setFinisherWage(p.finisher_wage || (p.labor_cost ? (p.labor_cost * 0.2) : ""));
    setPackagingCost(p.packaging_cost || "");
    if (p.sizes?.length) setSelectedSizes(p.sizes);
    if (p.colors?.length) setSelectedColors(p.colors);
    if (p.currency) setFormCurrency(getCurrencyCode(p.currency));
    if (u.normalizeProductForEdit) {
      const norm = u.normalizeProductForEdit(p, refSize);
      setPricesMatrix(norm.pm);
      if (norm.fabrics?.length) setFabricsList(norm.fabrics);
    }
    if (p.age_chart) {
      if (seg === 'women_adults') setWomenSizeChart(p.age_chart);
      else setAgeChart(p.age_chart);
    }
    setActiveTab("basic"); setModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!modelName.trim()) return showToast ? showToast("اسم الموديل مطلوب ⚠️", "error") : null;
    setIsSaving(true);
    const resolvedChart = targetSegment === 'women_adults' ? womenSizeChart : ageChart;
    const newP = u.buildProductPayload ? u.buildProductPayload({
      editId, smartCode, modelName, targetSegment, category, subcategory, collection, imageUrl, description, status,
      fabricsList, refSize, computedFabricTotal, cutterWage, tailorWage, embroidWage, finisherWage,
      computedTotalLabor, packagingCost, computedTotalCost, pricesMatrix, activeModelCurrencyLabel, computedProfit,
      calcDate, selectedSizes, selectedColors, ageChart: resolvedChart
    }) : { id: editId || Date.now(), name: modelName };
    try {
      if (editId) {
        if (setProducts) setProducts(prev => prev.map(p => p.id === editId ? newP : p));
        if (window.bomAPI?.saveModel) await window.bomAPI.saveModel(newP);
        if (showToast) showToast("تم تحديث الموديل ومصفوفة التكاليف بنجاح ☁️🧮");
      } else {
        if (setProducts) setProducts(prev => [newP, ...(prev || [])]);
        if (window.bomAPI?.saveModel) await window.bomAPI.saveModel(newP);
        if (showToast) showToast("تم إضافة الموديل وحساب التكلفة سحابياً ☁️🧮");
      }
    } catch (err) {
      if (showToast) showToast(err.message || "تم الحفظ محلياً 🧮");
    }
    setIsSaving(false); setModalOpen(false);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف أو أرشفة هذا الموديل؟")) return;
    if (setProducts) setProducts(prev => prev.filter(p => p.id !== id));
    try {
      if (window.bomAPI?.deleteModel) await window.bomAPI.deleteModel(id);
      if (showToast) showToast("تم حذف/أرشفة الموديل بنجاح 🗑️");
    } catch (e) {
      if (showToast) showToast("تم الحذف محلياً 🗑️");
    }
  };

  return {
    modalOpen, setModalOpen, activeTab, setActiveTab, editId, isSaving,
    modelName, setModelName, smartCode, setSmartCode, generateNewSmartCode,
    targetSegment, setTargetSegment: handleTargetSegmentChange, category, setCategory,
    subcategory, setSubcategory, collection, setCollection, imageUrl, setImageUrl,
    description, setDescription, status, setStatus, formCurrency, setFormCurrency, calcDate, setCalcDate,
    selectedSizes, toggleSize, selectedColors, toggleColor, fabricsList, setFabricsList,
    handleFabricChange, handleFabricBracketChange, addFabricRow, removeFabricRow,
    cutterWage, setCutterWage, tailorWage, setTailorWage, embroidWage, setEmbroidWage, finisherWage, setFinisherWage,
    packagingCost, setPackagingCost, pricesMatrix, setPricesMatrix, handlePriceChange,
    ageChart, setAgeChart, updateAgeChart, womenSizeChart, setWomenSizeChart, updateWomenSizeChart,
    activeModelCurrency, activeModelCurrencyLabel,
    costsPerBracket, computedFabricTotal, computedTotalLabor, computedTotalCost, computedProfit,
    handleApplyPresetMargin, handleOpenAddModal, handleEditProduct, handleSaveProduct, handleDeleteProduct
  };
}

window.useProductActions = useProductActions;
