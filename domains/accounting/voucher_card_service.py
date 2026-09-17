# domains/accounting/voucher_card_service.py
# Visual Voucher Card Formatter and Metadata Service

import hashlib
from decimal import Decimal
import pg_service
from domains.accounting.tafqeet import tafqeet_arabic


def format_voucher_for_card(v: dict) -> dict:
    """
    تجهيز وتنسيق بيانات السند المالي كبطاقة مرئية معتمدة قابلة للمشاركة
    """
    v_no = str(v.get('voucher_no') or v.get('payment_no') or v.get('id') or 'VOUCH-000000').strip()
    raw_type = str(v.get('voucher_type') or v.get('payment_type') or v.get('v_type') or '').strip()

    is_receipt = (
        'قبض' in raw_type or
        raw_type.lower() in ('receipt', 'receipt_voucher', 'rv') or
        v_no.upper().startswith('RV')
    )

    v_type = 'سند قبض' if is_receipt else 'سند صرف'
    party_title = 'المقبوض منه' if is_receipt else 'المدفوع لأمره'
    party_name = str(v.get('party_name') or v.get('party') or 'عميل محترم').strip()

    amt_raw = v.get('amount', 0.0)
    try:
        amt_dec = Decimal(str(amt_raw))
    except Exception:
        amt_dec = Decimal('0.00')

    curr = str(v.get('currency') or 'YER').upper()
    written_amt = tafqeet_arabic(amt_dec, curr)
    formatted_amt = f"{amt_dec:,.2f}".replace('.00', '')

    date_str = str(v.get('date_created') or v.get('date') or '')[:16]
    pay_method = str(v.get('pay_method') or v.get('payment_method') or 'نقداً بالخزينة')
    transfer_no = str(v.get('transfer_no') or v.get('ref_no') or v.get('notes_ref') or '—')
    notes = str(v.get('notes') or 'تسديد دفعة حساب وفق الأصول المالية').strip()

    # رمز التحقق الأمني المشفر
    verify_hash = hashlib.sha256(f"{v_no}|{amt_dec}|{curr}|{date_str}".encode('utf-8')).hexdigest()[:12].upper()
    qr_payload = f"LP-ERP:VERIFY|{v_no}|{v_type}|{amt_dec}|{curr}|{date_str}|{verify_hash}"

    # جلب بيانات وهوية المؤسسة ديناميكياً من إعدادات النظام
    try:
        settings = pg_service.get_system_settings()
        company = settings.get('company', {}) if isinstance(settings, dict) else {}
    except Exception:
        company = {}

    brand_name = str(company.get('company_name') or v.get('brand_name') or 'مؤسسة الأميرات الصغيرات').strip()
    brand_phone = str(company.get('phone') or v.get('brand_phone') or '').strip()
    brand_address = str(company.get('address') or v.get('brand_address') or '').strip()
    brand_logo = str(company.get('logo_url') or v.get('logo_url') or '').strip()
    brand_email = str(company.get('email') or v.get('brand_email') or '').strip()

    return {
        'success': True,
        'voucher_no': v_no,
        'voucher_type': v_type,
        'is_receipt': is_receipt,
        'badge_label': 'إشعار استلام نقدي / سند قبض' if is_receipt else 'إشعار صرف نقدي / سند صرف',
        'badge_color': '#059669' if is_receipt else '#991b1b',
        'badge_bg': '#ecfdf5' if is_receipt else '#fef2f2',
        'party_title': party_title,
        'party_name': party_name,
        'amount': float(amt_dec),
        'formatted_amount': formatted_amt,
        'currency': curr,
        'currency_label': 'ريال يمني' if curr == 'YER' else ('ريال سعودي' if curr == 'SAR' else 'دولار أمريكي'),
        'written_amount': written_amt,
        'pay_method': pay_method,
        'transfer_no': transfer_no,
        'date': date_str,
        'notes': notes,
        'brand_name': brand_name,
        'brand_subtitle': 'وثيقة مالية معتمدة عبر النظام المحاسبي الموحد',
        'brand_tax_id': str(company.get('commercial_register') or 'CR-1010-009283'),
        'brand_address': brand_address or 'اليمن - صنعاء',
        'brand_phone': brand_phone or '776773458',
        'brand_email': brand_email,
        'brand_logo': brand_logo,
        'verify_hash': verify_hash,
        'qr_payload': qr_payload
    }


def get_voucher_card_data(voucher_id_or_no: str) -> dict:
    """استعلام وجلب بيانات السند وتجهيزها للعرض في البطاقة المرئية"""
    if not voucher_id_or_no:
        return {'success': False, 'error': 'رقم أو معرف السند مطلوب'}

    target = str(voucher_id_or_no).strip()
    vouchers = pg_service.get_vouchers()

    found = None
    for v in vouchers:
        if (
            str(v.get('voucher_no', '')).strip() == target or
            str(v.get('payment_no', '')).strip() == target or
            str(v.get('id', '')).strip() == target
        ):
            found = v
            break

    if not found:
        # البحث مع تجاهل بادئات RV- أو PV-
        clean_target = target.replace('RV-', '').replace('PV-', '')
        for v in vouchers:
            v_n = str(v.get('voucher_no', '')).replace('RV-', '').replace('PV-', '').strip()
            if v_n == clean_target:
                found = v
                break

    if not found:
        return {'success': False, 'error': f'السند رقم {target} غير مسجل في النظام'}

    return format_voucher_for_card(found)
