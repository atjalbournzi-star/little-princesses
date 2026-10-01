// accountHelpers.js - دوال مساعدة مشتركة لدليل الحسابات
// cleanCode: تنظيف كود الحساب من البادئات والتنسيقات الغير معيارية
const cleanCode = (val) => {
  if (val === null || val === undefined) return '';
  let s = String(val).trim();
  if (s.toUpperCase().startsWith('ACC-')) s = s.slice(4).trim();
  if (s.toUpperCase().startsWith('ACC_')) s = s.slice(4).trim();
  // معالجة أكواد تالفة من Google Sheets (مثل 3111-01-01 -> 3111.01)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parts = s.split('-');
    s = `${parts[0]}.${parts[1]}`;
  }
  // تطبيع الأكواد المشرطة (101-2 -> 101.2)
  if (/^\d+-\d+$/.test(s)) {
    s = s.replace('-', '.');
  }
  return s;
};

// getSmartSuggestedAccountCode: اقتراح الكود التالي تلقائياً بناءً على الشجرة
const getSmartSuggestedAccountCode = (parentVal, accountsList = []) => {
  const existingCodes = new Set(
    (accountsList || []).map(a => cleanCode(a.code || a.account_code || a.id || '')).filter(Boolean)
  );

  // 1. حساب رئيسي Level 1 بدون أب
  if (!parentVal || String(parentVal) === '0' || String(parentVal).trim() === '') {
    const rootNums = [];
    (accountsList || []).forEach(a => {
      const c = cleanCode(a.code || a.id || '');
      if (c.length === 1 && /^\d+$/.test(c)) rootNums.push(parseInt(c, 10));
    });
    let nextRoot = rootNums.length > 0 ? Math.max(...rootNums) + 1 : 6;
    while (existingCodes.has(String(nextRoot))) nextRoot++;
    return String(nextRoot);
  }

  const pCode = cleanCode(parentVal);
  if (!pCode) return '101.01';

  // 2. أب Level 1 (خانة واحدة) -> ترقيم مئوي
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
    while (existingCodes.has(String(candidate))) candidate++;
    return String(candidate);
  }

  // 3. أب فرعي (Level 2+) -> نقطة + تسلسل ثنائي
  let maxSeq = 0;
  const prefix = `${pCode}.`;
  (accountsList || []).forEach(a => {
    const c = cleanCode(a.code || a.account_code || a.id || '');
    const aParent = cleanCode(a.parent_id || a.parent_account_code || '');
    if (c.startsWith(prefix)) {
      const rest = c.slice(prefix.length).split('.')[0].split('-')[0].split('_')[0];
      const n = parseInt(rest, 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    } else if (aParent === pCode && c.startsWith(pCode) && c.length > pCode.length) {
      const rest = c.slice(pCode.length).replace(/^[.\-_]/, '').split('.')[0];
      const n = parseInt(rest, 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });
  let nextSeq = maxSeq + 1;
  let pad = nextSeq < 10 ? `0${nextSeq}` : `${nextSeq}`;
  let candidateCode = `${pCode}.${pad}`;
  while (existingCodes.has(candidateCode)) {
    nextSeq++;
    pad = nextSeq < 10 ? `0${nextSeq}` : `${nextSeq}`;
    candidateCode = `${pCode}.${pad}`;
  }
  return candidateCode;
};

// ARABIC_STANDARD_NAMES: أسماء الحسابات القياسية المعتمدة لمؤسسة الأميرات الصغيرات
const ARABIC_STANDARD_NAMES = {
  '1': 'الأصول', '1111': 'الصندوق الرئيسي', '1112': 'البنك / الشبكة وPOS',
  '1121': 'عهد الورشة والمشغل', '1131': 'ذمم العميلات', '1141': 'سلف الخياطين والعاملين',
  '1151': 'مخزون الأقمشة والخامات', '1152': 'إنتاج تحت التشغيل (WIP)',
  '1153': 'مخزون الفساتين التامة', '2': 'الالتزامات (الخصوم)',
  '2111': 'ذمم الموردين ومحلات الأقمشة', '2121': 'دفعات مقدمة وعرابين حجز',
  '2131': 'مستحقات وأجور الخياطين', '3': 'حقوق الملكية',
  '31': 'رأس المال والاحتياطيات', '311': 'رأس المال المباشر',
  '3111': 'رأس مال الشركاء / المالكين', '312': 'الأرباح والاحتياطيات',
  '3121': 'الأرباح المبقاة / المحتجزة', '32': 'جاري الشركاء والمسحوبات',
  '4': 'الإيرادات', '4111': 'إيرادات تفصيل وتصميم الفساتين',
  '4121': 'إيرادات مبيعات فساتين المعرض', '4211': 'أرباح تسويات المخزون',
  '5': 'المصروفات وتكاليف الإنتاج', '5111': 'تكلفة الأقمشة والمواد المباعة',
  '5121': 'أجور خياطة وتصنيع مباشرة', '5211': 'مصاريف تشغيل وصيانة الورشة',
  '5221': 'خسائر وفروقات عجز الجرد'
};
