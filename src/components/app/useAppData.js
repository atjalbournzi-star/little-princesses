/**
 * ============================================================================
 * useAppData.js — App Domain State Management & Initial Sync Hook
 * Architecture: Modular App State Hook | Little Princesses ERP
 * ============================================================================
 */

function useAppData() {
  const { useState, useEffect } = React;

  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [accounts, setAccounts] = useState(typeof INITIAL_ACCOUNTS !== 'undefined' ? INITIAL_ACCOUNTS : []);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [factory, setFactory] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [journal, setJournal] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [targetProductionJob, setTargetProductionJob] = useState(null);

  useEffect(() => {
    fetch('/api/accounts/list')
      .then(r => r.json())
      .then(d => {
        const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        if (list.length > 0) setAccounts(list);
      })
      .catch(() => {});

    fetch('/api/inventory')
      .then(r => r.json())
      .then(d => {
        const list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        if (list.length > 0) setInventory(list);
      })
      .catch(() => {});

    const initData = async () => {
      try {
        if (typeof window.loadAllData === 'function') {
          const data = await window.loadAllData();
          if (data) {
            setCustomers(data.customers || []);
            setInventory(data.inventory || []);
            setAccounts(data.accounts || []);
            setProducts(data.products || []);
            setOrders(data.orders || []);
            setPurchases(data.purchases || []);
            setFactory(data.factory || []);
            setVouchers(data.vouchers || []);
            setExpenses(data.expenses || []);
            setJournal(data.journal || []);
            setFeedback(data.feedback || []);
            setCampaigns(data.campaigns || data.marketing_campaigns || []);
            setEmployees(data.employees || []);
            setPayroll(data.payroll || []);
          }
        }
      } catch (e) {
        console.error('Failed to load initial data', e);
      }
    };
    initData();
  }, []);

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
    targetProductionJob, setTargetProductionJob
  };
}

window.useAppData = useAppData;
