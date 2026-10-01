/**
 * ============================================================================
 * dressCardParser.js — Little Princesses ERP Royal Garment & Sizing Parser
 * Domain: Tailoring & Atelier Services | Architecture Standard: Rule 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  // ── Get Dynamic Active Brand Profile ──
  function getActiveBrand(apiBrand) {
    let profile = {};
    try {
      if (typeof window !== 'undefined' && window.BrandService && typeof window.BrandService.getProfile === 'function') {
        profile = window.BrandService.getProfile() || {};
      } else {
        const raw = localStorage.getItem('erp_company_profile_v1');
        if (raw) profile = JSON.parse(raw);
      }
    } catch (e) {}

    const merged = Object.assign({}, apiBrand || {}, profile);
    const rawLogo = merged.logo_url || merged.logoUrl;
    return {
      name: merged.company_name || merged.name || 'مؤسسة الأميرات الصغيرات',
      tagline: merged.tagline || merged.tradeName || 'دار أزياء وتفصيل فساتين الأميرات الراقية | عراقة التصميم وأناقة الطفولة',
      phone: merged.phone || '776773458',
      address: merged.address || 'اليمن - صنعاء - شارع حدة',
      logo_url: (!rawLogo || rawLogo === 'logo.png') ? 'logo.svg' : rawLogo
    };
  }

  // ── Fetch Dress Card Payload ──
  async function fetchDressCardData(orderId) {
    let data = {};
    if (orderId) {
      try {
        const res = await fetch(`/api/orders/dress-card?id=${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) data = json;
        }
      } catch (e) {
        console.warn("API fetch error, using client fallbacks:", e);
      }
    }

    const brand = getActiveBrand(data.brand);
    const isRtw = !!data.is_ready_to_wear || String(data.order_no || orderId || '').toUpperCase().startsWith('POS-');

    return {
      order_no: data.order_no || orderId || 'ORD-2026-0042',
      order_date: data.order_date || new Date().toISOString().slice(0, 10),
      delivery_date: data.delivery_date || (isRtw ? 'تم الاستلام الفوري من المعرض ✔️' : 'حسب الموعد المعتمد'),
      delivery_status_label: data.delivery_status_label || (isRtw ? 'تم الشراء والاستلام الفوري من صالة العرض بنجاح ✔️' : data.delivery_date),
      is_ready_to_wear: isRtw,
      card_title: data.card_title || (isRtw ? 'وثيقة ملكية وضمان فستان جاهز 🛍️👑' : 'وثيقة حجز وتفصيل فستان ملكي 👑'),
      card_badge: data.card_badge || (isRtw ? 'شراء فوري من المعرض وضمان أصلي ✔️' : 'حجز مؤكد ومقاسات معتمدة 🏷️'),
      care_instructions: data.care_instructions || [
        'تنظيف جاف فاخر (Dry Clean Only) للحفاظ على بريق الأقمشة والتطريز الكريستالي',
        'كي بالبخار بدرجة حرارة خفيفة لمعالجة طبقات التول والأورجانزا',
        'الحفظ داخل حقيبة القماش الخاصة بالأميرات بعيداً عن الرطوبة وأشعة الشمس المباشرة'
      ],
      customer_name: data.customer_name || 'أميرة القصر الكريمة',
      customer_phone: data.customer_phone || '',
      child_name: data.child_name || 'الأميرة الجميلة',
      child_age: data.child_age ? (String(data.child_age).includes('سنوات') ? data.child_age : `${data.child_age} سنوات`) : 'مقاس معتمد',
      product_name: data.product_name || (isRtw ? 'فستان الأميرات الجاهز (كولكشن فاخر)' : 'فستان مناسبات ملكي فاخر'),
      product_image: data.product_image || '',
      fabric_type: data.fabric_type || 'أقمشة فاخرة خاصة + بطانة ناعمة',
      color: data.color || 'حسب الاختيار المعتمد',
      status: data.status || (isRtw ? 'تم الشراء والاستلام 🛍️' : 'حجز مؤكد'),
      stage: data.stage || (isRtw ? 'تم الاستلام بنجاح 🛍️' : 'قيد التجهيز ✂️'),
      notes: data.notes || (isRtw ? 'جاهز للتسليم الفوري • شامل ضمان الأصالة الملكية' : 'خياطة ملكية وتطريز يدوي فاخر'),
      is_standard_age_sizing: isRtw ? true : !!data.is_standard_age_sizing,
      sizing_summary: data.sizing_summary || (isRtw ? 'مقاس كولكشن جاهز معتمد للأميرة' : ''),
      comfort_profile: data.comfort_profile || ['بطانة قطن ناعم 100% لبشرة الأميرة', 'سحاب مخفي آمن'],
      unit: data.unit || 'سم',
      measurements: data.measurements || {
        dress_length: '—',
        chest: '—',
        waist: '—',
        shoulder: '—',
        sleeve_length: '—',
        notes: ''
      },
      financials: data.financials || {
        total: 0,
        paid: 0,
        remaining: 0,
        currency: 'YER'
      },
      brand: brand,
      verify_hash: data.verify_hash || 'LP-ROYAL-74A8'
    };
  }

  const DressCardParser = {
    getActiveBrand,
    fetchDressCardData
  };

  window.DressCardParser = DressCardParser;
  window.getActiveBrand = getActiveBrand;
  window.fetchDressCardData = fetchDressCardData;

})(typeof window !== 'undefined' ? window : globalThis);
