/**
 * ProductionCard.jsx - بطاقة صف أمر التشغيل والمراحل الأربع في جدول الإنتاج
 * Little Princesses ERP - Production Floor Architecture
 */

function ProductionCard({
  f,
  stockInflowLoading = {},
  setQcModalData,
  advanceToNextStage,
  handleStockInflow,
  handleReverseStockInflow,
  handleOpenDeliveryModal,
  handleReverseDelivery,
  handleOpenPrintModal,
  handleOpenJobTicket,
  setModelPreviewData,
  loadIntoForm,
  handleDeleteOrder
}) {
  if (!f) return null;
  const orderLabel = f?.order_no || f?.id || '—';
  const isReady = f?.tailor_status === 'ready_for_inspection';
  const isApproved = f?.tailor_status === 'approved';
  const isDelivered = f?.stage === 'تم التسليم ✅' || f?.stage === 'Delivered' || f?.status === 'delivered';
  const isDone = (f?.progress >= 100) || f?.stage === 'جاهز للتسليم 📦' || isDelivered;
  const isReadyToWear = f?.production_type === 'ready_to_wear' || f?.production_type === 'stock' || (f?.order_no && (String(f.order_no).startsWith('RTW') || String(f.order_no).startsWith('STOCK')));
  const sizeCode = f?.size_code || f?.standard_size || (isReadyToWear ? '6-9Y' : 'مخصص');
  const prodImg = f?.product_image || f?.image_url || f?.items?.[0]?.image || '';

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
          <div className="text-[10px] font-medium text-cyan-300 mt-1 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/40 inline-block font-mono">
            مقاس: {sizeCode}
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-100 mt-1">
            {f.child_name ? `👧 الطفلة: ${f.child_name}` : (f.customer_name || f.customer || 'تفصيل مخصص')}
          </div>
        )}

        <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1">
          <span className="text-slate-500">بدء:</span>
          <span>{f.start_date ? String(f.start_date).slice(0, 10) : '—'}</span>
        </div>
      </td>

      {/* 2. الموديل والتفاصيل */}
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          {prodImg ? (
            <img
              src={prodImg}
              alt={f.product || f.product_name}
              onClick={() => setModelPreviewData && setModelPreviewData({ isOpen: true, imageUrl: prodImg, modelName: f.product || f.product_name })}
              className="w-9 h-9 rounded-lg object-cover border border-slate-700/80 shrink-0 cursor-pointer hover:opacity-85 hover:border-rose-500/50 transition-all shadow-sm"
              title="تكبير صورة الموديل"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-base shrink-0 shadow-inner">👗</div>
          )}
          <div>
            <div className="font-semibold text-slate-100 flex items-center gap-1.5 text-xs">
              <span>{f.product || f.product_name}</span>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-300 font-mono px-1.5 py-0.2 rounded font-semibold border border-cyan-500/20">{f.quantity || 1} قط</span>
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
          <div className="flex items-center gap-1.5">
            <span className="text-rose-400 font-semibold text-[10px]">✂️ قص:</span>
            <span className="text-slate-200 font-medium">{f.cutter_name || '—'}</span>
            {f.cutter_wage > 0 && <span className="text-[10px] text-slate-400 font-mono">({f.cutter_wage})</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-rose-400 font-semibold text-[10px]">🪡 خياطة:</span>
            <span className="text-slate-200 font-medium">{f.tailor_name || f.tailor || '—'}</span>
            {f.tailor_wage > 0 && <span className="text-[10px] text-slate-400 font-mono">({f.tailor_wage})</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-purple-400 font-semibold text-[10px]">✨ تطريز:</span>
            <span className="text-slate-200 font-medium">{f.embroiderer_name || '—'}</span>
            {f.embroiderer_wage > 0 && <span className="text-[10px] text-slate-400 font-mono">({f.embroiderer_wage})</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sky-400 font-semibold text-[10px]">🔍 تشطيب:</span>
            <span className="text-slate-200 font-medium">{f.finisher_name || '—'}</span>
            {f.finisher_wage > 0 && <span className="text-[10px] text-slate-400 font-mono">({f.finisher_wage})</span>}
          </div>
        </div>
      </td>

      {/* 4. مرحلة ونسبة الإنجاز */}
      <td className="py-2.5 px-3">
        <div className="flex justify-between text-[11px] mb-1 font-semibold">
          <span className="text-slate-200">{f.stage}</span>
          <span className="text-rose-400 font-mono">{f.progress}%</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-800 overflow-hidden" dir="ltr">
          <div className={`h-1.5 rounded-full transition-all duration-500 ${f.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-pink-500'}`} style={{ width: `${f.progress}%` }}></div>
        </div>

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {isReady && (
            <button onClick={() => setQcModalData({ ...f, score: 5, wage: f.tailor_wage || 500, notes: 'تم فحص المقاسات ومطابقة الموديل بجودة ممتازة وسليم تماماً.' })} className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-2 py-0.5 rounded-md transition cursor-pointer border border-amber-400 animate-pulse shadow-sm">
              <span>⭐ اعتماد الجودة والعمولة</span>
            </button>
          )}
          {isApproved && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-medium px-2 py-0.5 rounded-md border border-emerald-500/20">
              ✅ معتمد ({f.quality_score || 5} ⭐)
            </span>
          )}
          {!isDone && (
            <button onClick={() => advanceToNextStage(f)} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium px-2.5 py-0.5 rounded-md transition border border-slate-700/80 cursor-pointer shadow-xs">
              <span>التالي ⏩</span>
            </button>
          )}

          {isReadyToWear && isDone && (
            !f?.stock_received ? (
              <button type="button" onClick={() => handleStockInflow && handleStockInflow(f)} disabled={!!stockInflowLoading?.[orderLabel]} className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2.5 py-0.5 rounded-md transition cursor-pointer shadow-xs">
                <span>📦 توريد</span>
              </button>
            ) : (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-medium px-2 py-0.5 rounded-md border border-emerald-500/20">✅ بالمخزن</span>
            )
          )}

          {!isReadyToWear && (f.stage === 'جاهز للتسليم 📦' || (isDone && !isDelivered)) && (
            <button type="button" onClick={() => handleOpenDeliveryModal(f)} className="text-[10px] bg-rose-600 hover:bg-rose-500 text-white font-medium px-2.5 py-0.5 rounded-md transition cursor-pointer shadow-xs">
              <span>🛍️ تسليم</span>
            </button>
          )}
        </div>
      </td>

      {/* 5. الوقت المتبقي */}
      <td className="py-2.5 px-3 text-center text-xs whitespace-nowrap">
        {(() => {
          if (!f.due_date) return <span className="text-slate-500 font-mono text-[11px]">—</span>;
          const due = new Date(f.due_date);
          const today = new Date();
          const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
          const isOverdue = diffDays < 0;
          return (
            <div>
              <span className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${isOverdue ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 font-mono'}`}>
                {isOverdue ? `🚨 متأخر (${Math.abs(diffDays)} يوم)` : `⏳ متبقي ${diffDays} يوم`}
              </span>
              <div className="text-[10px] text-slate-400 font-mono mt-1">{String(f.due_date).slice(0, 10)}</div>
            </div>
          );
        })()}
      </td>

      {/* 6. الإجراءات المدمجة */}
      <td className="py-2.5 px-3 text-center whitespace-nowrap sticky left-0 z-10 bg-slate-950/90 group-hover:bg-slate-900 border-r border-slate-800/80">
        <div className="flex items-center justify-center gap-1.5">
          <button type="button" onClick={() => loadIntoForm(f)} title="تعديل أمر التشغيل ✏️"
            className="w-7 h-7 rounded-md bg-slate-800/90 hover:bg-slate-700 text-blue-400 border border-slate-700/80 flex items-center justify-center text-xs transition cursor-pointer font-medium active:scale-95 shadow-xs">
            ✏️
          </button>
          <button type="button" onClick={() => advanceToNextStage(f)} disabled={isDone} title={isDone ? 'أمر التشغيل مكتمل' : 'تقديم مرحلة الإنتاج التالية ⏩'}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs transition font-medium border active:scale-95 shadow-xs ${isDone ? 'opacity-30 cursor-not-allowed bg-slate-900 text-slate-600 border-slate-800' : 'cursor-pointer bg-slate-800/90 hover:bg-slate-700 text-cyan-400 border-slate-700/80'}`}>
            ⏩
          </button>
          <button type="button" onClick={() => handleOpenJobTicket ? handleOpenJobTicket(f) : (handleOpenPrintModal && handleOpenPrintModal(f))} title="طباعة كرت الباركود والتذكرة 🖨️"
            className="w-7 h-7 rounded-md bg-slate-800/90 hover:bg-slate-700 text-rose-400 border border-slate-700/80 flex items-center justify-center text-xs transition cursor-pointer font-medium active:scale-95 shadow-xs">
            🖨️
          </button>
        </div>
      </td>
    </tr>
  );
}

window.ProductionCard = ProductionCard;

