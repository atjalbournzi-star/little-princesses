# launcher/server_runner.py
# Background Flask Server Runner & Healthcheck Watcher

import os
import sys
import time
import threading
from urllib.request import urlopen

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass


class ServerRunner:
    def __init__(self, port=5000):
        self.port = port
        self.server_url = f"http://127.0.0.1:{self.port}"
        self.thread = None
        self._is_running = False

    def is_healthy(self, timeout=1.0):
        try:
            with urlopen(f"{self.server_url}/api/health", timeout=timeout) as res:
                return res.status == 200
        except Exception:
            return False

    def wait_until_ready(self, max_wait=15.0, poll_interval=0.3):
        start_time = time.time()
        while time.time() - start_time < max_wait:
            if self.is_healthy(timeout=poll_interval):
                return True
            time.sleep(poll_interval)
        return False

    def _target_runner(self):
        try:
            from app import app, init_database_schemas
            init_database_schemas()
            app.run(
                host='0.0.0.0',
                port=self.port,
                debug=False,
                use_reloader=False,
                threaded=True
            )
        except Exception as e:
            print(f"Server execution error: {e}")
        finally:
            self._is_running = False

    def start(self):
        if self.is_healthy(timeout=0.5):
            print(f"ERP Server is already running at {self.server_url}")
            self._is_running = True
            return True

        print(f"Starting ERP Flask Server in background on port {self.port}...")
        self.thread = threading.Thread(target=self._target_runner, daemon=True)
        self.thread.start()
        self._is_running = True

        if self.wait_until_ready():
            print(f"ERP Server is ready and healthy at {self.server_url}")
            return True
        else:
            print("Server startup timed out waiting for /api/health")
            return False
