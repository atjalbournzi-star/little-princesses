const { useState, useEffect, useRef } = React;

function PrintModal({ order, customer, measurements, product, products, isOpen, onClose, defaultTemplate = 'thermal' }) {
  if (!isOpen || !order) return null;

  const [activeTemplate, setActiveTemplate] = useState(defaultTemplate); // 'thermal', 'job_ticket', 'hangtag'
  const printAreaRef = useRef(null);

  const brandProfile = (typeof window !== 'undefined' && window.BrandService)
    ? window.BrandService.getProfile()
    : {
        name: 'نظام الإدارة المتكامل الذكي',
        shortName: 'ERP Master',
        tagline: 'نظام تخطيط موارد المؤسسات المتكامل',
        commercialRegister: '1010-009283',
        phone: '776773458',
        address: 'اليمن - الإدارة العامة',
        email: 'info@erp-master.com',
        logoUrl: '',
        systemIcon: '🏢'
      };

  const orderNo = order.order_no || `ORD-${order.id}`;
  const custName = order.customer_name || customer?.name || 'عميلة راقية';
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
  const initialChildName = order.child_name || customer?.measurements?.[0]?.child_name || 'الأميرة';
  const m = measurements || customer?.measurements?.find(x => x.child_name === initialChildName) || customer?.measurements?.[0] || {};

  // Resolve child name properly if it matched mother's name or was prefixed
  let childName = order.child_name;
  if (!childName || childName === custName || childName.startsWith('ام ') || childName.startsWith('أم ')) {
    const measChild = customer?.measurements?.find(x => x.child_name && x.child_name !== custName)?.child_name;
    const custChild = customer?.children?.find(x => x.child_name && x.child_name !== custName)?.child_name;
    if (measChild) childName = measChild;
    else if (custChild) childName = custChild;
    else if (m.child_name && m.child_name !== custName) childName = m.child_name;
    else if (!childName) childName = 'الأميرة';
  }

  // Resolve Target Product from props or products catalog
  const targetProduct = product || (products && products.find(p => 
    (order.product_id && (String(p.id) === String(order.product_id) || String(p.product_id) === String(order.product_id))) ||
    (p.name && (p.name === prodName || prodName.includes(p.name))) ||
    (p.model_name && (p.model_name === prodName || prodName.includes(p.model_name)))
  ));

  // Resolve Fabrics and Materials dynamically
  const fabricItems = [];
  if (targetProduct && Array.isArray(targetProduct.bom) && targetProduct.bom.length > 0) {
    const ageBracket = m.estimated_age || '6-9 سنوات';
    targetProduct.bom.forEach(b => {
      const bName = b.fabric_name || b.name || b.item_name;
      if (bName) {
        const br = b.brackets || {};
        const metersPerDress = parseFloat(br[ageBracket] || br['6-9 سنوات'] || b.meters || b.quantity || 0);
        if (metersPerDress > 0) {
          const totalMeters = (metersPerDress * qty).toFixed(1).replace(/\.0$/, '');
          fabricItems.push(`${bName} - ${totalMeters} متر (${metersPerDress}م × ${qty})`);
        } else {
          fabricItems.push(bName);
        }
      }
    });
  } else if (order.fabric_name || order.fabric) {
    fabricItems.push(order.fabric_name || order.fabric);
  } else if (targetProduct?.fabric_name && targetProduct.fabric_name.trim()) {
    fabricItems.push(targetProduct.fabric_name);
  } else if (m.fabric_name || m.fabric) {
    fabricItems.push(m.fabric_name || m.fabric);
  }

  const fallbackFabricText = (
    order.fabric_name ||
    targetProduct?.fabric_name ||
    targetProduct?.description ||
    'حسب مواصفات وخامات الموديل المعتمدة بالكتالوج'
  );

  // Parse comfort profile / notes
  let comfortText = '';
  if (m.comfort_profile) {
    if (Array.isArray(m.comfort_profile)) {
      comfortText = m.comfort_profile.filter(Boolean).join('، ');
    } else if (typeof m.comfort_profile === 'string') {
      try {
        const parsed = JSON.parse(m.comfort_profile);
        if (Array.isArray(parsed)) comfortText = parsed.filter(Boolean).join('، ');
        else comfortText = m.comfort_profile;
      } catch (e) {
        comfortText = m.comfort_profile.replace(/[\[\]"']/g, '').trim();
      }
    }
  }

  // Sewing / Embroidery notes
  const resolvedSewingNotes = m.sewing_notes || order.sewing_notes || order.notes || (typeof m.notes === 'string' && m.notes.trim()) || '';

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
                size: ${activeTemplate === 'thermal' ? '80mm auto' : (activeTemplate === 'hangtag' ? '70mm 125mm' : (activeTemplate === 'garment_bag' ? '105mm 155mm' : 'auto'))};
              }
              body { padding: ${activeTemplate === 'thermal' ? '8px' : '12px'}; }
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
              width: 68mm;
              min-height: 115mm;
              margin: 0 auto;
              padding: 14px 10px;
              border: 2px solid #8F2A87;
              border-radius: 16px;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #FFF;
            }

            /* Garment Bag Label Styling (100mm x 145mm) */
            .garment-bag-container {
              width: 98mm;
              min-height: 140mm;
              margin: 0 auto;
              padding: 14px 12px;
              border: 3px double #8F2A87;
              border-radius: 16px;
              background: #FFF;
              color: #25232A;
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
              <h2 className="font-extrabold text-sm text-[#25232A]">محرك طباعة الفواتير وسندات الاستلام وأوامر العمل</h2>
              <p className="text-[11px] text-[#6F6B75]">معاينة وتخصيص نماذج الطباعة الحرارية والمشاغل الرسمية</p>
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
            { id: 'hangtag', label: '🏷️ كرت تعليق الفستان الفاخر (Hang Tag)', icon: '🏷️' },
            { id: 'garment_bag', label: '🛍️ ملصق كيس حفظ الفستان (Garment Bag)', icon: '🛍️' }
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTemplate(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTemplate === t.id
                  ? 'bg-[#8F2A87] text-white shadow-xs'
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
              width: activeTemplate === 'thermal' ? '340px' : (activeTemplate === 'hangtag' ? '300px' : (activeTemplate === 'garment_bag' ? '410px' : '100%')),
              maxWidth: activeTemplate === 'job_ticket' ? '720px' : 'none'
            }}
          >

            {/* ══════════════════════════════════════════════════════════════════════
                قالب 1: فاتورة الاستقبال والمبيعات الحرارية (80mm Thermal Receipt)
            ══════════════════════════════════════════════════════════════════════ */}
            {activeTemplate === 'thermal' && (
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
                  <p className="font-bold text-black mt-1">نسعد بخدمتكم وثقتكم بنا دائماً 🌸</p>
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
                    <span className="font-bold text-black block mb-1.5 flex items-center gap-1.5">
                      <span>🧵</span>
                      <span>الأقمشة والخامات المطلوبة:</span>
                    </span>
                    <div className="text-gray-700 text-[11px] leading-relaxed space-y-1.5">
                      {m.dress_color && (
                        <div className="font-bold text-[#8F2A87] bg-[#FDF8FE] px-2 py-0.5 rounded border border-[#E5CEE7] inline-block">
                          اللون المعتمد: {m.dress_color}
                        </div>
                      )}
                      {fabricItems.length > 0 ? (
                        <div className="space-y-1">
                          {fabricItems.map((fItem, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 font-bold text-gray-900">
                              <span className="text-[#8F2A87] font-bold">•</span>
                              <span>{fItem}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-700 font-medium">
                          {fallbackFabricText}
                        </p>
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
            )}


            {/* ══════════════════════════════════════════════════════════════════════
                قالب 3: كرت تعليق الفستان الفاخر (Luxury Dress Hangtag)
            ══════════════════════════════════════════════════════════════════════ */}
            {activeTemplate === 'hangtag' && (
              <div className="hangtag-container font-sans">
                {/* Hole punch indicator */}
                <div className="w-4 h-4 rounded-full border-2 border-dashed border-[#8F2A87] mx-auto mb-1.5 flex items-center justify-center text-[8px] text-[#8F2A87]">
                  •
                </div>

                {/* Brand Header */}
                <div className="text-center">
                  <div className="text-xl">👑</div>
                  <h1 className="text-xs font-black text-[#8F2A87] tracking-wider">{brandProfile.shortName || brandProfile.name}</h1>
                  <p className="text-[7.5px] font-bold text-gray-500">Haute Couture • للأزياء الراقية</p>
                </div>

                {/* Dress & Princess Info */}
                <div className="my-2 border-t border-b border-purple-100 py-2 space-y-1 text-center bg-pink-50/50 rounded-xl p-1.5">
                  <span className="text-[10px] text-gray-500 block">فستان الأميرة:</span>
                  <span className="text-sm font-black text-[#B0005A] block">{childName} 👧</span>
                  <span className="text-[10.5px] font-bold text-gray-800 block truncate">{prodName}</span>
                  {m.dress_length && (
                    <span className="text-[9px] text-[#8F2A87] font-bold block">الطول: {m.dress_length} سم • مقاس معتمد</span>
                  )}
                </div>

                {/* Live Customer Tracking QR Code */}
                <div className="text-center my-1">
                  <div className="w-20 h-20 mx-auto p-1 bg-white border border-purple-200 rounded-xl shadow-xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent((typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:5000') + '/track.html?order=' + orderNo)}`}
                      alt="Customer Live Tracking QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[7.5px] text-gray-500 block mt-1">امسحي بالجوال لتتبع الفستان 📱✨</span>
                </div>

                {/* Price & Scannable Barcode */}
                <div className="mt-auto pt-1 border-t border-gray-100">
                  <div className="flex justify-between items-center px-1 mb-1">
                    <span className="text-[9px] text-gray-500">السعر:</span>
                    <span className="text-xs font-black font-mono text-black">{total.toLocaleString('en-US')} {cur}</span>
                  </div>
                  
                  {/* Barcode image */}
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
            )}

            {/* ══════════════════════════════════════════════════════════════════════
                قالب 4: ملصق كيس حفظ الفستان الفاخر (Garment Bag Luxury Sticker)
            ══════════════════════════════════════════════════════════════════════ */}
            {activeTemplate === 'garment_bag' && (
              <div className="garment-bag-container font-sans">
                {/* Header with Luxury Brand */}
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

                {/* Princess & Order Box */}
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

                {/* Dates & Financial Status Grid */}
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

                {/* Quality Seal */}
                <div className="p-2 rounded-lg bg-yellow-50/60 border border-yellow-200/80 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 text-yellow-900 font-bold">
                    <span>✨</span>
                    <span>مفحوص ومعتمد بجودة ليتل برنسيس الملكية</span>
                  </div>
                  <span className="font-mono text-emerald-700 font-bold">PASS ✅</span>
                </div>

                {/* Barcode & QR Code Footer for Scan-to-Deliver */}
                <div className="mt-3 pt-2 border-t-2 border-dashed border-gray-200 flex items-center justify-between gap-3">
                  <div className="text-center shrink-0">
                    <div className="w-16 h-16 p-0.5 bg-white border border-gray-300 rounded-lg shadow-2xs">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent((typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:5000') + '/track.html?order=' + orderNo)}`}
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
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

window.PrintModal = PrintModal;
