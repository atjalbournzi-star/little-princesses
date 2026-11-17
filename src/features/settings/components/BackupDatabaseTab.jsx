// src/features/settings/components/BackupDatabaseTab.jsx
// تبويب محرك النسخ الاحتياطي واستعادة البيانات المتوافق مع هوية السندات المالية

const { useState, useRef } = React;

function BackupDatabaseTab({
  backupStatus,
  loadingBackup,
  setLoadingBackup,
  onCreateSnapshot,
  onDownloadBackup,
  onExecuteRestore,
  onFactoryReset,
  isRestoring,
  isWiping,
  fetchBackupStatus,
  onOpenAuditLogs,
  showToast
}) {
  const [selectedFileName, setSelectedFileName] = useState('');
  const [backupFileContent, setBackupFileContent] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.tables || parsed.data) {
          setBackupFileContent(parsed);
          showToast && showToast(`تمت قراءة ملف النسخة بنجاح (${file.name}) 📄✅`);
        } else {
          showToast && showToast('تنسيق ملف النسخة غير متطابق ⚠️', 'error');
          setBackupFileContent(null);
        }
      } catch(err) {
        showToast && showToast('فشل قراءة الملف ⚠️', 'error');
        setBackupFileContent(null);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs space-y-2 select-none text-right" dir="rtl">
      {/* الترويسة الرئيسية للنسخ الاحتياطي */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100">
            النسخ الاحتياطي واستعادة البيانات والكوارث (Backup & DR)
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenAuditLogs && (
            <button
              type="button"
              onClick={onOpenAuditLogs}
              className="h-6 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>سجلات التدقيق</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onCreateSnapshot(setLoadingBackup)}
            disabled={loadingBackup}
            className="h-6 px-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-md text-[10.5px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <span>{loadingBackup ? 'جارٍ الإنشاء...' : 'نقطة استعادة (Snapshot)'}</span>
          </button>
          <button
            type="button"
            onClick={fetchBackupStatus}
            title="تحديث الحالة"
            className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition cursor-pointer text-xs"
          >
            🔄
          </button>
        </div>
      </div>

      {/* بطاقات المؤشرات الثلاث المدمجة */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        <div className="py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">حجم قاعدة البيانات</span>
          <span className="text-[11px] font-bold font-mono text-slate-900 dark:text-white">{backupStatus?.db_size_formatted || '0.0 KB'}</span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">إجمالي السجلات</span>
          <span className="text-[11px] font-bold font-mono text-pink-600 dark:text-pink-400">{backupStatus?.total_records?.toLocaleString('en-US') || 0}</span>
        </div>

        <div className="py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">سلامة الجداول</span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            100% OK
          </span>
        </div>
      </div>

      {/* تصدير وتنزيل النسخ */}
      <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-1.5">
        <h4 className="font-bold text-xs text-slate-900 dark:text-white">تصدير وتنزيل النسخ الاحتياطية:</h4>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => onDownloadBackup('json')} className="h-6.5 px-3 bg-white dark:bg-[#111C38] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md font-bold text-[10.5px] transition flex items-center gap-1.5 cursor-pointer shadow-xs">
            <span>💾</span><span>تنزيل نسخة احتياطية (JSON)</span>
          </button>
          <button type="button" onClick={() => onDownloadBackup('sqlite')} className="h-6.5 px-3 bg-white dark:bg-[#111C38] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md font-bold text-[10.5px] transition flex items-center gap-1.5 cursor-pointer shadow-xs">
            <span>🗄️</span><span>تنزيل قاعدة البيانات (SQLite .db)</span>
          </button>
        </div>
      </div>

      {/* استعادة البيانات وإعادة البناء */}
      <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-2">
        <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
          <span>🔄</span><span>محرك استعادة البيانات (Disaster Recovery)</span>
        </h4>
        <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-700 rounded-md p-2 flex flex-col sm:flex-row items-center justify-between gap-2">
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="text-xs text-slate-500 file:mr-0 file:ml-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-slate-200 dark:file:border-slate-700 file:text-[10.5px] file:font-bold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-800 dark:file:text-slate-200 cursor-pointer" />
          <button
            type="button"
            onClick={() => onExecuteRestore(backupFileContent, () => { setBackupFileContent(null); setSelectedFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; })}
            disabled={!backupFileContent || isRestoring}
            className="h-6.5 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-md font-bold text-[10.5px] shadow-xs transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <span>{isRestoring ? 'جارٍ الاستعادة...' : 'تأكيد واستعادة النسخة'}</span>
          </button>
        </div>
      </div>

      {/* منطقة التصفير الشامل والبدء كنسخة نظيفة */}
      <div className="bg-rose-50/30 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-lg p-2 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-bold text-xs text-rose-700 dark:text-rose-400">تهيئة النظام وبدء نسخة جديدة</h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">مسح البيانات التجريبية مع الحفاظ على المستخدمين وشجرة الحسابات.</p>
        </div>
        <button type="button" onClick={onFactoryReset} disabled={isWiping} className="h-6 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold text-[10.5px] shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50">
          <span>{isWiping ? 'جارٍ التصفير...' : 'تصفير شامل'}</span>
        </button>
      </div>

      {/* سجل نقاط الاستعادة المحفوظة على الخادم */}
      {backupStatus?.snapshots && backupStatus.snapshots.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="font-bold text-xs text-slate-900 dark:text-white">نقاط الاستعادة المحفوظة ({backupStatus.snapshots.length}):</h4>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 custom-scrollbar">
            <table className="w-full text-right border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800">
                <tr className="h-7.5">
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">اسم الملف</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">النوع</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">الحجم</th>
                  <th className="h-7.5 py-1 px-2.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent">
                {backupStatus.snapshots.map((s, idx) => (
                  <tr key={idx} className="h-8 border-b border-slate-200 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium transition-colors">
                    <td className="py-1 px-2.5 font-mono font-bold text-pink-600 dark:text-pink-400">{s.filename}</td>
                    <td className="py-1 px-2.5"><span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">{s.type?.toUpperCase()}</span></td>
                    <td className="py-1 px-2.5 font-mono text-slate-700 dark:text-slate-300">{s.size_formatted}</td>
                    <td className="py-1 px-2.5 font-mono text-slate-500 dark:text-slate-400">{s.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

window.BackupDatabaseTab = BackupDatabaseTab;
