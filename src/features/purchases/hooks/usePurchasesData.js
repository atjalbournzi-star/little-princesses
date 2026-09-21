const { useState, useEffect, useMemo, useCallback, useRef } = React;

function usePurchasesData({ purchases, setPurchases, headerData, setHeaderData }) {
  // ── حالة الموردين الديناميكية من السحابة والقائمة الذكية ──
  const [suppliers, setSuppliers] = useState([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierDropdownRef = useRef(null);

  // جلب الموردين النشطين فقط مباشرة من قاعدة بيانات Supabase / PostgreSQL
  const fetchSuppliers = useCallback(async () => {
    setIsLoadingSuppliers(true);
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      const list = (data && Array.isArray(data.data)) ? data.data : (Array.isArray(data) ? data : []);
      setSuppliers(list);
    } catch (err) {
      console.warn('Error fetching suppliers:', err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target)) {
        setIsSupplierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSupplier = useCallback((supp) => {
    setHeaderData(prev => ({
      ...prev,
      supplier_id: supp.id,
      supplier: supp.name,
      supplier_phone: supp.phone || ''
    }));
    setSupplierSearch(supp.name);
    setIsSupplierDropdownOpen(false);
  }, [setHeaderData]);

  const filteredSuppliersList = useMemo(() => {
    const q = (supplierSearch || '').trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(s => 
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.phone && String(s.phone).includes(q)) ||
      (s.city && s.city.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  const selectedSupplierObj = useMemo(() => {
    if (headerData.supplier_id) {
      return suppliers.find(s => String(s.id) === String(headerData.supplier_id));
    }
    if (headerData.supplier) {
      return suppliers.find(s => s.name === headerData.supplier);
    }
    return null;
  }, [suppliers, headerData.supplier_id, headerData.supplier]);

  // ── جلب سجل المشتريات تلقائياً من السيرفر المحلي ──
  useEffect(() => {
    if ((!purchases || purchases.length === 0) && typeof setPurchases === 'function') {
      fetch('/api/purchases')
        .then(r => r.json())
        .then(d => {
          const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
          if (list.length > 0) {
            setPurchases(list);
          }
        })
        .catch(err => console.warn('Purchases auto-fetch warning:', err));
    }
  }, [purchases, setPurchases]);

  // ── حالات البحث والفلترة لسجل المشتريات ──
  const [search, setSearch] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const filteredPurchases = useMemo(() => {
    const list = Array.isArray(purchases) ? purchases : [];
    const q = String(search || '').trim().toLowerCase();
    return list.filter(p => {
      if (!p || typeof p !== 'object') return false;
      const itemName = String(p.fabric_name || p.item || p.item_name || '');
      const billNo = String(p.bill_no || p.purchase_no || '');
      const supplier = String(p.supplier || p.supplier_name || '');
      const transferNo = String(p.transfer_no || '');
      return !q ||
        billNo.toLowerCase().includes(q) ||
        supplier.toLowerCase().includes(q) ||
        itemName.toLowerCase().includes(q) ||
        transferNo.toLowerCase().includes(q);
    });
  }, [purchases, search]);

  return {
    suppliers,
    setSuppliers,
    isLoadingSuppliers,
    supplierSearch,
    setSupplierSearch,
    isSupplierDropdownOpen,
    setIsSupplierDropdownOpen,
    supplierDropdownRef,
    fetchSuppliers,
    handleSelectSupplier,
    filteredSuppliersList,
    selectedSupplierObj,
    search,
    setSearch,
    isHistoryOpen,
    setIsHistoryOpen,
    filteredPurchases
  };
}

window.usePurchasesData = usePurchasesData;
