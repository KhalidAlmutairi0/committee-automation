/**
 * المرحلة ٢ — السجلات
 *
 * سجلّان، مو واحد، ومو مدموجين مع سجل المرحلة ١:
 *
 *   سجل قرارات المراجعة  → صف واحد لكل مراجعة. المحسوب والمعتمد جنب بعض.
 *   سجل المعايير         → صف واحد لكل معيار في كل مراجعة.
 *
 * الثاني هو اللي يجاوب "أي معيار أعدّله أكثر شي؟" بجدول محوري مباشر،
 * بدون ما تفك JSON من خلية.
 *
 * سجل المرحلة ١ يبقى مستقلاً لأن حبيباته مختلفة (صف لكل استلام،
 * فيه الحضور والميزانية وأصحاب المنفعة)، ودمجه كان بيملأه فراغات.
 */

const REVIEW_LOG_HEADERS = [
  'معرّف المراجعة', 'معرّف المشروع', 'اسم المشروع', 'المرحلة', 'الحجم',
  'الدرجة', 'من', 'القرار المحسوب', 'قرار القائد', 'سبب الاختلاف',
  'حاجب فاشل', 'تنبيهات', 'معطّل', 'تاريخ الحساب', 'تاريخ قرار القائد', 'من قرر',
  'درجة القائد', 'من بعد تعديل القائد'
];

const CRITERION_LOG_HEADERS = [
  'معرّف المراجعة', 'معرّف المشروع', 'المرحلة', 'رمز المعيار', 'اسم المعيار',
  'حاجب', 'النتيجة المحسوبة', 'الدرجة المحسوبة', 'القاعدة أو التفصيل',
  'الاقتباس', 'الإصلاح المقترح', 'نتيجة القائد', 'درجة القائد',
  'عدّل القائد', 'التاريخ'
];

function sheetWithHeaders_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setRightToLeft(true);
  } else if (sheet.getLastColumn() < headers.length) {
    // ترقية آمنة للشيتات الموجودة عند إضافة أعمدة جديدة في آخر المخطط.
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function reviewLogSheet()    { return sheetWithHeaders_(CONFIG_2.SHEETS.REVIEW_LOG,    REVIEW_LOG_HEADERS); }
function criterionLogSheet() { return sheetWithHeaders_(CONFIG_2.SHEETS.CRITERION_LOG, CRITERION_LOG_HEADERS); }

function maxReviewSeq_(sheet, col, prefix) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  let maxSeq = 0;
  sheet.getRange(2, col, lastRow - 1, 1).getValues().forEach(function (row) {
    const id = String(row[0] || '').trim();
    if (id.indexOf(prefix) !== 0) return;
    const seq = parseInt(id.slice(prefix.length), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  });
  return maxSeq;
}

/**
 * معرّف مراجعة فريد. إعادة التقديم تاخذ رقماً جديداً،
 * فتاريخ المشروع كامل يبقى محفوظاً بدل ما تُدهس المحاولة السابقة.
 *
 * يمسح المصدرين: سجل قرارات المراجعة **وشيت البروبوزلات**.
 * البربوزل ينحفظ عند الاستلام قبل ما يصير فيه قرار يُسجَّل، فالاكتفاء
 * بسجل القرارات كان يعطي كل بربوزل نفس الرقم -2B-1.
 */
function nextReviewId(projectId, stage) {
  const prefix = projectId + '-' + stage + '-';
  let maxSeq = maxReviewSeq_(reviewLogSheet(), 1, prefix);

  if (stage === '2B') {
    const seq = maxReviewSeq_(proposalsSheet(), proposalCol('reviewId'), prefix);
    if (seq > maxSeq) maxSeq = seq;
  }
  return prefix + (maxSeq + 1);
}

/**
 * يكتب المراجعة في السجلين معاً.
 *
 * review = {
 *   reviewId, projectId, projectName, stage, size,
 *   score, maxScore, computedDecision,
 *   blockingFailed, warnings, disabled,
 *   items: [{ code, name, blocking, result, score, detail, quote, fix }]
 * }
 */
function logReview(review) {
  const now = new Date();

  reviewLogSheet().appendRow([
    review.reviewId,
    review.projectId,
    review.projectName,
    review.stage,
    review.size || '',
    review.score === null || review.score === undefined ? '' : review.score,
    review.maxScore === null || review.maxScore === undefined ? '' : review.maxScore,
    review.computedDecision,
    '',   // قرار القائد — يُعبّأ عند اعتماده
    '',   // سبب الاختلاف
    review.blockingFailed || 0,
    review.warnings || 0,
    review.disabled || 0,
    now,
    '',   // تاريخ قرار القائد
    ''    // من قرر
  ]);

  const items = review.items || [];
  if (items.length) {
    const rows = items.map(function (it) {
      return [
        review.reviewId, review.projectId, review.stage,
        it.code, it.name,
        it.blocking ? 'نعم' : 'لا',
        it.result,
        it.score === null || it.score === undefined ? '' : it.score,
        it.detail || '',
        it.quote  || '',
        it.fix    || '',
        '',   // نتيجة القائد
        '',   // درجة القائد
        'لا', // عدّل القائد — يتغيّر لحظة التعديل
        now
      ];
    });
    const sheet = criterionLogSheet();
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, CRITERION_LOG_HEADERS.length)
         .setValues(rows);
  }
}

/**
 * يسجّل قرار القائد مقابل المحسوب.
 * السبب إلزامي فقط لما يختلف القراران — هذا العمود هو اللي
 * يضبط العتبات والروبريك بعد ترم.
 */
function recordLeadDecision(reviewId, leadDecision, reason, decidedBy, finalScore, finalMax) {
  const sheet   = reviewLogSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() !== String(reviewId).trim()) continue;

    const row      = i + 2;
    const computed = sheet.getRange(row, 8).getValue();
    const differs  = String(computed).trim() !== String(leadDecision).trim();

    sheet.getRange(row,  9).setValue(leadDecision);
    sheet.getRange(row, 10).setValue(differs ? (reason || '(بدون سبب مذكور)') : '');
    sheet.getRange(row, 15).setValue(new Date());
    sheet.getRange(row, 16).setValue(decidedBy || '');
    if (finalScore !== undefined) sheet.getRange(row, 17).setValue(finalScore);
    if (finalMax !== undefined)   sheet.getRange(row, 18).setValue(finalMax);
    return true;
  }
  return false;
}
