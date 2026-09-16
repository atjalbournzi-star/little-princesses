/**
 * ============================================================================
 * unitConversionService.js — Central Universal Unit Conversion Engine (UoM)
 * Little Princesses ERP — World-Class Multi-UoM Dynamic Conversion Engine
 * ============================================================================
 * 
 * Supports seamless conversions across:
 * - War / Yard (وار / ياردة)
 * - Meter (متر)
 * - Centimeter (سنتيمتر / سم)
 * - Inch / Imperial (بوصة / إنش ")
 * - Roll / Bolt (طاقة أقمشة / رول)
 * - Piece / Count (حبة / قطعة)
 */

(function(window) {
  'use strict';

  // Constants & Conversion Ratios (Base Standard: 1 Meter = 1.0)
  var METER_TO_YARD = 1.0936132983377; // 1 / 0.9144
  var YARD_TO_METER = 0.9144;
  var INCH_TO_CM = 2.54;
  var CM_TO_INCH = 0.39370078740157; // 1 / 2.54
  var METER_TO_CM = 100.0;
  var CM_TO_METER = 0.01;
  var YARD_TO_INCH = 36.0;
  var INCH_TO_YARD = 1.0 / 36.0;
  var ROLL_TO_YARDS = 25.0; // افتراضي: طاقة القماش الواحدة = 25 وار

  /**
   * توحيد مسمى الوحدة من أي نص عربي أو إنجليزي إلى رمز قياسي
   * Returns: 'وار' | 'متر' | 'سم' | 'إنش' | 'رول' | 'حبة' | 'unknown'
   */
  function normalizeUnit(unitStr) {
    if (!unitStr) return 'متر';
    var u = String(unitStr).trim().toLowerCase();

    if (u.includes('وار') || u.includes('يارد') || u === 'yd' || u === 'yard' || u === 'yards') {
      return 'وار';
    }
    if (u.includes('إنش') || u.includes('انش') || u.includes('بوص') || u === 'in' || u === 'inch' || u === 'inches' || u === '"') {
      return 'إنش';
    }
    if (u.includes('سم') || u.includes('سنتيمتر') || u === 'cm') {
      return 'سم';
    }
    if (u.includes('رول') || u.includes('طاق') || u === 'roll' || u === 'bolt') {
      return 'رول';
    }
    if (u.includes('حب') || u.includes('قطع') || u === 'pc' || u === 'piece') {
      return 'حبة';
    }
    if (u.includes('متر') || u === 'm' || u === 'meter' || u === 'meters') {
      return 'متر';
    }
    return u;
  }

  /**
   * الحصول على تسمية أنيقة للوحدة مع الرمز
   */
  function getUnitLabel(unitStr) {
    var norm = normalizeUnit(unitStr);
    switch (norm) {
      case 'وار': return 'وار (ياردة)';
      case 'متر': return 'متر (m)';
      case 'سم': return 'سم (cm)';
      case 'إنش': return 'إنش (بوصة ")';
      case 'رول': return 'رول (طاقة أقمشة)';
      case 'حبة': return 'حبة (قطعة)';
      default: return unitStr || 'متر';
    }
  }

  /**
   * تحويل أي قيمة طولية إلى وحدة الأساس القياسية الدولية (المتر)
   */
  function toMeters(val, fromUnit) {
    var num = parseFloat(val) || 0;
    if (num === 0) return 0;
    var norm = normalizeUnit(fromUnit);

    switch (norm) {
      case 'متر': return num;
      case 'وار': return num * YARD_TO_METER;
      case 'سم': return num * CM_TO_METER;
      case 'إنش': return (num * INCH_TO_CM) * CM_TO_METER;
      case 'رول': return (num * ROLL_TO_YARDS) * YARD_TO_METER;
      default: return num;
    }
  }

  /**
   * تحويل القيمة من المتر إلى أي وحدة مستهدفة
   */
  function fromMeters(metersVal, toUnit) {
    var m = parseFloat(metersVal) || 0;
    if (m === 0) return 0;
    var norm = normalizeUnit(toUnit);

    switch (norm) {
      case 'متر': return m;
      case 'وار': return m * METER_TO_YARD;
      case 'سم': return m * METER_TO_CM;
      case 'إنش': return (m * METER_TO_CM) * CM_TO_INCH;
      case 'رول': return (m * METER_TO_YARD) / ROLL_TO_YARDS;
      default: return m;
    }
  }

  /**
   * دالة التحويل العامة المباشرة بين أي وحدتين
   * convert(1.5, 'متر', 'وار') -> 1.64
   * convert(30, 'إنش', 'سم') -> 76.2
   */
  function convert(value, fromUnit, toUnit, precision) {
    var num = parseFloat(value);
    if (isNaN(num) || num === 0) return 0;
    var normFrom = normalizeUnit(fromUnit);
    var normTo = normalizeUnit(toUnit);

    if (normFrom === normTo) return num;

    // تحويل مباشر عالي السرعة بين الأزواج الشائعة
    var result = 0;
    if (normFrom === 'إنش' && normTo === 'سم') {
      result = num * INCH_TO_CM;
    } else if (normFrom === 'سم' && normTo === 'إنش') {
      result = num * CM_TO_INCH;
    } else if (normFrom === 'متر' && normTo === 'وار') {
      result = num * METER_TO_YARD;
    } else if (normFrom === 'وار' && normTo === 'متر') {
      result = num * YARD_TO_METER;
    } else if (normFrom === 'متر' && normTo === 'سم') {
      result = num * METER_TO_CM;
    } else if (normFrom === 'سم' && normTo === 'متر') {
      result = num * CM_TO_METER;
    } else if (normFrom === 'وار' && normTo === 'إنش') {
      result = num * YARD_TO_INCH;
    } else if (normFrom === 'إنش' && normTo === 'وار') {
      result = num * INCH_TO_YARD;
    } else {
      // التحويل العام عبر المتر
      var inM = toMeters(num, normFrom);
      result = fromMeters(inM, normTo);
    }

    if (precision !== undefined && precision !== null) {
      return parseFloat(result.toFixed(precision));
    }
    return result;
  }

  /**
   * حساب كمية الخصم الفعلي الواجب اقتطاعها من المخزن بوحدته الأصلية
   * @param {number} requiredAmount - الكمية المطلوبة للموديل/القص
   * @param {string} requiredUnit - وحدة الإدخال (مثلا 'متر')
   * @param {string} stockUnit - وحدة الصنف في المخزن (مثلا 'وار' أو 'متر')
   * @returns {Object} تفاصيل التحويل والاقتطاع
   */
  function calculateDeduction(requiredAmount, requiredUnit, stockUnit) {
    var reqQty = parseFloat(requiredAmount) || 0;
    var fromU = normalizeUnit(requiredUnit || 'متر');
    var toU = normalizeUnit(stockUnit || 'وار');

    var deductAmount = convert(reqQty, fromU, toU);
    var formattedDeduct = parseFloat(deductAmount.toFixed(4));
    var formattedReq = parseFloat(reqQty.toFixed(2));

    var isSame = fromU === toU;
    var summaryText = isSame 
      ? (formattedReq + ' ' + getUnitLabel(toU))
      : (formattedReq + ' ' + getUnitLabel(fromU) + ' ≈ ' + formattedDeduct.toFixed(2) + ' ' + getUnitLabel(toU));

    return {
      requiredAmount: formattedReq,
      requiredUnit: fromU,
      stockUnit: toU,
      deductAmount: formattedDeduct,
      isConverted: !isSame,
      summaryText: summaryText
    };
  }

  /**
   * إنشاء نص عرض مزدوج أنيق وشفاف (Dual-Display) للمشغلين والمستخدمين
   * e.g. formatDual(30, 'إنش') -> "30 إنش (76.2 سم)"
   * e.g. formatDual(1.5, 'متر', 'وار') -> "1.50 م (1.64 وار)"
   */
  function formatDual(value, fromUnit, targetSecondaryUnit) {
    var num = parseFloat(value);
    if (isNaN(num) || num === 0) return '';
    var normFrom = normalizeUnit(fromUnit);
    var secUnit = targetSecondaryUnit ? normalizeUnit(targetSecondaryUnit) : (normFrom === 'إنش' ? 'سم' : (normFrom === 'سم' ? 'إنش' : (normFrom === 'متر' ? 'وار' : 'متر')));

    var convertedVal = convert(num, normFrom, secUnit);
    var dec = secUnit === 'إنش' || secUnit === 'وار' || secUnit === 'متر' ? 2 : 1;
    return num + ' ' + normFrom + ' (' + convertedVal.toFixed(dec) + ' ' + secUnit + ')';
  }

  // Object Export
  var UnitConversionService = {
    normalizeUnit: normalizeUnit,
    getUnitLabel: getUnitLabel,
    toMeters: toMeters,
    fromMeters: fromMeters,
    convert: convert,
    calculateDeduction: calculateDeduction,
    formatDual: formatDual,
    constants: {
      METER_TO_YARD: METER_TO_YARD,
      YARD_TO_METER: YARD_TO_METER,
      INCH_TO_CM: INCH_TO_CM,
      CM_TO_INCH: CM_TO_INCH,
      METER_TO_CM: METER_TO_CM,
      CM_TO_METER: CM_TO_METER,
      YARD_TO_INCH: YARD_TO_INCH,
      ROLL_TO_YARDS: ROLL_TO_YARDS
    }
  };

  window.UnitConversionService = UnitConversionService;
  window.UoMService = UnitConversionService;

})(typeof window !== 'undefined' ? window : this);
