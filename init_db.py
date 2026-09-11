import sys
import argparse

# ضبط ترميز الإخراج لمنع أخطاء UnicodeEncodeError في نظام Windows (cp1256)
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

from db_manager import test_connection, apply_schema, list_created_tables, get_connection_string

def main():
    parser = argparse.ArgumentParser(description="👑 Little Princesses ERP - PostgreSQL Database Setup CLI")
    parser.add_argument("action", choices=["test", "apply-schema", "status", "info"], help="Action to perform")
    parser.add_argument("--mode", choices=["cloud", "local"], default=None, help="Database mode (cloud or local)")
    
    args = parser.parse_args()
    
    conn_str, mode = get_connection_string(args.mode)
    print("=" * 70)
    print(f"👑 LITTLE PRINCESSES ERP — إدارة قاعدة بيانات PostgreSQL ({mode.upper()})")
    print("=" * 70)

    if args.action == "test":
        success, ver = test_connection(args.mode)
        if not success:
            sys.exit(1)
            
    elif args.action == "apply-schema":
        print(f"🚀 البدء في تطبيق المخطط على قاعدة البيانات ({mode})...")
        success, ver = test_connection(args.mode)
        if not success:
            print("❌ تعذر الاتصال بقاعدة البيانات. يرجى التحقق من الرابط في ملف .env")
            sys.exit(1)
        apply_schema(mode=args.mode)
        print("\n📊 فحص الجداول المنشأة بعد التطبيق:")
        tables = list_created_tables(args.mode)
        print(f"✅ تم بنجاح إنشاء {len(tables)} جدولاً في قاعدة البيانات:")
        for t, c in tables:
            print(f"  ✓ {t:<28} ({c} أعمدة)")
            
    elif args.action == "status" or args.action == "info":
        success, ver = test_connection(args.mode)
        if success:
            tables = list_created_tables(args.mode)
            print(f"\n📊 إحصائيات الجداول الحالية ({len(tables)} جدول):")
            for t, c in tables:
                print(f"  • {t:<28} ({c} أعمدة)")
        else:
            sys.exit(1)

if __name__ == "__main__":
    main()
