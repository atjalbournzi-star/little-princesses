// src/features/QualityAssurance.jsx
// محطة الفحص والرقابة المؤسسية لجودة الأزياء الراقية (Enterprise Apparel QC Station - Odoo/SAP PLM Style)

function QualityAssurance(props) {
  // استخدام الـ Hooks المعيارية لإدارة البيانات والعمليات
  const useData = window.useQualityStationData;
  const useActions = window.useQualityStationActions;
  const stationData = useData ? useData(props) : {};
  const stationActions = useActions ? useActions({ ...props, ...stationData }) : {};

  const GateCards = window.QualityGateCards;
  const LiveQueueTable = window.QualityLiveQueueTable;
  const ActionModal = window.QualityActionModal;

  // دعم الاستدعاء كمودال منفرد في حال تم تمرير qcModalData مباشرة من شاشة أخرى
  const LegacyModal = window.QualityAssuranceModal || window.QualityCheckModal;
  if (props.qcModalData && LegacyModal && LegacyModal !== QualityAssurance) {
    return <LegacyModal {...props} />;
  }

  return (
    <div className="space-y-3 animate-fadeIn text-right pb-2" dir="rtl">
      {/* 1. بوابات التفتيش الفني الثلاث (The 3 Operational Inspection Gate Cards) */}
      {GateCards && (
        <GateCards
          activeGate={stationData.activeGate}
          setActiveGate={stationData.setActiveGate}
          queue={stationData.queue}
        />
      )}

      {/* 2. طابور فحص القطع الفعلي عالي الكثافة (Live Inspection Queue Table) */}
      {LiveQueueTable && (
        <LiveQueueTable
          filteredQueue={stationData.filteredQueue}
          activeGate={stationData.activeGate}
          setActiveGate={stationData.setActiveGate}
          searchQuery={stationData.searchQuery}
          setSearchQuery={stationData.setSearchQuery}
          onRefreshQueue={stationData.refreshStats}
          onStartInspection={stationActions.handleStartInspection}
        />
      )}

      {/* 4. نافذة الفحص الفني واعتماد الجودة أو إصدار تذكرة التعديل (Direct Action Modal) */}
      {stationData.selectedInspection && ActionModal && (
        <ActionModal
          item={stationData.selectedInspection}
          onClose={stationActions.handleCloseInspection}
          isSubmitting={stationActions.isSubmitting}
          showReworkDrawer={stationActions.showReworkDrawer}
          setShowReworkDrawer={stationActions.setShowReworkDrawer}
          defectReason={stationActions.defectReason}
          setDefectReason={stationActions.setDefectReason}
          reworkAction={stationActions.reworkAction}
          setReworkAction={stationActions.setReworkAction}
          reworkHours={stationActions.reworkHours}
          setReworkHours={stationActions.setReworkHours}
          onApprove={stationActions.handleApproveInspection}
          onRework={stationActions.handleReworkInspection}
        />
      )}
    </div>
  );
}

window.QualityAssurance = QualityAssurance;
window.QualityAssuranceStation = QualityAssurance;
