// src/features/customers/utils/customerUtils.js

const STANDARD_CHEST = {
  '1-2 سنوات': 52, '2-3 سنوات': 54, '4 سنوات': 56, '5 سنوات': 58,
  '6 سنوات': 60, '7 سنوات': 62, '8 سنوات': 64, '9 سنوات': 66,
  '10 سنوات': 68, '11 سنة': 72, '12 سنة': 76, 'أكثر من 12 سنة': 80,
  '4-5 سنوات': 57, '6-7 سنوات': 61, '8-10 سنوات': 66, '10-12 سنة': 74, '12-14 سنة': 80
};

function isMeasurementStale(measDate) {
  if (!measDate) return false;
  try {
    const d = new Date(measDate);
    const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 90;
  } catch { return false; }
}

function calculateAge(length, selectedModelName, unit = 'سم', products = []) {
  if (!length) return '';
  let l = parseFloat(length);
  if (isNaN(l)) return '';
  if (unit === 'إنش' || unit === 'انش' || unit === 'inch' || unit === '"') {
    l = l * 2.54;
  }
  if (selectedModelName && Array.isArray(products) && products.length > 0) {
    const model = products.find(p => p && (p.name === selectedModelName || p.model_name === selectedModelName));
    if (model && model.age_chart && model.age_chart.length > 0) {
      const match = model.age_chart.find(r => l >= r.min && l <= r.max);
      if (match) return match.age;
    }
  }
  if (l <= 45) return '1-2 سنوات';
  if (l <= 55) return '2-3 سنوات';
  if (l <= 60) return '4 سنوات';
  if (l <= 65) return '5 سنوات';
  if (l <= 70) return '6 سنوات';
  if (l <= 75) return '7 سنوات';
  if (l <= 80) return '8 سنوات';
  if (l <= 85) return '9 سنوات';
  if (l <= 90) return '10 سنوات';
  if (l <= 95) return '11 سنة';
  if (l <= 100) return '12 سنة';
  return 'أكثر من 12 سنة';
}

function getJumboFactor(m) {
  if (!m || !m.estimated_age || !m.chest_circ) return { factor: 1, msg: '' };
  let standard = STANDARD_CHEST[m.estimated_age] || 60;
  let actualCm = parseFloat(m.chest_circ);
  if (isNaN(actualCm)) return { factor: 1, msg: '' };
  if (m.unit === 'إنش') actualCm = actualCm * 2.54;
  if (actualCm > standard * 1.10) {
    const factor = actualCm / standard;
    return { factor, standard, actualCm };
  }
  return { factor: 1 };
}

function getBroadBracket(ageStr) {
  if (!ageStr) return '6-9 سنوات';
  if (ageStr.includes('1-2') || ageStr === '1-2 سنوات') return '1-2 سنة';
  if (ageStr.includes('2-3') || ageStr.includes('3-4') || ageStr.includes('4-5') || ageStr.includes('4 ') || ageStr.includes('5 ')) return '3-5 سنوات';
  if (ageStr.includes('6-7') || ageStr.includes('8-10') || ageStr.includes('6 ') || ageStr.includes('7 ') || ageStr.includes('8 ') || ageStr.includes('9 ')) return '6-9 سنوات';
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
  let ageLabel = '1-3 سنوات (الأميرات الصغيرات)';
  let broadBracket = '1-2 سنة';

  if (length > 0) {
    if (length <= 55) {
      tier = 'toddler'; ageLabel = '1-3 سنوات (الأميرات الصغيرات)'; broadBracket = '1-2 سنة';
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
  if (jumbo.factor > 1) finalPrice = finalPrice * jumbo.factor;

  let fabricMeters = 0, fabricsBreakdown = [];
  if (matchedProduct.bom && Array.isArray(matchedProduct.bom) && matchedProduct.bom.length > 0) {
    fabricsBreakdown = matchedProduct.bom.map(f => {
      let bM = parseFloat((f.brackets && (f.brackets[broadBracket] || f.brackets['6-7Y'] || f.brackets['6-9Y'])) || f.meters || 0);
      if (jumbo.factor > 1) bM = parseFloat((bM * jumbo.factor).toFixed(2));
      return { name: f.fabric_name || f.name || f.material_name || 'قماش', meters: bM, unit: f.unit || f.uom || 'متر' };
    });
    fabricMeters = fabricsBreakdown[0]?.meters || 0;
  } else {
    fabricMeters = parseFloat(matchedProduct.yards_used || (tier === 'toddler' ? 1.5 : (tier === 'kids' ? 2.5 : 3.5)));
    if (jumbo.factor > 1) fabricMeters = fabricMeters * jumbo.factor;
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

function emptyMeasurement(targetMode = 'kids') {
  const today = (typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : (window.TODAY_STR_ISO || new Date().toISOString().slice(0, 10)));
  return {
    id: Date.now() + Math.floor(Math.random() * 999),
    target_mode: targetMode,
    child_name: '', event_date: '', meas_date: today, unit: 'سم',
    total_height: '', dress_length: '', chest_length: '', skirt_length: '', sleeve_length: '',
    chest_circ: '', waist_circ: '', shoulder_width: '', armhole_circ: '', neck_circ: '',
    bom_items: [], fabrics_breakdown: [],
    comfort_profile: [], sewing_notes: '', model_image: '', dress_color: '', selected_model: '', estimated_age: ''
  };
}

window.customerUtils = {
  STANDARD_CHEST, isMeasurementStale, calculateAge, getJumboFactor,
  getBroadBracket, getSmartModelMatch, catColor, formatCleanDate, genCustId,
  emptyMeasurement, extractModelFabricInfo, KIDS_MEASUREMENT_FIELDS, ADULT_MEASUREMENT_FIELDS
};
