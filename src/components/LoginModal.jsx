const { useState, useEffect } = React;

function LoginModal({ isOpen, onClose, onLoginSuccess, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasSession = typeof window !== 'undefined' && Boolean(window.localStorage && window.localStorage.getItem('erp_auth_token'));

  useEffect(() => {
    if (!isOpen) return;
    setPassword('');
    setError('');
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (hasSession && typeof onClose === 'function') onClose();
        else e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasSession, onClose]);

  const [brandProfile, setBrandProfile] = useState(() => (
    (typeof window !== 'undefined' && window.BrandService)
      ? window.BrandService.getProfile()
      : { name: 'نظام الإدارة المتكامل', shortName: 'ERP Master', systemIcon: '🏢' }
  ));

  useEffect(() => {
    const onBrand = (e) => { if (e.detail) setBrandProfile(e.detail); };
    window.addEventListener('erp:brandProfileChanged', onBrand);
    return () => window.removeEventListener('erp:brandProfileChanged', onBrand);
  }, []);

  if (!isOpen) return null;

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

  const createPortal = (typeof ReactDOM !== 'undefined' && ReactDOM.createPortal) ? ReactDOM.createPortal : null;
  const backdropCls = hasSession
    ? 'fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-[4px] animate-fadeIn'
    : 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-gradient-to-br dark:from-[#0B132B] dark:via-[#0F172A] dark:to-[#1E1B4B] animate-fadeIn';
  const content = (
    <div className={backdropCls} dir="rtl" onClick={hasSession ? onClose : undefined}>
      <div className="relative w-full max-w-md max-h-[90vh] bg-white dark:bg-[#111C38] rounded-3xl shadow-xl border border-[#E2E8F0] dark:border-[#263248] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header with Architectural Enterprise Branding */}
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-[#263248] p-6 text-center relative shrink-0">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#E11D48] flex items-center justify-center text-xl shadow-md text-white overflow-hidden">
            {brandProfile.logoUrl ? (
              <img src={brandProfile.logoUrl} alt="Logo" className="w-full h-full object-cover p-1" />
            ) : (
              <span>{brandProfile.systemIcon || '🏢'}</span>
            )}
          </div>
          <h2 className="text-base font-bold text-[#0F172A] dark:text-white tracking-wide">تسجيل الدخول للنظام الموحد</h2>
          <p className="text-xs text-[#475569] dark:text-slate-300 mt-1 font-medium">{brandProfile.name || 'نظام الإدارة المتكامل'} — {brandProfile.shortName || 'ERP Master'}</p>
          
          {hasSession && (
            <button 
              type="button"
              onClick={onClose}
              className="absolute top-3.5 left-3.5 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-[#263248] text-[#475569] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white flex items-center justify-center transition cursor-pointer text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Login Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="p-6 space-y-4">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">اسم المستخدم (Username)</label>
              <input
                type="text"
                name="erp_username_field"
                autoComplete="off"
                className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#263248] bg-[#F8FAFC] dark:bg-[#0B132B] text-[#0F172A] dark:text-white text-xs font-bold focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/20 transition-all outline-none"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] dark:text-slate-200 mb-1.5">كلمة المرور (Password)</label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full h-10 px-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#263248] bg-[#F8FAFC] dark:bg-[#0B132B] text-[#0F172A] dark:text-white text-xs font-mono font-bold focus:bg-white dark:focus:bg-[#0F172A] focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/20 transition-all outline-none"
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
                className="w-full h-10 rounded-xl text-xs font-bold text-white bg-[#E11D48] hover:bg-[#BE123C] shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
    </div>
  );
  if (typeof document !== 'undefined' && createPortal) return createPortal(content, document.body);
  return content;
}

window.LoginModal = LoginModal;
