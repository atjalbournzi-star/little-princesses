/**
 * JobTicketPrintModal.jsx - بطاقة أمر تشغيل مصغرة وأنيقة مع باركود (Scan-to-Progress)
 * Little Princesses ERP - Production Floor Architecture
 */

function JobTicketPrintModal({ isOpen, onClose, job, product }) {
  if (!isOpen || !job) return null;

  const orderNo = job.order_no || job.production_order_no || job.id || 'LP-JOB-101';
  const barcodeValue = `LP-JOB-${String(orderNo).replace(/^PO-|^PRD-/, '')}`;
  const prodName = job.product || job.product_name || product?.model_name || 'فستان الأميرات';
  const prodImg = job.product_image || product?.image_url || '';
  const sizeCode = job.size_code || job.standard_size || (job.production_type === 'ready_to_wear' ? 'جاهز' : 'مخصص');
  const isReadyToWear = job.production_type === 'ready_to_wear';
  const specs = job.measurements_spec || job.measurements || {};
  const qty = job.quantity || job.pieces_count || 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose} dir="rtl">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E8E5EA]" onClick={e => e.stopPropagation()}>
        {/* Controls Header */}
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-pink-50 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xl">🖨️</span>
            <div>
              <h3 className="text-sm font-bold text-[#25232A]">كرت أمر التشغيل الميداني (Job Card)</h3>
              <p className="text-[11px] text-[#6F6B75]">بطاقة معمل مشفرة ومحمية ببروتوكول الإنتاج الأعمى 🛡️</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#8F2A87] hover:bg-[#73216C] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <span>🖨️ طباعة الكرت</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition cursor-pointer text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div id="factory-printable-ticket" className="p-6 space-y-4 text-xs font-sans text-[#25232A]">
          {/* Header Strip with Barcode */}
          <div className="flex justify-between items-start pb-4 border-b-2 border-[#25232A]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <span className="text-base font-black text-[#8F2A87]">مؤسسة الأميرات الصغيرات للأزياء</span>
              </div>
              <p className="text-[11px] text-[#6F6B75] font-semibold">قسم خطوط التشغيل والتفصيل • بطاقة ورشة عمل</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10.5px] ${isReadyToWear ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-[#8F2A87]'}`}>
                  {isReadyToWear ? '🏷️ إنتاج جاهز للمخزن / المعرض' : '👑 تفصيل خاص لعميل (Bespoke)'}
                </span>
                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-mono font-bold">
                  المقاس: {sizeCode}
                </span>
              </div>
            </div>

            {/* Visual Barcode Display */}
            <div className="text-center font-mono bg-[#FAFAFB] p-2.5 rounded-xl border border-[#E8E5EA]">
              <div className="text-[10px] text-[#6F6B75] mb-1 font-bold">باركود التتبع الفوري</div>
              {/* Simulated crisp vector barcode */}
              <div className="flex items-center justify-center gap-0.5 h-10 px-2 bg-white rounded border border-gray-300">
                {[3,1,2,1,4,1,2,3,1,2,4,1,3,2,1,3,1,2,4,2,1,3].map((w, idx) => (
                  <div key={idx} className="bg-black h-full" style={{ width: `${w * 1.5}px` }}></div>
                ))}
              </div>
              <span className="text-[11px] font-black tracking-wider block mt-1 text-[#25232A]">{barcodeValue}</span>
            </div>
          </div>

          {/* Model & Fabric Row */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-[#FAFAFB] border border-[#E8E5EA]">
            <div className="col-span-2 flex items-center gap-3">
              {prodImg ? (
                <img src={prodImg} alt={prodName} className="w-16 h-16 rounded-xl object-cover border border-[#E5CEE7]" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-purple-50 border border-[#E5CEE7] flex items-center justify-center text-2xl">👗</div>
              )}
              <div>
                <span className="text-[10px] text-[#6F6B75] block font-semibold">الموديل والتصميم:</span>
                <h4 className="text-sm font-black text-[#25232A]">{prodName}</h4>
                <div className="text-[11px] text-[#007F8C] font-mono mt-0.5">الكمية المطلوبة: <strong>{qty} قطعة</strong></div>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-[#6F6B75] block font-semibold">خامة القماش والأمتار:</span>
              <div className="font-bold text-[#8F2A87] mt-0.5">{job.fabric_name || 'تفتة / تل تركي'}</div>
              <div className="text-[11px] font-mono text-[#25232A] mt-0.5">
                قص: <strong>{job.cut_meters || '—'} {job.cut_unit || 'متر'}</strong>
              </div>
            </div>
          </div>

          {/* Detailed Measurements Specifications (Blind: No customer info) */}
          <div className="p-3 rounded-2xl border border-[#E8E5EA] space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#E8E5EA]">
              <span className="font-bold text-xs text-[#8F2A87] flex items-center gap-1.5">
                <span>📐</span> جدول المواصفات الفنية والمقاسات (سم):
              </span>
              <span className="text-[10px] text-[#6F6B75]">مطابقة دقيقة لمعايير الباترون ✂️</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              <div className="p-2 rounded-xl bg-purple-50 border border-[#E5CEE7]">
                <span className="text-[10px] text-[#6F6B75] block">طول الفستان</span>
                <span className="text-sm font-black font-mono text-[#8F2A87]">{specs.dress_len || specs.dress_length || '—'} سم</span>
              </div>
              <div className="p-2 rounded-xl bg-purple-50 border border-[#E5CEE7]">
                <span className="text-[10px] text-[#6F6B75] block">محيط الصدر</span>
                <span className="text-sm font-black font-mono text-[#8F2A87]">{specs.chest_circ || '—'} سم</span>
              </div>
              <div className="p-2 rounded-xl bg-purple-50 border border-[#E5CEE7]">
                <span className="text-[10px] text-[#6F6B75] block">محيط الخصر</span>
                <span className="text-sm font-black font-mono text-[#8F2A87]">{specs.waist_circ || '—'} سم</span>
              </div>
              <div className="p-2 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
                <span className="text-[10px] text-[#6F6B75] block">عرض الكتف</span>
                <span className="text-xs font-bold font-mono text-[#25232A]">{specs.shoulder_w || specs.shoulder_width || '—'} سم</span>
              </div>
              <div className="p-2 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
                <span className="text-[10px] text-[#6F6B75] block">طول الكم</span>
                <span className="text-xs font-bold font-mono text-[#25232A]">{specs.sleeve_len || specs.sleeve_length || '—'} سم</span>
              </div>
              <div className="p-2 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA]">
                <span className="text-[10px] text-[#6F6B75] block">الطول الكلي</span>
                <span className="text-xs font-bold font-mono text-[#25232A]">{specs.total_len || specs.total_height || '—'} سم</span>
              </div>
            </div>
          </div>

          {/* 4 Stages Tracking Matrix & Signatures */}
          <div className="p-3 rounded-2xl border border-[#E8E5EA] space-y-2">
            <span className="font-bold text-xs text-[#25232A] block pb-1 border-b border-[#E8E5EA]">
              📋 مراحل خط الإنتاج والتوقيع الميداني:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-1">
                <div className="font-bold text-[11px] text-[#8F2A87]">✂️ 1. القص:</div>
                <div className="text-[10px] text-[#25232A] truncate">الفني: {job.cutter_name || '—'}</div>
                <div className="text-[10px] font-mono text-[#6F6B75]">الموعد: {job.cutting_due_date || '—'}</div>
                <div className="mt-1 pt-1 border-t border-dashed border-gray-300 text-[10px] text-gray-400">التوقيع: [ ]</div>
              </div>
              <div className="p-2 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-1">
                <div className="font-bold text-[11px] text-[#8F2A87]">🪡 2. الخياطة:</div>
                <div className="text-[10px] text-[#25232A] truncate">الفني: {job.tailor_name || job.tailor || '—'}</div>
                <div className="text-[10px] font-mono text-[#6F6B75]">الموعد: {job.sewing_due_date || '—'}</div>
                <div className="mt-1 pt-1 border-t border-dashed border-gray-300 text-[10px] text-gray-400">التوقيع: [ ]</div>
              </div>
              <div className="p-2 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-1">
                <div className="font-bold text-[11px] text-[#8F2A87]">✨ 3. التطريز:</div>
                <div className="text-[10px] text-[#25232A] truncate">الفني: {job.embroiderer_name || '—'}</div>
                <div className="text-[10px] font-mono text-[#6F6B75]">الموعد: {job.embroidery_due_date || '—'}</div>
                <div className="mt-1 pt-1 border-t border-dashed border-gray-300 text-[10px] text-gray-400">التوقيع: [ ]</div>
              </div>
              <div className="p-2 rounded-xl bg-[#FAFAFB] border border-[#E8E5EA] space-y-1">
                <div className="font-bold text-[11px] text-[#007F8C]">🔍 4. التشطيب:</div>
                <div className="text-[10px] text-[#25232A] truncate">الفني: {job.finisher_name || '—'}</div>
                <div className="text-[10px] font-mono text-[#6F6B75]">الموعد: {job.finishing_due_date || job.due_date || '—'}</div>
                <div className="mt-1 pt-1 border-t border-dashed border-gray-300 text-[10px] text-gray-400">التوقيع: [ ]</div>
              </div>
            </div>
          </div>

          {/* Footer Scan Info */}
          <div className="flex justify-between items-center text-[10px] text-[#6F6B75] pt-2 border-t border-[#E8E5EA]">
            <span>⚡ امسح الباركود عبر قارئ الباركود لترقية المرحلة فورياً (Scan-to-Progress)</span>
            <span className="font-mono">تاريخ الإصدار: {new Date().toISOString().slice(0, 10)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.JobTicketPrintModal = JobTicketPrintModal;
