// src/features/Feedback.jsx
// المكون المجمع الرئيسي لمنظومة إدارة الجودة والمعلومات الذكية وتقييمات العملاء

const { useState } = React;

function Feedback({ 
  feedback = [], setFeedback, customers = [], setCustomers, products = [],
  orders = [], setOrders, factory = [], setFactory, inventory = [],
  purchases = [], expenses = [], setExpenses, journal = [], setJournal,
  employees = [], campaigns = [], showToast, currency 
}) {
  const useData = window.useFeedbackData || (() => ({}));
  const useActions = window.useFeedbackActions || (() => ({}));

  const data = useData({ feedback, setFeedback, orders, factory, expenses, purchases, products, employees, currency });
  const actions = useActions({
    feedback, setFeedback, masterEvaluations: data.masterEvaluations, setMasterEvaluations: data.setMasterEvaluations,
    inspections: data.inspections, setInspections: data.setInspections, defects: data.defects, setDefects: data.setDefects,
    complaints: data.complaints, setComplaints: data.setComplaints, returns: data.returns, setReturns: data.setReturns,
    correctiveActions: data.correctiveActions, setCorrectiveActions: data.setCorrectiveActions,
    setActiveModalType: data.setActiveModalType, showToast
  });

  const [detailFeedbackItem, setDetailFeedbackItem] = useState(null);

  const Header = window.FeedbackHeader;
  const FilterBar = window.FeedbackFilterBar;
  const StatsView = window.FeedbackStatsView;
  const List = window.FeedbackList;
  const ExecTab = window.FeedbackExecutiveTab;
  const ProfilesTab = window.FeedbackProfilesTab;
  const TeamTab = window.FeedbackTeamTab;
  const OpsViews = window.FeedbackOperationsViews;
  const ComplaintsTab = window.FeedbackComplaintsReturnsTab;
  const CapaTab = window.FeedbackCapaTab;
  const StandardsTab = window.FeedbackStandardsTab;
  const ModalsContainer = window.FeedbackModalsContainer;

  return (
    <div className="space-y-3.5 animate-fadeIn text-right" dir="rtl">
      {Header && (
        <Header
          metrics={data.metrics} purchases={purchases} currencyDisplay={data.currencyDisplay}
          timeframe={data.timeframe} setTimeframe={data.setTimeframe}
          onOpenModal={data.setActiveModalType}
          onShowFormula={() => data.setShowFormulaModal(true)}
          onShowLineage={data.setLineageDrawer}
        />
      )}

      {StatsView && (
        <StatsView
          alerts={data.prioritizedAlerts}
          onTriggerCapa={alert => {
            actions.setCapaForm(prev => ({ ...prev, problem: alert.title, action_description: alert.actionLabel }));
            data.setActiveModalType('capa');
          }}
        />
      )}

      {FilterBar && (
        <FilterBar
          activeTab={data.activeTab} setActiveTab={data.setActiveTab}
          search={data.search} setSearch={data.setSearch}
          filterStatus={data.filterStatus} setFilterStatus={data.setFilterStatus}
        />
      )}

      {/* 1. التبويب الأول: محطة الفحص الفني */}
      {data.activeTab === 'qc_station' && (
        window.QualityAssurance ? (
          <window.QualityAssurance 
            orders={orders} setOrders={setOrders} factory={factory} setFactory={setFactory} 
            employees={employees} customers={customers} showToast={showToast} currency={currency} 
          />
        ) : (
          <div className="p-8 text-center text-slate-400">جاري تحميل محطة الفحص الفني للأزياء...</div>
        )
      )}

      {/* 2. التبويب الثاني: سجل عمليات الفحص والعيوب */}
      {data.activeTab === 'inspections' && OpsViews && (
        <OpsViews
          activeTab="inspections" inspections={data.inspections} defects={data.defects} currencyDisplay={data.currencyDisplay}
          onOpenModal={data.setActiveModalType}
          onOpenCertModal={insp => { data.setSelectedCert(insp); data.setActiveModalType('certificate'); }}
        />
      )}

      {/* 3. التبويب الثالث: أداء الكادر ومراحل الورشة */}
      {data.activeTab === 'team' && TeamTab && (
        <TeamTab activeTab="team" tailorQualityProfiles={data.tailorQualityProfiles} departmentQualityScores={data.departmentQualityScores} />
      )}

      {/* 4. التبويب الرابع: جودة الخامات والموردين */}
      {data.activeTab === 'materials' && ProfilesTab && (
        <ProfilesTab activeTab="materials" fabricQualityProfiles={data.fabricQualityProfiles} />
      )}

      {ModalsContainer && (
        <ModalsContainer
          activeModalType={data.activeModalType} setActiveModalType={data.setActiveModalType}
          detailFeedbackItem={detailFeedbackItem} setDetailFeedbackItem={setDetailFeedbackItem}
          selectedCert={data.selectedCert} setSelectedCert={data.setSelectedCert}
          showFormulaModal={data.showFormulaModal} setShowFormulaModal={data.setShowFormulaModal}
          lineageDrawer={data.lineageDrawer} setLineageDrawer={data.setLineageDrawer}
          customers={customers} orders={orders} products={products} employees={employees} purchases={purchases}
          feedbackForm={actions.feedbackForm} setFeedbackForm={actions.setFeedbackForm} handleCreateFeedback={actions.handleCreateFeedback}
          masterEvalForm={actions.masterEvalForm} setMasterEvalForm={actions.setMasterEvalForm} handleCreateMasterEvaluation={actions.handleCreateMasterEvaluation}
          inspectionForm={actions.inspectionForm} setInspectionForm={actions.setInspectionForm} handleCreateInspection={actions.handleCreateInspection}
          defectForm={actions.defectForm} setDefectForm={actions.setDefectForm} handleCreateDefect={actions.handleCreateDefect}
          capaForm={actions.capaForm} setCapaForm={actions.setCapaForm} handleCreateCAPA={actions.handleCreateCAPA}
          complaintForm={actions.complaintForm} setComplaintForm={actions.setComplaintForm} handleCreateComplaint={actions.handleCreateComplaint}
          returnForm={actions.returnForm} setReturnForm={actions.setReturnForm} handleCreateReturn={actions.handleCreateReturn}
          metrics={data.metrics} currencyDisplay={data.currencyDisplay} isSubmitting={actions.isSubmitting} showToast={showToast}
        />
      )}
    </div>
  );
}

window.Feedback = Feedback;
