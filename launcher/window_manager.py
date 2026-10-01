# launcher/window_manager.py
# Native PyWebView Window Manager & Browser Fallback Coordinator

import sys
import webbrowser

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass


class WindowManager:
    def __init__(self, title="Little Princesses ERP", width=1280, height=850):
        self.title = title
        self.width = width
        self.height = height

    def open_window(self, url, force_browser=False):
        if force_browser:
            self._open_browser(url)
            return

        try:
            import webview
            print(f"Launching Native Desktop Window via PyWebView: {url}")
            webview.create_window(
                title=self.title,
                url=url,
                width=self.width,
                height=self.height,
                min_size=(900, 600),
                confirm_close=True
            )
            webview.start()
        except ImportError:
            print("PyWebView not installed. Falling back to default system browser...")
            self._open_browser(url)
        except Exception as e:
            print(f"PyWebView launch exception ({e}). Falling back to browser...")
            self._open_browser(url)

    def _open_browser(self, url):
        print(f"Opening ERP Web Application: {url}")
        webbrowser.open(url)
