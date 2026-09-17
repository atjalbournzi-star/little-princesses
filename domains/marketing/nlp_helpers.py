# domains/marketing/nlp_helpers.py
# Marketing NLP analysis and AI scoring helper functions

from domains.system.db_connection import get_db

def calculate_ai_content_scores():
    return []

def get_ai_weights():
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute("SELECT weight_name, value FROM ai_scoring_weights")
        res = {r[0]: float(r[1]) for r in c.fetchall()}
        conn.close()
        return res
    except Exception:
        return {
            'hot_lead_min': 90.0,
            'high_intent_min': 70.0,
            'med_intent_min': 40.0,
            'low_intent_min': 20.0
        }

def analyze_arabic_nlp_comment(text):
    t = str(text or '')
    pos_words = ['جميل', 'رائع', 'روعة', 'فخم', 'ممتاز', 'شكرا', 'يسلمو', 'حلو']
    neg_words = ['غالي', 'سيء', 'تاخر', 'تأخر', 'عيب', 'خربان', 'مش حلو', 'رديء']
    
    if any(w in t for w in pos_words):
        sentiment = 'Positive'
        cause = 'Design & Quality'
    elif any(w in t for w in neg_words):
        sentiment = 'Negative'
        cause = 'Price Objection' if 'غالي' in t else 'Delivery Delay'
    else:
        sentiment = 'Neutral'
        cause = 'General'
        
    intent = 'Order Inquiry' if any(w in t for w in ['بكم', 'سعر', 'طلب', 'شراء', 'توصيل']) else 'General Question'
    
    return {
        'sentiment': sentiment,
        'sentiment_cause': cause,
        'intent_category': intent,
        'extracted_product': 'فستان سهرة ملكي' if 'فستان' in t else '',
        'extracted_color': 'لؤلؤي' if 'لؤلؤي' in t else ('وردي' if 'وردي' in t else ''),
        'extracted_size': '',
        'extracted_age': '',
        'extracted_location': '',
        'dialect': 'Yemeni/Sanaani' if any(w in t for w in ['بكم', 'حالي', 'قوي']) else 'Mixed'
    }
