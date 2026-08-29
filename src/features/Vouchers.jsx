function Vouchers({ vouchers = [], setVouchers, accounts = [], setAccounts, journal = [], setJournal, showToast, customers = [], setCustomers, orders = [], setOrders, currency, expenses = [], setExpenses, purchases = [], employees = [] }) {
  const currencyDisplay = currency?.display || "SAR";

  const [formData, setFormData] = useState({
    v_no: '',
    v_type: 'سند صرف',
    party: '',
    amount: '',
    currency: typeof CURRENCIES !== 'undefined' ? (typeof CURRENCIES[0] === 'object' ? CURRENCIES[0].value : CURRENCIES[0]) : 'SAR',
    date: TODAY_STR_ISO,
    notes: '',
    pay_method: typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقدي',
    acc_code: '101.01 - صندوق فرع الورشة والمعمل (صنعاء)',
    target_acc: '201 - ذمم الموردين ومحلات الأقمشة'
  });
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل'); // 'الكل' | 'سند قبض' | 'سند صرف'
  const [viewVoucher, setViewVoucher] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── بوابة العمليات المالية المركزية (Financial Hub) ──
  const [activeHubCategory, setActiveHubCategory] = useState('general'); // 'general' | 'customers' | 'hr' | 'inventory'

  // ── حالة نافذة إصدار السند المتقدم بتعدد طرق الدفع (Split Payments Modal) ──
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [modalMode, setModalMode] = useState('receipt'); // 'receipt' | 'payment'
  const [modalDocType, setModalDocType] = useState('subparty'); // 'subparty' | 'account'
  const [modalParty, setModalParty] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalCurrency, setModalCurrency] = useState('YER ﷼');
  const [modalExchangeRate, setModalExchangeRate] = useState('1.0');
  const [modalTargetAcc, setModalTargetAcc] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [splitPayments, setSplitPayments] = useState([
    { id: 1, method: 'نقداً (صندوق الورشة)', acc_code: '101.01', amount: '' }
  ]);
  const [isSubmittingAdv, setIsSubmittingAdv] = useState(false);

  // حالة تعديل وحذف السند المالي
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [editVoucherData, setEditVoucherData] = useState({
    id: null,
    v_no: '',
    v_type: 'سند صرف',
    party: '',
    amount: '',
    currency: 'YER ﷼',
    exchange_rate: '1.0',
    pay_method: 'نقدي',
    acc_code: '101.01 - صندوق فرع الورشة والمعمل (صنعاء)',
    target_acc: '201 - ذمم الموردين ومحلات الأقمشة',
    date: TODAY_STR_ISO,
    notes: ''
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);

  // ── محرر قيد اليومية المركب (Compound Multi-Leg Balanced Journal) ──
  const [showCompoundModal, setShowCompoundModal] = useState(false);
  const [compoundForm, setCompoundForm] = useState({
    entry_no: '',
    date: TODAY_STR_ISO,
    currency: 'YER ﷼',
    exchange_rate: '1.0',
    ref_type: 'قيد مركب',
    ref_id: '',
    general_notes: ''
  });
  const [compoundLines, setCompoundLines] = useState([
    { id: 1, account_code: '101.01', link_subparty: false, party_type: 'customer', party_id: '', debit: '', credit: '', notes: '' },
    { id: 2, account_code: '301', link_subparty: false, party_type: 'supplier', party_id: '', debit: '', credit: '', notes: '' }
  ]);
  const [isSubmittingCompound, setIsSubmittingCompound] = useState(false);

  const compoundCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(compoundForm.currency) : 'YER';

  useEffect(() => {
    if (window.CurrencyService) {
      const rate = window.CurrencyService.getRate(compoundCurrCode);
      setCompoundForm(prev => ({ ...prev, exchange_rate: String(rate) }));
    }
  }, [compoundForm.currency, compoundCurrCode]);

  const compoundTotals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    compoundLines.forEach(l => {
      totalDebit += parseFloat(l.debit) || 0;
      totalCredit += parseFloat(l.credit) || 0;
    });
    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff < 0.01 && totalDebit > 0;
    return { totalDebit, totalCredit, diff, isBalanced };
  }, [compoundLines]);

  const handleOpenCompoundModal = () => {
    setCompoundForm({
      entry_no: `JV-CMP-${Date.now().toString().slice(-6)}`,
      date: TODAY_STR_ISO,
      currency: 'YER ﷼',
      exchange_rate: '1.0',
      ref_type: 'قيد مركب',
      ref_id: '',
      general_notes: ''
    });
    setCompoundLines([
      { id: 1, account_code: '101.01', link_subparty: false, party_type: 'customer', party_id: '', debit: '', credit: '', notes: '' },
      { id: 2, account_code: '301', link_subparty: false, party_type: 'supplier', party_id: '', debit: '', credit: '', notes: '' }
    ]);
    setShowCompoundModal(true);
  };

  const handleAddCompoundLine = () => {
    setCompoundLines(prev => [
      ...prev,
      { id: Date.now() + Math.random(), account_code: '', link_subparty: false, party_type: 'customer', party_id: '', debit: '', credit: '', notes: '' }
    ]);
  };

  const handleDuplicateCompoundLine = (idx) => {
    const target = compoundLines[idx];
    if (!target) return;
    const duplicated = { ...target, id: Date.now() + Math.random() };
    const next = [...compoundLines];
    next.splice(idx + 1, 0, duplicated);
    setCompoundLines(next);
  };

  const handleDeleteCompoundLine = (idx) => {
    if (compoundLines.length <= 2) {
      showToast('يجب أن يحتوي القيد المركب على سطرين على الأقل ⚠️', 'warning');
      return;
    }
    setCompoundLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCompoundLineChange = (idx, field, val) => {
    setCompoundLines(prev => {
      const copy = [...prev];
      if (field === 'debit' && val) {
        copy[idx] = { ...copy[idx], debit: val, credit: '' };
      } else if (field === 'credit' && val) {
        copy[idx] = { ...copy[idx], credit: val, debit: '' };
      } else {
        copy[idx] = { ...copy[idx], [field]: val };
      }
      return copy;
    });
  };

  const handleSubmitCompound = async (e) => {
    if (e) e.preventDefault();
    if (!compoundTotals.isBalanced) {
      return showToast('القيد غير متوازن! يجب أن يتساوى إجمالي المدين مع إجمالي الدائن ⚠️', 'error');
    }
    const hasEmptyAccount = compoundLines.some(l => !l.account_code && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0));
    if (hasEmptyAccount) {
      return showToast('يرجى تحديد حساب لكل سطر مالي ⚠️', 'error');
    }

    setIsSubmittingCompound(true);
    try {
      const rate = parseFloat(compoundForm.exchange_rate) || 1.0;
      const txId = `TX-CMP-${Date.now()}`;
      const entryNo = compoundForm.entry_no || `JV-CMP-${Date.now().toString().slice(-6)}`;

      const debits = compoundLines.filter(l => (parseFloat(l.debit) || 0) > 0);
      const credits = compoundLines.filter(l => (parseFloat(l.credit) || 0) > 0);

      const generatedEntries = [];
      const primaryDebitLabel = debits.map(d => `${d.account_code}: ${(parseFloat(d.debit) || 0).toLocaleString()} ${compoundCurrCode}`).join(' + ');
      const primaryCreditLabel = credits.map(c => `${c.account_code}: ${(parseFloat(c.credit) || 0).toLocaleString()} ${compoundCurrCode}`).join(' + ');

      compoundLines.forEach(l => {
        const dAmt = parseFloat(l.debit) || 0;
        const cAmt = parseFloat(l.credit) || 0;
        const lineAmt = dAmt > 0 ? dAmt : cAmt;
        if (lineAmt <= 0) return;

        const isDebitLine = dAmt > 0;
        const accCode = l.account_code;
        const accObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(accCode));
        const accLabel = accObj ? `${accObj.code || accObj.acc_code} - ${accObj.name || accObj.account_name}` : accCode;

        let subPartyNote = '';
        if (l.link_subparty && l.party_id) {
          subPartyNote = ` [الجهة: ${l.party_id}]`;
        }

        generatedEntries.push({
          id: Date.now() + Math.random(),
          transaction_id: txId,
          entry_no: entryNo,
          debit: isDebitLine ? accLabel : primaryDebitLabel,
          credit: !isDebitLine ? accLabel : primaryCreditLabel,
          debit_code: isDebitLine ? accCode : '',
          credit_code: !isDebitLine ? accCode : '',
          amount: lineAmt,
          currency: compoundCurrCode,
          exchange_rate: rate,
          base_amount: lineAmt * rate,
          ref_type: compoundForm.ref_type || 'قيد مركب',
          ref_id: entryNo,
          date: compoundForm.date || TODAY_STR_ISO,
          notes: `${compoundForm.general_notes ? compoundForm.general_notes + ' | ' : ''}${l.notes || (isDebitLine ? 'طرف مدين' : 'طرف دائن')}${subPartyNote}`,
          status: 'posted'
        });
      });

      if (setJournal) {
        setJournal(prev => [...generatedEntries, ...(prev || [])]);
      }

      // Update real-time account balances
      if (typeof setAccounts === 'function') {
        setAccounts(prev => (prev || []).map(acc => {
          const c = String(acc.code || acc.acc_code || '');
          let delta = 0;
          compoundLines.forEach(l => {
            if (String(l.account_code) === c) {
              const dAmt = (parseFloat(l.debit) || 0) * rate;
              const cAmt = (parseFloat(l.credit) || 0) * rate;
              if (acc.type === 'أصول' || acc.type === 'مصروفات' || acc.type === 'تكلفة المبيعات' || acc.nature === 'debit') {
                delta += (dAmt - cAmt);
              } else {
                delta += (cAmt - dAmt);
              }
            }
          });
          if (delta !== 0) {
            const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) + delta;
            return { ...acc, current_balance: curBal, balance: curBal };
          }
          return acc;
        }));
      }

      if (typeof window.callGAS === 'function') {
        generatedEntries.forEach(j => window.callGAS('addJournalEntry', j).catch(e => console.error(e)));
      }

      showToast(`تم ترحيل واعتماد القيد المركب (${entryNo}) بنجاح 📑✨`);
      setShowCompoundModal(false);
    } catch (err) {
      console.error("Compound entry submit error:", err);
      showToast('حدث خطأ أثناء اعتماد القيد المركب', 'error');
    } finally {
      setIsSubmittingCompound(false);
    }
  };

  // تحديث سعر الصرف التلقائي للنافذة المتقدمة
  const advCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(modalCurrency) : 'YER';
  useEffect(() => {
    if (window.CurrencyService) {
      const rate = window.CurrencyService.getRate(advCurrCode);
      setModalExchangeRate(String(rate));
    }
  }, [modalCurrency, advCurrCode]);

  // دوال إدارة أسطر طرق الدفع المتعددة
  const handleAddPaymentRow = () => {
    setSplitPayments(prev => [
      ...prev,
      { id: Date.now() + Math.random(), method: 'تحويل بنكي (الكريمي)', acc_code: '103', amount: '' }
    ]);
  };

  const handleDuplicatePaymentRow = (idx) => {
    const target = splitPayments[idx];
    if (!target) return;
    const duplicated = { ...target, id: Date.now() + Math.random() };
    const next = [...splitPayments];
    next.splice(idx + 1, 0, duplicated);
    setSplitPayments(next);
  };

  const handleDeletePaymentRow = (idx) => {
    if (splitPayments.length <= 1) {
      showToast('يجب أن يحتوي السند على طريقة دفع واحدة على الأقل ⚠️', 'warning');
      return;
    }
    setSplitPayments(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePaymentRowChange = (idx, field, val) => {
    setSplitPayments(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const splitTotalAmount = useMemo(() => {
    return splitPayments.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  }, [splitPayments]);

  const handleOpenAdvancedModal = (mode = 'receipt', defaultParty = '', defaultNotes = '', defaultAcc = '') => {
    setModalMode(mode);
    setModalDocType('subparty');
    setModalParty(defaultParty || '');
    setModalPhone('');
    if (defaultParty) {
      const foundCust = (customers || []).find(c => c.name === defaultParty);
      if (foundCust && foundCust.phone) setModalPhone(foundCust.phone);
    }
    setModalCurrency('YER ﷼');
    setModalExchangeRate('1.0');
    setModalTargetAcc(defaultAcc || (mode === 'receipt' ? '104' : '201'));
    setModalNotes(defaultNotes || '');
    setSplitPayments([
      { id: 1, method: mode === 'receipt' ? 'نقداً (صندوق الورشة)' : 'نقداً (صندوق الورشة)', acc_code: '101.01', amount: '' }
    ]);
    setShowAdvancedModal(true);
  };

  // إرسال إشعار WhatsApp رسمي للسند
  const handleSendWhatsAppNotification = (v) => {
    if (!v) return;
    const vNo = v.v_no || v.id;
    const vType = v.v_type;
    const vParty = v.party;
    const vAmt = Number(v.amount).toLocaleString('en-US');
    const vCurr = v.currency;
    const vDate = v.date;
    const vMethod = v.pay_method;
    const vNotes = v.notes && v.notes !== '—' ? v.notes : 'تسديد دفعة حساب';

    let targetPhone = '';
    const foundCust = (customers || []).find(c => c.name === vParty);
    if (foundCust && foundCust.phone) targetPhone = foundCust.phone.replace(/[^0-9]/g, '');

    const message = `👑 *مؤسسة Little Princesses للأزياء الراقية والفساتين الفاخرة*\n\n` +
      `📄 *إشعار ${vType} معتمد رسمياً:*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🔹 *رقم السند:* ${vNo}\n` +
      `🔹 *الطرف المستفيد:* ${vParty}\n` +
      `🔹 *المبلغ المسدد:* ${vAmt} ${vCurr}\n` +
      `🔹 *طريقة الدفع:* ${vMethod}\n` +
      `🔹 *التاريخ:* ${vDate}\n` +
      `🔹 *البيان:* ${vNotes}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `✨ نشكركم لتعاملكم الراقي مع دار Little Princesses للأزياء.`;

    const cleanPhone = targetPhone ? (targetPhone.startsWith('967') || targetPhone.startsWith('966') ? targetPhone : `967${targetPhone.replace(/^0+/, '')}`) : '';
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
  };

  // اعتماد وحفظ السند المتقدم بتعدد طرق الدفع
  const handleSubmitAdvancedVoucher = async (e) => {
    if (e) e.preventDefault();
    if (!modalParty) return showToast('يرجى اختيار أو كتابة اسم الطرف المستفيد ⚠️', 'error');
    if (splitTotalAmount <= 0) return showToast('يرجى إدخال مبالغ الدفع في السند ⚠️', 'error');

    setIsSubmittingAdv(true);
    try {
      const isReceipt = modalMode === 'receipt';
      const voucherNo = `${isReceipt ? 'RV' : 'PV'}-${Date.now().toString().slice(-6)}`;
      const vCurr = advCurrCode;
      const vRate = parseFloat(modalExchangeRate) || 1.0;
      const vBaseAmt = splitTotalAmount * vRate;

      // Primary pay method summary
      const payMethodsSummary = splitPayments.map(p => `${p.method}: ${(parseFloat(p.amount) || 0).toLocaleString()} ${vCurr}`).join(' + ');

      const newV = {
        id: Date.now(),
        v_no: voucherNo,
        voucher_no: voucherNo,
        payment_no: voucherNo,
        v_type: isReceipt ? 'سند قبض' : 'سند صرف',
        voucher_type: isReceipt ? 'سند قبض' : 'سند صرف',
        payment_type: isReceipt ? 'سند قبض' : 'سند صرف',
        party: modalParty,
        party_name: modalParty,
        phone: modalPhone || '',
        amount: splitTotalAmount,
        currency: vCurr,
        exchange_rate: vRate,
        base_amount: vBaseAmt,
        date: TODAY_STR_ISO,
        date_created: TODAY_STR_ISO,
        notes: modalNotes || `${isReceipt ? 'سند قبض' : 'سند صرف'} - ${modalParty} (${payMethodsSummary})`,
        pay_method: payMethodsSummary,
        payment_method: payMethodsSummary,
        acc_code: splitPayments[0]?.acc_code || '101.01',
        target_acc: modalTargetAcc || (isReceipt ? '104' : '201')
      };

      if (setVouchers) setVouchers(prev => [newV, ...(prev || [])]);

      // Generate Journal Entries for each payment method line
      const generatedEntries = splitPayments.filter(p => (parseFloat(p.amount) || 0) > 0).map(p => {
        const lineAmt = parseFloat(p.amount) || 0;
        const lineBaseAmt = lineAmt * vRate;
        const cashAccCode = p.acc_code || '101.01';
        const targetAccCode = modalTargetAcc || (isReceipt ? '104' : '201');

        const debitAcc = isReceipt ? cashAccCode : targetAccCode;
        const creditAcc = isReceipt ? targetAccCode : cashAccCode;

        const debitObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(debitAcc));
        const creditObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(creditAcc));

        return {
          id: Date.now() + Math.random(),
          transaction_id: `TX-VCH-${voucherNo}`,
          entry_no: 'AUTO-VCH-' + voucherNo,
          debit: debitObj ? `${debitObj.code || debitObj.acc_code} - ${debitObj.name || debitObj.account_name}` : debitAcc,
          credit: creditObj ? `${creditObj.code || creditObj.acc_code} - ${creditObj.name || creditObj.account_name}` : creditAcc,
          debit_code: debitAcc,
          credit_code: creditAcc,
          amount: lineAmt,
          currency: vCurr,
          exchange_rate: vRate,
          base_amount: lineBaseAmt,
          ref_type: isReceipt ? 'RECEIPT_VOUCHER' : 'PAYMENT_VOUCHER',
          ref_id: voucherNo,
          date: TODAY_STR_ISO,
          notes: `سند ${isReceipt ? 'قبض' : 'صرف'} [${p.method}]: ${modalParty} - ${modalNotes || ''}`,
          status: 'posted'
        };
      });

      if (setJournal) setJournal(prev => [...generatedEntries, ...(prev || [])]);

      // Dynamic real-time accounts balance update in React state
      if (typeof setAccounts === 'function') {
        setAccounts(prev => (prev || []).map(acc => {
          const c = String(acc.code || acc.acc_code || '');
          let delta = 0;
          // Cash accounts side
          splitPayments.forEach(p => {
            if ((parseFloat(p.amount) || 0) > 0 && String(p.acc_code) === c) {
              const lineBase = (parseFloat(p.amount) || 0) * vRate;
              delta += isReceipt ? lineBase : -lineBase;
            }
          });
          // Target offset account side
          if (String(modalTargetAcc) === c || (modalTargetAcc && c.startsWith(modalTargetAcc))) {
            const isTargetAssetOrExpense = acc.type === 'أصول' || acc.type === 'مصروفات' || acc.type === 'تكلفة المبيعات' || acc.nature === 'debit';
            if (isReceipt) {
              // Receipt: Credit to target account
              delta += isTargetAssetOrExpense ? -vBaseAmt : vBaseAmt;
            } else {
              // Payment: Debit to target account
              delta += isTargetAssetOrExpense ? vBaseAmt : -vBaseAmt;
            }
          }
          if (delta !== 0) {
            const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) + delta;
            return { ...acc, current_balance: curBal, balance: curBal };
          }
          return acc;
        }));
      }

      // Save locally & to GAS
      fetch('/api/vouchers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newV)
      }).catch(err => console.warn('Local voucher save error:', err));

      if (typeof window.callGAS === 'function') {
        window.callGAS('addVoucher', newV).catch(e => console.error(e));
        generatedEntries.forEach(j => window.callGAS('addJournalEntry', j).catch(e => console.error(e)));
      }

      showToast(`تم إصدار وتمرير ${isReceipt ? 'سند القبض' : 'سند الصرف'} (${voucherNo}) بنجاح 🧾✨`);
      setShowAdvancedModal(false);
    } catch (err) {
      console.error("Advanced voucher error:", err);
      showToast('حدث خطأ أثناء إصدار السند', 'error');
    } finally {
      setIsSubmittingAdv(false);
    }
  };

  const normalizeVoucher = (v) => {
    if (!v) return null;
    const rawNo = String(v.v_no || v.voucher_no || v.payment_no || v.reference_no || `VCH-${v.id || ''}`).trim();
    if (rawNo.includes('TEST') || rawNo.includes('test')) return null;
    const rawType = v.v_type || v.voucher_type || v.payment_type || v.type || (String(rawNo).includes('PV') || String(rawNo).includes('EXP') ? 'سند صرف' : 'سند قبض');
    const isReceipt = rawType === 'سند قبض' || rawType === 'RECEIPT' || rawType === 'قبض' || String(rawNo).includes('RV');
    const typeLabel = isReceipt ? 'سند قبض' : 'سند صرف';
    
    // الطرف: العميل في القبض، المورد أو المستفيد في الصرف
    let party = v.party || v.party_name || '';
    if (!party) {
      if (isReceipt) party = v.customer_id || v.customer_name || v.customer || '';
      else party = v.supplier_id || v.supplier_name || v.supplier || v.beneficiary || v.recipient || '';
    }
    if (!party) party = isReceipt ? 'عميلة عامة' : 'مورد / مستفيد عام';
    
    const payMethod = v.pay_method || v.payment_method || v.pay_type || 'نقدي';
    const amount = parseFloat(String(v.amount !== undefined ? v.amount : (v.base_amount || v.amt || 0)).replace(/,/g, '')) || 0;
    const curr = v.currency || currencyDisplay;
    let dateStr = v.date || v.date_created || v.created_at || TODAY_STR_ISO;
    if (dateStr && String(dateStr).includes('T')) dateStr = String(dateStr).split('T')[0];
    const notes = v.notes || v.note || v.description || '—';
    const account = v.acc_code || v.account_id || v.payment_source || '101 - الصندوق الرئيسي';
    const targetAccount = v.target_acc || v.debit_account || v.credit_account || (isReceipt ? '104 - ذمم العملاء' : '201 - ذمم الموردين');

    return {
      id: v.id || rawNo,
      v_no: rawNo,
      v_type: typeLabel,
      isReceipt,
      party,
      amount,
      currency: curr,
      pay_method: payMethod,
      date: dateStr,
      notes,
      account,
      target_account: targetAccount,
      image_path: v.image_path || v.receipt_url || ''
    };
  };

  const filteredVouchers = useMemo(() => {
    return (vouchers || []).map(normalizeVoucher).filter(v => {
      if (!v) return false;
      const matchType = typeFilter === 'الكل' || v.v_type === typeFilter;
      const q = (search || '').toLowerCase();
      const matchSearch = !search ||
        String(v.v_no || '').toLowerCase().includes(q) ||
        String(v.party || '').toLowerCase().includes(q) ||
        String(v.notes || '').toLowerCase().includes(q) ||
        String(v.account || '').toLowerCase().includes(q) ||
        String(v.pay_method || '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [vouchers, search, typeFilter]);

  const totals = useMemo(() => {
    let receipts = 0, payments = 0;
    (vouchers || []).forEach(item => {
      const v = normalizeVoucher(item);
      if (v) {
        if (v.isReceipt) receipts += v.amount;
        else payments += v.amount;
      }
    });
    return { receipts, payments, net: receipts - payments };
  }, [vouchers]);

  // ── إعادة جلب ومزامنة السندات المالية فوراً من السيرفر وشيت السندات_المالية ──
  const refreshVouchers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let combined = [];
      // 1. Live Google Sheets
      try {
        if (typeof window.callGAS === 'function') {
          const gasRes = await window.callGAS('getVouchers');
          const gasList = (gasRes && Array.isArray(gasRes.data)) ? gasRes.data : (Array.isArray(gasRes) ? gasRes : []);
          if (gasList.length > 0) combined.push(...gasList);
        }
      } catch (ge) {
        console.warn("GAS getVouchers warning:", ge);
      }

      // 2. Local Backend
      try {
        const beRes = await fetch('/api/vouchers').then(r => r.json());
        const beList = (beRes && Array.isArray(beRes.data)) ? beRes.data : (Array.isArray(beRes) ? beRes : []);
        if (beList.length > 0) combined.push(...beList);
      } catch (be) {
        console.warn("Local vouchers fetch warning:", be);
      }

      if (combined.length > 0) {
        const uniq = new Map();
        combined.forEach(v => {
          const key = String(v.v_no || v.voucher_no || v.payment_no || v.id || '').trim();
          if (key && !uniq.has(key)) uniq.set(key, v);
        });
        const mergedList = Array.from(uniq.values());
        if (setVouchers) setVouchers(mergedList);
      }
    } catch (err) {
      console.error("refreshVouchers error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [setVouchers]);

  useEffect(() => {
    refreshVouchers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.party || !formData.amount) return showToast('الطرف والمبلغ مطلوبان ⚠️', 'error');
    
    const voucherNo = formData.v_no || `${formData.v_type === 'سند قبض' ? 'RV' : 'PV'}-${Date.now().toString().slice(-6)}`;
    const vCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(formData.currency) : 'YER';
    const vRate = window.CurrencyService ? window.CurrencyService.getRate(vCurrCode) : 1.0;
    const vBaseObj = window.CurrencyService ? window.CurrencyService.toBase(formData.amount, vCurrCode, vRate) : { base_amount: parseFloat(formData.amount) || 0, exchange_rate: vRate };

    const selectedCashAcc = formData.acc_code ? formData.acc_code.split(' - ')[0].trim() : '101';
    const defaultTarget = formData.v_type === 'سند صرف' ? '201' : '104';
    const selectedTargetAcc = formData.target_acc ? formData.target_acc.split(' - ')[0].trim() : defaultTarget;

    const isReceipt = formData.v_type === 'سند قبض';
    // Fix 1: Auto-Debit in Payment Voucher posts to user-selected target account (e.g. 502, 201, 102, etc.)
    const debitAccCode = isReceipt ? selectedCashAcc : selectedTargetAcc;
    const creditAccCode = isReceipt ? selectedTargetAcc : selectedCashAcc;

    const debitAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(debitAccCode));
    const creditAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(creditAccCode));
    const debitAccLabel = debitAccObj ? `${debitAccObj.code || debitAccObj.acc_code} - ${debitAccObj.name || debitAccObj.account_name}` : debitAccCode;
    const creditAccLabel = creditAccObj ? `${creditAccObj.code || creditAccObj.acc_code} - ${creditAccObj.name || creditAccObj.account_name}` : creditAccCode;

    const newV = {
      id: Date.now(),
      v_no: voucherNo,
      voucher_no: voucherNo,
      payment_no: voucherNo,
      v_type: formData.v_type,
      voucher_type: formData.v_type,
      payment_type: formData.v_type,
      party: formData.party,
      party_name: formData.party,
      amount: parseFloat(formData.amount) || 0,
      currency: vCurrCode,
      exchange_rate: vRate,
      base_amount: vBaseObj.base_amount,
      date: formData.date || TODAY_STR_ISO,
      date_created: formData.date || TODAY_STR_ISO,
      notes: formData.notes,
      pay_method: formData.pay_method,
      payment_method: formData.pay_method,
      acc_code: formData.acc_code || '101 - الصندوق الرئيسي',
      account_id: formData.acc_code || '101 - الصندوق الرئيسي',
      payment_source: formData.acc_code || '101 - الصندوق الرئيسي',
      target_acc: formData.target_acc || (isReceipt ? '104 - ذمم العملاء' : '201 - ذمم الموردين'),
      debit_account: debitAccLabel,
      credit_account: creditAccLabel,
      customer_id: isReceipt ? formData.party : '',
      supplier_id: !isReceipt ? formData.party : ''
    };
    
    // Optimistic UI updates
    if (setVouchers) setVouchers([newV, ...(vouchers || [])]);

    const newJEntry = {
        id: Date.now() + 1,
        transaction_id: `TX-VCH-${voucherNo}`,
        entry_no: 'AUTO-VCH-' + voucherNo,
        debit: debitAccLabel,
        credit: creditAccLabel,
        debit_account_id: debitAccLabel,
        credit_account_id: creditAccLabel,
        amount: newV.amount,
        currency: vCurrCode,
        exchange_rate: vRate,
        base_amount: vBaseObj.base_amount,
        ref_type: isReceipt ? 'RECEIPT_VOUCHER' : 'PAYMENT_VOUCHER',
        ref_id: voucherNo,
        date: newV.date,
        notes: `قيد آلي: ${newV.notes || newV.v_type + ' - ' + newV.party}`,
        status: 'posted'
    };
    if (setJournal) setJournal(prev => [newJEntry, ...(prev || [])]);

    // If payment voucher is for an expense account, add to expenses
    let newExp = null;
    if (!isReceipt && (debitAccLabel.startsWith('5') || debitAccLabel.startsWith('6') || debitAccLabel.includes('مصروف'))) {
      newExp = {
        id: Date.now() + 2,
        expense_no: voucherNo,
        category: debitAccLabel,
        exp_category: debitAccLabel,
        amount: parseFloat(newV.amount) || 0,
        currency: vCurrCode,
        exchange_rate: vRate,
        base_amount: vBaseObj.base_amount,
        date: newV.date,
        payment_method: newV.pay_method,
        pay_method: newV.pay_method,
        account_id: creditAccLabel,
        payment_source: creditAccLabel,
        recipient: newV.party,
        notes: newV.notes || `سند صرف: ${newV.party}`,
        status: 'posted'
      };
      if (setExpenses) setExpenses(prev => [newExp, ...(prev || [])]);
    }

    // Dynamic accounts balance update in React state
    if (typeof setAccounts === 'function') {
      setAccounts(prev => (prev || []).map(acc => {
        const c = String(acc.code || acc.acc_code || '');
        if (c === selectedCashAcc || (selectedCashAcc && c.startsWith(selectedCashAcc))) {
          const delta = isReceipt ? vBaseObj.base_amount : -vBaseObj.base_amount;
          const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) + delta;
          return { ...acc, current_balance: curBal, balance: curBal };
        }
        if (c === selectedTargetAcc || (selectedTargetAcc && c.startsWith(selectedTargetAcc))) {
          const delta = isReceipt ? -vBaseObj.base_amount : vBaseObj.base_amount;
          const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) + delta;
          return { ...acc, current_balance: curBal, balance: curBal };
        }
        return acc;
      }));
    }

    try {
      // 1. Post to local backend
      fetch('/api/vouchers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newV)
      }).catch(err => console.warn('Local voucher save error:', err));

      // 2. Post to GAS
      const res = await callGAS('addVoucher', newV);
      callGAS('addJournalEntry', newJEntry).catch(e => console.error(e));
      if (newExp) {
        callGAS('addExpense', newExp).catch(e => console.error(e));
      }

      if (newV.v_type === 'سند قبض' && selectedCustomer) {
          if (selectedOrder && setOrders) {
              setOrders((orders || []).map(o => {
                if (o.order_no === selectedOrder) {
                   const newPaid = (o.paid || 0) + parseFloat(newV.amount);
                   return { ...o, paid: newPaid, remaining: Math.max(0, o.total - newPaid) };
                }
                return o;
              }));
          }
          
          if (setCustomers) {
              setCustomers((customers || []).map(c => {
                 if (c.name === selectedCustomer) {
                     const cSales = c.ledger?.total_sales || 0;
                     const cDeliv = c.ledger?.delivery || 0;
                     const cPaid = (c.ledger?.total_paid || 0) + parseFloat(newV.amount);
                     return {
                        ...c,
                        ledger: {
                            ...c.ledger,
                            total_paid: cPaid,
                            remaining: Math.max(0, (cSales + cDeliv) - cPaid)
                        }
                     }
                 }
                 return c;
              }));
          }
          
          fetch('/api/gas', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
              body: JSON.stringify({
                  action: 'addOrderPayment',
                  customer_name: selectedCustomer,
                  order_no: selectedOrder,
                  amount: newV.amount,
                  currency: newV.currency,
                  notes: newV.notes
              })
          }).catch(e => console.error(e));
      }

      showToast('تم حفظ السند وترحيل القيد بنجاح 🧾');
      setFormData(prev => ({...prev, amount: '', notes: '', v_no: '', party: ''}));
      setSelectedCustomer('');
      setSelectedOrder('');
    } catch (err) {
      console.warn("Voucher save fallback:", err);
      showToast('تم الحفظ محلياً ⚡');
    }
  };

  const handleOpenEditVoucher = (v) => {
    if (!v) return;
    const norm = normalizeVoucher(v);
    const vCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(norm.currency) : (norm.currency || 'YER');
    const vRate = v.exchange_rate || (window.CurrencyService ? window.CurrencyService.getRate(vCurrCode) : 1.0);

    setEditingVoucher(v);
    setEditVoucherData({
      id: norm.id,
      v_no: norm.v_no,
      v_type: norm.v_type,
      party: norm.party,
      amount: String(norm.amount || ''),
      currency: vCurrCode === 'USD' ? 'USD $' : (vCurrCode === 'SAR' ? 'SAR ﷼' : 'YER ﷼'),
      exchange_rate: String(vRate),
      pay_method: norm.pay_method || 'نقدي',
      acc_code: norm.account || '101 - الصندوق الرئيسي',
      target_acc: norm.target_account || (norm.v_type === 'سند صرف' ? '201 - ذمم الموردين' : '104 - ذمم العملاء'),
      date: norm.date || TODAY_STR_ISO,
      notes: norm.notes === '—' ? '' : norm.notes
    });
  };

  const handleSaveEditVoucher = async (e) => {
    e.preventDefault();
    if (!editVoucherData.party || !editVoucherData.amount) {
      return showToast('الطرف والمبلغ مطلوبان ⚠️', 'error');
    }

    setIsSubmittingEdit(true);
    try {
      const vCurrCode = window.CurrencyService ? window.CurrencyService.normalizeCode(editVoucherData.currency) : 'YER';
      const vRate = parseFloat(editVoucherData.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(vCurrCode) : 1.0);
      const amt = parseFloat(editVoucherData.amount) || 0;
      const vBaseObj = window.CurrencyService ? window.CurrencyService.toBase(amt, vCurrCode, vRate) : { base_amount: amt * vRate, exchange_rate: vRate };
      
      const selectedCashAcc = editVoucherData.acc_code ? editVoucherData.acc_code.split(' - ')[0].trim() : '101';
      const defaultTarget = editVoucherData.v_type === 'سند صرف' ? '201' : '104';
      const selectedTargetAcc = editVoucherData.target_acc ? editVoucherData.target_acc.split(' - ')[0].trim() : defaultTarget;
      
      const isReceipt = editVoucherData.v_type === 'سند قبض';
      const debitAccCode = isReceipt ? selectedCashAcc : selectedTargetAcc;
      const creditAccCode = isReceipt ? selectedTargetAcc : selectedCashAcc;

      const debitAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(debitAccCode));
      const creditAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(creditAccCode));
      const debitLabel = debitAccObj ? `${debitAccObj.code || debitAccObj.acc_code} - ${debitAccObj.name || debitAccObj.account_name}` : debitAccCode;
      const creditLabel = creditAccObj ? `${creditAccObj.code || creditAccObj.acc_code} - ${creditAccObj.name || creditAccObj.account_name}` : creditAccCode;

      const updatedV = {
        ...editingVoucher,
        id: editingVoucher.id || editVoucherData.v_no,
        v_no: editVoucherData.v_no,
        voucher_no: editVoucherData.v_no,
        payment_no: editVoucherData.v_no,
        v_type: editVoucherData.v_type,
        voucher_type: editVoucherData.v_type,
        payment_type: editVoucherData.v_type,
        party: editVoucherData.party,
        party_name: editVoucherData.party,
        amount: amt,
        currency: vCurrCode,
        exchange_rate: vRate,
        base_amount: vBaseObj.base_amount,
        date: editVoucherData.date,
        date_created: editVoucherData.date,
        notes: editVoucherData.notes,
        pay_method: editVoucherData.pay_method,
        payment_method: editVoucherData.pay_method,
        acc_code: editVoucherData.acc_code,
        account_id: editVoucherData.acc_code,
        payment_source: editVoucherData.acc_code,
        target_acc: editVoucherData.target_acc || (isReceipt ? '104 - ذمم العملاء' : '201 - ذمم الموردين'),
        debit_account: debitLabel,
        credit_account: creditLabel
      };

      // 1. Update vouchers in UI state
      if (setVouchers) {
        setVouchers(prev => (prev || []).map(v => {
          const curNo = v.v_no || v.voucher_no || v.payment_no || v.id;
          return (curNo === editVoucherData.v_no || v.id === editingVoucher.id) ? updatedV : v;
        }));
      }

      // 2. Update linked Journal Entry in UI state
      if (setJournal) {
        setJournal(prev => (prev || []).map(j => {
          const isLinked = j.ref_id === editVoucherData.v_no || j.entry_no === 'AUTO-VCH-' + editVoucherData.v_no || j.entry_no === 'JV-PUR-' + editVoucherData.v_no || j.ref_id === editingVoucher.id;
          if (isLinked) {
            return {
              ...j,
              debit: debitLabel,
              credit: creditLabel,
              amount: amt,
              currency: vCurrCode,
              exchange_rate: vRate,
              base_amount: vBaseObj.base_amount,
              date: editVoucherData.date,
              notes: `قيد آلي: ${editVoucherData.notes || editVoucherData.v_type + ' - ' + editVoucherData.party}`
            };
          }
          return j;
        }));
      }

      // 3. Update local backend
      try {
        await fetch('/api/vouchers/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedV)
        });
      } catch(beErr) {
        console.warn("Backend voucher update warning:", beErr);
      }

      // 4. Update Google Apps Script
      try {
        if (typeof window.callGAS === 'function') {
          await window.callGAS('updateVoucher', updatedV);
        }
      } catch(gasErr) {
        console.warn("GAS voucher update warning:", gasErr);
      }

      showToast('✅ تم تعديل السند المالي ومزامنة القيود والأستاذ العام بنجاح ✏️');
      setEditingVoucher(null);
    } catch(err) {
      console.error("Save edit voucher error:", err);
      showToast('حدث خطأ أثناء تعديل السند', 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteVoucher = async (v) => {
    if (!v) return;
    const norm = normalizeVoucher(v);
    if (!window.confirm(`⚠️ هل أنت متأكد من حذف ${norm.v_type} رقم (${norm.v_no})؟\n\n(سيتم حذف السند وإلغاء وعكس أثره المالي فوراً من دفتر الأستاذ والقيود اليومية وشجرة الحسابات)`)) {
      return;
    }

    setIsDeletingId(norm.id);
    try {
      // 1. Remove from vouchers state
      if (setVouchers) {
        setVouchers(prev => (prev || []).filter(item => {
          const curNo = item.v_no || item.voucher_no || item.payment_no || item.id;
          return curNo !== norm.v_no && item.id !== norm.id;
        }));
      }

      // 2. Remove linked journal entry from journal state
      if (setJournal) {
        setJournal(prev => (prev || []).filter(j => {
          const isLinked = j.ref_id === norm.v_no || j.entry_no === 'AUTO-VCH-' + norm.v_no || j.entry_no === 'JV-PUR-' + norm.v_no || j.ref_id === norm.id;
          return !isLinked;
        }));
      }

      // 3. Delete from Local Backend
      try {
        await fetch('/api/vouchers/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: norm.id, voucher_no: norm.v_no })
        });
      } catch(beErr) {
        console.warn("Backend voucher delete warning:", beErr);
      }

      // 4. Delete from Google Apps Script
      try {
        if (typeof window.callGAS === 'function') {
          await window.callGAS('deleteVoucher', { id: norm.id, voucher_no: norm.v_no });
          await window.callGAS('deleteJournalEntry', { ref_id: norm.v_no, entry_no: 'AUTO-VCH-' + norm.v_no });
        }
      } catch(gasErr) {
        console.warn("GAS voucher delete warning:", gasErr);
      }

      showToast('✅ تم حذف السند المالي وتحديث الأستاذ العام وشجرة الحسابات بنجاح 🗑️');
    } catch(err) {
      console.error("Delete voucher error:", err);
      showToast('حدث خطأ أثناء حذف السند', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#009FAE] focus:ring-2 focus:ring-[#E2F5F7] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* نافذة معاينة وطباعة تفاصيل السند المالي */}
      {viewVoucher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setViewVoucher(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-[#E8E5EA] space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{viewVoucher.isReceipt ? '📥' : '📤'}</span>
                <div>
                  <h3 className="font-bold text-sm text-[#25232A]">تفاصيل {viewVoucher.v_type}</h3>
                  <span className="text-xs font-mono font-bold text-[#8F2A87]">{viewVoucher.v_no}</span>
                </div>
              </div>
              <button onClick={() => setViewVoucher(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold p-1">✕</button>
            </div>

            <div className="space-y-3 bg-[#FAFAFB] p-4 rounded-xl border border-[#E8E5EA] text-xs">
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">{viewVoucher.isReceipt ? 'استلمنا من:' : 'صرفنا إلى (المستفيد):'}</span>
                <span className="font-bold text-[#25232A] text-sm">{viewVoucher.party}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">المبلغ:</span>
                <span className="font-bold font-mono text-base text-[#007F8C]">
                  {viewVoucher.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {viewVoucher.currency}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">طريقة الدفع:</span>
                <span className="font-bold text-[#25232A]">{viewVoucher.pay_method}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">الحساب المالي:</span>
                <span className="font-bold text-[#25232A]">{viewVoucher.account}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-semibold">تاريخ السند:</span>
                <span className="font-mono text-[#25232A]">{viewVoucher.date}</span>
              </div>
              <div>
                <span className="text-[#6F6B75] font-semibold block mb-1">البيان والملاحظات:</span>
                <p className="text-[#25232A] font-medium bg-white p-2 rounded-lg border border-[#E8E5EA]">{viewVoucher.notes}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => window.print()} 
                className="flex-1 py-2.5 bg-[#009FAE] hover:bg-[#007F8C] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🖨️</span>
                <span>طباعة السند</span>
              </button>
              <button 
                onClick={() => setViewVoucher(null)} 
                className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold text-xs rounded-xl border border-[#E8E5EA] cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── بطاقة إحصائيات السندات المالية ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0] flex items-center justify-center text-xl font-bold shadow-xs">
              🧾
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                السندات المالية والقبض والصرف (Financial Vouchers & Cash Management)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                إدارة سندات القبض وسندات الصرف وتتبع المدفوعات للموردين والمقبوضات من العملاء
              </p>
            </div>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#E8E5EA] bg-[#FAFAFB] divide-x divide-x-reverse divide-[#E8E5EA]">
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي السندات</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#25232A] mt-1 block">
              {(vouchers || []).length.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">سند</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي سندات القبض (مقبوضات)</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#007F8C] mt-1 block">
              {totals.receipts.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">إجمالي سندات الصرف (مدفوعات)</span>
            <span className="text-xl font-extrabold font-mono tabular-nums text-[#D64545] mt-1 block">
              {totals.payments.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
          <div className="p-4 text-center">
            <span className="text-xs font-semibold text-[#6F6B75] block">صافي الحركة النقدية</span>
            <span className={`text-xl font-extrabold font-mono tabular-nums mt-1 block ${totals.net >= 0 ? 'text-[#137333]' : 'text-[#D64545]'}`}>
              {totals.net.toLocaleString('en-US')} <span className="text-xs font-medium text-[#6F6B75]">{currencyDisplay}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── بوابة العمليات المالية المركزية (Financial Operations Hub) ── */}
      <div className="bg-[#1e2433] text-white rounded-3xl border border-[#2d3748] shadow-2xl p-6 space-y-6">
        
        {/* شريط البحث السريع والعلوي */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#2d3748] pb-5">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-lg font-bold">
              🏛️
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">إدارة الشؤون والعمليات المالية 👑</h2>
              <p className="text-[11px] text-[#94a3b8]">بوابة التحصيل والصرف والقيود المحاسبية لمؤسسة Little Princesses</p>
            </div>
          </div>

          {/* محرك البحث السريع الشامل */}
          <div className="relative w-full md:w-96">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 البحث السريع في العميلات، الموردين، العقود، السندات..."
              className="w-full h-11 pl-4 pr-10 rounded-2xl border border-[#374151] bg-[#111827] text-white text-xs placeholder:text-gray-500 focus:border-[#00E5FF] outline-none transition"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
          </div>
        </div>

        {/* المجموعات الأربع للعمليات المالية المركزية */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* المجموعة 1: المالية والقيود العامة */}
          <div className="bg-[#181d2a] p-4 rounded-2xl border border-[#2d3748] space-y-3 hover:border-amber-400/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">🏛️ المالية والقيود العامة</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('receipt')}
                className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📥</span>
                <span>سندات القبض</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('payment')}
                className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📤</span>
                <span>سندات الصرف</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('receipt', 'محمد فلاح', 'إيداع حصة في رأس المال المباشر', '3111')}
                className="py-2 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-amber-500/20"
                title="إصدار سند قبض إيداع رأس مال الشركاء والمؤسسين"
              >
                <span>👑</span>
                <span>إيداع رأس مال</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCompoundModal}
                className="py-2 px-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-cyan-500/20"
                title="فتح محرر قيد اليومية المركب المتزن (Multi-Leg)"
              >
                <span>📑</span>
                <span>قيد مركب متزن</span>
              </button>
            </div>
          </div>

          {/* المجموعة 2: شؤون وتحصيلات العميلات والطلبات */}
          <div className="bg-[#181d2a] p-4 rounded-2xl border border-[#2d3748] space-y-3 hover:border-[#00E5FF]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#00E5FF]">👗 شؤون وتحصيلات العميلات</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('receipt', '', 'تحصيل دفعة فستان / تسليم طلب', '4111')}
                className="py-2 px-2.5 rounded-xl bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-[#00E5FF]/20"
              >
                <span>👗</span>
                <span>تحصيل الطلبات</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('receipt', '', 'عربون حجز فستان للعميلة', '2121')}
                className="py-2 px-2.5 rounded-xl bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-[#00E5FF]/20"
              >
                <span>💎</span>
                <span>عرابين الحجوزات</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('receipt', 'مبيعات معرض فورية', 'مبيعات فستان جاهز من المعرض', '4121')}
                className="py-1.5 px-2 rounded-xl bg-[#2d3748]/50 hover:bg-[#2d3748] text-gray-300 text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer border border-[#374151]"
              >
                <span>🛍️</span>
                <span>مبيعات المعرض</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('payment', '', 'تسوية مرتجع فستان / استرداد دفعة', '4111')}
                className="py-1.5 px-2 rounded-xl bg-[#2d3748]/50 hover:bg-[#2d3748] text-gray-300 text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer border border-[#374151]"
              >
                <span>🔄</span>
                <span>مرتجع وتسويات</span>
              </button>
            </div>
          </div>

          {/* المجموعة 3: الموارد البشرية وأجور المشغل والعهد */}
          <div className="bg-[#181d2a] p-4 rounded-2xl border border-[#2d3748] space-y-3 hover:border-purple-400/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400">🧵 أجور المشغل والعهد</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('payment', '', 'صرف أجور خياطة وتصنيع مباشرة', '5121')}
                className="py-2 px-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-purple-500/20"
              >
                <span>✂️</span>
                <span>أجور الخياطين</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('payment', '', 'صرف سلفة نقدية للخياط/العامل', '1141')}
                className="py-2 px-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-purple-500/20"
              >
                <span>📅</span>
                <span>السلف الشهرية</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('payment', 'مشرف الورشة والمعمل', 'صرف عهدة نقدية للمشغل', '1121')}
                className="py-1.5 px-2 rounded-xl bg-[#2d3748]/50 hover:bg-[#2d3748] text-gray-300 text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer border border-[#374151]"
              >
                <span>💼</span>
                <span>عهد الورشة</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('receipt', 'مشرف الورشة والمعمل', 'تسوية عهدة واسترداد المتبقي', '1121')}
                className="py-1.5 px-2 rounded-xl bg-[#2d3748]/50 hover:bg-[#2d3748] text-gray-300 text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer border border-[#374151]"
              >
                <span>⚖️</span>
                <span>تسوية العهد</span>
              </button>
            </div>
          </div>

          {/* المجموعة 4: مشتريات ومخزون الأقمشة */}
          <div className="bg-[#181d2a] p-4 rounded-2xl border border-[#2d3748] space-y-3 hover:border-emerald-400/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">📦 مشتريات الأقمشة والمخزون</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('payment', '', 'سداد فاتورة توريد أقمشة وخامات', '2111')}
                className="py-2 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-emerald-500/20"
              >
                <span>🧵</span>
                <span>توريد أقمشة</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAdvancedModal('payment', '', 'صرف أقمشة ومستلزمات للتشغيل (WIP)', '1152')}
                className="py-2 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-emerald-500/20"
              >
                <span>🪡</span>
                <span>تسليم مستلزمات</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAdvancedModal('payment', '', 'تسوية فروقات عجز الجرد', '5221')}
              className="w-full py-1.5 px-2 rounded-xl bg-[#2d3748]/50 hover:bg-[#2d3748] text-gray-300 text-[10px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer border border-[#374151]"
            >
              <span>📊</span>
              <span>مراجعة وتسوية فروقات الجرد</span>
            </button>
          </div>

        </div>

        {/* أزرار الإصدار المباشرة الكبيرة */}
        <div className="flex items-center justify-between pt-2 border-t border-[#2d3748] flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenAdvancedModal('receipt')}
              className="px-6 py-3 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span className="text-base font-bold">+</span>
              <span>إصدار سند قبض جديد 📥</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAdvancedModal('payment')}
              className="px-6 py-3 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 transition flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span className="text-base font-bold">+</span>
              <span>إصدار سند صرف جديد 📤</span>
            </button>
          </div>

          <span className="text-xs text-gray-400">
            👑 سندات موثقة ومربوطة آلياً بالأستاذ العام وقوقل شيتس
          </span>
        </div>

      </div>

      {/* ── جدول سجل السندات المالية ── */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <h3 className="font-bold text-sm text-[#25232A]">سجل السندات المالية</h3>
            <span className="text-xs bg-[#E2F5F7] text-[#007F8C] font-bold px-2.5 py-0.5 rounded-full font-mono">{filteredVouchers.length}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-semibold text-[#25232A] outline-none cursor-pointer"
            >
              <option value="الكل">جميع السندات</option>
              <option value="سند قبض">سندات القبض (مقبوضات)</option>
              <option value="سند صرف">سندات الصرف (مدفوعات)</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-3 pr-8 h-10 rounded-xl border border-[#E8E5EA] bg-[#FAFAFB] text-xs font-medium w-full focus:bg-white focus:border-[#009FAE] outline-none"
                placeholder="بحث برقم السند أو اسم الطرف..."
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F6B75] text-xs pointer-events-none">🔍</span>
            </div>

            <button
              type="button"
              onClick={refreshVouchers}
              disabled={isRefreshing}
              title="تحديث ومزامنة السندات من السحابة"
              className="h-10 px-3 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#007F8C] border border-[#E8E5EA] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
              <span className="text-xs hidden sm:inline">{isRefreshing ? 'جاري التحديث...' : 'تحديث'}</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[#E8E5EA] overflow-hidden bg-white">
          {filteredVouchers.length === 0 ? (
            <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد سندات مسجلة تطابق البحث 🧾</div>
          ) : (
            <table className="w-full text-xs table-fixed border-collapse">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="px-3 py-3 text-right w-[9%]">النوع</th>
                  <th className="px-3 py-3 text-right w-[14%]">رقم السند</th>
                  <th className="px-3 py-3 text-right w-[16%]">الطرف (المستفيد / العميل)</th>
                  <th className="px-3 py-3 text-left w-[13%]">المبلغ</th>
                  <th className="px-3 py-3 text-right w-[11%]">طريقة الدفع</th>
                  <th className="px-3 py-3 text-right w-[18%]">الحساب المالي</th>
                  <th className="px-3 py-3 text-center w-[10%]">التاريخ</th>
                  <th className="px-3 py-3 text-center w-[9%]">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {filteredVouchers.map(v => {
                  const accLabel = (() => {
                    const rawAcc = v.account || v.acc_code || v.account_id || v.payment_source || '';
                    if (!rawAcc) return '101 - الصندوق الرئيسي';
                    const cleanStr = String(rawAcc).trim();
                    const accCodeOnly = cleanStr.split(' - ')[0].trim();
                    const match = (accounts || []).find(a => String(a.code || a.acc_code || a.id) === accCodeOnly);
                    if (match) {
                      const rawName = match.name || match.account_name || match.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (match.name_en || match.code);
                      return `${match.code || match.acc_code} - ${name}`;
                    }
                    return cleanStr;
                  })();

                  const currSymbol = (() => {
                    const c = String(v.currency || currencyDisplay || 'SAR').trim();
                    if (c.includes('SAR') || c.includes('سعودي')) return 'SAR';
                    if (c.includes('USD') || c.includes('دولار') || c.includes('$')) return 'USD';
                    if (c.includes('YER') || c.includes('يمني') || c.includes('﷼')) return 'YER';
                    return c;
                  })();

                  return (
                    <tr key={v.id || v.v_no} className="hover:bg-[#FAFAFB] transition-colors border-b border-[#E8E5EA]">
                      {/* الخلية 1 (النوع): شارة نوع السند (سند صرف / قبض) فقط */}
                      <td className="px-3 py-3 text-right align-middle whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap ${v.isReceipt ? 'bg-[#E2F5F7] text-[#007F8C] border-[#C5ECF0]' : 'bg-rose-50 text-[#D64545] border-rose-200'}`}>
                          {v.v_type}
                        </span>
                      </td>

                      {/* الخلية 2 (رقم السند): كود ورقم السند كاملاً */}
                      <td className="px-3 py-3 text-right align-middle font-bold text-[#8F2A87] text-xs whitespace-nowrap truncate" title={v.v_no}>
                        <span className="font-mono">{v.v_no}</span>
                      </td>

                      {/* الخلية 3 (الطرف): اسم المستفيد / العميل (محاذاة يمين text-right) */}
                      <td className="px-3 py-3 text-right align-middle font-bold text-[#25232A] text-xs whitespace-nowrap truncate" title={v.party}>
                        {v.party || '—'}
                      </td>

                      {/* الخلية 4 (المبلغ): المبلغ والعملة (محاذاة يسار text-left font-mono tabular-nums) */}
                      <td className="px-3 py-3 text-left align-middle font-bold text-xs text-[#25232A] whitespace-nowrap dir-ltr">
                        <span className="font-mono tabular-nums">{(parseFloat(v.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> <span className="text-[10px] font-normal text-[#6F6B75] mr-0.5">{currSymbol}</span>
                      </td>

                      {/* الخلية 5 (طريقة الدفع): طريقة الدفع فقط (نص أو شارة مستقلة) */}
                      <td className="px-3 py-3 text-right align-middle text-[#25232A] text-xs font-medium whitespace-nowrap truncate">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#FAFAFB] border border-[#E8E5EA] text-[#25232A] text-[11px]">
                          {v.pay_method || 'نقدي'}
                        </span>
                      </td>

                      {/* الخلية 6 (الحساب المالي): اسم الحساب المالي / الصندوق (فصل التاريخ عنه تماماً) */}
                      <td className="px-3 py-3 text-right align-middle text-[#25232A] text-xs font-medium whitespace-nowrap truncate" title={accLabel}>
                        {accLabel || '101 - الصندوق الرئيسي'}
                      </td>

                      {/* الخلية 7 (التاريخ): تاريخ السند فقط (محاذاة وسط text-center font-mono) */}
                      <td className="px-3 py-3 text-center align-middle text-[#6F6B75] text-xs whitespace-nowrap">
                        <span className="font-mono tabular-nums">{v.date || '—'}</span>
                      </td>

                      {/* الخلية 8 (إجراءات - أقصى اليسار): أزرار الإجراءات (معاينة، تعديل، حذف) */}
                      <td className="px-3 py-3 text-center align-middle whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            type="button"
                            onClick={() => handleSendWhatsAppNotification(v)}
                            title="إرسال إشعار رسمي بالسند عبر واتساب WhatsApp"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg transition cursor-pointer flex items-center justify-center font-bold"
                          >
                            <span className="text-xs">⚡</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => setViewVoucher(v)} 
                            title="معاينة وطباعة السند"
                            className="p-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#007F8C] border border-[#E8E5EA] rounded-lg transition cursor-pointer flex items-center justify-center"
                          >
                            <Icons.Eye className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleOpenEditVoucher(v)} 
                            title="تعديل السند المالي ومزامنة القيود"
                            className="p-1.5 bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] border border-[#C5ECF0] rounded-lg transition cursor-pointer flex items-center justify-center"
                          >
                            <Icons.Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteVoucher(v)} 
                            disabled={isDeletingId === (v.id || v.v_no)}
                            title="حذف السند وعكس أثره المالي"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-[#D64545] border border-rose-200 rounded-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center"
                          >
                            <Icons.Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal تعديل السند المالي ومزامنة القيود والأستاذ العام ── */}
      {editingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-2xl max-w-xl w-full overflow-hidden text-right" dir="rtl">
            <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F5F7] text-[#007F8C] flex items-center justify-center text-sm font-bold border border-[#C5ECF0]">
                  ✏️
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#25232A]">تعديل {editVoucherData.v_type}: {editVoucherData.v_no}</h2>
                  <p className="text-[11px] text-[#6F6B75]">تعديل المبالغ والأطراف وتحديث دفتر الأستاذ والقيود اليومية آلياً</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingVoucher(null)}
                className="w-8 h-8 rounded-lg text-[#6F6B75] hover:bg-[#F3F2F5] hover:text-[#25232A] flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditVoucher} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>رقم السند</label>
                  <input
                    type="text"
                    className={inputCls + " font-mono"}
                    value={editVoucherData.v_no}
                    onChange={e => setEditVoucherData({ ...editVoucherData, v_no: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>نوع السند</label>
                  <select
                    className={inputCls}
                    value={editVoucherData.v_type}
                    onChange={e => setEditVoucherData({ ...editVoucherData, v_type: e.target.value })}
                  >
                    <option value="سند قبض">سند قبض (استلام نقدية)</option>
                    <option value="سند صرف">سند صرف (دفع نقدية)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    {editVoucherData.v_type === 'سند قبض' ? 'حساب الزبون / العميلة (استلمنا من) *' : 'صرفنا إلى (الطرف المستفيد / المورد) *'}
                  </label>
                  <input
                    type="text"
                    required
                    className={inputCls}
                    value={editVoucherData.party}
                    onChange={e => setEditVoucherData({ ...editVoucherData, party: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelCls}>المبلغ <span className="text-[#D64545] font-bold">*</span></label>
                  <input
                    type="number"
                    step="any"
                    required
                    className={inputCls + " font-mono font-bold text-[#25232A]"}
                    value={editVoucherData.amount}
                    onChange={e => setEditVoucherData({ ...editVoucherData, amount: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelCls}>العملة <span className="text-[#D64545] font-bold">*</span></label>
                  <select
                    className={inputCls}
                    value={editVoucherData.currency}
                    onChange={e => {
                      const newCurr = e.target.value;
                      const cCode = window.CurrencyService ? window.CurrencyService.normalizeCode(newCurr) : 'YER';
                      const newRate = window.CurrencyService ? window.CurrencyService.getRate(cCode) : 1.0;
                      setEditVoucherData({ ...editVoucherData, currency: newCurr, exchange_rate: String(newRate) });
                    }}
                  >
                    {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {window.CurrencyService && window.CurrencyService.normalizeCode(editVoucherData.currency) !== 'YER' && (
                  <div>
                    <label className={labelCls}>سعر الصرف وقت العملية (مقابل YER)</label>
                    <input
                      type="number"
                      step="any"
                      className={inputCls + " font-mono font-bold text-[#8F2A87]"}
                      value={editVoucherData.exchange_rate}
                      onChange={e => setEditVoucherData({ ...editVoucherData, exchange_rate: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label className={labelCls}>طريقة الدفع</label>
                  <select
                    className={inputCls}
                    value={editVoucherData.pay_method}
                    onChange={e => setEditVoucherData({ ...editVoucherData, pay_method: e.target.value })}
                  >
                    {["نقدي", "حوالة بنكية", "تحويل إلكتروني"].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>حساب الصندوق / البنك (الدفع/الاستلام)</label>
                  <select
                    className={inputCls}
                    value={editVoucherData.acc_code}
                    onChange={e => setEditVoucherData({ ...editVoucherData, acc_code: e.target.value })}
                  >
                    <option value="">-- اختر حساب --</option>
                    {accounts.map(a => {
                      const code = a.code || a.acc_code || a.id;
                      const rawName = a.name || a.account_name || a.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                      const label = `${code} - ${name}`;
                      return <option key={code} value={label}>{label}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    {editVoucherData.v_type === 'سند صرف' ? 'الحساب المدين (بند المصروف / المورد / الأصل)' : 'الحساب الدائن (حساب العميل / الإيراد)'}
                  </label>
                  <select
                    className={inputCls}
                    value={editVoucherData.target_acc}
                    onChange={e => setEditVoucherData({ ...editVoucherData, target_acc: e.target.value })}
                  >
                    <option value="">-- اختر الحساب المقابل --</option>
                    {accounts.map(a => {
                      const code = a.code || a.acc_code || a.id;
                      const rawName = a.name || a.account_name || a.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                      const label = `${code} - ${name}`;
                      return <option key={code} value={label}>{label}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>تاريخ السند</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={editVoucherData.date}
                    onChange={e => setEditVoucherData({ ...editVoucherData, date: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>البيان / ملاحظات السند</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={editVoucherData.notes}
                    onChange={e => setEditVoucherData({ ...editVoucherData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E5EA]">
                <button
                  type="button"
                  onClick={() => setEditingVoucher(null)}
                  className="px-5 py-2.5 rounded-xl border border-[#E8E5EA] text-[#6F6B75] hover:bg-[#FAFAFB] font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[#009FAE] hover:bg-[#007F8C] transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Icons.Check className="w-4 h-4" />
                  <span>{isSubmittingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات والمزامنة 💾'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── نافذة إصدار سند مالي متقدم بتعدد طرق الدفع (Split Payments & WhatsApp) ── */}
      {showAdvancedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto" dir="rtl">
          <div className="bg-[#1e2433] text-white rounded-3xl border border-[#2d3748] shadow-2xl w-full max-w-4xl overflow-hidden my-8 transition-all">
            
            {/* رأس النافذة */}
            <div className="px-6 py-4 border-b border-[#2d3748] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181d2a]">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold border shadow-xs ${
                  modalMode === 'receipt' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {modalMode === 'receipt' ? '📥' : '📤'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      إصدار {modalMode === 'receipt' ? 'سند قبض تحصيل' : 'سند صرف نقدية'}
                    </h3>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      modalMode === 'receipt' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}>
                      {modalMode === 'receipt' ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER'}
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8]">توثيق وتوزيع الدفعات على الصناديق والبنوك مع الترحيل التلقائي لدفتر الأستاذ</p>
                </div>
              </div>

              {/* تبديل نوع السند وإغلاق */}
              <div className="flex items-center gap-2.5">
                <div className="bg-[#111827] p-1 rounded-xl border border-[#2d3748] flex gap-1">
                  <button
                    type="button"
                    onClick={() => setModalMode('receipt')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      modalMode === 'receipt' ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    سند قبض 🟢
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('payment')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      modalMode === 'payment' ? 'bg-rose-500 text-white shadow-xs' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    سند صرف 🔴
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvancedModal(false)}
                  className="w-9 h-9 rounded-xl bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* محتوى الاستمارة */}
            <form onSubmit={handleSubmitAdvancedVoucher} className="p-6 space-y-5">
              
              {/* خيارات تحديد الطرف: مستفيد فرعي أو حساب عام */}
              <div className="p-4 rounded-2xl bg-[#181d2a]/70 border border-[#2d3748] space-y-4">
                <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
                  <span className="text-xs font-bold text-gray-300">الجهة المستهدفة والطرف المالي:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        name="docType"
                        checked={modalDocType === 'subparty'}
                        onChange={() => setModalDocType('subparty')}
                        className="accent-[#00E5FF]"
                      />
                      <span>جهة فرعية (عميلة / مورد / موظف)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        name="docType"
                        checked={modalDocType === 'account'}
                        onChange={() => setModalDocType('account')}
                        className="accent-[#00E5FF]"
                      />
                      <span>حساب عام من الدليل</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                      {modalMode === 'receipt' ? 'اسم العميلة / الطرف المسدد *' : 'اسم المستفيد / المورد / الموظف *'}
                    </label>
                    {modalDocType === 'subparty' ? (
                      <div className="space-y-1.5">
                        <select
                          value={modalParty}
                          onChange={e => {
                            const val = e.target.value;
                            setModalParty(val);
                            const found = (customers || []).find(c => c.name === val) || (employees || []).find(emp => emp.name === val);
                            if (found && found.phone) setModalPhone(found.phone);
                          }}
                          className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-semibold focus:border-[#00E5FF] outline-none"
                        >
                          <option value="">-- اختر من السجلات المسجلة أو اكتب أدناه --</option>
                          <optgroup label="👗 العميلات المسجلات">
                            {(customers || []).map(c => <option key={c.id || c.name} value={c.name}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                          </optgroup>
                          <optgroup label="🧵 موردو الأقمشة">
                            {[...new Set((purchases || []).map(p => p.supplier || p.vendor_name).filter(Boolean))].map(s => <option key={s} value={s}>{s}</option>)}
                          </optgroup>
                          <optgroup label="✂️ الموظفون والخياطون">
                            {(employees || []).map(emp => <option key={emp.id || emp.name} value={emp.name}>{emp.name}</option>)}
                          </optgroup>
                        </select>
                        <input
                          type="text"
                          placeholder="أو اكتب اسماً جديداً يدوياً..."
                          value={modalParty}
                          onChange={e => setModalParty(e.target.value)}
                          className="w-full h-9 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs placeholder:text-gray-500 focus:border-[#00E5FF] outline-none"
                        />
                      </div>
                    ) : (
                      <select
                        value={modalParty}
                        onChange={e => setModalParty(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-semibold focus:border-[#00E5FF] outline-none"
                      >
                        <option value="">-- اختر حساب من الدليل --</option>
                        {(accounts || []).map(a => {
                          const code = a.code || a.acc_code || a.id;
                          const rawName = a.name || a.account_name || a.acc_name || '';
                          const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                          return <option key={code} value={`${code} - ${name}`}>{code} - ${name}</option>;
                        })}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1.5 flex items-center justify-between">
                      <span>رقم الهاتف (واتساب / إشعار)</span>
                      <span className="text-emerald-400 font-normal">WhatsApp 📱</span>
                    </label>
                    <input
                      type="text"
                      placeholder="770000000"
                      value={modalPhone}
                      onChange={e => setModalPhone(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-mono focus:border-emerald-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1.5">عملة السند</label>
                    <select
                      value={modalCurrency}
                      onChange={e => setModalCurrency(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-bold focus:border-[#00E5FF] outline-none"
                    >
                      {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1.5">سعر الصرف (مقابل YER)</label>
                    <input
                      type="number"
                      step="any"
                      value={modalExchangeRate}
                      onChange={e => setModalExchangeRate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-amber-400 text-xs font-mono font-bold focus:border-[#00E5FF] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1.5">الحساب المالي المقابل (دليل الحسابات)</label>
                    <select
                      value={modalTargetAcc}
                      onChange={e => setModalTargetAcc(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-semibold focus:border-[#00E5FF] outline-none"
                    >
                      <option value="">-- اختر الحساب المقابل من الدليل --</option>
                      
                      <optgroup label="👑 حقوق الملكية ورأس المال">
                        {(accounts || []).filter(a => String(a.code || a.acc_code).startsWith('3') && !a.is_group).map(a => {
                          const code = a.code || a.acc_code || a.id;
                          const rawName = a.name || a.account_name || a.acc_name || '';
                          const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                          return <option key={code} value={code}>{code} - {name}</option>;
                        })}
                      </optgroup>

                      <optgroup label="👗 العملاء والمدينون">
                        {(accounts || []).filter(a => String(a.code || a.acc_code).startsWith('104') && !a.is_group).map(a => {
                          const code = a.code || a.acc_code || a.id;
                          const rawName = a.name || a.account_name || a.acc_name || '';
                          const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                          return <option key={code} value={code}>{code} - {name}</option>;
                        })}
                      </optgroup>

                      <optgroup label="🧵 الموردون والالتزامات">
                        {(accounts || []).filter(a => String(a.code || a.acc_code).startsWith('2') && !a.is_group).map(a => {
                          const code = a.code || a.acc_code || a.id;
                          const rawName = a.name || a.account_name || a.acc_name || '';
                          const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                          return <option key={code} value={code}>{code} - {name}</option>;
                        })}
                      </optgroup>

                      <optgroup label="💎 الإيرادات والمبيعات">
                        {(accounts || []).filter(a => String(a.code || a.acc_code).startsWith('4') && !a.is_group).map(a => {
                          const code = a.code || a.acc_code || a.id;
                          const rawName = a.name || a.account_name || a.acc_name || '';
                          const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                          return <option key={code} value={code}>{code} - {name}</option>;
                        })}
                      </optgroup>

                      <optgroup label="📦 تكاليف النشاط ومواد الخياطة">
                        {(accounts || []).filter(a => String(a.code || a.acc_code).startsWith('5') && !a.is_group).map(a => {
                          const code = a.code || a.acc_code || a.id;
                          const rawName = a.name || a.account_name || a.acc_name || '';
                          const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                          return <option key={code} value={code}>{code} - {name}</option>;
                        })}
                      </optgroup>

                      <optgroup label="💼 المصروفات التشغيلية والرواتب">
                        {(accounts || []).filter(a => String(a.code || a.acc_code).startsWith('6') && !a.is_group).map(a => {
                          const code = a.code || a.acc_code || a.id;
                          const rawName = a.name || a.account_name || a.acc_name || '';
                          const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                          return <option key={code} value={code}>{code} - {name}</option>;
                        })}
                      </optgroup>

                      <optgroup label="🏢 الأصول الثابتة والمكائن">
                        {(accounts || []).filter(a => (String(a.code || a.acc_code).startsWith('105') || String(a.code || a.acc_code).startsWith('106') || String(a.code || a.acc_code).startsWith('102')) && !a.is_group).map(a => {
                          const code = a.code || a.acc_code || a.id;
                          const rawName = a.name || a.account_name || a.acc_name || '';
                          const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                          return <option key={code} value={code}>{code} - {name}</option>;
                        })}
                      </optgroup>

                      <optgroup label="💵 الصناديق والبنوك (التحويلات)">
                        {(accounts || []).filter(a => (String(a.code || a.acc_code).startsWith('101') || String(a.code || a.acc_code).startsWith('103')) && !a.is_group).map(a => {
                          const code = a.code || a.acc_code || a.id;
                          const rawName = a.name || a.account_name || a.acc_name || '';
                          const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                          return <option key={code} value={code}>{code} - {name}</option>;
                        })}
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* قسم توزيع وسائل وطرق الدفع المتعددة */}
              <div className="p-4 rounded-2xl bg-[#181d2a]/70 border border-[#2d3748] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400">💳 طرق وتوزيع دفعات التحصيل (Payment Distribution)</span>
                    <span className="text-[11px] text-gray-400">يمكنك توزيع المبلغ على أكثر من صندوق أو حساب بنكي</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPaymentRow}
                    className="px-3 py-1.5 rounded-xl bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>+</span>
                    <span>إضافة طريقة دفع</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {splitPayments.map((row, idx) => (
                    <div key={row.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-[#111827] p-2.5 rounded-xl border border-[#2d3748]">
                      <div className="sm:col-span-6">
                        <select
                          value={`${row.method}__${row.acc_code}`}
                          onChange={e => {
                            const [m, c] = e.target.value.split('__');
                            handlePaymentRowChange(idx, 'method', m);
                            handlePaymentRowChange(idx, 'acc_code', c);
                          }}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#181d2a] text-white text-xs font-semibold focus:border-[#00E5FF] outline-none"
                        >
                          <option value="نقداً (الصندوق الرئيسي)__1111">💵 نقداً - الصندوق الرئيسي (1111)</option>
                          <option value="تحويل بنكي (الكريمي)__1112">🏦 تحويل بنكي - حساب بنك الكريمي (1112)</option>
                          <option value="محفظة إلكترونية (جوالي/كاش)__1112">📱 محفظة إلكترونية - جوالي / كاش / فلوسك (1112)</option>
                          <option value="شبكة نقاط بيع POS__1112">💳 شبكة ومدى نقاط بيع POS (1112)</option>
                          <option value="عهدة الورشة والمشغل__1121">💼 عهد الورشة والمشغل (1121)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={row.amount}
                            onChange={e => handlePaymentRowChange(idx, 'amount', e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-[#374151] bg-[#181d2a] text-[#00E5FF] font-mono font-bold text-xs text-left focus:border-[#00E5FF] outline-none"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">{advCurrCode}</span>
                        </div>
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDuplicatePaymentRow(idx)}
                          title="تكرار سطر الدفع"
                          className="w-8 h-8 rounded-lg bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePaymentRow(idx)}
                          title="حذف سطر الدفع"
                          className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs transition cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* شريط الإجمالي الكلي للدفعة */}
                <div className="flex items-center justify-between bg-[#111827] px-4 py-2.5 rounded-xl border border-[#2d3748]">
                  <span className="text-xs font-bold text-gray-300">إجمالي المبلغ المسدد في السند:</span>
                  <span className="font-mono font-bold text-base text-amber-400">
                    {splitTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {advCurrCode}
                  </span>
                </div>
              </div>

              {/* البيان والملاحظات */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">البيان والشرح المحاسبي للسند</label>
                <textarea
                  rows="2"
                  placeholder="اكتب شرحاً مفصلاً للعملية وملاحظات الدفعة..."
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs placeholder:text-gray-500 focus:border-[#00E5FF] outline-none"
                ></textarea>
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex items-center justify-between pt-3 border-t border-[#2d3748]">
                <button
                  type="button"
                  onClick={() => setShowAdvancedModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#374151] text-gray-300 hover:bg-[#2d3748] font-bold text-xs transition cursor-pointer"
                >
                  إلغاء الأمر
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmittingAdv || splitTotalAmount <= 0 || !modalParty}
                    className={`px-8 py-3 rounded-2xl font-bold text-xs text-white transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                      modalMode === 'receipt'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                        : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500'
                    }`}
                  >
                    <span>✓</span>
                    <span>{isSubmittingAdv ? 'جاري الاعتماد والترحيل...' : `اعتماد وتمرير ${modalMode === 'receipt' ? 'سند القبض' : 'سند الصرف'} 💾`}</span>
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      {/* ── نافذة محرر قيد اليومية المركب (القيود المزدوجة المتزنة) ── */}
      {showCompoundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto" dir="rtl">
          <div className="bg-[#1e2433] text-white rounded-3xl border border-[#2d3748] shadow-2xl w-full max-w-6xl overflow-hidden my-8 transition-all">
            
            {/* رأس النافذة */}
            <div className="px-6 py-4 border-b border-[#2d3748] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181d2a]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F5F7]/10 text-[#00E5FF] flex items-center justify-center text-lg font-bold border border-[#00E5FF]/20">
                  📑
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>محرر قيد اليومية المركب (القيود المزدوجة المتزنة)</span>
                    <span className="text-xs font-normal text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">متعدد الأطراف Multi-Leg</span>
                  </h3>
                  <p className="text-xs text-[#94a3b8]">إنشاء قيد محاسبي مركب من عدة أسطر مدينة ودائنة مع التحقق الفوري من التوازن</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddCompoundLine}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#00E5FF] bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="text-base leading-none">+</span>
                  <span>إضافة سطر حساب</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowCompoundModal(false)}
                  className="w-9 h-9 rounded-xl bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* بيانات رأس القيد العامة */}
            <div className="p-6 bg-[#181d2a]/60 border-b border-[#2d3748]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">رقم القيد</label>
                  <input
                    type="text"
                    value={compoundForm.entry_no}
                    onChange={e => setCompoundForm({ ...compoundForm, entry_no: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-mono font-bold focus:border-[#00E5FF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">تاريخ القيد</label>
                  <input
                    type="date"
                    value={compoundForm.date}
                    onChange={e => setCompoundForm({ ...compoundForm, date: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-mono focus:border-[#00E5FF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">العملة</label>
                  <select
                    value={compoundForm.currency}
                    onChange={e => setCompoundForm({ ...compoundForm, currency: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-bold focus:border-[#00E5FF] outline-none"
                  >
                    {["YER ﷼", "SAR ﷼", "USD $"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">سعر الصرف</label>
                  <input
                    type="number"
                    step="any"
                    value={compoundForm.exchange_rate}
                    onChange={e => setCompoundForm({ ...compoundForm, exchange_rate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs font-mono font-bold text-amber-400 focus:border-[#00E5FF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">نوع المرجع / العملية</label>
                  <select
                    value={compoundForm.ref_type}
                    onChange={e => setCompoundForm({ ...compoundForm, ref_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs focus:border-[#00E5FF] outline-none"
                  >
                    {["قيد مركب", "تسوية شاملة", "إيداع وتوزيع رأس مال", "توزيع أرباح", "رواتب مجمعة", "مشتريات أقمشة متعددة", "تسوية عهد ومصروفات"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="lg:col-span-5">
                  <label className="block text-[11px] font-bold text-gray-300 mb-1.5">البيان العام للقيد المركب</label>
                  <input
                    type="text"
                    placeholder="اكتب شرحاً عاماً وشاملاً لموضوع القيد المحاسبي المركب..."
                    value={compoundForm.general_notes}
                    onChange={e => setCompoundForm({ ...compoundForm, general_notes: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#374151] bg-[#111827] text-white text-xs focus:border-[#00E5FF] outline-none placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* جدول أسطر القيد المركب */}
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-[#111827] text-gray-300 font-bold border-b border-[#2d3748]">
                    <th className="px-3.5 py-3 text-right w-[30%]">رمز واسم الحساب في الدليل</th>
                    <th className="px-3.5 py-3 text-right w-[20%]">ربط جهة فرعية (اختياري)</th>
                    <th className="px-3.5 py-3 text-center w-[12%]">المدين (Debit)</th>
                    <th className="px-3.5 py-3 text-center w-[12%]">الدائن (Credit)</th>
                    <th className="px-3.5 py-3 text-right w-[20%]">شرح سطر الحساب</th>
                    <th className="px-3.5 py-3 text-center w-[6%]">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3748] bg-[#1a202c]">
                  {compoundLines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-[#222a3a] transition-colors">
                      {/* اختيار الحساب */}
                      <td className="px-3.5 py-2.5">
                        <select
                          value={line.account_code}
                          onChange={e => handleCompoundLineChange(idx, 'account_code', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-white text-xs font-semibold focus:border-[#00E5FF] outline-none"
                        >
                          <option value="">-- اختر حساب من الدليل --</option>
                          {(accounts || []).filter(a => !a.is_group).map(a => {
                            const code = a.code || a.acc_code || a.id;
                            const rawName = a.name || a.account_name || a.acc_name || '';
                            const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                            return <option key={code} value={code}>{code} - {name}</option>;
                          })}
                        </select>
                      </td>

                      {/* ربط جهة فرعية */}
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={line.link_subparty}
                              onChange={e => handleCompoundLineChange(idx, 'link_subparty', e.target.checked)}
                              className="rounded accent-[#00E5FF]"
                            />
                            <span>ربط جهة فرعية</span>
                          </label>

                          {line.link_subparty && (
                            <div className="flex gap-1.5">
                              <select
                                value={line.party_type}
                                onChange={e => handleCompoundLineChange(idx, 'party_type', e.target.value)}
                                className="w-1/3 h-8 px-1.5 rounded-lg border border-[#374151] bg-[#111827] text-white text-[11px] outline-none"
                              >
                                <option value="customer">عميلة 👗</option>
                                <option value="supplier">مورد 🧵</option>
                                <option value="employee">موظف ✂️</option>
                              </select>

                              <select
                                value={line.party_id}
                                onChange={e => handleCompoundLineChange(idx, 'party_id', e.target.value)}
                                className="w-2/3 h-8 px-2 rounded-lg border border-[#374151] bg-[#111827] text-white text-[11px] outline-none"
                              >
                                <option value="">-- اختر الاسم --</option>
                                {line.party_type === 'customer' && (customers || []).map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                                {line.party_type === 'supplier' && [...new Set((purchases || []).map(p => p.supplier || p.vendor_name).filter(Boolean))].map(s => <option key={s} value={s}>{s}</option>)}
                                {line.party_type === 'employee' && (employees || []).map(emp => <option key={emp.id || emp.name} value={emp.name}>{emp.name}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* مدين */}
                      <td className="px-3.5 py-2.5">
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={line.debit}
                          onChange={e => handleCompoundLineChange(idx, 'debit', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-[#00E5FF] font-mono font-bold text-xs text-left focus:border-[#00E5FF] outline-none"
                        />
                      </td>

                      {/* دائن */}
                      <td className="px-3.5 py-2.5">
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={line.credit}
                          onChange={e => handleCompoundLineChange(idx, 'credit', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-amber-400 font-mono font-bold text-xs text-left focus:border-amber-400 outline-none"
                        />
                      </td>

                      {/* ملاحظات السطر */}
                      <td className="px-3.5 py-2.5">
                        <input
                          type="text"
                          placeholder="ملاحظات السطر..."
                          value={line.notes}
                          onChange={e => handleCompoundLineChange(idx, 'notes', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[#374151] bg-[#111827] text-white text-xs focus:border-[#00E5FF] outline-none placeholder:text-gray-500"
                        />
                      </td>

                      {/* إجراءات السطر */}
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDuplicateCompoundLine(idx)}
                            title="تكرار هذا السطر"
                            className="w-7 h-7 rounded-lg bg-[#2d3748] hover:bg-[#374151] text-gray-300 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCompoundLine(idx)}
                            title="حذف السطر"
                            className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs transition cursor-pointer"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* شريط المجاميع والتوازن وزر الاعتماد والترحيل */}
            <div className="px-6 py-4 border-t border-[#2d3748] bg-[#111827] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-xs">
                  <span className="text-gray-400 font-semibold">إجمالي المدين: </span>
                  <span className="font-mono font-bold text-[#00E5FF] text-sm">{compoundTotals.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })} {compoundCurrCode}</span>
                </div>

                <div className="text-xs">
                  <span className="text-gray-400 font-semibold">إجمالي الدائن: </span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{compoundTotals.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} {compoundCurrCode}</span>
                </div>

                <div className="text-xs">
                  <span className="text-gray-400 font-semibold">الفرق: </span>
                  <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-full ${
                    compoundTotals.isBalanced ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {compoundTotals.diff.toLocaleString('en-US', { minimumFractionDigits: 2 })} {compoundCurrCode} {compoundTotals.isBalanced ? '✓ متزن' : '⚠️ غير متزن'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCompoundModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#374151] text-gray-300 hover:bg-[#2d3748] font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleSubmitCompound}
                  disabled={!compoundTotals.isBalanced || isSubmittingCompound}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>✓</span>
                  <span>{isSubmittingCompound ? 'جاري الاعتماد...' : 'اعتماد القيد المركب وترحيله'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
