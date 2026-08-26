const { useState, useMemo } = React;

function Dashboard({ setActiveTab, orders = [], accounts = [], journal = [], vouchers = [], purchases = [], expenses = [], currency = { display: 'YER ﷼', symbol: '﷼', code: 'YER' } }) {
  const targetCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currency?.code || currency?.display || 'YER') : 'YER';

  // Helper to convert an amount to current active currency
  const toCurr = (amount, origCurr, rate) => {
    const num = parseFloat(amount) || 0;
    if (!window.CurrencyService) return num;
    const c = window.CurrencyService.normalizeCode(origCurr || 'YER');
    const base = window.CurrencyService.toBase(num, c, rate).base_amount;
    return window.CurrencyService.fromBase(base, targetCode);
  };

  // Dynamic Chart of Accounts & Treasury calculation (exact sync with Accounts feature)
  const { cashBalance, bankBalance, totalTreasuryBalance } = useMemo(() => {
    const jList = Array.isArray(journal) ? journal : [];
    const accList = Array.isArray(accounts) ? accounts : [];

    // Calculate dynamic ledger balance for each account in YER base
    const accountBalances = {};

    accList.forEach(a => {
      const code = String(a.code || a.acc_code || a.id || '').trim();
      const openingBal = parseFloat(a.opening_balance || a.open_bal || 0.0);
      const nature = a.nature || (['خصوم', 'حقوق ملكية', 'إيرادات'].includes(a.account_type) ? 'credit' : 'debit');

      let totalDebit = 0.0;
      let totalCredit = 0.0;
      let hasMovements = false;

      jList.forEach(j => {
        const dStr = String(j.debit || j.debit_account_id || '').trim();
        const cStr = String(j.credit || j.credit_account_id || '').trim();
        const baseAmt = parseFloat(j.base_amount) || ((parseFloat(j.amount) || 0) * (parseFloat(j.exchange_rate) || 1.0));

        const matchesDebit = dStr === code || dStr === String(a.id) || dStr.startsWith(code + ' ') || dStr.startsWith(code + '-') || (a.name && dStr.includes(a.name));
        const matchesCredit = cStr === code || cStr === String(a.id) || cStr.startsWith(code + ' ') || cStr.startsWith(code + '-') || (a.name && cStr.includes(a.name));

        if (matchesDebit) {
          totalDebit += baseAmt;
          hasMovements = true;
        }
        if (matchesCredit) {
          totalCredit += baseAmt;
          hasMovements = true;
        }
      });

      let calculatedBal = 0.0;
      if (hasMovements) {
        calculatedBal = nature === 'credit' ? (openingBal + (totalCredit - totalDebit)) : (openingBal + (totalDebit - totalCredit));
      } else {
        calculatedBal = parseFloat(a.balance || a.current_balance || openingBal) || 0.0;
      }

      accountBalances[code] = calculatedBal;
      if (a.id) accountBalances[String(a.id)] = calculatedBal;
    });

    // 1. Cash Balance: Sum all accounts matching code 101 or 101.* (e.g. 101, 101.01, 101.02, 101.2, 101.3)
    const cashChildAccs = accList.filter(a => {
      const code = String(a.code || a.acc_code || '');
      return code.startsWith('101.') && code !== '101';
    });

    let totalCash = 0.0;
    if (cashChildAccs.length > 0) {
      let subSum = 0.0;
      let hasSubMovements = false;
      cashChildAccs.forEach(ca => {
        const code = String(ca.code || ca.acc_code || '');
        const b = (accountBalances[code] || 0.0);
        subSum += b;
        if (b !== 0) hasSubMovements = true;
      });
      totalCash = hasSubMovements ? subSum : (accountBalances['101'] !== undefined ? accountBalances['101'] : subSum);
    } else {
      totalCash = accountBalances['101'] || 0.0;
    }

    // 2. Bank Balance: Sum all accounts matching code 103 or 103.*
    const bankChildAccs = accList.filter(a => {
      const code = String(a.code || a.acc_code || '');
      return code.startsWith('103.') && code !== '103';
    });

    let totalBank = 0.0;
    if (bankChildAccs.length > 0) {
      let subSum = 0.0;
      let hasSubMovements = false;
      bankChildAccs.forEach(ba => {
        const code = String(ba.code || ba.acc_code || '');
        const b = (accountBalances[code] || 0.0);
        subSum += b;
        if (b !== 0) hasSubMovements = true;
      });
      totalBank = hasSubMovements ? subSum : (accountBalances['103'] !== undefined ? accountBalances['103'] : subSum);
    } else {
      totalBank = accountBalances['103'] || 0.0;
    }

    // Convert from YER base to active currency
    const cBal = toCurr(totalCash, 'YER', 1.0);
    const bBal = toCurr(totalBank, 'YER', 1.0);

    return {
      cashBalance: cBal,
      bankBalance: bBal,
      totalTreasuryBalance: cBal + bBal
    };
  }, [accounts, journal, targetCode]);

  // Key Financial & Operational Aggregations
  const totalSales = orders.reduce((sum, o) => sum + toCurr(o.total || o.total_amount, o.currency, o.exchange_rate), 0);
  const totalPaid = orders.reduce((sum, o) => sum + toCurr(o.paid || o.paid_amount, o.currency, o.exchange_rate), 0);
  const totalRemaining = orders.reduce((sum, o) => sum + toCurr(o.remaining || o.remaining_amount || ((parseFloat(o.total || 0) - parseFloat(o.paid || 0))), o.currency, o.exchange_rate), 0);
  const totalProfit = orders.reduce((sum, o) => sum + (toCurr(o.total || o.total_amount, o.currency, o.exchange_rate) * 0.35), 0);

  const activeProductionCount = orders.filter(o => {
    const st = String(o.status || '');
    return st.includes('خياطة') || st.includes('قص') || st.includes('تطريز') || st.includes('تجهيز');
  }).length;

  // Status Distribution
  const statusCounts = orders.reduce((acc, order) => {
    let st = order.status || 'قيد الخياطة 🪡';
    if (typeof st === 'string' && (st.includes('YER') || st.includes('USD'))) {
      st = order[""] || order.currency || 'قيد الخياطة';
    }
    if (!st || typeof st !== 'string') st = 'قيد الخياطة';
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  const BRAND_COLORS = ['#B0005A', '#8F2A87', '#009FAE', '#F28A00', '#007F8C', '#8E0049'];
  const pieData = Object.keys(statusCounts).map((key, i) => ({
    name: key,
    value: statusCounts[key],
    color: BRAND_COLORS[i % BRAND_COLORS.length]
  }));

  // Top Products
  const productCounts = orders.reduce((acc, order) => {
    let pName = order.product_name || order.item_name || '';
    if (!pName && typeof order.qty === 'string' && isNaN(order.qty)) pName = order.qty;
    if (pName) {
      acc[pName] = (acc[pName] || 0) + 1;
    }
    return acc;
  }, {});

  const barData = Object.keys(productCounts)
    .map(key => ({ name: key, value: productCounts[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Late or Urgent Orders
  const urgentOrders = orders
    .filter(o => o.status && !o.status.includes('تسليم') && !o.status.includes('مكتمل'))
    .sort((a, b) => new Date(a.delivery_date || 0) - new Date(b.delivery_date || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* ── Executive Fashion Greeting Banner ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] p-6 md:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#B0005A] via-[#8F2A87] to-[#F28A00] flex items-center justify-center text-white text-2xl shadow-sm shrink-0">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#B0005A] bg-[#FCE8F2] border border-[#F2A4CB]/60 px-2.5 py-0.5 rounded-md">
                لوحة الإدارة التنفيذية
              </span>
              <span className="text-xs text-[#6F6B75] font-medium">الفرع الرئيسي • دار الأزياء</span>
            </div>
            <h1 className="text-2xl font-bold text-[#25232A] mt-1 leading-snug">
              مرحباً بك في مؤسسة الأميرات الصغيرات
            </h1>
            <p className="text-sm font-medium text-[#6F6B75] mt-1">
              متابعة مباشرة ومؤشرات أداء شاملة لخطوط الإنتاج، تفصيل الفساتين، وحركة الخزينة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="bg-[#FAFAFB] border border-[#E8E5EA] px-3.5 py-2 rounded-xl text-xs font-medium text-[#25232A] flex items-center gap-2">
            <span className="text-[#6F6B75]">📅 التاريخ:</span>
            <span className="font-bold text-[#8F2A87] font-mono tabular-nums">{TODAY_STR_DISPLAY}</span>
          </div>
          <button
            onClick={() => setActiveTab('orders')}
            className="px-4 py-2.5 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Icons.Plus className="w-4 h-4" />
            <span>طلب تفصيل جديد</span>
          </button>
        </div>
      </div>

      {/* ── 6 Executive KPI Metric Cards (1.75rem 800 Numerals & Tabular Formatting) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Sales (Teal Positive) */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#009FAE]/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6F6B75]">إجمالي المبيعات</span>
            <div className="w-8 h-8 rounded-xl bg-[#E2F5F7] text-[#009FAE] flex items-center justify-center text-sm font-bold border border-[#C5ECF0]">
              <Icons.ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[1.75rem] font-extrabold font-mono tabular-nums text-[#25232A] leading-tight flex items-baseline">
              <span>{totalSales.toLocaleString('en-US')}</span>
              <span className="text-xs font-medium text-[#6F6B75] mr-1.5 select-none">{currency.display}</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[#007F8C]">
              <Icons.TrendingUp className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">+12.5%</span>
              <span>نشاط الشهر</span>
            </div>
          </div>
        </div>

        {/* 2. Net Profit (Teal/Positive) */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#009FAE]/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6F6B75]">صافي الأرباح</span>
            <div className="w-8 h-8 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-sm font-bold border border-[#C5ECF0]">
              <Icons.TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[1.75rem] font-extrabold font-mono tabular-nums text-[#007F8C] leading-tight flex items-baseline">
              <span>{totalProfit.toLocaleString('en-US')}</span>
              <span className="text-xs font-medium text-[#6F6B75] mr-1.5 select-none">{currency.display}</span>
            </div>
            <div className="text-[11px] text-[#6F6B75] mt-1 flex items-center gap-1">
              <span>هامش ربح تقديري</span>
              <span className="font-mono font-bold text-[#007F8C] tabular-nums">~35%</span>
            </div>
          </div>
        </div>

        {/* 3. Orders Count (Magenta Brand) */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#B0005A]/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6F6B75]">عدد الطلبيات</span>
            <div className="w-8 h-8 rounded-xl bg-[#FCE8F2] text-[#B0005A] flex items-center justify-center text-sm font-bold border border-[#F2A4CB]/60">
              <Icons.Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[1.75rem] font-extrabold font-mono tabular-nums text-[#B0005A] leading-tight flex items-baseline">
              <span>{orders.length.toLocaleString('en-US')}</span>
              <span className="text-xs font-medium text-[#6F6B75] mr-1.5 select-none">طلب</span>
            </div>
            <div className="text-[11px] text-[#6F6B75] mt-1">
              سجل الطلبيات المعتمدة
            </div>
          </div>
        </div>

        {/* 4. Active Atelier Production (Purple Creative) */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#8F2A87]/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6F6B75]">أوامر المعمل والورشة</span>
            <div className="w-8 h-8 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center text-sm font-bold border border-[#E5CEE7]">
              <Icons.Factory className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[1.75rem] font-extrabold font-mono tabular-nums text-[#8F2A87] leading-tight flex items-baseline">
              <span>{activeProductionCount.toLocaleString('en-US')}</span>
              <span className="text-xs font-medium text-[#6F6B75] mr-1.5 select-none">قيد الخياطة</span>
            </div>
            <div className="text-[11px] text-[#8F2A87] font-semibold mt-1">
              خط الإنتاج والتطريز نشط
            </div>
          </div>
        </div>

        {/* 5. Outstanding Balances (Orange Warning) */}
        <div className="bg-white p-4.5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#F28A00]/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6F6B75]">المستحقات المتبقية</span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF1DC] text-[#F28A00] flex items-center justify-center text-sm font-bold border border-[#FFE4B9]">
              <Icons.Vouchers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[1.75rem] font-extrabold font-mono tabular-nums text-[#F28A00] leading-tight flex items-baseline">
              <span>{totalRemaining.toLocaleString('en-US')}</span>
              <span className="text-xs font-medium text-[#6F6B75] mr-1.5 select-none">{currency.display}</span>
            </div>
            <div className="text-[11px] text-[#C97300] font-semibold mt-1">
              تُحصّل عند التسليم
            </div>
          </div>
        </div>

        {/* 6. Cash & Bank Vaults (Teal) */}
        <div 
          onClick={() => setActiveTab && setActiveTab('accounts')}
          className="bg-white p-4.5 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#009FAE]/50 transition-all flex flex-col justify-between cursor-pointer group"
          title="انقر للانتقال إلى شجرة الحسابات المالية"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6F6B75] group-hover:text-[#009FAE] transition">رصيد الخزينة والبنوك</span>
            <div className="w-8 h-8 rounded-xl bg-[#E2F5F7] text-[#009FAE] flex items-center justify-center text-sm font-bold border border-[#C5ECF0]">
              <Icons.Accounts className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-[1.75rem] font-extrabold font-mono tabular-nums leading-tight flex items-baseline ${totalTreasuryBalance < 0 ? 'text-rose-600' : 'text-[#25232A]'}`}>
              <span>{totalTreasuryBalance.toLocaleString('en-US')}</span>
              <span className="text-xs font-medium text-[#6F6B75] mr-1.5 select-none">{currency.display}</span>
            </div>
            <div className="text-[11px] text-[#6F6B75] mt-1 font-mono tabular-nums flex items-center gap-1.5">
              <span className={cashBalance < 0 ? 'text-rose-600 font-bold' : ''}>كاش: {cashBalance.toLocaleString('en-US')}</span>
              <span>|</span>
              <span className={bankBalance < 0 ? 'text-rose-600 font-bold' : ''}>بنك: {bankBalance.toLocaleString('en-US')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Analytics & Fashion Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* توزيع مراحل وحالات الطلبيات */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA] mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#B0005A]" />
              <h3 className="font-bold text-[#25232A] text-sm">مراحل الإنتاج وتوزيع الطلبات</h3>
            </div>
            <span className="text-xs text-[#6F6B75] font-mono">{orders.length} طلب إجمالي</span>
          </div>
          
          {pieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center py-2">
              <div 
                className="w-40 h-40 rounded-full shadow-inner border-4 border-white shrink-0"
                style={{ 
                  background: `conic-gradient(${pieData.map((d, i, arr) => {
                    const total = arr.reduce((s, x) => s + x.value, 0);
                    const startAngle = arr.slice(0, i).reduce((s, x) => s + (x.value/total)*360, 0);
                    const endAngle = startAngle + (d.value/total)*360;
                    return `${d.color} ${startAngle}deg ${endAngle}deg`;
                  }).join(', ')})`
                }}
              />
              <div className="flex flex-col gap-2 bg-[#FAFAFB] p-3.5 rounded-xl border border-[#E8E5EA] w-full sm:w-auto min-w-[200px]">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }}></span>
                      <span className="font-medium text-[#25232A] truncate max-w-[130px]">{d.name}</span>
                    </div>
                    <span className="font-bold font-mono text-[#B0005A]">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-44 text-[#6F6B75] text-xs">لا توجد طلبات مسجلة حالياً</div>
          )}
        </div>

        {/* أكثر الموديلات والتصاميم طلباً */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA] mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#8F2A87]" />
              <h3 className="font-bold text-[#25232A] text-sm">أكثر موديلات الفساتين طلباً</h3>
            </div>
            <span className="text-[11px] text-[#8F2A87] bg-[#F2E7F3] border border-[#E5CEE7] px-2 py-0.5 rounded-md font-semibold">
              Top Haute Couture
            </span>
          </div>

          {barData.length > 0 ? (
            <div className="flex items-end justify-between h-48 gap-3 mt-auto pt-4 border-t border-[#E8E5EA]">
              {barData.map((d) => {
                const max = Math.max(...barData.map(x => x.value));
                const height = max ? (d.value / max) * 100 : 0;
                return (
                  <div key={d.name} className="flex flex-col items-center justify-end w-full group h-full">
                    <span className="text-[10.5px] font-bold font-mono text-[#8F2A87] mb-1.5">{d.value}</span>
                    <div 
                      className="w-full max-w-[44px] bg-[#8F2A87] rounded-t-xl group-hover:bg-[#B0005A] transition-colors shadow-2xs relative overflow-hidden" 
                      style={{ height: `${height}%`, minHeight: '10px' }}
                    />
                    <div className="text-[10px] font-semibold text-[#25232A] mt-2.5 text-center w-full truncate" title={d.name}>{d.name}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-44 text-[#6F6B75] text-xs">لا توجد منتجات مسجلة</div>
          )}
        </div>
      </div>

      {/* ── جدول الطلبيات القريبة والروابط السريعة ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="bg-[#FAFAFB] border-b border-[#E8E5EA] px-5 py-3.5 flex items-center justify-between">
            <h3 className="font-bold text-[#25232A] flex items-center gap-2 text-xs">
              <span className="text-[#F28A00]">⏳</span> مواعيد التسليم القادمة بالورشة
            </h3>
            <span className="text-[11px] text-[#6F6B75] font-mono">{urgentOrders.length} طلبات قادمة</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="px-4 py-3 text-right">رقم الطلب</th>
                  <th className="px-4 py-3 text-right">العميلة</th>
                  <th className="px-4 py-3 text-right">الموديل / الفستان</th>
                  <th className="px-4 py-3 text-right">موعد التسليم</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA]">
                {urgentOrders.length > 0 ? urgentOrders.map((o, i) => (
                  <tr key={i} className="hover:bg-[#FCE8F2]/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#B0005A]">{o.order_no}</td>
                    <td className="px-4 py-3 font-semibold text-[#25232A]">{o.customer_name}</td>
                    <td className="px-4 py-3 text-[#6F6B75] font-medium">{o.product_name}</td>
                    <td className="px-4 py-3 text-[#6F6B75] font-mono">{o.delivery_date ? o.delivery_date.split('T')[0] : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="bg-[#FFF1DC] text-[#C97300] border border-[#FFE4B9] px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-[#6F6B75] font-medium">
                      جميع الطلبيات في مواعيدها ومكتملة بنجاح ✨
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* روابط التنقل السريع */}
        <div className="grid grid-cols-2 gap-3.5">
          {[
            { id: "customers", title: "العملاء و CRM", desc: "المقاسات والملفات", icon: Icons.Users, color: "text-[#B0005A] bg-[#FCE8F2] border-[#F2A4CB]/50" },
            { id: "factory", title: "المعمل والإنتاج", desc: "مراحل الخياطة", icon: Icons.Factory, color: "text-[#8F2A87] bg-[#F2E7F3] border-[#E5CEE7]" },
            { id: "orders", title: "المبيعات والطلبات", desc: "الفواتير والحجوزات", icon: Icons.ShoppingBag, color: "text-[#007F8C] bg-[#E2F5F7] border-[#C5ECF0]" },
            { id: "vouchers", title: "السندات المالية", desc: "سندات القبض والصرف", icon: Icons.Vouchers, color: "text-[#F28A00] bg-[#FFF1DC] border-[#FFE4B9]" }
          ].map((c) => {
            const IconComp = c.icon;
            return (
              <div 
                key={c.id} 
                onClick={() => setActiveTab(c.id)} 
                className="cursor-pointer p-4 rounded-2xl border border-[#E8E5EA] bg-white shadow-2xs hover:border-[#B0005A]/40 hover:shadow-xs transition-all flex flex-col justify-center items-center text-center group"
              >
                <div className={`w-11 h-11 rounded-xl mb-2.5 flex items-center justify-center border transition-all ${c.color}`}>
                  {IconComp && <IconComp className="w-5 h-5" />}
                </div>
                <span className="font-bold text-xs text-[#25232A] mb-0.5">{c.title}</span>
                <span className="text-[10.5px] text-[#6F6B75]">{c.desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

