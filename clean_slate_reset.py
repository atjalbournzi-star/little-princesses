"""
=============================================================================
👑 LITTLE PRINCESSES ERP — FACTORY RESET & CLEAN SLATE ENGINE (Facade)
=============================================================================
سكربت التصفير الشامل — واجهة تنسيق خفيفة (Facade Pattern)
يُفوّض المنطق الكامل إلى وحدات reset/ الفرعية:
  • reset/db_backup.py   ← خطوة 1: النسخ الاحتياطي الكامل
  • reset/db_wiper.py    ← خطوة 2 و3: مسح PostgreSQL و SQLite
  • reset/db_verifier.py ← خطوة 4: التحقق والفحص الميداني

لا تغيير على واجهة الاستدعاء — جميع الدوال المُصدَّرة سابقاً لا تزال متاحة.
=============================================================================
"""

import sys

# ضبط ترميز الإخراج للغة العربية في Windows
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

# ── استيراد الوحدات الفرعية (Zero Breaking Changes) ──────────────────────────
from reset.db_backup import step1_create_full_backup
from reset.db_wiper import step2_wipe_and_reset_supabase, step3_wipe_and_reset_sqlite
from reset.db_verifier import step4_verify_clean_state

# إعادة التصدير للتوافق مع أي كود خارجي يستورد من هذا الملف مباشرة
__all__ = [
    "step1_create_full_backup",
    "step2_wipe_and_reset_supabase",
    "step3_wipe_and_reset_sqlite",
    "step4_verify_clean_state",
]

# ── نقطة الدخول الرئيسية ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("👑 Little Princesses ERP — تشغيل محرك التصفير الشامل والبدء النظيف...")
    backup_file = step1_create_full_backup()
    step2_wipe_and_reset_supabase()
    step3_wipe_and_reset_sqlite()
    step4_verify_clean_state()

