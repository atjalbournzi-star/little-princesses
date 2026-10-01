// src/features/inventory/components/WarehouseAddModal.jsx
// نافذة إضافة مستودع جديد وربطه بشجرة الحسابات والوحدات المختلفة

const { useState } = React;

function WarehouseAddModal({ isOpen, onClose, onWarehouseAdded, showToast }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeError, setCodeError] = useState('');

  if (!isOpen) return null;

  const handleCodeChange = (val) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
    setCode(clean);
    setCodeError('');
  };

  const buildCode = () => {
    const c = code.trim();
    return c.startsWith('WH-') ? c : (c ? `WH-${c}` : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalCode = buildCode();
    if (!name.trim()) return showToast?.('اسم المستودع مطلوب ⚠️', 'error');
    if (!finalCode) return showToast?.('رمز المستودع مطلوب ⚠️', 'error');
    if (finalCode === 'WH-') return showToast?.('أدخل رمزاً صالحاً للمستودع ⚠️', 'error');

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), code: finalCode, location: location.trim() })
      }).then(r => r.json());

      if (res?.success) {
        // تحديث قائمة المستودعات الحية في الذاكرة
        await window.inventoryUtils?.refreshWarehouses?.();
        showToast?.(res.message || `تم إنشاء المستودع ${finalCode} بنجاح 🏢✅`);
        onWarehouseAdded?.(res.data);
        handleClose();
      } else {
        const errMsg = res?.error || res?.message || 'فشل إنشاء المستودع';
        if (errMsg.includes('مستخدم مسبقاً')) setCodeError(errMsg);
        showToast?.(errMsg, 'error');
      }
    } catch (err) {
      showToast?.(err.message || 'خطأ في الاتصال بالخادم', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName(''); setCode(''); setLocation(''); setCodeError('');
    onClose?.();
  };

  const inputCls = 'w-full border border-[#E8E5EA] rounded-xl px-3 py-2.5 text-sm text-[#25232A] focus:outline-none focus:ring-2 focus:ring-[#009FAE]/30 bg-white';
  const labelCls = 'block text-xs font-semibold text-[#6F6B75] mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[#E8E5EA] w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-5 bg-gradient-to-l from-[#E2F5F7] to-white border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏢</span>
            <div>
              <h2 className="font-bold text-[#25232A] text-sm">إضافة مستودع جديد</h2>
              <p className="text-[10px] text-[#6F6B75] mt-0.5">يُنشئ حساب جرد مرتبط في شجرة الحسابات تلقائياً</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-[#6F6B75] hover:text-[#25232A] text-xl cursor-pointer leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>اسم المستودع <span className="text-[#D64545]">*</span></label>
            <input className={inputCls} placeholder="مثال: مستودع الفرع الثاني" value={name}
              onChange={e => setName(e.target.value)} disabled={isSubmitting} autoFocus />
          </div>

          <div>
            <label className={labelCls}>رمز المستودع (كود) <span className="text-[#D64545]">*</span></label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#007F8C] bg-[#E2F5F7] border border-[#C5ECF0] rounded-lg px-2 py-2.5 whitespace-nowrap">WH-</span>
              <input className={inputCls + (codeError ? ' border-[#D64545]' : '')} placeholder="مثال: BRANCH2" value={code}
                onChange={e => handleCodeChange(e.target.value)} disabled={isSubmitting} />
            </div>
            {codeError && <p className="text-[10px] text-[#D64545] mt-1">{codeError}</p>}
            {code && <p className="text-[10px] text-[#6F6B75] mt-1">الكود النهائي: <span className="font-mono font-bold text-[#007F8C]">{buildCode()}</span></p>}
          </div>

          <div>
            <label className={labelCls}>الموقع / العنوان (اختياري)</label>
            <input className={inputCls} placeholder="مثال: الطابق الثاني - المبنى الشمالي" value={location}
              onChange={e => setLocation(e.target.value)} disabled={isSubmitting} />
          </div>

          <div className="bg-[#FAFAFB] rounded-xl p-3 border border-[#E8E5EA]">
            <p className="text-[10.5px] text-[#6F6B75]">
              📊 سيُنشئ النظام تلقائياً حساب جرد في شجرة الحسابات
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isSubmitting}
              className="flex-1 h-10 bg-[#009FAE] hover:bg-[#007F8C] text-white font-bold rounded-xl text-sm transition disabled:opacity-50 cursor-pointer">
              {isSubmitting ? '⏳ جاري الإنشاء...' : '🏢 إنشاء المستودع'}
            </button>
            <button type="button" onClick={handleClose}
              className="px-5 h-10 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] font-bold rounded-xl text-sm transition cursor-pointer">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.WarehouseAddModal = WarehouseAddModal;
if (typeof module !== 'undefined' && module.exports) module.exports = WarehouseAddModal;
