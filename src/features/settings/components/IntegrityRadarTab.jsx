// src/features/settings/components/IntegrityRadarTab.jsx
// رادار السلامة والمطابقة المحاسبية الحي ولوحة إدارة قفل الفترات المالية
// معايير الحوكمة: بدون قيم ثابتة وهمية، وسقف الكود < 220 سطراً
const { useState, useEffect, useCallback } = React;

function IntegrityRadarTab({ showToast }) {
  const [radar, setRadar] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);

  const fetchRadar = useCallback(async () => {
    setLoadingRadar(true);
    try {
      const res = await fetch('/api/audit/integrity').then(r => r.json());
      if (res && res.success) setRadar(res);
      else if (res && res.error) showToast && showToast(res.error, 'error');
    } catch (e) {
      showToast && showToast('تعذر الاتصال بمسار رادار المطابقة', 'error');
    } finally {
      setLoadingRadar(false);
    }
  }, [showToast]);

  const fetchPeriods = useCallback(async () => {
    setLoadingPeriods(true);
    try {
      const res = await fetch('/api/accounting/periods').then(r => r.json());
      if (res && res.success && Array.isArray(res.data)) {
        setPeriods(res.data);
      }
    } catch (e) {
      showToast && showToast('تعذر جلب الفترات المالية', 'error');
    } finally {
      setLoadingPeriods(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRadar();
    fetchPeriods();
  }, [fetchRadar, fetchPeriods]);

  const handleToggleLock = async (p) => {
    const nextLocked = !p.is_locked;
    setTogglingKey(p.period_key);
    try {
      const res = await fetch('/api/accounting/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_key: p.period_key, is_locked: nextLocked })
      }).then(r => r.json());

      if (res && res.success) {
        showToast && showToast(res.message || 'تم تحديث حالة الفترة بنجاح 🔒');
        setPeriods(prev => prev.map(item => item.period_key === p.period_key ? { ...item, is_locked: nextLocked, locked_at: nextLocked ? 'الآن' : null } : item));
        fetchRadar();
      } else {
        showToast && showToast(res?.error || res?.message || 'فشل تحديث الفترة', 'error');
      }
    } catch (e) {
      showToast && showToast('تعذر إرسال أمر إقفال الفترة', 'error');
    } finally {
      setTogglingKey(null);
    }
  };

  const overall = radar?.overall_status || 'HEALTHY';
  const badgeColors = overall === 'HEALTHY'
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    : (overall === 'WARNING' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30');

  return (
    <div className="space-y-2 select-none text-right animate-fadeIn" dir="rtl">
      {/* ── شريط الرادار العلوي ── */}
      <div className="p-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
            📡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">رادار المطابقة والسلامة المحاسبية الحي</h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${badgeColors}`}>
                {overall === 'HEALTHY' ? '🟢 سليم 100% (تطابق تام)' : (overall === 'WARNING' ? '🟡 تنبيه فروقات' : '🔴 خلل توازن')}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">فحص حي ومباشر للمعادلات الذهبية الخمس (بما فيها معيار IAS 2 WIP) من PostgreSQL</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
            {radar?.check_timestamp ? `آخر فحص: ${radar.check_timestamp.slice(11, 19)} UTC` : ''}
          </span>
          <button
            type="button"
            onClick={() => { fetchRadar(); fetchPeriods(); }}
            disabled={loadingRadar}
            className="h-7 px-2.5 text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-md transition cursor-pointer flex items-center gap-1"
          >
            <span className={loadingRadar ? 'animate-spin' : ''}>🔄</span>
            <span>{loadingRadar ? 'جارِ الفحص...' : 'إعادة الفحص'}</span>
          </button>
        </div>
      </div>

      {/* ── بطاقات المعادلات الخمس الذهبية ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-1.5">
        {(radar?.equations || []).map((eq) => {
          const isOk = eq.status === 'HEALTHY';
          return (
            <div key={eq.id} className="p-2 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{eq.title}</span>
                <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${isOk ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 text-rose-600'}`}>
                  {isOk ? 'متزن 🟢' : 'فارق 🔴'}
                </span>
              </div>
              <div className="text-[9.5px] text-slate-500 font-mono truncate" title={eq.formula}>{eq.formula}</div>
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10.5px]">
                <span className="text-slate-500">الفارق الفعلي:</span>
                <span className={`font-mono font-bold ${isOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  {eq.diff.toFixed(2)} {eq.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── لوحة إدارة قفل الفترات المحاسبية ── */}
      <div className="bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🔒</span>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">إدارة قفل وفتح الفترات المحاسبية (Period Lock Shield)</h4>
              <p className="text-[10.5px] text-slate-500">منع ترحيل القيود والسندات في الأشهر المحاسبية المقفلة</p>
            </div>
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
            المقفلة: <span className="font-bold text-rose-600">{periods.filter(p => p.is_locked).length}</span> / {periods.length}
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
          <table className="w-full text-[11px] text-right">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-1.5">الفترة (شهر/سنة)</th>
                <th className="p-1.5">نطاق التاريخ</th>
                <th className="p-1.5">الحالة</th>
                <th className="p-1.5">أُقفل بواسطة</th>
                <th className="p-1.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
              {periods.map((p) => {
                const isLocked = Boolean(p.is_locked);
                const isProcessing = togglingKey === p.period_key;
                return (
                  <tr key={p.period_key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="p-1.5 font-bold text-slate-800 dark:text-slate-200">{p.period_key}</td>
                    <td className="p-1.5 text-slate-600 dark:text-slate-400">{p.start_date} إلى {p.end_date}</td>
                    <td className="p-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${isLocked ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'}`}>
                        {isLocked ? '🔒 مقفلة' : '🔓 مفتوحة للترحيل'}
                      </span>
                    </td>
                    <td className="p-1.5 text-slate-500 text-[10px]">{isLocked ? (p.locked_by || 'المدير') : '—'}</td>
                    <td className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleLock(p)}
                        disabled={isProcessing}
                        className={`px-2 py-0.5 text-[10.5px] font-sans font-medium rounded transition cursor-pointer ${isLocked ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}`}
                      >
                        {isProcessing ? 'جارِ...' : (isLocked ? 'فتح الفترة 🔓' : 'إقفال الفترة 🔒')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

window.IntegrityRadarTab = IntegrityRadarTab;
