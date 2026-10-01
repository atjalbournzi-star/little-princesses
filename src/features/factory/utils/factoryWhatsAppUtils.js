/**
 * factoryWhatsAppUtils.js - توجيه المهام للفنيين وبروتوكول الإنتاج الأعمى (Blind Production Dispatch)
 * Little Princesses ERP - Production Floor Architecture
 */

const STAGE_TITLES = {
  cutter: { name: 'فني القص والتحضير', icon: '✂️', field: 'cutter_wage', dateField: 'cutting_due_date' },
  tailor: { name: 'الخياط المسؤول', icon: '🪡', field: 'tailor_wage', dateField: 'sewing_due_date' },
  embroiderer: { name: 'فني التطريز والشك', icon: '✨', field: 'embroiderer_wage', dateField: 'embroidery_due_date' },
  finisher: { name: 'فني الفحص والتشطيب', icon: '🔍', field: 'finisher_wage', dateField: 'finishing_due_date' }
};

const formatStageMessage = ({
  stageRole,
  technicianName,
  orderNo,
  productName,
  sizeCode,
  wage,
  dueDate,
  fabricName,
  cutMeters,
  cutUnit,
  quantity = 1,
  specs = {},
  notes = ''
}) => {
  const meta = STAGE_TITLES[stageRole] || { name: 'الفني المسؤول', icon: '🧵' };
  const host = typeof window !== 'undefined' ? (window.location.origin || 'http://localhost:5000') : 'http://localhost:5000';
  const cleanOrder = encodeURIComponent(orderNo || 'JOB-ORD');
  const jobCardUrl = `${host}/job_card.html?id=${cleanOrder}`;

  let lines = [
    `👑 *ليتل برنسيس للأزياء الفاخرة* 👑`,
    `السلام عليكم ورحمة الله وبركاته، مرحباً ${technicianName || 'يا معلم'} 🌸`,
    ``,
    `تم إسناد مرحلة عمل جديدة إليك في المشغل:`,
    `${meta.icon} *المرحلة:* ${meta.name}`,
    `📋 *رقم أمر التشغيل:* ${orderNo}`,
    `👗 *الموديل:* ${productName || 'فستان أميرات فاخر'}`,
    `🏷️ *المقاس المعتمد:* ${sizeCode || 'حسب المواصفات الفنية'}`,
    `🔢 *الكمية المطلوبة:* ${quantity} قطعة`,
    `💰 *الأجر المعتمد للقطعة:* ${parseFloat(wage || 0).toLocaleString()} ر.ي`,
    `⏱️ *موعد التسليم الإلزامي للمرحلة:* ${dueDate || 'محدد في بطاقة العمل'}`,
    ``
  ];

  if (fabricName) {
    lines.push(`🧵 *خامة القماش:* ${fabricName} (${cutMeters || '—'} ${cutUnit || 'متر'})`);
  }

  // Measurements Spec (Blind Production: strictly technical specs)
  const specList = [];
  if (specs.dress_len) specList.push(`- طول الفستان: ${specs.dress_len} سم`);
  if (specs.chest_circ) specList.push(`- محيط الصدر: ${specs.chest_circ} سم`);
  if (specs.waist_circ) specList.push(`- محيط الخصر: ${specs.waist_circ} سم`);
  if (specs.shoulder_w) specList.push(`- عرض الكتف: ${specs.shoulder_w} سم`);
  if (specs.sleeve_len) specList.push(`- طول الكم: ${specs.sleeve_len} سم`);
  if (specs.total_len) specList.push(`- الطول الكلي: ${specs.total_len} سم`);

  if (specList.length > 0) {
    lines.push(`📐 *المقاسات والمواصفات الفنية للقطعة:*`);
    lines.push(...specList);
    lines.push(``);
  }

  if (notes) {
    lines.push(`📝 *تعليمات وملاحظات التشغيل:*`);
    lines.push(notes);
    lines.push(``);
  }

  lines.push(`📲 *رابط بطاقة التشغيل الرقمية والمتابعة للجوال:*`);
  lines.push(`${jobCardUrl}`);
  lines.push(``);
  lines.push(`يرجى فتح الرابط لبدء التنفيذ، والضغط على (أتممت عملي) فور الانتهاء لاعتماد الفحص وصرف المستحقات ✂️✨`);

  return lines.join('\n');
};

const sendWhatsAppToStage = ({
  stageRole,
  form,
  employees = [],
  specs = {},
  showToast
}) => {
  const meta = STAGE_TITLES[stageRole] || { name: 'الفني' };
  let techName = '';
  let wage = 0;
  let dueDate = '';

  if (stageRole === 'cutter') {
    techName = form.cutter_name;
    wage = form.cutter_wage;
    dueDate = form.cutting_due_date || form.due_date;
  } else if (stageRole === 'tailor') {
    techName = form.tailor_name || form.tailor;
    wage = form.tailor_wage;
    dueDate = form.sewing_due_date || form.due_date;
  } else if (stageRole === 'embroiderer') {
    techName = form.embroiderer_name;
    wage = form.embroiderer_wage;
    dueDate = form.embroidery_due_date || form.due_date;
  } else if (stageRole === 'finisher') {
    techName = form.finisher_name;
    wage = form.finisher_wage;
    dueDate = form.finishing_due_date || form.due_date;
  }

  if (!techName) {
    if (showToast) showToast(`يرجى اختيار اسم ${meta.name} أولاً لتوجيه الرسالة ⚠️`, 'warning');
    return;
  }

  const emp = (employees || []).find(e => e.name === techName || e.id === techName);
  let rawPhone = emp?.phone || emp?.mobile || form[`${stageRole}_phone`] || '';
  let cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '967' + cleanPhone.slice(1);
  else if (cleanPhone && !cleanPhone.startsWith('967') && cleanPhone.length === 9) cleanPhone = '967' + cleanPhone;

  const msg = formatStageMessage({
    stageRole,
    technicianName: techName,
    orderNo: form.order_no || form.id || 'JOB-ORDER',
    productName: form.product || form.product_name,
    sizeCode: form.size_code || form.standard_size || (form.production_type === 'ready_to_wear' ? 'جاهز' : 'تفصيل مخصص'),
    wage: wage,
    dueDate: dueDate,
    fabricName: form.fabric_name,
    cutMeters: form.cut_meters,
    cutUnit: form.cut_unit,
    quantity: form.quantity || 1,
    specs: specs,
    notes: form.notes
  });

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

  window.open(waUrl, '_blank');
  if (showToast) showToast(`تم إنشاء وتوجيه تفاصيل المرحلة إلى ${techName} عبر الواتساب 📲✨`, 'success');
};

window.FactoryWhatsAppUtils = {
  STAGE_TITLES,
  formatStageMessage,
  sendWhatsAppToStage
};
