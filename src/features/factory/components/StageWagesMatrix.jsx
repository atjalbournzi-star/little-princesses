/**
 * StageWagesMatrix.jsx - مصفوفة مواعيد وأجور وتوجيه مراحل الإنتاج عبر الواتساب
 * Little Princesses ERP - Production Floor Architecture
 */

const { useState: useStageState, useEffect: useStageEffect } = React;

function StageWagesMatrix({
  form,
  setForm,
  employees = [],
  handleStageEmpChange,
  showToast
}) {
  const utils = window.FactoryUtils || {};
  const waUtils = window.FactoryWhatsAppUtils || {};
  const [localEmps, setLocalEmps] = useStageState([]);

  useStageEffect(() => {
    if (!employees || employees.length === 0) {
      fetch('/api/hr/employees').then(r => r.json()).then(res => {
        const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
        if (list.length > 0) setLocalEmps(list);
      }).catch(() => {});
    }
  }, [employees]);

  const activeEmps = (employees?.length > 0 ? employees : localEmps).filter(e => e.status === 'نشط' || !e.status);
  const wageSvc = window.WageMatrixService || {};
  const resolvedWages = wageSvc.resolveStageWages ? wageSvc.resolveStageWages(form) : {};
  const cWage = parseFloat(form.cutter_wage !== undefined && form.cutter_wage !== '' ? form.cutter_wage : (resolvedWages.cutter_wage || 0));
  const tWage = parseFloat(form.tailor_wage !== undefined && form.tailor_wage !== '' ? form.tailor_wage : (resolvedWages.tailor_wage || 0));
  const eWage = parseFloat(form.embroiderer_wage !== undefined && form.embroiderer_wage !== '' ? form.embroiderer_wage : (resolvedWages.embroiderer_wage || 0));
  const fWage = parseFloat(form.finisher_wage !== undefined && form.finisher_wage !== '' ? form.finisher_wage : (resolvedWages.finisher_wage || 0));
  const singleDressTotal = cWage + tWage + eWage + fWage, qty = parseFloat(form.quantity || 1);
  const grandTotalWages = singleDressTotal * qty;

  const STAGES_CONFIG = [
    { role: 'cutter', title: '1. القص والتحضير', icon: '✂️', pct: '20%', empKey: 'cutter_name', dateKey: 'cutting_due_date', wageKey: 'cutter_wage', jobHint: 'قص وتفصيل', defWage: String(resolvedWages.cutter_wage || 0), color: '#8F2A87', bg: '#F2E7F3', match: ['قصاص', 'قص', 'cutter'] },
    { role: 'tailor', title: '2. الخياطة والتجميع', icon: '🪡', pct: '40%', empKey: 'tailor_name', dateKey: 'sewing_due_date', wageKey: 'tailor_wage', jobHint: 'خياط', defWage: String(resolvedWages.tailor_wage || 0), color: '#8F2A87', bg: '#F2E7F3', match: ['خياط', 'خياطة', 'tailor'] },
    { role: 'embroiderer', title: '3. التطريز والشك', icon: '✨', pct: '60%', empKey: 'embroiderer_name', dateKey: 'embroidery_due_date', wageKey: 'embroiderer_wage', jobHint: 'تطريز وشك', defWage: String(resolvedWages.embroiderer_wage || 0), color: '#8F2A87', bg: '#F2E7F3', match: ['تطريز', 'شك', 'embroider'] },
    { role: 'finisher', title: '4. الفحص والتشطيب', icon: '🔍', pct: '80%', empKey: 'finisher_name', dateKey: 'finishing_due_date', wageKey: 'finisher_wage', jobHint: 'تشطيب وجودة', defWage: String(resolvedWages.finisher_wage || 0), color: '#007F8C', bg: '#E2F5F7', match: ['تشطيب', 'جودة', 'فحص', 'finisher'] }
  ];

  useStageEffect(() => {
    let updates = {};
    STAGES_CONFIG.forEach(st => {
      if ((form[st.wageKey] === undefined || form[st.wageKey] === '' || Number(form[st.wageKey]) === 0) && Number(st.defWage) > 0) {
        updates[st.wageKey] = st.defWage;
      }
      if (activeEmps.length > 0) {
        const cur = form[st.empKey] || (st.role === 'tailor' ? form.tailor : '');
        if (!cur) {
          const saved = localStorage.getItem('lp_def_' + st.role);
          const matchSaved = saved && activeEmps.find(e => e.name === saved);
          const spec = matchSaved || activeEmps.find(e => st.match.some(m => (e.role || '').toLowerCase().includes(m) || (e.job_title || '').toLowerCase().includes(m))) || activeEmps[0];
          if (spec) {
            updates[st.empKey] = spec.name;
            if (st.role === 'tailor') updates.tailor = spec.name;
          }
        }
      }
    });
    if (Object.keys(updates).length > 0) setForm(prev => ({ ...prev, ...updates }));
  }, [activeEmps, form.order_no, form.product_id, resolvedWages.cutter_wage]);

  const onEmpChange = (stRole, val) => {
    if (val) localStorage.setItem('lp_def_' + stRole, val);
    else localStorage.removeItem('lp_def_' + stRole);
    handleStageEmpChange(stRole, val);
  };

  const handleAutoDistribute = () => {
    const m = utils.autoDistributeMilestones ? utils.autoDistributeMilestones(form.start_date, form.due_date) : {};
    setForm(prev => ({
      ...prev,
      cutting_due_date: m.cutting,
      sewing_due_date: m.sewing,
      embroidery_due_date: m.embroidery,
      finishing_due_date: m.finishing
    }));
    if (showToast) showToast('تم احتساب وتوزيع مواعيد المراحل الأربع تنازلياً حسب تاريخ التسليم ⚡', 'info');
  };

  return (
    <div className="p-5 rounded-2xl bg-[#FAFAFB] dark:bg-[#0B132B] border border-[#E8E5EA] dark:border-slate-800 space-y-4 shadow-2xs">
      {/* Header with Auto-Milestones distribution */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8E5EA] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗓️</span>
          <div>
            <h4 className="text-xs font-bold text-[#25232A] dark:text-white">مصفوفة مواعيد وأجور مراحل الإنتاج (Stage Schedule & Wage Matrix)</h4>
            <p className="text-[11px] text-[#6F6B75] dark:text-slate-300 mt-0.5">تحديد الفني المسؤول، الموعد، والأجر مع إمكانية التوجيه المباشر بالواتساب 📲</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAutoDistribute}
          className="px-3.5 py-1.5 rounded-xl bg-[#F2E7F3] dark:bg-purple-950/40 hover:bg-[#E5CEE7] dark:hover:bg-purple-900/50 text-[#8F2A87] dark:text-purple-300 text-xs font-bold border border-[#E5CEE7] dark:border-purple-800/40 transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <span>⚡</span>
          <span>توزيع المواعيد تلقائياً حسب التسليم</span>
        </button>
      </div>

      {/* 4 Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {STAGES_CONFIG.map(st => {
          const empVal = form[st.empKey] || (st.role === 'tailor' ? form.tailor : '') || '';
          const specialists = activeEmps.filter(e => st.match.some(m => (e.role || '').toLowerCase().includes(m) || (e.job_title || '').toLowerCase().includes(m)));
          const otherEmps = activeEmps.filter(e => !specialists.includes(e));
          return (
            <div key={st.role} className="p-3.5 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E8E5EA] dark:border-slate-800 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#F2E7F3] dark:border-slate-800">
                <span className="text-xs font-bold text-[#25232A] dark:text-white flex items-center gap-1.5">
                  <span>{st.icon}</span> {st.title}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md font-mono" style={{ backgroundColor: st.bg, color: st.color }}>
                    {st.pct}
                  </span>
                  <button
                    type="button"
                    onClick={() => waUtils.sendWhatsAppToStage && waUtils.sendWhatsAppToStage({ stageRole: st.role, form, employees: activeEmps, specs: form.measurements_spec || {}, showToast })}
                    title={`إرسال مواصفات المرحلة إلى ${st.title} عبر واتساب 📲`}
                    className="p-1 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] transition cursor-pointer text-xs flex items-center gap-1 border border-[#25D366]/25"
                  >
                    <span>📲</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#25232A] dark:text-slate-200 mb-1">الفني المسؤول ({st.role})</label>
                <select
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111C38] text-xs font-semibold text-[#25232A] dark:text-white focus:border-[#8F2A87] outline-none"
                  value={empVal}
                  onChange={e => onEmpChange(st.role, e.target.value)}
                >
                  <option value="">-- اختر الفني --</option>
                  {specialists.length > 0 && (
                    <optgroup label={`⭐ فنيو ${st.title} المتخصصون`}>
                      {specialists.map(emp => (
                        <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.role || st.jobHint}) ⭐</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={specialists.length > 0 ? "👥 باقي الكادر المتاح" : "👥 كافة الفنيين المتاحين"}>
                    {(specialists.length > 0 ? otherEmps : activeEmps).map(emp => (
                      <option key={emp.id || emp.name} value={emp.name}>{emp.name} ({emp.role || emp.job_title || 'فني'})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#25232A] dark:text-slate-200 mb-1">موعد إنجاز المرحلة</label>
                <input
                  type="date" lang="en-GB" dir="ltr"
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111C38] text-xs font-mono font-bold text-[#8F2A87] dark:text-purple-300 focus:border-[#8F2A87] outline-none"
                  value={form[st.dateKey] || ''}
                  onChange={e => setForm({ ...form, [st.dateKey]: e.target.value })}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-semibold text-[#25232A] dark:text-slate-200">أجر المرحلة بالقطعة</label>
                  <span className="text-[10px] text-[#6F6B75] dark:text-slate-300">ر.ي</span>
                </div>
                <input
                  type="number" step="10" min="0" placeholder={st.defWage}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-[#FAFAFB] dark:bg-[#111C38] text-xs font-mono font-bold text-[#8F2A87] dark:text-white text-center focus:border-[#8F2A87] outline-none"
                  value={form[st.wageKey] !== undefined ? form[st.wageKey] : st.defWage}
                  onChange={e => setForm({ ...form, [st.wageKey]: e.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Wage Totals Footer Strip */}
      <div className="p-3 rounded-xl bg-white dark:bg-[#0F172A] border border-[#E8E5EA] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-[#8F2A87] dark:text-purple-300">💰 تفصيل أجور المراحل للقطعة:</span>
          <span className="bg-[#FAFAFB] dark:bg-slate-800/80 px-2 py-0.5 rounded border border-[#E8E5EA] dark:border-slate-700 text-[#6F6B75] dark:text-slate-300">✂️ قص: <strong className="text-[#25232A] dark:text-white font-mono">{cWage.toLocaleString()}</strong></span>
          <span className="bg-[#FAFAFB] dark:bg-slate-800/80 px-2 py-0.5 rounded border border-[#E8E5EA] dark:border-slate-700 text-[#6F6B75] dark:text-slate-300">🪡 خياطة: <strong className="text-[#25232A] dark:text-white font-mono">{tWage.toLocaleString()}</strong></span>
          <span className="bg-[#FAFAFB] dark:bg-slate-800/80 px-2 py-0.5 rounded border border-[#E8E5EA] dark:border-slate-700 text-[#6F6B75] dark:text-slate-300">✨ تطريز: <strong className="text-[#25232A] dark:text-white font-mono">{eWage.toLocaleString()}</strong></span>
          <span className="bg-[#FAFAFB] dark:bg-slate-800/80 px-2 py-0.5 rounded border border-[#E8E5EA] dark:border-slate-700 text-[#6F6B75] dark:text-slate-300">🔍 تشطيب: <strong className="text-[#25232A] dark:text-white font-mono">{fWage.toLocaleString()}</strong></span>
        </div>
        <div className="flex items-center gap-3 font-bold font-mono">
          <span className="text-[#6F6B75] dark:text-slate-300">إجمالي القطعة: <strong className="text-[#8F2A87] dark:text-purple-300 text-sm">{singleDressTotal.toLocaleString()}</strong> ر.ي</span>
          {qty > 1 && (
            <span className="text-[#007F8C] dark:text-cyan-300 bg-[#E2F5F7] dark:bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-[#C5ECF0] dark:border-cyan-800/40">
              إجمالي الأمر ({qty} قطع): {grandTotalWages.toLocaleString()} ر.ي
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

window.StageWagesMatrix = StageWagesMatrix;
