const { useState, useCallback } = React;

function usePurchaseActions({ headerData, setHeaderData, emptyHeader, billItems, setBillItems, emptyItem, setItemData, setEditingIndex, setSupplierSearch, fetchSuppliers, purchases, setPurchases, inventory, setInventory, accounts, setAccounts, vouchers, setVouchers, journal, setJournal, showToast, defaultCurrency, defaultPayType, todayStrIso, genBillNo, discountVal, grandTotal }) {
  const [isSaving, setIsSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // ── حفظ الفاتورة الجديدة مع التوريد والقيود المحاسبية ──
  const handleSaveFullBill = async () => {
    if (isSaving) return;
    if (!headerData.supplier.trim()) return showToast('اسم المورد مطلوب ⚠️', 'error');
    if (billItems.length === 0) return showToast('الفاتورة فارغة! أضف صنفاً ⚠️', 'error');
    setIsSaving(true);
    const billNo = (headerData.bill_no || '').trim() || genBillNo();
    const purCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(headerData.currency || defaultCurrency) : 'YER';
    const purRate = purCurrCode === 'YER' ? 1.0 : (parseFloat(headerData.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(purCurrCode) : 1.0));

    try {
      const payload = {
        bill_no: billNo, supplier_id: headerData.supplier_id || '', supplier: headerData.supplier,
        supplier_phone: headerData.supplier_phone || '', created_by: 'admin', discount: discountVal,
        notes: headerData.notes || '', pay_type: headerData.pay_type || defaultPayType,
        payment_source: headerData.payment_source || '', transfer_no: headerData.transfer_no || '',
        currency: headerData.currency || defaultCurrency, date: headerData.date || todayStrIso,
        freight_cost: parseFloat(headerData.freight_cost) || 0, transfer_fees: parseFloat(headerData.transfer_fees) || 0,
        receipt_url: headerData.receipt_url || '', invoice_image_url: headerData.invoice_image_url || '',
        items: billItems.map(itm => ({ item_name: itm.item, unit: itm.unit || 'متر', qty: parseFloat(itm.qty) || 0, cost: parseFloat(itm.price) || 0 }))
      };

      const res = await fetch("/api/purchases", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok || resData.success === false) throw new Error(resData.error || 'تعذر حفظ الفاتورة في السيرفر');

      if (setPurchases) {
        const savedPur = resData.data || {};
        const newPur = {
          id: savedPur.id || `PUR-${Date.now()}`, bill_no: billNo, purchase_no: billNo,
          supplier_id: headerData.supplier_id || '', supplier: headerData.supplier, supplier_name: headerData.supplier,
          supplier_phone: headerData.supplier_phone || '', discount: discountVal, notes: headerData.notes || '',
          item_name: billItems.map(i => i.item).join(' + '), unit: billItems[0].unit || 'متر',
          qty: billItems.reduce((acc, c) => acc + (parseFloat(c.qty) || 0), 0),
          price: billItems.length === 1 ? (parseFloat(billItems[0].price) || 0) : Math.round((grandTotal / (billItems.reduce((acc, c) => acc + (parseFloat(c.qty) || 0), 0) || 1)) * 100) / 100,
          total: grandTotal, grand_total_yer: grandTotal * purRate, currency: headerData.currency || defaultCurrency,
          pay_type: headerData.pay_type || defaultPayType, payment_source: headerData.payment_source || '',
          date: headerData.date || todayStrIso, transfer_no: headerData.transfer_no || '',
          freight_cost: parseFloat(headerData.freight_cost) || 0, transfer_fees: parseFloat(headerData.transfer_fees) || 0,
          receipt_url: headerData.receipt_url || '', invoice_image_url: headerData.invoice_image_url || '',
          payment_status: headerData.pay_type !== 'آجل' ? 'مدفوع' : 'غير مدفوع', status: 'تم الاستلام',
          items: billItems.map((itm, idx) => ({ id: `PITM-${Date.now()}-${idx}`, item_name: itm.item, unit: itm.unit || 'متر', qty: parseFloat(itm.qty) || 0, cost: parseFloat(itm.price) || 0, total: (parseFloat(itm.qty) || 0) * (parseFloat(itm.price) || 0) }))
        };
        setPurchases(prev => [newPur, ...(prev || []).filter(p => (p.bill_no || p.invoice_no) !== billNo)]);
      }

      if (setInventory) {
        setInventory(prev => {
          let updated = [...(prev || [])];
          for (const itm of billItems) {
            const idx = updated.findIndex(i => (i.item_name || i.name) === itm.item);
            const q = parseFloat(itm.qty) || 0, p = parseFloat(itm.price) || 0, pYer = p * purRate;
            if (idx !== -1) {
              const curQ = parseFloat(updated[idx].quantity || updated[idx].quantity_meters || 0);
              const curC = parseFloat(updated[idx].unit_cost || updated[idx].cost_per_meter || 0);
              const newQ = curQ + q, newC = newQ > 0 ? (((curQ * curC) + (q * pYer)) / newQ) : pYer, weightedCost = parseFloat(newC.toFixed(2));
              updated[idx] = { ...updated[idx], quantity: newQ, quantity_meters: newQ, available_qty: (parseFloat(updated[idx].available_qty || curQ) + q), unit_cost: weightedCost, cost_per_meter: weightedCost, total_value: parseFloat((newQ * weightedCost).toFixed(2)), currency: 'YER', updated_at: todayStrIso };
            } else {
              updated.unshift({ id: `MAT-${Date.now()}`, item_name: itm.item, name: itm.item, item_code: `MAT-${Math.floor(100 + Math.random() * 900)}`, category: 'أقمشة وخامات', type: 'خامة', quantity: q, quantity_meters: q, available_qty: q, unit_cost: pYer, cost_per_meter: pYer, total_value: parseFloat((q * pYer).toFixed(2)), unit: itm.unit || 'متر', currency: 'YER', supplier_id: headerData.supplier, location: 'المستودع الرئيسي', status: 'Available', created_at: todayStrIso });
            }
          }
          return updated;
        });
      }

      const purBaseObj = window.CurrencyService ? window.CurrencyService.toBase(grandTotal, purCurrCode, purRate) : { base_amount: grandTotal, exchange_rate: purRate };
      if (setVouchers && headerData.pay_type !== 'آجل') {
        setVouchers(prev => [{ id: `VOUCH-${Date.now()}`, voucher_no: `PV-${billNo}`, voucher_type: 'سند صرف', party_name: headerData.supplier, supplier_id: headerData.supplier, amount: grandTotal, currency: purCurrCode, exchange_rate: purRate, base_amount: purBaseObj.base_amount, pay_method: headerData.pay_type || defaultPayType, payment_source: headerData.payment_source || '1111 - الصندوق الرئيسي', transfer_no: headerData.transfer_no || '', image_path: headerData.receipt_url || '', receipt_url: headerData.receipt_url || '', date_created: headerData.date || todayStrIso, date: headerData.date || todayStrIso, statement: `سند صرف مشتريات للفاتورة ${billNo} - المورد: ${headerData.supplier}`, notes: `سند صرف مشتريات للفاتورة ${billNo}` }, ...(prev || [])]);
      }

      if (setJournal) {
        setJournal(prev => [{ id: Date.now() + 2, transaction_id: `TX-PUR-${billNo}`, entry_no: `JV-PUR-${billNo}`, debit: 'ACC-105', credit: headerData.pay_type !== 'آجل' ? (headerData.payment_source ? headerData.payment_source.split(' - ')[0] : 'ACC-101-1') : 'ACC-201', amount: grandTotal, currency: purCurrCode, exchange_rate: purRate, base_amount: purBaseObj.base_amount, ref_type: 'PURCHASE', ref_id: billNo, date: headerData.date || todayStrIso, notes: `قيد مشتريات الفاتورة ${billNo} - المورد: ${headerData.supplier}` }, ...(prev || [])]);
      }

      if (setAccounts) {
        setAccounts(prev => (prev || []).map(acc => {
          const code = String(acc.acc_code || acc.code || acc.account_code || '');
          const paySourceCode = headerData.payment_source ? headerData.payment_source.split(' - ')[0] : '101';
          if (headerData.pay_type !== 'آجل' && code === paySourceCode) {
            const curBal = parseFloat(acc.balance || acc.current_balance || 0);
            return { ...acc, balance: curBal - grandTotal, current_balance: curBal - grandTotal };
          }
          if (headerData.pay_type === 'آجل' && (code === '201' || code === '2101' || code === 'ACC-201')) {
            const curBal = parseFloat(acc.balance || acc.current_balance || 0);
            return { ...acc, balance: curBal + grandTotal, current_balance: curBal + grandTotal };
          }
          return acc;
        }));
      }

      try {
        const freshListRes = await fetch('/api/purchases');
        const freshListData = await freshListRes.json();
        if (freshListData && Array.isArray(freshListData.data) && typeof setPurchases === 'function') setPurchases(freshListData.data);
        const freshInvRes = await fetch('/api/inventory');
        const freshInvData = await freshInvRes.json();
        if (freshInvData && Array.isArray(freshInvData.data) && typeof setInventory === 'function') setInventory(freshInvData.data);
      } catch (e) { console.warn('Refresh error:', e); }

      showToast(`✅ تم حفظ الفاتورة ${billNo} وتوريد الأصناف للمخزون وترحيل القيود وسندات الصرف بنجاح 📦✨`);
      setHeaderData(emptyHeader());
      setSupplierSearch('');
      setBillItems([]); setItemData(emptyItem()); setEditingIndex(null);
      fetchSuppliers();
    } catch(err) {
      console.error(err);
      showToast('خطأ أثناء الحفظ ⚠️ يرجى المحاولة مرة أخرى', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── تعديل سجل مشتريات موجود ──
  const handleSaveEditRecord = async (editRecord, setEditRecord) => {
    if (!editRecord) return;
    if (!editRecord.item || !String(editRecord.item).trim()) return showToast('اسم الصنف مطلوب ⚠️', 'error');
    const qty = parseFloat(editRecord.qty) || 0;
    if (qty <= 0) return showToast('الكمية مطلوبة ⚠️', 'error');
    let price = parseFloat(editRecord.price) || 0, total = parseFloat(editRecord.total) || 0;
    if (total > 0 && price <= 0) price = total / qty;
    else if (price > 0 && total <= 0) total = qty * price;
    setEditSaving(true);
    try {
      const payload = {
        id: String(editRecord.id), bill_no: editRecord.bill_no, supplier_id: editRecord.supplier_id || '',
        supplier: editRecord.supplier, supplier_name: editRecord.supplier, supplier_phone: editRecord.supplier_phone || '',
        discount: parseFloat(editRecord.discount) || 0, notes: editRecord.notes || '', item: String(editRecord.item).trim(),
        item_name: String(editRecord.item).trim(), unit: editRecord.unit || 'متر', qty, price: parseFloat(price.toFixed(2)),
        total: parseFloat(total.toFixed(2)), currency: editRecord.currency, pay_type: editRecord.pay_type,
        transfer_no: editRecord.transfer_no || '', payment_source: editRecord.payment_source || '',
        date: editRecord.date, receipt_url: editRecord.receipt_url || '', invoice_image_url: editRecord.invoice_image_url || ''
      };

      const res = await fetch('/api/purchases/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok || resData.success === false) throw new Error(resData.error || 'تعذر تحديث الفاتورة');

      if (setPurchases) setPurchases(prev => prev.map(r => String(r.id) === String(editRecord.id) ? { ...r, ...payload } : r));
      if (typeof callGAS === 'function') callGAS('updatePurchase', payload).catch(e => console.warn('GAS warning:', e));

      showToast('✅ تم تحديث الفاتورة بنجاح في النظام وقاعدة البيانات السحابية');
      setEditRecord(null);
    } catch(err) {
      console.error(err);
      showToast('خطأ أثناء التحديث ⚠️ ' + (err.message || ''), 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // ── حذف وإلغاء فاتورة وعكس أثرها المالي والمخزني ──
  const handleDeleteRecord = async (p) => {
    const billIdentifier = p.bill_no || p.invoice_no || p.id;
    if (!window.confirm(`هل أنت متأكد من إلغاء وحذف الفاتورة ${billIdentifier}؟ سيتم عكس القيود وإرجاع المخزون نظامياً.`)) return;
    try {
      const res = await fetch('/api/purchases/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, bill_no: p.bill_no, invoice_no: p.invoice_no, purchase_no: p.purchase_no })
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok || resData.success === false) {
        if (resData.error && resData.error.includes('غير موجودة')) {
          if (setPurchases) setPurchases(prev => (prev || []).filter(r => String(r.id) !== String(p.id) && (p.bill_no ? String(r.bill_no) !== String(p.bill_no) : true)));
          showToast(`تمت إزالة السجل ${billIdentifier} من الشاشة`, 'info');
          return;
        }
        throw new Error(resData.error || 'تعذر إلغاء الفاتورة في السيرفر');
      }

      if (setPurchases) {
        setPurchases(prev => (prev || []).filter(r => String(r.id) !== String(p.id) && String(r.bill_no) !== String(p.bill_no)));
      }

      try {
        const freshRes = await fetch('/api/purchases');
        const freshData = await freshRes.json();
        if (freshData && Array.isArray(freshData.data) && typeof setPurchases === 'function') setPurchases(freshData.data);
        const freshInvRes = await fetch('/api/inventory');
        const freshInvData = await freshInvRes.json();
        if (freshInvData && Array.isArray(freshInvData.data) && typeof setInventory === 'function') setInventory(freshInvData.data);
      } catch (syncErr) { console.warn('Sync warning:', syncErr); }

      if (typeof callGAS === 'function') callGAS('deletePurchase', { id: String(p.id), bill_no: p.bill_no }).catch(e => console.warn('GAS warning:', e));
      showToast(`🗑️ ${resData.message || `تم إلغاء الفاتورة ${billIdentifier} وعكس أثرها المالي والمخزني بنجاح`}`);
    } catch(err) {
      console.error(err);
      showToast('خطأ أثناء إلغاء الفاتورة ⚠️ ' + (err.message || ''), 'error');
    }
  };

  return { isSaving, editSaving, handleSaveFullBill, handleSaveEditRecord, handleDeleteRecord };
}

window.usePurchaseActions = usePurchaseActions;
