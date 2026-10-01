# desktop_gui.py
# Little Princesses ERP - Native Desktop GUI & Window Launcher

import os
import sys
import time
import threading
import webbrowser
from urllib.request import urlopen

PORT = int(os.environ.get('PORT', 5000))
SERVER_URL = f"http://127.0.0.1:{PORT}"


def start_flask_server():
    from app import app, init_database_schemas
    init_database_schemas()
    app.run(host='127.0.0.1', port=PORT, debug=False, use_reloader=False)


def wait_for_server(timeout=10):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urlopen(f"{SERVER_URL}/api/health", timeout=1) as res:
                if res.status == 200:
                    return True
        except Exception:
            time.sleep(0.3)
    return False


def launch_desktop():
    # Start server in background thread if not already active
    if not wait_for_server(timeout=1):
        server_thread = threading.Thread(target=start_flask_server, daemon=True)
        server_thread.start()
        if not wait_for_server(timeout=10):
            print("⚠️ Server initialization timed out. Launching browser anyway...")

    # Attempt PyWebView for frameless desktop experience
    try:
        import webview
        print(f"✨ Launching Native Desktop Window via PyWebView: {SERVER_URL}")
        webview.create_window(
            title="Little Princesses ERP 👑",
            url=SERVER_URL,
            width=1280,
            height=850,
            min_size=(900, 600),
            confirm_close=True
        )
        webview.start()
    except ImportError:
        # Fallback to default web browser
        print(f"🌐 PyWebView not installed. Opening in default browser: {SERVER_URL}")
        webbrowser.open(SERVER_URL)


if __name__ == '__main__':
    launch_desktop()
