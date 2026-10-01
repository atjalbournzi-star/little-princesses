// src/features/orders/components/OrderVoucherModal.jsx
// Facade & alias for Bespoke Financial Modal in Orders module
function OrderVoucherModal(props) {
  const Comp = window.BespokeFinancialModal || window.CustomerHistoryModal;
  if (!Comp) return null;
  return <Comp {...props} />;
}

window.OrderVoucherModal = window.BespokeFinancialModal || window.CustomerHistoryModal || OrderVoucherModal;
