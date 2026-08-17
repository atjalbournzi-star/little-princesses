const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Dashboard({ setActiveTab, orders = [], accounts = [], currency = { display: '$' } }) {

  // Calculate statistics
  const cashAcc = accounts.find(a => a.acc_code == 101);
  const bankAcc = accounts.find(a => a.acc_code == 103);
  const cashBalance = cashAcc ? parseFloat(cashAcc.balance) || 0 : 0;
  const bankBalance = bankAcc ? parseFloat(bankAcc.balance) || 0 : 0;

  const totalProfit = orders.reduce((sum, o) => sum + (parseFloat(o.profit) || 0), 0);
  
  // Status Distribution
  const statusCounts = orders.reduce((acc, order) => {
    let st = order.status || 'غير محدد';
    if (typeof st === 'string' && (st.includes('YER') || st.includes('USD') || st.includes('ريال'))) {
      st = order[""] || order.currency || 'غير محدد';
    }
    if (!st || typeof st !== 'string') st = 'غير محدد';
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});
  
  const COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#06b6d4'];
  const pieData = Object.keys(statusCounts).map((key, i) => ({
    name: key,
    value: statusCounts[key],
    color: COLORS[i % COLORS.length]
  }));

  // Top Products
  const productCounts = orders.reduce((acc, order) => {
    let pName = order.product_name;
    if (!pName && typeof order.qty === 'string' && isNaN(order.qty)) {
      pName = order.qty;
    }
    if (!pName) pName = 'غير محدد';
    acc[pName] = (acc[pName] || 0) + 1;
    return acc;
  }, {});
  
  const barData = Object.keys(productCounts)
    .map(key => ({ name: key, value: productCounts[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Late Orders
  const lateOrders = orders
    .filter(o => o.status && o.status.indexOf('تسليم') === -1 && o.status.indexOf('جاهز') === -1)
    .sort((a, b) => new Date(a.delivery_date || 0) - new Date(b.delivery_date || 0))
    .slice(0, 5);

  const cards = [
    { id: "customers", title: "إدارة العملاء", icon: Icons.Users, desc: "سجل المقاسات والفواتير" },
    { id: "factory", title: "متابعة الورشة", icon: Icons.Factory, desc: "خطوط الإنتاج والتسليم" },
    { id: "purchases", title: "المشتريات", icon: Icons.Purchases, desc: "فواتير وموردي الأقمشة" },
    { id: "vouchers", title: "السندات المالية", icon: Icons.Vouchers, desc: "سندات القبض والصرف" }
  ];

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── لوحة الترحيب والمؤشرات العلوية ── */}
      <div className="relative overflow-hidden bg-slate-900 text-white p-6 md:p-7 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                لوحة التحكم الذكية 📊
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-white leading-snug">
              مؤسسة الأميرات الصغيرات — نظرة عامة على الأداء
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              متابعة مالية وإنتاجية فورية لحركة المعرض والورشة وحسابات العملاء
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 shrink-0">
            <span>📅 اليوم:</span>
            <span className="font-mono font-bold text-purple-300">{TODAY_STR_DISPLAY}</span>
          </div>
        </div>
      </div>

      {/* ── كروت الإحصائيات المالية الرئيسية (KPIs) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-purple-200 transition-all">
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-1">رصيد الصندوق الكاش</p>
            <h3 className="text-xl font-bold font-mono text-emerald-600">
              {cashBalance.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-500">{currency.display}</span>
            </h3>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center text-lg font-bold border border-emerald-100">
            💵
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-purple-200 transition-all">
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-1">رصيد البنوك والحوالات</p>
            <h3 className="text-xl font-bold font-mono text-blue-600">
              {bankBalance.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-500">{currency.display}</span>
            </h3>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center text-lg font-bold border border-blue-100">
            🏦
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-purple-200 transition-all">
          <div>
            <p className="text-xs text-slate-500 font-semibold mb-1">إجمالي الأرباح المتوقعة</p>
            <h3 className="text-xl font-bold font-mono text-purple-700">
              {totalProfit.toLocaleString('en-US')} <span className="text-xs font-normal text-slate-500">{currency.display}</span>
            </h3>
          </div>
          <div className="w-11 h-11 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center text-lg font-bold border border-purple-100">
            👑
          </div>
        </div>
      </div>

      {/* ── المخططات البيانية (CSS Charts) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* توزيع حالات الطلبات */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-slate-900 text-xs">نسب وتوزيع مراحل الطلبيات</h3>
            <span className="text-[11px] text-slate-500 font-mono">{orders.length} طلب إجمالي</span>
          </div>
          
          {pieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
              <div 
                className="w-40 h-40 rounded-full shadow-inner border-4 border-white"
                style={{ 
                  background: `conic-gradient(${pieData.map((d, i, arr) => {
                    const total = arr.reduce((s, x) => s + x.value, 0);
                    const startAngle = arr.slice(0, i).reduce((s, x) => s + (x.value/total)*360, 0);
                    const endAngle = startAngle + (d.value/total)*360;
                    return `${d.color} ${startAngle}deg ${endAngle}deg`;
                  }).join(', ')})`
                }}
              ></div>
              <div className="flex flex-col gap-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 w-full sm:w-auto min-w-[170px]">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }}></span>
                      <span className="font-medium text-slate-700">{d.name}</span>
                    </div>
                    <span className="font-bold font-mono text-purple-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-xs font-medium">لا توجد طلبات لعرضها</div>
          )}
        </div>

        {/* أكثر الموديلات طلباً */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-slate-900 text-xs">أكثر الموديلات طلباً (أعلى 5)</h3>
            <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold border border-purple-100">الأكثر مبيعاً</span>
          </div>

          {barData.length > 0 ? (
            <div className="flex items-end justify-between h-48 gap-3 mt-auto pt-4 border-t border-slate-100">
              {barData.map((d) => {
                const max = Math.max(...barData.map(x => x.value));
                const height = max ? (d.value / max) * 100 : 0;
                return (
                  <div key={d.name} className="flex flex-col items-center justify-end w-full group h-full">
                    <span className="text-[10px] font-bold font-mono text-purple-700 mb-1.5">{d.value}</span>
                    <div 
                      className="w-full max-w-[48px] bg-purple-700 rounded-t-lg group-hover:bg-purple-600 transition-colors shadow-2xs relative overflow-hidden" 
                      style={{ height: `${height}%`, minHeight: '8px' }}
                    ></div>
                    <div className="text-[10px] font-semibold text-slate-700 mt-2.5 text-center w-full truncate" title={d.name}>{d.name}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-xs font-medium">لا توجد منتجات لعرضها</div>
          )}
        </div>
      </div>

      {/* ── الطلبات المستعجلة والروابط السريعة ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50/80 border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs">
              <span className="text-amber-500">⏳</span> الطلبات القريبة أو قيد التنفيذ بالورشة
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">{lateOrders.length} طلبات قادمة</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="px-3.5 py-2.5 text-right">رقم الطلب</th>
                  <th className="px-3.5 py-2.5 text-right">العميلة</th>
                  <th className="px-3.5 py-2.5 text-right">الفستان</th>
                  <th className="px-3.5 py-2.5 text-right">تاريخ التسليم</th>
                  <th className="px-3.5 py-2.5 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lateOrders.length > 0 ? lateOrders.map((o, i) => (
                  <tr key={i} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-purple-700 font-bold">{o.order_no}</td>
                    <td className="px-3.5 py-2.5 font-semibold text-slate-800">{o.customer_name}</td>
                    <td className="px-3.5 py-2.5 text-slate-700 font-medium">{o.product_name}</td>
                    <td className="px-3.5 py-2.5 text-slate-500 font-mono text-[11px]">{o.delivery_date ? o.delivery_date.split('T')[0] : '—'}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-semibold">{o.status}</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-medium">لا توجد طلبات متأخرة 🎉 الورشة منتظمة!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* بطاقات التنقل السريع */}
        <div className="grid grid-cols-2 gap-3.5">
          {cards.map((card) => (
            <div key={card.id} onClick={() => setActiveTab(card.id)} 
                 className="cursor-pointer p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-center items-center text-center group">
              <div className="w-10 h-10 bg-purple-50 group-hover:bg-purple-100 text-purple-800 rounded-xl mb-2.5 flex items-center justify-center text-base transition-colors border border-purple-100">
                {typeof card.icon === 'function' ? card.icon() : card.icon}
              </div>
              <span className="font-bold text-xs text-slate-900 mb-0.5">{card.title}</span>
              <span className="text-[10px] text-slate-400 font-normal">{card.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
