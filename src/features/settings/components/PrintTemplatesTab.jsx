// src/features/settings/components/PrintTemplatesTab.jsx
// تبويب تخصيص قوالب الطباعة والفواتير المتوافق مع هوية السندات المالية

const { useState } = React;

function PrintTemplatesTab({
  printConfig,
  setPrintConfig,
  formData,
  showToast
}) {
  const [config, setConfig] = useState(printConfig || {
    thermalWidth: '80mm',
    paperSize: 'A4',
    showLogo: true,
    showQr: true,
    footerText: 'شكراً لتعاملكم الراقي مع دار الأميرات الصغيرات 🎀',
    showTerms: true
  });
  const [selectedPreview, setSelectedPreview] = useState('thermal');

  const handleSave = () => {
    setPrintConfig(config);
    try {
      localStorage.setItem('erp_print_config', JSON.stringify(config));
      showToast && showToast('تم حفظ إعدادات قوالب الطباعة بنجاح 🖨️✅');
    } catch(e) {
      showToast && showToast('تعذر الحفظ محلياً', 'error');
    }
  };

  const templates = [
    { id: 'thermal', name: 'الفاتورة الحرارية (80mm)', desc: 'إيصال حراري سريع لنقاط البيع' },
    { id: 'a4', name: 'الفاتورة الرسمية (A4)', desc: 'فاتورة رسمية مفصلة بالمقاسات' },
    { id: 'job_ticket', name: 'بطاقة أمر التشغيل', desc: 'تذكرة تفصيل شاملة لمواصفات الفستان' }
  ];

  return (
    <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs space-y-2 select-none text-right" dir="rtl">
      {/* رأس التبويب الموحد */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <h3 className="font-bold text-[11.5px] text-slate-800 dark:text-slate-100">
            تخصيص قوالب الطباعة والفواتير وبطاقات التشغيل
          </h3>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="h-6 px-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-md font-medium text-[10.5px] shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>💾</span>
          <span>حفظ إعدادات القوالب</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* عمود خيارات التخصيص */}
        <div className="lg:col-span-7 space-y-2">
          <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-1.5">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white">أنواع القوالب المدعومة</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedPreview(t.id)}
                  className={`p-2 rounded-lg border cursor-pointer transition ${
                    selectedPreview === t.id
                      ? 'border-pink-500 bg-white dark:bg-[#111C38] ring-1 ring-pink-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] hover:border-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{t.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white">عناصر وترويسة الفاتورة</h4>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.showLogo} onChange={e => setConfig({...config, showLogo: e.target.checked})} className="rounded text-pink-600" />
                <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">إظهار شعار المنشأة الرسمي في الترويسة</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.showQr} onChange={e => setConfig({...config, showQr: e.target.checked})} className="rounded text-pink-600" />
                <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">تضمين باركود التحقق الرقمي (QR Code) المتوافق</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={config.showTerms} onChange={e => setConfig({...config, showTerms: e.target.checked})} className="rounded text-pink-600" />
                <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">إظهار شروط وسياسة الاستبدال والبروفات</span>
              </label>
            </div>

            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800">
              <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">نص التذييل / رسالة الشكر في أسفل السند:</label>
              <textarea
                rows={2}
                value={config.footerText}
                onChange={e => setConfig({...config, footerText: e.target.value})}
                className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C38] text-slate-900 dark:text-white outline-none text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* عمود المعاينة المباشرة */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 flex flex-col items-center justify-center">
          <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">معاينة مباشرة للقالب ({selectedPreview.toUpperCase()})</span>
          <div className="w-full max-w-[240px] bg-white dark:bg-[#111C38] p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs text-center text-xs space-y-2 font-mono">
            {config.showLogo && (
              <div className="text-xs font-bold text-slate-900 dark:text-white">👑 {formData?.companyName || 'دار الأميرات الصغيرات'}</div>
            )}
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{formData?.tagline || 'أزياء فاخرة'} - {formData?.phone || '776773458'}</div>
            <div className="border-b border-dashed border-slate-200 dark:border-slate-700 pb-1.5 text-[10px]">فاتورة مبيعات #ORD-2026-001</div>
            <div className="text-right text-[10px] space-y-0.5">
              <div className="flex justify-between"><span>العميل:</span><span className="font-sans font-bold">سمو الأميرة</span></div>
              <div className="flex justify-between"><span>الموديل:</span><span className="font-sans font-bold">فستان ملكي لؤلؤي</span></div>
              <div className="flex justify-between"><span>الإجمالي:</span><span className="font-bold">45,000 YER</span></div>
            </div>
            {config.showQr && (
              <div className="pt-1 flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-100 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg rounded">🏁</div>
                <span className="text-[8.5px] text-slate-500 dark:text-slate-400 mt-0.5 font-sans">فحص التحقق الرقمي</span>
              </div>
            )}
            <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-1 text-[9px] text-slate-500 dark:text-slate-400 font-sans">
              {config.footerText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.PrintTemplatesTab = PrintTemplatesTab;
