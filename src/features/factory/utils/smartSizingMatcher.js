/**
 * smartSizingMatcher.js - محرك المطابقة السقفية الذكية وتسعير الفئات واستهلاك الـ BOM
 * Little Princesses ERP - Dynamic Parametric Sizing & Inventory Auto-Binding Engine
 */

const YARDS_PER_METER = 1.0936133;

const normText = (s) => String(s || '').replace(/[\u064B-\u0652]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

const resolveProductTiers = (product, isAdult = false) => {
  let raw = product?.age_chart;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch (e) { raw = null; }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    const parsed = raw.map(r => ({
      size: String(r.size || r.age || '').trim(),
      age: String(r.age || r.label || r.size || '').trim(),
      length: parseFloat(r.length ?? r.max ?? 0) || 0,
      chest: parseFloat(r.chest ?? 0) || 0,
      waist: parseFloat(r.waist ?? 0) || 0
    })).filter(r => Boolean(r.size));
    if (parsed.length > 0) {
      return parsed.sort((a, b) => (a.length - b.length || a.chest - b.chest || a.waist - b.waist));
    }
  }
  return [];
};

const matchClientMeasurementToCategory = (measurements = {}, product = null, unit = '') => {
  const tiers = resolveProductTiers(product, false);
  const rawLen = parseFloat(measurements?.dress_len || measurements?.dress_length || measurements?.['طول الفستان'] || measurements?.total_len || measurements?.total_height || 0);
  const rawChest = parseFloat(measurements?.chest_circ || measurements?.chest || measurements?.['محيط الصدر'] || 0);
  const rawWaist = parseFloat(measurements?.waist_circ || measurements?.waist || measurements?.['محيط الخصر'] || 0);
  const rawUnit = String(unit || measurements?.unit || 'سم').toLowerCase().trim();
  const isInch = rawUnit.includes('inch') || rawUnit.includes('إنش') || rawUnit.includes('انش') || rawUnit === 'in' || rawUnit === '"';

  const lenCm = rawLen > 0 ? (isInch ? rawLen * 2.54 : rawLen) : 0;
  const chestCm = rawChest > 0 ? (isInch ? rawChest * 2.54 : rawChest) : 0;
  const waistCm = rawWaist > 0 ? (isInch ? rawWaist * 2.54 : rawWaist) : 0;

  const manualTier = String(measurements?.manual_tier || measurements?.size_code || '').trim();
  const manualMatched = manualTier ? tiers.find(t => t.size === manualTier || manualTier.includes(t.size)) : null;

  let matched = manualMatched;
  if (!matched && tiers.length > 0) {
    for (const t of tiers) {
      if (lenCm <= 0 || t.length <= 0 || lenCm <= t.length) { matched = t; break; }
    }
  }
  const isExceeded = Boolean(!matched && tiers.length > 0 && lenCm > (tiers[tiers.length - 1]?.length || 0));
  const finalTier = matched || (tiers.length > 0 ? tiers[tiers.length - 1] : { size: manualTier || '6-9Y', length: 0, chest: 0, waist: 0 });
  const cat = finalTier.size;

  const round1 = (v) => Math.round((parseFloat(v) || 0) * 10) / 10;
  const userChest = isInch ? round1(rawChest) : round1(chestCm), tierChest = isInch ? round1(finalTier.chest / 2.54) : round1(finalTier.chest);
  const userWaist = isInch ? round1(rawWaist) : round1(waistCm), tierWaist = isInch ? round1(finalTier.waist / 2.54) : round1(finalTier.waist);

  const variances = [];
  if (userChest > 0 && tierChest > 0 && userChest > tierChest) variances.push(`محيط الصدر (${userChest} ${isInch ? 'إنش' : 'سم'} > سقف الفئة ${tierChest})`);
  if (userWaist > 0 && tierWaist > 0 && userWaist > tierWaist) variances.push(`محيط الخصر (${userWaist} ${isInch ? 'إنش' : 'سم'} > سقف الفئة ${tierWaist})`);
  const varianceAlert = variances.length > 0 ? `⚠️ تنبيه فني للقصاص: تباين بالمقاسات [${variances.join('، ')}] عن سقف الفئة (${cat}).` : '';

  return {
    category: cat, matchedSize: cat, rawLength: rawLen, rawChest, rawWaist, unit: isInch ? 'إنش' : 'سم', isInch,
    lengthCm: Math.round(lenCm * 10) / 10, chestCm: Math.round(chestCm * 10) / 10, waistCm: Math.round(waistCm * 10) / 10,
    varianceAlert, variances, isExceeded, tier: finalTier, tiers
  };
};

const matchInventoryFabric = (mat = {}, fabricInventory = [], orderColor = '') => {
  if (!Array.isArray(fabricInventory) || fabricInventory.length === 0) return null;
  const mId = String(mat.inventory_id || mat.fabric_id || mat.raw_item_id || mat.id || '').trim();
  const mName = normText(mat.fabric_name || mat.name || mat.material_name || '');
  const oColor = normText(orderColor);

  if (mId) {
    const byId = fabricInventory.find(i => String(i.id || i.inventory_id || i.item_code) === mId);
    if (byId) return byId;
  }
  if (mName && oColor) {
    const byNameAndColor = fabricInventory.find(i => {
      const iName = normText(i.name || i.item_name || '');
      return iName.includes(mName) && iName.includes(oColor);
    });
    if (byNameAndColor) return byNameAndColor;
  }
  if (mName) {
    const byExactName = fabricInventory.find(i => normText(i.name || i.item_name || '') === mName);
    if (byExactName) return byExactName;
    const byPartialName = fabricInventory.find(i => {
      const iName = normText(i.name || i.item_name || '');
      return iName.includes(mName) || mName.includes(iName);
    });
    if (byPartialName) return byPartialName;
  }
  return null;
};

const interpolateFabricQuantity = (brackets = {}, tiers = [], lenCm = 0, chestCm = 0, waistCm = 0, stdBracket = 0) => {
  if (!tiers.length || lenCm <= 0) return { standard: stdBracket, actual: stdBracket, isGraded: false, excessPct: 0 };
  let currIdx = tiers.findIndex(t => t.length > 0 && lenCm <= t.length);
  if (currIdx === -1) currIdx = tiers.length - 1;

  const currTier = tiers[currIdx];
  const prevTier = currIdx > 0 ? tiers[currIdx - 1] : null;
  const qCurr = parseFloat(brackets[currTier.size]) || stdBracket || 0;
  const qPrev = prevTier ? (parseFloat(brackets[prevTier.size]) || qCurr) : (qCurr * 0.7);

  let qLinear = qCurr;
  if (prevTier && currTier.length > prevTier.length) {
    const factor = Math.max(0, Math.min(1, (lenCm - prevTier.length) / (currTier.length - prevTier.length)));
    qLinear = qPrev + factor * (qCurr - qPrev);
  } else if (currIdx === 0 && currTier.length > 0) {
    const factor = Math.max(0.6, Math.min(1, lenCm / currTier.length));
    qLinear = qCurr * factor;
  }

  const wExcess = (currTier.waist > 0 && waistCm > currTier.waist) ? (waistCm - currTier.waist) / currTier.waist : 0;
  const cExcess = (currTier.chest > 0 && chestCm > currTier.chest) ? (chestCm - currTier.chest) / currTier.chest : 0;
  const maxExcess = Math.max(wExcess, cExcess);
  const qAdjusted = maxExcess > 0 ? qLinear * (1 + maxExcess) : qLinear;
  const qFinal = Math.round((qAdjusted + 0.0001) * 4) / 4;

  return { standard: qCurr, actual: qFinal, isGraded: Math.abs(qFinal - qCurr) >= 0.05, excessPct: Math.round(maxExcess * 100) };
};

const getBomConsumptionAndPricing = (product, category = '6-9Y', orderQty = 1, preferredUnit = 'متر', measurements = {}, fabricInventory = [], orderColor = '') => {
  const qty = Math.max(1, parseFloat(orderQty) || 1);
  const sizing = matchClientMeasurementToCategory(measurements, product);
  const cat = sizing.category || category || '6-9Y';
  const tiers = sizing.tiers || resolveProductTiers(product, false);

  let itemsList = [];
  const rawBom = product?.bom;
  if (Array.isArray(rawBom)) itemsList = rawBom;
  else if (rawBom && typeof rawBom === 'object' && Array.isArray(rawBom.items)) itemsList = rawBom.items;
  else if (typeof rawBom === 'string') {
    try { const p = JSON.parse(rawBom); itemsList = Array.isArray(p) ? p : (p?.items || []); } catch (e) { itemsList = []; }
  }

  const bomItems = itemsList.map((b, idx) => {
    const bName = b.fabric_name || b.name || b.material_name || `خامة ${idx + 1}`;
    const br = b.brackets || {};
    let stdM = parseFloat(br[cat]);
    if (isNaN(stdM) || stdM <= 0) {
      for (const k of Object.keys(br)) { if (k.includes(cat) || cat.includes(k)) { stdM = parseFloat(br[k]); break; } }
    }
    if (isNaN(stdM) || stdM <= 0) stdM = parseFloat(b.meters || b.cut_meters || b.qty || 0) || 0;

    const grading = interpolateFabricQuantity(br, tiers, sizing.lengthCm, sizing.chestCm, sizing.waistCm, stdM);
    const cutSingle = grading.actual > 0 ? grading.actual : stdM;
    const cutTotal = parseFloat((cutSingle * qty).toFixed(2));
    const stdTotal = parseFloat((stdM * qty).toFixed(2));

    const matchedInv = matchInventoryFabric(b, fabricInventory, orderColor);
    const u = b.unit || b.cut_unit || matchedInv?.unit || preferredUnit || 'متر';
    const invId = matchedInv?.id || matchedInv?.item_code || b.inventory_id || b.fabric_id || null;
    const invName = matchedInv?.name || matchedInv?.item_name || bName;

    return {
      fabric_id: invId, inventory_id: invId, raw_item_id: invId,
      fabric_name: invName, name: invName, original_fabric_name: bName,
      single_meters: cutSingle, total_meters: cutTotal, cut_meters: String(cutTotal),
      standard_single: stdM, standard_cut_meters: String(stdTotal),
      cut_unit: u, unit: u, unit_cost: parseFloat(matchedInv?.cost_price || b.unit_cost || b.cost || 0) || 0,
      deduct_inventory: true, is_graded: grading.isGraded, excess_pct: grading.excessPct,
      brackets: br, matched_inventory: matchedInv ? { id: matchedInv.id, name: matchedInv.name, quantity: matchedInv.quantity, unit: matchedInv.unit } : null
    };
  });

  let unitPrice = 0;
  let pm = product?.price_matrix;
  if (typeof pm === 'string') { try { pm = JSON.parse(pm); } catch (e) { pm = {}; } }
  if (pm && typeof pm === 'object') {
    if (pm[cat] !== undefined && pm[cat] !== null && pm[cat] !== '') unitPrice = parseFloat(pm[cat]);
    else { for (const k of Object.keys(pm)) { if (k.includes(cat) || cat.includes(k)) { unitPrice = parseFloat(pm[k]); break; } } }
  }
  if (!unitPrice) unitPrice = parseFloat(product?.base_price || product?.sell_price || product?.price || 0);

  return {
    fabricName: bomItems[0]?.fabric_name || '', singleMeters: bomItems[0]?.single_meters || 0,
    totalMeters: bomItems.reduce((acc, it) => acc + (parseFloat(it.total_meters) || 0), 0),
    unitPrice, totalPrice: Math.round(unitPrice * qty), category: cat, bomItems, sizing
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
  YARDS_PER_METER, resolveProductTiers, matchClientMeasurementToCategory,
  matchInventoryFabric, interpolateFabricQuantity, getBomConsumptionAndPricing, convertCutUnit
};
