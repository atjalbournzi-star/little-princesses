// src/features/products/hooks/useProductsData.js
// خطاف إدارة بيانات كتالوج المنتجات والموديلات والتصفية والفرز والمؤشرات الإحصائية



function useProductsData({ products = [], currency }) {
  const { useState, useMemo, useEffect } = React;
  const currencyDisplay = currency?.display || "YER ﷼";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  const [collectionFilter, setCollectionFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [sortBy, setSortBy] = useState("latest"); // 'latest' | 'name' | 'price_asc' | 'price_desc' | 'profit_desc'
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    fetch('/api/products/categories').then(r => r.json()).then(res => {
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.categories) ? res.categories : []);
      if (list.length > 0) setDbCategories(list);
    }).catch(() => {});
  }, []);

  // استخراج التصنيفات المتاحة حصرياً من قاعدة البيانات والمنتجات دون قيم افتراضية
  const availableCategories = useMemo(() => {
    const set = new Set(dbCategories);
    (products || []).forEach(p => {
      const cat = p?.category || p?.classification;
      if (cat && typeof cat === 'string') {
        const clean = cat.trim();
        if (clean && !clean.includes('???')) set.add(clean);
      }
    });
    return Array.from(set).sort();
  }, [products, dbCategories]);

  // استخراج التشكيلات والمجموعات المتاحة حصرياً من قاعدة البيانات والمنتجات
  const availableCollections = useMemo(() => {
    const set = new Set();
    (products || []).forEach(p => {
      const coll = p?.collection;
      if (coll && typeof coll === 'string') {
        const clean = coll.trim();
        if (clean && !clean.includes('???')) set.add(clean);
      }
    });
    return Array.from(set);
  }, [products]);

  // تصفية وفرز قائمة المنتجات مع دعم البحث الشامل
  const filteredProducts = useMemo(() => {
    const list = (products || []).filter(p => {
      const q = (search || '').toLowerCase().trim();
      const matchesSearch = !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.model_name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.model_no || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.fabric_name || '').toLowerCase().includes(q) ||
        (p.collection || '').toLowerCase().includes(q) ||
        String(p.id || '').includes(q);

      const matchesCategory = categoryFilter === "الكل" || p.category === categoryFilter;
      const matchesCollection = collectionFilter === "الكل" || p.collection === collectionFilter;
      const matchesStatus = statusFilter === "الكل" || (p.status || 'Active') === statusFilter;

      return matchesSearch && matchesCategory && matchesCollection && matchesStatus;
    });

    return list.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '', 'ar');
      if (sortBy === 'price_asc') return (parseFloat(a.sell_price) || 0) - (parseFloat(b.sell_price) || 0);
      if (sortBy === 'price_desc') return (parseFloat(b.sell_price) || 0) - (parseFloat(a.sell_price) || 0);
      if (sortBy === 'profit_desc') return (parseFloat(b.profit) || 0) - (parseFloat(a.profit) || 0);
      return (b.id || 0) - (a.id || 0);
    });
  }, [products, search, categoryFilter, collectionFilter, statusFilter, sortBy]);

  // حساب مؤشرات الأداء العليا (KPIs)
  const stats = useMemo(() => {
    const count = products.length || 0;
    const totalCostSum = products.reduce((acc, p) => acc + (parseFloat(p.total_cost || p.cost_price) || 0), 0);
    const totalSellSum = products.reduce((acc, p) => acc + (parseFloat(p.sell_price || p.base_price) || 0), 0);
    const totalProfitSum = products.reduce((acc, p) => acc + (parseFloat(p.profit) || 0), 0);

    const avgCost = count > 0 ? (totalCostSum / count) : 0;
    const avgSellPrice = count > 0 ? (totalSellSum / count) : 0;
    const avgProfit = count > 0 ? (totalProfitSum / count) : 0;
    const avgMarginPct = avgSellPrice > 0 ? ((avgProfit / avgSellPrice) * 100) : 0;

    return {
      totalModels: count,
      avgCost,
      avgSellPrice,
      avgProfit,
      avgMarginPct: Math.round(avgMarginPct * 10) / 10,
      currencyDisplay,
      activeCategoriesCount: availableCategories.length
    };
  }, [products, availableCategories.length, currencyDisplay]);

  return {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    collectionFilter, setCollectionFilter,
    statusFilter, setStatusFilter,
    sortBy, setSortBy,
    viewMode, setViewMode,
    availableCategories,
    availableCollections,
    filteredProducts,
    stats
  };
}

window.useProductsData = useProductsData;
