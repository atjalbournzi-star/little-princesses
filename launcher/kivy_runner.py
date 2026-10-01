# launcher/kivy_runner.py
# Legacy Kivy Mobile Application Launcher

import os
import sys


def launch_kivy_mobile():
    """Launches legacy KivyMD mobile simulator if requested."""
    legacy_path = os.path.join(os.path.dirname(__file__), "..", "backups", "legacy_kivy_mobile_app.py")
    if not os.path.exists(legacy_path):
        print("⚠️ Legacy Kivy application file not found in backups directory.")
        return

    print("📱 Launching Little Princesses Kivy Mobile Application...")
    import runpy
    runpy.run_path(legacy_path, run_name="__main__")
