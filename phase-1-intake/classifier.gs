/**
 * لجنة إدارة المشاريع — نادي تقنية المستقبل
 * مصنّف حجم المشاريع + الرد التلقائي + سجل القرارات
 *
 * التركيب:
 *   1. افتح الشيت المربوط بفورم الاستلام
 *   2. Extensions > Apps Script، والصق هذا الملف
 *   3. عدّل CONFIG بالكامل (الروابط والإيميل والمحتوى الجاهز)
 *   4. شغّل setupTrigger() مرة وحدة من القائمة
 */

// ============================================================
// CONFIG — كل شي تعدله موجود هنا فقط
// ============================================================

const CONFIG = {

  OWNER_EMAIL: 'ضع-ايميلك@هنا',
  COMMITTEE_NAME: 'لجنة إدارة المشاريع — نادي تقنية المستقبل',

  // نص السؤال في الفورم بالضبط، حرف بحرف
  QUESTIONS: {
    projectName:  'اسم المشروع',
    leadName:     'اسم قائد المشروع',
    leadPhone:    'رقم قائد المشروع (واتساب)',
    deputyName:   'اسم نائب قائد المشروع',
    deputyPhone:  'رقم نائب قائد المشروع (واتساب)',
    formats:      'نوع المشروع',
    otherFormat:  'إذا اخترت "نوع آخر"، وضّح',
    headcount:    'عدد الحضور / المشاركين المتوقع',
    budget:       'الميزانية التقديرية (ريال)',
    duration:     'مدة التنفيذ',
    stakeholders: 'أصحاب المنفعة / الجهات المتوقعة',
    resources:    'الموارد المطلوبة من النادي'
  },

  // الإشارة أ — النوع والحضور
  // baseline: الحجم الافتراضي | largeAbove: يصير كبير فوق هذا الرقم (null = ما يرتفع)
  FORMATS: {
    'ورشة عمل':               { baseline: 'صغير',  largeAbove: null },
    'جلسة حوارية':            { baseline: 'صغير',  largeAbove: null },
    'نشاط بسيط':              { baseline: 'صغير',  largeAbove: null },
    'ميني هاكثون':            { baseline: 'متوسط', largeAbove: null, maxHeadcount: 80 },
    'هاكاثون':                { baseline: 'متوسط', largeAbove: 150 },
    'معسكر تدريبي':           { baseline: 'متوسط', largeAbove: 80 },
    'معرض':                   { baseline: 'متوسط', largeAbove: 400 },
    'مشروع تقني / هاردوير':   { baseline: 'تقني',  largeAbove: null }
  },

  // الإشارة ب — الميزانية بالريال. الحدود حصرية: فوق mediumMax يعني كبير
  BUDGET: {
    smallMax:  15000,   // أقل من هذا = صغير
    mediumMax: 40000    // من smallMax إلى هنا = متوسط، وفوقه = كبير
  },

  // الجهات اللي تفرض تصعيد
  ESCALATING_STAKEHOLDERS: ['جهة حكومية أو وزارة'],

  // روابط الوثائق في درايف
  DOCS: {
    'صغير':  'https://docs.google.com/document/d/رابط-وثيقة-المشاريع-الصغيرة',
    'متوسط': 'https://docs.google.com/document/d/رابط-وثيقة-المشاريع-المتوسطة',
    'كبير':  'https://docs.google.com/document/d/رابط-وثيقة-المشاريع-الكبيرة',
    'تقني':  'https://docs.google.com/document/d/رابط-وثيقة-المشروع-التقني'
  },

  // المحتوى الجاهز اللي كان الفريق يطلبه منك شخصياً.
  // عبّه مرة وحدة هنا وينرسل تلقائياً مع كل وثيقة متوسطة أو كبيرة.
  BOILERPLATE: {
    highlights: 'أبرز أعمالنا: (اكتبها هنا مرة وحدة)',
    partners:   'شركاء النجاح: (اكتبهم هنا مرة وحدة)'
  },

  LOG_SHEET: 'سجل القرارات'
};

// ============================================================
// المحرّك
// ============================================================

function onFormSubmit(e) {
  try {
    const input  = parseResponse(e);
    const result = classify(input);

    // المرحلة ٢: المعرّف يُولَّد هنا لأن الفريق لازم يستلمه في هذا الإيميل
    input.projectId = nextProjectId();

    logDecision(input, result);

    if (result.status === 'auto') {
      emailTeamApproved(input, result);
    } else {
      emailTeamPending(input, result);
      emailOwner(input, result);
    }
  } catch (err) {
    MailApp.sendEmail({
      to: CONFIG.OWNER_EMAIL,
      subject: '[خطأ] مصنّف المشاريع',
      body: err.message + '\n\n' + err.stack
    });
  }
}

function parseResponse(e) {
  const answers = {};
  e.response.getItemResponses().forEach(function (item) {
    answers[item.getItem().getTitle().trim()] = item.getResponse();
  });

  const Q = CONFIG.QUESTIONS;
  const asArray = function (v) {
    if (v === undefined || v === null || v === '') return [];
    return Array.isArray(v) ? v : [v];
  };

  // الفورم يسمح باختيار الكل، فلو اختار الفريق "لا يوجد" مع خيارات حقيقية
  // نتجاهل خيار النفي بدل ما نوقف الطلب
  const dropNullOption = function (arr, nullValue) {
    return arr.length > 1
      ? arr.filter(function (v) { return v !== nullValue; })
      : arr;
  };

  return {
    timestamp:    new Date(),
    email:        e.response.getRespondentEmail(),
    projectName:  answers[Q.projectName]  || '',
    leadName:     answers[Q.leadName]     || '',
    leadPhone:    answers[Q.leadPhone]    || '',
    deputyName:   answers[Q.deputyName]   || '',
    deputyPhone:  answers[Q.deputyPhone]  || '',
    formats:      asArray(answers[Q.formats]),
    otherFormat:  answers[Q.otherFormat]  || '',
    headcount:    parseInt(answers[Q.headcount], 10),
    budget:       parseFloat(answers[Q.budget]),
    duration:     answers[Q.duration]     || '',
    stakeholders: dropNullOption(asArray(answers[Q.stakeholders]), 'لا يوجد'),
    resources:    dropNullOption(asArray(answers[Q.resources]),    'لا شيء')
  };
}

/** الإشارة ب — الميزانية */
function budgetTier(budget) {
  if (budget < CONFIG.BUDGET.smallMax)  return 'صغير';
  if (budget <= CONFIG.BUDGET.mediumMax) return 'متوسط';
  return 'كبير';
}

/** الإشارة أ — النوع مرفوعاً بالحضور */
function formatTier(formatName, headcount) {
  const spec = CONFIG.FORMATS[formatName];
  if (!spec) return null;
  if (spec.largeAbove !== null && headcount > spec.largeAbove) return 'كبير';
  return spec.baseline;
}

function classify(input) {
  const reasons = [];
  let escalate  = false;

  // --- تصعيد إجباري ---

  if (input.formats.length === 0) {
    return { status: 'escalate', size: null,
             reasons: ['ما تم اختيار نوع مشروع.'], signalA: null, signalB: null };
  }

  if (input.formats.length > 1) {
    escalate = true;
    reasons.push('المشروع يجمع أكثر من نوع: ' + input.formats.join(' + ') + '.');
  }

  if (input.formats.indexOf('نوع آخر') !== -1) {
    escalate = true;
    reasons.push('نوع غير مدرج في القائمة: "' + input.otherFormat + '".');
  }

  if (isNaN(input.headcount) || isNaN(input.budget)) {
    return { status: 'escalate', size: null,
             reasons: ['رقم الحضور أو الميزانية غير صالح.'], signalA: null, signalB: null };
  }

  const govMatch = input.stakeholders.filter(function (s) {
    return CONFIG.ESCALATING_STAKEHOLDERS.indexOf(s) !== -1;
  });
  if (govMatch.length > 0) {
    escalate = true;
    reasons.push('أصحاب منفعة يستدعون قرارك: ' + govMatch.join('، ') + '.');
  }

  // --- الإشارتان ---

  const primary = input.formats[0];
  const spec    = CONFIG.FORMATS[primary];

  if (spec && spec.maxHeadcount && input.headcount > spec.maxHeadcount) {
    escalate = true;
    reasons.push('"' + primary + '" معرّف بـ' + spec.maxHeadcount +
                 ' شخص فأقل، والعدد المدخل ' + input.headcount + '.');
  }

  const signalA = formatTier(primary, input.headcount);
  const signalB = budgetTier(input.budget);

  // المشروع التقني وثيقة مستقلة وما يخضع لمقياس الحجم
  if (signalA === 'تقني') {
    return {
      status:  escalate ? 'escalate' : 'auto',
      size:    'تقني',
      reasons: reasons,
      signalA: 'وثيقة مشروع تقني',
      signalB: signalB
    };
  }

  if (signalA === null) {
    escalate = true;
    reasons.push('نوع غير معرّف في المصنّف: "' + primary + '".');
  } else if (signalA !== signalB) {
    escalate = true;
    reasons.push('تعارض: النوع والحضور يقولان "' + signalA +
                 '"، والميزانية (' + input.budget.toLocaleString('en-US') +
                 ' ريال) تقول "' + signalB + '".');
  }

  // تنبيه غير مُصعِّد
  if (input.duration === 'يوم واحد أو أقل' && (signalA === 'كبير' || signalB === 'كبير')) {
    reasons.push('تنبيه: مدة يوم واحد مع مؤشرات مشروع كبير.');
  }

  return {
    status:  escalate ? 'escalate' : 'auto',
    size:    escalate ? (signalA || signalB) : signalA,
    reasons: reasons,
    signalA: signalA,
    signalB: signalB
  };
}

// ============================================================
// الرسائل
// ============================================================

function wrap(html) {
  return '<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7">' +
         html + '</div>';
}

/** المعرّف اللي يكتبه الفريق في فورم الخطة الزمنية بالمرحلة ٢ */
function projectIdBlock(projectId) {
  if (!projectId) return '';
  return '<p style="background:#f4f4f4;padding:10px;border-radius:6px">' +
         'معرّف المشروع: <b style="font-size:16px">' + projectId + '</b><br>' +
         '<span style="font-size:13px">احتفظوا فيه. بتحتاجونه في كل خطوة جاية.</span></p>';
}

function emailTeamApproved(input, result) {
  const size = result.size;
  let body = '<p>هلا ' + input.leadName + '،</p>' +
    '<p>استلمنا مشروع <b>' + input.projectName + '</b>، وتصنيفه: <b>' + size + '</b>.</p>' +
    '<p>الوثيقة المناسبة لكم: <a href="' + CONFIG.DOCS[size] + '">اضغط هنا</a></p>' +
    projectIdBlock(input.projectId);

  if (size === 'متوسط' || size === 'كبير') {
    body += '<hr><p><b>محتوى النادي الجاهز</b> (انسخوه في المقترح، ما تحتاجون تطلبونه من أحد):</p>' +
            '<p>' + CONFIG.BOILERPLATE.highlights + '</p>' +
            '<p>' + CONFIG.BOILERPLATE.partners   + '</p>';
  }

  body += '<hr><p>أي استفسار، اللجنة معكم. بالتوفيق.</p><p>' + CONFIG.COMMITTEE_NAME + '</p>';

  MailApp.sendEmail({
    to: input.email, subject: 'تصنيف مشروع: ' + input.projectName,
    htmlBody: wrap(body)
  });
}

/**
 * التحليل المبدئي — بدون ذكر حجم مقترح عن قصد.
 * إعطاء الفريق حجم غير معتمد يخليهم يبدون على الوثيقة الغلط.
 */
function emailTeamPending(input, result) {
  const body = '<p>هلا ' + input.leadName + '،</p>' +
    '<p>استلمنا مشروع <b>' + input.projectName + '</b>.</p>' +
    '<p><b>اللي وصلنا منكم:</b></p><ul>' +
      '<li>النوع: ' + input.formats.join('، ') + '</li>' +
      '<li>الحضور المتوقع: ' + input.headcount + '</li>' +
      '<li>الميزانية التقديرية: ' + input.budget.toLocaleString('en-US') + ' ريال</li>' +
      '<li>المدة: ' + input.duration + '</li>' +
      '<li>أصحاب المنفعة: ' + input.stakeholders.join('، ') + '</li>' +
    '</ul>' +
    '<p><b>ليش محتاج مراجعة:</b></p><ul>' +
      result.reasons.map(function (r) { return '<li>' + r + '</li>'; }).join('') +
    '</ul>' +
    projectIdBlock(input.projectId) +
    '<p><b>ما تم اعتماد حجم للمشروع بعد، ولا تبدون على أي وثيقة قبل ما يوصلكم الاعتماد.</b> ' +
    'قائد اللجنة راح يفصل في الحالة ويرد عليكم.</p>' +
    '<p>' + CONFIG.COMMITTEE_NAME + '</p>';

  MailApp.sendEmail({
    to: input.email, subject: 'استلام مشروع: ' + input.projectName + ' — قيد المراجعة',
    htmlBody: wrap(body)
  });
}

function emailOwner(input, result) {
  const body = '<p><b>' + input.projectName + '</b> يحتاج قرارك.</p>' +
    '<p>الحجم المقترح: <b>' + (result.size || 'غير محدد') + '</b></p>' +
    '<p>الإشارات: النوع والحضور ← <b>' + (result.signalA || 'غير محدد') + '</b> ' +
    'والميزانية ← <b>' + (result.signalB || 'غير محدد') + '</b></p>' +
    '<p><b>سبب التصعيد:</b></p><ul>' +
      result.reasons.map(function (r) { return '<li>' + r + '</li>'; }).join('') +
    '</ul>' +
    '<p>القائد: ' + input.leadName + ' (' + input.leadPhone + ')</p>' +
    (input.deputyPhone
      ? '<p>النائب: ' + (input.deputyName || 'بدون اسم') + ' (' + input.deputyPhone + ')</p>'
      : '<p>ما في نائب مسجّل.</p>') +
    '<p>افتح سجل القرارات، عبّي عمود "الحجم المعتمد" وأرسل الوثيقة.</p>';

  MailApp.sendEmail({
    to: CONFIG.OWNER_EMAIL,
    subject: '[قرار مطلوب] ' + input.projectName,
    htmlBody: wrap(body)
  });
}

// ============================================================
// سجل القرارات — هذي هي البيانات اللي تضبط العتبات بعد ترم
// ============================================================

function logDecision(input, result) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.LOG_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.LOG_SHEET);
    sheet.appendRow([
      'التاريخ', 'المشروع', 'القائد', 'النوع', 'الحضور', 'الميزانية',
      'المدة', 'أصحاب المنفعة', 'إشارة النوع', 'إشارة الميزانية',
      'الحالة', 'الحجم المقترح', 'الحجم المعتمد', 'سبب التصعيد',
      'معرّف المشروع', 'إيميل الفريق'
    ]);
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    input.timestamp, input.projectName, input.leadName,
    input.formats.join(' + '), input.headcount, input.budget,
    input.duration, input.stakeholders.join('، '),
    result.signalA || '', result.signalB || '',
    result.status === 'auto' ? 'تلقائي' : 'مُصعَّد',
    result.size || '',
    result.status === 'auto' ? result.size : '',  // عبّيه بنفسك عند التصعيد
    result.reasons.join(' | '),
    input.projectId || '', input.email || ''
  ]);
}

// ============================================================
// التركيب
// ============================================================

function setupTrigger() {
  const form = FormApp.openByUrl(
    SpreadsheetApp.getActiveSpreadsheet().getFormUrl()
  );
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onFormSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create();
  Logger.log('تم ربط التريقر.');
}

/** تشغيل تجريبي بدون فورم — عدّل القيم واضغط Run */
function testClassify() {
  const cases = [
    { formats: ['معسكر تدريبي'], headcount: 100, budget: 25000, duration: '٤ إلى ٧ أيام', stakeholders: ['شركات'] },
    { formats: ['ورشة عمل'],     headcount: 40,  budget: 3000,  duration: 'يوم واحد أو أقل', stakeholders: ['رعاية ضيافة أو دعم بسيط'] },
    { formats: ['هاكاثون'],      headcount: 200, budget: 60000, duration: '٢ إلى ٣ أيام', stakeholders: ['شركات', 'جهة حكومية أو وزارة'] },
    { formats: ['ميني هاكثون'], headcount: 95, budget: 20000, duration: '٢ إلى ٣ أيام', stakeholders: ['شركات'] }
  ];
  cases.forEach(function (c) {
    c.otherFormat = '';
    const r = classify(c);
    Logger.log(c.formats.join('+') + ' | ' + c.headcount + ' | ' + c.budget +
               '  ←  ' + r.status + ' / ' + r.size + '  ' + r.reasons.join(' | '));
  });
}
