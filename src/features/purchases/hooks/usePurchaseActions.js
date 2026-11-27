const { useState, useCallback } = React;

function usePurchaseActions({
  headerData, setHeaderData, emptyHeader, billItems, setBillItems, emptyItem,
  setItemData, setEditingIndex, setSupplierSearch, fetchSuppliers,
  purchases, setPurchases, inventory, setInventory, accounts, setAccounts,
  vouchers, setVouchers, journal, setJournal, showToast, defaultCurrency,
  defaultPayType, todayStrIso, discountVal, grandTotal, rawItemsSum: propRawItemsSum,
  setIsEditMode, setIsAddModalOpen
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // إعادة تحميل كافة بيانات المشتريات والمخزون والحسابات والقيود من السيرفر
  const refreshServerData = async () => {
    try {
      const [purRes, invRes, accRes, jvRes] = await Promise.all([
        fetch('/api/purchases'), fetch('/api/inventory'), fetch('/api/accounts'), fetch('/api/journal')
      ]);
      const [pJson, iJson, aJson, jJson] = await Promise.all([
        purRes.json().catch(() => ({})), invRes.json().catch(() => ({})),
        accRes.json().catch(() => ({})), jvRes.json().catch(() => ({}))
      ]);
      if (pJson?.data && typeof setPurchases === 'function') setPurchases(pJson.data);
      if (iJson?.data && typeof setInventory === 'function') setInventory(iJson.data);
      if (aJson?.data && typeof setAccounts === 'function') setAccounts(aJson.data);
      if (jJson?.data && typeof setJournal === 'function') setJournal(jJson.data);
    } catch (err) { console.warn('Backend refresh warning:', err); }
  };

  const buildPayload = (hData, itemsList) => {
    const targetWh = hData.warehouse_id || 'WH-MAIN';
    const fCost = parseFloat(hData.freight_cost) || 0, tFees = parseFloat(hData.transfer_fees) || 0;
    const discountAmount = parseFloat(hData.discount || 0) || 0;
    const rawSum = (itemsList || []).reduce((sum, itm) => sum + (Number(itm.qty || itm.quantity || 0) * Number(itm.price || itm.cost || itm.unit_price || 0)), 0);
    return {
      id: hData.id || '', bill_no: (hData.bill_no || '').trim(), invoice_no: (hData.bill_no || '').trim(),
      supplier_id: hData.supplier_id || '', supplier: hData.supplier, supplier_name: hData.supplier,
      supplier_phone: hData.supplier_phone || '', discount: discountAmount, notes: hData.notes || '',
      pay_type: hData.pay_type || defaultPayType, payment_method: hData.pay_type || defaultPayType,
      payment_source: hData.payment_source || '', payment_account_code: hData.payment_source || '',
      transfer_no: hData.transfer_no || '', transaction_ref: hData.transfer_no || '',
      currency: hData.currency || defaultCurrency, exchange_rate: hData.exchange_rate || '',
      date: hData.date || todayStrIso, invoice_date: hData.date || todayStrIso, warehouse_id: targetWh,
      freight_cost: fCost, shipping_cost: fCost, transfer_fees: tFees, transfer_fee: tFees, original_amount: rawSum,
      grand_total: Math.max(0, rawSum - discountAmount + fCost + tFees),
      receipt_url: hData.receipt_url || '', receipt_attachment: hData.receipt_url || '',
      invoice_image_url: hData.invoice_image_url || '', invoice_attachment: hData.invoice_image_url || '',
      items: (itemsList || []).map(itm => ({
        item_name: itm.item || itm.item_name || '', unit: itm.unit || 'متر',
        qty: parseFloat(itm.qty || itm.quantity) || 0, price: parseFloat(itm.price || itm.cost || itm.unit_price) || 0,
        cost: parseFloat(itm.price || itm.cost || itm.unit_price) || 0,
        total: parseFloat(itm.total || itm.total_price) || ((parseFloat(itm.qty || 0)) * (parseFloat(itm.price || 0))),
        warehouse_id: targetWh
      }))
    };
  };

  // ── فتح نافذة إضافة فاتورة جديدة ──
  const handleOpenAdd = useCallback(() => {
    setHeaderData(emptyHeader());
    setSupplierSearch(''); setBillItems([]); setItemData(emptyItem()); setEditingIndex(null);
    if (typeof setIsEditMode === 'function') setIsEditMode(false);
    if (typeof setIsAddModalOpen === 'function') setIsAddModalOpen(true);
  }, [emptyHeader, emptyItem, setHeaderData, setSupplierSearch, setBillItems, setItemData, setEditingIndex, setIsEditMode, setIsAddModalOpen]);

  // ── فتح نافذة تعديل فاتورة مع جلب بنودها التفصيلية من السيرفر ──
  const handleOpenEdit = useCallback(async (p) => {
    let pur = p;
    try {
      const res = await fetch(`/api/purchases/${encodeURIComponent(p.id || p.bill_no)}`);
      const json = await res.json();
      if (json?.success && json.data) pur = json.data;
    } catch (e) { console.warn("Direct fetch warning:", e); }
    const whs = Array.isArray(window.inventoryUtils?.WAREHOUSES) ? window.inventoryUtils.WAREHOUSES : [];
    const whId = pur.warehouse_id || whs[0]?.id || whs[0]?.code || 'WH-MAIN';
    setHeaderData({
      id: pur.id, bill_no: pur.invoice_no || pur.bill_no || pur.id || '',
      supplier_id: pur.supplier_id || '', supplier: pur.supplier_name || pur.supplier || '',
      supplier_phone: pur.supplier_phone || pur.phone || '', warehouse_id: whId,
      discount: pur.discount !== undefined && pur.discount !== null ? String(pur.discount) : '',
      notes: pur.notes || '', currency: pur.currency || defaultCurrency,
      exchange_rate: pur.exchange_rate ? String(pur.exchange_rate) : '',
      pay_type: pur.payment_method || pur.pay_type || defaultPayType,
      transfer_no: pur.transaction_ref || pur.transfer_no || '',
      payment_source: pur.payment_account_code || pur.payment_source || '',
      receipt_url: pur.receipt_attachment || pur.receipt_url || '',
      invoice_image_url: pur.invoice_attachment || pur.invoice_image_url || '',
      date: pur.invoice_date || pur.date || todayStrIso,
      freight_cost: pur.shipping_cost !== undefined ? String(pur.shipping_cost) : (pur.freight_cost ? String(pur.freight_cost) : ''),
      transfer_fees: pur.transfer_fee !== undefined ? String(pur.transfer_fee) : (pur.transfer_fees ? String(pur.transfer_fees) : '')
    });
    setSupplierSearch(pur.supplier_name || pur.supplier || '');
    const items = (pur.items && pur.items.length > 0)
      ? pur.items.map(it => ({
          item: it.item_name || it.item || '', unit: it.unit || 'متر',
          qty: String(it.qty || it.quantity || 1), price: String(it.cost || it.unit_price || it.price || 0),
          total: String(it.total || it.total_price || 0)
        }))
      : [{ item: pur.item_name || pur.item || '', unit: pur.unit || 'متر', qty: String(pur.qty || 1), price: String(pur.unit_price || 0), total: String(pur.original_amount || 0) }];
    setBillItems(items); setItemData(emptyItem()); setEditingIndex(null);
    if (typeof setIsEditMode === 'function') setIsEditMode(true);
    if (typeof setIsAddModalOpen === 'function') setIsAddModalOpen(true);
  }, [defaultCurrency, defaultPayType, todayStrIso, emptyItem, setHeaderData, setSupplierSearch, setBillItems, setItemData, setEditingIndex, setIsEditMode, setIsAddModalOpen]);

  // ── حفظ الفاتورة الجديدة ──
  const handleSaveFullBill = async (onSuccess) => {
    if (isSaving) return;
    if (!headerData.supplier || !headerData.supplier.trim()) return showToast('اسم المورد مطلوب ⚠️', 'error');
    if (!headerData.warehouse_id) return showToast('يرجى تحديد المستودع المستلم ⚠️', 'error');
    if (!billItems || billItems.length === 0) return showToast('الفاتورة فارغة! أضف صنفاً واحداً على الأقل ⚠️', 'error');

    setIsSaving(true);
    try {
      const payload = buildPayload(headerData, billItems);
      const res = await fetch("/api/purchases", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok || resData.success === false) throw new Error(resData.message || resData.error || `خطأ (${res.status})`);

      await refreshServerData();
      showToast(resData.message || `✅ تم حفظ الفاتورة وتوريد الأصناف للمخزون وترحيل القيود بنجاح`);
      setHeaderData(emptyHeader()); setSupplierSearch(''); setBillItems([]); setItemData(emptyItem()); setEditingIndex(null);
      if (typeof fetchSuppliers === 'function') fetchSuppliers();
      if (typeof onSuccess === 'function') onSuccess();
    } catch(err) {
      console.error("Purchase save error:", err);
      showToast(`خطأ أثناء الحفظ ⚠️ ${err.message || 'يرجى المحاولة مرة أخرى'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── حفظ تعديلات فاتورة المشتريات بالربط الذري وقاعدة البيانات ──
  const handleSaveEditPurchase = async (customHeader, customItems, onSuccess) => {
    if (editSaving) return;
    const h = customHeader || headerData, items = customItems || billItems;
    if (!h.supplier || !String(h.supplier).trim()) return showToast('اسم المورد مطلوب ⚠️', 'error');
    if (!items || items.length === 0) return showToast('الفاتورة فارغة! أضف صنفاً واحداً على الأقل ⚠️', 'error');

    setEditSaving(true);
    try {
      const payload = buildPayload(h, items);
      const res = await fetch('/api/purchases/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok || resData.success === false) throw new Error(resData.message || resData.error || `خطأ في استجابة الخادم (${res.status})`);

      await refreshServerData();
      showToast(resData.message || '✅ تم حفظ التعديلات في النظام وتحديث المخزون والقيود بنجاح');
      if (typeof onSuccess === 'function') onSuccess();
    } catch(err) {
      console.error("Purchase update error:", err);
      showToast(`خطأ أثناء حفظ التعديلات ⚠️ ${err.message || 'يرجى المحاولة مرة أخرى'}`, 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // ── تعديل سجل منفرد (دعم التوافقية السابقة) ──
  const handleSaveEditRecord = async (editRecord, setEditRecord) => {
    if (!editRecord) return;
    const items = (editRecord.items && editRecord.items.length > 0)
      ? editRecord.items
      : [{ item: editRecord.item || editRecord.item_name, unit: editRecord.unit || 'متر', qty: editRecord.qty, price: editRecord.price, total: editRecord.total }];
    await handleSaveEditPurchase(editRecord, items, () => { if (typeof setEditRecord === 'function') setEditRecord(null); });
  };

  // ── إلغاء فاتورة وعكس أثرها المالي والمخزني ──
  const handleDeleteRecord = async (p) => {
    const billIdentifier = p.bill_no || p.invoice_no || p.id;
    if (!window.confirm(`هل أنت متأكد من إلغاء وحذف الفاتورة ${billIdentifier}؟ سيتم عكس القيود وإرجاع المخزون نظامياً.`)) return;
    try {
      const res = await fetch('/api/purchases/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, bill_no: p.bill_no, invoice_no: p.invoice_no, purchase_no: p.purchase_no })
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok || resData.success === false) throw new Error(resData.error || 'تعذر إلغاء الفاتورة');
      await refreshServerData();
      showToast(`🗑️ ${resData.message || `تم إلغاء الفاتورة ${billIdentifier} وعكس أثرها بنجاح`}`);
    } catch(err) {
      console.error(err);
      showToast('خطأ أثناء إلغاء الفاتورة ⚠️ ' + (err.message || ''), 'error');
    }
  };

  return { isSaving, editSaving, handleOpenAdd, handleOpenEdit, handleSaveFullBill, handleSaveEditPurchase, handleSaveEditRecord, handleDeleteRecord, refreshServerData };
}

window.usePurchaseActions = usePurchaseActions;
