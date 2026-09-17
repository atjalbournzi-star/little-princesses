# domains/system/routes_backup.py
# System backup and restore HTTP routes

import json
import os
import urllib.parse
import pg_service


def handle_get(handler, path, parsed_url) -> bool:
    if path == '/api/backup/status':
        try:
            res = pg_service.get_backup_status()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path == '/api/backup/list':
        try:
            st = pg_service.get_backup_status()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': True, 'snapshots': st.get('snapshots', [])}, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path == '/api/backup/export':
        try:
            query_params = urllib.parse.parse_qs(parsed_url.query)
            fmt = query_params.get('format', ['json'])[0]
            # Backups directory relative to root workspace
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            backups_dir = os.path.join(base_dir, "backups")

            latest_file = None
            if os.path.exists(backups_dir):
                f_list = [f for f in sorted(os.listdir(backups_dir), reverse=True) if f.endswith(f".{fmt}")]
                if f_list:
                    latest_file = os.path.join(backups_dir, f_list[0])

            if not latest_file:
                snap_res = pg_service.create_backup_snapshot()
                latest_file = snap_res['file_path']

            with open(latest_file, 'rb') as f:
                file_content = f.read()

            fname = os.path.basename(latest_file)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json' if fmt == 'json' else 'application/octet-stream')
            handler.send_header('Content-Disposition', f'attachment; filename="{fname}"')
            handler.send_header('Content-Length', str(len(file_content)))
            handler.end_headers()
            handler.wfile.write(file_content)
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    return False


def handle_post(handler, path, parsed_url) -> bool:
    if path == '/api/backup/snapshot':
        try:
            res = pg_service.create_backup_snapshot()
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(500)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    if path == '/api/backup/restore':
        content_length = int(handler.headers.get('Content-Length', 0))
        post_data = handler.rfile.read(content_length)
        try:
            payload = json.loads(post_data.decode('utf-8'))
            res = pg_service.restore_backup_data(payload)
            handler.send_response(200)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps(res, ensure_ascii=False, default=str).encode('utf-8'))
        except Exception as e:
            handler.send_response(400)
            handler._send_cors_headers()
            handler.send_header('Content-Type', 'application/json; charset=utf-8')
            handler.end_headers()
            handler.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        return True

    return False
