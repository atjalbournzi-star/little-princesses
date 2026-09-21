// src/features/feedback/components/FeedbackFilterBar.jsx
// شريط التبويبات الـ 14 وفلاتر البحث والتصنيف

function FeedbackFilterBar({
  activeTab = 'executive',
  setActiveTab,
  search = '',
  setSearch,
  filterStatus = 'all',
  setFilterStatus
}) {
  const tabs = [
    { id: 'executive', label: '🧠 الذكاء التنفيذي' },
    { id: 'products', label: '👗 موثوقية الموديلات' },
    { id: 'fabrics', label: '🧵 تقييم الأقمشة والخامات' },
    { id: 'designers', label: '🎨 تقييم المصممين' },
    { id: 'tailors', label: '✂️ تقييم الخياطين والمعمل' },
    { id: 'departments', label: '🏢 تقييم الأقسام والـ Pipeline' },
    { id: 'inspections', label: '🔍 عمليات الفحص' },
    { id: 'defects', label: '⚠️ العيوب والتكاليف' },
    { id: 'feedback', label: '⭐ تقييمات العملاء' },
    { id: 'complaints', label: '📢 سجل الشكاوى' },
    { id: 'returns', label: '🔄 المرتجعات و COPQ' },
    { id: 'capa', label: '🛡️ خطط التصحيح CAPA' },
    { id: 'standards', label: '⚙️ معايير الفحص والمستهدفات' },
    { id: 'master_ledger', label: '📑 سجل الجودة والتقارير' }
  ];

  return (
    <div className="space-y-3">
      {/* التبويبات الأربعة عشر */}
      <div className="flex gap-2 border-b border-[#E8E5EA] pb-2 overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === t.id 
                ? 'bg-[#B0005A] text-white shadow-xs' 
                : 'bg-white text-[#6F6B75] hover:bg-[#FAFAFB] border border-[#E8E5EA]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* شريط البحث وفلاتر الملاحظات إن وجدت */}
      {setSearch && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E8E5EA]">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="البحث في السجلات والتقييمات والموديلات..."
              className="w-full h-9.5 pr-8 pl-3 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] text-xs focus:bg-white focus:border-[#B0005A] outline-none transition"
            />
            <span className="absolute right-2.5 top-2.5 text-[#6F6B75] text-xs">🔍</span>
          </div>

          {setFilterStatus && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-[#6F6B75]">الحالة:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-[#E8E5EA] bg-[#FAFAFB] text-xs text-[#25232A] outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط / معتمد</option>
                <option value="pending">قيد المعالجة</option>
                <option value="closed">مغلق / مكتمل</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

window.FeedbackFilterBar = FeedbackFilterBar;
