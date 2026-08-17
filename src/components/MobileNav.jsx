const { useState, useEffect, useMemo, useCallback, useRef } = React;
function MobileNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: Icons.Dashboard },
    { id: 'customers', label: 'العملاء', icon: Icons.Users },
    { id: 'purchases', label: 'المشتريات', icon: Icons.Purchases },
    { id: 'factory', label: 'الورشة', icon: Icons.Factory }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full z-40 bg-slate-950/95 backdrop-blur-lg border-t-2 border-[#D81B60] pb-safe shadow-2xl">
      <div className="flex items-center justify-around p-2">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-tr from-pink-600/25 to-cyan-600/25 text-pink-400 scale-105 shadow-xs' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className={`${isActive ? 'animate-bounce-slight' : ''}`}>
                <item.icon />
              </div>
              <span className={`text-[10px] font-bold mt-1 ${isActive ? 'text-pink-300 font-bold' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
