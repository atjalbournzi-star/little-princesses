"""
Little Princesses ERP - System Settings & Transactional Clear Services
"""

from .db_pool import get_db_cursor, clean_str, clean_num, logger
from .pg_audit import log_audit_event
from .pg_backup import get_backup_status, create_backup_snapshot, restore_backup_data


def get_system_settings(params=None):
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM company_profile WHERE id = 1 LIMIT 1;")
        cp = cur.fetchone()
        if cp:
            cp = dict(cp)
            if cp.get('establishment_date'):
                cp['establishment_date'] = str(cp['establishment_date'])
        else:
            cp = {
                "id": 1,
                "company_name": "مؤسسة الأميرات الصغيرات للأزياء الراقية",
                "phone": "776773458",
                "address": "اليمن - صنعاء - شارع حدة",
                "email": "info@littleprincesses.com",
                "fiscal_date": "2026-01-01",
                "theme_mode": "light",
                "base_currency": "YER"
            }

        cur.execute("SELECT key, value, category, description FROM system_settings;")
        settings_map = {r['key']: r['value'] for r in cur.fetchall()}

        cur.execute("SELECT code, exchange_rate, is_base FROM currencies;")
        c_rows = cur.fetchall()
        rates = {cr['code']: float(cr['exchange_rate'] or 1.0) for cr in c_rows}

        return {
            "company": {
                "company_name": cp.get('company_name') or 'مؤسسة الأميرات الصغيرات للأزياء الراقية',
                "phone": cp.get('phone') or '776773458',
                "address": cp.get('address') or 'اليمن - صنعاء - شارع حدة',
                "email": cp.get('email') or 'info@littleprincesses.com',
                "logo_url": cp.get('logo_url') or '',
                "fiscal_date": cp.get('fiscal_date') or str(cp.get('establishment_date') or '2026-01-01'),
                "theme_mode": cp.get('theme_mode') or 'light',
                "base_currency": cp.get('base_currency') or 'YER'
            },
            "currency": {
                "base_currency": cp.get('base_currency') or 'YER',
                "rates": rates if rates else {"YER": 1.0, "SAR": 142.0, "USD": 535.0}
            },
            "theme": {
                "mode": cp.get('theme_mode') or 'light',
                "primary_color": "#B0005A"
            },
            "settings": settings_map
        }


def save_system_settings(payload):
    data = payload.get('data') or payload
    c_name = clean_str(data.get('company_name') or data.get('companyName') or 'مؤسسة الأميرات الصغيرات')
    phone = clean_str(data.get('phone') or '')
    address = clean_str(data.get('address') or '')
    email = clean_str(data.get('email') or '')
    f_date = clean_str(data.get('fiscal_date') or data.get('fiscalDate') or '2026-01-01')
    theme = clean_str(data.get('theme_mode') or data.get('theme') or 'light')
    base_cur = clean_str(data.get('base_currency') or 'YER')
    logo_u = clean_str(data.get('logo_url') or data.get('logoUrl') or '')
    rates = data.get('rates') or {}

    old_settings = get_system_settings()

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO company_profile (id, company_name, phone, address, email, fiscal_date, theme_mode, base_currency, logo_url)
            VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                company_name = COALESCE(EXCLUDED.company_name, company_profile.company_name),
                phone = COALESCE(EXCLUDED.phone, company_profile.phone),
                address = COALESCE(EXCLUDED.address, company_profile.address),
                email = COALESCE(EXCLUDED.email, company_profile.email),
                fiscal_date = COALESCE(EXCLUDED.fiscal_date, company_profile.fiscal_date),
                theme_mode = COALESCE(EXCLUDED.theme_mode, company_profile.theme_mode),
                base_currency = COALESCE(EXCLUDED.base_currency, company_profile.base_currency),
                logo_url = CASE WHEN EXCLUDED.logo_url IS NOT NULL AND EXCLUDED.logo_url != '' THEN EXCLUDED.logo_url ELSE company_profile.logo_url END;
        """, (c_name, phone, address, email, f_date, theme, base_cur, logo_u))

        if rates and isinstance(rates, dict):
            for code, rate in rates.items():
                r_val = clean_num(rate)
                if r_val > 0:
                    cur.execute("UPDATE currencies SET exchange_rate = %s, last_updated = CURRENT_TIMESTAMP WHERE code = %s;", (r_val, code))

    log_audit_event('SETTINGS', 'SYSTEM', 'UPDATE',
                    old_values=old_settings.get('company'),
                    new_values={"company_name": c_name, "phone": phone, "email": email, "rates": rates})
    return {"success": True, "message": "تم حفظ وتحديث إعدادات النظام بنجاح 👑"}


def clear_all_transactional_data(payload=None):
    tables_to_truncate = [
        "quality_actions", "quality_returns", "quality_complaints", "quality_feedback", "quality_defects", "quality_inspections",
        "fitting_alterations", "tailor_commissions", "production_orders", "order_items", "orders",
        "attribution_records", "ai_comment_nlp", "ai_conversation_intent", "comments", "content_metrics", "content",
        "messages", "conversations", "customer_platform_mappings", "campaigns", "raw_platform_events",
        "ai_daily_briefs", "ai_recommendations", "purchase_items", "purchases", "inventory_transactions", "inventory", "products",
        "payroll", "employees", "payments", "expenses", "journal_entry_lines", "journal_entries", "measurements", "children",
        "audit_logs", "idempotency_keys"
    ]
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
        existing_tables = {r['table_name'] for r in cur.fetchall()}
        valid_truncates = [f'"{t}"' for t in tables_to_truncate if t in existing_tables]
        if valid_truncates:
            cur.execute(f"TRUNCATE TABLE {', '.join(valid_truncates)} RESTART IDENTITY CASCADE;")

        cur.execute("DELETE FROM customers WHERE id != 'CUST-GENERAL';")
        cur.execute("""
            INSERT INTO customers (id, name, phone, category, city, current_balance, status, notes)
            VALUES ('CUST-GENERAL', 'عميل عام / زائر صالة العرض', '000000000', 'عام', 'صنعاء', 0.0000, 'Active', 'الحساب العام للمبيعات النقدية المباشرة')
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, current_balance = 0.0000, status = 'Active';
        """)
        cur.execute("DELETE FROM suppliers;")
        cur.execute("UPDATE chart_of_accounts SET opening_balance = 0.0000, current_balance = 0.0000;")
        cur.execute("UPDATE number_sequences SET current_number = 0;")

    try:
        import clean_slate_reset
        clean_slate_reset.step3_wipe_and_reset_sqlite()
    except Exception as _sq_err:
        logger.warning(f"تنبيه أثناء تصفير قاعدة البيانات المحلية SQLite: {_sq_err}")

    logger.info("🧹 تم مسح وتصفير كافة البيانات التشغيلية والبدء بقاعدة بيانات نظيفة من الصفر بنجاح.")
    return {"cleared": True, "success": True, "message": "تم تصفير كافة البيانات التشغيلية والبدء بقاعدة بيانات نظيفة 100% مع الحفاظ على الهيكل والبيانات الأساسية."}
