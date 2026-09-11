const { useState, useEffect, useRef } = React;

function PrintModal({ order, customer, measurements, isOpen, onClose, defaultTemplate = 'thermal' }) {
  if (!isOpen || !order) return null;

  const [activeTemplate, setActiveTemplate] = useState(defaultTemplate); // 'thermal', 'job_ticket', 'hangtag'
  const printAreaRef = useRef(null);

  const orderNo = order.order_no || `ORD-${order.id}`;
  const custName = order.customer_name || customer?.name || 'عميلة راقية';
  const childName = order.child_name || customer?.measurements?.[0]?.child_name || 'الأميرة';
  const prodName = order.product_name || order.item_name || 'فستان سهرة وتطريز فاخر';
  const qty = parseInt(order.qty || order.quantity || 1);
  const total = parseFloat(order.total_amount !== undefined ? order.total_amount : (order.total || 0));
  const paid = parseFloat(order.paid_amount !== undefined ? order.paid_amount : (order.paid || 0));
  const remaining = Math.max(0, total - paid);
  const cur = order.currency || 'YER ﷼';
  const orderDate = order.order_date ? order.order_date.split('T')[0] : new Date().toISOString().split('T')[0];
  const deliveryDate = order.delivery_date ? order.delivery_date.split('T')[0] : 'يحدد لاحقاً';
  const phone = customer?.phone || customer?.customer_phone || customer?.['رقم الهاتف'] || order.customer_phone || order.phone || '—';

  // Find detailed child measurements if available
  const m = measurements || customer?.measurements?.find(x => x.child_name === childName) || customer?.measurements?.[0] || {};

  const handleExecutePrint = () => {
    const printContent = printAreaRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar-u-nu-latn">
        <head>
          <meta charset="utf-8">
          <title>طباعة - ${orderNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap');
            
            * { 
              box-sizing: border-box; 
              margin: 0; 
              padding: 0; 
              font-feature-settings: "locl" 0, "lnum" 1, "tnum" 1 !important;
              font-variant-numeric: tabular-nums lining-nums;
            }
            body { 
              font-family: 'Inter', 'Tajawal', sans-serif; 
              color: #25232A; 
              background: #FFF; 
              direction: rtl; 
              font-feature-settings: "locl" 0, "lnum" 1, "tnum" 1 !important;
              font-variant-numeric: tabular-nums lining-nums;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .font-mono { 
              font-family: 'JetBrains Mono', monospace; 
              font-feature-settings: "locl" 0, "lnum" 1, "tnum" 1 !important;
              font-variant-numeric: tabular-nums lining-nums;
            }
            
            @media print {
              @page {
                margin: 0;
                size: ${activeTemplate === 'thermal' ? '80mm auto' : 'auto'};
              }
              body { padding: ${activeTemplate === 'thermal' ? '8px' : '20px'}; }
              .no-print { display: none !important; }
            }
            
            /* Thermal Receipt 80mm Styling */
            .thermal-container {
              width: 78mm;
              margin: 0 auto;
              padding: 10px 6px;
              font-size: 11.5px;
              line-height: 1.4;
            }
            .dashed-line {
              border-top: 1px dashed #444;
              margin: 8px 0;
            }
            .double-line {
              border-top: 2px dashed #000;
              margin: 10px 0;
            }
            .table-thermal {
              width: 100%;
              border-collapse: collapse;
              margin: 6px 0;
              font-size: 11px;
            }
            .table-thermal th, .table-thermal td {
              padding: 4px 2px;
            }
            
            /* Job Order Workshop Ticket Styling */
            .job-container {
              max-width: 780px;
              margin: 0 auto;
              padding: 20px;
              border: 2px solid #25232A;
              border-radius: 12px;
            }
            .measurements-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin: 12px 0;
            }
            .meas-box {
              border: 1px solid #CCC;
              padding: 6px;
              text-align: center;
              border-radius: 6px;
              background: #FAFAFB;
            }
            
            /* Hangtag Label Styling */
            .hangtag-container {
              width: 65mm;
              height: 110mm;
              margin: 0 auto;
              padding: 16px 12px;
              border: 2px solid #B0005A;
              border-radius: 16px;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-[#E8E5EA] overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Header Controls */}
        <div className="px-6 py-4 border-b border-[#E8E5EA] bg-[#FAFAFB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB] flex items-center justify-center text-lg font-bold shadow-2xs">
              🖨️
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-[#25232A]">محرك طباعة الفواتير وأوامر العمل الملكية</h2>
              <p className="text-[11px] text-[#6F6B75]">معاينة وتخصيص نماذج الطباعة الحرارية والمشاغل لدار الأميرات</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecutePrint}
              className="px-5 py-2.5 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <span>🖨️ طباعة الآن (Print)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 bg-white border border-[#E8E5EA] text-[#6F6B75] hover:text-[#25232A] rounded-xl text-xs font-bold transition cursor-pointer"
            >
              إلغاء ✕
            </button>
          </div>
        </div>

        {/* Template Switcher Tabs */}
        <div className="px-6 py-3 border-b border-[#E8E5EA] bg-white flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'thermal', label: '🧾 فاتورة استلام حرارية (80mm POS)', icon: '🧾' },
            { id: 'job_ticket', label: '🧵 بطاقة أمر العمل للورشة (Job Ticket)', icon: '🧵' },
            { id: 'hangtag', label: '🏷️ كرت ملصق الفستان (Dress Tag)', icon: '🏷️' }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTemplate(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTemplate === t.id
                  ? 'bg-[#B0005A] text-white shadow-xs'
                  : 'bg-[#FAFAFB] text-[#6F6B75] hover:bg-[#F2E7F3] border border-[#E8E5EA]'
              }`}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Live Preview Paper Container */}
        <div className="p-6 bg-[#F0EEF2] overflow-y-auto flex-1 flex justify-center items-start">
          <div 
            ref={printAreaRef} 
            className="bg-white shadow-xl rounded-2xl p-6 transition-all border border-[#CCC]"
            style={{
              width: activeTemplate === 'thermal' ? '340px' : (activeTemplate === 'hangtag' ? '280px' : '100%'),
              maxWidth: activeTemplate === 'job_ticket' ? '700px' : 'none'
            }}
          >

            {/* ══════════════════════════════════════════════════════════════════════
                قالب 1: فاتورة الاستقبال والمبيعات الحرارية (80mm Thermal Receipt)
            ══════════════════════════════════════════════════════════════════════ */}
            {activeTemplate === 'thermal' && (
              <div className="thermal-container text-center font-sans">
                {/* Brand Header */}
                <div className="mb-2">
                  <div className="text-2xl mb-1">👑</div>
                  <h1 className="text-sm font-black tracking-tight text-black">مؤسسة الأميرات الصغيرات</h1>
                  <p className="text-[10px] font-bold text-gray-700">LITTLE PRINCESSES HAUTE COUTURE</p>
                  <p className="text-[9.5px] text-gray-600">للأزياء وفساتين الأطفال الفاخرة</p>
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
                    {order.items && order.items.length > 0 ? (
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
                        <td className="text-left font-mono font-bold">{total.toLocaleString('en-US')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="double-line"></div>

                {/* Financial Summary */}
                <div className="text-[11px] space-y-1.5 text-right font-medium">
                  <div className="flex justify-between">
                    <span>الإجمالي الكلي:</span>
                    <span className="font-mono font-bold">{total.toLocaleString('en-US')} {cur}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>المدفوع (العربون):</span>
                    <span className="font-mono">{paid.toLocaleString('en-US')} {cur}</span>
                  </div>
                  <div className="flex justify-between text-base font-black border-t border-black pt-1">
                    <span>المتبقي للتحصيل:</span>
                    <span className="font-mono text-red-600">{remaining.toLocaleString('en-US')} {cur}</span>
                  </div>
                </div>

                <div className="dashed-line"></div>

                {/* Delivery Notice */}
                <div className="bg-gray-100 p-2 rounded-lg text-center my-2">
                  <p className="text-[10px] text-gray-700">📅 موعد التسليم والبروفة المتوقع:</p>
                  <p className="text-xs font-black font-mono mt-0.5 text-black">{deliveryDate}</p>
                </div>

                {/* QR Code */}
                <div className="my-3 flex flex-col items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=LP-ORDER:${orderNo}|CUST:${encodeURIComponent(custName)}|REM:${remaining}`}
                    alt="QR Code"
                    className="w-24 h-24 border border-black p-1 rounded-md"
                  />
                  <p className="text-[8.5px] text-gray-600 mt-1">امسحي الكود لمتابعة حالة تفصيل الفستان</p>
                </div>

                {/* Footer Notes */}
                <div className="text-[8.5px] text-gray-600 space-y-0.5 border-t border-dashed border-gray-400 pt-2 text-center">
                  <p>• العربون لا يُسترجع بعد بدء مرحلة القص والتفصيل.</p>
                  <p>• نرجو إحضار أصل الإيصال عند موعد البروفة والاستلام.</p>
                  <p className="font-bold text-black mt-1">نسعد بزيارتكم وثقتكم بدار الأميرات الصغيرات 🌸</p>
                </div>
              </div>
            )}


            {/* ══════════════════════════════════════════════════════════════════════
                قالب 2: بطاقة أمر التشغيل والتفصيل للورشة (Workshop Job Ticket)
            ══════════════════════════════════════════════════════════════════════ */}
            {activeTemplate === 'job_ticket' && (
              <div className="job-container font-sans text-right space-y-4">
                {/* Header Strip */}
                <div className="flex justify-between items-start border-b-2 border-black pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">👑</span>
                      <h1 className="text-lg font-black text-black">بطاقة أمر تشغيل ومعمل (Workshop Job Ticket)</h1>
                    </div>
                    <p className="text-xs text-gray-600 font-bold">دار الأميرات الصغيرات للأزياء الراقية • قسم التفصيل والإنتاج</p>
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

                {/* Detailed Body Measurements Matrix */}
                <div>
                  <h3 className="text-xs font-bold text-black mb-2 flex items-center gap-1.5">
                    <span>📐</span>
                    <span>مصفوفة مقاسات الطفلة التفصيلية (Body Measurements):</span>
                  </h3>
                  <div className="measurements-grid text-xs">
                    <div className="meas-box">
                      <span className="text-[10px] text-gray-500 block">الطول الكلي</span>
                      <span className="font-mono font-bold text-sm">{m.total_height || m.total_length || m.total_len || '—'}</span>
                    </div>
                    <div className="meas-box">
                      <span className="text-[10px] text-gray-500 block">طول الفستان</span>
                      <span className="font-mono font-bold text-sm text-[#B0005A]">{m.dress_length || m.dress_len || '—'}</span>
                    </div>
                    <div className="meas-box">
                      <span className="text-[10px] text-gray-500 block">محيط الصدر</span>
                      <span className="font-mono font-bold text-sm">{m.chest_circ || '—'}</span>
                    </div>
                    <div className="meas-box">
                      <span className="text-[10px] text-gray-500 block">محيط الخصر</span>
                      <span className="font-mono font-bold text-sm">{m.waist_circ || '—'}</span>
                    </div>
                    <div className="meas-box">
                      <span className="text-[10px] text-gray-500 block">طول الصدر (للخصر)</span>
                      <span className="font-mono font-bold text-sm">{m.chest_length || m.chest_len || '—'}</span>
                    </div>
                    <div className="meas-box">
                      <span className="text-[10px] text-gray-500 block">طول التنورة</span>
                      <span className="font-mono font-bold text-sm">{m.skirt_length || m.skirt_len || '—'}</span>
                    </div>
                    <div className="meas-box">
                      <span className="text-[10px] text-gray-500 block">طول الكم</span>
                      <span className="font-mono font-bold text-sm">{m.sleeve_length || m.sleeve_len || '—'}</span>
                    </div>
                    <div className="meas-box">
                      <span className="text-[10px] text-gray-500 block">عرض الكتف</span>
                      <span className="font-mono font-bold text-sm">{m.shoulder_width || m.shoulder_w || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Fabrics, Colors, and Special Instructions */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border border-gray-200 p-3 rounded-xl bg-[#FAFAFB]">
                    <span className="font-bold text-black block mb-1">🧵 الأقمشة والخامات المطلوبة:</span>
                    <p className="text-gray-700 text-[11px] leading-relaxed">
                      {m.dress_color ? `اللون: ${m.dress_color} | ` : ''}
                      قماش كريب ستان ملكي فاخر، تول فرنسي متعدد الطبقات، بطانة قطنية 100% مريحة لجسم الطفلة.
                    </p>
                  </div>
                  <div className="border border-gray-200 p-3 rounded-xl bg-[#FAFAFB]">
                    <span className="font-bold text-black block mb-1">✨ تعليمات الشك والتطريز والتشطيب:</span>
                    <p className="text-gray-700 text-[11px] leading-relaxed">
                      {m.sewing_notes || m.notes || 'تطريز يدوي على منطقة الصدر، تركيب فيونكة خلفية متحركة، سحاب مخفي مع أزرار لؤلؤية.'}
                    </p>
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
            )}


            {/* ══════════════════════════════════════════════════════════════════════
                قالب 3: كرت ملصق الفستان (Dress Hangtag / Barcode Label)
            ══════════════════════════════════════════════════════════════════════ */}
            {activeTemplate === 'hangtag' && (
              <div className="hangtag-container font-sans">
                {/* Hole punch indicator */}
                <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-gray-400 mx-auto mb-2"></div>

                <div>
                  <div className="text-2xl">👑</div>
                  <h1 className="text-xs font-black text-[#B0005A] tracking-wider mt-1">LITTLE PRINCESSES</h1>
                  <p className="text-[8px] font-bold text-gray-500">HAUTE COUTURE</p>
                </div>

                <div className="my-2 border-t border-b border-gray-200 py-2 space-y-1 text-center">
                  <span className="text-[11px] font-black text-black block truncate">{prodName}</span>
                  <span className="text-[10px] font-bold text-[#8F2A87] block">للأميرة: {childName}</span>
                  <span className="text-[9px] font-mono text-gray-600 block">{orderNo}</span>
                </div>

                <div className="my-2">
                  <span className="text-[10px] text-gray-500 block">السعر المعتمد</span>
                  <span className="text-base font-black font-mono text-black">{total.toLocaleString('en-US')} {cur}</span>
                </div>

                {/* Simulated Barcode */}
                <div className="mt-auto">
                  <div className="flex justify-center items-end h-8 gap-0.5 my-1 px-4">
                    {[3,1,2,4,1,3,2,1,4,2,3,1,2,4,1,3,2,1].map((w, i) => (
                      <div key={i} className="bg-black h-full" style={{ width: `${w * 1.5}px` }}></div>
                    ))}
                  </div>
                  <span className="text-[8px] font-mono text-gray-600 block">{orderNo}-2026</span>
                  <span className="text-[7.5px] text-gray-400 block mt-1">صنع بكل حب في دار الأميرات 🌸</span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

window.PrintModal = PrintModal;
