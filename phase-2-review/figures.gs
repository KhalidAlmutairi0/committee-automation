/**
 * ورقة الأرقام المركزية — مرجع المعيار السادس.
 *
 * القاعدة من ملف القرارات: لو الورقة فيها فراغات، اطبع تحذيراً واضحاً
 * وعطّل المعيار السادس. لا تخمّن. تخطّي معيار حاجب أهون من اختراع حكم.
 *
 * الورقة اليوم فاضية: التناقضات الثلاثة (١٧٥٠/٣٠٠/١٠٠ مشارك لفنتك،
 * ١٦٠/٧٠ لـ GAME BOX، ١٥K/٥K لـ FTC JAM) ما انحلّت، والجدول المعتمد
 * ما فيه ولا صف. فالمعيار السادس معطّل لين تُعبّى.
 */

const FIGURES_HEADERS = ['الفعالية', 'السنة', 'مسجل', 'مشارك فعلي', 'ورش',
                         'جوائز (ريال)', 'مشاهدة', 'شركاء', 'المصدر'];

function figureCellText_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

/**
 * يرجّع { available, rows, reason, skipped }.
 * available=false يعني المعيار السادس ينعطّل، وباقي التقييم يكمل عادي.
 */
function loadCentralFigures() {
  if (!CONFIG_2.CENTRAL_FIGURES_SHEET_ID) {
    return { available: false, rows: [], skipped: 0, reason:
      'CONFIG_2.CENTRAL_FIGURES_SHEET_ID فاضي — ما فيه ورقة أرقام مركزية مربوطة.' };
  }

  let sheet;
  try {
    const ss = SpreadsheetApp.openById(CONFIG_2.CENTRAL_FIGURES_SHEET_ID);
    sheet = ss.getSheets()[0];
  } catch (err) {
    return { available: false, rows: [], skipped: 0, reason:
      'ما قدرنا نفتح ورقة الأرقام المركزية. تأكد من المعرّف والصلاحيات.' };
  }

  const actualHeaders = sheet.getRange(1, 1, 1, FIGURES_HEADERS.length).getValues()[0]
    .map(figureCellText_);
  const headersMatch = FIGURES_HEADERS.every(function (expected, i) {
    return actualHeaders[i] === expected;
  });
  if (!headersMatch) {
    return { available: false, rows: [], skipped: 0, reason:
      'رؤوس ورقة الأرقام المركزية غير مطابقة. المتوقع: ' + FIGURES_HEADERS.join(' | ') };
  }

  const last = sheet.getLastRow();
  if (last < 2) {
    return { available: false, rows: [], skipped: 0, reason:
      'ورقة الأرقام المركزية فاضية — الجدول المعتمد ما فيه ولا صف.' };
  }

  const values = sheet.getRange(2, 1, last - 1, FIGURES_HEADERS.length).getValues();
  const rows = [];
  let skipped = 0;

  values.forEach(function (r) {
    const name   = figureCellText_(r[0]);
    const source = figureCellText_(r[8]);
    if (!name) return;

    // الروبريك صريح: رقم بلا مصدر لا يدخل الجدول
    if (!source) { skipped++; return; }

    // الاسم والسنة والمصدر بيانات وصفية، ولا تفعّل معيار الأرقام وحدها.
    const metricValues = r.slice(2, 8).map(figureCellText_);
    if (!metricValues.some(function (value) { return value !== ''; })) {
      skipped++;
      return;
    }

    rows.push({
      event:        name,
      year:         figureCellText_(r[1]),
      registered:   figureCellText_(r[2]),
      attended:     figureCellText_(r[3]),
      workshops:    figureCellText_(r[4]),
      prizes:       figureCellText_(r[5]),
      views:        figureCellText_(r[6]),
      partners:     figureCellText_(r[7]),
      source:       source
    });
  });

  if (!rows.length) {
    return { available: false, rows: [], skipped: skipped, reason:
      'ما فيه ولا صف قابل للاعتماد في ورقة الأرقام المركزية' +
      (skipped ? ' (' + skipped + ' صف بلا مصدر أو بلا أي رقم فانستُبعد).' : '.') };
  }

  return { available: true, rows: rows, skipped: skipped, reason: '' };
}

/** نص الورقة كما يُحقن في برومبت التقييم */
function figuresAsText(figures) {
  if (!figures.available) return '';
  return figures.rows.map(function (r) {
    const parts = [];
    if (r.year)       parts.push('السنة ' + r.year);
    if (r.registered) parts.push('مسجل ' + r.registered);
    if (r.attended)   parts.push('مشارك فعلي ' + r.attended);
    if (r.workshops)  parts.push('ورش ' + r.workshops);
    if (r.prizes)     parts.push('جوائز ' + r.prizes);
    if (r.views)      parts.push('مشاهدة ' + r.views);
    if (r.partners)   parts.push('شركاء ' + r.partners);
    return '- ' + r.event + ': ' + parts.join('، ') + ' [المصدر: ' + r.source + ']';
  }).join('\n');
}

/** تحذير يُطبع في اللوق ويوصل القائد */
function figuresWarning(figures) {
  if (figures.available) return '';
  return 'المعيار السادس (أرقام الأعمال السابقة) معطّل: ' + figures.reason +
         ' التقييم بيكمل على باقي المعايير، وما راح يُخمَّن أي رقم. ' +
         'وهو معيار حاجب، فما دام معطّلاً لا يمكن أن تكون النتيجة "معتمد".';
}
