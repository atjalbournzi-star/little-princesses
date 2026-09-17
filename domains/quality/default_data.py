# domains/quality/default_data.py
# Default seed data for quality checkpoints and settings

DEFAULT_QUALITY_CHECKPOINTS = [
    ("CHK-01", "فحص الخامات والأقمشة المستلمة", "فحص الخامات", "مطابقة اللون، النعومة، خلو النسيج من العيوب والشحوب", "نعم", "مطابقة عينة الباترون 100%", "±0%", "Active"),
    ("CHK-02", "فحص القص والباترون", "القص", "دقة أبعاد ومقاسات الأجزاء المقصوصة ومطابقة جدول المقاسات", "نعم", "عدم تجاوز هامش الخياطة 0.5 سم", "±0.5cm", "Active"),
    ("CHK-03", "فحص الخياطة والدرزات", "الخياطة", "استقامة الدرزة، ثبات الشد، نظافة البطانة وعدم وجود حواف خشنة", "نعم", "خياطة مزدوجة ناعمة على بشرة الطفلة", "100%", "Active"),
    ("CHK-04", "فحص التطريز والشك", "التطريز", "ثبات الكريستال والخرز، متانة التثبيت اليدوي للأزهار", "نعم", "اختبار الشد اللطيف", "100%", "Active"),
    ("CHK-05", "الفحص النهائي والكي والتغليف", "الفحص النهائي", "نظافة الفستان، الكي بالبخار، الكرت الفاخر والشريطة", "نعم", "تغليف فندقي فاخر خالي من الغبار", "100%", "Active")
]

DEFAULT_QUALITY_SETTINGS = [
    ("Overall Quality Score", "OQS", "Weighted Composite (Production 25%, Reliability 25%, Customer 20%, Supplier 15%, Sizing 15%)", 95.0, 85.0, 70.0, 1.0, "Active"),
    ("Defect Rate", "DEF_RATE", "(Defective Units / Total Produced) * 100", 2.0, 5.0, 10.0, 0.25, "Active"),
    ("First Pass Yield", "FPY", "(Units Passed First Time / Total Inspected) * 100", 98.0, 92.0, 85.0, 0.25, "Active"),
    ("Customer Satisfaction", "CSAT", "Average Star Rating / 5.0", 4.8, 4.2, 3.5, 0.20, "Active"),
    ("Net Promoter Score", "NPS", "% Promoters - % Detractors", 80.0, 50.0, 20.0, 0.20, "Active"),
    ("Cost of Poor Quality", "COPQ", "Rework Cost + Scrap + Return Refund", 1.5, 3.0, 6.0, 0.15, "Active"),
    ("Supplier Acceptance Rate", "SQS", "(Accepted Yards / Total Received) * 100", 98.0, 93.0, 85.0, 0.15, "Active"),
    ("Sizing Fit Accuracy", "SIZING_FIT", "100 - Sizing Error Rate", 96.0, 90.0, 80.0, 0.15, "Active")
]
