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
  inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none",
  labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5"
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

  return (
    <>
      {/* نافذة معاينة الصورة */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-2xl w-full bg-white p-4 rounded-2xl border border-[#E8E5EA] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-[#E8E5EA] pb-3 mb-3">
              <span className="font-bold text-[#25232A] text-xs">{previewTitle || '🖼️ صورة المرفق'}</span>
              <button type="button" onClick={() => setPreviewImage(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold px-2 cursor-pointer">✕</button>
            </div>
            <img src={previewImage} alt="المرفق" className="w-full max-h-[75vh] object-contain rounded-xl border border-[#E8E5EA]" />
          </div>
        </div>
      )}

      {/* نافذة تعديل سجل موجود */}
      {editRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setEditRecord(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-4 border border-[#E8E5EA]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-[#25232A] text-sm">✏️ تعديل سجل مشتريات — {editRecord.bill_no || editRecord.id}</h3>
              <button type="button" onClick={() => setEditRecord(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold cursor-pointer">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <label className={labelCls}>اسم الصنف / القماش *</label>
                <input type="text" className={inputCls} placeholder="أدخل اسم الصنف" value={editRecord.item || ''} onChange={e => handleEditRecordChange('item', e.target.value)} />
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
                <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-[#8F2A87]"} value={editRecord.price || ''} onChange={e => handleEditRecordChange('price', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>الخصم والتخفيض</label>
                <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-[#D64545]"} placeholder="0.00" value={editRecord.discount || ''} onChange={e => handleEditRecordChange('discount', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>الإجمالي</label>
                <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-[#007F8C] bg-[#FAFAFB]"} value={editRecord.total || ''} onChange={e => handleEditRecordChange('total', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>اسم المورد</label>
                <input type="text" className={inputCls} value={editRecord.supplier || ''} onChange={e => handleEditRecordChange('supplier', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>رقم هاتف المورد 📱</label>
                <input type="text" className={inputCls + " font-mono"} placeholder="" value={editRecord.supplier_phone || ''} onChange={e => handleEditRecordChange('supplier_phone', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>رقم الحوالة</label>
                <input type="text" className={inputCls} placeholder="TRF-12345" value={editRecord.transfer_no || ''} onChange={e => handleEditRecordChange('transfer_no', e.target.value)} />
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
                <label className={labelCls}>إرفاق صورة الفاتورة 🧾</label>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-white hover:bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A] font-bold p-2.5 rounded-xl text-center flex items-center justify-center h-11">
                    🧾 اختر صورة
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'invoice_image_url', 'تم إرفاق صورة الفاتورة 🧾')} />
                  </label>
                  {editRecord.invoice_image_url && (
                    <button type="button" onClick={() => { setPreviewImage(editRecord.invoice_image_url); if (setPreviewTitle) setPreviewTitle('🧾 صورة الفاتورة'); }} className="p-2 bg-[#F2E7F3] text-[#8F2A87] rounded-xl font-bold border border-[#E5CEE7] h-11 px-3 cursor-pointer">🧾</button>
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>إرفاق صورة السند 💳</label>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-white hover:bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A] font-bold p-2.5 rounded-xl text-center flex items-center justify-center h-11">
                    📷 اختر صورة
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'receipt_url', 'تم إرفاق صورة السند 💳')} />
                  </label>
                  {editRecord.receipt_url && (
                    <button type="button" onClick={() => { setPreviewImage(editRecord.receipt_url); if (setPreviewTitle) setPreviewTitle('💳 صورة السند'); }} className="p-2 bg-[#E2F5F7] text-[#007F8C] rounded-xl font-bold border border-[#C5ECF0] h-11 px-3 cursor-pointer">🖼️</button>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>الملاحظات والبيان 📝</label>
                <input type="text" className={inputCls} placeholder="ملاحظات وتفاصيل الفاتورة" value={editRecord.notes || ''} onChange={e => handleEditRecordChange('notes', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-[#E8E5EA]">
              <button
                type="button"
                onClick={() => handleSaveEditRecord(editRecord, setEditRecord)}
                disabled={editSaving}
                className="flex-1 py-3 bg-[#009FAE] hover:bg-[#007F8C] disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer"
              >
                {editSaving ? 'جاري الحفظ...' : 'حفظ التعديلات في النظام ☁️'}
              </button>
              <button type="button" onClick={() => setEditRecord(null)} className="px-5 py-3 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold rounded-xl border border-[#E8E5EA] cursor-pointer">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

window.PurchaseModal = PurchaseModal;
