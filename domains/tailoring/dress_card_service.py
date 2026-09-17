# domains/tailoring/dress_card_service.py
# Royal Dress Card & Atelier Hangtag Service
# Extracts and normalizes bespoke tailoring data for luxury dress cards

import hashlib
from decimal import Decimal
import pg_service


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

    return {
        'success': True,
        'order_no': order_no,
        'order_id': d.get('id'),
        'order_date': str(d.get('order_date') or d.get('created_at') or '')[:10],
        'delivery_date': str(d.get('delivery_date') or d.get('due_date') or '')[:10],
        'fitting_date': str(d.get('fitting_date') or d.get('start_date') or '')[:10],
        'customer_name': customer_name,
        'customer_phone': str(d.get('customer_phone') or ''),
        'child_name': child_name,
        'child_age': str(d.get('child_age') or d.get('age') or ''),
        'product_name': product_name,
        'product_image': str(d.get('product_image') or d.get('image_url') or ''),
        'fabric_type': str(d.get('fabric_type') or d.get('fabric') or 'أقمشة فاخرة خاصة'),
        'color': str(d.get('color') or 'حسب الاختيار المعتمد'),
        'status': str(d.get('status') or 'نشط'),
        'stage': str(d.get('current_stage') or d.get('stage') or 'قيد التجهيز ✂️'),
        'progress': int(d.get('factory_progress') or d.get('progress') or 20),
        'notes': str(d.get('notes') or ''),
        'measurements': {
            'dress_length': str(meas.get('dress_length') or meas.get('dress_len') or '—'),
            'chest': str(meas.get('chest') or meas.get('chest_circ') or '—'),
            'waist': str(meas.get('waist') or meas.get('waist_circ') or '—'),
            'shoulder': str(meas.get('shoulder') or meas.get('shoulder_w') or '—'),
            'sleeve_length': str(meas.get('sleeve_length') or meas.get('sleeve_len') or '—'),
            'arm_hole': str(meas.get('arm_hole') or meas.get('armpit_circ') or '—'),
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
        'brand': {
            'name': 'ليتل برنسيس للأزياء الفاخرة',
            'tagline': 'دار الأزياء والتفصيل الراقي لفساتين الأميرات',
            'phone': '776773458',
            'address': 'اليمن - صنعاء - شارع حدة'
        }
    }
