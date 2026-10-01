/**
 * ============================================================================
 * dressCardCanvas.js — Luxury Canvas & PNG Export Engine for Dress Cards
 * Domain: Tailoring & Atelier Services | Architecture Standard: Rule 1, 3 & 4
 * ============================================================================
 */

(function(window) {
  'use strict';

  function renderDressCardToCanvas(data) {
    const d = data || (typeof window !== 'undefined' && window.currentDressData) || {};
    const f = d.financials || {};
    const m = d.measurements || {};
    const cur = f.currency || 'YER';

    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 800;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#fffdfa';
    ctx.fillRect(0, 0, 1200, 800);
    ctx.strokeStyle = '#8F2A87';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, 1164, 764);
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(26, 26, 1148, 748);

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

    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Cairo, Tahoma';
    ctx.fillStyle = '#64748b';
    ctx.fillText('وثيقة رسمية صادرة وموثقة عبر دار الأميرات الصغيرات للأزياء الفاخرة 👑', 600, 735);

    return c;
  }

  function downloadDressCardImage(data) {
    const d = data || (typeof window !== 'undefined' && window.currentDressData) || {};
    const canvas = renderDressCardToCanvas(d);
    const link = document.createElement('a');
    const oNo = d.order_no || 'ORD';
    const prefix = d.is_ready_to_wear ? 'وثيقة_ملكية_فستان_جاهز' : 'كرت_فستان_الأميرة';
    link.download = `${prefix}_${oNo}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function copyDressCardImage(data) {
    const d = data || (typeof window !== 'undefined' && window.currentDressData) || {};
    const canvas = renderDressCardToCanvas(d);
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        alert('✅ تم نسخ صورة كرت الفستان الفاخر إلى الحافظة بنجاح! يمكنك الآن لصقها (Ctrl+V) مباشرة في محادثة الواتساب للأم 🌸👑');
      } catch (e) {
        alert('⚠️ المتصفح يتطلب إذناً لنسخ الصورة، جاري تنزيلها إلى جهازك بدلاً من ذلك.');
        downloadDressCardImage(d);
      }
    });
  }

  window.DressCardCanvas = { renderDressCardToCanvas, downloadDressCardImage, copyDressCardImage };
  window.renderDressCardToCanvas = renderDressCardToCanvas;
  window.downloadDressCardImage = downloadDressCardImage;
  window.copyDressCardImage = copyDressCardImage;

})(typeof window !== 'undefined' ? window : globalThis);
