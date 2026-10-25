/**
 * ProductionBoard.jsx - جدول ومسار أوامر التشغيل وخطوط التصنيع
 * Little Princesses ERP - Production Floor Architecture
 */

function ProductionBoard({
  filteredFactory = [],
  products = [],
  stockInflowLoading = {},
  setQcModalData,
  advanceToNextStage,
  handleFastTrackQc,
  actionLoadingId,
  handleStockInflow,
  handleReverseStockInflow,
  handleOpenDeliveryModal,
  handleReverseDelivery,
  handleOpenPrintModal,
  handleOpenJobTicket,
  setModelPreviewData,
  loadIntoForm,
  handleDeleteOrder
}) {
  const CardComponent = window.ProductionCard || (typeof ProductionCard !== 'undefined' ? ProductionCard : null);
  const safeList = Array.isArray(filteredFactory) ? filteredFactory.filter(Boolean) : [];

  return (
    <div className="flex-1 min-h-[300px] overflow-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C38]/90 text-right select-none">
      <table className="w-full min-w-[1020px] table-fixed text-right border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 shadow-xs">
          <tr className="h-7.5">
            <th className="h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden w-[155px] text-right">
              الطلب ونوع الإنتاج
            </th>
            <th className="h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden w-[19%] text-right">
              الموديل والتفاصيل
            </th>
            <th className="h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden w-[18%] text-right">
              فريق العمل والمراحل
            </th>
            <th className="h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden w-[165px] text-right">
              مرحلة ونسبة الإنجاز
            </th>
            <th className="h-7.5 py-1.5 px-3 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap w-[165px] text-center">
              الوقت المتبقي
            </th>
            <th className="h-7.5 py-1.5 px-2 text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight whitespace-nowrap overflow-hidden w-[85px] text-center sticky left-0 z-10 bg-slate-50 dark:bg-[#0F172A]">
              الإجراءات
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-transparent font-medium">
          {safeList.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-8 text-center text-slate-700 dark:text-white font-semibold text-xs">
                <svg className="w-7 h-7 text-slate-400 dark:text-slate-300 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>لا توجد طلبيات جارية في الورشة</span>
              </td>
            </tr>
          ) : safeList.map(f => {
            const Card = CardComponent || window.ProductionCard;
            if (Card) {
              return (
                <Card
                  key={f.id || f.order_no}
                  f={f}
                  products={products}
                  stockInflowLoading={stockInflowLoading}
                  setQcModalData={setQcModalData}
                  advanceToNextStage={advanceToNextStage}
                  handleFastTrackQc={handleFastTrackQc}
                  actionLoadingId={actionLoadingId}
                  handleStockInflow={handleStockInflow}
                  handleReverseStockInflow={handleReverseStockInflow}
                  handleOpenDeliveryModal={handleOpenDeliveryModal}
                  handleReverseDelivery={handleReverseDelivery}
                  handleOpenPrintModal={handleOpenPrintModal}
                  handleOpenJobTicket={handleOpenJobTicket}
                  setModelPreviewData={setModelPreviewData}
                  loadIntoForm={loadIntoForm}
                  handleDeleteOrder={handleDeleteOrder}
                />
              );
            }
            return (
              <tr key={f.id || f.order_no} className="hover:bg-slate-800/50 border-b border-slate-800 text-xs text-slate-200">
                <td className="p-3 font-mono text-rose-400 font-semibold">{f.order_no || f.id}</td>
                <td className="p-3 font-semibold">{f.product || f.product_name}</td>
                <td className="p-3">{f.tailor || f.tailor_name || '—'}</td>
                <td className="p-3 font-bold text-cyan-400">{f.stage} ({f.progress}%)</td>
                <td className="p-3 text-center">{f.due_date ? String(f.due_date).slice(0, 10) : '—'}</td>
                <td className="p-3 text-center">
                  <button onClick={() => loadIntoForm && loadIntoForm(f)} className="px-2 py-1 bg-slate-800 text-blue-400 rounded">✏️ تعديل</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

window.ProductionBoard = ProductionBoard;
