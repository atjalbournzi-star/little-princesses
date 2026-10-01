# domains/marketing/db_init.py
# Marketing platforms, capability matrix, campaigns, and content schema

import sqlite3
from domains.system.db_connection import get_db

def init_marketing_db(conn=None):
    close_at_end = False
    if conn is None:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        close_at_end = True
    c = conn.cursor()

    # 1. marketing_platforms
    c.execute('''
        CREATE TABLE IF NOT EXISTS marketing_platforms (
            platform_id TEXT PRIMARY KEY,
            platform_name TEXT UNIQUE NOT NULL,
            platform_type TEXT NOT NULL,
            account_name TEXT DEFAULT '',
            account_id TEXT DEFAULT '',
            status TEXT DEFAULT 'disconnected',
            access_token_reference TEXT DEFAULT '',
            refresh_token_reference TEXT DEFAULT '',
            token_expiry TEXT DEFAULT '',
            permissions TEXT DEFAULT '[]',
            last_sync TEXT DEFAULT '',
            webhook_status TEXT DEFAULT 'inactive',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    platforms_seed = [
        ('inst_01','Instagram','social','','','disconnected','','','','["posts","reels","stories","comments","messages","insights"]','','inactive'),
        ('fb_01','Facebook','social','','','disconnected','','','','["posts","stories","comments","messages","insights","ads"]','','inactive'),
        ('wa_01','WhatsApp Business','messaging','','','disconnected','','','','["messages","webhooks"]','','inactive'),
        ('tt_01','TikTok','social','','','disconnected','','','','["videos","comments","insights","ads"]','','inactive'),
        ('yt_01','YouTube','social','','','disconnected','','','','["videos","insights"]','','inactive'),
        ('ga_01','Google Ads','ads','','','disconnected','','','','["ads","insights","audience"]','','inactive'),
        ('sc_01','Snapchat','social','','','disconnected','','','','["stories","ads"]','','inactive'),
        ('pin_01','Pinterest','social','','','disconnected','','','','["posts","insights"]','','inactive'),
    ]
    for pid,pname,ptype,accname,accid,pstatus,actok,reftok,exp,perms,lsync,whstat in platforms_seed:
        c.execute('''
            INSERT OR IGNORE INTO marketing_platforms (
                platform_id, platform_name, platform_type, account_name, account_id,
                status, access_token_reference, refresh_token_reference, token_expiry,
                permissions, last_sync, webhook_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (pid,pname,ptype,accname,accid,pstatus,actok,reftok,exp,perms,lsync,whstat))

    # 2. capability_matrix
    c.execute('''
        CREATE TABLE IF NOT EXISTS capability_matrix (
            platform TEXT PRIMARY KEY,
            posts INTEGER DEFAULT 0,
            reels INTEGER DEFAULT 0,
            stories INTEGER DEFAULT 0,
            comments INTEGER DEFAULT 0,
            messages INTEGER DEFAULT 0,
            insights INTEGER DEFAULT 0,
            ads INTEGER DEFAULT 0,
            audience INTEGER DEFAULT 0,
            webhooks INTEGER DEFAULT 0,
            notes TEXT DEFAULT ''
        )
    ''')
    matrix_seed = [
        ('Instagram', 1, 1, 1, 1, 1, 1, 1, 1, 1, 'دعم كامل لمنشورات، ريلز، ستوري، تعليقات، رسائل، إعلانات'),
        ('Facebook', 1, 1, 1, 1, 1, 1, 1, 1, 1, 'دعم كامل للمنشورات والصفحات والإعلانات المباشرة'),
        ('WhatsApp Business', 0, 0, 0, 0, 1, 0, 0, 0, 1, 'دعم استقبال وإرسال الرسائل الفورية والـ Webhooks'),
        ('TikTok', 0, 1, 0, 1, 0, 1, 1, 0, 1, 'دعم الفيديوهات القصيرة، التعليقات والتحليلات الإعلانية'),
        ('YouTube', 1, 0, 0, 1, 0, 1, 1, 0, 0, 'دعم الفيديوهات الطويلة والشورتس والتحليلات الرسمية'),
        ('Google Ads', 0, 0, 0, 0, 0, 1, 1, 1, 1, 'دعم كامل للحملات الإعلانية والاستهداف وتتبع التحويلات'),
        ('Snapchat', 0, 0, 1, 0, 0, 1, 1, 0, 1, 'دعم قنوات السناب والإعلانات الموجهة'),
        ('Pinterest', 1, 0, 0, 1, 0, 1, 0, 0, 0, 'دعم لوحات الموضة والأزياء والكتالوج التفاعلي')
    ]
    for p, posts, reels, stories, comments, msgs, ins, ads, aud, wh, n in matrix_seed:
        c.execute('''
            INSERT OR IGNORE INTO capability_matrix (
                platform, posts, reels, stories, comments, messages, insights, ads, audience, webhooks, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (p, posts, reels, stories, comments, msgs, ins, ads, aud, wh, n))

    # 3. raw_platform_events (Webhooks)
    c.execute('''
        CREATE TABLE IF NOT EXISTS raw_platform_events (
            event_id TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            event_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            received_at TEXT DEFAULT CURRENT_TIMESTAMP,
            processed_at TEXT DEFAULT '',
            status TEXT DEFAULT 'received',
            error TEXT DEFAULT '',
            retry_count INTEGER DEFAULT 0,
            idempotency_key TEXT UNIQUE
        )
    ''')

    # 4. campaigns
    c.execute('''
        CREATE TABLE IF NOT EXISTS campaigns (
            campaign_id TEXT PRIMARY KEY,
            campaign_name TEXT NOT NULL,
            platform TEXT NOT NULL,
            objective TEXT DEFAULT 'مبيعات مباشرة',
            product_id INTEGER,
            budget REAL DEFAULT 0.0,
            start_date TEXT DEFAULT '',
            end_date TEXT DEFAULT '',
            status TEXT DEFAULT 'نشط',
            payment_account TEXT DEFAULT '101 - الصندوق الرئيسي',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute("PRAGMA table_info(campaigns)")
    existing_camp_cols = set(r[1] if isinstance(r, (list, tuple)) else r['name'] for r in c.fetchall())
    camp_needed = {
        'campaign_id': "TEXT DEFAULT ''",
        'product_id': 'INTEGER',
        'budget': 'REAL DEFAULT 0.0',
        'start_date': "TEXT DEFAULT ''",
        'end_date': "TEXT DEFAULT ''",
        'status': "TEXT DEFAULT 'نشط'",
        'payment_account': "TEXT DEFAULT '505 - مصاريف التسويق والإعلانات'"
    }
    for col, col_def in camp_needed.items():
        if col not in existing_camp_cols:
            try: c.execute(f"ALTER TABLE campaigns ADD COLUMN {col} {col_def}")
            except Exception: pass
            
    c.execute("UPDATE campaigns SET campaign_id = 'CMP-' || id WHERE campaign_id IS NULL OR campaign_id = ''")

    # 5. content
    c.execute('''
        CREATE TABLE IF NOT EXISTS content (
            content_id TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            platform_content_id TEXT DEFAULT '',
            content_type TEXT DEFAULT 'Reel',
            product_id INTEGER,
            campaign_id TEXT,
            caption TEXT DEFAULT '',
            media_url TEXT DEFAULT '',
            thumbnail_url TEXT DEFAULT '',
            publish_date TEXT DEFAULT '',
            status TEXT DEFAULT 'published',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 6. content_metrics
    c.execute('''
        CREATE TABLE IF NOT EXISTS content_metrics (
            metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
            content_id TEXT NOT NULL,
            date TEXT NOT NULL,
            reach INTEGER DEFAULT 0,
            impressions INTEGER DEFAULT 0,
            views INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            comments INTEGER DEFAULT 0,
            shares INTEGER DEFAULT 0,
            saves INTEGER DEFAULT 0,
            clicks INTEGER DEFAULT 0,
            profile_visits INTEGER DEFAULT 0,
            messages INTEGER DEFAULT 0,
            leads INTEGER DEFAULT 0,
            orders INTEGER DEFAULT 0,
            revenue REAL DEFAULT 0.0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 7. comments
    c.execute('''
        CREATE TABLE IF NOT EXISTS comments (
            comment_id TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            platform_comment_id TEXT DEFAULT '',
            content_id TEXT DEFAULT '',
            customer_id INTEGER,
            text TEXT NOT NULL,
            parent_comment_id TEXT DEFAULT '',
            raw_data TEXT DEFAULT '{}',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 8. conversations & messages
    c.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            conversation_id TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            customer_id INTEGER,
            started_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_message_at TEXT DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'open',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            message_id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL REFERENCES conversations(conversation_id),
            platform_message_id TEXT DEFAULT '',
            sender_type TEXT DEFAULT 'customer',
            text TEXT NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            raw_data TEXT DEFAULT '{}'
        )
    ''')

    # 9. customer_platform_mappings
    c.execute('''
        CREATE TABLE IF NOT EXISTS customer_platform_mappings (
            mapping_id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL REFERENCES customers(id),
            platform TEXT NOT NULL,
            platform_user_id TEXT DEFAULT '',
            whatsapp_phone_reference TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    if close_at_end:
        conn.close()
