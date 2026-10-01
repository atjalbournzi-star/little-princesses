/**
 * ============================================================================
 * AppLayout.jsx (Root src Facade) — Little Princesses ERP
 * ============================================================================
 */

function AppLayout(props) {
  const LayoutComp = window.AppLayout || (() => null);
  return <LayoutComp {...props} />;
}

window.AppLayout = window.AppLayout || AppLayout;
