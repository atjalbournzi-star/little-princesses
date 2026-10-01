// src/features/journal/hooks/useJournalData.js
// Derived/memoized state: posting accounts, ledger rows, trial balance, filter state

function useJournalData({ journal, accounts }) {
  const [ledgerAccount,   setLedgerAccount]   = React.useState('ALL');
  const [ledgerDateRange, setLedgerDateRange] = React.useState({ start: '', end: new Date().toISOString().split('T')[0] });
  const [ledgerSearch,    setLedgerSearch]    = React.useState('');

  // Posting accounts: non-group, active
  const postingAccounts = React.useMemo(() =>
    (accounts || []).filter(a => Number(a.is_group) !== 1 && Number(a.is_active) !== 0),
    [accounts]
  );

  // General Ledger rows from AccountingEngine
  const ledgerRows = React.useMemo(() => {
    if (window.AccountingEngine && typeof window.AccountingEngine.generateGeneralLedger === 'function') {
      const filterId = ledgerAccount === 'ALL' ? null : ledgerAccount;
      return window.AccountingEngine.generateGeneralLedger(journal, accounts, filterId, ledgerDateRange);
    }
    return [];
  }, [journal, accounts, ledgerAccount, ledgerDateRange]);

  // Filtered ledger rows by search query
  const filteredLedgerRows = React.useMemo(() => {
    if (!ledgerSearch.trim()) return ledgerRows;
    const q = ledgerSearch.toLowerCase();
    return ledgerRows.filter(r =>
      r.entry_no.toLowerCase().includes(q) ||
      r.account_name.toLowerCase().includes(q) ||
      r.account_code.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  }, [ledgerRows, ledgerSearch]);

  // Grouped ledger accounts
  const groupedLedgerAccounts = React.useMemo(() => {
    if (!filteredLedgerRows || filteredLedgerRows.length === 0) return [];
    const groups = {};
    filteredLedgerRows.forEach(r => {
      const code = r.account_code;
      if (!groups[code]) {
        groups[code] = {
          account_code: code, account_name: r.account_name,
          account_nature: r.account_nature, rows: [],
          final_balance_base: 0, final_balance_orig: 0,
          primary_currency: 'YER', has_foreign: false
        };
      }
      groups[code].rows.push(r);
      groups[code].final_balance_base = r.running_balance_base;
      groups[code].final_balance_orig = r.running_balance_orig;
      const c = r.currency || 'YER';
      if (c && !String(c).includes('YER')) {
        groups[code].has_foreign = true;
        groups[code].primary_currency = c;
      }
    });
    return Object.values(groups);
  }, [filteredLedgerRows]);

  // Trial Balance from AccountingEngine
  const trialBalance = React.useMemo(() => {
    if (window.AccountingEngine && typeof window.AccountingEngine.generateTrialBalance === 'function') {
      return window.AccountingEngine.generateTrialBalance(journal, accounts);
    }
    return { rows: [], grand_total_debit: 0, grand_total_credit: 0, is_balanced: true, diff: 0 };
  }, [journal, accounts]);

  return {
    ledgerAccount, setLedgerAccount,
    ledgerDateRange, setLedgerDateRange,
    ledgerSearch, setLedgerSearch,
    postingAccounts, ledgerRows,
    filteredLedgerRows, groupedLedgerAccounts,
    trialBalance
  };
}

window.useJournalData = useJournalData;
