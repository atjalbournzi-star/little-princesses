// src/features/feedback/components/FeedbackModalsContainer.jsx
// حاوية النوافذ المنبثقة التفاعلية لمنظومة الجودة والتقييمات

function FeedbackModalsContainer({
  activeModalType,
  setActiveModalType,
  detailFeedbackItem,
  setDetailFeedbackItem,
  selectedCert,
  setSelectedCert,
  showFormulaModal,
  setShowFormulaModal,
  lineageDrawer,
  setLineageDrawer,
  customers = [],
  orders = [],
  products = [],
  feedbackForm,
  setFeedbackForm,
  handleCreateFeedback,
  masterEvalForm,
  setMasterEvalForm,
  handleCreateMasterEvaluation,
  inspectionForm,
  setInspectionForm,
  handleCreateInspection,
  defectForm,
  setDefectForm,
  handleCreateDefect,
  capaForm,
  setCapaForm,
  handleCreateCAPA,
  complaintForm,
  setComplaintForm,
  handleCreateComplaint,
  returnForm,
  setReturnForm,
  handleCreateReturn,
  metrics,
  currencyDisplay,
  isSubmitting,
  showToast
}) {
  const AddModal = window.AddFeedbackModal;
  const DetailModal = window.FeedbackDetailModal;
  const ModalsPart1 = window.QualityModalsPart1;
  const ModalsPart2 = window.QualityModalsPart2;
  const ModalsPart3 = window.QualityModalsPart3;
  const CertModal = window.QualityCertificateModal;
  const DrawerFormula = window.QualityDrawerAndFormula;

  return (
    <>
      {AddModal && (
        <AddModal
          isOpen={activeModalType === 'feedback'}
          onClose={() => setActiveModalType(null)}
          customers={customers}
          orders={orders}
          feedbackForm={feedbackForm}
          setFeedbackForm={setFeedbackForm}
          onSubmit={handleCreateFeedback}
          isSubmitting={isSubmitting}
        />
      )}

      {DetailModal && (
        <DetailModal
          feedbackItem={detailFeedbackItem}
          onClose={() => setDetailFeedbackItem(null)}
          showToast={showToast}
        />
      )}

      {ModalsPart1 && (
        <ModalsPart1
          activeModalType={activeModalType}
          onClose={() => setActiveModalType(null)}
          products={products}
          masterEvalForm={masterEvalForm}
          setMasterEvalForm={setMasterEvalForm}
          onSubmitMasterEval={handleCreateMasterEvaluation}
          inspectionForm={inspectionForm}
          setInspectionForm={setInspectionForm}
          onSubmitInspection={handleCreateInspection}
          isSubmitting={isSubmitting}
        />
      )}

      {ModalsPart2 && (
        <ModalsPart2
          activeModalType={activeModalType}
          onClose={() => setActiveModalType(null)}
          products={products}
          defectForm={defectForm}
          setDefectForm={setDefectForm}
          onSubmitDefect={handleCreateDefect}
          capaForm={capaForm}
          setCapaForm={setCapaForm}
          onSubmitCAPA={handleCreateCAPA}
          currencyDisplay={currencyDisplay}
          isSubmitting={isSubmitting}
        />
      )}

      {ModalsPart3 && (
        <ModalsPart3
          activeModalType={activeModalType}
          onClose={() => setActiveModalType(null)}
          complaintForm={complaintForm}
          setComplaintForm={setComplaintForm}
          onSubmitComplaint={handleCreateComplaint}
          returnForm={returnForm}
          setReturnForm={setReturnForm}
          onSubmitReturn={handleCreateReturn}
          currencyDisplay={currencyDisplay}
          isSubmitting={isSubmitting}
        />
      )}

      {CertModal && (
        <CertModal
          selectedCert={selectedCert}
          onClose={() => { setSelectedCert(null); setActiveModalType(null); }}
        />
      )}

      {DrawerFormula && (
        <DrawerFormula
          showFormulaModal={showFormulaModal}
          onCloseFormula={() => setShowFormulaModal(false)}
          metrics={metrics}
          lineageDrawer={lineageDrawer}
          onCloseLineage={() => setLineageDrawer(null)}
          currencyDisplay={currencyDisplay}
        />
      )}
    </>
  );
}

window.FeedbackModalsContainer = FeedbackModalsContainer;
