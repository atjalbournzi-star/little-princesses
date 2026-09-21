// src/features/reports/hooks/useReportExport.js
const { useCallback } = React;

function useReportExport({
  activeTab, financialSubTab, statementType, selectedLedgerAcc,
  dateRange, reportCurrency, brandProfile, accounts,
  pnlData, balanceSheetData, trialBalanceData, generalLedgerRows,
  cashBankReconciliation, statementData, dailySalesData, modelProfitabilityData,
  productionStats, inventoryStats, inventory, orders, showToast
}) {
  const getTabTitle = useCallback(() => {
    if (activeTab === 'financial') {
      switch (financialSubTab) {
        case 'pnl': return 'قائمة الدخل والأرباح والخسائر (P&L)';
        case 'balance_sheet': return 'الميزانية العمومية والمركز المالي (Balance Sheet)';
        case 'trial_balance': return 'ميزان المراجعة بالمجاميع والأرصدة الختامية';
        case 'general_ledger': {
          const curAcc = (accounts || []).find(a => a.id === selectedLedgerAcc || a.code === selectedLedgerAcc);
          const curName = curAcc ? (curAcc.account_name || curAcc.name || curAcc.name_ar || curAcc.code) : selectedLedgerAcc;
          return `كشف حركة دفتر الأستاذ العام (${curName || selectedLedgerAcc})`;
        }
        case 'statements': {
          if (statementType === 'treasury') return 'مطابقة حركة وأرصدة الصناديق والبنوك والخزائن';
          if (statementType === 'supplier') return 'كشف حساب ومطابقات موردي الأقمشة والذمم الدائنة';
          return 'كشف حساب ومطابقات العميلات والذمم المدينة';
        }
        default: return 'التقرير المالي والمحاسبي';
      }
    }
    if (activeTab === 'orders') return 'تقرير حركة المبيعات والتحصيل وربحية الموديلات';
    if (activeTab === 'production') return 'تقرير إنتاجية المعمل وأجور ومستحقات الفنيين';
    if (activeTab === 'inventory') return 'تقرير حركة واستهلاك المخزون وتنبيهات النواقص';
    return 'التقرير الشامل للمؤسسة';
  }, [activeTab, financialSubTab, statementType, selectedLedgerAcc, accounts]);

  const handleExportExcel = useCallback(() => {
    let tableHtml = '', filename = `${brandProfile?.shortName || 'ERP'}_${activeTab}_${financialSubTab}.xls`;
    const numFmt = "mso-number-format:'\\#\\,\\#\\#0\\.00';";

    if (activeTab === 'financial' && financialSubTab === 'pnl') {
      filename = `قائمة_الدخل_P&L_${reportCurrency.replace(/[^a-zA-Z]/g, '')}.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="3" style="font-size:16px;padding:10px;">${brandProfile?.name} - قائمة الدخل والأرباح (P&L)</th></tr>
        <tr style="background-color:#f9fafb;"><td colspan="3">الفترة: من ${dateRange.start || 'البداية'} إلى ${dateRange.end || 'اليوم'} | العملة: ${reportCurrency}</td></tr>
        <tr><th>كود الحساب</th><th>البند المحاسبي / البيان</th><th>المبلغ (${reportCurrency})</th></tr>
        <tr style="background-color:#f3f4f6;font-weight:bold;"><td colspan="3">1. الإيرادات التشغيلية</td></tr>
        ${pnlData.revAccounts.map(r => `<tr><td style="text-align:center;">${r.code}</td><td>${r.name}</td><td style="text-align:left;${numFmt}">${r.amount}</td></tr>`).join('')}
        <tr style="background-color:#e0f2fe;font-weight:bold;"><td></td><td>إجمالي الإيرادات</td><td style="text-align:left;${numFmt}">${pnlData.totalRevenue}</td></tr>
        <tr style="background-color:#f3f4f6;font-weight:bold;"><td colspan="3">2. تكلفة المبيعات المباشرة (COGS)</td></tr>
        ${pnlData.cogsAccounts.map(c => `<tr><td style="text-align:center;">${c.code}</td><td>${c.name}</td><td style="text-align:left;${numFmt}">${c.amount}</td></tr>`).join('')}
        <tr style="background-color:#fef3c7;font-weight:bold;"><td></td><td>مجمل الربح (${pnlData.grossMarginPct.toFixed(1)}%)</td><td style="text-align:left;${numFmt}">${pnlData.grossProfit}</td></tr>
        <tr style="background-color:#f3f4f6;font-weight:bold;"><td colspan="3">3. المصروفات التشغيلية (OPEX)</td></tr>
        ${pnlData.opexAccounts.map(o => `<tr><td style="text-align:center;">${o.code}</td><td>${o.name}</td><td style="text-align:left;${numFmt}">${o.amount}</td></tr>`).join('')}
        <tr style="background-color:#E2F5F7;font-weight:bold;font-size:14px;color:#007F8C;"><td></td><td>صافي الربح الفعلي (${pnlData.netMarginPct.toFixed(1)}%)</td><td style="text-align:left;${numFmt}">${pnlData.netProfit}</td></tr>`;
    } else if (activeTab === 'financial' && financialSubTab === 'balance_sheet') {
      filename = `الميزانية_العمومية_${reportCurrency.replace(/[^a-zA-Z]/g, '')}.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="3" style="font-size:16px;padding:10px;">${brandProfile?.name} - الميزانية العمومية</th></tr>
        <tr style="background-color:#f3f4f6;font-weight:bold;"><td colspan="3">1. الأصول (Assets)</td></tr>
        ${balanceSheetData.currentAssets.map(a => `<tr><td>${a.code}</td><td>${a.name}</td><td style="${numFmt}">${a.amount}</td></tr>`).join('')}
        ${balanceSheetData.fixedAssets.map(a => `<tr><td>${a.code}</td><td>${a.name}</td><td style="${numFmt}">${a.amount}</td></tr>`).join('')}
        <tr style="background-color:#E2F5F7;font-weight:bold;"><td></td><td>إجمالي الأصول</td><td style="${numFmt}">${balanceSheetData.totalAssets}</td></tr>
        <tr style="background-color:#f3f4f6;font-weight:bold;"><td colspan="3">2. الخصوم وحقوق الملكية</td></tr>
        ${balanceSheetData.currentLiabilities.map(l => `<tr><td>${l.code}</td><td>${l.name}</td><td style="${numFmt}">${l.amount}</td></tr>`).join('')}
        ${balanceSheetData.equityAccounts.map(e => `<tr><td>${e.code}</td><td>${e.name}</td><td style="${numFmt}">${e.amount}</td></tr>`).join('')}
        <tr><td>P&L</td><td>صافي أرباح الفترة</td><td style="${numFmt}">${balanceSheetData.periodProfit}</td></tr>
        <tr style="background-color:#F2E7F3;font-weight:bold;"><td></td><td>إجمالي الخصوم والملكية</td><td style="${numFmt}">${balanceSheetData.totalLiabilitiesAndEquity}</td></tr>`;
    } else if (activeTab === 'financial' && financialSubTab === 'trial_balance') {
      filename = `ميزان_المراجعة_${reportCurrency.replace(/[^a-zA-Z]/g, '')}.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="7">ميزان المراجعة بالمجاميع والأرصدة</th></tr>
        <tr><th>الكود</th><th>الحساب</th><th>رصيد سابق</th><th>مجموع مدين</th><th>مجموع دائن</th><th>رصيد مدين</th><th>رصيد دائن</th></tr>
        ${trialBalanceData.rows.map(r => `<tr><td>${r.code}</td><td>${r.name}</td><td style="${numFmt}">${r.opening_target || 0}</td><td style="${numFmt}">${r.total_debit_target}</td><td style="${numFmt}">${r.total_credit_target}</td><td style="${numFmt}">${r.debit_balance_target}</td><td style="${numFmt}">${r.credit_balance_target}</td></tr>`).join('')}
        <tr style="background-color:#E2F5F7;font-weight:bold;"><td colspan="2">الإجمالي:</td><td style="${numFmt}">${trialBalanceData.grandOpening}</td><td style="${numFmt}">${trialBalanceData.grandDebit}</td><td style="${numFmt}">${trialBalanceData.grandCredit}</td><td style="${numFmt}">${trialBalanceData.grandDebitBal}</td><td style="${numFmt}">${trialBalanceData.grandCreditBal}</td></tr>`;
    } else if (activeTab === 'orders') {
      filename = `حركة_المبيعات_وربحية_الموديلات_${reportCurrency.replace(/[^a-zA-Z]/g, '')}.xls`;
      tableHtml = `
        <tr style="background-color:#8F2A87;color:#ffffff;"><th colspan="6">تقرير حركة المبيعات اليومية</th></tr>
        <tr><th>التاريخ</th><th>عدد الطلبات</th><th>إجمالي المبيعات</th><th>المحصل نقداً</th><th>الآجل المتبقي</th><th>نسبة التحصيل</th></tr>
        ${dailySalesData.days.map(d => `<tr><td>${d.date}</td><td>${d.orderCount}</td><td style="${numFmt}">${d.totalSales}</td><td style="${numFmt}">${d.cashCollected}</td><td style="${numFmt}">${d.creditRemaining}</td><td>${d.collectionRate.toFixed(1)}%</td></tr>`).join('')}
        <tr><td colspan="6" style="height:20px;"></td></tr>
        <tr style="background-color:#8F2A87;color:#ffffff;"><th colspan="6">ربحية الموديلات والفساتين</th></tr>
        <tr><th>الموديل</th><th>التصنيف</th><th>سعر البيع</th><th>إجمالي التكلفة</th><th>مجمل الربح</th><th>الهامش %</th></tr>
        ${modelProfitabilityData.map(m => `<tr><td>${m.name}</td><td>${m.category}</td><td style="${numFmt}">${m.sellingPrice}</td><td style="${numFmt}">${m.totalCost}</td><td style="${numFmt}">${m.profit}</td><td>${m.marginPct.toFixed(1)}%</td></tr>`).join('')}`;
    } else if (activeTab === 'production') {
      filename = `تقرير_إنتاجية_المعمل.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="6">تقرير إنتاجية ومراحل المعمل</th></tr>
        <tr><th>رقم الأمر</th><th>العميل</th><th>الموديل</th><th>المرحلة</th><th>أجر الخياط</th><th>الحالة</th></tr>
        ${(orders || []).slice(0, 100).map(o => `<tr><td>${o.order_no || o.id}</td><td>${o.customer_name || '—'}</td><td>${o.product_name || '—'}</td><td>${o.stage || o.production_status || '—'}</td><td style="${numFmt}">${o.tailor_wage || 0}</td><td>${o.status || '—'}</td></tr>`).join('')}`;
    } else if (activeTab === 'inventory') {
      filename = `تقرير_حركة_المخزون.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="6">تقرير أرصدة وتقييم المخزون</th></tr>
        <tr><th>الصنف</th><th>الفئة</th><th>الكمية المتوفرة</th><th>سعر التكلفة</th><th>القيمة الإجمالية</th><th>حد الطلب</th></tr>
        ${(inventory || []).map(i => `<tr><td>${i.name || i.item_name}</td><td>${i.category || '—'}</td><td>${i.quantity || i.qty || 0}</td><td style="${numFmt}">${i.cost_price || 0}</td><td style="${numFmt}">${(parseFloat(i.quantity || 0) * parseFloat(i.cost_price || 0))}</td><td>${i.min_qty || 5}</td></tr>`).join('')}`;
    } else {
      filename = `تقرير_الدفاتر_والمطابقات.xls`;
      tableHtml = `
        <tr style="background-color:#007F8C;color:#ffffff;"><th colspan="6">دفتر الأستاذ والمطابقات</th></tr>
        <tr><th>التاريخ</th><th>المرجع</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr>
        ${generalLedgerRows.map(r => `<tr><td>${r.date}</td><td>${r.entry_no}</td><td>${r.notes}</td><td style="${numFmt}">${r.debit_target || 0}</td><td style="${numFmt}">${r.credit_target || 0}</td><td style="${numFmt}">${r.running_target || 0}</td></tr>`).join('')}`;
    }

    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"><style>body{font-family:Arial;direction:rtl;}table{border-collapse:collapse;width:100%;direction:rtl;}th{background-color:#007F8C;color:#fff;border:1px solid #ccc;padding:8px;}td{border:1px solid #ccc;padding:6px;}</style></head>
      <body dir="rtl"><table border="1">${tableHtml}</table></body></html>`;

    const blob = new Blob(['\uFEFF' + template], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast(`تم تصدير ملف الإكسل المنسق (${filename}) بنجاح 📊`);
  }, [activeTab, financialSubTab, reportCurrency, brandProfile, dateRange, pnlData, balanceSheetData, trialBalanceData, generalLedgerRows, dailySalesData, modelProfitabilityData, orders, inventory, showToast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return { getTabTitle, handleExportExcel, handlePrint };
}

if (typeof window !== 'undefined') {
  window.useReportExport = useReportExport;
}
