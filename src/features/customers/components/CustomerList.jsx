// src/features/customers/components/CustomerList.jsx
// Facade & alias for CustomerTable
function CustomerList(props) {
  const Comp = window.CustomerTable;
  if (!Comp) return null;
  return <Comp {...props} />;
}

window.CustomerList = window.CustomerTable || CustomerList;
