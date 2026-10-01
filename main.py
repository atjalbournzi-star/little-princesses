# main.py
# Little Princesses ERP - Master Application Orchestrator & Launcher
# Unified Desktop, Web, and Service Runner

import sys
import os
import time
import argparse

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

from launcher.server_runner import ServerRunner
from launcher.window_manager import WindowManager
from launcher.kivy_runner import launch_kivy_mobile


def parse_arguments():
    parser = argparse.ArgumentParser(description="Little Princesses ERP Master Launcher")
    parser.add_argument("--port", type=int, default=5000, help="Port to bind ERP server (default: 5000)")
    parser.add_argument("--server-only", action="store_true", help="Run ERP background server without UI window")
    parser.add_argument("--browser", action="store_true", help="Force opening in web browser instead of native window")
    parser.add_argument("--mobile", action="store_true", help="Launch legacy KivyMD mobile simulator")
    return parser.parse_args()


def main():
    args = parse_arguments()

    if args.mobile:
        launch_kivy_mobile()
        return

    # 1. Initialize and start background server
    server = ServerRunner(port=args.port)
    server_ready = server.start()
    if not server_ready:
        print("Could not verify ERP server health. Exiting.")
        sys.exit(1)

    # 2. If running as daemon/headless server, wait indefinitely
    if args.server_only:
        print(f"ERP Server running in server-only mode at http://127.0.0.1:{args.port}")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nERP Server stopped.")
            return

    # 3. Launch Desktop Native Window or System Browser
    wm = WindowManager(title="Little Princesses ERP", width=1366, height=880)
    try:
        wm.open_window(f"http://127.0.0.1:{args.port}", force_browser=args.browser)
    except KeyboardInterrupt:
        print("\nExiting ERP Application.")


if __name__ == "__main__":
    main()
