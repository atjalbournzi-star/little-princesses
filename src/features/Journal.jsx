// src/features/Journal.jsx — Orchestrator (v2.0 Modular)
// Wires hooks and renders modular sub-components. All business logic lives in journal/hooks/*.
// All UI lives in journal/components/*. Utils in journal/utils/journalUtils.js.

function Journal({
  journal = [], setJournal,
  accounts = [], setAccounts,
  vouchers = [], setVouchers,
  showToast, currency,
  customers = [], purchases = [], employees = []
}) {
  const [activeSubTab, setActiveSubTab] = React.useState('entries');

  // ── Resolve sub-modules (with window fallbacks) ──
  const {
    ledgerAccount, setLedgerAccount,
    ledgerDateRange, setLedgerDateRange,
    ledgerSearch, setLedgerSearch,
    postingAccounts, groupedLedgerAccounts, trialBalance
  } = (window.useJournalData || (() => ({
    ledgerAccount: 'ALL', setLedgerAccount: () => {},
    ledgerDateRange: { start: '', end: '' }, setLedgerDateRange: () => {},
    ledgerSearch: '', setLedgerSearch: () => {},
    postingAccounts: [], groupedLedgerAccounts: [], trialBalance: { rows: [], grand_total_debit: 0, grand_total_credit: 0, is_balanced: true, diff: 0 }
  })))({ journal, accounts });

  const {
    formData, setFormData, currencyCode, isBaseCurrency,
    showCompoundModal, setShowCompoundModal,
    compoundForm, setCompoundForm,
    compoundLines, compoundTotals, compoundCurrCode,
    isSubmittingCompound,
    editingEntry, setEditingEntry,
    editFormData, setEditFormData,
    isSubmittingEdit, isDeletingId,
    handleSubmit, handleOpenEdit, handleSaveEdit, handleDeleteEntry,
    handleOpenCompoundModal, handleAddCompoundLine,
    handleDuplicateCompoundLine, handleDeleteCompoundLine,
    handleCompoundLineChange, handleSubmitCompound
  } = (window.useJournalActions || (() => ({})))({
    journal, setJournal, accounts, setAccounts,
    vouchers, setVouchers, showToast,
    customers, purchases, employees
  });

  const JournalHeaderComp       = window.JournalHeader       || (() => null);
  const JournalEntriesTabComp   = window.JournalEntriesTab   || (() => null);
  const JournalLedgerTabComp    = window.JournalLedgerTab    || (() => null);
  const JournalTrialBalComp     = window.JournalTrialBalanceTab || (() => null);
  const JournalEditModalComp    = window.JournalEditModal    || (() => null);
  const JournalCompoundModalComp = window.JournalCompoundModal || (() => null);

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">

      {/* ── رأس الصفحة + KPIs + تبويبات ── */}
      <JournalHeaderComp
        journal={journal}
        trialBalance={trialBalance}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
      />

      {/* ── التبويب الأول: القيود اليومية ── */}
      {activeSubTab === 'entries' && (
        <JournalEntriesTabComp
          journal={journal}
          accounts={accounts}
          postingAccounts={postingAccounts}
          formData={formData}
          setFormData={setFormData}
          currencyCode={currencyCode}
          isBaseCurrency={isBaseCurrency}
          handleSubmit={handleSubmit}
          handleOpenEdit={handleOpenEdit}
          handleDeleteEntry={handleDeleteEntry}
          isDeletingId={isDeletingId}
          handleOpenCompoundModal={handleOpenCompoundModal}
        />
      )}

      {/* ── التبويب الثاني: دفتر الأستاذ العام ── */}
      {activeSubTab === 'ledger' && (
        <JournalLedgerTabComp
          postingAccounts={postingAccounts}
          ledgerAccount={ledgerAccount}
          setLedgerAccount={setLedgerAccount}
          ledgerDateRange={ledgerDateRange}
          setLedgerDateRange={setLedgerDateRange}
          ledgerSearch={ledgerSearch}
          setLedgerSearch={setLedgerSearch}
          groupedLedgerAccounts={groupedLedgerAccounts}
        />
      )}

      {/* ── التبويب الثالث: ميزان المراجعة ── */}
      {activeSubTab === 'trial_balance' && (
        <JournalTrialBalComp trialBalance={trialBalance} />
      )}

      {/* ── Modal: تعديل القيد ── */}
      <JournalEditModalComp
        editingEntry={editingEntry}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        handleSaveEdit={handleSaveEdit}
        setEditingEntry={setEditingEntry}
        isSubmittingEdit={isSubmittingEdit}
        postingAccounts={postingAccounts}
      />

      {/* ── Modal: قيد يومية مركب ── */}
      <JournalCompoundModalComp
        showCompoundModal={showCompoundModal}
        setShowCompoundModal={setShowCompoundModal}
        compoundForm={compoundForm}
        setCompoundForm={setCompoundForm}
        compoundLines={compoundLines}
        compoundTotals={compoundTotals}
        compoundCurrCode={compoundCurrCode}
        isSubmittingCompound={isSubmittingCompound}
        postingAccounts={postingAccounts}
        customers={customers}
        purchases={purchases}
        employees={employees}
        handleAddCompoundLine={handleAddCompoundLine}
        handleDuplicateCompoundLine={handleDuplicateCompoundLine}
        handleDeleteCompoundLine={handleDeleteCompoundLine}
        handleCompoundLineChange={handleCompoundLineChange}
        handleSubmitCompound={handleSubmitCompound}
      />

    </div>
  );
}
