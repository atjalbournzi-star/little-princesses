// src/features/settings/components/SettingsHeader.jsx
// ترويسة إدارة الإعدادات والحوكمة وشريط التبويبات الستة المدمج المتوافق مع هوية السندات المالية

function SettingsHeader({
  activeTab,
  setActiveTab,
  backupStatus,
  usersCount = 0,
  totalLogs = 0,
  onOpenAuditLogs
}) {
  const tabs = [
    {
      id: 'company',
      label: 'المؤسسة والمظهر',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'users',
      label: 'المستخدمين والصلاحيات',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      badge: usersCount > 0 ? usersCount : null
    },
    {
      id: 'currencies',
      label: 'العملات والصرف',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'templates',
      label: 'قوالب الطباعة',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      )
    },
    {
      id: 'integrations',
      label: 'رسائل WhatsApp',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      id: 'backup',
      label: 'النسخ الاحتياطي',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      badge: backupStatus?.db_size_formatted || null
    },
    {
      id: 'radar',
      label: 'رادار المطابقة والفترات',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      id: 'size_matrices',
      label: 'مصفوفة المقاسات القياسية',
      icon: (
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      )
    }
  ];

  return (
    <div className="shrink-0 space-y-1 select-none text-right" dir="rtl">
      {/* 1. ترويسة مدمجة ورشيقة في سطر واحد مع أزرار الحالة وسجلات التدقيق */}
      <div className="h-8 min-h-[32px] px-2.5 bg-white dark:bg-[#111C38] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 shrink-0 select-none">
        {/* Right: عنوان الشاشة المدمج في سطر واحد بدون شارات أو نصوص زائدة */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0">
            <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>إعدادات النظام والحوكمة</span>
          </div>
          <span className="text-[9.5px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
            v2.4 Active
          </span>
        </div>

        {/* Left: أزرار الحالة وسجلات التدقيق المصغرة في صف أفقي واحد مدمج */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenAuditLogs && (
            <button
              type="button"
              onClick={onOpenAuditLogs}
              className="h-6 px-2 text-[10.5px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md shadow-xs flex items-center gap-1 transition cursor-pointer shrink-0"
              title="سجلات تدقيق الأمان"
            >
              <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>سجلات الأمان</span>
              {totalLogs > 0 && (
                <span className="text-[9.5px] bg-pink-600 text-white px-1 py-0.2 rounded font-mono font-bold">
                  {totalLogs}
                </span>
              )}
            </button>
          )}

          <div className="h-6 px-2 text-[10px] font-mono rounded-md bg-slate-100 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>PostgreSQL Cloud</span>
          </div>
        </div>
      </div>

      {/* 2. شريط التبويبات الستة المدمج بدون شريط تمرير أفقي أو قص للتبويب الأخير */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 shrink-0 select-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-7.5 px-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer ${
                isActive
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#111C38] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono font-bold shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.SettingsHeader = SettingsHeader;
