/**
 * ============================================================================
 * MainLayout.jsx (Root src Facade) — Little Princesses ERP
 * ============================================================================
 */

function MainLayout(props) {
  const LayoutComp = window.AppLayout || (() => null);
  return <LayoutComp {...props} />;
}

window.MainLayout = window.MainLayout || MainLayout;
