/**
 * smartSizingMatcher.js - خوارزمية المطابقة الذكية لمقاسات العميل واستهلاك الـ BOM
 * Little Princesses ERP - Production Floor Architecture
 */

const YARDS_PER_METER = 1.0936;

const matchClientMeasurementToCategory = (measurements = {}, unit = '') => {
  if (!measurements || typeof measurements !== 'object') {
    return { category: '6-7Y', matchedSize: '6-7Y', unit: 'سم', lengthCm: 80, badgeText: '', badgeShort: '6-7Y', isAdult: false };
  }

  const rawLen = parseFloat(measurements.dress_len || measurements.dress_length || measurements['طول الفستان'] || measurements.total_len || 0);
  const rawChest = parseFloat(measurements.chest_circ || measurements.chest || measurements['محيط الصدر'] || 0);
  const rawWaist = parseFloat(measurements.waist_circ || measurements.waist || measurements['محيط الخصر'] || 0);

  const rawUnit = String(unit || measurements.unit || 'سم').toLowerCase().trim();
  const isInch = rawUnit.includes('inch') || rawUnit.includes('إنش') || rawUnit.includes('انش') || rawUnit === 'in' || rawUnit === '"';

  const lenCm = rawLen > 0 ? (isInch ? rawLen * 2.54 : rawLen) : 0;
  const chestCm = rawChest > 0 ? (isInch ? rawChest * 2.54 : rawChest) : 0;
  const waistCm = rawWaist > 0 ? (isInch ? rawWaist * 2.54 : rawWaist) : 0;

  const isAdult = lenCm >= 120 || chestCm >= 80 || measurements.target_segment === 'women_adults';

  let matched = '6-7Y';
  if (isAdult) {
    if (chestCm > 0) {
      if (chestCm <= 84) matched = 'XS';
      else if (chestCm <= 88) matched = 'S';
      else if (chestCm <= 96) matched = 'M';
      else if (chestCm <= 104) matched = 'L';
      else if (chestCm <= 112) matched = 'XL';
      else matched = 'XXL';
    } else if (waistCm > 0) {
      if (waistCm <= 66) matched = 'XS';
      else if (waistCm <= 72) matched = 'S';
      else if (waistCm <= 80) matched = 'M';
      else if (waistCm <= 88) matched = 'L';
      else matched = 'XL';
    } else {
      matched = 'M';
    }
  } else {
    if (lenCm >= 45 && lenCm <= 60) {
      matched = lenCm <= 52 ? '1-2Y' : '2-3Y';
    } else if (lenCm > 60 && lenCm <= 75) {
      matched = '4-5Y';
    } else if (lenCm > 75 && lenCm <= 90) {
      matched = '6-7Y';
    } else if (lenCm > 90 && lenCm <= 110) {
      matched = '8-10Y';
    } else if (lenCm > 110 && lenCm < 120) {
      matched = '10-13Y';
    } else {
      matched = '6-7Y';
    }
  }

  const lenDisplay = rawLen > 0 ? `${rawLen} ${isInch ? 'إنش' : 'سم'}` : `${Math.round(lenCm)} سم`;
  const badgeText = `[ الفئة المطابقة تلقائياً: ${matched} بناءً على طول ${lenDisplay} ]`;
  const badgeShort = `${matched} (${lenDisplay})`;

  return {
    category: matched,
    matchedSize: matched,
    rawLength: rawLen,
    rawChest: rawChest,
    rawWaist: rawWaist,
    unit: isInch ? 'إنش' : 'سم',
    isInch,
    lengthCm: Math.round(lenCm),
    chestCm: Math.round(chestCm),
    badgeText,
    badgeShort,
    isAdult
  };
};

const getBomConsumptionAndPricing = (product, category = '6-7Y', orderQty = 1, preferredUnit = 'متر') => {
  const qty = Math.max(1, parseFloat(orderQty) || 1);
  const bomItems = [];

  const resolveItemMeters = (b) => {
    let m = 0;
    const br = b.brackets || {};
    if (br[category]) m = parseFloat(br[category]);
    else {
      for (const k of Object.keys(br)) {
        if (k.includes(category) || category.includes(k)) { m = parseFloat(br[k]); break; }
      }
    }
    return m || parseFloat(b.meters || 0);
  };

  const fallbackMeters = {
    '1-2Y': 2.0, '2-3Y': 2.2, '4-5Y': 2.75, '6-7Y': 3.25,
    '6-9Y': 3.5, '8-10Y': 3.75, '10-13Y': 4.0,
    'XS': 4.2, 'S': 4.5, 'M': 4.75, 'L': 5.0, 'XL': 5.25, 'XXL': 5.5
  };

  if (product && Array.isArray(product.bom) && product.bom.length > 0) {
    product.bom.forEach((b, idx) => {
      const bName = b.fabric_name || b.name || b.material_name || (idx === 0 ? (product.fabric_name || 'تفتة تركي') : 'قماش');
      let sM = resolveItemMeters(b);
      if (!sM && idx === 0) sM = fallbackMeters[category] || parseFloat(product?.fabric_qty || product?.yards_used || 3.0);
      const tM = parseFloat((sM * qty).toFixed(2));
      const tY = parseFloat((tM * YARDS_PER_METER).toFixed(2));
      const u = b.unit || b.uom || preferredUnit || 'متر';
      bomItems.push({
        raw_item_id: b.raw_item_id || b.item_id || null,
        fabric_name: bName,
        single_meters: sM,
        total_meters: tM,
        total_yards: tY,
        cut_meters: u === 'وار' ? tY : tM,
        cut_unit: u,
        unit: u,
        deduct_inventory: true
      });
    });
  }

  let singleMeters = bomItems[0]?.single_meters || fallbackMeters[category] || parseFloat(product?.fabric_qty || product?.yards_used || 3.0);
  let fabricName = bomItems[0]?.fabric_name || product?.fabric_name || 'تفتة تركي';
  const totalMeters = parseFloat((singleMeters * qty).toFixed(2));
  const totalYards = parseFloat((totalMeters * YARDS_PER_METER).toFixed(2));

  if (bomItems.length === 0) {
    bomItems.push({
      raw_item_id: product?.raw_item_id || null,
      fabric_name: fabricName,
      single_meters: singleMeters,
      total_meters: totalMeters,
      total_yards: totalYards,
      cut_meters: preferredUnit === 'وار' ? totalYards : totalMeters,
      cut_unit: preferredUnit,
      unit: preferredUnit,
      deduct_inventory: true
    });
  }

  let unitPrice = 0;
  const pm = product?.price_matrix || {};
  if (pm[category]) unitPrice = parseFloat(pm[category]);
  else {
    for (const k of Object.keys(pm)) {
      if (k.includes(category) || category.includes(k)) { unitPrice = parseFloat(pm[k]); break; }
    }
  }
  if (!unitPrice) unitPrice = parseFloat(product?.sell_price || product?.base_price || product?.price || 0);

  const totalPrice = Math.round(unitPrice * qty);
  const dualText = `[ ${totalMeters.toFixed(1)} متر ⇋ ${totalYards.toFixed(1)} وار ]`;

  return {
    fabricName, singleMeters, totalMeters, totalYards,
    preferredQuantity: preferredUnit === 'وار' ? totalYards : totalMeters,
    dualText, unitPrice, totalPrice, category, bomItems
  };
};

const convertCutUnit = (val, fromUnit, toUnit) => {
  const num = parseFloat(val) || 0;
  if (fromUnit === toUnit || num === 0) return val;
  if (fromUnit === 'متر' && toUnit === 'وار') return (num * YARDS_PER_METER).toFixed(2);
  if (fromUnit === 'وار' && toUnit === 'متر') return (num / YARDS_PER_METER).toFixed(2);
  return val;
};

window.SmartSizingMatcher = {
  YARDS_PER_METER,
  matchClientMeasurementToCategory,
  getBomConsumptionAndPricing,
  convertCutUnit
};
