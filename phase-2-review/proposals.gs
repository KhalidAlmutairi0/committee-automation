/**
 * المرحلة ٢ب — الخطوة ٥: تخزين البربوزل
 *
 * هذا الملف يستلم ويخزّن فقط. **ما فيه تقييم هنا، ولا سطر واحد يرسل
 * تقييماً لأحد.** الفريق يستلم إشعار استلام مجرّد، والقائد يستلم إشعاراً
 * أن بربوزلاً وصل. التقييم والمراجعة والإرسال في ملفات مستقلة.
 *
 * ما نحلّل PDF. البربوزل يجي Google Doc أو نصاً ملصوقاً، وغير ذلك يُرفض
 * برسالة واضحة.
 */

const PROPOSAL_STATE = {
  RECEIVED: 'مستلم',          // انحفظ، ما انقيّم
  SCORED:   'مُقيَّم',          // الخطوة ٦
  APPROVED: 'معتمد من القائد', // الخطوة ٧
  SENDING:  'قيد الإرسال',     // حالة غير قابلة لإعادة الإرسال التلقائي
  SENT:     'أُرسل للفريق',     // الخطوة ٨
  SEND_FAILED: 'فشل الإرسال'    // يتطلب مراجعة يدوية؛ ما نعيد تلقائياً كي لا نكرر البريد
};

const PROPOSAL_SOURCE = { DOC: 'Google Doc', TEXT: 'نص ملصوق' };

function proposalFields_() {
  return [
    { key: 'reviewId',    label: 'معرّف المراجعة' },
    { key: 'projectId',   label: 'معرّف المشروع'  },
    { key: 'name',        label: 'اسم المشروع'    },
    { key: 'email',       label: 'إيميل المُرسِل'  },
    { key: 'submitted',   label: 'تاريخ الرفع'    },
    { key: 'size',        label: 'الحجم'          },
    { key: 'source',      label: 'المصدر'         },
    { key: 'docUrl',      label: 'رابط الوثيقة'   },
    { key: 'textFileId',  label: 'ملف النص المستخرج' },
    { key: 'charCount',   label: 'عدد الحروف'     },
    { key: 'notes',       label: 'ملاحظات الفريق' },
    { key: 'state',       label: 'الحالة'         },
    { key: 'score',       label: 'الدرجة'         },
    { key: 'computed',    label: 'القرار المحسوب' },
    { key: 'lead',        label: 'قرار القائد'    },
    { key: 'leadReason',  label: 'سبب قرار القائد' }
  ];
}

function proposalsSheet() {
  return sheetWithHeaders_(CONFIG_2.SHEETS.PROPOSALS,
    proposalFields_().map(function (f) { return f.label; }));
}

function proposalCol(key) {
  const f = proposalFields_();
  for (let i = 0; i < f.length; i++) if (f[i].key === key) return i + 1;
  throw new Error('عمود غير معرّف في البروبوزلات: ' + key);
}

function proposalWidth_() { return proposalFields_().length; }

// ============================================================
// استخراج النص
// ============================================================

/**
 * يسحب معرّف الوثيقة من رابط قوقل دوكس.
 *
 * ما نفرض طولاً أدنى: صيغة معرّفات قوقل مو مضمونة، وفرض طول يضيف
 * حالة رفض كاذب بلا فائدة. المُتحقق الحقيقي هو DocumentApp.openById،
 * وفشله عنده رسالة صلاحيات واضحة.
 */
function extractDocId(url) {
  const m = String(url || '').match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * يرجّع { ok, text, docId, error }.
 * ما يرمي استثناءً — كل فشل يرجع كرسالة عربية صالحة للإرسال للفريق.
 */
function extractProposalText(docUrl, pastedText) {
  const pasted = String(pastedText || '').trim();
  const url    = String(docUrl || '').trim();

  if (!url && !pasted) {
    return { ok: false, error:
      'ما وصلنا لا رابط وثيقة ولا نص. أرفقوا رابط Google Doc أو الصقوا النص.' };
  }

  if (url) {
    if (url.indexOf('docs.google.com/document') === -1) {
      if (url.toLowerCase().indexOf('.pdf') !== -1 ||
          url.indexOf('drive.google.com') !== -1) {
        return { ok: false, error:
          'الرابط مو Google Doc. ما نستقبل PDF ولا ملفات درايف الثانية. ' +
          'افتحوا الملف في قوقل دوكس (ملف ← حفظ كمستند Google) وأرسلوا رابطه.' };
      }
      return { ok: false, error:
        'الرابط مو رابط Google Doc. المتوقع يبدأ بـ docs.google.com/document.' };
    }

    const docId = extractDocId(url);
    if (!docId) {
      return { ok: false, error: 'ما قدرنا نقرأ معرّف الوثيقة من الرابط. انسخوا الرابط كاملاً من شريط المتصفح.' };
    }

    let text;
    try {
      text = DocumentApp.openById(docId).getBody().getText();
    } catch (err) {
      return { ok: false, error:
        'ما قدرنا نفتح الوثيقة. غالباً الصلاحيات: شاركوها مع اللجنة بصلاحية ' +
        '"يمكن للجميع ممن لديه الرابط الاطّلاع" ثم أعيدوا الرفع.' };
    }

    if (String(text || '').trim().length < CONFIG_2.PROPOSAL_MIN_CHARS) {
      return { ok: false, error:
        'الوثيقة شبه فاضية (' + String(text || '').trim().length + ' حرف). ' +
        'تأكدوا أنكم أرسلتم رابط البربوزل الصحيح.' };
    }

    return { ok: true, text: text, docId: docId, source: PROPOSAL_SOURCE.DOC };
  }

  if (pasted.length < CONFIG_2.PROPOSAL_MIN_CHARS) {
    return { ok: false, error:
      'النص الملصوق قصير جداً (' + pasted.length + ' حرف). ' +
      'الصقوا البربوزل كاملاً أو أرسلوا رابط Google Doc.' };
  }

  return { ok: true, text: pasted, docId: '', source: PROPOSAL_SOURCE.TEXT };
}

/**
 * النص ينحفظ ملفاً في درايف مو خلية في الشيت —
 * حد الخلية ٥٠ ألف حرف، والبربوزلات تتجاوزه.
 */
function proposalFolder_() {
  if (CONFIG_2.PROPOSAL_FOLDER_ID) {
    return DriveApp.getFolderById(CONFIG_2.PROPOSAL_FOLDER_ID);
  }
  const it = DriveApp.getFoldersByName(CONFIG_2.PROPOSAL_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG_2.PROPOSAL_FOLDER_NAME);
}

function storeProposalText_(reviewId, text) {
  const file = proposalFolder_().createFile(reviewId + '.txt', text, MimeType.PLAIN_TEXT);
  return file.getId();
}

/** تقرأه الخطوة ٦ عند التقييم */
function readProposalText(textFileId) {
  return DriveApp.getFileById(textFileId).getBlob().getDataAsString();
}

// ============================================================
// الاستلام
// ============================================================

function parseProposalResponse(e) {
  const answers = {};
  e.response.getItemResponses().forEach(function (item) {
    answers[item.getItem().getTitle().trim()] = item.getResponse();
  });
  const F = CONFIG_2.FORM_2B;
  return {
    projectId:  String(answers[F.projectId] || '').trim().toUpperCase(),
    token:      String(answers[F.token]     || '').trim().toUpperCase(),
    docUrl:     String(answers[F.docUrl]    || '').trim(),
    pastedText: String(answers[F.pastedText]|| '').trim(),
    notes:      String(answers[F.notes]     || '').trim(),
    email:      e.response.getRespondentEmail()
  };
}

function onProposalSubmit(e) {
  try {
    const sub     = parseProposalResponse(e);
    const project = getProject(sub.projectId);

    if (!project) {
      emailProposalRejected_(sub, 'المعرّف غير موجود في سجل الاستلام.');
      return;
    }

    if (CONFIG_2.STAGE_2B_SIZES.indexOf(project.approvedSize) === -1) {
      emailProposalRejected_(sub,
        'المشاريع بحجم "' + project.approvedSize + '" ما فيها مرحلة بربوزل. ' +
        'وثيقتها فيها ملخص فقط، وما فيها قسم مقترح.');
      return;
    }

    // البوابة: حالة المشروع المخزّنة أولاً، ثم الرمز
    const gate = checkUploadGate(sub.projectId, sub.token);
    if (!gate.ok) {
      emailProposalRejected_(sub, gate.reason);
      return;
    }

    const extracted = extractProposalText(sub.docUrl, sub.pastedText);
    if (!extracted.ok) {
      emailProposalRejected_(sub, extracted.error);
      return;
    }

    const reviewId   = nextReviewId(sub.projectId, '2B');
    const textFileId = storeProposalText_(reviewId, extracted.text);

    const row = new Array(proposalWidth_()).fill('');
    const put = function (k, v) { row[proposalCol(k) - 1] = v; };
    put('reviewId',   reviewId);
    put('projectId',  sub.projectId);
    put('name',       project.projectName);
    put('email',      sub.email || project.email);
    put('submitted',  new Date());
    put('size',       project.approvedSize);
    put('source',     extracted.source);
    put('docUrl',     sub.docUrl);
    put('textFileId', textFileId);
    put('charCount',  extracted.text.length);
    put('notes',      sub.notes);
    put('state',      PROPOSAL_STATE.RECEIVED);

    proposalsSheet().appendRow(row);

    emailProposalReceived_(project, sub, reviewId, extracted);
    emailLeadProposalArrived_(project, sub, reviewId, extracted, textFileId);

  } catch (err) {
    MailApp.sendEmail({
      to: CONFIG_2.LEAD_EMAIL,
      subject: '[خطأ] استلام البربوزل',
      body: err.message + '\n\n' + err.stack
    });
  }
}

/** آخر بربوزل للمشروع */
function latestProposalFor(projectId) {
  const sheet = proposalsSheet();
  const last  = sheet.getLastRow();
  if (last < 2) return null;

  const wanted = String(projectId || '').trim().toUpperCase();
  const values = sheet.getRange(2, 1, last - 1, proposalWidth_()).getValues();

  for (let i = values.length - 1; i >= 0; i--) {
    const r = values[i];
    if (String(r[proposalCol('projectId') - 1] || '').trim().toUpperCase() !== wanted) continue;
    const get = function (k) { return r[proposalCol(k) - 1]; };
    return {
      rowNumber:  i + 2,
      reviewId:   String(get('reviewId')   || ''),
      projectId:  wanted,
      name:       String(get('name')       || ''),
      email:      String(get('email')      || ''),
      size:       String(get('size')       || ''),
      textFileId: String(get('textFileId') || ''),
      charCount:  get('charCount') || 0,
      state:      String(get('state')      || ''),
      score:      get('score'),
      computed:   String(get('computed')   || ''),
      lead:       String(get('lead')       || ''),
      leadReason: String(get('leadReason') || '')
    };
  }
  return null;
}

// ============================================================
// الإيميلات — إشعارات استلام فقط، ما فيها ولا حرف تقييم
// ============================================================

function emailProposalReceived_(project, sub, reviewId, extracted) {
  const body = '<p>هلا ' + (project.leadName || '') + '،</p>' +
    '<p>استلمنا بربوزل مشروع <b>' + project.projectName + '</b> (' + sub.projectId + ').</p>' +
    '<table dir="rtl" style="border-collapse:collapse;font-size:14px">' +
      '<tr><td style="padding:4px 12px 4px 0">المصدر</td><td><b>' + extracted.source + '</b></td></tr>' +
      '<tr><td style="padding:4px 12px 4px 0">حجم النص</td><td><b>' +
        extracted.text.length.toLocaleString('en-US') + '</b> حرف</td></tr>' +
      '<tr><td style="padding:4px 12px 4px 0">رقم المراجعة</td><td><b>' + reviewId + '</b></td></tr>' +
    '</table>' +
    '<p>البربوزل الحين عند لجنة إدارة المشاريع للمراجعة. ' +
    '<b>ما نقدر نعطيكم أي نتيجة الآن</b> — أي ملاحظات توصلكم بعد ما يعتمدها قائد اللجنة.</p>' +
    '<p>لو تبون تعدّلون شيئاً قبل المراجعة، ارفعوا نسخة جديدة على نفس الفورم ' +
    'ونعتمد الأخيرة.</p>' +
    '<hr><p>' + CONFIG_2.COMMITTEE_NAME + '</p>';

  MailApp.sendEmail({
    to: sub.email || project.email,
    subject: 'استلمنا بربوزل ' + project.projectName,
    htmlBody: wrapRtl_(body)
  });
}

function emailLeadProposalArrived_(project, sub, reviewId, extracted, textFileId) {
  const plan = latestPlanFor(sub.projectId);
  const body = '<p>وصل بربوزل <b>' + project.projectName + '</b> (' + sub.projectId + ').</p>' +
    '<table dir="rtl" style="border-collapse:collapse;font-size:14px">' +
      '<tr><td style="padding:4px 12px 4px 0">الحجم المعتمد</td><td><b>' + project.approvedSize + '</b></td></tr>' +
      '<tr><td style="padding:4px 12px 4px 0">المصدر</td><td>' + extracted.source + '</td></tr>' +
      '<tr><td style="padding:4px 12px 4px 0">حجم النص</td><td>' +
        extracted.text.length.toLocaleString('en-US') + ' حرف</td></tr>' +
      '<tr><td style="padding:4px 12px 4px 0">رقم المراجعة</td><td>' + reviewId + '</td></tr>' +
    '</table>' +
    (sub.docUrl ? '<p><a href="' + sub.docUrl + '">افتح وثيقة الفريق</a></p>' : '') +
    (sub.notes ? '<p><b>ملاحظات الفريق:</b> ' + sub.notes + '</p>' : '');

  let tail = '';
  if (plan && plan.computed === 'معتمد بتنبيهات') {
    tail += disabledNoticeHtml_(disabledNamesFromDetail_(
      timelinePlansSheet().getRange(plan.rowNumber, planCol('detail')).getValue()));
    tail += '<p>خطته الزمنية عدّت بتنبيهات — التنبيهات فوق ترافق البربوزل مثل ما تنص المواصفة.</p>';
  }

  tail += '<hr><p><b>البربوزل مخزّن وما انقيّم بعد.</b> من قائمة "المرحلة ٢" اختر ' +
          '"قيّم آخر بربوزل مستلم" لتوليد مسودة المراجعة.</p>';

  MailApp.sendEmail({
    to: CONFIG_2.LEAD_EMAIL,
    subject: '[بربوزل] ' + project.projectName + ' — مستلم',
    htmlBody: wrapRtl_(body + tail)
  });
}

function emailProposalRejected_(sub, reason) {
  if (sub.email) {
    MailApp.sendEmail({
      to: sub.email,
      subject: 'ما قدرنا نستلم البربوزل',
      htmlBody: wrapRtl_(
        '<p>وصلنا رفع بربوزل بالمعرّف <b>' + (sub.projectId || '(فاضي)') + '</b>، ' +
        'وما قدرنا نكمل عليه.</p>' +
        '<p><b>السبب:</b> ' + reason + '</p>' +
        '<p>عالجوا السبب وأعيدوا الرفع على نفس الفورم.</p>' +
        '<p>' + CONFIG_2.COMMITTEE_NAME + '</p>')
    });
  }
  MailApp.sendEmail({
    to: CONFIG_2.LEAD_EMAIL,
    subject: '[بربوزل] رفع مرفوض — ' + (sub.projectId || 'بدون معرّف'),
    htmlBody: wrapRtl_('<p>' + reason + '</p><p>المُرسِل: ' + (sub.email || 'غير معروف') + '</p>')
  });
}
