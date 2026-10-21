// src/features/factory/components/QualityAssurance.jsx
// محطة الفحص الفني لفساتين الأزياء الراقية (Garment Quality Inspection Station)
const QC_ITEMS = [
  { id: 'measurements', title: 'مطابقة المقاسات', desc: 'مطابقة محيط الصدر، الخصر، وطول الفستان مع جدول مقاسات الأميرة.' },
  { id: 'stitching', title: 'سلامة الدرزات والسحاب', desc: 'نظافة السرفلة الداخلية، استقامة الخياطة، وسلاسة السحاب المخفي.' },
  { id: 'embellishment', title: 'ثبات الشك والتطريز', desc: 'التأكد من ثبات الخرز والتطريز وعدم وجود خيوط متدلية.' },
  { id: 'finishing', title: 'النظافة والكي النهائي', desc: 'خلو الفستان من البقع، كواش قماش الستان والتول بشكل فاخر.' }
];
function GarmentQualityModal(props) {
  const { onClose, setIsModalOpen, qcModalData, setQcModalData, orders = [], setOrders, setFactory, reloadOrders, fetchOrders, refreshOrders, onRefresh, showToast } = props;
  const [isVisible, setIsVisible] = React.useState(true);
  const data = qcModalData || props.order || null;
  const isExplicit = props.isOpen === true;

const [selectedOrderCode, setSelectedOrderCode] = React.useState('');
  const [dressModel, setDressModel] = React.useState('');
  const [tailorName, setTailorName] = React.useState('');
  const [checklist, setChecklist] = React.useState({ measurements: 'pass', stitching: 'pass', embellishment: 'pass', finishing: 'pass' });
  const [reworkActive, setReworkActive] = React.useState(false);
  const [defectReason, setDefectReason] = React.useState('');
  const [reworkAction, setReworkAction] = React.useState('');

  React.useEffect(() => {
    if (qcModalData || props.order) {
      setIsVisible(true);
      const cur = qcModalData || props.order;
      if (cur.order_no || cur.id) setSelectedOrderCode(cur.order_no || cur.id);
      if (cur.product || cur.product_name) setDressModel(cur.product || cur.product_name);
      if (cur.tailor || cur.tailor_name) setTailorName(cur.tailor || cur.tailor_name);
    }
  }, [qcModalData, props.order]);

  const notify = (msg, type = 'info') => {
    if (typeof showToast === 'function') showToast(msg, type);
    else if (typeof window.showToast === 'function') window.showToast(msg, type);
  };

  const closeHandler = (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    setIsVisible(false);
    if (typeof setQcModalData === 'function') setQcModalData(null);
    if (typeof setIsModalOpen === 'function') setIsModalOpen(false);
    if (typeof onClose === 'function') onClose();
    if (typeof props.onCancel === 'function') props.onCancel();
  };

  React.useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') closeHandler(); };
    const handleStatusChanged = (e) => {
      const detail = e?.detail || {};
      const targetClean = String(detail.orderId || detail.order_no || '').replace(/^#/, '').trim().toLowerCase();
      const currentClean = String(selectedOrderCode || '').replace(/^#/, '').trim().toLowerCase();
      if (targetClean && currentClean && targetClean === currentClean && (detail.status === 'delivered' || detail.stage === 'تم التسليم')) closeHandler();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('order_status_changed', handleStatusChanged);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('order_status_changed', handleStatusChanged);
    };
  }, [selectedOrderCode]);

  if (!isVisible || (!data && !isExplicit)) return null;

  const handleApprove = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setIsVisible(false);
    closeHandler();
    notify('تم اعتماد جودة الفستان بنجاح وتحويله للتسليم 📦', 'success');
    const cleanOrderNo = String(selectedOrderCode || '').replace(/^#/, '').trim(), targetClean = cleanOrderNo.toLowerCase();
    const isMatch = (i) => i && [i.order_no, i.id, i.production_order_no].some(v => String(v || '').replace(/^#/, '').trim().toLowerCase() === targetClean);
    const readyState = { status: 'ready_for_delivery', stage: 'جاهز للتسليم 📦', production_status: 'ready', tailor_status: 'approved', wage_credited: true, quality_score: 5.0, quality_status: 'passed', progress: 100 };
    if (typeof setFactory === 'function') {
      setFactory(prev => {
        let found = false;
        const next = (prev || []).map(item => isMatch(item) ? (found = true, { ...item, ...readyState }) : item);
        return found ? next : [{ id: selectedOrderCode || cleanOrderNo, order_no: cleanOrderNo, customer: data?.customer || data?.customer_name || '', child_name: data?.child_name || '', product: dressModel || data?.product || data?.product_name || '', tailor: tailorName || '', ...readyState }, ...next];
      });
    }
    if (typeof setOrders === 'function') setOrders(prev => (prev || []).map(item => isMatch(item) ? { ...item, ...readyState } : item));
    if (Array.isArray(window.factory)) window.factory = window.factory.map(item => isMatch(item) ? { ...item, ...readyState } : item);
    if (Array.isArray(window.orders)) window.orders = window.orders.map(item => isMatch(item) ? { ...item, ...readyState } : item);

    const payload = { order_no: cleanOrderNo, order_id: selectedOrderCode, quality_status: 'passed', production_status: 'ready', progress: 100, inspector_name: '', tailor_name: tailorName || '', quality_score: 5.0, quality_notes: 'معتمد ومطابق لمواصفات الكوتور الملكية بالكامل', approved_by: 'سارة مديرة الجودة', status: 'ready_for_delivery', stage: 'جاهز للتسليم 📦' };
    (async () => {
      try {
        const service = window.FactoryService;
        if (service && typeof service.approveQc === 'function') await service.approveQc(payload);
        else await fetch('/api/factory/job-card/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        [reloadOrders, fetchOrders, refreshOrders, onRefresh, window.fetchFactoryOrders, window.fetchOrders].forEach(fn => typeof fn === 'function' && fn());
        ['order_qc_updated', 'orders-updated', 'erp:factoryChanged', 'erp:ordersChanged'].forEach(ev => window.dispatchEvent(new CustomEvent(ev, { detail: payload })));
      } catch (err) { console.error('❌ [QualityCheckModal] Error:', err); }
    })();
  };

  const handleRework = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setIsVisible(false);
    closeHandler();
    if (typeof onClose === 'function') onClose();
    notify('⚠ تم رفض الفحص وإصدار تذكرة تعديل وبروفة للخياط بنجاح', 'warning');

    if (typeof setFactory === 'function') {
      setFactory(prev => (prev || []).map(item => (item.order_no === selectedOrderCode || item.id === selectedOrderCode) ? { ...item, tailor_status: 'rework', wage_credited: false, quality_score: 2.0, stage: 'تعديل وبروفة ✂️', notes: (item.notes || '') + ` | ⚠️ مطلوب تعديل: ${defectReason}` } : item));
    }

    (async () => {
      try {
        const s = window.FactoryService || {};
        if (s.reworkQc) await s.reworkQc({ order_id: selectedOrderCode, order_no: String(selectedOrderCode || '').replace(/^#/, ''), defect_type: defectReason, severity: 'Medium', corrective_action: reworkAction, inspector_name: 'سارة مديرة الجودة' });
      } catch (err) { console.error('❌ [QualityCheckModal] Rework error:', err); }
    })();
  };

  const setItem = (key, val) => { setChecklist(p => ({ ...p, [key]: val })); if (val === 'fail') setReworkActive(true); };

  return (
    <div onClick={closeHandler} className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn cursor-pointer" dir="rtl">
      <div onClick={e => e.stopPropagation()} className="bg-[#111C38] border border-slate-700/90 rounded-2xl max-w-xl w-full p-5 shadow-2xl text-right max-h-[92vh] overflow-y-auto space-y-4 cursor-default">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold text-sm">كود الفستان: #{String(selectedOrderCode).replace(/^#/, '')}</span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-white font-bold text-sm">{dressModel}</span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-white font-bold text-sm">الخياط المسؤول: {tailorName}</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                قيد الفحص الفني قبل التسليم
              </span>
            </div>
          </div>
          <button type="button" onClick={(e) => { setIsVisible(false); closeHandler(e); if (typeof onClose === 'function') onClose(); }} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs cursor-pointer transition">✕</button>
        </div>

        <div className="space-y-2">
          {QC_ITEMS.map(item => {
            const isPass = checklist[item.id] === 'pass';
            return (
              <div key={item.id} className="p-2.5 rounded-xl bg-[#0B132B] border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-bold text-xs">{item.title}</h4>
                  <p className="text-slate-300 text-[11px] mt-0.5 truncate">{item.desc}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => setItem(item.id, 'pass')} className={`h-7.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${isPass ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>✓ Pass</button>
                  <button type="button" onClick={() => setItem(item.id, 'fail')} className={`h-7.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${!isPass ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>⚠ Fail</button>
                </div>
              </div>
            );
          })}
        </div>

        {reworkActive && (
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2 animate-fadeIn">
            <span className="text-white font-bold text-xs block">تفاصيل تذكرة التعديل للخياط (Rework Ticket)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-white font-bold text-[11px] block mb-1">نوع العيب المرصود</label>
                <select value={defectReason} onChange={e => setDefectReason(e.target.value)} className="w-full h-7.5 px-2.5 rounded-lg bg-[#0B132B] border border-slate-700 text-white text-xs outline-none">
                  <option value="مطابقة المقاسات">📏 مقاسات غير مطابقة للأميرة</option>
                  <option value="سلامة الدرزات والسحاب">🪡 عيب في الدرزات أو السحاب</option>
                  <option value="ثبات الشك والتطريز">✨ عيب في الشك أو التطريز</option>
                  <option value="النظافة والكي">👑 بقعة أو عيب في الكي والقماش</option>
                </select>
              </div>
              <div>
                <label className="text-white font-bold text-[11px] block mb-1">الإجراء المطلوب من الخياط</label>
                <input type="text" value={reworkAction} onChange={e => setReworkAction(e.target.value)} className="w-full h-7.5 px-2.5 rounded-lg bg-[#0B132B] border border-slate-700 text-white text-xs outline-none" />
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
          <button type="button" onClick={handleApprove} className="flex-1 h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer">
            <span>✓</span><span>اعتماد ومطابق للمواصفات</span>
          </button>
          <button type="button" onClick={handleRework} className="flex-1 h-9 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer">
            <span>⚠</span><span>{reworkActive ? 'تأكيد تذكرة التعديل وإرجاع للخياط' : 'رفض / تذكرة تعديل للخياط'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

window.QualityAssuranceModal = window.QualityCheckModal = GarmentQualityModal;
if (!window.GarmentQualityModal) window.GarmentQualityModal = GarmentQualityModal;
