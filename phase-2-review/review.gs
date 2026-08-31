/**
 * المرحلة ٢ب — الخطوتان ٧ و٨: مراجعة القائد ثم الإرسال للفريق
 *
 * شاشة المراجعة هي الشيت نفسه:
 *   - "سجل المعايير"، عمود "نتيجة القائد": تعديل مستوى أي معيار.
 *   - "البروبوزلات"، عمودا "سبب قرار القائد" ثم "قرار القائد":
 *     اختيار القرار النهائي هو فعل الاعتماد والإرسال.
 *
 * لا يُرسل شيء للفريق إلا من onScoringReviewEdit وبعد تحقق الكود من
 * الدرجات والاقتباسات والقرار النهائي. إعادة تشغيل الحدث لا تكرر البريد.
 */

const SCORING_LEVELS = ['ضعيف', 'مقبول', 'قوي', 'غير قابل للتقييم'];

function scoringLevelScore_(level, weight) {
  const points = { 'ضعيف': 0, 'مقبول': 1, 'قوي': 2 };
  return points[level] === undefined ? null : points[level] * weight;
}

function rubricCriterionFromCode_(code) {
  const match = String(code || '').match(/(\d+)/);
  const id = match ? Number(match[1]) : 0;
  return RUBRIC.criteria.filter(function (c) { return c.id === id; })[0] || null;
}

function proposalByReviewId_(reviewId) {
  const sheet = proposalsSheet();
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const rows = sheet.getRange(2, 1, last - 1, proposalWidth_()).getValues();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[proposalCol('reviewId') - 1] || '').trim() !== String(reviewId || '').trim()) continue;
    const get = function (key) { return row[proposalCol(key) - 1]; };
    return {
      rowNumber: i + 2,
      reviewId: String(get('reviewId') || ''),
      projectId: String(get('projectId') || ''),
      name: String(get('name') || ''),
      email: String(get('email') || ''),
      size: String(get('size') || ''),
      textFileId: String(get('textFileId') || ''),
      state: String(get('state') || ''),
      score: get('score'),
      computed: String(get('computed') || ''),
      lead: String(get('lead') || ''),
      leadReason: String(get('leadReason') || '')
    };
  }
  return null;
}

function scoringRowsForReview_(reviewId) {
  const sheet = criterionLogSheet();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, CRITERION_LOG_HEADERS.length).getValues()
    .map(function (values, i) { return { rowNumber: i + 2, values: values }; })
    .filter(function (entry) {
      return String(entry.values[0] || '').trim() === String(reviewId || '').trim() &&
             String(entry.values[2] || '').trim() === '2ب';
    });
}

function onScoringCriterionEdit_(sheet, rowNumber, oldValue) {
  const row = sheet.getRange(rowNumber, 1, 1, CRITERION_LOG_HEADERS.length).getValues()[0];
  if (String(row[2] || '').trim() !== '2ب') return;

  const proposal = proposalByReviewId_(row[0]);
  if (!proposal || proposal.state !== PROPOSAL_STATE.SCORED) {
    const restored = String(oldValue || '').trim();
    const criterion = rubricCriterionFromCode_(row[3]);
    sheet.getRange(rowNumber, 12).setValue(restored);
    sheet.getRange(rowNumber, 13).setValue(
      criterion && restored ? scoringLevelScore_(restored, criterion.weight) : '');
    return;
  }

  const level = String(row[11] || '').trim();
  if (!level) {
    sheet.getRange(rowNumber, 13).setValue('');
    sheet.getRange(rowNumber, 14).setValue('لا');
    return;
  }
  if (SCORING_LEVELS.indexOf(level) === -1) {
    sheet.getRange(rowNumber, 12).setValue('');
    sheet.getRange(rowNumber, 13).setValue('');
    throw new Error('مستوى غير معروف: ' + level);
  }

  const criterion = rubricCriterionFromCode_(row[3]);
  if (!criterion) throw new Error('ما قدرنا نحدد المعيار في الصف ' + rowNumber + '.');
  if (!rubricLevelAllowed_(criterion, level)) {
    sheet.getRange(rowNumber, 12).setValue('');
    sheet.getRange(rowNumber, 13).setValue('');
    sheet.getRange(rowNumber, 14).setValue('لا');
    throw new Error('المعيار ' + criterion.id + ' ما يقبل المستوى "' + level + '".');
  }

  if (criterion.requiresFigures && !loadCentralFigures().available) {
    sheet.getRange(rowNumber, 12).setValue('');
    sheet.getRange(rowNumber, 13).setValue('');
    sheet.getRange(rowNumber, 14).setValue('لا');
    throw new Error('المعيار السادس معطّل: ورقة الأرقام المركزية غير متاحة.');
  }

  const score = scoringLevelScore_(level, criterion.weight);
  sheet.getRange(rowNumber, 13).setValue(score === null ? '' : score);
  sheet.getRange(rowNumber, 14).setValue(level === String(row[6] || '').trim() ? 'لا' : 'نعم');
}

function finalScoringForProposal_(proposal) {
  const rows = scoringRowsForReview_(proposal.reviewId);
  if (rows.length !== RUBRIC.criteria.length) {
    throw new Error('سجل المعايير ناقص: المتوقع ' + RUBRIC.criteria.length +
                    ' صفوف، والموجود ' + rows.length + '.');
  }

  const byId = {};
  rows.forEach(function (entry) {
    const criterion = rubricCriterionFromCode_(entry.values[3]);
    if (!criterion || byId[criterion.id]) {
      throw new Error('معرّف معيار ناقص أو مكرر في سجل المعايير.');
    }
    byId[criterion.id] = entry;
  });

  const proposalText = readProposalText(proposal.textFileId);
  const figures = loadCentralFigures();
  const items = RUBRIC.criteria.map(function (criterion) {
    const entry = byId[criterion.id];
    if (!entry) throw new Error('المعيار ' + criterion.id + ' ناقص من سجل المعايير.');
    const row = entry.values;
    const leadLevel = String(row[11] || '').trim();
    let level = leadLevel || String(row[6] || '').trim();
    const item = {
      criterion: criterion,
      level: level,
      quote: String(row[9] || '').trim(),
      fix: String(row[10] || '').trim(),
      reason: String(row[8] || '').trim(),
      score: null,
      assessed: false,
      rejectedQuote: false,
      disabled: false
    };

    if (!item.fix) {
      throw new Error('المعيار ' + criterion.id + ': أضف إصلاحاً محدداً قبل الاعتماد.');
    }

    if (criterion.requiresFigures && !figures.available) {
      item.level = NOT_ASSESSABLE;
      item.disabled = true;
      item.reason = figures.reason;
      return item;
    }

    if (item.level === NOT_ASSESSABLE) return item;
    if (!rubricLevelAllowed_(criterion, item.level)) {
      throw new Error('المعيار ' + criterion.id + ': مستوى غير معروف.');
    }
    if (!quoteIsVerbatim_(item.quote, proposalText)) {
      throw new Error('المعيار ' + criterion.id + ': لا يمكن اعتماد درجة بلا اقتباس حرفي صالح.');
    }
    item.score = scoringLevelScore_(item.level, criterion.weight);
    item.assessed = true;
    return item;
  });

  return { items: items, outcome: computeRubricDecision(items), figures: figures };
}

function escapeScoringHtml_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function finalScoreCardHtml_(items) {
  let html = '<table dir="rtl" style="border-collapse:collapse;width:100%;font-size:13px">' +
    '<tr style="background:#f2f4f7">' +
    ['المعيار', 'المستوى النهائي', 'الدرجة', 'الاقتباس', 'الإصلاح المطلوب']
      .map(function (heading) {
        return '<th style="padding:8px;border:1px solid #d0d5dd;text-align:right">' + heading + '</th>';
      }).join('') + '</tr>';

  items.forEach(function (item) {
    const style = LEVEL_STYLE[item.level] || LEVEL_STYLE[NOT_ASSESSABLE];
    html += '<tr>' +
      '<td style="padding:8px;border:1px solid #d0d5dd">' + item.criterion.id + '. ' +
        escapeScoringHtml_(item.criterion.name) + (item.criterion.blocking ? ' ⛔' : '') + '</td>' +
      '<td style="padding:8px;border:1px solid #d0d5dd;background:' + style.bg + ';color:' + style.fg +
        ';font-weight:bold">' + escapeScoringHtml_(item.level) + '</td>' +
      '<td style="padding:8px;border:1px solid #d0d5dd">' +
        (item.assessed ? item.score + ' / ' + (item.criterion.weight * 2) : '—') + '</td>' +
      '<td style="padding:8px;border:1px solid #d0d5dd">' +
        (item.quote ? '«' + escapeScoringHtml_(item.quote) + '»' : '—') + '</td>' +
      '<td style="padding:8px;border:1px solid #d0d5dd">' +
        escapeScoringHtml_(item.fix || '—') + '</td></tr>';
  });
  return html + '</table>';
}

function emailTeamProposalReview_(proposal, finalScoring, leadReason) {
  const outcome = finalScoring.outcome;
  const banner = {
    'معتمد':          { bg: '#ecfdf3', fg: '#1a7f37' },
    'معتمد بتعديلات': { bg: '#fffaeb', fg: '#b54708' },
    'إعادة تقديم':    { bg: '#fef3f2', fg: '#b42318' }
  }[outcome.decision];

  let body = '<p>هلا،</p>' +
    '<p>راجع قائد اللجنة بربوزل مشروع <b>' + escapeScoringHtml_(proposal.name) + '</b> (' +
      escapeScoringHtml_(proposal.projectId) + ').</p>' +
    '<p style="background:' + banner.bg + ';color:' + banner.fg +
      ';padding:14px;border-radius:8px;font-size:18px;font-weight:bold">' +
      outcome.decision + ' — ' + outcome.total + ' من ' + outcome.effectiveMax + '</p>';

  if (outcome.unassessedCount) {
    body += '<p style="background:#fffaeb;padding:12px;border-radius:6px">' +
      '<b>معايير لم تُحتسب: ' + outcome.unassessedCount + '.</b> ' +
      'المجموع المعروض من الحد الأعلى للمعايير التي أمكن تقييمها فقط.</p>';
  }
  if (leadReason) {
    body += '<p><b>ملاحظة قائد اللجنة:</b> ' + escapeScoringHtml_(leadReason) + '</p>';
  }

  body += finalScoreCardHtml_(finalScoring.items);
  if (outcome.decision === RUBRIC.decisions.RESUBMIT) {
    body += '<p><b>عدّلوا البنود الموضحة وأعيدوا رفع نسخة جديدة من البربوزل.</b></p>';
  } else if (outcome.decision === RUBRIC.decisions.CONDITIONAL) {
    body += '<p><b>نفّذوا التعديلات الموضحة قبل إرسال الوثيقة لأي جهة خارجية.</b></p>';
  } else {
    body += '<p><b>البربوزل معتمد من لجنة إدارة المشاريع.</b></p>';
  }
  body += '<hr><p>' + escapeScoringHtml_(CONFIG_2.COMMITTEE_NAME) + '</p>';

  MailApp.sendEmail({
    to: proposal.email,
    subject: 'تقييم البربوزل — ' + proposal.name + ': ' + outcome.decision,
    htmlBody: wrapRtl_(body)
  });
}

function approveAndSendProposalReview_(proposal, selectedDecision, decidedBy) {
  const reviewer = String(decidedBy || Session.getActiveUser().getEmail() || '').trim();
  if (!reviewer || reviewer.toLowerCase() !== String(CONFIG_2.LEAD_EMAIL || '').trim().toLowerCase()) {
    throw new Error('اعتماد تقييم البربوزل متاح لقائد اللجنة فقط.');
  }
  if (proposal.state === PROPOSAL_STATE.SENT) return false;
  if (proposal.state !== PROPOSAL_STATE.SCORED && proposal.state !== PROPOSAL_STATE.APPROVED) {
    throw new Error('البربوزل مو في حالة تسمح باعتماد التقييم: ' + proposal.state);
  }

  const finalScoring = finalScoringForProposal_(proposal);
  if (selectedDecision !== finalScoring.outcome.decision) {
    throw new Error('القرار المختار لا يطابق الدرجات النهائية. المتوقع: ' +
                    finalScoring.outcome.decision + '. عدّل درجات المعايير أولاً.');
  }
  if (selectedDecision !== proposal.computed && !proposal.leadReason.trim()) {
    throw new Error('اكتب سبب اختلاف قرار القائد عن القرار المحسوب قبل الاعتماد.');
  }

  const sheet = proposalsSheet();
  const recorded = recordLeadDecision(
    proposal.reviewId,
    selectedDecision,
    proposal.leadReason,
    reviewer,
    finalScoring.outcome.total,
    finalScoring.outcome.effectiveMax
  );
  if (!recorded) throw new Error('ما قدرنا نسجّل قرار القائد؛ ما انرسل شيء للفريق.');

  sheet.getRange(proposal.rowNumber, proposalCol('state')).setValue(PROPOSAL_STATE.APPROVED);
  sheet.getRange(proposal.rowNumber, proposalCol('score')).setValue(finalScoring.outcome.total);
  // حالة مستقلة قبل MailApp: لو توقف التنفيذ قسرياً هنا تبقى الحالة ملتبسة
  // ظاهرة للمراجعة، ولا يدّعي السجل أن الرسالة وصلت ولا يعيدها تلقائياً.
  sheet.getRange(proposal.rowNumber, proposalCol('state')).setValue(PROPOSAL_STATE.SENDING);
  try {
    emailTeamProposalReview_(proposal, finalScoring, proposal.leadReason);
    sheet.getRange(proposal.rowNumber, proposalCol('state')).setValue(PROPOSAL_STATE.SENT);
  } catch (err) {
    sheet.getRange(proposal.rowNumber, proposalCol('state')).setValue(PROPOSAL_STATE.SEND_FAILED);
    throw err;
  }
  return true;
}

function scoringReviewerEmail_(e) {
  if (e && e.user && typeof e.user.getEmail === 'function') {
    const eventEmail = String(e.user.getEmail() || '').trim();
    if (eventEmail) return eventEmail;
  }
  return String(Session.getActiveUser().getEmail() || '').trim();
}

function assertScoringReviewerIsLead_(e) {
  const actual = scoringReviewerEmail_(e).toLowerCase();
  const expected = String(CONFIG_2.LEAD_EMAIL || '').trim().toLowerCase();
  if (!actual || actual !== expected) {
    throw new Error('اعتماد تقييم البربوزل متاح لقائد اللجنة فقط.');
  }
}

function restoreScoringCriterionEdit_(sheet, rowNumber, oldValue) {
  const row = sheet.getRange(rowNumber, 1, 1, CRITERION_LOG_HEADERS.length).getValues()[0];
  const criterion = rubricCriterionFromCode_(row[3]);
  const restored = String(oldValue || '').trim();
  sheet.getRange(rowNumber, 12).setValue(restored);
  sheet.getRange(rowNumber, 13).setValue(
    criterion && restored ? scoringLevelScore_(restored, criterion.weight) : '');
  sheet.getRange(rowNumber, 14).setValue(
    restored && restored !== String(row[6] || '').trim() ? 'نعم' : 'لا');
}

function onScoringReviewEdit(e) {
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (row < 2) return;

  try {
    if (sheet.getName() === CONFIG_2.SHEETS.CRITERION_LOG && col === 12) {
      assertScoringReviewerIsLead_(e);
      onScoringCriterionEdit_(sheet, row, e.oldValue);
      return;
    }
    if (sheet.getName() !== CONFIG_2.SHEETS.PROPOSALS || col !== proposalCol('lead')) return;

    const selected = String(e.range.getValue() || '').trim();
    if (!selected) return;
    assertScoringReviewerIsLead_(e);
    const proposal = proposalByReviewId_(
      sheet.getRange(row, proposalCol('reviewId')).getValue());
    if (!proposal || proposal.state === PROPOSAL_STATE.SENT) return;
    if ([RUBRIC.decisions.APPROVED, RUBRIC.decisions.CONDITIONAL,
         RUBRIC.decisions.RESUBMIT].indexOf(selected) === -1) {
      throw new Error('قرار غير معروف: ' + selected);
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const fresh = proposalByReviewId_(proposal.reviewId);
      const sent = approveAndSendProposalReview_(fresh, selected, scoringReviewerEmail_(e));
      if (sent) {
        SpreadsheetApp.getActiveSpreadsheet().toast('اعتمد التقييم وانرسل للفريق: ' + selected);
      }
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    if (sheet.getName() === CONFIG_2.SHEETS.PROPOSALS && col === proposalCol('lead')) {
      sheet.getRange(row, col).setValue('');
    } else if (sheet.getName() === CONFIG_2.SHEETS.CRITERION_LOG && col === 12) {
      restoreScoringCriterionEdit_(sheet, row, e.oldValue);
    }
    SpreadsheetApp.getActiveSpreadsheet().toast('ما انرسل التقييم: ' + err.message);
  }
}
