// src/features/orders/components/OrdersPosStudio.jsx
// واجهة متوافقة تعيد توجيه طلبات الكاشير إلى المكون المعياري الحديث POS

function OrdersPosStudio(props) {
  const POSComponent = window.POS;
  if (POSComponent) {
    return <POSComponent {...props} />;
  }
  return null;
}

window.OrdersPosStudio = OrdersPosStudio;

