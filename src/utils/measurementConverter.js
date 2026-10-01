/**
 * measurementConverter.js - محرك تحويل القياسات واحتساب استهلاك أقمشة الباترون
 * Little Princesses ERP - Production & Tailoring Architecture
 */

const extractLengthValue = (spec = {}) => {
  if (!spec || typeof spec !== 'object') return 0;
  return parseFloat(
    spec.dress_len ?? spec.dress_length ?? spec.length ??
    spec['طول الفستان'] ?? spec.total_len ?? spec.dressLen ?? 0
  ) || 0;
};

const resolveDressLengthInches = (input) => {
  let val = 0;
  if (typeof input === 'number') val = input;
  else if (typeof input === 'string') val = parseFloat(input) || 0;
  else if (input && typeof input === 'object') val = extractLengthValue(input);
  if (val <= 0) return 26; // Default standard length for 6-9Y
  return val > 40 ? (val / 2.54) : val;
};

const resolveSizeCode = (input, targetSegment = 'kids') => {
  if (targetSegment === 'women_adults') return 'M';
  const inches = resolveDressLengthInches(input);
  if (inches <= 19) return '1-2Y';
  if (inches <= 24) return '3-5Y';
  if (inches <= 29) return '6-9Y';
  return '10-13Y';
};

const resolveUnitPrice = (product = {}, sizeCode = '6-9Y') => {
  if (window.OrderPricing?.resolveProductTierPrice) {
    return window.OrderPricing.resolveProductTierPrice(product, sizeCode);
  }
  const matrix = product?.price_matrix || product?.tier_pricing || {};
  const direct = matrix[sizeCode] ??
    matrix[String(sizeCode).replace(/\s+/g, '')] ??
    matrix[String(sizeCode).replace(/-/g, '')];
  if (direct !== undefined && direct !== null && direct !== '') return Number(direct) || 0;

  const tierMap = {
    '10-13Y': ['10-13Y', '10-13', '10-13 سنة', '10-13 سنوات', '10-12 سنة', '12-14 سنة', 'teen'],
    '6-9Y': ['6-9Y', '6-9', '6-9 سنوات', '6-7Y', '8-10 سنوات', 'junior', 'kids'],
    '3-5Y': ['3-5Y', '3-5', '3-5 سنوات', '4-5 سنوات', 'toddler_plus'],
    '1-2Y': ['1-2Y', '1-2', '1-2 سنة', '1-2 سنوات', 'toddler']
  };
  const aliases = tierMap[sizeCode] || [sizeCode];
  for (const alias of aliases) {
    if (matrix[alias] !== undefined && matrix[alias] !== null && matrix[alias] !== '') {
      return Number(matrix[alias]) || 0;
    }
  }

  const target = String(sizeCode).trim().toLowerCase();
  for (const [key, value] of Object.entries(matrix)) {
    const normalized = String(key).trim().toLowerCase().replace(/\s+/g, '');
    if (normalized === target || normalized.includes(target) || target.includes(normalized)) {
      return Number(value) || 0;
    }
  }
  return Number(product?.base_price ?? product?.sell_price ?? product?.price ?? 0);
};

const isTulleFabric = (name = '') => /(تل|تول|tulle|net|netting|شيفون|chiffon)/i.test(name);
const isTaffetaFabric = (name = '') => /(تفتة|تفتا|taffeta|حرير|silk|ساتان|satin|أساسي|main)/i.test(name);

const resolveCutUnit = (mat = {}, fabricInventory = []) => {
  const name = String(mat.fabric_name || mat.name || mat.material_name || '').trim();
  if (isTulleFabric(name)) return 'متر';

  const invMatch = (fabricInventory || []).find(fi =>
    (mat.fabric_id && String(fi.id || fi.item_code) === String(mat.fabric_id)) ||
    (name && (fi.name === name || fi.item_name === name))
  );
  const invUnit = String(invMatch?.unit || mat.unit || mat.cut_unit || mat.uom || '').trim();
  if (/(وار|yard|yd)/i.test(invUnit)) return 'وار';
  if (/(متر|meter|m)/i.test(invUnit)) return 'متر';
  return isTaffetaFabric(name) ? 'وار' : 'متر';
};

const calculateBomItem = (mat = {}, sizeCode = '6-9Y', lengthInInches = 26, orderQty = 1, fabricInventory = []) => {
  const cutUnit = resolveCutUnit(mat, fabricInventory);
  const fabricName = mat.fabric_name || mat.name || mat.material_name || 'قماش';

  const bucket = mat.consumption_by_size || mat.brackets || mat.materials_by_size || mat.usage || {};
  let val = parseFloat(
    bucket[sizeCode] ??
    bucket[String(sizeCode).replace(/\s+/g, '')] ??
    bucket[String(sizeCode).replace(/-/g, '')] ??
    mat.cut_meters ?? mat.meters ?? mat.yards ?? mat.qty ?? 0
  );

  if (!val || isNaN(val) || val <= 0) {
    const isTulle = isTulleFabric(fabricName);
    const multiplier = isTulle ? 2.8 : 2.2;
    const unitRatio = (cutUnit === 'وار' || mat.unit === 'وار') ? 1.0 : 0.9144;
    val = (lengthInInches * multiplier / 36) * unitRatio;
  }

  const qty = Math.max(1, Number(orderQty) || 1);
  const total = (val * qty).toFixed(2);
  const isYard = /(وار|yard|yd)/i.test(cutUnit);
  const totalMeters = isYard ? (parseFloat(total) / 1.0936).toFixed(2) : total;

  const invMatch = (fabricInventory || []).find(fi =>
    (mat.fabric_id && String(fi.id || fi.item_code) === String(mat.fabric_id)) ||
    (mat.inventory_id && String(fi.id || fi.item_code) === String(mat.inventory_id)) ||
    (fabricName && (fi.name === fabricName || fi.item_name === fabricName))
  );

  return {
    fabric_id: mat.fabric_id || mat.inventory_id || mat.id || invMatch?.id || '',
    fabric_name: fabricName,
    cut_meters: String(total),
    cut_unit: cutUnit,
    unit: cutUnit,
    meters: String(totalMeters),
    deduct_inventory: true
  };
};

const buildBomItems = (product = {}, sizeCode = '6-9Y', lengthInInches = 26, quantity = 1, fabricInventory = [], fallbackOrder = null) => {
  const getArray = (b) => {
    if (Array.isArray(b)) return b;
    if (b && typeof b === 'object' && Array.isArray(b.items)) return b.items;
    return [];
  };

  let rawBom = getArray(product?.bom);
  if (rawBom.length === 0) rawBom = getArray(product?.materials);

  if (rawBom.length === 0 && fallbackOrder) {
    rawBom = getArray(fallbackOrder.bom_items);
    if (rawBom.length === 0) rawBom = getArray(fallbackOrder.bom);
    if (rawBom.length === 0) rawBom = getArray(fallbackOrder.materials);
  }

  if (rawBom.length === 0) {
    const defaultName = product?.fabric_name || fallbackOrder?.fabric_name || 'تفتة تركي';
    rawBom = [{ fabric_name: defaultName, unit: 'وار' }];
  }

  return rawBom.map(mat => calculateBomItem(mat, sizeCode, lengthInInches, quantity, fabricInventory));
};

const MeasurementConverter = {
  extractLengthValue,
  resolveDressLengthInches,
  resolveSizeCode,
  resolveUnitPrice,
  isTulleFabric,
  isTaffetaFabric,
  resolveCutUnit,
  calculateBomItem,
  buildBomItems
};

if (typeof window !== 'undefined') {
  window.MeasurementConverter = MeasurementConverter;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MeasurementConverter;
}
