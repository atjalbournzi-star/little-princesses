// src/features/customers/components/CustomerBasicInfoModal.jsx
// Facade & alias for CustomerModal (Step 1: Basic Information)
function CustomerBasicInfoModal(props) {
  const Comp = window.CustomerModal;
  if (!Comp) return null;
  return <Comp {...props} />;
}

window.CustomerBasicInfoModal = window.CustomerModal || CustomerBasicInfoModal;
