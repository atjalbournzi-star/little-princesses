const { useState } = React;

function Settings({ showToast, currency }) {
  const [activeTab, setActiveTab] = useState('company');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // ── استدعاء الـ Hooks المعمارية ──
  const useData = window.useSettingsData || (() => ({}));
  const useActions = window.useSettingsActions || (() => ({}));

  const data = useData({ showToast });
  const {
    formData, setFormData, themeMode, setThemeMode, sarRate, setSarRate,
    usdRate, setUsdRate, fallbackCurrencyOpts, localCurrency, setLocalCurrency,
    backupStatus, loadingBackup, setLoadingBackup, auditLogs, setAuditLogs,
    totalLogs, setTotalLogs, loadingAudit, setLoadingAudit, auditFilter,
    setAuditFilter, usersList, loadingUsers, printConfig, setPrintConfig,
    messageTemplates, setMessageTemplates, fetchUsers, fetchBackupStatus
  } = data;

  const actions = useActions({
    formData, setFormData, themeMode, setThemeMode, sarRate, usdRate,
    localCurrency, fetchBackupStatus, fetchUsers, setAuditLogs, setTotalLogs,
    setLoadingAudit, showToast
  });

  const {
    isSaving, isRestoring, isWiping, applyTheme, handleSaveProfile,
    handleCreateSnapshot, handleDownloadBackup, handleExecuteRestore,
    handleFactoryReset, fetchAuditLogs, handleSaveUser, handleDeleteUser
  } = actions;

  // ── استدعاء المكونات الفرعية بأمان ──
  const HeaderComp = window.SettingsHeader;
  const CompanyTab = window.CompanyProfileTab;
  const UsersTab = window.UsersPermissionsTab;
  const CurrenciesTab = window.CurrenciesSettingsTab;
  const TemplatesTab = window.PrintTemplatesTab;
  const IntegrationsTab = window.IntegrationsSettingsTab;
  const BackupTab = window.BackupDatabaseTab;
  const AuditModal = window.AuditLogsModal;

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      {/* الترويسة الرئيسية وشريط التبويبات */}
      {HeaderComp && (
        <HeaderComp
          activeTab={activeTab === 'general' ? 'company' : activeTab}
          setActiveTab={setActiveTab}
          backupStatus={backupStatus}
          usersCount={usersList?.length || 0}
          totalLogs={totalLogs}
          onOpenAuditLogs={() => setIsAuditModalOpen(true)}
        />
      )}

      {/* 1. تبويب هوية المنشأة والمظهر */}
      {(activeTab === 'company' || activeTab === 'general') && CompanyTab && (
        <CompanyTab
          formData={formData} setFormData={setFormData} themeMode={themeMode}
          applyTheme={applyTheme} onSave={handleSaveProfile} isSaving={isSaving} showToast={showToast}
        />
      )}

      {/* 2. تبويب المستخدمين والصلاحيات (RBAC) */}
      {activeTab === 'users' && UsersTab && (
        <UsersTab
          usersList={usersList} loadingUsers={loadingUsers}
          onSaveUser={handleSaveUser} onDeleteUser={handleDeleteUser} showToast={showToast}
        />
      )}

      {/* 3. تبويب العملات وأسعار الصرف */}
      {activeTab === 'currencies' && CurrenciesTab && (
        <CurrenciesTab
          localCurrency={localCurrency} setLocalCurrency={setLocalCurrency}
          fallbackCurrencyOpts={fallbackCurrencyOpts} sarRate={sarRate} setSarRate={setSarRate}
          usdRate={usdRate} setUsdRate={setUsdRate} onSave={handleSaveProfile}
          isSaving={isSaving} showToast={showToast}
        />
      )}

      {/* 4. تبويب قوالب الطباعة والفواتير */}
      {activeTab === 'templates' && TemplatesTab && (
        <TemplatesTab
          printConfig={printConfig} setPrintConfig={setPrintConfig}
          formData={formData} showToast={showToast}
        />
      )}

      {/* 5. تبويب تكاملات WhatsApp والإشعارات */}
      {activeTab === 'integrations' && IntegrationsTab && (
        <IntegrationsTab
          messageTemplates={messageTemplates} setMessageTemplates={setMessageTemplates} showToast={showToast}
        />
      )}

      {/* 6. تبويب النسخ الاحتياطي والكوارث */}
      {(activeTab === 'backup' || activeTab === 'audit') && BackupTab && (
        <BackupTab
          backupStatus={backupStatus} loadingBackup={loadingBackup} setLoadingBackup={setLoadingBackup}
          onCreateSnapshot={handleCreateSnapshot} onDownloadBackup={handleDownloadBackup}
          onExecuteRestore={handleExecuteRestore} onFactoryReset={handleFactoryReset}
          isRestoring={isRestoring} isWiping={isWiping} fetchBackupStatus={fetchBackupStatus}
          onOpenAuditLogs={() => setIsAuditModalOpen(true)} showToast={showToast}
        />
      )}

      {/* نافذة سجلات التدقيق المنبثقة */}
      {AuditModal && (
        <AuditModal
          isOpen={isAuditModalOpen || activeTab === 'audit'} onClose={() => setIsAuditModalOpen(false)}
          auditLogs={auditLogs} totalLogs={totalLogs} loadingAudit={loadingAudit}
          auditFilter={auditFilter} setAuditFilter={setAuditFilter} fetchAuditLogs={fetchAuditLogs}
        />
      )}
    </div>
  );
}

window.Settings = Settings;
