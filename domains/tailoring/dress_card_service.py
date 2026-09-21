# domains/tailoring/dress_card_service.py
# Royal Dress Card & Atelier Hangtag Service
# Extracts and normalizes bespoke tailoring data for luxury dress cards

import hashlib
from decimal import Decimal
import pg_service


def _clean_meas(v) -> str:
    """Normalizes a measurement value, treating zero/empty/null as '—'."""
    if v is None:
        return '—'
    s = str(v).strip()
    if s in ('', '0', '0.0', '0.00', 'None', 'null', '—'):
        return '—'
    return f"{s} سم" if not s.endswith('سم') and not s.endswith('cm') else s


def get_dress_card_payload(target_id: str) -> dict:
    """Retrieves and packages complete royal dress card information for an order."""
    if not target_id:
        return {'success': False, 'error': 'رقم الطلب أو الفاتورة مطلوب'}

    target = str(target_id).strip()
    tracking_data = pg_service.get_customer_order_tracking(target)

    if 'error' in tracking_data:
        return {'success': False, 'error': tracking_data['error']}

    d = tracking_data
    order_no = str(d.get('order_no') or d.get('id') or target)
    tot = Decimal(str(d.get('total') or 0))
    pd = Decimal(str(d.get('paid') or 0))
    rem = max(Decimal('0'), tot - pd)
    cur = str(d.get('currency') or 'YER')

    # Hash verification code for authenticity
    raw_hash = f"LP-DRESS-{order_no}-{tot}"
    verify_hash = hashlib.md5(raw_hash.encode('utf-8')).hexdigest()[:8].upper()

    meas = d.get('measurements') or {}
    child_name = str(d.get('real_child_name') or d.get('child_name') or 'الأميرة الجميلة')
    customer_name = str(d.get('real_customer_name') or d.get('customer_name') or 'عزيزتنا العميلة')
    product_name = str(d.get('real_product_name') or d.get('product_name') or 'موديل أزياء راقي خاص')

    # Child age & size-bracket resolution
    child_age = str(d.get('child_age') or d.get('age') or meas.get('estimated_age') or '').strip()
    if child_age and not any(w in child_age for w in ['سنة', 'سنوات', 'شهور', 'عمر']):
        child_age = f"{child_age} سنوات"

    # Discrete measurements cleaning
    d_len = _clean_meas(meas.get('dress_length') or meas.get('dress_len'))
    chest = _clean_meas(meas.get('chest') or meas.get('chest_circ'))
    waist = _clean_meas(meas.get('waist') or meas.get('waist_circ'))
    shoulder = _clean_meas(meas.get('shoulder') or meas.get('shoulder_w'))
    sleeve = _clean_meas(meas.get('sleeve_length') or meas.get('sleeve_len'))
    arm_hole = _clean_meas(meas.get('arm_hole') or meas.get('armpit_circ'))

    # Has discrete measurements if any circumference or detail was entered
    has_discrete = any(x != '—' for x in (chest, waist, shoulder, sleeve))
    is_standard_age_sizing = not has_discrete

    # Sizing description for elegant display
    if is_standard_age_sizing:
        age_label = child_age if child_age else 'الفئة العمرية القياسية'
        len_label = f" (طول الفستان: {d_len})" if d_len != '—' else ""
        sizing_summary = f"تفصيل معتمد حسب الفئة العمرية ({age_label}){len_label}"
    else:
        sizing_summary = "مقاسات تفصيلية مخصصة بالسنتيمتر (سم)"

    # Dynamic White-Label Brand Info from Settings
    brand_info = {
        'name': 'مؤسسة الأميرات الصغيرات',
        'tagline': 'دار الأزياء والتفصيل الراقي لفساتين الأميرات ✨',
        'phone': '776773458',
        'address': 'اليمن - صنعاء - شارع حدة',
        'logo_url': 'logo.png'
    }
    try:
        settings = pg_service.get_system_settings()
        cp = settings.get('company') or settings.get('company_profile') or {}
        if cp:
            if cp.get('company_name'):
                brand_info['name'] = str(cp['company_name'])
            if cp.get('phone'):
                brand_info['phone'] = str(cp['phone'])
            if cp.get('address'):
                brand_info['address'] = str(cp['address'])
            if cp.get('logo_url'):
                brand_info['logo_url'] = str(cp['logo_url'])
    except Exception:
        pass

    order_date = str(d.get('order_date') or meas.get('meas_date') or d.get('created_at') or '')[:10]
    delivery_date = str(d.get('delivery_date') or d.get('due_date') or meas.get('event_date') or '')[:10]

    # Detection for Ready-to-Wear (RTW) / POS immediate sales
    order_no_str = str(order_no).upper()
    order_status_str = str(d.get('status') or d.get('production_status') or '')
    is_pos = order_no_str.startswith('POS-') or d.get('order_type') in ('pos', 'ready_made', 'ready_to_wear')
    is_rtw = is_pos or (any(k in order_status_str for k in ['جاهز للتسليم', 'تم التسليم', 'Delivered', 'Ready']) and not has_discrete)

    if is_rtw:
        card_type = 'ready_to_wear'
        card_title = 'وثيقة ملكية وضمان فستان جاهز 🛍️👑'
        card_badge = 'شراء فوري من المعرض وضمان أصلي ✔️'
        delivery_status_label = 'تم الشراء والاستلام الفوري من المعرض بنجاح ✔️'
        if not delivery_date or delivery_date == 'None':
            delivery_date = order_date
        if is_standard_age_sizing:
            age_label = child_age if child_age else 'المقاس القياسي المعتمد'
            sizing_summary = f"مقاس كولكشن جاهز معتمد ({age_label})"
    else:
        card_type = 'bespoke_tailoring'
        card_title = 'وثيقة حجز وتفصيل فستان ملكي 👑'
        card_badge = 'حجز مؤكد ومقاسات معتمدة 🏷️'
        delivery_status_label = delivery_date

    care_instructions = [
        'تنظيف جاف فاخر (Dry Clean Only) للحفاظ على بريق الأقمشة والتطريز الكريستالي',
        'كي بالبخار بدرجة حرارة خفيفة لمعالجة طبقات التول والأورجانزا',
        'الحفظ داخل حقيبة القماش الخاصة بالأميرات بعيداً عن الرطوبة وأشعة الشمس المباشرة'
    ]

    return {
        'success': True,
        'order_no': order_no,
        'order_id': d.get('id'),
        'order_date': order_date,
        'delivery_date': delivery_date,
        'delivery_status_label': delivery_status_label,
        'is_ready_to_wear': is_rtw,
        'card_type': card_type,
        'card_title': card_title,
        'card_badge': card_badge,
        'care_instructions': care_instructions,
        'customer_name': customer_name,
        'customer_phone': str(d.get('customer_phone') or ''),
        'child_name': child_name,
        'child_age': child_age or 'مقاس معتمد',
        'product_name': product_name,
        'product_image': str(d.get('product_image') or d.get('image_url') or ''),
        'fabric_type': str(d.get('fabric_type') or d.get('fabric') or 'أقمشة فاخرة خاصة'),
        'color': str(d.get('color') or 'حسب الاختيار المعتمد'),
        'status': str(d.get('status') or 'نشط'),
        'stage': str(d.get('current_stage') or d.get('stage') or 'قيد التجهيز ✂️'),
        'progress': int(d.get('factory_progress') or d.get('progress') or 20),
        'notes': str(d.get('notes') or ''),
        'is_standard_age_sizing': is_standard_age_sizing,
        'sizing_summary': sizing_summary,
        'measurements': {
            'dress_length': d_len,
            'chest': chest,
            'waist': waist,
            'shoulder': shoulder,
            'sleeve_length': sleeve,
            'arm_hole': arm_hole,
            'notes': str(meas.get('notes') or '')
        },
        'financials': {
            'total': float(tot),
            'paid': float(pd),
            'remaining': float(rem),
            'currency': cur,
            'is_fully_paid': rem <= Decimal('0')
        },
        'verify_hash': f"LP-{verify_hash}",
        'brand': brand_info
    }
