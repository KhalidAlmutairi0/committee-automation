/**
 * المرحلة ٢أ — فحوصات الخط الزمني T1 إلى T7
 * منفّذة حرفياً من phase-2-review/timeline-checks.md
 *
 * كل دالة فحص خالصة: تاخذ الخطة وترجع نتيجة، ما ترسل إيميلاً ولا تكتب في شيت.
 * هذا اللي يخلي tests.gs يشغّلها بدون فورم ولا بريد.
 */

const CHECK_RESULT = {
  PASS:     'pass',
  FAIL:     'fail',
  WARN:     'warn',
  DISABLED: 'disabled'
};

const RESULT_LABEL = {
  pass:     'ناجح',
  fail:     'فاشل',
  warn:     'تنبيه',
  disabled: 'غير مفعّل'
};

// ============================================================
// أدوات التواريخ
// ============================================================

function toDay_(v) {
  if (!v) return null;
  const d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return null;
  return d;
}

function dayNumber_(d) {
  return gregorianToJdn_(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function daysBetween_(a, b) {
  return dayNumber_(b) - dayNumber_(a);
}

function fmtDate(d) {
  if (!d) return '—';
  return d.getFullYear() + '-' + padLeft_(d.getMonth() + 1, 2) + '-' + padLeft_(d.getDate(), 2);
}

function milestoneLabel(key) {
  const m = CONFIG_2.MILESTONES.filter(function (x) { return x.key === key; })[0];
  return m ? m.label : key;
}

/** المعالم الإلزامية لهذا المشروع، بعد فك الشرط على "إعلان المقبولين" */
function requiredMilestones(size, selectiveAdmission) {
  const spec = CONFIG_2.REQUIRED_BY_SIZE[size] || [];
  const out  = [];
  spec.forEach(function (entry) {
    if (entry.indexOf('conditional:') === 0) {
      if (selectiveAdmission) out.push(entry.slice('conditional:'.length));
    } else {
      out.push(entry);
    }
  });
  return out;
}

// ============================================================
// T1 — التسلسل ⛔
// ============================================================

function checkT1(plan) {
  const findings = [];
  let prevKey = null, prevDate = null;

  CONFIG_2.MILESTONES.forEach(function (m) {
    const d = plan.dates[m.key];
    if (!d) return;

    if (prevDate) {
      const diff    = daysBetween_(prevDate, d);
      const pairKey = prevKey + '_to_' + m.key;
      const sameDayOk = CONFIG_2.T1_ALLOW_SAME_DAY.indexOf(pairKey) !== -1;

      if (diff < 0) {
        findings.push(milestoneLabel(m.key) + ' (' + fmtDate(d) + ') قبل ' +
                      milestoneLabel(prevKey) + ' (' + fmtDate(prevDate) + ').');
      } else if (diff === 0 && !sameDayOk) {
        findings.push(milestoneLabel(m.key) + ' و' + milestoneLabel(prevKey) +
                      ' في نفس اليوم (' + fmtDate(d) + '), والمطلوب أن يكون بعده.');
      }
    }
    prevKey = m.key; prevDate = d;
  });

  return {
    code: 'T1', name: 'التسلسل', blocking: true,
    result: findings.length ? CHECK_RESULT.FAIL : CHECK_RESULT.PASS,
    detail: findings.join(' | '),
    fix: findings.length ? 'رتّبوا التواريخ بحيث كل معلم يجي بعد اللي قبله.' : ''
  };
}

// ============================================================
// T2 — الاكتمال ⛔
// ============================================================

function checkT2(plan) {
  const required = requiredMilestones(plan.size, plan.selectiveAdmission);
  const missing  = required.filter(function (k) { return !plan.dates[k]; });

  return {
    code: 'T2', name: 'الاكتمال', blocking: true,
    result: missing.length ? CHECK_RESULT.FAIL : CHECK_RESULT.PASS,
    detail: missing.length
      ? 'معالم إلزامية بدون تاريخ: ' + missing.map(milestoneLabel).join('، ') + '.'
      : 'كل المعالم الإلزامية لحجم "' + plan.size + '" معبّأة.',
    fix: missing.length ? 'عبّوا تاريخاً لكل معلم مذكور فوق وأعيدوا الرفع.' : ''
  };
}

// ============================================================
// T3 — المسافات الدنيا ⛔
// ============================================================

function checkT3(plan) {
  const failures = [], disabled = [];

  Object.keys(CONFIG_2.MIN_GAPS).forEach(function (gapKey) {
    const gap   = CONFIG_2.MIN_GAPS[gapKey];
    const parts = gapKey.split('_to_');
    const from  = parts[0], to = parts[1];

    if (gap.value === null || gap.value === undefined) {
      disabled.push(milestoneLabel(from) + ' ← ' + milestoneLabel(to));
      return;
    }

    const a = plan.dates[from], b = plan.dates[to];
    if (!a || !b) return;   // النقص شغل T2 مو شغل T3

    const minDays = gap.unit === 'weeks' ? gap.value * 7 : gap.value;
    const actual  = daysBetween_(a, b);

    if (actual < minDays) {
      failures.push(
        milestoneLabel(from) + ' (' + fmtDate(a) + ') ← ' +
        milestoneLabel(to)   + ' (' + fmtDate(b) + '): ' +
        actual + ' يوم، والحد الأدنى ' + minDays + ' يوم' +
        (gap.unit === 'weeks' ? ' (' + gap.value + ' أسابيع)' : '') + '.');
    }
  });

  if (failures.length) {
    return {
      code: 'T3', name: 'المسافات الدنيا', blocking: true,
      result: CHECK_RESULT.FAIL,
      detail: failures.join(' | '),
      fix: 'وسّعوا المسافة بين المعلمين المذكورين. اختيار التاريخ البديل قراركم.'
    };
  }

  if (disabled.length === Object.keys(CONFIG_2.MIN_GAPS).length) {
    return {
      code: 'T3', name: 'المسافات الدنيا', blocking: true,
      result: CHECK_RESULT.DISABLED,
      detail: 'CONFIG_2.MIN_GAPS فاضية بالكامل. الفحص ما اشتغل ولا يُعد ناجحاً. ' +
              'عبّي العتبات من بربوزل فنتك (القرار رقم ٣).',
      fix: ''
    };
  }

  if (disabled.length) {
    return {
      code: 'T3', name: 'المسافات الدنيا', blocking: true,
      result: CHECK_RESULT.DISABLED,
      detail: 'مسافات بلا عتبة معرّفة فما انفحصت: ' + disabled.join('، ') +
              '. الباقي عدّى.',
      fix: ''
    };
  }

  return {
    code: 'T3', name: 'المسافات الدنيا', blocking: true,
    result: CHECK_RESULT.PASS, detail: 'كل المسافات فوق الحد الأدنى.', fix: ''
  };
}

// ============================================================
// T4 — تعارض التقويم ⚠️
// ============================================================

function overlaps_(aStart, aEnd, bStart, bEnd) {
  return dayNumber_(aStart) <= dayNumber_(bEnd) && dayNumber_(bStart) <= dayNumber_(aEnd);
}

function checkT4(plan, otherProjects) {
  const findings = [];

  const windows = [];
  if (plan.dates.regOpen && plan.dates.regClose) {
    windows.push({ name: 'فترة التسجيل', start: plan.dates.regOpen, end: plan.dates.regClose });
  }
  if (plan.dates.eventStart && plan.dates.eventEnd) {
    windows.push({ name: 'الحدث', start: plan.dates.eventStart, end: plan.dates.eventEnd });
  }

  CONFIG_2.ACADEMIC_CALENDAR.forEach(function (period) {
    const ps = toDay_(period.start), pe = toDay_(period.end);
    if (!ps || !pe) return;
    windows.forEach(function (w) {
      if (overlaps_(w.start, w.end, ps, pe)) {
        findings.push(w.name + ' (' + fmtDate(w.start) + ' ← ' + fmtDate(w.end) +
                      ') يتقاطع مع ' + period.name + '.');
      }
    });
  });

  (otherProjects || []).forEach(function (other) {
    const os = toDay_(other.eventStart), oe = toDay_(other.eventEnd);
    if (!os || !oe) return;
    windows.forEach(function (w) {
      if (w.name !== 'الحدث') return;
      if (overlaps_(w.start, w.end, os, oe)) {
        findings.push('الحدث يتقاطع مع مشروع نادٍ معتمد: ' + other.projectName +
                      ' (' + fmtDate(os) + ' ← ' + fmtDate(oe) + ').');
      }
    });
  });

  if (!CONFIG_2.ACADEMIC_CALENDAR.length) {
    return {
      code: 'T4', name: 'تعارض التقويم', blocking: false,
      result: CHECK_RESULT.DISABLED,
      detail: 'CONFIG_2.ACADEMIC_CALENDAR فاضي. فحص التقويم الجامعي ما اشتغل.',
      fix: ''
    };
  }

  return {
    code: 'T4', name: 'تعارض التقويم', blocking: false,
    result: findings.length ? CHECK_RESULT.WARN : CHECK_RESULT.PASS,
    detail: findings.length ? findings.join(' | ') : 'ما فيه تقاطع مع التقويم ولا مع مشروع معتمد.',
    fix: findings.length ? 'راجعوا التوقيت. التنبيه ما يوقف الرفع، بس القائد بيشوفه.' : ''
  };
}

// ============================================================
// T5 — هامش الخطأ ⚠️
// ============================================================

function checkT5(plan) {
  if (CONFIG_2.T5_MARGIN_DAYS === null || CONFIG_2.T5_MARGIN_DAYS === undefined) {
    return {
      code: 'T5', name: 'هامش الخطأ', blocking: false,
      result: CHECK_RESULT.DISABLED,
      detail: 'CONFIG_2.T5_MARGIN_DAYS غير معبّأ. الفحص ما اشتغل.',
      fix: ''
    };
  }

  const eventStart = plan.dates.eventStart;
  if (!eventStart) {
    return {
      code: 'T5', name: 'هامش الخطأ', blocking: false,
      result: CHECK_RESULT.PASS,
      detail: 'ما فيه تاريخ بداية حدث، فما ينحسب هامش.', fix: ''
    };
  }

  let lastPrepKey = null, lastPrepDate = null;
  CONFIG_2.T5_PREP_MILESTONES.forEach(function (k) {
    const d = plan.dates[k];
    if (!d) return;
    if (dayNumber_(d) > dayNumber_(eventStart)) return;
    if (!lastPrepDate || dayNumber_(d) > dayNumber_(lastPrepDate)) {
      lastPrepDate = d; lastPrepKey = k;
    }
  });

  if (!lastPrepDate) {
    return {
      code: 'T5', name: 'هامش الخطأ', blocking: false,
      result: CHECK_RESULT.PASS,
      detail: 'ما فيه مهمة تحضيرية مسجّلة قبل الحدث.', fix: ''
    };
  }

  const margin = daysBetween_(lastPrepDate, eventStart);

  return {
    code: 'T5', name: 'هامش الخطأ', blocking: false,
    result: margin < CONFIG_2.T5_MARGIN_DAYS ? CHECK_RESULT.WARN : CHECK_RESULT.PASS,
    detail: 'آخر مهمة تحضيرية: ' + milestoneLabel(lastPrepKey) + ' (' + fmtDate(lastPrepDate) +
            ')، وبينها وبين بداية الحدث ' + margin + ' يوم. المطلوب ' +
            CONFIG_2.T5_MARGIN_DAYS + ' يوم على الأقل.',
    fix: margin < CONFIG_2.T5_MARGIN_DAYS
      ? 'وثائق النادي تطلب هامش خطأ صراحةً. قدّموا آخر مهمة تحضيرية أو أخّروا الحدث.' : ''
  };
}

// ============================================================
// T6 — اتساق هجري / ميلادي ⛔
// ============================================================

function checkT6(plan) {
  const mismatches = [], unreadable = [];
  let compared = 0;

  CONFIG_2.HIJRI_FIELDS.forEach(function (key) {
    const raw  = (plan.hijri || {})[key];
    const greg = plan.dates[key];
    if (!raw || !String(raw).trim() || !greg) return;

    const diff = hijriGregorianDayDiff(raw, greg);

    if (diff === null) {
      unreadable.push(milestoneLabel(key) + ': "' + raw + '" ما انقرأ كتاريخ هجري.');
      return;
    }

    compared++;
    if (Math.abs(diff) > CONFIG_2.HIJRI_TOLERANCE_DAYS) {
      mismatches.push(
        milestoneLabel(key) + ': الميلادي ' + fmtDate(greg) + ' يقابل ' +
        formatHijri(gregorianToHijri(greg)) + '، والمكتوب ' + raw +
        ' (فرق ' + Math.abs(diff) + ' يوم).');
    }
  });

  if (mismatches.length) {
    return {
      code: 'T6', name: 'اتساق هجري/ميلادي', blocking: true,
      result: CHECK_RESULT.FAIL,
      detail: mismatches.join(' | '),
      fix: 'وحّدوا التاريخين. التسامح المسموح يوم واحد لاختلاف أم القرى عن الرؤية.'
    };
  }

  if (unreadable.length) {
    return {
      code: 'T6', name: 'اتساق هجري/ميلادي', blocking: true,
      result: CHECK_RESULT.WARN,
      detail: unreadable.join(' | ') + ' الفحص ما رفض، بس ما تأكد.',
      fix: 'اكتبوا التاريخ الهجري بصيغة 1447/09/15.'
    };
  }

  return {
    code: 'T6', name: 'اتساق هجري/ميلادي', blocking: true,
    result: CHECK_RESULT.PASS,
    detail: compared ? 'تطابق ' + compared + ' تاريخاً هجرياً مع ما يقابله.'
                     : 'ما فيه تواريخ هجرية مدخلة، فما فيه شي يتعارض.',
    fix: ''
  };
}

// ============================================================
// T7 — ترتيب الأنشطة التمهيدية ⛔
// ============================================================

/**
 * نشاط تمهيدي قبل إعلان المقبولين يعني أن النادي درّب ناساً ما يعرف
 * إن كانوا مقبولين. هذا عيب موثّق في بربوزل فنتك: ورشة ٣١-٧ ورسائل
 * قبول ٢٨-٨، بلا تفسير في الوثيقة.
 *
 * الاستثناء الوحيد: نشاط مفتوح للجميع بدون قبول — عندها ما فيه تناقض.
 */
function checkT7(plan) {
  if (!CONFIG_2.T7_ENABLED) {
    return { code: 'T7', name: 'ترتيب الأنشطة التمهيدية', blocking: true,
             result: CHECK_RESULT.DISABLED,
             detail: 'CONFIG_2.T7_ENABLED = false.', fix: '' };
  }

  const activities = (plan.prepActivities || []).filter(function (a) { return a && a.date; });

  if (!activities.length) {
    return { code: 'T7', name: 'ترتيب الأنشطة التمهيدية', blocking: true,
             result: CHECK_RESULT.PASS,
             detail: 'ما فيه أنشطة تمهيدية مسجّلة.', fix: '' };
  }

  const announce = plan.dates.acceptanceAnnounce;
  if (!announce) {
    return { code: 'T7', name: 'ترتيب الأنشطة التمهيدية', blocking: true,
             result: CHECK_RESULT.PASS,
             detail: 'ما فيه إعلان مقبولين، فما فيه ترتيب يتناقض معه.', fix: '' };
  }

  const findings = [];
  activities.forEach(function (a) {
    if (a.openToAll) return;
    if (daysBetween_(a.date, announce) > 0) {
      findings.push('"' + (a.title || 'نشاط بلا عنوان') + '" في ' + fmtDate(a.date) +
                    '، وإعلان المقبولين في ' + fmtDate(announce) +
                    ' (قبله بـ' + daysBetween_(a.date, announce) + ' يوم).');
    }
  });

  return {
    code: 'T7', name: 'ترتيب الأنشطة التمهيدية', blocking: true,
    result: findings.length ? CHECK_RESULT.FAIL : CHECK_RESULT.PASS,
    detail: findings.length
      ? findings.join(' | ') + ' نشاط قبل إعلان المقبولين يعني تدريب ناس ما نعرف إن كانوا مقبولين.'
      : 'كل الأنشطة التمهيدية بعد إعلان المقبولين أو مفتوحة للجميع.',
    fix: findings.length
      ? 'أخّروا النشاط بعد إعلان المقبولين، أو علّموه "مفتوح للجميع بدون قبول" لو كان كذلك فعلاً.'
      : ''
  };
}

// ============================================================
// التجميع والقرار
// ============================================================

/**
 * يشغّل T1 إلى T7 ويحسب القرار.
 *
 * القاعدة: ما دام فحص حاجب واحد معطّلاً، أعلى نتيجة ممكنة "معتمد بتنبيهات".
 * الرفع ينفتح، بس ما فيه شي يمر بالسكوت وكأنه انفحص.
 */
function runTimelineChecks(plan, otherProjects) {
  const checks = [
    checkT1(plan),
    checkT2(plan),
    checkT3(plan),
    checkT4(plan, otherProjects),
    checkT5(plan),
    checkT6(plan),
    checkT7(plan)
  ];

  const blockingFailed = checks.filter(function (c) {
    return c.blocking && c.result === CHECK_RESULT.FAIL;
  }).length;

  const warnings = checks.filter(function (c) {
    return c.result === CHECK_RESULT.WARN;
  }).length;

  const disabled = checks.filter(function (c) {
    return c.result === CHECK_RESULT.DISABLED;
  }).length;

  const blockingDisabled = checks.filter(function (c) {
    return c.blocking && c.result === CHECK_RESULT.DISABLED;
  }).length;

  let decision;
  if (blockingFailed > 0) {
    decision = 'إعادة تقديم';
  } else if (warnings > 0 || blockingDisabled > 0) {
    decision = 'معتمد بتنبيهات';
  } else {
    decision = 'معتمد';
  }

  return {
    checks: checks,
    decision: decision,
    blockingFailed: blockingFailed,
    warnings: warnings,
    disabled: disabled,
    blockingDisabled: blockingDisabled,
    uploadUnlocked: blockingFailed === 0
  };
}
