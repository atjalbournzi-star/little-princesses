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
  const utils = window.FactoryUtils || {};
  const orderLabel = f.order_no || f.id;
  const isReady = f.tailor_status === 'ready_for_inspection';
  const isApproved = f.tailor_status === 'approved';
  const isDelivered = f.stage === 'تم التسليم ✅' || f.stage === 'Delivered';
  const isDone = f.progress >= 100 || f.stage === 'جاهز للتسليم 📦' || isDelivered;
  const isReadyToWear = f.production_type === 'ready_to_wear' || f.production_type === 'stock' || (f.order_no && (String(f.order_no).startsWith('RTW') || String(f.order_no).startsWith('STOCK')));
  const sizeCode = f.size_code || f.standard_size || (isReadyToWear ? '6-9Y' : 'مخصص');
  const prodImg = f.product_image || f.image_url || '';

  return (
    <tr className="group hover:bg-[#FAFAFB] dark:hover:bg-slate-900/60 transition-colors border-b border-[#E8E5EA] dark:border-slate-800">
      {/* 1. نوع الأمر والهوية (بروتوكول خصوصية العملاء) */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-[#8F2A87] dark:text-purple-300 font-mono text-[11.5px]">{orderLabel}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isReadyToWear ? 'bg-blue-50 dark:bg-blue-950/40 text-[#007F8C] dark:text-cyan-300 border border-blue-200 dark:border-blue-800/40' : 'bg-purple-50 dark:bg-purple-950/40 text-[#8F2A87] dark:text-purple-300 border border-[#E5CEE7] dark:border-purple-800/40'}`}>
            {isReadyToWear ? '🏷️ إنتاج جاهز' : '👑 مخصص'}
          </span>
        </div>

        {isReadyToWear ? (
          <div className="text-[11px] font-bold text-[#007F8C] dark:text-cyan-300 mt-1 bg-[#E2F5F7] dark:bg-cyan-950/50 px-2 py-0.5 rounded border border-[#C5ECF0] dark:border-cyan-800/40 inline-block font-mono">
            المقاس: {sizeCode}
          </div>
        ) : (
          <div className="text-[11px] font-bold text-[#25232A] dark:text-white mt-0.5">
            {f.child_name ? `👧 الطفلة: ${f.child_name}` : (f.customer_name || f.customer || 'تفصيل مخصص')}
          </div>
        )}

        <div className="text-[10px] text-[#6F6B75] dark:text-slate-300 font-mono mt-0.5">
          البدء: {f.start_date ? String(f.start_date).slice(0, 10) : '—'}
        </div>
      </td>

      {/* 2. الموديل والتفاصيل مع صورة مصغرة */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {prodImg ? (
            <img
              src={prodImg}
              alt={f.product || f.product_name}
              onClick={() => setModelPreviewData && setModelPreviewData({ isOpen: true, imageUrl: prodImg, modelName: f.product || f.product_name })}
              className="w-9 h-9 rounded-lg object-cover border border-[#E5CEE7] dark:border-slate-700 shrink-0 cursor-pointer hover:opacity-80 transition"
              title="تكبير صورة الموديل"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-[#E5CEE7] dark:border-purple-800/40 flex items-center justify-center text-base shrink-0">👗</div>
          )}
          <div>
            <div className="font-bold text-[#25232A] dark:text-white flex items-center gap-1.5">
              <span>{f.product || f.product_name}</span>
              <span className="text-[10px] bg-[#E2F5F7] dark:bg-cyan-950/50 text-[#007F8C] dark:text-cyan-300 font-mono px-1.5 py-0.5 rounded font-bold border border-cyan-200 dark:border-cyan-800/40">{f.quantity || 1} قط</span>
            </div>
            {f.fabric_name && (
              <div className="text-[10.5px] text-[#6F6B75] dark:text-slate-300 mt-0.5 flex items-center gap-1">
                <span>🧵</span>
                <span className="font-semibold text-[#25232A] dark:text-slate-100">{f.fabric_name}</span>
                {f.cut_meters ? <span className="text-[#8F2A87] dark:text-purple-300 font-mono font-bold">({f.cut_meters} {f.cut_unit || 'متر'})</span> : null}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* 3. فريق العمل والمراحل الأربع */}
      <td className="px-4 py-3">
        <div className="space-y-1 text-[10.5px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8F2A87] dark:text-purple-300 font-bold">✂️ قص:</span>
            <span className="text-[#25232A] dark:text-slate-100 font-semibold">{f.cutter_name || '—'}</span>
            {f.cutter_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] dark:text-slate-300 font-mono">({f.cutter_wage} ر.ي)</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8F2A87] dark:text-purple-300 font-bold">🪡 خياطة:</span>
            <span className="text-[#25232A] dark:text-slate-100 font-semibold">{f.tailor_name || f.tailor || '—'}</span>
            {f.tailor_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] dark:text-slate-300 font-mono">({f.tailor_wage} ر.ي)</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8F2A87] dark:text-purple-300 font-bold">✨ تطريز:</span>
            <span className="text-[#25232A] dark:text-slate-100 font-semibold">{f.embroiderer_name || '—'}</span>
            {f.embroiderer_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] dark:text-slate-300 font-mono">({f.embroiderer_wage} ر.ي)</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#007F8C] dark:text-cyan-300 font-bold">🔍 تشطيب:</span>
            <span className="text-[#25232A] dark:text-slate-100 font-semibold">{f.finisher_name || '—'}</span>
            {f.finisher_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] dark:text-slate-300 font-mono">({f.finisher_wage} ر.ي)</span>}
          </div>
        </div>
      </td>

      {/* 4. مرحلة ونسبة الإنجاز */}
      <td className="px-4 py-3">
        <div className="flex justify-between text-[11px] mb-1 font-semibold">
          <span className="text-[#25232A] dark:text-white font-bold">{f.stage}</span>
          <span className="text-[#8F2A87] dark:text-purple-300 font-mono font-bold">{f.progress}%</span>
        </div>
        <div className="w-full bg-[#FAFAFB] dark:bg-slate-800 rounded-full h-2 border border-[#E8E5EA] dark:border-slate-700" dir="ltr">
          <div className={`h-2 rounded-full transition-all duration-500 ${f.progress >= 100 ? 'bg-[#009FAE]' : 'bg-[#8F2A87]'}`} style={{ width: `${f.progress}%` }}></div>
        </div>

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {isReady && (
            <button onClick={() => setQcModalData({ ...f, score: 5, wage: f.tailor_wage || 500, notes: 'تم فحص المقاسات ومطابقة الموديل بجودة ممتازة وسليم تماماً.' })} className="text-[11px] bg-amber-400 hover:bg-amber-500 text-amber-950 font-black px-2.5 py-1 rounded-lg transition shadow-xs border border-amber-500 cursor-pointer flex items-center gap-1 animate-pulse">
              <span>⭐ اعتماد الجودة والعمولة</span>
            </button>
          )}
          {isApproved && (
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
              <span>✅ معتمد ({f.quality_score || 5} ⭐)</span>
            </span>
          )}
          {!isDone && (
            <button onClick={() => advanceToNextStage(f)} className="text-[11px] bg-[#E2F5F7] dark:bg-cyan-950/40 hover:bg-[#C5ECF0] dark:hover:bg-cyan-900/50 text-[#007F8C] dark:text-cyan-300 font-bold px-2.5 py-1 rounded-lg transition border border-[#C5ECF0] dark:border-cyan-800/40 cursor-pointer flex items-center gap-1">
              <span>المرحلة التالية ⏩</span>
            </button>
          )}

          {isReadyToWear && isDone && (
            !f.stock_received ? (
              <button type="button" onClick={() => handleStockInflow(f)} disabled={stockInflowLoading[orderLabel]} className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer animate-pulse">
                <span>📦 {stockInflowLoading[orderLabel] ? 'جاري التوريد...' : 'توريد للمخزن'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-300">✅ بالمخزن</span>
                <button type="button" onClick={() => handleReverseStockInflow(f)} disabled={stockInflowLoading[orderLabel]} className="text-[10px] text-amber-700 hover:bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 font-bold transition cursor-pointer">↩️ إلغاء</button>
              </div>
            )
          )}

          {!isReadyToWear && (f.stage === 'جاهز للتسليم 📦' || (isDone && !isDelivered)) && (
            <button type="button" onClick={() => handleOpenDeliveryModal(f)} className="text-[11px] bg-gradient-to-r from-[#8F2A87] to-[#B0005A] text-white font-black px-2.5 py-1 rounded-lg transition shadow-xs cursor-pointer">
              <span>🛍️ تسليم للأميرة</span>
            </button>
          )}
          {!isReadyToWear && isDelivered && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] bg-purple-50 text-[#8F2A87] font-bold px-2 py-0.5 rounded-md border border-[#E5CEE7]">👑 تم التسليم</span>
              <button type="button" onClick={() => handleReverseDelivery(f)} className="text-[10px] text-[#6F6B75] hover:bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 font-bold transition cursor-pointer">↩️</button>
            </div>
          )}
        </div>
      </td>

      {/* 5. الوقت المتبقي */}
      <td className="px-4 py-3 text-center text-[11px] whitespace-nowrap text-slate-700 dark:text-slate-200 font-medium">
        {utils.getDaysLeft ? utils.getDaysLeft(f.due_date) : '—'}
        <div className="text-[10px] text-[#6F6B75] dark:text-slate-300 font-mono mt-1">التسليم: {f.due_date ? String(f.due_date).slice(0, 10) : '—'}</div>
      </td>

      {/* 6. الإجراءات (3 أزرار معيارية نظيفة: تعديل المواصفات ✏️، تقديم الإنتاج ⏩، طباعة التذكرة 🖨️) */}
      <td className="px-4 py-3 text-center whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-[#0F172A] group-hover:bg-[#FAFAFB] dark:group-hover:bg-slate-900 shadow-[2px_0_4px_rgba(0,0,0,0.02)] border-r border-[#E8E5EA] dark:border-slate-800">
        <div className="flex items-center justify-center gap-2">
          {/* 1. Edit Specs ✏️ */}
          <button type="button" onClick={() => loadIntoForm(f)} title="تعديل أمر التشغيل والمواصفات ✏️"
            className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-xs transition cursor-pointer shadow-2xs font-bold">
            ✏️
          </button>

          {/* 2. Production Advance ⏩ */}
          <button type="button" onClick={() => advanceToNextStage(f)} disabled={isDone} title={isDone ? 'أمر التشغيل مكتمل' : 'تقديم مرحلة الإنتاج التالية ⏩'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition shadow-2xs font-bold border ${isDone ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700' : 'cursor-pointer bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-[#007F8C] dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50'}`}>
            ⏩
          </button>

          {/* 3. Print Ticket 🖨️ */}
          <button type="button" onClick={() => handleOpenJobTicket ? handleOpenJobTicket(f) : (handleOpenPrintModal && handleOpenPrintModal(f))} title="طباعة كرت الباركود وتذكرة العمل 🖨️"
            className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-[#8F2A87] dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-xs transition cursor-pointer shadow-2xs font-bold">
            🖨️
          </button>
        </div>
      </td>
    </tr>
  );
}

window.ProductionCard = ProductionCard;
