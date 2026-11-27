// src/features/orders/components/HangtagPrintModal.jsx
// نافذة معاينة وطباعة ليبل الباركود والسعر للملابس (Hangtag 50x30mm)

const { useState, useEffect } = React;

function HangtagPrintModal({ isOpen, onClose, product, initialVariant = null, currencyCode = 'YER' }) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const [selectedVarId, setSelectedVarId] = useState(initialVariant?.id || variants[0]?.id || '');

  useEffect(() => {
    if (isOpen) {
      setSelectedVarId(initialVariant?.id || variants[0]?.id || '');
    }
  }, [isOpen, initialVariant, product?.id]);

  if (!isOpen || !product) return null;

  const activeVar = variants.find(v => v.id === selectedVarId) || initialVariant || {
    age_size: 'مقاس موحد',
    color_name: '',
    sku: product.style_code || product.item_code || product.sku || product.id,
    barcode: product.barcode || product.style_code || product.item_code || product.id,
    selling_price: product.selling_price || product.sell_price || 0
  };

  const brandName = window.BrandService ? window.BrandService.getProfile().shortName || window.BrandService.getProfile().name : 'Little Princesses';
  const barcodeVal = activeVar.barcode || activeVar.sku || product.style_code || 'LP800001';
  const skuVal = activeVar.sku || barcodeVal;
  const priceVal = parseFloat(activeVar.selling_price || product.selling_price || 0) || 0;
  const curr = product.currency || currencyCode || 'YER';
  const svgMarkup = window.generateCode128SvgMarkup ? window.generateCode128SvgMarkup(barcodeVal, 26) : '';

  const esc = window.escapeHtml || ((v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'));

  const handlePrintHangtag = () => {
    const win = window.open('', '_blank', 'width=420,height=320');
    if (!win) return;
    const sizeText = esc(activeVar.age_size) + (activeVar.color_name ? ' · ' + esc(activeVar.color_name) : '');
    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>Hangtag - ${esc(skuVal)}</title>
<style>
  @page { size: 50mm 30mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', 'Cairo', sans-serif; }
  body { width: 50mm; height: 30mm; padding: 1.5mm 2mm; display: flex; flex-direction: column; justify-content: space-between; background: #fff; color: #0F172A; }
  .top { display: flex; justify-content: space-between; align-items: center; border-bottom: 0.4pt solid #CBD5E1; padding-bottom: 0.8mm; }
  .brand { font-size: 6.5pt; font-weight: 800; color: #B0005A; }
  .size { font-size: 6.5pt; font-weight: 800; background: #FCE8F2; color: #8E0049; padding: 0.3mm 1.5mm; border-radius: 1mm; }
  .title { font-size: 7.2pt; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; margin: 0.5mm 0; }
  .bc { width: 100%; height: 8mm; display: flex; align-items: center; justify-content: center; }
  .bc svg { width: 100%; height: 100%; }
  .foot { display: flex; justify-content: space-between; align-items: baseline; font-size: 6.5pt; }
  .sku { font-family: monospace; font-size: 5.8pt; color: #475569; direction: ltr; }
  .price { font-family: monospace; font-size: 8.5pt; font-weight: 900; color: #0F172A; direction: ltr; }
</style></head>
<body>
  <div class="top"><span class="brand">👑 ${esc(brandName)}</span><span class="size">${sizeText}</span></div>
  <div class="title">${esc(product.name || '')}</div>
  <div class="bc">${svgMarkup}</div>
  <div class="foot"><span class="sku">${esc(barcodeVal)}</span><span class="price">${esc(priceVal.toLocaleString('en-US'))} ${esc(curr)}</span></div>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn" dir="rtl" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-[#111C38] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 bg-[#0F172A] text-white flex items-center justify-between border-b border-pink-600/50">
          <div className="flex items-center gap-2">
            <span>🏷️</span>
            <h3 className="text-xs font-extrabold">طباعة ليبل الباركود والسعر (Hangtag 50×30mm)</h3>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs cursor-pointer">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {variants.length > 1 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">اختر المقاس واللون:</label>
              <select
                value={selectedVarId}
                onChange={e => setSelectedVarId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                {variants.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.age_size} {v.color_name ? `(${v.color_name})` : ''} — {v.sku} — المتوفر: {v.stock_qty}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live 50x30mm Hangtag Preview */}
          <div className="flex justify-center bg-slate-100 dark:bg-slate-900/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="w-[240px] h-[144px] bg-white border-2 border-slate-300 rounded-lg p-2.5 flex flex-col justify-between shadow-sm text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="text-[10px] font-extrabold text-[#B0005A]">👑 {brandName}</span>
                <span className="text-[9.5px] font-bold bg-[#FCE8F2] text-[#8E0049] px-1.5 py-0.5 rounded">
                  {activeVar.age_size}{activeVar.color_name ? ` · ${activeVar.color_name}` : ''}
                </span>
              </div>
              <div className="text-[11px] font-bold text-center truncate">{product.name}</div>
              <div className="w-full h-9 flex items-center justify-center overflow-hidden" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
              <div className="flex items-baseline justify-between pt-0.5">
                <span dir="ltr" className="font-mono text-[9.5px] text-slate-500">{barcodeVal}</span>
                <span dir="ltr" className="font-mono text-xs font-black text-slate-900 tabular-nums">{priceVal.toLocaleString('en-US')} {curr}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">إغلاق</button>
            <button type="button" onClick={handlePrintHangtag} className="h-9 px-5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold shadow-xs cursor-pointer">
              🖨️ طباعة الليبل (50×30mm)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.HangtagPrintModal = HangtagPrintModal;
