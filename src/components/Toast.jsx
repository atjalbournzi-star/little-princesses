const { useState, useEffect, useMemo, useCallback, useRef } = React;
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const msgText = typeof toast === 'object' ? (toast.message || String(toast)) : String(toast);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] p-4 rounded-2xl shadow-2xl bg-slate-900 text-amber-300 border border-purple-500/40 flex items-center justify-between text-xs font-bold animate-fadeIn">
      <span className="flex items-center gap-2">✨ {msgText}</span>
      <button onClick={onClose} className="text-white hover:text-amber-400 font-black px-2 text-sm">✕</button>
    </div>
  );
}
