// src/features/products/hooks/useProductsData.js
// خطاف إدارة بيانات كتالوج المنتجات والموديلات والتصفية والفرز والمؤشرات الإحصائية

const { useState, useMemo } = React;

function useProductsData({ products = [], currency }) {
  const currencyDisplay = currency?.display || "YER ﷼";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  const [collectionFilter, setCollectionFilter] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [sortBy, setSortBy] = useState("latest"); // 'latest' | 'name' | 'price_asc' | 'price_desc' | 'profit_desc'
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'

  // استخراج التصنيفات المتاحة من الثوابت والمنتجات
  const availableCategories = useMemo(() => {
    const defaultCats = typeof PRODUCT_CATEGORIES !== 'undefined' ? PRODUCT_CATEGORIES : [
      'فساتين وبدلات خاصة', 'فساتين أميرات سهرة', 'أطقم مواليد وسبوع', 'تفصيل راقي حسب الطلب'
    ];
    const set = new Set(defaultCats);
    (products || []).forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // استخراج التشكيلات والمجموعات المتاحة
  const availableCollections = useMemo(() => {
    const set = new Set(["تشكيلة العيد 2026", "تشكيلة الصيف", "تشكيلة الأميرات الفاخرة", "فساتين سهرة وأعراس"]);
    (products || []).forEach(p => {
      if (p.collection && String(p.collection).trim()) {
        set.add(String(p.collection).trim());
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
