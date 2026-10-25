function PurchaseModal({
  editRecord,
  setEditRecord,
  editSaving,
  handleSaveEditRecord,
  accounts = [],
  previewImage,
  setPreviewImage,
  previewTitle,
  setPreviewTitle,
  showToast,
  UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)'],
  inputCls = "w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs font-medium focus:border-pink-500 transition-all outline-none",
  labelCls = "block text-[11px] font-medium text-slate-300 mb-1"
}) {
  const handleEditRecordChange = (field, val) => {
    setEditRecord(prev => {
      const updated = { ...prev, [field]: val };
      if (field === 'qty' || field === 'price') {
        const q = parseFloat(updated.qty) || 0, p2 = parseFloat(updated.price) || 0;
        if (q > 0 && p2 > 0) updated.total = String((q * p2).toFixed(2));
      }
      if (field === 'total') {
        const tot = parseFloat(val) || 0, q = parseFloat(updated.qty) || 0;
        if (q > 0 && tot > 0) updated.price = String((tot / q).toFixed(2));
      }
      return updated;
    });
  };

  const handleFileUpload = (e, field, successMsg) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showToast('حجم الصورة كبير جداً ⚠️', 'error');
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditRecord(prev => ({ ...prev, [field]: reader.result }));
      showToast(successMsg);
    };
    reader.readAsDataURL(file);
  };

  const createPortal = (typeof ReactDOM !== 'undefined' && ReactDOM.createPortal) ? ReactDOM.createPortal : null;

  const content = (
    <>
      {/* نافذة معاينة الصورة */}
      {previewImage && (
        <div className="fixed inset-0 w-screen h-screen bg-black/90 backdrop-blur-sm z-[10001] flex items-center justify-center p-4 select-none" dir="rtl" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-2xl w-full bg-[#111C38] p-4 rounded-2xl border border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-3">
              <span className="font-bold text-white text-xs">{previewTitle || '🖼️ صورة المرفق'}</span>
              <button type="button" onClick={() => setPreviewImage(null)} className="text-slate-400 hover:text-white font-bold px-2 cursor-pointer">✕</button>
            </div>
            <img src={previewImage} alt="المرفق" className="w-full max-h-[75vh] object-contain rounded-xl border border-slate-800" />
          </div>
        </div>
      )}

      {/* نافذة تعديل سجل موجود */}
      {editRecord && (
        <div className="fixed inset-0 w-screen h-screen bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 select-none" dir="rtl" onClick={() => setEditRecord(null)}>
          <div className="bg-[#111C38] rounded-2xl p-5 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-3.5 border border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <h3 className="font-bold text-white text-sm">✏️ تعديل سجل مشتريات — {editRecord.bill_no || editRecord.id}</h3>
              <button type="button" onClick={() => setEditRecord(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <label className={labelCls}>اسم الصنف / القماش *</label>
                <input type="text" className={inputCls} value={editRecord.item || ''} onChange={e => handleEditRecordChange('item', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>وحدة القياس</label>
                <select className={inputCls} value={editRecord.unit || 'متر'} onChange={e => handleEditRecordChange('unit', e.target.value)}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>الكمية *</label>
                <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold"} value={editRecord.qty || ''} onChange={e => handleEditRecordChange('qty', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>السعر الإفرادي</label>
                <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-pink-300"} value={editRecord.price || ''} onChange={e => handleEditRecordChange('price', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>الخصم والتخفيض</label>
                <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-rose-400"} value={editRecord.discount || ''} onChange={e => handleEditRecordChange('discount', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>الإجمالي</label>
                <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-emerald-400 bg-slate-900"} value={editRecord.total || ''} onChange={e => handleEditRecordChange('total', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>اسم المورد</label>
                <input type="text" className={inputCls} value={editRecord.supplier || ''} onChange={e => handleEditRecordChange('supplier', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>رقم هاتف المورد 📱</label>
                <input type="text" className={inputCls + " font-mono"} value={editRecord.supplier_phone || ''} onChange={e => handleEditRecordChange('supplier_phone', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>رقم الحوالة</label>
                <input type="text" className={inputCls} value={editRecord.transfer_no || ''} onChange={e => handleEditRecordChange('transfer_no', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>حساب الدفع</label>
                <select className={inputCls} value={editRecord.payment_source || ''} onChange={e => handleEditRecordChange('payment_source', e.target.value)}>
                  <option value="">-- اختر --</option>
                  {(accounts || []).map(a => {
                    const c = a.acc_code || a.code || a.account_code || '';
                    const n = a.acc_name || a.name || a.account_name || '';
                    const label = n ? `${c} - ${n}` : String(c);
                    return <option key={c} value={label}>{label}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className={labelCls}>التاريخ</label>
                <input type="date" lang="en-GB" dir="ltr" className={inputCls} value={editRecord.date || ''} onChange={e => handleEditRecordChange('date', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>المستودع المستلم</label>
                <select className={inputCls} value={editRecord.warehouse_id || ''} onChange={e => handleEditRecordChange('warehouse_id', e.target.value)}>
                  <option value="">-- اختر المستودع --</option>
                  {(Array.isArray(window.inventoryUtils?.WAREHOUSES) ? window.inventoryUtils.WAREHOUSES : []).map(w => (
                    <option key={w.id || w.code} value={w.id || w.code}>
                      {w.name} ({w.code || w.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>إرفاق صورة الفاتورة 🧾</label>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold p-2 rounded-lg text-center flex items-center justify-center h-8 text-xs">
                    🧾 اختر صورة
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'invoice_image_url', 'تم إرفاق صورة الفاتورة 🧾')} />
                  </label>
                  {editRecord.invoice_image_url && (
                    <button type="button" onClick={() => { setPreviewImage(editRecord.invoice_image_url); if (setPreviewTitle) setPreviewTitle('🧾 صورة الفاتورة'); }} className="p-2 bg-slate-800 text-pink-300 rounded-lg font-bold border border-pink-700/60 h-8 px-3 cursor-pointer text-xs">🧾</button>
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>إرفاق صورة السند 💳</label>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold p-2 rounded-lg text-center flex items-center justify-center h-8 text-xs">
                    📷 اختر صورة
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'receipt_url', 'تم إرفاق صورة السند 💳')} />
                  </label>
                  {editRecord.receipt_url && (
                    <button type="button" onClick={() => { setPreviewImage(editRecord.receipt_url); if (setPreviewTitle) setPreviewTitle('💳 صورة السند'); }} className="p-2 bg-slate-800 text-teal-300 rounded-lg font-bold border border-teal-500/30 h-8 px-3 cursor-pointer text-xs">🖼️</button>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>الملاحظات والبيان 📝</label>
                <input type="text" className={inputCls} value={editRecord.notes || ''} onChange={e => handleEditRecordChange('notes', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleSaveEditRecord(editRecord, setEditRecord)}
                disabled={editSaving}
                className="flex-1 h-8 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition cursor-pointer flex items-center justify-center shadow-xs"
              >
                {editSaving ? 'جاري الحفظ...' : 'حفظ التعديلات في النظام ☁️'}
              </button>
              <button type="button" onClick={() => setEditRecord(null)} className="h-8 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700 cursor-pointer flex items-center justify-center">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (typeof document !== 'undefined' && createPortal) {
    return createPortal(content, document.body);
  }
  return content;
}

window.PurchaseModal = PurchaseModal;
