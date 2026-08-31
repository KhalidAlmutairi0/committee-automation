/**
 * معايرة حية للخطوة ٦ على المقترحات المرجعية الثلاثة.
 *
 * لا تكتب في أي شيت، ولا ترسل بريداً، ولا تعتبر الاختلاف نجاحاً أو فشلاً.
 * المخرج مقارنة فقط؛ قرار تعديل البرومبت أو جدول المعايرة يبقى للّجنة.
 */

const SCORING_CALIBRATION_EXPECTED = {
  fintech:     [2, 2, 2, 0, 0, null, 0, 0],
  qiwam:       [2, 0, 1, 2, 1, null, 0, 1],
  startupFair: [1, 0, 1, 1, null, null, 2, 0]
};

const SCORING_CALIBRATION_ORDER = ['fintech', 'qiwam', 'startupFair'];

function calibrationFigures_() {
  return {
    available: false,
    rows: [],
    skipped: 0,
    reason: 'المعيار السادس متخطى في المعايرة حتى تعتمد ورقة الأرقام المركزية.'
  };
}

function calibrationInput_(key, proposals) {
  const input = proposals && proposals[key];
  if (!input || !String(input.text || '').trim()) {
    throw new Error('نص مقترح المعايرة ناقص: ' + key);
  }
  return {
    key: key,
    name: String(input.name || key),
    size: String(input.size || 'غير محدد — معايرة مرجعية'),
    text: String(input.text)
  };
}

function calibrationRequest_(key, proposals) {
  const input = calibrationInput_(key, proposals);
  return {
    input: input,
    figures: calibrationFigures_(),
    payload: scoringRequestPayload_(input.name, input.size, input.text, calibrationFigures_())
  };
}

function calibrationLevelNumber_(item) {
  if (!item || !item.assessed) return null;
  if (item.level === RUBRIC_LEVEL.WEAK.key) return 0;
  if (item.level === RUBRIC_LEVEL.OK.key) return 1;
  if (item.level === RUBRIC_LEVEL.STRONG.key) return 2;
  return null;
}

function calibrationCaseResult_(key, request, response) {
  const items = scoringItemsFromResponse_(response, request.input.text, request.figures);
  const expected = SCORING_CALIBRATION_EXPECTED[key];
  const rows = items.map(function (item) {
    const id = item.criterion.id;
    if (id === 6) {
      return { id: id, name: item.criterion.name, skipped: true,
               expected: null, actual: null, delta: null, matches: null,
               quote: '', level: item.level };
    }
    const actual = calibrationLevelNumber_(item);
    const wanted = expected[id - 1];
    return {
      id: id,
      name: item.criterion.name,
      skipped: false,
      expected: wanted,
      actual: actual,
      delta: typeof wanted === 'number' && typeof actual === 'number' ? actual - wanted : null,
      matches: actual === wanted,
      quote: item.quote || '',
      level: item.level
    };
  });
  return { key: key, name: request.input.name, criteria: rows };
}

function calibrationScoreText_(value) {
  return value === null || value === undefined ? '—' : String(value);
}

function formatScoringCalibration_(cases) {
  const lines = ['معايرة الخطوة ٦ — مقارنة فقط، وليست اختبار نجاح/فشل'];
  cases.forEach(function (calibrationCase) {
    lines.push('', '=== ' + calibrationCase.name + ' ===');
    calibrationCase.criteria.forEach(function (row) {
      if (row.skipped) {
        lines.push('[' + row.id + '] ' + row.name + ' — متخطى (ورقة الأرقام غير معتمدة)');
        return;
      }
      let line = '[' + row.id + '] ' + row.name +
        ' — المتوقع: ' + calibrationScoreText_(row.expected) +
        ' | المودل: ' + calibrationScoreText_(row.actual);
      if (row.delta !== null) line += ' | الفرق: ' + (row.delta > 0 ? '+' : '') + row.delta;
      line += row.matches ? ' | مطابق' : ' | مختلف';
      lines.push(line);
      if (!row.matches) lines.push('    اقتباس المودل: ' + (row.quote || '(لا يوجد اقتباس صالح)'));
    });
  });
  return lines.join('\n');
}

/**
 * callModel اختياري للاختبارات فقط. بدونه يستخدم Anthropic الحقيقي.
 * proposals = { fintech:{name,text,size?}, qiwam:{...}, startupFair:{...} }
 */
function runScoringCalibration(proposals, callModel) {
  rubricSelfCheck();
  const caller = callModel || callAnthropic_;
  const cases = SCORING_CALIBRATION_ORDER.map(function (key) {
    const request = calibrationRequest_(key, proposals);
    return calibrationCaseResult_(key, request, caller(request.payload));
  });
  const report = { cases: cases, text: formatScoringCalibration_(cases) };
  Logger.log(report.text);
  return report;
}
