// src/features/products/utils/productUtils.js
// أدوات مساعدة ومعادلات تسعير واستيراد الأقمشة لكتالوج المنتجات والموديلات

const SEGMENTS = {
  kids: {
    id: 'kids',
    label: 'أطفال (Kids)',
    icon: '👧',
    sizes: ['1-2Y', '3-5Y', '6-9Y', '10-13Y'],
    sizeLabels: { '1-2Y': '1-2 سنة', '3-5Y': '3-5 سنوات', '6-9Y': '6-9 سنوات', '10-13Y': '10-13 سنة' },
    defaultMeters: { '1-2Y': 1.0, '3-5Y': 1.5, '6-9Y': 2.0, '10-13Y': 2.5 },
    referenceSize: '6-9Y'
  },
  women_adults: {
    id: 'women_adults',
    label: 'نسائي وكبار (Adults)',
    icon: '👗',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    sizeLabels: { 'XS': 'XS (34)', 'S': 'S (36)', 'M': 'M (38)', 'L': 'L (40)', 'XL': 'XL (42)', 'XXL': 'XXL (44)' },
    defaultMeters: { 'XS': 2.5, 'S': 3.0, 'M': 3.5, 'L': 4.0, 'XL': 4.5, 'XXL': 5.0 },
    referenceSize: 'M'
  },
  custom_free: {
    id: 'custom_free',
    label: 'تفصيل ومقاس حر (Custom)',
    icon: '✂️',
    sizes: ['تفصيل حر'],
    sizeLabels: { 'تفصيل حر': 'مقاس حر / تفصيل حر' },
    defaultMeters: { 'تفصيل حر': 3.0 },
    referenceSize: 'تفصيل حر'
  }
};

const DEFAULT_AGE_CHART = [
  { id: 1, age: '1-2 سنوات', min: '45', max: '55' },
  { id: 2, age: '2-3 سنوات', min: '55', max: '65' },
  { id: 3, age: '4-5 سنوات', min: '65', max: '75' },
  { id: 4, age: '6-7 سنوات', min: '75', max: '85' },
  { id: 5, age: '8-10 سنوات', min: '85', max: '100' },
  { id: 6, age: '10-12 سنة', min: '100', max: '115' },
  { id: 7, age: '12-14 سنة', min: '115', max: '130' }
];

const DEFAULT_WOMEN_SIZE_CHART = [
  { id: 1, size: 'XS', label: 'XS (34)', chest: 82, waist: 64, length: 135 },
  { id: 2, size: 'S', label: 'S (36)', chest: 88, waist: 70, length: 138 },
  { id: 3, size: 'M', label: 'M (38)', chest: 94, waist: 76, length: 140 },
  { id: 4, size: 'L', label: 'L (40)', chest: 102, waist: 84, length: 142 },
  { id: 5, size: 'XL', label: 'XL (42)', chest: 110, waist: 92, length: 145 },
  { id: 6, size: 'XXL', label: 'XXL (44)', chest: 118, waist: 100, length: 145 }
];

const DEFAULT_BRACKETS = ['1-2Y', '3-5Y', '6-9Y', '10-13Y'];
const DEFAULT_SIZES = ['1-2 سنة', '3-5 سنوات', '6-9 سنوات', '10-13 سنة', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
const DEFAULT_COLORS = ['أبيض ملكي', 'وردي فاتح', 'سكري / أوف وايت', 'موف أميرات', 'ذهبي شامبين', 'أحمر قرمزي', 'أزرق سماوي', 'تركواز ناعم'];

const generateSmartModelCode = (segment = 'kids') => {
  const pfx = segment === 'women_adults' ? 'WMN' : (segment === 'custom_free' ? 'CST' : 'KID');
  const num = Math.floor(1000 + Math.random() * 9000);
  return `LP-${pfx}-${num}`;
};

const getCurrencyCode = (c) => {
  if (!c) return 'YER';
  if (typeof c === 'object') return c.code || 'YER';
  const s = String(c).toUpperCase();
  if (s.includes('SAR') || s.includes('سعودي')) return 'SAR';
  if (s.includes('USD') || s.includes('$') || s.includes('دولار')) return 'USD';
  return 'YER';
};

const getCurrencyLabel = (c) => {
  const code = getCurrencyCode(c);
  return code === 'SAR' ? 'SAR ﷼' : (code === 'USD' ? 'USD $' : 'YER ﷼');
};

const getFabricCostInModelCurrency = (f, activeModelCurrency) => {
  const rawCost = parseFloat(f.cost || 0);
  const fCurr = getCurrencyCode(f.currency || 'YER');
  if (!window.CurrencyService || fCurr === activeModelCurrency) return rawCost;
  return window.CurrencyService.convert(rawCost, fCurr, activeModelCurrency);
};

const getSegmentSizes = (segment = 'kids') => (SEGMENTS[segment] || SEGMENTS.kids).sizes;

const createDefaultFabricRow = (currency = 'YER', segment = 'kids') => {
  const seg = SEGMENTS[segment] || SEGMENTS.kids;
  const brackets = {};
  seg.sizes.forEach(sz => { brackets[sz] = seg.defaultMeters[sz] || 2.0; });
  return { id: Date.now(), inventory_id: "", name: "", unit: "متر", currency, brackets, cost: 0 };
};

const calculateCostsPerBracket = (fabricsList = [], segment = 'kids', activeModelCurrency = 'YER') => {
  const seg = SEGMENTS[segment] || SEGMENTS.kids;
  const result = {};
  seg.sizes.forEach(sz => {
    result[sz] = fabricsList.reduce((acc, f) => {
      const br = f.brackets || {};
      const meters = parseFloat(br[sz] ?? (sz === '6-9Y' ? br['6-9 سنوات'] : 0) ?? f.meters ?? 0);
      const unitCost = getFabricCostInModelCurrency(f, activeModelCurrency);
      return acc + (meters * unitCost);
    }, 0);
  });
  if (segment === 'kids') {
    result['1-2 سنة'] = result['1-2Y'];
    result['3-5 سنوات'] = result['3-5Y'];
    result['6-9 سنوات'] = result['6-9Y'];
    result['10-13 سنة'] = result['10-13Y'];
  }
  return result;
};

const buildBomArray = (fabricsList = []) => fabricsList.map(f => ({
  inventory_id: f.inventory_id || null,
  fabric_name: f.name || 'قماش',
  unit: f.unit || 'متر',
  unit_cost: parseFloat(f.cost || 0),
  currency: getCurrencyCode(f.currency || 'YER'),
  brackets: { ...(f.brackets || {}) }
}));

const calculateLaborCost = (cutter = 0, tailor = 0, embroid = 0, finisher = 0) =>
  parseFloat(cutter || 0) + parseFloat(tailor || 0) + parseFloat(embroid || 0) + parseFloat(finisher || 0);

const calculateTotalModelCost = (fabricCost = 0, laborCost = 0, packagingCost = 0) =>
  parseFloat(fabricCost || 0) + parseFloat(laborCost || 0) + parseFloat(packagingCost || 0);

const calculateProfitAndMargin = (sellPrice = 0, totalCost = 0) => {
  const sp = parseFloat(sellPrice || 0), tc = parseFloat(totalCost || 0);
  const profit = sp - tc;
  const marginPct = sp > 0 ? (profit / sp) * 100 : 0;
  return { profit: Math.round(profit * 100) / 100, marginPct: Math.round(marginPct * 10) / 10 };
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

const normalizeProductForEdit = (p, refSize = '6-9Y') => {
  const pm = { ...(p.price_matrix || {}) };
  if (pm['6-9 سنوات'] && !pm['6-9Y']) pm['6-9Y'] = pm['6-9 سنوات'];
  if (pm['1-2 سنة'] && !pm['1-2Y']) pm['1-2Y'] = pm['1-2 سنة'];
  if (pm['3-5 سنوات'] && !pm['3-5Y']) pm['3-5Y'] = pm['3-5 سنوات'];
  if (pm['10-13 سنة'] && !pm['10-13Y']) pm['10-13Y'] = pm['10-13 سنة'];

  const fabrics = (p.bom || []).map((b, i) => {
    const br = { ...(b.brackets || {}) };
    if (br['6-9 سنوات'] && !br['6-9Y']) br['6-9Y'] = br['6-9 سنوات'];
    if (br['1-2 سنة'] && !br['1-2Y']) br['1-2Y'] = br['1-2 سنة'];
    if (br['3-5 سنوات'] && !br['3-5Y']) br['3-5Y'] = br['3-5 سنوات'];
    if (br['10-13 سنة'] && !br['10-13Y']) br['10-13Y'] = br['10-13 سنة'];
    return {
      id: Date.now() + i, inventory_id: b.inventory_id || "", name: b.fabric_name || b.name || "", unit: b.unit || "متر",
      cost: b.unit_cost ?? b.cost ?? 0, currency: getCurrencyCode(b.currency || 'YER'), brackets: br
    };
  });
  return { pm: Object.keys(pm).length ? pm : { [refSize]: (p.sell_price || 0).toString() }, fabrics };
};

const buildProductPayload = (d) => {
  const smartVal = (d.smartCode || '').trim() || `LP-${Date.now().toString().slice(-6)}`;
  const fabricNames = (d.fabricsList || []).map(f => `${f.name || 'قماش'} (${f.brackets?.[d.refSize] || 2}م)`).join(" + ");
  const totalMeters = (d.fabricsList || []).reduce((acc, f) => acc + parseFloat(f.brackets?.[d.refSize] || 0), 0);
  return {
    id: d.editId || Date.now(), sku: smartVal, model_no: smartVal, design_code: smartVal, barcode: smartVal,
    name: d.modelName.trim(), model_name: d.modelName.trim(), target_segment: d.targetSegment,
    category: d.category, subcategory: d.subcategory.trim(), collection: d.collection.trim() || null,
    image_url: d.imageUrl, description: d.description.trim(), min_stock: 2, status: d.status,
    fabric_name: fabricNames, yards_used: totalMeters, fabric_cost: d.computedFabricTotal,
    cutter_wage: parseFloat(d.cutterWage || 0), tailor_wage: parseFloat(d.tailorWage || 0),
    embroiderer_wage: parseFloat(d.embroidWage || 0), finisher_wage: parseFloat(d.finisherWage || 0),
    labor_cost: d.computedTotalLabor, packaging_cost: parseFloat(d.packagingCost || 0),
    total_cost: d.computedTotalCost, cost_price: d.computedTotalCost,
    sell_price: parseFloat(d.pricesMatrix[d.refSize] || Object.values(d.pricesMatrix)[0] || 0),
    base_price: parseFloat(d.pricesMatrix[d.refSize] || Object.values(d.pricesMatrix)[0] || 0),
    price_matrix: d.pricesMatrix, currency: d.activeModelCurrencyLabel, profit: d.computedProfit,
    calc_date: d.calcDate, sizes: d.selectedSizes, colors: d.selectedColors,
    bom: buildBomArray(d.fabricsList, d.targetSegment), age_chart: d.ageChart
  };
};

window.productUtils = {
  SEGMENTS,
  DEFAULT_AGE_CHART,
  DEFAULT_WOMEN_SIZE_CHART,
  DEFAULT_BRACKETS,
  DEFAULT_SIZES,
  DEFAULT_COLORS,
  generateSmartModelCode,
  getCurrencyCode,
  getCurrencyLabel,
  getSegmentSizes,
  getFabricCostInModelCurrency,
  calculateCostsPerBracket,
  createDefaultFabricRow,
  buildBomArray,
  calculateLaborCost,
  calculateTotalModelCost,
  calculateProfitAndMargin,
  calculateSuggestedPrices,
  normalizeProductForEdit,
  buildProductPayload
};
