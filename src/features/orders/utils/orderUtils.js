// src/features/orders/utils/orderUtils.js

const ORDER_STATUSES = [
  "مسودة 📝", "تم أخذ المقاسات 📐", "مؤكد ومحجوز 🏷️", "بانتظار توفر الأقمشة ⏳",
  "مرحلة القص ✂️", "قيد الخياطة 🪡", "جلسة تجربة وقياس 👗", "تعديل مقاسات ورتوش 🪡",
  "مرحلة التشطيب والشك 👑", "فحص الجودة والمطابقة 🔍", "جاهز للتسليم 🎁",
  "تم التسليم للعميل ✔️", "ملغي ❌"
];

const getCustomerName = (c) => {
  if (!c || typeof c !== 'object') return "";
  return c.name || c["اسم العميلة"] || c["اسم العميل"] || c.customer_name ||
    c.Name || c.CLIENT_NAME || "";
};

const buildRoyalCustomerConfirmation = (order, customers = [], products = [], currencyDisplay = "YER ريال") => {
  if (!order) return null;
  const cust = (customers || []).find(c => getCustomerName(c) === order.customer_name);
  const childMeas = cust?.measurements?.find(m => m.child_name === order.child_name) || cust?.measurements?.[0];
  const prod = (products || []).find(p => (order.product_id && (p.id === order.product_id || p.product_id === order.product_id)) || p.name === order.product_name || p.model_name === order.product_name);
  
  const brandName = (typeof window !== 'undefined' && window.BrandService)
    ? window.BrandService.getProfile().name
    : 'دار أميرات الصغار للأزياء الفاخرة';
    
  const tot = parseFloat(order.total ?? order.total_amount ?? 0);
  const pd  = parseFloat(order.paid ?? order.paid_amount ?? 0);
  const rem = Math.max(0, tot - pd);
  const cur = order.currency || currencyDisplay;
  
  const chName = (order.child_name && String(order.child_name).trim()) ? order.child_name : (childMeas?.child_name || 'الأميرة');
  const motherName = cust?.name || cust?.customer_name || order.customer_name || 'عزيزتنا الأم';
  const deliveryDateFormatted = order.delivery_date ? String(order.delivery_date).split('T')[0] : 'يحدد لاحقاً مع المشغل';
  
  let measLines = [];
  if (childMeas) {
    const u = childMeas.unit || 'سم';
    if (childMeas.estimated_age) measLines.push(`  • الفئة العمرية: ${childMeas.estimated_age}`);
    if (childMeas.dress_length)  measLines.push(`  • طول الفستان: ${childMeas.dress_length} ${u}`);
    if (childMeas.chest)         measLines.push(`  • محيط الصدر: ${childMeas.chest} ${u}`);
    if (childMeas.waist)         measLines.push(`  • محيط الخصر: ${childMeas.waist} ${u}`);
    if (childMeas.shoulder)      measLines.push(`  • عرض الكتف: ${childMeas.shoulder} ${u}`);
    if (childMeas.notes)         measLines.push(`  • تفضيلات خاصة: ${childMeas.notes}`);
  } else if (order.age_bracket || order.size) {
    measLines.push(`  • المقاس المعتمد: ${order.age_bracket || order.size}`);
  }

  const measSection = measLines.length > 0 
    ? `\n📏 *المواصفات والمقاسات المعتمدة للأميرة:* \n${measLines.join('\n')}\n`
    : '';

  const imgUrl = prod?.image_url || prod?.image || order.image_url;
  const imgSection = imgUrl ? `\n🖼️ *معاينة صورة الموديل:* ${imgUrl}\n` : '';

  const orderIdentifier = order.order_no || ('ORD-' + order.id);
  const isRtw = (order.order_no && String(order.order_no).toUpperCase().startsWith('POS-')) ||
                order.production_status === 'جاهز للتسليم 🛍️' ||
                order.status === 'جاهز للتسليم 🛍️' ||
                order.is_ready_to_wear;

  const trackingUrl = (typeof window !== 'undefined' && window.location)
    ? `${window.location.origin}/track.html?order=${encodeURIComponent(orderIdentifier)}`
    : `http://localhost:5000/track.html?order=${encodeURIComponent(orderIdentifier)}`;

  const dressCardUrl = (typeof window !== 'undefined' && window.location)
    ? `${window.location.origin}/dress_card.html?order=${encodeURIComponent(orderIdentifier)}`
    : `http://localhost:5000/dress_card.html?order=${encodeURIComponent(orderIdentifier)}`;

  const msg = isRtw
    ? `👑 *${brandName}* 👑\n\n` +
      `أهلاً وسهلاً بكِ عزيزتنا *${motherName}* 🌸✨\n` +
      `مبارك بحمد الله شراء واقتناء فستان الأميرات الجاهز لأميرتنا الجميلة *${chName}* بنجاح 🛍️👑\n\n` +
      `👗 *الموديل المختار:* ${order.product_name || prod?.name || "فستان كولكشن جاهز فاخر"}\n` +
      `📋 *رقم الفاتورة:* ${orderIdentifier}\n` +
      imgSection +
      measSection +
      `\n💰 *البيان المالي:* \n` +
      `  • المبلغ الإجمالي: ${tot.toLocaleString("en-US")} ${cur}\n` +
      `  • المبلغ المسدد: ${pd.toLocaleString("en-US")} ${cur}\n` +
      `  • المبلغ المتبقي: ${rem.toLocaleString("en-US")} ${cur}\n\n` +
      `🛍️ *حالة الاستلام:* تم الشراء والاستلام الفوري من المعرض بنجاح ✔️\n` +
      `💎 *ضمان الأصالة:* خامات كوتور فاخرة وضمان الجودة الملكي المعتمد\n\n` +
      `🖼️ *معاينة وثيقة الملكية والضمان الفاخر للفستان والتحميل:* \n${dressCardUrl}\n\n` +
      `🔗 *بوابة تتبع ومطابقة فستانكِ للجوال:* \n${trackingUrl}\n\n` +
      `نسعد دائماً بخدمتكم وتألق أميرتكم بأجمل إطلالة تليق بها! 🎀👑✨`
    : `👑 *${brandName}* 👑\n\n` +
      `أهلاً وسهلاً بكِ عزيزتنا *${motherName}* 🌸✨\n` +
      `تم بحمد الله اعتماد وتأكيد حجز تفصيل الفستان لأميرتنا الجميلة *${chName}* بنجاح ✅\n\n` +
      `👗 *الموديل المختار:* ${order.product_name || prod?.name || "موديل راقي خاص"}\n` +
      `📋 *رقم الطلب:* ${orderIdentifier}\n` +
      imgSection +
      measSection +
      `\n💰 *البيان المالي للحجز:* \n` +
      `  • المبلغ الإجمالي: ${tot.toLocaleString("en-US")} ${cur}\n` +
      `  • المبلغ الموصل (العربون): ${pd.toLocaleString("en-US")} ${cur}\n` +
      `  • المبلغ المتبقي عند الاستلام: ${rem.toLocaleString("en-US")} ${cur}\n\n` +
      `📅 *موعد التسليم والبروفة:* ${deliveryDateFormatted}\n\n` +
      `🖼️ *معاينة كرت الفستان الفاخر والتحميل (صورة وبطاقة معتمدة):* \n${dressCardUrl}\n\n` +
      `🔗 *بوابة تتبع مراحل الفستان وتأكيد البروفة للجوال:* \n${trackingUrl}\n\n` +
      `نعتني بأدق تفاصيل الخياطة الملكية واللمسات الفاخرة لتتألق أميرتك بأجمل إطلالة تليق بها! 🎀👑✨\n` +
      `نسعد دائماً بخدمتكم وتواصلكم معنا 💖`;

  return {
    msg,
    trackingUrl,
    dressCardUrl,
    isRtw,
    motherName,
    chName,
    tot,
    pd,
    rem,
    cur,
    deliveryDateFormatted,
    imgUrl,
    phone: cust?.phone || cust?.['رقم الهاتف'] || '',
    platform: cust?.platform || cust?.social_platform || 'واتساب',
    platformAccount: cust?.account_handle || cust?.username || cust?.social_id || '',
    order,
    cust,
    prod,
    childMeas
  };
};

window.ORDER_STATUSES = ORDER_STATUSES;
window.getCustomerName = getCustomerName;
window.orderUtils = {
  ORDER_STATUSES,
  getCustomerName,
  buildRoyalCustomerConfirmation
};
