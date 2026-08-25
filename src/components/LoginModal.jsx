const { useState, useEffect } = React;

function LoginModal({ isOpen, onClose, onLoginSuccess, showToast }) {
  if (!isOpen) return null;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quickUsers = [
    { username: 'admin', label: 'المدير العام 👑', role: 'admin', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
    { username: 'accountant', label: 'المحاسب المالي 💼', role: 'accountant', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { username: 'workshop', label: 'مديرة الورشة ✂️', role: 'workshop_manager', badge: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
    { username: 'cashier', label: 'مدخلة البيانات 📝', role: 'data_entry', badge: 'bg-pink-100 text-pink-900 border-pink-300' }
  ];

  const handleQuickSelect = (u) => {
    setUsername(u.username);
    setPassword(u.username === 'admin' ? 'admin' : '1234');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await window.authAPI.login(username.trim(), password);
      if (res && res.success) {
        if (showToast) showToast(`✅ ${res.message}`);
        onLoginSuccess(res.user);
        onClose();
      } else {
        setError(res?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header with Butterfly Luxury Gradient */}
        <div className="bg-[#0F172A] border-b-2 border-[#D81B60] p-6 text-center relative">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-[#D81B60] via-[#C2185B] to-[#00ACC1] flex items-center justify-center text-2xl shadow-lg border border-pink-400/40 text-white">
            👑
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide">تسجيل الدخول للنظام الموحد</h2>
          <p className="text-xs text-slate-300 mt-1 font-medium">مؤسسة الأميرات الصغيرات — Little Princesses ERP</p>
          
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Quick User Selection Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <label className="block text-[11px] font-bold text-slate-600 mb-2">الدخول السريع بحساب تجريبي (Quick Role Switch):</label>
          <div className="grid grid-cols-2 gap-2">
            {quickUsers.map(u => (
              <button
                key={u.username}
                type="button"
                onClick={() => handleQuickSelect(u)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold text-right transition cursor-pointer flex items-center justify-between ${
                  username === u.username ? 'ring-2 ring-[#00ACC1] shadow-xs' : ''
                } ${u.badge}`}
              >
                <span>{u.label}</span>
                <span className="text-[10px] opacity-70 font-mono">({u.username})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم (Username)</label>
            <input
              type="text"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-bold focus:bg-white focus:border-[#00ACC1] focus:ring-4 focus:ring-cyan-100/80 transition-all outline-none"
              placeholder="admin / accountant / workshop / cashier"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور (Password)</label>
            <input
              type="password"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-mono font-bold focus:bg-white focus:border-[#00ACC1] focus:ring-4 focus:ring-cyan-100/80 transition-all outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#D81B60] via-[#C2185B] to-[#AD1457] hover:from-[#C2185B] hover:to-[#880E4F] shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>جاري تسجيل الدخول... ⏳</span>
              ) : (
                <>
                  <span>🔐</span>
                  <span>تسجيل الدخول وتفعيل الصلاحيات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.LoginModal = LoginModal;
