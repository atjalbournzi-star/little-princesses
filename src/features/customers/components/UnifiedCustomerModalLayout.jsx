// src/features/customers/components/UnifiedCustomerModalLayout.jsx
// إطار الحوار الموحد لجميع خطوات إدارة العميل الثلاث بمقاس وترويسة وتذييل ثابتين 100%

function UnifiedCustomerModalLayout({
  isOpen,
  onClose,
  step = 1,
  onSwitchStep,
  title,
  customerCode,
  extraHeaderLeft,
  footerRight,
  footerLeft,
  children
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm select-none"
      dir="rtl"
    >
      {/* 1. Outer Dialog Box - محدد بأقصى ارتفاع لمنع تجاوز الشاشة */}
      <div className="w-full max-w-4xl max-h-[82vh] flex flex-col bg-[#111C38] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto">
        
        {/* Row 1 (Top Bar - h-9): شريط العنوان وزر الإغلاق والأدوات السياقية */}
        <div className="h-9 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0F172A]">
          {/* اليمين: زر الإغلاق X + عنوان النافذة + شارة الكود [CUST-XXXX] */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors shrink-0 text-xs"
              title="إغلاق النافذة"
            >
              ✕
            </button>
            <div className="text-xs font-bold text-white truncate">
              {title}
            </div>
            {customerCode && (
              <span className="text-[11px] font-mono font-bold text-pink-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                {String(customerCode).startsWith('[') ? customerCode : `[${customerCode}]`}
              </span>
            )}
          </div>

          {/* اليسار: أدوات السياق الإضافية (مثل أطفال / كبار أو فاتورة حرارية / كرت معمل) */}
          <div className="flex items-center gap-2 shrink-0">
            {extraHeaderLeft}
          </div>
        </div>

        {/* Row 2 (Stepper Bar - h-9 py-1 bg-slate-900/50 border-y border-slate-800 flex justify-center): شريط التبويب المستقل */}
        <div className="h-9 py-1 bg-slate-900/50 border-b border-slate-800 flex justify-center items-center shrink-0">
          <div dir="rtl" className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSwitchStep && onSwitchStep(1)}
              className={`text-xs px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                step === 1 ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              1. بيانات العميل
            </button>
            <span className="text-slate-600 text-xs">←</span>
            <button
              type="button"
              onClick={() => onSwitchStep && onSwitchStep(2)}
              className={`text-xs px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                step === 2 ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              2. المقاسات والتفصيل
            </button>
            <span className="text-slate-600 text-xs">←</span>
            <button
              type="button"
              onClick={() => onSwitchStep && onSwitchStep(3)}
              className={`text-xs px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                step === 3 ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              3. الحساب المالي
            </button>
          </div>
        </div>

        {/* Content Area: مساحة المحتوى قابلة للتمرير مع شريط تمرير مخصص */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 text-white">
          {children}
        </div>

        {/* Footer: تذييل ثابت في الأسفل 100% بارتفاع 44px (h-11) */}
        <div className="h-11 border-t border-slate-800 bg-[#0F172A] px-4 flex items-center justify-between shrink-0">
          {/* الجانب الأيمن: أزرار الإلغاء أو الرجوع */}
          <div className="flex items-center gap-2">
            {footerRight}
          </div>
          {/* الجانب الأيسر: أزرار الحفظ والمتابعة الأساسية */}
          <div className="flex items-center gap-2">
            {footerLeft}
          </div>
        </div>

      </div>
    </div>
  );
}

window.UnifiedCustomerModalLayout = UnifiedCustomerModalLayout;
