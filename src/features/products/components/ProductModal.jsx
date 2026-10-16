// src/features/products/components/ProductModal.jsx
// نافذة هندسة الموديلات وإدارة التكاليف (BOM Studio Orchestrator Modal)

function ProductModal({
  isOpen,
  onClose,
  actions,
  inventory = [],
  availableCategories = [],
  availableCollections = []
}) {
  if (!isOpen || !actions) return null;

  const {
    activeTab = "basic",
    setActiveTab,
    editId,
    modelName,
    isSaving,
    handleSaveProduct,
    computedTotalCost = 0,
    computedProfit = 0,
    activeModelCurrencyLabel = "YER"
  } = actions;

  const BasicInfoComp = window.ProductBasicInfoForm || window.BOMBasicInfo || null;
  const BomComp = window.ProductBomMatrix || window.BOMFabricTree || null;
  const CostingComp = window.ProductCostingMatrix || window.BOMOperations || null;
  const PricingComp = window.ProductPricingMatrix || window.BOMPricing || null;
  const FooterComp = window.BOMFooter || window.ProductFooter || null;

  const stepMap = { basic: 1, bom: 2, costing: 3, pricing: 4, 1: 1, 2: 2, 3: 3, 4: 4 };
  const step = stepMap[activeTab] || 1;
  const setStep = (s) => {
    const tabMap = { 1: "basic", 2: "bom", 3: "costing", 4: "pricing" };
    if (setActiveTab) setActiveTab(tabMap[s] || s);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[48px] pb-2 px-3 bg-black/70 backdrop-blur-sm select-none" dir="rtl">
      <div className="w-full max-w-4xl max-h-[calc(100vh-3.4rem)] h-[425px] flex flex-col justify-between bg-[#111C38] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden shrink-0">
        
        {/* Row 1 (Top Bar - h-9): شريط العنوان وزر الإغلاق والأدوات السياقية */}
        <div className="h-9 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0F172A]">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors shrink-0 text-xs font-bold"
              title="إغلاق النافذة"
            >
              ✕
            </button>
            <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              <span className="text-purple-400 text-xs">🧮</span>
              <span>{editId ? `تعديل الموديل: ${modelName || 'بدون اسم'}` : "تسجيل موديل جديد وهندسة التكاليف (BOM)"}</span>
            </div>
            {actions.smartCode && (
              <span className="text-[11px] font-mono font-bold text-pink-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                [{actions.smartCode}]
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10.5px] font-mono font-bold text-pink-400 bg-pink-950/40 px-2 py-0.5 rounded border border-pink-800/40">
              {activeModelCurrencyLabel}
            </span>
          </div>
        </div>

        {/* Row 2 (Stepper Bar - h-9 py-1): شريط التبويب المستقل بمسافات وهوامش فاخرة تفصل الكلمات عن خط الترويسة */}
        <div className="h-9 py-1 bg-slate-900/60 border-b border-slate-800 flex justify-center items-center shrink-0">
          <div dir="rtl" className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`text-xs px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                step === 1 ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              1. البيانات والمواصفات
            </button>
            <span className="text-slate-600 text-xs">←</span>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`text-xs px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                step === 2 ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              2. شجرة الخامات (BOM)
            </button>
            <span className="text-slate-600 text-xs">←</span>
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`text-xs px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                step === 3 ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              3. مراحل التشغيل والتكلفة
            </button>
            <span className="text-slate-600 text-xs">←</span>
            <button
              type="button"
              onClick={() => setStep(4)}
              className={`text-xs px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                step === 4 ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              4. التسعير والأرباح
            </button>
          </div>
        </div>

        {/* جسم النافذة والفوتر المرتفع الثابت */}
        <form onSubmit={handleSaveProduct} className="flex-1 flex flex-col justify-between overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-1.5">
            {step === 1 && BasicInfoComp && (
              <BasicInfoComp
                actions={actions}
                availableCategories={availableCategories}
                availableCollections={availableCollections}
              />
            )}

            {step === 2 && BomComp && (
              <BomComp
                actions={actions}
                inventory={inventory}
              />
            )}

            {step === 3 && CostingComp && (
              <CostingComp
                actions={actions}
              />
            )}

            {step === 4 && PricingComp && (
              <PricingComp
                actions={actions}
              />
            )}
          </div>

          {/* شريط الإجراءات والملخص المالي السفلي المرتفع */}
          {FooterComp ? (
            <FooterComp
              onClose={onClose}
              isSaving={isSaving}
              editId={editId}
              totalCost={computedTotalCost}
              expectedProfit={computedProfit}
              currencyLabel={activeModelCurrencyLabel}
            />
          ) : (
            <div className="h-9 min-h-[36px] px-3 border-t border-slate-800 bg-[#0F172A] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="h-6.5 px-3 text-xs text-slate-400 hover:text-white rounded-lg border border-slate-700/60"
              >
                إلغاء
              </button>
              <div className="text-[10.5px] font-semibold text-slate-300">
                التكلفة: <span className="text-white font-mono font-bold">{computedTotalCost.toFixed(1)} {activeModelCurrencyLabel}</span> | الربح المتوقع: <span className="text-emerald-400 font-mono font-bold">{computedProfit.toFixed(1)} {activeModelCurrencyLabel}</span>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="h-7 px-3.5 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow flex items-center gap-1"
              >
                <span>{isSaving ? "⏳" : "💾"}</span>
                <span>{isSaving ? "جارٍ الحفظ..." : (editId ? "حفظ التعديلات" : "اعتماد وحفظ الموديل")}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

window.ProductModal = ProductModal;
window.BOMModalLayout = ProductModal;
