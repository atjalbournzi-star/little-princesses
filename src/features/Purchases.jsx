const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Purchases({ purchases = [], setPurchases, inventory = [], setInventory, accounts = [], setAccounts, vouchers = [], setVouchers, journal = [], setJournal, showToast, currency }) {
  const UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)'];
  const VALID_UNITS = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)', 'يارده', 'وار'];
  const genBillNo = () => {
    const lastNum = (purchases || []).reduce((acc, p) => {
      const match = String(p.bill_no || p.purchase_no || p.id || '').match(/PUR-(\d+)/);
      return match ? Math.max(acc, parseInt(match[1])) : acc;
    }, 1000);
    return `PUR-${lastNum + 1}`;
  };
  const defaultCurrency = (typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : (window.CURRENCIES ? window.CURRENCIES[0] : 'YER ﷼'));
  const defaultPayType = (typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : (window.PAY_METHODS ? window.PAY_METHODS[0] : 'نقدي'));
  const todayStrIso = typeof TODAY_STR_ISO !== 'undefined' ? TODAY_STR_ISO : (window.TODAY_STR_ISO || new Date().toISOString().slice(0, 10));

  const emptyHeader = () => ({ bill_no: '', supplier: '', supplier_phone: '', discount: '', notes: '', currency: defaultCurrency, exchange_rate: '', pay_type: defaultPayType, transfer_no: '', payment_source: '', receipt_url: '', date: todayStrIso, freight_cost: '', transfer_fees: '' });
  const emptyItem = () => ({ item: '', unit: 'متر', qty: '', price: '', total: '' });

  const [headerData, setHeaderData] = useState(emptyHeader);
  const [itemData, setItemData] = useState(emptyItem);
  const [editingIndex, setEditingIndex] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── نافذة تعديل سجل موجود وحالة القائمة المطوية ──
  const [editRecord, setEditRecord] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // ── رفع صورة السند ──
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return showToast('حجم الصورة كبير جداً (أقصاه 5 ميجابايت) ⚠️', 'error');
    const reader = new FileReader();
    reader.onloadend = () => { setHeaderData(prev => ({ ...prev, receipt_url: reader.result })); showToast('تم إرفاق صورة السند 🖼️'); };
    reader.readAsDataURL(file);
  };

  // ── الحاسبة التفاعلية ──
  const handleQtyChange = (val) => { const q = parseFloat(val)||0, p = parseFloat(itemData.price)||0; setItemData(prev => ({ ...prev, qty: val, total: q>0&&p>0 ? String((q*p).toFixed(2)) : prev.total })); };
  const handlePriceChange = (val) => { const p = parseFloat(val)||0, q = parseFloat(itemData.qty)||0; setItemData(prev => ({ ...prev, price: val, total: q>0&&p>0 ? String((q*p).toFixed(2)) : prev.total })); };
  const handleTotalChange = (val) => { const tot = parseFloat(val)||0, q = parseFloat(itemData.qty)||0; setItemData(prev => ({ ...prev, total: val, price: q>0&&tot>0 ? String((tot/q).toFixed(2)) : prev.price })); };

  // ── إضافة / تعديل صنف ──
  const handleAddOrUpdateItem = (e) => {
    e.preventDefault();
    if (!itemData.item.trim()) return showToast('اسم الصنف مطلوب ⚠️', 'error');
    const q = parseFloat(itemData.qty); if (!q || q <= 0) return showToast('الكمية مطلوبة ⚠️', 'error');
    let p = parseFloat(itemData.price)||0, tot = parseFloat(itemData.total)||0;
    if (tot>0&&p<=0) p=tot/q; else if (p>0&&tot<=0) tot=q*p;
    if (p<=0&&tot<=0) return showToast('السعر أو الإجمالي مطلوب ⚠️', 'error');
    const obj = { item: itemData.item.trim(), unit: itemData.unit||'متر', qty: q, price: parseFloat(p.toFixed(2)), total: parseFloat(tot.toFixed(2)) };
    if (editingIndex !== null) { const u=[...billItems]; u[editingIndex]=obj; setBillItems(u); setEditingIndex(null); showToast('تم تحديث الصنف ✏️'); }
    else { setBillItems(prev=>[...prev,obj]); showToast('تمت إضافة الصنف ➕'); }
    setItemData(emptyItem());
  };

  const rawItemsSum = billItems.reduce((acc,curr)=>acc+(parseFloat(curr.total)||0),0) + (parseFloat(headerData.freight_cost)||0) + (parseFloat(headerData.transfer_fees)||0);
  const discountVal = parseFloat(headerData.discount) || 0;
  const grandTotal = Math.max(0, rawItemsSum - discountVal);

  // ── حفظ الفاتورة الجديدة مع الربط الشامل بكافة الأقسام ──
  const handleSaveFullBill = async () => {
    if (isSaving) return;
    if (!headerData.supplier.trim()) return showToast('اسم المورد مطلوب ⚠️', 'error');
    if (billItems.length === 0) return showToast('الفاتورة فارغة! أضف صنفاً ⚠️', 'error');
    setIsSaving(true);
    const billNo = (headerData.bill_no || '').trim() || genBillNo();
    try {
      const payload = {
        bill_no: billNo,
        supplier: headerData.supplier,
        supplier_phone: headerData.supplier_phone || '',
        discount: discountVal,
        notes: headerData.notes || '',
        pay_type: headerData.pay_type || defaultPayType,
        payment_source: headerData.payment_source || '',
        transfer_no: headerData.transfer_no || '',
        currency: headerData.currency || defaultCurrency,
        date: headerData.date || todayStrIso,
        freight_cost: parseFloat(headerData.freight_cost) || 0,
        transfer_fees: parseFloat(headerData.transfer_fees) || 0,
        receipt_url: headerData.receipt_url || '',
        items: billItems.map(itm => ({
          item_name: itm.item,
          unit: itm.unit || 'متر',
          qty: parseFloat(itm.qty) || 0,
          cost: parseFloat(itm.price) || 0
        }))
      };

      // 1. الحفظ المحلي المتكامل في السيرفر (SQLite: مشتريات + مخزون + حركات + سند صرف + قيد يومية + أرصدة الحسابات)
      try {
        await fetch("/api/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.warn("Local purchases save warning:", e);
      }

      // 2. المزامنة السحابية الشاملة مع جداول بيانات Google Sheets (Strict 1-to-1 Schema)
      const purCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(headerData.currency || defaultCurrency) : 'YER';
      const purRate = purCurrCode === 'YER' ? 1.0 : (parseFloat(headerData.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(purCurrCode) : 1.0));
      const totalFreight = parseFloat(headerData.freight_cost) || 0;
      const totalFees = parseFloat(headerData.transfer_fees) || 0;

      for (let i = 0; i < billItems.length; i++) {
        const itm = billItems[i];
        const lineQty = parseFloat(itm.qty) || 0;
        const lineUnitPrice = parseFloat(itm.price) || 0;
        const lineOriginalAmount = parseFloat((lineQty * lineUnitPrice).toFixed(2));
        const itemFreight = i === 0 ? totalFreight : 0;
        const itemFees = i === 0 ? totalFees : 0;
        const itemDiscount = i === 0 ? discountVal : 0;
        const itemFreightYER = parseFloat((itemFreight * purRate).toFixed(2));
        const itemFeesYER = parseFloat((itemFees * purRate).toFixed(2));
        const itemDiscountYER = parseFloat((itemDiscount * purRate).toFixed(2));
        const lineTotalBaseYER = parseFloat((((lineOriginalAmount * purRate) + itemFreightYER + itemFeesYER) - itemDiscountYER).toFixed(2));

        try {
          await callGAS("addPurchase", {
            id: `PUR-${headerData.bill_no}${billItems.length > 1 ? `-${i + 1}` : ''}`,
            invoice_no: headerData.bill_no,
            bill_no: headerData.bill_no,
            purchase_no: headerData.bill_no,
            supplier_name: headerData.supplier,
            supplier: headerData.supplier,
            supplier_phone: headerData.supplier_phone || '',
            supplier_number: headerData.supplier_phone || '',
            phone: headerData.supplier_phone || '',
            discount: itemDiscount,
            discount_amount: itemDiscount,
            invoice_date: headerData.date || todayStrIso,
            date: headerData.date || todayStrIso,
            item_name: itm.item,
            fabric_name: itm.item,
            item: itm.item,
            unit: itm.unit || 'متر',
            quantity: lineQty,
            qty: lineQty,
            currency: purCurrCode,
            Original_Currency: purCurrCode,
            exchange_rate: purRate,
            exchangeRate: purRate,
            unit_price: lineUnitPrice,
            cost_per_unit: lineUnitPrice,
            price: lineUnitPrice,
            original_amount: lineOriginalAmount,
            originalAmount: lineOriginalAmount,
            amount_yer: parseFloat((lineOriginalAmount * purRate).toFixed(2)),
            base_amount: parseFloat((lineOriginalAmount * purRate).toFixed(2)),
            shipping_cost: itemFreight,
            freight_cost: itemFreight,
            transfer_fee: itemFees,
            transfer_fees: itemFees,
            grand_total_yer: lineTotalBaseYER,
            total_amount_yer: lineTotalBaseYER,
            payment_method: headerData.pay_type || defaultPayType,
            pay_type: headerData.pay_type || defaultPayType,
            payment_account_code: headerData.payment_source || (headerData.pay_type === 'آجل' ? '201' : '101'),
            payment_source: headerData.payment_source || (headerData.pay_type === 'آجل' ? '201' : '101'),
            transaction_ref: headerData.transfer_no || (`TX-${headerData.bill_no}`),
            transaction_id: headerData.transfer_no || (`TX-${headerData.bill_no}`),
            transfer_no: headerData.transfer_no || (`TX-${headerData.bill_no}`),
            receipt_attachment: headerData.receipt_url || '',
            receipt_url: headerData.receipt_url || '',
            receipt_status: 'تم الاستلام',
            status: 'تم الاستلام',
            payment_status: headerData.pay_type !== 'آجل' ? 'مدفوع' : 'غير مدفوع',
            notes: headerData.notes || '',
            location: 'المستودع الرئيسي'
          });
        } catch (gasErr) {
          console.warn("GAS Purchase Sync Warning:", gasErr);
        }
      }

      // 3. تحديث واجهة المشتريات (Purchases State)
      if (setPurchases) {
        const newPurchases = billItems.map((itm, idx) => ({
          id: `PUR-${Date.now()}-${idx}`,
          bill_no: headerData.bill_no,
          purchase_no: headerData.bill_no,
          supplier: headerData.supplier,
          supplier_name: headerData.supplier,
          supplier_phone: headerData.supplier_phone || '',
          discount: idx === 0 ? discountVal : 0,
          notes: headerData.notes || '',
          item: itm.item,
          item_name: itm.item,
          fabric_name: itm.item,
          unit: itm.unit || 'متر',
          qty: parseFloat(itm.qty) || 0,
          quantity: parseFloat(itm.qty) || 0,
          price: parseFloat(itm.price) || 0,
          cost_per_unit: parseFloat(itm.price) || 0,
          total: (parseFloat(itm.qty) || 0) * (parseFloat(itm.price) || 0),
          currency: headerData.currency || defaultCurrency,
          pay_type: headerData.pay_type || defaultPayType,
          payment_source: headerData.payment_source || '',
          date: headerData.date || todayStrIso,
          transfer_no: headerData.transfer_no || '',
          freight_cost: parseFloat(headerData.freight_cost) || 0,
          transfer_fees: parseFloat(headerData.transfer_fees) || 0,
          receipt_url: headerData.receipt_url || '',
          payment_status: headerData.pay_type !== 'آجل' ? 'مدفوع' : 'غير مدفوع',
          status: 'تم الاستلام'
        }));
        setPurchases(prev => [...newPurchases, ...(prev || [])]);
      }

      // 4. تحديث واجهة المخزون والمستودعات (Inventory & Warehouses State)
      if (setInventory) {
        setInventory(prev => {
          let updated = [...(prev || [])];
          for (const itm of billItems) {
            const idx = updated.findIndex(i => (i.item_name || i.name) === itm.item);
            const q = parseFloat(itm.qty) || 0;
            const p = parseFloat(itm.price) || 0;
            if (idx !== -1) {
              const curQ = parseFloat(updated[idx].quantity_meters || updated[idx].quantity || updated[idx].qty || 0);
              const curC = parseFloat(updated[idx].cost_per_meter || updated[idx].unit_cost || updated[idx].cost || 0);
              const curAvail = parseFloat(updated[idx].available_qty || curQ);
              const newQ = curQ + q;
              const newAvail = curAvail + q;
              const newC = newQ > 0 ? (((curQ * curC) + (q * p)) / newQ) : p;
              const weightedCost = parseFloat(newC.toFixed(2));
              updated[idx] = {
                ...updated[idx],
                quantity_meters: newQ,
                quantity: newQ,
                qty: newQ,
                available_qty: newAvail,
                cost_per_meter: weightedCost,
                unit_cost: weightedCost,
                cost: weightedCost,
                total_value: parseFloat((newQ * weightedCost).toFixed(2)),
                supplier_id: headerData.supplier,
                location: updated[idx].location || 'المستودع الرئيسي',
                updated_at: todayStrIso
              };
            } else {
              updated.unshift({
                id: `MAT-${Date.now()}`,
                item_name: itm.item,
                name: itm.item,
                item_code: `MAT-${Math.floor(100 + Math.random() * 900)}`,
                category: 'أقمشة وخامات',
                type: 'خامة',
                quantity_meters: q,
                quantity: q,
                qty: q,
                available_qty: q,
                reserved_qty: 0,
                min_limit: 5,
                min_alert_qty: 5,
                cost_per_meter: p,
                unit_cost: p,
                cost: p,
                total_value: parseFloat((q * p).toFixed(2)),
                unit: itm.unit || 'متر',
                currency: headerData.currency || defaultCurrency,
                supplier_id: headerData.supplier,
                location: 'المستودع الرئيسي',
                status: 'متوفر',
                supply_date: headerData.date || todayStrIso,
                created_at: headerData.date || todayStrIso
              });
            }
          }
          return updated;
        });
      }

      // 5. تحديث واجهة السندات المالية (Vouchers & Payments State)
      const purBaseObj = window.CurrencyService ? window.CurrencyService.toBase(grandTotal, purCurrCode, purRate) : { base_amount: grandTotal, exchange_rate: purRate };

      if (setVouchers && headerData.pay_type !== 'آجل') {
        const newVoucher = {
          id: `VOUCH-${Date.now()}`,
          voucher_no: `PV-${headerData.bill_no}`,
          voucher_type: 'سند صرف',
          party_name: headerData.supplier,
          supplier_id: headerData.supplier,
          amount: grandTotal,
          currency: purCurrCode,
          exchange_rate: purRate,
          base_amount: purBaseObj.base_amount,
          pay_method: headerData.pay_type || defaultPayType,
          payment_source: headerData.payment_source || '101 - الصندوق الرئيسي',
          transfer_no: headerData.transfer_no || '',
          image_path: headerData.receipt_url || '',
          receipt_url: headerData.receipt_url || '',
          date_created: headerData.date || todayStrIso,
          date: headerData.date || todayStrIso,
          statement: `سند صرف مشتريات للفاتورة ${headerData.bill_no} - المورد: ${headerData.supplier}`,
          notes: `سند صرف مشتريات للفاتورة ${headerData.bill_no} - المورد: ${headerData.supplier}`
        };
        setVouchers(prev => [newVoucher, ...(prev || [])]);
      }

      // 6. تحديث واجهة القيود اليومية (Journal Entries State)
      if (setJournal) {
        const debitAccount = '102'; // مخزون الأقمشة
        const creditAccount = headerData.pay_type !== 'آجل' 
          ? (headerData.payment_source ? headerData.payment_source.split(' - ')[0] : '101')
          : '201'; // ذمم الموردين
        
        const newJournalEntry = {
          id: Date.now() + 2,
          transaction_id: `TX-PUR-${headerData.bill_no}`,
          entry_no: `JV-PUR-${headerData.bill_no}`,
          debit: debitAccount,
          credit: creditAccount,
          debit_account_id: debitAccount,
          credit_account_id: creditAccount,
          amount: grandTotal,
          currency: purCurrCode,
          exchange_rate: purRate,
          base_amount: purBaseObj.base_amount,
          ref_type: 'PURCHASE',
          ref_id: headerData.bill_no,
          date: headerData.date || todayStrIso,
          notes: `قيد مشتريات الفاتورة ${headerData.bill_no} - المورد: ${headerData.supplier}`
        };
        setJournal(prev => [newJournalEntry, ...(prev || [])]);
      }

      // 7. تحديث أرصدة شجرة الحسابات (Accounts Balance State)
      if (setAccounts) {
        setAccounts(prev => {
          return (prev || []).map(acc => {
            const code = String(acc.acc_code || acc.code || acc.account_code || '');
            const paySourceCode = headerData.payment_source ? headerData.payment_source.split(' - ')[0] : '101';
            
            // خصم من الصندوق أو البنك عند الدفع النقدي/الحوالة
            if (headerData.pay_type !== 'آجل' && code === paySourceCode) {
              const curBal = parseFloat(acc.balance || acc.current_balance || 0);
              return { ...acc, balance: curBal - grandTotal, current_balance: curBal - grandTotal };
            }
            // زيادة التزامات الموردين عند الشراء الآجل
            if (headerData.pay_type === 'آجل' && (code === '201' || code === '2101')) {
              const curBal = parseFloat(acc.balance || acc.current_balance || 0);
              return { ...acc, balance: curBal + grandTotal, current_balance: curBal + grandTotal };
            }
            return acc;
          });
        });
      }

      showToast(`✅ تم حفظ الفاتورة ${billNo} وتوريد الأصناف للمخزون وترحيل القيود وسندات الصرف بنجاح 👑`);
      
      setHeaderData(emptyHeader());
      setBillItems([]); setItemData(emptyItem()); setEditingIndex(null);
    } catch(err) { 
      console.error(err); 
      showToast('خطأ أثناء الحفظ ⚠️ يرجى المحاولة مرة أخرى', 'error'); 
    } finally {
      setIsSaving(false);
    }
  };

  // ── تعديل سجل موجود ──
  const handleOpenEdit = (p) => {
    const VALID_UNITS_CHECK = ['متر', 'وار (ياردة)', 'سم', 'حبة (قطعة)', 'رول (طاقة)', 'يارده', 'وار'];
    let rawUnit=p.unit, rawQty=p.qty, rawPrice=p.price, rawTotal=p.total;
    const unitIsNum = rawUnit!==undefined && rawUnit!=='' && !isNaN(parseFloat(rawUnit)) && !VALID_UNITS_CHECK.includes(String(rawUnit));
    if (unitIsNum) { rawQty=parseFloat(rawUnit); rawPrice=parseFloat(p.qty)||0; rawTotal=parseFloat(p.price)||0; rawUnit='متر'; }
    setEditRecord({
      ...p,
      item: p.item||p.item_name||'',
      unit: rawUnit||'متر',
      qty: rawQty||'',
      price: rawPrice||'',
      total: rawTotal||'',
      supplier_phone: p.supplier_phone || p.phone || p.supplier_number || '',
      discount: p.discount !== undefined ? p.discount : (p.discount_amount || ''),
      notes: p.notes || ''
    });
  };

  const handleEditRecordChange = (field, val) => {
    setEditRecord(prev => {
      const updated = { ...prev, [field]: val };
      if (field==='qty'||field==='price') { const q=parseFloat(updated.qty)||0, p2=parseFloat(updated.price)||0; if(q>0&&p2>0) updated.total=String((q*p2).toFixed(2)); }
      if (field==='total') { const tot=parseFloat(val)||0, q=parseFloat(updated.qty)||0; if(q>0&&tot>0) updated.price=String((tot/q).toFixed(2)); }
      return updated;
    });
  };

  const handleSaveEditRecord = async () => {
    if (!editRecord) return;
    if (!editRecord.item || !String(editRecord.item).trim()) return showToast('اسم الصنف مطلوب ⚠️', 'error');
    const qty = parseFloat(editRecord.qty)||0;
    if (qty <= 0) return showToast('الكمية مطلوبة ⚠️', 'error');
    let price = parseFloat(editRecord.price)||0, total = parseFloat(editRecord.total)||0;
    if (total>0&&price<=0) price=total/qty;
    else if (price>0&&total<=0) total=qty*price;
    setEditSaving(true);
    try {
      const payload = {
        id: String(editRecord.id),
        bill_no: editRecord.bill_no,
        supplier: editRecord.supplier,
        supplier_name: editRecord.supplier,
        supplier_phone: editRecord.supplier_phone || '',
        discount: parseFloat(editRecord.discount) || 0,
        notes: editRecord.notes || '',
        item: String(editRecord.item).trim(),
        item_name: String(editRecord.item).trim(),
        unit: editRecord.unit||'متر',
        qty,
        price: parseFloat(price.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        currency: editRecord.currency,
        pay_type: editRecord.pay_type,
        transfer_no: editRecord.transfer_no||'',
        payment_source: editRecord.payment_source||'',
        date: editRecord.date
      };

      try {
        await fetch('/api/purchases/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch(beErr) {
        console.warn("Backend purchase update warning:", beErr);
      }

      await callGAS('updatePurchase', payload);
      if (setPurchases) setPurchases(prev => prev.map(r => String(r.id)===String(editRecord.id) ? { ...r, ...payload } : r));
      showToast('✅ تم تحديث السجل في Google Sheets بنجاح');
      setEditRecord(null);
    } catch(err) { console.error(err); showToast('خطأ أثناء التحديث ⚠️', 'error'); }
    setEditSaving(false);
  };

  const handleDeleteRecord = async (p) => {
    if (!window.confirm(`هل أنت متأكد من حذف الفاتورة ${p.bill_no||p.id}؟`)) return;
    try {
      await fetch('/api/purchases/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, bill_no: p.bill_no })
      }).catch(e => console.warn(e));

      await callGAS('deletePurchase', { id: String(p.id) });
      if (setPurchases) setPurchases(prev => prev.filter(r => String(r.id) !== String(p.id)));
      showToast('🗑️ تم حذف السجل من Google Sheets');
    } catch(err) { showToast('خطأ أثناء الحذف ⚠️', 'error'); }
  };

  // ── تصفير وحذف كافة السجلات التالفة السابقة من Google Sheets ──
  const handlePurgeAllPurchases = async () => {
    if (!window.confirm("⚠️ تحذير: هل أنت متأكد من رغبتك في تصفير وحذف كافة سجلات المشتريات التالفة السابقة وإعادة هيكلة الجدول وترتيب الأعمدة بدقة 100%؟")) return;
    setIsPurging(true);
    try {
      try {
        await fetch("/api/purchases/purge", { method: "POST" });
      } catch(e) {}
      await callGAS("purgePurchasesSheetData", {});
      if (setPurchases) setPurchases([]);
      showToast("👑 تم تصفير كافة السجلات التالفة السابقة وإعادة بناء جدول المشتريات بنجاح 100%");
    } catch (err) {
      console.error(err);
      showToast("تعذر تصفير السجلات: " + (err.message || err), "error");
    } finally {
      setIsPurging(false);
    }
  };

  const normalizePurchase = (p) => {
    if (!p || typeof p !== 'object') return { qty: 0, price: 0, total: 0, unit: 'متر', date: '', transfer: '', supplier_phone: '', discount: 0, notes: '' };
    let rawUnit = p.unit, rawQty = p.qty !== undefined ? p.qty : p.quantity, rawPrice = p.price !== undefined ? p.price : p.cost_per_unit, rawTotal = p.total !== undefined ? p.total : (p.total_amount_yer || p.base_amount), rawDate = p.date, rawTransfer = p.transfer_no;
    const unitIsNum = rawUnit !== undefined && rawUnit !== '' && !isNaN(parseFloat(rawUnit)) && !VALID_UNITS.includes(String(rawUnit));
    if (unitIsNum) { rawQty = parseFloat(rawUnit); rawPrice = parseFloat(p.qty) || 0; rawTotal = parseFloat(p.price) || 0; rawUnit = 'متر'; }
    const transferIsDate = rawTransfer && /^\d{4}-\d{2}-\d{2}/.test(String(rawTransfer));
    if (transferIsDate) { if (!rawDate || rawDate === '') rawDate = String(rawTransfer).slice(0, 10); rawTransfer = ''; }
    if (rawDate && String(rawDate).includes('T')) rawDate = String(rawDate).slice(0, 10);
    const qty = parseFloat(rawQty || 0), price = parseFloat(rawPrice || 0);
    let total = parseFloat(rawTotal || 0); if (total <= 0 && qty > 0 && price > 0) total = qty * price;
    return {
      qty,
      price,
      total,
      unit: VALID_UNITS.includes(String(rawUnit)) ? rawUnit : (rawUnit || 'متر'),
      date: String(rawDate || ''),
      transfer: String(rawTransfer || ''),
      supplier_phone: String(p.supplier_phone || p.phone || p.supplier_number || ''),
      discount: parseFloat(p.discount !== undefined ? p.discount : (p.discount_amount || 0)) || 0,
      notes: String(p.notes || '')
    };
  };

  const filteredPurchases = useMemo(() => {
    const list = Array.isArray(purchases) ? purchases : [];
    const q = String(search || '').trim().toLowerCase();
    return list.filter(p => {
      if (!p || typeof p !== 'object') return false;
      const itemName = String(p.fabric_name || p.item || p.item_name || '');
      const billNo = String(p.bill_no || p.purchase_no || '');
      const supplier = String(p.supplier || p.supplier_name || '');
      const transferNo = String(p.transfer_no || '');
      return !q ||
        billNo.toLowerCase().includes(q) ||
        supplier.toLowerCase().includes(q) ||
        itemName.toLowerCase().includes(q) ||
        transferNo.toLowerCase().includes(q);
    });
  }, [purchases, search]);

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#8F2A87] focus:ring-2 focus:ring-[#F2E7F3] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-xs text-right" dir="rtl">

      {/* نافذة معاينة الصورة */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={()=>setPreviewImage(null)}>
          <div className="relative max-w-2xl w-full bg-white p-4 rounded-2xl border border-[#E8E5EA] shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-[#E8E5EA] pb-3 mb-3">
              <span className="font-bold text-[#25232A] text-xs">🖼️ صورة السند المرفق</span>
              <button onClick={()=>setPreviewImage(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold px-2">✕</button>
            </div>
            <img src={previewImage} alt="السند" className="w-full max-h-[75vh] object-contain rounded-xl border border-[#E8E5EA]" />
          </div>
        </div>
      )}

      {/* ── نافذة تعديل سجل موجود ── */}
      {editRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={()=>setEditRecord(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-4 border border-[#E8E5EA]" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-[#E8E5EA] pb-3">
              <h3 className="font-bold text-[#25232A] text-sm">✏️ تعديل سجل مشتريات — {editRecord.bill_no||editRecord.id}</h3>
              <button onClick={()=>setEditRecord(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <label className={labelCls}>اسم الصنف / القماش *</label>
                <input type="text" className={inputCls} placeholder="أدخل اسم الصنف" value={editRecord.item||''} onChange={e=>handleEditRecordChange('item',e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>وحدة القياس</label>
                <select className={inputCls} value={editRecord.unit||'متر'} onChange={e=>handleEditRecordChange('unit',e.target.value)}>
                  {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>الكمية *</label>
                <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold"} value={editRecord.qty||''} onChange={e=>handleEditRecordChange('qty',e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>السعر الإفرادي</label>
                <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-[#8F2A87]"} value={editRecord.price||''} onChange={e=>handleEditRecordChange('price',e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>الخصم والتخفيض</label>
                <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-[#D64545]"} placeholder="0.00" value={editRecord.discount||''} onChange={e=>handleEditRecordChange('discount',e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>الإجمالي</label>
                <input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-[#007F8C] bg-[#FAFAFB]"} value={editRecord.total||''} onChange={e=>handleEditRecordChange('total',e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>اسم المورد</label>
                <input type="text" className={inputCls} value={editRecord.supplier||''} onChange={e=>handleEditRecordChange('supplier',e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>رقم هاتف المورد 📱</label>
                <input type="text" className={inputCls + " font-mono"} placeholder="مثال: 777123456" value={editRecord.supplier_phone||''} onChange={e=>handleEditRecordChange('supplier_phone',e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>رقم الحوالة</label>
                <input type="text" className={inputCls} placeholder="TRF-12345" value={editRecord.transfer_no||''} onChange={e=>handleEditRecordChange('transfer_no',e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>حساب الدفع</label>
                <select className={inputCls} value={editRecord.payment_source||''} onChange={e=>handleEditRecordChange('payment_source',e.target.value)}>
                  <option value="">-- اختر --</option>
                  {(accounts||[]).map(a=>{
                    const c = a.acc_code || a.code || a.account_code || '';
                    const n = a.acc_name || a.name || a.account_name || '';
                    const label = n ? `${c} - ${n}` : String(c);
                    return <option key={c} value={label}>{label}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className={labelCls}>التاريخ</label>
                <input type="date" className={inputCls} value={editRecord.date||''} onChange={e=>handleEditRecordChange('date',e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>الملاحظات والبيان 📝</label>
                <input type="text" className={inputCls} placeholder="ملاحظات وتفاصيل الفاتورة" value={editRecord.notes||''} onChange={e=>handleEditRecordChange('notes',e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-[#E8E5EA]">
              <button onClick={handleSaveEditRecord} disabled={editSaving} className="flex-1 py-3 bg-[#009FAE] hover:bg-[#007F8C] disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer">
                {editSaving ? 'جاري الحفظ...' : 'حفظ التعديلات في Google Sheets ☁️'}
              </button>
              <button onClick={()=>setEditRecord(null)} className="px-5 py-3 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold rounded-xl border border-[#E8E5EA]">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── بطاقة الفاتورة الجديدة ── */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-5">
        <div className="border-b border-[#E8E5EA] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#F2E7F3] text-[#8F2A87] flex items-center justify-center font-bold">🛒</span>
            <div>
              <h2 className="font-bold text-sm text-[#25232A]">فاتورة مشتريات وتوريد جديدة</h2>
              <p className="text-[11px] text-[#6F6B75]">إصدار فاتورة شراء، توريد المخزون، وتوليد القيود وسندات الصرف آلياً</p>
            </div>
          </div>
          {headerData.bill_no ? (
            <span className="text-[#8F2A87] font-mono font-bold text-xs bg-[#F2E7F3] px-3 py-1 rounded-xl">{headerData.bill_no}</span>
          ) : (
            <span className="text-[#6F6B75] font-bold text-xs bg-[#FAFAFB] border border-[#E8E5EA] px-3 py-1 rounded-xl">فاتورة جديدة</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-[#FAFAFB] rounded-2xl border border-[#E8E5EA]">
          <div><label className={labelCls}>رقم الفاتورة</label><input type="text" className={inputCls + " font-mono"} placeholder="" value={headerData.bill_no} onChange={e=>setHeaderData(p=>({...p,bill_no:e.target.value}))} /></div>
          <div><label className={labelCls}>اسم المورد *</label><input type="text" className={inputCls} placeholder="" value={headerData.supplier} onChange={e=>setHeaderData(p=>({...p,supplier:e.target.value}))} /></div>
          <div><label className={labelCls}>رقم هاتف المورد 📱</label><input type="text" className={inputCls + " font-mono"} placeholder="مثال: 777123456" value={headerData.supplier_phone} onChange={e=>setHeaderData(p=>({...p,supplier_phone:e.target.value}))} /></div>
          <div><label className={labelCls}>العملة</label>
            <select className={inputCls} value={headerData.currency} onChange={e=>setHeaderData(p=>({...p,currency:e.target.value, exchange_rate: window.CurrencyService ? window.CurrencyService.getRate(e.target.value) : ''}))}>
              {(typeof CURRENCIES !== 'undefined' ? CURRENCIES : ['YER ﷼','SAR ﷼','USD $']).map(c=>{const v=typeof c==='object'?c.value:c,l=typeof c==='object'?c.label:c;return <option key={v} value={v}>{l}</option>;})}
            </select>
          </div>
          {headerData.currency && window.CurrencyService && window.CurrencyService.normalizeCode(headerData.currency) !== 'YER' && (
            <div>
              <label className={labelCls}>سعر الصرف (1 {window.CurrencyService.normalizeCode(headerData.currency)} = ? YER)</label>
              <input type="number" step="0.01" className={inputCls + " font-mono font-bold text-[#8F2A87] bg-amber-50"} value={headerData.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(headerData.currency) : 1)} onChange={e=>setHeaderData(p=>({...p, exchange_rate: e.target.value}))} />
            </div>
          )}
          <div><label className={labelCls}>الخصم والتخفيض 💸</label><input type="number" step="0.01" min="0" className={inputCls + " font-mono font-bold text-[#D64545]"} placeholder="0.00" value={headerData.discount} onChange={e=>setHeaderData(p=>({...p,discount:e.target.value}))} /></div>
          <div><label className={labelCls}>طريقة الدفع</label>
            <select className={inputCls} value={headerData.pay_type} onChange={e=>setHeaderData(p=>({...p,pay_type:e.target.value}))}>
              {(typeof PAY_METHODS!=='undefined'?PAY_METHODS:['نقدي','حوالة بنكية','آجل']).map(pt=><option key={pt} value={pt}>{pt}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>حساب الدفع</label>
            <select className={inputCls} value={headerData.payment_source} onChange={e=>setHeaderData(p=>({...p,payment_source:e.target.value}))}>
              <option value="">-- اختر حساب الدفع --</option>
              {(accounts||[]).map(a=>{
                const c = a.acc_code || a.code || a.account_code || '';
                const n = a.acc_name || a.name || a.account_name || '';
                const label = n ? `${c} - ${n}` : String(c);
                return <option key={c} value={label}>{label}</option>;
              })}
            </select>
          </div>
          <div><label className={labelCls}>رقم الحوالة</label><input type="text" className={inputCls + " text-[#8F2A87] font-mono"} placeholder="" value={headerData.transfer_no} onChange={e=>setHeaderData(p=>({...p,transfer_no:e.target.value}))} /></div>
          <div><label className={labelCls}>إرفاق صورة السند</label>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer bg-white hover:bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A] font-bold p-2.5 rounded-xl text-center flex items-center justify-center h-11">📷 اختر صورة<input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
              {headerData.receipt_url && <button type="button" onClick={()=>setPreviewImage(headerData.receipt_url)} className="p-2 bg-[#E2F5F7] text-[#007F8C] rounded-xl font-bold border border-[#C5ECF0] h-11 px-3">🖼️</button>}
            </div>
          </div>
          <div><label className={labelCls}>تاريخ الفاتورة</label><input type="date" className={inputCls} value={headerData.date} onChange={e=>setHeaderData(p=>({...p,date:e.target.value}))} /></div>
          <div><label className={labelCls}>تكلفة النقل والتوصيل</label><input type="number" step="0.01" min="0" className={inputCls + " font-mono font-bold text-[#8F2A87]"} placeholder="0.00" value={headerData.freight_cost} onChange={e=>setHeaderData(p=>({...p,freight_cost:e.target.value}))} /></div>
          <div><label className={labelCls}>رسوم التحويل</label><input type="number" step="0.01" min="0" className={inputCls + " font-mono font-bold text-[#D64545]"} placeholder="0.00" value={headerData.transfer_fees} onChange={e=>setHeaderData(p=>({...p,transfer_fees:e.target.value}))} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><label className={labelCls}>ملاحظات الفاتورة والبيان 📝</label><input type="text" className={inputCls} placeholder="ملاحظات وتفاصيل الفاتورة" value={headerData.notes} onChange={e=>setHeaderData(p=>({...p,notes:e.target.value}))} /></div>
        </div>

        {/* نموذج الصنف */}
        <form onSubmit={handleAddOrUpdateItem} className="p-5 bg-[#FAFAFB] border border-[#E8E5EA] rounded-2xl space-y-3.5">
          <div className="flex justify-between items-center border-b border-[#E8E5EA] pb-2">
            <span className="font-bold text-[#25232A]">{editingIndex!==null?'✏️ تعديل بيانات الصنف':'➕ إضافة صنف جديد للفاتورة'}</span>
            {editingIndex!==null&&<button type="button" onClick={()=>{setEditingIndex(null);setItemData(emptyItem());}} className="text-[#D64545] font-bold underline">إلغاء</button>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
            <div className="col-span-2 sm:col-span-2"><label className={labelCls}>اسم الصنف / القماش *</label><input type="text" required className={inputCls} placeholder="" value={itemData.item} onChange={e=>setItemData(p=>({...p,item:e.target.value}))} /></div>
            <div><label className={labelCls}>وحدة القياس</label><select className={inputCls} value={itemData.unit} onChange={e=>setItemData(p=>({...p,unit:e.target.value}))}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
            <div><label className={labelCls}>الكمية</label><input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold"} placeholder="" value={itemData.qty} onChange={e=>handleQtyChange(e.target.value)} /></div>
            <div><label className={labelCls}>السعر الإفرادي</label><input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-[#8F2A87]"} placeholder="" value={itemData.price} onChange={e=>handlePriceChange(e.target.value)} /></div>
            <div><label className={labelCls}>الإجمالي</label><input type="number" step="0.01" min="0" className={inputCls + " text-center font-mono font-bold text-[#007F8C] bg-[#E2F5F7]"} placeholder="" value={itemData.total} onChange={e=>handleTotalChange(e.target.value)} /></div>
          </div>
          <button type="submit" className={`w-full py-3 font-bold text-xs rounded-xl transition shadow-xs cursor-pointer ${editingIndex!==null?'bg-[#F28A00] hover:bg-[#D97706] text-white':'bg-[#8F2A87] hover:bg-[#73216C] text-white'}`}>{editingIndex!==null?'💾 تحديث الصنف':'➕ إضافة الصنف إلى الفاتورة'}</button>
        </form>

        {/* مسودة الفاتورة */}
        {billItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="font-bold text-[#25232A]">📋 أصناف الفاتورة الحالية ({billItems.length} صنف)</span><span className="font-bold text-[#8F2A87] font-mono">إجمالي الفاتورة: {grandTotal.toLocaleString()} {headerData.currency}</span></div>
            <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
              <table className="w-full text-right text-xs">
                <thead><tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]"><th className="p-3">#</th><th className="p-3">الصنف</th><th className="p-3 text-center">الوحدة</th><th className="p-3 text-center">الكمية</th><th className="p-3 text-center">السعر</th><th className="p-3 text-center">الإجمالي</th><th className="p-3 text-center">إجراءات</th></tr></thead>
                <tbody className="divide-y divide-[#E8E5EA] bg-white">
                  {billItems.map((bi,idx)=>(
                    <tr key={idx} className={editingIndex===idx?'bg-[#FFF1DC]':'hover:bg-[#FAFAFB]'}>
                      <td className="p-3 text-[#6F6B75]">{idx+1}</td>
                      <td className="p-3 font-bold text-[#25232A]">{bi.item}</td>
                      <td className="p-3 text-center"><span className="bg-[#F2E7F3] text-[#8F2A87] px-2 py-0.5 rounded-md text-[10.5px] font-semibold">{bi.unit}</span></td>
                      <td className="p-3 text-center font-bold font-mono">{bi.qty}</td>
                      <td className="p-3 text-center text-[#8F2A87] font-bold font-mono">{bi.price} {headerData.currency}</td>
                      <td className="p-3 text-center font-bold font-mono text-[#007F8C]">{parseFloat(bi.total).toLocaleString()} {headerData.currency}</td>
                      <td className="p-3 text-center space-x-1 space-x-reverse">
                        <button type="button" onClick={()=>{setItemData({item:bi.item,unit:bi.unit||'متر',qty:String(bi.qty),price:String(bi.price),total:String(bi.total)});setEditingIndex(idx);}} className="w-7 h-7 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg font-bold border border-[#E8E5EA]">✏️</button>
                        <button type="button" onClick={()=>{setBillItems(prev=>prev.filter((_,i)=>i!==idx));if(editingIndex===idx){setEditingIndex(null);setItemData(emptyItem());}}} className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-[#D64545] rounded-lg font-bold border border-rose-200">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button 
              type="button" 
              onClick={handleSaveFullBill} 
              disabled={isSaving}
              className={`w-full py-3.5 ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#009FAE] hover:bg-[#007F8C] cursor-pointer'} text-white font-bold text-xs rounded-xl shadow-xs transition`}
            >
              {isSaving ? '⏳ جاري حفظ الفاتورة وتوريد الأصناف للمخزون...' : `☁️ حفظ الفاتورة وتوريد الأصناف للمخزون (${billItems.length} أصناف) — الإجمالي: ${grandTotal.toLocaleString()} ${headerData.currency}`}
            </button>
          </div>
        )}
      </div>

      {/* ── سجل المشتريات القابل للطي (Collapsible Accordion Card) ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300">
        {/* Header Bar */}
        <div className="p-5 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white border-b border-[#E8E5EA]">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="flex items-center gap-2.5 text-right cursor-pointer group focus:outline-none"
            >
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-transform duration-300 ${
                isHistoryOpen ? 'bg-[#8F2A87] text-white rotate-180' : 'bg-[#F2E7F3] text-[#8F2A87]'
              }`}>
                ▼
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#25232A] group-hover:text-[#8F2A87] transition-colors">
                    سجل المشتريات والفواتير السحابية
                  </h3>
                  <span className="text-xs bg-[#F2E7F3] text-[#8F2A87] font-bold px-2.5 py-0.5 rounded-full font-mono">
                    {filteredPurchases.length} فاتورة
                  </span>
                </div>
                <p className="text-[11px] text-[#6F6B75]">
                  {isHistoryOpen ? 'انقر لطي وإخفاء جدول السجل' : 'انقر لتوسيع واستعراض سجل الفواتير والموردين'}
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); if (!isHistoryOpen) setIsHistoryOpen(true); }}
                className="pl-3 pr-8 h-9 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#8F2A87] outline-none"
                placeholder="بحث برقم الفاتورة أو المورد..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
            </div>

            {/* Purge Button */}
            <button
              type="button"
              onClick={handlePurgeAllPurchases}
              disabled={isPurging}
              title="مسح وتصفير كافة السجلات التالفة السابقة من Google Sheets"
              className="h-9 px-3 bg-rose-50 hover:bg-rose-100 text-[#D64545] font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isPurging ? (
                <>
                  <div className="w-3 h-3 border-2 border-[#D64545] border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري التصفير...</span>
                </>
              ) : (
                <>
                  <span>🗑️</span>
                  <span className="hidden sm:inline">تصفير السجلات التالفة</span>
                </>
              )}
            </button>

            {/* Toggle Accordion Button */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="h-9 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isHistoryOpen ? 'إخفاء' : 'عرض السجل'}</span>
              <span>{isHistoryOpen ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Body */}
        {isHistoryOpen && (
          <div className="p-5 space-y-4 animate-fade-in">
            {filteredPurchases.length === 0 ? (
              <div className="text-center py-12 text-[#6F6B75] font-medium bg-[#FAFAFB] rounded-xl border border-dashed border-[#E8E5EA]">
                لا توجد فواتير مسجلة تطابق البحث 🛍️
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                      <th className="p-3">رقم الفاتورة</th>
                      <th className="p-3">المورد</th>
                      <th className="p-3">هاتف المورد 📱</th>
                      <th className="p-3">الصنف / القماش</th>
                      <th className="p-3 text-center">الوحدة</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-center">السعر والعملة</th>
                      <th className="p-3 text-center text-[#D64545]">الخصم 💸</th>
                      <th className="p-3 text-center font-bold text-[#8F2A87]">الصافي (YER)</th>
                      <th className="p-3">حساب الصندوق / الدفع</th>
                      <th className="p-3 text-center">طريقة الدفع</th>
                      <th className="p-3 text-center">النقل والرسوم</th>
                      <th className="p-3">الملاحظات 📝</th>
                      <th className="p-3 text-center">السند</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5EA] bg-white">
                    {filteredPurchases.map((p, idx) => {
                      const n = normalizePurchase(p);
                      const itemName = p.fabric_name || p.item || p.item_name || '';
                      const supplier = p.supplier_name || p.supplier || '—';
                      const billNo = p.purchase_no || p.bill_no || '—';
                      const currRaw = p.currency || p.Original_Currency || 'YER';
                      const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(currRaw) : (String(currRaw).includes('SAR') ? 'SAR' : (String(currRaw).includes('USD') ? 'USD' : 'YER'));
                      const isForeign = currCode !== 'YER';
                      const rate = parseFloat(p.exchange_rate || p.exchangeRate) || (window.CurrencyService ? window.CurrencyService.getRate(currCode) : (currCode === 'SAR' ? 142 : (currCode === 'USD' ? 535 : 1)));
                      const freight = parseFloat(p.freight_cost || p.shipping_cost) || 0;
                      const fees = parseFloat(p.transfer_fees || p.transfer_fee) || 0;
                      const discountAmt = parseFloat(n.discount) || 0;
                      const origAmount = parseFloat(p.subtotal_original || p.original_amount || p.originalAmount) || (n.qty > 0 && n.price > 0 ? (n.qty * n.price) : n.total);
                      const netOriginal = Math.max(0, origAmount - discountAmt);
                      const grandTotalYER = parseFloat(p.grand_total_yer || p.total_amount_yer) || (isForeign ? ((netOriginal * rate) + (freight * rate) + (fees * rate)) : (netOriginal + freight + fees));
                      const paySrc = p.payment_source || p.payment_account_code || '101 - الصندوق الرئيسي';
                      const payType = p.pay_type || p.payment_method || 'نقدي';

                      return (
                        <tr key={p.id||idx} className="hover:bg-[#FAFAFB] transition-colors">
                          <td className="p-3 font-mono font-bold text-[#8F2A87]">{billNo}</td>
                          <td className="p-3 font-bold text-[#25232A]">{supplier}</td>
                          <td className="p-3 font-mono text-xs text-[#6F6B75]">
                            {n.supplier_phone ? (
                              <span className="bg-[#FAFAFB] px-2 py-0.5 rounded-md border border-[#E8E5EA] text-[#25232A]">
                                {n.supplier_phone}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="p-3 font-bold text-[#25232A]">
                            {itemName ? itemName : <span className="text-[#D64545] font-bold text-[10.5px] cursor-pointer underline" onClick={()=>handleOpenEdit(p)}>⚠️ فارغ — تعديل</span>}
                          </td>
                          <td className="p-3 text-center"><span className="bg-[#F2E7F3] text-[#8F2A87] px-2 py-0.5 rounded-md text-[10.5px] font-semibold">{n.unit}</span></td>
                          <td className="p-3 text-center font-bold font-mono tabular-nums">{n.qty>0?n.qty.toLocaleString('en-US'):'—'}</td>
                          <td className="p-3 text-center text-[#8F2A87] font-bold font-mono tabular-nums">
                            {n.price > 0 ? `${n.price.toLocaleString('en-US')} ${currCode}` : '—'}
                          </td>
                          <td className="p-3 text-center font-mono tabular-nums">
                            {discountAmt > 0 ? (
                              <span className="bg-rose-50 text-[#D64545] font-bold px-2 py-0.5 rounded-md border border-rose-200 text-[11px]">
                                -{discountAmt.toLocaleString('en-US')} {currCode}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="p-3 text-center bg-[#E2F5F7]/40 tabular-nums">
                            <div className="font-bold font-mono text-xs text-[#007F8C]">
                              {grandTotalYER > 0 ? `${grandTotalYER.toLocaleString('en-US')} ﷼` : '—'}
                            </div>
                            {isForeign && origAmount > 0 && (
                              <div className="text-[9.5px] font-mono text-[#8F2A87] mt-0.5 bg-[#F2E7F3] px-1.5 py-0.5 rounded inline-block font-semibold">
                                {origAmount.toLocaleString('en-US')} {currCode} @ {rate}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-[#25232A] font-semibold text-[11px]">{paySrc}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${payType === 'آجل' ? 'bg-[#FFF1DC] text-[#C97300] border-[#FFE4B9]' : 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]'}`}>
                              {payType}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono tabular-nums text-[#C97300]">
                            {(freight + fees) > 0 ? `${(freight + fees).toLocaleString('en-US')} ﷼` : '—'}
                          </td>
                          <td className="p-3 text-[#6F6B75] text-[11px] max-w-[150px] truncate" title={n.notes}>
                            {n.notes || '—'}
                          </td>
                          <td className="p-3 text-center">
                            {p.receipt_url ? <button type="button" onClick={()=>setPreviewImage(p.receipt_url)} className="bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] px-2 py-1 rounded-lg font-bold text-[10.5px]">🖼️ عرض</button> : <span className="text-[#6F6B75]">—</span>}
                          </td>
                          <td className="p-3 text-[#6F6B75] font-mono">{n.date||'—'}</td>
                          <td className="p-3 text-center space-x-1 space-x-reverse whitespace-nowrap">
                            <button type="button" onClick={()=>handleOpenEdit(p)} title="تعديل الفاتورة" className="w-7 h-7 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg font-bold border border-[#E8E5EA] inline-flex items-center justify-center cursor-pointer">✏️</button>
                            <button type="button" onClick={()=>handleDeleteRecord(p)} title="حذف الفاتورة" className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-[#D64545] rounded-lg font-bold border border-rose-200 inline-flex items-center justify-center cursor-pointer">🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

window.Purchases = Purchases;
