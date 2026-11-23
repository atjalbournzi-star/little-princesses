const { useState, useCallback } = React;

function Vouchers({
  vouchers = [], setVouchers, accounts = [], setAccounts,
  journal = [], setJournal, showToast, customers = [], setCustomers,
  orders = [], setOrders, currency, expenses = [], setExpenses,
  purchases = [], employees = []
}) {
  const useData = window.useVouchersData || (typeof useVouchersData !== 'undefined' ? useVouchersData : null) || (() => ({}));
  const useOps = window.useVoucherOperations || (typeof useVoucherOperations !== 'undefined' ? useVoucherOperations : null) || (() => ({}));

  const {
    currencyDisplay = "YER ﷼", activeTargetCurr = "YER", search = '', setSearch = () => {},
    typeFilter = 'الكل', setTypeFilter = () => {}, isRefreshing = false, loading = false,
    fetchError = null,
    partnerAccounts = [], getCleanPartnerName = (a) => '', findPartnerAccount = () => null,
    normalizeVoucher = (v) => v, filteredVouchers = [],
    totals = { receipts: 0, payments: 0, net: 0, count: 0 },
    stats = { totalCount: 0, totalIn: 0, totalOut: 0, netCash: 0 },
    refreshVouchers = () => {}
  } = useData({ vouchers, setVouchers, accounts, setAccounts, currency }) || {};

  const {
    reversingVoucher = null, reversalReason = '', setReversalReason = () => {}, isReversing = false,
    handleOpenReverseModal = () => {}, handleConfirmReverse = () => {}, handleDeleteVoucher = () => {},
    isSubmittingVoucher = false, handleSaveNewVoucher = () => {}, handleSendWhatsAppNotification = () => {}
  } = useOps({ setVouchers, setJournal, setAccounts, setExpenses, setOrders, setCustomers, showToast }) || {};

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCompoundModal, setShowCompoundModal] = useState(false);
  const [viewVoucher, setViewVoucher] = useState(null);
  const [printVoucher, setPrintVoucher] = useState(null);

  const Header = window.VouchersHeader || (typeof VouchersHeader !== 'undefined' ? VouchersHeader : null);
  const FilterBar = window.VouchersFilterBar || (typeof VouchersFilterBar !== 'undefined' ? VouchersFilterBar : null);
  const Table = window.VouchersTable || (typeof VouchersTable !== 'undefined' ? VouchersTable : null);
  const ReceiptModal = window.ReceiptVoucherModal || (typeof ReceiptVoucherModal !== 'undefined' ? ReceiptVoucherModal : null);
  const PaymentModal = window.PaymentVoucherModal || (typeof PaymentVoucherModal !== 'undefined' ? PaymentVoucherModal : null);
  const JournalModal = window.JournalVoucherModal || (typeof JournalVoucherModal !== 'undefined' ? JournalVoucherModal : null);
  const ViewModal = window.VoucherViewModal || (typeof VoucherViewModal !== 'undefined' ? VoucherViewModal : null);
  const ReversalModal = window.VoucherReversalModal || (typeof VoucherReversalModal !== 'undefined' ? VoucherReversalModal : null);

  return (
    <div className="flex-1 flex flex-col space-y-2 text-right" dir="rtl">
      {Header && (
        <Header
          totals={totals}
          stats={stats}
          vouchersCount={totals?.count || stats?.totalCount || (filteredVouchers || []).length}
          onOpenReceiptModal={() => setShowReceiptModal(true)}
          onOpenPaymentModal={() => setShowPaymentModal(true)}
          onOpenCompoundModal={() => setShowCompoundModal(true)}
          onOpenCapitalDeposit={() => setShowReceiptModal(true)}
        />
      )}

      <div className="flex-1 flex flex-col bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden p-2 space-y-1.5">
        {FilterBar && (
          <FilterBar
            search={search} setSearch={setSearch}
            typeFilter={typeFilter} setTypeFilter={setTypeFilter}
            isRefreshing={isRefreshing} onRefresh={refreshVouchers}
            filteredCount={(filteredVouchers || []).length}
          />
        )}

        {loading && (!filteredVouchers || filteredVouchers.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
            <div className="w-7 h-7 border-2 border-teal-500/30 border-t-teal-600 rounded-full animate-spin mb-2"></div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">جاري تحميل السندات والمعاملات المالية...</p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-rose-400 bg-rose-950/20 rounded-xl border border-rose-800/40 m-2 p-6">
            <div className="text-2xl mb-1.5">⚠️</div>
            <p className="text-xs font-bold text-rose-300 mb-2">{fetchError}</p>
            <button type="button" onClick={refreshVouchers} className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold transition cursor-pointer">
              إعادة المحاولة 🔄
            </button>
          </div>
        ) : Table ? (
          <Table
            vouchers={filteredVouchers || []} accounts={accounts}
            activeTargetCurr={activeTargetCurr} currencyDisplay={currencyDisplay}
            onViewVoucher={setViewVoucher}
            onOpenReverseModal={v => handleOpenReverseModal(v, normalizeVoucher)}
            onSendWhatsApp={v => handleSendWhatsAppNotification(v, customers)}
          />
        ) : null}
      </div>

      {ReceiptModal && (
        <ReceiptModal
          isOpen={showReceiptModal} onClose={() => setShowReceiptModal(false)}
          accounts={accounts} customers={customers} partnerAccounts={partnerAccounts}
          getCleanPartnerName={getCleanPartnerName} findPartnerAccount={findPartnerAccount}
          onSaveVoucher={handleSaveNewVoucher} isSubmitting={isSubmittingVoucher} showToast={showToast}
        />
      )}

      {PaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)}
          accounts={accounts} purchases={purchases} employees={employees}
          partnerAccounts={partnerAccounts} getCleanPartnerName={getCleanPartnerName}
          findPartnerAccount={findPartnerAccount} onSaveVoucher={handleSaveNewVoucher}
          isSubmitting={isSubmittingVoucher} showToast={showToast}
        />
      )}

      {JournalModal && (
        <JournalModal
          isOpen={showCompoundModal} onClose={() => setShowCompoundModal(false)}
          accounts={accounts} customers={customers} purchases={purchases}
          employees={employees} setJournal={setJournal} setAccounts={setAccounts}
          showToast={showToast}
        />
      )}

      {ViewModal && (
        <ViewModal voucher={viewVoucher} onClose={() => setViewVoucher(null)} onPrint={v => setPrintVoucher(v)} />
      )}

      {ReversalModal && (
        <ReversalModal
          voucher={reversingVoucher} reversalReason={reversalReason}
          setReversalReason={setReversalReason} isReversing={isReversing}
          onConfirm={handleConfirmReverse} onClose={() => handleOpenReverseModal(null)}
        />
      )}

      {printVoucher && typeof PrintModal !== 'undefined' && (
        <PrintModal
          isOpen={!!printVoucher} onClose={() => setPrintVoucher(null)}
          order={{
            order_no: printVoucher.v_no || `VOUCH-${printVoucher.id}`,
            customer_name: printVoucher.party || 'عميل / مورد',
            product_name: printVoucher.v_type || printVoucher.type || 'سند مالي',
            total: parseFloat(printVoucher.amount || 0),
            paid: parseFloat(printVoucher.amount || 0),
            currency: printVoucher.currency || 'YER ﷼',
            order_date: printVoucher.date || new Date().toISOString().split('T')[0],
            notes: printVoucher.notes || 'سند مالي معتمد'
          }}
          defaultTemplate="thermal"
        />
      )}
    </div>
  );
}

window.Vouchers = Vouchers;
window.FinancialVouchersTab = Vouchers;
window.VouchersTab = Vouchers;
