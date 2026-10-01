/**
 * ============================================================================
 * dressCardShare.js — QR Code & WhatsApp Messaging Engine for Dress Cards
 * Domain: Tailoring & Atelier Services | Architecture Standard: Rule 1, 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  function drawDressCardQR(canvasId, url) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 84, 84);
    ctx.fillStyle = '#8F2A87';

    const drawCorner = (x, y) => {
      ctx.fillRect(x, y, 22, 22);
      ctx.clearRect(x + 4, y + 4, 14, 14);
      ctx.fillRect(x + 7, y + 7, 8, 8);
    };
    drawCorner(6, 6);
    drawCorner(56, 6);
    drawCorner(6, 56);

    let seed = 0;
    for (let i = 0; i < url.length; i++) seed = (seed * 31 + url.charCodeAt(i)) % 1000;
    for (let i = 0; i < 35; i++) {
      const rx = 32 + ((i * 17 + seed) % 44);
      const ry = 32 + ((i * 23 + seed) % 44);
      ctx.fillRect(rx, ry, 3, 3);
    }
  }

  function shareDressCardWhatsApp(data) {
    const d = data || (typeof window !== 'undefined' && window.currentDressData) || {};
    const f = d.financials || {};
    const m = d.measurements || {};
    const cur = f.currency || 'YER';
    const cardUrl = window.location.href;
    const trackingUrl = `${window.location.origin}/track.html?order=${encodeURIComponent(d.order_no || '')}`;

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

  window.DressCardShare = { drawDressCardQR, shareDressCardWhatsApp };
  window.drawDressCardQR = drawDressCardQR;
  window.shareDressCardWhatsApp = shareDressCardWhatsApp;

})(typeof window !== 'undefined' ? window : globalThis);
