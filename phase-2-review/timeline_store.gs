/**
 * المرحلة ٢أ — تخزين الخطط الزمنية وحالة قفل الرفع
 *
 * الشيت append-only: كل إعادة تقديم تضيف صفاً جديداً وما تدهس السابق،
 * فتاريخ المشروع كامل يبقى محفوظاً. حالة المشروع الحالية = آخر صف له.
 */

/**
 * تعريف واحد للأعمدة: منه تُبنى الرؤوس ومنه يُشتق رقم كل عمود.
 * إضافة عمود هنا ما تكسر أي فهرس، لأن ما فيه أرقام مكتوبة يدوياً.
 */
function planFields_() {
  const f = [
    { key: 'reviewId',  label: 'معرّف المراجعة' },
    { key: 'projectId', label: 'معرّف المشروع'  },
    { key: 'name',      label: 'اسم المشروع'    },
    { key: 'email',     label: 'إيميل المُرسِل'  },
    { key: 'submitted', label: 'تاريخ الرفع'    },
    { key: 'size',      label: 'الحجم'          },
    { key: 'formats',   label: 'النوع'          }
  ];
  CONFIG_2.MILESTONES.forEach(function (m) {
    f.push({ key: 'date:' + m.key, label: m.label });
  });
  CONFIG_2.HIJRI_FIELDS.forEach(function (k) {
    f.push({ key: 'hijri:' + k, label: milestoneLabel(k) + ' (هجري)' });
  });
  for (let i = 1; i <= CONFIG_2.PREP_ACTIVITY_SLOTS; i++) {
    f.push({ key: 'prepTitle:' + i, label: 'نشاط تمهيدي ' + i + ' — العنوان' });
    f.push({ key: 'prepDate:'  + i, label: 'نشاط تمهيدي ' + i + ' — التاريخ' });
    f.push({ key: 'prepOpen:'  + i, label: 'نشاط تمهيدي ' + i + ' — مفتوح للجميع' });
  }
  f.push(
    { key: 'notes',      label: 'ملاحظات الفريق'   },
    { key: 'computed',   label: 'القرار المحسوب'   },
    { key: 'lead',       label: 'قرار القائد'      },
    { key: 'leadReason', label: 'سبب قرار القائد'  },
    { key: 'gate',       label: 'حالة الرفع'       },
    { key: 'token',      label: 'رمز الرفع'        },
    { key: 'detail',     label: 'تفصيل الفحوصات'   }
  );
  return f;
}

function timelinePlanHeaders_() {
  return planFields_().map(function (f) { return f.label; });
}

function timelinePlansSheet() {
  return sheetWithHeaders_(CONFIG_2.SHEETS.TIMELINE_PLANS, timelinePlanHeaders_());
}

/** رقم العمود (1-indexed) لمفتاح معطى */
function planCol(key) {
  const fields = planFields_();
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].key === key) return i + 1;
  }
  throw new Error('عمود غير معرّف في الخطط الزمنية: ' + key);
}

function planWidth_() { return planFields_().length; }

const GATE = { LOCKED: 'مقفل', UNLOCKED: 'مفتوح' };

/** يقرأ رد فورم الخطة الزمنية ويرجّع كائن خطة غير مفحوص */
function parseTimelineResponse(e) {
  const answers = {};
  e.response.getItemResponses().forEach(function (item) {
    answers[item.getItem().getTitle().trim()] = item.getResponse();
  });

  const F = CONFIG_2.FORM_2A;
  const dates = {}, hijri = {};

  CONFIG_2.MILESTONES.forEach(function (m) {
    dates[m.key] = toDay_(answers[F.dates[m.key]]);
  });
  CONFIG_2.HIJRI_FIELDS.forEach(function (k) {
    hijri[k] = String(answers[F.hijri[k]] || '').trim();
  });

  const prepActivities = [];
  for (let i = 1; i <= CONFIG_2.PREP_ACTIVITY_SLOTS; i++) {
    const slot = function (tpl) { return tpl.replace('{n}', String(i)); };
    const title = String(answers[slot(F.prep.title)] || '').trim();
    const date  = toDay_(answers[slot(F.prep.date)]);
    const open  = String(answers[slot(F.prep.openToAll)] || '').trim();
    if (!title && !date) continue;
    prepActivities.push({ title: title, date: date, openToAll: open === 'نعم' });
  }

  return {
    prepActivities: prepActivities,
    projectId: String(answers[F.projectId] || '').trim().toUpperCase(),
    email:     e.response.getRespondentEmail(),
    notes:     String(answers[F.notes] || '').trim(),
    dates:     dates,
    hijri:     hijri
  };
}

function makeUploadToken_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
}

/**
 * يحفظ الخطة ونتيجتها. يرجّع { reviewId, token }.
 * الرمز يُصدر فقط لما ينفتح الرفع.
 */
function savePlan(plan, project, result) {
  const sheet = timelinePlansSheet();
  const row   = new Array(planWidth_()).fill('');

  const reviewId = nextReviewId(plan.projectId, '2A');

  // لما يكون اعتماد القائد مطلوباً، البوابة تبقى مقفلة فعلياً في الشيت
  // ولا تُكتب "مفتوح" ثم تُحرَس بشرط ثانٍ. حالة واحدة، مصدر واحد.
  const unlocked = result.uploadUnlocked && !CONFIG_2.LEAD_SIGNOFF_2A;
  const token    = unlocked ? makeUploadToken_() : '';

  const put = function (key, value) { row[planCol(key) - 1] = value; };

  put('reviewId',  reviewId);
  put('projectId', plan.projectId);
  put('name',      project.projectName);
  put('email',     plan.email || project.email);
  put('submitted', new Date());
  put('size',      plan.size);
  put('formats',   (project.formats || []).join(' + '));

  CONFIG_2.MILESTONES.forEach(function (m) {
    put('date:' + m.key, plan.dates[m.key] || '');
  });
  CONFIG_2.HIJRI_FIELDS.forEach(function (k) {
    put('hijri:' + k, plan.hijri[k] || '');
  });
  for (let i = 1; i <= CONFIG_2.PREP_ACTIVITY_SLOTS; i++) {
    const a = (plan.prepActivities || [])[i - 1];
    put('prepTitle:' + i, a ? a.title : '');
    put('prepDate:'  + i, a && a.date ? a.date : '');
    put('prepOpen:'  + i, a ? (a.openToAll ? 'نعم' : 'لا') : '');
  }

  put('notes',      plan.notes || '');
  put('computed',   result.decision);
  put('lead',       '');
  put('leadReason', '');
  put('gate',       unlocked ? GATE.UNLOCKED : GATE.LOCKED);
  put('token',      token);
  put('detail',     result.checks.map(function (c) {
    return c.code + '=' + RESULT_LABEL[c.result];
  }).join(' | '));

  sheet.appendRow(row);
  return { reviewId: reviewId, token: token };
}

/** آخر صف للمشروع = حالته الحالية */
function latestPlanFor(projectId) {
  const sheet = timelinePlansSheet();
  const last  = sheet.getLastRow();
  if (last < 2) return null;

  const wanted = String(projectId || '').trim().toUpperCase();
  const values = sheet.getRange(2, 1, last - 1, planWidth_()).getValues();

  for (let i = values.length - 1; i >= 0; i--) {
    const r = values[i];
    if (String(r[planCol('projectId') - 1] || '').trim().toUpperCase() !== wanted) continue;
    return planRowToObject_(r, i + 2);
  }
  return null;
}

function planRowToObject_(r, rowNumber) {
  const get = function (key) { return r[planCol(key) - 1]; };
  return {
    rowNumber:  rowNumber,
    reviewId:   String(get('reviewId')  || ''),
    projectId:  String(get('projectId') || '').trim().toUpperCase(),
    name:       String(get('name')      || ''),
    email:      String(get('email')     || ''),
    size:       String(get('size')      || ''),
    computed:   String(get('computed')  || ''),
    lead:       String(get('lead')      || ''),
    leadReason: String(get('leadReason')|| ''),
    gate:       String(get('gate')      || ''),
    token:      String(get('token')     || ''),
    eventStart: toDay_(get('date:eventStart')),
    eventEnd:   toDay_(get('date:eventEnd'))
  };
}

/**
 * نوافذ أحداث المشاريع اللي انفتح رفعها — يستخدمها T4
 * لفحص التقاطع مع مشروع نادٍ آخر معتمد.
 */
function approvedEventWindows(excludeProjectId) {
  const sheet = timelinePlansSheet();
  const last  = sheet.getLastRow();
  if (last < 2) return [];

  const skip   = String(excludeProjectId || '').trim().toUpperCase();
  const values = sheet.getRange(2, 1, last - 1, planWidth_()).getValues();
  const latest = {};

  values.forEach(function (r) {
    const pid = String(r[planCol('projectId') - 1] || '').trim().toUpperCase();
    if (!pid || pid === skip) return;
    latest[pid] = r;   // الصفوف بالترتيب، فآخر واحد يبقى
  });

  const out = [];
  Object.keys(latest).forEach(function (pid) {
    const p = planRowToObject_(latest[pid], 0);
    if (p.gate !== GATE.UNLOCKED) return;
    if (!p.eventStart || !p.eventEnd) return;
    out.push({ projectId: pid, projectName: p.name || pid,
               eventStart: p.eventStart, eventEnd: p.eventEnd });
  });
  return out;
}

// ============================================================
// بوابة رفع البربوزل
// ============================================================

/**
 * البوابة الحقيقية. الرمز وحده ما يفتح شي —
 * الحالة المخزّنة للمشروع هي اللي تقرر، فرمز مسرّب أو منسوخ من مشروع
 * ثاني ما ينفع.
 */
function checkUploadGate(projectId, token) {
  const plan = latestPlanFor(projectId);

  if (!plan) {
    return { ok: false, reason: 'ما فيه خطة زمنية مرفوعة لهذا المشروع بعد.' };
  }
  if (CONFIG_2.LEAD_SIGNOFF_2A && !plan.lead) {
    return { ok: false, reason: 'الخطة الزمنية تنتظر اعتماد قائد اللجنة.' };
  }
  if (plan.gate !== GATE.UNLOCKED) {
    return { ok: false, reason:
      'رفع البربوزل مقفل. نتيجة الخطة الزمنية: ' + (plan.computed || 'غير محسوبة') + '.' };
  }
  if (!plan.token || String(token || '').trim().toUpperCase() !== plan.token) {
    return { ok: false, reason: 'رمز الرفع غير صحيح. استخدموا الرمز اللي وصلكم في إيميل اعتماد الخطة.' };
  }
  return { ok: true, reason: '', plan: plan };
}

/** يقفل الرفع يدوياً — يستدعيه تجاوز القائد */
function setGate(projectId, unlocked) {
  const plan = latestPlanFor(projectId);
  if (!plan) return false;
  const sheet = timelinePlansSheet();
  sheet.getRange(plan.rowNumber, planCol('gate'))
       .setValue(unlocked ? GATE.UNLOCKED : GATE.LOCKED);
  if (unlocked && !plan.token) {
    sheet.getRange(plan.rowNumber, planCol('token')).setValue(makeUploadToken_());
  }
  return true;
}
