// dress_card.js - Little Princesses ERP Royal Garment & Sizing Card Engine Facade
// Architecture Standard: Rule 3 & Rule 5 (Strict Backward Compatibility Facade)

let currentDressData = null;

// Resolve Modular Subservices
const Parser = (typeof window !== 'undefined' && window.DressCardParser) || {};
const Template = (typeof window !== 'undefined' && window.DressCardTemplate) || {};

function getActiveBrand(apiBrand) {
  if (typeof Parser.getActiveBrand === 'function') return Parser.getActiveBrand(apiBrand);
  if (typeof window.getActiveBrand === 'function') return window.getActiveBrand(apiBrand);
  return { name: 'مؤسسة الأميرات الصغيرات', phone: '776773458', address: 'اليمن - صنعاء - شارع حدة', logo_url: 'logo.png' };
}

async function fetchDressCardData(orderId) {
  if (typeof Parser.fetchDressCardData === 'function') return await Parser.fetchDressCardData(orderId);
  if (typeof window.fetchDressCardData === 'function') return await window.fetchDressCardData(orderId);
  return { order_no: orderId || 'ORD-2026-0042', order_date: new Date().toISOString().slice(0, 10), financials: { total: 0, paid: 0, remaining: 0, currency: 'YER' } };
}

function drawDressCardQR(canvasId, url) {
  if (typeof Template.drawDressCardQR === 'function') return Template.drawDressCardQR(canvasId, url);
  if (typeof window.drawDressCardQR === 'function') return window.drawDressCardQR(canvasId, url);
}

function renderDressCardToCanvas(data) {
  if (typeof Template.renderDressCardToCanvas === 'function') return Template.renderDressCardToCanvas(data || currentDressData);
  if (typeof window.renderDressCardToCanvas === 'function') return window.renderDressCardToCanvas(data || currentDressData);
  return document.createElement('canvas');
}

function downloadDressCardImage(data) {
  if (typeof Template.downloadDressCardImage === 'function') return Template.downloadDressCardImage(data || currentDressData);
  if (typeof window.downloadDressCardImage === 'function') return window.downloadDressCardImage(data || currentDressData);
}

async function copyDressCardImage(data) {
  if (typeof Template.copyDressCardImage === 'function') return await Template.copyDressCardImage(data || currentDressData);
  if (typeof window.copyDressCardImage === 'function') return await window.copyDressCardImage(data || currentDressData);
}

function shareDressCardWhatsApp(data) {
  if (typeof Template.shareDressCardWhatsApp === 'function') return Template.shareDressCardWhatsApp(data || currentDressData);
  if (typeof window.shareDressCardWhatsApp === 'function') return window.shareDressCardWhatsApp(data || currentDressData);
}

// ── Update Card DOM Elements ──
function updateDressCardDOM(d) {
  currentDressData = d;
  if (typeof window !== 'undefined') window.currentDressData = d;
  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setT('orderNo', d.order_no);
  setT('orderDate', d.order_date);
  setT('childName', d.child_name);
  setT('childAge', d.child_age ? `العمر: ${d.child_age}` : (d.is_ready_to_wear ? 'مقاس جاهز' : 'مقاس خاص'));
  setT('motherName', d.customer_name);
  setT('motherPhone', d.customer_phone ? `📱 ${d.customer_phone}` : '—');
  setT('productName', d.product_name);
  setT('fabricType', d.fabric_type);
  setT('dressColor', d.color);
  setT('orderNotes', d.notes || 'لا توجد ملاحظات إضافية');
  setT('orderStageBadge', d.card_badge || (d.is_ready_to_wear ? 'شراء فوري وضمان أصلي ✔️' : 'حجز مؤكد ومقاسات معتمدة 🏷️'));

  const brand = d.brand || {};
  setT('brandName', brand.name || 'دار الأميرات الصغيرات للأزياء الفاخرة');
  setT('brandTagline', 'دار أزياء وتفصيل فساتين الأميرات الراقية | عراقة التصميم وأناقة الطفولة');
  setT('brandPhone', brand.phone || '776773458');
  setT('brandAddress', brand.address || 'اليمن - صنعاء - شارع حدة');

  const logoImg = document.getElementById('brandLogoImg');
  const logoFallback = document.getElementById('brandLogoFallback');
  if (logoImg && logoFallback) {
    const lUrl = (!brand.logo_url || brand.logo_url === 'logo.png') ? 'logo.svg' : brand.logo_url;
    logoImg.src = lUrl;
    logoImg.style.display = 'block';
    logoFallback.style.display = 'none';
    logoImg.onerror = () => { logoImg.style.display = 'none'; logoFallback.style.display = 'block'; };
  }

  // Comfort profile badges
  const cBadges = document.getElementById('comfortBadges');
  const cWrap = document.getElementById('comfortBadgesWrap');
  if (cBadges && cWrap) {
    const list = d.comfort_profile || ['بطانة قطن ناعم 100% لبشرة الأميرة', 'سحاب مخفي آمن'];
    cBadges.innerHTML = list.map(b => `<span class="badge-pill">✨ ${b}</span>`).join('');
    cWrap.style.display = list.length ? 'flex' : 'none';
  }

  const m = d.measurements || {};
  const isStdAge = !!d.is_standard_age_sizing;
  const isInch = d.unit === 'إنش' || (d.unit && d.unit.includes('إنش'));
  const measTableWrap = document.getElementById('measTableWrap');
  const ageBracketBox = document.getElementById('ageBracketBox');
  const rtwCareBox = document.getElementById('rtwCareBox');
  const measCardTitle = document.getElementById('measCardTitle');

  if (d.is_ready_to_wear) {
    if (measTableWrap) measTableWrap.style.display = 'none';
    if (ageBracketBox) {
      ageBracketBox.style.display = 'block';
      const ageTitle = document.getElementById('ageBracketTitle');
      const ageDesc = document.getElementById('ageBracketDesc');
      if (ageTitle) ageTitle.textContent = d.sizing_summary || `المقاس المعتمد: مقاس جاهز للأميرة (${d.child_age || 'مقاس قياسي'})`;
      if (ageDesc) ageDesc.textContent = 'فستان مصمم ومفصل وفق أرقى مقاييس الكوتور العالمية للأميرات مع راحة تامة في الحركة 🎀';
    }
    if (rtwCareBox) {
      rtwCareBox.style.display = 'block';
      const rtwList = document.getElementById('rtwCareList');
      if (rtwList && d.care_instructions && d.care_instructions.length) {
        rtwList.innerHTML = d.care_instructions.map(c => `<li>• ${c}</li>`).join('');
      }
    }
    if (measCardTitle) measCardTitle.textContent = 'المواصفات والضمان الملكي للفستان الجاهز ✨';
  } else if (isStdAge) {
    if (measTableWrap) measTableWrap.style.display = 'none';
    if (rtwCareBox) rtwCareBox.style.display = 'none';
    if (ageBracketBox) {
      ageBracketBox.style.display = 'block';
      const ageTitle = document.getElementById('ageBracketTitle');
      if (ageTitle) ageTitle.textContent = d.sizing_summary || `المقاس المعتمد: تفصيل حسب الفئة العمرية (${d.child_age || 'عمر الطفلة'})`;
    }
    if (measCardTitle) measCardTitle.textContent = 'المقاس والمواصفات المعتمدة للأميرة ✨';
  } else {
    if (measTableWrap) measTableWrap.style.display = 'block';
    if (ageBracketBox) ageBracketBox.style.display = 'none';
    if (rtwCareBox) rtwCareBox.style.display = 'none';
    if (measCardTitle) measCardTitle.textContent = isInch ? 'جدول المقاسات المعتمدة للأميرة (بالإنش - Inch)' : 'جدول المقاسات المعتمدة للأميرة (بالسنتيمتر - سم)';
  }

  const cleanMeas = (val) => String(val || '—').replace(/\s*\([^)]*\)/g, '').trim() || '—';
  setT('mLength', cleanMeas(m.dress_length));
  setT('mChest', cleanMeas(m.chest));
  setT('mWaist', cleanMeas(m.waist));
  setT('mShoulder', cleanMeas(m.shoulder));
  setT('mSleeve', cleanMeas(m.sleeve_length));
  if (m.notes) setT('mNotes', `💡 تفضيلات وملاحظات المقاس: ${m.notes}`);

  const f = d.financials || {};
  const cur = f.currency || 'YER';
  setT('finTotal', Number(f.total || 0).toLocaleString('en-US'));
  setT('finPaid', Number(f.paid || 0).toLocaleString('en-US'));
  setT('finRem', Number(f.remaining || 0).toLocaleString('en-US'));
  setT('finCurr1', cur);
  setT('finCurr2', cur);
  setT('finCurr3', cur);

  if (d.is_ready_to_wear) {
    setT('deliveryLabel', 'حالة الشراء والتسليم:');
    setT('deliveryIcon', '🛍️');
    setT('deliveryDate', d.delivery_status_label || 'تم الشراء والاستلام الفوري من المعرض بنجاح ✔️');
  } else {
    setT('deliveryLabel', 'موعد التسليم والاستلام المعتمد للأميرة:');
    setT('deliveryIcon', '🎁');
    setT('deliveryDate', d.delivery_date || 'حسب الموعد المعتمد');
  }

  setT('stampDate', d.order_date || new Date().toISOString().slice(0, 10));
  setT('verifyHash', d.verify_hash || 'LP-AUTH-VALID');

  const imgEl = document.getElementById('dressPhotoImg');
  const fbEl = document.getElementById('dressPhotoFallback');
  if (imgEl && fbEl) {
    if (d.product_image && d.product_image.trim()) {
      imgEl.src = d.product_image;
      imgEl.style.display = 'block';
      fbEl.style.display = 'none';
    } else {
      imgEl.style.display = 'none';
      fbEl.style.display = 'block';
    }
  }

  const trackingUrl = `${window.location.origin}/track.html?order=${encodeURIComponent(d.order_no || '')}`;
  drawDressCardQR('dressQR', trackingUrl);
}

// Global Export bindings
window.currentDressData = currentDressData;
window.getActiveBrand = getActiveBrand;
window.fetchDressCardData = fetchDressCardData;
window.updateDressCardDOM = updateDressCardDOM;
window.drawDressCardQR = drawDressCardQR;
window.renderDressCardToCanvas = renderDressCardToCanvas;
window.downloadDressCardImage = downloadDressCardImage;
window.copyDressCardImage = copyDressCardImage;
window.shareDressCardWhatsApp = shareDressCardWhatsApp;

// ── Auto Initialization on Load ──
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order') || params.get('id') || params.get('order_no') || 'ORD-2026-0042';
    const data = await fetchDressCardData(orderId);
    updateDressCardDOM(data);
  });
}
