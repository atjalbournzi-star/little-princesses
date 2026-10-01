// useAccountsData.js - خطاف بيانات الحسابات: التطبيع الهرمي، الأرصدة، الفلترة
// يعتمد على: cleanCode, getSmartSuggestedAccountCode, ARABIC_STANDARD_NAMES (accountHelpers.js)
const { useMemo, useCallback } = React;

function useAccountsData({ accounts, journal, searchTerm, filterType, maxDepthFilter }) {

  // ── تطبيع قائمة الحسابات مع حساب الأرصدة الديناميكية من القيود ──────────
  const normalizedAccounts = useMemo(() => {
    const jList = Array.isArray(journal) ? journal : [];

    // إزالة التكرار: الاحتفاظ بالسجل الأكثر اكتمالاً
    const seenCodes = new Map();
    const dedupedAccounts = [];
    for (const a of (accounts || [])) {
      const codeKey = String(a.code || a.acc_code || a.id || '').trim();
      if (!codeKey) { dedupedAccounts.push(a); continue; }
      if (!seenCodes.has(codeKey)) {
        seenCodes.set(codeKey, dedupedAccounts.length);
        dedupedAccounts.push({ ...a });
      } else {
        const existingIdx = seenCodes.get(codeKey);
        const existing = dedupedAccounts[existingIdx];
        const authBal = (a.current_balance !== undefined && a.current_balance !== null && a.current_balance !== '')
          ? parseFloat(a.current_balance)
          : ((a.balance !== undefined && a.balance !== null && a.balance !== '')
              ? parseFloat(a.balance) : (parseFloat(existing.current_balance || existing.balance || 0) || 0));
        dedupedAccounts[existingIdx] = {
          ...existing, ...a,
          opening_balance: parseFloat(a.opening_balance ?? existing.opening_balance) || 0.0,
          balance: authBal, current_balance: authBal,
          parent_id: (a.parent_id !== undefined && a.parent_id !== null && a.parent_id !== '' && a.parent_id !== '0')
            ? a.parent_id : existing.parent_id,
          name: (a.name && a.name.length > (existing.name || '').length && !a.name.includes('?')) ? a.name : existing.name,
          name_en: a.name_en || existing.name_en || '',
          account_name_en: a.account_name_en || existing.account_name_en || ''
        };
      }
    }

    return dedupedAccounts.map(a => {
      const id = a.id || a.acc_code || a.code;
      const code = String(a.code || a.acc_code || id || '').trim();
      const rawName = String(a.name_ar || a.name || a.account_name || a.acc_name || code).trim();
      let cleanName = (rawName && !rawName.includes('?') && rawName !== code && !rawName.startsWith('ACC-') && !/^[A-Za-z\s&/()\-–—]+$/.test(rawName))
        ? rawName : (ARABIC_STANDARD_NAMES[code] || a.name_ar || a.name || code);
      if (code && cleanName.startsWith(code)) cleanName = cleanName.substring(code.length).replace(/^[\s\-_:/|]+/, '').trim();
      const name = cleanName || rawName;
      const cleanC = cleanCode(code);

      // تحديد نوع الحساب تلقائياً من رمز الكود إذا لم يكن محدداً
      let type = a.account_type || a.acc_type || '';
      if (!type) {
        if (cleanC.startsWith('1') || a.type === 'ASSET') type = 'أصول';
        else if (cleanC.startsWith('2') || a.type === 'LIABILITY') type = 'خصوم';
        else if (cleanC.startsWith('3') || a.type === 'EQUITY') type = 'حقوق ملكية';
        else if (cleanC.startsWith('4') || a.type === 'REVENUE') type = 'إيرادات';
        else if (cleanC.startsWith('51') || a.type === 'COGS') type = 'تكلفة المبيعات';
        else if (cleanC.startsWith('5') || cleanC.startsWith('6') || a.type === 'EXPENSE') type = 'مصروفات';
        else type = 'أصول';
      } else if (type === 'مصروفات' && cleanC.startsWith('51')) type = 'تكلفة المبيعات';

      const parent_id = (a.parent_id !== undefined && a.parent_id !== null && a.parent_id !== '' && a.parent_id !== '0')
        ? a.parent_id : (a.parent_account_code || a.parent_account_id || null);

      // حساب المستوى المحاسبي (1=رئيسي, 2=عام, 3=مساعد, 4=فرعي, 5=تحليلي)
      let calculatedLevel = 1;
      if (cleanC.includes('.') || cleanC.includes('-') || cleanC.includes('/')) calculatedLevel = 5;
      else if (cleanC.length >= 4) calculatedLevel = 4;
      else if (cleanC.length === 3) calculatedLevel = 3;
      else if (cleanC.length === 2) calculatedLevel = 2;
      const level = a.level ? Number(a.level) : calculatedLevel;
      const is_group = a.is_group !== undefined ? Number(a.is_group) : (calculatedLevel < 4 ? 1 : 0);

      // طبيعة الحساب (مدين/دائن)
      const rawNat = String(a.nature || a.normal_balance || '').toLowerCase();
      const normType = String(a.account_type || a.type || '').toLowerCase();
      const isCreditType = (rawNat === 'credit' || rawNat === 'دائن' || normType.includes('خصوم') || normType.includes('liability') || normType.includes('حقوق') || normType.includes('equity') || normType.includes('إيراد') || normType.includes('ايراد') || normType.includes('revenue') || cleanC.startsWith('2') || cleanC.startsWith('3') || cleanC.startsWith('4'));
      const nature = isCreditType ? 'credit' : 'debit';
      const is_active = a.is_active !== undefined ? Number(a.is_active) : 1;
      const openingBal = parseFloat(a.opening_balance || a.open_bal || 0.0);

      // حساب حركات دفتر الأستاذ من القيود اليومية
      let totalDebit = 0.0, totalCredit = 0.0, foreignDebit = 0.0, foreignCredit = 0.0;
      let hasMovements = false, hasForeignMovements = false;

      const extractCode = (str) => {
        if (!str) return '';
        const s = String(str).trim();
        const stripped = (s.toUpperCase().startsWith('ACC-') || s.toUpperCase().startsWith('ACC_')) ? s.slice(4).trim() : s;
        const match = stripped.match(/^(\d+(?:[.\-_]\d+)*)/);
        return match ? cleanCode(match[1]) : cleanCode(stripped);
      };

      const doesMatchAccount = (str) => {
        if (!str || !code) return false;
        const s = String(str).trim();
        if (!s) return false;
        if (id && s === String(id)) return true;
        if (a.account_id && s === String(a.account_id)) return true;
        const ext = extractCode(s);
        if (ext && (ext === cleanC || ext === cleanCode(code))) return true;
        if (s === `ACC-${code}` || s === `ACC_${code}` || s === `ACC-${cleanC}` || s === `ACC-${cleanC.replace(/\./g, '-')}`) return true;
        if (s.startsWith(`${code} - `) || s.startsWith(`${cleanC} - `) || s.startsWith(`${code} `) || s.startsWith(`${cleanC} `)) return true;
        return false;
      };

      const accCurr = (window.CurrencyService ? window.CurrencyService.normalizeCode(a.currency) : a.currency) || 'YER';
      jList.forEach(j => {
        const dStr = String(j.debit_code || j.debit || j.debit_account_id || '').trim();
        const cStr = String(j.credit_code || j.credit || j.credit_account_id || '').trim();
        const baseAmt = parseFloat(j.base_amount) || ((parseFloat(j.amount) || 0) * (parseFloat(j.exchange_rate) || 1.0));
        const jAmt = parseFloat(j.amount) || 0.0;
        const jCurr = (window.CurrencyService ? window.CurrencyService.normalizeCode(j.currency) : (j.currency || 'YER'));
        if (doesMatchAccount(dStr)) {
          totalDebit += baseAmt; hasMovements = true;
          if (accCurr !== 'YER') { const r = (window.CurrencyService ? window.CurrencyService.getRate(accCurr) : 142.0) || 142.0; foreignDebit += jCurr === accCurr ? jAmt : (r > 0 ? baseAmt / r : baseAmt); hasForeignMovements = true; }
        }
        if (doesMatchAccount(cStr)) {
          totalCredit += baseAmt; hasMovements = true;
          if (accCurr !== 'YER') { const r = (window.CurrencyService ? window.CurrencyService.getRate(accCurr) : 142.0) || 142.0; foreignCredit += jCurr === accCurr ? jAmt : (r > 0 ? baseAmt / r : baseAmt); hasForeignMovements = true; }
        }
      });

      // الرصيد الفعلي المعتمد من قاعدة البيانات مع احتساب الحركات عند الغياب
      let calculatedBal = 0.0;
      if (a.current_balance !== undefined && a.current_balance !== null && a.current_balance !== '') calculatedBal = parseFloat(a.current_balance) || 0.0;
      else if (a.balance !== undefined && a.balance !== null && a.balance !== '') calculatedBal = parseFloat(a.balance) || 0.0;
      else if (hasMovements) calculatedBal = nature === 'credit' ? (openingBal + (totalCredit - totalDebit)) : (openingBal + (totalDebit - totalCredit));
      else calculatedBal = openingBal;

      // الرصيد بالعملة الأصلية للحساب (مثل SAR أو USD)
      let foreignBal = 0.0;
      if (accCurr !== 'YER') {
        if (hasForeignMovements) foreignBal = nature === 'credit' ? (foreignCredit - foreignDebit) : (foreignDebit - foreignCredit);
        else if (a.foreign_balance !== undefined && a.foreign_balance !== null && a.foreign_balance !== '') foreignBal = parseFloat(a.foreign_balance) || 0.0;
        else if (calculatedBal !== 0) { const defRate = parseFloat(a.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(accCurr) : 142.0); foreignBal = defRate > 0 ? (calculatedBal / defRate) : 0.0; }
      }

      return { ...a, id, code, name, name_en: a.name_en || '', account_type: type, parent_id, level, is_group, nature, is_active, balance: calculatedBal, foreign_balance: foreignBal, opening_balance: openingBal, total_debit: totalDebit, total_credit: totalCredit };
    });
  }, [accounts, journal]);

  // ── تحديد علاقة أب-ابن بدقة قطعية لمنع التداخل ─────────────────────────
  const isChildOf = useCallback((child, parentAcc) => {
    if (!child || !parentAcc) return false;
    const pCode = cleanCode(parentAcc.code || parentAcc.acc_code || parentAcc.id);
    const pId = String(parentAcc.id || '').trim();
    const pAccId = String(parentAcc.account_id || '').trim();
    const cParent = cleanCode(child.parent_id || child.parent_account_id || child.parent_account_code || '');
    const cParentRaw = String(child.parent_id || child.parent_account_id || child.parent_account_code || '').trim();
    const cCode = cleanCode(child.code || child.acc_code || child.id);
    if (!cCode || !pCode || cCode === pCode || String(child.id) === pId) return false;
    if (cParentRaw || cParent) {
      if (cParentRaw === pId || cParentRaw === pAccId || cParentRaw === pCode || cParent === pCode || cParent === pId || cParentRaw === `ACC-${pCode}` || cParentRaw === `ACC_${pCode}` || (child.parent_account_code && cleanCode(child.parent_account_code) === pCode)) return true;
    }
    for (let sep of ['.', '-', '/', '_']) {
      const prefix = pCode + sep;
      if (cCode.startsWith(prefix)) { const rest = cCode.slice(prefix.length); if (!rest.includes(sep) || pCode.includes(sep)) return true; }
    }
    if (cCode.startsWith(pCode) && !cCode.includes('.') && !cCode.includes('-') && !cCode.includes('/')) {
      if (pCode.length === 1 && [2,3,4].includes(cCode.length)) return true;
      if (pCode.length === 2 && [3,4].includes(cCode.length)) return true;
      if (pCode.length === 3 && cCode.length === 4) return true;
      if (pCode.length === 4 && cCode.length === 6) return true;
    }
    return false;
  }, []);

  // ── التجميع الهرمي للأرصدة (Rollup) ───────────────────────────────────────
  const accountsWithRollupBalances = useMemo(() => {
    const accList = normalizedAccounts;
    const getDirectChildren = (p) => accList.filter(c => isChildOf(c, p));
    const memoSum = {};
    const calcNodeRollup = (acc, visited = new Set()) => {
      const key = cleanCode(acc.code || acc.id);
      if (memoSum[key] !== undefined) return memoSum[key];
      if (visited.has(key)) return parseFloat(acc.balance) || 0.0;
      visited.add(key);
      const children = getDirectChildren(acc);
      if (children.length === 0) { memoSum[key] = parseFloat(acc.balance) || 0.0; return memoSum[key]; }
      let total = parseFloat(acc.balance) || 0.0;
      children.forEach(child => { total += calcNodeRollup(child, new Set(visited)); });
      memoSum[key] = total;
      return total;
    };
    return accList.map(a => {
      const children = getDirectChildren(a);
      const hasChildren = children.length > 0;
      return { ...a, is_group: hasChildren ? 1 : (a.is_group !== undefined ? Number(a.is_group) : 0), is_postable: hasChildren ? 0 : 1, rollupBalance: hasChildren ? calcNodeRollup(a) : (parseFloat(a.balance) || 0.0), hasChildren };
    });
  }, [normalizedAccounts, isChildOf]);

  // ── فلترة حسب النوع والمستوى والبحث ───────────────────────────────────────
  const filterMatches = useCallback((acc) => {
    if (filterType !== 'ALL') {
      const c = cleanCode(acc.code);
      const isMatch = (acc.account_type === filterType || (filterType === 'تكلفة المبيعات' && (c.startsWith('51') || acc.account_type === 'COGS' || acc.name.includes('تكلفة'))) || (filterType === 'مصروفات' && (c.startsWith('52') || c.startsWith('6') || (c.startsWith('5') && !c.startsWith('51')) || acc.account_type === 'مصروفات')) || (filterType === 'أصول' && (c.startsWith('1') || acc.account_type === 'أصول')) || (filterType === 'خصوم' && (c.startsWith('2') || acc.account_type === 'خصوم')) || (filterType === 'حقوق ملكية' && (c.startsWith('3') || acc.account_type === 'حقوق ملكية')) || (filterType === 'إيرادات' && (c.startsWith('4') || acc.account_type === 'إيرادات')));
      if (!isMatch) return false;
    }
    if (maxDepthFilter !== 'ALL' && acc.level > Number(maxDepthFilter)) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (acc.code.toLowerCase().includes(term) || acc.name.toLowerCase().includes(term) || acc.name_en.toLowerCase().includes(term) || acc.account_type.toLowerCase().includes(term));
  }, [searchTerm, filterType, maxDepthFilter]);

  // ── العقد الجذرية في الشجرة ─────────────────────────────────────────────────
  const rootNodes = useMemo(() => {
    return accountsWithRollupBalances.filter(a => {
      const code = cleanCode(a.code || a.acc_code || a.id);
      if (['1', '2', '3', '4', '5', '6', '7'].includes(code)) return true;
      return !accountsWithRollupBalances.some(parent => isChildOf(a, parent));
    });
  }, [accountsWithRollupBalances, isChildOf]);

  return { normalizedAccounts, accountsWithRollupBalances, isChildOf, rootNodes, filterMatches };
}
