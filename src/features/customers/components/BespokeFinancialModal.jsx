// src/features/customers/components/BespokeFinancialModal.jsx
// Facade & alias for CustomerHistoryModal (Bespoke Financial & Order Voucher Modal)
function BespokeFinancialModal(props) {
  const Comp = window.CustomerHistoryModal;
  if (!Comp) return null;
  return <Comp {...props} />;
}

window.BespokeFinancialModal = window.CustomerHistoryModal || BespokeFinancialModal;
window.OrderVoucherModal = window.CustomerHistoryModal || BespokeFinancialModal;
window.CustomerFinancialModal = window.CustomerHistoryModal || BespokeFinancialModal;
