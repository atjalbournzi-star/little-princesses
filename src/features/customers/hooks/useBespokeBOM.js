// src/features/customers/hooks/useBespokeBOM.js
// احتساب شجرة المواد (BOM) ديناميكياً بحسب الموديل والمقاسات بالوحدات الأصلية (وار/متر/قطعة)

(function(window) {
  'use strict';

  function resolveTier(measurements, targetMode = 'kids') {
    if (targetMode === 'women_adults') return 'M';
    if (!measurements) return '6-9Y';
    if (window.MeasurementConverter?.resolveSizeCode) {
      return window.MeasurementConverter.resolveSizeCode(measurements, targetMode);
    }
    if (window.OrderPricing?.resolveAgeTier) {
      return window.OrderPricing.resolveAgeTier(measurements, targetMode);
    }
    let len = parseFloat(measurements.dress_length || measurements.total_height || 0);
    const uStr = String(measurements.unit || '').trim();
    const isInch = uStr.includes('إنش') || uStr.includes('انش') || uStr.includes('inch') || uStr.includes('in');
    if (isInch && len > 0) len *= 2.54;
    if (len <= 0) {
      const age = String(measurements.estimated_age || '');
      if (age.includes('1-2')) return '1-2Y';
      if (age.includes('3-5') || age.includes('4-5') || age.includes('2-3')) return '3-5Y';
      if (age.includes('10-13') || age.includes('10-12') || age.includes('12-14')) return '10-13Y';
      return '6-9Y';
    }
    if (len <= 55) return '1-2Y';
    if (len <= 75) return '3-5Y';
    if (len <= 95) return '6-9Y';
    return '10-13Y';
  }

  function deriveBespokeBOM(selectedProduct, measurements = {}, targetMode = 'kids') {
    if (!selectedProduct) {
      return { ageTier: '6-9Y', calculatedBomItems: [], calculatedPrice: 0, jumboFactor: 1, bomSummary: '' };
    }

    const ageTier = resolveTier(measurements, targetMode);

    let items = [];
    const rawBom = selectedProduct.bom || selectedProduct.materials;
    if (Array.isArray(rawBom) && rawBom.length > 0) {
      items = rawBom.map((item, idx) => {
        const nativeUnit = String(item.unit || item.uom || 'متر').trim();
        let qtyVal = 0;
        if (item.brackets && typeof item.brackets === 'object') {
          qtyVal = parseFloat(item.brackets[ageTier] ?? item.brackets[ageTier.replace('Y', '')] ?? item.brackets['6-9Y'] ?? item.meters ?? item.qty ?? 0);
        } else {
          qtyVal = parseFloat(item.qty ?? item.meters ?? item.quantity ?? item.consumption ?? (ageTier === '1-2Y' ? 1.5 : (ageTier === '3-5Y' ? 2.0 : 2.5)));
        }
        return {
          id: item.id || item.inventory_id || `bom-${idx}`,
          name: item.fabric_name || item.name || item.material_name || item.item_name || 'خامة',
          qty: parseFloat(qtyVal.toFixed(2)),
          unit: nativeUnit,
          cost: parseFloat(item.cost || item.unit_cost || 0),
          inventory_id: item.inventory_id || item.id || null
        };
      });
    } else {
      const nativeUnit = String(selectedProduct.unit || selectedProduct.fabric_unit || 'متر').trim();
      let defaultMeters = parseFloat(selectedProduct.yards_used || (ageTier === '1-2Y' ? 1.5 : (ageTier === '3-5Y' ? 2.0 : (ageTier === '6-9Y' ? 2.5 : 3.5))));
      items = [{
        id: selectedProduct.id || 'mat-default',
        name: selectedProduct.fabric_name || 'قماش الموديل الأساسي',
        qty: parseFloat(defaultMeters.toFixed(2)),
        unit: nativeUnit,
        cost: parseFloat(selectedProduct.fabric_cost || 0),
        inventory_id: null
      }];
    }

    let resolvedPrice = 0;
    if (window.OrderPricing?.resolveProductTierPrice) {
      resolvedPrice = window.OrderPricing.resolveProductTierPrice(selectedProduct, ageTier);
    } else if (window.MeasurementConverter?.resolveUnitPrice) {
      resolvedPrice = window.MeasurementConverter.resolveUnitPrice(selectedProduct, ageTier);
    } else {
      resolvedPrice = parseFloat(selectedProduct.sell_price || selectedProduct.price || selectedProduct.base_price || 0);
    }

    const bomSummary = items.map(i => `${i.name}: ${Number(i.qty).toFixed(2)} ${i.unit}`).join(' | ');

    return {
      ageTier,
      calculatedBomItems: items,
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
