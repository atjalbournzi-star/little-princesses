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
  loadIntoForm,
  handleDeleteOrder
}) {
  const CardComponent = window.ProductionCard;

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
            <th className="px-4 py-3.5 text-right whitespace-nowrap">الطلب والعميلة</th>
            <th className="px-4 py-3.5 text-right whitespace-nowrap">الموديل والتفاصيل</th>
            <th className="px-4 py-3.5 text-right whitespace-nowrap">فريق العمل والمراحل</th>
            <th className="px-4 py-3.5 text-right w-1/4 whitespace-nowrap">مرحلة ونسبة الإنجاز</th>
            <th className="px-4 py-3.5 text-center whitespace-nowrap">الوقت المتبقي</th>
            <th className="px-4 py-3.5 text-center whitespace-nowrap sticky left-0 z-10 bg-[#FAFAFB] shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
              الإجراءات
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8E5EA] bg-white">
          {filteredFactory.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-12 text-center text-[#6F6B75] font-medium">
                لا توجد طلبيات جارية في الورشة 🧵
              </td>
            </tr>
          ) : filteredFactory.map(f => {
            if (!CardComponent) return null;
            return (
              <CardComponent
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
                loadIntoForm={loadIntoForm}
                handleDeleteOrder={handleDeleteOrder}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

window.ProductionBoard = ProductionBoard;
