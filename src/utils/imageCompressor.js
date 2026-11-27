/**
 * imageCompressor.js - أداة ضغط الصور الخفيفة في المتصفح (Canvas -> WebP/JPEG)
 * الحد الأقصى للعرض 800px والحجم المستهدف 40–80 KB لتسريع الرفع وحماية قاعدة البيانات
 */
(function (window) {
  'use strict';

  function estimateBase64Kb(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return 0;
    const idx = dataUrl.indexOf(',');
    const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
    return Math.round(((b64.length * 3) / 4) / 1024);
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
        img.onload = () => resolve(img);
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function compressImageFile(file, opts = {}) {
    if (!file) throw new Error('لم يتم اختيار ملف صورة');
    const maxWidth = opts.maxWidth || 800;
    const maxKb = opts.maxKb || 80;
    const img = await loadImageFromFile(file);

    let targetW = img.naturalWidth || img.width || maxWidth;
    let targetH = img.naturalHeight || img.height || maxWidth;
    if (targetW > maxWidth) {
      targetH = Math.max(1, Math.round((targetH * maxWidth) / targetW));
      targetW = maxWidth;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const qualities = [0.78, 0.64, 0.5, 0.36];
    let bestUrl = '';
    let bestKb = 0;

    for (const mime of ['image/webp', 'image/jpeg']) {
      for (const q of qualities) {
        const url = canvas.toDataURL(mime, q);
        if (!url.startsWith(`data:${mime}`)) break;
        const kb = estimateBase64Kb(url);
        bestUrl = url;
        bestKb = kb;
        if (kb <= maxKb) {
          return { dataUrl: url, sizeKb: kb, width: targetW, height: targetH, mimeType: mime };
        }
      }
      if (bestUrl) break;
    }

    if (!bestUrl) {
      bestUrl = canvas.toDataURL('image/jpeg', 0.45);
      bestKb = estimateBase64Kb(bestUrl);
    }
    return { dataUrl: bestUrl, sizeKb: bestKb, width: targetW, height: targetH, mimeType: 'image/jpeg' };
  }

  window.ImageCompressor = {
    compressImageFile,
    estimateBase64Kb,
  };
})(typeof window !== 'undefined' ? window : globalThis);
