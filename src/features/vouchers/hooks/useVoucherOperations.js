const { useState, useCallback } = React;

function useVoucherOperations({ setVouchers, setJournal, setAccounts, setExpenses, setOrders, setCustomers, showToast }) {
  const [reversingVoucher, setReversingVoucher] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isSubmittingVoucher, setIsSubmittingVoucher] = useState(false);

  const handleOpenReverseModal = useCallback((v, normalizeVoucher) => {
    if (!v) return;
    const norm = normalizeVoucher ? normalizeVoucher(v) : v;
    if (norm.status === 'reversed') return showToast?.('هذا السند ملغى مسبقاً بقيد عكسي', 'info');
    setReversingVoucher(norm);
    setReversalReason('');
  }, [showToast]);

  const handleConfirmReverse = useCallback(async () => {
    if (!reversingVoucher) return;
    const cleanReason = (reversalReason || '').trim();
    if (!cleanReason) return showToast?.('⚠️ يرجى كتابة سبب الإلغاء لتوثيق القيد العكسي ومطابقة الحوكمة المالية', 'warning');

    setIsReversing(true);
    try {
      const res = await fetch('/api/vouchers/reverse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reversingVoucher.id,
          voucher_no: reversingVoucher.v_no,
          reason: cleanReason,
          user_id: window.currentUser?.username || 'admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        if (setVouchers) {
          setVouchers(prev => (prev || []).map(item => {
            const curNo = item.v_no || item.voucher_no || item.payment_no || item.id;
            return (curNo === reversingVoucher.v_no || item.id === reversingVoucher.id)
              ? { ...item, status: 'reversed', reversal_reason: cleanReason, reversal_entry_id: data.reversal_entry_no }
              : item;
          }));
        }
        if (setJournal) {
          setJournal(prev => [{
            entry_no: data.reversal_entry_no || `REV-${reversingVoucher.v_no}`,
            date: new Date().toISOString().slice(0, 10),
            description: `قيد عكسي لإلغاء سند ${reversingVoucher.v_no}: ${cleanReason}`,
            amount: reversingVoucher.amount,
            status: 'Posted',
            ref_id: reversingVoucher.v_no
          }, ...(prev || [])]);
        }
        showToast?.(`✅ ${data.message || 'تم إلغاء السند وتوليد القيد العكسي بنجاح ⚖️'}`);
        setReversingVoucher(null);
        setReversalReason('');
      } else {
        showToast?.(data.error || 'فشلت عملية الإلغاء بقيد عكسي', 'error');
      }
    } catch (err) {
      console.error("Reverse voucher error:", err);
      showToast?.('حدث خطأ أثناء الاتصال بالخادم لإلغاء السند', 'error');
    } finally {
      setIsReversing(false);
    }
  }, [reversingVoucher, reversalReason, setVouchers, setJournal, showToast]);

  const handleDeleteVoucher = useCallback(() => {
    showToast?.('⚠️ غير مسموح بالحذف المباشر للسندات المعتمدة وفق ميثاق الحوكمة (No Hard Delete). يرجى استخدام زر الإلغاء بقيد عكسي.', 'warning');
  }, [showToast]);

  const handleSendWhatsAppNotification = useCallback((v, customers = []) => {
    if (!v) return;
    const vNo = v.v_no || v.id, vType = v.v_type, vParty = v.party, vCurr = v.currency, vDate = v.date, vMethod = v.pay_method;
    const vAmt = Number(v.amount).toLocaleString('en-US');
    const vNotes = v.notes && v.notes !== '—' ? v.notes : 'تسديد دفعة حساب';
    let targetPhone = '';
    const foundCust = (customers || []).find(c => c.name === vParty);
    if (foundCust?.phone) targetPhone = foundCust.phone.replace(/[^0-9]/g, '');

    const brandName = window.BrandService ? window.BrandService.getProfile().name : 'دار الأميرات الصغيرات للأزياء الملكية';
    const hostOrigin = window.location?.origin || '';
    const voucherCardUrl = `${hostOrigin}/voucher.html?id=${encodeURIComponent(vNo)}`;
    const msg = `👑 *${brandName}*\n\n📄 *إشعار ${vType} رسمي معتمد:*\n━━━━━━━━━━━━━━━━━━\n🔹 *رقم السند:* ${vNo}\n🔹 *الطرف المستفيد:* ${vParty}\n🔹 *المبلغ المسدد:* ${vAmt} ${vCurr}\n🔹 *طريقة الدفع:* ${vMethod}\n🔹 *التاريخ:* ${vDate}\n🔹 *البيان:* ${vNotes}\n━━━━━━━━━━━━━━━━━━\n🖼️ *معاينة وتحميل بطاقة السند الرسمية المصممة (صورة/PDF):*\n${voucherCardUrl}\n\n✨ نشكركم لتعاملكم الراقي ونسعد بخدمتكم دائماً.`;
    const cleanPhone = targetPhone ? (targetPhone.startsWith('967') || targetPhone.startsWith('966') ? targetPhone : `967${targetPhone.replace(/^0+/, '')}`) : '';
    window.open(cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }, []);

  const handleSaveEditVoucher = useCallback(async (updatedV, editingId) => {
    setIsSubmittingEdit(true);
    try {
      if (setVouchers) {
        setVouchers(prev => (prev || []).map(v => {
          const curNo = v.v_no || v.voucher_no || v.payment_no || v.id;
          return (curNo === updatedV.v_no || v.id === editingId) ? updatedV : v;
        }));
      }
      if (setJournal) {
        setJournal(prev => (prev || []).map(j => {
          const isLinked = j.ref_id === updatedV.v_no || j.entry_no === 'AUTO-VCH-' + updatedV.v_no || j.ref_id === editingId;
          return isLinked ? { ...j, debit: updatedV.debit_account || j.debit, credit: updatedV.credit_account || j.credit, amount: updatedV.amount, currency: updatedV.currency, exchange_rate: updatedV.exchange_rate, base_amount: updatedV.base_amount, date: updatedV.date, notes: `قيد آلي: ${updatedV.notes || updatedV.v_type + ' - ' + updatedV.party}` } : j;
        }));
      }
      fetch('/api/vouchers/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedV) }).catch(e => console.warn("Voucher update warning:", e));
      if (typeof window.callGAS === 'function') window.callGAS('updateVoucher', updatedV).catch(e => console.warn("GAS update warning:", e));
      showToast?.('✅ تم تعديل السند المالي ومزامنة القيود والأستاذ العام بنجاح ✏️');
      setEditingVoucher(null);
    } catch (err) {
      console.error("Save edit voucher error:", err);
      showToast?.('حدث خطأ أثناء تعديل السند', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  }, [setVouchers, setJournal, showToast]);

  const handleSaveNewVoucher = useCallback(async ({ newV, generatedEntries, newExp, customerOrderData, splitPayments, vRate, modalTargetAcc, isReceipt, vBaseAmt }) => {
    setIsSubmittingVoucher(true);
    try {
      if (setVouchers) setVouchers(prev => [newV, ...(prev || [])]);
      if (setJournal && generatedEntries?.length) setJournal(prev => [...generatedEntries, ...(prev || [])]);
      if (newExp && setExpenses) setExpenses(prev => [newExp, ...(prev || [])]);

      if (typeof setAccounts === 'function') {
        setAccounts(prev => (prev || []).map(acc => {
          const c = String(acc.code || acc.acc_code || '');
          let delta = 0;
          (splitPayments || []).forEach(p => {
            if ((parseFloat(p.amount) || 0) > 0 && String(p.acc_code) === c) {
              const lineBase = (parseFloat(p.amount) || 0) * vRate;
              delta += isReceipt ? lineBase : -lineBase;
            }
          });
          if (String(modalTargetAcc) === c || (modalTargetAcc && c.startsWith(modalTargetAcc))) {
            const isAssetExp = acc.type === 'أصول' || acc.type === 'مصروفات' || acc.type === 'تكلفة المبيعات' || acc.nature === 'debit';
            delta += isReceipt ? (isAssetExp ? -vBaseAmt : vBaseAmt) : (isAssetExp ? vBaseAmt : -vBaseAmt);
          }
          if (delta !== 0) {
            const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) + delta;
            return { ...acc, current_balance: curBal, balance: curBal };
          }
          return acc;
        }));
      }

      if (customerOrderData && isReceipt) {
        const { custName, ordNo, amt } = customerOrderData;
        if (ordNo && setOrders) {
          setOrders(prev => (prev || []).map(o => o.order_no === ordNo ? { ...o, paid: (o.paid || 0) + amt, remaining: Math.max(0, o.total - ((o.paid || 0) + amt)) } : o));
        }
        if (custName && setCustomers) {
          setCustomers(prev => (prev || []).map(c => c.name === custName ? {
            ...c, ledger: { ...c.ledger, total_paid: (c.ledger?.total_paid || 0) + amt, remaining: Math.max(0, ((c.ledger?.total_sales || 0) + (c.ledger?.delivery || 0)) - ((c.ledger?.total_paid || 0) + amt)) }
          } : c));
        }
        fetch('/api/gas', {
          method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ action: 'addOrderPayment', customer_name: custName, order_no: ordNo, amount: amt, currency: newV.currency, notes: newV.notes })
        }).catch(e => console.error(e));
      }

      const res = await fetch('/api/vouchers/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newV) });
      if (!res.ok && typeof window.callGAS === 'function') window.callGAS('addVoucher', newV).catch(e => console.error(e));
      if (newExp && typeof window.callGAS === 'function') window.callGAS('addExpense', newExp).catch(e => console.error(e));

      showToast?.(`تم إصدار وتمرير ${isReceipt ? 'سند القبض' : 'سند الصرف'} (${newV.v_no}) بنجاح 🧾✨`);
      return true;
    } catch (err) {
      console.error("Voucher submit error:", err);
      showToast?.('حدث خطأ أثناء إصدار السند', 'error');
      return false;
    } finally {
      setIsSubmittingVoucher(false);
    }
  }, [setVouchers, setJournal, setExpenses, setAccounts, setOrders, setCustomers, showToast]);

  return {
    reversingVoucher, setReversingVoucher,
    reversalReason, setReversalReason,
    isReversing, handleOpenReverseModal,
    handleConfirmReverse, handleDeleteVoucher,
    editingVoucher, setEditingVoucher,
    isSubmittingEdit, handleSaveEditVoucher,
    isSubmittingVoucher, handleSaveNewVoucher,
    handleSendWhatsAppNotification
  };
}

window.useVoucherOperations = useVoucherOperations;
