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
  inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-fuchsia-600 focus:ring-2 focus:ring-fuchsia-100 dark:focus:ring-fuchsia-950/40 transition outline-none",
  labelCls = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
}) {
  const [quickSupplierData, setQuickSupplierData] = useState({
    name: '',
    phone: '',
    city: '',
    address: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setQuickSupplierData({
        name: (initialName || '').trim(),
        phone: '',
        city: '',
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
      showToast(`تم تسجيل المورد (${name}) بنجاح`);
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">إضافة مورد جديد</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">تسجيل بيانات المورد الجديد واعتماده في النظام</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer transition">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelCls}>اسم المورد / المحل *</label>
            <input
              type="text"
              required
              className={inputCls}
              placeholder=""
              value={quickSupplierData.name}
              onChange={e => setQuickSupplierData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>رقم الهاتف الأساسي *</label>
              <input
                type="tel"
                required
                className={inputCls + " font-mono"}
                placeholder=""
                value={quickSupplierData.phone}
                onChange={e => setQuickSupplierData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div>
              <label className={labelCls}>المدينة</label>
              <input
                type="text"
                className={inputCls}
                placeholder=""
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
              placeholder=""
              value={quickSupplierData.address}
              onChange={e => setQuickSupplierData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-fuchsia-700 hover:bg-fuchsia-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ المورد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.SupplierQuickAddModal = SupplierQuickAddModal;
