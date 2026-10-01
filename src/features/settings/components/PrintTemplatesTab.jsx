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
    { id: 'thermal', name: 'الفاتورة الحرارية (80mm POS)', icon: '🧾', desc: 'إيصال حراري سريع للمعارض ونقاط البيع' },
    { id: 'a4', name: 'الفاتورة الرسمية (A4 Format)', icon: '📄', desc: 'فاتورة رسمية مفصلة بالمقاسات والبنود المعتمدة' },
    { id: 'job_ticket', name: 'بطاقة أمر التشغيل (Job Card)', icon: '🧵', desc: 'تذكرة تفصيل شاملة لمواصفات الفستان والأقمشة للمعمل' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5EA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF1DC] text-[#F28A00] border border-[#FFE4B9] flex items-center justify-center text-lg font-bold">
            🖨️
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#25232A]">تخصيص قوالب الطباعة والفواتير وبطاقات التشغيل</h3>
            <p className="text-xs text-[#6F6B75]">تهيئة الإيصالات الحرارية 80mm، المقاسات، باركود QR، وتذييل السندات</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="h-10 px-6 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <span>💾</span>
          <span>حفظ إعدادات القوالب</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* عمود خيارات التخصيص */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-4.5 space-y-4">
            <h4 className="font-bold text-xs text-[#25232A]">أنواع القوالب المدعومة</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedPreview(t.id)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition ${
                    selectedPreview === t.id ? 'border-[#B0005A] bg-white ring-2 ring-[#FCE8F2]' : 'border-[#E8E5EA] bg-white hover:border-[#F2A4CB]'
                  }`}
                >
                  <div className="text-xl mb-1">{t.icon}</div>
                  <div className="font-bold text-xs text-[#25232A]">{t.name}</div>
                  <div className="text-[10px] text-[#6F6B75] mt-1">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-4.5 space-y-3.5 text-xs">
            <h4 className="font-bold text-[#25232A]">عناصر وترويسة الفاتورة</h4>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={config.showLogo} onChange={e => setConfig({...config, showLogo: e.target.checked})} className="rounded text-[#B0005A]" />
                <span className="font-bold text-[#25232A]">إظهار شعار المنشأة الرسمي في الترويسة</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={config.showQr} onChange={e => setConfig({...config, showQr: e.target.checked})} className="rounded text-[#B0005A]" />
                <span className="font-bold text-[#25232A]">تضمين باركود التحقق الرقمي (QR Code) المتوافق</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={config.showTerms} onChange={e => setConfig({...config, showTerms: e.target.checked})} className="rounded text-[#B0005A]" />
                <span className="font-bold text-[#25232A]">إظهار شروط وسياسة الاستبدال والبروفات</span>
              </label>
            </div>

            <div className="pt-2">
              <label className="block font-bold text-[#25232A] mb-1">نص التذييل / رسالة الشكر في أسفل السند:</label>
              <textarea
                rows={2}
                value={config.footerText}
                onChange={e => setConfig({...config, footerText: e.target.value})}
                className="w-full p-2.5 rounded-xl border border-[#E8E5EA] bg-white outline-none text-xs"
              />
            </div>
          </div>
        </div>

        {/* عمود المعاينة المباشرة */}
        <div className="lg:col-span-5 bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold text-[#6F6B75] mb-2">معاينة مباشرة للقالب ({selectedPreview.toUpperCase()})</span>
          <div className="w-full max-w-[280px] bg-white p-4 rounded-xl border border-[#E8E5EA] shadow-sm text-center text-xs space-y-3 font-mono">
            {config.showLogo && (
              <div className="text-xl">👑 {formData?.companyName || 'دار الأميرات الصغيرات'}</div>
            )}
            <div className="text-[11px] text-[#6F6B75]">{formData?.tagline || 'أزياء فاخرة'} - {formData?.phone || '776773458'}</div>
            <div className="border-b border-dashed border-[#E8E5EA] pb-2">فاتورة مبيعات رقم #ORD-2026-001</div>
            <div className="text-right text-[11px] space-y-1">
              <div className="flex justify-between"><span>العميلة:</span><span className="font-sans font-bold">سمو الأميرة</span></div>
              <div className="flex justify-between"><span>الموديل:</span><span className="font-sans font-bold">فستان ملكي لؤلؤي</span></div>
              <div className="flex justify-between"><span>الإجمالي:</span><span className="font-bold">45,000 YER</span></div>
            </div>
            {config.showQr && (
              <div className="pt-2 flex flex-col items-center">
                <div className="w-16 h-16 bg-[#FAFAFB] border border-[#E8E5EA] flex items-center justify-center text-2xl rounded-lg">🏁</div>
                <span className="text-[9px] text-[#6F6B75] mt-1 font-sans">فحص التحقق الرقمي</span>
              </div>
            )}
            <div className="border-t border-dashed border-[#E8E5EA] pt-2 text-[10px] text-[#6F6B75] font-sans">
              {config.footerText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.PrintTemplatesTab = PrintTemplatesTab;
