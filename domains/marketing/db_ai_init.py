# domains/marketing/db_ai_init.py
# Marketing AI scoring weights, comment NLP, and recommendations schema

import sqlite3
from domains.system.db_connection import get_db

def init_marketing_ai_db(conn=None):
    close_at_end = False
    if conn is None:
        conn = get_db()
        conn.row_factory = sqlite3.Row
        close_at_end = True
    c = conn.cursor()

    # 1. ai_scoring_weights
    c.execute('''
        CREATE TABLE IF NOT EXISTS ai_scoring_weights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            weight_name TEXT UNIQUE NOT NULL,
            value REAL NOT NULL,
            category TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    weights_seed = [
        ('like', 0.0, 'engagement_quality'),
        ('comment', 0.0, 'engagement_quality'),
        ('save', 0.0, 'engagement_quality'),
        ('share', 0.0, 'engagement_quality'),
        ('profile_visit', 0.0, 'engagement_quality'),
        ('message', 0.0, 'engagement_quality'),
        ('lead', 0.0, 'engagement_quality'),
        ('order', 0.0, 'engagement_quality'),
        ('hot_lead_min', 0.0, 'intent_thresholds'),
        ('high_intent_min', 0.0, 'intent_thresholds'),
        ('med_intent_min', 0.0, 'intent_thresholds'),
        ('low_intent_min', 0.0, 'intent_thresholds'),
        ('attention_weight', 0.0, 'content_score'),
        ('engagement_weight', 0.0, 'content_score'),
        ('save_weight', 0.0, 'content_score'),
        ('share_weight', 0.0, 'content_score'),
        ('message_weight', 0.0, 'content_score'),
        ('conversion_weight', 0.0, 'content_score')
    ]
    for wname, val, cat in weights_seed:
        c.execute("INSERT OR IGNORE INTO ai_scoring_weights (weight_name, value, category) VALUES (?, ?, ?)", (wname, val, cat))

    # 2. ai_comment_nlp
    c.execute('''
        CREATE TABLE IF NOT EXISTS ai_comment_nlp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comment_id TEXT UNIQUE NOT NULL,
            sentiment TEXT DEFAULT 'Neutral',
            sentiment_cause TEXT DEFAULT 'General',
            intent_category TEXT DEFAULT 'General Question',
            extracted_product TEXT DEFAULT '',
            extracted_color TEXT DEFAULT '',
            extracted_size TEXT DEFAULT '',
            extracted_age TEXT DEFAULT '',
            extracted_location TEXT DEFAULT '',
            dialect TEXT DEFAULT 'Mixed',
            analyzed_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 3. ai_conversation_intent
    c.execute('''
        CREATE TABLE IF NOT EXISTS ai_conversation_intent (
            conversation_id TEXT PRIMARY KEY,
            customer_id INTEGER,
            intent_score REAL DEFAULT 0.0,
            intent_bracket TEXT DEFAULT 'General Interaction',
            silent_high_intent INTEGER DEFAULT 0,
            lost_opportunity_reason TEXT DEFAULT 'None',
            analyzed_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 4. ai_daily_briefs
    c.execute('''
        CREATE TABLE IF NOT EXISTS ai_daily_briefs (
            brief_date TEXT PRIMARY KEY,
            performance_summary TEXT DEFAULT '',
            top_product TEXT DEFAULT '',
            top_content TEXT DEFAULT '',
            top_campaign TEXT DEFAULT '',
            customer_demand TEXT DEFAULT '',
            negative_signals TEXT DEFAULT '',
            opportunities TEXT DEFAULT '',
            recommended_actions TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 5. ai_recommendations
    c.execute('''
        CREATE TABLE IF NOT EXISTS ai_recommendations (
            rec_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            recommendation TEXT NOT NULL,
            reason TEXT NOT NULL,
            expected_impact TEXT NOT NULL,
            confidence REAL NOT NULL,
            evidence TEXT NOT NULL,
            category TEXT DEFAULT 'Campaign Investment',
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 6. attribution_records
    c.execute('''
        CREATE TABLE IF NOT EXISTS attribution_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id TEXT NOT NULL,
            model_type TEXT NOT NULL,
            attributed_revenue REAL DEFAULT 0.0,
            attributed_orders REAL DEFAULT 0.0,
            data_source TEXT DEFAULT 'Actual',
            calculated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    if close_at_end:
        conn.close()
