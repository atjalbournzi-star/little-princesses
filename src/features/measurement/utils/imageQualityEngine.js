// src/features/measurement/utils/imageQualityEngine.js
// ImageQualityEngine v4.0 - Acquisition Quality Control & Metrology Pre-Flight
// Architecture Standard: Rule 1 & 2 (< 220 lines)

(function(window) {
  'use strict';

  function inspectCanvasSharpnessLaplacian(canvas) {
    if (!canvas || !canvas.width || !canvas.height) return { variance: 0, grade: 'unknown' };
    var W = canvas.width, H = canvas.height;
    var sampleW = Math.min(320, W), sampleH = Math.min(240, H);
    var scCanvas = document.createElement('canvas');
    scCanvas.width = sampleW; scCanvas.height = sampleH;
    var scCtx = scCanvas.getContext('2d');
    scCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
    var d = scCtx.getImageData(0, 0, sampleW, sampleH).data;

    var sum = 0, sumSq = 0, count = 0;
    for (var y = 1; y < sampleH - 1; y += 2) {
      for (var x = 1; x < sampleW - 1; x += 2) {
        var idx = (y * sampleW + x) * 4;
        var lumC = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
        var lumT = 0.299 * d[idx - sampleW * 4] + 0.587 * d[idx - sampleW * 4 + 1] + 0.114 * d[idx - sampleW * 4 + 2];
        var lumB = 0.299 * d[idx + sampleW * 4] + 0.587 * d[idx + sampleW * 4 + 1] + 0.114 * d[idx + sampleW * 4 + 2];
        var lumL = 0.299 * d[idx - 4] + 0.587 * d[idx - 3] + 0.114 * d[idx - 2];
        var lumR = 0.299 * d[idx + 4] + 0.587 * d[idx + 5] + 0.114 * d[idx + 6];

        var lap = lumT + lumB + lumL + lumR - 4.0 * lumC;
        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }
    if (count === 0) return { variance: 0, grade: 'fail' };
    var mean = sum / count;
    var variance = (sumSq / count) - (mean * mean);
    var grade = variance >= 180 ? 'crisp' : (variance >= 75 ? 'acceptable' : 'blurry');
    return { variance: Math.round(variance), grade: grade };
  }

  function evaluateAcquisitionQuality(canvas, a4Corners, a4Orientation) {
    if (!canvas || !canvas.width) {
      return { score: 0, status: 'fail', summary: 'لا توجد صورة محملة', issues: ['يرجى فتح أو لصق صورة أولاً'] };
    }
    var W = canvas.width, H = canvas.height;
    var mp = Number(((W * H) / 1000000).toFixed(1));
    var issues = [], warnings = [];

    // 1. Resolution Check
    if (mp < 1.0) issues.push('دقة الصورة منخفضة جداً (< 1 ميجابكسل)؛ قد تؤثر على دقة القياس');
    else if (mp < 2.0) warnings.push('دقة متوسطة؛ يفضل استخدام كاميرا بدقة 8 ميجابكسل أو أكثر');

    // 2. Sharpness & Blur
    var sharp = inspectCanvasSharpnessLaplacian(canvas);
    if (sharp.grade === 'blurry') issues.push('الصورة غير حادة أو بها اهتزاز كاميرا (Blur detected)');

    // 3. A4 Paper Border Safety
    var paperTouchesBorder = false;
    if (a4Corners && a4Corners.length === 4) {
      for (var i = 0; i < 4; i++) {
        var pt = a4Corners[i];
        if (pt.x <= 8 || pt.x >= W - 8 || pt.y <= 8 || pt.y >= H - 8) {
          paperTouchesBorder = true;
          break;
        }
      }
      if (paperTouchesBorder) issues.push('ورقة A4 مقطوعة أو ملامسة لحافة الصورة تماماً');
    }

    // 4. Perspective Tilt Check
    var tiltDeg = 0;
    if (a4Corners && a4Corners.length === 4) {
      var top = Math.hypot(a4Corners[1].x - a4Corners[0].x, a4Corners[1].y - a4Corners[0].y);
      var bot = Math.hypot(a4Corners[2].x - a4Corners[3].x, a4Corners[2].y - a4Corners[3].y);
      var left = Math.hypot(a4Corners[3].x - a4Corners[0].x, a4Corners[3].y - a4Corners[0].y);
      var right = Math.hypot(a4Corners[2].x - a4Corners[1].x, a4Corners[2].y - a4Corners[1].y);
      var avgW = (top + bot) / 2, avgH = (left + right) / 2;
      var obsRatio = Math.max(avgW, avgH) / Math.max(1, Math.min(avgW, avgH));
      var targetRatio = 297.0 / 210.0;
      var devRatio = Math.min(1.0, Math.abs(obsRatio - targetRatio) / targetRatio);
      tiltDeg = Math.round(devRatio * 50);
      if (tiltDeg > 28) issues.push('زاوية التصوير مائلة بشدة (> ' + tiltDeg + '°). يرجى التصوير رأسياً من الأعلى 90°');
      else if (tiltDeg > 15) warnings.push('ميلان طفيف في زاوية الكاميرا (' + tiltDeg + '°)');
    }

    // Scoring
    var score = 100;
    score -= issues.length * 25;
    score -= warnings.length * 10;
    if (sharp.grade === 'blurry') score -= 15;
    score = Math.max(10, Math.min(99, score));

    var status = score >= 80 ? 'optimal' : (score >= 60 ? 'acceptable' : 'poor');
    var summary = score >= 80 ? 'جودة الصورة ممتازة وجاهزة للقياس الهندسي' :
      (score >= 60 ? 'جودة مقبولة مع بعض التنبيهات المترولوجية' : 'جودة الصورة غير ملائمة لقياسات قطعية؛ يرجى إعادة التصوير');

    return {
      score: score,
      status: status,
      summary: summary,
      megapixels: mp,
      dimensions: { width: W, height: H },
      sharpness: sharp,
      tiltDegrees: tiltDeg,
      issues: issues,
      warnings: warnings,
      passed: score >= 60
    };
  }

  window.MeasurementQualityEngine = {
    inspectCanvasSharpnessLaplacian: inspectCanvasSharpnessLaplacian,
    evaluateAcquisitionQuality: evaluateAcquisitionQuality
  };

})(typeof window !== 'undefined' ? window : globalThis);
