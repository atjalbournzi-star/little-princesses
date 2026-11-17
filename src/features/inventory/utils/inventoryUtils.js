// src/features/inventory/utils/inventoryUtils.js
// دوال نقية مساعدة وثوابت معيارية لمنظومة المخزون والمستودعات

const WAREHOUSES = [];
const WAREHOUSE_LOCATIONS = [];

const INVENTORY_CATEGORIES = [
  'أقمشة',
  'بطانات',
  'كلف وتطريز',
  'إكسسوارات',
  'فساتين جاهزة',
  'مستلزمات خياطة'
];

async function refreshWarehouses() {
  try {
    const res = await fetch('/api/warehouses').then(r => r.json());
    if (res?.success && Array.isArray(res.data)) {
      WAREHOUSES.length = 0;
      WAREHOUSE_LOCATIONS.length = 0;
      res.data.forEach(w => {
        if (w.is_active !== false) {
          WAREHOUSES.push({ id: w.id, code: w.code, name: w.name, location: w.location });
          if (w.name) WAREHOUSE_LOCATIONS.push(w.name);
        }
      });
    }
  } catch (e) { /* silent fallback */ }
  return WAREHOUSES;
}

if (typeof window !== 'undefined') {
  refreshWarehouses();
}

function getWarehouseName(whId) {
  if (!whId) return '';
  const live = WAREHOUSES.find(w => w.id === whId || w.code === whId);
  return live ? live.name : whId;
}

function getItemWarehouseStock(item, whId) {
  if (!item) return 0;
  if (item.warehouse_stocks && item.warehouse_stocks[whId] !== undefined) {
    return parseFloat(item.warehouse_stocks[whId]) || 0;
  }
  if (!whId || whId === 'الكل' || whId === 'ALL') {
    return getItemQty(item);
  }
  const normLoc = String(item.location || '').trim();
  const whName = getWarehouseName(whId);
  if (normLoc === whId || normLoc === whName) {
    return getItemQty(item);
  }
  return 0;
}

function getItemName(item) {
  if (!item) return '';
  return item.item_name || item.name || item.fabric_name || '';
}

function getItemQty(item) {
  if (!item) return 0;
  const val = item.qty ?? item.quantity ?? item.quantity_meters ?? item.available_qty ?? 0;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
}

function getItemCost(item) {
  if (!item) return 0;
  const val = item.cost_per_meter ?? item.cost_per_unit ?? item.unit_cost ?? item.cost ?? 0;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
}

function getItemTotalValue(item) {
  if (!item) return 0;
  return getItemQty(item) * getItemCost(item);
}

function normalizeUom(unitStr) {
  if (!unitStr) return 'متر';
  const u = String(unitStr).trim().toLowerCase();
  if (u.includes('وار') || u.includes('يارد') || ['yd', 'yard', 'yards'].includes(u)) return 'وار';
  if (u.includes('إنش') || u.includes('انش') || u.includes('بوص') || ['in', 'inch', 'inches', '"'].includes(u)) return 'إنش';
  if (u.includes('سم') || u.includes('سنتيمتر') || u === 'cm') return 'سم';
  if (u.includes('رول') || u.includes('طاق') || ['roll', 'bolt'].includes(u)) return 'رول';
  if (u.includes('حب') || u.includes('قطع') || ['pc', 'piece', 'pieces'].includes(u)) return 'قطعة';
  if (u.includes('متر') || ['m', 'meter', 'meters'].includes(u)) return 'متر';
  return u;
}

function convertUomToMeters(qty, fromUnit) {
  const val = parseFloat(qty) || 0;
  if (!val) return 0;
  const f = normalizeUom(fromUnit);
  if (f === 'متر') return val;
  if (f === 'وار') return val * 0.9144;
  if (f === 'سم') return val * 0.01;
  if (f === 'إنش') return val * 0.0254;
  if (f === 'رول') return val * 25.0 * 0.9144;
  if (f === 'قطعة') return 0;
  return val;
}

function getItemReorderLevel(item) {
  if (!item) return 5;
  const level = parseFloat(item.reorder_level || item.min_stock || item.reorder_point);
  return !isNaN(level) && level > 0 ? level : 5;
}

function isItemOutOfStock(item) {
  return getItemQty(item) <= 0;
}

function isItemLowStock(item) {
  const qty = getItemQty(item);
  const reorder = getItemReorderLevel(item);
  return qty > 0 && qty <= reorder;
}

function getItemUnit(item) {
  if (item && item.unit) return item.unit;
  const cat = (item && item.category) || '';
  if (cat.includes('فساتين') || (item && item.item_type === 'product')) return 'قطعة';
  return 'متر';
}

function isReadyDressItem(item) {
  if (!item) return false;
  const cat = String(item.category || '').toLowerCase();
  const type = String(item.item_type || item.type || '').toLowerCase();
  return cat.includes('فساتين') || cat.includes('جاهز') || type.includes('product') || type.includes('dress');
}

function getInitialInventoryForm(currency) {
  return {
    item_name: '',
    category: 'أقمشة',
    qty: '',
    cost: '',
    total_value: '',
    currency: currency?.code || 'YER',
    supply_date: new Date().toISOString().split('T')[0],
    location: '',
    warehouse_id: '',
    reorder_level: 5
  };
}

const inventoryUtils = {
  WAREHOUSES,
  WAREHOUSE_LOCATIONS,
  INVENTORY_CATEGORIES,
  refreshWarehouses,
  getWarehouseName,
  getItemWarehouseStock,
  getItemName,
  getItemQty,
  getItemCost,
  getItemTotalValue,
  getItemReorderLevel,
  isItemOutOfStock,
  isItemLowStock,
  getItemUnit,
  isReadyDressItem,
  getInitialInventoryForm,
  normalizeUom,
  convertUomToMeters
};

window.inventoryUtils = inventoryUtils;
if (typeof module !== 'undefined' && module.exports) module.exports = inventoryUtils;
