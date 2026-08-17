const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Reports({ orders = [], expenses = [], showToast, currency }) {
  const currencyDisplay = currency?.display || 'USD $';
  const [dateRange, setDateRange] = React.useState({ start: '', end: window.TODAY_STR_ISO || new Date().toISOString().split('T')[0] });
  const [reportCurrency, setReportCurrency] = React.useState(currencyDisplay);

  React.useEffect(() => {
    if (currency?.display) setReportCurrency(currency.display);
  }, [currency]);

  // Handle old currencies which might be strings, and normalize to current string format
  const normalizeCurrency = (c) => typeof c === 'object' ? c.display : c;

  const filteredOrders = (orders || []).filter(o => 
    (!o.currency || normalizeCurrency(o.currency) === reportCurrency) && 
    (!dateRange.start || o.order_date >= dateRange.start) && 
    (!dateRange.end || o.order_date <= dateRange.end)
  );
  
  const filteredExpenses = (expenses || []).filter(e => 
    (!e.currency || normalizeCurrency(e.currency) === reportCurrency) && 
    (!dateRange.start || e.date >= dateRange.start) && 
    (!dateRange.end || e.date <= dateRange.end)
  );

  const totalRev = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.total)||0), 0);
  const totalExp = filteredExpenses.reduce((sum, e) => sum + (parseFloat(e.amount)||0), 0);
  
  // -- حساب العائد الحقيقي من الحملات (Marketing ROI Synergy) --
  const marketingExp = filteredExpenses.filter(e => e.exp_category && e.exp_category.includes('تسويق')).reduce((sum, e) => sum + (parseFloat(e.amount)||0), 0);
  const maintenanceExp = filteredExpenses.filter(e => e.exp_category && e.exp_category.includes('صيانة')).reduce((sum, e) => sum + (parseFloat(e.amount)||0), 0);
  
  const netProfit = totalRev - totalExp;

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all outline-none min-h-[42px]";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── بطاقة الفلاتر والطباعة ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-sm font-bold">
              📊
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">التقارير المالية والأرباح والخسائر (P&L)</h2>
              <p className="text-[11px] text-slate-500 font-normal">تحليل الإيرادات والمصروفات وصافي الأرباح التقديرية</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className={labelCls}>من تاريخ 📅</label>
              <input type="date" className={inputCls} value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>إلى تاريخ 📅</label>
              <input type="date" className={inputCls} value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>العملة</label>
              <select className={inputCls} value={reportCurrency} onChange={e => setReportCurrency(e.target.value)}>
                {["USD $", "YER ﷼", "SAR ﷼"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <button onClick={() => window.print()} className="w-full px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 transition shadow-sm flex justify-center items-center gap-2 min-h-[42px] cursor-pointer">
                <span>🖨️ طباعة تقرير الأرباح (P&L)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── بطاقات المؤشرات المالية ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold mb-1">إجمالي إيرادات المبيعات</p>
          <h3 className="text-xl font-bold font-mono text-emerald-600">
            {totalRev.toLocaleString()} <span className="text-xs font-normal text-slate-500">{reportCurrency}</span>
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold mb-1">إجمالي المصروفات (شاملة)</p>
          <h3 className="text-xl font-bold font-mono text-rose-600">
            {totalExp.toLocaleString()} <span className="text-xs font-normal text-slate-500">{reportCurrency}</span>
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm bg-purple-50/30">
          <p className="text-xs text-purple-900 font-bold mb-1 flex justify-between">
            <span>صافي الربح الفعلي</span>
            <span className="text-[10px] bg-purple-200/60 text-purple-900 px-2 py-0.5 rounded-full font-mono font-bold">P&L</span>
          </p>
          <h3 className={`text-xl font-bold font-mono ${netProfit >= 0 ? 'text-purple-800' : 'text-rose-600'}`}>
            {netProfit.toLocaleString()} <span className="text-xs font-normal text-slate-500">{reportCurrency}</span>
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold mb-1">عدد الطلبات المسجلة</p>
          <h3 className="text-xl font-bold font-mono text-slate-800">{filteredOrders.length}</h3>
        </div>
      </div>

      {/* ── بطاقات التحليل التفصيلي ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-xs text-slate-900 mb-3 flex items-center gap-1.5">
            <span>📢</span> تحليل مصاريف التسويق والإعلانات
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-600">إجمالي الإنفاق الإعلاني:</span>
              <span className="font-bold font-mono text-purple-700">{marketingExp.toLocaleString()} {reportCurrency}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-600">تكلفة الاستحواذ للطلب (CAC):</span>
              <span className="font-bold font-mono text-slate-900">{filteredOrders.length > 0 ? (marketingExp / filteredOrders.length).toFixed(2) : 0} {reportCurrency}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-xs text-slate-900 mb-3 flex items-center gap-1.5">
            <span>🛠️</span> تحليل مصاريف الصيانة والتشغيل
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-600">إجمالي تكاليف الصيانة والتشغيل:</span>
              <span className="font-bold font-mono text-amber-700">{maintenanceExp.toLocaleString()} {reportCurrency}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-600">التأثير على صافي الربح:</span>
              <span className="font-bold font-mono text-rose-600">-{maintenanceExp > 0 && totalRev > 0 ? ((maintenanceExp / totalRev)*100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
