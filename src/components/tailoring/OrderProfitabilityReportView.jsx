// src/components/tailoring/OrderProfitabilityReportView.jsx
// تقرير ربحية أوامر التشغيل والتفصيل (GET /api/reports/order-profitability)

function OrderProfitabilityReportView({ dateRange = {}, fmtMoney }) {
  const { useState, useEffect } = React;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemMode, setItemMode] = useState('');
  const [materialSource, setMaterialSource] = useState('');

  const fmt = fmtMoney || ((n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

  const fetchReport = async () => {
    if (!window.TailoringAPI?.getOrderProfitability) return;
    setLoading(true);
    try {
      const res = await window.TailoringAPI.getOrderProfitability({
        date_from: dateRange?.start || '',
        date_to: dateRange?.end || '',
        item_mode: itemMode,
        material_source: materialSource,
      });
      setData(res?.data || res);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [dateRange?.start, dateRange?.end, itemMode, materialSource]);

  const totals = data?.totals || {};
  const byMat = data?.summary_by_material_source || {};
  const cmtBucket = byMat.CUSTOMER_CMT || { count: 0, net_sales_price: 0, total_cost: 0, net_profit: 0, margin_pct: 0 };
  const fullSaleSales = (byMat.WORKSHOP_STOCK?.net_sales_price || 0) + (byMat.BUY_TO_ORDER?.net_sales_price || 0);
  const fullSaleProfit = (byMat.WORKSHOP_STOCK?.net_profit || 0) + (byMat.BUY_TO_ORDER?.net_profit || 0);
  const fullSaleCount = (byMat.WORKSHOP_STOCK?.count || 0) + (byMat.BUY_TO_ORDER?.count || 0);
  const items = Array.isArray(data?.items) ? data.items : [];

  const selectCls = "h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold outline-none";

  return (
    <div className="space-y-3 text-right" dir="rtl">
      <div className="bg-white dark:bg-[#111C38] p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select value={itemMode} onChange={e => setItemMode(e.target.value)} className={selectCls}>
            <option value="">كل أنماط البنود</option>
            <option value="CATALOG_MTO">موديل كتالوج (CATALOG_MTO)</option>
            <option value="CUSTOM_BESPOKE">تصميم خاص (CUSTOM_BESPOKE)</option>
            <option value="READY_STOCK">جاهز من المخزن (READY_STOCK)</option>
          </select>
          <select value={materialSource} onChange={e => setMaterialSource(e.target.value)} className={selectCls}>
            <option value="">كل مصادر القماش</option>
            <option value="WORKSHOP_STOCK">مخزون الورشة</option>
            <option value="BUY_TO_ORDER">شراء خاص (BTO)</option>
            <option value="CUSTOMER_CMT">قماش العميل (CMT)</option>
          </select>
        </div>
        <button type="button" onClick={fetchReport} className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer">تحديث التقرير</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي أوامر التشغيل ({totals.count || 0})</div>
          <div className="text-base font-black font-mono text-slate-900 dark:text-white">{fmt(totals.net_sales_price)}</div>
          <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">صافي الربح: {fmt(totals.net_profit)} ({totals.margin_pct || 0}%)</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#111C38] border border-teal-200 dark:border-teal-800/50 space-y-1">
          <div className="text-[11px] font-bold text-teal-700 dark:text-teal-300">البيع الكامل (مخزون + BTO) ({fullSaleCount})</div>
          <div className="text-base font-black font-mono text-slate-900 dark:text-white">{fmt(fullSaleSales)}</div>
          <div className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold">صافي الربح: {fmt(fullSaleProfit)}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#111C38] border border-amber-200 dark:border-amber-800/50 space-y-1">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">خدمة الخياطة بقماش العميل CMT ({cmtBucket.count || 0})</div>
          <div className="text-base font-black font-mono text-slate-900 dark:text-white">{fmt(cmtBucket.net_sales_price)}</div>
          <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">صافي الربح: {fmt(cmtBucket.net_profit)} ({cmtBucket.margin_pct || 0}%)</div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111C38] rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead className="bg-slate-50 dark:bg-[#0F172A] text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-2.5">الطلب / التشغيل</th><th className="p-2.5">العميل</th><th className="p-2.5">التصميم</th><th className="p-2.5">النمط</th><th className="p-2.5">القماش</th><th className="p-2.5 text-center">سعر البيع</th><th className="p-2.5 text-center">التكلفة الفعلية</th><th className="p-2.5 text-center">صافي الربح</th><th className="p-2.5 text-center">الهامش %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan="9" className="p-6 text-center text-slate-400">جاري تحميل بيانات الربحية...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="9" className="p-6 text-center text-slate-400">لا توجد أوامر مطابقة للفلاتر المحددة</td></tr>
            ) : items.map((r, idx) => (
              <tr key={r.production_order_id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-2 font-mono font-bold text-slate-900 dark:text-white">{r.order_no} <span className="text-[10px] text-slate-400 block">{r.production_order_no}</span></td>
                <td className="p-2">{r.customer_name || '—'}</td>
                <td className="p-2 font-semibold">{r.design_name || '—'}</td>
                <td className="p-2 text-[11px]">{r.item_mode}</td>
                <td className="p-2 text-[11px]">{r.material_source}</td>
                <td className="p-2 text-center font-mono">{fmt(r.net_sales_price)}</td>
                <td className="p-2 text-center font-mono text-rose-600 dark:text-rose-400">{fmt(r.total_cost)}</td>
                <td className={`p-2 text-center font-mono font-bold ${r.net_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmt(r.net_profit)}</td>
                <td className="p-2 text-center font-mono font-bold">{r.margin_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.OrderProfitabilityReportView = OrderProfitabilityReportView;
