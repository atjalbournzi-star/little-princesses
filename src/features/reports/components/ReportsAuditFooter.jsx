// src/features/reports/components/ReportsAuditFooter.jsx

function ReportsAuditFooter({ brandProfile }) {
  return (
    <div className="mt-8 pt-6 border-t-2 border-dashed border-[#E8E5EA]">
      <div className="bg-white rounded-2xl border border-[#E8E5EA] p-6 shadow-2xs">
        <div className="text-center mb-6">
          <h4 className="text-xs font-bold text-[#25232A]">صندوق الاعتماد والتدقيق المالي الرسمي 🏛️</h4>
          <p className="text-[11px] text-[#6F6B75]">{brandProfile?.name || 'مؤسسة الأميرات الصغيرات'} — {brandProfile?.tagline || brandProfile?.shortName}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs">
          <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-8">
            <span className="block font-bold text-[#6F6B75]">إعداد وتجهيز المحاسب المالي</span>
            <div className="border-b border-dashed border-[#CCC] w-3/4 mx-auto"></div>
            <span className="block text-[10px] text-[#888]">التوقيع: ____________________</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-8">
            <span className="block font-bold text-[#6F6B75]">المراجعة والتدقيق المالي</span>
            <div className="border-b border-dashed border-[#CCC] w-3/4 mx-auto"></div>
            <span className="block text-[10px] text-[#888]">التوقيع: ____________________</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-8">
            <span className="block font-bold text-[#007F8C]">اعتماد وختم المدير العام</span>
            <div className="border-b border-dashed border-[#CCC] w-3/4 mx-auto"></div>
            <span className="block text-[10px] text-[#888]">الختم الرسمي المعتمد 🏢</span>
          </div>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.ReportsAuditFooter = ReportsAuditFooter;
}
