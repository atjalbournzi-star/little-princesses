/**
 * ProductionBoard.jsx - جدول ومسار أوامر التشغيل وخطوط التصنيع
 * Little Princesses ERP - Production Floor Architecture
 */

function ProductionBoard({
  filteredFactory = [],
  stockInflowLoading = {},
  setQcModalData,
  advanceToNextStage,
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
    <div className="flex-1 min-h-0 overflow-auto custom-scrollbar rounded-xl border border-slate-800/80 bg-slate-900/80 text-right text-xs shadow-lg shadow-black/20">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md text-slate-300 border-b border-slate-800/90 shadow-sm">
          <tr>
            <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-300 text-right whitespace-nowrap">الطلب ونوع الإنتاج</th>
            <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-300 text-right whitespace-nowrap">الموديل والتفاصيل</th>
            <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-300 text-right whitespace-nowrap">فريق العمل والمراحل</th>
            <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-300 text-right w-1/4 whitespace-nowrap">مرحلة ونسبة الإنجاز</th>
            <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-300 text-center whitespace-nowrap">الوقت المتبقي</th>
            <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-300 text-center whitespace-nowrap sticky left-0 z-10 bg-slate-950">
              الإجراءات
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-medium">
          {safeList.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-12 text-center text-slate-400 font-medium text-xs">
                لا توجد طلبيات جارية في الورشة 🧵
              </td>
            </tr>
          ) : safeList.map(f => {
            const Card = CardComponent || window.ProductionCard;
            if (Card) {
              return (
                <Card
                  key={f.id || f.order_no}
                  f={f}
                  stockInflowLoading={stockInflowLoading}
                  setQcModalData={setQcModalData}
                  advanceToNextStage={advanceToNextStage}
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

