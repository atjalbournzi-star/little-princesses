const FACTORY_STAGES = [
  'القص والتحضير ✂️',
  'مرحلة الخياطة 🪡',
  'التطريز والشك ✨',
  'الفحص والتشطيب النهائي 🔍',
  'جاهز للتسليم 📦'
];

const STAGE_PROGRESS = {
  'القص والتحضير ✂️': 20,
  'مرحلة الخياطة 🪡': 40,
  'التطريز والشك ✨': 60,
  'الفحص والتشطيب النهائي 🔍': 80,
  'جاهز للتسليم 📦': 100
};

const addDays = (dateStr, days) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const autoDistributeMilestones = (startDateStr, dueDateStr) => {
  const todayIso = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : (window.TODAY_STR_ISO || new Date().toISOString().slice(0, 10));
  const start = new Date(startDateStr || todayIso);
  const end = new Date(dueDateStr || addDays(todayIso, 5));
  const totalDiffMs = Math.max(86400000, end - start);
  const totalDays = Math.max(1, Math.round(totalDiffMs / 86400000));
  
  const cutDays = Math.max(1, Math.round(totalDays * 0.25));
  const sewDays = Math.max(cutDays + 1, Math.round(totalDays * 0.60));
  const embDays = Math.max(sewDays + 1, Math.round(totalDays * 0.85));
  
  const dCut = new Date(start.getTime() + cutDays * 86400000).toISOString().split('T')[0];
  const dSew = new Date(start.getTime() + sewDays * 86400000).toISOString().split('T')[0];
  const dEmb = new Date(start.getTime() + embDays * 86400000).toISOString().split('T')[0];
  const dFin = end.toISOString().split('T')[0];
  return { cutting: dCut, sewing: dSew, embroidery: dEmb, finishing: dFin };
};

const calculateMetersForModel = (productName, childName, customerName, products = [], customers = [], fabricInventory = []) => {
  const p = (products || []).find(prod => prod.name === productName || prod.model_name === productName);
  const c = (customers || []).find(cust => (cust.name && cust.name === customerName) || (cust.customer_name && cust.customer_name === customerName));
  const m = c?.measurements?.find(meas => meas.child_name === childName) || c?.measurements?.[0];
  const ageBracket = m?.estimated_age || '6-9 سنوات';
  
  if (p && Array.isArray(p.bom) && p.bom.length > 0) {
    const firstBom = p.bom[0];
    const br = firstBom.brackets || {};
    const meters = parseFloat(br[ageBracket] || br['6-9 سنوات'] || firstBom.meters || 0);
    return {
      fabric: firstBom.fabric_name || firstBom.name || (fabricInventory[0]?.name || fabricInventory[0]?.item_name || 'تفتة تركي'),
      meters: meters || 3.0
    };
  }
  
  let dressLen = parseFloat(m?.dress_len || m?.dress_length || 0);
  if (m?.unit === 'إنش' || m?.unit === 'انش' || m?.unit === 'inch') {
    dressLen = dressLen * 2.54;
  }
  let estimatedM = 3.0;
  if (dressLen > 0) {
    if (dressLen <= 55) estimatedM = 2.0;
    else if (dressLen <= 75) estimatedM = 3.0;
    else if (dressLen <= 95) estimatedM = 4.0;
    else estimatedM = 5.0;
  }
  return {
    fabric: (fabricInventory.length > 0 ? (fabricInventory[0].name || fabricInventory[0].item_name) : 'تفتة تركي'),
    meters: estimatedM,
    unit: 'متر'
  };
};

const getDaysLeft = (dueDate) => {
  if (!dueDate) return '—';
  const diff = new Date(dueDate) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return <span className="text-[#D64545] font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">متأخر {-days} يوم ⚠️</span>;
  if (days === 0) return <span className="text-[#C97300] font-bold bg-[#FFF1DC] px-2 py-0.5 rounded-md border border-[#FFE4B9]">التسليم اليوم! 🔥</span>;
  return <span className="text-[#007F8C] font-bold bg-[#E2F5F7] px-2 py-0.5 rounded-md border border-[#C5ECF0]">متبقي {days} يوم</span>;
};

const sendWhatsAppToTailor = (f) => {
  const phone = f.tailor_phone || '';
  const orderNo = f.order_no || f.id;
  const host = window.location.origin || 'http://localhost:5000';
  const jobCardUrl = `${host}/job_card.html?id=${encodeURIComponent(orderNo)}`;
  const text = `👑 *ليتل برنسيس للأزياء الفاخرة* 👑\nأهلاً بك يا ${f.tailor || 'معلم'}، تم إسناد أمر تشغيل وتفصيل جديد إليك:\n👗 *الموديل:* ${f.product || f.product_name}\n👧 *للأميرة:* ${f.child_name || 'الأميرة'}\n📋 *رقم الأمر:* ${orderNo}\n💰 *أجر القطعة:* ${f.tailor_wage || 5000} ر.ي\n⏱️ *موعد التسليم النهائي:* ${f.due_date || 'محدد في البطاقة'}\n\n📲 *رابط بطاقة التشغيل والمقاسات التفصيلية للجوال:*\n${jobCardUrl}\n\nيرجى فتح الرابط لبدء التنفيذ والضغط على (أتممت عملي) فور الانتهاء لاعتماد الجودة والعمولة ✂️✨`;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const waUrl = cleanPhone ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
};

const sendWhatsAppDeliveryGreeting = (data, deliveryModalData, deliveryForm, customers = []) => {
  const cName = data?.customer_name || deliveryModalData?.customer_name || deliveryModalData?.customer || 'العميلة الكريمة';
  const chName = data?.child_name || deliveryModalData?.child_name || 'الأميرة';
  const pName = data?.product_name || deliveryModalData?.product || 'فستان الأميرات الفاخر';
  const orderNo = data?.order_no || deliveryModalData?.order_no || deliveryModalData?.id;
  const paidAmt = parseFloat(deliveryForm?.amount_collected || 0);

  const msg = `👑 *ليتل برنسيس للأزياء الفاخرة* 👑\n\nألف مبارك استلام الفستان الملكي لأميرتنا الجميلة *${chName}*! 🌸✨\n\n👗 *الموديل:* ${pName}\n📋 *رقم الطلب:* ${orderNo}\n${paidAmt > 0 ? `💰 *المبلغ المحصل عند التسليم:* ${paidAmt.toLocaleString()} ر.ي\n` : ''}✅ *حالة الطلب:* تم التسليم بالكامل وبأعلى معايير الجودة الملكية.\n\nنتمنى لأميرتنا الصغيرة إطلالة ساحرة تملأ قلوبكم بهجة وسعادة! نسعد دائماً بخدمتكم وتجدد لقائكم معنا 💖👑`;

  const cust = (customers || []).find(c => (c.name && cName.includes(c.name)) || (cName && c.name && cName.includes(c.name)));
  const phone = (cust?.phone || cust?.['رقم الهاتف'] || '').replace(/[^0-9]/g, '');
  const waUrl = phone 
    ? `https://api.whatsapp.com/send?phone=${phone.startsWith('0') ? '967' + phone.substring(1) : (phone.startsWith('967') ? phone : '967' + phone)}&text=${encodeURIComponent(msg)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
};

window.FactoryUtils = {
  FACTORY_STAGES,
  STAGE_PROGRESS,
  addDays,
  autoDistributeMilestones,
  calculateMetersForModel,
  getDaysLeft,
  sendWhatsAppToTailor,
  sendWhatsAppDeliveryGreeting
};
