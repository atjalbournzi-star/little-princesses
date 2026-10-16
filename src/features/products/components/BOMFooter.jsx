// src/features/products/components/BOMFooter.jsx
// شريط الإجراءات والملخص المالي السفلي الثابت لنافذة هندسة الموديلات (BOM Studio Elevated Footer)

function BOMFooter({
  onClose,
  isSaving = false,
  editId = null,
  totalCost = 0,
  expectedProfit = 0,
  currencyLabel = "YER"
}) {
  const formattedCost = typeof totalCost === "number" ? totalCost.toFixed(1) : totalCost;
  const formattedProfit = typeof expectedProfit === "number" ? expectedProfit.toFixed(1) : expectedProfit;
  const profitNum = parseFloat(expectedProfit) || 0;
  const profitSign = profitNum > 0 ? "+" : "";

  return (
    <div className="h-10 min-h-[40px] px-4 border-t border-slate-800 bg-[#0F172A] flex items-center justify-between shrink-0 select-none">
      {/* 1. يمين: زر الإلغاء */}
      <button
        type="button"
        onClick={onClose}
        className="h-7 px-3 text-xs text-slate-400 hover:text-white rounded-lg border border-slate-700/60 hover:bg-slate-800/80 transition cursor-pointer"
      >
        إلغاء
      </button>

      {/* 2. المنتصف: ملخص التكلفة والربح الحي */}
      <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-2">
        <span>التكلفة:</span>
        <span className="text-white font-mono font-bold">{formattedCost} {currencyLabel}</span>
        <span className="text-slate-600 px-0.5">|</span>
        <span>الربح المتوقع:</span>
        <span className="text-emerald-400 font-mono font-bold">
          {profitSign}{formattedProfit} {currencyLabel}
        </span>
      </div>

      {/* 3. يسار: زر الحفظ الرئيسي */}
      <button
        type="submit"
        disabled={isSaving}
        className="h-8 px-4 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
      >
        <span>{isSaving ? "⏳" : "💾"}</span>
        <span>{isSaving ? "جارٍ الحفظ..." : (editId ? "حفظ التعديلات" : "اعتماد وحفظ الموديل")}</span>
      </button>
    </div>
  );
}

window.BOMFooter = BOMFooter;
window.ProductFooter = BOMFooter;
