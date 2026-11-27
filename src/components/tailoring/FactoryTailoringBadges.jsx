// src/components/tailoring/FactoryTailoringBadges.jsx
// شارات الحالات الأربع ومصدر القماش وأزرار إجراءات الورشة السياقية حسب الصلاحيات (RBAC)

function FactoryTailoringBadges({ job, custodyRecord, onOpenAction, onPrintCmtSticker }) {
  if (!job) return null;
  const userRole = String(window.currentUser?.role || window.activeUser?.role || JSON.parse(localStorage.getItem('erp_active_user') || '{}')?.role || 'admin').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('مدير عام') || userRole === 'owner';
  const isWorkshopMgr = isAdmin || userRole.includes('workshop') || userRole.includes('ورشة') || userRole.includes('مشغل');
  const isAccountant = isAdmin || userRole.includes('accountant') || userRole.includes('محاسب');
  const isDataEntry = isAdmin || userRole.includes('data_entry') || userRole.includes('إدخال') || userRole.includes('مبيعات');

  const st = String(job.status || '');
  const isAwaitMeas = st === 'AWAITING_MEASUREMENTS' || String(job.sizing_mode || '') === 'DEFERRED';
  const isAwaitMat = st === 'AWAITING_MATERIAL';
  const isDelivered = st === 'delivered' || st === 'Completed' || String(job.stage || '').includes('تم التسليم');

  const hasBto = isAwaitMat || String(job.material_source || '') === 'BUY_TO_ORDER' || (Array.isArray(job.fabrics_data) && job.fabrics_data.some(x => x?.source === 'BUY_TO_ORDER'));
  const hasCmt = Boolean(custodyRecord) || String(job.material_source || '') === 'CUSTOMER_CMT';
  const isBespoke = String(job.item_mode || '') === 'CUSTOM_BESPOKE' || (!job.product_id && !String(job.order_no || '').startsWith('RTW'));

  const matLabel = hasCmt ? 'قماش عميل CMT' : (hasBto ? 'شراء خاص BTO' : 'مخزون');
  const matCls = hasCmt
    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
    : (hasBto
      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700');

  return (
    <div className="space-y-1 mt-1">
      <div className="flex flex-wrap items-center gap-1">
        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${isBespoke ? 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/60' : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60'}`}>
          {isBespoke ? 'تصميم خاص' : 'MTO'}
        </span>
        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${matCls}`}>{matLabel}</span>
        {isAwaitMeas && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 animate-pulse">بانتظار المقاسات</span>}
        {isAwaitMat && <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 animate-pulse">بانتظار شراء القماش</span>}
      </div>

      {!isDelivered && (
        <div className="flex flex-wrap items-center gap-1">
          {isAwaitMeas && (isWorkshopMgr || isDataEntry) && (
            <button type="button" onClick={() => onOpenAction && onOpenAction('confirm_sizing', job)} className="text-[9px] px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer">تأكيد المقاسات</button>
          )}
          {(hasBto || isWorkshopMgr || isAccountant) && (isWorkshopMgr || isAccountant) && (
            <button type="button" onClick={() => onOpenAction && onOpenAction('bto_purchase', job)} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer">شراء BTO</button>
          )}
          {hasBto && (isWorkshopMgr || isAccountant) && (
            <button type="button" onClick={() => onOpenAction && onOpenAction('bto_leftover', job)} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 font-bold cursor-pointer">ترجيع فائض</button>
          )}
          {!isAwaitMeas && isWorkshopMgr && (
            <button type="button" onClick={() => onOpenAction && onOpenAction('issue_materials', job)} className="text-[9px] px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 font-bold cursor-pointer">صرف خامات</button>
          )}
          {isBespoke && isWorkshopMgr && (
            <button type="button" onClick={() => onOpenAction && onOpenAction('promote_catalog', job)} className="text-[9px] px-1.5 py-0.5 rounded bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-700 font-bold cursor-pointer">ترقية للكتالوج</button>
          )}
          {custodyRecord && onPrintCmtSticker && (
            <button type="button" onClick={() => onPrintCmtSticker(custodyRecord, job)} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold cursor-pointer">ملصق {custodyRecord.custody_no}</button>
          )}
        </div>
      )}
    </div>
  );
}

window.FactoryTailoringBadges = FactoryTailoringBadges;
