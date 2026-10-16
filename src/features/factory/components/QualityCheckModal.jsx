// src/features/factory/components/QualityCheckModal.jsx
// محطة الفحص والرقابة المؤسسية لجودة الأزياء الراقية (Enterprise Apparel QC Inspection Station)

function QualityCheckModal(props) {
  const Modal = window.QualityAssuranceModal || window.QualityActionModal || window.QualityAssurance;
  if (!Modal || Modal === QualityCheckModal) return null;
  return <Modal {...props} />;
}

window.QualityCheckModal = QualityCheckModal;
