# domains/accounting/tafqeet.py
# Arabic Financial Number-to-Words Engine (Tafqeet)
# Strictly adheres to financial decimal precision and Arabic grammar

from decimal import Decimal, ROUND_HALF_UP

ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"]
TENS = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"]
TEENS = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"]
HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"]

CURRENCIES = {
    'YER': {
        'singular': 'ريال يمني', 'dual': 'ريالان يمنيان', 'plural': 'ريالات يمنية', 'acc': 'ريال يمني',
        'sub_singular': 'فلس', 'sub_dual': 'فلسان', 'sub_plural': 'فلوس', 'sub_acc': 'فلساً'
    },
    'SAR': {
        'singular': 'ريال سعودي', 'dual': 'ريالان سعوديان', 'plural': 'ريالات سعودية', 'acc': 'ريال سعودي',
        'sub_singular': 'هللة', 'sub_dual': 'هللتان', 'sub_plural': 'هللات', 'sub_acc': 'هللة'
    },
    'USD': {
        'singular': 'دولار أمريكي', 'dual': 'دولاران أمريكيان', 'plural': 'دولارات أمريكية', 'acc': 'دولار أمريكي',
        'sub_singular': 'سنت', 'sub_dual': 'سنتان', 'sub_plural': 'سنتات', 'sub_acc': 'سنتاً'
    }
}


def _convert_three_digits(n: int) -> str:
    """تحويل الأرقام من 1 إلى 999 إلى كلمات عربية"""
    if n == 0:
        return ""
    parts = []
    h = n // 100
    rem = n % 100
    if h > 0:
        parts.append(HUNDREDS[h])
    if rem > 0:
        if rem < 10:
            parts.append(ONES[rem])
        elif rem < 20:
            parts.append(TEENS[rem - 10])
        else:
            u = rem % 10
            t = rem // 10
            if u > 0:
                parts.append(f"{ONES[u]} و{TENS[t]}")
            else:
                parts.append(TENS[t])
    return " و".join(parts)


def _format_scale(n: int, singular: str, dual: str, plural: str, base_word: str) -> str:
    """صياغة التمييز اللغوي العربي حسب العدد"""
    if n == 0:
        return ""
    if n == 1:
        return singular
    if n == 2:
        return dual
    words = _convert_three_digits(n)
    if 3 <= n <= 10:
        return f"{words} {plural}"
    return f"{words} {base_word}"


def tafqeet_arabic(amount, currency_code: str = 'YER') -> str:
    """
    تحويل المبلغ المالي إلى تفقيط عربي فصيح رسمي.
    مثال: 150000 YER -> فقط مائة وخمسون ألف ريال يمني لا غير
    """
    if amount is None:
        return "صفر"

    dec_val = Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if dec_val == 0:
        return "صفر"

    is_negative = dec_val < 0
    dec_val = abs(dec_val)

    integer_part = int(dec_val)
    fraction_part = int((dec_val - Decimal(integer_part)) * 100)

    curr = CURRENCIES.get(currency_code.upper(), CURRENCIES['YER'])

    billions = (integer_part // 1_000_000_000) % 1_000
    millions = (integer_part // 1_000_000) % 1_000
    thousands = (integer_part // 1_000) % 1_000
    units = integer_part % 1_000

    sections = []
    if billions > 0:
        sections.append(_format_scale(billions, "مليار", "ملياران", "مليارات", "مليار"))
    if millions > 0:
        sections.append(_format_scale(millions, "مليون", "مليونان", "ملايين", "مليون"))
    if thousands > 0:
        sections.append(_format_scale(thousands, "ألف", "ألفان", "آلاف", "ألف"))
    if units > 0:
        sections.append(_convert_three_digits(units))

    main_words = " و".join([s for s in sections if s])

    # تحديد تمييز العملة
    if integer_part == 0:
        currency_str = ""
    elif integer_part == 1:
        currency_str = curr['singular']
        main_words = ""
    elif integer_part == 2:
        currency_str = curr['dual']
        main_words = ""
    elif 3 <= (integer_part % 100) <= 10 and not (11 <= (integer_part % 100) <= 19) and units > 0 and not (thousands or millions or billions):
        currency_str = f"{main_words} {curr['plural']}"
    else:
        currency_str = f"{main_words} {curr['acc']}"

    result_parts = []
    if currency_str.strip():
        result_parts.append(currency_str.strip())

    if fraction_part > 0:
        sub_words = _convert_three_digits(fraction_part)
        if fraction_part == 1:
            sub_str = curr['sub_singular']
        elif fraction_part == 2:
            sub_str = curr['sub_dual']
        elif 3 <= fraction_part <= 10:
            sub_str = f"{sub_words} {curr['sub_plural']}"
        else:
            sub_str = f"{sub_words} {curr['sub_acc']}"
        result_parts.append(sub_str)

    prefix = "فقط سالب " if is_negative else "فقط "
    full_sentence = prefix + " و".join(result_parts).strip() + " لا غير"
    return " ".join(full_sentence.split())
