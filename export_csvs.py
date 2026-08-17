import csv
import os

CSV_DIR = 'google_sheets_csv'
os.makedirs(CSV_DIR, exist_ok=True)

# 1. Customers.csv
customers_headers = ['رقم العميل (Customer_ID)', 'اسم العميل (Full_Name)', 'رقم الهاتف (Phone_Number)', 'منصة التواصل (Social_Platform)', 'معرف التواصل (Social_Handle)', 'العنوان (Address)', 'نوع العميل (Customer_Type)', 'وحدة القياس المعتمدة (Default_Unit)', 'تاريخ التسجيل (Created_At)']
customers_rows = [
    ['CUST-1001', 'أميرة الأهدل', '771234567', 'واتساب', '@amira_ahdal', 'صنعاء - حدة', 'فرد', 'سم (cm)', '2026-07-01'],
    ['CUST-1002', 'سارة الكبسي', '777888999', 'انستغرام', '@sara_kibsi', 'صنعاء - الأصبحي', 'فرد', 'سم (cm)', '2026-07-05'],
    ['CUST-1003', 'فاطمة المحضار', '733445566', 'واتساب', '', 'صنعاء - الستين', 'فرد', 'سم (cm)', '2026-07-10'],
    ['CUST-1004', 'ياسمين الضبيبي', '711223344', 'تيك توك', '@yasmine_d', 'صنعاء - شارع بغداد', 'مدرسة', 'سم (cm)', '2026-07-15'],
    ['CUST-1005', 'مريم العرشي', '775511223', 'واتساب', '', 'صنعاء - بيت بوس', 'فرد', 'سم (cm)', '2026-07-20']
]

with open(os.path.join(CSV_DIR, '1_Customers.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(customers_headers)
    writer.writerows(customers_rows)

# 2. Customer_Measurements.csv
m_headers = ['رقم القياس (Measurement_ID)', 'رقم العميل (Customer_ID)', 'اسم نموذج القياس (Profile_Name)', 'الطول الكلي (Total_Length)', 'عرض الكتف (Shoulder_Width)', 'محيط الصدر (Chest_Circ)', 'محيط الخصر (Waist_Circ)', 'طول الكم (Sleeve_Length)', 'طول الصدر (Chest_Length)', 'ملاحظات المقاسات والتعديلات (Sizes_Notes)', 'تاريخ التحديث (Updated_At)']
m_rows = [
    ['MEAS-101', 'CUST-1001', 'فستان سهرة لؤلؤي', '140', '38', '94', '78', '60', '42', 'تطريز لؤلؤي على الصدر والأكمام مع قص خصر حوريّة', '2026-07-01'],
    ['MEAS-102', 'CUST-1002', 'فستان مخمل أحمر', '135', '36', '88', '72', '58', '40', 'كسرات خصر وبطانة حرير ياباني', '2026-07-05'],
    ['MEAS-103', 'CUST-1003', 'فستان زفاف دانتيل', '145', '40', '98', '82', '62', '44', 'طرحة 3 متر مطرزة بجوانب كريستال فرنسي', '2026-07-10'],
    ['MEAS-104', 'CUST-1004', 'زي مدرسي موحد', '130', '35', '84', '68', '56', '38', 'طقم 3 قطع (تنورة وجاكيت وقميص)', '2026-07-15'],
    ['MEAS-105', 'CUST-1005', 'فستان خطوبة شيفون', '138', '37', '90', '74', '59', '41', 'حزام ذهبي مطعم باللؤلؤ', '2026-07-20']
]

with open(os.path.join(CSV_DIR, '2_Customer_Measurements.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(m_headers)
    writer.writerows(m_rows)

# 3. Models_Products.csv
prod_headers = ['رقم الموديل (Product_ID)', 'اسم الموديل (Model_Name)', 'التصنيف (Category)', 'العملة المحددة (Currency)', 'نوع القماش المستهلك (Fabric_Name)', 'كمية القماش بالمتر (Fabric_Qty)', 'تكلفة المتر YER (Fabric_Unit_Cost_YER)', 'إجمالي تكلفة القماش YER (Total_Fabric_Cost_YER)', 'أجرة الخياطة YER (Labor_Cost_YER)', 'تكلفة التغليف والإكسسوارات YER (Packaging_Cost_YER)', 'التكلفة الإجمالية YER (Total_Product_Cost_YER)', 'سعر البيع YER (Sell_Price_YER)', 'صافي الربح YER (Net_Profit_YER)']
prod_rows = [
    ['PROD-201', 'فستان سهرة لؤلؤي ملكي', 'فساتين سهرة', 'USD', 'حرير ياباني ودانتيل', 3.5, 6360, 22260, 37100, 5300, 64660, 95400, 30740],
    ['PROD-202', 'فستان زفاف دانتيل فرنسي', 'فساتين زفاف', 'USD', 'دانتيل فرنسي وحرير', 5.0, 18550, 92750, 63600, 10600, 166950, 185500, 18550],
    ['PROD-203', 'فستان خطوبة شيفون ناعم', 'فساتين خطوبة', 'USD', 'شيفون وردي وحرير', 4.0, 4240, 16960, 31800, 5300, 54060, 84800, 30740],
    ['PROD-204', 'طقم زي مدرسي موحد', 'زي مدرسي', 'YER', 'كريب مطاط', 2.5, 3180, 7950, 7950, 1590, 17490, 21200, 3710],
    ['PROD-205', 'فستان كاجوال مخمل ملكي', 'فساتين كاجوال', 'USD', 'مخمل أحمر ملكي', 3.0, 9540, 28620, 23850, 3975, 56445, 63600, 7155]
]

with open(os.path.join(CSV_DIR, '3_Models_Products.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(prod_headers)
    writer.writerows(prod_rows)

# 4. Inventory_Items.csv
inv_headers = ['رقم المادة/القماش (Item_ID)', 'اسم المادة/القماش (Item_Name)', 'التصنيف (Category)', 'وحدة القياس (Unit_Type)', 'الكمية المتوفرة (Quantity_Available)', 'تكلفة الوحدة YER (Cost_Per_Unit_YER)', 'حد إنذار النقص (Min_Alert_Qty)']
inv_rows = [
    ['INV-301', 'قماش حرير ياباني طبيعي', 'أقمشة فاخرة', 'متر', 85, 6360, 15],
    ['INV-302', 'قماش مخمل ملكي أحمر', 'أقمشة سهرة', 'متر', 42, 9540, 10],
    ['INV-303', 'دانتيل فرنسي مطرز كريستال', 'دانتيل وإكسسوارات', 'متر', 28, 18550, 8],
    ['INV-304', 'شيفون ناعم درجات الوردي', 'أقمشة خفيفة', 'متر', 110, 4240, 20],
    ['INV-305', 'قماش كريب مطاط زي مدرسي', 'أقمشة مدرسية', 'متر', 150, 3180, 25],
    ['INV-306', 'خيوط خياطة ألماني مجمعة', 'مستلزمات خياطة', 'بكرة', 200, 795, 30],
    ['INV-307', 'سحابات مخفية كريستال 60سم', 'مستلزمات خياطة', 'قطعة', 120, 530, 20]
]

with open(os.path.join(CSV_DIR, '4_Inventory_Items.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(inv_headers)
    writer.writerows(inv_rows)

# 5. Purchases.csv
pur_headers = ['رقم حركة الشراء (Purchase_ID)', 'رقم الفاتورة الورقية (Bill_No)', 'اسم المورد (Supplier_Name)', 'اسم المادة الشتراة (Item_Name)', 'الكمية (Quantity)', 'سعر الوحدة (Unit_Price)', 'عملة الشراء (Currency)', 'سعر الصرف (Exchange_Rate)', 'تكلفة النقل YER (Transport_Cost_YER)', 'عمولات التحويل YER (Transfer_Fee_YER)', 'الإجمالي YER (Total_Amount_YER)', 'حساب الصرف (Payment_Source)', 'تاريخ الشراء (Date_Added)']
pur_rows = [
    ['PUR-401', 'BILL-8891', 'مؤسسة البركة للأقمشة', 'قماش مخمل ملكي أحمر', 50, 18.0, 'USD', 530, 5300, 2650, 484950, 'حساب البنك الرئيسية', '2026-07-10'],
    ['PUR-402', 'BILL-8892', 'مورد الدانتيل الفرنسي', 'دانتيل فرنسي مطرز كريستال', 30, 35.0, 'USD', 530, 10600, 5300, 572400, 'الصندوق الرئيسي', '2026-07-12'],
    ['PUR-403', 'BILL-8893', 'محلات الخاطر للمستلزمات', 'خيوط وسحابات مخفية', 300, 1.5, 'USD', 530, 2650, 1325, 242475, 'الصندوق الرئيسي', '2026-07-18']
]

with open(os.path.join(CSV_DIR, '5_Purchases.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(pur_headers)
    writer.writerows(pur_rows)

# 6. Orders.csv
ord_headers = ['رقم الطلب/الفاتورة (Order_No)', 'رقم العميل (Customer_ID)', 'اسم العميل (Customer_Name)', 'رقم الهاتف (Phone)', 'عملة الطلب (Currency)', 'سعر الصرف (Exchange_Rate)', 'إجمالي الفاتورة YER (Total_Amount_YER)', 'العربون YER (Paid_Amount_YER)', 'المبلغ المتبقي YER (Remaining_Amount_YER)', 'رسوم التوصيل YER (Delivery_Fees_YER)', 'حالة الطلب (Status)', 'طريقة دفع العربون (Payment_Method)', 'رقم الحوالة (Transfer_No)', 'تاريخ الطلب (Order_Date)', 'تاريخ التسليم المتوقع (Delivery_Date)', 'ملاحظات وتفاصيل (Notes)']
ord_rows = [
    ['ORD-2026-001', 'CUST-1001', 'أميرة الأهدل', '771234567', 'USD', 530, 95400, 53000, 42400, 2650, 'قيد الخياطة 🪡', 'حوالة بنكية', 'TR-9982', '2026-07-20', '2026-08-05', 'تفصيل خاص مع تطريز يدوي'],
    ['ORD-2026-002', 'CUST-1002', 'سارة الكبسي', '777888999', 'USD', 530, 63600, 31800, 31800, 0, 'مرحلة القص ✂️', 'نقد (كاش)', '', '2026-07-22', '2026-08-01', 'تحديد خصر دقيق مع بطانة'],
    ['ORD-2026-003', 'CUST-1003', 'فاطمة المحضار', '733445566', 'USD', 530, 185500, 106000, 79500, 5300, 'التطريز والتركيب 👑', 'حوالة بنكية', 'TR-1044', '2026-07-15', '2026-08-15', 'طرحة 3 أمتار مطرزة'],
    ['ORD-2026-004', 'CUST-1004', 'ياسمين الضبيبي', '711223344', 'YER', 1.0, 42400, 42400, 0, 0, 'جاهز للتسليم 🎁', 'نقد (كاش)', '', '2026-07-25', '2026-08-10', 'مقاسات مدرسية خاصة'],
    ['ORD-2026-005', 'CUST-1005', 'مريم العرشي', '775511223', 'USD', 530, 84800, 42400, 42400, 0, 'قيد الخياطة 🪡', 'نقد (كاش)', '', '2026-07-26', '2026-08-12', 'حزام ذهبي مطعم باللؤلؤ']
]

with open(os.path.join(CSV_DIR, '6_Orders.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(ord_headers)
    writer.writerows(ord_rows)

# 7. Accounts.csv
acc_headers = ['رمز الحساب (Account_Code)', 'اسم الحساب بالعربية (Account_Name)', 'نوع الحساب (Account_Type)', 'الرصيد بالريال اليمني (Balance_YER)']
acc_rows = [
    [101, 'الصندوق الرئيسي (خزينة الورشة)', 'أصول متداولة', 222600],
    [102, 'حساب بنك اليمن والكويت / المحافظ الرقمية', 'أصول متداولة', 450500],
    [104, 'ذمم العملاء (مستحقات خارجيّة متفتحة)', 'أصول متداولة', 196100],
    [105, 'مخزون الأقمشة والخامات ومستلزمات الخياطة', 'أصول متداولة', 768500],
    [106, 'الأصول الثابتة (ماكينات خياطة وتطريز)', 'أصول ثابتة', 1696000],
    [201, 'ذمم الموردين ومحلات الأقمشة', 'التزامات متداولة', 148400],
    [202, 'عرابين وأمانات عملاء الفساتين', 'التزامات متداولة', 275600],
    [301, 'رأس المال المباشر لمؤسسة Little Princesses', 'حقوق ملكية', 2650000],
    [401, 'إيرادات تفصيل خياطة الفساتين والزي المدرسي', 'إيرادات النشاط', 1001700],
    [501, 'أجور ورواتب الخياطين والمطرزين', 'مصاريف تشغيلية', 238500],
    [502, 'إيجار ورشة الخياطة والمعمل', 'مصاريف تشغيلية', 159000],
    [503, 'مصاريف الكهرباء والماء والصيانة', 'مصاريف تشغيلية', 47700]
]

with open(os.path.join(CSV_DIR, '7_Accounts.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(acc_headers)
    writer.writerows(acc_rows)

# 8. Vouchers.csv
vouch_headers = ['رقم السند (Voucher_No)', 'نوع السند (Voucher_Type)', 'عملة السند (Currency)', 'المبلغ بالعملة (Amount)', 'سعر الصرف YER (Exchange_Rate)', 'المبلغ الصافي YER (Amount_YER)', 'اسم الحساب/الجهة (Account_Name)', 'البيان/السبب (Statement)', 'تاريخ السند (Date_Added)']
vouch_rows = [
    ['VOUCH-1001', 'قبض عربون', 'USD', 100, 530, 53000, 'أميرة الأهدل', 'عربون تفصيل فستان سهرة لؤلؤي ملكي', '2026-07-20'],
    ['VOUCH-1002', 'صرف مصاريف', 'USD', 150, 530, 79500, 'مؤسسة البركة للأقمشة', 'شراء شحنة أقمشة مخمل ودانتيل', '2026-07-21'],
    ['VOUCH-1003', 'قبض عربون', 'USD', 60, 530, 31800, 'سارة الكبسي', 'عربون فستان مخمل أحمر ملكي', '2026-07-22'],
    ['VOUCH-1004', 'صرف أجور', 'USD', 80, 530, 42400, 'معلم خياطة محمود', 'دفعة من أجور خياطة طلبيات الأسبوع', '2026-07-24'],
    ['VOUCH-1005', 'قبض كامل', 'YER', 42400, 1.0, 42400, 'ياسمين الضبيبي', 'تسديد كامل قيمة الزي المدرسي الموحد', '2026-07-25']
]

with open(os.path.join(CSV_DIR, '8_Vouchers.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(vouch_headers)
    writer.writerows(vouch_rows)

# 9. Journal_Entries.csv
j_headers = ['رقم القيد (Entry_No)', 'تاريخ القيد (Entry_Date)', 'الحساب المدين (Debit_Account)', 'الحساب الدائن (Credit_Account)', 'المبلغ YER (Amount_YER)', 'العملة الأصلية (Original_Currency)', 'البيان وشرح القيد (Statement)', 'نوع المرجع (Ref_Type)']
j_rows = [
    ['ENTRY-501', '2026-07-20', 'الصندوق الرئيسي (101)', 'إيرادات التفصيل (401)', 53000, 'USD', 'عربون مبيعات فستان أميرة الأهدل', 'فاتورة مبيعات'],
    ['ENTRY-502', '2026-07-21', 'مخزون الأقمشة (105)', 'الصندوق الرئيسي (101)', 79500, 'USD', 'شراء خامات مخمل ودانتيل ورشة الخياطة', 'فاتورة مشتريات'],
    ['ENTRY-503', '2026-07-22', 'الصندوق الرئيسي (101)', 'إيرادات التفصيل (401)', 31800, 'USD', 'عربون مبيعات فستان سارة الكبسي', 'فاتورة مبيعات'],
    ['ENTRY-504', '2026-07-24', 'مصاريف الخياطين (501)', 'الصندوق الرئيسي (101)', 42400, 'USD', 'صرف أجرة معلم الخياطة محمود', 'سند صرف أجور']
]

with open(os.path.join(CSV_DIR, '9_Journal_Entries.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(j_headers)
    writer.writerows(j_rows)

# 10. Company_Profile.csv
cp_headers = ['المعرف (ID)', 'اسم المؤسسة (Company_Name)', 'رقم الهاتف (Phone)', 'العنوان (Address)', 'البريد الإلكتروني (Email)', 'مسار الشعار (Logo_Path)']
cp_rows = [
    [1, 'مؤسسة Little Princesses 👑', '771234567', 'صنعاء - حدة', 'info@littleprincesses.com', 'logo.png']
]

with open(os.path.join(CSV_DIR, '10_Company_Profile.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(cp_headers)
    writer.writerows(cp_rows)

# 11. Users.csv
u_headers = ['رقم المستخدم (User_ID)', 'اسم المستخدم (Username)', 'كلمة السر (Password)', 'الدور / الصلاحية (Role)']
u_rows = [
    [1, 'admin', '1234', 'المدير العام'],
    [2, 'cashier', '1234', 'كاشير ومبيعات'],
    [3, 'workshop', '1234', 'مديرة الورشة']
]

with open(os.path.join(CSV_DIR, '11_Users.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(u_headers)
    writer.writerows(u_rows)

print("Exported all 11 CSV files successfully with full data rows!")
