// src/features/inventory/hooks/useInventoryActions.js
// خطاف عمليات المخزون: الإضافة، تسويات الجرد، المناقلات، والحوكمة

const { useState } = React;

function useInventoryActions({ inventory = [], setInventory, showToast, refreshInventory, fetchTransactions, currency }) {
  const u = window.inventoryUtils || {};
  const getItemName = u.getItemName || (i => i?.item_name || i?.name || '');
  const getItemQty = u.getItemQty || (i => parseFloat(i?.qty || i?.quantity || 0) || 0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState(() => u.getInitialInventoryForm ? u.getInitialInventoryForm(currency) : {
    item_name: '', category: 'أقمشة', qty: '', cost: '', total_value: '',
    currency: currency?.code || 'YER', supply_date: new Date().toISOString().split('T')[0], location: 'المستودع الرئيسي', reorder_level: 5
  });

  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustType, setAdjustType] = useState('wastage');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const [transferringItem, setTransferringItem] = useState(null);
  const [transferFrom, setTransferFrom] = useState('WH-MAIN');
  const [transferTo, setTransferTo] = useState('WH-WORKSHOP');
  const [transferQty, setTransferQty] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  const [selectedItemForMovements, setSelectedItemForMovements] = useState(null);
  const [isAddWarehouseOpen, setIsAddWarehouseOpen] = useState(false);

  const handleQtyChange = (e) => {
    const q = e.target.value;
    const c = formData.cost;
    const t = (c !== '' && !isNaN(parseFloat(c))) ? (parseFloat(q || 0) * parseFloat(c)).toFixed(2) : formData.total_value;
    setFormData(prev => ({ ...prev, qty: q, total_value: t }));
  };

  const handleCostChange = (e) => {
    const c = e.target.value;
    const q = formData.qty;
    const t = (q !== '' && !isNaN(parseFloat(q))) ? (parseFloat(q) * parseFloat(c || 0)).toFixed(2) : formData.total_value;
    setFormData(prev => ({ ...prev, cost: c, total_value: t }));
  };

  const handleTotalChange = (e) => {
    const t = e.target.value;
    const q = formData.qty;
    const c = (q !== '' && parseFloat(q) > 0) ? (parseFloat(t || 0) / parseFloat(q)).toFixed(2) : formData.cost;
    setFormData(prev => ({ ...prev, total_value: t, cost: c }));
  };

  const openAdjustModal = (item, type = 'wastage') => {
    setAdjustingItem(item);
    setAdjustType(type);
    setAdjustQty('');
    setAdjustReason('');
  };

  const openTransferModal = (item) => {
    setTransferringItem(item);
    setTransferFrom('WH-MAIN');
    setTransferTo('WH-WORKSHOP');
    setTransferQty('');
    setTransferNotes('');
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!formData.item_name) return showToast?.('اسم الصنف مطلوب ⚠️', 'error');

    const costVal = parseFloat(formData.cost) || 0;
    const qtyVal = parseFloat(formData.qty) || 0;
    const newItem = {
      id: Date.now(),
      ...formData,
      item_code: `MAT-${Math.floor(100 + Math.random() * 900)}`,
      cost_per_unit: costVal, unit_cost: costVal, cost_per_meter: costVal,
      total_value: parseFloat(formData.total_value) || (costVal * qtyVal),
      location: formData.location || 'المستودع الرئيسي',
      available_qty: qtyVal, quantity_meters: qtyVal, quantity: qtyVal, qty: qtyVal,
      reorder_level: parseFloat(formData.reorder_level) || 5
    };

    try {
      if (window.inventoryAPI?.createItem) {
        const res = await window.inventoryAPI.createItem(newItem);
        if (res?.success) {
          const saved = { ...newItem, id: res.id || newItem.id };
          setInventory?.(prev => [saved, ...(prev || []).filter(i => i.id !== saved.id)]);
          showToast?.(res.message || 'تمت إضافة الصنف للمخزون بنجاح 📦');
          setIsAddModalOpen(false);
          return;
        }
      }
      setInventory?.(prev => [newItem, ...(prev || [])]);
      showToast?.('تمت إضافة الصنف للمخزون بنجاح 📦');
    } catch (err) {
      setInventory?.(prev => [newItem, ...(prev || [])]);
      showToast?.(err.message || 'تم الحفظ محلياً ⚡');
    } finally {
      setIsAddModalOpen(false);
      if (u.getInitialInventoryForm) setFormData(u.getInitialInventoryForm(currency));
    }
  };

  const handleExecuteAdjust = async (e) => {
    e.preventDefault();
    if (!adjustingItem) return;
    const vQty = parseFloat(adjustQty);
    if (!vQty || vQty <= 0) return showToast?.('الكمية المراد تسويتها يجب أن تكون أكبر من الصفر ⚠️', 'error');

    setIsSubmittingAdjust(true);
    try {
      if (window.inventoryAPI?.adjustInventory) {
        const payload = {
          item_id: adjustingItem.id,
          item_name: getItemName(adjustingItem),
          adj_type: adjustType,
          variance_qty: vQty,
          reason: adjustReason || (adjustType === 'wastage' ? 'إهلاك تالف وهالك أقمشة' : 'تسوية فائض جردي')
        };
        const res = await window.inventoryAPI.adjustInventory(payload);
        if (res?.success) {
          showToast?.(res.message || 'تم ترحيل قيد التسوية الجردية بنجاح ⚖️');
          setInventory?.(prev => (prev || []).map(i => i.id === adjustingItem.id ? { ...i, qty: res.new_qty, quantity: res.new_qty } : i));
          setAdjustingItem(null);
          setAdjustQty('');
          setAdjustReason('');
          fetchTransactions?.();
        } else showToast?.(res?.message || 'فشلت عملية التسوية', 'error');
      }
    } catch (err) {
      showToast?.(err.message || 'خطأ أثناء تنفيذ التسوية', 'error');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    if (!transferringItem) return;
    const tQty = parseFloat(transferQty);
    if (!tQty || tQty <= 0) return showToast?.('الكمية يجب أن تكون أكبر من الصفر ⚠️', 'error');
    if (tQty > getItemQty(transferringItem)) return showToast?.('الكمية تتجاوز الرصيد المتوفر ⚠️', 'error');
    if (transferFrom === transferTo) return showToast?.('لا يمكن التحويل لنفس المستودع ⚠️', 'error');

    setIsSubmittingTransfer(true);
    try {
      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: transferringItem.id,
          item_name: getItemName(transferringItem),
          quantity: tQty,
          from_warehouse: transferFrom,
          to_warehouse: transferTo,
          notes: transferNotes || `مناقلة من ${transferFrom} إلى ${transferTo}`
        })
      }).then(r => r.json());

      if (res?.success) {
        showToast?.(res.message || `تمت مناقلة ${tQty} بنجاح 🔄`);
        await refreshInventory?.(false);
        fetchTransactions?.();
        setTransferringItem(null);
        setTransferQty('');
        setTransferNotes('');
      } else {
        showToast?.(res?.error || res?.message || 'فشلت عملية المناقلة', 'error');
      }
    } catch (err) {
      showToast?.(err.message || 'خطأ أثناء تنفيذ المناقلة', 'error');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleReconcileGovernance = async () => {
    try {
      const res = await fetch('/api/inventory/reconcile', { method: 'POST' }).then(r => r.json());
      if (res?.success) {
        await refreshInventory?.(false);
        fetchTransactions?.();
        showToast?.(res.message || 'تمت تسوية ومطابقة أرصدة المخزون ⚖️✨');
      } else showToast?.(res?.error || 'فشلت تسوية المخزون', 'error');
    } catch (e) {
      showToast?.('خطأ أثناء مطابقة المخزون ⚠️', 'error');
    }
  };

  return {
    isAddModalOpen, setIsAddModalOpen,
    formData, setFormData,
    handleQtyChange, handleCostChange, handleTotalChange, handleAddItem,
    adjustingItem, setAdjustingItem, adjustType, setAdjustType, adjustQty, setAdjustQty,
    adjustReason, setAdjustReason, isSubmittingAdjust, handleExecuteAdjust, openAdjustModal,
    transferringItem, setTransferringItem, transferFrom, setTransferFrom, transferTo, setTransferTo,
    transferQty, setTransferQty, transferNotes, setTransferNotes, isSubmittingTransfer,
    handleExecuteTransfer, openTransferModal,
    selectedItemForMovements, setSelectedItemForMovements,
    isAddWarehouseOpen, setIsAddWarehouseOpen,
    handleReconcileGovernance
  };
}

window.useInventoryActions = useInventoryActions;
if (typeof module !== 'undefined' && module.exports) module.exports = useInventoryActions;
