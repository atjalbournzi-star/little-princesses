// src/features/customers/hooks/useBespokeBOM.js
// احتساب شجرة المواد (BOM) والتسعير الفئوي ديناميكياً 100% من بيانات الموديل الحية في Supabase

(function(window) {
  'use strict';

  function resolveTier(measurements, selectedProduct = null, targetMode = 'kids') {
    const matcher = window.SmartSizingMatcher?.matchClientMeasurementToCategory;
    if (typeof matcher === 'function') {
      const res = matcher(measurements, selectedProduct);
      if (res?.category) return res.category;
    }
    if (targetMode === 'women_adults' || measurements?.target_mode === 'women_adults') return 'M';
    let len = parseFloat(measurements?.dress_length || measurements?.dress_len || measurements?.total_height || 0) || 0;
    const uStr = String(measurements?.unit || '').trim().toLowerCase();
    if ((uStr.includes('inch') || uStr.includes('إنش') || uStr.includes('انش')) && len > 0) len *= 2.54;
    if (len <= 55) return '1-2Y';
    if (len <= 68.6) return '3-5Y';
    if (len <= 83.8) return '6-9Y';
    return '10-13Y';
  }

  function deriveBespokeBOM(selectedProduct, measurements = {}, targetMode = 'kids') {
    if (!selectedProduct) {
      return { ageTier: '6-9Y', calculatedBomItems: [], calculatedPrice: 0, jumboFactor: 1, bomSummary: '', isExceeded: false, badgeText: '' };
    }

    const matcher = window.SmartSizingMatcher?.matchClientMeasurementToCategory;
    const measObj = (measurements && typeof measurements === 'object') ? measurements : {};
    const measWithTarget = (targetMode && !measObj.target_mode) ? { ...measObj, target_mode: targetMode } : measObj;
    const matchRes = typeof matcher === 'function'
      ? matcher(measWithTarget, selectedProduct, measObj.unit || '')
      : { category: resolveTier(measWithTarget, selectedProduct, targetMode), isExceeded: false, badgeText: '', varianceAlert: '' };
    const ageTier = matchRes?.category || '6-9Y';
    const isExceeded = Boolean(matchRes?.isExceeded);
    const varianceAlert = matchRes?.varianceAlert || '';
    const badgeText = matchRes?.badgeText || `[ الفئة: ${ageTier} ]`;

    let items = [];
    let bomList = [];
    const rawBom = selectedProduct.bom || selectedProduct.materials;
    if (Array.isArray(rawBom)) {
      bomList = rawBom;
    } else if (rawBom && typeof rawBom === 'object') {
      if (Array.isArray(rawBom.items)) bomList = rawBom.items;
      else if (Array.isArray(rawBom.materials)) bomList = rawBom.materials;
    } else if (typeof rawBom === 'string') {
      try {
        const parsed = JSON.parse(rawBom);
        if (Array.isArray(parsed)) bomList = parsed;
        else if (parsed && Array.isArray(parsed.items)) bomList = parsed.items;
      } catch (e) { bomList = []; }
    }

    if (bomList.length > 0) {
      items = bomList.map((item, idx) => {
        const nativeUnit = String(item.unit || item.cut_unit || item.uom || 'متر').trim();
        let qtyVal = 0;
        if (item.brackets && typeof item.brackets === 'object') {
          qtyVal = parseFloat(item.brackets[ageTier] ?? item.brackets[ageTier.replace('Y', '')] ?? 0);
          if (isNaN(qtyVal) || qtyVal <= 0) {
            for (const k of Object.keys(item.brackets)) {
              if (k.includes(ageTier) || ageTier.includes(k)) {
                qtyVal = parseFloat(item.brackets[k]);
                break;
              }
            }
          }
        }
        if (isNaN(qtyVal) || qtyVal <= 0) {
          qtyVal = parseFloat(item.qty ?? item.meters ?? item.cut_meters ?? item.quantity ?? 0) || 0;
        }
        const fName = item.fabric_name || item.name || item.material_name || `خامة ${idx + 1}`;
        const invId = item.inventory_id || item.fabric_id || item.id || null;
        const uCost = parseFloat(item.cost || item.unit_cost || 0) || 0;
        return {
          id: invId || `bom-${idx}`,
          inventory_id: invId,
          fabric_id: invId,
          name: fName,
          fabric_name: fName,
          qty: parseFloat(qtyVal.toFixed(2)),
          cut_meters: parseFloat(qtyVal.toFixed(2)),
          unit: nativeUnit,
          cut_unit: nativeUnit,
          cost: uCost,
          unit_cost: uCost
        };
      });
    }

    let resolvedPrice = 0;
    let pm = selectedProduct.price_matrix;
    if (typeof pm === 'string') {
      try { pm = JSON.parse(pm); } catch (e) { pm = {}; }
    }
    if (pm && typeof pm === 'object') {
      if (pm[ageTier] !== undefined && pm[ageTier] !== null && pm[ageTier] !== '') {
        resolvedPrice = parseFloat(pm[ageTier]);
      } else {
        for (const k of Object.keys(pm)) {
          if (k.includes(ageTier) || ageTier.includes(k)) {
            resolvedPrice = parseFloat(pm[k]);
            break;
          }
        }
      }
    }
    if (!resolvedPrice || isNaN(resolvedPrice)) {
      resolvedPrice = parseFloat(selectedProduct.base_price || selectedProduct.sell_price || selectedProduct.price || 0) || 0;
    }

    const totalStandardMeters = items.reduce((acc, it) => {
      const q = parseFloat(it.qty) || 0, u = it.unit || 'متر', uom = window.UnitConversionService;
      return acc + (uom?.toMeters ? uom.toMeters(q, u) : (u.includes('وار') ? q * 0.9144 : (u.includes('سم') ? q * 0.01 : q)));
    }, 0);
    const standardTotalStr = totalStandardMeters.toFixed(2);
    const bomSummary = `${items.map(i => `${i.name}: ${Number(i.qty).toFixed(2)} ${i.unit}`).join(' | ')}${items.length > 0 ? ` [إجمالي موحد: ${standardTotalStr} متر]` : ''}`;

    return {
      ageTier,
      isExceeded,
      badgeText,
      varianceAlert,
      calculatedBomItems: items,
      totalStandardMeters: parseFloat(standardTotalStr),
      calculatedPrice: Math.round(resolvedPrice),
      jumboFactor: 1,
      bomSummary
    };
  }

  function useBespokeBOM(selectedProduct, measurements, targetMode = 'kids') {
    return deriveBespokeBOM(selectedProduct, measurements, targetMode);
  }

  window.useBespokeBOM = useBespokeBOM;
  window.BespokeBOMService = { deriveBespokeBOM, useBespokeBOM, resolveTier };
})(typeof window !== 'undefined' ? window : this);
