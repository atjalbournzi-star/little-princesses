/**
 * ============================================================================
 * ErrorBoundary.jsx — Global Application Error Boundary
 * Architecture: Modular App Component | Little Princesses ERP
 * ============================================================================
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
          <div className="w-16 h-16 rounded-2xl bg-pink-600/20 text-[#D81B60] flex items-center justify-center text-3xl mb-4 border border-pink-500/30">
            🏢
          </div>
          <h2 className="text-lg font-bold mb-2">نظام الإدارة المتكامل الذكي — ERP Master</h2>
          <p className="text-xs text-slate-400 max-w-md mb-3">
            حدث تنبيه مؤقت في تحميل الواجهة:
          </p>
          <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-xl text-rose-300 text-xs font-mono max-w-2xl overflow-x-auto text-left mb-6 whitespace-pre-wrap select-all" dir="ltr">
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-gradient-to-r from-[#D81B60] to-[#AD1457] text-white rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer"
          >
            🔄 إعادة تنشيط الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

window.ErrorBoundary = ErrorBoundary;
