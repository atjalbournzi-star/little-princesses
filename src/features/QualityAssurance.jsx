// src/features/QualityAssurance.jsx
// محطة الفحص والرقابة المؤسسية لجودة الأزياء الراقية (Enterprise Apparel QC Station - Odoo/SAP PLM Style)

function QualityAssurance(props) {
  // استخدام الـ Hooks المعيارية لإدارة البيانات والعمليات
  const useData = window.useQualityStationData;
  const useActions = window.useQualityStationActions;
  const stationData = useData ? useData(props) : {};
  const stationActions = useActions ? useActions({ ...props, ...stationData }) : {};

  const TelemetryCards = window.QualityTelemetryCards;
  const GateCards = window.QualityGateCards;
  const LiveQueueTable = window.QualityLiveQueueTable;
  const ActionModal = window.QualityActionModal;

  // دعم الاستدعاء كمودال منفرد في حال تم تمرير qcModalData مباشرة من شاشة أخرى
  const LegacyModal = window.QualityAssuranceModal || window.QualityCheckModal;
  if (props.qcModalData && LegacyModal && LegacyModal !== QualityAssurance) {
    return <LegacyModal {...props} />;
  }

  return (
    <div className="space-y-4 animate-fadeIn text-right pb-10" dir="rtl">
      {/* رأس محطة الفحص المؤسسية */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#111C38] border border-slate-700/80 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">👑</span>
            <h1 className="text-lg font-black text-white tracking-wide">
              محطة الفحص الفني للأزياء الراقية
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              SAP PLM & Odoo Quality Standard
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            نظام رقابة الجودة التشغيلي: فحص الخامات الواردة، تدقيق درزات التجميع، واعتماد التسليم النهائي للفساتين الملكية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={stationData.refreshStats}
            className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition border border-slate-700/80 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>🔄</span>
            <span>تحديث المؤشرات</span>
          </button>
        </div>
      </div>

      {/* 1. بطاقات القياس الذكية والمؤشرات الحيوية للجودة (Top Telemetry & KPI Cards) */}
      {TelemetryCards && <TelemetryCards kpis={stationData.kpis} />}

      {/* 2. بوابات التفتيش الفني الثلاث (The 3 Operational Inspection Gate Cards) */}
      {GateCards && (
        <GateCards
          activeGate={stationData.activeGate}
          setActiveGate={stationData.setActiveGate}
          queue={stationData.queue}
        />
      )}

      {/* 3. طابور فحص القطع الفعلي عالي الكثافة (Live Inspection Queue Table) */}
      {LiveQueueTable && (
        <LiveQueueTable
          filteredQueue={stationData.filteredQueue}
          activeGate={stationData.activeGate}
          setActiveGate={stationData.setActiveGate}
          searchQuery={stationData.searchQuery}
          setSearchQuery={stationData.setSearchQuery}
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
