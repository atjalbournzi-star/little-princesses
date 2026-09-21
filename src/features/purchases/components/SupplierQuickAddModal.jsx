const { useState, useEffect } = React;

function SupplierQuickAddModal({
  show,
  onClose,
  initialName = '',
  suppliers = [],
  setSuppliers,
  setHeaderData,
  setSupplierSearch,
  setIsSupplierDropdownOpen,
  fetchSuppliers,
  showToast,
  inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none",
  labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5"
}) {
  const [quickSupplierData, setQuickSupplierData] = useState({
    name: '',
    phone: '',
    city: 'صنعاء',
    address: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setQuickSupplierData({
        name: (initialName || '').trim(),
        phone: '',
        city: 'صنعاء',
        address: ''
      });
    }
  }, [show, initialName]);

  if (!show) return null;

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const name = quickSupplierData.name.trim();
    const phone = quickSupplierData.phone.trim();
    if (!name) return showToast('اسم المورد مطلوب ⚠️', 'error');
    if (!phone) return showToast('رقم الهاتف الأساسي مطلوب للتحقق ومنع الازدواجية ⚠️', 'error');

    const duplicate = (suppliers || []).find(s => s.phone && String(s.phone).replace(/[^0-9]/g, '') === String(phone).replace(/[^0-9]/g, ''));
    if (duplicate) {
      return showToast(`رقم الهاتف (${phone}) مسجل بالفعل للمورد (${duplicate.name})، يرجى استخدام رقم فريد لمنع الازدواجية ⚠️`, 'error');
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        phone,
        city: quickSupplierData.city.trim() || 'صنعاء',
        address: quickSupplierData.address.trim() || '',
        current_balance: 0.0,
        is_active: true,
        created_by: 'admin'
      };

      const res = await fetch('/api/suppliers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'تعذر إضافة المورد');
      }

      const createdSupp = data.data || payload;
      showToast(`✅ تم تسجيل المورد (${name}) بنجاح وتعيينه نشطاً`);
      onClose();

      if (typeof setSuppliers === 'function') {
        setSuppliers(prev => [createdSupp, ...prev.filter(s => String(s.id) !== String(createdSupp.id))]);
      }
      if (typeof setHeaderData === 'function') {
        setHeaderData(prev => ({
          ...prev,
          supplier_id: createdSupp.id,
          supplier: createdSupp.name,
          supplier_phone: createdSupp.phone || phone
        }));
      }
      if (typeof setSupplierSearch === 'function') setSupplierSearch(createdSupp.name);
      if (typeof setIsSupplierDropdownOpen === 'function') setIsSupplierDropdownOpen(false);
      if (typeof fetchSuppliers === 'function') fetchSuppliers();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'حدث خطأ أثناء حفظ المورد ⚠️', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-[#E8E5EA]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-[#E8E5EA] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center font-bold">➕</span>
            <div>
              <h3 className="font-bold text-[#25232A] text-sm">إضافة مورد جديد (سريع)</h3>
              <p className="text-[11px] text-[#6F6B75]">تسجيل المورد واعتماده فوراً في قاعدة البيانات السحابية</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[#6F6B75] hover:text-[#25232A] font-bold p-1 cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className={labelCls}>اسم المورد / المحل *</label>
            <input
              type="text"
              required
              className={inputCls}
              placeholder="مثال: مؤسسة الأقمشة الفاخرة"
              value={quickSupplierData.name}
              onChange={e => setQuickSupplierData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>رقم الهاتف الأساسي * 📱</label>
              <input
                type="tel"
                required
                className={inputCls + " font-mono"}
                placeholder="مثال: 771234567"
                value={quickSupplierData.phone}
                onChange={e => setQuickSupplierData(prev => ({ ...prev, phone: e.target.value }))}
              />
              <span className="text-[10px] text-[#6F6B75] mt-1 block">يُستخدم لمنع تكرار الموردين والتحقق</span>
            </div>

            <div>
              <label className={labelCls}>المدينة</label>
              <input
                type="text"
                className={inputCls}
                placeholder="صنعاء"
                value={quickSupplierData.city}
                onChange={e => setQuickSupplierData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>العنوان / تفاصيل الموقع أو السوق</label>
            <input
              type="text"
              className={inputCls}
              placeholder="مثال: شارع التحرير - مجمع الأقمشة - صنعاء"
              value={quickSupplierData.address}
              onChange={e => setQuickSupplierData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-[#E8E5EA]">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-[#8F2A87] hover:bg-[#73216C] disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              {isSaving ? 'جاري الحفظ في السحابة...' : 'حفظ واعتماد المورد فوراً ✨'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold rounded-xl border border-[#E8E5EA] cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.SupplierQuickAddModal = SupplierQuickAddModal;
