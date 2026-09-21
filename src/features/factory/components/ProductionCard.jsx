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
  loadIntoForm,
  handleDeleteOrder
}) {
  const utils = window.FactoryUtils || {};
  const orderLabel = f.order_no || f.id;
  const isReady = f.tailor_status === 'ready_for_inspection';
  const isApproved = f.tailor_status === 'approved';
  const isDelivered = f.stage === 'تم التسليم ✅' || f.stage === 'Delivered';
  const isDone = f.progress >= 100 || f.stage === 'جاهز للتسليم 📦' || isDelivered;
  const isStockOrder = f.production_type === 'stock' || (f.order_no && String(f.order_no).startsWith('STOCK')) || (!f.customer && !f.customer_name) || f.customer === 'المخزن' || f.customer_name === 'المخزن';

  return (
    <tr className="group hover:bg-[#FAFAFB] transition-colors">
      {/* 1. الطلب والعميلة والطفلة */}
      <td className="px-4 py-3">
        <div className="font-bold text-[#8F2A87] font-mono text-[11.5px]">{orderLabel}</div>
        <div className="text-[11px] font-semibold text-[#25232A] mt-0.5">{f.customer_name || f.customer}</div>
        {(f.child_name || 'هنادي') && (
          <div className="text-[10.5px] text-[#8F2A87] mt-0.5 flex items-center gap-1 font-medium">
            <span>👧 الطفلة:</span>
            <span className="font-bold">{f.child_name || 'هنادي'}</span>
          </div>
        )}
        <div className="text-[10px] text-[#6F6B75] font-mono mt-0.5">
          البدء: {f.start_date ? String(f.start_date).slice(0, 10) : '—'}
        </div>
      </td>

      {/* 2. الموديل والتفاصيل */}
      <td className="px-4 py-3">
        <div className="font-bold text-[#25232A] flex items-center gap-1.5">
          <span>{f.product || f.product_name}</span>
          <span className="text-[10px] bg-[#E2F5F7] text-[#007F8C] font-mono px-1.5 py-0.5 rounded font-bold">{f.quantity || 1} قطعة</span>
        </div>
        {f.fabric_name && (
          <div className="text-[10.5px] text-[#6F6B75] mt-1 flex items-center gap-1">
            <span>🧵 الخامة:</span>
            <span className="font-medium text-[#25232A]">{f.fabric_name}</span>
            {f.cut_meters ? <span className="text-[#8F2A87] font-mono font-bold">({f.cut_meters} {f.cut_unit || 'متر'})</span> : null}
          </div>
        )}
      </td>

      {/* 3. فريق العمل والمراحل الأربع */}
      <td className="px-4 py-3">
        <div className="space-y-1 text-[10.5px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8F2A87] font-bold">✂️ قص:</span>
            <span className="text-[#25232A] font-medium">{f.cutter_name || '—'}</span>
            {f.cutter_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] font-mono">({f.cutter_wage} ر.ي)</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8F2A87] font-bold">🪡 خياطة:</span>
            <span className="text-[#25232A] font-medium">{f.tailor_name || f.tailor || '—'}</span>
            {f.tailor_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] font-mono">({f.tailor_wage} ر.ي)</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#8F2A87] font-bold">✨ تطريز:</span>
            <span className="text-[#25232A] font-medium">{f.embroiderer_name || '—'}</span>
            {f.embroiderer_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] font-mono">({f.embroiderer_wage} ر.ي)</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[#007F8C] font-bold">🔍 تشطيب:</span>
            <span className="text-[#25232A] font-medium">{f.finisher_name || '—'}</span>
            {f.finisher_wage > 0 && <span className="text-[9.5px] text-[#6F6B75] font-mono">({f.finisher_wage} ر.ي)</span>}
          </div>
        </div>
      </td>

      {/* 4. مرحلة ونسبة الإنجاز */}
      <td className="px-4 py-3">
        <div className="flex justify-between text-[11px] mb-1 font-semibold">
          <span className="text-[#25232A] font-bold">{f.stage}</span>
          <span className="text-[#8F2A87] font-mono font-bold">{f.progress}%</span>
        </div>
        <div className="w-full bg-[#FAFAFB] rounded-full h-2 border border-[#E8E5EA]" dir="ltr">
          <div className={`h-2 rounded-full transition-all duration-500 ${f.progress >= 100 ? 'bg-[#009FAE]' : 'bg-[#8F2A87]'}`} style={{width: `${f.progress}%`}}></div>
        </div>

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {isReady && (
            <button onClick={() => setQcModalData({ ...f, score: 5, wage: f.tailor_wage || 5000, notes: 'تم فحص المقاسات ومطابقة الموديل بجودة ممتازة وسليم تماماً.' })} title="الفني أتم العمل وجاهز لفحص واعتماد الجودة والعمولة" className="text-[11px] bg-amber-400 hover:bg-amber-500 text-amber-950 font-black px-2.5 py-1 rounded-lg transition shadow-xs border border-amber-500 cursor-pointer flex items-center gap-1 animate-pulse">
              <span>⭐ اعتماد الجودة والعمولة</span>
            </button>
          )}
          {isApproved && (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
              <span>✅ معتمد ({f.quality_score || 5} ⭐)</span>
            </span>
          )}
          {!isDone && (
            <button onClick={() => advanceToNextStage(f)} title="ترقية الطلب للمرحلة التالية" className="text-[11px] bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] font-bold px-2.5 py-1 rounded-lg transition border border-[#C5ECF0] cursor-pointer flex items-center gap-1">
              <span>المرحلة التالية ⏩</span>
            </button>
          )}

          {isStockOrder && isDone && (
            !f.stock_received ? (
              <button type="button" onClick={() => handleStockInflow(f)} disabled={stockInflowLoading[orderLabel]} className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2.5 py-1 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer animate-pulse" title="توريد للمخزن واحتساب تكلفة القماش وأجور الفنيين آلياً">
                <span>📦 {stockInflowLoading[orderLabel] ? 'جاري التوريد...' : 'توريد للمخزن والتكلفة'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-300">✅ بالمخزن</span>
                <button type="button" onClick={() => handleReverseStockInflow(f)} disabled={stockInflowLoading[orderLabel]} className="text-[10px] text-amber-700 hover:bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 font-bold transition cursor-pointer" title="إلغاء التوريد وعكس حركة المخزن">↩️ إلغاء</button>
              </div>
            )
          )}

          {!isStockOrder && (f.stage === 'جاهز للتسليم 📦' || (isDone && !isDelivered)) && (
            <button type="button" onClick={() => handleOpenDeliveryModal(f)} className="text-[11px] bg-gradient-to-r from-[#8F2A87] to-[#B0005A] hover:opacity-95 text-white font-black px-2.5 py-1 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer" title="تسليم الفستان للأميرة وتحصيل المتبقي وقيد سند القبض المالي">
              <span>🛍️ تسليم للأميرة وتحصيل</span>
            </button>
          )}
          {!isStockOrder && isDelivered && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] bg-purple-50 text-[#8F2A87] font-bold px-2 py-0.5 rounded-md border border-[#E5CEE7]">👑 تم التسليم</span>
              <button type="button" onClick={() => handleReverseDelivery(f)} className="text-[10px] text-[#6F6B75] hover:bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 font-bold transition cursor-pointer" title="إلغاء التسليم وإعادة الطلب للجاهز">↩️</button>
            </div>
          )}
        </div>
      </td>

      {/* 5. الوقت المتبقي */}
      <td className="px-4 py-3 text-center text-[11px] whitespace-nowrap">
        {utils.getDaysLeft ? utils.getDaysLeft(f.due_date) : '—'}
        <div className="text-[10px] text-[#6F6B75] font-mono mt-1">التسليم: {f.due_date ? String(f.due_date).slice(0, 10) : '—'}</div>
      </td>

      {/* 6. الإجراءات */}
      <td className="px-4 py-3 text-center whitespace-nowrap sticky left-0 z-10 bg-white group-hover:bg-[#FAFAFB] shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-center gap-1.5">
          {isStockOrder && isDone && !f.stock_received && (
            <button type="button" onClick={() => handleStockInflow(f)} disabled={stockInflowLoading[orderLabel]} title="توريد القطع للمخزن 📦" className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 flex items-center justify-center text-xs transition cursor-pointer shadow-2xs animate-pulse">📦</button>
          )}
          {!isStockOrder && (f.stage === 'جاهز للتسليم 📦' || (isDone && !isDelivered)) && (
            <button type="button" onClick={() => handleOpenDeliveryModal(f)} title="تسليم فستان الأميرة 🛍️" className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#8F2A87] to-[#B0005A] hover:opacity-95 text-white flex items-center justify-center text-xs transition cursor-pointer shadow-2xs">🛍️</button>
          )}
          <button type="button" onClick={() => handleOpenPrintModal(f)} title="طباعة بطاقة التشغيل 📋" className="w-8 h-8 rounded-lg bg-[#F2E7F3] hover:bg-[#E5CEE7] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xs transition cursor-pointer shadow-2xs">📋</button>
          <a href={`/job_card.html?id=${encodeURIComponent(orderLabel)}`} target="_blank" rel="noopener noreferrer" title="فتح بطاقة الجوال 📱" className="w-8 h-8 rounded-lg bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-xs transition cursor-pointer shadow-2xs">📱</a>
          <button type="button" onClick={() => utils.sendWhatsAppToTailor && utils.sendWhatsAppToTailor(f)} title="إرسال واتساب للفني 📲" className="w-8 h-8 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] border border-[#25D366]/30 flex items-center justify-center text-xs transition cursor-pointer shadow-2xs">📲</button>
          <button type="button" onClick={() => loadIntoForm(f)} title="تعديل أمر التشغيل ✏️" className="w-8 h-8 rounded-lg bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] border border-[#E8E5EA] flex items-center justify-center text-xs transition cursor-pointer shadow-2xs">✏️</button>
          <button type="button" onClick={() => handleDeleteOrder(f)} title="حذف أمر التشغيل 🗑️" className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#D64545] border border-rose-200 flex items-center justify-center text-xs transition cursor-pointer shadow-2xs">🗑️</button>
        </div>
      </td>
    </tr>
  );
}

window.ProductionCard = ProductionCard;
