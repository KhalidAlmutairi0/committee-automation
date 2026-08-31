/**
 * اختبارات فحوصات الخط الزمني — بدون فورم وبدون بريد وبدون شيت.
 * تشغّل الدوال الخالصة في timeline_checks.gs على حالات ثابتة.
 *
 * في أبس سكربت: القائمة > المرحلة ٢ > تشغيل اختبارات الفحوصات، ثم View > Logs.
 */

function testLog_(s) {
  if (typeof Logger !== 'undefined' && Logger.log) Logger.log(s);
  else console.log(s);
}

function d_(iso) {
  const p = iso.split('-');
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
}

/** خطة متوسطة سليمة، تُنسخ ثم تُخرّب في كل حالة */
function basePlan_() {
  return {
    projectId: 'FTC-26-001',
    size: 'متوسط',
    selectiveAdmission: false,
    dates: {
      ideaApproval:       d_('2026-09-01'),
      sponsorClose:       d_('2026-09-20'),
      designsDelivery:    d_('2026-10-05'),
      regOpen:            d_('2026-10-15'),
      regClose:           d_('2026-11-05'),
      acceptanceAnnounce: null,
      eventStart:         d_('2026-11-20'),
      eventEnd:           d_('2026-11-22'),
      finalReport:        d_('2026-12-05')
    },
    hijri: {}
  };
}

function clone_(plan) {
  const c = { projectId: plan.projectId, size: plan.size,
              selectiveAdmission: plan.selectiveAdmission, dates: {}, hijri: {},
              prepActivities: (plan.prepActivities || []).slice() };
  Object.keys(plan.dates).forEach(function (k) { c.dates[k] = plan.dates[k]; });
  Object.keys(plan.hijri).forEach(function (k) { c.hijri[k] = plan.hijri[k]; });
  return c;
}

function checkByCode_(result, code) {
  return result.checks.filter(function (c) { return c.code === code; })[0];
}

function withConfig_(overrides, fn) {
  const saved = {};
  Object.keys(overrides).forEach(function (k) {
    saved[k] = CONFIG_2[k];
    CONFIG_2[k] = overrides[k];
  });
  try { return fn(); }
  finally { Object.keys(saved).forEach(function (k) { CONFIG_2[k] = saved[k]; }); }
}

const FILLED_GAPS = {
  regOpen_to_eventStart:            { value: 3,  unit: 'weeks' },
  regClose_to_acceptanceAnnounce:   { value: 3,  unit: 'days'  },
  acceptanceAnnounce_to_eventStart: { value: 7,  unit: 'days'  },
  sponsorClose_to_designsDelivery:  { value: 10, unit: 'days'  },
  designsDelivery_to_regOpen:       { value: 5,  unit: 'days'  },
  eventEnd_to_finalReport:          { value: 7,  unit: 'days'  }
};

const SAMPLE_CALENDAR = [
  { name: 'الاختبارات النهائية', start: '2026-12-13', end: '2026-12-24' },
  { name: 'رمضان',               start: '2027-02-08', end: '2027-03-09' }
];

// ============================================================
// تمرير مشروع حقيقي — بلا كتابة في شيت وبلا إرسال بريد
// ============================================================

/**
 * عدّل PAST_PROJECT تحت بتواريخ مشروع سابق تعرف كيف انتهى، ثم Run.
 *
 * الاختبارات فوق fixtures: تثبت أن الكود يسوي اللي انكتب ليسويه.
 * هذي الدالة هي الوحيدة اللي تقول شيئاً عن صحة العتبات.
 *
 * لو مشروع تعرف أن خطته انهارت طلع "معتمد" → العتبات غلط، مو المشروع.
 */
const PAST_PROJECT = {
  name: '(اسم المشروع)',
  size: 'كبير',
  selectiveAdmission: true,
  outcome: '(مشى / تعثّر / انهار)',
  dates: {
    ideaApproval:       '',   // 'YYYY-MM-DD'
    sponsorClose:       '',
    designsDelivery:    '',
    regOpen:            '',
    regClose:           '',
    acceptanceAnnounce: '',
    eventStart:         '',
    eventEnd:           '',
    finalReport:        ''
  }
};

function dryRunPastProject() {
  const plan = { projectId: PAST_PROJECT.name, size: PAST_PROJECT.size,
                 selectiveAdmission: !!PAST_PROJECT.selectiveAdmission,
                 dates: {}, hijri: {} };

  let filled = 0;
  CONFIG_2.MILESTONES.forEach(function (m) {
    const raw = PAST_PROJECT.dates[m.key];
    if (raw) { filled++; plan.dates[m.key] = d_(raw); }
    else     { plan.dates[m.key] = null; }
  });

  if (!filled) {
    const msg = 'ما عبّيت ولا تاريخ في PAST_PROJECT داخل tests.gs.\n\n' +
                'الاختبارات الثانية fixtures — تثبت أن الكود يشتغل، ' +
                'ما تثبت أن العتبات صح. عبّي مشروعاً سابقاً تعرف كيف انتهى.';
    testLog_(msg);
    try { SpreadsheetApp.getUi().alert('تمرير مشروع حقيقي', msg,
          SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    return null;
  }

  const r = runTimelineChecks(plan, []);

  let out = 'المشروع : ' + PAST_PROJECT.name + ' [' + PAST_PROJECT.size + ']\n' +
            'الواقع  : ' + PAST_PROJECT.outcome + '\n' +
            'النظام  : ' + r.decision + '\n\n';
  r.checks.forEach(function (c) {
    out += '  ' + c.code + ' ' + c.name + ': ' + RESULT_LABEL[c.result] +
           (c.detail ? '\n      ' + c.detail : '') + '\n';
  });

  const bad = PAST_PROJECT.outcome.indexOf('تعثّر') !== -1 ||
              PAST_PROJECT.outcome.indexOf('انهار') !== -1;
  if (bad && r.decision !== 'إعادة تقديم') {
    out += '\n⚠️ مشروع ' + PAST_PROJECT.outcome + ' وعدّى. العتبات غلط، مو المشروع.';
  }

  const dark = Object.keys(CONFIG_2.MIN_GAPS).filter(function (k) {
    return CONFIG_2.MIN_GAPS[k].value === null; }).length;
  if (dark) {
    out += '\n\nملاحظة: T3 معطّل (' + dark + ' عتبة فاضية)، ' +
           'فهذا التمرير ما فحص واقعية المدد أصلاً.';
  }

  testLog_(out);
  try { SpreadsheetApp.getUi().alert('تمرير مشروع حقيقي', out,
        SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return r;
}

// ============================================================

function runTimelineTests() {
  const results = [];
  const T = function (name, fn) {
    let pass = false, note = '';
    try { const r = fn(); pass = r === true; note = (r === true) ? '' : String(r); }
    catch (err) { note = 'استثناء: ' + err.message; }
    results.push({ name: name, pass: pass, note: note });
  };

  // --- معيار القبول: تاريخ معكوس يُرفض في T1 وما يوصل المودل ---
  T('T1 يرفض تاريخاً معكوساً', function () {
    const p = clone_(basePlan_());
    p.dates.eventEnd = d_('2026-11-18');          // قبل بداية الحدث
    const r  = runTimelineChecks(p, []);
    const t1 = checkByCode_(r, 'T1');
    if (t1.result !== 'fail')            return 'T1 = ' + t1.result;
    if (r.decision !== 'إعادة تقديم')     return 'القرار = ' + r.decision;
    if (r.uploadUnlocked !== false)      return 'الرفع انفتح رغم الرفض';
    return true;
  });

  // --- معيار القبول: نقص معلم إلزامي يُرفض في T2 ---
  T('T2 يرفض معلماً إلزامياً ناقصاً', function () {
    const p = clone_(basePlan_());
    p.dates.sponsorClose = null;                  // إلزامي للمتوسط
    const r  = runTimelineChecks(p, []);
    const t2 = checkByCode_(r, 'T2');
    if (t2.result !== 'fail')        return 'T2 = ' + t2.result;
    if (r.decision !== 'إعادة تقديم') return 'القرار = ' + r.decision;
    if (t2.detail.indexOf('إغلاق الرعاية') === -1) return 'ما سمّى المعلم الناقص';
    return true;
  });

  T('T2 ما يطلب إغلاق الرعاية من مشروع صغير', function () {
    const p = clone_(basePlan_());
    p.size = 'صغير';
    p.dates.sponsorClose = null;
    p.dates.designsDelivery = null;
    const t2 = checkByCode_(runTimelineChecks(p, []), 'T2');
    return t2.result === 'pass' ? true : 'T2 = ' + t2.result + ' — ' + t2.detail;
  });

  T('T2 يطلب إعلان المقبولين من هاكاثون فقط', function () {
    const withSel = clone_(basePlan_()); withSel.selectiveAdmission = true;
    const a = checkByCode_(runTimelineChecks(withSel, []), 'T2');
    const b = checkByCode_(runTimelineChecks(clone_(basePlan_()), []), 'T2');
    if (a.result !== 'fail') return 'القبول الانتقائي ما طلب الإعلان: ' + a.result;
    if (b.result !== 'pass') return 'بدون قبول انتقائي رفض: ' + b.detail;
    return true;
  });

  // --- معيار القبول: عتبات فاضية = تحذير ومنع "معتمد"، مو تخمين ---
  T('T3 معطّل يمنع "معتمد" وما يوقف التشغيل', function () {
    return withConfig_({ MIN_GAPS: {
      regOpen_to_eventStart:            { value: null, unit: 'weeks' },
      regClose_to_acceptanceAnnounce:   { value: null, unit: 'days'  },
      acceptanceAnnounce_to_eventStart: { value: null, unit: 'days'  },
      sponsorClose_to_designsDelivery:  { value: null, unit: 'days'  },
      designsDelivery_to_regOpen:       { value: null, unit: 'days'  },
      eventEnd_to_finalReport:          { value: null, unit: 'days'  }
    }, T5_MARGIN_DAYS: null, ACADEMIC_CALENDAR: [] }, function () {
      const r  = runTimelineChecks(clone_(basePlan_()), []);
      const t3 = checkByCode_(r, 'T3');
      if (t3.result !== 'disabled')          return 'T3 = ' + t3.result;
      if (r.decision !== 'معتمد بتنبيهات')    return 'القرار = ' + r.decision;
      if (r.uploadUnlocked !== true)         return 'الرفع انقفل بلا سبب حاجب';
      if (t3.detail.indexOf('فنتك') === -1)  return 'التحذير ما وجّه للمصدر';
      return true;
    });
  });

  T('T3 يرفض مسافة أقصر من الحد الأدنى', function () {
    return withConfig_({ MIN_GAPS: FILLED_GAPS }, function () {
      const p = clone_(basePlan_());
      p.dates.regOpen = d_('2026-11-10');   // ١٠ أيام قبل الحدث، والمطلوب ٣ أسابيع
      const r  = runTimelineChecks(p, []);
      const t3 = checkByCode_(r, 'T3');
      if (t3.result !== 'fail')          return 'T3 = ' + t3.result;
      if (t3.detail.indexOf('21') === -1) return 'ما ذكر الحد الأدنى بالأيام';
      if (r.decision !== 'إعادة تقديم')   return 'القرار = ' + r.decision;
      return true;
    });
  });

  T('T3 مفعّل بالكامل يعطي "معتمد" على خطة سليمة', function () {
    return withConfig_({ MIN_GAPS: FILLED_GAPS, T5_MARGIN_DAYS: 5,
                         ACADEMIC_CALENDAR: SAMPLE_CALENDAR }, function () {
      const r = runTimelineChecks(clone_(basePlan_()), []);
      if (r.decision !== 'معتمد') {
        return 'القرار = ' + r.decision + ' — ' + r.checks.map(function (c) {
          return c.code + ':' + c.result; }).join(',');
      }
      return true;
    });
  });

  // --- T1: يوم واحد ---
  T('T1 يسمح بحدث يوم واحد', function () {
    const p = clone_(basePlan_());
    p.dates.eventEnd = p.dates.eventStart;
    const t1 = checkByCode_(runTimelineChecks(p, []), 'T1');
    return t1.result === 'pass' ? true : 'T1 = ' + t1.result + ' — ' + t1.detail;
  });

  T('T1 يرفض تساوي زوج غير مستثنى', function () {
    const p = clone_(basePlan_());
    p.dates.designsDelivery = p.dates.regOpen;
    const t1 = checkByCode_(runTimelineChecks(p, []), 'T1');
    return t1.result === 'fail' ? true : 'T1 = ' + t1.result;
  });

  T('T1 يسمح بإغلاق التسجيل صباح الحدث', function () {
    const p = clone_(basePlan_());
    p.dates.acceptanceAnnounce = null;              // ورشة بلا قبول انتقائي
    p.dates.regClose = p.dates.eventStart;
    const t1 = checkByCode_(runTimelineChecks(p, []), 'T1');
    return t1.result === 'pass' ? true : 'T1 = ' + t1.result + ' — ' + t1.detail;
  });

  T('التساهل ما ينتقل لمشروع فيه قبول انتقائي', function () {
    const p = clone_(basePlan_());
    p.selectiveAdmission = true;
    p.dates.acceptanceAnnounce = d_('2026-11-10');
    p.dates.regClose = p.dates.acceptanceAnnounce;  // زوج غير مستثنى
    const t1 = checkByCode_(runTimelineChecks(p, []), 'T1');
    return t1.result === 'fail' ? true : 'T1 = ' + t1.result;
  });

  // --- T6 ---
  T('T6 يقبل فرق يوم واحد', function () {
    const p = clone_(basePlan_());
    const ref = gregorianToHijri(p.dates.eventStart);
    p.hijri.eventStart = ref.y + '/' + ref.m + '/' + (ref.d + 1);
    const t6 = checkByCode_(runTimelineChecks(p, []), 'T6');
    return t6.result === 'pass' ? true : 'T6 = ' + t6.result + ' — ' + t6.detail;
  });

  T('T6 يرفض فرق خمسة أيام', function () {
    const p = clone_(basePlan_());
    const ref = gregorianToHijri(p.dates.eventStart);
    p.hijri.eventStart = ref.y + '/' + ref.m + '/' + (ref.d + 5);
    const r  = runTimelineChecks(p, []);
    const t6 = checkByCode_(r, 'T6');
    if (t6.result !== 'fail')        return 'T6 = ' + t6.result;
    if (r.decision !== 'إعادة تقديم') return 'القرار = ' + r.decision;
    return true;
  });

  T('T6 ما يرفض على تاريخ هجري غير مقروء', function () {
    const p = clone_(basePlan_());
    p.hijri.eventStart = 'الأسبوع الثالث';
    const t6 = checkByCode_(runTimelineChecks(p, []), 'T6');
    return t6.result === 'warn' ? true : 'T6 = ' + t6.result;
  });

  T('T6 يعدّي لو ما فيه تواريخ هجرية', function () {
    const t6 = checkByCode_(runTimelineChecks(clone_(basePlan_()), []), 'T6');
    return t6.result === 'pass' ? true : 'T6 = ' + t6.result;
  });

  // --- T4 ---
  T('T4 ينبّه على تقاطع تقويمي بدون ما يقفل الرفع', function () {
    return withConfig_({ ACADEMIC_CALENDAR: SAMPLE_CALENDAR, MIN_GAPS: FILLED_GAPS,
                         T5_MARGIN_DAYS: 5 }, function () {
      const p = clone_(basePlan_());
      p.dates.eventStart  = d_('2026-12-15');
      p.dates.eventEnd    = d_('2026-12-17');
      p.dates.finalReport = d_('2026-12-28');
      const r  = runTimelineChecks(p, []);
      const t4 = checkByCode_(r, 'T4');
      if (t4.result !== 'warn')              return 'T4 = ' + t4.result;
      if (r.decision !== 'معتمد بتنبيهات')    return 'القرار = ' + r.decision;
      if (r.uploadUnlocked !== true)         return 'التنبيه قفل الرفع، والمفروض لا';
      return true;
    });
  });

  T('T4 ينبّه على تقاطع مع مشروع نادٍ معتمد', function () {
    return withConfig_({ ACADEMIC_CALENDAR: SAMPLE_CALENDAR }, function () {
      const other = [{ projectId: 'FTC-26-002', projectName: 'معرض المشاريع',
                       eventStart: d_('2026-11-21'), eventEnd: d_('2026-11-23') }];
      const t4 = checkByCode_(runTimelineChecks(clone_(basePlan_()), other), 'T4');
      if (t4.result !== 'warn') return 'T4 = ' + t4.result;
      if (t4.detail.indexOf('معرض المشاريع') === -1) return 'ما سمّى المشروع المتقاطع';
      return true;
    });
  });

  // --- T5 ---
  T('T5 ينبّه على هامش خطأ صفري', function () {
    return withConfig_({ T5_MARGIN_DAYS: 7 }, function () {
      const p = clone_(basePlan_());
      p.dates.regClose = p.dates.eventStart;   // آخر تحضير يوم الحدث
      const t5 = checkByCode_(runTimelineChecks(p, []), 'T5');
      if (t5.result !== 'warn')            return 'T5 = ' + t5.result;
      if (t5.detail.indexOf('0 يوم') === -1) return 'ما ذكر الهامش الفعلي';
      return true;
    });
  });

  // --- T7 — العيب اللي كان يمر نظيفاً قبل هذا الفحص ---
  T('T7 يمسك عيب فنتك: نشاط تمهيدي قبل إعلان المقبولين', function () {
    const p = clone_(basePlan_());
    p.selectiveAdmission = true;
    p.dates.acceptanceAnnounce = d_('2026-11-10');
    p.prepActivities = [{ title: 'ورشة تمهيدية', date: d_('2026-10-12'), openToAll: false }];
    const r  = runTimelineChecks(p, []);
    const t7 = checkByCode_(r, 'T7');
    if (t7.result !== 'fail')          return 'T7 = ' + t7.result;
    if (r.decision !== 'إعادة تقديم')   return 'القرار = ' + r.decision;
    if (t7.detail.indexOf('ورشة تمهيدية') === -1) return 'ما سمّى النشاط';
    return true;
  });

  T('نفس العيب كان يمر من T1 و T2 نظيفاً', function () {
    const p = clone_(basePlan_());
    p.selectiveAdmission = true;
    p.dates.acceptanceAnnounce = d_('2026-11-10');
    p.prepActivities = [{ title: 'ورشة تمهيدية', date: d_('2026-10-12'), openToAll: false }];
    const r = runTimelineChecks(p, []);
    if (checkByCode_(r, 'T1').result !== 'pass') return 'T1 مسكه، فالحالة ما تثبت الثغرة';
    if (checkByCode_(r, 'T2').result !== 'pass') return 'T2 مسكه، فالحالة ما تثبت الثغرة';
    return true;   // T7 وحده اللي مسكه
  });

  T('T7 يسمح بنشاط مفتوح للجميع', function () {
    const p = clone_(basePlan_());
    p.selectiveAdmission = true;
    p.dates.acceptanceAnnounce = d_('2026-11-10');
    p.prepActivities = [{ title: 'جلسة تعريفية', date: d_('2026-10-12'), openToAll: true }];
    const t7 = checkByCode_(runTimelineChecks(p, []), 'T7');
    return t7.result === 'pass' ? true : 'T7 = ' + t7.result + ' — ' + t7.detail;
  });

  T('T7 يسمح بنشاط بعد إعلان المقبولين', function () {
    const p = clone_(basePlan_());
    p.selectiveAdmission = true;
    p.dates.acceptanceAnnounce = d_('2026-11-10');
    p.prepActivities = [{ title: 'تدريب المقبولين', date: d_('2026-11-11'), openToAll: false }];
    const t7 = checkByCode_(runTimelineChecks(p, []), 'T7');
    return t7.result === 'pass' ? true : 'T7 = ' + t7.result + ' — ' + t7.detail;
  });

  T('T7 بلا أنشطة تمهيدية ما يغيّر النتيجة', function () {
    const p = clone_(basePlan_());
    p.selectiveAdmission = true;
    p.dates.acceptanceAnnounce = d_('2026-11-10');
    p.prepActivities = [];
    const t7 = checkByCode_(runTimelineChecks(p, []), 'T7');
    if (t7.result !== 'pass') return 'T7 = ' + t7.result;
    return t7.detail.indexOf('ما فيه أنشطة') !== -1 ? true : 'تفصيل الصفر غير واضح';
  });

  T('T7 يعدّي مشروعاً بلا قبول انتقائي', function () {
    const p = clone_(basePlan_());
    p.dates.acceptanceAnnounce = null;
    p.prepActivities = [{ title: 'ورشة', date: d_('2026-10-12'), openToAll: false }];
    const t7 = checkByCode_(runTimelineChecks(p, []), 'T7');
    return t7.result === 'pass' ? true : 'T7 = ' + t7.result;
  });

  // --- ما فيه مسار يعدّي رفضاً حاجباً ---
  T('ما فيه فحص حاجب فاشل يعطي رفعاً مفتوحاً', function () {
    const cases = [
      function (p) { p.dates.eventEnd = d_('2026-01-01'); },
      function (p) { p.dates.regOpen  = null; },
      function (p) { const r = gregorianToHijri(p.dates.eventStart);
                     p.hijri.eventStart = r.y + '/' + r.m + '/' + (r.d + 9); }
    ];
    for (let i = 0; i < cases.length; i++) {
      const p = clone_(basePlan_());
      cases[i](p);
      const r = runTimelineChecks(p, []);
      if (r.blockingFailed > 0 && r.uploadUnlocked) return 'حالة ' + i + ' فتحت الرفع رغم الرفض';
      if (r.blockingFailed > 0 && r.decision !== 'إعادة تقديم') return 'حالة ' + i + ' = ' + r.decision;
    }
    return true;
  });

  // ============================================================

  const passed = results.filter(function (r) { return r.pass; }).length;
  let out = '\n=== اختبارات الخط الزمني ===\n';
  results.forEach(function (r) {
    out += (r.pass ? '  ✓ ' : '  ✗ ') + r.name + (r.note ? '  →  ' + r.note : '') + '\n';
  });
  out += '\n' + passed + ' من ' + results.length + ' ناجحة\n';

  testLog_(out);
  if (typeof SpreadsheetApp !== 'undefined') {
    try { SpreadsheetApp.getUi().alert('اختبارات الخط الزمني', out, SpreadsheetApp.getUi().ButtonSet.OK); }
    catch (e) { /* تشغيل بدون واجهة */ }
  }
  return { passed: passed, total: results.length, results: results };
}
