"""
=============================================================================
👑 LITTLE PRINCESSES ERP — GOOGLE SHEETS TO POSTGRESQL MIGRATION & SEED SCRIPT
=============================================================================
يقوم هذا السكربت بقراءة وتدقيق ملفات التصدير السابقة من Google Sheets (CSV)،
ومعالجة وتوافق البيانات (Data Mapping)، وإدخالها في جداول PostgreSQL السحابية
بالترتيب الصحيح الذي يحترم المفاتيح الأجنبية (Foreign Keys) وبشكل آمن تماماً ضد التكرار (Idempotent).
"""

import os
import sys
import csv
import hashlib
import datetime

# ضبط مخرجات يونيكود للويندوز
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

from db_client import get_db_cursor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(BASE_DIR, "google_sheets_csv")

# ملح التشفير المعتمد في نظام Little Princesses ERP
PASS_SALT = "little_princesses_erp_salt_2026"

def hash_password(pwd: str) -> str:
    if not pwd:
        pwd = "1234"
    return hashlib.sha256((PASS_SALT + str(pwd)).encode('utf-8')).hexdigest()

def clean_num(val, default=0.0):
    if val is None or val == "":
        return default
    try:
        if isinstance(val, str):
            val = val.replace("YER", "").replace("SAR", "").replace("USD", "").replace("﷼", "").replace("$", "").replace(",", "").strip()
        return float(val)
    except (ValueError, TypeError):
        return default

def clean_str(val, default=""):
    if val is None:
        return default
    return str(val).strip()

def clean_date(val, default=None):
    if not val or not str(val).strip():
        return default or datetime.date.today().strftime("%Y-%m-%d")
    s = str(val).strip()
    # تجربة صيغ مختلفة
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return s[:10]

def read_csv_rows(filename):
    filepath = os.path.join(CSV_DIR, filename)
    if not os.path.exists(filepath):
        print(f"⚠️ الملف غير موجود: {filepath}")
        return []
    rows = []
    with open(filepath, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            clean_r = {k.strip(): (v.strip() if v else "") for k, v in r.items() if k}
            rows.append(clean_r)
    return rows

def get_col(row, *possible_keys, default=""):
    for k in possible_keys:
        for rk, rv in row.items():
            if k.lower() in rk.lower():
                return rv
    return default


def migrate_all():
    print("=" * 75)
    print("👑 LITTLE PRINCESSES ERP — ترحيل بيانات Google Sheets إلى PostgreSQL")
    print("=" * 75)
    print(f"📁 مجلد ملفات المصدر: {CSV_DIR}\n")

    stats = {}

    with get_db_cursor(commit=True) as cur:
        # 0. التأكد من وجود العملات الأساسية
        cur.execute("""
            INSERT INTO currencies (code, name, symbol, exchange_rate, is_base, is_active)
            VALUES 
                ('YER', 'ريال يمني', '﷼', 1.0, TRUE, TRUE),
                ('SAR', 'ريال سعودي', 'ر.س', 140.0, FALSE, TRUE),
                ('USD', 'دولار أمريكي', '$', 530.0, FALSE, TRUE)
            ON CONFLICT (code) DO UPDATE SET is_active = TRUE;
        """)

        # -------------------------------------------------------------
        # 1. ترحيل بروفايل الشركة (Company Profile)
        # -------------------------------------------------------------
        cp_rows = read_csv_rows("10_Company_Profile.csv")
        cp_count = 0
        for r in cp_rows:
            name = get_col(r, "Company_Name", "اسم المؤسسة", default="مؤسسة Little Princesses 👑")
            phone = get_col(r, "Phone", "الهاتف", default="771234567")
            address = get_col(r, "Address", "العنوان", default="صنعاء - حدة")
            email = get_col(r, "Email", "البريد", default="info@littleprincesses.com")
            logo = get_col(r, "Logo_Path", "الشعار", default="logo.png")
            cur.execute("""
                INSERT INTO company_profile (id, company_name, phone, address, email, base_currency, logo_url)
                VALUES (1, %s, %s, %s, %s, 'YER', %s)
                ON CONFLICT (id) DO UPDATE SET
                    company_name = EXCLUDED.company_name,
                    phone = EXCLUDED.phone,
                    address = EXCLUDED.address,
                    email = EXCLUDED.email,
                    logo_url = EXCLUDED.logo_url;
            """, (name, phone, address, email, logo))
            cp_count += 1
        stats["1_CompanyProfile"] = cp_count
        print(f"✅ [1/11] تم ترحيل بيانات الشركة: {cp_count} سجل.")

        # -------------------------------------------------------------
        # 2. ترحيل المستخدمين (Users)
        # -------------------------------------------------------------
        u_rows = read_csv_rows("11_Users.csv")
        u_count = 0
        role_map = {
            "المدير العام": "admin",
            "كاشير ومبيعات": "data_entry",
            "مديرة الورشة": "workshop_manager",
            "محاسب": "accountant"
        }
        for r in u_rows:
            raw_id = clean_str(get_col(r, "User_ID", "المعرف", default="1"))
            u_id = f"USR-00000{raw_id}" if len(raw_id) <= 2 else f"USR-{raw_id}"
            username = clean_str(get_col(r, "Username", "اسم المستخدم", default=f"user_{raw_id}"))
            pwd = clean_str(get_col(r, "Password", "كلمة السر", default="1234"))
            raw_role = clean_str(get_col(r, "Role", "الدور", "الصلاحية", default="admin"))
            sys_role = role_map.get(raw_role, "data_entry")
            pwd_hash = hash_password(pwd)
            full_name = f"{raw_role} ({username})"
            email = f"{username}@littleprincesses.com"

            cur.execute("""
                INSERT INTO users (id, username, password_hash, full_name, role, email, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (username) DO UPDATE SET
                    role = EXCLUDED.role,
                    is_active = TRUE;
            """, (u_id, username, pwd_hash, full_name, sys_role, email))
            u_count += 1
        stats["2_Users"] = u_count
        print(f"✅ [2/11] تم ترحيل المستخدمين: {u_count} مستخدمين.")

        # -------------------------------------------------------------
        # 3. ترحيل شجرة الحسابات (Chart of Accounts)
        # -------------------------------------------------------------
        acc_rows = read_csv_rows("7_Accounts.csv")
        acc_count = 0
        for r in acc_rows:
            raw_code = clean_str(get_col(r, "Account_Code", "رمز الحساب"))
            if not raw_code:
                continue
            acc_id = f"ACC-{raw_code}"
            name = clean_str(get_col(r, "Account_Name", "اسم الحساب"))
            raw_type = clean_str(get_col(r, "Account_Type", "نوع الحساب"))
            bal = clean_num(get_col(r, "Balance_YER", "الرصيد بالريال اليمني"))

            # تحديد نوع وطبيعة الحساب
            norm_bal = "Credit" if any(x in raw_type for x in ("التزامات", "حقوق ملكية", "إيرادات")) else "Debit"
            acc_type = "Assets"
            if "التزامات" in raw_type: acc_type = "Liabilities"
            elif "حقوق ملكية" in raw_type: acc_type = "Equity"
            elif "إيرادات" in raw_type: acc_type = "Revenue"
            elif "مصاريف" in raw_type or "مصروفات" in raw_type: acc_type = "Expenses"

            cur.execute("""
                INSERT INTO chart_of_accounts (
                    id, account_code, account_name, account_type, account_category,
                    level, is_group, is_postable, normal_balance, current_balance, currency
                ) VALUES (
                    %s, %s, %s, %s, %s, 2, FALSE, TRUE, %s, %s, 'YER'
                )
                ON CONFLICT (account_code) DO UPDATE SET
                    account_name = EXCLUDED.account_name,
                    account_type = EXCLUDED.account_type,
                    current_balance = EXCLUDED.current_balance;
            """, (acc_id, raw_code, name, acc_type, raw_type, norm_bal, bal))
            acc_count += 1
        stats["3_ChartOfAccounts"] = acc_count
        print(f"✅ [3/11] تم ترحيل شجرة الحسابات: {acc_count} حساباً.")

        # -------------------------------------------------------------
        # 4. ترحيل العملاء (Customers)
        # -------------------------------------------------------------
        cust_rows = read_csv_rows("1_Customers.csv")
        cust_count = 0
        for r in cust_rows:
            c_id = clean_str(get_col(r, "Customer_ID", "رقم العميل"))
            if not c_id:
                continue
            name = clean_str(get_col(r, "Full_Name", "اسم العميل", default="عميل"))
            phone = clean_str(get_col(r, "Phone_Number", "رقم الهاتف", default="000000000"))
            platform = clean_str(get_col(r, "Social_Platform", "منصة التواصل", default="واتساب"))
            handle = clean_str(get_col(r, "Social_Handle", "معرف التواصل"))
            addr = clean_str(get_col(r, "Address", "العنوان"))
            c_type = clean_str(get_col(r, "Customer_Type", "نوع العميل", default="VIP"))
            unit = clean_str(get_col(r, "Default_Unit", "وحدة القياس", default="سم (cm)"))
            c_date = clean_date(get_col(r, "Created_At", "تاريخ التسجيل"))

            cur.execute("""
                INSERT INTO customers (
                    id, name, phone, platform, handle, category, city, street, notes, status, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 'صنعاء', %s, %s, 'Active', %s::timestamptz, CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    phone = EXCLUDED.phone,
                    platform = EXCLUDED.platform,
                    handle = EXCLUDED.handle,
                    category = EXCLUDED.category,
                    street = EXCLUDED.street,
                    notes = EXCLUDED.notes;
            """, (c_id, name, phone, platform, handle, c_type, addr, f"وحدة القياس المفضلة: {unit}", c_date))
            cust_count += 1
        stats["4_Customers"] = cust_count
        print(f"✅ [4/11] تم ترحيل العملاء: {cust_count} عميلاً.")

        # -------------------------------------------------------------
        # 5. ترحيل القياسات والأطفال (Measurements & Children)
        # -------------------------------------------------------------
        meas_rows = read_csv_rows("2_Customer_Measurements.csv")
        meas_count = 0
        for r in meas_rows:
            m_id = clean_str(get_col(r, "Measurement_ID", "رقم القياس"))
            c_id = clean_str(get_col(r, "Customer_ID", "رقم العميل"))
            if not m_id or not c_id:
                continue
            profile_name = clean_str(get_col(r, "Profile_Name", "اسم نموذج القياس", default="فستان أميرة"))
            tot_len = clean_num(get_col(r, "Total_Length", "الطول الكلي"))
            shld_w = clean_num(get_col(r, "Shoulder_Width", "عرض الكتف"))
            chest_c = clean_num(get_col(r, "Chest_Circ", "محيط الصدر"))
            waist_c = clean_num(get_col(r, "Waist_Circ", "محيط الخصر"))
            sleeve_l = clean_num(get_col(r, "Sleeve_Length", "طول الكم"))
            chest_l = clean_num(get_col(r, "Chest_Length", "طول الصدر"))
            notes = clean_str(get_col(r, "Sizes_Notes", "ملاحظات المقاسات"))
            m_date = clean_date(get_col(r, "Updated_At", "تاريخ التحديث"))

            # التأكد من وجود سجل طفل/طفلة
            chld_id = f"CHLD-{c_id.replace('CUST-', '')}"
            cur.execute("""
                INSERT INTO children (id, customer_id, child_name, notes)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET notes = EXCLUDED.notes;
            """, (chld_id, c_id, profile_name, notes))

            cur.execute("""
                INSERT INTO measurements (
                    id, customer_id, child_id, child_name, date, measurement_date, unit,
                    total_len, dress_len, chest_len, sleeve_len,
                    chest_circ, waist_circ, shoulder_w, model_name, notes, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 'cm',
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO UPDATE SET
                    total_len = EXCLUDED.total_len,
                    dress_len = EXCLUDED.dress_len,
                    chest_len = EXCLUDED.chest_len,
                    sleeve_len = EXCLUDED.sleeve_len,
                    chest_circ = EXCLUDED.chest_circ,
                    waist_circ = EXCLUDED.waist_circ,
                    shoulder_w = EXCLUDED.shoulder_w,
                    model_name = EXCLUDED.model_name,
                    notes = EXCLUDED.notes;
            """, (
                m_id, c_id, chld_id, profile_name, m_date, m_date,
                tot_len, tot_len, chest_l, sleeve_l,
                chest_c, waist_c, shld_w, profile_name, notes
            ))
            meas_count += 1
        stats["5_Measurements"] = meas_count
        print(f"✅ [5/11] تم ترحيل بروفايلات القياسات والأطفال: {meas_count} قياساً.")

        # -------------------------------------------------------------
        # 6. ترحيل المخزون والخامات (Inventory Items)
        # -------------------------------------------------------------
        inv_rows = read_csv_rows("4_Inventory_Items.csv")
        inv_count = 0
        for r in inv_rows:
            inv_id = clean_str(get_col(r, "Item_ID", "رقم المادة"))
            if not inv_id:
                continue
            name = clean_str(get_col(r, "Item_Name", "اسم المادة"))
            cat = clean_str(get_col(r, "Category", "التصنيف", default="أقمشة فاخرة"))
            unit = clean_str(get_col(r, "Unit_Type", "وحدة القياس", default="meter"))
            if "متر" in unit: unit = "meter"
            elif "قطعة" in unit: unit = "piece"
            elif "بكرة" in unit: unit = "roll"
            qty = clean_num(get_col(r, "Quantity_Available", "الكمية المتوفرة"))
            cost = clean_num(get_col(r, "Cost_Per_Unit_YER", "تكلفة الوحدة"))
            min_lim = clean_num(get_col(r, "Min_Alert_Qty", "حد إنذار النقص", default=10))

            cur.execute("""
                INSERT INTO inventory (
                    id, item_code, name, type, category, unit, quantity, reserved_qty, min_limit, unit_cost, location, status
                ) VALUES (
                    %s, %s, %s, 'Fabric', %s, %s, %s, 0.0, %s, %s, 'المستودع الرئيسي', 'Available'
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    category = EXCLUDED.category,
                    unit = EXCLUDED.unit,
                    quantity = EXCLUDED.quantity,
                    min_limit = EXCLUDED.min_limit,
                    unit_cost = EXCLUDED.unit_cost;
            """, (inv_id, inv_id, name, cat, unit, qty, min_lim, cost))
            inv_count += 1
        stats["6_Inventory"] = inv_count
        print(f"✅ [6/11] تم ترحيل أصناف المخزون: {inv_count} أصناف.")

        # -------------------------------------------------------------
        # 7. ترحيل الموديلات والمنتجات (Products & Models)
        # -------------------------------------------------------------
        prod_rows = read_csv_rows("3_Models_Products.csv")
        prod_count = 0
        for r in prod_rows:
            p_id = clean_str(get_col(r, "Product_ID", "رقم الموديل"))
            if not p_id:
                continue
            name = clean_str(get_col(r, "Model_Name", "اسم الموديل"))
            cat = clean_str(get_col(r, "Category", "التصنيف", default="فساتين سهرة"))
            curr = clean_str(get_col(r, "Currency", "العملة المحددة", default="USD")).upper()
            if curr not in ("YER", "SAR", "USD"): curr = "USD"
            fabric_name = clean_str(get_col(r, "Fabric_Name", "نوع القماش المستهلك"))
            fabric_qty = clean_num(get_col(r, "Fabric_Qty", "كمية القماش بالمتر"))
            total_cost = clean_num(get_col(r, "Total_Product_Cost_YER", "التكلفة الإجمالية"))
            sell_price = clean_num(get_col(r, "Sell_Price_YER", "سعر البيع"))
            desc = f"القماش المستهلك: {fabric_name} ({fabric_qty} متر) - إجمالي التكلفة YER: {total_cost:,.0f}"

            cur.execute("""
                INSERT INTO products (
                    id, sku, model_name, category, currency, base_price, cost_price, description, status
                ) VALUES (
                    %s, %s, %s, %s, 'YER', %s, %s, %s, 'Active'
                )
                ON CONFLICT (id) DO UPDATE SET
                    model_name = EXCLUDED.model_name,
                    category = EXCLUDED.category,
                    base_price = EXCLUDED.base_price,
                    cost_price = EXCLUDED.cost_price,
                    description = EXCLUDED.description;
            """, (p_id, p_id, name, cat, sell_price, total_cost, desc))
            prod_count += 1
        stats["7_Products"] = prod_count
        print(f"✅ [7/11] تم ترحيل الموديلات والمنتجات: {prod_count} منتجات.")

        # -------------------------------------------------------------
        # 8. ترحيل الموردين والمشتريات (Suppliers & Purchases)
        # -------------------------------------------------------------
        pur_rows = read_csv_rows("5_Purchases.csv")
        pur_count = 0
        supp_map = {}
        for r in pur_rows:
            pur_id = clean_str(get_col(r, "Purchase_ID", "رقم حركة الشراء"))
            if not pur_id:
                continue
            bill_no = clean_str(get_col(r, "Bill_No", "رقم الفاتورة الورقية", default=pur_id))
            supp_name = clean_str(get_col(r, "Supplier_Name", "اسم المورد", default="مورد عام"))
            item_name = clean_str(get_col(r, "Item_Name", "اسم المادة الشتراة"))
            qty = clean_num(get_col(r, "Quantity", "الكمية", default=1))
            u_price = clean_num(get_col(r, "Unit_Price", "سعر الوحدة"))
            curr = clean_str(get_col(r, "Currency", "عملة الشراء", default="USD")).upper()
            if curr not in ("YER", "SAR", "USD"): curr = "USD"
            rate = clean_num(get_col(r, "Exchange_Rate", "سعر الصرف", default=530))
            trans_cost = clean_num(get_col(r, "Transport_Cost_YER", "تكلفة النقل"))
            trans_fee = clean_num(get_col(r, "Transfer_Fee_YER", "عمولات التحويل"))
            tot_amt_yer = clean_num(get_col(r, "Total_Amount_YER", "الإجمالي YER"))
            pay_src = clean_str(get_col(r, "Payment_Source", "حساب الصرف", default="الصندوق الرئيسي"))
            pur_date = clean_date(get_col(r, "Date_Added", "تاريخ الشراء"))

            # تأسيس المورد إذا لم يكن موجوداً
            if supp_name not in supp_map:
                s_hash = hashlib.md5(supp_name.encode('utf-8')).hexdigest()[:6].upper()
                s_id = f"SUPP-{s_hash}"
                cur.execute("""
                    INSERT INTO suppliers (id, name, phone, address, city, current_balance, is_active)
                    VALUES (%s, %s, '000000000', 'صنعاء', 'صنعاء', 0.0, TRUE)
                    ON CONFLICT (id) DO NOTHING;
                """, (s_id, supp_name))
                supp_map[supp_name] = s_id
            
            s_id = supp_map[supp_name]
            orig_amt = qty * u_price

            cur.execute("""
                INSERT INTO purchases (
                    id, invoice_no, supplier_id, supplier_name, invoice_date, item_name,
                    unit, quantity, unit_price, currency, exchange_rate, original_amount,
                    amount_yer, shipping_cost, transfer_fee, grand_total_yer, payment_method, notes
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 'meter', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (id) DO UPDATE SET
                    supplier_name = EXCLUDED.supplier_name,
                    grand_total_yer = EXCLUDED.grand_total_yer,
                    notes = EXCLUDED.notes;
            """, (
                pur_id, bill_no, s_id, supp_name, pur_date, item_name,
                qty, u_price, curr, rate, orig_amt,
                tot_amt_yer, trans_cost, trans_fee, tot_amt_yer, pay_src,
                f"فاتورة {bill_no} - {pay_src}"
            ))
            pur_count += 1
        stats["8_Purchases"] = pur_count
        print(f"✅ [8/11] تم ترحيل فواتير المشتريات والموردين: {pur_count} فواتير.")

        # -------------------------------------------------------------
        # 9. ترحيل الطلبات والمبيعات (Orders & Order Items)
        # -------------------------------------------------------------
        ord_rows = read_csv_rows("6_Orders.csv")
        ord_count = 0
        status_map = {
            "قيد الخياطة": "Sewing",
            "مرحلة القص": "Cutting",
            "التطريز والتركيب": "Embroidery",
            "جاهز للتسليم": "Ready",
            "تم التسليم": "Delivered"
        }
        for r in ord_rows:
            ord_no = clean_str(get_col(r, "Order_No", "رقم الطلب"))
            if not ord_no:
                continue
            c_id = clean_str(get_col(r, "Customer_ID", "رقم العميل"))
            curr = clean_str(get_col(r, "Currency", "عملة الطلب", default="USD")).upper()
            if curr not in ("YER", "SAR", "USD"): curr = "USD"
            rate = clean_num(get_col(r, "Exchange_Rate", "سعر الصرف", default=530))
            tot_amt = clean_num(get_col(r, "Total_Amount_YER", "إجمالي الفاتورة YER"))
            paid_amt = clean_num(get_col(r, "Paid_Amount_YER", "العربون YER"))
            deliv_fee = clean_num(get_col(r, "Delivery_Fees_YER", "رسوم التوصيل"))
            raw_status = clean_str(get_col(r, "Status", "حالة الطلب", default="قيد الخياطة"))
            pay_method = clean_str(get_col(r, "Payment_Method", "طريقة دفع العربون", default="نقد (كاش)"))
            trans_no = clean_str(get_col(r, "Transfer_No", "رقم الحوالة"))
            ord_date = clean_date(get_col(r, "Order_Date", "تاريخ الطلب"))
            deliv_date = clean_date(get_col(r, "Delivery_Date", "تاريخ التسليم المتوقع"))
            notes = clean_str(get_col(r, "Notes", "ملاحظات وتفاصيل"))

            prod_status = "In Progress"
            for k, v in status_map.items():
                if k in raw_status:
                    prod_status = v
                    break

            pay_status = "Paid" if paid_amt >= tot_amt and tot_amt > 0 else ("Partial" if paid_amt > 0 else "Unpaid")

            cur.execute("""
                INSERT INTO orders (
                    id, order_no, customer_id, order_date, delivery_date,
                    currency, exchange_rate, subtotal, discount, tax, total_amount,
                    paid_amount, base_amount, payment_status, production_status,
                    payment_method, notes, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    'YER', 1.0, %s, 0.0, 0.0, %s,
                    %s, %s, %s, %s,
                    %s, %s, CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO UPDATE SET
                    total_amount = EXCLUDED.total_amount,
                    paid_amount = EXCLUDED.paid_amount,
                    payment_status = EXCLUDED.payment_status,
                    production_status = EXCLUDED.production_status,
                    notes = EXCLUDED.notes;
            """, (
                ord_no, ord_no, c_id, ord_date, deliv_date,
                tot_amt, tot_amt, paid_amt, tot_amt,
                pay_status, prod_status, pay_method,
                f"{notes} | حوالة: {trans_no}" if trans_no else notes
            ))

            # إدراج بند الطلب التفصيلي
            cur.execute("SELECT id FROM products LIMIT 1;")
            any_p = cur.fetchone()
            p_ref = any_p['id'] if any_p else 'PROD-201'

            cur.execute("""
                INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, notes)
                VALUES (%s, %s, %s, 1.0, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (f"OITM-{ord_no}", ord_no, p_ref, tot_amt, tot_amt, notes))

            ord_count += 1
        stats["9_Orders"] = ord_count
        print(f"✅ [9/11] تم ترحيل الطلبات والمبيعات: {ord_count} طلبات.")

        # -------------------------------------------------------------
        # 10. ترحيل السندات المالية (Vouchers / Payments)
        # -------------------------------------------------------------
        vouch_rows = read_csv_rows("8_Vouchers.csv")
        vouch_count = 0
        for r in vouch_rows:
            v_no = clean_str(get_col(r, "Voucher_No", "رقم السند"))
            if not v_no:
                continue
            raw_v_type = clean_str(get_col(r, "Voucher_Type", "نوع السند", default="قبض عربون"))
            p_type = "Receipt" if "قبض" in raw_v_type else "Payment"
            curr = clean_str(get_col(r, "Currency", "عملة السند", default="USD")).upper()
            if curr not in ("YER", "SAR", "USD"): curr = "USD"
            orig_amt = clean_num(get_col(r, "Amount", "المبلغ بالعملة"))
            rate = clean_num(get_col(r, "Exchange_Rate", "سعر الصرف YER", default=530))
            amt_yer = clean_num(get_col(r, "Amount_YER", "المبلغ الصافي YER", default=orig_amt * rate))
            party_name = clean_str(get_col(r, "Account_Name", "اسم الحساب/الجهة"))
            stmt = clean_str(get_col(r, "Statement", "البيان/السبب"))
            v_date = clean_date(get_col(r, "Date_Added", "تاريخ السند"))

            # فحص ارتباط العميل أو المورد
            cur.execute("SELECT id FROM customers WHERE name = %s LIMIT 1;", (party_name,))
            c_found = cur.fetchone()
            matched_cust = c_found['id'] if c_found else 'CUST-GENERAL'

            cur.execute("""
                INSERT INTO payments (
                    id, payment_no, customer_id, payment_type, amount, currency,
                    exchange_rate, base_amount, payment_method, account_id, date, status, notes
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, 'نقد (كاش)', 'ACC-101', %s, 'Confirmed', %s
                )
                ON CONFLICT (payment_no) DO UPDATE SET
                    amount = EXCLUDED.amount,
                    base_amount = EXCLUDED.base_amount,
                    notes = EXCLUDED.notes;
            """, (v_no, v_no, matched_cust, p_type, orig_amt, curr, rate, amt_yer, v_date, f"{raw_v_type} - {party_name} - {stmt}"))
            vouch_count += 1
        stats["10_Vouchers"] = vouch_count
        print(f"✅ [10/11] تم ترحيل السندات المالية: {vouch_count} سندات.")

        # -------------------------------------------------------------
        # 11. ترحيل قيود اليومية المحاسبية (Journal Entries)
        # -------------------------------------------------------------
        jv_rows = read_csv_rows("9_Journal_Entries.csv")
        jv_count = 0
        for r in jv_rows:
            jv_no = clean_str(get_col(r, "Entry_No", "رقم القيد"))
            if not jv_no:
                continue
            jv_date = clean_date(get_col(r, "Entry_Date", "تاريخ القيد"))
            deb_raw = clean_str(get_col(r, "Debit_Account", "الحساب المدين"))
            crd_raw = clean_str(get_col(r, "Credit_Account", "الحساب الدائن"))
            amt_yer = clean_num(get_col(r, "Amount_YER", "المبلغ YER"))
            curr = clean_str(get_col(r, "Original_Currency", "العملة الأصلية", default="USD")).upper()
            if curr not in ("YER", "SAR", "USD"): curr = "USD"
            stmt = clean_str(get_col(r, "Statement", "البيان وشرح القيد"))
            ref_type = clean_str(get_col(r, "Ref_Type", "نوع المرجع", default="Manual"))

            # استخراج أرقام الحسابات
            def parse_acc(txt, default="ACC-101"):
                for code in ("101", "102", "104", "105", "106", "201", "202", "301", "401", "501", "502", "503"):
                    if code in txt:
                        return f"ACC-{code}"
                return default

            deb_acc = parse_acc(deb_raw, "ACC-101")
            crd_acc = parse_acc(crd_raw, "ACC-401")

            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, ref_type, currency, exchange_rate, status, notes
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1.0, 'Posted', %s
                )
                ON CONFLICT (entry_no) DO UPDATE SET
                    description = EXCLUDED.description,
                    amount = EXCLUDED.amount;
            """, (jv_no, jv_no, jv_date, stmt, deb_acc, crd_acc, amt_yer, amt_yer, amt_yer, ref_type, curr, f"مرحل من الشيت: {deb_raw} -> {crd_raw}"))

            # إدراج سطور القيد المزدوج
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (jv_no,))
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES 
                    (%s, %s, %s, %s, %s, 0.0, %s, 0.0),
                    (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (
                f"JVL-{jv_no}-D", jv_no, deb_acc, f"مدين: {stmt}", amt_yer, amt_yer,
                f"JVL-{jv_no}-C", jv_no, crd_acc, f"دائن: {stmt}", amt_yer, amt_yer
            ))
            jv_count += 1
        stats["11_JournalEntries"] = jv_count
        print(f"✅ [11/11] تم ترحيل قيود اليومية العامة المزدوجة: {jv_count} قيود.")

    print("\n" + "=" * 75)
    print("🎉 اكتمل ترحيل كافة بيانات Google Sheets إلى PostgreSQL بنجاح تام!")
    print("=" * 75)
    print("📊 إحصائيات السجلات المرحلة:")
    for k, v in stats.items():
        print(f"  • {k:<25}: {v} سجل")
    print("=" * 75)


if __name__ == "__main__":
    migrate_all()
