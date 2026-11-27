/**
 * ============================================================================
 * useAppData.js — App Domain State Management & Initial Sync Hook
 * Architecture: Instant Data Hydration & SWR Smart Caching | Little Princesses ERP
 * ============================================================================
 */

function useAppData({ activeTab = 'dashboard', isAuthenticated = false } = {}) {
  const { useState, useEffect, useCallback, useRef } = React;

  // 0. Clean operational & financial cache once on mount (never inside render body)
  useEffect(() => {
    const PRESERVED_KEYS = new Set([
      'erp_active_user', 'lp_user', 'currentUser', 'token', 'authToken', 'erp_token', 'erp_user_id',
      'lp_theme', 'theme', 'erp_system_currency', 'erp_company_name', 'erp_phone', 'erp_address'
    ]);
    ['lp_cache_vouchers', 'lp_cache_expenses', 'lp_cache_journal', 'lp_cache_payroll', 'lp_cache_accounts', 'erp_exchange_rates_v1'].forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    if (typeof window !== 'undefined' && !window.clearOperationalStorage) {
      window.clearOperationalStorage = () => {
        try {
          Object.keys(localStorage).forEach(k => { if (!PRESERVED_KEYS.has(k)) localStorage.removeItem(k); });
          sessionStorage.clear();
          localStorage.setItem('lp_zero_state_purged_v1', 'true');
        } catch (e) {}
      };
      try {
        if (localStorage.getItem('lp_zero_state_purged_v1') !== 'true') window.clearOperationalStorage();
      } catch (e) {}
    }
  }, []);

  // 1. Safe helper for operational non-financial caching
  const getInitialCache = (key, fallback = []) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return fallback;
  };

  const syncCache = (key, data) => {
    try {
      if (Array.isArray(data)) {
        if (data.length === 0) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {}
  };

  // State: Operational entities use instant hydration; Financial entities are ALWAYS fetched live
  const [customers, setCustState] = useState(() => getInitialCache('lp_cache_customers', []));
  const [inventory, setInvState] = useState(() => getInitialCache('lp_cache_inventory', []));
  const [accounts, setAccounts] = useState([]);
  const [products, setProdState] = useState(() => getInitialCache('lp_cache_products', []));
  const [orders, setOrdState] = useState(() => getInitialCache('lp_cache_orders', []));
  const [purchases, setPurState] = useState(() => getInitialCache('lp_cache_purchases', []));
  const [factory, setFactState] = useState(() => getInitialCache('lp_cache_factory', []));
  const [vouchers, setVouchers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [journal, setJournal] = useState([]);
  const [feedback, setFeedState] = useState(() => getInitialCache('lp_cache_feedback', []));
  const [campaigns, setCampState] = useState(() => getInitialCache('lp_cache_campaigns', []));
  const [employees, setEmpState] = useState(() => getInitialCache('lp_cache_employees', []));
  const [payroll, setPayroll] = useState([]);
  const [jobRoles, setJobRolesState] = useState(() => getInitialCache('lp_cache_job_roles', []));
  const [targetProductionJob, setTargetProductionJob] = useState(null);

  // Operational state mutators (non-financial)
  const createSyncSetter = (setter, key) => (updater) => {
    setter(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncCache(key, next);
      return next;
    });
  };

  const setCustomers = useCallback(createSyncSetter(setCustState, 'lp_cache_customers'), []);
  const setInventory = useCallback(createSyncSetter(setInvState, 'lp_cache_inventory'), []);
  const setProducts = useCallback(createSyncSetter(setProdState, 'lp_cache_products'), []);
  const setOrders = useCallback(createSyncSetter(setOrdState, 'lp_cache_orders'), []);
  const setPurchases = useCallback(createSyncSetter(setPurState, 'lp_cache_purchases'), []);
  const setFactory = useCallback(createSyncSetter(setFactState, 'lp_cache_factory'), []);
  const setFeedback = useCallback(createSyncSetter(setFeedState, 'lp_cache_feedback'), []);
  const setCampaigns = useCallback(createSyncSetter(setCampState, 'lp_cache_campaigns'), []);
  const setEmployees = useCallback(createSyncSetter(setEmpState, 'lp_cache_employees'), []);
  const setJobRoles = useCallback(createSyncSetter(setJobRolesState, 'lp_cache_job_roles'), []);

  // 2. Stale-While-Revalidate Smart Lazy-Loading Background Sync (with TTL dedup)
  const loadedTabsRef = useRef(new Set());
  const lastFetchedRef = useRef({});
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchBackground = useCallback((url, setter, ttlMs = 15000) => {
    const now = Date.now();
    if (ttlMs > 0 && lastFetchedRef.current[url] && (now - lastFetchedRef.current[url]) < ttlMs) return;
    lastFetchedRef.current[url] = now;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (!isMountedRef.current) return;
        const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : null);
        if (list !== null) setter(list);
      })
      .catch(() => { delete lastFetchedRef.current[url]; });
  }, []);

  // Essential Core Dashboard Endpoints (Fetched Once on Initial Mount when Authenticated; rest deferred lazily per tab)
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchBackground('/api/accounts/list', setAccounts);
    fetchBackground('/api/sales/orders', setOrders);
    fetchBackground('/api/factory', setFactory);
    fetchBackground('/api/journal', setJournal);
  }, [isAuthenticated, fetchBackground, setAccounts, setOrders, setFactory, setJournal]);

  // Tab-specific Lazy Loading (Triggered Only When Tab is Visited & Authenticated, deduped via TTL)
  useEffect(() => {
    if (!isAuthenticated || !activeTab) return;
    if (activeTab !== 'hr') {
      if (loadedTabsRef.current.has(activeTab)) return;
      loadedTabsRef.current.add(activeTab);
    }

    switch (activeTab) {
      case 'orders':
      case 'pos':
        fetchBackground('/api/customers', setCustomers);
        fetchBackground('/api/products', setProducts);
        break;
      case 'factory':
      case 'quality':
        fetchBackground('/api/customers', setCustomers);
        fetchBackground('/api/products', setProducts);
        fetchBackground('/api/hr/employees', setEmployees);
        break;
      case 'vouchers':
        fetchBackground('/api/vouchers', setVouchers);
        break;
      case 'expenses':
        fetchBackground('/api/expenses', setExpenses);
        fetchBackground('/api/vouchers', setVouchers);
        break;
      case 'journal':
        fetchBackground('/api/journal', setJournal);
        break;
      case 'customers':
        fetchBackground('/api/customers', setCustomers);
        break;
      case 'products':
        fetchBackground('/api/products', setProducts);
        fetchBackground('/api/hr/job-roles', setJobRoles);
        break;
      case 'inventory':
        fetchBackground('/api/inventory', setInventory);
        fetchBackground('/api/purchases', setPurchases);
        break;
      case 'purchases':
        fetchBackground('/api/purchases', setPurchases);
        break;
      case 'hr':
        fetchBackground('/api/hr/employees', setEmployees);
        fetchBackground('/api/hr/payroll', setPayroll);
        fetchBackground('/api/hr/job-roles', setJobRoles);
        break;
      case 'feedback':
        fetchBackground('/api/feedback', setFeedback);
        break;
      case 'marketing':
        if (typeof window !== 'undefined' && window.ENABLE_PHASE2_MODULES === true) {
          fetchBackground('/api/marketing/campaigns', setCampaigns);
        }
        break;
      case 'reports':
        fetchBackground('/api/journal', setJournal);
        fetchBackground('/api/vouchers', setVouchers);
        fetchBackground('/api/expenses', setExpenses);
        fetchBackground('/api/purchases', setPurchases);
        fetchBackground('/api/inventory', setInventory);
        fetchBackground('/api/customers', setCustomers);
        fetchBackground('/api/products', setProducts);
        break;
      default:
        break;
    }
  }, [isAuthenticated, activeTab, fetchBackground, setJournal, setCustomers, setProducts, setInventory, setPurchases, setEmployees, setPayroll, setJobRoles, setFeedback, setCampaigns, setVouchers, setExpenses]);

  return {
    customers, setCustomers,
    inventory, setInventory,
    accounts, setAccounts,
    products, setProducts,
    orders, setOrders,
    purchases, setPurchases,
    factory, setFactory,
    vouchers, setVouchers,
    expenses, setExpenses,
    journal, setJournal,
    feedback, setFeedback,
    campaigns, setCampaigns,
    employees, setEmployees,
    payroll, setPayroll,
    jobRoles, setJobRoles,
    targetProductionJob, setTargetProductionJob
  };
}

window.useAppData = useAppData;
