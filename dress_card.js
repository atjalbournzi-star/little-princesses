// dress_card.js - Little Princesses ERP Royal Garment & Sizing Card Engine
let currentDressData = null;

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
  return {
    name: merged.company_name || merged.name || 'مؤسسة الأميرات الصغيرات',
    tagline: merged.tagline || merged.tradeName || 'دار الأزياء والتفصيل الراقي لفساتين الأميرات ✨',
    phone: merged.phone || '776773458',
    address: merged.address || 'اليمن - صنعاء - شارع حدة',
    logo_url: merged.logo_url || merged.logoUrl || 'logo.png'
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

  // Fallback / Defaults
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

// ── Update Card DOM Elements ──
function updateDressCardDOM(d) {
  currentDressData = d;
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

  // Dynamic Badge & Header
  setT('orderStageBadge', d.card_badge || (d.is_ready_to_wear ? 'شراء فوري وضمان أصلي ✔️' : 'حجز مؤكد ومقاسات معتمدة 🏷️'));

  // Dynamic Brand & Logo
  const brand = d.brand || {};
  setT('brandName', brand.name || 'ليتل برنسيس للأزياء الفاخرة');
  setT('brandTagline', d.is_ready_to_wear 
    ? 'وثيقة ملكية وضمان جودة الفستان الفاخر للأميرات الصغيرات ✨' 
    : (brand.tagline || 'وثيقة حجز وتفصيل فستان ملكي للأميرات الصغيرات ✨'));
  setT('brandPhone', brand.phone || '776773458');
  setT('brandAddress', brand.address || 'اليمن - صنعاء - شارع حدة');

  const logoImg = document.getElementById('brandLogoImg');
  const logoFallback = document.getElementById('brandLogoFallback');
  if (logoImg && logoFallback) {
    if (brand.logo_url && brand.logo_url.trim()) {
      logoImg.src = brand.logo_url;
      logoImg.style.display = 'block';
      logoFallback.style.display = 'none';
    } else {
      logoImg.style.display = 'none';
      logoFallback.style.display = 'block';
    }
  }

  // Sizing & Measurements
  const m = d.measurements || {};
  const isStdAge = !!d.is_standard_age_sizing;
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
      if (ageTitle) {
        ageTitle.textContent = d.sizing_summary || `المقاس المعتمد: تفصيل حسب الفئة العمرية (${d.child_age || 'عمر الطفلة'})`;
      }
    }
    if (measCardTitle) measCardTitle.textContent = 'المقاس والمواصفات المعتمدة للأميرة ✨';
  } else {
    if (measTableWrap) measTableWrap.style.display = 'block';
    if (ageBracketBox) ageBracketBox.style.display = 'none';
    if (rtwCareBox) rtwCareBox.style.display = 'none';
    if (measCardTitle) measCardTitle.textContent = 'جدول المقاسات المعتمدة للأميرة (بالسنتيمتر سم)';
  }

  setT('mLength', m.dress_length || '—');
  setT('mChest', m.chest || '—');
  setT('mWaist', m.waist || '—');
  setT('mShoulder', m.shoulder || '—');
  setT('mSleeve', m.sleeve_length || '—');
  if (m.notes) setT('mNotes', `💡 تفضيلات وملاحظات المقاس: ${m.notes}`);

  // Financials
  const f = d.financials || {};
  const cur = f.currency || 'YER';
  setT('finTotal', Number(f.total || 0).toLocaleString('en-US'));
  setT('finPaid', Number(f.paid || 0).toLocaleString('en-US'));
  setT('finRem', Number(f.remaining || 0).toLocaleString('en-US'));
  setT('finCurr1', cur);
  setT('finCurr2', cur);
  setT('finCurr3', cur);

  // Delivery Date & Verification
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

  // Dress Image
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

  // Draw QR code pointing to live tracking portal
  const trackingUrl = `${window.location.origin}/track.html?order=${encodeURIComponent(d.order_no)}`;
  drawDressCardQR('dressQR', trackingUrl);
}

// ── Draw Simple Fast QR ──
function drawDressCardQR(canvasId, url) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 84, 84);
  ctx.fillStyle = '#8F2A87';

  // Corner markers
  const drawCorner = (x, y) => {
    ctx.fillRect(x, y, 22, 22);
    ctx.clearRect(x + 4, y + 4, 14, 14);
    ctx.fillRect(x + 7, y + 7, 8, 8);
  };
  drawCorner(6, 6);
  drawCorner(56, 6);
  drawCorner(6, 56);

  // Decorative data dots
  let seed = 0;
  for (let i = 0; i < url.length; i++) seed = (seed * 31 + url.charCodeAt(i)) % 1000;
  for (let i = 0; i < 35; i++) {
    const rx = 32 + ((i * 17 + seed) % 44);
    const ry = 32 + ((i * 23 + seed) % 44);
    ctx.fillRect(rx, ry, 3, 3);
  }
}

// ── Render High-Resolution Canvas (for PNG Export) ──
function renderDressCardToCanvas() {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 800;
  const ctx = c.getContext('2d');
  const d = currentDressData || {};
  const f = d.financials || {};
  const m = d.measurements || {};
  const cur = f.currency || 'YER';

  // Background & Gold/Purple Borders
  ctx.fillStyle = '#fffdfa';
  ctx.fillRect(0, 0, 1200, 800);
  ctx.strokeStyle = '#8F2A87';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, 1164, 764);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(26, 26, 1148, 748);

  // Header Brand Info
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8F2A87';
  ctx.font = '900 32px Cairo, Tahoma';
  ctx.fillText(d.brand?.name || 'ليتل برنسيس للأزياء الفاخرة', 1080, 80);

  ctx.fillStyle = '#b45309';
  ctx.font = '700 15px Cairo, Tahoma';
  ctx.fillText(d.brand?.tagline || 'دار تصميم وتفصيل فساتين الأميرات الراقية ✨', 1080, 108);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 13px Cairo, Tahoma';
  ctx.fillText(`هاتف: ${d.brand?.phone || '776773458'}  |  العنوان: ${d.brand?.address || 'صنعاء - شارع حدة'}`, 1080, 134);

    // Order Badge Header Left
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8F2A87';
  ctx.fillRect(80, 55, 290, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Cairo, Tahoma';
  ctx.fillText(d.card_title || (d.is_ready_to_wear ? 'وثيقة ملكية وضمان فستان جاهز 🛍️👑' : 'وثيقة حجز وتفصيل فستان ملكي 👑'), 90, 81);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`رقم الطلب: ${d.order_no || ''}`, 80, 118);
  ctx.fillText(d.is_ready_to_wear ? `تاريخ الشراء: ${d.order_date || ''}` : `تاريخ الحجز: ${d.order_date || ''}`, 80, 138);

  // Royal Princess & Mother Banner
  ctx.fillStyle = '#8F2A87';
  ctx.fillRect(80, 160, 1040, 72);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  ctx.strokeRect(80, 160, 1040, 72);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fbcfe8';
  ctx.font = '700 12px Cairo, Tahoma';
  ctx.fillText(d.is_ready_to_wear ? 'الأميرة صاحبة الفستان:' : 'الأميرة الصغيرة:', 1100, 185);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px Cairo, Tahoma';
  ctx.fillText(`${d.child_name || 'الأميرة'}  (${d.child_age || ''})`, 1100, 214);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fbcfe8';
  ctx.font = '700 12px Cairo, Tahoma';
  ctx.fillText(d.is_ready_to_wear ? 'والدة الأميرة / المشترية:' : 'والدة الأميرة / العميلة:', 100, 185);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px Cairo, Tahoma';
  ctx.fillText(`${d.customer_name || 'العميلة الكريمة'}   ${d.customer_phone ? '📱 ' + d.customer_phone : ''}`, 100, 214);

  // Model & Design Details
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(80, 250, 1040, 115);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(80, 250, 1040, 115);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#8F2A87';
  ctx.font = 'bold 16px Cairo, Tahoma';
  ctx.fillText(`👗 الموديل المعتمد:  ${d.product_name || 'فستان ملكي خاص'}`, 1100, 280);

  ctx.fillStyle = '#334155';
  ctx.font = '14px Cairo, Tahoma';
  ctx.fillText(`خامات الفستان: ${d.fabric_type || 'أقمشة فاخرة'}     اللون: ${d.color || 'حسب الاختيار'}`, 1100, 310);
  ctx.fillText(`ملاحظات وضمان الفستان: ${d.notes || (d.is_ready_to_wear ? 'كولكشن جاهز أصلي معتمد من الدار' : 'خياطة خاصة ومقاسات معتمدة')}`, 1100, 340);

  // Measurements / RTW Specifications Box
  ctx.fillStyle = '#fdf4ff';
  ctx.fillRect(80, 380, 1040, 80);
  ctx.strokeStyle = '#f0abfc';
  ctx.strokeRect(80, 380, 1040, 80);

  ctx.textAlign = 'right';
  if (d.is_ready_to_wear) {
    ctx.fillStyle = '#701a75';
    ctx.font = 'bold 16px Cairo, Tahoma';
    ctx.fillText(`👑 ${d.sizing_summary || ('مقاس كولكشن جاهز معتمد للأميرة (' + (d.child_age || '') + ')')}`, 1100, 412);

    ctx.font = '13px Cairo, Tahoma';
    ctx.fillStyle = '#86198f';
    ctx.fillText('💎 شهادة الجودة والأصالة: خامات مستوردة وتطريز فاخر • تنظيف جاف (Dry Clean) • كي بالبخار 🎀', 1100, 442);
  } else if (d.is_standard_age_sizing) {
    ctx.fillStyle = '#701a75';
    ctx.font = 'bold 16px Cairo, Tahoma';
    ctx.fillText(`👑 ${d.sizing_summary || ('المقاس المعتمد: تفصيل بحسب الفئة العمرية (' + (d.child_age || '') + ')')}`, 1100, 412);

    ctx.font = '13px Cairo, Tahoma';
    ctx.fillStyle = '#86198f';
    ctx.fillText('✨ تم اعتماد مقاسات التفصيل القياسية للفئة العمرية مع تطبيق معايير الأناقة الملكية والراحة لحركة الأميرة 🎀', 1100, 442);
  } else {
    ctx.fillStyle = '#701a75';
    ctx.font = 'bold 13px Cairo, Tahoma';
    ctx.fillText('📐 جدول المقاسات المعتمدة للأميرة (سم):', 1100, 405);

    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#8F2A87';
    const measStr = `طول الفستان: ${m.dress_length || '—'}   |   الصدر: ${m.chest || '—'}   |   الخصر: ${m.waist || '—'}   |   الكتف: ${m.shoulder || '—'}   |   الكم: ${m.sleeve_length || '—'}`;
    ctx.fillText(measStr, 1100, 435);
  }

  // Financial Highlight Strip
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(80, 480, 1040, 95);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  ctx.strokeRect(80, 480, 1040, 95);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 13px Cairo, Tahoma';
  ctx.fillText('المبلغ الإجمالي', 250, 515);
  ctx.fillText(d.is_ready_to_wear ? 'المبلغ المسدد' : 'المبلغ الموصل (العربون)', 600, 515);
  ctx.fillText(d.is_ready_to_wear ? 'المتبقي' : 'المتبقي عند الاستلام', 950, 515);

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${Number(f.total || 0).toLocaleString()} ${cur}`, 250, 550);
  ctx.fillStyle = '#34d399';
  ctx.fillText(`${Number(f.paid || 0).toLocaleString()} ${cur}`, 600, 550);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`${Number(f.remaining || 0).toLocaleString()} ${cur}`, 950, 550);

  // Delivery Schedule Strip
  ctx.fillStyle = '#fffdfa';
  ctx.fillRect(80, 595, 1040, 55);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(80, 595, 1040, 55);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8F2A87';
  ctx.font = 'bold 17px Cairo, Tahoma';
  if (d.is_ready_to_wear) {
    ctx.fillText(`🛍️ حالة الشراء والاستلام:  ${d.delivery_status_label || 'تم الشراء والاستلام الفوري من المعرض بنجاح ✔️'}`, 600, 630);
  } else {
    ctx.fillText(`🎁 موعد التسليم والاستلام النهائي المعتمد:  ${d.delivery_date || 'حسب الموعد المعتمد'}`, 600, 630);
  }

  // Verification Hash & Footer
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`كود التحقق الرقمي: ${d.verify_hash || 'LP-AUTH'}   |   وثيقة رسمية صادرة عبر Little Princesses ERP`, 600, 735);

  return c;
}

// ── Download PNG ──
function downloadDressCardImage() {
  const canvas = renderDressCardToCanvas();
  const link = document.createElement('a');
  const oNo = currentDressData?.order_no || 'ORD';
  const prefix = currentDressData?.is_ready_to_wear ? 'وثيقة_ملكية_فستان_جاهز' : 'كرت_فستان_الأميرة';
  link.download = `${prefix}_${oNo}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ── Copy PNG to Clipboard ──
async function copyDressCardImage() {
  const canvas = renderDressCardToCanvas();
  canvas.toBlob(async (blob) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('✅ تم نسخ صورة كرت الفستان الفاخر إلى الحافظة بنجاح! يمكنك الآن لصقها (Ctrl+V) مباشرة في محادثة الواتساب للأم 🌸👑');
    } catch (e) {
      alert('⚠️ المتصفح يتطلب إذناً لنسخ الصورة، جاري تنزيلها إلى جهازك بدلاً من ذلك.');
      downloadDressCardImage();
    }
  });
}

// ── Share WhatsApp ──
function shareDressCardWhatsApp() {
  const d = currentDressData || {};
  const f = d.financials || {};
  const m = d.measurements || {};
  const cur = f.currency || 'YER';
  const cardUrl = window.location.href;
  const trackingUrl = `${window.location.origin}/track.html?order=${encodeURIComponent(d.order_no)}`;

  const sizeText = d.is_ready_to_wear
    ? `👑 *المقاس المعتمد:* ${d.sizing_summary || ('مقاس كولكشن جاهز للأميرة ' + (d.child_age || ''))}\n💎 *الضمان والأصالة:* خامات كوتور فاخرة مطابقة لأعلى المعايير الملكية ✔️`
    : (d.is_standard_age_sizing
      ? `👑 *المقاس المعتمد:* ${d.sizing_summary || ('تفصيل حسب الفئة العمرية ' + (d.child_age || ''))}`
      : `📏 *المقاسات المعتمدة:* طول ${m.dress_length || '—'} | صدر ${m.chest || '—'} | خصر ${m.waist || '—'}`);

  const greeting = d.is_ready_to_wear
    ? `مبارك بحمد الله شراء واقتناء فستان الأميرات الجاهز لأميرتنا الجميلة *${d.child_name || 'الأميرة'}* 🛍️👑✨`
    : `تم اعتماد وتأكيد حجز تفصيل الفستان لأميرتنا الجميلة *${d.child_name || 'الأميرة'}* بنجاح ✅`;

  const msg = `👑 *${d.brand?.name || 'ليتل برنسيس للأزياء الفاخرة'}* 👑\n` +
    `أهلاً وسهلاً بكِ عزيزتنا *${d.customer_name || 'الأم الفاضلة'}* 🌸✨\n` +
    `${greeting}\n\n` +
    `👗 *الموديل:* ${d.product_name || 'موديل راقي خاص'}\n` +
    `📋 *رقم الطلب / الفاتورة:* ${d.order_no}\n` +
    `${sizeText}\n\n` +
    `💰 *البيان المالي:* \n` +
    `  • الإجمالي: ${Number(f.total || 0).toLocaleString()} ${cur}\n` +
    `  • المسدد: ${Number(f.paid || 0).toLocaleString()} ${cur}\n` +
    `  • المتبقي: ${Number(f.remaining || 0).toLocaleString()} ${cur}\n\n` +
    (d.is_ready_to_wear 
      ? `🛍️ *حالة الاستلام:* تم الشراء والاستلام الفوري من المعرض بنجاح ✔️\n`
      : `📅 *موعد التسليم النهائي:* ${d.delivery_date || 'محدد مع المشغل'}\n`) +
    `\n🖼️ *معاينة وثيقة الملكية وكرت الفستان الفاخر والتحميل:* \n${cardUrl}\n\n` +
    `📱 *بوابة تتبع فستانكِ حياً للجوال:* \n${trackingUrl}\n\n` +
    `نسعد دائماً بخدمتكم وتألق أميرتكم بأجمل إطلالة! 🎀👑✨`;

  let phone = d.customer_phone ? String(d.customer_phone).replace(/\D/g, '') : '';
  if (phone.startsWith('0')) phone = '967' + phone.substring(1);
  else if (!phone.startsWith('967') && !phone.startsWith('966') && phone.length > 0) phone = '967' + phone;

  const waUrl = phone 
    ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  window.open(waUrl, '_blank');
}

// ── Auto Initialization on Load ──
window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order') || params.get('id') || params.get('order_no') || 'ORD-2026-0042';
  const data = await fetchDressCardData(orderId);
  updateDressCardDOM(data);
});
