// src/features/inventory/utils/imageCompressUtils.js
// ضغط صور المنتجات في المتصفح (بحد أقصى 600px بصيغة WebP/JPEG) ورفعها محلياً دون Base64

(function(window) {
  'use strict';

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = (err) => { URL.revokeObjectURL(url); reject(err); };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    });
  }

  async function compressImageFile(file, maxDim = 600, quality = 0.82) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      throw new Error('يرجى اختيار ملف صورة صالح (JPG / PNG / WebP)');
    }
    const img = await loadImageFromFile(file);
    const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    let blob = await canvasToBlob(canvas, 'image/webp', quality);
    let ext = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      ext = 'jpg';
    }
    if (!blob) throw new Error('تعذر ضغط الصورة في المتصفح');
    return { blob, ext };
  }

  async function compressAndUploadProductImage(file) {
    const { blob, ext } = await compressImageFile(file, 600, 0.82);
    const formData = new FormData();
    formData.append('image', blob, `dress_${Date.now()}.${ext}`);

    const res = await fetch('/api/uploads/product-image', {
      method: 'POST',
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success || !data?.url) {
      throw new Error(data?.error || data?.message || 'فشل رفع الصورة للخادم');
    }
    return data.url;
  }

  const READY_PRODUCT_AGE_PRESETS = ['1-2 سنة', '3-4 سنوات', '5-6 سنوات', '7-8 سنوات', '9-10 سنوات', '11-12 سنة'];

  async function submitReadyProduct(payload) {
    const res = await fetch('/api/inventory/ready-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || data?.message || 'فشل حفظ المنتج الجاهز');
    }
    return data;
  }

  window.READY_PRODUCT_AGE_PRESETS = READY_PRODUCT_AGE_PRESETS;
  window.submitReadyProduct = submitReadyProduct;
  window.compressImageFile = compressImageFile;
  window.compressAndUploadProductImage = compressAndUploadProductImage;
})(typeof window !== 'undefined' ? window : globalThis);
