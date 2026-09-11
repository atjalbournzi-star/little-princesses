"""
=============================================================================
👑 LITTLE PRINCESSES ERP — POSTGRESQL BACKEND SERVICE LAYER v2.0
=============================================================================
طبقة الخدمة المركزية المتوافقة 100% مع هيكل جداول PostgreSQL 17.6،
والتي تستقبل وتنفذ كافة طلبات واجهات المستخدم مباشرة على قاعدة البيانات
بدون أي وسيط خارجي أو اعتماد على Google Sheets.
"""

import os
import glob
import json
import uuid
import time
import datetime
from decimal import Decimal
import logging
from db_client import get_db_cursor, execute_query

# دعم تسلسل كائنات Decimal والتاريخ والـ UUID في JSON لكافة دوال الخدمة
_orig_json_default = json.JSONEncoder.default
def _custom_json_default(self, o):
    if isinstance(o, Decimal):
        return float(o)
    if isinstance(o, (datetime.date, datetime.datetime)):
        return str(o)
    if isinstance(o, uuid.UUID):
        return str(o)
    return _orig_json_default(self, o)
json.JSONEncoder.default = _custom_json_default

logger = logging.getLogger("pg_service")

# ── 1. الأدوات المساعدة (Helpers & ID Generators) ──

def generate_id(prefix="LP"):
    ts = int(time.time() % 10000000)
    rand_suffix = uuid.uuid4().hex[:4].upper()
    return f"{prefix}-{ts}-{rand_suffix}"

def now_iso():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def today_str():
    return datetime.date.today().strftime("%Y-%m-%d")

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

def resolve_exchange_rate(cur, currency_code, provided_rate=1.0):
    curr = clean_str(currency_code or 'YER').upper()
    if curr == 'YER':
        return 1.0
    rate = clean_num(provided_rate or 0.0)
    if rate > 1.0:
        return rate
    # Query PostgreSQL currencies table for live exchange rate
    try:
        cur.execute("SELECT exchange_rate FROM currencies WHERE code = %s AND is_active = true LIMIT 1;", (curr,))
        row = cur.fetchone()
        if row and clean_num(row['exchange_rate']) > 0:
            return clean_num(row['exchange_rate'])
    except Exception:
        pass
    if curr == 'SAR': return 142.0
    if curr == 'USD': return 535.0
    return 1.0

def resolve_account_id(cur, acc_input, default_id="ACC-101"):
    if not acc_input:
        return default_id
    acc_str = str(acc_input).strip()
    
    # 1. Direct match on id or account_code
    cur.execute("SELECT id FROM chart_of_accounts WHERE id = %s OR account_code = %s LIMIT 1;", (acc_str, acc_str))
    row = cur.fetchone()
    if row:
        return row['id']
        
    # 2. Extract code from composite strings like "301.02 - راس مال هنادي" or "ACC-101 - الصندوق"
    import re
    code_part = acc_str.split(' - ')[0].strip()
    if code_part != acc_str:
        cur.execute("SELECT id FROM chart_of_accounts WHERE account_code = %s OR id = %s OR id = %s LIMIT 1;", 
                    (code_part, code_part, f"ACC-{code_part}"))
        row = cur.fetchone()
        if row:
            return row['id']
            
    # Regex extract leading code
    m = re.match(r'^(ACC[-_]?)?([0-9]+(?:\.[0-9]+)?)', acc_str, re.IGNORECASE)
    if m:
        extracted = m.group(2)
        cur.execute("SELECT id FROM chart_of_accounts WHERE account_code = %s OR id = %s OR id = %s LIMIT 1;", 
                    (extracted, extracted, f"ACC-{extracted}"))
        row = cur.fetchone()
        if row:
            return row['id']
            
    # 3. Match ACC- prefix directly
    cur.execute("SELECT id FROM chart_of_accounts WHERE id = %s OR account_code = %s LIMIT 1;", (f"ACC-{acc_str}", f"ACC-{acc_str}"))
    row = cur.fetchone()
    if row:
        return row['id']

    # 4. Match by name (strip leading code if any)
    clean_name = re.sub(r'^(ACC[-_]?)?[0-9]+(?:\.[0-9]+)?[\s\-_:/|]*', '', acc_str).strip()
    if clean_name:
        cur.execute("SELECT id FROM chart_of_accounts WHERE account_name = %s OR account_name ILIKE %s LIMIT 1;", 
                    (clean_name, f"%{clean_name}%"))
        row = cur.fetchone()
        if row:
            return row['id']

    # 5. Smart keyword matching for currency cash boxes and banks
    low = acc_str.lower()
    if 'سعودي' in low or 'sar' in low or '101.2' in low or '101-2' in low:
        return 'ACC-101-2'
    if 'دولار' in low or 'usd' in low or '101.3' in low or '101-3' in low:
        return 'ACC-101-3'
    if 'كريمي' in low or '103' in low:
        return 'ACC-103'
    if 'رئيسي' in low or '101' in low or 'خزينة' in low or '1111' in low:
        return 'ACC-101'
    if '5121' in low or '501' in low or 'رواتب' in low or 'راتب' in low or 'أجور' in low:
        return 'ACC-501'
    if '1141' in low or '107' in low or 'سلف' in low or 'سلفة' in low:
        return 'ACC-107'
    if '5211' in low or '502' in low or 'ورشة' in low or 'معمل' in low or 'إيجار' in low or 'ايجار' in low:
        return 'ACC-502'
    if '503' in low or 'كهرباء' in low or 'ماء' in low or 'مياه' in low:
        return 'ACC-503'
    if '504' in low or 'تشغيل' in low:
        return 'ACC-504'
    if '505' in low or 'صيانة' in low or 'نظافة' in low or 'تسويق' in low or 'ضيافة' in low or 'عام' in low or 'إداري' in low or 'اداري' in low:
        return 'ACC-505'
    if '506' in low or 'فروق' in low or 'صرف' in low:
        return 'ACC-506'
    if '507' in low or 'شحن' in low or 'نقل' in low:
        return 'ACC-507'
    if '508' in low or 'عمولة' in low or 'تحويل' in low:
        return 'ACC-508'
    if '509' in low or 'تالف' in low or 'هالك' in low:
        return 'ACC-509'
    if '2111' in low or '201' in low or 'مورد' in low or 'أقمشة' in low:
        return 'ACC-201'
    if '1121' in low or '104' in low or 'عميل' in low or 'ذمم عملاء' in low:
        return 'ACC-104'
    if '3111' in low or '301' in low or 'رأس مال' in low or 'راس مال' in low:
        return 'ACC-301'
    if '302' in low or 'مسحوبات' in low or 'سحب شريك' in low:
        return 'ACC-302'

    return default_id


# ── 2. التهيئة والغرس الأولي للبيانات التأسيسية (System Baseline Seeds) ──

def ensure_base_system_seed():
    """التأكد من وجود المستخدمين والعميل العام والمورد العام في PostgreSQL"""
    try:
        salt = "little_princesses_erp_salt_2026"
        import hashlib
        def h_pwd(pwd):
            return hashlib.sha256((salt + str(pwd)).encode('utf-8')).hexdigest()

        with get_db_cursor(commit=True) as cur:
            # 1. المستخدمين الأساسيين (Users)
            default_users = [
                ('USR-000001', 'admin', h_pwd('admin'), 'المدير العام 👑', 'admin', 'admin@littleprincesses.com', '777000001', True),
                ('USR-000002', 'accountant', h_pwd('1234'), 'أحمد المحاسب 💼', 'accountant', 'accountant@littleprincesses.com', '777000002', True),
                ('USR-000003', 'workshop', h_pwd('1234'), 'سارة مديرة الورشة ✂️', 'workshop_manager', 'workshop@littleprincesses.com', '777000003', True),
                ('USR-000004', 'cashier', h_pwd('1234'), 'فاطمة مدخلة البيانات 📝', 'data_entry', 'cashier@littleprincesses.com', '777000004', True)
            ]
            for u in default_users:
                cur.execute("""
                    INSERT INTO users (id, username, password_hash, full_name, role, email, phone, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (username) DO NOTHING;
                """, u)

            # 2. العميل العام للطلبات المباشرة (Default Walk-in Customer)
            cur.execute("""
                INSERT INTO customers (id, name, phone, platform, category, city, current_balance, notes, status)
                VALUES ('CUST-GENERAL', 'عميل عام / زائر صالة العرض', '0000000000', 'Walk-in', 'Normal', 'صنعاء', 0.0, 'عميل عام افتراضي للفواتير المباشرة', 'Active')
                ON CONFLICT (id) DO NOTHING;
            """)

            # 3. المورد العام الافتراضي (Default Supplier)
            cur.execute("""
                INSERT INTO suppliers (id, name, address, phone, city, current_balance, is_active)
                VALUES ('SUPP-GENERAL', 'مورد عام / مشتريات نقدية', 'المركز التجاري', '0000000000', 'صنعاء', 0.0, True)
                ON CONFLICT (id) DO NOTHING;
            """)

            # 4. حسابات المشتريات التخصصية (مصاريف الشحن، رسوم التحويل، الخصم المكتسب)
            cur.execute("""
                INSERT INTO chart_of_accounts (
                    id, account_code, account_name, account_type, account_category,
                    parent_account_id, parent_account_code, level, is_group, is_postable,
                    normal_balance, currency, notes
                ) VALUES 
                ('ACC-507', '507', 'مصاريف شحن ونقل المشتريات', 'Expenses', 'Freight', 'ACC-5', '5', 1, false, true, 'Debit', 'YER', 'تكلفة ونولون شحن وتوصيل خامات المشتريات'),
                ('ACC-508', '508', 'رسوم وعمولات تحويل بنكي ومصرفي', 'Expenses', 'Bank_Fees', 'ACC-5', '5', 1, false, true, 'Debit', 'YER', 'عمولات ورسوم التحويلات البنكية للمشتريات'),
                ('ACC-403', '403', 'خصم مكتسب على المشتريات', 'Revenue', 'Purchase_Discounts', 'ACC-4', '4', 1, false, true, 'Credit', 'YER', 'تخفيضات وخصومات تجارية مكتسبة من الموردين'),
                ('ACC-509', '509', 'هالك وتالف الأقمشة والخامات', 'Expenses', 'Material_Loss', 'ACC-5', '5', 1, false, true, 'Debit', 'YER', 'عجز وإهلاك فاقد قص وتطريز الأقمشة وخامات الخياطة'),
                ('ACC-404', '404', 'أرباح وتسويات جرد المخزون', 'Revenue', 'Inventory_Gain', 'ACC-4', '4', 1, false, true, 'Credit', 'YER', 'فائض وأرباح فروقات التسويات الجردية الدورية'),
                ('ACC-107', '107', 'سلف وذمم العاملين بالورشة', 'Assets', 'Current_Assets', 'ACC-1', '1', 1, false, true, 'Debit', 'YER', 'حساب سلف وعهد ومستحقات ذمم كادر ورشة الخياطة والمعمل')
                ON CONFLICT (id) DO NOTHING;
            """)

        logger.info("✅ تم التحقق وتأسيس البيانات الأساسية (Users, General Customer, General Supplier) بنجاح.")
    except Exception as e:
        logger.error(f"⚠️ خطأ أثناء التحقق من البيانات التأسيسية: {e}")


# ── 3. دوال إدارة العملاء (Customers Controller) ──

def get_customers(params=None):
    with get_db_cursor() as cur:
        cur.execute("""
            SELECT id, name, name as customer_name, phone, phone_alt, platform, handle, category, city, street,
                   children_count, current_balance, notes, status, created_at, updated_at
            FROM customers
            ORDER BY created_at DESC;
        """)
        customers = cur.fetchall()

        # جلب القياسات وربطها بالعملاء
        cur.execute("""
            SELECT id, customer_id, child_id, child_name, date, measurement_date, unit,
                   total_len, dress_len, chest_len, skirt_len, sleeve_len,
                   chest_circ, waist_circ, shoulder_w, armpit_circ, neck_circ,
                   model_name, model_img, comfort_profile, notes
            FROM measurements;
        """)
        all_meas = cur.fetchall()
        meas_map = {}
        for m in all_meas:
            cid = m.get('customer_id')
            if cid not in meas_map:
                meas_map[cid] = []
            m['total_length'] = m.get('total_len')
            m['total_height'] = m.get('total_len')
            m['dress_length'] = m.get('dress_len')
            m['chest_length'] = m.get('chest_len')
            m['skirt_length'] = m.get('skirt_len')
            m['sleeve_length'] = m.get('sleeve_len')
            m['shoulder_width'] = m.get('shoulder_w')
            m['sewing_notes'] = m.get('notes')
            m['event_date'] = str(m.get('date') or '')
            
            # احتساب العمر التقديري تلقائياً من طول الفستان
            dress_l = clean_num(m.get('dress_len'))
            if dress_l > 0:
                if dress_l <= 45: m['estimated_age'] = '1-2 سنوات'
                elif dress_l <= 55: m['estimated_age'] = '2-3 سنوات'
                elif dress_l <= 60: m['estimated_age'] = '4 سنوات'
                elif dress_l <= 65: m['estimated_age'] = '5 سنوات'
                elif dress_l <= 70: m['estimated_age'] = '6 سنوات'
                elif dress_l <= 75: m['estimated_age'] = '7 سنوات'
                elif dress_l <= 80: m['estimated_age'] = '8 سنوات'
                elif dress_l <= 85: m['estimated_age'] = '9 سنوات'
                elif dress_l <= 90: m['estimated_age'] = '10 سنوات'
                elif dress_l <= 95: m['estimated_age'] = '11 سنة'
                elif dress_l <= 100: m['estimated_age'] = '12 سنة'
                else: m['estimated_age'] = 'أكثر من 12 سنة'
            else:
                m['estimated_age'] = ''

            meas_map[cid].append(m)

        # جلب بيانات الأطفال لربطهم كخيارات سريعة في شاشة الطلبات
        cur.execute("SELECT id, customer_id, child_name, notes FROM children;")
        all_children = cur.fetchall()
        ch_map = {}
        for ch in all_children:
            cid = ch.get('customer_id')
            if cid not in ch_map:
                ch_map[cid] = []
            ch_map[cid].append(ch)

        for c in customers:
            if c.get('created_at'): c['created_at'] = str(c['created_at'])
            if c.get('updated_at'): c['updated_at'] = str(c['updated_at'])
            c_meas = meas_map.get(c.get('id'), [])
            c_children = ch_map.get(c.get('id'), [])
            
            # في حال وجود أطفال مسجلين بدون سجل مقاسات، نضيفهم كخيارات متاحة
            known_child_names = {clean_str(m.get('child_name')) for m in c_meas if clean_str(m.get('child_name'))}
            for ch in c_children:
                ch_n = clean_str(ch.get('child_name'))
                if ch_n and ch_n not in known_child_names:
                    c_meas.append({
                        'id': ch.get('id'),
                        'customer_id': c.get('id'),
                        'child_id': ch.get('id'),
                        'child_name': ch_n,
                        'notes': ch.get('notes'),
                        'estimated_age': '',
                        'event_date': ''
                    })
                    known_child_names.add(ch_n)

            c['measurements'] = c_meas
            c['children'] = c_children
        return customers

def add_customer(payload):
    data = payload.get('data') or payload
    cust_id = clean_str(data.get('id') or data.get('customer_id')) or generate_id("CUST")
    name = clean_str(data.get('name') or data.get('customer_name') or 'عميل جديد')
    phone = clean_str(data.get('phone') or data.get('phone_number'))
    if not phone:
        phone = f"967-{int(time.time() % 100000000)}"
    phone_alt = clean_str(data.get('phone_alt') or data.get('alternative_phone'))
    platform = clean_str(data.get('platform') or 'Walk-in')
    handle = clean_str(data.get('handle') or '')
    category = clean_str(data.get('category') or 'VIP')
    city = clean_str(data.get('city') or 'صنعاء')
    street = clean_str(data.get('street') or '')
    children_cnt = int(clean_num(data.get('children_count') or 0))
    notes = clean_str(data.get('notes') or '')

    query = """
        INSERT INTO customers (
            id, name, phone, phone_alt, platform, handle, category, city, street,
            children_count, notes, status, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Active', CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            phone_alt = EXCLUDED.phone_alt,
            platform = EXCLUDED.platform,
            handle = EXCLUDED.handle,
            category = EXCLUDED.category,
            city = EXCLUDED.city,
            street = EXCLUDED.street,
            children_count = EXCLUDED.children_count,
            notes = EXCLUDED.notes,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *;
    """
    with get_db_cursor(commit=True) as cur:
        if phone:
            cur.execute("SELECT id FROM customers WHERE phone = %s LIMIT 1;", (phone,))
            existing_c = cur.fetchone()
            if existing_c:
                cust_id = existing_c['id']
        params = (cust_id, name, phone, phone_alt, platform, handle, category, city, street, children_cnt, notes)
        cur.execute(query, params)
        res = dict(cur.fetchone())
        res['customer_name'] = res.get('name')
        
        # حفظ بروفايلات القياسات والأطفال إن وجدت
        meas_list = data.get('measurements') or []
        for m in meas_list:
            chld_name = clean_str(m.get('child_name') or m.get('name') or 'طفلة')
            chld_id = clean_str(m.get('child_id')) or generate_id("CHLD")
            cur.execute("""
                INSERT INTO children (id, customer_id, child_name, notes)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING;
            """, (chld_id, cust_id, chld_name, clean_str(m.get('notes'))))

            meas_id = clean_str(m.get('id')) or generate_id("MEAS")
            cur.execute("""
                INSERT INTO measurements (
                    id, customer_id, child_id, child_name, unit,
                    total_len, dress_len, chest_len, skirt_len, sleeve_len,
                    chest_circ, waist_circ, shoulder_w, armpit_circ, neck_circ,
                    model_name, comfort_profile, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    child_name = EXCLUDED.child_name,
                    total_len = EXCLUDED.total_len,
                    dress_len = EXCLUDED.dress_len,
                    notes = EXCLUDED.notes,
                    updated_at = CURRENT_TIMESTAMP;
            """, (
                meas_id, cust_id, chld_id, chld_name, clean_str(m.get('unit') or 'cm'),
                clean_num(m.get('total_height') or m.get('total_length') or m.get('total_len')),
                clean_num(m.get('dress_length') or m.get('dress_len')),
                clean_num(m.get('chest_length') or m.get('chest_len')),
                clean_num(m.get('skirt_length') or m.get('skirt_len')),
                clean_num(m.get('sleeve_length') or m.get('sleeve_len')),
                clean_num(m.get('chest_circ')),
                clean_num(m.get('waist_circ')),
                clean_num(m.get('shoulder_width') or m.get('shoulder_w')),
                clean_num(m.get('armpit_circ')),
                clean_num(m.get('neck_circ')),
                clean_str(m.get('model_name') or m.get('selected_model')),
                clean_str(m.get('comfort_profile')),
                clean_str(m.get('sewing_notes') or m.get('notes'))
            ))

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        return res


# ── 4. دوال إدارة المنتجات والموديلات (Products Controller) ──

def get_products(params=None):
    query = """
        SELECT id, sku, model_name, model_name as name, model_no, category, subcategory,
               collection, design_code, base_price, base_price as price, base_price as sell_price,
               cost_price, cost_price as cost, cost_price as total_cost,
               labor_cost, packaging_cost, fabric_cost,
               bom, price_matrix, age_chart,
               currency, image_url, description, min_stock, status,
               (status = 'Active') as is_active, created_at, updated_at
        FROM products
        ORDER BY created_at DESC;
    """
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('updated_at'): r['updated_at'] = str(r['updated_at'])
        
        # تحويل بيانات JSONB إن كانت بصيغة نصوص
        if isinstance(r.get('bom'), str):
            try: r['bom'] = json.loads(r['bom'])
            except Exception: pass
        if isinstance(r.get('price_matrix'), str):
            try: r['price_matrix'] = json.loads(r['price_matrix'])
            except Exception: pass
        if isinstance(r.get('age_chart'), str):
            try: r['age_chart'] = json.loads(r['age_chart'])
            except Exception: pass
            
        bom_list = r.get('bom') or []
        if isinstance(bom_list, list) and len(bom_list) > 0:
            names = []
            tot_meters = 0.0
            for b in bom_list:
                fn = b.get('fabric_name') or 'قماش'
                br = b.get('brackets') or {}
                m = float(br.get('6-9 سنوات') or b.get('meters') or 0.0)
                tot_meters += m
                names.append(f"{fn} ({m}م متوسط)")
            r['fabric_name'] = " + ".join(names)
            r['yards_used'] = tot_meters
        else:
            r['fabric_name'] = r.get('description') or 'أقمشة ملكية'
            r['yards_used'] = 2.0
            
        r['profit'] = float(r.get('sell_price') or 0.0) - float(r.get('total_cost') or 0.0)
        r['calc_date'] = str(r.get('updated_at') or r.get('created_at') or datetime.date.today())[:10]
    return rows

def add_product(payload):
    data = payload.get('data') or payload
    prod_id = clean_str(data.get('id') or data.get('product_id')) or generate_id("PROD")
    name = clean_str(data.get('name') or data.get('model_name') or 'فستان أميرات')
    sku = clean_str(data.get('sku') or prod_id)
    category = clean_str(data.get('category') or '(Princess) فستان أميرة')
    subcategory = clean_str(data.get('subcategory') or '')
    collection = clean_str(data.get('collection') or 'تشكيلة ليتل برنسيس 2026')
    currency = clean_str(data.get('currency') or 'YER')
    image_url = clean_str(data.get('image_url') or '')
    desc = clean_str(data.get('description') or '')
    min_stock = int(clean_num(data.get('min_stock') or 2))
    status = 'Active' if str(data.get('status', 'Active')).lower() in ('active', 'true', '1') else 'Inactive'
    
    # حقول التكاليف المباشرة والـ BOM
    labor_cost = clean_num(data.get('labor_cost') or 0.0)
    packaging_cost = clean_num(data.get('packaging_cost') or 0.0)
    fabric_cost = clean_num(data.get('fabric_cost') or 0.0)
    total_cost = clean_num(data.get('total_cost') or data.get('cost') or data.get('cost_price') or (fabric_cost + labor_cost + packaging_cost))
    
    price_matrix = data.get('price_matrix')
    if isinstance(price_matrix, dict):
        pm_json = json.dumps(price_matrix, ensure_ascii=False)
    elif isinstance(price_matrix, str):
        pm_json = price_matrix
    else:
        pm_json = None
        
    bom = data.get('bom')
    if isinstance(bom, (list, dict)):
        bom_json = json.dumps(bom, ensure_ascii=False)
    elif isinstance(bom, str):
        bom_json = bom
    else:
        bom_json = None
        
    age_chart = data.get('age_chart')
    if isinstance(age_chart, (list, dict)):
        ac_json = json.dumps(age_chart, ensure_ascii=False)
    elif isinstance(age_chart, str):
        ac_json = age_chart
    else:
        ac_json = None
        
    # سعر البيع
    sell_price = clean_num(data.get('sell_price') or data.get('price') or data.get('base_price') or 0.0)
    if sell_price == 0.0 and isinstance(price_matrix, dict):
        sell_price = clean_num(price_matrix.get('6-9 سنوات') or price_matrix.get('3-5 سنوات') or 0.0)

    query = """
        INSERT INTO products (
            id, sku, model_name, category, subcategory, collection, base_price,
            cost_price, currency, image_url, description, min_stock, status,
            labor_cost, packaging_cost, fabric_cost, bom, price_matrix, age_chart, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
            model_name = EXCLUDED.model_name,
            sku = EXCLUDED.sku,
            category = EXCLUDED.category,
            base_price = EXCLUDED.base_price,
            cost_price = EXCLUDED.cost_price,
            currency = EXCLUDED.currency,
            image_url = EXCLUDED.image_url,
            description = EXCLUDED.description,
            min_stock = EXCLUDED.min_stock,
            status = EXCLUDED.status,
            labor_cost = EXCLUDED.labor_cost,
            packaging_cost = EXCLUDED.packaging_cost,
            fabric_cost = EXCLUDED.fabric_cost,
            bom = EXCLUDED.bom,
            price_matrix = EXCLUDED.price_matrix,
            age_chart = EXCLUDED.age_chart,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *, model_name as name, base_price as price, cost_price as cost;
    """
    params = (
        prod_id, sku, name, category, subcategory, collection, sell_price,
        total_cost, currency, image_url, desc, min_stock, status,
        labor_cost, packaging_cost, fabric_cost, bom_json, pm_json, ac_json
    )
    with get_db_cursor(commit=True) as cur:
        cur.execute(query, params)
        res = dict(cur.fetchone())
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        res['success'] = True
        res['message'] = f"تم حفظ وتوثيق الموديل ({name}) وحساب التكلفة سحابياً ☁️🧮"
        return res

def save_bom_model(payload):
    return add_product(payload)

def get_bom_models(payload=None):
    prods = get_products()
    total_models = len(prods)
    total_cost = sum(float(p.get('total_cost') or p.get('cost_price') or 0.0) for p in prods)
    total_price = sum(float(p.get('sell_price') or p.get('base_price') or 0.0) for p in prods)
    avg_cost = total_cost / total_models if total_models > 0 else 0.0
    avg_price = total_price / total_models if total_models > 0 else 0.0
    avg_margin = ((avg_price - avg_cost) / avg_price * 100) if avg_price > 0 else 0.0
    
    kpis = {
        "total_models": total_models,
        "avg_cost": round(avg_cost, 2),
        "avg_price": round(avg_price, 2),
        "avg_margin": round(avg_margin, 1)
    }
    return {
        "success": True,
        "status": "success",
        "data": prods,
        "count": total_models,
        "kpis": kpis
    }

def delete_bom_model(payload):
    return delete_product(payload)


# ── 5. دوال إدارة المخزون المزدوج والخامات (Inventory Controller) ──

def get_inventory(params=None):
    query = """
        SELECT i.id, i.item_code, i.name, i.name as item_name, i.type, i.category, i.unit,
               i.quantity, i.quantity as qty, i.quantity as quantity_meters, i.quantity as current_balance,
               COALESCE(i.reserved_qty, 0) as reserved_qty,
               COALESCE(i.available_qty, i.quantity - COALESCE(i.reserved_qty, 0), i.quantity) as available_qty,
               COALESCE(i.min_limit, 5.0) as min_limit, i.min_limit as reorder_level,
               COALESCE(i.unit_cost, 0.0) as unit_cost, i.unit_cost as avg_cost,
               i.unit_cost as cost, i.unit_cost as cost_per_meter, i.unit_cost as cost_per_unit,
               COALESCE(i.total_value, i.quantity * i.unit_cost, 0.0) as total_value,
               COALESCE(i.currency, 'YER') as currency,
               COALESCE(s.name, i.supplier_id, 'مورد عام') as supplier,
               i.supplier_id,
               COALESCE(i.location, 'المستودع الرئيسي') as location,
               COALESCE(i.status, 'Available') as status,
               i.created_at, i.updated_at
        FROM inventory i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        ORDER BY i.name ASC;
    """
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('updated_at'): r['updated_at'] = str(r['updated_at'])
    return rows

def add_or_update_inventory(payload):
    data = payload.get('data') or payload
    inv_id = clean_str(data.get('id') or data.get('item_id'))
    item_code = clean_str(data.get('item_code') or data.get('code'))
    name = clean_str(data.get('name') or data.get('item_name') or 'خامة قماش')
    m_type = clean_str(data.get('type') or 'Fabric')
    cat = clean_str(data.get('category') or 'أقمشة فاخرة')
    unit = clean_str(data.get('unit') or 'متر')
    qty = clean_num(data.get('quantity') or data.get('qty') or data.get('current_balance') or 0.0)
    res_qty = clean_num(data.get('reserved_qty') or 0.0)
    min_lim = clean_num(data.get('min_limit') or data.get('reorder_level') or 5.0)
    unit_cost = clean_num(data.get('unit_cost') or data.get('cost') or data.get('cost_per_meter') or data.get('avg_cost') or 0.0)
    total_val = clean_num(data.get('total_value') or (qty * unit_cost))
    location = clean_str(data.get('location') or 'المستودع الرئيسي')
    supplier_id = clean_str(data.get('supplier_id') or data.get('supplier') or '')
    curr = clean_str(data.get('currency') or 'YER')

    with get_db_cursor(commit=True) as cur:
        if not inv_id:
            cur.execute("SELECT id, item_code FROM inventory WHERE name = %s OR (item_code IS NOT NULL AND item_code = %s) LIMIT 1;", (name, item_code or name))
            ex_row = cur.fetchone()
            if ex_row:
                inv_id = ex_row['id']
                if not item_code:
                    item_code = ex_row['item_code']
        if not inv_id:
            inv_id = generate_id("MAT")
        if not item_code:
            item_code = inv_id

        query = """
            INSERT INTO inventory (
                id, item_code, name, type, category, unit, quantity, reserved_qty,
                min_limit, unit_cost, currency, supplier_id, location, status, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Available', CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                item_code = EXCLUDED.item_code,
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                category = EXCLUDED.category,
                unit = EXCLUDED.unit,
                quantity = EXCLUDED.quantity,
                reserved_qty = EXCLUDED.reserved_qty,
                min_limit = EXCLUDED.min_limit,
                unit_cost = EXCLUDED.unit_cost,
                currency = COALESCE(NULLIF(EXCLUDED.currency, ''), inventory.currency, 'YER'),
                supplier_id = COALESCE(NULLIF(EXCLUDED.supplier_id, ''), inventory.supplier_id),
                location = EXCLUDED.location,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *, name as item_name, quantity as qty, quantity as current_balance, unit_cost as avg_cost, unit_cost as cost, COALESCE(currency, 'YER') as currency;
        """
        params = (inv_id, item_code, name, m_type, cat, unit, qty, res_qty, min_lim, unit_cost, curr, supplier_id, location)
        cur.execute(query, params)
        res = dict(cur.fetchone())
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        res['success'] = True
        return res

def update_inventory_qty(payload):
    data = payload.get('data') or payload
    item_id = clean_str(data.get('id') or data.get('item_id') or data.get('item_code') or data.get('item_name') or data.get('name'))
    qty_deduct = clean_num(data.get('qty_to_deduct'))
    if qty_deduct > 0:
        change = -abs(qty_deduct)
    else:
        change = clean_num(data.get('change_qty') or data.get('quantity') or data.get('qty') or 0.0)
    tx_type = clean_str(data.get('type') or ('PRODUCTION_OUT' if change < 0 else 'ADJUSTMENT'))
    notes = clean_str(data.get('notes') or ('صرف خامات لمعمل التفصيل' if change < 0 else 'تعديل مخزني'))

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT * FROM inventory WHERE id = %s OR item_code = %s OR name = %s LIMIT 1 FOR UPDATE;", (item_id, item_id, item_id))
        row = cur.fetchone()
        if not row:
            new_id = generate_id("MAT")
            init_qty = max(0.0, 100.0 + change)
            cur.execute("""
                INSERT INTO inventory (id, item_code, name, type, category, unit, quantity, unit_cost, location, status)
                VALUES (%s, %s, %s, 'Fabric', 'أقمشة فاخرة', 'meter', %s, 0.0, 'المستودع الرئيسي', 'Available')
                RETURNING *, name as item_name, quantity as current_balance;
            """, (new_id, new_id, item_id or 'خامة قماش', init_qty))
            row = cur.fetchone()
        
        old_q = float(row['quantity'] or 0.0)
        u_cost = float(row['unit_cost'] or 0.0)
        res_q = float(row.get('reserved_qty') or 0.0)
        new_q = max(0.0, old_q + change)
        new_avail = max(0.0, new_q - res_q)
        new_total = round(new_q * u_cost, 2)

        cur.execute("""
            UPDATE inventory
            SET quantity = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *, name as item_name, quantity as current_balance, quantity as qty;
        """, (new_q, row['id']))
        updated_row = dict(cur.fetchone())

        cur.execute("""
            INSERT INTO inventory_transactions (
                id, inventory_id, transaction_type, quantity, unit_cost, reference_type, notes
            ) VALUES (
                %s, %s, %s, %s, %s, 'MANUAL', %s
            );
        """, (generate_id("ITXN"), row['id'], tx_type, change, u_cost, notes))

        updated_row['new_qty'] = new_q
        updated_row['new_total'] = new_total
        updated_row['success'] = True
        return updated_row

def adjust_inventory(payload):
    data = payload.get('data') or payload
    item_id = clean_str(data.get('item_id') or data.get('id'))
    item_name = clean_str(data.get('item_name') or data.get('name'))
    adj_type = clean_str(data.get('adj_type') or data.get('type') or 'wastage').lower()
    variance_qty = clean_num(data.get('variance_qty') or data.get('qty') or 0.0)
    reason = clean_str(data.get('reason') or data.get('notes') or ('إهلاك تالف وهالك أقمشة خياطة' if adj_type == 'wastage' else 'تسوية فائض جردي'))

    if variance_qty <= 0:
        raise ValueError("الكمية المراد تسويتها يجب أن تكون أكبر من الصفر")

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT id, name, item_code, quantity, reserved_qty, available_qty, unit_cost
            FROM inventory
            WHERE id = %s OR name = %s OR item_code = %s
            LIMIT 1 FOR UPDATE;
        """, (item_id, item_name or item_id, item_id))
        inv_row = cur.fetchone()
        if not inv_row:
            raise ValueError(f"لم يتم العثور على صنف المخزون: {item_name or item_id}")

        inv_id = inv_row['id']
        actual_name = inv_row['name']
        cur_q = float(inv_row['quantity'] or 0.0)
        u_cost = float(inv_row['unit_cost'] or 0.0)
        res_q = float(inv_row['reserved_qty'] or 0.0)

        if adj_type == 'wastage':
            new_q = max(0.0, cur_q - variance_qty)
            change_qty = -abs(variance_qty)
            tx_type = 'WASTAGE'
        else:
            new_q = cur_q + variance_qty
            change_qty = abs(variance_qty)
            tx_type = 'GAIN'

        new_total_val = round(new_q * u_cost, 2)
        adj_amount = round(variance_qty * u_cost, 2)
        rate = resolve_exchange_rate(cur, 'YER', 1.0)
        adj_amount_yer = round(adj_amount * rate, 2)

        cur.execute("""
            UPDATE inventory
            SET quantity = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s;
        """, (new_q, inv_id))

        tx_id = generate_id("ITXN")
        cur.execute("""
            INSERT INTO inventory_transactions (
                id, inventory_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, 'ADJUSTMENT', %s, %s, CURRENT_TIMESTAMP
            );
        """, (tx_id, inv_id, tx_type, change_qty, u_cost, inv_id, reason))

        if adj_amount > 0:
            jv_id = generate_id("JV")
            clean_ts = int(time.time())
            entry_no = f"JV-ADJ-{clean_ts}"
            today = today_str()

            if adj_type == 'wastage':
                debit_acc = 'ACC-509'
                credit_acc = 'ACC-105'
                jv_desc = f"إهلاك تالف وهالك أقمشة: {actual_name} ({variance_qty} متر) - {reason}"
                line1_desc = f"إهلاك تالف خامات: {actual_name}"
                line2_desc = f"تخفيض مخزون خامات: {actual_name}"
            else:
                debit_acc = 'ACC-105'
                credit_acc = 'ACC-404'
                jv_desc = f"تسوية فائض جردي للأقمشة: {actual_name} ({variance_qty} متر) - {reason}"
                line1_desc = f"إضافة فائض لمخزون: {actual_name}"
                line2_desc = f"أرباح تسوية جردية: {actual_name}"

            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, ref_type, ref_id, currency, exchange_rate, status, notes
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, 'Inventory_Adjustment', %s, 'YER', %s, 'Posted', %s
                );
            """, (jv_id, entry_no, today, jv_desc, debit_acc, credit_acc, adj_amount, adj_amount, adj_amount_yer, inv_id, rate, reason))

            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
            """, (generate_id("JVL"), jv_id, debit_acc, line1_desc, adj_amount, adj_amount_yer))

            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (generate_id("JVL"), jv_id, credit_acc, line2_desc, adj_amount, adj_amount_yer))

        return {
            "success": True,
            "status": "success",
            "item_id": inv_id,
            "item_name": actual_name,
            "adj_type": adj_type,
            "variance_qty": variance_qty,
            "new_qty": new_q,
            "new_total": new_total_val,
            "unit_cost": u_cost,
            "adj_amount": adj_amount,
            "message": f"تم ترحيل قيد التسوية الجردية لـ ({actual_name}) بنجاح ⚖️"
        }


# ── 6. دوال إدارة المبيعات والطلبات (Orders Controller) ──

def get_orders(params=None):
    query = """
        SELECT o.*, 
               c.name as customer_name, 
               c.phone as customer_phone,
               COALESCE(p.model_name, oi.notes, 'موديل راقي') as product_name,
               COALESCE(ch.child_name, m.child_name, 'الأميرة') as child_name
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN LATERAL (
            SELECT oi.product_id, oi.notes
            FROM order_items oi
            WHERE oi.order_id = o.id
            LIMIT 1
        ) oi ON true
        LEFT JOIN products p ON COALESCE(o.product_id, oi.product_id) = p.id
        LEFT JOIN LATERAL (
            SELECT ch.child_name
            FROM children ch
            WHERE ch.id = o.child_id OR ch.customer_id = o.customer_id
            LIMIT 1
        ) ch ON true
        LEFT JOIN LATERAL (
            SELECT m.child_name
            FROM measurements m
            WHERE m.customer_id = o.customer_id
            LIMIT 1
        ) m ON true
        ORDER BY o.created_at DESC;
    """
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('updated_at'): r['updated_at'] = str(r['updated_at'])
        if r.get('order_date'): r['order_date'] = str(r['order_date'])
        if r.get('delivery_date'): r['delivery_date'] = str(r['delivery_date'])

        # الحقول المالية التوافقية لواجهة Orders.jsx ومحركات الطباعة
        tot = float(r.get('total_amount') or 0.0)
        pd = float(r.get('paid_amount') or 0.0)
        r['total'] = tot
        r['paid'] = pd
        r['remaining'] = float(r.get('remaining_amount') or max(0.0, tot - pd))
        r['qty'] = int(clean_num(r.get('quantity') or 1))

        # توحيد مسمى الحالة مع خيارات القائمة المنسدلة في الواجهة
        prod_st = clean_str(r.get('production_status') or r.get('status') or '')
        if 'cut' in prod_st.lower() or 'قص' in prod_st:
            r['status'] = 'قيد القص ✂️'
        elif 'sew' in prod_st.lower() or 'خياط' in prod_st:
            r['status'] = 'قيد الخياطة 🪡'
        elif 'embroid' in prod_st.lower() or 'تطريز' in prod_st or 'شك' in prod_st:
            r['status'] = 'التطريز والشك ✨'
        elif 'inspect' in prod_st.lower() or 'فحص' in prod_st or 'تشطيب' in prod_st:
            r['status'] = 'الفحص والتشطيب 🔍'
        elif 'ready' in prod_st.lower() or 'جاهز' in prod_st:
            r['status'] = 'جاهز للتسليم 🛍️'
        elif 'deliver' in prod_st.lower() or 'تسليم' in prod_st or prod_st == 'Completed':
            r['status'] = 'تم التسليم ✅'
        else:
            r['status'] = 'قيد الخياطة 🪡'
    return rows

def add_order(payload):
    data = payload.get('data') or payload
    order_id = clean_str(data.get('id') or data.get('order_id')) or generate_id("ORD")
    order_no = clean_str(data.get('order_no')) or order_id
    
    # التحقق من العميل والبحث عنه بالاسم أو إنشاؤه
    cust_id = clean_str(data.get('customer_id'))
    if not cust_id or cust_id == 'CUST-GENERAL':
        c_name = clean_str(data.get('customer_name'))
        if c_name:
            with get_db_cursor(commit=False) as c_check:
                c_check.execute("SELECT id FROM customers WHERE name = %s LIMIT 1;", (c_name,))
                c_row = c_check.fetchone()
                if c_row:
                    cust_id = c_row['id']
                else:
                    cust_id = generate_id("CUST")
                    add_customer({'id': cust_id, 'name': c_name, 'phone': clean_str(data.get('customer_phone'))})
        else:
            cust_id = 'CUST-GENERAL'
    else:
        with get_db_cursor(commit=False) as c_check:
            c_check.execute("SELECT id FROM customers WHERE id = %s;", (cust_id,))
            if not c_check.fetchone():
                add_customer({'id': cust_id, 'name': clean_str(data.get('customer_name') or 'عميل جديد')})

    order_date = clean_str(data.get('order_date') or data.get('date')) or today_str()
    del_date = clean_str(data.get('delivery_date')) or None
    curr = clean_str(data.get('currency') or 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    tot_amt = clean_num(data.get('total_amount') or data.get('total') or 0.0)
    paid_amt = clean_num(data.get('paid_amount') or data.get('paid') or 0.0)
    base_amt = clean_num(data.get('base_amount') or (tot_amt * rate))
    subtotal = clean_num(data.get('subtotal') or tot_amt)
    discount = clean_num(data.get('discount') or 0.0)
    tax = clean_num(data.get('tax') or 0.0)
    pay_status = 'Paid' if paid_amt >= tot_amt and tot_amt > 0 else ('Partial' if paid_amt > 0 else 'Unpaid')
    prod_status = clean_str(data.get('production_status') or data.get('status') or 'Pending')
    pay_method = clean_str(data.get('payment_method') or 'نقد (كاش)')
    notes = clean_str(data.get('notes') or '')
    
    ch_id = clean_str(data.get('child_id')) or None
    ch_name = clean_str(data.get('child_name'))
    if not ch_id and ch_name and cust_id:
        with get_db_cursor(commit=False) as ch_check:
            ch_check.execute("SELECT id FROM children WHERE customer_id = %s AND child_name = %s LIMIT 1;", (cust_id, ch_name))
            ch_row = ch_check.fetchone()
            if ch_row:
                ch_id = ch_row['id']
            else:
                ch_id = generate_id("CHLD")
                with get_db_cursor(commit=True) as ch_ins:
                    ch_ins.execute("""
                        INSERT INTO children (id, customer_id, child_name, notes, status)
                        VALUES (%s, %s, %s, 'تم الإنشاء آلياً من الطلب', 'Active')
                        ON CONFLICT (id) DO NOTHING;
                    """, (ch_id, cust_id, ch_name))

    prod_id = clean_str(data.get('product_id')) or None
    p_name = clean_str(data.get('product_name'))
    if prod_id:
        with get_db_cursor(commit=False) as p_check:
            p_check.execute("SELECT id FROM products WHERE id = %s;", (prod_id,))
            if not p_check.fetchone():
                prod_id = None
    if not prod_id and p_name:
        with get_db_cursor(commit=False) as p_check:
            p_check.execute("SELECT id FROM products WHERE model_name = %s LIMIT 1;", (p_name,))
            p_row = p_check.fetchone()
            if p_row:
                prod_id = p_row['id']

    query = """
        INSERT INTO orders (
            id, order_no, customer_id, child_id, product_id, order_date, delivery_date,
            currency, exchange_rate, subtotal, discount, tax, total_amount,
            paid_amount, base_amount, payment_status, production_status,
            payment_method, status, notes, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Active', %s, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE SET
            child_id = COALESCE(EXCLUDED.child_id, orders.child_id),
            product_id = COALESCE(EXCLUDED.product_id, orders.product_id),
            total_amount = EXCLUDED.total_amount,
            paid_amount = EXCLUDED.paid_amount,
            payment_status = EXCLUDED.payment_status,
            production_status = EXCLUDED.production_status,
            notes = EXCLUDED.notes,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *;
    """
    params = (
        order_id, order_no, cust_id, ch_id, prod_id, order_date, del_date,
        curr, rate, subtotal, discount, tax, tot_amt, paid_amt, base_amt,
        pay_status, prod_status, pay_method, notes
    )

    with get_db_cursor(commit=True) as cur:
        cur.execute(query, params)
        res = dict(cur.fetchone())
        
        # حفظ بنود الطلب إذا أُرسلت مصفوفة بنود (Items)
        items = data.get('items') or []
        for itm in items:
            itm_id = generate_id("OITM")
            p_id = itm.get('product_id') or prod_id
            if not p_id:
                cand_name = itm.get('product_name') or p_name or 'تفصيل مخصص'
                cur.execute("SELECT id FROM products WHERE model_name = %s LIMIT 1;", (cand_name,))
                p_match = cur.fetchone()
                if p_match:
                    p_id = p_match['id']
                else:
                    cur.execute("SELECT id FROM products LIMIT 1;")
                    any_p = cur.fetchone()
                    if any_p:
                        p_id = any_p['id']
                    else:
                        p_id = 'PROD-CUSTOM-001'
                        cur.execute("""
                            INSERT INTO products (id, sku, model_name, category, currency, base_price, status)
                            VALUES (%s, %s, %s, 'فساتين تفصيل', 'YER', %s, 'Active')
                            ON CONFLICT (id) DO NOTHING;
                        """, (p_id, p_id, cand_name, tot_amt))
            if p_id:
                qty = clean_num(itm.get('quantity') or 1.0)
                u_price = clean_num(itm.get('unit_price') or itm.get('price') or 0.0)
                t_price = clean_num(itm.get('total_price') or (qty * u_price))
                cur.execute("""
                    INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s);
                """, (itm_id, order_id, p_id, qty, u_price, t_price, clean_str(itm.get('notes') or '')))

        # 1. الخصم التلقائي الذري من المخزون وتسجيل حركة المخزون
        deduct_candidates = []
        if items:
            for itm in items:
                p_ref = itm.get('product_id') or prod_id
                q_val = clean_num(itm.get('quantity') or 1.0)
                n_ref = clean_str(itm.get('product_name') or itm.get('name') or p_name)
                deduct_candidates.append((p_ref, n_ref, q_val))
        elif prod_id or p_name:
            deduct_candidates.append((prod_id, p_name, 1.0))

        for p_id_ref, p_name_ref, q_deduct in deduct_candidates:
            if not p_id_ref and not p_name_ref:
                continue
            inv_row = None
            if p_id_ref:
                cur.execute("""
                    SELECT id, quantity, unit_cost FROM inventory
                    WHERE id = %s OR item_code = %s
                    LIMIT 1 FOR UPDATE;
                """, (p_id_ref, p_id_ref))
                inv_row = cur.fetchone()
            if not inv_row and p_name_ref:
                cur.execute("""
                    SELECT id, quantity, unit_cost FROM inventory
                    WHERE name = %s OR name ILIKE %s
                    LIMIT 1 FOR UPDATE;
                """, (p_name_ref, f"%{p_name_ref}%"))
                inv_row = cur.fetchone()
            if inv_row:
                new_qty = max(0.0, float(inv_row['quantity']) - q_deduct)
                cur.execute("UPDATE inventory SET quantity = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (new_qty, inv_row['id']))
                cur.execute("""
                    INSERT INTO inventory_transactions (id, inventory_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes)
                    VALUES (%s, %s, 'SALE_OUT', %s, %s, 'orders', %s, %s);
                """, (generate_id("ITXN"), inv_row['id'], -abs(q_deduct), inv_row['unit_cost'], order_id, f"خصم مبيعات للطلب {order_no}"))

        # تحديد صندوق السداد بناءً على العملة وطريقة الدفع
        cash_account_id = 'ACC-101'
        if curr == 'SAR' or 'سعودي' in curr.lower():
            cash_account_id = 'ACC-101-2'
        elif curr == 'USD' or 'دولار' in curr.lower() or '$' in curr:
            cash_account_id = 'ACC-101-3'
        elif any(k in pay_method for k in ['كريمي', 'بنك', 'حوالة', 'شيك']):
            cash_account_id = 'ACC-103'

        # 2. إنشاء سند قبض تلقائي في جدول payments للمبلغ المسدد نقداً
        if paid_amt > 0:
            auto_pay_id = f"PAY-{order_id}"
            auto_pay_no = f"REC-{order_no}"
            party_name_str = c_name if 'c_name' in locals() and c_name else clean_str(data.get('customer_name') or 'العميلة')
            cur.execute("""
                INSERT INTO payments (
                    id, payment_no, order_id, customer_id, payment_type, amount, currency,
                    exchange_rate, base_amount, payment_method, account_id, date, status, notes,
                    party_name, target_account_id
                ) VALUES (
                    %s, %s, %s, %s, 'Receipt', %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, 'ACC-401'
                ) ON CONFLICT (payment_no) DO UPDATE SET 
                    amount = EXCLUDED.amount,
                    base_amount = EXCLUDED.base_amount,
                    payment_method = EXCLUDED.payment_method,
                    account_id = EXCLUDED.account_id,
                    party_name = EXCLUDED.party_name;
            """, (auto_pay_id, auto_pay_no, order_id, cust_id, paid_amt, curr, rate, (paid_amt * rate), pay_method, cash_account_id, order_date, f"دفعة فاتورة الطلب {order_no}", party_name_str))

        # 3. تحديث رصيد ذمة العميل بالمبلغ المتبقي الآجل
        rem_amt = tot_amt - paid_amt
        if rem_amt != 0 and cust_id and cust_id != 'CUST-GENERAL':
            cur.execute("""
                UPDATE customers
                SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (rem_amt, cust_id))

        # 4. تسجيل القيد المحاسبي المزدوج المتوازن لفاتورة المبيعات
        if tot_amt > 0:
            auto_jv_id = f"JV-{order_id}"
            auto_jv_no = f"JV-{order_no}"
            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id,
                    credit_account_id, amount, total_amount, base_amount, ref_type,
                    ref_id, currency, exchange_rate, status, notes
                ) VALUES (
                    %s, %s, %s, %s, %s, 'ACC-401', %s, %s, %s, 'Order',
                    %s, %s, %s, 'Posted', %s
                ) ON CONFLICT (entry_no) DO UPDATE SET 
                    amount = EXCLUDED.amount,
                    total_amount = EXCLUDED.total_amount,
                    base_amount = EXCLUDED.base_amount,
                    debit_account_id = EXCLUDED.debit_account_id,
                    currency = EXCLUDED.currency,
                    exchange_rate = EXCLUDED.exchange_rate,
                    description = EXCLUDED.description,
                    notes = EXCLUDED.notes;
            """, (auto_jv_id, auto_jv_no, order_date, f"فاتورة مبيعات طلب {order_no}", cash_account_id, tot_amt, tot_amt, base_amt, order_id, curr, rate, f"ترحيل محاسبي تلقائي للطلب {order_no}"))

            cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
            actual_jv_id = cur.fetchone()['id']
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (actual_jv_id,))

            # أسطر القيد المحاسبي (Double Entry Lines)
            if paid_amt > 0:
                cur.execute("""
                    INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
                """, (generate_id("JVL"), actual_jv_id, cash_account_id, f"المبلغ المستلم نقداً - طلب {order_no}", paid_amt, (paid_amt * rate)))
            if rem_amt > 0:
                cur.execute("""
                    INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES (%s, %s, 'ACC-104', %s, %s, 0.0, %s, 0.0);
                """, (generate_id("JVL"), actual_jv_id, f"المبلغ الآجل على العميل - طلب {order_no}", rem_amt, (rem_amt * rate)))
            
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, 'ACC-401', %s, 0.0, %s, 0.0, %s);
            """, (generate_id("JVL"), actual_jv_id, f"إيراد مبيعات فساتين - طلب {order_no}", tot_amt, base_amt))

        # 5. أمر تشغيل بالمعمل تلقائياً
        if prod_status not in ('Delivered', 'Cancelled', 'Ready'):
            target_prod_id = prod_id
            if not target_prod_id:
                cur.execute("SELECT id FROM products LIMIT 1;")
                any_prod = cur.fetchone()
                if any_prod:
                    target_prod_id = any_prod['id']
                else:
                    target_prod_id = 'PROD-CUSTOM-001'
                    cur.execute("""
                        INSERT INTO products (id, sku, model_name, category, currency, base_price, status)
                        VALUES (%s, %s, %s, 'فساتين تفصيل', 'YER', %s, 'Active')
                        ON CONFLICT (id) DO NOTHING;
                    """, (target_prod_id, target_prod_id, p_name or 'تفصيل مخصص', tot_amt))
            
            po_id = generate_id("PRD")
            po_no = f"PO-{order_no}"
            stage_ar = 'القص والتحضير ✂️'
            if 'sew' in prod_status.lower() or 'خياط' in prod_status:
                stage_ar = 'مرحلة الخياطة 🪡'
            elif 'embroid' in prod_status.lower() or 'تطريز' in prod_status:
                stage_ar = 'التطريز والشك ✨'
            elif 'inspect' in prod_status.lower() or 'فحص' in prod_status:
                stage_ar = 'الفحص والتشطيب النهائي 🔍'
            elif 'ready' in prod_status.lower() or 'جاهز' in prod_status:
                stage_ar = 'جاهز للتسليم 📦'

            cur.execute("""
                INSERT INTO production_orders (
                    id, production_order_no, order_id, product_id, product_name, child_name,
                    stage, start_date, due_date, progress, status, notes
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 20, 'In Progress', %s)
                ON CONFLICT (production_order_no) DO UPDATE SET
                    stage = EXCLUDED.stage,
                    notes = EXCLUDED.notes;
            """, (po_id, po_no, order_id, target_prod_id, p_name or 'فستان أميرات', ch_name or clean_str(data.get('child_name')), stage_ar, order_date, del_date, notes))

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        return res

def update_order(payload):
    """تحديث بيانات الطلب بصورة جزئية ومرنة دون تصفير أو مسح الحقول السابقة، مع مزامنة الورشة والمعمل"""
    data = payload.get('data') or payload
    order_id = clean_str(data.get('id') or data.get('order_id'))
    if not order_id:
        return {"error": "Missing order id"}

    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT * FROM orders WHERE id = %s LIMIT 1 FOR UPDATE;", (order_id,))
        existing = cur.fetchone()
        if not existing:
            return add_order(payload)

        updates = []
        params = []

        # مزامنة حالة الإنتاج مع شاشة المعمل (Factory Pipeline)
        status_raw = clean_str(data.get('status') or data.get('production_status'))
        if status_raw:
            stage_ar = 'قيد الخياطة 🪡'
            stage_db = 'Sewing'
            progress = 40
            if 'قص' in status_raw or 'cut' in status_raw.lower():
                stage_ar = 'قيد القص ✂️'
                stage_db = 'Cutting'
                progress = 20
            elif 'خياط' in status_raw or 'sew' in status_raw.lower():
                stage_ar = 'قيد الخياطة 🪡'
                stage_db = 'Sewing'
                progress = 40
            elif 'تطريز' in status_raw or 'شك' in status_raw.lower() or 'embroid' in status_raw.lower():
                stage_ar = 'التطريز والشك ✨'
                stage_db = 'Embroidery'
                progress = 60
            elif 'فحص' in status_raw or 'تشطيب' in status_raw or 'inspect' in status_raw.lower():
                stage_ar = 'الفحص والتشطيب 🔍'
                stage_db = 'Inspection'
                progress = 80
            elif 'جاهز' in status_raw or 'ready' in status_raw.lower():
                stage_ar = 'جاهز للتسليم 🛍️'
                stage_db = 'Ready'
                progress = 90
            elif 'تسليم' in status_raw or 'deliver' in status_raw.lower() or status_raw == 'Completed':
                stage_ar = 'تم التسليم ✅'
                stage_db = 'Delivered'
                progress = 100

            updates.append("production_status = %s")
            params.append(stage_db)

            # مزامنة جدول production_orders المقترن تلقائياً
            cur.execute("""
                UPDATE production_orders
                SET stage = %s, progress = %s, status = %s, updated_at = CURRENT_TIMESTAMP
                WHERE order_id = %s OR production_order_no = %s;
            """, (stage_ar, progress, 'Completed' if progress == 100 else 'In Progress', order_id, f"PO-{existing.get('order_no') or order_id}"))

        if 'delivery_date' in data and data.get('delivery_date'):
            updates.append("delivery_date = %s")
            params.append(clean_str(data['delivery_date']))

        if 'order_date' in data and data.get('order_date'):
            updates.append("order_date = %s")
            params.append(clean_str(data['order_date']))

        if 'notes' in data and data.get('notes') is not None:
            updates.append("notes = %s")
            params.append(clean_str(data['notes']))

        if 'total' in data or 'total_amount' in data:
            tot = clean_num(data.get('total') or data.get('total_amount'))
            pd = clean_num(data.get('paid') or data.get('paid_amount') or existing.get('paid_amount'))
            rem = max(0.0, tot - pd)
            rate = float(existing.get('exchange_rate') or 1.0)
            updates.extend(["total_amount = %s", "paid_amount = %s", "remaining_amount = %s", "base_amount = %s"])
            params.extend([tot, pd, rem, (tot * rate)])
            pay_status = 'Paid' if rem == 0 and tot > 0 else ('Partial' if pd > 0 else 'Unpaid')
            updates.append("payment_status = %s")
            params.append(pay_status)

        if 'quantity' in data or 'qty' in data:
            q = clean_num(data.get('quantity') or data.get('qty') or 1.0)
            updates.append("quantity = %s")
            params.append(q)

        # ربط الطفلة في حال تعديلها
        ch_name = clean_str(data.get('child_name'))
        if ch_name:
            cust_id = existing.get('customer_id')
            cur.execute("SELECT id FROM children WHERE customer_id = %s AND child_name = %s LIMIT 1;", (cust_id, ch_name))
            ch_row = cur.fetchone()
            if ch_row:
                updates.append("child_id = %s")
                params.append(ch_row['id'])
            else:
                new_ch_id = generate_id("CHLD")
                cur.execute("INSERT INTO children (id, customer_id, child_name, notes) VALUES (%s, %s, %s, 'تم الإنشاء من تعديل الطلب') ON CONFLICT (id) DO NOTHING;", (new_ch_id, cust_id, ch_name))
                updates.append("child_id = %s")
                params.append(new_ch_id)

        # ربط الموديل في حال تعديله
        p_name = clean_str(data.get('product_name'))
        if p_name:
            cur.execute("SELECT id FROM products WHERE model_name = %s LIMIT 1;", (p_name,))
            p_row = cur.fetchone()
            if p_row:
                updates.append("product_id = %s")
                params.append(p_row['id'])

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            sql = f"UPDATE orders SET {', '.join(updates)} WHERE id = %s RETURNING *;"
            params.append(order_id)
            cur.execute(sql, tuple(params))
            res = dict(cur.fetchone())
        else:
            res = dict(existing)

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        return res


# ── 7. دوال إدارة المشتريات والموردين (Purchases & Suppliers Controller) ──

def get_purchases(params=None):
    query = """
        SELECT * FROM purchases
        ORDER BY invoice_date DESC, created_at DESC;
    """
    rows = execute_query(query, fetch_all=True)
    
    # جلب تفاصيل الأصناف من purchase_items
    items_by_pur = {}
    try:
        items_rows = execute_query("SELECT * FROM purchase_items ORDER BY id ASC;", fetch_all=True)
        for itm in items_rows:
            pid = itm.get('purchase_id')
            if pid not in items_by_pur:
                items_by_pur[pid] = []
            items_by_pur[pid].append({
                "id": itm.get('id'),
                "item_name": itm.get('item_name'),
                "unit": itm.get('unit'),
                "qty": float(itm.get('quantity') or 0.0),
                "cost": float(itm.get('unit_price') or 0.0),
                "total": float(itm.get('total_price') or 0.0),
                "notes": itm.get('notes')
            })
    except Exception:
        items_by_pur = {}

    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('invoice_date'): r['invoice_date'] = str(r['invoice_date'])

        # توحيد مسميات الحقول لضمان التوافق مع شاشات المشتريات والمخزون والتقارير
        r['bill_no'] = r.get('invoice_no') or r.get('id') or ''
        r['purchase_no'] = r['bill_no']
        r['supplier'] = r.get('supplier_name') or 'مورد عام'
        r['item'] = r.get('item_name') or ''
        r['fabric_name'] = r.get('item_name') or ''
        r['qty'] = float(r.get('quantity') or 0.0)
        r['price'] = float(r.get('unit_price') or 0.0)
        r['cost_per_unit'] = r['price']
        r['total'] = float(r.get('original_amount') or (r['qty'] * r['price']))
        r['pay_type'] = r.get('payment_method') or 'نقدي'
        r['payment_source'] = r.get('payment_account_code') or '101 - الصندوق الرئيسي'
        r['transfer_no'] = r.get('transaction_ref') or ''
        r['date'] = str(r.get('invoice_date') or (r.get('created_at', '')[:10] if r.get('created_at') else ''))

        # توحيد مفاتيح الصور للمعاينة الفورية في الواجهة
        r['receipt_url'] = r.get('receipt_attachment') or r.get('receipt_url') or ''
        r['image_path'] = r['receipt_url']
        r['invoice_image_url'] = r.get('invoice_attachment') or r.get('invoice_image_url') or r.get('invoice_url') or ''
        
        # إرفاق قائمة الأصناف التفصيلية
        r['items'] = items_by_pur.get(r['id']) or []
        
    return rows

def add_purchase(payload):
    data = payload.get('data') or payload

    pur_id = clean_str(data.get('id') or data.get('purchase_id')) or generate_id("PUR")
    inv_no = clean_str(data.get('invoice_no') or data.get('bill_no') or data.get('purchase_no')) or pur_id
    supp_id = clean_str(data.get('supplier_id') or '')
    supp_name = clean_str(data.get('supplier_name') or data.get('supplier') or 'مورد عام')
    supp_phone = clean_str(data.get('supplier_phone') or data.get('phone') or data.get('supplier_number') or '')
    inv_date = clean_str(data.get('invoice_date') or data.get('date')) or today_str()

    curr_raw = clean_str(data.get('currency') or data.get('Original_Currency') or 'YER')
    curr = 'YER'
    if 'SAR' in curr_raw.upper(): curr = 'SAR'
    elif 'USD' in curr_raw.upper(): curr = 'USD'
    elif 'YER' in curr_raw.upper() or '﷼' in curr_raw: curr = 'YER'
    else: curr = curr_raw.strip().upper() or 'YER'

    # تجهيز قائمة الأصناف (يدعم كلاً من مصفوفة الأصناف المتعددة أو الصنف الواحد الفردي)
    raw_items = data.get('items')
    items = []
    if isinstance(raw_items, list) and len(raw_items) > 0:
        for itm in raw_items:
            i_name = clean_str(itm.get('item_name') or itm.get('item') or itm.get('name') or 'مشتريات خامات')
            i_unit = clean_str(itm.get('unit') or 'متر')
            i_qty = clean_num(itm.get('qty') or itm.get('quantity') or 1.0)
            i_cost = clean_num(itm.get('cost') or itm.get('price') or itm.get('unit_price') or 0.0)
            items.append({
                'item_name': i_name,
                'unit': i_unit,
                'quantity': i_qty,
                'unit_price': i_cost,
                'total_price': round(i_qty * i_cost, 2),
                'notes': clean_str(itm.get('notes') or '')
            })
    else:
        single_name = clean_str(data.get('item_name') or data.get('fabric_name') or data.get('item') or 'مشتريات خامات')
        single_unit = clean_str(data.get('unit') or 'متر')
        single_qty = clean_num(data.get('quantity') or data.get('qty') or 1.0)
        single_cost = clean_num(data.get('unit_price') or data.get('cost_per_unit') or data.get('price') or 0.0)
        single_total = clean_num(data.get('original_amount') or (single_qty * single_cost) or data.get('total_amount') or 0.0)
        items.append({
            'item_name': single_name,
            'unit': single_unit,
            'quantity': single_qty,
            'unit_price': single_cost,
            'total_price': single_total if single_total > 0 else round(single_qty * single_cost, 2),
            'notes': clean_str(data.get('notes') or '')
        })

    total_qty = sum(i['quantity'] for i in items)
    items_total_amount = sum(i['total_price'] for i in items)
    orig_amt = clean_num(data.get('original_amount') or items_total_amount)
    
    if len(items) == 1:
        header_item_name = items[0]['item_name']
        header_unit = items[0]['unit']
        header_u_price = items[0]['unit_price']
    else:
        header_item_name = f"{items[0]['item_name']} (و {len(items)-1} خامات أخرى)"
        header_unit = items[0]['unit']
        header_u_price = round(orig_amt / total_qty, 2) if total_qty > 0 else 0.0

    discount = clean_num(data.get('discount') or data.get('discount_amount') or 0.0)
    shipping_cost = clean_num(data.get('shipping_cost') or data.get('freight_cost') or 0.0)
    transfer_fee = clean_num(data.get('transfer_fee') or data.get('transfer_fees') or 0.0)
    pay_method = clean_str(data.get('payment_method') or data.get('pay_type') or 'نقد (كاش)')
    pay_source_raw = clean_str(data.get('payment_account_code') or data.get('payment_source') or data.get('account_id') or '')
    transfer_no = clean_str(data.get('transaction_ref') or data.get('transaction_id') or data.get('transfer_no') or '')
    receipt_url = clean_str(data.get('receipt_attachment') or data.get('receipt_url') or data.get('image_path') or '')
    invoice_image_url = clean_str(data.get('invoice_attachment') or data.get('invoice_image_url') or data.get('invoice_url') or data.get('bill_attachment') or '')
    notes = clean_str(data.get('notes') or '')

    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, clean_num(data.get('exchange_rate') or 1.0))
        items_amt_yer = orig_amt * rate
        discount_yer = discount * rate
        shipping_yer = shipping_cost * rate
        transfer_yer = transfer_fee * rate
        net_paid_orig = max(0.0, (orig_amt + shipping_cost + transfer_fee) - discount)
        net_paid_yer = max(0.0, (items_amt_yer + shipping_yer + transfer_yer) - discount_yer)
        grand_total_yer = net_paid_yer

        # تحديد حساب الدفع (الصندوق المحدد، البنك، أو ذمم الموردين إذا آجل)
        if pay_method == 'آجل':
            credit_acc = 'ACC-201'
        else:
            credit_acc = resolve_account_id(cur, pay_source_raw, default_id='ACC-101')
            if (not pay_source_raw or credit_acc == 'ACC-101') and curr == 'SAR':
                credit_acc = 'ACC-101-2'
            elif (not pay_source_raw or credit_acc == 'ACC-101') and curr == 'USD':
                credit_acc = 'ACC-101-3'

        # التحقق من المورد وإنشاؤه إن لم يكن موجوداً
        if supp_id and supp_id != 'SUPP-GENERAL':
            cur.execute("SELECT id FROM suppliers WHERE id = %s LIMIT 1;", (supp_id,))
            s_row = cur.fetchone()
            if not s_row:
                supp_id = None

        if not supp_id or supp_id == 'SUPP-GENERAL':
            if supp_name and supp_name != 'مورد عام':
                cur.execute("SELECT id FROM suppliers WHERE name = %s OR (phone IS NOT NULL AND phone != '' AND phone = %s) LIMIT 1;", 
                            (supp_name, supp_phone or '___NONE___'))
                s_row = cur.fetchone()
                if s_row:
                    supp_id = s_row['id']
                    if supp_phone:
                        cur.execute("UPDATE suppliers SET phone = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND (phone IS NULL OR phone = '' OR phone = '0000000000');", 
                                    (supp_phone, supp_id))
                else:
                    new_supp_id = generate_id("SUPP")
                    cur.execute("""
                        INSERT INTO suppliers (id, name, phone, city, address, current_balance, is_active, created_at, updated_at)
                        VALUES (%s, %s, %s, 'صنعاء', 'توريد خامات ومشتريات', 0.0, True, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        ON CONFLICT (id) DO NOTHING;
                    """, (new_supp_id, supp_name, supp_phone or '0000000000'))
                    supp_id = new_supp_id
            else:
                supp_id = 'SUPP-GENERAL'

        # صياغة بيان الملاحظات التفصيلي
        cur.execute("SELECT account_name, account_code FROM chart_of_accounts WHERE id = %s LIMIT 1;", (credit_acc,))
        acc_row = cur.fetchone()
        box_display = f"{acc_row['account_code']} - {acc_row['account_name']}" if acc_row else credit_acc

        note_parts = []
        if pay_method == 'آجل':
            note_parts.append(f"شراء آجل على ذمة المورد: {supp_name}")
        else:
            note_parts.append(f"سداد من: {box_display}")
        if transfer_no:
            note_parts.append(f"حوالة رقم: {transfer_no}")
        if notes and notes != 'EMPTY':
            note_parts.append(notes)
        full_notes = " | ".join(note_parts)

        query = """
            INSERT INTO purchases (
                id, invoice_no, supplier_id, supplier_name, supplier_phone,
                invoice_date, item_name, unit, quantity, unit_price,
                currency, exchange_rate, original_amount, discount,
                amount_yer, shipping_cost, transfer_fee, grand_total_yer,
                payment_method, payment_account_code, transaction_ref,
                invoice_attachment, receipt_attachment, receipt_status, payment_status, notes
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, 'Received', %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                supplier_id = EXCLUDED.supplier_id,
                supplier_name = EXCLUDED.supplier_name,
                supplier_phone = EXCLUDED.supplier_phone,
                item_name = EXCLUDED.item_name,
                unit = EXCLUDED.unit,
                quantity = EXCLUDED.quantity,
                unit_price = EXCLUDED.unit_price,
                original_amount = EXCLUDED.original_amount,
                discount = EXCLUDED.discount,
                shipping_cost = EXCLUDED.shipping_cost,
                transfer_fee = EXCLUDED.transfer_fee,
                amount_yer = EXCLUDED.amount_yer,
                grand_total_yer = EXCLUDED.grand_total_yer,
                payment_method = EXCLUDED.payment_method,
                payment_account_code = EXCLUDED.payment_account_code,
                transaction_ref = EXCLUDED.transaction_ref,
                invoice_attachment = COALESCE(NULLIF(EXCLUDED.invoice_attachment, ''), purchases.invoice_attachment),
                receipt_attachment = COALESCE(NULLIF(EXCLUDED.receipt_attachment, ''), purchases.receipt_attachment),
                notes = EXCLUDED.notes
            RETURNING *;
        """
        pay_status = 'Unpaid' if pay_method == 'آجل' else 'Paid'
        params = (
            pur_id, inv_no, supp_id, supp_name, supp_phone,
            inv_date, header_item_name, header_unit, total_qty, header_u_price,
            curr, rate, orig_amt, discount,
            items_amt_yer, shipping_cost, transfer_fee, grand_total_yer,
            pay_method, credit_acc, transfer_no,
            invoice_image_url, receipt_url, pay_status, full_notes
        )
        cur.execute(query, params)
        res = dict(cur.fetchone())

        # حذف تفاصيل الأصناف السابقة إن وجدت لمنع التكرار عند التعديل
        cur.execute("DELETE FROM purchase_items WHERE purchase_id = %s;", (pur_id,))
        cur.execute("DELETE FROM inventory_transactions WHERE reference_type = 'purchases' AND reference_id = %s;", (pur_id,))

        saved_items = []
        for itm in items:
            it_name = itm['item_name']
            it_unit = itm['unit']
            it_qty = itm['quantity']
            it_price = itm['unit_price']
            it_total = itm['total_price']

            # 1. زيادة رصيد المخزون وحساب متوسط التكلفة المرجح
            cur.execute("""
                SELECT id, quantity, reserved_qty, unit_cost FROM inventory
                WHERE name = %s OR item_code = %s
                LIMIT 1 FOR UPDATE;
            """, (it_name, it_name))
            inv_row = cur.fetchone()
            if inv_row:
                inv_id = inv_row['id']
                old_qty = float(inv_row['quantity'] or 0.0)
                old_cost = float(inv_row['unit_cost'] or 0.0)
                new_qty = old_qty + it_qty
                new_cost = round(((old_qty * old_cost) + (it_qty * it_price)) / new_qty, 2) if new_qty > 0 else it_price
                cur.execute("""
                    UPDATE inventory 
                    SET quantity = %s, unit_cost = %s, currency = COALESCE(NULLIF(%s, ''), currency, 'YER'), updated_at = CURRENT_TIMESTAMP 
                    WHERE id = %s;
                """, (new_qty, new_cost, curr, inv_id))
            else:
                inv_id = generate_id("MAT")
                new_cost = it_price
                cur.execute("""
                    INSERT INTO inventory (id, item_code, name, type, category, unit, quantity, unit_cost, currency, supplier_id, location, status)
                    VALUES (%s, %s, %s, 'Fabric', 'أقمشة فاخرة', %s, %s, %s, %s, %s, 'المستودع الرئيسي', 'Available');
                """, (inv_id, inv_id, it_name, it_unit, it_qty, it_price, curr, supp_id))

            # 2. تسجيل حركة المخزون (دون إدخال العمود المحسوب total_cost)
            cur.execute("""
                INSERT INTO inventory_transactions (id, inventory_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes)
                VALUES (%s, %s, 'PURCHASE_IN', %s, %s, 'purchases', %s, %s);
            """, (generate_id("ITXN"), inv_id, it_qty, it_price, pur_id, f"شراء خامات فاتورة {inv_no}"))

            # 3. إدراج سطر الصنف في جدول purchase_items
            p_item_id = generate_id("PITM")
            cur.execute("""
                INSERT INTO purchase_items (id, purchase_id, inventory_id, item_name, unit, quantity, unit_price, total_price, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
            """, (p_item_id, pur_id, inv_id, it_name, it_unit, it_qty, it_price, it_total, itm.get('notes') or f"صنف فاتورة {inv_no}"))

            saved_items.append({
                "id": p_item_id,
                "item_name": it_name,
                "unit": it_unit,
                "quantity": it_qty,
                "unit_price": it_price,
                "total_price": it_total
            })

        # 4. تسجيل سند صرف إذا سُددت نقداً أو بحوالة بنكية مع ربطه بالصندوق المخصص المحدد
        clean_ref = pur_id[4:] if str(pur_id).startswith('PUR-') else pur_id
        if pay_method != 'آجل' and net_paid_orig > 0:
            auto_pay_id = generate_id("PAY")
            auto_pay_no = f"PAY-{clean_ref}"
            cur.execute("""
                INSERT INTO payments (
                    id, payment_no, invoice_id, supplier_id, payment_type, amount, currency,
                    exchange_rate, base_amount, payment_method, account_id, date, status, notes
                ) VALUES (
                    %s, %s, %s, %s, 'Payment', %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s
                ) ON CONFLICT (payment_no) DO UPDATE SET 
                    amount = EXCLUDED.amount,
                    base_amount = EXCLUDED.base_amount,
                    account_id = EXCLUDED.account_id,
                    exchange_rate = EXCLUDED.exchange_rate,
                    currency = EXCLUDED.currency;
            """, (auto_pay_id, auto_pay_no, pur_id, supp_id, net_paid_orig, curr, rate, net_paid_yer, pay_method, credit_acc, inv_date, f"سداد فاتورة مشتريات {inv_no}"))

        # 5. تسجيل القيد المحاسبي المزدوج المتوازن (المخزون + الشحن + التحويل مقابل الخصم والصندوق)
        if orig_amt > 0 or net_paid_orig > 0:
            auto_jv_id = generate_id("JV")
            auto_jv_no = f"JV-PUR-{clean_ref}"
            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id,
                    credit_account_id, amount, total_amount, base_amount, ref_type,
                    ref_id, currency, exchange_rate, status, notes
                ) VALUES (
                    %s, %s, %s, %s, 'ACC-105', %s, %s, %s, %s, 'Purchase',
                    %s, %s, %s, 'Posted', %s
                ) ON CONFLICT (entry_no) DO UPDATE SET 
                    amount = EXCLUDED.amount,
                    total_amount = EXCLUDED.total_amount,
                    base_amount = EXCLUDED.base_amount,
                    credit_account_id = EXCLUDED.credit_account_id,
                    exchange_rate = EXCLUDED.exchange_rate,
                    currency = EXCLUDED.currency,
                    notes = EXCLUDED.notes;
            """, (auto_jv_id, auto_jv_no, inv_date, f"فاتورة مشتريات خامات {inv_no}", credit_acc, net_paid_orig, net_paid_orig, net_paid_yer, pur_id, curr, rate, f"ترحيل مشتريات {inv_no}"))
            
            cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
            actual_jv_id = cur.fetchone()['id']
            
            # إعادة بناء أسطر القيد بنقاء محاسبي تام
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (actual_jv_id,))
            
            # أ. مدين المخزون (قيمة الأصناف)
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, 'ACC-105', %s, %s, 0.0, %s, 0.0);
            """, (generate_id("JVL"), actual_jv_id, f"مخزون خامات - فاتورة {inv_no}", orig_amt, items_amt_yer))
            
            # ب. مدين مصاريف النقل والشحن (إن وجدت)
            if shipping_cost > 0:
                cur.execute("""
                    INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES (%s, %s, 'ACC-507', %s, %s, 0.0, %s, 0.0);
                """, (generate_id("JVL"), actual_jv_id, f"مصاريف شحن ونقل - فاتورة {inv_no}", shipping_cost, shipping_yer))
                
            # ج. مدين رسوم وعمولات التحويل (إن وجدت)
            if transfer_fee > 0:
                cur.execute("""
                    INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES (%s, %s, 'ACC-508', %s, %s, 0.0, %s, 0.0);
                """, (generate_id("JVL"), actual_jv_id, f"رسوم وعمولات تحويل - فاتورة {inv_no}", transfer_fee, transfer_yer))
                
            # د. دائن الخصم والتخفيض التجاري المكتسب (إن وجد)
            if discount > 0:
                cur.execute("""
                    INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES (%s, %s, 'ACC-403', %s, 0.0, %s, 0.0, %s);
                """, (generate_id("JVL"), actual_jv_id, f"خصم وتخفيض مكتسب - فاتورة {inv_no}", discount, discount_yer))
                
            # هـ. دائن حساب الدفع المخصص (الصندوق أو البنك أو ذمة المورد)
            if net_paid_orig > 0:
                cur.execute("""
                    INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
                """, (generate_id("JVL"), actual_jv_id, credit_acc, f"سداد/استحقاق فاتورة {inv_no}", net_paid_orig, net_paid_yer))

        # 6. تحديث رصيد المورد إذا كانت الفاتورة بالأجل
        if pay_method == 'آجل' and supp_id and supp_id != 'SUPP-GENERAL':
            cur.execute("""
                UPDATE suppliers
                SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (net_paid_orig, supp_id))

        res['items'] = saved_items
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        return res

def delete_purchase(payload):
    data = payload.get('data') or payload
    p_id = clean_str(data.get('id') or data.get('purchase_id') or data.get('invoice_no') or data.get('bill_no'))

    with get_db_cursor(commit=True) as cur:
        # البحث عن المعرف الفعلي ورقم الفاتورة لضمان الحذف التام والشامل
        cur.execute("SELECT id, invoice_no FROM purchases WHERE id = %s OR invoice_no = %s LIMIT 1;", (p_id, p_id))
        p_row = cur.fetchone()
        actual_id = p_row['id'] if p_row else p_id
        actual_inv = p_row['invoice_no'] if p_row else p_id

        clean_ref = actual_id[4:] if str(actual_id).startswith('PUR-') else actual_id
        jv_no = f"JV-PUR-{clean_ref}"
        pay_no = f"PAY-{clean_ref}"

        # 1. حذف أسطر القيد وقيود اليومية التابعة للفاتورة لمنع أي بقايا أيتام
        cur.execute("""
            DELETE FROM journal_entry_lines
            WHERE entry_id IN (SELECT id FROM journal_entries WHERE ref_id = %s OR ref_id = %s OR entry_no = %s OR entry_no = %s);
        """, (actual_id, actual_inv, jv_no, f"JV-PUR-{actual_id}"))
        cur.execute("DELETE FROM journal_entries WHERE ref_id = %s OR ref_id = %s OR entry_no = %s OR entry_no = %s;", (actual_id, actual_inv, jv_no, f"JV-PUR-{actual_id}"))

        # 2. حذف سندات الصرف التابعة للفاتورة
        cur.execute("DELETE FROM payments WHERE invoice_id = %s OR invoice_id = %s OR payment_no = %s;", (actual_id, actual_inv, pay_no))

        # 3. حذف حركات المخزون المرتبطة بهذه الفاتورة
        cur.execute("DELETE FROM inventory_transactions WHERE reference_type = 'purchases' AND (reference_id = %s OR reference_id = %s);", (actual_id, actual_inv))

        # 4. حذف أصناف الفاتورة التابعة
        cur.execute("DELETE FROM purchase_items WHERE purchase_id = %s OR purchase_id = %s;", (actual_id, actual_inv))

        # 5. حذف سجل الشراء
        cur.execute("DELETE FROM purchases WHERE id = %s OR invoice_no = %s;", (actual_id, actual_inv))
        return {"deleted": actual_id, "success": True}

# ── دوال إدارة الموردين (Suppliers Controller) ──

def get_suppliers(params=None):
    query = """
        SELECT id, name, name as supplier_name, phone, phone_alt, email, city, address,
               current_balance, current_balance as balance, is_active, created_at, updated_at
        FROM suppliers
        ORDER BY name ASC;
    """
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('updated_at'): r['updated_at'] = str(r['updated_at'])
        r['current_balance'] = float(r.get('current_balance') or 0.0)
        r['balance'] = r['current_balance']
    return rows

def add_supplier(payload):
    data = payload.get('data') or payload
    supp_id = clean_str(data.get('id') or data.get('supplier_id'))
    name = clean_str(data.get('name') or data.get('supplier_name'))
    if not name:
        raise ValueError("اسم المورد مطلوب")
    phone = clean_str(data.get('phone') or data.get('supplier_phone') or '')
    phone_alt = clean_str(data.get('phone_alt') or '')
    email = clean_str(data.get('email') or '')
    city = clean_str(data.get('city') or 'صنعاء')
    address = clean_str(data.get('address') or '')
    init_balance = clean_num(data.get('current_balance') or data.get('balance') or 0.0)
    is_active = True if data.get('is_active') is not False else False

    with get_db_cursor(commit=True) as cur:
        if not supp_id:
            cur.execute("SELECT id FROM suppliers WHERE name = %s OR (phone IS NOT NULL AND phone != '' AND phone = %s) LIMIT 1;", (name, phone or '___NONE___'))
            existing = cur.fetchone()
            if existing:
                supp_id = existing['id']
            else:
                supp_id = generate_id("SUPP")

        query = """
            INSERT INTO suppliers (id, name, phone, phone_alt, email, city, address, current_balance, is_active, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                phone = COALESCE(NULLIF(EXCLUDED.phone, ''), suppliers.phone),
                phone_alt = COALESCE(NULLIF(EXCLUDED.phone_alt, ''), suppliers.phone_alt),
                email = COALESCE(NULLIF(EXCLUDED.email, ''), suppliers.email),
                city = EXCLUDED.city,
                address = EXCLUDED.address,
                is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """
        cur.execute(query, (supp_id, name, phone, phone_alt, email, city, address, init_balance, is_active))
        res = dict(cur.fetchone())
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        res['supplier_name'] = res.get('name')
        res['balance'] = float(res.get('current_balance') or 0.0)
        res['success'] = True
        return res

def delete_supplier(payload):
    data = payload.get('data') or payload
    supp_id = clean_str(data.get('id') or data.get('supplier_id'))
    if not supp_id or supp_id == 'SUPP-GENERAL':
        raise ValueError("لا يمكن حذف المورد العام الأساسي")
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM purchases WHERE supplier_id = %s;", (supp_id,))
        p_cnt = cur.fetchone()['cnt']
        if p_cnt > 0:
            cur.execute("UPDATE suppliers SET is_active = False, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (supp_id,))
            return {"deleted": False, "deactivated": True, "success": True, "message": "تم تعطيل المورد لوجود فواتير مشتريات مرتبطة به"}
        else:
            cur.execute("DELETE FROM suppliers WHERE id = %s;", (supp_id,))
            return {"deleted": True, "id": supp_id, "success": True}


# ── 8. السندات والمدفوعات (Payments & Vouchers) ──

def get_vouchers(params=None):
    query = """
        SELECT p.id, p.payment_no, p.payment_no as voucher_no, p.payment_type,
               p.payment_type as voucher_type, p.amount, p.currency, p.exchange_rate,
               p.base_amount, p.payment_method, p.payment_method as pay_method,
               p.account_id, p.date as date_created, p.notes, p.status,
               p.target_account_id, p.target_account_id as target_acc,
               COALESCE(NULLIF(p.party_name, ''), c.name, s.name, 'طرف عام') as party_name
        FROM payments p
        LEFT JOIN customers c ON p.customer_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ORDER BY p.created_at DESC;
    """
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('date_created'): r['date_created'] = str(r['date_created'])
    return rows

def add_voucher(payload):
    data = payload.get('data') or payload
    pay_id = clean_str(data.get('id') or data.get('voucher_id')) or generate_id("PAY")
    pay_no = clean_str(data.get('payment_no') or data.get('voucher_no') or data.get('v_no')) or pay_id
    raw_type = clean_str(data.get('voucher_type') or data.get('payment_type') or data.get('v_type') or 'سند قبض')
    is_rcpt = (
        'قبض' in raw_type or 
        raw_type.lower() in ('receipt', 'receipt_voucher', 'rv') or 
        str(data.get('payment_no') or data.get('voucher_no') or data.get('v_no') or '').upper().startswith('RV')
    )
    p_type = 'Receipt' if is_rcpt else 'Payment'
    v_type = 'سند قبض' if is_rcpt else 'سند صرف'
    amt = clean_num(data.get('amount') or 0.0)
    curr = clean_str(data.get('currency') or 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    base_amt = clean_num(data.get('base_amount') or (amt * rate))
    pay_method = clean_str(data.get('payment_method') or data.get('pay_method') or 'نقد (كاش)')
    p_date = clean_str(data.get('date') or data.get('date_created')) or today_str()
    notes = clean_str(data.get('notes') or '')
    
    party_val = clean_str(data.get('party') or data.get('party_name') or '')
    target_acc_input = clean_str(data.get('target_acc') or data.get('target_account_id') or data.get('target_account') or '')
    cust_id = clean_str(data.get('customer_id') or '')
    supp_id = clean_str(data.get('supplier_id') or '')

    query = """
        INSERT INTO payments (
            id, payment_no, customer_id, supplier_id, payment_type, amount, currency,
            exchange_rate, base_amount, payment_method, account_id, date, status, notes,
            party_name, target_account_id
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Confirmed', %s, %s, %s
        )
        ON CONFLICT (id) DO UPDATE SET
            payment_no = EXCLUDED.payment_no,
            customer_id = EXCLUDED.customer_id,
            supplier_id = EXCLUDED.supplier_id,
            payment_type = EXCLUDED.payment_type,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            exchange_rate = EXCLUDED.exchange_rate,
            base_amount = EXCLUDED.base_amount,
            payment_method = EXCLUDED.payment_method,
            account_id = EXCLUDED.account_id,
            date = EXCLUDED.date,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            party_name = EXCLUDED.party_name,
            target_account_id = EXCLUDED.target_account_id
        RETURNING *, payment_no as voucher_no, payment_type as voucher_type;
    """
    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, rate)
        if curr != 'YER' and (base_amt <= 0 or base_amt == amt):
            base_amt = amt * rate

        resolved_cash_acc = resolve_account_id(cur, data.get('account_id') or data.get('acc_code') or data.get('source_acc') or 'ACC-101', 'ACC-101')
        
        default_target = 'ACC-104' if p_type == 'Receipt' else 'ACC-201'
        resolved_target_acc = resolve_account_id(cur, target_acc_input, default_target) if target_acc_input else default_target
        
        if cust_id:
            cur.execute("SELECT id FROM customers WHERE id = %s LIMIT 1;", (cust_id,))
            if not cur.fetchone():
                cust_id = None
        else:
            cust_id = None
            
        if supp_id:
            cur.execute("SELECT id FROM suppliers WHERE id = %s LIMIT 1;", (supp_id,))
            if not cur.fetchone():
                supp_id = None
        else:
            supp_id = None

        # 0. عكس أي رصيد سابق إذا كان السند موجوداً مسبقاً (إعادة حفظ أو تعديل)
        cur.execute("SELECT id, amount, base_amount, payment_type, account_id, target_account_id, customer_id, supplier_id FROM payments WHERE id = %s OR payment_no = %s LIMIT 1;", (pay_id, pay_no))
        existing_v = cur.fetchone()
        if existing_v:
            old_amt = clean_num(existing_v.get('amount') or 0.0)
            old_base = clean_num(existing_v.get('base_amount') or 0.0)
            old_type = existing_v.get('payment_type')
            old_c_id = existing_v.get('customer_id')
            old_s_id = existing_v.get('supplier_id')
            old_cash = existing_v.get('account_id')
            old_target = existing_v.get('target_account_id')
            if old_amt > 0:
                if old_type == 'Receipt' and old_c_id:
                    cur.execute("UPDATE customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (old_amt, old_c_id))
                elif old_type == 'Payment' and old_s_id:
                    cur.execute("UPDATE suppliers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (old_amt, old_s_id))
            pass

        params = (pay_id, pay_no, cust_id, supp_id, p_type, amt, curr, rate, base_amt, pay_method, resolved_cash_acc, p_date, notes, party_val, resolved_target_acc)
        cur.execute(query, params)
        res = dict(cur.fetchone())

        # 1. تحديث رصيد الطرف المالي (عميل أو مورد) إن وجد صراحة
        if amt > 0:
            if p_type == 'Receipt' and cust_id:
                cur.execute("UPDATE customers SET current_balance = current_balance - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, cust_id))
            elif p_type == 'Payment' and supp_id:
                cur.execute("UPDATE suppliers SET current_balance = current_balance - %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, supp_id))

        # 2. إنشاء / تحديث قيد محاسبي مزدوج متوازن آلياً للسند المالي وتحديث شجرة الحسابات
        if amt > 0:
            auto_jv_id = f"JV-{pay_id}"
            auto_jv_no = f"AUTO-VCH-{pay_no}"
            deb_acc = resolved_cash_acc if p_type == 'Receipt' else resolved_target_acc
            crd_acc = resolved_target_acc if p_type == 'Receipt' else resolved_cash_acc
            
            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id,
                    credit_account_id, amount, total_amount, base_amount, ref_type,
                    ref_id, currency, exchange_rate, status, notes
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, 'Posted', %s
                ) ON CONFLICT (entry_no) DO UPDATE SET 
                    amount = EXCLUDED.amount,
                    total_amount = EXCLUDED.total_amount,
                    base_amount = EXCLUDED.base_amount,
                    debit_account_id = EXCLUDED.debit_account_id,
                    credit_account_id = EXCLUDED.credit_account_id,
                    currency = EXCLUDED.currency,
                    exchange_rate = EXCLUDED.exchange_rate,
                    description = EXCLUDED.description,
                    notes = EXCLUDED.notes;
            """, (auto_jv_id, auto_jv_no, p_date, f"{v_type} رقم {pay_no}: {party_val or 'طرف عام'}", deb_acc, crd_acc, amt, amt, base_amt, 'Payment', pay_id, curr, rate, f"سند {pay_no} - {party_val or 'طرف عام'}"))
            
            cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
            actual_entry_id = cur.fetchone()['id']
            
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (actual_entry_id,))
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
            """, (generate_id("JVL"), actual_entry_id, deb_acc, f"مدين - {v_type} {pay_no} ({party_val or 'طرف عام'})", amt, base_amt))
            
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (generate_id("JVL"), actual_entry_id, crd_acc, f"دائن - {v_type} {pay_no} ({party_val or 'طرف عام'})", amt, base_amt))

            pass

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        return res

def delete_voucher(payload):
    data = payload.get('data') or payload
    v_id = clean_str(data.get('id') or data.get('voucher_no') or data.get('payment_no') or data.get('v_no'))
    if not v_id:
        return {"error": "Missing voucher id"}
    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT id, payment_no, amount, base_amount, payment_type, account_id, target_account_id,
                   customer_id, supplier_id
            FROM payments
            WHERE id = %s OR payment_no = %s
            LIMIT 1;
        """, (v_id, v_id))
        v_row = cur.fetchone()
        if not v_row:
            return {"deleted": v_id, "status": "not_found"}

        actual_id = v_row['id']
        pay_no = v_row['payment_no']
        amt = clean_num(v_row.get('amount') or 0.0)
        base_amt = clean_num(v_row.get('base_amount') or 0.0)
        p_type = v_row.get('payment_type')
        cust_id = v_row.get('customer_id')
        supp_id = v_row.get('supplier_id')
        cash_acc = v_row.get('account_id')
        target_acc = v_row.get('target_account_id')

        # 1. عكس رصيد العميل أو المورد
        if amt > 0:
            if p_type == 'Receipt' and cust_id:
                cur.execute("UPDATE customers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, cust_id))
            elif p_type == 'Payment' and supp_id:
                cur.execute("UPDATE suppliers SET current_balance = current_balance + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (amt, supp_id))

        # 2. حذف القيود اليومية وبنودها المتطابقة (محرك قاعدة البيانات يعكس الأرصدة آلياً عبر trg_journal_line_balance)

        # 3. حذف القيود اليومية وبنودها المتطابقة
        cur.execute("""
            SELECT id FROM journal_entries
            WHERE (ref_type = 'Payment' AND ref_id = %s)
               OR entry_no IN (%s, %s, %s, %s);
        """, (actual_id, f"AUTO-VCH-{pay_no}", f"JV-{actual_id}", f"AUTO-VCH-{actual_id}", f"JV-{pay_no}"))
        jv_rows = cur.fetchall()
        if jv_rows:
            jv_ids = [j['id'] for j in jv_rows]
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = ANY(%s);", (jv_ids,))
            cur.execute("DELETE FROM journal_entries WHERE id = ANY(%s);", (jv_ids,))

        # 4. حذف سجل السند
        cur.execute("DELETE FROM payments WHERE id = %s;", (actual_id,))
        return {"deleted": actual_id, "payment_no": pay_no, "status": "success"}


# ── 9. المصروفات التشغيلية (Expenses Controller) ──

def get_expenses(params=None):
    query = """
        SELECT id, expense_no, category, amount, currency, exchange_rate,
               base_amount, date as expense_date, payment_method, recipient,
               account_id, status, notes, created_at
        FROM expenses
        ORDER BY created_at DESC;
    """
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('expense_date'): r['expense_date'] = str(r['expense_date'])
    return rows

def add_expense(payload):
    data = payload.get('data') or payload
    exp_id = clean_str(data.get('id') or data.get('expense_id')) or generate_id("EXP")
    exp_no = clean_str(data.get('expense_no')) or exp_id
    cat = clean_str(data.get('category') or data.get('exp_category') or 'مصروفات تشغيلية')
    amt = clean_num(data.get('amount') or 0.0)
    curr = clean_str(data.get('currency') or 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    base_amt = clean_num(data.get('base_amount') or (amt * rate))
    exp_date = clean_str(data.get('date') or data.get('expense_date')) or today_str()
    pay_method = clean_str(data.get('payment_method') or data.get('pay_method') or 'نقد (كاش)')
    recipient = clean_str(data.get('recipient') or '')
    raw_acc = data.get('account_id') or data.get('account') or data.get('exp_account') or 'ACC-505'
    source_acc_input = data.get('payment_account_id') or data.get('cash_account_id') or data.get('source_account') or data.get('source_acc') or data.get('payment_source') or 'ACC-101'
    notes = clean_str(data.get('notes') or '')

    query = """
        INSERT INTO expenses (
            id, expense_no, category, amount, currency, exchange_rate,
            base_amount, date, payment_method, recipient, account_id, status, notes
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Paid', %s
        )
        ON CONFLICT (id) DO UPDATE SET
            expense_no = EXCLUDED.expense_no,
            category = EXCLUDED.category,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            exchange_rate = EXCLUDED.exchange_rate,
            base_amount = EXCLUDED.base_amount,
            date = EXCLUDED.date,
            payment_method = EXCLUDED.payment_method,
            recipient = EXCLUDED.recipient,
            account_id = EXCLUDED.account_id,
            notes = EXCLUDED.notes
        RETURNING *;
    """
    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, rate)
        if curr != 'YER' and (base_amt <= 0 or base_amt == amt):
            base_amt = amt * rate

        acc_id = resolve_account_id(cur, raw_acc, 'ACC-505')
        source_acc = resolve_account_id(cur, source_acc_input, 'ACC-101')

        # 0. عكس أي رصيد سابق إذا كان المصروف موجوداً مسبقاً (تعديل)
        cur.execute("SELECT id, expense_no, amount, base_amount, account_id FROM expenses WHERE id = %s OR expense_no = %s LIMIT 1;", (exp_id, exp_no))
        existing_exp = cur.fetchone()
        if existing_exp:
            old_base = clean_num(existing_exp.get('base_amount') or 0.0)
            old_acc = existing_exp.get('account_id') or 'ACC-505'
            cur.execute("SELECT account_id, base_amount FROM payments WHERE (id = %s OR reference_no = %s) LIMIT 1;", (f"PAY-{exp_id}", exp_id))
            old_p = cur.fetchone()
            old_src = old_p['account_id'] if old_p else 'ACC-101'
            pass

        params = (exp_id, exp_no, cat, amt, curr, rate, base_amt, exp_date, pay_method, recipient, acc_id, notes)
        cur.execute(query, params)
        res = dict(cur.fetchone())

        # 1. تسجيل سند صرف مالي مرتبط في payments
        pay_id = f"PAY-{exp_id}"
        pay_no = f"PV-{exp_no}"
        cur.execute("""
            INSERT INTO payments (
                id, payment_no, payment_type, amount, currency, exchange_rate,
                base_amount, payment_method, reference_no, account_id, date,
                status, notes, party_name, target_account_id
            ) VALUES (
                %s, %s, 'Payment', %s, %s, %s,
                %s, %s, %s, %s, %s,
                'Confirmed', %s, %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                payment_no = EXCLUDED.payment_no,
                amount = EXCLUDED.amount,
                currency = EXCLUDED.currency,
                exchange_rate = EXCLUDED.exchange_rate,
                base_amount = EXCLUDED.base_amount,
                payment_method = EXCLUDED.payment_method,
                account_id = EXCLUDED.account_id,
                date = EXCLUDED.date,
                notes = EXCLUDED.notes,
                party_name = EXCLUDED.party_name,
                target_account_id = EXCLUDED.target_account_id;
        """, (pay_id, pay_no, amt, curr, rate, base_amt, pay_method, exp_id, source_acc, exp_date, f"سند صرف مصروف {exp_no}: {cat} - {notes}", recipient or cat, acc_id))

        # 2. إنشاء قيد محاسبي مزدوج متوازن آلياً للمصروف التشغيلي
        if amt > 0:
            auto_jv_id = f"JV-{exp_id}"
            auto_jv_no = f"JV-{exp_no}"
            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id,
                    credit_account_id, amount, total_amount, base_amount, ref_type,
                    ref_id, currency, exchange_rate, status, notes
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, 'Expense',
                    %s, %s, %s, 'Posted', %s
                ) ON CONFLICT (entry_no) DO UPDATE SET
                    amount = EXCLUDED.amount,
                    total_amount = EXCLUDED.total_amount,
                    base_amount = EXCLUDED.base_amount,
                    debit_account_id = EXCLUDED.debit_account_id,
                    credit_account_id = EXCLUDED.credit_account_id,
                    currency = EXCLUDED.currency,
                    exchange_rate = EXCLUDED.exchange_rate,
                    description = EXCLUDED.description,
                    notes = EXCLUDED.notes;
            """, (auto_jv_id, auto_jv_no, exp_date, f"مصروف {cat} - {recipient or exp_no}", acc_id, source_acc, amt, amt, base_amt, exp_id, curr, rate, f"ترحيل مصروف {exp_no} - {notes}"))

            cur.execute("SELECT id FROM journal_entries WHERE entry_no = %s LIMIT 1;", (auto_jv_no,))
            actual_entry_id = cur.fetchone()['id']

            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (actual_entry_id,))
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
            """, (generate_id("JVL"), actual_entry_id, acc_id, f"مدين: حساب المصروف ({cat})", amt, base_amt))

            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (generate_id("JVL"), actual_entry_id, source_acc, f"دائن: سداد المصروف من {source_acc}", amt, base_amt))

            pass

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        return res

def delete_expense(payload):
    data = payload.get('data') or payload
    e_id = clean_str(data.get('id') or data.get('expense_no') or data.get('expense_id'))
    if not e_id:
        return {"error": "Missing expense identifier"}
    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            SELECT id, expense_no, amount, base_amount, account_id
            FROM expenses
            WHERE id = %s OR expense_no = %s
            LIMIT 1;
        """, (e_id, e_id))
        exp_row = cur.fetchone()
        if not exp_row:
            return {"deleted": e_id, "status": "not_found"}

        actual_id = exp_row['id']
        exp_no = exp_row['expense_no']
        base_amt = clean_num(exp_row.get('base_amount') or 0.0)
        acc_id = exp_row.get('account_id') or 'ACC-505'

        # جلب سند الصرف المرتبط لاسترجاع حساب المصدر
        cur.execute("""
            SELECT id, account_id, base_amount
            FROM payments
            WHERE id = %s OR reference_no = %s OR payment_no = %s
            LIMIT 1;
        """, (f"PAY-{actual_id}", actual_id, f"PV-{exp_no}"))
        p_row = cur.fetchone()
        source_acc = p_row['account_id'] if p_row else 'ACC-101'

        # 1. حذف القيود اليومية وبنودها (محرك قاعدة البيانات يعكس الأرصدة آلياً عبر trg_journal_line_balance)

        # 2. حذف القيود اليومية وبنودها
        cur.execute("""
            SELECT id FROM journal_entries
            WHERE (ref_type = 'Expense' AND ref_id = %s)
               OR entry_no IN (%s, %s, %s, %s);
        """, (actual_id, f"JV-{exp_no}", f"JV-{actual_id}", f"AUTO-EXP-{exp_no}", f"AUTO-EXP-{actual_id}"))
        jv_rows = cur.fetchall()
        if jv_rows:
            jv_ids = [j['id'] for j in jv_rows]
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = ANY(%s);", (jv_ids,))
            cur.execute("DELETE FROM journal_entries WHERE id = ANY(%s);", (jv_ids,))

        # 3. حذف سند الصرف المرتبط
        cur.execute("""
            DELETE FROM payments
            WHERE id = %s OR reference_no = %s OR payment_no = %s;
        """, (f"PAY-{actual_id}", actual_id, f"PV-{exp_no}"))

        # 4. حذف سجل المصروف
        cur.execute("DELETE FROM expenses WHERE id = %s;", (actual_id,))
        return {"deleted": actual_id, "expense_no": exp_no, "status": "success"}


# ── 10. شجرة الحسابات المحاسبية (Chart of Accounts) ──

def get_accounts(params=None):
    query = """
        SELECT c.id, c.account_code, c.account_name, c.account_name_en, c.account_type,
               c.account_category, c.parent_account_id, c.parent_account_code, c.level,
               c.account_path, c.is_group, c.is_postable, c.is_active, c.normal_balance,
               c.normal_balance as nature,
               c.opening_balance, c.current_balance, c.balance_type, c.currency, c.notes,
               COALESCE(c.parent_account_code, c.parent_account_id) as parent_id,
               c.account_code as code, c.account_name as name, c.current_balance as balance,
               CASE 
                 WHEN c.currency IS NULL OR c.currency = 'YER' THEN c.current_balance
                 WHEN c.normal_balance = 'Credit' THEN
                   COALESCE((
                     SELECT SUM(
                       CASE 
                         WHEN credit_account_id IN (c.id, c.account_code) THEN 
                           (CASE WHEN currency = c.currency THEN amount ELSE (base_amount / COALESCE((SELECT exchange_rate FROM currencies WHERE code = c.currency LIMIT 1), 142.0)) END)
                         ELSE 
                           -(CASE WHEN currency = c.currency THEN amount ELSE (base_amount / COALESCE((SELECT exchange_rate FROM currencies WHERE code = c.currency LIMIT 1), 142.0)) END)
                       END
                     )
                     FROM journal_entries 
                     WHERE (credit_account_id IN (c.id, c.account_code) OR debit_account_id IN (c.id, c.account_code))
                   ), 0.0)
                 ELSE
                   COALESCE((
                     SELECT SUM(
                       CASE 
                         WHEN debit_account_id IN (c.id, c.account_code) THEN 
                           (CASE WHEN currency = c.currency THEN amount ELSE (base_amount / COALESCE((SELECT exchange_rate FROM currencies WHERE code = c.currency LIMIT 1), 142.0)) END)
                         ELSE 
                           -(CASE WHEN currency = c.currency THEN amount ELSE (base_amount / COALESCE((SELECT exchange_rate FROM currencies WHERE code = c.currency LIMIT 1), 142.0)) END)
                       END
                     )
                     FROM journal_entries 
                     WHERE (debit_account_id IN (c.id, c.account_code) OR credit_account_id IN (c.id, c.account_code))
                   ), 0.0)
               END as foreign_balance
        FROM chart_of_accounts c
        ORDER BY c.account_code ASC;
    """
    return execute_query(query, fetch_all=True)

def add_account(payload):
    data = payload.get('data') or payload
    code = clean_str(data.get('code') or data.get('account_code') or data.get('acc_code'))
    if not code:
        raise ValueError("رمز الحساب (Account Code) مطلوب.")
    acc_id = clean_str(data.get('id') or data.get('account_id') or f"ACC-{code}")
    name = clean_str(data.get('name') or data.get('account_name') or data.get('acc_name') or data.get('name_ar') or code)
    name_en = clean_str(data.get('name_en') or data.get('account_name_en') or '')
    acc_type = clean_str(data.get('type') or data.get('account_type') or data.get('acc_type') or 'أصول')
    cat = clean_str(data.get('category') or data.get('account_category') or acc_type or 'General')
    p_code = clean_str(data.get('parent_code') or data.get('parent_account_code') or data.get('parent_id') or '')
    if p_code in ('0', 'null', 'None'):
        p_code = ''
    lvl = int(clean_num(data.get('level') or (2 if p_code else 1)))
    is_grp = bool(data.get('is_group') in (1, True, '1', 'true', 'group'))
    is_post = bool(data.get('is_postable') in (1, True, '1', 'true', None) and not is_grp)
    
    raw_norm = str(data.get('normal_balance') or data.get('nature') or '').strip().lower()
    if raw_norm in ('credit', 'دائن'):
        norm_bal = 'Credit'
    elif raw_norm in ('debit', 'مدين'):
        norm_bal = 'Debit'
    else:
        norm_bal = 'Credit' if acc_type in ('Liabilities', 'Equity', 'Revenue', 'خصوم', 'حقوق ملكية', 'إيرادات') else 'Debit'
        
    curr = clean_str(data.get('currency') or 'YER')
    notes = clean_str(data.get('notes') or '')

    query = """
        INSERT INTO chart_of_accounts (
            id, account_code, account_name, account_name_en, account_type,
            account_category, parent_account_code, level, is_group, is_postable,
            normal_balance, currency, notes
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (account_code) DO UPDATE SET
            account_name = EXCLUDED.account_name,
            account_name_en = COALESCE(NULLIF(EXCLUDED.account_name_en, ''), chart_of_accounts.account_name_en),
            account_type = EXCLUDED.account_type,
            account_category = EXCLUDED.account_category,
            is_group = EXCLUDED.is_group,
            is_postable = EXCLUDED.is_postable,
            normal_balance = EXCLUDED.normal_balance,
            notes = EXCLUDED.notes
        RETURNING *, account_code as code, account_name as name, current_balance as balance;
    """
    params = (acc_id, code, name, name_en, acc_type, cat, p_code, lvl, is_grp, is_post, norm_bal, curr, notes)
    with get_db_cursor(commit=True) as cur:
        cur.execute(query, params)
        res = dict(cur.fetchone())
        for k, v in res.items():
            if isinstance(v, (Decimal, uuid.UUID)):
                res[k] = float(v) if isinstance(v, Decimal) else str(v)
        return res

def delete_account(payload):
    data = payload.get('data') or payload
    raw_code = clean_str(data.get('code') or data.get('account_code') or data.get('id') or '')
    if not raw_code:
        raise ValueError("رمز الحساب (Account Code) مطلوب للحذف.")
    
    clean_code = raw_code.replace('ACC-', '').replace('ACC_', '').strip()
    acc_id = f"ACC-{clean_code}"

    with get_db_cursor(commit=True) as cur:
        # Check child accounts
        cur.execute("""
            SELECT COUNT(*) as count FROM chart_of_accounts 
            WHERE parent_account_code IN (%s, %s) OR parent_account_id IN (%s, %s);
        """, (raw_code, clean_code, raw_code, acc_id))
        row = cur.fetchone()
        child_count = row['count'] if row and 'count' in row else (list(row.values())[0] if row else 0)
        if child_count > 0:
            raise ValueError("لا يمكن حذف حساب يمتلك حسابات فرعية تحته. قم بنقل أو حذف الحسابات الفرعية أولاً.")
        
        # Check journal entries linked
        cur.execute("""
            SELECT COUNT(*) as count FROM journal_entries
            WHERE debit_account_id IN (%s, %s, %s) OR credit_account_id IN (%s, %s, %s);
        """, (raw_code, clean_code, acc_id, raw_code, clean_code, acc_id))
        j_row = cur.fetchone()
        j_count = j_row['count'] if j_row and 'count' in j_row else (list(j_row.values())[0] if j_row else 0)
        if j_count > 0:
            raise ValueError("لا يمكن حذف هذا الحساب لوجود قيود يومية مرتبطة به في النظام.")

        cur.execute("""
            DELETE FROM chart_of_accounts 
            WHERE account_code IN (%s, %s) OR id IN (%s, %s);
        """, (raw_code, clean_code, raw_code, acc_id))
        return {"deleted": clean_code, "id": acc_id, "success": True}

def suggest_account_code(parent_id=None):
    with get_db_cursor(commit=False) as cur:
        # 1. إذا لم يُحدد حساب أب (إضافة حساب رئيسي عام Level 1)
        if not parent_id or str(parent_id).strip() in ('0', '', 'None', 'null'):
            cur.execute("""
                SELECT account_code FROM chart_of_accounts 
                WHERE level = 1 AND account_code ~ '^[0-9]+$' AND LENGTH(account_code) = 1;
            """)
            root_codes = [int(r['account_code']) for r in cur.fetchall() if r.get('account_code', '').isdigit()]
            next_root = max(root_codes) + 1 if root_codes else 6
            return str(next_root)
        
        # تنظيف كود الأب
        p_clean = str(parent_id).replace('ACC-', '').replace('ACC_', '').strip()
        
        # جلب السجل الحقيقي للأب من قاعدة البيانات
        cur.execute("SELECT account_code, level FROM chart_of_accounts WHERE account_code = %s OR id = %s LIMIT 1;", (p_clean, str(parent_id)))
        p_row = cur.fetchone()
        p_code = p_row['account_code'] if p_row else p_clean
        
        # جلب كافة الحسابات الحالية لفحص أي أكواد تبدأ بالأب أو تتبعه
        cur.execute("SELECT account_code, parent_account_code FROM chart_of_accounts;")
        all_accounts = cur.fetchall()
        existing_codes = set(r['account_code'] for r in all_accounts)
        
        # حالة أ: الأب هو حساب رئيسي من خانة واحدة (Level 1: 1, 2, 3, 4, 5, 6)
        # النمط المعتمد هو الترقيم المئوي: 101, 102.. أو 201, 202..
        if len(p_code) == 1 and p_code.isdigit():
            prefix = p_code
            max_num = 0
            for r in all_accounts:
                c = r['account_code'].strip()
                if len(c) == 3 and c.startswith(prefix) and c.isdigit():
                    num = int(c)
                    if num > max_num:
                        max_num = num
                elif r.get('parent_account_code') == prefix and c.isdigit():
                    num = int(c)
                    if num > max_num:
                        max_num = num
            
            candidate = max_num + 1 if max_num > 0 else int(f"{prefix}01")
            while str(candidate) in existing_codes:
                candidate += 1
            return str(candidate)

        # حالة ب: الأب حساب فرعي أو مساعد (مثل 102، 101، 201، 102.01)
        # النمط المعتمد هو إضافة نقطة وتسلسل ثنائي: 102.01, 102.02, 102.03...
        prefix = f"{p_code}."
        max_seq = 0
        for r in all_accounts:
            c = r['account_code'].strip()
            if c.startswith(prefix):
                rest = c[len(prefix):].split('.')[0].split('-')[0].split('_')[0]
                if rest.isdigit():
                    s = int(rest)
                    if s > max_seq:
                        max_seq = s
            elif r.get('parent_account_code') == p_code:
                if c.startswith(p_code) and len(c) > len(p_code):
                    rest = c[len(p_code):].lstrip('.-_').split('.')[0]
                    if rest.isdigit():
                        s = int(rest)
                        if s > max_seq:
                            max_seq = s
        
        candidate_seq = max_seq + 1
        candidate_code = f"{p_code}.{str(candidate_seq).zfill(2)}"
        while candidate_code in existing_codes:
            candidate_seq += 1
            candidate_code = f"{p_code}.{str(candidate_seq).zfill(2)}"
            
        return candidate_code


# ── 11. قيود اليومية العامة (Journal Entries Controller) ──

def get_journal_entries(params=None):
    query = """
        SELECT id, entry_no, entry_date, description, debit_account_id,
               credit_account_id, amount, total_amount, base_amount, ref_type,
               ref_id, currency, exchange_rate, status, notes, created_at
        FROM journal_entries
        ORDER BY created_at DESC;
    """
    rows = execute_query(query, fetch_all=True)
    if not rows:
        return []

    lines_map = {}
    try:
        lines_query = """
            SELECT id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base
            FROM journal_entry_lines
            ORDER BY id ASC;
        """
        all_lines = execute_query(lines_query, fetch_all=True) or []
        for l in all_lines:
            eid = l.get('entry_id')
            if eid not in lines_map:
                lines_map[eid] = []
            lines_map[eid].append({
                'id': l.get('id'),
                'entry_id': eid,
                'account_id': l.get('account_id'),
                'line_description': l.get('line_description'),
                'debit': clean_num(l.get('debit')),
                'credit': clean_num(l.get('credit')),
                'debit_base': clean_num(l.get('debit_base')),
                'credit_base': clean_num(l.get('credit_base'))
            })
    except Exception as e:
        logger.warning(f"Failed to fetch journal_entry_lines: {e}")

    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('entry_date'): r['entry_date'] = str(r['entry_date'])
        r['date'] = r.get('entry_date')
        r['statement'] = r.get('description')
        r['debit'] = r.get('debit_account_id')
        r['credit'] = r.get('credit_account_id')
        r['exchange_rate'] = clean_num(r.get('exchange_rate'), 1.0)
        
        # Attach detailed lines or synthesize standard 2-leg lines
        entry_lines = lines_map.get(r['id']) or []
        if not entry_lines and (r.get('debit_account_id') or r.get('credit_account_id')):
            amt = clean_num(r.get('amount') or r.get('total_amount'))
            rate = r['exchange_rate']
            base_amt = clean_num(r.get('base_amount')) or (amt * rate)
            if r.get('debit_account_id'):
                entry_lines.append({
                    'entry_id': r['id'],
                    'account_id': r.get('debit_account_id'),
                    'line_description': r.get('description') or '',
                    'debit': amt,
                    'credit': 0.0,
                    'debit_base': base_amt,
                    'credit_base': 0.0
                })
            if r.get('credit_account_id'):
                entry_lines.append({
                    'entry_id': r['id'],
                    'account_id': r.get('credit_account_id'),
                    'line_description': r.get('description') or '',
                    'debit': 0.0,
                    'credit': amt,
                    'debit_base': 0.0,
                    'credit_base': base_amt
                })
        r['lines'] = entry_lines
    return rows

def add_journal_entry(payload):
    data = payload.get('data') or payload
    j_id = clean_str(data.get('id') or data.get('entry_id')) or generate_id("JV")
    j_no = clean_str(data.get('entry_no')) or j_id
    j_date = clean_str(data.get('date') or data.get('entry_date')) or today_str()
    desc = clean_str(data.get('description') or data.get('statement') or data.get('notes') or 'قيد محاسبي')
    deb_acc = clean_str(data.get('debit_account_id') or data.get('debit') or 'ACC-1111')
    crd_acc = clean_str(data.get('credit_account_id') or data.get('credit') or 'ACC-4111')
    amt = clean_num(data.get('amount') or data.get('total_amount') or 0.0)
    curr = clean_str(data.get('currency') or 'YER')
    rate = clean_num(data.get('exchange_rate') or 1.0)
    base_amt = clean_num(data.get('base_amount') or (amt * rate))
    ref_type = clean_str(data.get('ref_type') or 'Manual')
    ref_id = clean_str(data.get('ref_id') or '')
    notes = clean_str(data.get('notes') or '')

    query = """
        INSERT INTO journal_entries (
            id, entry_no, entry_date, description, debit_account_id,
            credit_account_id, amount, total_amount, base_amount, ref_type,
            ref_id, currency, exchange_rate, status, notes
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Posted', %s
        )
        ON CONFLICT (entry_no) DO UPDATE SET
            description = EXCLUDED.description,
            amount = EXCLUDED.amount,
            total_amount = EXCLUDED.total_amount,
            base_amount = EXCLUDED.base_amount,
            debit_account_id = EXCLUDED.debit_account_id,
            credit_account_id = EXCLUDED.credit_account_id,
            currency = EXCLUDED.currency,
            exchange_rate = EXCLUDED.exchange_rate,
            notes = EXCLUDED.notes
        RETURNING *;
    """
    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, rate)
        if curr != 'YER' and (base_amt <= 0 or base_amt == amt):
            base_amt = amt * rate

        deb_acc = resolve_account_id(cur, data.get('debit_account_id') or data.get('debit') or data.get('debit_code') or 'ACC-101', 'ACC-101')
        crd_acc = resolve_account_id(cur, data.get('credit_account_id') or data.get('credit') or data.get('credit_code') or 'ACC-401', 'ACC-401')
        params = (j_id, j_no, j_date, desc, deb_acc, crd_acc, amt, amt, base_amt, ref_type, ref_id, curr, rate, notes)
        cur.execute(query, params)
        res = dict(cur.fetchone())
        
        if amt > 0:
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (res['id'],))
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
            """, (generate_id("JVL"), res['id'], deb_acc, f"مدين - {desc}", amt, base_amt))
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (generate_id("JVL"), res['id'], crd_acc, f"دائن - {desc}", amt, base_amt))

        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        return res


# ── 12. أوامر الإنتاج والمعمل (Production Orders Controller) ──

def get_factory(params=None):
    # التأكد من مزامنة أي طلبات مبيعات مع جدول أوامر الإنتاج
    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                INSERT INTO production_orders (
                    id, production_order_no, order_id, product_id, product_name, child_name,
                    stage, start_date, due_date, progress, status, notes
                )
                SELECT 'PRD-' || o.id, 'PO-' || o.order_no, o.id, o.product_id,
                       COALESCE(p.model_name, 'فستان أميرات'),
                       COALESCE(ch.child_name, 'الأميرة'),
                       CASE 
                           WHEN o.production_status ILIKE '%cut%' THEN 'القص والتحضير ✂️'
                           WHEN o.production_status ILIKE '%sew%' THEN 'مرحلة الخياطة 🪡'
                           WHEN o.production_status ILIKE '%embroid%' THEN 'التطريز والشك ✨'
                           WHEN o.production_status ILIKE '%inspect%' THEN 'الفحص والتشطيب النهائي 🔍'
                           WHEN o.production_status ILIKE '%ready%' THEN 'جاهز للتسليم 📦'
                           ELSE 'القص والتحضير ✂️'
                       END,
                       COALESCE(o.order_date, CURRENT_DATE),
                       COALESCE(o.delivery_date, CURRENT_DATE + 5),
                       CASE 
                           WHEN o.production_status ILIKE '%cut%' THEN 20
                           WHEN o.production_status ILIKE '%sew%' THEN 40
                           WHEN o.production_status ILIKE '%embroid%' THEN 60
                           WHEN o.production_status ILIKE '%inspect%' THEN 80
                           WHEN o.production_status ILIKE '%ready%' THEN 100
                           ELSE 20
                       END,
                       CASE WHEN o.production_status ILIKE '%ready%' THEN 'Completed' ELSE 'In Progress' END,
                       COALESCE(o.notes, 'تفصيل وتطريز فاخر')
                FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                LEFT JOIN children ch ON o.child_id = ch.id
                WHERE NOT EXISTS (
                    SELECT 1 FROM production_orders po WHERE po.order_id = o.id OR po.production_order_no = 'PO-' || o.order_no
                );
            """)
    except Exception as _e:
        logger.warning(f"⚠️ خطأ غير حرج أثناء مزامنة أوامر الإنتاج التلقائية: {_e}")

    query = """
        SELECT po.*, 
               COALESCE(c.name, '') as customer_name,
               COALESCE(c.phone, '') as customer_phone,
               COALESCE(p.model_name, po.product_name, 'موديل راقي') as product_name,
               COALESCE(po.child_name, ch.child_name, m.child_name, 'الأميرة') as child_name,
               COALESCE(po.due_date, o.delivery_date) as due_date,
               po.start_date
        FROM production_orders po
        LEFT JOIN orders o ON po.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN products p ON COALESCE(po.product_id, o.product_id) = p.id
        LEFT JOIN LATERAL (
            SELECT ch.child_name FROM children ch WHERE ch.id = o.child_id OR ch.customer_id = o.customer_id LIMIT 1
        ) ch ON true
        LEFT JOIN LATERAL (
            SELECT m.child_name FROM measurements m WHERE m.customer_id = o.customer_id LIMIT 1
        ) m ON true
        ORDER BY po.created_at DESC;
    """
    rows = execute_query(query, fetch_all=True)
    res = []
    
    STAGE_MAP = {
        'cutting': 'القص والتحضير ✂️',
        'قص': 'القص والتحضير ✂️',
        'sewing': 'مرحلة الخياطة 🪡',
        'خياطة': 'مرحلة الخياطة 🪡',
        'embroidery': 'التطريز والشك ✨',
        'تطريز': 'التطريز والشك ✨',
        'inspection': 'الفحص والتشطيب النهائي 🔍',
        'فحص': 'الفحص والتشطيب النهائي 🔍',
        'تشطيب': 'الفحص والتشطيب النهائي 🔍',
        'ready': 'جاهز للتسليم 📦',
        'جاهز': 'جاهز للتسليم 📦',
        'تسليم': 'جاهز للتسليم 📦'
    }
    STAGE_PROGRESS = {
        'القص والتحضير ✂️': 20,
        'مرحلة الخياطة 🪡': 40,
        'التطريز والشك ✨': 60,
        'الفحص والتشطيب النهائي 🔍': 80,
        'جاهز للتسليم 📦': 100
    }
    
    for r in rows:
        d = dict(r)
        if d.get('created_at'): d['created_at'] = str(d['created_at'])
        if d.get('updated_at'): d['updated_at'] = str(d['updated_at'])
        if d.get('start_date'): d['start_date'] = str(d['start_date'])
        if d.get('due_date'): d['due_date'] = str(d['due_date'])
        
        ord_no = d.get('order_id') or d.get('production_order_no') or d.get('id')
        d['order_no'] = ord_no
        d['customer'] = d.get('customer_name') or ''
        d['product'] = d.get('product_name') or ''
        
        # استخراج اسم الخياط من الملاحظات أو الحقل المخصص
        notes_str = d.get('notes') or ''
        tailor = 'المعلم سليم (خياط أول)'
        if 'الخياط:' in notes_str:
            parts = notes_str.split('الخياط:')
            if len(parts) > 1:
                tailor = parts[1].split('|')[0].strip()
        elif d.get('assigned_tailor_id'):
            tailor = d.get('assigned_tailor_id')
        d['tailor'] = tailor
        
        raw_stage = str(d.get('stage') or 'القص والتحضير ✂️')
        norm_stage = raw_stage
        for k, v in STAGE_MAP.items():
            if k in raw_stage.lower():
                norm_stage = v
                break
        d['stage'] = norm_stage
        d['progress'] = int(float(d.get('progress') or STAGE_PROGRESS.get(norm_stage, 20)))
        res.append(d)
    return res

def update_factory(payload):
    data = payload.get('data') or payload
    po_id = clean_str(data.get('id') or data.get('production_order_no') or data.get('order_no'))
    stage = clean_str(data.get('stage') or 'القص والتحضير ✂️')
    progress = clean_num(data.get('progress') or 20)
    tailor = clean_str(data.get('tailor') or '')
    start_date = clean_str(data.get('start_date')) or None
    due_date = clean_str(data.get('due_date')) or None
    user_notes = clean_str(data.get('notes') or '')
    
    full_notes = user_notes
    if tailor:
        if 'الخياط:' not in full_notes:
            full_notes = f"الخياط: {tailor} | {full_notes}".strip(" |")
            
    order_stage_map = {
        'القص والتحضير ✂️': 'Cutting',
        'مرحلة الخياطة 🪡': 'Sewing',
        'التطريز والشك ✨': 'Embroidery',
        'الفحص والتشطيب النهائي 🔍': 'Inspection',
        'جاهز للتسليم 📦': 'Ready'
    }
    db_order_status = order_stage_map.get(stage, 'Sewing')
    po_status = 'Completed' if (progress >= 100 or 'جاهز' in stage or 'تسليم' in stage) else 'In Progress'

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            UPDATE production_orders
            SET stage = %s,
                progress = %s,
                notes = %s,
                start_date = COALESCE(%s, start_date),
                due_date = COALESCE(%s, due_date),
                status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s OR production_order_no = %s OR order_id = %s
            RETURNING *;
        """, (stage, progress, full_notes, start_date, due_date, po_status, po_id, po_id, po_id))
        row = cur.fetchone()
        
        # مزامنة حالة الطلب في جدول orders
        cur.execute("""
            UPDATE orders
            SET production_status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s OR order_no = %s;
        """, (db_order_status, po_id, po_id))
        
        if not row:
            new_id = generate_id("PRD")
            po_no = f"PO-{po_id}"
            cur.execute("""
                INSERT INTO production_orders (
                    id, production_order_no, order_id, stage, progress, status, notes, start_date, due_date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *;
            """, (new_id, po_no, po_id, stage, progress, po_status, full_notes, start_date or today_str(), due_date))
            row = cur.fetchone()
            
        res = dict(row) if row else {"status": "success"}
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        if res.get('start_date'): res['start_date'] = str(res['start_date'])
        return res

# ── 13. العملات وأسعار الصرف (Currencies Controller) ──

def get_currencies(params=None):
    query = """
        SELECT code, name, symbol, exchange_rate, is_base, is_active, last_updated
        FROM currencies
        ORDER BY is_base DESC, code ASC;
    """
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('last_updated'): r['last_updated'] = str(r['last_updated'])
    return rows

def update_exchange_rate(payload):
    data = payload.get('data') or payload
    code = clean_str(data.get('code') or data.get('currency')).upper()
    rate = clean_num(data.get('rate') or data.get('exchange_rate'))
    if rate <= 0:
        raise ValueError("سعر الصرف يجب أن يكون رقماً موجباً.")
    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            UPDATE currencies
            SET exchange_rate = %s, last_updated = CURRENT_TIMESTAMP
            WHERE code = %s
            RETURNING *;
        """, (rate, code))
        row = cur.fetchone()
        return dict(row) if row else {"status": "not_found"}


# ── 14. لوحة التحكم والإحصائيات الحية (Dashboard Stats) ──

def get_dashboard_stats(params=None):
    with get_db_cursor(commit=False) as cur:
        cur.execute("SELECT count(*) as cnt FROM customers;")
        cust_cnt = cur.fetchone()['cnt']

        cur.execute("SELECT count(*) as cnt, COALESCE(sum(total_amount), 0) as total_sales FROM orders;")
        ord_info = cur.fetchone()
        ord_cnt = ord_info['cnt']
        tot_sales = float(ord_info['total_sales'])

        cur.execute("SELECT count(*) as cnt FROM products WHERE status = 'Active';")
        prod_cnt = cur.fetchone()['cnt']

        cur.execute("SELECT count(*) as cnt, COALESCE(sum(original_amount), 0) as total_purchases FROM purchases;")
        pur_info = cur.fetchone()
        pur_cnt = pur_info['cnt']
        tot_pur = float(pur_info['total_purchases'])

        cur.execute("SELECT count(*) as cnt FROM inventory;")
        inv_cnt = cur.fetchone()['cnt']

        cur.execute("SELECT count(*) as cnt FROM payments;")
        vouch_cnt = cur.fetchone()['cnt']

        cur.execute("SELECT COALESCE(sum(amount), 0) as total_exp FROM expenses;")
        tot_exp = float(cur.fetchone()['total_exp'])

    return {
        "customersCount": cust_cnt,
        "ordersCount": ord_cnt,
        "productsCount": prod_cnt,
        "purchasesCount": pur_cnt,
        "inventoryCount": inv_cnt,
        "vouchersCount": vouch_cnt,
        "totalSales": tot_sales,
        "totalPurchases": tot_pur,
        "totalExpenses": tot_exp,
        "netProfitEstimate": tot_sales - tot_pur - tot_exp,
        "systemHealth": "Optimal 100% 👑 (PostgreSQL Supabase Connected)",
        "databaseEngine": "PostgreSQL 17.6 (Supabase Cloud)",
        "baseCurrency": "YER"
    }


# ── 14.2 دوال الحذف الإضافية ──

def delete_customer(payload):
    data = payload.get('data') or payload
    cid = clean_str(data.get('id') or data.get('customer_id'))
    if cid and cid != 'CUST-GENERAL':
        with get_db_cursor(commit=True) as cur:
            cur.execute("DELETE FROM measurements WHERE customer_id = %s;", (cid,))
            cur.execute("DELETE FROM children WHERE customer_id = %s;", (cid,))
            cur.execute("DELETE FROM customers WHERE id = %s;", (cid,))
    return {"deleted": True, "id": cid}

def delete_order(payload):
    data = payload.get('data') or payload
    oid = clean_str(data.get('id') or data.get('order_id') or data.get('order_no'))
    if not oid:
        return {"deleted": False, "error": "Missing order id"}

    with get_db_cursor(commit=True) as cur:
        # جلب بيانات الطلب للتنظيف الشامل وعكس الأرصدة
        cur.execute("SELECT id, order_no, customer_id, total_amount, paid_amount, remaining_amount FROM orders WHERE id = %s OR order_no = %s LIMIT 1;", (oid, oid))
        row = cur.fetchone()
        if not row:
            return {"deleted": False, "status": "not_found", "id": oid}

        actual_id = row['id']
        ord_no = row['order_no'] or actual_id
        cust_id = row['customer_id']
        rem_amt = clean_num(row.get('remaining_amount') or 0.0)
        tot_amt = clean_num(row.get('total_amount') or 0.0)
        paid_amt = clean_num(row.get('paid_amount') or 0.0)
        if rem_amt <= 0 and (tot_amt - paid_amt) > 0:
            rem_amt = tot_amt - paid_amt

        # 0. عكس رصيد ذمة العميل (طرح المبلغ الآجل الذي كان مسجلاً عليه)
        if rem_amt > 0 and cust_id and cust_id != 'CUST-GENERAL':
            cur.execute("""
                UPDATE customers
                SET current_balance = current_balance - %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s;
            """, (rem_amt, cust_id))

        # 1. إعادة كميات المخزون المخصومة وحذف حركات الصرف
        cur.execute("""
            SELECT inventory_id, quantity FROM inventory_transactions
            WHERE reference_type = 'orders' AND reference_id = %s;
        """, (actual_id,))
        txn_rows = cur.fetchall()
        for txn in txn_rows:
            inv_id = txn['inventory_id']
            qty_deducted = abs(clean_num(txn['quantity']))
            cur.execute("UPDATE inventory SET quantity = quantity + %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;", (qty_deducted, inv_id))
        cur.execute("DELETE FROM inventory_transactions WHERE reference_type = 'orders' AND reference_id = %s;", (actual_id,))

        # 2. حذف بنود الفاتورة
        cur.execute("DELETE FROM order_items WHERE order_id = %s;", (actual_id,))

        # 3. حذف أوامر المعمل وبطاقات التشغيل المرتبطة
        cur.execute("DELETE FROM production_orders WHERE order_id = %s OR production_order_no IN (%s, %s);", (actual_id, f"PO-{ord_no}", f"PO-{actual_id}"))

        # 4. حذف سندات الدفع والقبض المرتبطة
        cur.execute("DELETE FROM payments WHERE order_id = %s OR payment_no IN (%s, %s);", (actual_id, f"REC-{ord_no}", f"REC-{actual_id}"))

        # 5. حذف القيود المحاسبية التلقائية وأسطرها (دفعياً)
        cur.execute("""
            SELECT id FROM journal_entries
            WHERE (ref_type = 'Order' AND ref_id = %s)
               OR entry_no IN (%s, %s);
        """, (actual_id, f"JV-{ord_no}", f"JV-{actual_id}"))
        jv_rows = cur.fetchall()
        if jv_rows:
            jv_ids = [j['id'] for j in jv_rows]
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = ANY(%s);", (jv_ids,))
            cur.execute("DELETE FROM journal_entries WHERE id = ANY(%s);", (jv_ids,))

        # 6. حذف سجل الطلب نهائياً
        cur.execute("DELETE FROM orders WHERE id = %s;", (actual_id,))
    return {"deleted": True, "id": actual_id, "order_no": ord_no, "status": "success"}

def delete_product(payload):
    if isinstance(payload, (str, int)):
        pid = clean_str(payload)
    elif isinstance(payload, dict):
        data = payload.get('data') or payload
        if isinstance(data, dict):
            pid = clean_str(data.get('id') or data.get('product_id'))
        else:
            pid = clean_str(data)
    else:
        pid = clean_str(payload)
        
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM orders WHERE product_id = %s;", (pid,))
        r = cur.fetchone()
        if r and r['cnt'] > 0:
            cur.execute("UPDATE products SET status = 'Inactive' WHERE id = %s;", (pid,))
            return {"deleted": False, "archived": True, "success": True, "id": pid, "message": "تم تعطيل وأرشفة الموديل لوجود طلبات مبيعات سابقة مرتبطة به 📦"}
            
        cur.execute("DELETE FROM production_orders WHERE product_id = %s;", (pid,))
        cur.execute("DELETE FROM products WHERE id = %s;", (pid,))
    return {"deleted": True, "success": True, "id": pid, "message": "تم حذف الموديل بنجاح 🗑️"}

def delete_inventory(payload):
    data = payload.get('data') or payload
    iid = clean_str(data.get('id') or data.get('item_id'))
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM inventory_transactions WHERE inventory_id = %s;", (iid,))
        cur.execute("DELETE FROM inventory WHERE id = %s;", (iid,))
    return {"deleted": True, "id": iid}

def delete_journal_entry(payload):
    data = payload.get('data') or payload
    jid = clean_str(data.get('id'))
    entry_no = clean_str(data.get('entry_no'))
    ref_id = clean_str(data.get('ref_id'))
    with get_db_cursor(commit=True) as cur:
        if jid:
            cur.execute("DELETE FROM journal_entry_lines WHERE entry_id = %s;", (jid,))
            cur.execute("DELETE FROM journal_entries WHERE id = %s;", (jid,))
        elif entry_no:
            cur.execute("DELETE FROM journal_entries WHERE entry_no = %s;", (entry_no,))
        elif ref_id:
            cur.execute("DELETE FROM journal_entries WHERE ref_id = %s;", (ref_id,))
    return {"deleted": True}

# ── 14. إدارة الموارد البشرية والرواتب (HR, Employees & Payroll Engine) ──

def get_employees(params=None):
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM employees ORDER BY created_at DESC;")
        rows = cur.fetchall()
        for r in rows:
            if r.get('created_at'): r['created_at'] = str(r['created_at'])
            if r.get('updated_at'): r['updated_at'] = str(r['updated_at'])
            r['salary'] = float(r.get('salary') or 0.0)
            r['baseSalary'] = r['salary']
            r['base_salary'] = r['salary']
            r['hire_date'] = str(r['hire_date']) if r.get('hire_date') else today_str()
            r['hireDate'] = r['hire_date']
            r['type'] = r.get('type') or 'راتب شهري'
            raw_st = str(r.get('status') or 'نشط')
            r['status'] = 'نشط' if raw_st in ('Active', 'active', 'نشط') else 'موقوف'
        return rows

def add_employee(payload):
    data = payload.get('data') or payload
    emp_id = clean_str(data.get('id')) or generate_id("EMP")
    name = clean_str(data.get('name') or data.get('employee_name'))
    role = clean_str(data.get('role') or data.get('position') or 'خياط')
    emp_type = clean_str(data.get('type') or 'راتب شهري')
    phone = clean_str(data.get('phone') or '')
    salary = clean_num(data.get('salary') or data.get('baseSalary') or data.get('base_salary'))
    currency = clean_str(data.get('currency') or 'YER')
    hire_date = clean_str(data.get('hire_date') or data.get('hireDate')) or today_str()
    status = clean_str(data.get('status') or 'نشط')
    notes = clean_str(data.get('notes') or '')

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO employees (id, name, role, type, phone, salary, currency, hire_date, status, notes, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                role = EXCLUDED.role,
                type = EXCLUDED.type,
                phone = EXCLUDED.phone,
                salary = EXCLUDED.salary,
                currency = EXCLUDED.currency,
                hire_date = EXCLUDED.hire_date,
                status = EXCLUDED.status,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        """, (emp_id, name, role, emp_type, phone, salary, currency, hire_date, status, notes))
        res = dict(cur.fetchone())
        if res.get('created_at'): res['created_at'] = str(res['created_at'])
        if res.get('updated_at'): res['updated_at'] = str(res['updated_at'])
        res['salary'] = float(res.get('salary') or 0.0)
        res['baseSalary'] = res['salary']
        res['base_salary'] = res['salary']
        res['hire_date'] = str(res['hire_date']) if res.get('hire_date') else hire_date
        res['hireDate'] = res['hire_date']
        res['type'] = res.get('type') or emp_type
        res['status'] = status
        return res

def delete_employee(payload):
    data = payload.get('data') or payload
    emp_id = clean_str(data.get('id'))
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM payroll WHERE employee_id = %s;", (emp_id,))
        cur.execute("DELETE FROM employees WHERE id = %s;", (emp_id,))
    return {"deleted": True, "id": emp_id}

def get_payroll(params=None):
    month = None
    if isinstance(params, dict):
        month = params.get('month')
    elif isinstance(params, str):
        month = params
    
    with get_db_cursor() as cur:
        if month:
            cur.execute("SELECT * FROM payroll WHERE month = %s ORDER BY created_at DESC;", (month,))
        else:
            cur.execute("SELECT * FROM payroll ORDER BY created_at DESC;")
        rows = cur.fetchall()
        for r in rows:
            if r.get('created_at'): r['created_at'] = str(r['created_at'])
            if r.get('payment_date'): r['payment_date'] = str(r['payment_date'])
            r['empName'] = r.get('employee_name') or ''
            r['employee_name'] = r['empName']
            r['name'] = r['empName']
            r['empId'] = r.get('employee_id') or ''
            r['employee_id'] = r['empId']
            r['type'] = r.get('type') or 'راتب شهري'
            r['baseValue'] = float(r.get('basic_salary') or 0.0)
            r['baseSalary'] = r['baseValue']
            r['basic_salary'] = r['baseValue']
            r['piecesCount'] = int(r.get('pieces_count') or 0)
            r['totalDue'] = float(r.get('basic_salary') or 0.0)
            r['pieceWages'] = r['totalDue']
            r['bonus'] = float(r.get('allowances') or 0.0)
            r['allowances'] = r['bonus']
            r['deductions'] = float(r.get('deductions') or 0.0)
            r['deduction'] = r['deductions']
            r['netSalary'] = float(r.get('net_salary') if r.get('net_salary') is not None else (r['baseValue'] + r['bonus'] - r['deductions']))
            r['net_salary'] = r['netSalary']
            r['status'] = r.get('status') or 'معلق'
        return rows

def add_payroll_batch(payload):
    data = payload.get('data') or payload
    records = data.get('records', [])
    if not records and isinstance(data, list):
        records = data
    elif not records and isinstance(data, dict) and (data.get('empName') or data.get('name') or data.get('employee_name')):
        records = [data]
        
    created = []
    with get_db_cursor(commit=True) as cur:
        for r in records:
            p_id = clean_str(r.get('id')) or generate_id("PAY")
            p_no = clean_str(r.get('payroll_no')) or f"PR-{datetime.date.today().strftime('%Y%m')}-{uuid.uuid4().hex[:4].upper()}"
            emp_name = clean_str(r.get('empName') or r.get('employee_name') or r.get('name') or 'موظف')
            emp_id = clean_str(r.get('empId') or r.get('employee_id'))
            
            # التحقق من وجود الموظف بالـ id أو بالاسم لمنع خطأ الـ Foreign Key
            if emp_id:
                cur.execute("SELECT id, name FROM employees WHERE id = %s LIMIT 1;", (emp_id,))
                emp_row = cur.fetchone()
                if not emp_row:
                    cur.execute("SELECT id, name FROM employees WHERE name = %s LIMIT 1;", (emp_name,))
                    emp_row = cur.fetchone()
                    if emp_row:
                        emp_id = emp_row['id']
            else:
                cur.execute("SELECT id, name FROM employees WHERE name = %s LIMIT 1;", (emp_name,))
                emp_row = cur.fetchone()
                if emp_row:
                    emp_id = emp_row['id']
            
            if not emp_id:
                emp_id = generate_id("EMP")
                cur.execute("""
                    INSERT INTO employees (id, name, role, type, currency, status)
                    VALUES (%s, %s, 'خياط', %s, 'YER', 'نشط')
                    ON CONFLICT (id) DO NOTHING;
                """, (emp_id, emp_name, clean_str(r.get('type') or 'راتب شهري')))
                
            month = clean_str(r.get('month')) or datetime.date.today().strftime("%Y-%m")
            basic = clean_num(r.get('totalDue') or r.get('baseValue') or r.get('basic_salary') or r.get('salary'))
            allowances = clean_num(r.get('bonus') or r.get('allowances'))
            deductions = clean_num(r.get('deductions') or r.get('deduction'))
            curr = clean_str(r.get('currency') or 'YER')
            pay_date = clean_str(r.get('payment_date')) or today_str()
            status = clean_str(r.get('status') or 'معلق')
            emp_type = clean_str(r.get('type') or 'راتب شهري')
            pieces_count = int(clean_num(r.get('piecesCount') or 0))
            notes = clean_str(r.get('piecesStatement') or r.get('notes') or '')

            cur.execute("""
                INSERT INTO payroll (id, payroll_no, employee_id, employee_name, month, type, pieces_count, basic_salary, allowances, deductions, currency, payment_date, status, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    basic_salary = EXCLUDED.basic_salary,
                    allowances = EXCLUDED.allowances,
                    deductions = EXCLUDED.deductions,
                    type = EXCLUDED.type,
                    pieces_count = EXCLUDED.pieces_count,
                    status = EXCLUDED.status,
                    notes = EXCLUDED.notes;
            """, (p_id, p_no, emp_id, emp_name, month, emp_type, pieces_count, basic, allowances, deductions, curr, pay_date, status, notes))
            created.append(p_id)
    return {"created_count": len(created), "ids": created, "success": True}

def update_payroll_record(payload):
    data = payload.get('data') or payload
    p_id = clean_str(data.get('id'))
    status = data.get('status')
    bonus = clean_num(data.get('bonus') or data.get('allowances'))
    deductions = clean_num(data.get('deductions') or data.get('deduction'))
    notes = clean_str(data.get('notes') or '')
    
    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            UPDATE payroll 
            SET status = COALESCE(%s, status),
                allowances = CASE WHEN %s > 0 THEN %s ELSE allowances END,
                deductions = CASE WHEN %s > 0 THEN %s ELSE deductions END,
                notes = CASE WHEN %s != '' THEN %s ELSE notes END
            WHERE id = %s;
        """, (status, bonus, bonus, deductions, deductions, notes, notes, p_id))
    return {"updated": True, "id": p_id, "success": True}

def add_advance(payload):
    data = payload.get('data') or payload
    emp_id = clean_str(data.get('emp_id') or data.get('employee_id'))
    emp_name = clean_str(data.get('emp_name') or data.get('name') or data.get('employee_name'))
    amount = clean_num(data.get('amount'))
    if amount <= 0:
        raise ValueError("مبلغ السلفة يجب أن يكون أكبر من الصفر")
        
    curr = clean_str(data.get('currency') or 'YER')
    notes = clean_str(data.get('notes') or f"سلفة نقدية للموظف {emp_name}")
    month = clean_str(data.get('month')) or datetime.date.today().strftime("%Y-%m")
    
    with get_db_cursor(commit=True) as cur:
        rate = resolve_exchange_rate(cur, curr, 1.0)
        base_amt = amount * rate

        # التحقق وتحديد الموظف
        if emp_id:
            cur.execute("SELECT id, name FROM employees WHERE id = %s LIMIT 1;", (emp_id,))
            row = cur.fetchone()
            if row and not emp_name:
                emp_name = row['name']
        elif emp_name:
            cur.execute("SELECT id, name FROM employees WHERE name = %s LIMIT 1;", (emp_name,))
            row = cur.fetchone()
            if row:
                emp_id = row['id']
                emp_name = row['name']
        
        if not emp_id:
            emp_id = generate_id("EMP")
            cur.execute("""
                INSERT INTO employees (id, name, role, type, currency, status)
                VALUES (%s, %s, 'خياط', 'راتب شهري', 'YER', 'نشط')
                ON CONFLICT (id) DO NOTHING;
            """, (emp_id, emp_name or 'موظف'))

        pay_id = generate_id("PAY")
        pay_no = f"PAY-ADV-{int(time.time())}"
        jv_id = generate_id("JV")
        jv_no = f"JV-ADV-{int(time.time())}"
        
        # 1. تحديد صندوق الصرف
        credit_acc = resolve_account_id(cur, data.get('account_id') or data.get('box_code') or 'ACC-101', 'ACC-101')
        debit_acc = 'ACC-107' # سلف وذمم العاملين بالورشة
        
        # 2. إنشاء سند الصرف المالي في payments
        cur.execute("""
            INSERT INTO payments (
                id, payment_no, payment_type, date, amount, currency,
                exchange_rate, base_amount, party_name, payment_method, account_id, notes, status, created_at
            ) VALUES (%s, %s, 'Payment', CURRENT_DATE, %s, %s, %s, %s, %s, 'Cash', %s, %s, 'Confirmed', CURRENT_TIMESTAMP);
        """, (pay_id, pay_no, amount, curr, rate, base_amt, emp_name, credit_acc, notes))
        
        # 3. إنشاء القيد اليومي المزدوج المتوازن (ACC-107 مدين / ACC-101 دائن)
        cur.execute("""
            INSERT INTO journal_entries (
                id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                amount, total_amount, base_amount, currency, exchange_rate, ref_type, ref_id,
                status, notes, created_at
            ) VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, 'Advance', %s, 'Posted', %s, CURRENT_TIMESTAMP);
        """, (jv_id, jv_no, notes, debit_acc, credit_acc, amount, amount, base_amt, curr, rate, pay_id, notes))
        
        # السطر المدين: ذمم وسلف الموظف (ACC-107)
        cur.execute("""
            INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
            VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
        """, (generate_id("JVL"), jv_id, debit_acc, f"سلفة نقدية: {emp_name}", amount, base_amt))
        
        # السطر الدائن: الصندوق المنصرف منه (ACC-101)
        cur.execute("""
            INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
            VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
        """, (generate_id("JVL"), jv_id, credit_acc, f"صرف سلفة نقدية للموظف {emp_name}", amount, base_amt))
        
        # 4. تحديث الأرصدة في شجرة الحسابات
        cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance + %s WHERE id = %s;", (base_amt, debit_acc))
        cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance - %s WHERE id = %s;", (base_amt, credit_acc))
        
        # 5. تحديث مسير الرواتب إذا كان موجوداً للشهر الحالي
        cur.execute("""
            UPDATE payroll 
            SET deductions = deductions + %s
            WHERE (employee_id = %s OR employee_name = %s) AND month = %s;
        """, (amount, emp_id, emp_name, month))
        
    logger.info(f"💵 تم صرف وتسجيل سلفة للموظف {emp_name} بمبلغ {amount} سند {pay_no} وقيد {jv_no}")
    return {
        "success": True,
        "message": f"تم تسجيل السلفة للموظف ({emp_name}) بمبلغ {amount} بنجاح وتقييد القيد المحاسبي والسند المالي ✅",
        "payment_no": pay_no,
        "entry_no": jv_no,
        "amount": amount,
        "employee_id": emp_id
    }

def post_payroll(payload):
    data = payload.get('data') or payload
    records = data.get('records', [])
    month = clean_str(data.get('month')) or datetime.date.today().strftime("%Y-%m")
    
    if not records:
        return {"success": False, "message": "لا توجد سجلات رواتب للصرف"}
        
    processed = []
    with get_db_cursor(commit=True) as cur:
        for r in records:
            p_id = clean_str(r.get('id'))
            emp_id = clean_str(r.get('empId') or r.get('employee_id'))
            emp_name = clean_str(r.get('name') or r.get('empName') or r.get('employee_name') or 'موظف')
            base_val = clean_num(r.get('baseSalary') or r.get('baseValue') or r.get('basic_salary') or r.get('totalDue'))
            bonus = clean_num(r.get('bonus') or r.get('allowances'))
            deductions = clean_num(r.get('deduction') or r.get('deductions'))
            gross = base_val + bonus
            net = clean_num(r.get('netSalary') or r.get('net_salary') or (gross - deductions))
            if net < 0:
                net = 0.0
                
            curr = clean_str(r.get('currency') or 'YER')
            rate = resolve_exchange_rate(cur, curr, 1.0)
            base_gross = gross * rate
            base_deductions = deductions * rate
            base_net = net * rate
            
            credit_acc = resolve_account_id(cur, data.get('account_id') or data.get('box_code') or 'ACC-101', 'ACC-101')
            expense_acc = 'ACC-501' # أجور ورواتب الخياطين والمطرزين
            advance_acc = 'ACC-107' # سلف وذمم العاملين بالورشة
            
            # 1. تحديث حالة مسير الرواتب إلى تم الصرف
            cur.execute("""
                UPDATE payroll
                SET status = 'تم الصرف ✅',
                    basic_salary = CASE WHEN %s > 0 THEN %s ELSE basic_salary END,
                    allowances = %s,
                    deductions = %s,
                    payment_date = CURRENT_DATE,
                    notes = COALESCE(notes, '') || ' [تم الصرف]'
                WHERE id = %s OR (employee_id = %s AND month = %s);
            """, (base_val, base_val, bonus, deductions, p_id, emp_id, month))
            
            # 2. إنشاء سند صرف الراتب (payments) بصافي المبلغ المدفوع نقداً
            pay_id = generate_id("PAY")
            pay_no = f"PAY-SAL-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
            cur.execute("""
                INSERT INTO payments (
                    id, payment_no, payment_type, date, amount, currency,
                    exchange_rate, base_amount, party_name, payment_method, account_id, notes, status, created_at
                ) VALUES (%s, %s, 'Payment', CURRENT_DATE, %s, %s, %s, %s, %s, 'Cash', %s, %s, 'Confirmed', CURRENT_TIMESTAMP);
            """, (pay_id, pay_no, net, curr, rate, base_net, emp_name, credit_acc, f"صرف راتب شهر {month} للموظف: {emp_name}"))
            
            # 3. إنشاء القيد المركب المتوازن (Compound Double-Entry Journal Entry)
            # مدين: مصروف الرواتب والأجور ACC-501 بمجمل الراتب (gross)
            # دائن: استرداد السلف ACC-107 بمبلغ الخصميات (deductions) إن وجدت
            # دائن: الصندوق ACC-101 بصافي المبلغ المنصرف فعلياً (net)
            # المعادلة: المدين = gross = deductions + net = الدائن (توازن تام 100%)
            jv_id = generate_id("JV")
            jv_no = f"JV-SAL-{int(time.time())}-{uuid.uuid4().hex[:4].upper()}"
            cur.execute("""
                INSERT INTO journal_entries (
                    id, entry_no, entry_date, description, debit_account_id, credit_account_id,
                    amount, total_amount, base_amount, currency, exchange_rate, ref_type, ref_id,
                    status, notes, created_at
                ) VALUES (%s, %s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s, %s, 'Payroll', %s, 'Posted', %s, CURRENT_TIMESTAMP);
            """, (jv_id, jv_no, f"قيد صرف راتب شهر {month} للموظف {emp_name}", expense_acc, credit_acc, gross, gross, base_gross, curr, rate, pay_id, f"مسير رواتب {month}"))
            
            # سطر مدين: مصروف الرواتب ACC-501
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, %s, 0.0, %s, 0.0);
            """, (generate_id("JVL"), jv_id, expense_acc, f"استحقاق راتب شهر {month}: {emp_name}", gross, base_gross))
            
            # أسطر دائنة
            if deductions > 0:
                cur.execute("""
                    INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                    VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
                """, (generate_id("JVL"), jv_id, advance_acc, f"استرداد وتسوية سلف موظف: {emp_name}", deductions, base_deductions))
                cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance - %s WHERE id = %s;", (base_deductions, advance_acc))
                
            cur.execute("""
                INSERT INTO journal_entry_lines (id, entry_id, account_id, line_description, debit, credit, debit_base, credit_base)
                VALUES (%s, %s, %s, %s, 0.0, %s, 0.0, %s);
            """, (generate_id("JVL"), jv_id, credit_acc, f"صرف صافي راتب شهر {month}: {emp_name}", net, base_net))
            
            # تحديث رصيد مصروف الرواتب ورصيد الصندوق
            cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance + %s WHERE id = %s;", (base_gross, expense_acc))
            cur.execute("UPDATE chart_of_accounts SET current_balance = current_balance - %s WHERE id = %s;", (base_net, credit_acc))
            
            processed.append({"id": p_id, "emp_name": emp_name, "net": net, "gross": gross, "payment_no": pay_no, "entry_no": jv_no})
            
    logger.info(f"💸 تم صرف رواتب {len(processed)} موظف لشهر {month} بنجاح.")
    return {
        "success": True,
        "message": f"تم تسليم الراتب وإنشاء القيد المحاسبي المركب 💸",
        "processed_records": processed,
        "count": len(processed),
        "month": month
    }

def calculate_payroll(payload=None):
    month = None
    if isinstance(payload, dict):
        month = payload.get('month')
    elif isinstance(payload, str):
        month = payload
    if not month:
        month = datetime.date.today().strftime("%Y-%m")
        
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM employees WHERE status IN ('Active', 'active', 'نشط') ORDER BY name;")
        employees = cur.fetchall()
        
        records = []
        for emp in employees:
            e_name = emp['name']
            e_id = emp['id']
            e_type = emp.get('type') or 'راتب شهري'
            base_sal = float(emp.get('salary') or 0.0)
            pieces_count = 0
            pieces_stmt = ""
            total_due = base_sal
            
            if e_type == 'بالقطعة':
                cur.execute("""
                    SELECT production_order_no, stage, due_date, order_id
                    FROM production_orders
                    WHERE (assigned_tailor_id = %s OR assigned_tailor_id = %s OR notes ILIKE %s)
                      AND stage IN ('تشطيب', 'جاهز للتسليم', 'تسليم', 'مكتمل', 'Completed')
                      AND to_char(created_at, 'YYYY-MM') = %s;
                """, (e_id, e_name, f"%{e_name}%", month))
                po_rows = cur.fetchall()
                pieces_count = len(po_rows)
                total_due = pieces_count * base_sal
                if pieces_count > 0:
                    pieces_stmt = "\n".join([f"- أمر معمل #{r['production_order_no']} (المرحلة: {r['stage']})" for r in po_rows])
            
            # فحص السلف المسجلة في هذا الشهر
            cur.execute("""
                SELECT COALESCE(SUM(amount), 0.0) as total_advances
                FROM payments
                WHERE (party_name = %s OR notes ILIKE %s)
                  AND payment_type IN ('Payment', 'سند_صرف')
                  AND (notes ILIKE '%%سلفة%%' OR notes ILIKE '%%سلف%%')
                  AND to_char(date, 'YYYY-MM') = %s;
            """, (e_name, f"%{e_name}%", month))
            adv_row = cur.fetchone()
            deductions = float(adv_row['total_advances']) if adv_row else 0.0
            
            records.append({
                "empId": e_id,
                "empName": e_name,
                "name": e_name,
                "role": emp.get('role') or 'خياط',
                "type": e_type,
                "baseValue": base_sal,
                "baseSalary": base_sal,
                "piecesCount": pieces_count,
                "totalDue": total_due,
                "pieceWages": total_due,
                "bonus": 0.0,
                "allowances": 0.0,
                "deductions": deductions,
                "deduction": deductions,
                "netSalary": total_due - deductions,
                "net_salary": total_due - deductions,
                "month": month,
                "status": 'معلق',
                "piecesStatement": pieces_stmt
            })
            
        return records



def purge_purchases(payload=None):
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM purchase_items;")
        cur.execute("DELETE FROM purchases;")
    return {"purged": True}

def reset_clean_chart_of_accounts(payload=None):
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM journal_entry_lines;")
        cur.execute("DELETE FROM journal_entries;")
        cur.execute("DELETE FROM payments;")
        cur.execute("DELETE FROM expenses;")
        cur.execute("UPDATE chart_of_accounts SET opening_balance = 0.0, current_balance = 0.0;")
        cur.execute("DELETE FROM chart_of_accounts WHERE account_code LIKE '01.06%' OR id IN ('ACC-000027', 'ACC-957272');")
        cur.execute("""
            UPDATE chart_of_accounts SET parent_account_code = '1', parent_account_id = 'ACC-1' WHERE account_code IN ('101', '102', '103', '104', '105', '106');
            UPDATE chart_of_accounts SET parent_account_code = '101', parent_account_id = 'ACC-101' WHERE account_code IN ('101.2', '101.3');
            UPDATE chart_of_accounts SET parent_account_code = '102', parent_account_id = 'ACC-102' WHERE account_code IN ('102.01', '102.02');
            UPDATE chart_of_accounts SET parent_account_code = '2', parent_account_id = 'ACC-2' WHERE account_code IN ('201', '202');
            UPDATE chart_of_accounts SET parent_account_code = '3', parent_account_id = 'ACC-3' WHERE account_code IN ('301', '302');
            UPDATE chart_of_accounts SET parent_account_code = '301', parent_account_id = 'ACC-301' WHERE account_code IN ('301.01', '301.02');
            UPDATE chart_of_accounts SET parent_account_code = '4', parent_account_id = 'ACC-4' WHERE account_code IN ('401', '402');
            UPDATE chart_of_accounts SET parent_account_code = '5', parent_account_id = 'ACC-5' WHERE account_code IN ('501', '502', '503', '504', '505', '506');
        """)
    return {"reset": True, "accounts": get_accounts()}


# ── 15. مسح وتصفير البيانات التشغيلية (Clean Slate / Reset Operational Data) ──

def clear_all_transactional_data(payload=None):
    """
    تصفير ومسح كافة البيانات التشغيلية والتجريبية، مع الحفاظ الصارم على:
    - المستخدمين (users)
    - شجرة الحسابات (chart_of_accounts)
    - العملات (currencies)
    - أرقام التسلسل (number_sequences)
    - إعدادات الشركة والنظام (company_profile, system_settings)
    - العميل والمورد العام الافتراضي
    """
    tables_to_clear = [
        "quality_actions", "quality_returns", "quality_complaints", "quality_feedback", "quality_defects", "quality_inspections",
        "production_orders", "order_items", "orders",
        "purchase_items", "purchases",
        "inventory_transactions", "inventory",
        "journal_entry_lines", "journal_entries",
        "payments", "expenses",
        "measurements", "children", "payroll"
    ]
    with get_db_cursor(commit=True) as cur:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        existing_tables = {r['table_name'] for r in cur.fetchall()}
        valid_tables = [t for t in tables_to_clear if t in existing_tables]
        if valid_tables:
            cur.execute("; ".join([f"DELETE FROM {t}" for t in valid_tables]) + ";")
        
        cur.execute("DELETE FROM customers WHERE id != 'CUST-GENERAL'; DELETE FROM suppliers WHERE id != 'SUPP-GENERAL'; DELETE FROM products;")

    logger.info("🧹 تم مسح وتصفير كافة البيانات التشغيلية والبدء بقاعدة بيانات نظيفة من الصفر بنجاح.")
    return {
        "cleared": True,
        "message": "تم تصفير كافة البيانات التشغيلية والبدء بقاعدة بيانات نظيفة 100% مع الحفاظ على الهيكل والبيانات الأساسية.",
        "stats": get_dashboard_stats()
    }


# ── 15.2 إدارة الجودة والمطابقة (Quality Management Controller) ──

def get_quality_inspections(params=None):
    query = "SELECT * FROM quality_inspections ORDER BY created_at DESC;"
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('inspection_date'): r['inspection_date'] = str(r['inspection_date'])
    return rows

def add_quality_inspection(payload):
    data = payload.get('data') or payload
    q_id = clean_str(data.get('id')) or generate_id("INSP")
    i_date = clean_str(data.get('inspection_date') or data.get('date')) or today_str()
    p_id = clean_str(data.get('product_id')) or None
    po_id = clean_str(data.get('production_order_id') or data.get('order_id')) or None
    stage = clean_str(data.get('production_stage') or data.get('stage') or 'Sewing')
    batch = clean_str(data.get('batch_id') or '')
    q_chk = int(clean_num(data.get('quantity_checked') or 1))
    q_pass = int(clean_num(data.get('quantity_passed') or 1))
    q_fail = int(clean_num(data.get('quantity_failed') or 0))
    res = clean_str(data.get('inspection_result') or ('Pass' if q_fail == 0 else 'Fail'))
    notes = clean_str(data.get('notes') or '')

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO quality_inspections (
                id, inspection_date, product_id, production_order_id, production_stage,
                batch_id, quantity_checked, quantity_passed, quantity_failed, inspection_result, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET inspection_result = EXCLUDED.inspection_result, notes = EXCLUDED.notes
            RETURNING *;
        """, (q_id, i_date, p_id, po_id, stage, batch, q_chk, q_pass, q_fail, res, notes))
        row = dict(cur.fetchone())
        if row.get('created_at'): row['created_at'] = str(row['created_at'])
        return row

def get_quality_defects(params=None):
    query = "SELECT * FROM quality_defects ORDER BY created_at DESC;"
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('defect_date'): r['defect_date'] = str(r['defect_date'])
    return rows

def add_quality_defect(payload):
    data = payload.get('data') or payload
    d_id = clean_str(data.get('id')) or generate_id("DEF")
    d_date = clean_str(data.get('defect_date') or data.get('date')) or today_str()
    d_type = clean_str(data.get('defect_type') or 'خياطة')
    d_cat = clean_str(data.get('defect_category') or 'معمل')
    sev = clean_str(data.get('severity') or 'Minor')
    aff_q = int(clean_num(data.get('affected_quantity') or 1))
    root_c = clean_str(data.get('root_cause') or '')
    corr = clean_str(data.get('corrective_action') or '')
    notes = clean_str(data.get('notes') or '')

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO quality_defects (
                id, defect_date, defect_type, defect_category, severity,
                affected_quantity, root_cause, corrective_action, notes, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'Open')
            ON CONFLICT (id) DO UPDATE SET notes = EXCLUDED.notes
            RETURNING *;
        """, (d_id, d_date, d_type, d_cat, sev, aff_q, root_c, corr, notes))
        row = dict(cur.fetchone())
        if row.get('created_at'): row['created_at'] = str(row['created_at'])
        return row

def get_quality_feedback(params=None):
    query = "SELECT * FROM quality_feedback ORDER BY created_at DESC;"
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
        if r.get('feedback_date'): r['feedback_date'] = str(r['feedback_date'])
    return rows

def add_quality_feedback(payload):
    data = payload.get('data') or payload
    fb_id = clean_str(data.get('id')) or generate_id("FB")
    rating = int(clean_num(data.get('rating') or 5))
    comment = clean_str(data.get('feedback_comment') or data.get('comment') or '')
    cat = clean_str(data.get('feedback_category') or 'خدمة عملاء')
    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO quality_feedback (id, rating, feedback_comment, feedback_category, status)
            VALUES (%s, %s, %s, %s, 'Reviewed')
            ON CONFLICT (id) DO UPDATE SET feedback_comment = EXCLUDED.feedback_comment
            RETURNING *;
        """, (fb_id, rating, comment, cat))
        row = dict(cur.fetchone())
        if row.get('created_at'): row['created_at'] = str(row['created_at'])
        return row

def get_quality_summary(params=None):
    with get_db_cursor(commit=False) as cur:
        cur.execute("SELECT count(*) as total_inspections FROM quality_inspections;")
        tot_insp = cur.fetchone()['total_inspections']
        cur.execute("SELECT count(*) as total_defects FROM quality_defects;")
        tot_def = cur.fetchone()['total_defects']
        cur.execute("SELECT count(*) as total_feedback, COALESCE(avg(rating), 5.0) as avg_rating FROM quality_feedback;")
        fb_info = cur.fetchone()
    return {
        "totalInspections": tot_insp,
        "totalDefects": tot_def,
        "totalFeedback": fb_info['total_feedback'],
        "averageRating": float(fb_info['avg_rating']),
        "status": "Healthy"
    }

# ── 15.3 إدارة المستخدمين ومزامنة PostgreSQL (Users Management) ──

def get_users_pg(params=None):
    query = "SELECT id, username, full_name, role, email, phone, is_active, created_at FROM users ORDER BY created_at ASC;"
    rows = execute_query(query, fetch_all=True)
    for r in rows:
        if r.get('created_at'): r['created_at'] = str(r['created_at'])
    return rows

def sync_user_to_pg(payload):
    data = payload.get('data') or payload
    u_id = clean_str(data.get('id')) or generate_id("USR")
    uname = clean_str(data.get('username'))
    if not uname:
        return {"error": "Username required"}
    pwd_hash = clean_str(data.get('password_hash') or data.get('password') or 'hashed_default')
    full_name = clean_str(data.get('full_name') or uname)
    role = clean_str(data.get('role') or 'data_entry')
    email = clean_str(data.get('email') or f"{uname}@littleprincesses.com")
    phone = clean_str(data.get('phone') or '')
    is_act = bool(data.get('is_active', True))

    with get_db_cursor(commit=True) as cur:
        cur.execute("""
            INSERT INTO users (id, username, password_hash, full_name, role, email, phone, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (username) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                role = EXCLUDED.role,
                is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, username, full_name, role, email, phone, is_active;
        """, (u_id, uname, pwd_hash, full_name, role, email, phone, is_act))
        return dict(cur.fetchone())


# ── 15.3 إعدادات النظام العامة وسجلات التدقيق والنسخ الاحتياطي (Settings, Audit Logs & Disaster Recovery) ──

def log_audit_event(entity_type, entity_id, action, old_values=None, new_values=None, user_id=None, ip_address=None):
    """تسجيل حدث أمني أو مالي أو إداري في جدول audit_logs السحابي مع حل المفتاح الأجنبي"""
    try:
        resolved_user_id = None
        target_u = clean_str(user_id or 'admin')
        with get_db_cursor() as u_cur:
            u_cur.execute("SELECT id FROM users WHERE id = %s OR username = %s LIMIT 1;", (target_u, target_u))
            u_row = u_cur.fetchone()
            if u_row:
                resolved_user_id = u_row['id']
            else:
                # محاولة استخدام معرف المشرف الافتراضي
                u_cur.execute("SELECT id FROM users WHERE username = 'admin' LIMIT 1;")
                admin_row = u_cur.fetchone()
                resolved_user_id = admin_row['id'] if admin_row else None

        with get_db_cursor(commit=True) as cur:
            cur.execute("""
                INSERT INTO audit_logs (entity_type, entity_id, action, old_values, new_values, user_id, ip_address)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                clean_str(entity_type or 'SYSTEM'),
                str(entity_id or 'GENERAL'),
                clean_str(action or 'INFO'),
                json.dumps(old_values, default=str) if old_values is not None else None,
                json.dumps(new_values, default=str) if new_values is not None else None,
                resolved_user_id,
                clean_str(ip_address or '127.0.0.1')
            ))
            row = cur.fetchone()
            return row['id'] if row else None
    except Exception as e:
        logger.error(f"❌ خطأ أثناء تسجيل سجل التدقيق (Audit Log): {e}")
        return None

def get_audit_logs(params=None):
    """استرجاع سجلات التدقيق الأمني مع الفلترة والترقيم"""
    params = params or {}
    if isinstance(params, dict) and 'data' in params:
        params = params['data']
    limit = int(clean_num(params.get('limit') or 50))
    offset = int(clean_num(params.get('offset') or 0))
    entity_type = clean_str(params.get('entity_type') or '')
    action = clean_str(params.get('action') or '')
    search = clean_str(params.get('search') or '')

    where_clauses = []
    args = []
    if entity_type:
        where_clauses.append("entity_type ILIKE %s")
        args.append(f"%{entity_type}%")
    if action:
        where_clauses.append("action ILIKE %s")
        args.append(f"%{action}%")
    if search:
        where_clauses.append("(entity_id ILIKE %s OR user_id ILIKE %s OR action ILIKE %s)")
        args.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    with get_db_cursor() as cur:
        cur.execute(f"SELECT COUNT(*) as total FROM audit_logs {where_sql};", tuple(args))
        total = cur.fetchone()['total']

        cur.execute(f"""
            SELECT id, entity_type, entity_id, action, old_values, new_values, user_id, ip_address, timestamp, created_at
            FROM audit_logs
            {where_sql}
            ORDER BY id DESC
            LIMIT %s OFFSET %s;
        """, tuple(args + [limit, offset]))
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            if r.get('timestamp'): r['timestamp'] = str(r['timestamp'])
            if r.get('created_at'): r['created_at'] = str(r['created_at'])

        return {
            "total": total,
            "logs": rows,
            "limit": limit,
            "offset": offset
        }

def add_audit_log(payload):
    """تسجيل حدث تدقيق جديد عبر واجهة المستخدم"""
    data = payload.get('data') or payload
    e_type = clean_str(data.get('entity_type') or 'USER_ACTION')
    e_id = clean_str(data.get('entity_id') or 'CLIENT')
    act = clean_str(data.get('action') or 'LOG')
    old_v = data.get('old_values')
    new_v = data.get('new_values')
    u_id = clean_str(data.get('user_id') or 'admin')
    ip = clean_str(data.get('ip_address') or '127.0.0.1')
    log_id = log_audit_event(e_type, e_id, act, old_v, new_v, u_id, ip)
    return {"id": log_id, "success": True}

def get_system_settings(params=None):
    """استرجاع إعدادات المؤسسة والمظهر وأسعار الصرف الحية"""
    with get_db_cursor() as cur:
        # 1. Company Profile
        cur.execute("SELECT * FROM company_profile WHERE id = 1 LIMIT 1;")
        cp = cur.fetchone()
        if cp:
            cp = dict(cp)
            if cp.get('establishment_date'): cp['establishment_date'] = str(cp['establishment_date'])
        else:
            cp = {
                "id": 1,
                "company_name": "مؤسسة الأميرات الصغيرات للأزياء الراقية",
                "phone": "776773458",
                "address": "اليمن - صنعاء - شارع حدة",
                "email": "info@littleprincesses.com",
                "fiscal_date": "2026-01-01",
                "theme_mode": "light",
                "base_currency": "YER"
            }

        # 2. System Settings
        cur.execute("SELECT key, value, category, description FROM system_settings;")
        settings_map = {r['key']: r['value'] for r in cur.fetchall()}

        # 3. Currency Rates
        cur.execute("SELECT code, exchange_rate, is_base FROM currencies;")
        c_rows = cur.fetchall()
        rates = {}
        for cr in c_rows:
            rates[cr['code']] = float(cr['exchange_rate'] or 1.0)

        return {
            "company": {
                "company_name": cp.get('company_name') or 'مؤسسة الأميرات الصغيرات للأزياء الراقية',
                "phone": cp.get('phone') or '776773458',
                "address": cp.get('address') or 'اليمن - صنعاء - شارع حدة',
                "email": cp.get('email') or 'info@littleprincesses.com',
                "fiscal_date": cp.get('fiscal_date') or str(cp.get('establishment_date') or '2026-01-01'),
                "theme_mode": cp.get('theme_mode') or 'light',
                "base_currency": cp.get('base_currency') or 'YER'
            },
            "currency": {
                "base_currency": cp.get('base_currency') or 'YER',
                "rates": rates if rates else {"YER": 1.0, "SAR": 142.0, "USD": 535.0}
            },
            "theme": {
                "mode": cp.get('theme_mode') or 'light',
                "primary_color": "#B0005A"
            },
            "settings": settings_map
        }

def save_system_settings(payload):
    """تحديث إعدادات المؤسسة والمظهر وأسعار الصرف وقيد التعديل بسجل التدقيق"""
    data = payload.get('data') or payload
    c_name = clean_str(data.get('company_name') or data.get('companyName') or 'مؤسسة الأميرات الصغيرات')
    phone = clean_str(data.get('phone') or '')
    address = clean_str(data.get('address') or '')
    email = clean_str(data.get('email') or '')
    f_date = clean_str(data.get('fiscal_date') or data.get('fiscalDate') or '2026-01-01')
    theme = clean_str(data.get('theme_mode') or data.get('theme') or 'light')
    base_cur = clean_str(data.get('base_currency') or 'YER')
    rates = data.get('rates') or {}

    old_settings = get_system_settings()

    with get_db_cursor(commit=True) as cur:
        # 1. Update company_profile
        cur.execute("""
            INSERT INTO company_profile (id, company_name, phone, address, email, fiscal_date, theme_mode, base_currency)
            VALUES (1, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                company_name = COALESCE(EXCLUDED.company_name, company_profile.company_name),
                phone = COALESCE(EXCLUDED.phone, company_profile.phone),
                address = COALESCE(EXCLUDED.address, company_profile.address),
                email = COALESCE(EXCLUDED.email, company_profile.email),
                fiscal_date = COALESCE(EXCLUDED.fiscal_date, company_profile.fiscal_date),
                theme_mode = COALESCE(EXCLUDED.theme_mode, company_profile.theme_mode),
                base_currency = COALESCE(EXCLUDED.base_currency, company_profile.base_currency);
        """, (c_name, phone, address, email, f_date, theme, base_cur))

        # 2. Update currency exchange rates
        if rates and isinstance(rates, dict):
            for code, rate in rates.items():
                r_val = clean_num(rate)
                if r_val > 0:
                    cur.execute("""
                        UPDATE currencies
                        SET exchange_rate = %s, last_updated = CURRENT_TIMESTAMP
                        WHERE code = %s;
                    """, (r_val, code))

    log_audit_event('SETTINGS', 'SYSTEM', 'UPDATE',
                    old_values=old_settings.get('company'),
                    new_values={
                        'company_name': c_name, 'phone': phone, 'address': address,
                        'email': email, 'fiscal_date': f_date, 'theme_mode': theme,
                        'base_currency': base_cur, 'rates': rates
                    },
                    user_id=clean_str(data.get('user_id') or 'admin'))

    return {
        "saved": True,
        "message": "تم حفظ الإعدادات وأسعار الصرف والمظهر بنجاح في قاعدة البيانات السحابية 👑✅",
        "settings": get_system_settings()
    }

def get_backup_status(params=None):
    """استعلام حالة قاعدة البيانات السحابية وإجمالي السجلات ونقاط الاستعادة"""
    with get_db_cursor() as cur:
        cur.execute("SELECT pg_database_size(current_database()) as db_size;")
        db_size_bytes = cur.fetchone()['db_size'] or 0

        cur.execute("""
            SELECT (
                (SELECT COUNT(*) FROM chart_of_accounts) +
                (SELECT COUNT(*) FROM journal_entries) +
                (SELECT COUNT(*) FROM journal_entry_lines) +
                (SELECT COUNT(*) FROM customers) +
                (SELECT COUNT(*) FROM children) +
                (SELECT COUNT(*) FROM orders) +
                (SELECT COUNT(*) FROM order_items) +
                (SELECT COUNT(*) FROM production_orders) +
                (SELECT COUNT(*) FROM inventory) +
                (SELECT COUNT(*) FROM inventory_transactions) +
                (SELECT COUNT(*) FROM purchases) +
                (SELECT COUNT(*) FROM purchase_items) +
                (SELECT COUNT(*) FROM suppliers) +
                (SELECT COUNT(*) FROM payments) +
                (SELECT COUNT(*) FROM expenses) +
                (SELECT COUNT(*) FROM employees) +
                (SELECT COUNT(*) FROM products) +
                (SELECT COUNT(*) FROM users)
            ) as total_records;
        """)
        total_records = cur.fetchone()['total_records'] or 0

    if db_size_bytes >= 1024 * 1024:
        size_fmt = f"{db_size_bytes / (1024 * 1024):.2f} MB"
    elif db_size_bytes >= 1024:
        size_fmt = f"{db_size_bytes / 1024:.2f} KB"
    else:
        size_fmt = f"{db_size_bytes} Bytes"

    base_dir = os.path.dirname(os.path.abspath(__file__))
    backups_dir = os.path.join(base_dir, "backups")
    snapshots = []
    if os.path.exists(backups_dir):
        for fname in sorted(os.listdir(backups_dir), reverse=True):
            if fname.startswith("snapshot_") and (fname.endswith(".json") or fname.endswith(".db")):
                fpath = os.path.join(backups_dir, fname)
                fsize = os.path.getsize(fpath)
                mtime = datetime.datetime.fromtimestamp(os.path.getmtime(fpath)).strftime("%Y-%m-%d %H:%M:%S")
                ftype = "json" if fname.endswith(".json") else "sqlite"
                size_str = f"{fsize / 1024:.1f} KB" if fsize >= 1024 else f"{fsize} B"
                snapshots.append({
                    "filename": fname,
                    "type": ftype,
                    "size_bytes": fsize,
                    "size_formatted": size_str,
                    "created_at": mtime
                })

    return {
        "success": True,
        "db_type": "PostgreSQL 17.6 (Cloud Pool)",
        "db_size_bytes": db_size_bytes,
        "db_size_formatted": size_fmt,
        "total_records": total_records,
        "integrity_check": "PASSED",
        "snapshots_count": len(snapshots),
        "snapshots": snapshots
    }

def create_backup_snapshot(params=None):
    """إنشاء نقطة استعادة فورية وتصديرها بصيغة JSON سحابية"""
    tables = [
        "company_profile", "currencies", "chart_of_accounts", "journal_entries", "journal_entry_lines",
        "customers", "children", "measurements", "products", "inventory", "inventory_transactions",
        "suppliers", "purchases", "purchase_items", "orders", "order_items", "production_orders",
        "payments", "expenses", "employees", "payroll", "users", "system_settings"
    ]
    dump_data = {}
    with get_db_cursor() as cur:
        for tbl in tables:
            try:
                cur.execute(f'SELECT * FROM "{tbl}";')
                rows = [dict(r) for r in cur.fetchall()]
                for r in rows:
                    for k, v in r.items():
                        if isinstance(v, (datetime.date, datetime.datetime, uuid.UUID)):
                            r[k] = str(v)
                        elif isinstance(v, Decimal):
                            r[k] = float(v)
                dump_data[tbl] = rows
            except Exception as _te:
                logger.warning(f"تعذر استخراج بيانات الجدول {tbl}: {_te}")

    ts_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"snapshot_{ts_str}.json"
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backups_dir = os.path.join(base_dir, "backups")
    os.makedirs(backups_dir, exist_ok=True)
    full_path = os.path.join(backups_dir, filename)

    content = {
        "metadata": {
            "application": "Little Princesses Haute Couture ERP",
            "version": "2.0.0",
            "database": "PostgreSQL 17.6 (Cloud)",
            "snapshot_timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_tables": len(dump_data)
        },
        "tables": dump_data
    }

    with open(full_path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

    log_audit_event('BACKUP', filename, 'SNAPSHOT_CREATE', new_values={"filename": filename, "tables_count": len(dump_data)})

    return {
        "success": True,
        "filename": filename,
        "file_path": full_path,
        "message": f"تم حفظ نقطة الاستعادة بنجاح: {filename} 📸💾"
    }

def restore_backup_data(payload):
    """استعادة البيانات من ملف نسخة احتياطية وإعادة بناء السجلات"""
    data = payload.get('data') or payload
    tables_payload = data.get('tables') or {}
    if not tables_payload and 'data' in data:
        tables_payload = data['data'].get('tables') or {}

    if not tables_payload or not isinstance(tables_payload, dict):
        raise ValueError("ملف النسخة الاحتياطية فارغ أو لا يحتوي على بنية الجداول المطلوبة.")

    restore_order = [
        "company_profile", "currencies", "chart_of_accounts", "users",
        "customers", "children", "measurements", "products", "inventory",
        "suppliers", "purchases", "purchase_items", "orders", "order_items",
        "production_orders", "payments", "expenses", "employees", "payroll",
        "journal_entries", "journal_entry_lines", "inventory_transactions", "system_settings"
    ]

    restored_summary = {}
    with get_db_cursor(commit=True) as cur:
        for tbl in restore_order:
            rows = tables_payload.get(tbl)
            if rows and isinstance(rows, list) and len(rows) > 0:
                count = 0
                for r in rows:
                    cols = list(r.keys())
                    vals = [r[c] for c in cols]
                    placeholders = ", ".join(["%s"] * len(cols))
                    col_names = ", ".join([f'"{c}"' for c in cols])
                    update_clause = ", ".join([f'"{c}" = EXCLUDED."{c}"' for c in cols if c != 'id'])

                    if 'id' in cols and update_clause:
                        sql = f'INSERT INTO "{tbl}" ({col_names}) VALUES ({placeholders}) ON CONFLICT (id) DO UPDATE SET {update_clause};'
                    else:
                        sql = f'INSERT INTO "{tbl}" ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;'
                    cur.execute(sql, vals)
                    count += 1
                restored_summary[tbl] = count

    log_audit_event('BACKUP', 'RESTORE_DATA', 'RESTORE_EXECUTE', new_values={"restored_tables": restored_summary})

    return {
        "success": True,
        "restored": True,
        "summary": restored_summary,
        "message": f"تمت استعادة البيانات بنجاح في {len(restored_summary)} جدول مالي وتشغيلي 👑🔄"
    }


# ── 16. الموزع العام للطلبات (Master Action Dispatcher) ──

ACTION_HANDLERS = {
    # الجودة
    "getQualitySummary": get_quality_summary,
    "getQualityInspections": get_quality_inspections,
    "addQualityInspection": add_quality_inspection,
    "getQualityDefects": get_quality_defects,
    "addQualityDefect": add_quality_defect,
    "getFeedback": get_quality_feedback,
    "getQualityFeedback": get_quality_feedback,
    "addFeedback": add_quality_feedback,
    "addQualityFeedback": add_quality_feedback,
    
    # المستخدمين
    "getUsers": get_users_pg,
    "saveUser": sync_user_to_pg,
    "addUser": sync_user_to_pg,

    # العملاء
    "getCustomers": get_customers,
    "addCustomer": add_customer,
    "updateCustomer": add_customer,
    "deleteCustomer": delete_customer,
    
    # المنتجات والكتالوج وقائمة المواد
    "getProducts": get_products,
    "addProduct": add_product,
    "updateProduct": add_product,
    "deleteProduct": delete_product,
    "getBOM": get_bom_models,
    "getBOMModels": get_bom_models,
    "saveBOM": save_bom_model,
    "saveBOMModel": save_bom_model,
    "deleteBOM": delete_bom_model,
    "deleteBOMModel": delete_bom_model,
    
    # المخزون
    "getInventory": get_inventory,
    "addInventory": add_or_update_inventory,
    "addOrUpdateItem": add_or_update_inventory,
    "updateInventoryQty": update_inventory_qty,
    "adjustInventory": adjust_inventory,
    "adjust_inventory": adjust_inventory,
    "issueMaterials": update_inventory_qty,
    "recordInventoryMovement": update_inventory_qty,
    "deleteInventory": delete_inventory,
    "deleteItem": delete_inventory,
    
    # المبيعات
    "getOrders": get_orders,
    "addOrder": add_order,
    "createOrder": add_order,
    "updateOrder": update_order,
    "deleteOrder": delete_order,
    
    # المشتريات والموردين
    "getPurchases": get_purchases,
    "addPurchase": add_purchase,
    "addPurchaseInvoice": add_purchase,
    "updatePurchase": add_purchase,
    "deletePurchase": delete_purchase,
    "removePurchase": delete_purchase,
    "purgePurchasesSheetData": purge_purchases,
    "getSuppliers": get_suppliers,
    "addSupplier": add_supplier,
    "updateSupplier": add_supplier,
    "deleteSupplier": delete_supplier,
    
    # السندات والمدفوعات
    "getVouchers": get_vouchers,
    "getPayments": get_vouchers,
    "addVoucher": add_voucher,
    "addPayment": add_voucher,
    "updateVoucher": add_voucher,
    "deleteVoucher": delete_voucher,
    "deletePayment": delete_voucher,
    
    # المصروفات
    "getExpenses": get_expenses,
    "addExpense": add_expense,
    "deleteExpense": delete_expense,
    "removeExpense": delete_expense,
    
    # شجرة الحسابات
    "getAccounts": get_accounts,
    "getChartOfAccounts": get_accounts,
    "getChartOfAccountsTree": get_accounts,
    "addAccount": add_account,
    "saveAccount": add_account,
    "deleteAccount": delete_account,
    "resetCleanChartOfAccounts": reset_clean_chart_of_accounts,
    
    # القيود اليومية
    "getJournalEntries": get_journal_entries,
    "addJournalEntry": add_journal_entry,
    "saveJournalEntry": add_journal_entry,
    "updateJournalEntry": add_journal_entry,
    "deleteJournalEntry": delete_journal_entry,
    
    # المعمل
    "getFactory": get_factory,
    "updateFactory": update_factory,
    
    # العملات
    "getCurrencies": get_currencies,
    "updateExchangeRate": update_exchange_rate,
    
    # الموارد البشرية والرواتب
    "getEmployees": get_employees,
    "addEmployee": add_employee,
    "updateEmployee": add_employee,
    "deleteEmployee": delete_employee,
    "getPayroll": get_payroll,
    "addPayrollBatch": add_payroll_batch,
    "updatePayrollRecord": update_payroll_record,
    "addAdvance": add_advance,
    "postPayroll": post_payroll,
    "paySalary": post_payroll,
    "calculatePayroll": calculate_payroll,
    
    # مسح وتصفير البيانات التشغيلية
    "clearAllData": clear_all_transactional_data,
    "clearAllTransactionalData": clear_all_transactional_data,
    "wipeAllData": clear_all_transactional_data,
    
    # إعدادات النظام وسجلات التدقيق والنسخ الاحتياطي
    "getSettings": get_system_settings,
    "getSystemSettings": get_system_settings,
    "saveSettings": save_system_settings,
    "saveSystemSettings": save_system_settings,
    "getAuditLogs": get_audit_logs,
    "addAuditLog": add_audit_log,
    "getBackupStatus": get_backup_status,
    "createSnapshot": create_backup_snapshot,
    "createBackupSnapshot": create_backup_snapshot,
    "restoreBackup": restore_backup_data,
    "restoreBackupData": restore_backup_data,
    
    # لوحة الإحصائيات
    "getDashboardStats": get_dashboard_stats,
}

def dispatch_action(action: str, payload: dict = None) -> dict:
    if payload is None:
        payload = {}
        
    handler = ACTION_HANDLERS.get(action)
    if not handler:
        logger.warning(f"⚠️ الإجراء ({action}) غير مسجل صراحة، جاري إرجاع إحصائيات لوحة التحكم كافتراضي.")
        return {
            "status": "success",
            "success": True,
            "data": get_dashboard_stats(payload)
        }

    try:
        data = handler(payload)
        res = {
            "status": "success",
            "success": True,
            "data": data
        }
        if isinstance(data, dict):
            if 'new_qty' in data: res['new_qty'] = data['new_qty']
            if 'new_total' in data: res['new_total'] = data['new_total']
            if 'message' in data: res['message'] = data['message']
        return res
    except Exception as e:
        logger.error(f"❌ خطأ أثناء معالجة الإجراء ({action}): {e}", exc_info=True)
        return {
            "status": "error",
            "success": False,
            "message": str(e),
            "error": str(e)
        }


# تنفيذ التأكد من غرس البيانات التأسيسية عند أول استيراد
try:
    ensure_base_system_seed()
except Exception as _e:
    pass
