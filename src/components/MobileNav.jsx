const { useState, useEffect, useMemo, useCallback, useRef } = React;

function MobileNav({ activeTab, setActiveTab, currentUser }) {
  const userRole = currentUser?.role || 'admin';

  const allNavItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: Icons.Dashboard, roles: ['admin'] },
    { id: 'customers', label: 'العملاء', icon: Icons.Users, roles: ['admin', 'workshop_manager', 'data_entry'] },
    { id: 'orders', label: 'الطلبات', icon: Icons.ShoppingBag, roles: ['admin', 'accountant'] },
    { id: 'purchases', label: 'المشتريات', icon: Icons.Purchases, roles: ['admin', 'accountant'] },
    { id: 'factory', label: 'الورشة', icon: Icons.Factory, roles: ['admin', 'workshop_manager'] },
    { id: 'accounts', label: 'الحسابات', icon: Icons.Accounts, roles: ['admin', 'accountant'] }
  ];

  const visibleItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <nav className="md:hidden fixed bottom-0 w-full z-40 bg-slate-950/95 backdrop-blur-lg border-t-2 border-[#D81B60] pb-safe shadow-2xl">
      <div className="flex items-center justify-around p-2">
        {visibleItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[54px] h-14 px-2 rounded-2xl transition-all duration-300 cursor-pointer ${
                isActive 
                  ? 'bg-gradient-to-tr from-pink-600/25 to-cyan-600/25 text-pink-400 scale-105 shadow-xs' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className={`${isActive ? 'animate-bounce-slight' : ''}`}>
                <item.icon />
              </div>
              <span className={`text-[10px] font-bold mt-1 truncate ${isActive ? 'text-pink-300 font-bold' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

