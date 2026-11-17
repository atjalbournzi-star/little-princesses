# scripts/verify_clean_endpoints.py
import urllib.request
import json
import sys

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

endpoints = {
    "العملاء (Customers)": "/api/customers",
    "المنتجات والموديلات (Products)": "/api/products",
    "أوامر التشغيل والطلبات (Orders)": "/api/orders",
    "فواتير المشتريات (Purchases)": "/api/purchases",
    "السندات المالية (Vouchers)": "/api/vouchers",
    "المصروفات التشغيلية (Expenses)": "/api/expenses",
    "الموظفين (Employees)": "/api/hr/employees",
    "خطوط إنتاج الورشة (Factory Pipeline)": "/api/factory",
    "شجرة الحسابات (Accounts)": "/api/accounts/list",
    "إحصائيات لوحة التحكم (Dashboard Stats)": "/api/dashboard/stats"
}

all_pass = True
print("=" * 70)
print("👑 Little Princesses ERP - Live API Endpoints Verification")
print("=" * 70)

for label, ep in endpoints.items():
    url = f"http://127.0.0.1:5000{ep}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "VerificationClient/1.0"})
        with urllib.request.urlopen(req, timeout=15) as res:
            status = res.status
            body = json.loads(res.read().decode('utf-8'))
            
            if ep == "/api/dashboard/stats":
                data = body.get("data", {})
                cust_cnt = data.get("customersCount", -1)
                ord_cnt = data.get("ordersCount", -1)
                prod_cnt = data.get("productsCount", -1)
                pur_cnt = data.get("purchasesCount", -1)
                tot_sales = data.get("totalSales", -1)
                tot_profit = data.get("netProfitEstimate", -1)
                
                print(f"📊 {label:<35} | Status: {status} | Sales: {tot_sales} | Profit: {tot_profit} | Cust: {cust_cnt} | Ord: {ord_cnt}")
                if cust_cnt != 0 or ord_cnt != 0 or prod_cnt != 0 or tot_sales != 0 or tot_profit != 0:
                    all_pass = False
            elif ep == "/api/accounts/list":
                count = body.get("count", len(body.get("data", [])))
                print(f"📋 {label:<35} | Status: {status} | الحسابات: {count} (هيكل فارغ)")
            else:
                count = body.get("count")
                if count is None:
                    count = len(body.get("data", []))
                status_icon = "✅" if count == 0 else "❌"
                if count != 0:
                    all_pass = False
                print(f"{status_icon} {label:<35} | Status: {status} | Count: {count}")
    except Exception as e:
        print(f"❌ {label:<35} | Error: {e}")
        all_pass = False

print("=" * 70)
if all_pass:
    print("👑 SUCCESS: All operational data points are exactly ZERO (0) and clean.")
else:
    print("⚠️ FAILURE: Some data points were not zero.")
sys.exit(0 if all_pass else 1)
