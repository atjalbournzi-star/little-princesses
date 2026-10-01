/**
 * useOrderPricing.js - محرك تسعير الفساتين والطلبات واحتساب الأرصدة المتزامنة
 * Little Princesses ERP - Unified Pricing & Customer Balance Sync Engine
 */

(function(window) {
  'use strict';

  function resolveAgeTier(input, targetSegment = 'kids') {
    if (targetSegment === 'women_adults') return 'M';
    if (!input) return '6-9Y';

    if (typeof input === 'string') {
      const s = input.trim().toLowerCase();
      if (s.includes('10-13') || s.includes('10-12') || s.includes('12-14') || s.includes('يافع')) return '10-13Y';
      if (s.includes('6-9') || s.includes('6-7') || s.includes('8-10') || s.includes('وسط')) return '6-9Y';
      if (s.includes('3-5') || s.includes('4-5') || s.includes('2-3')) return '3-5Y';
      if (s.includes('1-2') || s.includes('صغير')) return '1-2Y';
    }

    if (window.MeasurementConverter?.resolveSizeCode) {
      return window.MeasurementConverter.resolveSizeCode(input, targetSegment);
    }

    let len = 0;
    if (typeof input === 'number') len = input;
    else if (typeof input === 'object') {
      len = parseFloat(input.dress_length || input.dress_len || input.total_height || input.total_len || input.length || 0) || 0;
      if (input.unit === 'إنش' || input.unit === 'inch') len *= 2.54;
    }
    if (len <= 0) return '6-9Y';
    const inches = len / 2.54;
    if (inches <= 19) return '1-2Y';
    if (inches <= 24) return '3-5Y';
    if (inches <= 29) return '6-9Y';
    return '10-13Y';
  }

  function resolveProductTierPrice(product = {}, ageTierOrMeasurements = '6-9Y') {
    if (!product) return 0;
    const tier = (typeof ageTierOrMeasurements === 'string' && ageTierOrMeasurements.includes('Y'))
      ? ageTierOrMeasurements
      : resolveAgeTier(ageTierOrMeasurements, product.target_segment || 'kids');

    const matrix = product.price_matrix || product.tier_pricing || {};
    if (typeof matrix === 'object' && matrix !== null) {
      if (matrix[tier] !== undefined && matrix[tier] !== null && matrix[tier] !== '') {
        return Number(matrix[tier]) || 0;
      }

      const tierAliases = {
        '10-13Y': ['10-13Y', '10-13', '10-13 سنة', '10-13 سنوات', '10-12 سنة', '12-14 سنة', 'teen', 'junior_plus'],
        '6-9Y': ['6-9Y', '6-9', '6-9 سنوات', '6-7Y', '8-10 سنوات', 'junior', 'kids'],
        '3-5Y': ['3-5Y', '3-5', '3-5 سنوات', '4-5 سنوات', 'toddler_plus'],
        '1-2Y': ['1-2Y', '1-2', '1-2 سنة', '1-2 سنوات', 'toddler']
      };

      const aliases = tierAliases[tier] || [tier];
      for (const alias of aliases) {
        if (matrix[alias] !== undefined && matrix[alias] !== null && matrix[alias] !== '') {
          return Number(matrix[alias]) || 0;
        }
      }

      const targetNorm = String(tier).replace(/[^0-9a-z]/gi, '').toLowerCase();
      for (const [k, v] of Object.entries(matrix)) {
        const kNorm = String(k).replace(/[^0-9a-z]/gi, '').toLowerCase();
        if (kNorm && (kNorm === targetNorm || kNorm.includes(targetNorm) || targetNorm.includes(kNorm))) {
          return Number(v) || 0;
        }
      }
    }

    return Number(product.base_price ?? product.sell_price ?? product.price ?? 0);
  }

  function calculateOrderPricing({ tierPrice = 0, deliveryFee = 0, qty = 1, advancePaid = 0, deliveryPaymentMode = 'DIRECT_TO_COURIER' } = {}) {
    const q = Math.max(1, Number(qty) || 1);
    const resolvedPrice = Number(tierPrice) || 0;
    const delivery = Math.max(0, Number(deliveryFee) || 0);
    const paid = Math.max(0, Number(advancePaid) || 0);
    const mode = (deliveryPaymentMode === 'PREPAID_VIA_ATELIER') ? 'PREPAID_VIA_ATELIER' : 'DIRECT_TO_COURIER';
    const isPrepaid = mode === 'PREPAID_VIA_ATELIER';

    const items_total = resolvedPrice * q;
    const total_order_amount = isPrepaid ? (items_total + delivery) : items_total;
    const remaining_balance = Math.max(0, total_order_amount - paid);

    return {
      resolved_tier_price: resolvedPrice,
      items_total,
      delivery_fee: delivery,
      delivery_payment_mode: mode,
      quantity: q,
      advance_paid: paid,
      total_order_amount,
      remaining_balance
    };
  }

  function useOrderPricing(params = {}) {
    const { product, measurements, deliveryFee = 0, advancePaid = 0, qty = 1, targetSegment = 'kids', deliveryPaymentMode = 'DIRECT_TO_COURIER' } = params;
    const tier = resolveAgeTier(measurements, targetSegment);
    const tierPrice = resolveProductTierPrice(product, tier);
    return {
      tier,
      ...calculateOrderPricing({ tierPrice, deliveryFee, qty, advancePaid, deliveryPaymentMode })
    };
  }

  const OrderPricing = {
    resolveAgeTier,
    resolveProductTierPrice,
    calculateOrderPricing,
    useOrderPricing
  };

  window.OrderPricing = OrderPricing;
  window.useOrderPricing = useOrderPricing;

})(typeof window !== 'undefined' ? window : globalThis);
