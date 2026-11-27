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

  componentDidUpdate(prevProps) {
    if (this.state.hasError && this.props.resetKey !== undefined && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleResetSection = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const errText = String(this.state.error?.message || this.state.error || 'خطأ غير متوقع');
      const errStack = String(this.state.error?.stack || errText);

      if (this.props.inline) {
        return (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8 animate-fadeIn" dir="rtl">
            <div className="w-full max-w-xl bg-white dark:bg-[#111C38] border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 text-center shadow-lg">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-1.5">
                تعذّر عرض هذا القسم مؤقتاً
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                حدث خطأ برمجي غير متوقع أثناء عرض القسم{this.props.sectionTitle ? ` (${this.props.sectionTitle})` : ''}. بياناتك في الأقسام الأخرى آمنة ولم تتأثر.
              </p>
              <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-rose-700 dark:text-rose-300 text-[11px] font-mono max-h-36 overflow-auto text-left mb-4 whitespace-pre-wrap select-all" dir="ltr">
                {errText}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={this.handleResetSection}
                  className="px-5 py-2 bg-[#B0005A] hover:bg-[#8E0049] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  🔄 إعادة تحميل القسم
                </button>
                {typeof this.props.onGoHome === 'function' && (
                  <button
                    type="button"
                    onClick={this.props.onGoHome}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    🏠 العودة للوحة التحكم
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      }

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
            {errStack}
          </div>
          <button
            type="button"
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
