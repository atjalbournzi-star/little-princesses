// src/features/inventory/components/WarehouseManageModal.jsx
// نافذة إدارة المستودعات (تعديل، تعطيل/تفعيل، حذف مشروط للمستودعات الخالية)

const { useState, useEffect } = React;

function WarehouseManageModal({ isOpen, onClose, showToast, onWarehouseChanged }) {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const SYSTEM_CODES = ['WH-MAIN', 'WH-WORKSHOP', 'WH-SHOWROOM'];

  useEffect(() => {
    if (isOpen) fetchAllWarehouses();
  }, [isOpen]);

  const fetchAllWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/warehouses?all=true').then(r => r.json());
      if (res?.success) setWarehouses(res.data || []);
    } catch {
      showToast?.('فشل تحميل بيانات المستودعات', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const startEdit = (wh) => { setEditingId(wh.id); setEditName(wh.name); setEditLocation(wh.location || ''); };
  const cancelEdit = () => { setEditingId(null); setEditName(''); setEditLocation(''); };

  const handleSaveEdit = async (wh) => {
    if (!editName.trim()) return showToast?.('اسم المستودع مطلوب ⚠️', 'error');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/warehouses/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wh.id, name: editName.trim(), location: editLocation.trim() })
      }).then(r => r.json());
      if (res?.success) {
        showToast?.(res.message || 'تم تحديث بيانات المستودع بنجاح ✅');
        cancelEdit();
        await fetchAllWarehouses();
        await window.inventoryUtils?.refreshWarehouses?.();
        onWarehouseChanged?.();
      } else { showToast?.(res?.error || 'فشل تحديث المستودع', 'error'); }
    } catch (err) { showToast?.(err.message || 'خطأ في الاتصال بالخادم', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleToggleStatus = async (wh) => {
    if (SYSTEM_CODES.includes(wh.code || wh.id)) return showToast?.('لا يمكن تعطيل مستودعات النظام الأساسية 🔒', 'warning');
    const actionTxt = wh.is_active ? 'تعطيل' : 'تنشيط';
    if (!confirm(`هل أنت متأكد من ${actionTxt} المستودع [${wh.name}]؟`)) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/warehouses/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wh.id })
      }).then(r => r.json());
      if (res?.success) {
        showToast?.(res.message || `تم ${actionTxt} المستودع بنجاح`);
        await fetchAllWarehouses();
        await window.inventoryUtils?.refreshWarehouses?.();
        onWarehouseChanged?.();
      } else { showToast?.(res?.error || `فشل ${actionTxt} المستودع`, 'error'); }
    } catch (err) { showToast?.(err.message || 'خطأ في الاتصال بالخادم', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (wh) => {
    if (SYSTEM_CODES.includes(wh.code || wh.id)) return showToast?.('محظور حوكمياً: لا يمكن حذف مستودعات النظام الأساسية 🔒', 'error');
    if ((wh.total_units || 0) > 0 || (wh.items_count || 0) > 0) return showToast?.(`لا يمكن حذف المستودع لوجود رصيد (${wh.total_units} وحدة) مسجل به ⚠️`, 'error');
    if (!confirm(`⚠️ تحذير حوكمي: هل تريد حذف المستودع الخالي [${wh.name}] وحسابه المرتبط نهائياً؟`)) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/warehouses/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wh.id })
      }).then(r => r.json());
      if (res?.success) {
        showToast?.(res.message || 'تم حذف المستودع بنجاح 🗑️');
        await fetchAllWarehouses();
        await window.inventoryUtils?.refreshWarehouses?.();
        onWarehouseChanged?.();
      } else { showToast?.(res?.error || 'فشل حذف المستودع', 'error'); }
    } catch (err) { showToast?.(err.message || 'خطأ في الاتصال بالخادم', 'error'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E8E5EA] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 bg-gradient-to-l from-[#E2F5F7] to-white border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="font-bold text-[#25232A] text-sm md:text-base">إدارة المستودعات والفروع</h2>
              <p className="text-[11px] text-[#6F6B75] mt-0.5">تعديل المسميات، التحكم بالحالة، وإدارة الفروع المتوافقة مع الحوكمة المالية</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#6F6B75] hover:text-[#25232A] text-xl cursor-pointer leading-none">✕</button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 text-center text-[#6F6B75] text-sm animate-pulse">⏳ جاري تحميل قائمة المستودعات...</div>
          ) : warehouses.length === 0 ? (
            <div className="py-12 text-center text-[#6F6B75] text-sm">لا توجد مستودعات مسجلة حالياً</div>
          ) : (
            warehouses.map(wh => {
              const isSys = SYSTEM_CODES.includes(wh.code || wh.id);
              const isEditing = editingId === wh.id;
              const hasStock = (wh.total_units || 0) > 0 || (wh.items_count || 0) > 0;
              return (
                <div key={wh.id} className={`p-4 rounded-xl border transition ${wh.is_active ? 'bg-white border-[#E8E5EA] shadow-xs' : 'bg-[#FAFAFB] border-dashed border-[#D5D2DA] opacity-80'}`}>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-2">
                        <span className="font-mono text-xs font-bold text-[#007F8C] bg-[#E2F5F7] px-2 py-0.5 rounded-md">{wh.code}</span>
                        <span className="text-[11px] text-[#6F6B75]">تعديل بيانات المستودع</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#6F6B75] mb-1">اسم المستودع *</label>
                          <input className="w-full border border-[#E8E5EA] rounded-lg px-2.5 py-1.5 text-xs text-[#25232A] focus:ring-2 focus:ring-[#009FAE]/30"
                            value={editName} onChange={e => setEditName(e.target.value)} disabled={isSubmitting} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#6F6B75] mb-1">الموقع / العنوان</label>
                          <input className="w-full border border-[#E8E5EA] rounded-lg px-2.5 py-1.5 text-xs text-[#25232A] focus:ring-2 focus:ring-[#009FAE]/30"
                            value={editLocation} onChange={e => setEditLocation(e.target.value)} disabled={isSubmitting} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => handleSaveEdit(wh)} disabled={isSubmitting} className="px-3 py-1.5 bg-[#009FAE] hover:bg-[#007F8C] text-white rounded-lg text-xs font-bold transition cursor-pointer">
                          {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                        </button>
                        <button onClick={cancelEdit} disabled={isSubmitting} className="px-3 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#6F6B75] rounded-lg text-xs font-bold transition cursor-pointer">
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-[#007F8C] bg-[#E2F5F7] px-2 py-0.5 rounded-md">{wh.code}</span>
                          <span className="font-bold text-sm text-[#25232A]">{wh.name}</span>
                          {isSys && <span className="text-[10px] bg-[#FEF3EB] text-[#C25E00] border border-[#FAD8B8] px-2 py-0.5 rounded-full font-bold">🔒 نظام أساسي</span>}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${wh.is_active ? 'bg-[#E7F6EC] text-[#1E7E34]' : 'bg-[#F1EFE8] text-[#8C827A]'}`}>
                            {wh.is_active ? 'نشط ✅' : 'معطّل ⏸️'}
                          </span>
                        </div>
                        <p className="text-xs text-[#6F6B75] flex items-center gap-1">📍 {wh.location || 'لا يوجد عنوان محدد'}</p>
                        <p className="text-[11px] text-[#6F6B75]">
                          📦 الأصناف: <strong className="font-mono text-[#25232A]">{wh.items_count || 0}</strong> صنف |
                          📊 إجمالي الوحدات: <strong className="font-mono text-[#25232A]">{(wh.total_units || 0).toLocaleString()}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button onClick={() => startEdit(wh)} title="تعديل الاسم والموقع" className="p-2 text-xs bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg border border-[#E8E5EA] font-semibold transition cursor-pointer">
                          ✏️ تعديل
                        </button>
                        {!isSys && (
                          <>
                            <button onClick={() => handleToggleStatus(wh)} title={wh.is_active ? 'تعطيل المستودع' : 'تنشيط المستودع'}
                              className={`p-2 text-xs rounded-lg border font-semibold transition cursor-pointer ${wh.is_active ? 'bg-[#FFF8E6] text-[#A66900] border-[#FCE6B2] hover:bg-[#FEEFC4]' : 'bg-[#E7F6EC] text-[#1E7E34] border-[#C3E6CB] hover:bg-[#D4EDDA]'}`}>
                              {wh.is_active ? '⏸️ تعطيل' : '▶️ تنشيط'}
                            </button>
                            <button onClick={() => handleDelete(wh)} disabled={hasStock} title={hasStock ? 'لا يمكن الحذف لوجود رصيد أو أصناف' : 'حذف نهائي للمستودع الخالي'}
                              className="p-2 text-xs bg-[#FDF0ED] hover:bg-[#FCE0DA] text-[#D64545] disabled:opacity-40 border border-[#FAD0C5] rounded-lg font-semibold transition cursor-pointer">
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 bg-[#FAFAFB] border-t border-[#E8E5EA] flex justify-between items-center text-xs text-[#6F6B75]">
          <span>💡 المستودعات الأساسية السيادية محمية من التعطيل والحذف حفاظاً على استقرار العمليات.</span>
          <button onClick={onClose} className="px-4 py-2 bg-white hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] rounded-xl font-bold transition cursor-pointer">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

window.WarehouseManageModal = WarehouseManageModal;
if (typeof module !== 'undefined' && module.exports) module.exports = WarehouseManageModal;
