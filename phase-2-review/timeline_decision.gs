/**
 * المرحلة ٢أ — التشغيل والقرار والإيميلات
 *
 * LEAD_SIGNOFF_2A = false (الافتراضي):
 *   النتيجة تروح للفريق مباشرة، ونسخة للقائد مع إمكانية التجاوز.
 *   الفحوصات حتمية وما فيها مودل، فما تنطبق عليها قاعدة "القائد أولاً"،
 *   وهي قاعدة موضوعة لتقييمات المودل في ٢ب.
 *
 * LEAD_SIGNOFF_2A = true:
 *   ما يروح للفريق شي لين يعبّي القائد عمود "قرار القائد".
 */

const TIMELINE_DECISIONS = ['معتمد', 'معتمد بتنبيهات', 'إعادة تقديم'];

function onTimelineSubmit(e) {
  try {
    const plan    = parseTimelineResponse(e);
    const project = getProject(plan.projectId);
    const gate    = checkEligibleFor2A(project);

    if (!gate.ok) {
      emailTimelineRejected_(plan, gate.reason);
      return;
    }

    plan.size               = project.approvedSize;
    plan.selectiveAdmission = hasSelectiveAdmission(project);

    const result = runTimelineChecks(plan, approvedEventWindows(plan.projectId));
    const saved  = savePlan(plan, project, result);

    logReview({
      reviewId:         saved.reviewId,
      projectId:        plan.projectId,
      projectName:      project.projectName,
      stage:            '2أ',
      size:             plan.size,
      score:            null,
      maxScore:         null,
      computedDecision: result.decision,
      blockingFailed:   result.blockingFailed,
      warnings:         result.warnings,
      disabled:         result.disabled,
      items: result.checks.map(function (c) {
        return {
          code: c.code, name: c.name, blocking: c.blocking,
          result: RESULT_LABEL[c.result], score: null,
          detail: c.detail, quote: '', fix: c.fix
        };
      })
    });

    emailLeadTimeline_(project, plan, result, saved);

    if (!CONFIG_2.LEAD_SIGNOFF_2A) {
      emailTeamTimeline_(project, plan, result, saved.token);
    }

  } catch (err) {
    MailApp.sendEmail({
      to: CONFIG_2.LEAD_EMAIL,
      subject: '[خطأ] فحوصات الخط الزمني',
      body: err.message + '\n\n' + err.stack
    });
  }
}

// ============================================================
// الإيميلات
// ============================================================

function wrapRtl_(html) {
  return '<div dir="rtl" lang="ar" style="font-family:Arial,Tahoma,sans-serif;' +
         'line-height:1.8;text-align:right">' + html + '</div>';
}

const RESULT_STYLE = {
  pass:     { icon: '✓', color: '#1a7f37' },
  fail:     { icon: '⛔', color: '#b42318' },
  warn:     { icon: '⚠️', color: '#b54708' },
  disabled: { icon: '○', color: '#667085' }
};

function checksTableHtml_(checks) {
  let html = '<table dir="rtl" style="border-collapse:collapse;width:100%;font-size:14px">' +
    '<tr style="background:#f2f4f7">' +
    '<th style="padding:8px;border:1px solid #d0d5dd;text-align:right">الفحص</th>' +
    '<th style="padding:8px;border:1px solid #d0d5dd;text-align:right">النتيجة</th>' +
    '<th style="padding:8px;border:1px solid #d0d5dd;text-align:right">التفصيل</th></tr>';

  checks.forEach(function (c) {
    const st = RESULT_STYLE[c.result];
    html += '<tr>' +
      '<td style="padding:8px;border:1px solid #d0d5dd;white-space:nowrap">' +
        c.code + ' — ' + c.name + (c.blocking ? ' ⛔' : '') + '</td>' +
      '<td style="padding:8px;border:1px solid #d0d5dd;color:' + st.color + ';font-weight:bold">' +
        st.icon + ' ' + RESULT_LABEL[c.result] + '</td>' +
      '<td style="padding:8px;border:1px solid #d0d5dd">' + (c.detail || '—') +
        (c.fix ? '<br><span style="color:#475467">المقترح: ' + c.fix + '</span>' : '') +
      '</td></tr>';
  });

  return html + '</table>';
}

/**
 * تسمية الفحوصات اللي ما اشتغلت — تروح للفريق مثل ما تروح للقائد.
 *
 * "معتمد" وفحوصات نصفها مطفي هو النظام يقول للفريق شيئاً غير صحيح.
 * أول خطة تنهار بعد اعتماد كهذا تكلّف مصداقية النظام كله،
 * فالنتيجة تقول دايماً وش انفحص ووش لا.
 */
function disabledNoticeHtml_(disabledNames) {
  if (!disabledNames || !disabledNames.length) return '';
  return '<p style="background:#fffaeb;border-right:4px solid #b54708;padding:12px;' +
    'border-radius:6px;margin:16px 0">' +
    '<b>فحوصات ما اشتغلت في هذه المراجعة:</b><br>' +
    disabledNames.join('<br>') + '<br><br>' +
    'يعني الخطة عدّت الفحوصات اللي اشتغلت فقط. ' +
    '<b>ما انفحصت واقعية المدد</b>، فلا تعتبروا هذه النتيجة شهادة أن الجدول قابل للتنفيذ.' +
    '</p>';
}

function disabledNamesFrom_(checks) {
  return checks.filter(function (c) { return c.result === CHECK_RESULT.DISABLED; })
               .map(function (c) { return '• ' + c.code + ' — ' + c.name +
                                          (c.blocking ? ' ⛔' : ' ⚠️'); });
}

/** نفس القائمة، بس مستخرجة من عمود "تفصيل الفحوصات" المخزّن */
function disabledNamesFromDetail_(detail) {
  const names = { T1: 'التسلسل', T2: 'الاكتمال', T3: 'المسافات الدنيا',
                  T4: 'تعارض التقويم', T5: 'هامش الخطأ', T6: 'اتساق هجري/ميلادي',
                  T7: 'ترتيب الأنشطة التمهيدية' };
  const blocking = { T1: true, T2: true, T3: true, T4: false, T5: false,
                     T6: true, T7: true };
  return String(detail || '').split('|').map(function (p) { return p.trim(); })
    .filter(function (p) { return p.indexOf('=' + RESULT_LABEL.disabled) !== -1; })
    .map(function (p) {
      const code = p.split('=')[0].trim();
      return '• ' + code + ' — ' + (names[code] || '') + (blocking[code] ? ' ⛔' : ' ⚠️');
    });
}

function decisionBanner_(decision) {
  const map = {
    'معتمد':          { bg: '#ecfdf3', fg: '#1a7f37' },
    'معتمد بتنبيهات': { bg: '#fffaeb', fg: '#b54708' },
    'إعادة تقديم':    { bg: '#fef3f2', fg: '#b42318' }
  };
  const st = map[decision] || map['إعادة تقديم'];
  return '<p style="background:' + st.bg + ';color:' + st.fg +
         ';padding:14px;border-radius:8px;font-size:18px;font-weight:bold;margin:0 0 16px">' +
         'نتيجة الخطة الزمنية: ' + decision + '</p>';
}

function emailTeamTimeline_(project, plan, result, token) {
  let body = '<p>هلا ' + (project.leadName || '') + '،</p>' +
    '<p>راجعنا الخطة الزمنية لمشروع <b>' + project.projectName + '</b> (' +
    plan.projectId + ').</p>' +
    decisionBanner_(result.decision) +
    disabledNoticeHtml_(disabledNamesFrom_(result.checks)) +
    checksTableHtml_(result.checks);

  if (result.uploadUnlocked) {
    body += '<hr><p><b>رفع البربوزل مفتوح لكم الآن.</b></p>' +
      '<p style="background:#f4f4f4;padding:10px;border-radius:6px">' +
      'رمز الرفع: <b style="font-size:16px">' + token + '</b><br>' +
      '<span style="font-size:13px">تحتاجونه في فورم رفع البربوزل مع معرّف المشروع.</span></p>';
    if (result.warnings > 0) {
      body += '<p>التنبيهات أعلاه ما توقف الرفع، بس بتوصل قائد اللجنة مع البربوزل.</p>';
    }
  } else {
    body += '<hr><p><b>رفع البربوزل مقفل لين تُعتمد الخطة.</b> ' +
      'عدّلوا النقاط المعلّمة ⛔ فوق وأعيدوا رفع الخطة على نفس الفورم.</p>' +
      '<p>ما نعطيكم تواريخ بديلة لأن اختيار التاريخ قراركم، مو قرار النظام.</p>';
  }

  body += '<hr><p>' + CONFIG_2.COMMITTEE_NAME + '</p>';

  MailApp.sendEmail({
    to: plan.email || project.email,
    subject: 'الخطة الزمنية — ' + project.projectName + ': ' + result.decision,
    htmlBody: wrapRtl_(body)
  });
}

function emailLeadTimeline_(project, plan, result, saved) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let body = '<p><b>' + project.projectName + '</b> (' + plan.projectId +
    ') رفع خطته الزمنية.</p>' +
    decisionBanner_(result.decision) +
    '<p>الحجم المعتمد: <b>' + plan.size + '</b> — النوع: ' +
    (project.formats || []).join(' + ') + '</p>' +
    checksTableHtml_(result.checks);

  body += disabledNoticeHtml_(disabledNamesFrom_(result.checks));

  if (result.blockingDisabled > 0) {
    body += '<p style="background:#fef3f2;padding:12px;border-radius:6px">' +
      '<b>تنبيه إعداد:</b> فيه فحص حاجب معطّل لأن عتباته ما انعبّت. ' +
      'ما دام معطّلاً، أعلى نتيجة ممكنة هي "معتمد بتنبيهات" ولا يمكن أن تكون "معتمد". ' +
      'عبّي <code>CONFIG_2.MIN_GAPS</code> من بربوزل فنتك.</p>';
  }

  if (CONFIG_2.LEAD_SIGNOFF_2A) {
    body += '<hr><p><b>ما وصل الفريق شي بعد.</b> افتح شيت "' +
      CONFIG_2.SHEETS.TIMELINE_PLANS + '" وعبّي عمود "قرار القائد" ' +
      'ليروح الرد للفريق.</p>';
  } else {
    body += '<hr><p>الرد وصل الفريق. لو تبي تتجاوز النتيجة، ' +
      'عدّل عمود "قرار القائد" في شيت "' + CONFIG_2.SHEETS.TIMELINE_PLANS +
      '" وبيوصلهم رد جديد. اكتب السبب في العمود اللي بعده.</p>';
  }

  body += '<p><a href="' + ss.getUrl() + '">افتح الشيت</a></p>';

  MailApp.sendEmail({
    to: CONFIG_2.LEAD_EMAIL,
    subject: '[الخط الزمني] ' + project.projectName + ' — ' + result.decision,
    htmlBody: wrapRtl_(body)
  });
}

function emailTimelineRejected_(plan, reason) {
  const to = plan.email;
  if (!to) return;

  MailApp.sendEmail({
    to: to,
    subject: 'الخطة الزمنية — ما قدرنا نربطها بمشروع',
    htmlBody: wrapRtl_(
      '<p>وصلتنا خطة زمنية بالمعرّف <b>' + (plan.projectId || '(فاضي)') + '</b>، ' +
      'وما قدرنا نكمل عليها.</p>' +
      '<p><b>السبب:</b> ' + reason + '</p>' +
      '<p>المعرّف وصلكم في إيميل استلام المشروع من اللجنة.</p>' +
      '<p>' + CONFIG_2.COMMITTEE_NAME + '</p>')
  });

  MailApp.sendEmail({
    to: CONFIG_2.LEAD_EMAIL,
    subject: '[الخط الزمني] رفع مرفوض — ' + (plan.projectId || 'بدون معرّف'),
    htmlBody: wrapRtl_('<p>' + reason + '</p><p>المُرسِل: ' + to + '</p>')
  });
}

// ============================================================
// تجاوز القائد — تعديل عمود "قرار القائد" في الشيت
// ============================================================

function onTimelineLeadEdit(e) {
  try {
    const sheet = e.range.getSheet();
    if (sheet.getName() !== CONFIG_2.SHEETS.TIMELINE_PLANS) return;
    if (e.range.getColumn() !== planCol('lead')) return;
    if (e.range.getRow() < 2) return;

    const decision = String(e.range.getValue() || '').trim();
    if (!decision) return;
    if (TIMELINE_DECISIONS.indexOf(decision) === -1) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        'قرار غير معروف: ' + decision + '. المسموح: ' + TIMELINE_DECISIONS.join(' / '));
      return;
    }

    const row  = e.range.getRow();
    const raw  = sheet.getRange(row, 1, 1, planWidth_()).getValues()[0];
    const plan = planRowToObject_(raw, row);

    const unlocked = decision !== 'إعادة تقديم';
    sheet.getRange(row, planCol('gate')).setValue(unlocked ? GATE.UNLOCKED : GATE.LOCKED);

    let token = plan.token;
    if (unlocked && !token) {
      token = makeUploadToken_();
      sheet.getRange(row, planCol('token')).setValue(token);
    }

    const reason   = String(sheet.getRange(row, planCol('leadReason')).getValue() || '');
    const detail   = String(sheet.getRange(row, planCol('detail')).getValue() || '');
    recordLeadDecision(plan.reviewId, decision, reason, Session.getActiveUser().getEmail());

    emailTeamLeadDecision_(plan, decision, token, reason, detail);
    SpreadsheetApp.getActiveSpreadsheet().toast('انرسل للفريق: ' + decision);

  } catch (err) {
    MailApp.sendEmail({
      to: CONFIG_2.LEAD_EMAIL,
      subject: '[خطأ] تجاوز قرار الخط الزمني',
      body: err.message + '\n\n' + err.stack
    });
  }
}

function emailTeamLeadDecision_(plan, decision, token, reason, detail) {
  let body = '<p>هلا،</p>' +
    '<p>قائد اللجنة راجع الخطة الزمنية لمشروع <b>' + plan.name + '</b> (' +
    plan.projectId + ').</p>' +
    decisionBanner_(decision) +
    disabledNoticeHtml_(disabledNamesFromDetail_(detail));

  if (reason) body += '<p><b>ملاحظة القائد:</b> ' + reason + '</p>';

  if (decision !== 'إعادة تقديم') {
    body += '<p><b>رفع البربوزل مفتوح لكم.</b></p>' +
      '<p style="background:#f4f4f4;padding:10px;border-radius:6px">' +
      'رمز الرفع: <b style="font-size:16px">' + token + '</b></p>';
  } else {
    body += '<p><b>رفع البربوزل مقفل.</b> عدّلوا الخطة وأعيدوا رفعها على نفس الفورم.</p>';
  }

  body += '<hr><p>' + CONFIG_2.COMMITTEE_NAME + '</p>';

  MailApp.sendEmail({
    to: plan.email,
    subject: 'الخطة الزمنية — ' + plan.name + ': ' + decision,
    htmlBody: wrapRtl_(body)
  });
}
