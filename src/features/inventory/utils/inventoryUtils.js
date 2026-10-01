// src/features/inventory/utils/inventoryUtils.js
// دوال نقية مساعدة وثوابت معيارية لمنظومة المخزون والمستودعات

const WAREHOUSES = [
  { id: 'WH-MAIN', code: 'WH-MAIN', name: 'المستودع الرئيسي' },
  { id: 'WH-WORKSHOP', code: 'WH-WORKSHOP', name: 'معمل وورشة الخياطة' },
  { id: 'WH-SHOWROOM', code: 'WH-SHOWROOM', name: 'معرض وصالة التسليم' }
];

const WAREHOUSE_LOCATIONS = [
  'المستودع الرئيسي',
  'معمل وورشة الخياطة',
  'معرض وصالة التسليم'
];

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
      res.data.forEach(w => WAREHOUSES.push({ id: w.id, code: w.code, name: w.name, location: w.location }));
    }
  } catch (e) { /* silent fallback */ }
}

function getWarehouseName(whId) {
  const live = WAREHOUSES.find(w => w.id === whId || w.code === whId);
  if (live) return live.name;
  const map = {
    'WH-MAIN': 'المستودع الرئيسي',
    'WH-WORKSHOP': 'معمل وورشة الخياطة',
    'WH-SHOWROOM': 'معرض وصالة التسليم'
  };
  return map[whId] || whId || 'المستودع الرئيسي';
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
  const rawTot = parseFloat(item.total_value);
  if (!isNaN(rawTot) && rawTot > 0) return rawTot;
  return getItemQty(item) * getItemCost(item);
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
    location: 'المستودع الرئيسي',
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
  getInitialInventoryForm
};

window.inventoryUtils = inventoryUtils;
if (typeof module !== 'undefined' && module.exports) module.exports = inventoryUtils;
