/**
 * ============================================================================
 * ThermalReceiptTemplate.jsx — 80mm POS Thermal Receipt Template
 * Architecture: Modular Print Template | Little Princesses ERP
 * ============================================================================
 */

function ThermalReceiptTemplate({
  brandProfile,
  orderNo,
  orderDate,
  custName,
  phone,
  childName,
  order,
  prodName,
  qty,
  total,
  paid,
  remaining,
  cur,
  deliveryDate
}) {
  const delFee = Math.max(0, parseFloat(order?.delivery_fee || order?.delivery || 0));
  const delMode = order?.delivery_payment_mode || 'DIRECT_TO_COURIER';
  const isPrepaid = delMode === 'PREPAID_VIA_ATELIER' && delFee > 0;
  const isDirectToCourier = delMode === 'DIRECT_TO_COURIER' && delFee > 0;

  let itemsTotal = 0;
  if (order?.items && order.items.length > 0) {
    itemsTotal = order.items.reduce((sum, itm) => {
      const iQty = parseInt(itm.quantity || itm.qty || 1);
      const iTot = parseFloat(itm.total_price !== undefined ? itm.total_price : ((parseFloat(itm.unit_price || itm.price || 0)) * iQty));
      return sum + iTot;
    }, 0);
  } else if (order?.subtotal !== undefined && parseFloat(order.subtotal) > 0) {
    itemsTotal = parseFloat(order.subtotal);
  } else if (isPrepaid && total > delFee) {
    itemsTotal = total - delFee;
  } else {
    itemsTotal = total;
  }

  const grandTotal = isPrepaid ? (itemsTotal + delFee) : itemsTotal;
  const paidAmount = parseFloat(paid || 0);
  const remainingAmount = Math.max(0, grandTotal - paidAmount);

  return (
    <div className="thermal-container text-center font-sans">
      {/* Brand Header */}
      <div className="mb-2">
        <div className="flex justify-center mb-1">
          {brandProfile.logoUrl ? (
            <img src={brandProfile.logoUrl} alt="Logo" className="h-10 max-w-[120px] object-contain" />
          ) : (
            <div className="text-2xl">{brandProfile.systemIcon || '🏢'}</div>
          )}
        </div>
        <h1 className="text-sm font-black tracking-tight text-black">{brandProfile.name}</h1>
        <p className="text-[10px] font-bold text-gray-700">{brandProfile.shortName}</p>
        <p className="text-[9.5px] text-gray-600">{brandProfile.tagline}</p>
        {brandProfile.phone && (
          <p className="text-[9px] text-gray-500 font-mono mt-0.5">هاتف: {brandProfile.phone}</p>
        )}
        {brandProfile.commercialRegister && (
          <p className="text-[8.5px] text-gray-500 font-mono">س.ت: {brandProfile.commercialRegister}</p>
        )}
      </div>

      <div className="dashed-line"></div>

      {/* Receipt Details */}
      <div className="text-[10.5px] text-right space-y-1 my-2">
        <div className="flex justify-between">
          <span className="text-gray-600">رقم الفاتورة:</span>
          <span className="font-mono font-bold">{orderNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">التاريخ:</span>
          <span className="font-mono">{orderDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">العميلة:</span>
          <span className="font-bold">{custName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">الهاتف:</span>
          <span className="font-mono">{phone}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">الأميرة:</span>
          <span className="font-bold text-[#B0005A]">{childName}</span>
        </div>
      </div>

      <div className="dashed-line"></div>

      {/* Items Table */}
      <table className="table-thermal text-right">
        <thead>
          <tr className="border-b border-black font-bold text-[10px]">
            <th>الوصف / الموديل</th>
            <th className="text-center">الكمية</th>
            <th className="text-left font-mono">الإجمالي</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {order?.items && order.items.length > 0 ? (
            order.items.map((itm, idx) => {
              const itemQty = parseInt(itm.quantity || itm.qty || 1);
              const itemTot = parseFloat(itm.total_price !== undefined ? itm.total_price : ((parseFloat(itm.unit_price || itm.price || 0)) * itemQty));
              return (
                <tr key={idx}>
                  <td className="font-semibold py-1">
                    <div>{itm.product_name || itm.name || prodName}</div>
                    {itm.unit_price && itemQty > 1 && (
                      <div className="text-[9px] text-gray-500 font-mono">@{parseFloat(itm.unit_price).toLocaleString('en-US')}</div>
                    )}
                  </td>
                  <td className="text-center font-mono py-1">{itemQty}</td>
                  <td className="text-left font-mono font-bold py-1">{itemTot.toLocaleString('en-US')}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td className="font-semibold">{prodName}</td>
              <td className="text-center font-mono">{qty}</td>
              <td className="text-left font-mono font-bold">{itemsTotal.toLocaleString('en-US')}</td>
            </tr>
          )}
          {isPrepaid && (
            <tr className="border-t border-dashed border-gray-300">
              <td className="font-semibold py-1">أجور التوصيل والشحن</td>
              <td className="text-center font-mono py-1">1</td>
              <td className="text-left font-mono font-bold py-1">{delFee.toLocaleString('en-US')}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="double-line"></div>

      {/* Financial Summary */}
      <div className="text-[11px] space-y-1.5 text-right font-medium">
        <div className="flex justify-between">
          <span>الإجمالي الكلي:</span>
          <span className="font-mono font-bold">{grandTotal.toLocaleString('en-US')} {cur}</span>
        </div>
        <div className="flex justify-between text-emerald-700 font-bold">
          <span>المدفوع (العربون):</span>
          <span className="font-mono">{paidAmount.toLocaleString('en-US')} {cur}</span>
        </div>
        <div className="flex justify-between text-base font-black border-t border-black pt-1">
          <span>المتبقي للتحصيل:</span>
          <span className="font-mono text-red-600">{remainingAmount.toLocaleString('en-US')} {cur}</span>
        </div>
      </div>

      <div className="dashed-line"></div>

      {/* Delivery Notice */}
      <div className="bg-gray-100 p-2 rounded-lg text-center my-2">
        <p className="text-[10px] text-gray-700">📅 موعد التسليم والبروفة المتوقع:</p>
        <p className="text-xs font-black font-mono mt-0.5 text-black">{deliveryDate}</p>
      </div>

      {/* Courier Delivery Notice */}
      {isDirectToCourier && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-2 text-center my-2 text-[10px] font-bold">
          ⚠️ أجور التوصيل ({delFee.toLocaleString('en-US')} ريال) تُدفع للمندوب مباشرة عند الاستلام
        </div>
      )}

      {/* QR Code */}
      <div className="my-3 flex flex-col items-center justify-center">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=LP-ORDER:${orderNo}|CUST:${encodeURIComponent(custName)}|REM:${remainingAmount}`}
          alt="QR Code"
          className="w-24 h-24 border border-black p-1 rounded-md"
        />
        <p className="text-[8.5px] text-gray-600 mt-1">امسحي الكود لمتابعة حالة تفصيل الفستان</p>
      </div>

      {/* Footer Notes */}
      <div className="text-[8.5px] text-gray-600 space-y-0.5 border-t border-dashed border-gray-400 pt-2 text-center">
        <p>• العربون لا يُسترجع بعد بدء مرحلة القص والتفصيل.</p>
        <p>• نرجو إحضار أصل الإيصال عند موعد البروفة والاستلام.</p>
        <p className="font-bold text-black mt-1">نسعد بخدمتكم وثقتكم بنا دائماً 🌸</p>
      </div>
    </div>
  );
}

window.ThermalReceiptTemplate = ThermalReceiptTemplate;
