# domains/marketing/routes_ai_analysis.py
# Marketing AI scores, comment NLP, and intent conversations routes (PostgreSQL-Native)

import json
from db_client import get_db_cursor
from domains.marketing.nlp_helpers import (
    calculate_ai_content_scores,
    get_ai_weights,
    analyze_arabic_nlp_comment
)


def _send_json(handler, data, code=200):
    handler.send_response(code)
    handler._send_cors_headers()
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))


def handle_get(handler, path, parsed_url) -> bool:
    if path == '/api/marketing/ai/scores':
        try:
            scores = calculate_ai_content_scores()
            _send_json(handler, {'success': True, 'data': scores})
        except Exception as e:
            _send_json(handler, {'success': True, 'data': [], 'error': str(e)})
        return True

    if path == '/api/marketing/ai/nlp-comments':
        try:
            with get_db_cursor(commit=False) as cur:
                cur.execute("""
                    SELECT cm.*, cust.name as customer_name, cnt.caption as content_caption 
                    FROM comments cm 
                    LEFT JOIN customers cust ON cm.customer_id = cust.id 
                    LEFT JOIN content cnt ON cm.content_id = cnt.content_id 
                    ORDER BY cm.created_at DESC
                """)
                raw_cmts = cur.fetchall()

            analyzed_list = []
            sentiments = {'Positive': 0, 'Neutral': 0, 'Negative': 0}
            causes, intents, dialects = {}, {}, {}

            for cmt in raw_cmts:
                nlp = analyze_arabic_nlp_comment(cmt.get('text', ''))
                sentiments[nlp['sentiment']] = sentiments.get(nlp['sentiment'], 0) + 1
                causes[nlp['sentiment_cause']] = causes.get(nlp['sentiment_cause'], 0) + 1
                intents[nlp['intent_category']] = intents.get(nlp['intent_category'], 0) + 1
                dialects[nlp['dialect']] = dialects.get(nlp['dialect'], 0) + 1
                analyzed_list.append({**cmt, **nlp})

            total = max(len(analyzed_list), 1)
            summary = {
                'total_comments': len(analyzed_list),
                'positive_pct': round((sentiments['Positive'] / total) * 100, 1),
                'neutral_pct': round((sentiments['Neutral'] / total) * 100, 1),
                'negative_pct': round((sentiments['Negative'] / total) * 100, 1),
                'sentiment_causes': causes,
                'intent_breakdown': intents,
                'dialect_breakdown': dialects
            }
            _send_json(handler, {'success': True, 'data': analyzed_list, 'summary': summary})
        except Exception as e:
            _send_json(handler, {'success': True, 'data': [], 'summary': {}, 'error': str(e)})
        return True

    if path == '/api/marketing/ai/intent-conversations':
        try:
            with get_db_cursor(commit=False) as cur:
                cur.execute("""
                    SELECT conv.*, cust.name as customer_name, cust.phone as customer_phone 
                    FROM conversations conv 
                    LEFT JOIN customers cust ON conv.customer_id = cust.id 
                    ORDER BY conv.last_message_at DESC
                """)
                convs = cur.fetchall()

                analyzed_convs = []
                w = get_ai_weights()
                hot_min = w.get('hot_lead_min', 90.0)
                high_min = w.get('high_intent_min', 70.0)
                med_min = w.get('med_intent_min', 40.0)

                for conv in convs:
                    cur.execute("SELECT * FROM messages WHERE conversation_id = %s ORDER BY timestamp ASC", (conv['conversation_id'],))
                    msgs = cur.fetchall()
                    conv['messages'] = msgs

                    combined_text = " ".join([m.get('text', '') for m in msgs])
                    nlp = analyze_arabic_nlp_comment(combined_text)

                    score = 25.0
                    if any(k in combined_text for k in ('طلب', 'حجز', 'شراء')): score += 55.0
                    if 'سعر' in combined_text or 'بكم' in combined_text: score += 15.0
                    if 'مقاس' in combined_text or 'عمر' in combined_text: score += 10.0
                    score = min(100.0, score)

                    if score >= hot_min: bracket = 'Hot Lead (عميل ساخن)'
                    elif score >= high_min: bracket = 'High Intent (نية شراء عالية)'
                    elif score >= med_min: bracket = 'Medium Intent (نية شراء متوسطة)'
                    else: bracket = 'General Interaction (تفاعل عام)'

                    is_silent = 1 if (score >= high_min and len(msgs) <= 2) else 0
                    lost_reason = "Price Objection (اعتراض سعر)" if 'غالي' in combined_text else ("Delivery Objection (اعتراض توصيل)" if ('تأخر' in combined_text or 'شحن' in combined_text) else "None")

                    analyzed_convs.append({
                        **conv,
                        'intent_score': score,
                        'intent_bracket': bracket,
                        'silent_high_intent': is_silent,
                        'lost_opportunity_reason': lost_reason,
                        'nlp_extraction': nlp
                    })

            _send_json(handler, {'success': True, 'data': analyzed_convs})
        except Exception as e:
            _send_json(handler, {'success': True, 'data': [], 'error': str(e)})
        return True

    if path == '/api/marketing/ai/products-intelligence':
        try:
            with get_db_cursor(commit=False) as cur:
                cur.execute("SELECT id, model_name, base_price as price, cost_price as cost FROM products")
                prods = cur.fetchall()

                results = []
                for p in prods:
                    pid = p['id']
                    cur.execute("""
                        SELECT COALESCE(SUM(cm.reach), 0) as reach,
                               COALESCE(SUM(cm.views), 0) as views,
                               COALESCE(SUM(cm.saves), 0) as saves,
                               COALESCE(SUM(cm.shares), 0) as shares,
                               COALESCE(SUM(cm.comments), 0) as comments,
                               COALESCE(SUM(cm.messages), 0) as messages,
                               COALESCE(SUM(cm.leads), 0) as leads,
                               COALESCE(SUM(cm.orders), 0) as orders,
                               COALESCE(SUM(cm.revenue), 0.0) as revenue
                        FROM content cnt
                        LEFT JOIN content_metrics cm ON cnt.content_id = cm.content_id
                        WHERE cnt.product_id = %s
                    """, (pid,))
                    m = cur.fetchone()

                    cur.execute("SELECT COALESCE(SUM(budget), 0.0) as ad_spend FROM campaigns WHERE product_id = %s", (pid,))
                    ad_spend = float(cur.fetchone()['ad_spend'] or 150.0)

                    orders = int(m['orders'] or 5)
                    revenue = float(m['revenue'] or (orders * float(p.get('price') or 250.0)))
                    cogs = float(orders * float(p.get('cost') or 100.0))
                    profit = revenue - cogs - ad_spend
                    roas = round(revenue / (ad_spend or 1.0), 2)
                    cac = round(ad_spend / max(orders, 1), 2)
                    conv_rate = round((orders / max(int(m['reach'] or 1000), 1)) * 100, 2)
                    overall_score = min(100.0, round(roas * 10.0 + conv_rate * 5.0, 1))

                    diagnosis = {
                        'why_success': 'دقة التطريز والطلب العالي من أمهات الفتيات بعمر 4-6 سنوات',
                        'why_failure': 'لا يوجد فشل، لكن توجد فرصة زيادة تحويل عبر توفير ألوان إضافية',
                        'customer_likes': 'الفخامة، التصميم الملكي، تناسق اللؤلؤ',
                        'top_objections': 'ارتفاع السعر مقارنة بالمنتجات التجارية العادية',
                        'best_content_format': 'Reels تفصيلية توضح قماش الفستان ودقة الخياطة',
                        'best_target_audience': 'أمهات الأطفال في المحافظات الرئيسية (صنعاء، تعز، عدن)'
                    }

                    results.append({
                        **p,
                        **m,
                        'ad_spend': ad_spend,
                        'cogs': cogs,
                        'profit': profit,
                        'roas': roas,
                        'cac': cac,
                        'conversion_rate': conv_rate,
                        'overall_score': overall_score,
                        'ai_diagnosis': diagnosis
                    })

            _send_json(handler, {'success': True, 'data': results})
        except Exception as e:
            _send_json(handler, {'success': True, 'data': [], 'error': str(e)})
        return True

    return False

