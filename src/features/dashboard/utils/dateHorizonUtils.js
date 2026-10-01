// src/features/dashboard/utils/dateHorizonUtils.js
// وحدة معالجة وفلترة التواريخ المعيارية للوحة القيادة التنفيذية بحسب الفترات الزمنية المختلفة

/**
 * استخراج تفاصيل التاريخ المحلي لمنع انزياحات المنطقة الزمنية (Timezone Offsets)
 * @param {string|Date|number} dateInput 
 * @returns {{year: number, month: number, day: number, dateStr: string, timestamp: number}|null}
 */
const parseLocalDate = (dateInput) => {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    const clean = dateInput.trim().split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const dateObj = new Date(y, m - 1, d, 12, 0, 0);
        return {
          year: y,
          month: m,
          day: d,
          dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          timestamp: dateObj.getTime()
        };
      }
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return {
    year: y,
    month: m,
    day: day,
    dateStr: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    timestamp: d.getTime()
  };
};

/**
 * التحقق مما إذا كان التاريخ يقع ضمن النطاق الزمني المحدد
 * @param {string|Date|number} dateVal 
 * @param {string} horizon ('today' | 'week' | 'month' | 'all')
 * @param {Date} [referenceDate] 
 * @returns {boolean}
 */
const isDateInHorizon = (dateVal, horizon = 'all', referenceDate = new Date()) => {
  if (horizon === 'all' || !horizon) return true;
  const parsed = parseLocalDate(dateVal);
  if (!parsed) return false;

  const ref = parseLocalDate(referenceDate) || {
    year: referenceDate.getFullYear(),
    month: referenceDate.getMonth() + 1,
    day: referenceDate.getDate(),
    dateStr: referenceDate.toISOString().split('T')[0],
    timestamp: referenceDate.getTime()
  };

  if (horizon === 'today') {
    return parsed.dateStr === ref.dateStr;
  }

  if (horizon === 'week') {
    // فترة آخر 7 أيام متضمنة اليوم
    const diffDays = Math.round((ref.timestamp - parsed.timestamp) / (24 * 60 * 60 * 1000));
    return diffDays >= 0 && diffDays <= 7;
  }

  if (horizon === 'month') {
    return parsed.year === ref.year && parsed.month === ref.month;
  }

  return true;
};

/**
 * فلترة مجموعة سجلات بحسب النطاق الزمني المحدد
 * @param {Array} records 
 * @param {string} horizon 
 * @param {Array<string>} [dateFields] 
 * @returns {Array}
 */
const filterRecordsByHorizon = (records = [], horizon = 'all', dateFields = ['order_date', 'date', 'created_at', 'expense_date', 'voucher_date']) => {
  if (!Array.isArray(records) || horizon === 'all') return records || [];
  return records.filter(item => {
    if (!item) return false;
    let dVal = null;
    for (const f of dateFields) {
      if (item[f]) {
        dVal = item[f];
        break;
      }
    }
    if (!dVal) return false;
    return isDateInHorizon(dVal, horizon);
  });
};

/**
 * فلترة حزم بيانات لوحة القيادة بالتزامن
 */
const filterDashboardDatasets = ({ orders = [], expenses = [], journal = [], vouchers = [], factory = [], timeHorizon = 'all' }) => {
  return {
    filteredOrders: filterRecordsByHorizon(orders, timeHorizon, ['order_date', 'date', 'created_at']),
    filteredExpenses: filterRecordsByHorizon(expenses, timeHorizon, ['expense_date', 'date', 'created_at']),
    filteredJournal: filterRecordsByHorizon(journal, timeHorizon, ['entry_date', 'date', 'created_at']),
    filteredVouchers: filterRecordsByHorizon(vouchers, timeHorizon, ['voucher_date', 'date', 'created_at']),
    filteredFactory: filterRecordsByHorizon(factory, timeHorizon, ['order_date', 'date', 'created_at', 'start_date'])
  };
};

if (typeof window !== 'undefined') {
  window.dateHorizonUtils = {
    parseLocalDate,
    isDateInHorizon,
    filterRecordsByHorizon,
    filterDashboardDatasets
  };
}
