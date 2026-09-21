// src/features/feedback/components/FeedbackExecutiveTab.jsx
// تبويب الذكاء التنفيذي وأعلى الموديلات موثوقية وتفكيك COPQ

function FeedbackExecutiveTab({
  productQualityProfiles = [],
  metrics,
  currencyDisplay = "YER ريال"
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* أفضل الموديلات جودة ومبيعات */}
        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
          <h3 className="font-bold text-sm text-[#25232A] flex items-center justify-between border-b border-[#E8E5EA] pb-3">
            <span>📊 الموديلات الأكثر مبيعاً وأعلى موثوقية</span>
            <span className="text-[11px] text-[#6F6B75]">Real Sales & Quality</span>
          </h3>

          {productQualityProfiles.length === 0 ? (
            <div className="text-center py-10 text-[#6F6B75] text-xs font-medium">
              لا توجد مبيعات أو منتجات مسجلة حالياً 👗
            </div>
          ) : (
            <div className="space-y-3">
              {productQualityProfiles.slice(0, 4).map(p => (
                <div key={p.id} className="p-3.5 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-[#25232A]">{p.name}</div>
                    <div className="text-[11px] text-[#6F6B75] mt-0.5">
                      المبيعات: {p.totalSold} قطع • التقييم: {p.avgRating}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-[#B0005A]">
                        {p.qualityScore !== null ? `${p.qualityScore}/100` : '--'}
                      </span>
                      <span className="text-[10px] bg-white border border-[#E8E5EA] px-2 py-0.5 rounded font-bold">{p.trend}</span>
                    </div>
                    <div className="text-[10px] text-[#6F6B75] mt-0.5">عينة: {p.sampleSize} حالة ({p.confidence})</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* تفكيك تكلفة الجودة COPQ */}
        <div className="bg-white rounded-2xl border border-[#E8E5EA] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
          <h3 className="font-bold text-sm text-[#25232A] flex items-center justify-between border-b border-[#E8E5EA] pb-3">
            <span>💸 تفكيك التكلفة المالية للجودة الرديئة (COPQ Breakdown)</span>
            <span className="text-[11px] text-[#6F6B75]">Financial Losses</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-center">
              <span className="text-xs text-[#6F6B75] block">تكلفة إعادة العمل والإصلاح</span>
              <div className="text-lg font-bold font-mono text-[#D64545] mt-1">
                {(metrics?.reworkCost || 0).toLocaleString('en-US')} {currencyDisplay}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-center">
              <span className="text-xs text-[#6F6B75] block">تكلفة هدر الأقمشة والخامات</span>
              <div className="text-lg font-bold font-mono text-[#8F2A87] mt-1">
                {(metrics?.wasteCost || 0).toLocaleString('en-US')} {currencyDisplay}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-center">
              <span className="text-xs text-[#6F6B75] block">مبالغ المرتجعات والتعويضات</span>
              <div className="text-lg font-bold font-mono text-[#C97300] mt-1">
                {(metrics?.returnCost || 0).toLocaleString('en-US')} {currencyDisplay}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-center">
              <span className="text-xs text-[#6F6B75] block">مصاريف صيانة الورشة المقيدة</span>
              <div className="text-lg font-bold font-mono text-[#007F8C] mt-1">
                {(metrics?.directMaintenance || 0).toLocaleString('en-US')} {currencyDisplay}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

window.FeedbackExecutiveTab = FeedbackExecutiveTab;
