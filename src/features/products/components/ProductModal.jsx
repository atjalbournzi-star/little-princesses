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
    computedTotalCost,
    computedProfit,
    pricesMatrix = {},
    activeModelCurrencyLabel
  } = actions;

  const BasicInfoComp = window.ProductBasicInfoForm || null;
  const BomComp = window.ProductBomMatrix || null;
  const CostingComp = window.ProductCostingMatrix || null;
  const PricingComp = window.ProductPricingMatrix || null;

  const tabs = [
    { id: "basic", label: "البيانات والمواصفات", icon: "📋" },
    { id: "bom", label: "شجرة الخامات (BOM)", icon: "🧵" },
    { id: "costing", label: "مراحل التشغيل والتكلفة", icon: "🏭" },
    { id: "pricing", label: "التسعير والأرباح", icon: "💎" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#E8E5EA] dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto text-right">
        
        {/* رأس النافذة المنبثقة */}
        <div className="p-4 sm:p-5 border-b border-[#E8E5EA] dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-[#FAFAFB] via-white to-[#FAFAFB] dark:from-slate-900/80 dark:via-[#0f172a] dark:to-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#F2E7F3] dark:bg-purple-950/60 text-[#8F2A87] dark:text-purple-300 border border-[#E5CEE7] dark:border-purple-800/40 flex items-center justify-center text-xl font-bold shadow-2xs">
              🧮
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#25232A] dark:text-slate-100">
                {editId ? `تعديل الموديل: ${modelName || 'بدون اسم'}` : "تسجيل موديل جديد وهندسة التكاليف (BOM Studio)"}
              </h2>
              <span className="text-[11px] text-[#6F6B75] dark:text-slate-400">
                مواصفات الفستان، استهلاك الخامات، أجور الورشة، والتسعير التجاري
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#6F6B75] dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* شريط تبويبات الأبعاد الأربعة */}
        <div className="flex items-center border-b border-[#E8E5EA] dark:border-slate-800 bg-[#FAFAFB] dark:bg-slate-900/70 px-4 overflow-x-auto shrink-0 scrollbar-none">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'border-[#8F2A87] text-[#8F2A87] dark:text-purple-400 dark:border-purple-400 bg-white/70 dark:bg-slate-800/50'
                  : 'border-transparent text-[#6F6B75] dark:text-slate-400 hover:text-[#25232A] dark:hover:text-slate-200'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* جسم النافذة ومحتوى التبويب النشط */}
        <form onSubmit={handleSaveProduct} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === "basic" && BasicInfoComp && (
            <BasicInfoComp
              actions={actions}
              availableCategories={availableCategories}
              availableCollections={availableCollections}
            />
          )}

          {activeTab === "bom" && BomComp && (
            <BomComp
              actions={actions}
              inventory={inventory}
            />
          )}

          {activeTab === "costing" && CostingComp && (
            <CostingComp
              actions={actions}
            />
          )}

          {activeTab === "pricing" && PricingComp && (
            <PricingComp
              actions={actions}
            />
          )}

          {/* شريط الإجراءات والملخص المالي السفلي */}
          <div className="pt-3 border-t border-[#E8E5EA] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAFAFB] dark:bg-slate-900/50 -mx-4 -mb-4 p-4 mt-4">
            <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-1.5">
                <span className="text-[#6F6B75] dark:text-slate-400">التكلفة الإجمالية:</span>
                <span className="font-mono font-bold text-[#007F8C] dark:text-cyan-400">
                  {computedTotalCost.toFixed(1)} {activeModelCurrencyLabel}
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#6F6B75] dark:text-slate-400">الربح المتوقع:</span>
                <span className="font-mono font-bold text-[#8F2A87] dark:text-purple-300">
                  +{computedProfit.toFixed(1)} {activeModelCurrencyLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#E8E5EA] dark:border-slate-700 text-xs font-bold text-[#6F6B75] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#8F2A87] hover:bg-[#73216C] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>{isSaving ? "⏳" : "💾"}</span>
                <span>{isSaving ? "جارٍ الحفظ..." : (editId ? "حفظ تعديلات الموديل" : "حفظ الموديل والتكلفة سحابياً")}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

window.ProductModal = ProductModal;
