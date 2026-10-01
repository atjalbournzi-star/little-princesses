/**
 * ============================================================================
 * JobTicketTemplate.jsx — Workshop Job Ticket & Cutting Spec Template
 * Architecture: Modular Print Template | Little Princesses ERP
 * ============================================================================
 */

function JobTicketTemplate({
  brandProfile,
  orderNo,
  orderDate,
  custName,
  childName,
  prodName,
  qty,
  m,
  fabricItems,
  fallbackFabricText,
  comfortText,
  resolvedSewingNotes,
  deliveryDate,
  order = {}
}) {
  const resolvedFabrics = (Array.isArray(fabricItems) && fabricItems.length > 0)
    ? fabricItems
    : ((Array.isArray(order?.bom_items) && order.bom_items.length > 0)
        ? order.bom_items.map(b => `${b.fabric_name || b.name || 'قماش'} - ${b.cut_meters || b.meters || '2.5'} ${b.cut_unit || b.unit || 'متر'}`)
        : (order?.fabric_name ? [order.fabric_name] : []));

  return (
    <div className="job-container font-sans text-right space-y-4">
      {/* Header Strip */}
      <div className="flex justify-between items-start border-b-2 border-black pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{brandProfile.systemIcon || '🏢'}</span>
            <h1 className="text-lg font-black text-black">بطاقة أمر تشغيل ومعمل (Workshop Job Ticket)</h1>
          </div>
          <p className="text-xs text-gray-600 font-bold">{brandProfile.name} • قسم التفصيل والإنتاج</p>
        </div>
        <div className="text-left font-mono">
          <span className="bg-black text-white px-3 py-1 rounded-lg text-sm font-black block">{orderNo}</span>
          <span className="text-[10px] text-gray-600 block mt-1">تاريخ الحجز: {orderDate}</span>
        </div>
      </div>

      {/* Order & Child Info Header */}
      <div className="grid grid-cols-3 gap-3 bg-[#FAFAFB] p-3 rounded-xl border border-gray-200 text-xs">
        <div>
          <span className="text-gray-500 block">العميلة:</span>
          <span className="font-bold text-black">{custName}</span>
        </div>
        <div>
          <span className="text-gray-500 block">الأميرة (الطفلة):</span>
          <span className="font-black text-[#B0005A] text-sm">{childName}</span>
        </div>
        <div>
          <span className="text-gray-500 block">الموديل / التصميم:</span>
          <span className="font-bold text-black">{prodName} × {qty}</span>
        </div>
      </div>

      {/* Detailed Body Measurements Matrix - Compact 2-Row Table */}
      <div>
        <h3 className="text-xs font-bold text-black mb-1.5 flex items-center gap-1.5">
          <span>📐</span>
          <span>مصفوفة وباترون مقاسات الأميرة بالسنتيمتر (cm):</span>
        </h3>
        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          <table className="w-full text-center text-xs border-collapse">
            <thead className="bg-gray-100 text-gray-700 font-bold text-[10px] border-b border-gray-300">
              <tr>
                <th className="py-1 px-1.5 border-l border-gray-200">الطول الكلي</th>
                <th className="py-1 px-1.5 border-l border-gray-200 text-[#B0005A]">طول الفستان</th>
                <th className="py-1 px-1.5 border-l border-gray-200">محيط الصدر</th>
                <th className="py-1 px-1.5 border-l border-gray-200">محيط الخصر</th>
                <th className="py-1 px-1.5 border-l border-gray-200">طول الصدر</th>
                <th className="py-1 px-1.5 border-l border-gray-200">طول التنورة</th>
                <th className="py-1 px-1.5 border-l border-gray-200">طول الكم</th>
                <th className="py-1 px-1.5">عرض الكتف</th>
              </tr>
            </thead>
            <tbody className="bg-white font-mono font-bold text-xs">
              <tr>
                <td className="py-1.5 px-1.5 border-l border-gray-200">{(m.total_height || m.total_length || m.total_len) ? `${m.total_height || m.total_length || m.total_len} سم` : '—'}</td>
                <td className="py-1.5 px-1.5 border-l border-gray-200 text-[#B0005A]">{(m.dress_length || m.dress_len) ? `${m.dress_length || m.dress_len} سم` : '—'}</td>
                <td className="py-1.5 px-1.5 border-l border-gray-200">{(m.chest_circ || m.chest) ? `${m.chest_circ || m.chest} سم` : '—'}</td>
                <td className="py-1.5 px-1.5 border-l border-gray-200">{(m.waist_circ || m.waist) ? `${m.waist_circ || m.waist} سم` : '—'}</td>
                <td className="py-1.5 px-1.5 border-l border-gray-200">{(m.chest_length || m.chest_len) ? `${m.chest_length || m.chest_len} سم` : '—'}</td>
                <td className="py-1.5 px-1.5 border-l border-gray-200">{(m.skirt_length || m.skirt_len) ? `${m.skirt_length || m.skirt_len} سم` : '—'}</td>
                <td className="py-1.5 px-1.5 border-l border-gray-200">{(m.sleeve_length || m.sleeve_len) ? `${m.sleeve_length || m.sleeve_len} سم` : '—'}</td>
                <td className="py-1.5 px-1.5">{(m.shoulder_width || m.shoulder_w || m.shoulder) ? `${m.shoulder_width || m.shoulder_w || m.shoulder} سم` : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Fabrics, Colors, and Special Instructions */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="border border-gray-200 p-3 rounded-xl bg-[#FAFAFB]">
          <span className="font-bold text-black block mb-1.5 flex items-center gap-1.5">
            <span>🧵</span>
            <span>الأقمشة والخامات المطلوبة (BOM):</span>
          </span>
          <div className="text-gray-700 text-[11px] leading-relaxed space-y-1.5">
            {m.dress_color && (
              <div className="font-bold text-[#8F2A87] bg-[#FDF8FE] px-2 py-0.5 rounded border border-[#E5CEE7] inline-block">
                اللون المعتمد: {m.dress_color}
              </div>
            )}
            {resolvedFabrics.length > 0 ? (
              <div className="space-y-1">
                {resolvedFabrics.map((fItem, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 font-bold text-gray-900 bg-white p-1.5 rounded border border-gray-200">
                    <span className="text-[#8F2A87] font-bold">•</span>
                    <span>{fItem}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-700 font-medium bg-white p-2 rounded border border-gray-200">{fallbackFabricText}</p>
            )}
            {comfortText && (
              <div className="text-[10px] text-purple-900 bg-[#F6EEF8] p-2 rounded-lg border border-[#E5CEE7] mt-1.5">
                <span className="font-bold block mb-0.5">تفضيلات القماش والراحة للأميرة:</span>
                <span>{comfortText}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border border-gray-200 p-3 rounded-xl bg-[#FAFAFB]">
          <span className="font-bold text-black block mb-1.5 flex items-center gap-1.5">
            <span>✨</span>
            <span>تعليمات الشك والتطريز والتشطيب:</span>
          </span>
          <div className="text-gray-700 text-[11px] leading-relaxed space-y-1.5">
            {resolvedSewingNotes ? (
              <p className="font-medium text-gray-900 bg-white p-2 rounded-lg border border-gray-200">
                {resolvedSewingNotes}
              </p>
            ) : (
              <p className="text-gray-600 italic">
                تفصيل وتشطيب يدوي قياسي متقن وفق تصميم الموديل ومقاسات الأميرة المعتمدة.
              </p>
            )}
            {m.notes && m.notes !== resolvedSewingNotes && (
              <p className="text-[10.5px] text-gray-600 mt-1 border-t border-gray-200 pt-1">
                <span className="font-bold">ملاحظات القياس: </span>{m.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Production Stage Tracking Checklist */}
      <div>
        <h3 className="text-xs font-bold text-black mb-2 flex items-center gap-1.5">
          <span>🪡</span>
          <span>مسار تنفيذ الورشة واعتماد المراحل:</span>
        </h3>
        <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
          <div className="border border-gray-300 p-2 rounded-lg bg-white">
            <span>1. القص ✂️</span>
            <div className="w-4 h-4 border-2 border-gray-400 mx-auto mt-1.5 rounded-sm"></div>
          </div>
          <div className="border border-gray-300 p-2 rounded-lg bg-white">
            <span>2. الخياطة 🪡</span>
            <div className="w-4 h-4 border-2 border-gray-400 mx-auto mt-1.5 rounded-sm"></div>
          </div>
          <div className="border border-gray-300 p-2 rounded-lg bg-white">
            <span>3. التطريز 🧵</span>
            <div className="w-4 h-4 border-2 border-gray-400 mx-auto mt-1.5 rounded-sm"></div>
          </div>
          <div className="border border-gray-300 p-2 rounded-lg bg-white">
            <span>4. الجودة 💎</span>
            <div className="w-4 h-4 border-2 border-gray-400 mx-auto mt-1.5 rounded-sm"></div>
          </div>
          <div className="border border-gray-300 p-2 rounded-lg bg-white">
            <span>5. التسليم 👗</span>
            <div className="w-4 h-4 border-2 border-gray-400 mx-auto mt-1.5 rounded-sm"></div>
          </div>
        </div>
      </div>

      {/* Footer with Delivery Due and QR */}
      <div className="flex justify-between items-center border-t-2 border-dashed border-gray-300 pt-3 text-xs">
        <div>
          <span className="text-gray-500 block">موعد التسليم النهائي للعميلة:</span>
          <span className="font-mono font-black text-sm text-red-600">{deliveryDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=LP-JOB:${orderNo}|CHILD:${encodeURIComponent(childName)}`}
            alt="Job QR"
            className="w-14 h-14 border border-black p-0.5 rounded-md"
          />
        </div>
      </div>
    </div>
  );
}

window.JobTicketTemplate = JobTicketTemplate;
