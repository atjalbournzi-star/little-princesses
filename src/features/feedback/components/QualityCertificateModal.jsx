// src/features/feedback/components/QualityCertificateModal.jsx
// بطاقة اعتماد الجودة والمطابقة الفاخرة للطباعة المتوافقة مع هوية السندات المالية

function QualityCertificateModal({
  selectedCert,
  onClose
}) {
  if (!selectedCert) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 select-none" dir="rtl">
      <div className="bg-white dark:bg-[#111C38] rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 max-h-[95vh] overflow-y-auto print:m-0 print:p-8 print:max-w-none print:shadow-none print:border-none">
        
        {/* Certificate Header */}
        <div className="text-center pb-3 border-b border-slate-200 dark:border-slate-800 relative">
          <button onClick={onClose} className="absolute left-0 top-0 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold print:hidden cursor-pointer">✕</button>
          <div className="w-10 h-10 mx-auto bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 rounded-xl flex items-center justify-center text-xl mb-1 shadow-xs border border-pink-200 dark:border-pink-800/60">
            👑
          </div>
          <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">{(window.BrandService && window.BrandService.getProfile().name) || 'نظام الإدارة المتكامل'}</h2>
          <p className="text-[10px] text-pink-600 dark:text-pink-400 font-bold tracking-wider">{(window.BrandService && window.BrandService.getProfile().shortName) || 'QUALITY ASSURANCE'}</p>
          <div className="inline-block mt-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-[10.5px] font-bold border border-emerald-200 dark:border-emerald-800/60">
            بطاقة اعتماد الجودة والمطابقة الفاخرة (Quality Pass)
          </div>
        </div>

        {/* Dress & Inspection Info */}
        <div className="bg-slate-50 dark:bg-[#0B132B] p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">الموديل / الفستان:</span>
            <span className="font-bold text-slate-900 dark:text-white">{selectedCert.product_name || 'فستان الأميرات الراقي'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">رقم الفحص المعتمد:</span>
            <span className="font-mono font-bold text-pink-600 dark:text-pink-400">#{selectedCert.inspection_id || selectedCert.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">تاريخ الفحص والاعتماد:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{String(selectedCert.inspection_date || selectedCert.created_at || '').split('T')[0]}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">المفتش الفني المسؤول:</span>
            <span className="font-bold text-cyan-600 dark:text-cyan-400">{selectedCert.inspector_name || 'إدارة ضبط الجودة'}</span>
          </div>
        </div>

        {/* Checkpoints Checklist */}
        <div className="space-y-1.5 text-xs">
          <div className="font-bold text-slate-900 dark:text-white text-[11px]">المعايير المعتمدة والمطابقة:</div>
          <div className="space-y-1 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-[10.5px] text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-1.5">
              <span>✓</span>
              <span>مطابقة تامة للمقاسات المعتمدة والباترون الفاخر.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>✓</span>
              <span>متانة الخياطة، نظافة الغرز الداخلية، والدرزات الفرنسية.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>✓</span>
              <span>سلامة البطانة الناعمة والراحة التامة لبشرة الأميرة.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>✓</span>
              <span>سلاسة السحاب المخفي وتثبيت الأزرار والإكسسوارات بدقة.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>✓</span>
              <span>الكي بالبخار والتعقيم والتغليف الملكي الأنيق.</span>
            </div>
          </div>
        </div>

        {/* Official Atelier Stamp */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
          <div>
            <div className="text-slate-500 dark:text-slate-400">ختم الجودة والاعتماد:</div>
            <div className="font-bold text-pink-600 dark:text-pink-400 text-xs mt-0.5">APPROVED • معتمد 100%</div>
          </div>
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-pink-500 flex flex-col items-center justify-center text-[8.5px] text-pink-600 dark:text-pink-400 font-bold rotate-[-12deg] bg-pink-50 dark:bg-pink-950/40">
            <span>فحص معتمد</span>
            <span className="font-mono text-[8px]">PASS</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 print:hidden">
          <button type="button" onClick={onClose} className="h-6.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-bold text-xs border border-slate-200 dark:border-slate-700 cursor-pointer">إغلاق</button>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-6.5 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-md font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
          >
            <span>🖨️ طباعة بطاقة الجودة</span>
          </button>
        </div>

      </div>
    </div>
  );
}

window.QualityCertificateModal = QualityCertificateModal;
