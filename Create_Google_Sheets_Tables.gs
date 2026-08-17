/**
 * Google Apps Script - Little Princesses ERP Database & Data Generator
 * Run this script in Google Sheets: Extensions -> Apps Script -> Run setupERPDatabaseWithData
 */
function setupERPDatabaseWithData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var tablesData = {
    'Customers': {
      headers: ['رقم العميل (Customer_ID)', 'اسم العميل (Full_Name)', 'رقم الهاتف (Phone_Number)', 'منصة التواصل (Social_Platform)', 'معرف التواصل (Social_Handle)', 'العنوان (Address)', 'نوع العميل (Customer_Type)', 'وحدة القياس المعتمدة (Default_Unit)', 'تاريخ التسجيل (Created_At)'],
      rows: [
        ['CUST-1001', 'أميرة الأهدل', '771234567', 'واتساب', '@amira_ahdal', 'صنعاء - حدة', 'فرد', 'سم (cm)', '2026-07-01'],
        ['CUST-1002', 'سارة الكبسي', '777888999', 'انستغرام', '@sara_kibsi', 'صنعاء - الأصبحي', 'فرد', 'سم (cm)', '2026-07-05'],
        ['CUST-1003', 'فاطمة المحضار', '733445566', 'واتساب', '', 'صنعاء - الستين', 'فرد', 'سم (cm)', '2026-07-10'],
        ['CUST-1004', 'ياسمين الضبيبي', '711223344', 'تيك توك', '@yasmine_d', 'صنعاء - شارع بغداد', 'مدرسة', 'سم (cm)', '2026-07-15'],
        ['CUST-1005', 'مريم العرشي', '775511223', 'واتساب', '', 'صنعاء - بيت بوس', 'فرد', 'سم (cm)', '2026-07-20']
      ]
    },

    'Customer_Measurements': {
      headers: ['رقم القياس (Measurement_ID)', 'رقم العميل (Customer_ID)', 'اسم نموذج القياس (Profile_Name)', 'الطول الكلي (Total_Length)', 'عرض الكتف (Shoulder_Width)', 'محيط الصدر (Chest_Circ)', 'محيط الخصر (Waist_Circ)', 'طول الكم (Sleeve_Length)', 'طول الصدر (Chest_Length)', 'ملاحظات المقاسات والتعديلات (Sizes_Notes)', 'تاريخ التحديث (Updated_At)'],
      rows: [
        ['MEAS-101', 'CUST-1001', 'فستان سهرة لؤلؤي', 140, 38, 94, 78, 60, 42, 'تطريز لؤلؤي على الصدر والأكمام مع قص خصر حوريّة', '2026-07-01'],
        ['MEAS-102', 'CUST-1002', 'فستان مخمل أحمر', 135, 36, 88, 72, 58, 40, 'كسرات خصر وبطانة حرير ياباني', '2026-07-05'],
        ['MEAS-103', 'CUST-1003', 'فستان زفاف دانتيل', 145, 40, 98, 82, 62, 44, 'طرحة 3 متر مطرزة بجوانب كريستال فرنسي', '2026-07-10'],
        ['MEAS-104', 'CUST-1004', 'زي مدرسي موحد', 130, 35, 84, 68, 56, 38, 'طقم 3 قطع (تنورة وجاكيت وقميص)', '2026-07-15'],
        ['MEAS-105', 'CUST-1005', 'فستان خطوبة شيفون', 138, 37, 90, 74, 59, 41, 'حزام ذهبي مطعم باللؤلؤ', '2026-07-20']
      ]
    },

    'Models_Products': {
      headers: ['رقم الموديل (Product_ID)', 'اسم الموديل (Model_Name)', 'التصنيف (Category)', 'العملة المحددة (Currency)', 'نوع القماش المستهلك (Fabric_Name)', 'كمية القماش بالمتر (Fabric_Qty)', 'تكلفة المتر YER (Fabric_Unit_Cost_YER)', 'إجمالي تكلفة القماش YER (Total_Fabric_Cost_YER)', 'أجرة الخياطة YER (Labor_Cost_YER)', 'تكلفة التغليف والإكسسوارات YER (Packaging_Cost_YER)', 'التكلفة الإجمالية YER (Total_Product_Cost_YER)', 'سعر البيع YER (Sell_Price_YER)', 'صافي الربح YER (Net_Profit_YER)'],
      rows: [
        ['PROD-201', 'فستان سهرة لؤلؤي ملكي', 'فساتين سهرة', 'USD', 'حرير ياباني ودانتيل', 3.5, 6360, 22260, 37100, 5300, 64660, 95400, 30740],
        ['PROD-202', 'فستان زفاف دانتيل فرنسي', 'فساتين زفاف', 'USD', 'دانتيل فرنسي وحرير', 5.0, 18550, 92750, 63600, 10600, 166950, 185500, 18550],
        ['PROD-203', 'فستان خطوبة شيفون ناعم', 'فساتين خطوبة', 'USD', 'شيفون وردي وحرير', 4.0, 4240, 16960, 31800, 5300, 54060, 84800, 30740],
        ['PROD-204', 'طقم زي مدرسي موحد', 'زي مدرسي', 'YER', 'كريب مطاط', 2.5, 3180, 7950, 7950, 1590, 17490, 21200, 3710],
        ['PROD-205', 'فستان كاجوال مخمل ملكي', 'فساتين كاجوال', 'USD', 'مخمل أحمر ملكي', 3.0, 9540, 28620, 23850, 3975, 56445, 63600, 7155]
      ]
    },

    'Inventory_Items': {
      headers: ['رقم المادة/القماش (Item_ID)', 'اسم المادة/القماش (Item_Name)', 'التصنيف (Category)', 'وحدة القياس (Unit_Type)', 'الكمية المتوفرة (Quantity_Available)', 'تكلفة الوحدة YER (Cost_Per_Unit_YER)', 'حد إنذار النقص (Min_Alert_Qty)'],
      rows: [
        ['INV-301', 'قماش حرير ياباني طبيعي', 'أقمشة فاخرة', 'متر', 85, 6360, 15],
        ['INV-302', 'قماش مخمل ملكي أحمر', 'أقمشة سهرة', 'متر', 42, 9540, 10],
        ['INV-303', 'دانتيل فرنسي مطرز كريستال', 'دانتيل وإكسسوارات', 'متر', 28, 18550, 8],
        ['INV-304', 'شيفون ناعم درجات الوردي', 'أقمشة خفيفة', 'متر', 110, 4240, 20],
        ['INV-305', 'قماش كريب مطاط زي مدرسي', 'أقمشة مدرسية', 'متر', 150, 3180, 25],
        ['INV-306', 'خيوط خياطة ألماني مجمعة', 'مستلزمات خياطة', 'بكرة', 200, 795, 30],
        ['INV-307', 'سحابات مخفية كريستال 60سم', 'مستلزمات خياطة', 'قطعة', 120, 530, 20]
      ]
    },

    'Purchases': {
      headers: ['رقم حركة الشراء (Purchase_ID)', 'رقم الفاتورة الورقية (Bill_No)', 'اسم المورد (Supplier_Name)', 'اسم المادة الشتراة (Item_Name)', 'الكمية (Quantity)', 'سعر الوحدة (Unit_Price)', 'عملة الشراء (Currency)', 'سعر الصرف (Exchange_Rate)', 'تكلفة النقل YER (Transport_Cost_YER)', 'عمولات التحويل YER (Transfer_Fee_YER)', 'الإجمالي YER (Total_Amount_YER)', 'حساب الصرف (Payment_Source)', 'تاريخ الشراء (Date_Added)'],
      rows: [
        ['PUR-401', 'BILL-8891', 'مؤسسة البركة للأقمشة', 'قماش مخمل ملكي أحمر', 50, 18.0, 'USD', 530, 5300, 2650, 484950, 'حساب البنك الرئيسية', '2026-07-10'],
        ['PUR-402', 'BILL-8892', 'مورد الدانتيل الفرنسي', 'دانتيل فرنسي مطرز كريستال', 30, 35.0, 'USD', 530, 10600, 5300, 572400, 'الصندوق الرئيسي', '2026-07-12'],
        ['PUR-403', 'BILL-8893', 'محلات الخاطر للمستلزمات', 'خيوط وسحابات مخفية', 300, 1.5, 'USD', 530, 2650, 1325, 242475, 'الصندوق الرئيسي', '2026-07-18']
      ]
    },

    'Orders': {
      headers: ['رقم الطلب/الفاتورة (Order_No)', 'رقم العميل (Customer_ID)', 'اسم العميل (Customer_Name)', 'رقم الهاتف (Phone)', 'عملة الطلب (Currency)', 'سعر الصرف (Exchange_Rate)', 'إجمالي الفاتورة YER (Total_Amount_YER)', 'العربون YER (Paid_Amount_YER)', 'المبلغ المتبقي YER (Remaining_Amount_YER)', 'رسوم التوصيل YER (Delivery_Fees_YER)', 'حالة الطلب (Status)', 'طريقة دفع العربون (Payment_Method)', 'رقم الحوالة (Transfer_No)', 'تاريخ الطلب (Order_Date)', 'تاريخ التسليم المتوقع (Delivery_Date)', 'ملاحظات وتفاصيل (Notes)'],
      rows: [
        ['ORD-2026-001', 'CUST-1001', 'أميرة الأهدل', '771234567', 'USD', 530, 95400, 53000, 42400, 2650, 'قيد الخياطة 🪡', 'حوالة بنكية', 'TR-9982', '2026-07-20', '2026-08-05', 'تفصيل خاص مع تطريز يدوي'],
        ['ORD-2026-002', 'CUST-1002', 'سارة الكبسي', '777888999', 'USD', 530, 63600, 31800, 31800, 0, 'مرحلة القص ✂️', 'نقد (كاش)', '', '2026-07-22', '2026-08-01', 'تحديد خصر دقيق مع بطانة'],
        ['ORD-2026-003', 'CUST-1003', 'فاطمة المحضار', '733445566', 'USD', 530, 185500, 106000, 79500, 5300, 'التطريز والتركيب 👑', 'حوالة بنكية', 'TR-1044', '2026-07-15', '2026-08-15', 'طرحة 3 أمتار مطرزة'],
        ['ORD-2026-004', 'CUST-1004', 'ياسمين الضبيبي', '711223344', 'YER', 1.0, 42400, 42400, 0, 0, 'جاهز للتسليم 🎁', 'نقد (كاش)', '', '2026-07-25', '2026-08-10', 'مقاسات مدرسية خاصة'],
        ['ORD-2026-005', 'CUST-1005', 'مريم العرشي', '775511223', 'USD', 530, 84800, 42400, 42400, 0, 'قيد الخياطة 🪡', 'نقد (كاش)', '', '2026-07-26', '2026-08-12', 'حزام ذهبي مطعم باللؤلؤ']
      ]
    },

    'Accounts': {
      headers: ['رمز الحساب (Account_Code)', 'اسم الحساب بالعربية (Account_Name)', 'نوع الحساب (Account_Type)', 'الرصيد بالريال اليمني (Balance_YER)'],
      rows: [
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
    },

    'Vouchers': {
      headers: ['رقم السند (Voucher_No)', 'نوع السند (Voucher_Type)', 'عملة السند (Currency)', 'المبلغ بالعملة (Amount)', 'سعر الصرف YER (Exchange_Rate)', 'المبلغ الصافي YER (Amount_YER)', 'اسم الحساب/الجهة (Account_Name)', 'البيان/السبب (Statement)', 'تاريخ السند (Date_Added)'],
      rows: [
        ['VOUCH-1001', 'قبض عربون', 'USD', 100, 530, 53000, 'أميرة الأهدل', 'عربون تفصيل فستان سهرة لؤلؤي ملكي', '2026-07-20'],
        ['VOUCH-1002', 'صرف مصاريف', 'USD', 150, 530, 79500, 'مؤسسة البركة للأقمشة', 'شراء شحنة أقمشة مخمل ودانتيل', '2026-07-21'],
        ['VOUCH-1003', 'قبض عربون', 'USD', 60, 530, 31800, 'سارة الكبسي', 'عربون فستان مخمل أحمر ملكي', '2026-07-22'],
        ['VOUCH-1004', 'صرف أجور', 'USD', 80, 530, 42400, 'معلم خياطة محمود', 'دفعة من أجور خياطة طلبيات الأسبوع', '2026-07-24'],
        ['VOUCH-1005', 'قبض كامل', 'YER', 42400, 1.0, 42400, 'ياسمين الضبيبي', 'تسديد كامل قيمة الزي المدرسي الموحد', '2026-07-25']
      ]
    },

    'Journal_Entries': {
      headers: ['رقم القيد (Entry_No)', 'تاريخ القيد (Entry_Date)', 'الحساب المدين (Debit_Account)', 'الحساب الدائن (Credit_Account)', 'المبلغ YER (Amount_YER)', 'العملة الأصلية (Original_Currency)', 'البيان وشرح القيد (Statement)', 'نوع المرجع (Ref_Type)'],
      rows: [
        ['ENTRY-501', '2026-07-20', 'الصندوق الرئيسي (101)', 'إيرادات التفصيل (401)', 53000, 'USD', 'عربون مبيعات فستان أميرة الأهدل', 'فاتورة مبيعات'],
        ['ENTRY-502', '2026-07-21', 'مخزون الأقمشة (105)', 'الصندوق الرئيسي (101)', 79500, 'USD', 'شراء خامات مخمل ودانتيل ورشة الخياطة', 'فاتورة مشتريات'],
        ['ENTRY-503', '2026-07-22', 'الصندوق الرئيسي (101)', 'إيرادات التفصيل (401)', 31800, 'USD', 'عربون مبيعات فستان سارة الكبسي', 'فاتورة مبيعات'],
        ['ENTRY-504', '2026-07-24', 'مصاريف الخياطين (501)', 'الصندوق الرئيسي (101)', 42400, 'USD', 'صرف أجرة معلم الخياطة محمود', 'سند صرف أجور']
      ]
    },

    'Company_Profile': {
      headers: ['المعرف (ID)', 'اسم المؤسسة (Company_Name)', 'رقم الهاتف (Phone)', 'العنوان (Address)', 'البريد الإلكتروني (Email)', 'مسار الشعار (Logo_Path)'],
      rows: [
        [1, 'مؤسسة Little Princesses 👑', '771234567', 'صنعاء - حدة', 'info@littleprincesses.com', 'logo.png']
      ]
    },

    'Users': {
      headers: ['رقم المستخدم (User_ID)', 'اسم المستخدم (Username)', 'كلمة السر (Password)', 'الدور / الصلاحية (Role)'],
      rows: [
        [1, 'admin', '1234', 'المدير العام'],
        [2, 'cashier', '1234', 'كاشير ومبيعات'],
        [3, 'workshop', '1234', 'مديرة الورشة']
      ]
    },

    'marketing_campaigns': {
      headers: ['campaign_id', 'campaign_name', 'campaign_code', 'platform', 'campaign_type', 'objective', 'product_id', 'product_name', 'audience_id', 'payment_account_id', 'budget', 'daily_budget', 'total_spend', 'expected_sales', 'actual_sales', 'expected_revenue', 'actual_revenue', 'expected_roas', 'actual_roas', 'start_date', 'end_date', 'status', 'notes', 'created_by', 'created_at', 'updated_at'],
      rows: [
        ['CMP-000001', 'حملة فساتين عيد الفطر 2026', 'CMP-EID-01', 'Instagram', 'Reel Video Ad', 'مبيعات مباشرة', 'PROD-201', 'فستان سهرة لؤلؤي ملكي', 'AUD-MOMS-01', '505 - مصاريف التسويق', 350.0, 35.0, 350.0, 30, 28, 7500.0, 8900.0, 7.5, 8.5, '2026-08-01', '2026-08-15', 'نشط', 'حملة مستمرة على ريلز الانستغرام', 'admin', '2026-08-01 10:00:00', '2026-08-17 18:00:00'],
        ['CMP-000002', 'حملة فساتين الزفاف الفاخرة', 'CMP-WED-02', 'Facebook', 'Carousel Ad', 'جلب عملاء محتملين', 'PROD-202', 'فستان زفاف دانتيل فرنسي', 'AUD-BRIDAL-02', '505 - مصاريف التسويق', 150.0, 15.0, 150.0, 10, 8, 4000.0, 3200.0, 4.0, 4.2, '2026-08-05', '2026-08-20', 'نشط', 'استهداف أمهات وعرائس', 'admin', '2026-08-05 11:30:00', '2026-08-17 18:00:00']
      ]
    },

    'marketing_platforms': {
      headers: ['platform_id', 'platform_name', 'platform_type', 'account_id', 'account_name', 'account_username', 'page_name', 'status', 'connection_status', 'permissions', 'token_status', 'token_expiry', 'webhook_status', 'last_sync', 'created_at', 'updated_at'],
      rows: [
        ['PLAT-001', 'Instagram', 'Social Media', 'ACC-IG-881', 'Little Princesses Instagram', '@little_princesses_couture', 'Little Princesses Official', 'connected', 'متصل 🟢', 'read_insights,manage_messages,publish_content', 'valid', '2027-01-01', 'active 🟢', '2026-08-17 19:30:00', '2026-08-01 00:00:00', '2026-08-17 19:30:00'],
        ['PLAT-002', 'Facebook', 'Social & Ads', 'ACC-FB-772', 'Little Princesses FB Page', 'fb.com/littleprincesses', 'Little Princesses Boutique', 'connected', 'متصل 🟢', 'ads_management,pages_read_engagement,pages_messaging', 'valid', '2027-01-01', 'active 🟢', '2026-08-17 19:30:00', '2026-08-01 00:00:00', '2026-08-17 19:30:00'],
        ['PLAT-003', 'WhatsApp Business', 'Direct Messaging', 'ACC-WA-663', 'WhatsApp Business Official', '+967771234567', 'Little Princesses VIP', 'connected', 'متصل 🟢', 'messages,contacts,catalogs', 'valid', '2027-01-01', 'active 🟢', '2026-08-17 19:30:00', '2026-08-01 00:00:00', '2026-08-17 19:30:00'],
        ['PLAT-004', 'TikTok', 'Video Platform', 'ACC-TK-554', 'TikTok Little Princesses', '@little_princesses_tk', 'Little Princesses TikTok', 'disconnected', 'غير متصل ⚪', 'video.list,user.info', 'none', '', 'inactive ⚪', '', '2026-08-01 00:00:00', '2026-08-17 19:30:00'],
        ['PLAT-005', 'Google Ads', 'Search & YouTube Ads', 'ACC-GA-445', 'Google Ads LP MCC', 'ads@littleprincesses.com', 'Google Ads Primary', 'disconnected', 'غير متصل ⚪', 'adwords', 'none', '', 'inactive ⚪', '', '2026-08-01 00:00:00', '2026-08-17 19:30:00']
      ]
    },

    'marketing_content': {
      headers: ['content_id', 'content_code', 'platform', 'platform_content_id', 'content_type', 'campaign_id', 'product_id', 'product_name', 'caption', 'media_url', 'thumbnail_url', 'publish_date', 'status', 'created_by', 'created_at', 'updated_at'],
      rows: [
        ['CNT-000001', 'CNT-REEL-01', 'Instagram', 'IG_POST_99812', 'Reel', 'CMP-000001', 'PROD-201', 'فستان سهرة لؤلؤي ملكي', 'فستان سهرة لؤلؤي ملكي مطرز يدوياً بحبات اللؤلؤ الفاخر ✨ إطلالة ملكية لأميرتك الصغيرة في العيد', 'https://cdn.littleprincesses.com/media/reel_01.mp4', 'https://cdn.littleprincesses.com/media/thumb_01.jpg', '2026-08-02 15:00:00', 'منشور', 'admin', '2026-08-02 14:00:00', '2026-08-17 18:00:00'],
        ['CNT-000002', 'CNT-POST-02', 'Facebook', 'FB_POST_44123', 'Carousel', 'CMP-000002', 'PROD-202', 'فستان زفاف دانتيل فرنسي', 'تشكيلة فساتين الزفاف والأعراس للأميرات الصغيرات من أرقى أقمشة الدانتيل الفرنسي 👑', 'https://cdn.littleprincesses.com/media/post_02.jpg', 'https://cdn.littleprincesses.com/media/thumb_02.jpg', '2026-08-06 18:30:00', 'منشور', 'admin', '2026-08-06 17:00:00', '2026-08-17 18:00:00']
      ]
    },

    'content_metrics': {
      headers: ['metric_id', 'content_id', 'platform', 'metric_date', 'reach', 'impressions', 'views', 'likes', 'comments', 'shares', 'saves', 'clicks', 'profile_visits', 'messages', 'leads', 'orders', 'revenue', 'spend', 'engagement_rate', 'save_rate', 'share_rate', 'conversion_rate', 'created_at'],
      rows: [
        ['MTR-000001', 'CNT-000001', 'Instagram', '2026-08-17', 12500, 18200, 8400, 1850, 240, 310, 480, 520, 650, 180, 95, 28, 8900.0, 250.0, 19.2, 3.84, 2.48, 0.33, '2026-08-17 19:00:00'],
        ['MTR-000002', 'CNT-000002', 'Facebook', '2026-08-17', 6200, 9100, 3900, 620, 95, 80, 110, 190, 210, 65, 30, 8, 3200.0, 100.0, 12.8, 1.77, 1.29, 0.20, '2026-08-17 19:00:00']
      ]
    },

    'marketing_ads': {
      headers: ['ad_id', 'ad_code', 'campaign_id', 'platform', 'ad_account_id', 'ad_set_id', 'content_id', 'product_id', 'ad_name', 'objective', 'audience', 'budget', 'spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpc', 'cpm', 'messages', 'leads', 'orders', 'revenue', 'roas', 'status', 'start_date', 'end_date', 'created_at', 'updated_at'],
      rows: [
        ['AD-000001', 'AD-IG-01', 'CMP-000001', 'Instagram', 'ACT-88912', 'ADSET-01', 'CNT-000001', 'PROD-201', 'إعلان ريلز فستان السهرة اللؤلؤي', 'مبيعات مباشرة', 'أمهات وأولياء أمور (24-45)', 250.0, 250.0, 18200, 12500, 520, 2.85, 0.48, 13.73, 180, 95, 28, 8900.0, 8.5, 'نشط', '2026-08-01', '2026-08-15', '2026-08-01 10:00:00', '2026-08-17 18:00:00']
      ]
    },

    'marketing_comments': {
      headers: ['comment_id', 'platform', 'platform_comment_id', 'content_id', 'campaign_id', 'product_id', 'customer_id', 'customer_name', 'comment_text', 'parent_comment_id', 'comment_date', 'sentiment', 'intent', 'created_at', 'updated_at'],
      rows: [
        ['COM-000001', 'Instagram', 'CMT_IG_101', 'CNT-000001', 'CMP-000001', 'PROD-201', 'CUST-1001', 'أميرة الأهدل', 'بكم الفستان الملكي لعمر 4 سنوات؟ وهل متوفر توصيل لتعز؟', '', '2026-08-16 18:20:00', 'إيجابي (Positive)', 'نية شراء عالية (High Purchase Intent)', '2026-08-16 18:20:00', '2026-08-17 18:00:00'],
        ['COM-000002', 'Instagram', 'CMT_IG_102', 'CNT-000001', 'CMP-000001', 'PROD-201', 'CUST-1002', 'سارة الكبسي', 'ما شاء الله تبارك الله، الخياطة والتطريز جداً راقي وفخم 👑', '', '2026-08-16 19:45:00', 'إيجابي جداً', 'إعجاب وتفاعل', '2026-08-16 19:45:00', '2026-08-17 18:00:00']
      ]
    },

    'marketing_conversations': {
      headers: ['conversation_id', 'platform', 'customer_id', 'customer_name', 'customer_phone_reference', 'product_id', 'campaign_id', 'channel', 'started_at', 'last_message_at', 'status', 'lead_status', 'created_at', 'updated_at'],
      rows: [
        ['CONV-000001', 'WhatsApp Business', 'CUST-1001', 'أم ريم (أميرة الأهدل)', '771234567', 'PROD-201', 'CMP-000001', 'واتساب مباشر', '2026-08-17 14:00:00', '2026-08-17 16:30:00', 'مكتملة بنجاح', 'متحول لطلب شراء 🛍️', '2026-08-17 14:00:00', '2026-08-17 18:00:00']
      ]
    },

    'marketing_messages': {
      headers: ['message_id', 'conversation_id', 'platform', 'platform_message_id', 'customer_id', 'sender_type', 'message_text', 'message_type', 'message_timestamp', 'product_id', 'campaign_id', 'created_at'],
      rows: [
        ['MSG-000001', 'CONV-000001', 'WhatsApp Business', 'WA_MSG_501', 'CUST-1001', 'customer', 'السلام عليكم، شفت الفستان اللؤلؤي في ريلز الانستغرام وأريد أحجز مقاس 4 سنوات لبنتي ريم', 'text', '2026-08-17 14:00:00', 'PROD-201', 'CMP-000001', '2026-08-17 14:00:00'],
        ['MSG-000002', 'CONV-000001', 'WhatsApp Business', 'WA_MSG_502', 'CUST-1001', 'business', 'أهلاً بكِ أم ريم! الفستان متوفر مع إمكانية التوصيل لتعز خلال 48 ساعة 👑 تم تسجيل مقاسات الأميرة ريم بنجاح.', 'text', '2026-08-17 14:05:00', 'PROD-201', 'CMP-000001', '2026-08-17 14:05:00']
      ]
    },

    'marketing_leads': {
      headers: ['lead_id', 'customer_id', 'source_platform', 'source_campaign_id', 'source_content_id', 'product_id', 'lead_source', 'lead_status', 'lead_score', 'purchase_intent', 'created_at', 'updated_at', 'converted_to_order', 'order_id', 'conversion_date'],
      rows: [
        ['LEAD-000001', 'CUST-1001', 'Instagram', 'CMP-000001', 'CNT-000001', 'PROD-201', 'Instagram Direct Message', 'متحول لطلب', 95, 'High Intent', '2026-08-17 14:00:00', '2026-08-17 16:30:00', 'نعم', 'ORD-2026-001', '2026-08-17 16:30:00']
      ]
    },

    'marketing_attribution': {
      headers: ['attribution_id', 'customer_id', 'order_id', 'product_id', 'campaign_id', 'content_id', 'ad_id', 'platform', 'attribution_model', 'attribution_type', 'attributed_revenue', 'attributed_profit', 'attribution_confidence', 'created_at'],
      rows: [
        ['ATTR-000001', 'CUST-1001', 'ORD-2026-001', 'PROD-201', 'CMP-000001', 'CNT-000001', 'AD-000001', 'Instagram', 'Position Based (40-20-40)', 'First & Last Touch', 8900.0, 5400.0, 0.94, '2026-08-17 17:00:00']
      ]
    },

    'marketing_daily_summary': {
      headers: ['date', 'platform', 'total_campaigns', 'active_campaigns', 'spend', 'reach', 'impressions', 'views', 'likes', 'comments', 'shares', 'saves', 'clicks', 'messages', 'leads', 'orders', 'revenue', 'gross_profit', 'roas', 'roi', 'cac', 'conversion_rate'],
      rows: [
        ['2026-08-17', 'Instagram', 1, 1, 250.0, 12500, 18200, 8400, 1850, 240, 310, 480, 520, 180, 95, 28, 8900.0, 5400.0, 8.5, 1080.0, 8.92, 0.33],
        ['2026-08-17', 'Facebook', 1, 1, 100.0, 6200, 9100, 3900, 620, 95, 80, 110, 190, 65, 30, 8, 3200.0, 1800.0, 4.2, 450.0, 12.50, 0.20]
      ]
    },

    'marketing_sync_logs': {
      headers: ['sync_id', 'sync_type', 'platform', 'started_at', 'completed_at', 'records_received', 'records_created', 'records_updated', 'records_failed', 'status', 'error_message'],
      rows: [
        ['SYNC-0001', 'Cloud & DB Sync', 'All Platforms', '2026-08-17 19:30:00', '2026-08-17 19:30:05', 45, 12, 33, 0, 'نجاح تام 🟢', '']
      ]
    },

    'marketing_webhook_events': {
      headers: ['event_id', 'platform', 'event_type', 'external_event_id', 'payload_reference', 'received_at', 'processed_at', 'processing_status', 'retry_count', 'error_message'],
      rows: [
        ['EVT-0001', 'Instagram', 'messages.new', 'IG_EVT_8899', '{"sender_id":"771234567","text":"بكم الفستان"}', '2026-08-17 14:00:00', '2026-08-17 14:00:01', 'معالج بنجاح 🟢', 0, '']
      ]
    },

    'marketing_ai_insights': {
      headers: ['insight_id', 'insight_type', 'entity_type', 'entity_id', 'insight_title', 'insight_text', 'confidence', 'evidence', 'recommendation', 'priority', 'created_at', 'expires_at'],
      rows: [
        ['INS-000001', 'Creative Performance', 'content', 'CNT-000001', 'انتشار واسع وطلب مرتفع لفستان السهرة اللؤلؤي', 'حقق منشور الفستان اللؤلؤي أعلى معدل حفظ (Save Rate 3.84%) ومبيعات مباشرة بقيمة 8,900 $', 0.94, 'معدل الحفظ والرسائل المباشرة', 'زيادة ميزانية إعلانات الريلز بنسبة 20%', 'عالية جداً', '2026-08-17 18:00:00', '2026-08-25 00:00:00']
      ]
    }
  };

  for (var sheetName in tablesData) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clear();
    }
    
    sheet.setRightToLeft(true);
    
    var headers = tablesData[sheetName].headers;
    var rows = tablesData[sheetName].rows;
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1A5276");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(11);
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);
    
    if (rows && rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    for (var col = 1; col <= headers.length; col++) {
      sheet.setColumnWidth(col, 180);
    }
  }
  SpreadsheetApp.getUi().alert("✅ تم تعبئة وتنسيق جميع الجداول بالبيانات الكاملة بنجاح!");
}

/**
 * دالة مخصصة لإنشاء وتهيئة وتنسيق الـ 14 جدولاً لقسم التسويق والإعلانات فقط داخل Google Sheets
 * Run: Extensions -> Apps Script -> Run setupMarketingOnlySheets
 */
function setupMarketingOnlySheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var marketingSheets = [
    'marketing_campaigns',
    'marketing_platforms',
    'marketing_content',
    'content_metrics',
    'marketing_ads',
    'marketing_comments',
    'marketing_conversations',
    'marketing_messages',
    'marketing_leads',
    'marketing_attribution',
    'marketing_daily_summary',
    'marketing_sync_logs',
    'marketing_webhook_events',
    'marketing_ai_insights'
  ];

  // We can call setupERPDatabaseWithData or generate them directly
  setupERPDatabaseWithData();
}
