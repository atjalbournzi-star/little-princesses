// src/features/reports/components/ReportsPrintHeader.jsx

function ReportsPrintHeader({ brandProfile, getTabTitle, dateRange, reportCurrency }) {
  return (
    <div className="print-only mb-6 border-b-2 border-[#25232A] pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {brandProfile?.logoUrl ? (
            <img src={brandProfile.logoUrl} alt="Logo" className="h-14 max-w-[150px] object-contain" />
          ) : (
            <div className="text-3xl">{brandProfile?.systemIcon || '🏢'}</div>
          )}
          <div>
            <h1 className="text-xl font-bold text-[#000000]">{brandProfile?.name || 'مؤسسة الأميرات الصغيرات'}</h1>
            <p className="text-xs text-[#555555]">{brandProfile?.tagline || brandProfile?.shortName}</p>
            <h2 className="text-base font-bold text-[#007F8C] mt-1.5">{getTabTitle ? getTabTitle() : ''}</h2>
          </div>
        </div>
        <div className="text-left text-xs text-[#444444] space-y-1">
          <p><strong>تاريخ الاستخراج:</strong> {(typeof window !== 'undefined' && window.TODAY_STR_ISO) || new Date().toISOString().split('T')[0]}</p>
          <p><strong>نطاق الفترة:</strong> من {dateRange?.start || 'البداية'} إلى {dateRange?.end || 'اليوم'}</p>
          <p><strong>العملة المعتمدة:</strong> {reportCurrency}</p>
          {brandProfile?.commercialRegister && (
            <p><strong>السجل التجاري:</strong> {brandProfile.commercialRegister}</p>
          )}
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.ReportsPrintHeader = ReportsPrintHeader;
}
