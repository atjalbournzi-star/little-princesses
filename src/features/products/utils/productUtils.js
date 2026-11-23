// src/features/products/utils/productUtils.js
// أدوات مساعدة ومعادلات تسعير واستيراد الأقمشة لكتالوج المنتجات والموديلات

const SEGMENTS = {
  kids: { id: 'kids', label: 'أطفال (Kids)', icon: '👧', sizes: ['1-2Y', '3-5Y', '6-9Y', '10-13Y'], sizeLabels: { '1-2Y': '1-2 سنة', '3-5Y': '3-5 سنوات', '6-9Y': '6-9 سنوات', '10-13Y': '10-13 سنة' }, defaultMeters: { '1-2Y': '', '3-5Y': '', '6-9Y': '', '10-13Y': '' }, referenceSize: '6-9Y' },
  women_adults: { id: 'women_adults', label: 'نسائي وكبار (Adults)', icon: '👗', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], sizeLabels: { 'XS': 'XS (34)', 'S': 'S (36)', 'M': 'M (38)', 'L': 'L (40)', 'XL': 'XL (42)', 'XXL': 'XXL (44)' }, defaultMeters: { 'XS': '', 'S': '', 'M': '', 'L': '', 'XL': '', 'XXL': '' }, referenceSize: 'M' },
  custom_free: { id: 'custom_free', label: 'تفصيل ومقاس حر (Custom)', icon: '✂️', sizes: ['تفصيل حر'], sizeLabels: { 'تفصيل حر': 'مقاس حر / تفصيل حر' }, defaultMeters: { 'تفصيل حر': '' }, referenceSize: 'تفصيل حر' }
};

const DEFAULT_AGE_CHART = [
  { id: 1, size: '1-2Y', age: '1-2 سنة', chest: 50.8, waist: 48.3, length: 55.9, min: '', max: 55.9 },
  { id: 2, size: '3-5Y', age: '3-5 سنوات', chest: 61.0, waist: 55.9, length: 68.6, min: '', max: 68.6 },
  { id: 3, size: '6-9Y', age: '6-9 سنوات', chest: 81.3, waist: 66.0, length: 83.8, min: '', max: 83.8 },
  { id: 4, size: '10-13Y', age: '10-13 سنة', chest: 86.4, waist: 71.1, length: 101.6, min: '', max: 101.6 }
];
const DEFAULT_WOMEN_SIZE_CHART = [
  { id: 1, size: 'XS', label: 'XS (34)', chest: 82.0, waist: 64.0, length: 135.0 },
  { id: 2, size: 'S', label: 'S (36)', chest: 88.0, waist: 70.0, length: 138.0 },
  { id: 3, size: 'M', label: 'M (38)', chest: 94.0, waist: 76.0, length: 140.0 },
  { id: 4, size: 'L', label: 'L (40)', chest: 102.0, waist: 84.0, length: 142.0 },
  { id: 5, size: 'XL', label: 'XL (42)', chest: 110.0, waist: 92.0, length: 145.0 },
  { id: 6, size: 'XXL', label: 'XXL (44)', chest: 118.0, waist: 100.0, length: 145.0 }
];

const DEFAULT_BRACKETS = ['1-2Y', '3-5Y', '6-9Y', '10-13Y'];
const DEFAULT_SIZES = ['1-2 سنة', '3-5 سنوات', '6-9 سنوات', '10-13 سنة', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
const DEFAULT_COLORS = [];

const generateSmartModelCode = (segment = 'kids', seq = null) => {
  const pfx = segment === 'women_adults' ? 'WMN' : (segment === 'custom_free' ? 'CST' : 'KID');
  if (seq) {
    const sStr = String(seq);
    return sStr.includes('LP-') ? sStr : `LP-${pfx}-${sStr.padStart(4, '0')}`;
  }
  return `LP-${pfx}-0001`;
};

const getCurrencyCode = (c) => {
  if (!c) return 'YER';
  if (typeof c === 'object') return c.code || 'YER';
  const s = String(c).toUpperCase();
  if (s.includes('SAR') || s.includes('سعودي')) return 'SAR';
  if (s.includes('USD') || s.includes('$') || s.includes('دولار')) return 'USD';
  return 'YER';
};

const getCurrencyLabel = (c) => getCurrencyCode(c);

const getFabricCostInModelCurrency = (f, activeModelCurrency) => {
  const rawCost = parseFloat(f.cost || 0);
  const fCurr = getCurrencyCode(f.currency || 'YER');
  if (!window.CurrencyService || fCurr === activeModelCurrency) return rawCost;
  return window.CurrencyService.convert(rawCost, fCurr, activeModelCurrency);
};

const getSegmentSizes = (segment = 'kids') => (SEGMENTS[segment] || SEGMENTS.kids).sizes;

const createDefaultFabricRow = (currency = 'YER', segment = 'kids', tempId = 1) => {
  const seg = SEGMENTS[segment] || SEGMENTS.kids;
  const brackets = {};
  seg.sizes.forEach(sz => { brackets[sz] = ""; });
  return { id: tempId, inventory_id: "", name: "", unit: "متر", currency, brackets, cost: 0 };
};

const calculateCostsPerBracket = (fabricsList = [], segment = 'kids', activeModelCurrency = 'YER') => {
  const seg = SEGMENTS[segment] || SEGMENTS.kids;
  const result = {};
  seg.sizes.forEach(sz => {
    result[sz] = fabricsList.reduce((acc, f) => {
      const br = f.brackets || {};
      const meters = parseFloat(br[sz] ?? (sz === '6-9Y' ? br['6-9 سنوات'] : 0) ?? f.meters ?? 0) || 0;
      const unitCost = getFabricCostInModelCurrency(f, activeModelCurrency);
      return acc + (meters * unitCost);
    }, 0);
  });
  if (segment === 'kids') {
    result['1-2 سنة'] = result['1-2Y']; result['3-5 سنوات'] = result['3-5Y'];
    result['6-9 سنوات'] = result['6-9Y']; result['10-13 سنة'] = result['10-13Y'];
  }
  return result;
};

const buildBomArray = (fabricsList = []) => fabricsList.map(f => ({
  inventory_id: f.inventory_id || null,
  fabric_name: f.name || '',
  unit: f.unit || 'متر',
  unit_cost: parseFloat(f.cost || 0),
  currency: getCurrencyCode(f.currency || 'YER'),
  brackets: { ...(f.brackets || {}) }
}));

const calculateLaborCost = (cutter = 0, tailor = 0, embroid = 0, finisher = 0) => parseFloat(cutter || 0) + parseFloat(tailor || 0) + parseFloat(embroid || 0) + parseFloat(finisher || 0);
const calculateTotalModelCost = (fabricCost = 0, laborCost = 0, packagingCost = 0) => parseFloat(fabricCost || 0) + parseFloat(laborCost || 0) + parseFloat(packagingCost || 0);

const calculateProfitAndMargin = (sellPrice = 0, totalCost = 0) => {
  const sp = parseFloat(sellPrice || 0), tc = parseFloat(totalCost || 0);
  const profit = sp - tc;
  const marginPct = sp > 0 ? (profit / sp) * 100 : 0;
  return { profit: Math.round(profit * 100) / 100, marginPct: Math.round(marginPct * 100) / 100 };
};

const calculateSuggestedPrices = (costsPerSize = {}, additionalCosts = 0, targetMarginPct = 40) => {
  const result = {};
  const marginFactor = Math.max(0.01, 1 - (targetMarginPct / 100));
  Object.keys(costsPerSize).forEach(sz => {
    const totalCost = (costsPerSize[sz] || 0) + parseFloat(additionalCosts || 0);
    result[sz] = Math.ceil(totalCost / marginFactor);
  });
  return result;
};

const normalizeProductForEdit = (rawP, refSize = '6-9Y') => {
  try {
    const p = rawP || {};
    let pm = p.price_matrix;
    if (typeof pm === 'string') { try { pm = JSON.parse(pm); } catch (e) { pm = {}; } }
    pm = (pm && typeof pm === 'object') ? { ...pm } : {};
    if (pm['6-9 سنوات'] && !pm['6-9Y']) pm['6-9Y'] = pm['6-9 سنوات'];
    if (pm['1-2 سنة'] && !pm['1-2Y']) pm['1-2Y'] = pm['1-2 سنة'];
    if (pm['3-5 سنوات'] && !pm['3-5Y']) pm['3-5Y'] = pm['3-5 سنوات'];
    if (pm['10-13 سنة'] && !pm['10-13Y']) pm['10-13Y'] = pm['10-13 سنة'];

    let rawBom = p.bom;
    if (typeof rawBom === 'string') { try { rawBom = JSON.parse(rawBom); } catch (e) { rawBom = {}; } }
    const bomList = (rawBom && typeof rawBom === 'object' && !Array.isArray(rawBom))
      ? (rawBom.items || []) : (Array.isArray(rawBom) ? rawBom : (p.bom_items || []));

    const fabrics = (Array.isArray(bomList) ? bomList : []).map((b, i) => {
      let br = b.brackets;
      if (typeof br === 'string') { try { br = JSON.parse(br); } catch (e) { br = {}; } }
      br = (br && typeof br === 'object') ? { ...br } : {};
      if (br['6-9 سنوات'] && !br['6-9Y']) br['6-9Y'] = br['6-9 سنوات'];
      if (br['1-2 سنة'] && !br['1-2Y']) br['1-2Y'] = br['1-2 سنة'];
      if (br['3-5 سنوات'] && !br['3-5Y']) br['3-5Y'] = br['3-5 سنوات'];
      if (br['10-13 سنة'] && !br['10-13Y']) br['10-13Y'] = br['10-13 سنة'];
      if (Object.keys(br).length === 0 && (b.meters || b.yards || b.quantity || b.qty)) {
        br[refSize] = (b.meters || b.yards || b.quantity || b.qty).toString();
      }
      return {
        id: i + 1, inventory_id: b.inventory_id || "", name: b.fabric_name || b.name || "", unit: b.unit || "متر",
        cost: parseFloat(b.unit_cost ?? b.cost ?? 0) || 0, currency: getCurrencyCode(b.currency || p.currency || 'YER'), brackets: br
      };
    });
    const fallbackPrice = (p.sell_price || p.base_price || p.price || 0).toString();
    return { pm: Object.keys(pm).length ? pm : { [refSize]: fallbackPrice }, fabrics };
  } catch (err) {
    console.error("normalizeProductForEdit error:", err);
    return { pm: { [refSize]: ((rawP?.sell_price || rawP?.base_price || rawP?.price) || 0).toString() }, fabrics: [] };
  }
};

const buildProductPayload = (d) => {
  const smartVal = (d.smartCode || '').trim();
  const validFabrics = (d.fabricsList || []).filter(f => f && (f.name || f.inventory_id));
  const fabricNames = validFabrics.map(f => {
    const qty = f.brackets?.[d.refSize];
    return qty ? `${f.name} (${qty} ${f.unit || ''})` : (f.name || '');
  }).filter(Boolean).join(" + ");
  const totalMeters = validFabrics.reduce((acc, f) => acc + (parseFloat(f.brackets?.[d.refSize]) || 0), 0);
  const pName = (d.modelName || '').trim();
  const subcat = (d.subcategory || '').trim();
  const coll = (d.collection || '').trim() || null;
  const desc = (d.description || '').trim();

  return {
    id: d.editId || undefined, sku: smartVal || undefined, model_no: smartVal || undefined, design_code: smartVal || undefined, barcode: smartVal || undefined,
    name: pName, model_name: pName, target_segment: d.targetSegment || 'kids',
    category: d.category || '', subcategory: subcat, collection: coll,
    image_url: d.imageUrl || '', image: null, image_data: null, description: desc, min_stock: 2, status: d.status || 'Active',
    fabric_name: fabricNames, yards_used: totalMeters, fabric_cost: parseFloat(d.computedFabricTotal || 0),
    cutter_wage: parseFloat(d.cutterWage || 0), tailor_wage: parseFloat(d.tailorWage || 0),
    embroiderer_wage: parseFloat(d.embroidWage || 0), finisher_wage: parseFloat(d.finisherWage || 0),
    labor_cost: parseFloat(d.computedTotalLabor || 0), packaging_cost: parseFloat(d.packagingCost || 0),
    total_cost: parseFloat(d.computedTotalCost || 0), cost_price: parseFloat(d.computedTotalCost || 0),
    sell_price: parseFloat(d.pricesMatrix?.[d.refSize] || Object.values(d.pricesMatrix || {})[0] || 0),
    base_price: parseFloat(d.pricesMatrix?.[d.refSize] || Object.values(d.pricesMatrix || {})[0] || 0),
    price_matrix: d.pricesMatrix || {}, currency: d.activeModelCurrencyLabel || 'YER', profit: parseFloat(d.computedProfit || 0),
    calc_date: d.calcDate, sizes: d.selectedSizes || [], colors: d.selectedColors || [], approved_colors: null,
    bom: {
      items: buildBomArray(validFabrics),
      meta: {
        sizes: d.selectedSizes || (d.pricesMatrix ? Object.keys(d.pricesMatrix) : []),
        colors: d.selectedColors || [], barcode: smartVal, target_segment: d.targetSegment,
        cutter_wage: parseFloat(d.cutterWage || 0), tailor_wage: parseFloat(d.tailorWage || 0),
        embroiderer_wage: parseFloat(d.embroidWage || 0), finisher_wage: parseFloat(d.finisherWage || 0),
        packaging_cost: parseFloat(d.packagingCost || 0),
        stage_wages: d.stageWages || {}
      }
    },
    stage_wages: d.stageWages || {},
    age_chart: d.ageChart || []
  };
};

window.productUtils = {
  SEGMENTS, DEFAULT_AGE_CHART, DEFAULT_WOMEN_SIZE_CHART, DEFAULT_BRACKETS, DEFAULT_SIZES, DEFAULT_COLORS,
  generateSmartModelCode, getCurrencyCode, getCurrencyLabel, getSegmentSizes, getFabricCostInModelCurrency,
  calculateCostsPerBracket, createDefaultFabricRow, buildBomArray, calculateLaborCost,
  calculateTotalModelCost, calculateProfitAndMargin, calculateSuggestedPrices, normalizeProductForEdit, buildProductPayload
};
