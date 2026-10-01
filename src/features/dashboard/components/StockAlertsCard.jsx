// src/features/dashboard/components/StockAlertsCard.jsx
// بطاقة التنبيهات الذكية لنواقص الأقمشة والمواد ذات الرصيد الحرج وسلاسل الإمداد

function StockAlertsCard({
  inventory = [],
  inventoryBalance = 0,
  currency = { display: 'YER ﷼' },
  fmt = (n) => String(n),
  setActiveTab = () => {}
}) {
  const [localInv, setLocalInv] = React.useState([]);

  React.useEffect(() => {
    if ((!inventory || inventory.length === 0) && typeof window !== 'undefined' && window.inventoryAPI?.getInventory) {
      window.inventoryAPI.getInventory().then(res => {
        if (res && Array.isArray(res.data)) setLocalInv(res.data);
        else if (Array.isArray(res)) setLocalInv(res);
      }).catch(() => {});
    }
  }, [inventory]);

  const effectiveInventory = (Array.isArray(inventory) && inventory.length > 0)
    ? inventory
    : (localInv.length > 0 ? localInv : (typeof window !== 'undefined' && Array.isArray(window.__GLOBAL_INVENTORY__) ? window.__GLOBAL_INVENTORY__ : []));

  const criticalItems = React.useMemo(() => {
    return (effectiveInventory || []).filter(item => {
      const qty = parseFloat(item.available_qty ?? item.quantity ?? item.qty ?? item.current_balance ?? 0);
      const min = parseFloat(item.min_limit ?? item.min_qty ?? item.reorder_level ?? item.alert_threshold ?? 5);
      return qty <= min;
    }).map(item => {
      const qty = parseFloat(item.available_qty ?? item.quantity ?? item.qty ?? item.current_balance ?? 0);
      const min = parseFloat(item.min_limit ?? item.min_qty ?? item.reorder_level ?? item.alert_threshold ?? 5);
      const unit = item.unit || 'متر';
      const isFabric = (item.type || '').toLowerCase().includes('fabric') || (item.category || '').includes('قماش') || (item.name || '').includes('قماش');
      return {
        id: item.id || item.item_code,
        name: item.name || item.item_name || 'صنف مخزني',
        code: item.item_code || item.code || item.id,
        current: `${fmt(qty)} ${unit}`,
        min: `${fmt(min)} ${unit}`,
        icon: isFabric ? '🧵' : (item.category?.includes('إكسسوار') ? '💎' : '📦'),
        isZero: qty <= 0
      };
    });
  }, [effectiveInventory, fmt]);

  const hasShortage = criticalItems.length > 0;

  return (
    <div className="bg-[#111C38] rounded-xl border border-slate-800 shadow-xs p-3.5 flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-2.5">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${hasShortage ? 'animate-pulse' : ''}`}>{hasShortage ? '⚠️' : '✨'}</span>
            <h3 className="font-bold text-xs text-white">
              تنبيهات نواقص الأقمشة والمخزون الحرج
            </h3>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${hasShortage ? 'bg-rose-950 text-rose-300 border border-rose-800/60' : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'}`}>
            {hasShortage ? `${criticalItems.length} تنبيهات` : 'المخزون آمن'}
          </span>
        </div>

        {hasShortage ? (
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {criticalItems.map(item => (
              <div
                key={item.id}
                onClick={() => setActiveTab('inventory')}
                className="p-2 rounded-lg bg-[#0B132B]/80 border border-slate-700/60 flex items-center justify-between hover:border-amber-500/60 cursor-pointer transition"
                title="انقر للانتقال إلى قسم المخزون"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <div className={`font-mono text-xs font-bold ${item.isZero ? 'text-rose-400' : 'text-amber-400'}`}>{item.current}</div>
                  <div className="text-[9.5px] text-slate-400">الحد الأدنى: {item.min}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 px-3 text-center rounded-lg bg-emerald-950/20 border border-emerald-900/40 space-y-1">
            <span className="text-xl block">✨</span>
            <div className="text-xs font-bold text-emerald-300">
              جميع مستويات المخزون آمنة وضمن الحدود المطلوبة ✨
            </div>
            <p className="text-[10px] text-emerald-400/80">
              كافة خامات الأقمشة ومستلزمات الإنتاج أعلى من حد الأمان والطلب الأدنى
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="text-slate-300 text-[11px]">
          <span>قيمة مخزون الأقمشة: </span>
          <span className="font-bold font-mono text-cyan-300">{fmt(inventoryBalance)} {currency.display}</span>
        </div>
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className="text-[11px] font-bold text-cyan-300 hover:underline cursor-pointer"
        >
          إدارة المخزون ↗
        </button>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.StockAlertsCard = StockAlertsCard;
}
