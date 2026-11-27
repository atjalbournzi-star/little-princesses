// src/features/customers/utils/customerUtils.js

const STANDARD_CHEST = {
  '1-2 سنوات': 52, '2-3 سنوات': 54, '4 سنوات': 56, '5 سنوات': 58, '6 سنوات': 60, '7 سنوات': 62,
  '8 سنوات': 64, '9 سنوات': 66, '10 سنوات': 68, '11 سنة': 72, '12 سنة': 76, 'أكثر من 12 سنة': 80,
  '4-5 سنوات': 57, '6-7 سنوات': 61, '8-10 سنوات': 66, '10-12 سنة': 74, '12-14 سنة': 80
};

function isMeasurementStale(measDate) {
  if (!measDate) return false;
  try { return (Date.now() - new Date(measDate).getTime()) / (1000 * 60 * 60 * 24) > 90; } catch { return false; }
}

function calculateAge(length, selectedModelName, unit = 'سم', products = []) {
  if (!length) return '';
  let l = parseFloat(length);
  if (isNaN(l)) return '';
  if (['إنش', 'انش', 'inch', '"'].includes(unit)) l = l * 2.54;
  if (selectedModelName && Array.isArray(products) && products.length > 0) {
    const model = products.find(p => p && (p.name === selectedModelName || p.model_name === selectedModelName));
    if (model && window.SmartSizingMatcher?.matchClientMeasurementToCategory) {
      const match = window.SmartSizingMatcher.matchClientMeasurementToCategory({ dress_length: l, unit: 'سم' }, model);
      if (match?.category) return match.category;
    }
  }
  return l <= 55.9 ? '1-2Y' : (l <= 68.6 ? '3-5Y' : (l <= 83.8 ? '6-9Y' : '10-13Y'));
}

function getJumboFactor(m) {
  if (!m || !m.estimated_age || !m.chest_circ) return { factor: 1, msg: '' };
  let standard = STANDARD_CHEST[m.estimated_age] || 60, actualCm = parseFloat(m.chest_circ);
  if (isNaN(actualCm)) return { factor: 1, msg: '' };
  if (m.unit === 'إنش') actualCm = actualCm * 2.54;
  return actualCm > standard * 1.10 ? { factor: actualCm / standard, standard, actualCm } : { factor: 1 };
}

function getBroadBracket(ageStr) {
  if (!ageStr) return '6-9 سنوات';
  if (ageStr.includes('1-2') || ageStr === '1-2 سنوات') return '1-2 سنة';
  if (['2-3', '3-4', '4-5', '4 ', '5 '].some(k => ageStr.includes(k))) return '3-5 سنوات';
  if (['6-7', '8-10', '6 ', '7 ', '8 ', '9 '].some(k => ageStr.includes(k))) return '6-9 سنوات';
  return '10-13 سنة';
}

function getSmartModelMatch(m, productsList = []) {
  const selMod = (m?.selected_model || '').trim();
  if (!selMod) return null;
  const allMatches = (productsList || []).filter(p => {
    const pName = (p.name || p.model_name || '').trim();
    return pName === selMod || pName.startsWith(selMod);
  });
  if (allMatches.length === 0) return null;

  let length = parseFloat(m.dress_length || m.total_height || 0);
  if (m.unit === 'إنش' && length > 0) length = length * 2.54;

  let tier = 'toddler';
  let ageLabel = '1-3 سنوات (فئة الصغيرات)';
  let broadBracket = '1-2 سنة';

  if (length > 0) {
    if (length <= 55) {
      tier = 'toddler'; ageLabel = '1-3 سنوات (فئة الصغيرات)'; broadBracket = '1-2 سنة';
    } else if (length <= 75) {
      tier = 'kids'; ageLabel = '4-7 سنوات (فئة الوسط)'; broadBracket = '3-5 سنوات';
    } else if (length <= 95) {
      tier = 'junior'; ageLabel = '8-11 سنة (فئة الكبار)'; broadBracket = '6-9 سنوات';
    } else {
      tier = 'teen'; ageLabel = '12+ سنة (فئة اليافعات)'; broadBracket = '10-13 سنة';
    }
  } else if (m.estimated_age) {
    broadBracket = getBroadBracket(m.estimated_age);
    ageLabel = m.estimated_age;
  }

  let matchedProduct = allMatches[0];
  if (allMatches.length > 1) {
    const sortedByPrice = [...allMatches].sort((a, b) => {
      const pA = parseFloat(a.sell_price || a.price || a.base_price || 0);
      const pB = parseFloat(b.sell_price || b.price || b.base_price || 0);
      return pA - pB;
    });
    if (tier === 'toddler') matchedProduct = sortedByPrice[0];
    else if (tier === 'kids') matchedProduct = sortedByPrice[Math.min(1, sortedByPrice.length - 1)];
    else matchedProduct = sortedByPrice[sortedByPrice.length - 1];
  }

  const tierCode = broadBracket.includes('10-13') ? '10-13Y' : (broadBracket.includes('6-9') ? '6-9Y' : (broadBracket.includes('3-5') ? '3-5Y' : '1-2Y'));
  const conv = window.MeasurementConverter;
  let finalPrice = conv ? conv.resolveUnitPrice(matchedProduct, tierCode) : (window.OrderPricing ? window.OrderPricing.resolveProductTierPrice(matchedProduct, tierCode) : parseFloat(matchedProduct.sell_price || 0));

  const jumbo = getJumboFactor(m);

  let fabricMeters = 0, fabricsBreakdown = [];
  if (matchedProduct.bom && Array.isArray(matchedProduct.bom) && matchedProduct.bom.length > 0) {
    fabricsBreakdown = matchedProduct.bom.map(f => {
      let bM = parseFloat((f.brackets && (f.brackets[broadBracket] || f.brackets['6-7Y'] || f.brackets['6-9Y'])) || f.meters || 0);
      return { name: f.fabric_name || f.name || f.material_name || 'قماش', meters: bM, unit: f.unit || f.uom || 'متر' };
    });
    fabricMeters = fabricsBreakdown[0]?.meters || 0;
  } else {
    fabricMeters = parseFloat(matchedProduct.yards_used || (tier === 'toddler' ? 1.5 : (tier === 'kids' ? 2.5 : 3.5)));
    fabricsBreakdown = [{ name: matchedProduct.fabric_name || 'تفتة تركي', meters: fabricMeters, unit: 'متر' }];
  }

  return {
    product: matchedProduct, modelName: selMod, ageLabel, broadBracket,
    price: Math.round(finalPrice), fabricMeters: parseFloat(fabricMeters.toFixed(2)), jumboFactor: jumbo.factor,
    fabricsBreakdown, fabricSummary: fabricsBreakdown.map(f => `${f.name}: ${f.meters} ${f.unit}`).join(' | ')
  };
}

function catColor(cat) {
  return {
    'جديد': 'bg-[#E2F5F7] dark:bg-cyan-950/40 text-[#007F8C] dark:text-cyan-300 border-[#C5ECF0] dark:border-cyan-800/50',
    'دائم': 'bg-[#F2E7F3] dark:bg-purple-950/40 text-[#8F2A87] dark:text-purple-300 border-[#E5CEE7] dark:border-purple-800/50 font-bold',
    'VIP':  'bg-[#FCE8F2] dark:bg-rose-950/40 text-[#B0005A] dark:text-rose-300 border-[#F2A4CB] dark:border-rose-800/50 font-black shadow-2xs'
  }[cat] || 'bg-[#FAFAFB] dark:bg-slate-800 text-[#25232A] dark:text-slate-200 border-[#E8E5EA] dark:border-slate-700';
}

function formatCleanDate(d) {
  if (!d) return '—';
  if (typeof d === 'string') {
    const clean = d.includes('T') ? d.split('T')[0] : d;
    return clean.replace(/-/g, '/');
  }
  return d;
}

function genCustId(customers) {
  const lastNum = (customers || []).reduce((acc, c) => {
    const match = String(c.customer_id || c.id || '').match(/CUST-(\d+)/);
    return match ? Math.max(acc, parseInt(match[1])) : acc;
  }, 1000);
  return `CUST-${lastNum + 1}`;
}

const KIDS_MEASUREMENT_FIELDS = [
  ['dress_length', 'طول الفستان'], ['chest_circ', 'محيط الصدر'], ['waist_circ', 'محيط الخصر'],
  ['shoulder_width', 'عرض الكتفين'], ['chest_length', 'طول الصدر'], ['skirt_length', 'طول التنورة'],
  ['sleeve_length', 'طول الكم'], ['armhole_circ', 'محيط الإبط'], ['neck_circ', 'محيط الرقبة'], ['total_height', 'الطول الكلي']
];

const ADULT_MEASUREMENT_FIELDS = [
  ['chest_circ', 'محيط الصدر'], ['waist_circ', 'محيط الخصر'], ['hips_circ', 'محيط الأوراك'],
  ['dress_length', 'طول الفستان'], ['shoulder_width', 'عرض الكتفين'], ['sleeve_length', 'طول الكم'],
  ['arm_circ', 'دوران الذراع'], ['bust_drop', 'نزول الصدر']
];

function extractModelFabricInfo(modelName, products = [], isAdult = false) {
  if (!modelName) return { fabricType: '', defaultMeters: isAdult ? 3.5 : 2.0, price: 0, product: null, fabricsBreakdown: [] };
  const p = (products || []).find(x => (x.name || x.model_name || '').trim() === String(modelName).trim());
  if (!p) return { fabricType: 'كريب / شيفون فاخر', defaultMeters: isAdult ? 3.5 : 2.0, price: 0, product: null, fabricsBreakdown: [] };
  let fabricsBreakdown = [];
  if (p.bom && Array.isArray(p.bom) && p.bom.length > 0) {
    const bKey = isAdult ? 'M' : '6-9Y';
    fabricsBreakdown = p.bom.map(b => ({
      name: b.fabric_name || b.name || b.material_name || 'قماش',
      meters: parseFloat((b.brackets && (b.brackets[bKey] || b.brackets['6-7Y'])) || b.meters || 0),
      unit: b.unit || b.uom || 'متر'
    }));
  }
  const fabricType = fabricsBreakdown.length > 0 ? fabricsBreakdown.map(f => `${f.name}: ${f.meters} ${f.unit}`).join(' | ') : (p.fabric_name || 'شيفون فاخر');
  const defaultMeters = fabricsBreakdown[0]?.meters || parseFloat(p.yards_used || (isAdult ? 3.5 : 2.0));
  const tierKey = isAdult ? 'M' : '6-9Y';
  let price = window.MeasurementConverter?.resolveUnitPrice ? window.MeasurementConverter.resolveUnitPrice(p, tierKey) : parseFloat(p.sell_price || p.base_price || 0);
  return { fabricType, defaultMeters: parseFloat(defaultMeters.toFixed(2)), price: Math.round(price), product: p, fabricsBreakdown };
}

function calculateCustomerRemainingBalance(customer, orders = []) {
  if (!customer) return 0;
  const cId = String(customer.customer_id || customer.id || ''), cName = String(customer.name || customer.customer_name || '').trim();
  const custOrders = (orders || []).filter(o => {
    if (!o) return false;
    const match = (o.customer_id && (String(o.customer_id) === cId || String(o.customer_id) === String(customer.id))) || (o.customer_name && String(o.customer_name).trim() === cName);
    const st = String(o.status || '').toLowerCase();
    return match && st !== 'cancelled' && st !== 'ملغي';
  });
  if (custOrders.length > 0) {
    let tot = 0, pd = 0;
    custOrders.forEach(ord => {
      const isPre = (ord.delivery_payment_mode || customer.delivery_payment_mode) === 'PREPAID_VIA_ATELIER';
      let oTot = Number(ord.total_price || ord.total_amount || ord.total || 0), fee = Number(ord.delivery_fee || 0);
      if (!isPre && fee > 0 && ord.subtotal && oTot > Number(ord.subtotal)) oTot = Number(ord.subtotal);
      tot += oTot; pd += Number(ord.paid_amount || ord.deposit_amount || ord.deposit || ord.paid || 0);
    });
    return Math.max(0, tot - pd);
  }
  const legSales = parseFloat(customer.ledger?.total_sales || customer.total_sales || 0);
  const legPaid = parseFloat(customer.ledger?.total_paid || customer.ledger?.deposit_amount || customer.ledger?.deposit || customer.total_paid || customer.deposit_amount || customer.deposit || 0);
  const isPre = (customer.ledger?.delivery_payment_mode || customer.delivery_payment_mode) === 'PREPAID_VIA_ATELIER';
  const fee = isPre ? parseFloat(customer.ledger?.delivery || customer.ledger?.delivery_fee || customer.delivery_fee || 0) : 0;
  const legTot = legSales + fee;
  if (legTot > 0) return Math.max(0, legTot - legPaid);
  return parseFloat(customer.ledger?.remaining ?? customer.remaining ?? customer.current_balance ?? 0);
}

function emptyMeasurement(targetMode = 'kids') {
  const today = (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : (window.TODAY_STR_ISO || new Date().toISOString().slice(0, 10)));
  return {
    id: Date.now() + Math.floor(Math.random() * 999), target_mode: targetMode,
    child_name: '', event_date: '', meas_date: today, unit: 'سم',
    total_height: '', dress_length: '', chest_length: '', skirt_length: '', sleeve_length: '',
    chest_circ: '', waist_circ: '', shoulder_width: '', armhole_circ: '', neck_circ: '',
    bom_items: [], fabrics_breakdown: [], comfort_profile: [], sewing_notes: '', model_image: '', dress_color: '', selected_model: '', estimated_age: ''
  };
}

window.customerUtils = {
  STANDARD_CHEST, isMeasurementStale, calculateAge, getJumboFactor,
  getBroadBracket, getSmartModelMatch, catColor, formatCleanDate, genCustId,
  emptyMeasurement, extractModelFabricInfo, calculateCustomerRemainingBalance,
  KIDS_MEASUREMENT_FIELDS, ADULT_MEASUREMENT_FIELDS
};
