/**
 * ProductionCard.jsx - بطاقة صف أمر التشغيل والمراحل الأربع في جدول الإنتاج
 * Little Princesses ERP - Production Floor Architecture
 */

function ProductionCard({
  f, stockInflowLoading = {}, setQcModalData, advanceToNextStage,
  handleFastTrackQc, actionLoadingId, handleStockInflow, handleReverseStockInflow,
  handleOpenDeliveryModal, handleReverseDelivery, handleOpenPrintModal,
  handleOpenJobTicket, setModelPreviewData, loadIntoForm, handleDeleteOrder
}) {
  if (!f) return null;
  const orderLabel = f?.order_no || f?.id || '—';
  const isActionLocked = actionLoadingId === orderLabel;
  const isApproved = f?.tailor_status === 'approved' || f?.quality_status === 'passed' || Number(f?.quality_score || 0) >= 4.0;
  const isDelivered = f?.stage === 'تم التسليم ✅' || f?.stage === 'Delivered' || f?.status === 'delivered';
  const isDone = (Number(f?.progress) >= 100) || f?.stage === 'جاهز للتسليم 📦' || isDelivered;
  const isReadyForDelivery = (f?.stage === 'جاهز للتسليم 📦' || Number(f?.progress) >= 100 || f?.status === 'ready_for_delivery') && !isDelivered;
  const isReadyToWear = f?.production_type === 'ready_to_wear' || f?.production_type === 'stock' || (f?.order_no && (String(f.order_no).startsWith('RTW') || String(f.order_no).startsWith('STOCK')));
  const sizeCode = f?.size_code || f?.standard_size || (isReadyToWear ? '6-9Y' : 'مخصص');
  const prodImg = f?.product_image || f?.image_url || f?.items?.[0]?.image || '';
  const displayProgress = window.FactoryUtils?.calculateDynamicProgress ? window.FactoryUtils.calculateDynamicProgress(f.stage) : (Number(f.progress) || 0);

  return (
    <tr className="group hover:bg-slate-800/50 transition-colors border-b border-slate-800/80 text-xs">
      {/* 1. نوع الأمر والهوية */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-rose-400 font-mono text-xs tabular-nums tracking-wide">{orderLabel}</span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${isReadyToWear ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'}`}>
            {isReadyToWear ? '🏷️ جاهز' : '👑 مخصص'}
          </span>
        </div>
        {isReadyToWear ? (
          <div className="text-[10px] font-medium text-cyan-300 mt-1 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/40 inline-block font-mono">مقاس: {sizeCode}</div>
        ) : (
          <div className="text-xs font-semibold text-slate-100 mt-1">{f.child_name ? `👧 الطفلة: ${f.child_name}` : (f.customer_name || f.customer || 'تفصيل مخصص')}</div>
        )}
        <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1">
          <span className="text-slate-500">بدء:</span><span>{f.start_date ? String(f.start_date).slice(0, 10) : '—'}</span>
        </div>
      </td>

      {/* 2. الموديل والتفاصيل */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          {prodImg ? (
            <img src={prodImg} alt={f.product || f.product_name} onClick={() => setModelPreviewData && setModelPreviewData({ isOpen: true, imageUrl: prodImg, modelName: f.product || f.product_name })} className="w-9 h-9 rounded-lg object-cover border border-slate-700/80 shrink-0 cursor-pointer hover:opacity-85 hover:border-rose-500/50 transition-all shadow-sm" title="تكبير صورة الموديل" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-base shrink-0 shadow-inner">👗</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-100 flex items-center gap-1.5 text-xs flex-wrap">
              <span>{f.product || f.product_name}</span>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-300 font-mono px-1.5 py-0.2 rounded font-semibold border border-cyan-500/20">{f.quantity || 1} قط</span>
              {(f.selected_color || f.color || f.dress_color) && (
                <span className="text-[10px] bg-pink-500/15 text-pink-300 px-1.5 py-0.2 rounded font-semibold border border-pink-500/30">🎨 {f.selected_color || f.color || f.dress_color}</span>
              )}
            </div>
            {f.fabric_name && (
              <div className="text-[10px] text-slate-300 mt-1 flex items-center gap-1">
                <span>🧵</span>
                <span className="font-medium text-slate-300">{f.fabric_name}</span>
                {f.cut_meters ? <span className="text-rose-400 font-mono font-semibold">({f.cut_meters} {f.cut_unit || 'متر'})</span> : null}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* 3. فريق العمل والمراحل */}
      <td className="py-2.5 px-3">
        <div className="space-y-1 text-[11px]">
          {[
            { label: '✂️ قص:', name: f.cutter_name, wage: f.cutter_wage, color: 'text-rose-400' },
            { label: '🪡 خياطة:', name: f.tailor_name || f.tailor, wage: f.tailor_wage, color: 'text-rose-400' },
            { label: '✨ تطريز:', name: f.embroiderer_name, wage: f.embroiderer_wage, color: 'text-purple-400' },
            { label: '🔍 تشطيب:', name: f.finisher_name, wage: f.finisher_wage, color: 'text-sky-400' },
            { label: '📦 تغليف:', name: f.packager_name, wage: f.packager_wage, color: 'text-amber-400' },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className={`${r.color} font-semibold text-[10px]`}>{r.label}</span>
              <span className="text-slate-200 font-medium">{r.name || '—'}</span>
              {Number(r.wage) > 0 && <span className="text-[10px] text-slate-400 font-mono">({r.wage})</span>}
            </div>
          ))}
        </div>
      </td>

      {/* 4. مرحلة ونسبة الإنجاز */}
      <td className="py-2.5 px-3">
        <div className="flex justify-between text-[11px] mb-1 font-semibold">
          <span className="text-slate-200">{f.stage}</span>
          <span className="text-rose-400 font-mono">{displayProgress}%</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-800 overflow-hidden" dir="ltr">
          <div className={`h-1.5 rounded-full transition-all duration-500 ${displayProgress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-pink-500'}`} style={{ width: `${displayProgress}%` }}></div>
        </div>

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {/* اعتماد الجودة الفوري للمدير العام - يظهر حصرياً عند الجاهزية للتسليم وقبل الاعتماد */}
          {isApproved ? (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-medium px-2 py-0.5 rounded-md border border-emerald-500/20">
              ✅ جودة معتمدة ({f.quality_score || 5} ⭐)
            </span>
          ) : (
            isReadyForDelivery && (
              <button
                type="button"
                disabled={isActionLocked}
                onClick={() => handleFastTrackQc && handleFastTrackQc(f)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition cursor-pointer flex items-center gap-1 shadow-sm ${
                  isActionLocked ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 border border-amber-400 animate-pulse'
                }`}
                title="الاعتماد الفوري للجودة للمدير العام"
              >
                <span>👑 الاعتماد الفوري للجودة</span>
              </button>
            )
          )}

          {/* الترقية للمرحلة التالية */}
          {!isDone && (
            <button
              type="button"
              disabled={isActionLocked}
              onClick={() => advanceToNextStage && advanceToNextStage(f)}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-300 font-medium px-2.5 py-0.5 rounded-md transition border border-slate-700/80 cursor-pointer shadow-xs"
            >
              <span>التالي ⏩</span>
            </button>
          )}

          {/* التوريد للجاهز */}
          {isReadyToWear && isDone && (
            !f?.stock_received ? (
              <button
                type="button"
                onClick={() => handleStockInflow && handleStockInflow(f)}
                disabled={isActionLocked || !!stockInflowLoading?.[orderLabel]}
                className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2.5 py-0.5 rounded-md transition cursor-pointer shadow-xs"
              >
                <span>📦 توريد</span>
              </button>
            ) : (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-medium px-2 py-0.5 rounded-md border border-emerald-500/20">✅ بالمخزن</span>
            )
          )}

          {/* التسليم للعميل مشروط باعتماد الجودة */}
          {!isReadyToWear && !isDelivered && (f.stage === 'جاهز للتسليم 📦' || isDone) && (
            isApproved ? (
              <button
                type="button"
                disabled={isActionLocked}
                onClick={() => handleOpenDeliveryModal && handleOpenDeliveryModal(f)}
                className={`text-[10px] bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-medium px-2.5 py-0.5 rounded-md transition cursor-pointer shadow-xs ${
                  !isActionLocked ? 'animate-pulse ring-2 ring-rose-500/40 shadow-rose-500/30' : ''
                }`}
              >
                <span>🛍️ تسليم</span>
              </button>
            ) : (
              <span className="text-[10px] bg-amber-500/10 text-amber-300 font-medium px-2 py-0.5 rounded-md border border-amber-500/20" title="يجب الحصول على اعتماد الجودة أولاً قبل التسليم">
                🔒 بانتظار الجودة
              </span>
            )
          )}

          {isDelivered && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-medium px-2 py-0.5 rounded-md border border-emerald-500/20">
              ✅ تم التسليم
            </span>
          )}
        </div>
      </td>

      {/* 5. الوقت المتبقي */}
      <td className="py-2.5 px-3 text-center text-xs whitespace-nowrap">
        {f.due_date ? (() => {
          const diffDays = Math.ceil((new Date(f.due_date) - new Date()) / (1000 * 60 * 60 * 24)), isOverdue = diffDays < 0;
          return (
            <div>
              <span className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${isOverdue ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 font-mono'}`}>
                {isOverdue ? `🚨 متأخر (${Math.abs(diffDays)} يوم)` : `⏳ متبقي ${diffDays} يوم`}
              </span>
              <div className="text-[10px] text-slate-400 font-mono mt-1">{String(f.due_date).slice(0, 10)}</div>
            </div>
          );
        })() : <span className="text-slate-500 font-mono text-[11px]">—</span>}
      </td>

      {/* 6. الإجراءات المدمجة */}
      <td className="py-2.5 px-3 text-center whitespace-nowrap sticky left-0 z-10 bg-slate-950/90 group-hover:bg-slate-900 border-r border-slate-800/80">
        <div className="flex items-center justify-center gap-1.5">
          <button type="button" onClick={() => loadIntoForm(f)} disabled={isActionLocked} title="تعديل أمر التشغيل ✏️"
            className="w-7 h-7 rounded-md bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 text-blue-400 border border-slate-700/80 flex items-center justify-center text-xs transition cursor-pointer font-medium active:scale-95 shadow-xs">
            ✏️
          </button>
          <button type="button" onClick={() => advanceToNextStage(f)} disabled={isDone || isActionLocked} title={isDone ? 'أمر التشغيل مكتمل' : 'تقديم مرحلة الإنتاج التالية ⏩'}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs transition font-medium border active:scale-95 shadow-xs ${isDone || isActionLocked ? 'opacity-30 cursor-not-allowed bg-slate-900 text-slate-600 border-slate-800' : 'cursor-pointer bg-slate-800/90 hover:bg-slate-700 text-cyan-400 border-slate-700/80'}`}>
            ⏩
          </button>
          <button type="button" onClick={() => handleOpenJobTicket ? handleOpenJobTicket(f) : (handleOpenPrintModal && handleOpenPrintModal(f))} disabled={isActionLocked} title="طباعة كرت الباركود والتذكرة 🖨️"
            className="w-7 h-7 rounded-md bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 text-rose-400 border border-slate-700/80 flex items-center justify-center text-xs transition cursor-pointer font-medium active:scale-95 shadow-xs">
            🖨️
          </button>
        </div>
      </td>
    </tr>
  );
}

window.ProductionCard = ProductionCard;
