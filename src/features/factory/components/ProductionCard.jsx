/**
 * ProductionCard.jsx - بطاقة صف أمر التشغيل والمراحل الأربع في جدول الإنتاج
 * Little Princesses ERP - Production Floor Architecture
 */

function ProductionCard({
  f, products = [], stockInflowLoading = {}, setQcModalData, advanceToNextStage, handleFastTrackQc,
  actionLoadingId, handleStockInflow, handleReverseStockInflow, handleOpenDeliveryModal,
  handleReverseDelivery, handleOpenPrintModal, handleOpenJobTicket, setModelPreviewData,
  loadIntoForm, handleDeleteOrder
}) {
  if (!f) return null;
  const orderLabel = f?.order_no || f?.id || '—';
  const isActionLocked = actionLoadingId === orderLabel;
  const isApproved = f?.tailor_status === 'approved' || f?.quality_status === 'passed' || Number(f?.quality_score || 0) >= 4.0;
  const isDelivered = f?.stage === 'تم التسليم ✅' || f?.stage === 'Delivered' || f?.status === 'delivered';
  const isDone = (Number(f?.progress) >= 100) || (f?.stage && f.stage.includes('جاهز')) || isDelivered;
  const isReadyForDelivery = (isDone || f?.status === 'ready_for_delivery') && !isDelivered;
  const isReadyToWear = f?.production_type === 'ready_to_wear' || f?.production_type === 'stock' || (f?.order_no && (String(f.order_no).startsWith('RTW') || String(f.order_no).startsWith('STOCK')));
  const sizeCode = f?.size_code || f?.standard_size || (isReadyToWear ? '6-9Y' : 'مخصص');

  const allProducts = Array.isArray(products) && products.length > 0 ? products : (window.products || []);
  const linkedProduct = Array.isArray(allProducts) ? allProducts.find(p => (f?.product_id && (p.id === f.product_id || p.product_id === f.product_id)) || (p.name && (p.name === f?.product || p.name === f?.product_name)) || (p.model_code && (p.model_code === f?.model_code || p.model_code === f?.product))) : null;
  const prodImg = f?.product_image || f?.image_url || f?.image || f?.items?.[0]?.image || f?.model_details?.image_url || linkedProduct?.image_url || linkedProduct?.image || '';
  const displayProgress = window.FactoryUtils?.calculateDynamicProgress ? window.FactoryUtils.calculateDynamicProgress(f.stage) : (Number(f.progress) || 0);

  const rawStage = String(f?.stage || '');
  const cleanStage = rawStage.replace(/[✂️🪡✨📦📷🧵📊🔍👑🏭⚡✅★]/g, '').trim() || 'قيد التشغيل';
  const isCutting = rawStage.includes('قص');
  const isSewing = rawStage.includes('خياطة');
  const isEmbroidery = rawStage.includes('تطريز') || rawStage.includes('شك');
  const isFinishing = rawStage.includes('تشطيب') || rawStage.includes('فحص');

  const stageIcon = isCutting ? (
    <svg className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400 animate-scissor shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242 3 3 0 014.242 0L12 12zm0 0L9.121 9.121a3 3 0 10-4.242 4.242 3 3 0 004.242 0L12 12z" /></svg>
  ) : isSewing ? (
    <svg className="w-2.5 h-2.5 text-teal-500 dark:text-teal-400 animate-sewing shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 4v16M8 4v16M4 8h16M4 16h16" /></svg>
  ) : isEmbroidery ? (
    <svg className="w-2.5 h-2.5 text-indigo-500 dark:text-indigo-400 animate-embroidery shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
  ) : isFinishing ? (
    <svg className="w-2.5 h-2.5 text-sky-500 dark:text-sky-400 animate-finisher shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ) : (
    <svg className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400 animate-ready shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
  );

  return (
    <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200 dark:border-slate-800/60 text-xs">
      {/* 1. نوع الأمر والهوية - كود الطلب بسطر واحد دون اقتصاص */}
      <td className="w-[155px] py-1.5 px-2 text-right">
        <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
          <span className="font-mono text-slate-800 dark:text-slate-100 font-bold text-[11px] tracking-tight">{orderLabel}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border whitespace-nowrap ${isReadyToWear ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'}`}>
            {isReadyToWear ? 'جاهز' : 'مخصص'}
          </span>
        </div>
        {isReadyToWear ? (
          <div className="text-[10px] font-medium text-cyan-700 dark:text-cyan-300 font-mono truncate">مقاس: {sizeCode}</div>
        ) : (
          <div className="text-[10px] font-semibold text-slate-900 dark:text-slate-100 truncate">{f.child_name ? `الطفلة: ${f.child_name}` : (f.customer_name || f.customer || 'تفصيل مخصص')}</div>
        )}
        <div className="text-[9.5px] text-slate-600 dark:text-slate-300 font-mono truncate">بدء: {f.start_date ? String(f.start_date).slice(0, 10) : '—'}</div>
      </td>

      {/* 2. الموديل والتفاصيل مع دعم جلب الصورة التلقائي */}
      <td className="w-[19%] py-1.5 px-2 text-right">
        <div className="flex items-center gap-1.5">
          {prodImg ? (
            <img src={prodImg} alt={f.product || f.product_name} onClick={() => setModelPreviewData && setModelPreviewData({ isOpen: true, imageUrl: prodImg, modelName: f.product || f.product_name })} className="w-7 h-7 rounded object-cover border border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer hover:border-teal-500 transition shadow-2xs" title="تكبير صورة الموديل" />
          ) : (
            <div className="w-7 h-7 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1 text-[11px] truncate">
              <span className="truncate">{f.product || f.product_name}</span>
              <span className="text-[9.5px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700 font-bold shrink-0">{f.quantity || 1} قط</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {(f.selected_color || f.color || f.dress_color) && (
                <span className="text-[9.5px] bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-1 py-0.2 rounded font-medium border border-teal-200 dark:border-teal-800/60 truncate">{f.selected_color || f.color || f.dress_color}</span>
              )}
              {f.fabric_name && (
                <span className="text-[9.5px] text-slate-600 dark:text-slate-300 font-medium truncate">{f.fabric_name}{f.cut_meters ? ` (${f.cut_meters}م)` : ''}</span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* 3. فريق العمل والمراحل - شبكة مدمجة متراصة */}
      <td className="w-[18%] py-1.5 px-2 text-right">
        <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[9.5px]">
          {[
            { l: 'قص:', n: f.cutter_name, c: 'text-amber-600 dark:text-amber-400' },
            { l: 'خياطة:', n: f.tailor_name || f.tailor, c: 'text-teal-600 dark:text-teal-400' },
            { l: 'تطريز:', n: f.embroiderer_name, c: 'text-indigo-600 dark:text-indigo-400' },
            { l: 'تشطيب:', n: f.finisher_name, c: 'text-sky-600 dark:text-sky-400' },
            { l: 'تغليف:', n: f.packager_name, c: 'text-rose-600 dark:text-rose-400' }
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-0.5 min-w-0">
              <span className={`${r.c} font-bold text-[9px] shrink-0`}>{r.l}</span>
              <span className="text-slate-900 dark:text-slate-100 font-medium truncate text-[9.5px]">{r.n || '—'}</span>
            </div>
          ))}
        </div>
      </td>

      {/* 4. مرحلة ونسبة الإنجاز - خط موحد ناعم وحركات تفاعلية وشريط لمعان */}
      <td className="w-[165px] py-1.5 px-2 text-right">
        <div className="flex items-center justify-between text-[10px] mb-0.5 font-semibold">
          <div className="flex items-center gap-1 font-bold text-slate-900 dark:text-slate-100 truncate">
            {stageIcon}
            <span className="truncate">{cleanStage}</span>
          </div>
          <span className="text-teal-600 dark:text-teal-400 font-mono font-bold shrink-0">{displayProgress}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden" dir="ltr">
          <div className={`h-1 rounded-full transition-all duration-500 ${displayProgress >= 100 || isDone ? 'bg-gradient-to-r from-emerald-500 via-teal-200 to-emerald-500 shimmer-bar' : 'bg-gradient-to-r from-teal-500 to-emerald-400'}`} style={{ width: `${displayProgress}%` }}></div>
        </div>

        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {isApproved ? (
            <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-0.5">
              <svg className="w-2 h-2 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
              <span>معتمدة ({f.quality_score || 5}★)</span>
            </span>
          ) : isReadyForDelivery && (
            <button type="button" disabled={isActionLocked} onClick={() => handleFastTrackQc && handleFastTrackQc(f)}
              className="text-[9px] px-1.5 py-0.2 rounded font-bold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100" title="الاعتماد الفوري للجودة">
              <span>اعتماد الجودة</span>
            </button>
          )}

          {!isDone && (
            <button type="button" disabled={isActionLocked} onClick={() => advanceToNextStage && advanceToNextStage(f)}
              className="text-[9px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-medium px-1.5 py-0.2 rounded transition-all duration-200 hover:scale-105 active:scale-95 border border-indigo-200 dark:border-indigo-800/60 cursor-pointer flex items-center gap-0.5 group/btn">
              <span>التالي</span>
              <svg className="w-2 h-2 transition-transform duration-200 group-hover/btn:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}

          {isReadyToWear && isDone && (!f?.stock_received ? (
            <button type="button" onClick={() => handleStockInflow && handleStockInflow(f)} disabled={isActionLocked || !!stockInflowLoading?.[orderLabel]}
              className="text-[9px] bg-teal-600 hover:bg-teal-700 text-white font-medium px-1.5 py-0.2 rounded transition cursor-pointer">
              <span>توريد</span>
            </button>
          ) : (
            <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/60">بالمخزن</span>
          ))}

          {!isReadyToWear && !isDelivered && (rawStage.includes('جاهز') || isDone) && (isApproved ? (
            <button type="button" disabled={isActionLocked} onClick={() => handleOpenDeliveryModal && handleOpenDeliveryModal(f)}
              className="text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-1.5 py-0.2 rounded transition cursor-pointer shadow-xs">
              <span>تسليم</span>
            </button>
          ) : (
            <span className="text-[9px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/60">بانتظار الجودة</span>
          ))}

          {isDelivered && (
            <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/60">تم التسليم</span>
          )}
        </div>
      </td>

      {/* 5. الوقت المتبقي - عرض موسع لمنع الاقتصاص */}
      <td className="w-[165px] min-w-[150px] py-1.5 px-3 text-center whitespace-nowrap">
        {f.due_date ? (() => {
          const diffDays = Math.ceil((new Date(f.due_date) - new Date()) / (1000 * 60 * 60 * 24)), isOverdue = diffDays < 0;
          return (
            <div className="inline-flex flex-col items-center justify-center w-full gap-0.5 whitespace-nowrap">
              <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded border font-mono whitespace-nowrap ${isOverdue ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70 animate-pulse' : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70'}`}>
                {isOverdue ? `متأخر (${Math.abs(diffDays)} يوم)` : `متبقي ${diffDays} يوم`}
              </span>
              <span className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 font-mono tracking-tight whitespace-nowrap mt-0.5">
                {String(f.due_date).slice(0, 10)}
              </span>
            </div>
          );
        })() : <span className="text-slate-400 font-mono text-[11px]">—</span>}
      </td>

      {/* 6. الإجراءات المدمجة - 3 أزرار خطية هندسية مع حركات تفاعلية ناعمة */}
      <td className="w-[85px] py-1.5 px-2 text-center whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-[#111C38] group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 border-r border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-center gap-1.5">
          <button type="button" onClick={() => loadIntoForm(f)} disabled={isActionLocked} title="تعديل أمر التشغيل"
            className="w-5.5 h-5.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60 rounded transition-all duration-200 hover:scale-115 hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center justify-center shrink-0 group/btn">
            <svg className="w-3 h-3 transition-transform duration-200 group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button type="button" onClick={() => advanceToNextStage(f)} disabled={isDone || isActionLocked} title={isDone ? 'أمر التشغيل مكتمل' : 'تقديم مرحلة الإنتاج التالية'}
            className={`w-5.5 h-5.5 rounded transition-all duration-200 flex items-center justify-center shrink-0 ${isDone || isActionLocked ? 'opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700' : 'cursor-pointer hover:scale-115 hover:-translate-y-0.5 active:scale-95 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 group/btn'}`}>
            <svg className="w-3 h-3 transition-transform duration-200 group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
          <button type="button" onClick={() => handleOpenJobTicket ? handleOpenJobTicket(f) : (handleOpenPrintModal && handleOpenPrintModal(f))} disabled={isActionLocked} title="طباعة كرت الباركود والتذكرة"
            className="w-5.5 h-5.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded transition-all duration-200 hover:scale-115 hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center justify-center shrink-0 group/btn">
            <svg className="w-3 h-3 transition-transform duration-200 group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

window.ProductionCard = ProductionCard;
