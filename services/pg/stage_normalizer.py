# services/pg/stage_normalizer.py
# Canonical Stage Normalizer for Little Princesses ERP

CANONICAL_STAGES = ('cutting', 'sewing', 'embroidery', 'finishing')

CANONICAL_STAGE_NAMES = {
    'cutting': 'القص والتحضير ✂️',
    'sewing': 'مرحلة الخياطة 🪡',
    'embroidery': 'التطريز والشك ✨',
    'finishing': 'الفحص والتشطيب النهائي 🔍'
}


def normalize_canonical_stage(stage_str):
    """
    توحيد المسميات المترادفة إلى 4 مفاتيح معيارية موحدة:
    - cutting: القص والتحضير، القص والباترون، التفصيل
    - sewing: مرحلة الخياطة، الخياطة والتفصيل
    - embroidery: التطريز والشك، التطريز والشك اليدوي
    - finishing: الفحص والتشطيب النهائي، الكي والتشطيب النهائي
    مراحل التسليم والجاهزية ليست مراحل تشغيلية بأجر وتُرجع None.
    """
    if not stage_str:
        return None
    s = str(stage_str).replace('✂️', '').replace('🪡', '').replace('✨', '').replace('🔍', '').replace('📦', '').replace('🛍️', '').replace('✅', '').strip().lower()
    if any(k in s for k in ['تسليم', 'جاهز', 'ready', 'deliver']):
        return None
    if any(k in s for k in ['قص', 'باترون', 'تحضير', 'cut']):
        return 'cutting'
    if any(k in s for k in ['خياط', 'تفصيل', 'sew']):
        return 'sewing'
    if any(k in s for k in ['تطريز', 'شك', 'embroid']):
        return 'embroidery'
    if any(k in s for k in ['تشطيب', 'فحص', 'كي', 'finish', 'inspect']):
        return 'finishing'
    return None
