/**
 * ============================================================================
 * PrintModal.jsx — Multi-Template Print & Export Orchestrator
 * Architecture: Modular Print Orchestrator | Little Princesses ERP
 * ============================================================================
 */

const { useState, useRef } = React;

function PrintModal({ order, customer, measurements, product, products, isOpen, onClose, defaultTemplate = 'thermal' }) {
  if (!isOpen || !order) return null;

  const ThermalComp = window.ThermalReceiptTemplate || (() => null);
  const JobComp = window.JobTicketTemplate || (() => null);
  const MeasComp = window.MeasurementInvoiceTemplate || (() => null);

  const [activeTemplate, setActiveTemplate] = useState(defaultTemplate);
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

  const initialChildName = order.child_name || customer?.measurements?.[0]?.child_name || 'الأميرة';
  const m = measurements || customer?.measurements?.find(x => x.child_name === initialChildName) || customer?.measurements?.[0] || {};

  let childName = order.child_name;
  if (!childName || childName === custName || childName.startsWith('ام ') || childName.startsWith('أم ')) {
    const measChild = customer?.measurements?.find(x => x.child_name && x.child_name !== custName)?.child_name;
    const custChild = customer?.children?.find(x => x.child_name && x.child_name !== custName)?.child_name;
    if (measChild) childName = measChild;
    else if (custChild) childName = custChild;
    else if (m.child_name && m.child_name !== custName) childName = m.child_name;
    else if (!childName) childName = 'الأميرة';
  }

  const targetProduct = product || (products && products.find(p => 
    (order.product_id && (String(p.id) === String(order.product_id) || String(p.product_id) === String(order.product_id))) ||
    (p.name && (p.name === prodName || prodName.includes(p.name))) ||
    (p.model_name && (p.model_name === prodName || prodName.includes(p.model_name)))
  ));

  const fabricItems = [];
  const rawBom = (Array.isArray(order.bom_items) && order.bom_items.length) ? order.bom_items
    : (Array.isArray(targetProduct?.bom) && targetProduct.bom.length ? targetProduct.bom
    : (Array.isArray(targetProduct?.materials) && targetProduct.materials.length ? targetProduct.materials : []));
  if (rawBom.length > 0) {
    const ageB = m.estimated_age || '6-9 سنوات';
    rawBom.forEach(b => {
      const bName = b.fabric_name || b.name || b.item_name;
      if (!bName) return;
      const br = b.brackets || b.consumption_by_size || {};
      const u = b.cut_unit || b.unit || 'متر';
      const mVal = parseFloat(br[ageB] || br['6-9Y'] || br['6-9 سنوات'] || br['6-7Y'] || Object.values(br)[0] || b.cut_meters || b.meters || b.quantity || 0);
      if (mVal > 0) {
        const tot = (mVal * qty).toFixed(1).replace(/\.0$/, '');
        fabricItems.push(`${bName} - ${tot} ${u} (${mVal}${u} × ${qty})`);
      } else {
        fabricItems.push(`${bName} (${u})`);
      }
    });
  } else if (order.fabric_name || order.fabric || targetProduct?.fabric_name || m.fabric_name || m.fabric) {
    const fName = order.fabric_name || order.fabric || targetProduct?.fabric_name || m.fabric_name || m.fabric;
    fabricItems.push(`${fName} - ${(2.5 * qty).toFixed(1).replace(/\.0$/, '')} متر`);
  }

  const fallbackFabricText = (order.fabric_name || targetProduct?.fabric_name || targetProduct?.description || 'حسب مواصفات وخامات الموديل المعتمدة بالكتالوج');

  let comfortText = '';
  if (m.comfort_profile) {
    if (Array.isArray(m.comfort_profile)) comfortText = m.comfort_profile.filter(Boolean).join('، ');
    else if (typeof m.comfort_profile === 'string') {
      try {
        const parsed = JSON.parse(m.comfort_profile);
        if (Array.isArray(parsed)) comfortText = parsed.filter(Boolean).join('، ');
        else comfortText = m.comfort_profile;
      } catch (e) {
        comfortText = m.comfort_profile.replace(/[\[\]"']/g, '').trim();
      }
    }
  }

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
            * { box-sizing: border-box; margin: 0; padding: 0; font-feature-settings: "locl" 0, "lnum" 1, "tnum" 1 !important; font-variant-numeric: tabular-nums lining-nums; }
            body { font-family: 'Inter', 'Tajawal', sans-serif; color: #25232A; background: #FFF; direction: rtl; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .font-mono { font-family: 'JetBrains Mono', monospace; }
            @media print {
              @page { margin: 0; size: ${activeTemplate === 'thermal' ? '80mm auto' : (activeTemplate === 'hangtag' ? '70mm 125mm' : (activeTemplate === 'garment_bag' ? '105mm 155mm' : 'auto'))}; }
              body { padding: ${activeTemplate === 'thermal' ? '8px' : '12px'}; }
              .no-print { display: none !important; }
            }
            .thermal-container { width: 78mm; margin: 0 auto; padding: 10px 6px; font-size: 11.5px; line-height: 1.4; }
            .dashed-line { border-top: 1px dashed #444; margin: 8px 0; }
            .double-line { border-top: 2px dashed #000; margin: 10px 0; }
            .table-thermal { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 11px; }
            .table-thermal th, .table-thermal td { padding: 4px 2px; }
            .job-container { max-width: 780px; margin: 0 auto; padding: 20px; border: 2px solid #25232A; border-radius: 12px; }
            .measurements-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
            .meas-box { border: 1px solid #CCC; padding: 6px; text-align: center; border-radius: 6px; background: #FAFAFB; }
            .hangtag-container { width: 68mm; min-height: 115mm; margin: 0 auto; padding: 14px 10px; border: 2px solid #8F2A87; border-radius: 16px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; background: #FFF; }
            .garment-bag-container { width: 98mm; min-height: 140mm; margin: 0 auto; padding: 14px 12px; border: 3px double #8F2A87; border-radius: 16px; background: #FFF; color: #25232A; display: flex; flex-direction: column; justify-content: space-between; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  const tabs = [
    { id: 'thermal', label: '🧾 فاتورة استلام حرارية (80mm POS)' },
    { id: 'job_ticket', label: '🧵 بطاقة أمر العمل للورشة (Job Ticket)' },
    { id: 'hangtag', label: '🏷️ كرت تعليق الفستان الفاخر (Hang Tag)' },
    { id: 'garment_bag', label: '🛍️ ملصق كيس حفظ الفستان (Garment Bag)' },
    { id: 'dress_card', label: '👑 وثيقة فستان الأميرة (Dress Card)' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-[#E8E5EA] overflow-hidden flex flex-col my-auto max-h-[92vh]">
        <div className="px-6 py-4 border-b border-[#E8E5EA] bg-[#FAFAFB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCE8F2] text-[#B0005A] border border-[#F2A4CB] flex items-center justify-center text-lg font-bold shadow-2xs">🖨️</div>
            <div>
              <h2 className="font-extrabold text-sm text-[#25232A]">محرك ومركز الطباعة الموحد (Unified Print Hub)</h2>
              <p className="text-[11px] text-[#6F6B75]">نماذج الطباعة الحرارية، أوامر العمل، كروت الفساتين والملصقات</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleExecutePrint} className="px-5 py-2.5 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-2 cursor-pointer">
              <span>🖨️ طباعة الآن (Print)</span>
            </button>
            <button type="button" onClick={onClose} className="px-3.5 py-2.5 bg-white border border-[#E8E5EA] text-[#6F6B75] hover:text-[#25232A] rounded-xl text-xs font-bold transition cursor-pointer">إلغاء ✕</button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-[#E8E5EA] bg-white flex items-center gap-2 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setActiveTemplate(t.id)} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${activeTemplate === t.id ? 'bg-[#8F2A87] text-white shadow-xs' : 'bg-[#FAFAFB] text-[#6F6B75] hover:bg-[#F2E7F3] border border-[#E8E5EA]'}`}>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6 bg-[#F0EEF2] overflow-y-auto flex-1 flex justify-center items-start">
          <div ref={printAreaRef} className="bg-white shadow-xl rounded-2xl p-6 transition-all border border-[#CCC]" style={{ width: activeTemplate === 'thermal' ? '340px' : (activeTemplate === 'hangtag' ? '300px' : (activeTemplate === 'garment_bag' ? '410px' : '100%')), maxWidth: (activeTemplate === 'job_ticket' || activeTemplate === 'dress_card') ? '720px' : 'none' }}>
            {activeTemplate === 'thermal' && (
              <ThermalComp brandProfile={brandProfile} orderNo={orderNo} orderDate={orderDate} custName={custName} phone={phone} childName={childName} order={order} prodName={prodName} qty={qty} total={total} paid={paid} remaining={remaining} cur={cur} deliveryDate={deliveryDate} />
            )}
            {activeTemplate === 'job_ticket' && (
              <JobComp brandProfile={brandProfile} orderNo={orderNo} orderDate={orderDate} custName={custName} childName={childName} prodName={prodName} qty={qty} m={m} fabricItems={fabricItems} fallbackFabricText={fallbackFabricText} comfortText={comfortText} resolvedSewingNotes={resolvedSewingNotes} deliveryDate={deliveryDate} order={order} />
            )}
            {(activeTemplate === 'hangtag' || activeTemplate === 'garment_bag') && (
              <MeasComp activeTemplate={activeTemplate} brandProfile={brandProfile} orderNo={orderNo} custName={custName} childName={childName} prodName={prodName} qty={qty} m={m} total={total} remaining={remaining} cur={cur} deliveryDate={deliveryDate} phone={phone} />
            )}
            {activeTemplate === 'dress_card' && (
              <div className="text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#8F2A87] flex items-center justify-center text-3xl mx-auto border border-purple-200">👑</div>
                <h3 className="font-bold text-base text-[#701A75]">وثيقة وكرت تفصيل فستان الأميرة الملكي</h3>
                <p className="text-xs text-[#6F6B75]">شهادة ملكية معتمدة وشاملة للمواصفات والضمان والخامات والباركود للأميرة {childName}</p>
                <div className="pt-2">
                  <a href={`/dress_card.html?order=${encodeURIComponent(orderNo)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#701A75] to-[#8F2A87] text-white rounded-xl text-xs font-extrabold shadow-md hover:opacity-95 transition">
                    <span>👑 فتح وثيقة الفستان الفاخرة للطباعة والمشاركة</span>
                  </a>
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
window.PrintEngineModal = PrintModal;
