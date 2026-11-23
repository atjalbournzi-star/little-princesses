// src/features/inventory/components/InventoryPurchasesTable.jsx
// جدول استعراض فواتير التوريد والمشتريات المخزنية وتفاصيل الاستلام

function InventoryPurchasesTable({ purchases = [], currencyDisplay = 'YER ﷼' }) {
  if (!purchases || purchases.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-12 text-center text-[#6F6B75] text-xs font-medium">
        لا توجد فواتير توريد مسجلة حالياً تطابق معايير البحث 🧾
      </div>
    );
  }

  const uom = window.UnitConversionService;

  const formatQtyAndUnit = (p) => {
    if (p.multi_unit_label) return p.multi_unit_label;
    if (p.items && p.items.length > 1) {
      const units = p.items.map(it => (uom ? uom.normalizeUnit(it.unit) : (it.unit || 'متر')));
      const uniqueUnits = Array.from(new Set(units));
      if (uniqueUnits.length === 1) {
        const sum = p.items.reduce((s, it) => s + (parseFloat(it.qty || it.quantity || 0)), 0);
        return `${sum.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${uom ? uom.getUnitLabel(uniqueUnits[0]) : uniqueUnits[0]}`;
      }
      const lenUnits = ['متر', 'وار', 'سم', 'إنش', 'رول'];
      if (uniqueUnits.every(u => lenUnits.includes(u)) && uom) {
        const totalMeters = p.items.reduce((s, it) => s + uom.toMeters(parseFloat(it.qty || it.quantity || 0), it.unit), 0);
        return `${totalMeters.toFixed(1)} متر (موحد)`;
      }
      return `${p.items.length} أصناف (مشكل)`;
    }
    if (p.unit === 'مشكل') return 'أصناف متعددة (مشكل)';
    const qty = parseFloat(p.quantity || p.qty || 0);
    return `${qty.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${p.unit || 'متر'}`;
  };

  const getNetInvoiceDisplay = (p) => {
    const curr = p.currency || (p.Original_Currency || currencyDisplay);
    const rate = parseFloat(p.exchange_rate || 1.0);
    const grandYer = parseFloat(p.grand_total_yer || p.total_amount_yer || 0);
    let netOrig = p.net_original_amount !== undefined ? parseFloat(p.net_original_amount) : 0;
    if (!netOrig || isNaN(netOrig)) {
      if (rate > 0 && grandYer > 0) netOrig = grandYer / rate;
      else netOrig = Math.max(0, (parseFloat(p.original_amount || p.total || 0) - (parseFloat(p.discount || 0))) + (parseFloat(p.shipping_cost || 0)) + (parseFloat(p.transfer_fee || 0)));
    }
    return { netOrig, curr, grandYer, isForeign: curr !== 'YER' && !String(curr).includes('YER') };
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
              <th className="px-4 py-3 text-right">رقم الفاتورة</th>
              <th className="px-4 py-3 text-right">المورد</th>
              <th className="px-4 py-3 text-right">الصنف / الخامة الموردة</th>
              <th className="px-4 py-3 text-right">الكمية الموردة</th>
              <th className="px-4 py-3 text-right">سعر الوحدة</th>
              <th className="px-4 py-3 text-right">صافي الفاتورة</th>
              <th className="px-4 py-3 text-right">طريقة الدفع</th>
              <th className="px-4 py-3 text-right">تاريخ التوريد</th>
              <th className="px-4 py-3 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E5EA] bg-white">
            {purchases.map((p, idx) => {
              const pBill = p.purchase_no || p.bill_no || `PUR-${idx + 1}`;
              const pSup = p.supplier_name || p.supplier || 'مورد عام';
              const pItem = (p.items && p.items.length > 0)
                ? p.items.map(it => it.item_name).join(' + ')
                : (p.fabric_name || p.item_name || p.item || 'صنف مشتريات');
              const hasMultiItems = Boolean(p.items && p.items.length > 1);
              const pCost = parseFloat(p.cost_per_unit || p.cost || p.price || 0);
              const { netOrig, curr, grandYer, isForeign } = getNetInvoiceDisplay(p);
              const pDate = p.date || p.created_at || '—';
              const pPay = p.pay_type || p.payment_method || 'نقدي';
              const pStatus = p.status || p.receipt_status || 'تم الاستلام';

              return (
                <tr key={p.id || idx} className="hover:bg-[#FAFAFB] transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-[#007F8C]">{pBill}</td>
                  <td className="px-4 py-3 font-bold text-[#25232A]">{pSup}</td>
                  <td className="px-4 py-3 font-semibold text-[#25232A]" title={pItem}>{pItem}</td>
                  <td className="px-4 py-3 font-bold font-mono text-[#25232A]">
                    {formatQtyAndUnit(p)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#6F6B75]">
                    {hasMultiItems ? 'متعدد' : (pCost > 0 ? pCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—')}
                  </td>
                  <td className="px-4 py-3 font-bold font-mono text-[#8F2A87]">
                    <div>
                      {netOrig.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <span className="text-[10px] font-normal font-sans">{curr}</span>
                    </div>
                    {isForeign && grandYer > 0 && (
                      <div className="text-[9.5px] font-mono text-[#6F6B75] font-normal">
                        ({grandYer.toLocaleString('en-US', { maximumFractionDigits: 0 })} YER)
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-semibold border ${
                      pPay === 'آجل' ? 'bg-[#FFF1DC] text-[#C97300] border-[#FFE4B9]' : 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]'
                    }`}>
                      {pPay}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[#6F6B75] text-[11px]">{String(pDate).split('T')[0]}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] px-2 py-0.5 rounded-full text-[10.5px] font-bold">
                      ✅ {pStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.InventoryPurchasesTable = InventoryPurchasesTable;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InventoryPurchasesTable;
}
