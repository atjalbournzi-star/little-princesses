const { useState, useCallback } = React;

function Vouchers({
  vouchers = [], setVouchers, accounts = [], setAccounts,
  journal = [], setJournal, showToast, customers = [], setCustomers,
  orders = [], setOrders, currency, expenses = [], setExpenses,
  purchases = [], employees = []
}) {
  const useData = window.useVouchersData || (() => ({}));
  const useOps = window.useVoucherOperations || (() => ({}));

  const {
    currencyDisplay, activeTargetCurr, search, setSearch,
    typeFilter, setTypeFilter, isRefreshing,
    partnerAccounts, getCleanPartnerName, findPartnerAccount,
    normalizeVoucher, filteredVouchers, totals, refreshVouchers
  } = useData({ vouchers, setVouchers, accounts, setAccounts, currency });

  const {
    reversingVoucher, reversalReason, setReversalReason, isReversing,
    handleOpenReverseModal, handleConfirmReverse, handleDeleteVoucher,
    isSubmittingVoucher, handleSaveNewVoucher, handleSendWhatsAppNotification
  } = useOps({ setVouchers, setJournal, setAccounts, setExpenses, setOrders, setCustomers, showToast });

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCompoundModal, setShowCompoundModal] = useState(false);
  const [viewVoucher, setViewVoucher] = useState(null);
  const [printVoucher, setPrintVoucher] = useState(null);

  const Header = window.VouchersHeader;
  const FilterBar = window.VouchersFilterBar;
  const Table = window.VouchersTable;
  const ReceiptModal = window.ReceiptVoucherModal;
  const PaymentModal = window.PaymentVoucherModal;
  const JournalModal = window.JournalVoucherModal;
  const ViewModal = window.VoucherViewModal;
  const ReversalModal = window.VoucherReversalModal;

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {Header && (
        <Header
          totals={totals}
          vouchersCount={(vouchers || []).length}
          onOpenReceiptModal={() => setShowReceiptModal(true)}
          onOpenPaymentModal={() => setShowPaymentModal(true)}
          onOpenCompoundModal={() => setShowCompoundModal(true)}
          onOpenCapitalDeposit={() => setShowReceiptModal(true)}
        />
      )}

      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        {FilterBar && (
          <FilterBar
            search={search} setSearch={setSearch}
            typeFilter={typeFilter} setTypeFilter={setTypeFilter}
            isRefreshing={isRefreshing} onRefresh={refreshVouchers}
            filteredCount={filteredVouchers.length}
          />
        )}

        {Table && (
          <Table
            vouchers={filteredVouchers} accounts={accounts}
            activeTargetCurr={activeTargetCurr} currencyDisplay={currencyDisplay}
            onViewVoucher={setViewVoucher}
            onOpenReverseModal={v => handleOpenReverseModal(v, normalizeVoucher)}
            onSendWhatsApp={v => handleSendWhatsAppNotification(v, customers)}
          />
        )}
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
