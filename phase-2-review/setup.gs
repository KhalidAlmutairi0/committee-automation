/**
 * المرحلة ٢ — التركيب
 *
 * الترتيب:
 *   1. الصق ملفات phase-2-review كلها في نفس مشروع أبس سكربت اللي فيه classifier.gs
 *   2. عدّل CONFIG_2 في config.gs
 *   3. حدّث الصفحة، وبتطلع قائمة "المرحلة ٢" فوق
 *   4. من القائمة: "فحص الإعدادات" ثم "إنشاء فورم الخطة الزمنية"
 */

const TIMELINE_FORMS_PROPERTY_ = 'TIMELINE_2A_FORMS';

function timelineFormRecords_() {
  const raw = PropertiesService.getScriptProperties().getProperty(TIMELINE_FORMS_PROPERTY_);
  if (!raw) return [];
  try {
    const records = JSON.parse(raw);
    return Array.isArray(records) ? records : [];
  } catch (err) {
    throw new Error('سجل فورمات ٢أ في Script Properties تالف: ' + err.message);
  }
}

function rememberTimelineForms_(forms) {
  const byId = {};
  timelineFormRecords_().forEach(function (record) {
    if (record && record.id) byId[record.id] = record;
  });
  forms.forEach(function (form) {
    byId[form.getId()] = { id: form.getId(), url: form.getPublishedUrl() };
  });
  PropertiesService.getScriptProperties().setProperty(
    TIMELINE_FORMS_PROPERTY_, JSON.stringify(Object.keys(byId).map(function (id) { return byId[id]; })));
}

function knownTimelineForms_() {
  const forms = [], seen = {};
  const add = function (form) {
    const id = form.getId();
    if (!seen[id]) { seen[id] = true; forms.push(form); }
  };

  timelineFormRecords_().forEach(function (record) {
    try { add(FormApp.openById(record.id)); }
    catch (err) { throw new Error('ما قدرنا نفتح فورم ٢أ المسجّل ' + record.id + ': ' + err.message); }
  });

  // يلتقط الفورمات المنشأة قبل إضافة السجل حتى لو لم يُحدّث CONFIG_2 بعد.
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() !== 'onTimelineSubmit' || !trigger.getTriggerSourceId) return;
    const id = trigger.getTriggerSourceId();
    if (!id) return;
    try { add(FormApp.openById(id)); }
    catch (err) { throw new Error('ما قدرنا نفتح فورم ٢أ المرتبط بالتريقر ' + id + ': ' + err.message); }
  });

  if (CONFIG_2.TIMELINE_FORM_URL) {
    try { add(FormApp.openByUrl(CONFIG_2.TIMELINE_FORM_URL)); }
    catch (err) {
      throw new Error('ما قدرنا نفتح CONFIG_2.TIMELINE_FORM_URL: ' + err.message);
    }
  }
  return forms;
}

function timelineSubmitTriggers_() {
  return ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === 'onTimelineSubmit';
  });
}

function timelineFormHasTrigger_(form, triggers) {
  const id = form.getId();
  return triggers.some(function (trigger) {
    return trigger.getTriggerSourceId && trigger.getTriggerSourceId() === id;
  });
}

function responseProjectId_(response) {
  let projectId = '';
  response.getItemResponses().forEach(function (item) {
    if (item.getItem().getTitle().trim() === CONFIG_2.FORM_2A.projectId) {
      projectId = String(item.getResponse() || '').trim().toUpperCase();
    }
  });
  return projectId;
}

/** ردود الفورم التي لا يقابلها صف خطة، مع توافق للصفوف القديمة بلا responseId. */
function unprocessedTimelineResponses_(form) {
  const sheet = timelinePlansSheet();
  const rows = sheet.getLastRow() < 2 ? [] :
    sheet.getRange(2, 1, sheet.getLastRow() - 1, planWidth_()).getValues();
  const usedRows = {};
  const responses = form.getResponses();
  const unmatched = [];

  responses.forEach(function (response) {
    const responseId = response.getId ? String(response.getId() || '') : '';
    const exact = rows.findIndex(function (row, index) {
      return !usedRows[index] && responseId &&
        String(row[planCol('responseId') - 1] || '') === responseId;
    });
    if (exact !== -1) { usedRows[exact] = true; return; }

    // صفوف ما قبل إضافة responseId: نطابقها مرة واحدة بالمعرّف والإيميل.
    const projectId = responseProjectId_(response);
    const email = response.getRespondentEmail ? String(response.getRespondentEmail() || '').trim() : '';
    const legacy = rows.findIndex(function (row, index) {
      if (usedRows[index] || row[planCol('responseId') - 1]) return false;
      if (String(row[planCol('projectId') - 1] || '').trim().toUpperCase() !== projectId) return false;
      const rowEmail = String(row[planCol('email') - 1] || '').trim();
      return !email || !rowEmail || rowEmail === email;
    });
    if (legacy !== -1) { usedRows[legacy] = true; return; }

    const timestamp = response.getTimestamp ? response.getTimestamp() : '';
    unmatched.push({ id: responseId || '(بلا معرّف)', projectId: projectId || '(بلا مشروع)',
                     email: email || '(بلا إيميل)', timestamp: timestamp });
  });
  return unmatched;
}

function assertTimelineFormsHealthy_() {
  const forms = knownTimelineForms_();
  const triggers = timelineSubmitTriggers_();
  const healthyUrl = forms.filter(function (form) {
    return form.isAcceptingResponses() && timelineFormHasTrigger_(form, triggers);
  }).map(function (form) { return form.getPublishedUrl(); })[0] || '';
  const orphaned = forms.filter(function (form) {
    return form.isAcceptingResponses() && !timelineFormHasTrigger_(form, triggers);
  });
  if (!orphaned.length) return true;

  orphaned.forEach(function (form) {
    form.setCustomClosedFormMessage(
      healthyUrl ? 'هذا النموذج مغلق. استخدم نموذج الخطة الزمنية الجديد: ' + healthyUrl
                 : 'هذا النموذج مغلق لأن ربط الإرسال غير مفعّل. تواصل مع لجنة إدارة المشاريع.');
    form.setAcceptingResponses(false);
  });
  const message = 'خطر: أُغلق فورم ٢أ كان يقبل الردود بلا تريقر إرسال:\n' +
    orphaned.map(function (form) { return '• ' + form.getPublishedUrl(); }).join('\n');
  Logger.log(message);
  try {
    SpreadsheetApp.getUi().alert('خطأ حرج في فورم المرحلة ٢أ', message,
                                 SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (ignored) {}
  throw new Error(message);
}

function onOpen() {
  assertTimelineFormsHealthy_();
  SpreadsheetApp.getUi()
    .createMenu('المرحلة ٢')
    .addItem('فحص الإعدادات',              'checkConfig')
    .addItem('إنشاء فورم الخطة الزمنية',   'createTimelineForm')
    .addItem('إنشاء فورم رفع البربوزل',    'createProposalForm')
    .addSeparator()
    .addItem('تعبئة معرّفات المشاريع القديمة', 'backfillProjectIds')
    .addItem('تشغيل اختبارات الفحوصات',    'runTimelineTests')
    .addItem('تمرير مشروع سابق حقيقي',      'dryRunPastProject')
    .addSeparator()
    .addItem('قيّم آخر بربوزل مستلم',        'scoreLatestProposal')
    .addItem('تهيئة شاشة مراجعة البربوزل',   'prepareScoringReview')
    .addToUi();
}

/**
 * ينشئ فورم الخطة الزمنية من CONFIG_2.FORM_2A.
 * السبب: نص السؤال لازم يطابق الإعدادات حرفياً، والتوليد يمنع
 * أشهر خطأ تركيب — حرف زايد في عنوان سؤال.
 */
function buildTimelineForm_() {
  const F  = CONFIG_2.FORM_2A;

  const form = FormApp.create('الخطة الزمنية — ' + CONFIG_2.COMMITTEE_NAME);
  // يبقى مقفلاً حتى يثبت التريقر؛ أي فشل أثناء البناء لا يترك فورماً صامتاً.
  form.setAcceptingResponses(false);
  form.setDescription(
    'ارفعوا تواريخ المشروع فقط. البربوزل يجي بعد اعتماد الخطة.\n' +
    'معرّف المشروع وصلكم في إيميل استلام المشروع.');
  form.setCollectEmail(true);
  form.setAllowResponseEdits(false);

  form.addTextItem()
      .setTitle(F.projectId)
      .setHelpText('مثال: FTC-26-007')
      .setRequired(true);

  form.addSectionHeaderItem()
      .setTitle('التواريخ الميلادية')
      .setHelpText('عبّوا المعالم اللي تنطبق على مشروعكم. ' +
                   'النظام يتحقق من إلزامية كل معلم حسب حجم مشروعكم المعتمد.');

  CONFIG_2.MILESTONES.forEach(function (m) {
    form.addDateItem().setTitle(F.dates[m.key]).setRequired(false);
  });

  form.addSectionHeaderItem()
      .setTitle('التواريخ الهجرية (اختيارية)')
      .setHelpText('لو وثيقتكم فيها تواريخ هجرية، اكتبوها هنا بصيغة 1447/09/15 ' +
                   'ليتأكد النظام أنها تطابق الميلادي.');

  CONFIG_2.HIJRI_FIELDS.forEach(function (k) {
    form.addTextItem().setTitle(F.hijri[k]).setRequired(false);
  });

  form.addSectionHeaderItem()
      .setTitle('الأنشطة التمهيدية (اختيارية)')
      .setHelpText('ورشة أو جلسة أو تدريب قبل الفعالية. ' +
                   'نشاط قبل إعلان المقبولين يعني تدريب ناس ما نعرف إن كانوا مقبولين، ' +
                   'إلا إذا كان مفتوحاً للجميع.');

  form.addParagraphTextItem()
      .setTitle(F.prepActivities)
      .setHelpText('اكتبوا أي عدد من الأنشطة، نشاطاً واحداً في كل سطر، هكذا: ' +
                   'العنوان | YYYY-MM-DD | نعم أو لا. ' +
                   '«نعم» تعني مفتوح للجميع بدون قبول. مثال: ' +
                   'جلسة تعريفية | 2026-07-31 | نعم')
      .setRequired(false);

  form.addParagraphTextItem().setTitle(F.notes).setRequired(false);

  form.setDestination(FormApp.DestinationType.SPREADSHEET,
                      SpreadsheetApp.getActiveSpreadsheet().getId());

  return form;
}

function createTimelineForm() {
  const ui = SpreadsheetApp.getUi();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let form = null;
  const closedOld = [];
  let handoffComplete = false;
  try {
    assertTimelineFormsHealthy_();
    const oldForms = knownTimelineForms_().filter(function (old) {
      return old.isAcceptingResponses();
    });
    const pending = [];
    oldForms.forEach(function (old) {
      unprocessedTimelineResponses_(old).forEach(function (response) {
        pending.push(response);
      });
    });
    if (pending.length) {
      throw new Error('رفضنا استبدال فورم ٢أ: فيه ردود ما لها صف خطة:\n' +
        pending.map(function (response) {
          return '• ' + response.projectId + ' — ' + response.email +
                 ' — ' + response.timestamp + ' — responseId=' + response.id;
        }).join('\n'));
    }

    form = buildTimelineForm_();
    ScriptApp.newTrigger('onTimelineSubmit').forForm(form).onFormSubmit().create();
    if (!timelineFormHasTrigger_(form, timelineSubmitTriggers_())) {
      throw new Error('تعذر تثبيت تريقر الإرسال على فورم ٢أ الجديد. بقي الفورم مقفلاً.');
    }

    installLeadDecisionValidation();
    installLeadEditTrigger();
    rememberTimelineForms_(oldForms.concat([form]));

    const newUrl = form.getPublishedUrl();
    form.setAcceptingResponses(true);
    oldForms.forEach(function (old) {
      old.setCustomClosedFormMessage(
        'هذا النموذج أُغلق بعد تحديثه. استخدم نموذج الخطة الزمنية الجديد: ' + newUrl);
      old.setAcceptingResponses(false);
      closedOld.push(old);
    });

    const oldIds = {};
    oldForms.forEach(function (old) { oldIds[old.getId()] = true; });
    timelineSubmitTriggers_().forEach(function (trigger) {
      if (trigger.getTriggerSourceId && oldIds[trigger.getTriggerSourceId()]) {
        try { ScriptApp.deleteTrigger(trigger); }
        catch (err) { Logger.log('تعذر حذف تريقر فورم مغلق ' + trigger.getTriggerSourceId() + ': ' + err.message); }
      }
    });
    handoffComplete = true;

    ui.alert(
    'تم إنشاء فورم جديد وإغلاق الفورم القديم.\n\n' +
    'رابط التعبئة الجديد:\n' + newUrl + '\n\n' +
    'رابط التحرير:\n' + form.getEditUrl() + '\n\n' +
    'حدّث CONFIG_2.TIMELINE_FORM_URL يدوياً، وحدّث الرابط الموزع على الفرق. ' +
    'الرسائل الموجودة مسبقاً في صناديق البريد لا يمكن للنظام تعديلها.');
  } catch (err) {
    if (form && !handoffComplete) {
      form.setCustomClosedFormMessage('هذا النموذج غير مفعّل بسبب خطأ في التهيئة.');
      form.setAcceptingResponses(false);
    }
    // لو فشل الانتقال بعد إغلاق القديم، نرجعه مع تريقره الذي لم يُحذف بعد.
    if (!handoffComplete) {
      closedOld.forEach(function (old) { old.setAcceptingResponses(true); });
    }
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/**
 * فورم رفع البربوزل. مثل فورم ٢أ، يُولَّد من الإعدادات ليطابق
 * CONFIG_2.FORM_2B حرفاً بحرف.
 *
 * ما فيه سؤال رفع ملف عن قصد: رفع الملفات يقبل PDF، وما نحلّل PDF.
 * الطلب رابط Google Doc أو نص ملصوق، والرفض يجي برسالة واضحة.
 */
function createProposalForm() {
  const ui = SpreadsheetApp.getUi();
  const F  = CONFIG_2.FORM_2B;

  const form = FormApp.create('رفع البربوزل — ' + CONFIG_2.COMMITTEE_NAME);
  form.setDescription(
    'هذا الفورم يفتح بعد اعتماد الخطة الزمنية فقط.\n' +
    'معرّف المشروع ورمز الرفع وصلاكم في إيميل اعتماد الخطة.');
  form.setCollectEmail(true);
  form.setAllowResponseEdits(false);

  form.addTextItem().setTitle(F.projectId)
      .setHelpText('مثال: FTC-26-007').setRequired(true);

  form.addTextItem().setTitle(F.token)
      .setHelpText('وصلكم في إيميل اعتماد الخطة الزمنية').setRequired(true);

  form.addSectionHeaderItem()
      .setTitle('البربوزل')
      .setHelpText('أرسلوا رابط Google Doc، أو الصقوا النص. ' +
                   'ما نستقبل PDF — افتحوه في قوقل دوكس وشاركوا الرابط.');

  form.addTextItem().setTitle(F.docUrl)
      .setHelpText('شاركوا الوثيقة بصلاحية "يمكن للجميع ممن لديه الرابط الاطّلاع"')
      .setRequired(false);

  form.addParagraphTextItem().setTitle(F.pastedText).setRequired(false);
  form.addParagraphTextItem().setTitle(F.notes).setRequired(false);

  form.setDestination(FormApp.DestinationType.SPREADSHEET,
                      SpreadsheetApp.getActiveSpreadsheet().getId());

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onProposalSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onProposalSubmit').forForm(form).onFormSubmit().create();

  installScoringReviewValidation();
  installScoringReviewTrigger();

  ui.alert(
    'تم إنشاء فورم البربوزل.\n\n' +
    'رابط التعبئة:\n' + form.getPublishedUrl() + '\n\n' +
    'لا توزّعه على الفرق. النظام يرسله لكل فريق مع رمز الرفع ' +
    'لحظة اعتماد خطته الزمنية.');
}

/**
 * يجهّز شيتَي مراجعة البربوزل:
 * - القائد يعدّل مستوى المعيار في "سجل المعايير".
 * - ثم يختار القرار النهائي في "البروبوزلات"، وهذا الاختيار يرسل للفريق.
 */
function installScoringReviewValidation() {
  const criteria = criterionLogSheet();
  const proposals = proposalsSheet();

  const levelRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(SCORING_LEVELS, true)
    .setAllowInvalid(false)
    .setHelpText('اتركه فارغاً لاعتماد نتيجة المودل، أو اختر مستوى القائد.')
    .build();
  criteria.getRange(2, 12, Math.max(criteria.getMaxRows() - 1, 1), 1)
          .setDataValidation(levelRule);

  const decisionRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      RUBRIC.decisions.APPROVED,
      RUBRIC.decisions.CONDITIONAL,
      RUBRIC.decisions.RESUBMIT
    ], true)
    .setAllowInvalid(false)
    .setHelpText('اختيار القرار يعتمد التقييم ويرسله للفريق فوراً.')
    .build();
  proposals.getRange(2, proposalCol('lead'), Math.max(proposals.getMaxRows() - 1, 1), 1)
           .setDataValidation(decisionRule);
}

function installScoringReviewTrigger() {
  const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'onScoringReviewEdit') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('onScoringReviewEdit').forSpreadsheet(ssId).onEdit().create();
}

function prepareScoringReview() {
  installScoringReviewValidation();
  installScoringReviewTrigger();
  SpreadsheetApp.getUi().alert(
    'تم تجهيز شاشة مراجعة البربوزل.\n\n' +
    'عدّل "نتيجة القائد" في سجل المعايير، ثم اكتب سبب الاختلاف إن وجد، ' +
    'واختر "قرار القائد" في شيت البروبوزلات للإرسال للفريق.');
}

/** قائمة منسدلة في عمود "قرار القائد" — تمنع الأخطاء المطبعية */
function installLeadDecisionValidation() {
  const sheet = timelinePlansSheet();
  const rule  = SpreadsheetApp.newDataValidation()
    .requireValueInList(TIMELINE_DECISIONS, true)
    .setAllowInvalid(false)
    .setHelpText('اختر قراراً. تعبئته ترسل الرد للفريق فوراً.')
    .build();
  sheet.getRange(2, planCol('lead'), Math.max(sheet.getMaxRows() - 1, 1), 1)
       .setDataValidation(rule);
}

function installLeadEditTrigger() {
  const ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onTimelineLeadEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onTimelineLeadEdit').forSpreadsheet(ssId).onEdit().create();
}

/**
 * يطبع كل شي ناقص قبل التشغيل الحقيقي.
 * ما يوقف شي — يقول لك بالضبط وش معطّل وليش.
 */
function checkConfig() {
  const blockers = [], warnings = [], ok = [];

  if (CONFIG_2.LEAD_EMAIL.indexOf('@') === -1 || CONFIG_2.LEAD_EMAIL.indexOf('هنا') !== -1) {
    blockers.push('CONFIG_2.LEAD_EMAIL ما انعبّى.');
  } else {
    ok.push('إيميل القائد: ' + CONFIG_2.LEAD_EMAIL);
  }

  const anthropicKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!anthropicKey) {
    blockers.push('ANTHROPIC_API_KEY غير معرّف في Script Properties؛ تقييم البربوزل ما يشتغل.');
  } else {
    ok.push('مفتاح Anthropic موجود في Script Properties.');
  }

  const gapKeys  = Object.keys(CONFIG_2.MIN_GAPS);
  const gapsNull = gapKeys.filter(function (k) { return CONFIG_2.MIN_GAPS[k].value === null; });
  if (gapsNull.length === gapKeys.length) {
    warnings.push('T3 معطّل بالكامل — كل عتبات MIN_GAPS فاضية. ' +
                  'ما دام معطّلاً، ما فيه خطة تاخذ "معتمد"، أقصاها "معتمد بتنبيهات". ' +
                  'عبّيها من بربوزل فنتك (القرار رقم ٣).');
  } else if (gapsNull.length) {
    warnings.push('T3 معطّل جزئياً — ' + gapsNull.length + ' من ' + gapKeys.length +
                  ' مسافات بلا عتبة: ' + gapsNull.join('، '));
  } else {
    ok.push('T3 مفعّل بالكامل.');
  }

  if (CONFIG_2.T5_MARGIN_DAYS === null) {
    warnings.push('T5 معطّل — T5_MARGIN_DAYS فاضي. تنبيه فقط، مو حاجب.');
  } else {
    ok.push('T5 مفعّل: ' + CONFIG_2.T5_MARGIN_DAYS + ' يوم.');
  }

  if (!CONFIG_2.ACADEMIC_CALENDAR.length) {
    warnings.push('T4 معطّل — ACADEMIC_CALENDAR فاضي. ' +
                  'فحص التقاطع مع مشاريع النادي المعتمدة يشتغل، والتقويم الجامعي لا.');
  } else {
    ok.push('T4 مفعّل: ' + CONFIG_2.ACADEMIC_CALENDAR.length + ' فترة.');
  }

  const figures = loadCentralFigures();
  if (!figures.available) {
    warnings.push('⚠️ المعيار السادس في المرحلة ٢ب راح ينعطّل: ' + figures.reason +
                  ' باقي المعايير تشتغل عادي، وما راح نخمن أرقاماً.');
  } else {
    ok.push('ورقة الأرقام المركزية جاهزة: ' + figures.rows.length + ' صف معتمد.');
  }

  const intake = intakeSheet_(false);
  if (!intake) {
    warnings.push('ما فيه شيت "' + CONFIG_2.SHEETS.INTAKE_LOG + '" بعد. ' +
                  'المرحلة ١ تنشئه عند أول تسليم.');
  } else {
    ok.push('سجل المرحلة ١ موجود.');
  }

  let msg = '';
  if (blockers.length) msg += '⛔ يوقف التشغيل:\n' + blockers.map(function (b) { return '  • ' + b; }).join('\n') + '\n\n';
  if (warnings.length) msg += '⚠️ معطّل أو ناقص:\n' + warnings.map(function (w) { return '  • ' + w; }).join('\n') + '\n\n';
  if (ok.length)       msg += '✓ جاهز:\n' + ok.map(function (o) { return '  • ' + o; }).join('\n');

  Logger.log(msg);
  SpreadsheetApp.getUi().alert('فحص إعدادات المرحلة ٢', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  return msg;
}
