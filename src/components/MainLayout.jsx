/**
 * ============================================================================
 * MainLayout.jsx — Main Application Layout Facade
 * Architecture: Facade Pattern | Little Princesses ERP
 * ============================================================================
 */

function MainLayout(props) {
  const LayoutComp = window.AppLayout || (() => null);
  return <LayoutComp {...props} />;
}

window.MainLayout = MainLayout;
