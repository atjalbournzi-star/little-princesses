// src/components/tailoring/FactoryTailoringModals.jsx
// نوافذ إجراءات الورشة السياقية: تأكيد المقاسات، شراء BTO، ترجيع الفائض، صرف خامات متأخرة، وترقية للكتالوج

function FactoryTailoringModals({
  modalState,
  onClose,
  accounts = [],
  inventory = [],
  showToast,
  onCompleted,
}) {
  const { useState, useEffect, useMemo } = React;
  const action = modalState?.action;
  const job = modalState?.job;

  const [sizingMode, setSizingMode] = useState('STANDARD_SIZE');
  const [sizeMatrixId, setSizeMatrixId] = useState('');
  const [sizeAdj, setSizeAdj] = useState({});
  const [customMeas, setCustomMeas] = useState({ dress_length: '', chest_circ: '', waist_circ: '', notes: '' });

  const [btoForm, setBtoForm] = useState({ fabric_description: '', quantity: '', unit: 'meter', total_cost: '', payment_account_id: '', invoice_ref: '', notes: '' });
  const [leftoverForm, setLeftoverForm] = useState({ inventory_id: '', quantity: '', unit: 'meter', leftover_value: '' });
  const [issueForm, setIssueForm] = useState({ inventory_id: '', quantity: '', unit: 'meter' });
  const [promoteForm, setPromoteForm] = useState({ model_name: '', target_segment: 'kids', category: 'تصميم خاص مرقّى', base_price: '' });
  const [submitting, setSubmitting] = useState(false);

  const btoAccounts = useMemo(() => {
    const raw = Array.isArray(accounts) && accounts.length ? accounts : (window.accounts || []);
    return raw.filter(a => {
      if (a.is_group === true || a.is_group === 'true') return false;
      const c = String(a.account_code || a.code || '');
      return c.startsWith('101') || c.startsWith('102') || c.startsWith('201');
    });
  }, [accounts]);

  useEffect(() => {
    if (!job || !action) return;
    setSizingMode('STANDARD_SIZE');
    setSizeMatrixId(job.size_matrix_id || '');
    setSizeAdj({});
    setBtoForm({ fabric_description: '', quantity: '', unit: 'meter', total_cost: '', payment_account_id: btoAccounts[0]?.id || '', invoice_ref: '', notes: '' });
    setLeftoverForm({ inventory_id: inventory[0]?.id || '', quantity: '', unit: 'meter', leftover_value: '' });
    setIssueForm({ inventory_id: inventory[0]?.id || '', quantity: '', unit: 'meter' });
    setPromoteForm({ model_name: job.custom_design_title || job.product_name || job.product || '', target_segment: 'kids', category: 'تصميم خاص مرقّى', base_price: String(job.total_amount || '') });
  }, [job, action]);

  if (!action || !job) return null;
  const poId = job.id || job.production_order_no;
  const api = window.TailoringAPI;
  const SizePicker = window.OrderStandardSizePicker;

  const submitAction = async (e) => {
    e.preventDefault();
    if (submitting || !api) return;
    setSubmitting(true);
    try {
      let res = null;
      if (action === 'confirm_sizing') {
        const payload = sizingMode === 'STANDARD_SIZE'
          ? { sizing_mode: 'STANDARD_SIZE', size_matrix_id: sizeMatrixId, size_adjustments_json: sizeAdj }
          : { sizing_mode: 'CUSTOM', measurements_spec: customMeas };
        res = await api.confirmSizing(poId, payload);
      } else if (action === 'bto_purchase') {
        res = await api.recordBtoPurchase(poId, btoForm);
      } else if (action === 'bto_leftover') {
        res = await api.returnBtoLeftover(poId, leftoverForm);
      } else if (action === 'issue_materials') {
        res = await api.issueMaterials(poId, { warehouse_id: 'WH-WORKSHOP', materials: [issueForm] });
      } else if (action === 'promote_catalog') {
        res = await api.promoteToCatalog(poId, promoteForm);
      }
      showToast && showToast(res?.message || 'تم تنفيذ الإجراء بنجاح ✅', 'success');
      window.dispatchEvent(new CustomEvent('erp:factoryChanged'));
      onCompleted && onCompleted(res);
      onClose && onClose();
    } catch (err) {
      showToast && showToast(err.message || 'فشل تنفيذ الإجراء', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const titles = {
    confirm_sizing: 'تأكيد مقاسات أمر التشغيل المؤجل',
    bto_purchase: 'تسجيل شراء قماش خاص (BTO -> WIP)',
    bto_leftover: 'ترجيع فائض قماش للورشة (WH-WORKSHOP)',
    issue_materials: 'صرف خامات إضافية / مساعدة (Late BOM)',
    promote_catalog: 'ترقية التصميم الخاص إلى الكتالوج',
  };
  const inputCls = "w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:border-[#B0005A]";
  const labelCls = "block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" dir="rtl" onClick={onClose}>
      <div className="bg-white dark:bg-[#111C38] rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 text-right" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{titles[action]}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{job.production_order_no || job.order_no}</p>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer">✕</button>
        </div>

        <form onSubmit={submitAction} className="space-y-3">
          {action === 'confirm_sizing' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => setSizingMode('STANDARD_SIZE')} className={`flex-1 py-2 rounded-lg text-xs font-bold border cursor-pointer ${sizingMode === 'STANDARD_SIZE' ? 'bg-[#B0005A] text-white border-[#B0005A]' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>مقاس قياسي</button>
                <button type="button" onClick={() => setSizingMode('CUSTOM')} className={`flex-1 py-2 rounded-lg text-xs font-bold border cursor-pointer ${sizingMode === 'CUSTOM' ? 'bg-[#B0005A] text-white border-[#B0005A]' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>مقاسات خاصة</button>
              </div>
              {sizingMode === 'STANDARD_SIZE' && SizePicker ? (
                <SizePicker sizeMatrixId={sizeMatrixId} setSizeMatrixId={setSizeMatrixId} sizeAdjustments={sizeAdj} setSizeAdjustments={setSizeAdj} />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div><label className={labelCls}>طول الفستان (سم)</label><input type="number" step="0.5" value={customMeas.dress_length} onChange={e => setCustomMeas({ ...customMeas, dress_length: e.target.value })} className={inputCls} required /></div>
                  <div><label className={labelCls}>محيط الصدر (سم)</label><input type="number" step="0.5" value={customMeas.chest_circ} onChange={e => setCustomMeas({ ...customMeas, chest_circ: e.target.value })} className={inputCls} required /></div>
                  <div><label className={labelCls}>محيط الخصر (سم)</label><input type="number" step="0.5" value={customMeas.waist_circ} onChange={e => setCustomMeas({ ...customMeas, waist_circ: e.target.value })} className={inputCls} /></div>
                </div>
              )}
            </div>
          )}

          {action === 'bto_purchase' && (
            <div className="space-y-2.5">
              <div><label className={labelCls}>وصف القماش / الخامة *</label><input type="text" value={btoForm.fabric_description} onChange={e => setBtoForm({ ...btoForm, fabric_description: e.target.value })} className={inputCls} required /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className={labelCls}>الكمية *</label><input type="number" step="0.1" min="0.1" value={btoForm.quantity} onChange={e => setBtoForm({ ...btoForm, quantity: e.target.value })} className={inputCls + " font-mono"} required /></div>
                <div><label className={labelCls}>الوحدة</label><select value={btoForm.unit} onChange={e => setBtoForm({ ...btoForm, unit: e.target.value })} className={inputCls}><option value="meter">متر</option><option value="yard">ياردة</option><option value="piece">قطعة</option></select></div>
                <div><label className={labelCls}>التكلفة الإجمالية *</label><input type="number" step="1" min="1" value={btoForm.total_cost} onChange={e => setBtoForm({ ...btoForm, total_cost: e.target.value })} className={inputCls + " font-mono"} required /></div>
              </div>
              <div>
                <label className={labelCls}>حساب الدفع (صندوق / بنك / مورد) *</label>
                <select value={btoForm.payment_account_id} onChange={e => setBtoForm({ ...btoForm, payment_account_id: e.target.value })} className={inputCls} required>
                  <option value="">-- اختر الحساب --</option>
                  {btoAccounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>مرجع الفاتورة</label><input type="text" value={btoForm.invoice_ref} onChange={e => setBtoForm({ ...btoForm, invoice_ref: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>ملاحظات</label><input type="text" value={btoForm.notes} onChange={e => setBtoForm({ ...btoForm, notes: e.target.value })} className={inputCls} /></div>
              </div>
            </div>
          )}

          {action === 'bto_leftover' && (
            <div className="space-y-2.5">
              <div>
                <label className={labelCls}>صنف المستودع المستلم للفائض *</label>
                <select value={leftoverForm.inventory_id} onChange={e => setLeftoverForm({ ...leftoverForm, inventory_id: e.target.value })} className={inputCls} required>
                  <option value="">-- اختر الصنف --</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name || i.item_name} ({i.unit || 'متر'})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className={labelCls}>الكمية المرتجعة *</label><input type="number" step="0.1" min="0.1" value={leftoverForm.quantity} onChange={e => setLeftoverForm({ ...leftoverForm, quantity: e.target.value })} className={inputCls + " font-mono"} required /></div>
                <div><label className={labelCls}>الوحدة</label><select value={leftoverForm.unit} onChange={e => setLeftoverForm({ ...leftoverForm, unit: e.target.value })} className={inputCls}><option value="meter">متر</option><option value="yard">ياردة</option><option value="piece">قطعة</option></select></div>
                <div><label className={labelCls}>قيمة الفائض *</label><input type="number" step="1" min="1" value={leftoverForm.leftover_value} onChange={e => setLeftoverForm({ ...leftoverForm, leftover_value: e.target.value })} className={inputCls + " font-mono"} required /></div>
              </div>
            </div>
          )}

          {action === 'issue_materials' && (
            <div className="space-y-2.5">
              <div>
                <label className={labelCls}>الصنف من مستودع الورشة (WH-WORKSHOP) *</label>
                <select value={issueForm.inventory_id} onChange={e => setIssueForm({ ...issueForm, inventory_id: e.target.value })} className={inputCls} required>
                  <option value="">-- اختر الخامة --</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name || i.item_name} (متاح: {i.quantity ?? 0} {i.unit || 'متر'})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>الكمية المصروفة *</label><input type="number" step="0.1" min="0.1" value={issueForm.quantity} onChange={e => setIssueForm({ ...issueForm, quantity: e.target.value })} className={inputCls + " font-mono"} required /></div>
                <div><label className={labelCls}>الوحدة</label><select value={issueForm.unit} onChange={e => setIssueForm({ ...issueForm, unit: e.target.value })} className={inputCls}><option value="meter">متر</option><option value="yard">ياردة</option><option value="piece">قطعة</option></select></div>
              </div>
            </div>
          )}

          {action === 'promote_catalog' && (
            <div className="space-y-2.5">
              <div><label className={labelCls}>اسم الموديل في الكتالوج *</label><input type="text" value={promoteForm.model_name} onChange={e => setPromoteForm({ ...promoteForm, model_name: e.target.value })} className={inputCls} required /></div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className={labelCls}>الفئة المستهدفة</label><select value={promoteForm.target_segment} onChange={e => setPromoteForm({ ...promoteForm, target_segment: e.target.value })} className={inputCls}><option value="GIRLS_DRESS">فساتين بنات</option><option value="WOMEN_APPAREL">ملابس نسائية</option><option value="SCHOOL_UNIFORM">زي مدرسي</option><option value="GENERAL">عام</option></select></div>
                <div><label className={labelCls}>التصنيف</label><input type="text" value={promoteForm.category} onChange={e => setPromoteForm({ ...promoteForm, category: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>سعر البيع الأساسي</label><input type="number" step="1" min="0" value={promoteForm.base_price} onChange={e => setPromoteForm({ ...promoteForm, base_price: e.target.value })} className={inputCls + " font-mono"} /></div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">إلغاء</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg bg-[#B0005A] hover:bg-[#8E0049] text-white text-xs font-bold cursor-pointer disabled:opacity-50">{submitting ? 'جاري التنفيذ...' : 'اعتماد وتنفيذ'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.FactoryTailoringModals = FactoryTailoringModals;
