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
  const p = (products || []).find(prod => String(prod.id) === String(productName) || prod.name === productName || prod.model_name === productName || (productName && prod.model_name && productName.includes(prod.model_name)) || (productName && prod.name && productName.includes(prod.name)));
  const c = (customers || []).find(cust => (cust.name && cust.name === customerName) || (cust.customer_name && cust.customer_name === customerName));
  const m = c?.measurements?.find(meas => meas.child_name === childName) || c?.measurements?.[0];
  const ageBracket = m?.estimated_age || m?.age_bracket || '6-9Y';
  let dressLen = parseFloat(m?.dress_len || m?.dress_length || 0);
  if (m?.unit === 'إنش' || m?.unit === 'انش' || m?.unit === 'inch') dressLen = dressLen * 2.54;

  const derivedCode = dressLen > 0 ? (dressLen <= 55 ? '1-2Y' : (dressLen <= 75 ? '3-5Y' : (dressLen <= 95 ? '6-9Y' : (dressLen <= 115 ? '10-13Y' : 'M')))) : null;

  if (p && Array.isArray(p.bom) && p.bom.length > 0) {
    const firstBom = p.bom[0];
    const br = firstBom.brackets || {};
    let meters = parseFloat(br[ageBracket] || (derivedCode ? br[derivedCode] : 0) || br['6-9Y'] || br['6-9 سنوات'] || firstBom.meters || 0);
    if (!meters) {
      for (const k of Object.keys(br)) {
        if (derivedCode && k.includes(derivedCode)) { meters = parseFloat(br[k]); break; }
      }
    }
    return {
      fabric: firstBom.fabric_name || firstBom.name || p.fabric_name || (fabricInventory[0]?.name || fabricInventory[0]?.item_name || 'تفتة تركي'),
      meters: meters || (derivedCode ? (dressLen <= 55 ? 2.0 : (dressLen <= 75 ? 2.5 : 3.0)) : 3.0)
    };
  }

  let estimatedM = 3.0;
  if (dressLen > 0) {
    if (dressLen <= 55) estimatedM = 2.0;
    else if (dressLen <= 75) estimatedM = 2.5;
    else if (dressLen <= 95) estimatedM = 3.5;
    else estimatedM = 4.5;
  }
  return {
    fabric: (p?.fabric_name || (fabricInventory.length > 0 ? (fabricInventory[0].name || fabricInventory[0].item_name) : 'تفتة تركي')),
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
  const text = `👑 *ليتل برنسيس للأزياء الفاخرة* 👑\nالسلام عليكم يا ${f.tailor || 'معلم'}، تم إسناد أمر تشغيل جديد إليك بالورشة:\n📋 *رقم أمر التشغيل:* ${orderNo}\n👗 *الموديل:* ${f.product || f.product_name}\n🏷️ *المقاس:* ${f.size_code || 'حسب المواصفات'}\n💰 *أجر القطعة:* ${f.tailor_wage || 500} ر.ي\n⏱️ *موعد الإنجاز:* ${f.due_date || 'محدد في الكرت'}\n\n📲 *رابط بطاقة التشغيل والمواصفات الفنية للجوال:*\n${jobCardUrl}\n\nيرجى فتح الرابط لمراجعة الباترون والضغط على (أتممت عملي) فور الانتهاء لاعتماد الجودة وصرف العمولة ✂️✨`;
  const cleanPhone = String(phone).replace(/[^0-9]/g, '');
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
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

const preparePrintData = (f, orders = [], customers = [], products = []) => {
  const ord = (orders || []).find(o => o.order_no === f.order_no || o.id === f.order_no) || {
    order_no: f.order_no, customer_name: f.customer || f.customer_name, product_name: f.product || f.product_name,
    child_name: f.child_name, delivery_date: f.due_date, qty: f.quantity || 1, quantity: f.quantity || 1
  };
  const targetCust = (ord.customer_name || f.customer || f.customer_name || '').trim();
  const c = (customers || []).find(cust => {
    const cName = (cust.name || cust.customer_name || '').trim();
    return cName === targetCust || targetCust.includes(cName) || (cName && cName.length > 3 && targetCust.includes(cName));
  });
  const targetChild = (ord.child_name && ord.child_name !== targetCust) ? ord.child_name : (f.child_name && f.child_name !== targetCust ? f.child_name : '');
  const childMeas = (targetChild && c?.measurements?.find(m => m.child_name === targetChild)) ||
                    c?.measurements?.find(m => m.child_name && m.child_name !== targetCust) || c?.measurements?.[0];
  const resolvedChildName = targetChild || childMeas?.child_name || ord.child_name || f.child_name || 'هنادي';
  const targetProdName = (ord.product_name || f.product || f.product_name || '').trim();
  const targetProdId = ord.product_id || f.product_id;
  const prod = (products || []).find(p => (targetProdId && (String(p.id) === String(targetProdId) || String(p.product_id) === String(targetProdId))) ||
    p.name === targetProdName || p.model_name === targetProdName || (targetProdName && p.name && targetProdName.includes(p.name)) ||
    (targetProdName && p.model_name && targetProdName.includes(p.model_name)));
  return {
    order: { ...ord, child_name: resolvedChildName, product_name: ord.product_name || f.product || f.product_name, product_id: targetProdId || prod?.id, qty: f.quantity || ord.qty || ord.quantity || 1, quantity: f.quantity || ord.quantity || ord.qty || 1 },
    customer: c, measurements: childMeas, product: prod, products: products
  };
};

const getBespokeOrdersList = (orders = [], customers = [], products = []) => {
  const result = [], seen = new Set();
  (orders || []).forEach(o => {
    if (!o) return;
    const num = o.order_no || o.id || (o.customer_id ? `ORD-${o.customer_id}` : `ORD-${Date.now()}`);
    const cid = o.customer_id || '';
    const cust = (customers || []).find(c => (cid && String(c.id || c.customer_id) === String(cid)) || (c.name && o.customer_name && (c.name === o.customer_name || c.name.includes(o.customer_name) || o.customer_name.includes(c.name))));
    const ch = o.child_name || cust?.children?.[0]?.child_name || cust?.measurements?.[0]?.child_name || 'الأميرة';
    const cName = o.customer_name || cust?.name || cust?.customer_name || 'عميلة كريمة';
    const pName = o.product_name || o.product || cust?.measurements?.[0]?.selected_model || cust?.measurements?.[0]?.model_name || cust?.measurements?.[0]?.profile_name || 'فستان الأميرات';
    const matchedProd = (products || []).find(p => (o.product_id && String(p.id) === String(o.product_id)) || p.model_name === pName || p.name === pName || (pName && ((p.model_name && pName.includes(p.model_name)) || (p.name && pName.includes(p.name)))));
    const meas = o.measurements || o.measurements_spec || cust?.measurements?.find(m => m.child_name === ch) || cust?.measurements?.[0] || {};
    const tot = parseFloat(o.total_amount ?? o.total ?? o.grand_total ?? o.price ?? cust?.ledger?.total_sales ?? cust?.total_sales ?? 0);
    const pd = parseFloat(o.paid_amount ?? o.paid ?? o.deposit ?? cust?.ledger?.total_paid ?? cust?.ledger?.deposit ?? cust?.deposit ?? 0);
    const code = o.order_no || o.id || cid || 'ORD';
    seen.add(String(num)); seen.add(String(o.id)); if (cid) seen.add(String(cid));
    result.push({
      ...o, id: o.id || num, order_no: num, display_code: code, customer_id: cid,
      customer_name: cName, customer: cName, child_name: ch, product_name: pName, product: pName,
      product_id: o.product_id || matchedProd?.id || '', delivery_date: o.delivery_date || o.due_date || (cust?.delivery_date || ''),
      due_date: o.delivery_date || o.due_date || '', measurements_spec: meas,
      total_amount: tot, paid_amount: pd, remaining_amount: Math.max(0, tot - pd), currency: o.currency || cust?.ledger?.currency || 'YER'
    });
  });
  (customers || []).forEach(c => {
    if (!c) return;
    const cid = String(c.id || c.customer_id || ''), cName = c.name || c.customer_name || 'عميلة كريمة';
    const measList = Array.isArray(c.measurements) && c.measurements.length > 0 ? c.measurements : null;
    if (measList) {
      measList.forEach((m, idx) => {
        const num = m.order_no || m.id || (cid ? `ORD-${cid}${measList.length > 1 ? `-${idx + 1}` : ''}` : `ORD-${Date.now()}`);
        if (seen.has(String(num)) || seen.has(String(m.id))) return;
        seen.add(String(num));
        const ch = m.child_name || c.child_name || c.children?.[0]?.child_name || 'الأميرة';
        const pName = m.selected_model || m.model_name || m.profile_name || m['اسم نموذج القياس'] || 'فستان تفصيل فاخر';
        const matchedProd = (products || []).find(p => (m.product_id && String(p.id) === String(m.product_id)) || p.model_name === pName || p.name === pName || (pName && ((p.model_name && (pName.includes(p.model_name) || p.model_name.includes(pName))) || (p.name && (pName.includes(p.name) || p.name.includes(pName))))));
        const tot = parseFloat(m.total_price || m.price || (idx === 0 ? (c.ledger?.total_sales || c.total_sales || 0) : 0));
        const pd = parseFloat(m.deposit || m.paid || (idx === 0 ? (c.ledger?.total_paid || c.ledger?.deposit || c.deposit || 0) : 0));
        result.push({
          id: num, order_no: num, display_code: cid || num, customer_id: cid, customer_name: cName, customer: cName,
          child_name: ch, product_name: pName, product: pName, product_id: m.product_id || matchedProd?.id || '',
          delivery_date: m.delivery_date || m.fitting_date || c.delivery_date || '',
          due_date: m.delivery_date || m.fitting_date || c.delivery_date || '', measurements_spec: m,
          total_amount: tot, paid_amount: pd, remaining_amount: Math.max(0, tot - pd), currency: m.currency || c.ledger?.currency || 'YER'
        });
      });
    } else if (!seen.has(cid) && ((c.children && c.children.length > 0) || parseFloat(c.ledger?.total_sales || c.total_sales || 0) > 0 || c.agreement)) {
      const num = `ORD-${cid || Date.now()}`;
      if (!seen.has(num)) {
        seen.add(num);
        const ch = c.children?.[0]?.child_name || c.child_name || 'الأميرة';
        const pName = c.selected_model || c.model_name || 'فستان تفصيل فاخر';
        const matchedProd = (products || []).find(p => p.model_name === pName || p.name === pName || (pName && p.model_name && pName.includes(p.model_name)));
        const tot = parseFloat(c.ledger?.total_sales || c.total_sales || 0);
        const pd = parseFloat(c.ledger?.total_paid || c.ledger?.deposit || c.deposit || 0);
        result.push({
          id: num, order_no: num, display_code: cid || num, customer_id: cid, customer_name: cName, customer: cName,
          child_name: ch, product_name: pName, product: pName, product_id: matchedProd?.id || '',
          delivery_date: c.delivery_date || '', due_date: c.delivery_date || '', measurements_spec: c.children?.[0] || {},
          total_amount: tot, paid_amount: pd, remaining_amount: Math.max(0, tot - pd), currency: c.ledger?.currency || 'YER'
        });
      }
    }
  });
  return result;
};

window.FactoryUtils = {
  FACTORY_STAGES, STAGE_PROGRESS, addDays, autoDistributeMilestones,
  calculateMetersForModel, getDaysLeft, sendWhatsAppToTailor,
  sendWhatsAppDeliveryGreeting, preparePrintData, getBespokeOrdersList
};
