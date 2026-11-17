// src/features/products/components/ProductCostingMatrix.jsx
// مراحل التشغيل ومصفوفة تكاليف الإنتاج المقروءة ديناميكياً من المسميات الوظيفية

function ProductCostingMatrix({ actions }) {
  const {
    computedFabricTotal, computedTotalLabor, computedTotalCost,
    activeModelCurrencyLabel, targetSegment = 'kids',
    ageChart = [], updateAgeChart, womenSizeChart = [], updateWomenSizeChart
  } = actions;

  const [prodRoles, setProdRoles] = React.useState([]);
  const [measUnit, setMeasUnit] = React.useState('سم');
  const isInch = measUnit === 'إنش';

  React.useEffect(() => {
    if (actions.productionRoles?.length) {
      setProdRoles(actions.productionRoles);
    } else {
      fetch('/api/job-roles').then(r => r.json()).then(d => {
        const list = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
        const prod = list.filter(r => r.is_production !== false || r.wage_key === 'packaging_cost' || r.wage_key === 'packager_wage' || r.role_key === 'packager');
        if (prod.length) setProdRoles(prod);
      }).catch(() => {});
    }
  }, [actions.productionRoles]);

  const effectiveRoles = React.useMemo(() => {
    if (prodRoles.length > 0) return prodRoles;
    return [
      { role_code: 'ROLE-0001', role_key: 'cutter', role_name: 'قصاس', display_name: 'القصاس (قص وتفصيل)', wage_key: 'cutter_wage', icon: '✂️' },
      { role_code: 'ROLE-0002', role_key: 'tailor', role_name: 'خياط', display_name: 'خياط', wage_key: 'tailor_wage', icon: '🪡' },
      { role_code: 'ROLE-0003', role_key: 'embroiderer', role_name: 'تطريز', display_name: 'التطريز والشك', wage_key: 'embroiderer_wage', icon: '✨' },
      { role_code: 'ROLE-0004', role_key: 'finisher', role_name: 'تشطيب', display_name: 'التشطيب والكي', wage_key: 'finisher_wage', icon: '👔' },
      { role_code: 'ROLE-0005', role_key: 'packager', role_name: 'تغليف', display_name: 'تكلفة التغليف والإكسسوارات', wage_key: 'packaging_cost', icon: '📦' }
    ];
  }, [prodRoles]);

  const wageInputCls = "h-6.5 w-20 font-mono text-xs font-bold text-white text-center bg-slate-900 border border-slate-700 rounded-lg outline-none focus:border-pink-500 transition";
  const microInputCls = "h-6 text-xs text-center font-mono font-bold text-white bg-slate-900 border border-slate-700 rounded-md outline-none focus:border-pink-500";

  const formatDisp = (cmVal) => {
    if (cmVal === '' || cmVal == null || isNaN(cmVal)) return '';
    return isInch ? +(cmVal / 2.54).toFixed(1) : cmVal;
  };

  const handleUpdate = (id, field, rawVal, isWomen = false) => {
    const num = parseFloat(rawVal);
    const cmVal = isNaN(num) ? '' : (isInch ? +(num * 2.54).toFixed(1) : num);
    if (isWomen) updateWomenSizeChart(id, field, cmVal);
    else {
      updateAgeChart(id, field, cmVal);
      if (field === 'length') updateAgeChart(id, 'max', cmVal);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2.5 p-2.5 flex-1 select-none min-h-0 overflow-hidden" dir="rtl">
      {/* 1. اليمين: أجور مراحل التصنيع المقروءة ديناميكياً من الباك إند */}
      <div className="p-2.5 bg-[#0F172A] rounded-xl border border-slate-800 flex flex-col justify-between shadow-md">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <span className="text-xs font-bold text-white block">
            🏭 أجور مراحل التصنيع والتشغيل الفنية:
          </span>
          <span className="text-[10.5px] font-mono font-bold text-pink-400 bg-pink-950/40 px-2 py-0.5 rounded border border-pink-800/40">
            {activeModelCurrencyLabel}
          </span>
        </div>

        <div className="space-y-1.5 my-auto max-h-[220px] overflow-y-auto custom-scrollbar pr-0.5">
          {effectiveRoles.map((role, idx) => {
            const wKey = role.wage_key || `${role.role_key}_wage`;
            const val = actions.getStageWage ? actions.getStageWage(wKey, role) : (actions[wKey] || '');
            return (
              <div key={role.role_code || role.role_key || idx} className="flex items-center justify-between gap-1 bg-slate-900/80 py-1 px-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{role.icon || '🧵'}</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {idx + 1}. {(role.role_key === 'packager' || role.wage_key === 'packaging_cost' || role.wage_key === 'packager_wage') ? '' : 'أجرة '}{role.display_name || role.role_name}:
                  </span>
                </div>
                <input
                  type="number" min="0" step="0.5" value={val}
                  onChange={e => actions.setStageWage ? actions.setStageWage(wKey, e.target.value) : null}
                  className={wageInputCls}
                />
              </div>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-300 text-center py-1 bg-slate-900/60 rounded-lg border border-slate-800/80">
          مجموع أجور الورشة: <strong className="text-pink-400 font-mono font-bold">+{parseFloat(computedTotalLabor || 0).toFixed(1)} {activeModelCurrencyLabel}</strong>
        </div>
      </div>

      {/* 2. اليسار: جدول الأطوال والقياسات الهندسية المعيارية مع زر تحويل (سم / إنش) */}
      <div className="p-2.5 bg-[#0F172A] rounded-xl border border-slate-800 flex flex-col justify-between shadow-md overflow-hidden">
        <div>
          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-800">
            <span className="text-xs font-bold text-white block">
              {targetSegment === 'women_adults' ? '👗 جدول مقاسات الكبار المعيارية:' : '📏 جدول قياسات الموديل المعيارية:'}
            </span>
            <button
              type="button"
              onClick={() => setMeasUnit(p => p === 'سم' ? 'إنش' : 'سم')}
              className="h-5 px-2 text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/60 rounded cursor-pointer flex items-center gap-1 transition"
            >
              <span>الوحدة:</span><span className="text-white font-mono">{measUnit}</span><span>🔄</span>
            </button>
          </div>

          {targetSegment === 'women_adults' ? (
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-slate-400 px-1 pb-0.5 border-b border-slate-800 text-center">
                <span>المقاس</span><span>الصدر ({measUnit})</span><span>الخصر ({measUnit})</span><span>الطول ({measUnit})</span>
              </div>
              {womenSizeChart.map(row => (
                <div key={row.id} className="grid grid-cols-4 gap-1 items-center bg-slate-900/80 p-0.5 px-1 rounded-lg border border-slate-800 text-xs h-6">
                  <span className="font-bold text-pink-400 text-center text-[10.5px] font-mono">{row.label || row.size}</span>
                  <input type="number" step={isInch ? "0.1" : "0.5"} value={formatDisp(row.chest)} onChange={e => handleUpdate(row.id, 'chest', e.target.value, true)} className={microInputCls + " px-1"} />
                  <input type="number" step={isInch ? "0.1" : "0.5"} value={formatDisp(row.waist)} onChange={e => handleUpdate(row.id, 'waist', e.target.value, true)} className={microInputCls + " px-1"} />
                  <input type="number" step={isInch ? "0.1" : "0.5"} value={formatDisp(row.length)} onChange={e => handleUpdate(row.id, 'length', e.target.value, true)} className={microInputCls + " px-1"} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-slate-400 px-1 pb-0.5 border-b border-slate-800 text-center">
                <span>المقاس / العمر</span><span>الصدر ({measUnit})</span><span>الخصر ({measUnit})</span><span>الطول ({measUnit})</span>
              </div>
              {ageChart.slice(0, 4).map(row => (
                <div key={row.id} className="grid grid-cols-4 gap-1 items-center bg-slate-900/80 p-0.5 px-1 rounded-lg border border-slate-800 text-xs h-6">
                  <span className="font-bold text-pink-400 text-center text-[10.5px] font-mono">{row.age || row.size}</span>
                  <input type="number" step={isInch ? "0.1" : "0.5"} value={formatDisp(row.chest)} onChange={e => handleUpdate(row.id, 'chest', e.target.value, false)} className={microInputCls + " px-1"} />
                  <input type="number" step={isInch ? "0.1" : "0.5"} value={formatDisp(row.waist)} onChange={e => handleUpdate(row.id, 'waist', e.target.value, false)} className={microInputCls + " px-1"} />
                  <input type="number" step={isInch ? "0.1" : "0.5"} value={formatDisp(row.length ?? row.max)} onChange={e => handleUpdate(row.id, 'length', e.target.value, false)} className={microInputCls + " px-1"} />
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400 text-center pt-1 border-t border-slate-800/80">
          💡 مطابقة القياسات المعيارية بالسم أو الإنش تضمن دقة التفصيل وتقليل التعديلات.
        </p>
      </div>
    </div>
  );
}

window.ProductCostingMatrix = ProductCostingMatrix;
window.BOMOperations = ProductCostingMatrix;
