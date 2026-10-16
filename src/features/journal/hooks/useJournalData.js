// src/features/journal/hooks/useJournalData.js
// Derived/memoized state: posting accounts, ledger rows, trial balance, filter state

function useJournalData({ journal, accounts }) {
  const [ledgerAccount,   setLedgerAccount]   = React.useState('ALL');
  const [ledgerDateRange, setLedgerDateRange] = React.useState({ start: '', end: new Date().toISOString().split('T')[0] });
  const [ledgerSearch,    setLedgerSearch]    = React.useState('');
  const [serverLedgerRows, setServerLedgerRows] = React.useState(null);
  const [isLedgerLoading,  setIsLedgerLoading]  = React.useState(false);
  const [serverTrialBalance, setServerTrialBalance] = React.useState(null);
  const [isTrialLoading,   setIsTrialLoading]   = React.useState(false);

  // Posting accounts: non-group, active
  const postingAccounts = React.useMemo(() =>
    (accounts || []).filter(a => Number(a.is_group) !== 1 && Number(a.is_active) !== 0),
    [accounts]
  );

  // Fetch General Ledger directly from backend API when account or date range changes
  React.useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const fetchLedger = async () => {
      setIsLedgerLoading(true);
      try {
        const qAcc = ledgerAccount && ledgerAccount !== 'ALL' ? encodeURIComponent(ledgerAccount) : '';
        const qStart = ledgerDateRange.start ? `&start_date=${encodeURIComponent(ledgerDateRange.start)}` : '';
        const qEnd = ledgerDateRange.end ? `&end_date=${encodeURIComponent(ledgerDateRange.end)}` : '';
        const res = await fetch(`/api/reports/general-ledger?account=${qAcc}${qStart}${qEnd}`, {
          signal: controller.signal
        }).then(r => r.json());
        if (active && res && res.success && res.data) {
          setServerLedgerRows(Array.isArray(res.data.rows) ? res.data.rows : []);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn("Server ledger fetch warning:", err);
        }
      } finally {
        clearTimeout(timeoutId);
        setIsLedgerLoading(false);
      }
    };
    fetchLedger();
    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
      setIsLedgerLoading(false);
    };
  }, [ledgerAccount, ledgerDateRange]);

  // Fetch Trial Balance directly from backend API when date range changes
  React.useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const fetchTB = async () => {
      setIsTrialLoading(true);
      try {
        const qStart = ledgerDateRange.start ? `?start_date=${encodeURIComponent(ledgerDateRange.start)}` : '';
        const qEnd = ledgerDateRange.end ? `${qStart ? '&' : '?'}end_date=${encodeURIComponent(ledgerDateRange.end)}` : '';
        const res = await fetch(`/api/reports/trial-balance${qStart}${qEnd}`, {
          signal: controller.signal
        }).then(r => r.json());
        if (active && res && res.success && res.data) {
          setServerTrialBalance(res.data);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn("Server TB fetch warning:", err);
        }
      } finally {
        clearTimeout(timeoutId);
        setIsTrialLoading(false);
      }
    };
    fetchTB();
    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
      setIsTrialLoading(false);
    };
  }, [ledgerDateRange]);

  // General Ledger rows: prefer server rows if available, fallback to client engine
  const ledgerRows = React.useMemo(() => {
    if (serverLedgerRows !== null) return serverLedgerRows;
    if (window.AccountingEngine && typeof window.AccountingEngine.generateGeneralLedger === 'function') {
      const filterId = ledgerAccount === 'ALL' ? null : ledgerAccount;
      return window.AccountingEngine.generateGeneralLedger(journal, accounts, filterId, ledgerDateRange);
    }
    return [];
  }, [serverLedgerRows, journal, accounts, ledgerAccount, ledgerDateRange]);

  // Filtered ledger rows by search query
  const filteredLedgerRows = React.useMemo(() => {
    if (!ledgerSearch.trim()) return ledgerRows;
    const q = ledgerSearch.toLowerCase();
    return ledgerRows.filter(r =>
      (r.entry_no && r.entry_no.toLowerCase().includes(q)) ||
      (r.account_name && r.account_name.toLowerCase().includes(q)) ||
      (r.account_code && String(r.account_code).toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  }, [ledgerRows, ledgerSearch]);

  // Grouped ledger accounts
  const groupedLedgerAccounts = React.useMemo(() => {
    if (!filteredLedgerRows || filteredLedgerRows.length === 0) return [];
    const groups = {};
    filteredLedgerRows.forEach(r => {
      const code = r.account_code || r.account_id || 'UNKNOWN';
      if (!groups[code]) {
        groups[code] = {
          account_code: code, account_name: r.account_name || code,
          account_nature: r.account_nature || 'debit', rows: [],
          final_balance_base: 0, final_balance_orig: 0,
          primary_currency: 'YER', has_foreign: false
        };
      }
      groups[code].rows.push(r);
      groups[code].final_balance_base = r.running_balance_base !== undefined ? r.running_balance_base : (r.running_target || 0);
      groups[code].final_balance_orig = r.running_balance_orig !== undefined ? r.running_balance_orig : (r.running_balance_base || 0);
      const c = r.currency || 'YER';
      if (c && !String(c).includes('YER')) {
        groups[code].has_foreign = true;
        groups[code].primary_currency = c;
      }
    });
    return Object.values(groups);
  }, [filteredLedgerRows]);

  // Trial Balance: prefer server data if available, fallback to client engine
  const trialBalance = React.useMemo(() => {
    if (serverTrialBalance !== null) return serverTrialBalance;
    if (window.AccountingEngine && typeof window.AccountingEngine.generateTrialBalance === 'function') {
      return window.AccountingEngine.generateTrialBalance(journal, accounts);
    }
    return { rows: [], grand_total_debit: 0, grand_total_credit: 0, is_balanced: true, diff: 0 };
  }, [serverTrialBalance, journal, accounts]);

  return {
    ledgerAccount, setLedgerAccount,
    ledgerDateRange, setLedgerDateRange,
    ledgerSearch, setLedgerSearch,
    postingAccounts, ledgerRows,
    filteredLedgerRows, groupedLedgerAccounts,
    trialBalance, isLedgerLoading, isTrialLoading
  };
}

window.useJournalData = useJournalData;
