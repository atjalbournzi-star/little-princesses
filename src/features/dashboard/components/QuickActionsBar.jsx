// src/features/dashboard/components/QuickActionsBar.jsx
// شريط الإجراءات السريعة وأزرار الانتقال المباشر لأقسام المنظومة

function QuickActionsBar({ setActiveTab = () => {} }) {
  const hubs = [
    { id: "orders", title: "أوامر المبيعات", desc: "الفواتير والحجوزات", icon: "📑", color: "text-[#007F8C] bg-[#E2F5F7] dark:bg-cyan-950/40 border-[#C5ECF0] dark:border-cyan-800" },
    { id: "factory", title: "خطوط التشغيل", desc: "مراحل الإنتاج والتصنيع", icon: "🏭", color: "text-[#8F2A87] bg-[#F2E7F3] dark:bg-purple-950/40 border-[#E5CEE7] dark:border-purple-800" },
    { id: "accounts", title: "الخزينة والمالية", desc: "شجرة الحسابات والسيولة", icon: "🏦", color: "text-[#009FAE] bg-[#E2F5F7] dark:bg-teal-950/40 border-[#C5ECF0] dark:border-teal-800" },
    { id: "inventory", title: "إدارة المخزون", desc: "المواد وسلاسل الإمداد", icon: "📦", color: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
    { id: "customers", title: "العملاء و CRM", desc: "ملفات وسجلات العملاء", icon: "👥", color: "text-[#B0005A] bg-[#FCE8F2] dark:bg-pink-950/40 border-[#F2A4CB]/50 dark:border-pink-800" },
    { id: "reports", title: "التقارير التنفيذية", desc: "قوائم الدخل والميزانية", icon: "📊", color: "text-[#F28A00] bg-[#FFF1DC] dark:bg-amber-950/40 border-[#FFE4B9] dark:border-amber-800" }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {hubs.map((c) => (
        <div
          key={c.id}
          onClick={() => setActiveTab(c.id)}
          className="cursor-pointer p-2.5 rounded-xl border border-slate-800 bg-[#111C38] hover:border-slate-700 hover:bg-[#152347] transition-all flex flex-col justify-center items-center text-center group"
          title={`انقر للانتقال إلى قسم ${c.title}`}
        >
          <div className={`w-8 h-8 rounded-lg mb-1.5 flex items-center justify-center border text-base transition-all ${c.color} group-hover:scale-105`}>
            {c.icon}
          </div>
          <span className="font-bold text-xs text-white mb-0.5 group-hover:text-pink-400 transition">
            {c.title}
          </span>
          <span className="text-[10px] text-slate-400">
            {c.desc}
          </span>
        </div>
      ))}
    </div>
  );
}

if (typeof window !== 'undefined') {
  window.QuickActionsBar = QuickActionsBar;
}
