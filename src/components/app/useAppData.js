/**
 * ============================================================================
 * useAppData.js — App Domain State Management & Initial Sync Hook
 * Architecture: Instant Data Hydration & SWR Smart Caching | Little Princesses ERP
 * ============================================================================
 */

function useAppData() {
  const { useState, useEffect, useCallback } = React;

  // 0. Clean operational cache on zero-state factory reset while preserving auth & settings
  const PRESERVED_KEYS = new Set([
    'erp_active_user', 'lp_user', 'currentUser', 'token', 'authToken', 'erp_token', 'erp_user_id',
    'lp_theme', 'theme', 'erp_system_currency', 'erp_company_name', 'erp_phone', 'erp_address', 'erp_fiscal_date'
  ]);

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

  // 1. Safe helper for instant synchronous hydration from localStorage
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
        if (data.length === 0) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(data));
        }
      }
    } catch (e) {}
  };

  // State with instant hydration
  const [customers, setCustState] = useState(() => getInitialCache('lp_cache_customers', []));
  const [inventory, setInvState] = useState(() => getInitialCache('lp_cache_inventory', []));
  const [accounts, setAccState] = useState(() => getInitialCache('lp_cache_accounts', typeof INITIAL_ACCOUNTS !== 'undefined' ? INITIAL_ACCOUNTS : []));
  const [products, setProdState] = useState(() => getInitialCache('lp_cache_products', []));
  const [orders, setOrdState] = useState(() => getInitialCache('lp_cache_orders', []));
  const [purchases, setPurState] = useState(() => getInitialCache('lp_cache_purchases', []));
  const [factory, setFactState] = useState(() => getInitialCache('lp_cache_factory', []));
  const [vouchers, setVouchState] = useState(() => getInitialCache('lp_cache_vouchers', []));
  const [expenses, setExpState] = useState(() => getInitialCache('lp_cache_expenses', []));
  const [journal, setJournState] = useState(() => getInitialCache('lp_cache_journal', []));
  const [feedback, setFeedState] = useState(() => getInitialCache('lp_cache_feedback', []));
  const [campaigns, setCampState] = useState(() => getInitialCache('lp_cache_campaigns', []));
  const [employees, setEmpState] = useState(() => getInitialCache('lp_cache_employees', []));
  const [payroll, setPayState] = useState(() => getInitialCache('lp_cache_payroll', []));
  const [jobRoles, setJobRolesState] = useState(() => getInitialCache('lp_cache_job_roles', []));
  const [targetProductionJob, setTargetProductionJob] = useState(null);

  // Auto-caching state mutators
  const createSyncSetter = (setter, key) => (updater) => {
    setter(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      syncCache(key, next);
      return next;
    });
  };

  const setCustomers = useCallback(createSyncSetter(setCustState, 'lp_cache_customers'), []);
  const setInventory = useCallback(createSyncSetter(setInvState, 'lp_cache_inventory'), []);
  const setAccounts = useCallback(createSyncSetter(setAccState, 'lp_cache_accounts'), []);
  const setProducts = useCallback(createSyncSetter(setProdState, 'lp_cache_products'), []);
  const setOrders = useCallback(createSyncSetter(setOrdState, 'lp_cache_orders'), []);
  const setPurchases = useCallback(createSyncSetter(setPurState, 'lp_cache_purchases'), []);
  const setFactory = useCallback(createSyncSetter(setFactState, 'lp_cache_factory'), []);
  const setVouchers = useCallback(createSyncSetter(setVouchState, 'lp_cache_vouchers'), []);
  const setExpenses = useCallback(createSyncSetter(setExpState, 'lp_cache_expenses'), []);
  const setJournal = useCallback(createSyncSetter(setJournState, 'lp_cache_journal'), []);
  const setFeedback = useCallback(createSyncSetter(setFeedState, 'lp_cache_feedback'), []);
  const setCampaigns = useCallback(createSyncSetter(setCampState, 'lp_cache_campaigns'), []);
  const setEmployees = useCallback(createSyncSetter(setEmpState, 'lp_cache_employees'), []);
  const setPayroll = useCallback(createSyncSetter(setPayState, 'lp_cache_payroll'), []);
  const setJobRoles = useCallback(createSyncSetter(setJobRolesState, 'lp_cache_job_roles'), []);

  // 2. Stale-While-Revalidate Silent Background Data Refresh
  useEffect(() => {
    const fetchBackground = (url, setter) => {
      fetch(url)
        .then(r => r.json())
        .then(d => {
          const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : null);
          if (list !== null) setter(list);
        })
        .catch(() => {});
    };

    fetchBackground('/api/products', setProducts);
    fetchBackground('/api/customers', setCustomers);
    fetchBackground('/api/accounts/list', setAccounts);
    fetchBackground('/api/inventory', setInventory);
    fetchBackground('/api/sales/orders', setOrders);
    fetchBackground('/api/factory', setFactory);
    fetchBackground('/api/purchases', setPurchases);
    fetchBackground('/api/vouchers', setVouchers);
    fetchBackground('/api/expenses', setExpenses);
    fetchBackground('/api/journal', setJournal);
    fetchBackground('/api/hr/employees', setEmployees);
    fetchBackground('/api/hr/job-roles', setJobRoles);
    fetchBackground('/api/feedback', setFeedback);

    const initData = async () => {
      try {
        if (typeof window.loadAllData === 'function') {
          const data = await window.loadAllData();
          if (data) {
            if (data.customers !== undefined) setCustomers(data.customers);
            if (data.inventory !== undefined) setInventory(data.inventory);
            if (data.accounts !== undefined) setAccounts(data.accounts);
            if (data.products !== undefined) setProducts(data.products);
            if (data.orders !== undefined) setOrders(data.orders);
            if (data.purchases !== undefined) setPurchases(data.purchases);
            if (data.factory !== undefined) setFactory(data.factory);
            if (data.vouchers !== undefined) setVouchers(data.vouchers);
            if (data.expenses !== undefined) setExpenses(data.expenses);
            if (data.journal !== undefined) setJournal(data.journal);
            if (data.feedback !== undefined) setFeedback(data.feedback);
            const camps = data.campaigns || data.marketing_campaigns;
            if (camps !== undefined) setCampaigns(camps);
            if (data.employees !== undefined) setEmployees(data.employees);
            if (data.payroll !== undefined) setPayroll(data.payroll);
            if (data.jobRoles !== undefined) setJobRoles(data.jobRoles);
          }
        }
      } catch (e) {
        console.warn('Initial data background refresh warning:', e);
      }
    };
    initData();
  }, [setCustomers, setInventory, setAccounts, setProducts, setOrders, setPurchases, setFactory, setVouchers, setExpenses, setJournal, setFeedback, setCampaigns, setEmployees, setPayroll, setJobRoles]);

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
