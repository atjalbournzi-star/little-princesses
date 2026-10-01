/**
 * factorySizeChart.js - مواصفات المقاسات القياسية وهندسة القص (Standard Size Charts)
 * Little Princesses ERP - Production Floor Architecture
 */

const KIDS_STANDARD_SIZES = ['1-2Y', '3-5Y', '6-9Y', '10-13Y'];
const WOMEN_STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const STANDARD_SPECS = {
  '1-2Y': {
    dress_len: 48, chest_circ: 52, waist_circ: 50,
    shoulder_w: 22, sleeve_len: 28, total_len: 85,
    unit: 'سم', label: '1-2 سنة (أطفال)'
  },
  '3-5Y': {
    dress_len: 62, chest_circ: 58, waist_circ: 54,
    shoulder_w: 25, sleeve_len: 34, total_len: 105,
    unit: 'سم', label: '3-5 سنوات (أطفال)'
  },
  '6-9Y': {
    dress_len: 78, chest_circ: 66, waist_circ: 60,
    shoulder_w: 28, sleeve_len: 42, total_len: 125,
    unit: 'سم', label: '6-9 سنوات (أطفال)'
  },
  '10-13Y': {
    dress_len: 98, chest_circ: 76, waist_circ: 66,
    shoulder_w: 32, sleeve_len: 50, total_len: 145,
    unit: 'سم', label: '10-13 سنة (يافعات)'
  },
  'XS': {
    dress_len: 135, chest_circ: 82, waist_circ: 64, hip_circ: 88,
    shoulder_w: 36, sleeve_len: 56, total_len: 155,
    unit: 'سم', label: 'XS (نسائي/كبار)'
  },
  'S': {
    dress_len: 138, chest_circ: 88, waist_circ: 70, hip_circ: 94,
    shoulder_w: 38, sleeve_len: 58, total_len: 160,
    unit: 'سم', label: 'S (نسائي/كبار)'
  },
  'M': {
    dress_len: 140, chest_circ: 94, waist_circ: 76, hip_circ: 100,
    shoulder_w: 40, sleeve_len: 59, total_len: 163,
    unit: 'سم', label: 'M (نسائي/كبار)'
  },
  'L': {
    dress_len: 142, chest_circ: 102, waist_circ: 84, hip_circ: 108,
    shoulder_w: 42, sleeve_len: 60, total_len: 165,
    unit: 'سم', label: 'L (نسائي/كبار)'
  },
  'XL': {
    dress_len: 145, chest_circ: 110, waist_circ: 92, hip_circ: 116,
    shoulder_w: 44, sleeve_len: 61, total_len: 168,
    unit: 'سم', label: 'XL (نسائي/كبار)'
  },
  'XXL': {
    dress_len: 145, chest_circ: 118, waist_circ: 100, hip_circ: 124,
    shoulder_w: 46, sleeve_len: 62, total_len: 170,
    unit: 'سم', label: 'XXL (نسائي/كبار)'
  }
};

const getStandardSpecs = (sizeCode) => {
  return STANDARD_SPECS[sizeCode] || {
    dress_len: 75, chest_circ: 65, waist_circ: 60,
    shoulder_w: 28, sleeve_len: 40, total_len: 120,
    unit: 'سم', label: sizeCode || 'قياسي'
  };
};

const getAvailableSizes = (targetSegment) => {
  if (targetSegment === 'women_adults') return WOMEN_STANDARD_SIZES;
  return KIDS_STANDARD_SIZES;
};

const getFabricMetersForSize = (product, sizeCode) => {
  if (!product) return 3.0;
  if (Array.isArray(product.bom) && product.bom.length > 0) {
    const firstBom = product.bom[0];
    const br = firstBom.brackets || {};
    if (br[sizeCode]) return parseFloat(br[sizeCode]);
    for (const key of Object.keys(br)) {
      if (key.includes(sizeCode) || sizeCode.includes(key)) {
        return parseFloat(br[key]);
      }
    }
    if (firstBom.meters) return parseFloat(firstBom.meters);
  }
  const spec = getStandardSpecs(sizeCode);
  if (spec.dress_len <= 55) return 2.0;
  if (spec.dress_len <= 75) return 2.75;
  if (spec.dress_len <= 100) return 3.5;
  return 4.5;
};

window.FactorySizeChart = {
  KIDS_STANDARD_SIZES,
  WOMEN_STANDARD_SIZES,
  STANDARD_SPECS,
  getStandardSpecs,
  getAvailableSizes,
  getFabricMetersForSize
};
