// src/features/inventory/hooks/useInventoryData.js
// خطاف إدارة بيانات المخزون والمستودعات والعملات والمؤشرات الإحصائية

const { useState, useEffect, useMemo, useCallback } = React;

function useInventoryData({ inventory = [], setInventory, purchases = [], showToast, currency }) {
  const u = window.inventoryUtils || {};
  const getItemName = u.getItemName || (i => i?.item_name || i?.name || '');
  const getItemQty = u.getItemQty || (i => parseFloat(i?.qty || i?.quantity || 0) || 0);
  const getItemCost = u.getItemCost || (i => parseFloat(i?.unit_cost || i?.cost || 0) || 0);
  const isReadyDress = u.isReadyDressItem || (() => false);
  const isLowStock = u.isItemLowStock || (() => false);
  const isOutOfStock = u.isItemOutOfStock || (() => false);

  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'ready_dresses' | 'purchases' | 'movements'
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [warehouseFilter, setWarehouseFilter] = useState('الكل');
  const [stockAlertFilter, setStockAlertFilter] = useState('all'); // 'all' | 'low' | 'out_of_stock' | 'normal'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);

  // تسوية العملة والتحويل
  const activeTargetCurr = window.CurrencyService
    ? window.CurrencyService.normalizeCode(currency)
    : (typeof currency === 'string' ? currency : (currency?.code || 'YER'));
  const activeCurrDef = window.CurrencyService
    ? window.CurrencyService.getCurrencyDef(activeTargetCurr)
    : { code: 'YER', display: 'YER ﷼', symbol: '﷼', decimals: 0 };
  const currencyDisplay = activeCurrDef.display;
  const isBaseCurrency = activeTargetCurr === 'YER';

  // مزامنة المخزون السحابي فورياً
  const refreshInventory = useCallback(async (notify = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      const list = (data && Array.isArray(data.data)) ? data.data : (Array.isArray(data) ? data : []);
      if (typeof setInventory === 'function') {
        setInventory(list);
      }
      if (notify && showToast) showToast('تم تحديث ومزامنة بيانات المخزون من السحابة بنجاح 🔄');
    } catch (e) {
      console.warn('Refresh inventory warning:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [setInventory, showToast]);

  // جلب سجل الحركات والمناقلات
  const fetchTransactions = useCallback(async () => {
    setIsLoadingTxns(true);
    try {
      const res = await fetch('/api/inventory/transactions');
      const data = await res.json();
      const list = (data && Array.isArray(data.data)) ? data.data : (Array.isArray(data) ? data : []);
      setTransactions(list);
    } catch (e) {
      console.warn('Fetch inventory transactions warning:', e);
    } finally {
      setIsLoadingTxns(false);
    }
  }, []);

  useEffect(() => {
    refreshInventory(false);
    fetchTransactions();
  }, [refreshInventory, fetchTransactions]);

  // تصفية سجل المخزون وفق التبويب والبحث والفلاتر
  const filteredInventory = useMemo(() => {
    return (inventory || []).filter(item => {
      const name = getItemName(item);
      const code = String(item.item_code || item.code || item.id || '');
      const category = item.category || 'أقمشة وخامات';
      const supplier = item.supplier_id || item.supplier || item.supplier_name || '';
      const location = item.location || 'المستودع الرئيسي';
      const isDress = isReadyDress(item);

      // فلترة التبويب الرئيسي
      if (activeTab === 'stock' && isDress) return false;
      if (activeTab === 'ready_dresses' && !isDress) return false;

      // فلترة البحث
      const q = (search || '').trim().toLowerCase();
      const matchSearch = !q ||
        name.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q) ||
        supplier.toLowerCase().includes(q) ||
        location.toLowerCase().includes(q);

      // فلاتر القوائم
      const matchCat = categoryFilter === 'الكل' || category === categoryFilter;
      const whStock = u.getItemWarehouseStock ? u.getItemWarehouseStock(item, warehouseFilter) : getItemQty(item);
      const matchWarehouse = warehouseFilter === 'الكل' || whStock > 0 || location === warehouseFilter || item.warehouse_id === warehouseFilter;

      // فلتر تنبيهات النقص
      let matchAlert = true;
      if (stockAlertFilter === 'low') matchAlert = isLowStock(item);
      else if (stockAlertFilter === 'out_of_stock') matchAlert = isOutOfStock(item);
      else if (stockAlertFilter === 'normal') matchAlert = !isLowStock(item) && !isOutOfStock(item);

      return matchSearch && matchCat && matchWarehouse && matchAlert;
    }).map(item => {
      if (warehouseFilter === 'الكل' || !u.getItemWarehouseStock) return item;
      const whQty = u.getItemWarehouseStock(item, warehouseFilter);
      return { ...item, qty: whQty, quantity: whQty, current_balance: whQty, available_qty: whQty };
    });
  }, [inventory, activeTab, search, categoryFilter, warehouseFilter, stockAlertFilter, getItemName, isReadyDress, isLowStock, isOutOfStock]);

  // تصفية فواتير التوريد
  const filteredPurchases = useMemo(() => {
    return (purchases || []).filter(p => {
      const bill = String(p.purchase_no || p.bill_no || '').toLowerCase();
      const sup = String(p.supplier_name || p.supplier || '').toLowerCase();
      const itm = String(p.fabric_name || p.item_name || p.item || '').toLowerCase();
      const q = (search || '').trim().toLowerCase();
      return !q || bill.includes(q) || sup.includes(q) || itm.includes(q);
    });
  }, [purchases, search]);

  // تصفية سجل الحركات
  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter(t => {
      const q = (search || '').trim().toLowerCase();
      if (!q) return true;
      const ref = String(t.reference_id || t.id || '').toLowerCase();
      const notes = String(t.notes || '').toLowerCase();
      const type = String(t.transaction_type || '').toLowerCase();
      return ref.includes(q) || notes.includes(q) || type.includes(q);
    });
  }, [transactions, search]);

  // المؤشرات المالية والإحصائية
  const stats = useMemo(() => {
    let baseTotal = 0;
    let fabricMeters = 0;
    let readyPieces = 0;
    let lowCount = 0;

    (inventory || []).forEach(i => {
      const qty = getItemQty(i);
      const rawCost = getItemCost(i);
      const rawVal = parseFloat(i.total_value) || (qty * rawCost) || 0;
      const iCurr = window.CurrencyService ? window.CurrencyService.normalizeCode(i.currency || 'YER') : 'YER';
      const baseVal = iCurr === 'YER' ? rawVal : (window.CurrencyService ? window.CurrencyService.toBase(rawVal, iCurr).base_amount : rawVal);
      baseTotal += baseVal;

      if (isReadyDress(i)) readyPieces += qty;
      else fabricMeters += qty;

      if (isLowStock(i) || isOutOfStock(i)) lowCount++;
    });

    const displayTotal = isBaseCurrency
      ? baseTotal
      : (window.CurrencyService ? window.CurrencyService.fromBase(baseTotal, activeTargetCurr) : baseTotal);

    return {
      totalItems: (inventory || []).length,
      totalFabricsMeters: fabricMeters,
      totalReadyDresses: readyPieces,
      lowStockCount: lowCount,
      totalInventoryValue: displayTotal,
      totalInventoryValueBase: baseTotal,
      currencyDisplay,
      activeCurrDef,
      isBaseCurrency
    };
  }, [inventory, isBaseCurrency, activeTargetCurr, currencyDisplay, activeCurrDef, getItemQty, getItemCost, isReadyDress, isLowStock, isOutOfStock]);

  return {
    activeTab, setActiveTab,
    search, setSearch,
    categoryFilter, setCategoryFilter,
    warehouseFilter, setWarehouseFilter,
    stockAlertFilter, setStockAlertFilter,
    isRefreshing, refreshInventory,
    transactions, isLoadingTxns, fetchTransactions,
    filteredInventory,
    filteredPurchases,
    filteredTransactions,
    stats,
    currencyDisplay,
    activeCurrDef,
    isBaseCurrency,
    activeTargetCurr
  };
}

window.useInventoryData = useInventoryData;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = useInventoryData;
}
