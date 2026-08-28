const { useState, useEffect, useMemo, useCallback, useRef } = React;

function Expenses({ expenses = [], setExpenses, accounts = [], setAccounts, vouchers = [], setVouchers, journal = [], setJournal, showToast, currency }) {
  const currencyDisplay = currency?.display || "YER ﷼";
  const [isSyncing, setIsSyncing] = useState(false);
  const [showQuickAddCat, setShowQuickAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');

  const [formData, setFormData] = useState({
    exp_category: typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES[0] : '601 - أجور ورواتب الخياطين والمطرزين والموظفين',
    amount: '',
    currency: 'YER ﷼',
    date: TODAY_STR_ISO,
    notes: '',
    pay_method: typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقد (كاش)',
    source_acc: '101 - الصندوق الرئيسي'
  });

  const handleQuickAddCategory = async (e) => {
    if (e) e.preventDefault();
    if (!newCatName.trim()) return showToast('يرجى كتابة اسم بند المصروف ⚠️', 'error');

    let codeToUse = newCatCode.trim();
    if (!codeToUse) {
      const expCodes = (accounts || [])
        .filter(a => String(a.account_type || a.type || '').includes('مصروف') || String(a.code || a.acc_code).startsWith('6'))
        .map(a => parseInt(String(a.code || a.acc_code || '0')))
        .filter(n => !isNaN(n) && n >= 600 && n < 700);
      const maxCode = expCodes.length > 0 ? Math.max(...expCodes) : 607;
      codeToUse = String(maxCode + 1);
    }

    const newAcc = {
      code: codeToUse,
      account_code: codeToUse,
      name: newCatName.trim(),
      account_name: newCatName.trim(),
      name_en: '',
      account_type: 'مصروفات',
      parent_id: '6',
      parent_account_id: 'ACC-6',
      parent_account_code: '6',
      nature: 'debit',
      is_group: 0,
      is_active: 1,
      balance: 0.0,
      current_balance: 0.0,
      notes: 'بند مصروف تشغيلي معتمد في شجرة الحسابات'
    };

    if (typeof setAccounts === 'function') {
      setAccounts(prev => [...(prev || []), newAcc]);
    }

    const fullLabel = `${codeToUse} - ${newCatName.trim()}`;
    setFormData(prev => ({ ...prev, exp_category: fullLabel }));

    try {
      fetch('/api/accounts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAcc)
      }).catch(err => console.warn('Save account local note:', err));

      if (typeof window.callGAS === 'function') {
        await window.callGAS('addAccount', newAcc);
      }

      showToast(`تمت إضافة بند المصروف (${fullLabel}) إلى شجرة الحسابات وقوقل شيتس بنجاح 💸`);
      setShowQuickAddCat(false);
      setNewCatName('');
      setNewCatCode('');
    } catch (err) {
      console.warn('Quick add expense account warning:', err);
      showToast('تمت إضافة البند محلياً ⚡');
      setShowQuickAddCat(false);
    }
  };

  const fetchFreshExpenses = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Try local server first for instant response
      try {
        const [eRes, jRes, vRes] = await Promise.allSettled([
          fetch('/api/expenses').then(r => r.json()),
          fetch('/api/journal').then(r => r.json()),
          fetch('/api/vouchers').then(r => r.json())
        ]);
        if (eRes.status === 'fulfilled' && eRes.value?.data && setExpenses) {
          setExpenses(eRes.value.data);
        }
        if (jRes.status === 'fulfilled' && jRes.value?.data && setJournal) {
          setJournal(jRes.value.data);
        }
        if (vRes.status === 'fulfilled' && vRes.value?.data && setVouchers) {
          setVouchers(vRes.value.data);
        }
      } catch (localErr) {
        console.warn("Local API fetch note:", localErr);
      }

      // 2. Sync with GAS Cloud
      if (typeof window.callGAS === 'function') {
        const [eRes, jRes, vRes] = await Promise.allSettled([
          window.callGAS('getExpenses'),
          window.callGAS('getJournalEntries'),
          window.callGAS('getVouchers')
        ]);
        if (eRes.status === 'fulfilled' && eRes.value?.data && setExpenses) {
          setExpenses(eRes.value.data);
        }
        if (jRes.status === 'fulfilled' && jRes.value?.data && setJournal) {
          setJournal(jRes.value.data);
        }
        if (vRes.status === 'fulfilled' && vRes.value?.data && setVouchers) {
          setVouchers(vRes.value.data);
        }
      }
    } catch (e) {
      console.warn("fetchFreshExpenses error:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [setExpenses, setJournal, setVouchers]);

  useEffect(() => {
    fetchFreshExpenses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return showToast('المبلغ مطلوب ⚠️', 'error');

    const currCode = window.CurrencyService ? window.CurrencyService.normalizeCode(formData.currency) : 'YER';
    const rate = window.CurrencyService ? window.CurrencyService.getRate(currCode) : 1.0;
    const baseObj = window.CurrencyService ? window.CurrencyService.toBase(formData.amount, currCode, rate) : { base_amount: parseFloat(formData.amount) || 0, exchange_rate: rate };

    // Extract exact expense account code & sub-account code without truncating decimals (e.g. 101.01, 601)
    const rawExpStr = String(formData.exp_category || '601').trim();
    const expCode = rawExpStr.includes(' - ') ? rawExpStr.split(' - ')[0].trim() : (rawExpStr.match(/\d+(\.\d+)?/)?.[0] || rawExpStr);
    
    const rawSourceStr = String(formData.source_acc || '101').trim();
    const sourceCode = rawSourceStr.includes(' - ') ? rawSourceStr.split(' - ')[0].trim() : (rawSourceStr.match(/\d+(\.\d+)?/)?.[0] || rawSourceStr);

    const expAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(expCode) || (a.name && rawExpStr.includes(a.name)));
    const debitAccLabel = expAccObj ? `${expAccObj.code || expAccObj.acc_code} - ${expAccObj.name || expAccObj.account_name}` : (formData.exp_category || expCode);

    const sourceAccObj = (accounts || []).find(a => String(a.code || a.acc_code) === String(sourceCode) || (a.name && rawSourceStr.includes(a.name)));
    const creditAccLabel = sourceAccObj ? `${sourceAccObj.code || sourceAccObj.acc_code} - ${sourceAccObj.name || sourceAccObj.account_name}` : (formData.source_acc || sourceCode);

    const expNo = `EXP-${Date.now().toString().slice(-6)}`;
    const newE = {
      id: Date.now(),
      expense_no: expNo,
      category: debitAccLabel,
      exp_category: debitAccLabel,
      amount: parseFloat(formData.amount) || 0,
      currency: currCode,
      exchange_rate: rate,
      base_amount: baseObj.base_amount,
      date: formData.date || TODAY_STR_ISO,
      payment_method: formData.pay_method,
      pay_method: formData.pay_method,
      account_id: creditAccLabel,
      payment_source: creditAccLabel,
      recipient: '',
      notes: formData.notes || '',
      status: 'posted'
    };

    // Auto-create Payment Voucher & Journal Entry in state
    const newVoucher = {
      id: Date.now() + 1,
      v_no: `PV-${expNo}`,
      voucher_no: `PV-${expNo}`,
      v_type: 'سند صرف',
      voucher_type: 'سند صرف',
      party: debitAccLabel,
      party_name: debitAccLabel,
      amount: parseFloat(formData.amount) || 0,
      currency: currCode,
      exchange_rate: rate,
      base_amount: baseObj.base_amount,
      pay_method: formData.pay_method,
      date: formData.date || TODAY_STR_ISO,
      account_id: creditAccLabel,
      acc_code: creditAccLabel,
      target_acc: debitAccLabel,
      debit_account: debitAccLabel,
      notes: `سند صرف مصروف: ${debitAccLabel} - ${formData.notes || ''}`,
      status: 'posted'
    };

    const newJEntry = {
      id: Date.now() + 2,
      transaction_id: `TX-${expNo}`,
      entry_no: `JV-${expNo}`,
      debit: debitAccLabel,
      credit: creditAccLabel,
      debit_account_id: debitAccLabel,
      credit_account_id: creditAccLabel,
      amount: parseFloat(formData.amount) || 0,
      currency: currCode,
      exchange_rate: rate,
      base_amount: baseObj.base_amount,
      ref_type: 'EXPENSE',
      ref_id: expNo,
      date: formData.date || TODAY_STR_ISO,
      notes: `قيد مصروف تشغيلي: ${debitAccLabel} - ${formData.notes || ''}`,
      status: 'posted'
    };
    
    // Optimistic UI State Updates
    if (setExpenses) setExpenses(prev => [newE, ...(prev || [])]);
    if (setVouchers) setVouchers(prev => [newVoucher, ...(prev || [])]);
    if (setJournal) setJournal(prev => [newJEntry, ...(prev || [])]);
    
    if (typeof setAccounts === 'function') {
      setAccounts(prev => (prev || []).map(acc => {
        const c = String(acc.code || acc.acc_code || '');
        if (c === sourceCode || (sourceCode && c.startsWith(sourceCode))) {
          const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) - baseObj.base_amount;
          return { ...acc, current_balance: curBal, balance: curBal };
        }
        if (c === expCode || (expCode && c.startsWith(expCode))) {
          const curBal = (parseFloat(acc.current_balance ?? acc.balance) || 0) + baseObj.base_amount;
          return { ...acc, current_balance: curBal, balance: curBal };
        }
        return acc;
      }));
    }

    try {
      // 1. Send to Local Backend
      fetch('/api/expenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newE)
      }).catch(err => console.warn('Local expense post error:', err));

      // 2. Send to Google Apps Script
      if (typeof window.callGAS === 'function') {
        await window.callGAS('addExpense', newE);
      }
      showToast('تم حفظ المصروف وترحيل السند المالي والقيد اليومي بنجاح 💸');
    } catch (err) {
      console.warn("Expense save fallback:", err);
      showToast('تم الحفظ محلياً ⚡');
    } finally {
      setFormData({
        exp_category: typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES[0] : '601 - أجور ورواتب الخياطين والمطرزين والموظفين',
        amount: '',
        currency: 'YER ﷼',
        date: TODAY_STR_ISO,
        notes: '',
        pay_method: typeof PAY_METHODS !== 'undefined' ? PAY_METHODS[0] : 'نقد (كاش)',
        source_acc: '101 - الصندوق الرئيسي'
      });
    }
  };

  const handleDeleteExpense = async (eItem) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف والسند المالي والقيد اليومي المرتبط به؟')) return;
    const targetId = eItem.id || eItem.expense_no;
    
    if (setExpenses) {
      setExpenses(prev => (prev || []).filter(e => (e.id !== eItem.id && e.expense_no !== eItem.expense_no)));
    }
    if (setVouchers) {
      setVouchers(prev => (prev || []).filter(v => (v.v_no !== `PV-${eItem.expense_no}` && v.v_no !== eItem.expense_no && v.id !== eItem.id)));
    }
    if (setJournal) {
      setJournal(prev => (prev || []).filter(j => (j.entry_no !== `JV-${eItem.expense_no}` && j.ref_id !== eItem.expense_no && j.id !== eItem.id)));
    }

    try {
      fetch('/api/expenses/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, expense_no: eItem.expense_no || targetId })
      }).catch(err => console.warn('Local expense delete note:', err));

      if (typeof window.callGAS === 'function') {
        await window.callGAS('deleteExpense', { id: targetId, expense_no: eItem.expense_no || targetId });
      }
      showToast('تم حذف المصروف بنجاح 🗑️');
    } catch(err) {
      console.error(err);
      showToast('تم الحذف بنجاح 🗑️');
    }
  };

  // عرض جميع المصروفات المسجلة مباشرة أو المسجلة عبر سندات الصرف على حسابات المصروفات
  const allDisplayedExpenses = useMemo(() => {
    const list = [...(expenses || [])];
    const seenNos = new Set(list.map(e => String(e.expense_no || e.id || '')));

    (vouchers || []).forEach(v => {
      const vNo = String(v.v_no || v.voucher_no || v.payment_no || v.id || '');
      const rawType = v.v_type || v.voucher_type || (vNo.includes('PV') ? 'سند صرف' : 'سند قبض');
      const targetAcc = String(v.target_acc || v.debit_account || v.party || '');
      const isExpVoucher = rawType === 'سند صرف' && (
        targetAcc.includes('50') ||
        targetAcc.includes('6') ||
        targetAcc.includes('مصروف') ||
        String(v.notes || '').includes('مصروف') ||
        String(v.party || '').includes('بقالة')
      );

      if (isExpVoucher && !seenNos.has(vNo) && !seenNos.has(`PV-${vNo}`) && !vNo.startsWith('PV-EXP-')) {
        seenNos.add(vNo);
        list.push({
          id: v.id || vNo,
          expense_no: vNo,
          category: targetAcc || '6 - المصروفات',
          exp_category: targetAcc || '6 - المصروفات',
          amount: v.amount,
          currency: v.currency || 'YER',
          account_id: v.acc_code || v.account_id || '101 - الصندوق الرئيسي',
          payment_source: v.acc_code || v.account_id || '101 - الصندوق الرئيسي',
          payment_method: v.pay_method || v.payment_method || 'نقدي',
          date: v.date || TODAY_STR_ISO,
          notes: v.notes || (v.party ? `سند صرف: ${v.party}` : '—'),
          isVoucher: true
        });
      }
    });

    return list;
  }, [expenses, vouchers]);

  const inputCls = "w-full h-11 px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] bg-white text-[#25232A] text-xs font-medium placeholder:text-[#6F6B75] focus:bg-white focus:border-[#F28A00] focus:ring-2 focus:ring-[#FFF1DC] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#25232A] mb-1.5";

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all">
        <div className="px-6 py-4 border-b border-[#E8E5EA] flex items-center justify-between bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF1DC] text-[#C97300] flex items-center justify-center text-sm font-bold border border-[#FFE4B9]">
              💸
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#25232A]">تسجيل مصروف تشغيلي جديد</h2>
              <p className="text-[11px] text-[#6F6B75] font-normal">تسجيل مصروفات الإيجار والكهرباء والصيانة والمستلزمات مع الترحيل التلقائي للسندات والقيود</p>
            </div>
          </div>
          <button
            onClick={fetchFreshExpenses}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAFAFB] hover:bg-[#F2F1F4] border border-[#E8E5EA] text-xs font-semibold text-[#25232A] cursor-pointer transition"
          >
            <Icons.Refresh className={`w-3.5 h-3.5 text-[#6F6B75] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'جاري المزامنة...' : 'تحديث السجل 🔄'}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls + " mb-0"}>بند المصروف <span className="text-[#D64545] font-bold">*</span></label>
                <button
                  type="button"
                  onClick={() => setShowQuickAddCat(true)}
                  className="text-[11px] font-bold text-[#C97300] hover:text-[#A35D00] bg-[#FFF1DC] hover:bg-[#FFE4B9] px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition border border-[#FFE4B9]"
                  title="إضافة بند مصروف جديد إلى شجرة الحسابات وقوقل شيتس"
                >
                  <span>💸 + بند جديد</span>
                </button>
              </div>
              <select className={inputCls} value={formData.exp_category} onChange={e => setFormData({...formData, exp_category: e.target.value})}>
                {(() => {
                  const expAccs = (accounts || []).filter(a => {
                    const type = String(a.account_type || a.type || a.nature || '');
                    const code = String(a.code || a.acc_code || '');
                    return type.includes('مصروف') || code.startsWith('5') || code.startsWith('6');
                  });
                  if (expAccs.length > 0) {
                    return expAccs.map(a => {
                      const code = a.code || a.acc_code || a.id;
                      const rawName = a.name || a.account_name || a.acc_name || '';
                      const name = (rawName && !rawName.includes('???')) ? rawName : (a.name_en || code);
                      const label = `${code} - ${name}`;
                      return <option key={code} value={label}>{label}</option>;
                    });
                  }
                  return (typeof EXPENSE_CATEGORIES !== 'undefined' ? EXPENSE_CATEGORIES : ['601 - أجور ورواتب الخياطين والمطرزين والموظفين', '602 - إيجار المقرات والمعارض والورش', '603 - مصاريف كهرباء وماء وإنترنت ومرافق', '604 - مصاريف التسويق والإعلانات الممولة', '605 - مصاريف الصيانة وقطع غيار الآلات', '606 - خسائر فروق أسعار صرف العملات', '607 - مصروفات إدارية وعمومية متنوعة']).map(c => <option key={c} value={c}>{c}</option>);
                })()}
              </select>
            </div>
            <div>
              <label className={labelCls}>المبلغ <span className="text-[#D64545] font-bold">*</span></label>
              <input type="number" step="0.01" className={inputCls + " font-mono font-bold text-[#25232A]"} placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>العملة</label>
              <select className={inputCls} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                {(typeof CURRENCIES !== 'undefined' ? CURRENCIES : ['SAR','USD','YER']).map(c => <option key={typeof c === "object" ? c.value : c} value={typeof c === "object" ? c.value : c}>{typeof c === "object" ? c.label : c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>طريقة الدفع</label>
              <select className={inputCls} value={formData.pay_method} onChange={e => setFormData({...formData, pay_method: e.target.value})}>
                {(typeof PAY_METHODS !== 'undefined' ? PAY_METHODS : ['نقدي','تحويل إلكتروني','شيك']).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>حساب الدفع / الخزينة</label>
              <select className={inputCls} value={formData.source_acc} onChange={e => setFormData({...formData, source_acc: e.target.value})}>
                <option value="">-- اختر حساب الدفع --</option>
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
              <label className={labelCls}>التاريخ</label>
              <input type="date" className={inputCls} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>البيان / تفاصيل المصروف</label>
              <input type="text" className={inputCls} placeholder="شرح المصروف..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs text-white bg-[#F28A00] hover:bg-[#D97706] transition shadow-xs flex items-center justify-center gap-2 cursor-pointer">
              <Icons.Check className="w-4 h-4" />
              <span>حفظ المصروف وترحيل السند والقيد 💸</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5EA]">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-sm text-[#25232A]">سجل المصروفات التشغيلية الموحد</h3>
            <span className="text-xs bg-[#FFF1DC] text-[#C97300] font-bold px-2.5 py-0.5 rounded-full font-mono">{allDisplayedExpenses.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E8E5EA]">
          {(!allDisplayedExpenses || allDisplayedExpenses.length === 0) ? (
            <div className="text-center py-12 text-[#6F6B75] text-xs font-medium">لا توجد مصروفات مسجلة بعد 💸</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#FAFAFB] text-[#6F6B75] font-semibold border-b border-[#E8E5EA]">
                  <th className="px-4 py-3 text-right">البند</th>
                  <th className="px-4 py-3 text-right">البيان</th>
                  <th className="px-4 py-3 text-right">المبلغ</th>
                  <th className="px-4 py-3 text-right">حساب الصرف</th>
                  <th className="px-4 py-3 text-right">طريقة الدفع</th>
                  <th className="px-4 py-3 text-right">التاريخ</th>
                  <th className="px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EA] bg-white">
                {allDisplayedExpenses.map(e => (
                  <tr key={e.id || e.expense_no} className="hover:bg-[#FAFAFB] transition-colors">
                    <td className="px-4 py-3 font-bold text-[#25232A]">
                      {e.exp_category || e.category}
                      {e.isVoucher && <span className="mr-2 text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">سند صرف</span>}
                    </td>
                    <td className="px-4 py-3 text-[#6F6B75]">{e.notes || '—'}</td>
                    <td className="px-4 py-3 font-bold font-mono tabular-nums text-[#D64545]">
                      {(parseFloat(e.amount) || 0).toLocaleString('en-US')} <span className="text-[10px] font-medium text-[#6F6B75] font-sans">{e.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-[#6F6B75] font-mono">{e.account_id || e.payment_source || '—'}</td>
                    <td className="px-4 py-3 text-[#6F6B75]">{e.payment_method || e.pay_method}</td>
                    <td className="px-4 py-3 text-[#6F6B75] font-mono">{e.date}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteExpense(e)}
                        title="حذف المصروف"
                        className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-[#D64545] rounded-lg text-xs font-bold border border-rose-200 inline-flex items-center justify-center cursor-pointer transition"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Add Expense Category Modal */}
      {showQuickAddCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8E5EA] space-y-4 text-right animate-scaleUp" dir="rtl">
            <div className="flex items-center justify-between border-b border-[#E8E5EA] pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#FFF1DC] text-[#C97300] flex items-center justify-center text-sm font-bold">💸</span>
                <h3 className="text-sm font-bold text-[#25232A]">إضافة بند مصروف جديد للشجرة وقوقل شيتس</h3>
              </div>
              <button onClick={() => setShowQuickAddCat(false)} className="text-[#6F6B75] hover:text-[#25232A] text-sm font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleQuickAddCategory} className="space-y-3.5">
              <div>
                <label className={labelCls}>اسم بند المصروف الجديد <span className="text-[#D64545] font-bold">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بترول ومواصلات، صيانة أدوات، ضيافة ونظافة..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className={inputCls}
                  autoFocus
                />
              </div>

              <div>
                <label className={labelCls}>كود الحساب في الشجرة (اختياري - يولد تلقائياً)</label>
                <input
                  type="text"
                  placeholder="مثال: 507 أو 508..."
                  value={newCatCode}
                  onChange={e => setNewCatCode(e.target.value)}
                  className={inputCls + " font-mono text-left"}
                  dir="ltr"
                />
                <p className="text-[11px] text-[#6F6B75] mt-1">سيتم إدراج الحساب تلقائياً تحت قسم (6 - المصروفات) في شجرة الحسابات وقوقل شيتس.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E5EA]">
                <button
                  type="button"
                  onClick={() => setShowQuickAddCat(false)}
                  className="px-4 py-2 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl text-xs font-bold border border-[#E8E5EA] cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#C97300] hover:bg-[#A35D00] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>✓ حفظ وإدراج بالشجرة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
