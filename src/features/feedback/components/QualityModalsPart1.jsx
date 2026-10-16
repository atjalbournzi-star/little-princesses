// src/features/feedback/components/QualityModalsPart1.jsx
// محطة الفحص والرقابة المؤسسية لجودة الأزياء (Quality Modals Adapter)

function QualityModalsPart1({
  activeModalType,
  onClose,
  orders = [],
  products = [],
  customers = [],
  employees = [],
  purchases = [],
  isSubmitting
}) {
  const Station = window.QualityAssurance;

  return (
    <React.Fragment>
      {(activeModalType === 'eval' || activeModalType === 'inspection') && Station && (
        <Station
          isOpen={true}
          onClose={onClose}
          orders={orders}
          products={products}
          employees={employees}
        />
      )}
    </React.Fragment>
  );
}

window.QualityModalsPart1 = QualityModalsPart1;
