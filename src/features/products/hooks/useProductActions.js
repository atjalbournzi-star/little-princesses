/** useProductActions.js - إدارة موديلات وخامات وتكاليف مراحل الإنتاج ديناميكياً */
function useProductActions({ products = [], setProducts, inventory = [], showToast, currency, jobRoles = [] }) {
  const { useState, useEffect, useMemo } = React;
  const u = window.productUtils || {};
  const getCurrencyCode = u.getCurrencyCode || ((c) => (typeof c === 'object' ? c.code : c) || 'YER');
  const getCurrencyLabel = u.getCurrencyLabel || ((c) => getCurrencyCode(c));

  const [modalOpen, setModalOpen] = useState(false), [activeTab, setActiveTab] = useState("basic"), [editId, setEditId] = useState(null), [isSaving, setIsSaving] = useState(false);
  const [modelName, setModelName] = useState(""), [smartCode, setSmartCode] = useState(""), [targetSegment, setTargetSegment] = useState("kids"), [category, setCategory] = useState(""), [subcategory, setSubcategory] = useState(""), [collection, setCollection] = useState(""), [imageUrl, setImageUrl] = useState(""), [description, setDescription] = useState(""), [status, setStatus] = useState("Active");
  const [formCurrency, setFormCurrency] = useState(() => getCurrencyCode(currency) || "YER"), [calcDate, setCalcDate] = useState(() => (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : new Date().toISOString().split('T')[0])), [selectedSizes, setSelectedSizes] = useState(() => ['1-2Y', '3-5Y', '6-9Y', '10-13Y']), [selectedColors, setSelectedColors] = useState(() => []);
  const [fabricsList, setFabricsList] = useState([u.createDefaultFabricRow ? u.createDefaultFabricRow("YER", "kids") : { id: 1, inventory_id: "", name: "", unit: "متر", currency: "YER", brackets: { '1-2Y': "", '3-5Y': "", '6-9Y': "", '10-13Y': "" }, cost: 0 }]);
  const [cutterWage, setCutterWage] = useState(""), [tailorWage, setTailorWage] = useState(""), [embroidWage, setEmbroidWage] = useState(""), [finisherWage, setFinisherWage] = useState(""), [packagingCost, setPackagingCost] = useState(""), [stageWages, setStageWages] = useState({}), [pricesMatrix, setPricesMatrix] = useState({ '1-2Y': "", '3-5Y': "", '6-9Y': "", '10-13Y': "" });
  const [ageChart, setAgeChart] = useState(() => (u.DEFAULT_AGE_CHART ? JSON.parse(JSON.stringify(u.DEFAULT_AGE_CHART)) : [])), [womenSizeChart, setWomenSizeChart] = useState(() => (u.DEFAULT_WOMEN_SIZE_CHART ? JSON.parse(JSON.stringify(u.DEFAULT_WOMEN_SIZE_CHART)) : [])), [internalRoles, setInternalRoles] = useState(jobRoles || []);
  const updateWomenSizeChart = (id, field, v) => setWomenSizeChart(prev => prev.map(w => w.id === id ? { ...w, [field]: v } : w));
  const activeModelCurrency = useMemo(() => getCurrencyCode(formCurrency), [formCurrency, getCurrencyCode]), activeModelCurrencyLabel = useMemo(() => getCurrencyLabel(formCurrency), [formCurrency, getCurrencyLabel]);

  useEffect(() => {
    if (Array.isArray(jobRoles) && jobRoles.length) setInternalRoles(jobRoles);
    else fetch('/api/job-roles').then(r => r.json()).then(d => { const l = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []); if (l.length) setInternalRoles(l); }).catch(() => {});
  }, [jobRoles]);
  useEffect(() => { if (currency?.code && !editId) setFormCurrency(getCurrencyCode(currency)); }, [currency, editId, getCurrencyCode]);
  const toggleSize = (sz) => setSelectedSizes(prev => prev.includes(sz) ? prev.filter(s => s !== sz) : [...prev, sz]);
  const toggleColor = (col) => setSelectedColors(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  const fetchNextSkuPreview = async (seg = targetSegment, cat = category) => {
    try { const r = await fetch(`/api/products/next-sku?segment=${encodeURIComponent(seg || 'kids')}&category=${encodeURIComponent(cat || '')}`).then(res => res.json()); if (r?.sku) return r.sku; } catch (e) {}
    return u.generateSmartModelCode ? u.generateSmartModelCode(seg) : '';
  };
  const generateNewSmartCode = async () => { const s = await fetchNextSkuPreview(targetSegment, category); if (s) setSmartCode(s); };

  const getStageWage = (k, role = null) => {
    if (stageWages[k] !== undefined && stageWages[k] !== null && stageWages[k] !== '') return stageWages[k];
    if (role) {
      for (const rk of [role.role_code, role.role_key, role.wage_key]) {
        if (rk && stageWages[rk] !== undefined && stageWages[rk] !== '') return stageWages[rk];
      }
    }
    const defMap = { cutter_wage: cutterWage, tailor_wage: tailorWage, embroiderer_wage: embroidWage, finisher_wage: finisherWage, packager_wage: packagingCost, packaging_cost: packagingCost };
    return defMap[k] !== undefined ? defMap[k] : '';
  };

  const setStageWage = (k, v) => {
    setStageWages(prev => ({ ...prev, [k]: v }));
    if (k === 'cutter_wage') setCutterWage(v); else if (k === 'tailor_wage') setTailorWage(v);
    else if (k === 'embroiderer_wage') setEmbroidWage(v); else if (k === 'finisher_wage') setFinisherWage(v);
    else if (k === 'packager_wage' || k === 'packaging_cost') { setPackagingCost(v); setStageWages(p => ({ ...p, packaging_cost: v, packager_wage: v })); }
  };

  const handleTargetSegmentChange = (newSeg) => {
    setTargetSegment(newSeg);
    if (!editId) {
      fetchNextSkuPreview(newSeg, category).then(s => { if (s) setSmartCode(s); });
      const segSizes = u.getSegmentSizes ? u.getSegmentSizes(newSeg) : ['1-2Y', '3-5Y', '6-9Y', '10-13Y'];
      setSelectedSizes(segSizes);
      setFabricsList([u.createDefaultFabricRow ? u.createDefaultFabricRow(activeModelCurrency, "kids", 1) : { id: 1, inventory_id: "", name: "", unit: "متر", currency: activeModelCurrency, brackets: { "1-2Y": "", "3-5Y": "", "6-9Y": "", "10-13Y": "" }, cost: 0 }]);
      const newPrices = {}; segSizes.forEach(s => { newPrices[s] = ""; }); setPricesMatrix(newPrices);
    }
  };

  useEffect(() => {
    if (Array.isArray(inventory) && inventory.length) window.__ACTIVE_INVENTORY__ = inventory;
    else fetch('/api/inventory').then(r => r.json()).then(d => { const l = d?.data || d; if (Array.isArray(l) && l.length) window.__ACTIVE_INVENTORY__ = l; }).catch(() => {});
  }, [inventory]);

  const handleFabricChange = (id, field, value, selectedInv) => {
    setFabricsList(prev => prev.map(fab => {
      if (fab.id !== id) return fab;
      const updated = { ...fab, [field]: value };
      if (field === 'name') {
        const invList = (Array.isArray(inventory) && inventory.length) ? inventory : (window.__ACTIVE_INVENTORY__ || []);
        const inv = selectedInv || invList.find(i => (i.item_name || i.name) === value);
        updated.inventory_id = inv?.id || inv?.item_code || ""; updated.inventory_code = inv?.item_code || inv?.code || inv?.id || "";
        updated.unit = inv?.unit || "متر"; updated.cost = inv ? parseFloat(inv.unit_cost ?? inv.cost_price ?? inv.cost ?? inv.cost_per_meter ?? 0) : 0;
        updated.available_qty = inv ? parseFloat(inv.available_qty ?? inv.quantity ?? 0) : 0; updated.currency = inv ? getCurrencyCode(inv.currency || 'YER') : activeModelCurrency;
      }
      return updated;
    }));
  };
  const handleFabricBracketChange = (id, sz, val) => setFabricsList(prev => prev.map(f => f.id === id ? { ...f, brackets: { ...(f.brackets || {}), [sz]: val } } : f));
  const addFabricRow = () => setFabricsList(prev => [...prev, u.createDefaultFabricRow ? u.createDefaultFabricRow(activeModelCurrency, targetSegment, prev.length + 1) : { id: prev.length + 1, inventory_id: "", name: "", unit: "متر", currency: activeModelCurrency, brackets: {}, cost: 0 }]);
  const removeFabricRow = (id) => { if (fabricsList.length > 1) setFabricsList(prev => prev.filter(f => f.id !== id)); };
  const handlePriceChange = (b, v) => setPricesMatrix(prev => ({ ...prev, [b]: v })); const updateAgeChart = (id, field, v) => setAgeChart(prev => prev.map(a => a.id === id ? { ...a, [field]: v } : a));
  const productionRoles = useMemo(() => (internalRoles || []).filter(r => r.is_production !== false), [internalRoles]);
  const costsPerBracket = useMemo(() => u.calculateCostsPerBracket ? u.calculateCostsPerBracket(fabricsList, targetSegment, activeModelCurrency) : {}, [fabricsList, targetSegment, activeModelCurrency, u]);
  const refSize = useMemo(() => (u.SEGMENTS?.[targetSegment] || u.SEGMENTS?.kids)?.referenceSize || '6-9Y', [targetSegment, u]);
  const computedTotalLabor = useMemo(() => {
    return parseFloat(cutterWage || 0) + parseFloat(tailorWage || 0) + parseFloat(embroidWage || 0) + parseFloat(finisherWage || 0);
  }, [cutterWage, tailorWage, embroidWage, finisherWage]);
  const computedFabricTotal = costsPerBracket[refSize] || Object.values(costsPerBracket)[0] || 0;
  const computedTotalCost = computedFabricTotal + computedTotalLabor + parseFloat(packagingCost || 0);
  const computedProfit = parseFloat(pricesMatrix[refSize] || Object.values(pricesMatrix)[0] || 0) - computedTotalCost;
  const handleApplyPresetMargin = (pct = 40) => {
    if (u.calculateSuggestedPrices) {
      setPricesMatrix(u.calculateSuggestedPrices(costsPerBracket, computedTotalLabor + parseFloat(packagingCost || 0), pct));
      if (showToast) showToast(`تم تطبيق أسعار مقترحة بهامش ربح +${pct}% ✨`);
    }
  };
  const handleOpenAddModal = async () => {
    setEditId(null); setModelName("");
    setSmartCode(u.generateSmartModelCode ? u.generateSmartModelCode('kids') : '');
    fetchNextSkuPreview('kids', '').then(s => { if (s) setSmartCode(s); });
    setTargetSegment("kids"); setCategory(""); setSubcategory(""); setCollection(""); setImageUrl(""); setDescription(""); setStatus("Active");
    setCutterWage(""); setTailorWage(""); setEmbroidWage(""); setFinisherWage(""); setPackagingCost(""); setStageWages({});
    setPricesMatrix({ '1-2Y': "", '3-5Y': "", '6-9Y': "", '10-13Y': "" }); setSelectedSizes(['1-2Y', '3-5Y', '6-9Y', '10-13Y']); setSelectedColors([]);
    setFabricsList([u.createDefaultFabricRow ? u.createDefaultFabricRow(activeModelCurrency, 'kids', 1) : { id: 1, inventory_id: "", name: "", unit: "متر", currency: activeModelCurrency, brackets: {}, cost: 0 }]);
    setAgeChart(u.DEFAULT_AGE_CHART ? JSON.parse(JSON.stringify(u.DEFAULT_AGE_CHART)) : []);
    setWomenSizeChart(u.DEFAULT_WOMEN_SIZE_CHART ? JSON.parse(JSON.stringify(u.DEFAULT_WOMEN_SIZE_CHART)) : []);
    setActiveTab("basic"); setModalOpen(true);
  };

  const handleEditProduct = async (rawP) => {
    try {
      let p = rawP || {};
      if (p.id) {
        try { const res = await fetch(`/api/products/get?id=${encodeURIComponent(p.id)}`).then(r => r.json()); if (res?.data) p = { ...p, ...res.data }; } catch (e) {}
      }
      const seg = p.target_segment || 'kids', targetRef = (u.SEGMENTS?.[seg] || u.SEGMENTS?.kids)?.referenceSize || '6-9Y';
      setEditId(p.id || null); setModelName(p.name || p.model_name || ""); setSmartCode(p.sku || p.barcode || p.model_no || (p.id ? `LP-${p.id}` : ''));
      setTargetSegment(seg); setCategory(p.category || ""); setSubcategory(p.subcategory || ""); setCollection(p.collection || "");
      setImageUrl(p.image_url || p.image || p.image_data || ""); setDescription(p.description || ""); setStatus(p.status || "Active");

      let rawBom = p.bom; if (typeof rawBom === 'string') { try { rawBom = JSON.parse(rawBom); } catch (e) { rawBom = {}; } }
      const bmMeta = (rawBom && typeof rawBom === 'object' && !Array.isArray(rawBom)) ? (rawBom.meta || {}) : {};
      const stgSrc = (p.stage_wages && typeof p.stage_wages === 'object' && Object.keys(p.stage_wages).length > 0)
        ? p.stage_wages : ((bmMeta.stage_wages && typeof bmMeta.stage_wages === 'object' && Object.keys(bmMeta.stage_wages).length > 0) ? bmMeta.stage_wages : p);
      const cw = stgSrc.cutter_wage ?? p.cutter_wage ?? "", tw = stgSrc.tailor_wage ?? p.tailor_wage ?? "";
      const ew = stgSrc.embroiderer_wage ?? p.embroiderer_wage ?? "", fw = stgSrc.finisher_wage ?? p.finisher_wage ?? "";
      const pw = stgSrc.packaging_cost ?? stgSrc.packager_wage ?? p.packaging_cost ?? p.cost_packaging ?? "";
      setCutterWage(cw); setTailorWage(tw); setEmbroidWage(ew); setFinisherWage(fw); setPackagingCost(pw);
      setStageWages({ cutter_wage: cw, tailor_wage: tw, embroiderer_wage: ew, finisher_wage: fw, packaging_cost: pw, packager_wage: pw });

      let loadedSizes = p.sizes || bmMeta.sizes;
      if (typeof loadedSizes === 'string') { try { loadedSizes = JSON.parse(loadedSizes); } catch (e) { loadedSizes = null; } }
      if (!Array.isArray(loadedSizes) || !loadedSizes.length) {
        let pmObj = p.price_matrix; if (typeof pmObj === 'string') { try { pmObj = JSON.parse(pmObj); } catch (e) {} }
        if (pmObj && typeof pmObj === 'object') loadedSizes = Object.keys(pmObj);
      }
      setSelectedSizes(Array.isArray(loadedSizes) && loadedSizes.length ? loadedSizes : (u.getSegmentSizes ? u.getSegmentSizes(seg) : ['1-2Y', '3-5Y', '6-9Y', '10-13Y']));
      let rCols = p.colors || p.approved_colors || bmMeta.colors || [];
      if (typeof rCols === 'string') { try { rCols = JSON.parse(rCols); } catch (e) { rCols = rCols.split(',').map(c => c.trim()).filter(Boolean); } }
      setSelectedColors((Array.isArray(rCols) ? rCols : []).map(c => typeof c === 'object' && c !== null ? (c.name || c.color || c.label || '') : String(c)).filter(Boolean));
      if (p.currency) setFormCurrency(getCurrencyCode(p.currency));
      if (u.normalizeProductForEdit) {
        const norm = u.normalizeProductForEdit(p, targetRef);
        setPricesMatrix(norm.pm || {});
        setFabricsList(norm.fabrics?.length ? norm.fabrics : [u.createDefaultFabricRow ? u.createDefaultFabricRow(activeModelCurrency, seg, 1) : { id: 1, inventory_id: "", name: "", unit: "متر", currency: activeModelCurrency, brackets: {}, cost: 0 }]);
      }
      let ac = p.age_chart; if (typeof ac === 'string') { try { ac = JSON.parse(ac); } catch (e) { ac = null; } }
      const hasAc = Array.isArray(ac) && ac.length > 0;
      if (seg === 'women_adults') setWomenSizeChart(hasAc ? ac : (u.DEFAULT_WOMEN_SIZE_CHART ? JSON.parse(JSON.stringify(u.DEFAULT_WOMEN_SIZE_CHART)) : []));
      else setAgeChart(hasAc ? ac : (u.DEFAULT_AGE_CHART ? JSON.parse(JSON.stringify(u.DEFAULT_AGE_CHART)) : []));
    } catch (err) {
      console.error("handleEditProduct error:", err);
      if (showToast) showToast("تم فتح النافذة مع تعذر قراءة بعض البيانات ⚠️", "warning");
    } finally {
      setActiveTab("basic");
      setModalOpen(true);
    }
  };

  const handleSaveProduct = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (isSaving) return;
    if (!modelName.trim()) return showToast ? showToast("اسم الموديل مطلوب ⚠️", "error") : null;
    setIsSaving(true);
    const resolvedChart = targetSegment === 'women_adults' ? womenSizeChart : ageChart;
    const payloadArgs = { editId, smartCode, modelName, targetSegment, category, subcategory, collection, imageUrl, description, status, fabricsList, refSize, computedFabricTotal, cutterWage, tailorWage, embroidWage, finisherWage, stageWages, computedTotalLabor, packagingCost, computedTotalCost, pricesMatrix, activeModelCurrencyLabel, computedProfit, calcDate, selectedSizes, selectedColors, ageChart: resolvedChart };
    const newP = u.buildProductPayload ? u.buildProductPayload(payloadArgs) : { id: editId || undefined, name: modelName };
    try {
      let savedProduct = newP;
      const method = editId ? 'PUT' : 'POST', endpoint = editId ? `/api/products/${encodeURIComponent(editId)}` : '/api/products';
      const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newP) }).then(r => r.json());
      if (res?.data) savedProduct = { ...newP, ...res.data };
      else if (res?.success || res?.status === 'success') savedProduct = { ...newP, ...res };
      else if (res?.error) throw new Error(res.error);
      if (editId) { if (setProducts) setProducts(prev => prev.map(p => p.id === editId ? savedProduct : p)); if (showToast) showToast("تم تحديث الموديل ومواصفات التشغيل بنجاح ☁️🧮"); }
      else { if (setProducts) setProducts(prev => [savedProduct, ...(prev || [])]); if (showToast) showToast("تم إضافة الموديل وحساب التكلفة بنجاح ☁️🧮"); }
      setModalOpen(false);
    } catch (err) {
      if (showToast) showToast(err.message || "حدث خطأ أثناء الحفظ ⚠️", "error");
    } finally { setIsSaving(false); }
  };
  const handleDeleteProduct = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف أو أرشفة هذا الموديل؟")) return;
    if (setProducts) setProducts(prev => prev.filter(p => p.id !== id));
    try { if (window.bomAPI?.deleteModel) await window.bomAPI.deleteModel(id); if (showToast) showToast("تم حذف/أرشفة الموديل بنجاح 🗑️"); }
    catch (e) { if (showToast) showToast("تم الحذف محلياً 🗑️"); }
  };

  return {
    modalOpen, setModalOpen, activeTab, setActiveTab, editId, isSaving, modelName, setModelName, smartCode, setSmartCode,
    generateNewSmartCode, targetSegment, setTargetSegment: handleTargetSegmentChange, category, setCategory, subcategory, setSubcategory,
    collection, setCollection, imageUrl, setImageUrl, description, setDescription, status, setStatus, formCurrency, setFormCurrency,
    calcDate, setCalcDate, selectedSizes, setSelectedSizes, toggleSize, selectedColors, setSelectedColors, toggleColor, fabricsList,
    setFabricsList, handleFabricChange, handleFabricBracketChange, addFabricRow, removeFabricRow, cutterWage, setCutterWage,
    tailorWage, setTailorWage, embroidWage, setEmbroidWage, finisherWage, setFinisherWage, packagingCost, setPackagingCost, stageWages,
    setStageWages, getStageWage, setStageWage, pricesMatrix, setPricesMatrix, handlePriceChange, ageChart, setAgeChart, updateAgeChart,
    womenSizeChart, setWomenSizeChart, updateWomenSizeChart, activeModelCurrency, activeModelCurrencyLabel, costsPerBracket,
    computedFabricTotal, computedTotalLabor, computedTotalCost, computedProfit, productionRoles, jobRoles: internalRoles,
    handleApplyPresetMargin, handleOpenAddModal, handleEditProduct, handleSaveProduct, handleDeleteProduct
  };
}

window.useProductActions = useProductActions;
