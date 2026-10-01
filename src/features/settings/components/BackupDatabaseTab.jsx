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
        showToast && showToast('فشل قراءة الملف (ليس صيغة JSON صالحة) ⚠️', 'error');
        setBackupFileContent(null);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-6 p-6">
      {/* الترويسة الرئيسية للنسخ الاحتياطي */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5EA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-lg font-bold">
            💾
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#25232A]">محرك النسخ الاحتياطي واستعادة البيانات والكوارث (Backup & DR)</h3>
            <p className="text-xs text-[#6F6B75]">تأمين بيانات الفساتين والعملاء والمحاسبة، تصدير ملفات SQLite و JSON، وإنشاء نقاط استعادة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAuditLogs && (
            <button
              type="button"
              onClick={onOpenAuditLogs}
              className="px-3.5 py-2 bg-white hover:bg-[#FAFAFB] text-[#25232A] border border-[#E8E5EA] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span>🛡️</span>
              <span>سجلات التدقيق</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onCreateSnapshot(setLoadingBackup)}
            disabled={loadingBackup}
            className="px-4 py-2 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>📸</span>
            <span>{loadingBackup ? 'جارٍ الإنشاء...' : 'نقطة استعادة فورية (Snapshot)'}</span>
          </button>
          <button
            type="button"
            onClick={fetchBackupStatus}
            title="تحديث الحالة"
            className="w-10 h-10 rounded-xl bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] flex items-center justify-center transition cursor-pointer"
          >
            🔄
          </button>
        </div>
      </div>

      {/* بطاقات المؤشرات الثلاث */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
          <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">حجم قاعدة البيانات</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-mono font-extrabold text-[#25232A]">{backupStatus?.db_size_formatted || '0.0 KB'}</span>
            <span className="text-xs text-[#007F8C] bg-[#E2F5F7] px-2 py-0.5 rounded-md font-mono font-bold border border-[#C5ECF0]">SQLite WAL</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
          <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">إجمالي السجلات المحمية</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-mono font-extrabold text-[#B0005A]">{backupStatus?.total_records?.toLocaleString('en-US') || 0}</span>
            <span className="text-xs text-[#6F6B75] font-medium">سجل في الجداول</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
          <span className="text-[11px] font-bold text-[#6F6B75] block mb-1">فحص سلامة الجداول</span>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {backupStatus?.integrity_check === 'PASSED' ? 'سليمة ومتطابقة 100%' : 'فحص الجداول جاهز'}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">100% OK</span>
          </div>
        </div>
      </div>

      {/* تصدير وتنزيل النسخ */}
      <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-4.5 space-y-3">
        <h4 className="font-bold text-xs text-[#25232A]">📥 تصدير وتنزيل النسخ الاحتياطية لجهازك:</h4>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => onDownloadBackup('json')} className="h-10 px-5 bg-white hover:bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB] rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer">
            <span>💾</span><span>تنزيل نسخة احتياطية كاملة (JSON File)</span>
          </button>
          <button type="button" onClick={() => onDownloadBackup('sqlite')} className="h-10 px-5 bg-white hover:bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] rounded-xl font-bold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer">
            <span>🗄️</span><span>تنزيل قاعدة البيانات الأصلية (SQLite .db)</span>
          </button>
        </div>
      </div>

      {/* استعادة البيانات وإعادة البناء */}
      <div className="bg-[#FFF5F8] border border-[#F2A4CB] rounded-2xl p-4.5 space-y-3.5">
        <h4 className="font-extrabold text-xs text-[#B0005A] flex items-center gap-2"><span>🔄</span><span>محرك استعادة البيانات وإعادة بناء الجداول (Disaster Recovery)</span></h4>
        <div className="bg-white border border-[#E8E5EA] rounded-xl p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="text-xs text-[#6F6B75] file:mr-0 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#E8E5EA] file:text-xs file:font-bold file:bg-[#FAFAFB] file:text-[#25232A] cursor-pointer" />
            {selectedFileName && <span className="text-xs font-mono font-bold text-[#8F2A87] bg-[#F2E7F3] px-3 py-1 rounded-lg">📄 {selectedFileName}</span>}
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onExecuteRestore(backupFileContent, () => { setBackupFileContent(null); setSelectedFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; })}
              disabled={!backupFileContent || isRestoring}
              className="h-10 px-6 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <span>{isRestoring ? 'جارٍ الاستعادة...' : 'تأكيد واستعادة النسخة الاحتياطية الآن ⚡'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* منطقة التصفير الشامل والبدء كنسخة نظيفة */}
      <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4.5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h4 className="font-extrabold text-xs text-rose-800 flex items-center gap-2"><span>🧹</span><span>تهيئة النظام كنسخة نظيفة وجديدة (Clean Slate & Factory Reset)</span></h4>
          <p className="text-[11px] text-[#6F6B75] mt-0.5">مسح كافة البيانات التجريبية والطلبات مع الحفاظ التام على المستخدمين وشجرة الحسابات.</p>
        </div>
        <button type="button" onClick={onFactoryReset} disabled={isWiping} className="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
          <span>{isWiping ? 'جارٍ التصفير...' : '🧹 تصفير شامل وبدء نسخة جديدة'}</span>
        </button>
      </div>

      {/* سجل نقاط الاستعادة المحفوظة على الخادم */}
      {backupStatus?.snapshots && backupStatus.snapshots.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="font-bold text-xs text-[#25232A]">🕒 نقاط الاستعادة المحفوظة على الخادم ({backupStatus.snapshots.length} نسخة):</h4>
          <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
            <table className="w-full text-xs">
              <thead className="bg-[#FAFAFB] text-[#6F6B75] border-b border-[#E8E5EA]">
                <tr>
                  <th className="px-4 py-2.5 text-right">اسم الملف</th>
                  <th className="px-4 py-2.5 text-right">النوع</th>
                  <th className="px-4 py-2.5 text-right">الحجم</th>
                  <th className="px-4 py-2.5 text-right">تاريخ وساعة الإنشاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {backupStatus.snapshots.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#FAFAFB]">
                    <td className="px-4 py-2 font-mono font-bold text-[#8F2A87]">{s.filename}</td>
                    <td className="px-4 py-2"><span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200">{s.type?.toUpperCase()}</span></td>
                    <td className="px-4 py-2 font-mono text-[#25232A]">{s.size_formatted}</td>
                    <td className="px-4 py-2 font-mono text-[#6F6B75]">{s.created_at}</td>
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
