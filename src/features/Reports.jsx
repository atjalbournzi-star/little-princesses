const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Reports({ orders = [], expenses = [], showToast, currency }) {
  const currencyDisplay = currency?.display || 'YER ﷼';
  const [dateRange, setDateRange] = useState({ start: '', end: window.TODAY_STR_ISO || new Date().toISOString().split('T')[0] });
  const [reportCurrency, setReportCurrency] = useState(currencyDisplay);

  useEffect(() => {
    if (currency?.display) setReportCurrency(currency.display);
  }, [currency]);

  const targetCode = window.CurrencyService ? window.CurrencyService.normalizeCode(reportCurrency) : 'YER';

  // Convert an item's amount to target report currency via YER base
  const toReportAmount = useCallback((origAmount, itemCurrency, itemRate) => {
    const num = parseFloat(origAmount) || 0;
    if (!window.CurrencyService) return num;
    const curr = window.CurrencyService.normalizeCode(itemCurrency || 'YER');
    const baseObj = window.CurrencyService.toBase(num, curr, itemRate);
    return window.CurrencyService.fromBase(baseObj.base_amount, targetCode);
  }, [targetCode]);

  const filteredOrders = useMemo(() => {
    return (orders || []).filter(o => {
      const d = o.order_date || o.created_at || o.date || '';
      const inStart = !dateRange.start || d >= dateRange.start;
      const inEnd = !dateRange.end || d <= dateRange.end;
      return inStart && inEnd;
    });
  }, [orders, dateRange]);
  
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      const d = e.date || e.created_at || '';
      const inStart = !dateRange.start || d >= dateRange.start;
      const inEnd = !dateRange.end || d <= dateRange.end;
      return inStart && inEnd;
    });
  }, [expenses, dateRange]);

  const totalRev = useMemo(() => {
    return filteredOrders.reduce((sum, o) => {
      const converted = toReportAmount(o.total || o.total_amount, o.currency, o.exchange_rate);
      return sum + converted;
    }, 0);
  }, [filteredOrders, toReportAmount]);

  const totalExp = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => {
      const converted = toReportAmount(e.amount, e.currency, e.exchange_rate);
      return sum + converted;
    }, 0);
  }, [filteredExpenses, toReportAmount]);
  
  const marketingExp = useMemo(() => {
    return filteredExpenses.filter(e => e.exp_category && e.exp_category.includes('تسويق')).reduce((sum, e) => {
      return sum + toReportAmount(e.amount, e.currency, e.exchange_rate);
    }, 0);
  }, [filteredExpenses, toReportAmount]);

  const maintenanceExp = useMemo(() => {
    return filteredExpenses.filter(e => e.exp_category && (e.exp_category.includes('صيانة') || e.exp_category.includes('تشغيل'))).reduce((sum, e) => {
      return sum + toReportAmount(e.amount, e.currency, e.exchange_rate);
    }, 0);
  }, [filteredExpenses, toReportAmount]);
  
  const netProfit = totalRev - totalExp;

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#B0005A] focus:ring-2 focus:ring-[#FCE8F2] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── بطاقة الفلاتر والطباعة ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCE8F2] text-[#B0005A] flex items-center justify-center text-sm font-bold border border-[#F2A4CB]">
              📊
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#25232A]">التقارير المالية والأرباح والخسائر (P&L)</h2>
              <p className="text-[11px] text-[#6F6B75] font-normal">تحليل الإيرادات والمصروفات وصافي الأرباح التقديرية</p>
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
                {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <button onClick={() => window.print()} className="w-full px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#B0005A] hover:bg-[#8E0049] transition shadow-xs flex justify-center items-center gap-2 h-11 cursor-pointer">
                <span>🖨️ طباعة تقرير الأرباح (P&L)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── بطاقات المؤشرات المالية ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <p className="text-xs text-[#6F6B75] font-semibold mb-1">إجمالي إيرادات المبيعات</p>
          <h3 className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] flex items-baseline">
            <span>{totalRev.toLocaleString('en-US')}</span> <span className="text-xs font-medium text-[#6F6B75] mr-1.5 font-sans">{reportCurrency}</span>
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <p className="text-xs text-[#6F6B75] font-semibold mb-1">إجمالي المصروفات (شاملة)</p>
          <h3 className="text-xl font-extrabold font-mono tabular-nums text-[#D64545] flex items-baseline">
            <span>{totalExp.toLocaleString('en-US')}</span> <span className="text-xs font-medium text-[#6F6B75] mr-1.5 font-sans">{reportCurrency}</span>
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] bg-[#FAFAFB]">
          <p className="text-xs text-[#8F2A87] font-bold mb-1 flex justify-between">
            <span>صافي الربح الفعلي</span>
            <span className="text-[10px] bg-[#F2E7F3] text-[#8F2A87] px-2 py-0.5 rounded-full font-mono font-bold tabular-nums">P&L</span>
          </p>
          <h3 className={`text-xl font-extrabold font-mono tabular-nums flex items-baseline ${netProfit >= 0 ? 'text-[#007F8C]' : 'text-[#D64545]'}`}>
            <span>{netProfit.toLocaleString('en-US')}</span> <span className="text-xs font-medium text-[#6F6B75] mr-1.5 font-sans">{reportCurrency}</span>
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <p className="text-xs text-[#6F6B75] font-semibold mb-1">عدد الطلبات المسجلة</p>
          <h3 className="text-xl font-extrabold font-mono tabular-nums text-[#25232A]">
            {filteredOrders.length.toLocaleString('en-US')}
          </h3>
        </div>
      </div>

      {/* ── بطاقات التحليل التفصيلي ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <h4 className="font-bold text-xs text-[#25232A] mb-3 flex items-center gap-1.5">
            <span>📢</span> تحليل مصاريف التسويق والإعلانات
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center bg-[#FAFAFB] p-3 rounded-xl border border-[#E8E5EA]">
              <span className="text-[#6F6B75]">إجمالي الإنفاق الإعلاني:</span>
              <span className="font-bold font-mono text-[#8F2A87]">{marketingExp.toLocaleString()} {reportCurrency}</span>
            </div>
            <div className="flex justify-between items-center bg-[#FAFAFB] p-3 rounded-xl border border-[#E8E5EA]">
              <span className="text-[#6F6B75]">تكلفة الاستحواذ للطلب (CAC):</span>
              <span className="font-bold font-mono text-[#25232A]">{filteredOrders.length > 0 ? (marketingExp / filteredOrders.length).toFixed(2) : 0} {reportCurrency}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <h4 className="font-bold text-xs text-[#25232A] mb-3 flex items-center gap-1.5">
            <span>🛠️</span> تحليل مصاريف الصيانة والتشغيل
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center bg-[#FAFAFB] p-3 rounded-xl border border-[#E8E5EA]">
              <span className="text-[#6F6B75]">إجمالي تكاليف الصيانة والتشغيل:</span>
              <span className="font-bold font-mono text-[#C97300]">{maintenanceExp.toLocaleString()} {reportCurrency}</span>
            </div>
            <div className="flex justify-between items-center bg-[#FAFAFB] p-3 rounded-xl border border-[#E8E5EA]">
              <span className="text-[#6F6B75]">التأثير على صافي الربح:</span>
              <span className="font-bold font-mono text-[#D64545]">-{maintenanceExp > 0 && totalRev > 0 ? ((maintenanceExp / totalRev)*100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
