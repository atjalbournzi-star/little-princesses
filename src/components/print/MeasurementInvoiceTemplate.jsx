/**
 * ============================================================================
 * MeasurementInvoiceTemplate.jsx — Hangtag & Garment Bag Luxury Print Templates
 * Architecture: Modular Print Template | Little Princesses ERP
 * ============================================================================
 */

function MeasurementInvoiceTemplate({
  activeTemplate,
  brandProfile,
  orderNo,
  custName,
  childName,
  prodName,
  qty,
  m,
  total,
  remaining,
  cur,
  deliveryDate,
  phone
}) {
  const originUrl = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:5000';

  if (activeTemplate === 'hangtag') {
    return (
      <div className="hangtag-container font-sans">
        <div className="w-4 h-4 rounded-full border-2 border-dashed border-[#8F2A87] mx-auto mb-1.5 flex items-center justify-center text-[8px] text-[#8F2A87]">•</div>

        <div className="text-center">
          <div className="text-xl">👑</div>
          <h1 className="text-xs font-black text-[#8F2A87] tracking-wider">{brandProfile.shortName || brandProfile.name}</h1>
          <p className="text-[7.5px] font-bold text-gray-500">Haute Couture • للأزياء الراقية</p>
        </div>

        <div className="my-2 border-t border-b border-purple-100 py-2 space-y-1 text-center bg-pink-50/50 rounded-xl p-1.5">
          <span className="text-[10px] text-gray-500 block">فستان الأميرة:</span>
          <span className="text-sm font-black text-[#B0005A] block">{childName} 👧</span>
          <span className="text-[10.5px] font-bold text-gray-800 block truncate">{prodName}</span>
          {m?.dress_length && (
            <span className="text-[9px] text-[#8F2A87] font-bold block">الطول: {m.dress_length} سم • مقاس معتمد</span>
          )}
        </div>

        <div className="text-center my-1">
          <div className="w-20 h-20 mx-auto p-1 bg-white border border-purple-200 rounded-xl shadow-xs">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(originUrl + '/track.html?order=' + orderNo)}`}
              alt="Customer Live Tracking QR"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-[7.5px] text-gray-500 block mt-1">امسحي بالجوال لتتبع الفستان 📱✨</span>
        </div>

        <div className="mt-auto pt-1 border-t border-gray-100">
          <div className="flex justify-between items-center px-1 mb-1">
            <span className="text-[9px] text-gray-500">السعر:</span>
            <span className="text-xs font-black font-mono text-black">{total.toLocaleString('en-US')} {cur}</span>
          </div>
          <div className="bg-white p-0.5 rounded text-center">
            <img 
              src={`https://barcodeapi.org/api/128/${encodeURIComponent(orderNo)}`} 
              alt="Barcode" 
              className="h-8 max-w-full mx-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'block';
              }}
            />
            <div className="hidden font-mono text-[9px] font-bold tracking-widest">{orderNo}</div>
            <span className="font-mono text-[8.5px] font-bold text-gray-700 block mt-0.5">{orderNo}</span>
          </div>
          <span className="text-[7px] text-gray-400 block mt-0.5">صنع بكل حب وإتقان لأميرتنا 🌸</span>
        </div>
      </div>
    );
  }

  if (activeTemplate === 'garment_bag') {
    return (
      <div className="garment-bag-container font-sans">
        <div className="flex justify-between items-center pb-2 border-b-2 border-purple-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <div>
              <h2 className="text-sm font-black text-[#8F2A87] leading-tight">{brandProfile.name}</h2>
              <span className="text-[9px] text-gray-500 font-bold block">ملصق تسليم كيس الفستان (Garment Bag Delivery Tag)</span>
            </div>
          </div>
          <div className="text-left font-mono">
            <span className="text-xs font-black px-2.5 py-1 bg-purple-50 text-[#8F2A87] rounded-lg border border-purple-200 block">
              {orderNo}
            </span>
          </div>
        </div>

        <div className="my-2.5 p-3 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500">الأميرة:</span>
            <span className="text-sm font-black text-[#B0005A]">{childName} 👧</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500">والدتها الكريمة:</span>
            <span className="text-xs font-bold text-gray-800">{custName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500">الموديل المعتمد:</span>
            <span className="text-xs font-black text-gray-900">{prodName} × {qty}</span>
          </div>
          {phone && phone !== '—' && (
            <div className="flex justify-between items-center text-[10px] text-gray-600 font-mono">
              <span>الهاتف:</span>
              <span>{phone}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 my-2 text-xs">
          <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
            <span className="text-[9.5px] text-gray-500 block">موعد البروفة / التسليم:</span>
            <span className="font-bold text-[#8F2A87] text-xs mt-0.5 block">{deliveryDate}</span>
          </div>
          <div className={`p-2 rounded-lg border ${remaining > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <span className="text-[9.5px] text-gray-500 block">الحساب المالي:</span>
            {remaining > 0 ? (
              <span className="font-black text-rose-700 text-xs mt-0.5 block">
                متبقي: {remaining.toLocaleString('en-US')} {cur}
              </span>
            ) : (
              <span className="font-black text-emerald-700 text-xs mt-0.5 block">
                خالص بالكامل ✅
              </span>
            )}
          </div>
        </div>

        <div className="p-2 rounded-lg bg-yellow-50/60 border border-yellow-200/80 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5 text-yellow-900 font-bold">
            <span>✨</span>
            <span>مفحوص ومعتمد بجودة ليتل برنسيس الملكية</span>
          </div>
          <span className="font-mono text-emerald-700 font-bold">PASS ✅</span>
        </div>

        <div className="mt-3 pt-2 border-t-2 border-dashed border-gray-200 flex items-center justify-between gap-3">
          <div className="text-center shrink-0">
            <div className="w-16 h-16 p-0.5 bg-white border border-gray-300 rounded-lg shadow-2xs">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(originUrl + '/track.html?order=' + orderNo)}`}
                alt="QR Scan"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[7.5px] text-gray-400 block mt-0.5">تتبع الفستان 📱</span>
          </div>

          <div className="flex-1 text-center">
            <img
              src={`https://barcodeapi.org/api/128/${encodeURIComponent(orderNo)}`}
              alt="Barcode"
              className="h-9 max-w-full mx-auto"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'block';
              }}
            />
            <div className="hidden font-mono text-[9px] font-bold">{orderNo}</div>
            <span className="font-mono text-[9px] font-black text-gray-800 block mt-0.5 tracking-wider">{orderNo}</span>
            <span className="text-[8px] text-gray-500 block">للتسليم السريع: امسحي الباركود بالمعرض 📷🏷️</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

window.MeasurementInvoiceTemplate = MeasurementInvoiceTemplate;
