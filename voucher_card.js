// voucher_card.js - Little Princesses ERP Royal Visual Voucher Engine
let currentVoucher = null, brandSettings = null;

async function fetchBrandSettings() {
  if (brandSettings) return brandSettings;
  try {
    if (typeof window !== 'undefined' && window.BrandService) {
      const p = window.BrandService.getProfile();
      if (p && p.name) return (brandSettings = p);
    }
    const res = await fetch('/api/settings');
    if (res.ok) {
      const d = await res.json();
      if (d.company) return (brandSettings = d.company);
    }
  } catch (e) { console.warn("Settings fallback:", e); }
  return (brandSettings = {});
}

async function fetchVoucherData(voucherId) {
  let v = {};
  try {
    const res = await fetch(`/api/vouchers/card-data?id=${encodeURIComponent(voucherId)}`);
    if (res.ok) { const d = await res.json(); if (d.success) v = d; }
  } catch (e) { console.warn("Voucher fallback:", e); }
  const s = await fetchBrandSettings(), isReceipt = v.is_receipt !== false;
  return {
    voucher_no: v.voucher_no || voucherId || 'RV-2026-00108',
    voucher_type: v.voucher_type || (isReceipt ? 'سند قبض' : 'سند صرف'),
    is_receipt: isReceipt,
    badge_label: v.badge_label || (isReceipt ? 'إشعار استلام نقدي / سند قبض' : 'إشعار صرف نقدي / سند صرف'),
    badge_color: isReceipt ? '#059669' : '#991b1b',
    party_title: v.party_title || (isReceipt ? 'المقبوض منه / وصل من' : 'المدفوع لأمره / صرف إلى'),
    party_name: v.party_name || 'عميل محترم',
    formatted_amount: v.formatted_amount || '0',
    currency: v.currency || 'YER',
    currency_label: v.currency_label || 'ريال يمني',
    written_amount: v.written_amount || 'فقط صفر ريال لا غير',
    pay_method: v.pay_method || 'نقداً بالخزينة',
    transfer_no: v.transfer_no || '—',
    date: v.date || new Date().toISOString().slice(0, 16).replace('T', ' '),
    notes: v.notes || 'تسديد دفعة حساب وفق الأصول المالية',
    brand_name: s.company_name || s.name || v.brand_name || 'مؤسسة الأميرات الصغيرات',
    brand_subtitle: s.tagline || v.brand_subtitle || 'وثيقة مالية معتمدة عبر النظام المحاسبي الموحد',
    brand_phone: s.phone || v.brand_phone || '776773458',
    brand_address: s.address || v.brand_address || 'اليمن - صنعاء',
    brand_tax: s.commercialRegister || s.commercial_register || v.brand_tax_id || 'CR-1010-009283',
    brand_logo: s.logoUrl || s.logo_url || v.brand_logo || '',
    verify_hash: v.verify_hash || 'LP-98F4A12B'
  };
}

function updateVoucherDOM(v) {
  currentVoucher = v;
  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setT('vNo', v.voucher_no); setT('vDate', v.date);
  setT('vPartyTitle', v.party_title + ':'); setT('vPartyName', v.party_name);
  setT('vAmount', v.formatted_amount); setT('vCurr', v.currency_label || v.currency);
  setT('vWrittenAmount', v.written_amount); setT('vPayMethod', v.pay_method);
  setT('vTransferNo', v.transfer_no); setT('vNotes', v.notes); setT('vHash', v.verify_hash);
  setT('vBrandName', v.brand_name); setT('vBrandSubtitle', v.brand_subtitle);
  setT('vBrandPhone', v.brand_phone); setT('vBrandAddress', v.brand_address); setT('vBrandTax', v.brand_tax);

  const imgEl = document.getElementById('vLogoImg'), defEl = document.getElementById('vLogoDefault');
  if (imgEl && defEl) {
    if (v.brand_logo) { imgEl.src = v.brand_logo; imgEl.style.display = 'block'; defEl.style.display = 'none'; }
    else { imgEl.style.display = 'none'; defEl.style.display = 'block'; }
  }
  const badge = document.getElementById('vTypeBadge');
  if (badge) {
    badge.textContent = v.badge_label; badge.style.color = v.badge_color;
    badge.style.borderColor = v.badge_color; badge.style.backgroundColor = v.is_receipt ? '#ecfdf5' : '#fef2f2';
  }
  const stamp = document.getElementById('officialStamp');
  if (stamp) {
    stamp.style.borderColor = v.badge_color; stamp.style.color = v.badge_color;
    setT('stampOrg', v.brand_name.length > 22 ? v.brand_name.slice(0, 20) + '..' : v.brand_name);
    setT('stampStatus', v.is_receipt ? 'قُــبِــضَ' : 'صُــرِفَ'); setT('stampDate', v.date.slice(0, 10));
  }
  drawSimpleQR('qrCanvas', `${window.location.origin}/voucher.html?id=${v.voucher_no}`);
}

function drawSimpleQR(canvasId, text) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 80, 80); ctx.fillStyle = '#0f172a';
  const drawCorner = (x, y) => {
    ctx.fillRect(x, y, 22, 22); ctx.clearRect(x + 4, y + 4, 14, 14); ctx.fillRect(x + 7, y + 7, 8, 8);
  };
  drawCorner(6, 6); drawCorner(52, 6); drawCorner(6, 52);
  for (let i = 0; i < 28; i++) {
    ctx.fillRect(32 + ((i * 13) % 40), 32 + ((i * 19) % 40), 3, 3);
  }
}

function drawCanvasStamp(ctx, cx, cy, r, v) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-10 * Math.PI / 180);
  const col = v.badge_color || '#991b1b';
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, r - 5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r - 12, 0, Math.PI * 2); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 11px Cairo, Tahoma';
  const org = v.brand_name || 'المؤسسة';
  ctx.fillText(org.length > 20 ? org.slice(0, 18) + '..' : org, 0, -28);
  ctx.font = 'bold 20px Cairo, Tahoma';
  ctx.fillText(v.is_receipt ? 'قُــبِــضَ' : 'صُــرِفَ', 0, -2);
  ctx.font = 'bold 10px Cairo, Tahoma';
  ctx.fillText('قسم الرقابة المالية', 0, 16);
  ctx.font = 'bold 9px Tahoma';
  ctx.fillText(v.date ? v.date.slice(0, 10) : '2026-09-17', 0, 32);
  ctx.restore();
}

function renderVoucherToCanvas() {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 760;
  const ctx = c.getContext('2d'), v = currentVoucher || {};

  ctx.fillStyle = '#fffdf9'; ctx.fillRect(0, 0, 1200, 760);
  ctx.strokeStyle = '#b45309'; ctx.lineWidth = 5; ctx.strokeRect(18, 18, 1164, 724);
  ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 3; ctx.strokeRect(26, 26, 1148, 708);

  ctx.textAlign = 'right'; ctx.fillStyle = '#0f172a'; ctx.font = 'bold 32px Cairo, Tahoma';
  ctx.fillText(v.brand_name || 'مؤسسة الأميرات الصغيرات', 1080, 80);
  ctx.fillStyle = '#64748b'; ctx.font = '16px Cairo, Tahoma';
  ctx.fillText(v.brand_subtitle || 'وثيقة مالية رسمية معتمدة', 1080, 112);
  ctx.font = '14px Cairo, Tahoma'; ctx.fillStyle = '#334155';
  ctx.fillText(`هاتف: ${v.brand_phone || ''}  |  العنوان: ${v.brand_address || ''}  |  س.ت: ${v.brand_tax || ''}`, 1080, 140);

  ctx.textAlign = 'left'; ctx.fillStyle = v.badge_color || '#059669';
  ctx.fillRect(80, 55, 300, 44);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 17px Cairo, Tahoma';
  ctx.fillText(v.badge_label || 'سند مالي معتمد', 95, 83);
  ctx.fillStyle = '#475569'; ctx.font = 'bold 14px Tahoma';
  ctx.fillText(`رقم السند: ${v.voucher_no || ''}`, 80, 122);
  ctx.fillText(`التاريخ: ${v.date || ''}`, 80, 144);

  ctx.fillStyle = '#f8fafc'; ctx.fillRect(80, 175, 1040, 52);
  ctx.strokeStyle = '#d97706'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(1120, 175); ctx.lineTo(1120, 227); ctx.stroke();
  ctx.textAlign = 'right'; ctx.fillStyle = '#475569'; ctx.font = 'bold 16px Cairo, Tahoma';
  ctx.fillText(`${v.party_title || 'الطرف'}:`, 1100, 208);
  ctx.fillStyle = '#0f172a'; ctx.font = 'bold 22px Cairo, Tahoma';
  ctx.fillText(v.party_name || '', 940, 208);

  ctx.fillStyle = '#0f172a'; ctx.fillRect(80, 245, 1040, 100);
  ctx.strokeStyle = '#c59b27'; ctx.lineWidth = 2; ctx.strokeRect(80, 245, 1040, 100);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 36px Tahoma';
  ctx.fillText(`${v.formatted_amount || '0'}  ${v.currency_label || v.currency || ''}`, 600, 292);
  ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 17px Cairo, Tahoma';
  ctx.fillText(v.written_amount || '', 600, 328);

  ctx.textAlign = 'right'; ctx.fillStyle = '#1e293b'; ctx.font = '18px Cairo, Tahoma';
  ctx.fillText(`طريقة الدفع: ${v.pay_method || ''}   |   رقم المرجع/الحوالة: ${v.transfer_no || '—'}`, 1100, 385);
  ctx.fillText(`البيان: ${v.notes || ''}`, 1100, 425);

  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(80, 465); ctx.lineTo(1120, 465); ctx.stroke();

  ctx.textAlign = 'center'; ctx.fillStyle = '#475569'; ctx.font = 'bold 16px Cairo, Tahoma';
  ctx.fillText('توقيع المحاسب / أمين الصندوق', 980, 510);
  ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(900, 560); ctx.lineTo(1060, 560); ctx.stroke();
  ctx.setLineDash([]);

  drawCanvasStamp(ctx, 600, 550, 60, v);

  ctx.textAlign = 'center'; ctx.fillStyle = '#64748b'; ctx.font = '12px Tahoma';
  ctx.fillText(`رمز الأمان: ${v.verify_hash || 'VERIFIED'}`, 200, 615);
  ctx.font = 'bold 13px Cairo, Tahoma'; ctx.fillStyle = '#b45309';
  ctx.fillText('سند مالي إلكتروني معتمد رسمياً وموثق محاسبياً', 600, 690);
  return c;
}

function downloadVoucherImage() {
  const canvas = renderVoucherToCanvas(), link = document.createElement('a');
  link.download = `سند_${currentVoucher?.voucher_no || 'مالي'}.png`;
  link.href = canvas.toDataURL('image/png'); link.click();
}

async function copyVoucherImage() {
  const canvas = renderVoucherToCanvas();
  canvas.toBlob(async (blob) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('✅ تم نسخ بطاقة السند الرسمية المعتمدة بالختم إلى الحافظة بنجاح! يمكنك لصقها (Ctrl+V) في الواتساب.');
    } catch (e) {
      alert('⚠️ متصفحك يمنع النسخ التلقائي المباشر، جاري تنزيل الصورة بدلاً من ذلك.');
      downloadVoucherImage();
    }
  });
}

function shareVoucherWhatsApp() {
  const v = currentVoucher || {}, u = window.location.href;
  const msg = `👑 *${v.brand_name}*\n📜 *${v.badge_label} (معتمد رسمياً):*\n━━━━━━━━━━━━━━━━━━\n` +
    `🔹 *رقم السند:* ${v.voucher_no}\n🔹 *التاريخ:* ${v.date}\n🔹 *${v.party_title}:* ${v.party_name}\n` +
    `🔹 *المبلغ:* ${v.formatted_amount} ${v.currency_label || v.currency}\n🔹 *التفقيط:* ${v.written_amount}\n` +
    `🔹 *طريقة الدفع:* ${v.pay_method}\n🔹 *البيان:* ${v.notes}\n━━━━━━━━━━━━━━━━━━\n` +
    `🔒 *رمز التوثيق المالي والختم:* ${v.verify_hash}\n🖼️ *معاينة وتحميل السند المعتمد بكامل الأختام:*\n${u}\n\n✨ نسعد بخدمتكم دائماً.`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}
