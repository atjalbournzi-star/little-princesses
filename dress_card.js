// dress_card.js - Little Princesses ERP Royal Garment & Fitting Card Engine
let currentDressData = null;

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

  // Fallback / Defaults
  return {
    order_no: data.order_no || orderId || 'ORD-2026-0042',
    order_date: data.order_date || new Date().toISOString().slice(0, 10),
    delivery_date: data.delivery_date || 'يحدد لاحقاً',
    fitting_date: data.fitting_date || 'قبل موعد الاستلام بيومين',
    customer_name: data.customer_name || 'أميرة القصر الكريمة',
    customer_phone: data.customer_phone || '',
    child_name: data.child_name || 'الأميرة الصغيرة',
    child_age: data.child_age ? `${data.child_age} سنوات` : 'مناسب للطفلة',
    product_name: data.product_name || 'فستان مناسبات ملكي فاخر',
    product_image: data.product_image || '',
    fabric_type: data.fabric_type || 'أقمشة فاخرة خاصة + بطانة ناعمة',
    color: data.color || 'حسب الاختيار المعتمد',
    status: data.status || 'حجز مؤكد',
    stage: data.stage || 'قيد التجهيز ✂️',
    notes: data.notes || 'خياطة ملكية وتطريز يدوي فاخر',
    measurements: data.measurements || {
      dress_length: '75 سم',
      chest: '58 سم',
      waist: '54 سم',
      shoulder: '26 سم',
      sleeve_length: '22 سم',
      notes: ''
    },
    financials: data.financials || {
      total: 85000,
      paid: 45000,
      remaining: 40000,
      currency: 'YER'
    },
    brand: data.brand || {
      name: 'ليتل برنسيس للأزياء الفاخرة',
      tagline: 'وثيقة حجز وتفصيل فستان ملكي للأميرات الصغيرات ✨',
      phone: '776773458',
      address: 'اليمن - صنعاء - شارع حدة'
    },
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
  setT('childAge', d.child_age ? `العمر: ${d.child_age}` : 'مقاس خاص');
  setT('motherName', d.customer_name);
  setT('motherPhone', d.customer_phone ? `📱 ${d.customer_phone}` : '—');
  setT('productName', d.product_name);
  setT('fabricType', d.fabric_type);
  setT('dressColor', d.color);
  setT('orderNotes', d.notes || 'لا توجد ملاحظات إضافية');

  // Measurements
  const m = d.measurements || {};
  setT('mLength', m.dress_length || '—');
  setT('mChest', m.chest || '—');
  setT('mWaist', m.waist || '—');
  setT('mShoulder', m.shoulder || '—');
  setT('mSleeve', m.sleeve_length || '—');
  if (m.notes) setT('mNotes', `💡 تفضيلات المقاس: ${m.notes}`);

  // Financials
  const f = d.financials || {};
  const cur = f.currency || 'YER';
  setT('finTotal', Number(f.total || 0).toLocaleString('en-US'));
  setT('finPaid', Number(f.paid || 0).toLocaleString('en-US'));
  setT('finRem', Number(f.remaining || 0).toLocaleString('en-US'));
  setT('finCurr1', cur);
  setT('finCurr2', cur);
  setT('finCurr3', cur);

  // Dates
  setT('fittingDate', d.fitting_date || 'يحدد بالتنسيق');
  setT('deliveryDate', d.delivery_date || 'حسب الموعد المعتمد');
  setT('stampDate', d.order_date || new Date().toISOString().slice(0, 10));
  setT('verifyHash', d.verify_hash || 'LP-AUTH-VALID');

  // Brand
  if (d.brand) {
    setT('brandName', d.brand.name || 'ليتل برنسيس للأزياء الفاخرة');
    setT('brandTagline', d.brand.tagline || 'وثيقة حجز وتفصيل فستان ملكي');
    setT('brandPhone', d.brand.phone || '776773458');
    setT('brandAddress', d.brand.address || 'اليمن - صنعاء');
  }

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
  ctx.fillRect(80, 55, 260, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px Cairo, Tahoma';
  ctx.fillText('وثيقة حجز وتفصيل فستان ملكي 👑', 95, 81);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`رقم الطلب: ${d.order_no || ''}`, 80, 118);
  ctx.fillText(`تاريخ الحجز: ${d.order_date || ''}`, 80, 138);

  // Royal Princess & Mother Banner
  ctx.fillStyle = '#8F2A87';
  ctx.fillRect(80, 160, 1040, 72);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  ctx.strokeRect(80, 160, 1040, 72);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fbcfe8';
  ctx.font = '700 12px Cairo, Tahoma';
  ctx.fillText('الأميرة الصغيرة:', 1100, 185);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px Cairo, Tahoma';
  ctx.fillText(`${d.child_name || 'الأميرة'}  (${d.child_age || ''})`, 1100, 214);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fbcfe8';
  ctx.font = '700 12px Cairo, Tahoma';
  ctx.fillText('والدة الأميرة / العميلة:', 100, 185);
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
  ctx.fillText(`قماش الفستان: ${d.fabric_type || 'أقمشة فاخرة'}     اللون: ${d.color || 'حسب الطلب'}`, 1100, 310);
  ctx.fillText(`ملاحظات التفصيل: ${d.notes || 'خياطة خاصة ومقاسات معتمدة'}`, 1100, 340);

  // Measurements Box
  ctx.fillStyle = '#fdf4ff';
  ctx.fillRect(80, 380, 1040, 80);
  ctx.strokeStyle = '#f0abfc';
  ctx.strokeRect(80, 380, 1040, 80);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#701a75';
  ctx.font = 'bold 13px Cairo, Tahoma';
  ctx.fillText('📐 جدول المقاسات المعتمدة للأميرة:', 1100, 405);

  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#8F2A87';
  const measStr = `طول الفستان: ${m.dress_length || '—'}   |   الصدر: ${m.chest || '—'}   |   الخصر: ${m.waist || '—'}   |   الكتف: ${m.shoulder || '—'}   |   الكم: ${m.sleeve_length || '—'}`;
  ctx.fillText(measStr, 1100, 435);

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
  ctx.fillText('المبلغ الموصل (العربون)', 600, 515);
  ctx.fillText('المتبقي عند الاستلام', 950, 515);

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${Number(f.total || 0).toLocaleString()} ${cur}`, 250, 550);
  ctx.fillStyle = '#34d399';
  ctx.fillText(`${Number(f.paid || 0).toLocaleString()} ${cur}`, 600, 550);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`${Number(f.remaining || 0).toLocaleString()} ${cur}`, 950, 550);

  // Dates & Schedule
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px Cairo, Tahoma';
  ctx.fillText(`🪡 موعد البروفة والقياس: ${d.fitting_date || 'يحدد لاحقاً'}`, 1100, 615);
  ctx.fillText(`🎁 موعد التسليم النهائي: ${d.delivery_date || 'حسب الموعد'}`, 1100, 645);

  // Verification Hash & Footer
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`كود التحقق الرقمي: ${d.verify_hash || 'LP-AUTH'}   |   وثيقة حجز رسمية صادرة عبر Little Princesses ERP`, 600, 735);

  return c;
}

// ── Download PNG ──
function downloadDressCardImage() {
  const canvas = renderDressCardToCanvas();
  const link = document.createElement('a');
  const oNo = currentDressData?.order_no || 'ORD';
  link.download = `كرت_فستان_الأميرة_${oNo}.png`;
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

  const msg = `👑 *${d.brand?.name || 'ليتل برنسيس للأزياء الفاخرة'}* 👑\n` +
    `أهلاً وسهلاً بكِ عزيزتنا *${d.customer_name || 'الأم الفاضلة'}* 🌸✨\n` +
    `تم اعتماد وتأكيد حجز تفصيل الفستان لأميرتنا الجميلة *${d.child_name || 'الأميرة'}* بنجاح ✅\n\n` +
    `👗 *الموديل:* ${d.product_name || 'موديل راقي خاص'}\n` +
    `📋 *رقم الطلب:* ${d.order_no}\n` +
    `📏 *المقاسات المعتمدة:* طول ${m.dress_length || '—'} | صدر ${m.chest || '—'} | خصر ${m.waist || '—'}\n\n` +
    `💰 *البيان المالي:* \n` +
    `  • الإجمالي: ${Number(f.total || 0).toLocaleString()} ${cur}\n` +
    `  • الموصل (العربون): ${Number(f.paid || 0).toLocaleString()} ${cur}\n` +
    `  • المتبقي عند الاستلام: ${Number(f.remaining || 0).toLocaleString()} ${cur}\n\n` +
    `📅 *موعد التسليم النهائي:* ${d.delivery_date || 'محدد مع المشغل'}\n\n` +
    `🖼️ *معاينة كرت الفستان الفاخر والتحميل:* \n${cardUrl}\n\n` +
    `📱 *بوابة تتبع الفستان والبروفة للجوال:* \n${trackingUrl}\n\n` +
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
