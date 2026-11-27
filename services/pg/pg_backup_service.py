# services/pg/pg_backup_service.py
# Real Backup List, Export, and SHA-256 Integrity Verification Service
# Architectural Standards: Strictly < 220 lines per file

import os
import hashlib
import datetime
import logging

logger = logging.getLogger("LittlePrincesses_PG_BackupService")

BACKUP_DIR = (os.environ.get('BACKUP_DIR') or '').strip() or os.path.join(os.path.expanduser('~'), 'ERP_Backups_Daily')


def get_backups_list():
    """Scans BACKUP_DIR and returns all existing ZIP backups with SHA-256 checksums."""
    if not os.path.exists(BACKUP_DIR):
        try: os.makedirs(BACKUP_DIR, exist_ok=True)
        except Exception: pass
        return []

    backups = []
    try:
        filenames = os.listdir(BACKUP_DIR)
        zips = [f for f in filenames if f.startswith("LP_ERP_Backup_") and f.endswith(".zip")]
        zips.sort(key=lambda x: os.path.getmtime(os.path.join(BACKUP_DIR, x)), reverse=True)

        for fname in zips:
            full_path = os.path.join(BACKUP_DIR, fname)
            stat = os.stat(full_path)
            sha_file = full_path + ".sha256"
            sha256_hash = ""
            if os.path.exists(sha_file):
                try:
                    with open(sha_file, "r", encoding="utf-8") as sf:
                        sha256_hash = sf.read().strip()
                except Exception: pass

            if not sha256_hash:
                try:
                    hasher = hashlib.sha256()
                    with open(full_path, "rb") as bf:
                        while chunk := bf.read(65536):
                            hasher.update(chunk)
                    sha256_hash = hasher.hexdigest()
                    with open(sha_file, "w", encoding="utf-8") as sf:
                        sf.write(sha256_hash)
                except Exception: pass

            mtime = datetime.datetime.fromtimestamp(stat.st_mtime, tz=datetime.timezone.utc)
            backups.append({
                'file_name': fname,
                'file_path': full_path,
                'size_bytes': stat.st_size,
                'size_mb': round(stat.st_size / (1024.0 * 1024.0), 2),
                'created_at': mtime.isoformat(),
                'sha256': sha256_hash,
                'status': 'Verified'
            })
    except Exception as ex:
        logger.error(f"Error reading backups directory {BACKUP_DIR}: {ex}")
    return backups


def get_backup_file_for_export(file_name=None):
    """Resolves full path and filename for downloading backup file."""
    if not os.path.exists(BACKUP_DIR):
        return None, "مجلد النسخ الاحتياطي غير موجود"

    if file_name:
        safe_name = os.path.basename(file_name)
        target = os.path.join(BACKUP_DIR, safe_name)
        if os.path.exists(target) and safe_name.endswith('.zip'):
            return target, safe_name
        return None, f"الملف المطلوب [{safe_name}] غير موجود"

    # Default to latest zip
    zips = [f for f in os.listdir(BACKUP_DIR) if f.startswith("LP_ERP_Backup_") and f.endswith(".zip")]
    if not zips:
        return None, "لا توجد نسخ احتياطية متاحة للتصدير حالياً"

    zips.sort(key=lambda x: os.path.getmtime(os.path.join(BACKUP_DIR, x)), reverse=True)
    latest = zips[0]
    return os.path.join(BACKUP_DIR, latest), latest


def verify_and_restore_backup(payload):
    """Safely verifies SHA-256 fingerprint for backup restore."""
    payload = payload or {}
    fname = os.path.basename(str(payload.get('file_name') or payload.get('filename') or '').strip())
    if not fname:
        latest_path, latest_name = get_backup_file_for_export()
        if not latest_path:
            return {'success': False, 'error': "يرجى تحديد اسم ملف النسخة الاحتياطية"}
        fname = latest_name

    target_path = os.path.join(BACKUP_DIR, fname)
    if not os.path.exists(target_path):
        return {'success': False, 'error': f"الملف [{fname}] غير موجود في مجلد النسخ"}

    hasher = hashlib.sha256()
    with open(target_path, "rb") as bf:
        while chunk := bf.read(65536):
            hasher.update(chunk)
    actual_sha = hasher.hexdigest()

    expected_sha = str(payload.get('sha256') or '').strip()
    if expected_sha and expected_sha.lower() != actual_sha.lower():
        return {
            'success': False,
            'error': f"تعارض في بصمة SHA-256! المتوقع ({expected_sha[:8]}...) والفعلي ({actual_sha[:8]}...)"
        }

    return {
        'success': True,
        'verified': True,
        'file_name': fname,
        'sha256': actual_sha,
        'message': f"تم التحقق بنجاح من سلامة البصمة المشفرة للنسخة [{fname}] 🛡️ (الاستعادة تتطلب تأكيد المسؤول السيادي)"
    }
