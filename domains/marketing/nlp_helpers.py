# domains/marketing/nlp_helpers.py
# Marketing NLP analysis and AI scoring helper functions

from db_client import get_db_cursor

def calculate_ai_content_scores():
    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute("""
                SELECT 
                    c.content_id, c.platform, c.content_type, c.caption,
                    p.model_name as product_name,
                    COALESCE(SUM(cm.reach), 0) as total_reach,
                    COALESCE(SUM(cm.views), 0) as total_views,
                    COALESCE(SUM(cm.likes), 0) as total_likes,
                    COALESCE(SUM(cm.comments), 0) as total_comments,
                    COALESCE(SUM(cm.shares), 0) as total_shares,
                    COALESCE(SUM(cm.saves), 0) as total_saves,
                    COALESCE(SUM(cm.orders), 0) as total_orders,
                    COALESCE(SUM(cm.revenue), 0.0) as total_revenue
                FROM content c
                LEFT JOIN products p ON c.product_id = p.id
                LEFT JOIN content_metrics cm ON c.content_id = cm.content_id
                GROUP BY c.content_id, c.platform, c.content_type, c.caption, p.model_name
                ORDER BY total_reach DESC
            """)
            rows = cur.fetchall()

        results = []
        for r in rows:
            reach = int(r['total_reach'] or 0)
            likes = int(r['total_likes'] or 0)
            comments = int(r['total_comments'] or 0)
            shares = int(r['total_shares'] or 0)
            saves = int(r['total_saves'] or 0)
            orders = int(r['total_orders'] or 0)

            weighted_eng = likes + (comments * 2) + (shares * 3) + (saves * 4)
            eng_rate = round((weighted_eng / max(reach, 100)) * 100, 2)
            virality = min(100.0, round((shares * 8.0) + (comments * 2.0) + (reach / 500.0), 1))
            intent_score = min(100.0, round((saves * 10.0) + (orders * 15.0), 1))
            overall = min(100.0, round((eng_rate * 0.4) + (virality * 0.3) + (intent_score * 0.3), 1))

            results.append({
                **r,
                'engagement_rate': eng_rate,
                'virality_score': virality,
                'intent_score': intent_score,
                'ai_content_score': overall,
                'recommendation': 'زيادة ميزانية الترويج والريلز' if overall >= 75 else ('تحسين جودة التصوير والكابشن' if overall >= 40 else 'إعادة صياغة المحتوى واختبار زاوية جديدة')
            })
        return results
    except Exception:
        return []

def get_ai_weights():
    try:
        with get_db_cursor(commit=False) as cur:
            cur.execute("SELECT weight_name, value FROM ai_scoring_weights")
            return {r['weight_name']: float(r['value']) for r in cur.fetchall()}
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
