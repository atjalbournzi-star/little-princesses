// src/features/feedback/components/QualityCertificateModal.jsx
// بطاقة اعتماد الجودة والمطابقة الفاخرة للطباعة مع الختم الملكي

function QualityCertificateModal({
  selectedCert,
  onClose
}) {
  if (!selectedCert) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#F2A4CB] p-6 space-y-5 max-h-[95vh] overflow-y-auto print:m-0 print:p-8 print:max-w-none print:shadow-none print:border-none">
        
        {/* Certificate Header */}
        <div className="text-center pb-4 border-b border-[#FCE8F2] relative">
          <button onClick={onClose} className="absolute left-0 top-0 text-[#6F6B75] hover:text-[#25232A] font-bold print:hidden cursor-pointer">✕</button>
          <div className="w-12 h-12 mx-auto bg-[#FCE8F2] text-[#B0005A] rounded-2xl flex items-center justify-center text-2xl mb-2 shadow-xs">
            👑
          </div>
          <h2 className="font-extrabold text-base text-[#25232A]">مؤسسة ومعمل الأميرات الصغيرات</h2>
          <p className="text-[11px] text-[#B0005A] font-bold tracking-wider">LITTLE PRINCESSES LUXURY ATELIER</p>
          <div className="inline-block mt-2 px-3 py-1 bg-[#E2F5F7] text-[#007F8C] rounded-full text-[11px] font-extrabold border border-[#C5ECF0]">
            🎖️ بطاقة اعتماد الجودة والمطابقة الفاخرة (Quality Pass)
          </div>
        </div>

        {/* Dress & Inspection Info */}
        <div className="bg-[#FAFAFB] p-4 rounded-2xl border border-[#E8E5EA] space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#6F6B75]">الموديل / الفستان:</span>
            <span className="font-bold text-[#25232A]">{selectedCert.product_name || 'فستان الأميرات الراقي'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6F6B75]">رقم الفحص المعتمد:</span>
            <span className="font-mono font-bold text-[#8F2A87]">#{selectedCert.inspection_id || selectedCert.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6F6B75]">تاريخ الفحص والاعتماد:</span>
            <span className="font-mono font-bold text-[#25232A]">{String(selectedCert.inspection_date || selectedCert.created_at || '').split('T')[0]}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6F6B75]">المفتش الفني المسؤول:</span>
            <span className="font-bold text-[#007F8C]">{selectedCert.inspector_name || 'إدارة ضبط الجودة'}</span>
          </div>
        </div>

        {/* Checkpoints Checklist */}
        <div className="space-y-2 text-xs">
          <div className="font-bold text-[#25232A] text-[11.5px]">المعايير المعتمدة والمطابقة:</div>
          <div className="space-y-1.5 bg-[#FCE8F2]/20 p-3.5 rounded-xl border border-[#F2A4CB]/50">
            <div className="flex items-center gap-2 text-emerald-800">
              <span>✅</span>
              <span>مطابقة تامة للمقاسات المعتمدة والباترون الفاخر.</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-800">
              <span>✅</span>
              <span>متانة الخياطة، نظافة الغرز الداخلية، والدرزات الفرنسية.</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-800">
              <span>✅</span>
              <span>سلامة البطانة الناعمة والراحة التامة لبشرة الأميرة.</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-800">
              <span>✅</span>
              <span>سلاسة السحاب المخفي وتثبيت الأزرار والإكسسوارات بدقة.</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-800">
              <span>✅</span>
              <span>الكي بالبخار والتعقيم والتغليف الملكي الأنيق.</span>
            </div>
          </div>
        </div>

        {/* Official Atelier Stamp */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E8E5EA] text-[11px]">
          <div>
            <div className="text-[#6F6B75]">ختم الجودة والاعتماد:</div>
            <div className="font-bold text-[#B0005A] text-xs mt-0.5">APPROVED • معتمد 100%</div>
          </div>
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#B0005A] flex flex-col items-center justify-center text-[9px] text-[#B0005A] font-bold rotate-[-12deg] bg-[#FCE8F2]/40">
            <span>👑</span>
            <span>فحص معتمد</span>
            <span className="font-mono text-[8px]">PASS</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E8E5EA] print:hidden">
          <button type="button" onClick={onClose} className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA] cursor-pointer">إغلاق</button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-6 py-2.5 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🖨️ طباعة بطاقة الجودة</span>
          </button>
        </div>

      </div>
    </div>
  );
}

window.QualityCertificateModal = QualityCertificateModal;
