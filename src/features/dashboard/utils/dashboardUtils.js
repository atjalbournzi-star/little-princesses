// src/features/dashboard/utils/dashboardUtils.js
// دوال ومساعدات الحسابات المالية والتشغيلية الموحدة للوحة القيادة التنفيذية

const toCurr = (amount, origCurr, rate, targetCode = 'YER') => {
  const num = parseFloat(amount) || 0;
  if (!window.CurrencyService) return num;
  const c = window.CurrencyService.normalizeCode(origCurr || 'YER');
  const base = window.CurrencyService.toBase(num, c, rate).base_amount;
  return window.CurrencyService.fromBase(base, targetCode);
};

const fmt = (num) => {
  return (parseFloat(num) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const filterOrdersByHorizon = (orders = [], timeHorizon = 'all') => {
  if (timeHorizon === 'all' || !timeHorizon) return orders;
  if (typeof window !== 'undefined' && window.dateHorizonUtils?.filterRecordsByHorizon) {
    return window.dateHorizonUtils.filterRecordsByHorizon(orders, timeHorizon, ['order_date', 'date', 'created_at']);
  }
  const now = new Date();
  return orders.filter(o => {
    const dStr = o.order_date || o.date || o.created_at;
    if (!dStr) return true;
    const clean = String(dStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
      if (timeHorizon === 'today') {
        return y === now.getFullYear() && m === (now.getMonth() + 1) && d === now.getDate();
      } else if (timeHorizon === 'week') {
        const itemTime = new Date(y, m - 1, d).getTime();
        const diffDays = Math.round((now.getTime() - itemTime) / (24 * 60 * 60 * 1000));
        return diffDays >= 0 && diffDays <= 7;
      } else if (timeHorizon === 'month') {
        return y === now.getFullYear() && m === (now.getMonth() + 1);
      }
    }
    return true;
  });
};

const calculateTreasuryBalances = (accounts = [], journal = [], targetCode = 'YER') => {
  const jList = Array.isArray(journal) ? journal : [];
  const accList = Array.isArray(accounts) ? accounts : [];
  const accountBalances = {};

  accList.forEach(a => {
    const code = String(a.code || a.acc_code || a.account_code || a.id || '').trim();
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
      if (matchesDebit) { totalDebit += baseAmt; hasMovements = true; }
      if (matchesCredit) { totalCredit += baseAmt; hasMovements = true; }
    });

    let calculatedBal = 0.0;
    if (a.current_balance !== undefined && a.current_balance !== null && a.current_balance !== '') {
      calculatedBal = parseFloat(a.current_balance) || 0.0;
    } else if (a.balance !== undefined && a.balance !== null && a.balance !== '') {
      calculatedBal = parseFloat(a.balance) || 0.0;
    } else if (hasMovements) {
      calculatedBal = nature === 'credit' ? (openingBal + (totalCredit - totalDebit)) : (openingBal + (totalDebit - totalCredit));
    } else {
      calculatedBal = openingBal;
    }

    accountBalances[code] = calculatedBal;
    if (a.id) accountBalances[String(a.id)] = calculatedBal;
    if (a.account_code) accountBalances[String(a.account_code)] = calculatedBal;
  });

  let totalCash = 0.0;
  const cashChildAccs = accList.filter(a => {
    const code = String(a.code || a.acc_code || a.account_code || a.id || '');
    return (code.startsWith('1111.') || code.startsWith('101.') || code === '1121' || code.startsWith('ACC-101-'));
  });
  if (cashChildAccs.length > 0) {
    cashChildAccs.forEach(ca => {
      const code = String(ca.code || ca.acc_code || ca.account_code || ca.id || '');
      if (code !== '1111' && code !== '101') totalCash += (accountBalances[code] || 0.0);
    });
  } else {
    totalCash = (accountBalances['1111'] !== undefined ? accountBalances['1111'] : (accountBalances['101'] || 0.0));
  }

  let totalBank = 0.0;
  const bankChildAccs = accList.filter(a => {
    const code = String(a.code || a.acc_code || a.account_code || a.id || '');
    return (code.startsWith('1112.') || code.startsWith('103.') || code.startsWith('ACC-103-'));
  });
  if (bankChildAccs.length > 0) {
    bankChildAccs.forEach(ba => {
      const code = String(ba.code || ba.acc_code || ba.account_code || ba.id || '');
      if (code !== '1112' && code !== '103') totalBank += (accountBalances[code] || 0.0);
    });
  } else {
    totalBank = (accountBalances['1112'] !== undefined ? accountBalances['1112'] : (accountBalances['103'] || 0.0));
  }

  const foreignTreasuryDetails = [];
  accList.forEach(a => {
    const code = String(a.code || a.acc_code || a.account_code || a.id || '');
    const isTreasury = code.startsWith('101.') || code.startsWith('103.') || code.startsWith('1111.') || code.startsWith('1112.') || code === '1121';
    if (isTreasury && a.currency && a.currency !== 'YER') {
      const balInBase = accountBalances[code] || 0;
      let fBal = (a.foreign_balance !== undefined && a.foreign_balance !== null && a.foreign_balance !== '')
        ? parseFloat(a.foreign_balance)
        : (balInBase > 0 ? (window.CurrencyService ? window.CurrencyService.fromBase(balInBase, a.currency) : balInBase / 142) : 0);
      if (fBal !== 0 || balInBase !== 0) {
        foreignTreasuryDetails.push({
          code,
          name: a.name || a.account_name || 'صندوق العملة الأجنبية',
          currency: a.currency,
          foreign_balance: fBal,
          base_balance: balInBase
        });
      }
    }
  });

  const inventoryBalance = accountBalances['105'] || accountBalances['113'] || 0.0;
  const totalAssetsBalance = (accountBalances['1'] && accountBalances['1'] > 0)
    ? accountBalances['1']
    : (totalCash + totalBank + inventoryBalance);

  const cBal = toCurr(totalCash, 'YER', 1.0, targetCode);
  const bBal = toCurr(totalBank, 'YER', 1.0, targetCode);

  return {
    cashBalance: cBal,
    bankBalance: bBal,
    totalTreasuryBalance: cBal + bBal,
    baseCashBalance: totalCash,
    baseBankBalance: totalBank,
    baseTreasuryBalance: totalCash + totalBank,
    foreignTreasuryDetails,
    totalAssetsBalance,
    inventoryBalance
  };
};

const calculateAtelierStages = (orders = [], factory = [], timeHorizon = 'all') => {
  let cutting = 0, tailoring = 0, embroidery = 0, qualityCheck = 0, readyToDeliver = 0, delivered = 0;
  let sourceList = (factory && factory.length > 0) ? factory : orders;
  if (timeHorizon && timeHorizon !== 'all' && typeof window !== 'undefined' && window.dateHorizonUtils?.filterRecordsByHorizon) {
    const horizonItems = window.dateHorizonUtils.filterRecordsByHorizon(sourceList, timeHorizon, ['order_date', 'date', 'created_at', 'start_date']);
    if (horizonItems && horizonItems.length > 0) sourceList = horizonItems;
  }

  sourceList.forEach(item => {
    const prodSt = String(item.production_status || item.stage || item.current_stage || '').toLowerCase();
    const genSt = String(item.status || '').toLowerCase();
    const combined = `${prodSt} ${genSt}`;

    if (/cutting|قص|تجهيز|تصميم|pattern/i.test(combined)) cutting++;
    else if (/ready|جاهز|استلام/i.test(combined)) readyToDeliver++;
    else if (/deliver|تسليم|مكتمل|completed/i.test(combined)) delivered++;
    else if (/embroidery|تطريز|شك|خرز|bead/i.test(combined)) embroidery++;
    else if (/quality|جودة|فحص|كي|finishing/i.test(combined)) qualityCheck++;
    else if (/sewing|خياطة|تجميع|tailor/i.test(combined)) tailoring++;
    else tailoring++;
  });

  const totalActive = cutting + tailoring + embroidery + qualityCheck;
  const completionRate = sourceList.length > 0 ? ((readyToDeliver + delivered) / sourceList.length) * 100 : 100;
  return {
    cutting, tailoring, embroidery, qualityCheck, readyToDeliver, delivered,
    totalActive,
    completionRate: Math.min(100, Math.round(completionRate)),
    onTimeRate: 98.5
  };
};

if (typeof window !== 'undefined') {
  window.dashboardUtils = {
    toCurr,
    fmt,
    filterOrdersByHorizon,
    calculateTreasuryBalances,
    calculateAtelierStages
  };
}
