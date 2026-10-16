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
    { role: 'cutter', title: '1. القص والتحضير', icon: '✂️', pct: '20%', empKey: 'cutter_name', dateKey: 'cutting_due_date', wageKey: 'cutter_wage', jobHint: 'قص وتفصيل', defWage: String(resolvedWages.cutter_wage || 0), color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', match: ['قصاص', 'قص', 'cutter'] },
    { role: 'tailor', title: '2. الخياطة والتجميع', icon: '🪡', pct: '40%', empKey: 'tailor_name', dateKey: 'sewing_due_date', wageKey: 'tailor_wage', jobHint: 'خياط', defWage: String(resolvedWages.tailor_wage || 0), color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', match: ['خياط', 'خياطة', 'tailor'] },
    { role: 'embroiderer', title: '3. التطريز والشك', icon: '✨', pct: '60%', empKey: 'embroiderer_name', dateKey: 'embroidery_due_date', wageKey: 'embroiderer_wage', jobHint: 'تطريز وشك', defWage: String(resolvedWages.embroiderer_wage || 0), color: '#c084fc', bg: 'rgba(192,132,252,0.1)', match: ['تطريز', 'شك', 'embroider'] },
    { role: 'finisher', title: '4. الفحص والتشطيب', icon: '🔍', pct: '80%', empKey: 'finisher_name', dateKey: 'finishing_due_date', wageKey: 'finisher_wage', jobHint: 'تشطيب وجودة', defWage: String(resolvedWages.finisher_wage || 0), color: '#34d399', bg: 'rgba(52,211,153,0.1)', match: ['تشطيب', 'جودة', 'فحص', 'finisher'] }
  ];

  useStageEffect(() => {
    let updates = {};
    STAGES_CONFIG.forEach(st => {
      let spec = null;
      if (activeEmps.length > 0) {
        const cur = form[st.empKey] || (st.role === 'tailor' ? form.tailor : '');
        if (!cur) {
          const saved = localStorage.getItem('lp_def_' + st.role);
          const matchSaved = saved && activeEmps.find(e => e.name === saved);
          spec = matchSaved || activeEmps.find(e => st.match.some(m => (e.role || '').toLowerCase().includes(m) || (e.job_title || '').toLowerCase().includes(m))) || activeEmps[0];
          if (spec) {
            updates[st.empKey] = spec.name;
            if (st.role === 'tailor') updates.tailor = spec.name;
          }
        } else {
          spec = activeEmps.find(e => e.name === cur || e.id === cur);
        }
        if (spec) {
          const empWage = spec.piece_rate ?? spec.piece_wage ?? spec.pieceRate ?? spec.pieceWage ?? spec.salary ?? spec.baseSalary ?? spec.base_salary;
          if (empWage !== undefined && empWage !== '' && empWage !== null && (form[st.wageKey] === undefined || form[st.wageKey] === '' || Number(form[st.wageKey]) === 0)) {
            updates[st.wageKey] = String(empWage);
          }
        }
      }
      if ((form[st.wageKey] === undefined || form[st.wageKey] === '' || Number(form[st.wageKey]) === 0) && Number(st.defWage) > 0 && !updates[st.wageKey]) {
        updates[st.wageKey] = st.defWage;
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
    if (showToast) showToast('تم التوزيع التلقائي لمواعيد المراحل الأربع ⚡', 'info');
  };

  return (
    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-3 select-none text-right shadow-sm">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-100">مصفوفة مواعيد وأجور مراحل الإنتاج (Stage Matrix)</span>
          {Boolean(form.due_date && ((new Date(form.due_date) - new Date(form.start_date || new Date().toISOString().slice(0,10))) / 86400000 <= 2)) && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              🔥 طلب مستعجل (ضغوط المراحل بالتناسب)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleAutoDistribute}
          className="h-7 px-3 rounded-lg bg-purple-900/40 hover:bg-purple-900/70 text-purple-200 text-xs font-semibold border border-purple-700/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
        >
          <span>⚡ توزيع المواعيد تلقائياً</span>
        </button>
      </div>

      {/* 4 Stage Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
        {STAGES_CONFIG.map(st => {
          const empVal = form[st.empKey] || (st.role === 'tailor' ? form.tailor : '') || '';
          const specialists = activeEmps.filter(e => st.match.some(m => (e.role || '').toLowerCase().includes(m) || (e.job_title || '').toLowerCase().includes(m)));
          const otherEmps = activeEmps.filter(e => !specialists.includes(e));
          return (
            <div key={st.role} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 hover:border-slate-700/80 transition-all shadow-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 text-xs">
                <span className="font-semibold text-slate-100 flex items-center gap-1.5 text-[11px]">
                  <span>{st.icon}</span> {st.title}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono border border-slate-700/60" style={{ backgroundColor: st.bg, color: st.color }}>
                    {st.pct}
                  </span>
                  <button
                    type="button"
                    onClick={() => waUtils.sendWhatsAppToStage && waUtils.sendWhatsAppToStage({ stageRole: st.role, form, employees: activeEmps, specs: form.measurements_spec || {}, showToast })}
                    title={`إرسال واتساب 📲`}
                    className="h-5.5 w-5.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition cursor-pointer text-xs flex items-center justify-center border border-emerald-500/20 active:scale-95"
                  >
                    📲
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">الفني المسؤول ({st.role})</label>
                <select
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700/80 bg-slate-900 text-xs font-medium text-slate-100 outline-none focus:border-rose-500/60 transition-all"
                  value={empVal}
                  onChange={e => onEmpChange(st.role, e.target.value)}
                >
                  <option value="" className="bg-slate-900">-- اختر الفني --</option>
                  {specialists.length > 0 && (
                    <optgroup label={`⭐ المتخصصون`}>
                      {specialists.map(emp => (
                        <option key={emp.id || emp.name} value={emp.name} className="bg-slate-900">{emp.name} ({emp.role || st.jobHint})</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="👥 كافة الفنيين">
                    {(specialists.length > 0 ? otherEmps : activeEmps).map(emp => (
                      <option key={emp.id || emp.name} value={emp.name} className="bg-slate-900">{emp.name} ({emp.role || 'فني'})</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">موعد إنجاز المرحلة</label>
                <input
                  type="date" lang="en-GB" dir="ltr"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700/80 bg-slate-900 text-xs font-mono font-bold text-rose-400 outline-none focus:border-rose-500/60 cursor-pointer transition-all"
                  value={form[st.dateKey] || ''}
                  onChange={e => setForm({ ...form, [st.dateKey]: e.target.value })}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-medium text-slate-400">أجر المرحلة</label>
                  <span className="text-[10px] text-slate-500 font-mono">YER</span>
                </div>
                <input
                  type="number" step="10" min="0" placeholder={st.defWage}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700/80 bg-slate-900 text-xs font-mono font-bold text-emerald-400 text-center outline-none focus:border-rose-500/60 transition-all"
                  value={form[st.wageKey] !== undefined ? form[st.wageKey] : st.defWage}
                  onChange={e => setForm({ ...form, [st.wageKey]: e.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Wage Totals Footer Strip */}
      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs font-semibold text-slate-100 shrink-0">
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className="text-rose-400 font-bold">💰 أجور القطعة:</span>
          <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300">✂️ قص: <strong className="text-slate-100 font-mono">{cWage.toLocaleString('en-US')}</strong></span>
          <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300">🪡 خياطة: <strong className="text-slate-100 font-mono">{tWage.toLocaleString('en-US')}</strong></span>
          <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300">✨ تطريز: <strong className="text-slate-100 font-mono">{eWage.toLocaleString('en-US')}</strong></span>
          <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300">🔍 تشطيب: <strong className="text-slate-100 font-mono">{fWage.toLocaleString('en-US')}</strong></span>
        </div>
        <div className="flex items-center gap-2 font-semibold font-mono text-xs">
          <span className="text-slate-300">إجمالي القطعة: <strong className="text-emerald-400 font-bold">{singleDressTotal.toLocaleString('en-US')} YER</strong></span>
          {qty > 1 && (
            <span className="text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20 font-bold">
              ({qty} قطع): {grandTotalWages.toLocaleString('en-US')} YER
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

window.StageWagesMatrix = StageWagesMatrix;

