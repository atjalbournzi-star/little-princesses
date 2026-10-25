// src/features/products/components/ProductCard.jsx
// بطاقة العرض البصري الجذابة للموديل (Grid View Card - Dark Mode Ready)

function ProductCard({
  product,
  onEdit,
  onDelete,
  onShowQr,
  currencyLabel = "YER ﷼"
}) {
  const p = product || {};
  const curr = p.currency || currencyLabel;
  const seg = p.target_segment || 'kids';
  const segLabel = seg === 'women_adults' ? '👗 نسائي وكبار' : (seg === 'custom_free' ? '✂️ تفصيل حر' : '👧 أطفال');

  return (
    <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-teal-500/50 transition-all flex flex-col justify-between overflow-hidden group select-none">
      {/* رأس البطاقة والشارات */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800/60">
              #{p.id}
            </span>
            {p.sku && (
              <span className="font-mono text-[10.5px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                {p.sku}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <span className="bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 px-2 py-0.5 rounded text-[10px] font-bold">
              {segLabel}
            </span>
            {p.collection && (
              <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded text-[10px] font-semibold">
                <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                <span>{p.collection}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            )}
          </div>
          <div className="overflow-hidden min-w-0">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={p.name}>
              {p.name}
            </h3>
            <span className="text-[10.5px] font-medium text-teal-600 dark:text-teal-400 block mt-0.5 truncate">
              {p.category || 'تصنيف عام'}
            </span>
          </div>
        </div>
      </div>

      {/* تفاصيل القماش ومقاييس التكلفة والتسعير */}
      <div className="p-3.5 space-y-2.5 flex-1 text-xs">
        {/* ملخص الأقمشة */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800 space-y-0.5">
          <div className="flex justify-between items-center text-[10.5px]">
            <span className="text-slate-600 dark:text-slate-400 font-medium">القماش:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
              {(parseFloat(p.yards_used) || 0).toFixed(1)} م
            </span>
          </div>
          <p className="text-[10.5px] text-slate-800 dark:text-slate-300 truncate" title={p.fabric_name}>
            {p.fabric_name || 'لم يحدد قماش'}
          </p>
        </div>

        {/* شبكة الأسعار والأرباح */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-slate-50 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-[9.5px] text-slate-500 dark:text-slate-400 block">التكلفة</span>
            <span className="font-bold font-mono text-slate-900 dark:text-white block mt-0.5 text-[11px] tabular-nums">
              {(parseFloat(p.total_cost || p.cost_price) || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}
            </span>
          </div>
          <div className="bg-teal-50 dark:bg-teal-950/40 p-1.5 rounded-lg border border-teal-200 dark:border-teal-800/40">
            <span className="text-[9.5px] text-teal-700 dark:text-teal-300 block font-semibold">سعر البيع</span>
            <span className="font-bold font-mono text-teal-700 dark:text-teal-300 block mt-0.5 text-[11px] tabular-nums">
              {(parseFloat(p.sell_price || p.base_price) || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}
            </span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
            <span className="text-[9.5px] text-emerald-700 dark:text-emerald-300 block font-semibold">الربح</span>
            <span className="font-bold font-mono text-emerald-700 dark:text-emerald-300 block mt-0.5 text-[11px] tabular-nums">
              +{(parseFloat(p.profit) || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })}
            </span>
          </div>
        </div>

        {p.barcode && (
          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5">
            <span>الباركود:</span>
            <span className="font-bold text-slate-900 dark:text-slate-200">{p.barcode}</span>
          </div>
        )}
      </div>

      {/* أزرار الإجراءات */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => onShowQr && onShowQr(p)}
          className="h-6 px-2 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 text-[10.5px] font-medium transition flex items-center gap-1 cursor-pointer"
          title="عرض وطباعة رمز QR وتكت الفستان"
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          <span>تكت QR</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(p)}
            className="h-6 px-2 rounded-md bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60 text-[10.5px] font-medium transition flex items-center gap-1 cursor-pointer"
            title="تعديل الموديل"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            <span>تعديل</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(p.id)}
            className="h-6 px-2 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 text-[10.5px] font-medium transition flex items-center gap-1 cursor-pointer"
            title="حذف الموديل"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            <span>حذف</span>
          </button>
        </div>
      </div>
    </div>
  );
}

window.ProductCard = ProductCard;
