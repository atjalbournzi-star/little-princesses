/**
 * StageWagesMatrix.jsx - مصفوفة مواعيد وأجور وتوجيه مراحل الإنتاج عبر الواتساب
 * Little Princesses ERP - Production Floor Architecture
 */

const { useState: useStageState, useEffect: useStageEffect } = React;

function StageWagesMatrix({
  form = {},
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
  const cWage = parseFloat(form.cutter_wage || 0) || 0;
  const tWage = parseFloat(form.tailor_wage || 0) || 0;
  const eWage = parseFloat(form.embroiderer_wage || 0) || 0;
  const fWage = parseFloat(form.finisher_wage || 0) || 0;
  const pWage = parseFloat(form.packager_wage || 0) || 0;
  const singleDressTotal = cWage + tWage + eWage + fWage + pWage, qty = parseFloat(form.quantity || 1), grandTotalWages = singleDressTotal * qty;

  const STAGES_CONFIG = [
    { role: 'cutter', title: '1. القص والتحضير', icon: '✂️', pct: '20%', empKey: 'cutter_name', dateKey: 'cutting_due_date', wageKey: 'cutter_wage', jobHint: 'قص وتفصيل', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', match: ['قصاس', 'قص', 'cutter'] },
    { role: 'tailor', title: '2. الخياطة والتجميع', icon: '🪡', pct: '40%', empKey: 'tailor_name', dateKey: 'sewing_due_date', wageKey: 'tailor_wage', jobHint: 'خياط', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', match: ['خياط', 'خياطة', 'tailor'] },
    { role: 'embroiderer', title: '3. التطريز والشك', icon: '✨', pct: '60%', empKey: 'embroiderer_name', dateKey: 'embroidery_due_date', wageKey: 'embroiderer_wage', jobHint: 'تطريز وشك', color: '#c084fc', bg: 'rgba(192,132,252,0.1)', match: ['تطريز', 'شك', 'embroider'] },
    { role: 'finisher', title: '4. الفحص والتشطيب', icon: '🔍', pct: '80%', empKey: 'finisher_name', dateKey: 'finishing_due_date', wageKey: 'finisher_wage', jobHint: 'تشطيب', color: '#34d399', bg: 'rgba(52,211,153,0.1)', match: ['تشطيب', 'فحص', 'finisher'] },
    { role: 'packager', title: '5. التغليف والتجهيز', icon: '📦', pct: '100%', empKey: 'packager_name', dateKey: 'packaging_due_date', wageKey: 'packager_wage', jobHint: 'تغليف وتجهيز', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', match: ['تغليف', 'تجهيز', 'مستودع', 'packager'] }
  ];

  const handleAutoDistribute = () => {
    const m = utils.autoDistributeMilestones ? utils.autoDistributeMilestones(form.start_date, form.due_date) : {};
    setForm(prev => ({
      ...prev, cutting_due_date: m.cutting, sewing_due_date: m.sewing,
      embroidery_due_date: m.embroidery, finishing_due_date: m.finishing, packaging_due_date: m.packaging || form.due_date
    }));
    if (showToast) showToast('تم التوزيع التلقائي لمواعيد المراحل الخمس ⚡', 'info');
  };

  return (
    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2 select-none text-right shadow-sm">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-100">مصفوفة مواعيد وأجور مراحل الإنتاج (Stage Matrix)</span>
          {Boolean(form.due_date && ((new Date(form.due_date) - new Date(form.start_date || new Date().toISOString().slice(0,10))) / 86400000 <= 2)) && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">🔥 طلب مستعجل (ضغوط المراحل بالتناسب)</span>
          )}
        </div>
        <button type="button" onClick={handleAutoDistribute} className="h-6.5 px-2.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/70 text-purple-200 text-[11px] font-semibold border border-purple-700/50 transition-all flex items-center gap-1 cursor-pointer active:scale-95">
          <span>⚡ توزيع المواعيد تلقائياً</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
        {STAGES_CONFIG.map(st => {
          const empVal = form[st.empKey] || (st.role === 'tailor' ? form.tailor : '') || '';
          const specialists = activeEmps.filter(e => st.match.some(m => (e.role || '').toLowerCase().includes(m) || (e.job_title || '').toLowerCase().includes(m)));
          return (
            <div key={st.role} className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 hover:border-slate-700/80 transition-all shadow-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/60 text-xs">
                <span className="font-semibold text-slate-100 flex items-center gap-1.5 text-[11px]">
                  <span>{st.icon}</span> {st.title}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full font-mono border border-slate-700/60" style={{ backgroundColor: st.bg, color: st.color }}>
                    {st.pct}
                  </span>
                  <button
                    type="button"
                    onClick={() => waUtils.sendWhatsAppToStage && waUtils.sendWhatsAppToStage({ stageRole: st.role, form, employees: activeEmps, specs: form.measurements_spec || {}, showToast })}
                    title={`إرسال واتساب 📲`}
                    className="h-5 w-5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition cursor-pointer text-[10px] flex items-center justify-center border border-emerald-500/20 active:scale-95"
                  >
                    📲
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] font-medium text-slate-400 mb-0.5">الفني المسؤول ({st.jobHint})</label>
                <select
                  className="w-full h-7 px-2 rounded-lg border border-slate-700/80 bg-slate-900 text-xs font-medium text-slate-100 outline-none focus:border-rose-500/60 transition-all cursor-pointer"
                  value={empVal} onChange={e => handleStageEmpChange(st.role, e.target.value)}
                >
                  <option value="" className="bg-slate-900">-- اختر الفني --</option>
                  {specialists.map(emp => (
                    <option key={emp.id || emp.name} value={emp.name} className="bg-slate-900">{emp.name} ({emp.role || st.jobHint})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9.5px] font-medium text-slate-400 mb-0.5">موعد إنجاز المرحلة</label>
                <input
                  type="date" lang="en-GB" dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }}
                  className="w-full h-7 px-2 rounded-lg border border-slate-700/80 bg-slate-900 text-xs font-mono font-bold text-rose-400 text-left outline-none focus:border-rose-500/60 cursor-pointer transition-all"
                  value={form[st.dateKey] || ''} onChange={e => setForm({ ...form, [st.dateKey]: e.target.value })}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[9.5px] font-medium text-slate-400">أجر المرحلة</label>
                  <span className="text-[9.5px] text-slate-500 font-mono">YER</span>
                </div>
                <input
                  type="number" step="10" min="0"
                  className="w-full h-7 px-2 rounded-lg border border-slate-700/80 bg-slate-900 text-xs font-mono font-bold text-emerald-400 text-center outline-none focus:border-rose-500/60 transition-all"
                  value={form[st.wageKey] !== undefined && form[st.wageKey] !== null ? form[st.wageKey] : ''}
                  onChange={e => setForm({ ...form, [st.wageKey]: e.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap text-[10.5px]">
          <span className="text-rose-400 font-bold">💰 أجور القطعة:</span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded-md border border-slate-800 text-slate-300">✂️ قص: <strong className="text-slate-100 font-mono">{cWage.toLocaleString('en-US')}</strong></span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded-md border border-slate-800 text-slate-300">🪡 خياطة: <strong className="text-slate-100 font-mono">{tWage.toLocaleString('en-US')}</strong></span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded-md border border-slate-800 text-slate-300">✨ تطريز: <strong className="text-slate-100 font-mono">{eWage.toLocaleString('en-US')}</strong></span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded-md border border-slate-800 text-slate-300">🔍 تشطيب: <strong className="text-slate-100 font-mono">{fWage.toLocaleString('en-US')}</strong></span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded-md border border-slate-800 text-slate-300">📦 تغليف: <strong className="text-slate-100 font-mono">{pWage.toLocaleString('en-US')}</strong></span>
        </div>
        <div className="flex items-center gap-2 font-semibold font-mono text-[11px]">
          <span className="text-slate-300">إجمالي القطعة: <strong className="text-emerald-400 font-bold">{singleDressTotal.toLocaleString('en-US')} YER</strong></span>
          {qty > 1 && (
            <span className="text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 font-bold">
              ({qty} قطع): {grandTotalWages.toLocaleString('en-US')} YER
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

window.StageWagesMatrix = StageWagesMatrix;
