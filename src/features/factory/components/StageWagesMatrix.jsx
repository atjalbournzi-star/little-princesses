/**
 * StageWagesMatrix.jsx - مصفوفة مواعيد وأجور وتوجيه مراحل الإنتاج المقروءة ديناميكياً
 * Little Princesses ERP - Dynamic Production Floor Architecture
 */

const { useState: useStageState, useEffect: useStageEffect, useMemo: useStageMemo } = React;

function StageWagesMatrix({
  form = {},
  setForm,
  employees = [],
  handleStageEmpChange,
  showToast,
  jobRoles = []
}) {
  const utils = window.FactoryUtils || {};
  const waUtils = window.FactoryWhatsAppUtils || {};
  const [localEmps, setLocalEmps] = useStageState([]);
  const [prodRoles, setProdRoles] = useStageState([]);

  useStageEffect(() => {
    if (!employees || employees.length === 0) {
      fetch('/api/hr/employees').then(r => r.json()).then(res => {
        const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
        if (list.length > 0) setLocalEmps(list);
      }).catch(() => {});
    }
  }, [employees]);

  useStageEffect(() => {
    if (jobRoles && jobRoles.length > 0) {
      setProdRoles(jobRoles.filter(r => r.is_production));
    } else if (window.JobRolesService?.getJobRoles) {
      window.JobRolesService.getJobRoles({ is_production: true }).then(r => {
        if (r && r.length) setProdRoles(r);
      });
    }
  }, [jobRoles]);

  const activeEmps = (employees?.length > 0 ? employees : localEmps).filter(e => e.status === 'نشط' || !e.status);

  const STAGES_CONFIG = useStageMemo(() => {
    return [
      { role: 'cutter', role_key: 'cutter', role_name: 'القصاص (قص وتفصيل)', title: '1. القصاص (قص وتفصيل)', icon: '✂️', pct: '20%', empKey: 'cutter_name', dateKey: 'cutting_due_date', wageKey: 'cutter_wage', jobHint: 'القصاص (قص وتفصيل)', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', match: ['قصاص', 'قص', 'cutter'] },
      { role: 'tailor', role_key: 'tailor', role_name: 'خياط', title: '2. خياط', icon: '🪡', pct: '40%', empKey: 'tailor_name', dateKey: 'sewing_due_date', wageKey: 'tailor_wage', jobHint: 'خياط', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', match: ['خياط', 'tailor'] },
      { role: 'embroiderer', role_key: 'embroiderer', role_name: 'تطريز', title: '3. فني تطريز وشك', icon: '✨', pct: '60%', empKey: 'embroiderer_name', dateKey: 'embroidery_due_date', wageKey: 'embroiderer_wage', jobHint: 'فني تطريز وشك', color: '#c084fc', bg: 'rgba(192,132,252,0.1)', match: ['تطريز', 'شك', 'embroiderer'] },
      { role: 'finisher', role_key: 'finisher', role_name: 'تشطيب', title: '4. فني تشطيب وكي', icon: '🔍', pct: '80%', empKey: 'finisher_name', dateKey: 'finishing_due_date', wageKey: 'finisher_wage', jobHint: 'فني تشطيب وكي', color: '#34d399', bg: 'rgba(52,211,153,0.1)', match: ['تشطيب', 'كي', 'finisher'] },
      { role: 'packager', role_key: 'packager', role_name: 'تكلفة التغليف والإكسسوارات', title: '5. تكلفة التغليف والإكسسوارات', icon: '📦', pct: '100%', empKey: 'packager_name', dateKey: 'packaging_due_date', wageKey: 'packager_wage', jobHint: 'تكلفة التغليف والإكسسوارات', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', isCostItem: true }
    ];
  }, []);

  useStageEffect(() => {
    STAGES_CONFIG.forEach(st => {
      if (st.isCostItem) return;
      const specialists = activeEmps
        .filter(e => st.match.some(m => (e.role || '').toLowerCase().includes(m) || (e.job_title || '').toLowerCase().includes(m)))
        .sort((a, b) => (a.active_tasks_count || 0) - (b.active_tasks_count || 0));
      const currentEmp = form[st.empKey] || (st.role === 'tailor' ? form.tailor : '');
      if (!currentEmp && specialists.length === 1 && handleStageEmpChange) {
        handleStageEmpChange(st.role, specialists[0].name);
      }
    });
  }, [activeEmps, STAGES_CONFIG]);

  const singleDressTotal = STAGES_CONFIG.reduce((sum, st) => sum + (parseFloat(form[st.wageKey] || 0) || 0), 0);
  const qty = parseFloat(form.quantity || 1), grandTotalWages = singleDressTotal * qty;

  const handleAutoDistribute = () => {
    const m = utils.autoDistributeMilestones ? utils.autoDistributeMilestones(form.start_date, form.due_date) : {};
    const updates = {
      cutting_due_date: m.cutting, sewing_due_date: m.sewing,
      embroidery_due_date: m.embroidery, finishing_due_date: m.finishing,
      packaging_due_date: m.packaging || form.due_date
    };
    STAGES_CONFIG.forEach(st => {
      if (!updates[st.dateKey]) updates[st.dateKey] = form.due_date || '';
    });
    setForm(prev => ({ ...prev, ...updates }));
    if (showToast) showToast('تم التوزيع التلقائي لمواعيد مراحل الإنتاج ⚡', 'info');
  };

  return (
    <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-900/90 border border-[#CBD5E1] dark:border-slate-800/80 space-y-2 select-none text-right shadow-sm">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#CBD5E1] dark:border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#0F172A] dark:text-slate-100">مصفوفة مواعيد وأجور مراحل الإنتاج (Stage Matrix)</span>
          {Boolean(form.due_date && ((new Date(form.due_date) - new Date(form.start_date || new Date().toISOString().slice(0,10))) / 86400000 <= 2)) && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 animate-pulse">🔥 طلب مستعجل (ضغوط المراحل بالتناسب)</span>
          )}
        </div>
        <button type="button" onClick={handleAutoDistribute} className="h-6.5 px-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-900/70 text-purple-700 dark:text-purple-200 text-[11px] font-semibold border border-purple-200 dark:border-purple-700/50 transition-all flex items-center gap-1 cursor-pointer active:scale-95">
          <span>⚡ توزيع المواعيد تلقائياً</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
        {STAGES_CONFIG.map(st => {
          const empVal = form[st.empKey] || (st.role === 'tailor' ? form.tailor : '') || '';
          const specialists = (st.match ? activeEmps.filter(e => st.match.some(m => (e.role || '').toLowerCase().includes(m) || (e.job_title || '').toLowerCase().includes(m))) : []).sort((a, b) => (a.active_tasks_count || 0) - (b.active_tasks_count || 0));
          return (
            <div key={st.role} className="p-2 rounded-xl bg-white dark:bg-slate-950/80 border border-[#CBD5E1] dark:border-slate-800/80 space-y-1.5 hover:border-slate-400 dark:hover:border-slate-700/80 transition-all shadow-xs">
              <div className="flex items-center justify-between pb-1 border-b border-[#CBD5E1] dark:border-slate-800/60 text-xs">
                <span className="font-semibold text-[#0F172A] dark:text-slate-100 flex items-center gap-1.5 text-[11px]">
                  <span>{st.icon}</span> {st.title}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full font-mono border border-[#CBD5E1] dark:border-slate-700/60" style={{ backgroundColor: st.bg, color: st.color }}>
                    {st.pct}
                  </span>
                  {!st.isCostItem && (
                    <button
                      type="button"
                      onClick={() => waUtils.sendWhatsAppToStage && waUtils.sendWhatsAppToStage({ stageRole: st.role, form, employees: activeEmps, specs: form.measurements_spec || {}, showToast })}
                      title={`إرسال واتساب 📲`}
                      className="h-5 w-5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition cursor-pointer text-[10px] flex items-center justify-center border border-emerald-500/20 active:scale-95"
                    >
                      📲
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">{st.isCostItem ? 'طبيعة البند' : `الفني المسؤول (${st.jobHint})`}</label>
                {st.isCostItem ? (
                  <div className="w-full h-7 px-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 text-[10px] font-semibold flex items-center justify-center">تكلفة مباشرة للموديل 📦</div>
                ) : (
                  <select
                    className="w-full h-7 px-2 rounded-lg border border-[#CBD5E1] dark:border-slate-700/80 bg-white dark:bg-slate-900 text-xs font-medium text-[#0F172A] dark:text-slate-100 outline-none focus:border-rose-500/60 transition-all cursor-pointer"
                    value={empVal} onChange={e => handleStageEmpChange(st.role, e.target.value)}
                  >
                    <option value="" className="bg-white dark:bg-slate-900">-- اختر الفني --</option>
                    {specialists.map(emp => (
                      <option key={emp.id || emp.name} value={emp.name} className="bg-white dark:bg-slate-900">
                        {emp.name} ({emp.active_tasks_count || 0} مهام نشطة)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[9.5px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">موعد إنجاز المرحلة</label>
                <input
                  type="date" lang="en-GB" dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }}
                  className="w-full h-7 px-2 rounded-lg border border-[#CBD5E1] dark:border-slate-700/80 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 text-left outline-none focus:border-rose-500/60 cursor-pointer transition-all"
                  value={form[st.dateKey] || ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (form.due_date && val && val > form.due_date) {
                      if (showToast) showToast(`تاريخ مرحلة (${st.title}) لا يمكن أن يتجاوز موعد التسليم (${form.due_date}) ⚠️`, 'warning');
                      setForm(p => ({ ...p, [st.dateKey]: form.due_date }));
                    } else {
                      setForm(p => ({ ...p, [st.dateKey]: val }));
                    }
                  }}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[9.5px] font-medium text-slate-600 dark:text-slate-400">أجر المرحلة</label>
                  <span className="text-[9.5px] text-slate-500 font-mono">YER</span>
                </div>
                <input
                  type="number" step="10" min="0"
                  className="w-full h-7 px-2 rounded-lg border border-[#CBD5E1] dark:border-slate-700/80 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 text-center outline-none focus:border-rose-500/60 transition-all"
                  value={form[st.wageKey] !== undefined && form[st.wageKey] !== null ? form[st.wageKey] : ''}
                  onChange={e => setForm({ ...form, [st.wageKey]: e.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 rounded-xl bg-white dark:bg-slate-950/80 border border-[#CBD5E1] dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#0F172A] dark:text-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap text-[10.5px]">
          <span className="text-rose-600 dark:text-rose-400 font-bold">💰 أجور القطعة:</span>
          {STAGES_CONFIG.map(st => (
            <span key={st.role} className="bg-[#F8FAFC] dark:bg-slate-900 px-1.5 py-0.5 rounded-md border border-[#CBD5E1] dark:border-slate-800 text-slate-700 dark:text-slate-300">
              {st.icon} {st.jobHint}: <strong className="text-[#0F172A] dark:text-slate-100 font-mono">{(parseFloat(form[st.wageKey] || 0) || 0).toLocaleString('en-US')}</strong>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 font-semibold font-mono text-[11px]">
          <span className="text-slate-700 dark:text-slate-300">إجمالي القطعة: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{singleDressTotal.toLocaleString('en-US')} YER</strong></span>
          {qty > 1 && (<span className="text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-500/20 font-bold">({qty} قطع): {grandTotalWages.toLocaleString('en-US')} YER</span>)}
        </div>
      </div>
    </div>
  );
}

window.StageWagesMatrix = StageWagesMatrix;
