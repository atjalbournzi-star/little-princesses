// src/features/dashboard/utils/chartUtils.js
// مساعدات حساب بيانات ورسم المنحنى البياني التفاعلي لمبيعات لوحة القيادة

const calculateTrendPoints = (filteredOrders = [], trendMode = 'daily', targetCode = 'YER', toCurr) => {
  const points = [];
  const dateMap = {};
  const orderDates = [];

  filteredOrders.forEach(o => {
    const dStr = (o.order_date || o.date || o.created_at || '').split('T')[0];
    if (dStr && !orderDates.includes(dStr)) orderDates.push(dStr);
  });
  orderDates.sort();

  const formatLocalYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const now = new Date();
  let startDate, endDate;
  if (orderDates.length > 0) {
    const parseMid = (str) => {
      const parts = str.split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    };
    const first = parseMid(orderDates[0]);
    const last = parseMid(orderDates[orderDates.length - 1]);
    startDate = new Date(first.getTime() - 2 * 24 * 60 * 60 * 1000);
    endDate = new Date(last.getTime() + 2 * 24 * 60 * 60 * 1000);
    const dayDiff = Math.round((endDate - startDate) / (24 * 60 * 60 * 1000));
    if (dayDiff < 7) endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else {
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    startDate = new Date(endDate.getTime() - 13 * 24 * 60 * 60 * 1000);
  }

  const cur = new Date(startDate);
  while (cur <= endDate) {
    const key = formatLocalYMD(cur);
    const label = cur.toLocaleDateString('ar-YE-u-nu-latn', { weekday: 'short', day: 'numeric' });
    dateMap[key] = { date: key, label, sales: 0, count: 0, cumulative: 0 };
    cur.setDate(cur.getDate() + 1);
  }

  filteredOrders.forEach(o => {
    const raw = (o.order_date || o.date || o.created_at || '').split('T')[0];
    const dStr = raw ? raw.trim() : '';
    if (dateMap[dStr]) {
      const val = toCurr ? toCurr(o.total || o.total_amount, o.currency, o.exchange_rate, targetCode) : (parseFloat(o.total) || 0);
      dateMap[dStr].sales += val;
      dateMap[dStr].count += 1;
    }
  });

  let running = 0;
  Object.keys(dateMap).sort().forEach(k => {
    running += dateMap[k].sales;
    dateMap[k].cumulative = running;
    points.push(dateMap[k]);
  });

  const maxVal = Math.max(...points.map(p => trendMode === 'daily' ? p.sales : p.cumulative), 1000);
  return { points, maxVal };
};

const calculateSvgCoordinates = (trendData, trendMode, chartWidth, chartHeight, chartPadding) => {
  const pts = trendData?.points || [];
  if (!pts || pts.length === 0) return { path: '', area: '', dots: [] };

  const usableWidth = chartWidth - chartPadding * 2;
  const usableHeight = chartHeight - chartPadding * 2;
  const max = Math.max(...pts.map(p => trendMode === 'daily' ? p.sales : p.cumulative), 1);

  const coords = pts.map((p, i) => {
    const val = trendMode === 'daily' ? p.sales : p.cumulative;
    const x = chartPadding + (i / (pts.length - 1)) * usableWidth;
    const y = chartHeight - chartPadding - (val / max) * usableHeight;
    return { x, y, ...p, val };
  });

  let path = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i], p1 = coords[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  const area = `${path} L ${coords[coords.length - 1].x} ${chartHeight - chartPadding} L ${coords[0].x} ${chartHeight - chartPadding} Z`;
  return { path, area, dots: coords };
};

if (typeof window !== 'undefined') {
  window.dashboardChartUtils = {
    calculateTrendPoints,
    calculateSvgCoordinates
  };
}
