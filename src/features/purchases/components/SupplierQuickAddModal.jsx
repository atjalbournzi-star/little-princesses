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
  inputCls = "w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs font-medium focus:border-pink-500 transition-all outline-none",
  labelCls = "block text-[11px] font-medium text-slate-300 mb-1"
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

  const createPortal = (typeof ReactDOM !== 'undefined' && ReactDOM.createPortal) ? ReactDOM.createPortal : null;

  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen backdrop-blur-sm bg-slate-950/80 z-[10000] flex items-center justify-center p-4 transition-all select-none" dir="rtl" onClick={onClose}>
      <div className="bg-slate-900 rounded-xl p-4 sm:p-5 w-full max-w-lg shadow-2xl border border-slate-800 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-slate-800/90 text-pink-400 border border-pink-700/60 flex items-center justify-center text-xs shadow-xs">🏢</span>
            <div>
              <h3 className="font-bold text-white text-sm">إضافة مورد جديد</h3>
              <p className="text-[10.5px] text-slate-400">تسجيل بيانات المورد الجديد واعتماده في النظام</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold cursor-pointer transition">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className={labelCls}>اسم المورد / المحل *</label>
            <input
              type="text"
              required
              className={inputCls}
              value={quickSupplierData.name}
              onChange={e => setQuickSupplierData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>رقم الهاتف الأساسي *</label>
              <input
                type="tel"
                required
                className={inputCls + " font-mono"}
                value={quickSupplierData.phone}
                onChange={e => setQuickSupplierData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div>
              <label className={labelCls}>المدينة</label>
              <input
                type="text"
                className={inputCls}
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
              value={quickSupplierData.address}
              onChange={e => setQuickSupplierData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-8 px-5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition cursor-pointer shadow-xs"
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ المورد'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && createPortal) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}

window.SupplierQuickAddModal = SupplierQuickAddModal;
