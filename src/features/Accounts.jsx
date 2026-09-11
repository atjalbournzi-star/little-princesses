const { useState, useEffect, useMemo, useCallback, useRef } = React;

// Helper to extract clean alphanumeric code (e.g. ACC-101 -> 101, ACC-1 -> 1, ACC-101-2 -> 101.2)
const cleanCode = (val) => {
  if (val === null || val === undefined) return '';
  let s = String(val).trim();
  if (s.toUpperCase().startsWith('ACC-')) s = s.slice(4).trim();
  if (s.toUpperCase().startsWith('ACC_')) s = s.slice(4).trim();
  // Auto-heal date corrupted codes from Google Sheets (e.g. 3111-01-01 -> 3111.01, 1111-01-02 -> 1111.02)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-');
    s = `${parts[0]}.${parts[1]}`;
  }
  // Normalize hyphenated sub-codes like 101-2, 101-3 to 101.2, 101.3
  if (/^\d+-\d+$/.test(s)) {
    s = s.replace('-', '.');
  }
  return s;
};

// Helper to auto-suggest the next sequential account code across any section of the Chart of Accounts
const getSmartSuggestedAccountCode = (parentVal, accountsList = []) => {
  const existingCodes = new Set(
    (accountsList || []).map(a => cleanCode(a.code || a.account_code || a.id || '')).filter(Boolean)
  );

  // 1. إذا لم يُحدد حساب أب (إضافة حساب رئيسي عام Level 1)
  if (!parentVal || String(parentVal) === '0' || String(parentVal).trim() === '') {
    const rootNums = [];
    (accountsList || []).forEach(a => {
      const c = cleanCode(a.code || a.id || '');
      if (c.length === 1 && /^\d+$/.test(c)) {
        rootNums.push(parseInt(c, 10));
      }
    });
    let nextRoot = rootNums.length > 0 ? Math.max(...rootNums) + 1 : 6;
    while (existingCodes.has(String(nextRoot))) {
      nextRoot++;
    }
    return String(nextRoot);
  }

  const pCode = cleanCode(parentVal);
  if (!pCode) return '101.01';

  // 2. إذا كان الأب حساباً رئيسياً من خانة واحدة (Level 1: 1 أصول، 2 خصوم، 3 حقوق ملكية، 4 إيرادات، 5 مصروفات)
  // النمط المعتمد هو الترقيم المئوي: 101, 102, 103.. أو 201, 202.. أو 501, 502..
  if (pCode.length === 1 && /^\d+$/.test(pCode)) {
    let maxNum = 0;
    (accountsList || []).forEach(a => {
      const c = cleanCode(a.code || a.account_code || a.id || '');
      const aParent = cleanCode(a.parent_id || a.parent_account_code || '');
      if (c.length === 3 && c.startsWith(pCode) && /^\d+$/.test(c)) {
        const n = parseInt(c, 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      } else if (aParent === pCode && /^\d+$/.test(c)) {
        const n = parseInt(c, 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });

    let candidate = maxNum > 0 ? maxNum + 1 : parseInt(`${pCode}01`, 10);
    while (existingCodes.has(String(candidate))) {
      candidate++;
    }
    return String(candidate);
  }

  // 3. إذا كان الأب حساباً فرعياً أو مساعداً (Level 2+: مثل 101، 102، 201، 102.01)
  // النمط المعتمد هو إضافة نقطة وتسلسل ثنائي: 102.01, 102.02, 102.03...
  let maxSeq = 0;
  const prefix = `${pCode}.`;

  (accountsList || []).forEach(a => {
    const c = cleanCode(a.code || a.account_code || a.id || '');
    const aParent = cleanCode(a.parent_id || a.parent_account_code || '');
    if (c.startsWith(prefix)) {
      const rest = c.slice(prefix.length).split('.')[0].split('-')[0].split('_')[0];
      const n = parseInt(rest, 10);
      if (!isNaN(n) && n > maxSeq) {
        maxSeq = n;
      }
    } else if (aParent === pCode) {
      if (c.startsWith(pCode) && c.length > pCode.length) {
        const rest = c.slice(pCode.length).replace(/^[.\-_]/, '').split('.')[0];
        const n = parseInt(rest, 10);
        if (!isNaN(n) && n > maxSeq) {
          maxSeq = n;
        }
      }
    }
  });

  let nextSeq = maxSeq + 1;
  let pad = nextSeq < 10 ? `0${nextSeq}` : `${nextSeq}`;
  let candidateCode = `${pCode}.${pad}`;

  // منع أي تكرار مع أي حساب قائم مسبقاً
  while (existingCodes.has(candidateCode)) {
    nextSeq++;
    pad = nextSeq < 10 ? `0${nextSeq}` : `${nextSeq}`;
    candidateCode = `${pCode}.${pad}`;
  }

  return candidateCode;
};

function Accounts({ accounts = [], setAccounts, journal = [], setJournal, vouchers = [], setVouchers, showToast, currency = { display: 'YER ﷼', symbol: '﷼', code: 'YER' } }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState({
    '1': true, '2': true, '3': true, '4': true, '5': true,
    '101': true, '102': true, '103': true, '104': true, '105': true, '106': true,
    '201': true, '301': true, '302': true, '401': true, '402': true, '501': true, '502': true,
    '1111': true, '1112': true, '1121': true, '1131': true, '1141': true, '1151': true, '1152': true, '1153': true,
    '2111': true, '2121': true, '2131': true,
    '3111': true, '3112': true,
    '4111': true, '4121': true, '4211': true,
    '5111': true, '5121': true, '5211': true, '5221': true,
    'ACC-1': true, 'ACC-2': true, 'ACC-3': true, 'ACC-4': true, 'ACC-5': true,
    'ACC-101': true, 'ACC-102': true, 'ACC-201': true
  });
  const [filterType, setFilterType] = useState('ALL');
  const [maxDepthFilter, setMaxDepthFilter] = useState('ALL');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedDetailAcc, setSelectedDetailAcc] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    code: '',
    name: '',
    name_en: '',
    account_type: 'أصول',
    parent_id: '',
    nature: 'debit',
    is_group: 0,
    is_active: 1,
    balance: '0',
    notes: ''
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleCleanResetAccounts = async () => {
    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من رغبتك في تصفير شجرة الحسابات وتصفير كافة الأرصدة والمبالغ التجريبية إلى 0.00 في قاعدة البيانات؟\n\n(سيتم تصفير الأرصدة إلى 0.00 ومسح كافة القيود والسندات التجريبية دون التأثير على العملاء أو الأقسام الأخرى)')) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/accounts/clean-reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.data)) {
          setAccounts(data.data);
        }
        if (setJournal) setJournal([]);
        if (setVouchers) setVouchers([]);
        showToast('✅ تم تصفير شجرة الحسابات وتصفير كافة الأرصدة إلى 0.00 ومسح القيود التجريبية بنجاح 👑');
      } else {
        showToast(data.error || 'فشل التصفير', 'error');
      }
    } catch(err) {
      console.error(err);
      showToast('حدث خطأ أثناء الاتصال بالخادم للتصفير', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const fetchFreshAccounts = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch live accounts list from PostgreSQL backend
      const res = await fetch('/api/accounts/list').then(r => r.json());
      const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
      if (list.length > 0 && setAccounts) {
        setAccounts(list);
      }

      // 2. Fetch live journal entries from PostgreSQL backend
      try {
        const jRes = await fetch('/api/journal').then(r => r.json());
        const jList = (jRes && Array.isArray(jRes.data)) ? jRes.data : (Array.isArray(jRes) ? jRes : []);
        if (setJournal) setJournal(jList);
      } catch (jErr) {
        console.warn("Journal fetch warning:", jErr);
      }
    } catch (e) {
      console.error("fetchFreshAccounts error:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [setAccounts, setJournal]);

  useEffect(() => {
    fetchFreshAccounts();
  }, []);

  const handleSyncCloudAccounts = async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch live accounts list from PostgreSQL
      const beRes = await fetch('/api/accounts/list').then(r => r.json());
      const list = (beRes && Array.isArray(beRes.data)) ? beRes.data : (Array.isArray(beRes) ? beRes : []);

      // 2. Fetch live journal entries from PostgreSQL
      let jList = [];
      try {
        const jRes = await fetch('/api/journal').then(r => r.json());
        jList = (jRes && Array.isArray(jRes.data)) ? jRes.data : (Array.isArray(jRes) ? jRes : []);
      } catch (jErr) {}

      if (list.length > 0) {
        if (setAccounts) setAccounts(list);
        if (setJournal) setJournal(jList);
        if (showToast) showToast('تمت مزامنة شجرة الحسابات والقيود مع قاعدة البيانات السحابية (PostgreSQL) بنجاح 👑', 'success');
      } else {
        if (showToast) showToast('لم يتم العثور على حسابات لمزامنتها', 'info');
      }
    } catch(err) {
      console.error("Sync error:", err);
      if (showToast) showToast('حدث خطأ أثناء مزامنة دليل الحسابات مع السحابة', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const accountTypesList = typeof ACCOUNT_TYPES !== 'undefined' ? ACCOUNT_TYPES : ['أصول', 'خصوم', 'حقوق ملكية', 'إيرادات', 'تكلفة المبيعات', 'مصروفات', 'أخرى'];

  // Normalize accounts list with dynamic balance calculation from Journal Entries
  const normalizedAccounts = useMemo(() => {
    const jList = Array.isArray(journal) ? journal : [];

    // ─── مرحلة إزالة التكرار (Deduplication) ───────────────────────────────
    // عند جمع البيانات من مصادر متعددة (محلي + Google Sheets)، قد يظهر
    // نفس الحساب برقم كود واحد لكن بسجلات مختلفة. نحتفظ بالسجل الأكثر
    // اكتمالاً (الأعلى رصيداً أو الأحدث أو الذي له account_name_en).
    const seenCodes = new Map();
    const dedupedAccounts = [];
    for (const a of (accounts || [])) {
      const codeKey = String(a.code || a.acc_code || a.id || '').trim();
      if (!codeKey) { dedupedAccounts.push(a); continue; }

      if (!seenCodes.has(codeKey)) {
        seenCodes.set(codeKey, dedupedAccounts.length);
        dedupedAccounts.push({ ...a });
      } else {
        // تكرار: احتفظ بالسجل الأحدث والأكثر دقة من قاعدة بيانات Supabase
        const existingIdx = seenCodes.get(codeKey);
        const existing = dedupedAccounts[existingIdx];
        const authoritativeBal = (a.current_balance !== undefined && a.current_balance !== null && a.current_balance !== '')
          ? parseFloat(a.current_balance)
          : ((a.balance !== undefined && a.balance !== null && a.balance !== '') ? parseFloat(a.balance) : (parseFloat(existing.current_balance || existing.balance || 0) || 0));

        dedupedAccounts[existingIdx] = {
          ...existing,
          ...a,
          opening_balance: parseFloat(a.opening_balance ?? existing.opening_balance) || 0.0,
          balance: authoritativeBal,
          current_balance: authoritativeBal,
          parent_id: (a.parent_id !== undefined && a.parent_id !== null && a.parent_id !== '' && a.parent_id !== '0')
            ? a.parent_id : existing.parent_id,
          name: (a.name && a.name.length > (existing.name || '').length && !a.name.includes('?')) ? a.name : existing.name,
          name_en: a.name_en || existing.name_en || '',
          account_name_en: a.account_name_en || existing.account_name_en || ''
        };
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    return dedupedAccounts.map(a => {
      const id = a.id || a.acc_code || a.code;
      const code = String(a.code || a.acc_code || id || '').trim();
      
      const ARABIC_STANDARD_NAMES = {
        '1': 'الأصول',
        '1111': 'الصندوق الرئيسي',
        '1112': 'البنك / الشبكة وPOS',
        '1121': 'عهد الورشة والمشغل',
        '1131': 'ذمم العميلات',
        '1141': 'سلف الخياطين والعاملين',
        '1151': 'مخزون الأقمشة والخامات',
        '1152': 'إنتاج تحت التشغيل (WIP)',
        '1153': 'مخزون الفساتين التامة',
        '2': 'الالتزامات (الخصوم)',
        '2111': 'ذمم الموردين ومحلات الأقمشة',
        '2121': 'دفعات مقدمة وعرابين حجز',
        '2131': 'مستحقات وأجور الخياطين',
        '3': 'حقوق الملكية',
        '31': 'رأس المال والاحتياطيات',
        '311': 'رأس المال المباشر',
        '3111': 'رأس مال الشركاء / المالكين',
        '312': 'الأرباح والاحتياطيات',
        '3121': 'الأرباح المبقاة / المحتجزة',
        '32': 'جاري الشركاء والمسحوبات',
        '4': 'الإيرادات',
        '4111': 'إيرادات تفصيل وتصميم الفساتين',
        '4121': 'إيرادات مبيعات فساتين المعرض',
        '4211': 'أرباح تسويات المخزون',
        '5': 'المصروفات وتكاليف الإنتاج',
        '5111': 'تكلفة الأقمشة والمواد المباعة',
        '5121': 'أجور خياطة وتصنيع مباشرة',
        '5211': 'مصاريف تشغيل وصيانة الورشة',
        '5221': 'خسائر وفروقات عجز الجرد'
      };

      const rawName = String(a.name_ar || a.name || a.account_name || a.acc_name || code).trim();
      let cleanName = (rawName && !rawName.includes('?') && rawName !== code && !rawName.startsWith('ACC-') && !/^[A-Za-z\s&/()\-–—]+$/.test(rawName))
        ? rawName
        : (ARABIC_STANDARD_NAMES[code] || a.name_ar || a.name || code);

      // 🏷️ Clean Account Name Mapping: Pure text only, strip any prepended code
      if (code && cleanName.startsWith(code)) {
        cleanName = cleanName.substring(code.length).replace(/^[\s\-_:/|]+/, '').trim();
      }
      const name = cleanName || rawName;

      const cleanC = cleanCode(code);
      let type = a.account_type || a.acc_type || '';
      if (!type) {
        if (cleanC.startsWith('1') || a.type === 'ASSET') type = 'أصول';
        else if (cleanC.startsWith('2') || a.type === 'LIABILITY') type = 'خصوم';
        else if (cleanC.startsWith('3') || a.type === 'EQUITY') type = 'حقوق ملكية';
        else if (cleanC.startsWith('4') || a.type === 'REVENUE') type = 'إيرادات';
        else if (cleanC.startsWith('51') || a.type === 'COGS') type = 'تكلفة المبيعات';
        else if (cleanC.startsWith('5') || cleanC.startsWith('6') || a.type === 'EXPENSE') type = 'مصروفات';
        else type = 'أصول';
      } else if (type === 'مصروفات' && cleanC.startsWith('51')) {
        type = 'تكلفة المبيعات';
      }

      const parent_id = (a.parent_id !== undefined && a.parent_id !== null && a.parent_id !== '' && a.parent_id !== '0')
        ? a.parent_id
        : (a.parent_account_code || a.parent_account_id || null);
      
      // حساب المستوى المحاسبي المعياري بدقة (1=رئيسي، 2=عام، 3=مساعد، 4=فرعي، 5=تحليلي)
      let calculatedLevel = 1;
      if (cleanC.includes('.') || cleanC.includes('-') || cleanC.includes('/')) {
        calculatedLevel = 5;
      } else if (cleanC.length >= 4) {
        calculatedLevel = 4;
      } else if (cleanC.length === 3) {
        calculatedLevel = 3;
      } else if (cleanC.length === 2) {
        calculatedLevel = 2;
      } else {
        calculatedLevel = 1;
      }
      const level = a.level ? Number(a.level) : calculatedLevel;
      const is_group = a.is_group !== undefined ? Number(a.is_group) : (calculatedLevel < 4 ? 1 : 0);
      
      const rawNat = String(a.nature || a.normal_balance || '').toLowerCase();
      const normType = String(a.account_type || a.type || '').toLowerCase();
      const isCreditType = (
        rawNat === 'credit' || rawNat === 'دائن' ||
        normType.includes('credit') || normType.includes('دائن') ||
        normType.includes('خصوم') || normType.includes('liability') || normType.includes('liabilities') ||
        normType.includes('حقوق') || normType.includes('equity') ||
        normType.includes('إيراد') || normType.includes('ايراد') || normType.includes('revenue') || normType.includes('sales') ||
        cleanC.startsWith('2') || cleanC.startsWith('3') || cleanC.startsWith('4')
      );
      const nature = isCreditType ? 'credit' : 'debit';
      
      const is_active = a.is_active !== undefined ? Number(a.is_active) : 1;
      const openingBal = parseFloat(a.opening_balance || a.open_bal || 0.0);

      // Compute ledger movements from journal entries in base currency (YER) and native currency
      let totalDebit = 0.0;
      let totalCredit = 0.0;
      let foreignDebit = 0.0;
      let foreignCredit = 0.0;
      let hasMovements = false;
      let hasForeignMovements = false;

      // extractCode: يستخرج كود الحساب من النص أو المعرف بدقة لمنع تداخل الحسابات (مثل 101 مع 101.2 أو 2 مع ACC-101-2)
      const extractCode = (str) => {
        if (!str) return '';
        const s = String(str).trim();
        const stripped = (s.toUpperCase().startsWith('ACC-') || s.toUpperCase().startsWith('ACC_'))
          ? s.slice(4).trim()
          : s;
        // استخراج الكود الرقمي بالكامل شاملاً الأرقام الفرعية المفصولة بنقطة أو شرطة
        const match = stripped.match(/^(\d+(?:[.\-_]\d+)*)/);
        if (match) {
          return cleanCode(match[1]);
        }
        return cleanCode(stripped);
      };

      // doesMatchAccount: مطابقة طرف القيد (المدين أو الدائن) مع الحساب الحالي بدقة قطعية تمنع أي تداخل
      const doesMatchAccount = (str) => {
        if (!str || !code) return false;
        const s = String(str).trim();
        if (!s) return false;

        // 1. المطابقة المباشرة مع المعرف الرقمي أو رمز الحساب
        if (id && s === String(id)) return true;
        if (a.account_id && s === String(a.account_id)) return true;

        // 2. المطابقة مع الكود المنظف بدقة متطابقة
        const ext = extractCode(s);
        if (ext && (ext === cleanC || ext === cleanCode(code))) return true;

        // 3. مطابقة صريحة مع ACC-code
        if (s === `ACC-${code}` || s === `ACC_${code}` || s === `ACC-${cleanC}` || s === `ACC-${cleanC.replace(/\./g, '-')}`) return true;

        // 4. مطابقة الاسم المركب في بداية السند (مثل "301.02 - راس مال هنادي")
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

        // المطابقة الدقيقة لمنع تداخل الحسابات المشابهة (مثل كود 2 مع ACC-101-2)
        const matchesDebit = doesMatchAccount(dStr);
        const matchesCredit = doesMatchAccount(cStr);

        if (matchesDebit) {
          totalDebit += baseAmt;
          hasMovements = true;
          if (accCurr !== 'YER') {
            if (jCurr === accCurr) {
              foreignDebit += jAmt;
              hasForeignMovements = true;
            } else {
              const accRate = (window.CurrencyService ? window.CurrencyService.getRate(accCurr) : 142.0) || 142.0;
              foreignDebit += (accRate > 0 ? (baseAmt / accRate) : baseAmt);
              hasForeignMovements = true;
            }
          }
        }
        if (matchesCredit) {
          totalCredit += baseAmt;
          hasMovements = true;
          if (accCurr !== 'YER') {
            if (jCurr === accCurr) {
              foreignCredit += jAmt;
              hasForeignMovements = true;
            } else {
              const accRate = (window.CurrencyService ? window.CurrencyService.getRate(accCurr) : 142.0) || 142.0;
              foreignCredit += (accRate > 0 ? (baseAmt / accRate) : baseAmt);
              hasForeignMovements = true;
            }
          }
        }
      });

      // 👑 الرصيد الفعلي المعتمد مباشرة من قاعدة بيانات Supabase (chart_of_accounts.current_balance)
      let calculatedBal = 0.0;
      if (a.current_balance !== undefined && a.current_balance !== null && a.current_balance !== '') {
        calculatedBal = parseFloat(a.current_balance) || 0.0;
      } else if (a.balance !== undefined && a.balance !== null && a.balance !== '') {
        calculatedBal = parseFloat(a.balance) || 0.0;
      } else if (hasMovements) {
        calculatedBal = nature === 'credit' ? (openingBal + (totalCredit - totalDebit)) : (openingBal + (totalDebit - totalCredit));
      } else {
        calculatedBal = openingBal;
      }

      // حساب الرصيد الحقيقي بالعملة الأصلية للحساب (مثل SAR أو USD)
      let foreignBal = 0.0;
      if (accCurr !== 'YER') {
        if (hasForeignMovements) {
          foreignBal = nature === 'credit' ? (foreignCredit - foreignDebit) : (foreignDebit - foreignCredit);
        } else if (a.foreign_balance !== undefined && a.foreign_balance !== null && a.foreign_balance !== '') {
          foreignBal = parseFloat(a.foreign_balance) || 0.0;
        } else if (calculatedBal !== 0) {
          const defRate = parseFloat(a.exchange_rate) || (window.CurrencyService ? window.CurrencyService.getRate(accCurr) : 142.0);
          foreignBal = defRate > 0 ? (calculatedBal / defRate) : 0.0;
        }
      }

      return {
        ...a,
        id,
        code,
        name,
        name_en: a.name_en || '',
        account_type: type,
        parent_id,
        level,
        is_group,
        nature,
        is_active,
        balance: calculatedBal,
        foreign_balance: foreignBal,
        opening_balance: openingBal,
        total_debit: totalDebit,
        total_credit: totalCredit
      };
    });
  }, [accounts, journal]);

  const isChildOf = useCallback((child, parentAcc) => {
    if (!child || !parentAcc) return false;
    const pCode = cleanCode(parentAcc.code || parentAcc.acc_code || parentAcc.id);
    const pId = String(parentAcc.id || '').trim();
    const pAccId = String(parentAcc.account_id || '').trim();
    const cParent = cleanCode(child.parent_id || child.parent_account_id || child.parent_account_code || '');
    const cParentRaw = String(child.parent_id || child.parent_account_id || child.parent_account_code || '').trim();
    const cCode = cleanCode(child.code || child.acc_code || child.id);
    const cType = child.account_type || child.acc_type || '';

    if (!cCode || !pCode || cCode === pCode || String(child.id) === pId) return false;

    // 1. Explicit Parent ID / Code Match (Primary rule)
    if (cParentRaw || cParent) {
      if (
        cParentRaw === pId ||
        cParentRaw === pAccId ||
        cParentRaw === pCode ||
        cParent === pCode ||
        cParent === pId ||
        cParentRaw === `ACC-${pCode}` ||
        cParentRaw === `ACC_${pCode}` ||
        (child.parent_account_code && cleanCode(child.parent_account_code) === pCode)
      ) {
        return true;
      }
    }

    // 2. Hierarchical prefix notation (supports dots: 3111.01, dashes: 3111-01 / 3111-01-01, slashes: 3111/01):
    const separators = ['.', '-', '/', '_'];
    for (let sep of separators) {
      const prefix = pCode + sep;
      if (cCode.startsWith(prefix)) {
        const rest = cCode.slice(prefix.length);
        if (!rest.includes(sep) || pCode.includes(sep)) {
          return true;
        }
      }
    }

    // 3. Level 2 under Root Level 1 (only when no explicit parent):
    // الحسابات القياسية ذات 3 خانات تتبع المستوى 1 مباشرة (مثل 101 تحت 1، 201 تحت 2، 301 تحت 3)
    if (cCode.startsWith(pCode) && !cCode.includes('.') && !cCode.includes('-') && !cCode.includes('/')) {
      if (pCode.length === 1 && (cCode.length === 2 || cCode.length === 3 || cCode.length === 4)) return true;
      if (pCode.length === 2 && (cCode.length === 3 || cCode.length === 4)) return true;
      if (pCode.length === 3 && cCode.length === 4) return true;
      if (pCode.length === 4 && cCode.length === 6) return true;
    }

    return false;
  }, []);

  // Compute Dynamic Recursive Balances for Parent Accounts (Standard ERP Rollup)
  const accountsWithRollupBalances = useMemo(() => {
    const accList = normalizedAccounts;

    // Helper: Identify all direct children of an account
    const getDirectChildren = (parentAcc) => {
      return accList.filter(c => isChildOf(c, parentAcc));
    };

    // Recursive calculation: Leaves provide their balance, Parents sum their children's recursive rollups
    const memoSum = {};
    const calcNodeRollup = (acc, visited = new Set()) => {
      const key = cleanCode(acc.code || acc.id);
      if (memoSum[key] !== undefined) return memoSum[key];
      if (visited.has(key)) return parseFloat(acc.balance) || 0.0;
      visited.add(key);

      const children = getDirectChildren(acc);
      if (children.length === 0) {
        memoSum[key] = parseFloat(acc.balance) || 0.0;
        return memoSum[key];
      }

      // Summary/Parent account -> recursive sum of own balance + all children's rollups
      let total = parseFloat(acc.balance) || 0.0;
      children.forEach(child => {
        total += calcNodeRollup(child, new Set(visited));
      });

      memoSum[key] = total;
      return total;
    };

    return accList.map(a => {
      const children = getDirectChildren(a);
      const hasChildren = children.length > 0;
      const rollup = calcNodeRollup(a);
      return {
        ...a,
        is_group: hasChildren ? 1 : (a.is_group !== undefined ? Number(a.is_group) : 0),
        is_postable: hasChildren ? 0 : 1,
        rollupBalance: hasChildren ? rollup : (parseFloat(a.balance) || 0.0),
        hasChildren
      };
    });
  }, [normalizedAccounts, isChildOf]);

  // تفعيل التوسيع التلقائي لأي مجلد أو حساب أب يحتوي على حسابات فرعية لضمان ظهورها في الشجرة فوراً
  useEffect(() => {
    if (accountsWithRollupBalances && accountsWithRollupBalances.length > 0) {
      setExpandedNodes(prev => {
        let changed = false;
        const next = { ...prev };
        accountsWithRollupBalances.forEach(a => {
          if (a.hasChildren || a.is_group === 1 || Number(a.level) <= 2) {
            const c = cleanCode(a.code || a.id);
            if (!next[c] || !next[a.id] || !next[`ACC-${c}`]) {
              next[c] = true;
              next[a.id] = true;
              next[`ACC-${c}`] = true;
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });
    }
  }, [accountsWithRollupBalances]);

  // Handle Dynamic Code Auto-Suggestion
  const handleParentChange = async (parentIdVal) => {
    const parentId = (parentIdVal === '' || parentIdVal === '0') ? null : parentIdVal;
    let newType = formData.account_type;
    let newNature = formData.nature;
    let parentCode = '';

    if (parentId) {
      const parentAcc = accountsWithRollupBalances.find(a => 
        String(a.id) === String(parentId) || 
        String(a.code) === String(parentId) ||
        cleanCode(a.code) === cleanCode(parentId)
      );
      if (parentAcc) {
        newType = parentAcc.account_type;
        newNature = parentAcc.nature;
        parentCode = cleanCode(parentAcc.code || parentAcc.id);
      } else {
        parentCode = cleanCode(parentId);
      }
    }

    if (parentCode.startsWith('3')) { newType = 'حقوق ملكية'; newNature = 'credit'; }
    else if (parentCode.startsWith('1')) { newType = 'أصول'; newNature = 'debit'; }
    else if (parentCode.startsWith('2')) { newType = 'خصوم'; newNature = 'credit'; }
    else if (parentCode.startsWith('4')) { newType = 'إيرادات'; newNature = 'credit'; }
    else if (parentCode.startsWith('5') || parentCode.startsWith('6')) { newType = 'مصروفات'; newNature = 'debit'; }

    let suggestedCode = getSmartSuggestedAccountCode(parentCode, accountsWithRollupBalances);
    if (window.suggestAccountCode && parentCode) {
      try {
        const beCode = await window.suggestAccountCode(parentCode);
        if (beCode && beCode !== '101' && !accountsWithRollupBalances.some(a => cleanCode(a.code || a.account_code) === cleanCode(beCode))) {
          suggestedCode = beCode;
        }
      } catch (e) {}
    }

    setFormData(prev => ({
      ...prev,
      parent_id: parentCode || parentIdVal,
      code: suggestedCode,
      account_type: newType,
      nature: newNature,
      is_group: 0 // New child defaults to transactional
    }));
  };

  // Open Modal to Add New Account (+ فرع)
  const handleOpenAddModal = async (presetParentId = null) => {
    setEditingAccount(null);
    let parentId = '';
    let parentCode = '';
    let initialType = 'أصول';
    let initialNature = 'debit';

    if (presetParentId) {
      const pAcc = accountsWithRollupBalances.find(a => 
        String(a.id) === String(presetParentId) || 
        String(a.code) === String(presetParentId) ||
        String(a.account_id) === String(presetParentId) ||
        cleanCode(a.code) === cleanCode(presetParentId)
      );
      if (pAcc) {
        parentId = cleanCode(pAcc.code || pAcc.id);
        parentCode = cleanCode(pAcc.code || pAcc.id);
        initialType = pAcc.account_type || 'أصول';
        initialNature = pAcc.nature || 'debit';
      } else {
        parentId = cleanCode(presetParentId);
        parentCode = cleanCode(presetParentId);
      }
    }

    if (parentCode.startsWith('3') || parentId.startsWith('3')) {
      initialType = 'حقوق ملكية';
      initialNature = 'credit';
    } else if (parentCode.startsWith('1') || parentId.startsWith('1')) {
      initialType = 'أصول';
      initialNature = 'debit';
    } else if (parentCode.startsWith('2') || parentId.startsWith('2')) {
      initialType = 'خصوم';
      initialNature = 'credit';
    } else if (parentCode.startsWith('4') || parentId.startsWith('4')) {
      initialType = 'إيرادات';
      initialNature = 'credit';
    } else if (parentCode.startsWith('5') || parentId.startsWith('5') || parentCode.startsWith('6') || parentId.startsWith('6')) {
      initialType = 'مصروفات';
      initialNature = 'debit';
    }

    let initialCode = getSmartSuggestedAccountCode(parentCode || parentId, accountsWithRollupBalances);
    if (window.suggestAccountCode && (parentCode || parentId)) {
      try {
        const beCode = await window.suggestAccountCode(parentCode || parentId);
        if (beCode && beCode !== '101' && !accountsWithRollupBalances.some(a => cleanCode(a.code || a.account_code) === cleanCode(beCode))) {
          initialCode = beCode;
        }
      } catch (e) {}
    }

    setFormData({
      id: null,
      code: initialCode,
      name: '',
      name_en: '',
      account_type: initialType,
      parent_id: parentId,
      nature: initialNature,
      is_group: 0, // Child accounts default to transactional
      is_active: 1,
      balance: '0',
      notes: ''
    });
    setShowModal(true);
  };

  // Dedicated Helper: Open Modal Specifically for Adding a New Expense Item
  const handleOpenAddExpenseModal = async () => {
    setEditingAccount(null);
    const expRoot = accountsWithRollupBalances.find(a => cleanCode(a.code || a.id) === '6' || a.name.includes('المصروفات') || a.account_type === 'مصروفات');
    const parentId = expRoot ? String(expRoot.id || expRoot.code || '6') : '6';

    let initialCode = '608';
    try {
      const expCodes = accountsWithRollupBalances
        .filter(a => a.account_type === 'مصروفات' || cleanCode(a.code).startsWith('6'))
        .map(a => parseInt(cleanCode(a.code)))
        .filter(n => !isNaN(n) && n >= 600 && n < 700);
      const maxCode = expCodes.length > 0 ? Math.max(...expCodes) : 607;
      initialCode = String(maxCode + 1);
    } catch (e) {
      initialCode = '608';
    }

    setFormData({
      id: null,
      code: initialCode,
      name: '',
      name_en: '',
      account_type: 'مصروفات',
      parent_id: parentId,
      nature: 'debit',
      is_group: 0,
      is_active: 1,
      balance: '0',
      notes: 'بند مصروف تشغيلي معتمد'
    });
    setShowModal(true);
  };

  // Dedicated Helper: Open Modal Specifically for Adding a New Partner (رأس مال شريك تحت 301)
  const handleOpenAddPartnerModal = async () => {
    setEditingAccount(null);
    const partnerRoot = accountsWithRollupBalances.find(a => cleanCode(a.code || a.id) === '301' || a.name.includes('رأس المال المباشر'));
    const parentId = partnerRoot ? cleanCode(partnerRoot.code || partnerRoot.id || '301') : '301';

    let initialCode = getSmartSuggestedAccountCode(parentId, accountsWithRollupBalances);
    if (window.suggestAccountCode) {
      try {
        const beCode = await window.suggestAccountCode(parentId);
        if (beCode && beCode.startsWith('301.') && !accountsWithRollupBalances.some(a => cleanCode(a.code || a.account_code) === cleanCode(beCode))) {
          initialCode = beCode;
        }
      } catch (e) {}
    }

    setFormData({
      id: null,
      code: initialCode || '301.04',
      name: '',
      name_en: '',
      account_type: 'حقوق ملكية',
      parent_id: parentId,
      nature: 'credit',
      is_group: 0,
      is_active: 1,
      balance: '0',
      notes: 'حساب رأس مال شريك في المؤسسة'
    });
    setShowModal(true);
  };

  // Open Modal to Edit Existing Account
  const handleOpenEditModal = (acc) => {
    setEditingAccount(acc);
    setFormData({
      id: acc.id || acc.account_id || acc.code,
      account_id: acc.account_id || acc.id || '',
      code: acc.code || acc.account_code || '',
      name: acc.name || acc.account_name || '',
      name_en: acc.name_en || acc.account_name_en || '',
      account_type: acc.account_type || acc.type || 'مصروفات',
      parent_id: acc.parent_id !== null && acc.parent_id !== undefined ? String(acc.parent_id) : (acc.parent_account_id || ''),
      nature: acc.nature || acc.normal_balance || 'debit',
      is_group: acc.hasChildren ? 1 : Number(acc.is_group || 0),
      is_active: Number(acc.is_active !== undefined ? acc.is_active : 1),
      balance: String(acc.opening_balance ?? acc.balance ?? 0),
      notes: acc.notes || ''
    });
    setShowModal(true);
  };

  // Handle Save (Add/Update) with Parent-Child Auto-Switching
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return showToast('اسم الحساب مطلوب', 'error');
    if (!formData.code.trim()) return showToast('كود الحساب مطلوب', 'error');

    const isEditingThisAccount = editingAccount && (
      String(editingAccount.code || editingAccount.account_code) === String(formData.code) ||
      (editingAccount.id && String(editingAccount.id) === String(formData.id)) ||
      (editingAccount.account_id && String(editingAccount.account_id) === String(formData.account_id))
    );

    const existing = accountsWithRollupBalances.find(a => {
      const sameCode = String(a.code || a.account_code) === String(formData.code);
      if (!sameCode) return false;
      if (isEditingThisAccount && (
        String(a.code || a.account_code) === String(editingAccount.code || editingAccount.account_code) ||
        String(a.id) === String(editingAccount.id) ||
        String(a.account_id || '') === String(editingAccount.account_id || '')
      )) {
        return false;
      }
      return true;
    });

    if (existing) {
      return showToast(`كود الحساب ${formData.code} مستخدم بالفعل للحساب (${existing.name})`, 'error');
    }

    if (formData.id && formData.parent_id) {
      if (String(formData.id) === String(formData.parent_id)) {
        return showToast('لا يمكن جعل الحساب أباً لنفسه', 'error');
      }
    }

    const cleanC = cleanCode(formData.code);
    let finalType = formData.account_type;
    let finalNature = formData.nature;
    if (cleanC.startsWith('3')) { finalType = 'حقوق ملكية'; finalNature = 'credit'; }
    else if (cleanC.startsWith('1')) { finalType = 'أصول'; finalNature = 'debit'; }
    else if (cleanC.startsWith('2')) { finalType = 'خصوم'; finalNature = 'credit'; }
    else if (cleanC.startsWith('4')) { finalType = 'إيرادات'; finalNature = 'credit'; }
    else if (cleanC.startsWith('5') || cleanC.startsWith('6')) { finalType = 'مصروفات'; finalNature = 'debit'; }

    const payload = {
      ...formData,
      account_type: finalType,
      nature: finalNature,
      balance: editingAccount ? (parseFloat(editingAccount.balance) || 0.0) : 0.0,
      opening_balance: 0.0,
      current_balance: editingAccount ? (parseFloat(editingAccount.balance) || 0.0) : 0.0,
      is_group: Number(formData.is_group),
      is_active: Number(formData.is_active)
    };

    try {
      const res = await fetch('/api/accounts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res && res.success !== false) {
        showToast(res.message || 'تم حفظ الحساب بنجاح 👑', 'success');
        
        // Auto-expand parent account immediately so the child account is visible right away
        if (payload.parent_id) {
          const pClean = cleanCode(payload.parent_id);
          setExpandedNodes(prev => ({
            ...prev,
            [payload.parent_id]: true,
            [pClean]: true,
            [`ACC-${pClean}`]: true
          }));
        }

        // Auto-switch parent account to is_group=1 in local state
        const updatedList = accountsWithRollupBalances.map(a => {
          if (payload.parent_id && (String(a.id) === String(payload.parent_id) || String(a.code) === String(payload.parent_id) || cleanCode(a.code) === cleanCode(payload.parent_id))) {
            return { ...a, is_group: 1, is_postable: 0 };
          }
          if (String(a.code || a.account_code) === String(payload.code) || String(a.id) === String(payload.id)) {
            return { ...a, ...payload };
          }
          return a;
        });

        const existsInList = updatedList.some(a => String(a.code || a.account_code) === String(payload.code));
        setAccounts(existsInList ? updatedList : [payload, ...updatedList]);
        setShowModal(false);
        setEditingAccount(null);

        // Fetch fresh authoritative list from backend
        fetchFreshAccounts();
      } else {
        showToast((res && (res.error || res.message)) || 'فشل حفظ الحساب', 'error');
      }
    } catch (err) {
      showToast(err.message || 'حدث خطأ أثناء حفظ الحساب', 'error');
    }
  };

  const handleToggleStatus = async (acc) => {
    const newStatus = acc.is_active === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? 'تفعيل' : 'تعطيل';
    if (!confirm(`هل أنت متأكد من رغبتك في ${actionText} الحساب (${acc.code} - ${acc.name})؟`)) return;

    const payload = { ...acc, is_active: newStatus };
    try {
      if (window.saveAccount) {
        await window.saveAccount(payload);
      }
      setAccounts(accountsWithRollupBalances.map(a => String(a.id) === String(acc.id) ? payload : a));
      showToast(`تم ${actionText} الحساب بنجاح`, 'success');
    } catch (err) {
      showToast(`فشل ${actionText} الحساب`, 'error');
    }
  };

  const handleDeleteAccount = async (acc) => {
    // التحقق مسبقاً إذا كان الحساب يمتلك فروعاً تحته لتنبيه المستخدم مباشرة
    const hasChildren = (accountsWithRollupBalances || []).some(a => isChildOf(a, acc));
    if (hasChildren) {
      return showToast(`لا يمكن حذف الحساب (${acc.code} - ${acc.name}) لأنه حساب رئيسي يحتوي على حسابات فرعية تحته. يرجى حذف أو نقل الفروع أولاً.`, 'error');
    }

    if (!confirm(`هل أنت متأكد من حذف الحساب (${acc.code} - ${acc.name}) نهائياً؟`)) return;

    try {
      const payload = {
        id: acc.id,
        code: acc.code,
        account_code: acc.code,
        name: acc.name,
        account_name: acc.name
      };

      let res;
      if (window.deleteAccount) {
        res = await window.deleteAccount(payload);
      } else {
        res = await fetch('/api/accounts/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());
      }

      if (res && res.success !== false) {
        showToast(`تم حذف الحساب (${acc.code} - ${acc.name}) بنجاح من النظام وقاعدة البيانات 👑`, 'success');
        setAccounts(prev => (prev || []).filter(a => cleanCode(a.code) !== cleanCode(acc.code) && String(a.id) !== String(acc.id)));
        await fetchFreshAccounts();
      } else {
        showToast((res && (res.error || res.message)) || 'لا يمكن حذف الحساب', 'error');
      }
    } catch (err) {
      showToast(err.message || 'فشل حذف الحساب', 'error');
    }
  };

  const handleOpenAuditModal = async () => {
    if (window.getAccountAuditLogs) {
      const logs = await window.getAccountAuditLogs();
      setAuditLogs(logs);
    }
    setShowAuditModal(true);
  };

  const toggleExpand = (codeOrId) => {
    const c = cleanCode(codeOrId);
    setExpandedNodes(prev => ({
      ...prev,
      [codeOrId]: !prev[codeOrId],
      [c]: !prev[c],
      [`ACC-${c}`]: !prev[`ACC-${c}`]
    }));
  };

  const expandAll = () => {
    const all = {};
    accountsWithRollupBalances.forEach(a => {
      const c = cleanCode(a.code || a.id);
      all[a.id] = true;
      all[a.code] = true;
      all[c] = true;
      all[`ACC-${c}`] = true;
    });
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  const handleMaxDepthChange = (depthVal) => {
    setMaxDepthFilter(depthVal);
    if (depthVal === '1') {
      collapseAll();
    } else if (depthVal === 'ALL' || depthVal === '4') {
      expandAll();
    } else {
      const maxLvl = Number(depthVal);
      const toExpand = {};
      accountsWithRollupBalances.forEach(a => {
        if (a.level < maxLvl) {
          const c = cleanCode(a.code || a.id);
          toExpand[a.id] = true;
          toExpand[a.code] = true;
          toExpand[c] = true;
          toExpand[`ACC-${c}`] = true;
        }
      });
      setExpandedNodes(toExpand);
    }
  };

  const handleFilterTypeChange = (typeVal) => {
    setFilterType(typeVal);
    if (typeVal !== 'ALL') {
      expandAll();
    }
  };

  const filterMatches = useCallback((acc) => {
    if (filterType !== 'ALL') {
      const c = cleanCode(acc.code);
      const isMatch = (
        acc.account_type === filterType ||
        (filterType === 'تكلفة المبيعات' && (c.startsWith('51') || acc.account_type === 'COGS' || acc.name.includes('تكلفة'))) ||
        (filterType === 'مصروفات' && (c.startsWith('52') || c.startsWith('6') || (c.startsWith('5') && !c.startsWith('51')) || acc.account_type === 'مصروفات')) ||
        (filterType === 'أصول' && (c.startsWith('1') || acc.account_type === 'أصول')) ||
        (filterType === 'خصوم' && (c.startsWith('2') || acc.account_type === 'خصوم')) ||
        (filterType === 'حقوق ملكية' && (c.startsWith('3') || acc.account_type === 'حقوق ملكية')) ||
        (filterType === 'إيرادات' && (c.startsWith('4') || acc.account_type === 'إيرادات'))
      );
      if (!isMatch) return false;
    }
    if (maxDepthFilter !== 'ALL' && acc.level > Number(maxDepthFilter)) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      acc.code.toLowerCase().includes(term) ||
      acc.name.toLowerCase().includes(term) ||
      acc.name_en.toLowerCase().includes(term) ||
      acc.account_type.toLowerCase().includes(term)
    );
  }, [searchTerm, filterType, maxDepthFilter]);

  const getChildrenOfNode = useCallback((parentAcc) => {
    return accountsWithRollupBalances.filter(c => isChildOf(c, parentAcc));
  }, [accountsWithRollupBalances, isChildOf]);

  const renderTreeNode = (acc) => {
    const children = getChildrenOfNode(acc);
    const cCode = cleanCode(acc.code || acc.acc_code || acc.id);
    const isExpanded = !!expandedNodes[acc.id] || !!expandedNodes[acc.code] || !!expandedNodes[cCode] || !!expandedNodes[`ACC-${cCode}`];
    const isMatching = filterMatches(acc);
    const hasMatchingChild = children.some(c => filterMatches(c));

    // إذا تم تحديد مستوى محدد وتجاوزه هذا الحساب -> لا يتم عرضه
    if (maxDepthFilter !== 'ALL' && acc.level > Number(maxDepthFilter)) return null;

    // تصفية حسب نوع الحساب والبحث النصي
    if (filterType !== 'ALL' && !isMatching && !hasMatchingChild) return null;
    if (searchTerm.trim() && !isMatching && !hasMatchingChild) return null;

    const isGroup = acc.is_group === 1 || children.length > 0;
    const isDebit = acc.nature === 'debit';
    const displayBalance = isGroup ? acc.rollupBalance : acc.balance;

    // تحديد ما إذا كان يجب عرض الأبناء بناءً على فلتر المستوى
    const shouldRenderChildren = children.length > 0 && (
      (maxDepthFilter === 'ALL' && isExpanded) ||
      (maxDepthFilter !== 'ALL' && Number(maxDepthFilter) > acc.level && isExpanded) ||
      searchTerm.trim()
    );

    return (
      <div key={`${acc.id || acc.code}-${cCode}`} className="mr-2 md:mr-3.5 my-1.5">
        <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
          isGroup ? 'bg-[#FAFAFB] border-[#E8E5EA] font-bold' : 'bg-white border-[#E8E5EA] hover:bg-[#FAFAFB]'
        } ${acc.is_active === 0 ? 'opacity-50 bg-rose-50/40' : ''}`}>
          
          <div className="flex items-center gap-2.5 overflow-hidden">
            {children.length > 0 ? (
              <button 
                onClick={() => toggleExpand(acc.id || acc.code)} 
                title={isExpanded ? "طي الحسابات الفرعية" : "فتح الحسابات الفرعية"}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-[#E8E5EA] text-[#25232A] hover:bg-[#FAFAFB] text-xs font-mono cursor-pointer transition shadow-2xs"
              >
                {isExpanded ? '▼' : '◀'}
              </button>
            ) : (
              <span className="w-6 h-6 inline-block text-center text-[#6F6B75] text-xs">•</span>
            )}

            <div 
              onClick={() => children.length > 0 && toggleExpand(acc.id || acc.code)}
              className={`flex items-center gap-2 ${children.length > 0 ? 'cursor-pointer hover:opacity-85 select-none transition' : ''}`}
              title={children.length > 0 ? (isExpanded ? "انقر للطي" : "انقر لعرض الفروع") : ""}
            >
              <span className="text-base">{isGroup ? '📁' : '📄'}</span>
              <span className="font-mono bg-[#F2E7F3] text-[#8F2A87] px-2 py-0.5 rounded-md text-xs font-bold">{acc.code}</span>
              <span className={`text-xs md:text-sm ${isGroup ? 'font-bold text-[#25232A]' : 'font-medium text-[#25232A]'}`}>{acc.name}</span>

              {children.length > 0 && (
                <span className="text-[10px] bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] px-1.5 py-0.5 rounded-md font-mono font-bold">
                  {children.length} {children.length === 1 ? 'فرع' : 'فروع'}
                </span>
              )}
            </div>

            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
              isGroup ? 'bg-[#FFF1DC] text-[#C97300] border border-[#FFE4B9]' : 'bg-[#E2F5F7] text-[#007F8C] border border-[#C5ECF0]'
            }`}>
              {isGroup ? 'تجميعي' : 'حركة'}
            </span>

            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
              isDebit ? 'bg-[#E2F5F7] text-[#007F8C]' : 'bg-[#F2E7F3] text-[#8F2A87]'
            }`}>
              {isDebit ? 'مدين' : 'دائن'}
            </span>

            {acc.is_active === 0 && (
              <span className="text-[10px] bg-rose-100 text-[#D64545] px-2 py-0.5 rounded-md font-bold">معطل</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left font-mono tabular-nums">
              <span className={`text-xs md:text-sm font-extrabold ${displayBalance > 0 ? 'text-[#007F8C]' : (displayBalance < 0 ? 'text-[#D64545]' : 'text-[#6F6B75]')}`}>
                {displayBalance.toLocaleString('en-US')} <span className="text-[10px] font-medium text-[#6F6B75]">YER ﷼</span>
              </span>
              {acc.currency && acc.currency !== 'YER' && !isGroup && displayBalance !== 0 && (
                <span 
                  className="block text-[10px] font-bold text-amber-600 font-mono"
                  title={`الرصيد الفعلي بالعملة: ${Number(acc.foreign_balance !== undefined && acc.foreign_balance !== null ? acc.foreign_balance : (window.CurrencyService ? window.CurrencyService.fromBase(displayBalance, acc.currency) : (displayBalance / 142))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${acc.currency}`}
                >
                  ({acc.currency} {Number(acc.foreign_balance !== undefined && acc.foreign_balance !== null ? acc.foreign_balance : (window.CurrencyService ? window.CurrencyService.fromBase(displayBalance, acc.currency) : (displayBalance / 142))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </span>
              )}
              {isGroup && <span className="block text-[9px] text-[#6F6B75] text-center font-sans">إجمالي الفرع</span>}
            </div>

            <div className="flex items-center gap-1">
              {cleanCode(acc.code) === '6' || acc.name === 'المصروفات' ? (
                <button
                  onClick={() => handleOpenAddExpenseModal()}
                  title="إضافة بند مصروف تشغيلي جديد (+ بند مصروف)"
                  className="px-2.5 py-1 bg-[#C97300] hover:bg-[#A35D00] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition"
                >
                  <span>💸</span> + بند مصروف
                </button>
              ) : cleanCode(acc.code) === '301' || acc.name.includes('رأس المال المباشر') ? (
                <>
                  <button
                    onClick={() => handleOpenAddPartnerModal()}
                    title="إضافة شريك جديد تحت رأس المال المباشر (301.xx)"
                    className="px-2.5 py-1 bg-[#007F8C] hover:bg-[#006670] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition"
                  >
                    <span>🤝</span> + شريك
                  </button>
                  <button
                    onClick={() => handleOpenAddModal(acc.id || acc.code)}
                    title="إضافة حساب فرعي تحته (+ فرع)"
                    className="px-2.5 py-1 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    + فرع
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleOpenAddModal(acc.id || acc.code)}
                  title="إضافة حساب فرعي تحته (+ فرع)"
                  className="px-2.5 py-1 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  + فرع
                </button>
              )}

              <button
                onClick={() => handleOpenEditModal(acc)}
                title="تعديل الحساب"
                className="w-7 h-7 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg text-xs font-bold border border-[#E8E5EA] flex items-center justify-center cursor-pointer"
              >
                ✏️
              </button>

              <button
                onClick={() => setSelectedDetailAcc(acc)}
                title="عرض التفاصيل"
                className="w-7 h-7 bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                👁️
              </button>

              <button
                onClick={() => handleToggleStatus(acc)}
                title={acc.is_active === 1 ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer ${acc.is_active === 1 ? 'bg-[#FFF1DC] hover:bg-[#FFE4B9] text-[#C97300]' : 'bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C]'}`}
              >
                {acc.is_active === 1 ? '🚫' : '✅'}
              </button>

              <button
                onClick={() => handleDeleteAccount(acc)}
                title="حذف الحساب"
                className="w-7 h-7 bg-rose-50 hover:bg-rose-100 text-[#D64545] rounded-lg text-xs font-bold border border-rose-200 flex items-center justify-center cursor-pointer"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

        {shouldRenderChildren && (
          <div className="border-r-2 border-[#E5CEE7] pr-2 md:pr-4 mt-1 space-y-1">
            {children
              .filter(child => maxDepthFilter === 'ALL' || child.level <= Number(maxDepthFilter))
              .map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const rootNodes = useMemo(() => {
    return accountsWithRollupBalances.filter(a => {
      const code = cleanCode(a.code || a.acc_code || a.id);
      if (['1', '2', '3', '4', '5', '6', '7'].includes(code)) return true;
      const isChild = accountsWithRollupBalances.some(parent => isChildOf(a, parent));
      return !isChild;
    });
  }, [accountsWithRollupBalances, isChildOf]);

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-[#E8E5EA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-[#E8E5EA] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-white via-[#FAFAFB] to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F2E7F3] text-[#8F2A87] border border-[#E5CEE7] flex items-center justify-center text-xl font-bold shadow-xs">
              <Icons.Accounts className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#25232A]">
                الدليل المحاسبي وشجرة الحسابات (Chart of Accounts)
              </h1>
              <p className="text-xs text-[#6F6B75] mt-0.5">
                شجرة محاسبية هرمية مرنة مع الترقيم التلقائي وإدارة الأرصدة التجميعية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCleanResetAccounts}
              disabled={isResetting}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-2.5 rounded-xl border border-rose-200 flex items-center gap-1.5 text-xs cursor-pointer transition shadow-xs disabled:opacity-50"
              title="تصفير ومسح الحسابات والمبالغ التجريبية"
            >
              <span>{isResetting ? '⏳ جاري التصفير...' : '🧹 تصفير دليل الحسابات'}</span>
            </button>

            <button
              onClick={handleSyncCloudAccounts}
              disabled={isSyncing}
              className="bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#8F2A87] font-bold px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] flex items-center gap-1.5 text-xs cursor-pointer transition shadow-xs disabled:opacity-50"
            >
              <span className={isSyncing ? "animate-spin" : ""}>🔄</span>
              <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة دليل الحسابات مع السحابة ☁️'}</span>
            </button>

            <button
              onClick={() => handleOpenAddPartnerModal()}
              className="bg-[#E2F5F7] hover:bg-[#C5ECF0] text-[#007F8C] border border-[#C5ECF0] font-bold px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 text-xs cursor-pointer transition"
              title="إضافة حساب شريك جديد تحت رأس المال المباشر (301.xx) بتسلسل تلقائي"
            >
              <span>🤝</span> + إضافة شريك (رأس مال)
            </button>

            <button
              onClick={() => handleOpenAddExpenseModal()}
              className="bg-[#FFF1DC] hover:bg-[#FFE4B9] text-[#C97300] border border-[#FFE4B9] font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 text-xs cursor-pointer transition"
              title="إضافة بند مصروف تشغيلي جديد تحت قسم المصروفات في شجرة الحسابات"
            >
              <span>💸</span> + بند مصروف جديد
            </button>

            <button
              onClick={() => handleOpenAddModal(null)}
              className="bg-[#B0005A] hover:bg-[#8E0049] text-white font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 text-xs cursor-pointer"
            >
              <span>+</span> إضافة حساب رئيسي
            </button>

            <button
              onClick={handleOpenAuditModal}
              className="bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] font-bold px-3.5 py-2.5 rounded-xl border border-[#E8E5EA] flex items-center gap-1.5 text-xs cursor-pointer"
            >
              📋 سجل التعديلات
            </button>
          </div>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E5EA] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="🔍 ابحث برقم الكود، اسم الحساب، أو النوع..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:border-[#8F2A87] outline-none h-11"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute left-3 top-3 text-[#6F6B75] hover:text-[#25232A] text-xs font-bold">
                ✕ تفريغ
              </button>
            )}
          </div>

          <div>
            <select
              value={filterType}
              onChange={e => handleFilterTypeChange(e.target.value)}
              className="w-full bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl px-3 py-2.5 text-xs font-medium focus:bg-white focus:border-[#8F2A87] outline-none h-11"
            >
              <option value="ALL">جميع أنواع الحسابات</option>
              {accountTypesList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <select
              value={maxDepthFilter}
              onChange={e => handleMaxDepthChange(e.target.value)}
              className="w-full bg-[#FAFAFB] border border-[#E8E5EA] rounded-xl px-3 py-2.5 text-xs font-medium focus:bg-white focus:border-[#8F2A87] outline-none h-11"
            >
              <option value="ALL">عرض جميع المستويات</option>
              <option value="1">المستوى 1 (الرئيسي)</option>
              <option value="2">حتى المستوى 2</option>
              <option value="3">حتى المستوى 3</option>
              <option value="4">حتى المستوى 4</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E8E5EA]">
          <div className="flex items-center gap-2">
            <button onClick={expandAll} className="px-3 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg text-xs font-bold border border-[#E8E5EA] cursor-pointer">
              📂 فتح الكل
            </button>
            <button onClick={collapseAll} className="px-3 py-1.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-lg text-xs font-bold border border-[#E8E5EA] cursor-pointer">
              📁 إغلاق الكل
            </button>
          </div>

          <div className="text-xs text-[#6F6B75] font-bold">
            إجمالي الحسابات: <span className="text-[#8F2A87] font-mono text-xs">{accountsWithRollupBalances.length}</span> (تجميعي: {accountsWithRollupBalances.filter(a=>a.is_group===1).length} | حركة: {accountsWithRollupBalances.filter(a=>a.is_group===0).length})
          </div>
        </div>
      </div>

      {/* Main Hierarchical Tree View Container */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E5EA] min-h-[400px]">
        {rootNodes.length === 0 ? (
          <div className="text-center py-16 text-[#6F6B75]">
            <p className="text-4xl mb-2">📄</p>
            <p className="text-sm font-bold">لا توجد حسابات مطابقة للبحث</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rootNodes.map(root => renderTreeNode(root))}
          </div>
        )}
      </div>

      {/* MODAL: Add / Edit Account */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E8E5EA] overflow-hidden animate-fadeIn my-8">
            <div className="bg-[#FAFAFB] p-5 border-b border-[#E8E5EA] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#25232A] flex items-center gap-2">
                <span>{editingAccount ? '✏️ تعديل بيانات حساب' : '✨ إضافة حساب محاسبي جديد'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#6F6B75] hover:text-[#25232A] text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#25232A] mb-1.5">الحساب الأب (Parent Account)</label>
                <select
                  value={formData.parent_id}
                  onChange={e => handleParentChange(e.target.value)}
                  className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-[#FAFAFB] focus:bg-white focus:border-[#8F2A87] outline-none h-11"
                >
                  <option value="">-- حساب رئيسي بدون أب (Level 1) --</option>
                  {accountsWithRollupBalances.filter(a => String(a.id) !== String(formData.id)).map(a => (
                    <option key={a.id || a.code} value={cleanCode(a.code || a.id)}>
                      { '—'.repeat(Math.max(0, (parseInt(a.level) || 1) - 1)) } {a.code} - {a.name} ({a.account_type})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[#6F6B75] mt-1 block">تغيير الحساب الأب يحدد نوع الحساب ويقترح الكود التلقائي المناسب.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-[#25232A]">كود الحساب (رمز الترقيم) *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextCode = getSmartSuggestedAccountCode(formData.parent_id, accountsWithRollupBalances);
                        setFormData(prev => ({ ...prev, code: nextCode }));
                      }}
                      className="text-[11px] text-[#8F2A87] hover:text-[#73216C] flex items-center gap-1 font-bold cursor-pointer transition"
                      title="اقتراح الكود التالي تلقائياً"
                    >
                      <span>🔄</span> توليد كود تلقائي
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder=""
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 font-mono text-xs font-bold bg-white focus:border-[#8F2A87] outline-none h-11"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">اسم الحساب (عربي) *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => {
                      const val = e.target.value;
                      const isNew = !editingAccount;
                      if (isNew && (val.includes('شريك') || val.includes('راس مال') || val.includes('رأس مال'))) {
                        const isAlreadyUnder301 = formData.parent_id === '301' || String(formData.code).startsWith('301.');
                        if (!isAlreadyUnder301) {
                          const nextCode = getSmartSuggestedAccountCode('301', accountsWithRollupBalances);
                          setFormData(prev => ({
                            ...prev,
                            name: val,
                            parent_id: '301',
                            code: nextCode || '301.04',
                            account_type: 'حقوق ملكية',
                            nature: 'credit'
                          }));
                          return;
                        }
                      }
                      setFormData(prev => ({ ...prev, name: val }));
                    }}
                    placeholder=""
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">اسم الحساب (بالإنجليزية اختياري)</label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="e.g. Showroom Cash Box"
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 font-mono text-xs bg-white focus:border-[#8F2A87] outline-none h-11"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">نوع الحساب</label>
                  <select
                    value={formData.account_type}
                    onChange={e => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11"
                  >
                    {accountTypesList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">طبيعة الحساب</label>
                  <select
                    value={formData.nature}
                    onChange={e => setFormData({ ...formData, nature: e.target.value })}
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11"
                  >
                    <option value="debit">مدين (Debit)</option>
                    <option value="credit">دائن (Credit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#25232A] mb-1.5">فئة الحساب</label>
                  <select
                    value={formData.is_group}
                    onChange={e => setFormData({ ...formData, is_group: Number(e.target.value) })}
                    className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11"
                  >
                    <option value={0}>حساب حركة / مباشر (Posting Account)</option>
                    <option value={1}>حساب تجميعي / أب (Group Account)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#25232A] mb-1.5">حالة الحساب</label>
                <select
                  value={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: Number(e.target.value) })}
                  className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs font-medium bg-white focus:border-[#8F2A87] outline-none h-11"
                >
                  <option value={1}>نشط (Active)</option>
                  <option value={0}>معطل (Disabled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#25232A] mb-1.5">ملاحظات / وصف الحساب</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أدخل أي تفاصيل أو ملاحظات إضافية..."
                  className="w-full border border-[#E8E5EA] rounded-xl p-2.5 text-xs bg-white focus:border-[#8F2A87] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E8E5EA]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-[#FAFAFB] hover:bg-[#E8E5EA] text-[#25232A] rounded-xl font-bold text-xs border border-[#E8E5EA]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#8F2A87] hover:bg-[#73216C] text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  {editingAccount ? 'حفظ التعديلات' : 'إضافة الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Account Detail View */}
      {selectedDetailAcc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E8E5EA] overflow-hidden animate-fadeIn">
            <div className="bg-[#FAFAFB] p-5 border-b border-[#E8E5EA] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#25232A]">👁️ تفاصيل الحساب المحاسبي</h3>
              <button onClick={() => setSelectedDetailAcc(null)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">كود الحساب:</span>
                <span className="font-mono font-bold text-[#8F2A87]">{selectedDetailAcc.code}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">اسم الحساب:</span>
                <span className="font-bold text-[#25232A]">{selectedDetailAcc.name}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">نوع الحساب:</span>
                <span>{selectedDetailAcc.account_type}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الفئة:</span>
                <span>{selectedDetailAcc.is_group === 1 ? 'حساب تجميعي (Group)' : 'حساب حركة (Posting)'}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الطبيعة المحاسبية:</span>
                <span>{selectedDetailAcc.nature === 'debit' ? 'مدين (Debit)' : 'دائن (Credit)'}</span>
              </div>
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الرصيد المحاسبي (العملة الأساسية YER):</span>
                <span className="font-bold font-mono text-[#007F8C]">
                  {Number(selectedDetailAcc.rollupBalance || selectedDetailAcc.balance || 0).toLocaleString('en-US')} YER ﷼
                </span>
              </div>
              {selectedDetailAcc.currency && selectedDetailAcc.currency !== 'YER' && (
                <>
                  <div className="flex justify-between border-b border-[#E8E5EA] pb-2 bg-amber-50/70 px-2.5 py-1.5 rounded-xl border border-amber-200">
                    <span className="text-amber-800 font-bold">الرصيد الفعلي بعملة الحساب ({selectedDetailAcc.currency}):</span>
                    <span className="font-bold font-mono text-amber-700">
                      {Number(selectedDetailAcc.foreign_balance !== undefined && selectedDetailAcc.foreign_balance !== null ? selectedDetailAcc.foreign_balance : (window.CurrencyService ? window.CurrencyService.fromBase(selectedDetailAcc.rollupBalance || selectedDetailAcc.balance, selectedDetailAcc.currency) : ((selectedDetailAcc.rollupBalance || selectedDetailAcc.balance) / 142))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {selectedDetailAcc.currency}
                    </span>
                  </div>
                  {Number(selectedDetailAcc.foreign_balance || 0) > 0 && (
                    <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                      <span className="text-[#6F6B75] font-bold">متوسط سعر الصرف الدفتري:</span>
                      <span className="font-bold font-mono text-[#8F2A87]">
                        {(Math.abs(Number(selectedDetailAcc.rollupBalance || selectedDetailAcc.balance || 0) / Number(selectedDetailAcc.foreign_balance || 1))).toFixed(2)} YER / {selectedDetailAcc.currency}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between border-b border-[#E8E5EA] pb-2">
                <span className="text-[#6F6B75] font-bold">الحالة:</span>
                <span>{selectedDetailAcc.is_active === 1 ? 'نشط' : 'معطل'}</span>
              </div>
            </div>
            <div className="p-4 bg-[#FAFAFB] border-t border-[#E8E5EA] text-left">
              <button onClick={() => setSelectedDetailAcc(null)} className="px-5 py-2 bg-[#25232A] text-white rounded-xl font-bold text-xs">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Audit Logs */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-[#E8E5EA] overflow-hidden animate-fadeIn">
            <div className="bg-[#FAFAFB] p-5 border-b border-[#E8E5EA] flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#25232A]">📋 سجل التعديلات المحاسبية (Audit Log)</h3>
              <button onClick={() => setShowAuditModal(false)} className="text-[#6F6B75] hover:text-[#25232A] font-bold">✕</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-center text-[#6F6B75] py-8 font-bold">لا توجد سجلات تعديلات سابقة.</p>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAFAFB] border-b border-[#E8E5EA]">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">المستخدم</th>
                      <th className="p-2.5">كود الحساب</th>
                      <th className="p-2.5">الإجراء</th>
                      <th className="p-2.5">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, idx) => (
                      <tr key={idx} className="border-b border-[#E8E5EA] hover:bg-[#FAFAFB]">
                        <td className="p-2.5 font-mono text-[#6F6B75]">{log.created_at}</td>
                        <td className="p-2.5 font-bold text-[#25232A]">{log.user_name || 'المستخدم'}</td>
                        <td className="p-2.5 font-mono font-bold text-[#8F2A87]">{log.account_code}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.action === 'create' ? 'bg-[#E2F5F7] text-[#007F8C]' :
                            log.action === 'update' ? 'bg-[#F2E7F3] text-[#8F2A87]' : 'bg-rose-100 text-[#D64545]'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2.5 truncate max-w-xs text-[#6F6B75]">{log.new_value || log.old_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 bg-[#FAFAFB] border-t border-[#E8E5EA] text-left">
              <button onClick={() => setShowAuditModal(false)} className="px-5 py-2 bg-[#25232A] text-white rounded-xl font-bold text-xs">إغلاق</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
